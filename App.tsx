
import React, { useState, useRef, useEffect } from 'react';
import { useLiveSession } from './hooks/useLiveSession';
import AudioVisualizer from './components/AudioVisualizer';
import { ConnectionState } from './types';
import { GoogleGenAI, Modality } from '@google/genai';
import { base64ToBytes, decodeAudioData } from './utils/audioUtils';
import { getApiKey } from './utils/env';
import { 
  Mic, 
  Menu, 
  Sparkles, 
  Plus, 
  X,
  Users,
  FileText,
  MessageSquare,
  Phone,
  Share2,
  ArrowRight,
  MessageCircle,
  Paperclip,
  File as FileIcon,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  RefreshCw,
  Mic as MicIcon,
  Volume2,
  StopCircle,
  Globe,
  Maximize2,
  LayoutGrid,
  Moon,
  Sun,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Trash2,
  AlertTriangle
} from 'lucide-react';

// --- DATA & CONFIG ---

interface AgentConfig {
    id: string;
    title: string;
    desc: string;
    icon: React.ReactNode;
    color: string;
    shadowColor: string;
    instruction: string;
}

const AGENTS: AgentConfig[] = [
    { 
        id: 'hr', 
        title: "HR Assistant", 
        desc: "Policies, leave & benefits queries", 
        icon: <Users size={24} />, 
        color: "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300",
        shadowColor: "shadow-rose-200 dark:shadow-rose-900/20",
        instruction: "You are an advanced HR Assist Agent with deep expertise in recruitment, onboarding, employee engagement, HR policies, performance analysis, and workforce management. You communicate with clarity, empathy, and professionalism. You screen candidates, suggest hiring decisions, schedule interviews, generate HR documents, guide new employees, resolve workplace queries, and ensure compliance with all HR policies. You proactively identify issues, provide insights to HR managers, and maintain confidentiality at all times. Your goal is to simplify HR operations, reduce manual effort, and deliver a seamless employee experience across the organization."
    },
    { 
        id: 'resume', 
        title: "Resume Screening", 
        desc: "ATS check & candidate ranking", 
        icon: <FileText size={24} />, 
        color: "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300",
        shadowColor: "shadow-blue-200 dark:shadow-blue-900/20",
        instruction: "You are an expert ATS (Applicant Tracking System) and Senior Recruiter. Your task is to scan the provided resume file or text, rate it on a scale of 1-100 based on industry standards, and specifically mention any drawbacks, missing skills, or formatting issues. Provide a detailed summary of the candidate's strengths and weaknesses. If the user uploads a resume, analyze it immediately."
    },
    { 
        id: 'support', 
        title: "Support Assistant", 
        desc: "Resolve FAQs & technical issues", 
        icon: <MessageSquare size={24} />, 
        color: "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300",
        shadowColor: "shadow-amber-200 dark:shadow-amber-900/20",
        instruction: "You are an Advanced Support Assistant engineered to resolve customer issues with speed, accuracy, and empathy. Your expertise spans troubleshooting, FAQ handling, product guidance, error diagnosis, and technical support escalation. You maintain a calm, patient, and solution-oriented tone. Your responsibilities include: Understanding user problems with minimal friction and asking only necessary questions. Diagnosing technical, account, or product issues with clear logic. Providing step-by-step solutions tailored to the user’s skill level. Offering concise explanations without overwhelming users. Escalating complex issues with structured notes and clear categorization. Summarizing solutions neatly at the end of each interaction. Maintaining consistency, accuracy, and professionalism at all times. Your behavior style: Actively listen and acknowledge user frustration. Avoid technical jargon unless required. Maintain a supportive, confident, and reassuring tone. Never guess — answer only with correct, validated information."
    },
    { 
        id: 'social', 
        title: "Social Media", 
        desc: "Content hooks & posting plans", 
        icon: <Share2 size={24} />, 
        color: "bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300",
        shadowColor: "shadow-purple-200 dark:shadow-purple-900/20",
        instruction: "You are a Creative Social Media Agent with deep expertise in content strategy, trend analysis, brand storytelling, and engagement optimization. You think like a marketer, creator, and strategist all at once. Your tone shifts based on brand personality while staying energetic and audience-focused. Your responsibilities include: Creating caption ideas, hooks, CTAs, and storytelling angles. Planning content calendars, post sequences, and social campaigns. Suggesting reel concepts, carousels, and viral-style content. Aligning messaging with brand identity and audience psychology. Identifying trending formats, hashtags, audio, and competitor behavior. Crafting platform-specific variations (Instagram, YouTube, X, LinkedIn). Offering insights on engagement, posting timing, and optimization strategies. Your behavior style: Bold, imaginative, trend-savvy, and highly creative. Uses punchy, scroll-stopping ideas. Breaks complex marketing ideas into actionable steps. Balances creativity with analytics and ROI thinking."
    },
    { 
        id: 'reception', 
        title: "Reception Agent", 
        desc: "Handle calls & take messages", 
        icon: <Phone size={24} />, 
        color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300",
        shadowColor: "shadow-emerald-200 dark:shadow-emerald-900/20",
        instruction: "You are a Professional Reception Agent designed to provide seamless front-desk assistance, handle inquiries, and guide users with clarity and warmth. You mimic the efficiency, politeness, and attentiveness of a real receptionist. Your responsibilities include: Greeting users in a welcoming and professional manner. Understanding their needs and routing them to the correct department or action. Handling appointment bookings, schedules, and confirmations. Managing call-like interactions: taking messages, acknowledging requests, and giving relevant information. Providing directions, basic instructions, or next steps instantly. Maintaining perfect accuracy in names, timings, and task handling. Keeping a courteous, calm, and helpful attitude throughout. Your behavior style: Friendly, warm, and approachable. Professional in tone, precise in instructions. Never rude, robotic, or vague. Always ensure the user feels guided and assisted politely."
    }
];

