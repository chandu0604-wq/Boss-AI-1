import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  volume: number; // 0 to 255 typically
  isActive: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ volume, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Base circle radius
      const baseRadius = 50;
      // Expand radius based on volume
      const expansion = (volume / 255) * 80;
      const radius = baseRadius + expansion;

      if (isActive) {
        // Draw glow
        // Using colors that fit the Slate 900 overlay (White/Salmon/Purple mix)
        const gradient = ctx.createRadialGradient(centerX, centerY, baseRadius * 0.5, centerX, centerY, radius + 30);
        gradient.addColorStop(0, 'rgba(255, 165, 156, 0.6)'); // The #FFA59C color
        gradient.addColorStop(0.5, 'rgba(167, 139, 250, 0.3)'); // Violet
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + 30, 0, Math.PI * 2);
        ctx.fill();

        // Draw main lines
        ctx.strokeStyle = '#FFFFFF'; 
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        // Wobbly circle effect based on phase
        for (let i = 0; i <= 360; i += 5) {
            const rad = (i * Math.PI) / 180;
            // Add some sine wave noise to the radius for "alive" look
            const noise = Math.sin((i + phaseRef.current) * 0.1) * (expansion * 0.3);
            const r = radius + noise;
            const x = centerX + Math.cos(rad) * r;
            const y = centerY + Math.sin(rad) * r;
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();

        phaseRef.current += 3; // Speed
      } else {
        // Idle state
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animationId);
  }, [volume, isActive]);

  return (
    <canvas 
      ref={canvasRef} 
      width={400} 
      height={400} 
      className="w-full h-full"
    />
  );
};

export default AudioVisualizer;