
import React, { useState, useRef } from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom';
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ text, children, position = 'top', className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const longPressTimer = useRef<any>(null);

  const handleMouseEnter = () => setIsVisible(true);
  const handleMouseLeave = () => {
    setIsVisible(false);
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      setIsVisible(true);
    }, 500); // 500ms trigger for long press
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    // Keep visible briefly after release so user can read it on mobile
    setTimeout(() => setIsVisible(false), 2000);
  };

  return (
    <div 
      className={`relative flex flex-col items-center justify-center ${className}`}
      onMouseEnter={handleMouseEnter} 
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {children}
      {isVisible && (
        <div className={`absolute ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} z-50 px-3 py-1.5 bg-slate-900/95 backdrop-blur text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-xl whitespace-nowrap animate-in fade-in zoom-in-95 duration-200 pointer-events-none border border-white/10`}>
          {text}
          {/* Arrow */}
          <div className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${position === 'top' ? 'top-full border-t-slate-900/95' : 'bottom-full border-b-slate-900/95'}`}></div>
        </div>
      )}
    </div>
  );
};

export default Tooltip;