const SOCIAL_PLATFORMS = [
    {
        id: 'instagram',
        name: 'Instagram',
        icon: <Instagram size={18} />,
        color: 'text-pink-500 bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800',
        activeColor: 'bg-pink-100 dark:bg-pink-900/40 border-pink-300 dark:border-pink-600 ring-2 ring-pink-200 dark:ring-pink-900',
        instruction: "ACT AS AN INSTAGRAM EXPERT. Focus on visual storytelling, Reels strategies, trending audio, aesthetic feed planning, and high-engagement captions with relevant hashtags. Suggest specific visual concepts."
    },
    {
        id: 'twitter',
        name: 'X (Twitter)',
        icon: <Twitter size={18} />,
        color: 'text-sky-500 bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800',
        activeColor: 'bg-sky-100 dark:bg-sky-900/40 border-sky-300 dark:border-sky-600 ring-2 ring-sky-200 dark:ring-sky-900',
        instruction: "ACT AS AN X (TWITTER) GURU. Focus on short, punchy hooks, threads that convert, viral formatting, real-time trend jacking, and witty brand personality. Use thread structures."
    },
    {
        id: 'linkedin',
        name: 'LinkedIn',
        icon: <Linkedin size={18} />,
        color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
        activeColor: 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-600 ring-2 ring-blue-200 dark:ring-blue-900',
        instruction: "ACT AS A LINKEDIN PERSONAL BRANDING EXPERT. Focus on professional storytelling, thought leadership, industry insights, networking value, and corporate-friendly yet authentic tone. Structure posts for dwell time."
    },
    {
        id: 'youtube',
        name: 'YouTube',
        icon: <Youtube size={18} />,
        color: 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
        activeColor: 'bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-600 ring-2 ring-red-200 dark:ring-red-900',
        instruction: "ACT AS A YOUTUBE STRATEGIST. Focus on click-worthy thumbnails, high-retention video scripts, SEO-optimized titles/descriptions, and community tab engagement."
    }
];

interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: Date;
    attachmentName?: string;
    attachmentUrl?: string;
    attachmentType?: string;
    feedback?: 'like' | 'dislike' | null;
    sources?: { title: string; uri: string }[];
}

interface ChatSession {
    id: string;
    title: string;
    date: Date;
    agentId: string;
    messages: ChatMessage[];
    platform?: string | null;
}

// --- UTILS ---

const fileToGenerativePart = async (file: File) => {
  return new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type
        }
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// --- CUSTOM COMPONENTS ---

