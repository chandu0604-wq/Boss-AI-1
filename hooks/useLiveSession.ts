import { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ConnectionState } from '../types';
import { pcmToGeminiBlob, base64ToBytes, decodeAudioData } from '../utils/audioUtils';

const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-09-2025';
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

export const useLiveSession = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState<number>(0);

  // Audio Contexts and Nodes
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);

  // Playback Queue
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Session Management
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const currentSessionRef = useRef<any>(null);

  const disconnect = useCallback(async () => {
    // 1. Stop Recording
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
      inputSourceRef.current = null;
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }

    // 2. Stop Playback
    activeSourcesRef.current.forEach((source) => source.stop());
    activeSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }

    // 3. Close Session
    if (currentSessionRef.current) {
       try {
         // Some versions of the client support .close(), safe to try
         // @ts-ignore
         currentSessionRef.current.close();
       } catch (e) {
         console.warn("Error closing session:", e);
       }
       currentSessionRef.current = null;
    }
    sessionPromiseRef.current = null;

    setConnectionState(ConnectionState.DISCONNECTED);
    setVolume(0);
  }, []);

  const connect = useCallback(async (systemInstructionText: string) => {
    try {
      setConnectionState(ConnectionState.CONNECTING);
      setError(null);

      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        throw new Error("API_KEY is missing. Please check your environment configuration.");
      }

      // Initialize Audio Contexts
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });
      
      inputAudioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      // Output Setup
      const outputGain = outputCtx.createGain();
      outputGain.connect(outputCtx.destination);
      outputGainRef.current = outputGain;

      // Analyser for Visualizer
      const analyser = outputCtx.createAnalyser();
      analyser.fftSize = 256;
      outputGain.connect(analyser);
      analyserRef.current = analyser;

      // Input Setup (Microphone)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = inputCtx.createMediaStreamSource(stream);
      inputSourceRef.current = source;

      // Input Analyser (Visualizer for user voice)
      const inputAnalyser = inputCtx.createAnalyser();
      inputAnalyser.fftSize = 256;
      source.connect(inputAnalyser);
      
      // Update volume state for visualization loop
      const updateVolume = () => {
        if (!analyserRef.current || !inputAnalyser) return;
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const inputDataArray = new Uint8Array(inputAnalyser.frequencyBinCount);
        
        analyser.getByteFrequencyData(dataArray);
        inputAnalyser.getByteFrequencyData(inputDataArray);

        let sum = 0;
        let inputSum = 0;
        
        // Calculate average volume
        for(let i=0; i<dataArray.length; i++) sum += dataArray[i];
        for(let i=0; i<inputDataArray.length; i++) inputSum += inputDataArray[i];
        
        const avg = (sum / dataArray.length) || 0;
        const inputAvg = (inputSum / inputDataArray.length) || 0;
        
        // Show whichever is louder (User or AI)
        setVolume(Math.max(avg, inputAvg));
        
        if (inputAudioContextRef.current?.state === 'running') {
          requestAnimationFrame(updateVolume);
        }
      };
      requestAnimationFrame(updateVolume);


      // Initialize Gemini Client
      const ai = new GoogleGenAI({ apiKey });

      // Connect to Live API
      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }, 
          },
          // Format system instruction as a Content object to avoid Network Errors during handshake
          systemInstruction: { parts: [{ text: systemInstructionText }] },
        },
        callbacks: {
          onopen: () => {
            setConnectionState(ConnectionState.CONNECTED);
            
            // Setup Audio Streaming to Model
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = scriptProcessor;
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = pcmToGeminiBlob(inputData, INPUT_SAMPLE_RATE);
              
              if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then((session) => {
                    session.sendRealtimeInput({ media: pcmBlob });
                });
              }
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
                const ctx = outputAudioContextRef.current;
                
                // Ensure timing
                nextStartTimeRef.current = Math.max(
                    nextStartTimeRef.current,
                    ctx.currentTime
                );

                const audioBuffer = await decodeAudioData(
                    base64ToBytes(base64Audio),
                    ctx,
                    OUTPUT_SAMPLE_RATE,
                    1
                );

                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputGainRef.current!);
                
                source.addEventListener('ended', () => {
                    activeSourcesRef.current.delete(source);
                });

                source.start(nextStartTimeRef.current);
                activeSourcesRef.current.add(source);
                
                nextStartTimeRef.current += audioBuffer.duration;
            }

            // Handle Interruption
            if (message.serverContent?.interrupted) {
                activeSourcesRef.current.forEach(s => {
                    try { s.stop(); } catch(e) {}
                });
                activeSourcesRef.current.clear();
                nextStartTimeRef.current = 0;
            }
          },
          onclose: () => {
            setConnectionState(ConnectionState.DISCONNECTED);
          },
          onerror: (err) => {
            console.error("Gemini Live Error:", err);
            setError("Connection error. Ensure API key is valid.");
            disconnect();
          }
        }
      });

      sessionPromiseRef.current = sessionPromise;
      sessionPromise.then(sess => {
        currentSessionRef.current = sess;
      });

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to connect to microphone or API.");
      setConnectionState(ConnectionState.ERROR);
      disconnect();
    }
  }, [disconnect]);

  return {
    connect,
    disconnect,
    connectionState,
    error,
    volume
  };
};