const DragonLogo = ({ className = "w-12 h-12" }) => {
    return (
        <div className={`${className} relative flex items-center justify-center select-none`}>
            {/* Styles are now in index.html to prevent React re-render flicker */}
            <div className="w-full h-full filter drop-shadow-sm">
                <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    
                    {/* Smoke Particles */}
                    <circle cx="85" cy="50" r="2" fill="#888" className="smoke-particle smoke-1" />
                    <circle cx="90" cy="45" r="3" fill="#AAA" className="smoke-particle smoke-2" />

                    {/* Fire Breath */}
                    <path 
                        d="M 75 58 
                           Q 85 55, 95 50 
                           Q 88 65, 80 62 
                           Q 85 68, 78 70 
                           Q 72 65, 75 58 Z" 
                        fill="#FF4500" 
                        className="dragon-fire"
                    />
                    
                    {/* Black Tribal Dragon Head Profile */}
                    <path 
                        d="M 20 30 
                           C 25 20, 40 10, 50 15 
                           L 55 12 
                           L 60 18 
                           C 65 15, 70 15, 75 25 
                           L 72 30 
                           L 78 35 
                           C 80 40, 80 45, 75 50 
                           L 65 55 
                           L 75 60 
                           C 70 65, 65 70, 55 75 
                           C 45 80, 30 75, 25 60 
                           C 35 65, 45 60, 50 50 
                           C 40 55, 30 50, 20 30 Z" 
                        fill="currentColor" 
                        className="text-slate-900 dark:text-white dragon-head"
                    />

                    {/* Eye - Slit */}
                    <path 
                        d="M 62 32 L 68 34 L 63 36 Z" 
                        fill="#FFF" 
                        className="dragon-head"
                    />
                </svg>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

const App: React.FC = () => {
  const { connect, disconnect, connectionState, error, volume } = useLiveSession();
  
  // State
  const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false);
  const [activeAgent, setActiveAgent] = useState<AgentConfig | null>(null);
  const [inputText, setInputText] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'hub' | 'chat'>('hub');
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  
  // Initialize sessions from LocalStorage
  const [pastSessions, setPastSessions] = useState<ChatSession[]>(() => {
      try {
          const saved = localStorage.getItem('boss_ai_sessions');
          if (saved) {
              const parsed = JSON.parse(saved);
              // Convert string dates back to Date objects
              return parsed.map((s: any) => ({
                  ...s,
                  date: new Date(s.date),
                  messages: s.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
              }));
          }
      } catch (e) {
          console.error("Failed to load sessions", e);
      }
      return [];
  });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const [isTyping, setIsTyping] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [expandedMessage, setExpandedMessage] = useState<ChatMessage | null>(null);
  const [isAgentGridOpen, setIsAgentGridOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  
  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  
  // Audio Playback State
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Derived State
  const isConnected = connectionState === ConnectionState.CONNECTED;
  const isConnecting = connectionState === ConnectionState.CONNECTING;

  // Initialize Theme based on preference or default
  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setIsDarkMode(true);
        document.documentElement.classList.add('dark');
    }
    
    // Check API Key
    const key = getApiKey();
    if (!key) {
        setApiKeyMissing(true);
    } else {
        setApiKeyMissing(false);
    }
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
      localStorage.setItem('boss_ai_sessions', JSON.stringify(pastSessions));
  }, [pastSessions]);

  // Sync Chat History to Session Database
  useEffect(() => {
    if (chatHistory.length === 0) return;

    // We only save if we have meaningful content (user messages) or initial greetings if desired
    // Check if we are in an existing session
    if (currentSessionId) {
        setPastSessions(prev => prev.map(session => {
            if (session.id === currentSessionId) {
                return { ...session, messages: chatHistory, date: new Date() };
            }
            return session;
        }));
    } else {
        // Creating a new session on the fly (e.g. first message sent)
        // Find the first user message for title
        const firstUserMsg = chatHistory.find(m => m.role === 'user');
        if (firstUserMsg) {
            const newSessionId = Date.now().toString();
            const title = firstUserMsg.text.slice(0, 30) + (firstUserMsg.text.length > 30 ? '...' : '') || "New Chat";
            
            const newSession: ChatSession = {
                id: newSessionId,
                title: title,
                date: new Date(),
                agentId: activeAgent?.id || 'general',
                messages: chatHistory,
                platform: selectedPlatform
            };
            
            setPastSessions(prev => [newSession, ...prev]);
            setCurrentSessionId(newSessionId);
        }
    }
  }, [chatHistory, activeAgent, selectedPlatform]); // Dependency on chatHistory is key

  const toggleTheme = () => {
      setIsDarkMode(prev => {
          const newState = !prev;
          if (newState) {
              document.documentElement.classList.add('dark');
          } else {
              document.documentElement.classList.remove('dark');
          }
          return newState;
      });
  };

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
        setTimeout(() => {
            if (chatContainerRef.current) {
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
        }, 100);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, currentView, isTyping, selectedPlatform]);

  // --- ACTIONS ---

  const handleLoadSession = (sessionId: string) => {
      const session = pastSessions.find(s => s.id === sessionId);
      if (session) {
          setChatHistory(session.messages);
          setCurrentSessionId(session.id);
          
          // Restore Agent
          const agent = AGENTS.find(a => a.id === session.agentId);
          setActiveAgent(agent || null);
          
          // Restore Platform if Social
          if (session.agentId === 'social' && session.platform) {
              setSelectedPlatform(session.platform);
          } else {
              setSelectedPlatform(null);
          }

          setCurrentView('chat');
          setIsSidebarOpen(false); // Close sidebar on mobile
      }
  };

  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
      e.stopPropagation();
      setPastSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) {
          handleNewChat();
      }
  };

  const handleStartChat = (agent: AgentConfig) => {
    setActiveAgent(agent);
    setCurrentView('chat');
    setIsAgentGridOpen(false); 
    setSelectedPlatform(null); 
    setChatHistory([
        { 
            id: 'init', 
            role: 'model', 
            text: `Hello! I'm your ${agent.title}. How can I assist you today?`, 
            timestamp: new Date() 
        }
    ]);
    setCurrentSessionId(null); // Reset session ID so a new one is created on first message
  };

  const handleNewChat = () => {
    setActiveAgent(null);
    setCurrentView('hub');
    setChatHistory([]);
    setInputText("");
    setSelectedFile(null);
    setIsSidebarOpen(false);
    setIsSearchEnabled(false);
    stopPlayback();
    setIsAgentGridOpen(false);
    setSelectedPlatform(null);
    setCurrentSessionId(null); // Important: Clear session ID
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleDictation = () => {
    if (isDictating) {
        if (recognitionRef.current) recognitionRef.current.stop();
        setIsDictating(false);
        return;
    }

    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        alert("Speech to text is not supported in this browser.");
        return;
    }

    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        setIsDictating(true);
    };

    recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(prev => prev + (prev ? " " : "") + transcript);
    };

    recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsDictating(false);
    };

    recognition.onend = () => {
        setIsDictating(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleFileClick = (url: string) => {
      window.open(url, '_blank');
  };

  const handleCopy = (text: string, id: string) => {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFeedback = (id: string, type: 'like' | 'dislike') => {
      setChatHistory(prev => prev.map(msg => {
          if (msg.id === id) {
              return { ...msg, feedback: msg.feedback === type ? null : type };
          }
          return msg;
      }));
  };

  const stopPlayback = () => {
    if (currentSourceRef.current) {
        try {
            currentSourceRef.current.stop();
        } catch (e) {
            // ignore if already stopped
        }
        currentSourceRef.current = null;
    }
    setPlayingMessageId(null);
  };

  const handleTextToSpeech = async (text: string, id: string) => {
    if (playingMessageId === id) {
        stopPlayback();
        return;
    }
    
    stopPlayback();
    setPlayingMessageId(id);

    try {
        const apiKey = getApiKey();
        if (!apiKey) throw new Error("API Key missing");

        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error("No audio data received");
        }

        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const ctx = audioContextRef.current;

        const audioBuffer = await decodeAudioData(
            base64ToBytes(base64Audio),
            ctx,
            24000,
            1
        );

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => {
            setPlayingMessageId(null);
            currentSourceRef.current = null;
        };
        source.start();
        currentSourceRef.current = source;

    } catch (e) {
        console.error("TTS Error", e);
        setPlayingMessageId(null);
        alert("Unable to generate audio. Please check API key.");
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() && !selectedFile) return;

    // Check Key
    const apiKey = getApiKey();
    if (!apiKey) {
        setApiKeyMissing(true);
        setChatHistory(prev => [...prev, {
            id: Date.now().toString(),
            role: 'model',
            text: "🚨 API Key is missing. I cannot reply. Please check your deployment settings. Ensure your environment variable is named VITE_API_KEY or REACT_APP_API_KEY.",
            timestamp: new Date()
        }]);
        return;
    } else {
        setApiKeyMissing(false);
    }

    let attachmentUrl = undefined;
    if (selectedFile) {
        attachmentUrl = URL.createObjectURL(selectedFile);
    }

    const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        text: inputText,
        timestamp: new Date(),
        attachmentName: selectedFile?.name,
        attachmentUrl: attachmentUrl,
        attachmentType: selectedFile?.type
    };

    setChatHistory(prev => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);
    
    const fileToSend = selectedFile;
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    const currentAgent = activeAgent || { 
        id: 'general',
        title: "Assistant", 
        instruction: "You are a helpful AI assistant." 
    };

    if (!activeAgent) {
        setCurrentView('chat');
    }

    let systemInstruction = currentAgent.instruction;
    if (currentAgent.id === 'social' && selectedPlatform) {
        const platform = SOCIAL_PLATFORMS.find(p => p.id === selectedPlatform);
        if (platform) {
            systemInstruction += `\n\n${platform.instruction}`;
        }
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        
        let messageParts: any[] = [];
        
        if (userMsg.text) {
          messageParts.push({ text: userMsg.text });
        }
        
        if (fileToSend) {
          const filePart = await fileToGenerativePart(fileToSend);
          messageParts.push(filePart);
        }

        const chatHistoryForModel = chatHistory.map(m => ({
            role: m.role,
            parts: [{ text: m.text }] 
        }));

        const tools = isSearchEnabled ? [{ googleSearch: {} }] : undefined;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', 
            contents: [
                ...chatHistoryForModel,
                { 
                    role: 'user', 
                    parts: messageParts
                }
            ],
            config: {
                systemInstruction: systemInstruction,
                tools: tools
            }
        });

        const responseText = response.text || "I didn't get a response. Please try again.";
        
        let sources: { title: string; uri: string }[] = [];
        if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            sources = response.candidates[0].groundingMetadata.groundingChunks
                .map((chunk: any) => chunk.web)
                .filter((web: any) => web && web.uri && web.title);
        }

        setChatHistory(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: responseText,
            timestamp: new Date(),
            sources: sources.length > 0 ? sources : undefined
        }]);

    } catch (e) {
        console.error("Gemini API Error:", e);
        setChatHistory(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: "I'm having trouble processing that request. Please try again.",
            timestamp: new Date()
        }]);
    } finally {
        setIsTyping(false);
    }
  };

  const handleMicClick = () => {
    setIsVoiceModeOpen(true);
    stopPlayback();
    setIsAgentGridOpen(false);
    
    let instruction = activeAgent 
        ? activeAgent.instruction 
        : "You are a helpful, friendly AI assistant.";

    if (activeAgent?.id === 'social' && selectedPlatform) {
        const platform = SOCIAL_PLATFORMS.find(p => p.id === selectedPlatform);
        if (platform) {
            instruction += `\n\n${platform.instruction}`;
        }
    }

    if (!isConnected && !isConnecting) {
        connect(instruction);
    }
  };

  const handleCloseVoiceMode = () => {
    disconnect();
    setIsVoiceModeOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }
  };

  return (
    <div className={`flex h-[100dvh] bg-[#F3F4F6] dark:bg-slate-950 overflow-hidden font-sans transition-colors duration-300`}>
      
      {/* --- SIDEBAR --- */}
      <div 
        className={`fixed inset-y-0 left-0 z-40 w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl transform transition-transform duration-300 ease-out border-r border-white/20 dark:border-slate-800 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
            <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                   <DragonLogo className="w-10 h-10" />
                   <h2 className="font-bold text-xl text-slate-800 dark:text-slate-100 tracking-tight">Boss<span className="text-red-600 dark:text-red-500">AI</span></h2>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                    <X size={20} className="text-slate-500 dark:text-slate-400" />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {pastSessions.length === 0 ? (
                    <div className="text-center mt-10 text-slate-400 dark:text-slate-500 text-sm">
                        No history yet. Start a new chat!
                    </div>
                ) : (
                    pastSessions.map(session => (
                        <div 
                            key={session.id} 
                            onClick={() => handleLoadSession(session.id)}
                            className={`p-4 rounded-2xl border shadow-sm cursor-pointer group transition-all duration-200 hover:-translate-y-0.5 relative
                            ${currentSessionId === session.id 
                                ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30' 
                                : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-red-100 dark:hover:border-red-900'}`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold text-slate-700 dark:text-slate-200 truncate text-sm max-w-[150px]">{session.title}</span>
                                <span className="text-[10px] text-slate-400 font-medium bg-slate-50 dark:bg-slate-900/50 px-2 py-1 rounded-full">{session.date.toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center">
                                <MessageCircle size={12} className="mr-1.5 text-red-400" />
                                {AGENTS.find(a => a.id === session.agentId)?.title || "General Chat"}
                            </p>
                            
                            {/* Delete Button (visible on hover) */}
                            <button 
                                onClick={(e) => handleDeleteSession(e, session.id)}
                                className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                title="Delete Chat"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
      </div>

      {/* --- MAIN AREA --- */}
      <div className={`flex-1 flex flex-col relative w-full h-full transition-all duration-300 ${isSidebarOpen ? 'brightness-90 scale-[0.98] origin-right' : ''}`}>
        
        {/* HEADER */}
        <header className="flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20 border-b border-slate-200/50 dark:border-slate-800/50 supports-[backdrop-filter]:bg-white/60">
            <div className="flex items-center space-x-4">
                <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2.5 rounded-xl hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm text-slate-600 dark:text-slate-300 transition-all active:scale-95"
                >
                    <Menu className="w-6 h-6" />
                </button>
                
                {/* Brand Logo in Header */}
                <DragonLogo className="w-12 h-12" />

                <div className="flex flex-col">
                    <h1 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
                        {activeAgent ? activeAgent.title : "Hello Boss"}
                    </h1>
                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest flex items-center">
                        <Sparkles size={10} className="mr-1" />
                        {activeAgent ? "Active Agent" : "AI Assistant"}
                    </span>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                {/* Theme Toggle */}
                <button 
                    onClick={toggleTheme}
                    className="p-3 rounded-xl transition-all duration-200 shadow-sm border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                    title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                    {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                {/* Agents Toggle */}
                <button 
                    onClick={() => setIsAgentGridOpen(!isAgentGridOpen)}
                    className={`p-3 rounded-xl transition-all duration-200 shadow-sm border border-slate-100 dark:border-slate-800 ${isAgentGridOpen ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    title="Toggle Agent Grid"
                >
                    <LayoutGrid size={20} />
                </button>

                <button 
                    onClick={handleNewChat}
                    className="flex items-center space-x-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-2.5 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-200 transition-all shadow-lg hover:shadow-slate-900/20 active:scale-95 active:shadow-none"
                >
                    <Plus size={18} />
                    <span className="text-sm font-bold hidden sm:inline">NEW CHAT</span>
                </button>
            </div>
        </header>

        {/* API KEY MISSING WARNING */}
        {apiKeyMissing && (
            <div className="bg-red-500 text-white px-4 py-2 text-center text-sm font-bold flex items-center justify-center animate-pulse">
                <AlertTriangle size={16} className="mr-2" />
                API_KEY not found in environment. Please set VITE_API_KEY in your deployment settings.
            </div>
        )}

        {/* CONTENT AREA */}
        <main className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-8 pb-40 sm:pb-48 scroll-smooth z-0" ref={chatContainerRef}>
            
            {currentView === 'hub' ? (
                /* --- HUB VIEW --- */
                <div className="max-w-4xl mx-auto h-full flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
                    <div className="text-center relative flex flex-col items-center">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-red-400/10 dark:bg-red-500/5 blur-[120px] rounded-full -z-10"></div>
                        
                        {/* Large Logo for Hub */}
                        <div className="mb-8 transform hover:scale-105 transition-transform duration-500">
                             <DragonLogo className="w-32 h-32" />
                        </div>

                        <h2 className="text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">How can I help you?</h2>
                        <p className="text-slate-400 dark:text-slate-500 text-lg font-medium max-w-md mx-auto">Ask anything or open the menu to select a specialized agent.</p>
                    </div>
                </div>
            ) : (
                /* --- CHAT VIEW --- */
                <div className="max-w-3xl mx-auto space-y-6 py-4">
                    
                    {/* Social Media Platform Selector */}
                    {activeAgent?.id === 'social' && (
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-wrap gap-2 justify-center mb-6 sticky top-0 z-10 animate-in slide-in-from-top-4">
                            {SOCIAL_PLATFORMS.map(platform => (
                                <button
                                    key={platform.id}
                                    onClick={() => setSelectedPlatform(platform.id === selectedPlatform ? null : platform.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-200 ${
                                        selectedPlatform === platform.id 
                                        ? platform.activeColor 
                                        : `${platform.color} border-transparent bg-opacity-50 hover:bg-opacity-100`
                                    }`}
                                >
                                    {platform.icon}
                                    <span className="text-xs font-bold">{platform.name}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {chatHistory.map((msg) => (
                        <div 
                            key={msg.id} 
                            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                        >
                            <div className={`
                                max-w-[85%] sm:max-w-[75%] rounded-[1.5rem] px-6 py-4 shadow-sm relative group transition-colors duration-200
                                ${msg.role === 'user' 
                                    ? 'bg-slate-900 dark:bg-red-600 text-white rounded-tr-sm shadow-slate-900/10' 
                                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-sm border border-slate-100 dark:border-slate-700 shadow-slate-200/50 dark:shadow-none'}
                            `}>
                                {msg.role === 'model' && (
                                    <div className="absolute -left-10 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activeAgent?.color || 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'}`}>
                                            {activeAgent?.icon || <Sparkles size={14} />}
                                        </div>
                                    </div>
                                )}
                                
                                {/* Attachment Indicator (Clickable) */}
                                {msg.attachmentName && (
                                    <button 
                                        onClick={() => msg.attachmentUrl && handleFileClick(msg.attachmentUrl)}
                                        className={`mb-3 pb-2 border-b flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider opacity-90 transition-opacity hover:opacity-100 ${msg.role === 'user' ? 'border-white/20' : 'border-slate-100 dark:border-slate-700'}`}
                                    >
                                        <div className={`p-1.5 rounded-lg ${msg.role === 'user' ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700'}`}>
                                            <Paperclip size={12} />
                                        </div>
                                        <span className="underline decoration-dotted underline-offset-2">{msg.attachmentName}</span>
                                    </button>
                                )}
                                
                                <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{msg.text}</p>
                                
                                {/* Search Sources */}
                                {msg.sources && msg.sources.length > 0 && (
                                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center">
                                            <Globe size={10} className="mr-1" />
                                            Sources
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {msg.sources.map((source, idx) => (
                                                <a 
                                                    key={idx}
                                                    href={source.uri}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center text-xs bg-slate-50 dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-600 hover:border-red-200 dark:hover:border-red-800 transition-colors"
                                                >
                                                    <span className="truncate max-w-[150px]">{source.title}</span>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                <span className={`text-[10px] mt-2 block opacity-40 font-medium tracking-wide ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                            </div>

                            {/* Message Actions (For Model Only) */}
                            {msg.role === 'model' && (
                                <div className="flex items-center space-x-1 mt-2 ml-2 opacity-100 transition-opacity">
                                     <button 
                                        onClick={() => handleTextToSpeech(msg.text, msg.id)}
                                        className={`p-1.5 rounded-lg transition-colors ${playingMessageId === msg.id ? 'text-red-500 bg-red-50 dark:bg-red-900/20 animate-pulse' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800'}`}
                                        title={playingMessageId === msg.id ? "Stop Listening" : "Read Aloud"}
                                    >
                                        {playingMessageId === msg.id ? <StopCircle size={14} /> : <Volume2 size={14} />}
                                    </button>
                                    <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                                    <button 
                                        onClick={() => handleCopy(msg.text, msg.id)}
                                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors"
                                        title="Copy"
                                    >
                                        {copiedId === msg.id ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                    <button 
                                        onClick={() => handleFeedback(msg.id, 'like')}
                                        className={`p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors ${msg.feedback === 'like' ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                                        title="Helpful"
                                    >
                                        <ThumbsUp size={14} />
                                    </button>
                                    <button 
                                        onClick={() => handleFeedback(msg.id, 'dislike')}
                                        className={`p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors ${msg.feedback === 'dislike' ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                                        title="Not Helpful"
                                    >
                                        <ThumbsDown size={14} />
                                    </button>
                                    <button 
                                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors"
                                        title="Share"
                                    >
                                        <Share2 size={14} />
                                    </button>
                                    {/* Expand Button */}
                                    <button 
                                        onClick={() => setExpandedMessage(msg)}
                                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors ml-1"
                                        title="Expand Full Screen"
                                    >
                                        <Maximize2 size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex justify-start animate-in fade-in duration-300">
                            <div className="bg-white dark:bg-slate-800 rounded-[1.5rem] rounded-tl-sm px-6 py-5 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center space-x-2">
                                <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce delay-100"></div>
                                <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce delay-200"></div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </main>

        {/* --- INPUT BAR --- */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-[#F3F4F6] via-[#F3F4F6] to-transparent dark:from-slate-950 dark:via-slate-950 z-30 pointer-events-none transition-colors duration-300">
            <div className="max-w-3xl mx-auto pointer-events-auto">
                
                {/* File Preview Chip */}
                {selectedFile && (
                    <div className="mb-2 ml-4 inline-flex items-center bg-white dark:bg-slate-800 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-xl shadow-lg shadow-red-500/10 animate-in slide-in-from-bottom-2 fade-in">
                        <div className="bg-red-50 dark:bg-red-900/30 p-1.5 rounded-lg mr-2">
                             <FileIcon size={14} />
                        </div>
                        <span className="text-sm font-semibold mr-2 max-w-[150px] truncate">{selectedFile.name}</span>
                        <button onClick={clearFile} className="hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 p-1 rounded-full transition-colors">
                            <X size={14} />
                        </button>
                    </div>
                )}

                <div className="relative flex items-center bg-white/90 dark:bg-slate-900/90 rounded-[2rem] shadow-[0_8px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.2)] p-2 pr-2 border border-white/50 dark:border-slate-700/50 ring-4 ring-white/40 dark:ring-slate-800/40 backdrop-blur-xl transition-all focus-within:shadow-[0_12px_50px_rgba(220,38,38,0.15)] focus-within:ring-red-100 dark:focus-within:ring-red-900/30 focus-within:border-red-200 dark:focus-within:border-red-800">
                    
                    {/* File Upload Button */}
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden" 
                        onChange={handleFileSelect}
                        accept=".pdf,.doc,.docx,.txt,image/*"
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 ml-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors active:scale-95"
                        title="Add photos & files"
                    >
                        <Plus size={24} strokeWidth={2.5} />
                    </button>

                    {/* Text Input */}
                    <input 
                        type="text" 
                        placeholder={isDictating ? "Listening..." : (activeAgent ? `Message ${activeAgent.title}...` : "Ask anything...")}
                        className="flex-1 bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 font-medium text-lg py-4 px-2"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isTyping}
                    />

                    <div className="flex items-center space-x-1 pl-2">
                        {/* Search Toggle */}
                        <button
                            onClick={() => setIsSearchEnabled(!isSearchEnabled)}
                            className={`p-2 rounded-full transition-all duration-200 ${isSearchEnabled ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200'}`}
                            title={isSearchEnabled ? "Web Search Enabled" : "Enable Web Search"}
                         >
                            <Globe size={20} />
                         </button>

                         {/* Speech-to-Text Dictation Button */}
                         <button
                            onClick={toggleDictation}
                            className={`p-2 rounded-full transition-all duration-200 ${isDictating ? 'bg-red-100 dark:bg-red-900/40 text-red-500 animate-pulse' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200'}`}
                            title="Dictate text"
                         >
                            <MicIcon size={20} />
                         </button>

                        {/* Send Button */}
                        <div className={`transition-all duration-300 ${inputText.trim() || selectedFile ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 w-0 overflow-hidden'}`}>
                            <button 
                                onClick={handleSendMessage}
                                className="bg-red-600 hover:bg-red-500 text-white p-3.5 rounded-full transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg shadow-red-500/30"
                            >
                                <ArrowRight size={20} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Live Mode Mic Button */}
                        <button 
                            onClick={handleMicClick}
                            className="bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 p-4 rounded-[1.2rem] transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-xl shadow-slate-900/20 dark:shadow-white/10 flex items-center justify-center group relative overflow-hidden"
                            title="Start Live Voice Chat"
                        >
                            <div className="absolute inset-0 bg-white/10 dark:bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <Mic className="w-5 h-5 group-hover:animate-bounce relative z-10" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* --- AGENT GRID OVERLAY --- */}
      {isAgentGridOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="relative w-full max-w-5xl h-auto max-h-[90vh] bg-white/90 dark:bg-slate-900/90 rounded-[3rem] shadow-2xl p-8 overflow-y-auto animate-in zoom-in-95 duration-300 border border-white/20 dark:border-slate-800/50">
                <button 
                    onClick={() => setIsAgentGridOpen(false)}
                    className="absolute top-6 right-6 p-3 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300 transition-colors z-20 shadow-sm"
                >
                    <X size={24} />
                </button>
                
                <div className="text-center mb-10 mt-4">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Select Agent</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Switch to a specialized assistant</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {AGENTS.map((agent) => (
                        <button
                            key={agent.id}
                            onClick={() => handleStartChat(agent)}
                            className="group relative bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 text-left border border-slate-100 dark:border-slate-700"
                        >
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${agent.color} shadow-md`}>
                                {agent.icon}
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{agent.title}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{agent.desc}</p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* --- EXPANDED MESSAGE MODAL --- */}
      {expandedMessage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[85vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ring-1 ring-white/20 dark:ring-slate-700/50">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
                    <div className="flex items-center space-x-3">
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeAgent?.color || 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}>
                            {activeAgent?.icon || <Sparkles size={20} />}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Full View</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                {new Date(expandedMessage.timestamp).toLocaleString()}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setExpandedMessage(null)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Modal Content (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-[#F8FAFC] dark:bg-slate-950">
                    <div className="max-w-3xl mx-auto">
                        <p className="whitespace-pre-wrap leading-relaxed text-lg text-slate-800 dark:text-slate-200 font-medium font-sans">
                            {expandedMessage.text}
                        </p>

                        {/* Attachments in Modal */}
                        {expandedMessage.attachmentName && (
                            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                                <button 
                                    onClick={() => expandedMessage.attachmentUrl && handleFileClick(expandedMessage.attachmentUrl)}
                                    className="flex items-center space-x-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl hover:shadow-md hover:border-red-200 dark:hover:border-red-800 transition-all group w-full sm:w-auto"
                                >
                                    <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg group-hover:bg-red-50 dark:group-hover:bg-red-900/20 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                                        <FileText size={24} />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-red-700 dark:group-hover:text-red-400">{expandedMessage.attachmentName}</p>
                                        <p className="text-xs text-slate-400 uppercase tracking-wider">Attachment</p>
                                    </div>
                                    <ArrowRight size={16} className="ml-4 text-slate-300 dark:text-slate-600 group-hover:text-red-400" />
                                </button>
                            </div>
                        )}

                        {/* Sources in Modal */}
                        {expandedMessage.sources && expandedMessage.sources.length > 0 && (
                            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                                <h4 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                                    <Globe size={18} className="mr-2 text-red-500" />
                                    Sources & Citations
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {expandedMessage.sources.map((source, idx) => (
                                        <a 
                                            key={idx}
                                            href={source.uri}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-start p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-red-300 dark:hover:border-red-800 hover:shadow-sm transition-all group"
                                        >
                                            <div className="bg-slate-50 dark:bg-slate-800 p-1.5 rounded-md mr-3 mt-0.5 group-hover:bg-red-50 dark:group-hover:bg-red-900/20 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                                                <Globe size={14} />
                                            </div>
                                            <span className="text-sm text-slate-600 dark:text-slate-300 font-medium group-hover:text-red-700 dark:group-hover:text-red-400 break-words line-clamp-2">
                                                {source.title}
                                            </span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal Footer (Actions) */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-2">
                    <button 
                        onClick={() => handleCopy(expandedMessage.text, expandedMessage.id + '_modal')}
                        className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                        {copiedId === expandedMessage.id + '_modal' ? <Check size={18} /> : <Copy size={18} />}
                        Copy Text
                    </button>
                    <button 
                        onClick={() => setExpandedMessage(null)}
                        className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors shadow-lg shadow-slate-900/10"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- VOICE MODE OVERLAY --- */}
      {isVoiceModeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xl transition-all duration-500 animate-in fade-in">
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col items-center animate-in zoom-in-95 duration-300 ring-8 ring-white/20 dark:ring-slate-700/20">
                
                {/* Agent Header in Voice Mode */}
                <div className="absolute top-0 left-0 right-0 p-8 flex flex-col items-center z-10">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">CURRENT PERSONA</span>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-full border border-slate-100 dark:border-slate-700">
                        <span className={activeAgent?.color.split(' ')[1] || 'text-red-500'}>
                            {activeAgent ? activeAgent.icon : <Sparkles size={18} />}
                        </span>
                        {activeAgent ? activeAgent.title : "Gemini Assistant"}
                    </h3>
                </div>

                <button 
                    onClick={handleCloseVoiceMode}
                    className="absolute top-6 right-6 p-3 bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300 transition-colors z-20 hover:shadow-md"
                >
                    <X size={24} />
                </button>

                <div className="flex flex-col items-center justify-center pt-32 pb-16 px-8 w-full bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 h-[600px] relative">
                     {/* Background Glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-tr from-red-100 to-amber-100 dark:from-red-900/20 dark:to-amber-900/20 rounded-full blur-3xl opacity-50"></div>
                    
                    {/* Visualizer */}
                    <div className="relative mb-16">
                        <div className={`absolute inset-0 opacity-20 blur-[60px] rounded-full animate-pulse ${activeAgent?.color.split(' ')[1].replace('text-', 'bg-') || 'bg-red-500'}`}></div>
                        <div className="relative w-72 h-72 flex items-center justify-center rounded-full bg-slate-950 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] ring-8 ring-slate-100 dark:ring-slate-800 overflow-hidden">
                            <AudioVisualizer volume={volume} isActive={isConnected} />
                            
                            {/* Status Indicator */}
                            <div className="absolute bottom-10 flex flex-col items-center space-y-2 pointer-events-none">
                                {isConnecting ? (
                                    <span className="text-blue-400 text-[10px] font-black animate-pulse tracking-[0.2em]">CONNECTING...</span>
                                ) : isConnected ? (
                                    <span className="text-emerald-400 text-[10px] font-black tracking-[0.2em] flex items-center bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-500/30">
                                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-2 animate-pulse"></span>
                                        LISTENING
                                    </span>
                                ) : (
                                    <span className="text-slate-500 text-[10px] font-black tracking-[0.2em]">TAP MIC TO START</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="absolute bottom-36 px-4 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm font-bold border border-red-100 dark:border-red-900/50 shadow-sm animate-in slide-in-from-bottom-2 flex items-center">
                            <span className="mr-2">⚠️</span> {error}
                        </div>
                    )}

                    {/* Mic Toggle */}
                    <div className="absolute bottom-12">
                         <button 
                            onClick={isConnected ? disconnect : () => connect(activeAgent?.instruction || '')}
                            className={`
                                w-24 h-24 rounded-[2rem] flex items-center justify-center text-white shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 ring-4 ring-white dark:ring-slate-700
                                ${isConnected 
                                    ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/40' 
                                    : 'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 shadow-slate-900/40'}
                            `}
                        >
                            {isConnected ? (
                                <div className="w-8 h-8 bg-white rounded-lg shadow-inner"></div>
                            ) : (
                                <Mic size={36} />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default App;
