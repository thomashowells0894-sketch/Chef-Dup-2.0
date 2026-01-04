/**
 * iOS-Optimized UI Components
 * Following Apple Human Interface Guidelines (HIG)
 */

import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { useHaptics } from '../../hooks/useNativeFeatures';
import { ChevronLeft, ChevronRight, X, Check } from 'lucide-react';

// ==========================================
// iOS BUTTON
// ==========================================
interface IOSButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  haptic?: boolean;
  onClick?: () => void;
  className?: string;
}

export const IOSButton: React.FC<IOSButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  haptic = true,
  onClick,
  className = '',
}) => {
  const haptics = useHaptics();

  const baseStyles = 'font-semibold rounded-xl transition-all duration-150 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
    destructive: 'bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-600',
    ghost: 'bg-transparent text-orange-500 hover:bg-orange-50',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const handleClick = () => {
    if (disabled || loading) return;
    if (haptic) haptics.medium();
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {loading ? (
        <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        children
      )}
    </button>
  );
};

// ==========================================
// iOS NAVIGATION BAR
// ==========================================
interface IOSNavBarProps {
  title: string;
  subtitle?: string;
  leftAction?: {
    label?: string;
    icon?: React.ReactNode;
    onClick: () => void;
  };
  rightAction?: {
    label?: string;
    icon?: React.ReactNode;
    onClick: () => void;
    destructive?: boolean;
  };
  transparent?: boolean;
  large?: boolean;
}

export const IOSNavBar: React.FC<IOSNavBarProps> = ({
  title,
  subtitle,
  leftAction,
  rightAction,
  transparent = false,
  large = false,
}) => {
  const haptics = useHaptics();

  const handleAction = (action?: { onClick: () => void }) => {
    if (action) {
      haptics.light();
      action.onClick();
    }
  };

  return (
    <div className={`sticky top-0 z-50 ${transparent ? '' : 'bg-white/80 backdrop-blur-xl border-b border-slate-100'}`}>
      <div className="pt-safe">
        <div className="h-14 px-4 flex items-center justify-between">
          {/* Left Action */}
          <div className="w-20 flex justify-start">
            {leftAction && (
              <button
                onClick={() => handleAction(leftAction)}
                className="flex items-center gap-1 text-orange-500 font-semibold active:opacity-60 transition-opacity"
              >
                {leftAction.icon || <ChevronLeft size={20} />}
                {leftAction.label && <span>{leftAction.label}</span>}
              </button>
            )}
          </div>

          {/* Title */}
          <div className="flex-1 text-center">
            {!large && (
              <>
                <h1 className="font-bold text-slate-900 text-lg truncate">{title}</h1>
                {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
              </>
            )}
          </div>

          {/* Right Action */}
          <div className="w-20 flex justify-end">
            {rightAction && (
              <button
                onClick={() => handleAction(rightAction)}
                className={`font-semibold active:opacity-60 transition-opacity ${
                  rightAction.destructive ? 'text-red-500' : 'text-orange-500'
                }`}
              >
                {rightAction.icon || rightAction.label}
              </button>
            )}
          </div>
        </div>

        {/* Large Title */}
        {large && (
          <div className="px-4 pb-2">
            <h1 className="font-black text-3xl text-slate-900">{title}</h1>
            {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// iOS CARD
// ==========================================
interface IOSCardProps {
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

export const IOSCard: React.FC<IOSCardProps> = ({
  children,
  padding = 'md',
  className = '',
  onClick,
}) => {
  const haptics = useHaptics();

  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const handleClick = () => {
    if (onClick) {
      haptics.light();
      onClick();
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`bg-white rounded-2xl shadow-sm border border-slate-100/50 ${paddings[padding]} ${
        onClick ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

// ==========================================
// iOS LIST ITEM
// ==========================================
interface IOSListItemProps {
  title: string;
  subtitle?: string;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  showChevron?: boolean;
  destructive?: boolean;
  onClick?: () => void;
}

export const IOSListItem: React.FC<IOSListItemProps> = ({
  title,
  subtitle,
  leftContent,
  rightContent,
  showChevron = false,
  destructive = false,
  onClick,
}) => {
  const haptics = useHaptics();

  const handleClick = () => {
    if (onClick) {
      haptics.light();
      onClick();
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`flex items-center gap-3 px-4 py-3 bg-white ${
        onClick ? 'cursor-pointer active:bg-slate-50 transition-colors' : ''
      }`}
    >
      {leftContent && <div className="shrink-0">{leftContent}</div>}

      <div className="flex-1 min-w-0">
        <div className={`font-medium ${destructive ? 'text-red-500' : 'text-slate-900'}`}>
          {title}
        </div>
        {subtitle && <div className="text-sm text-slate-500 truncate">{subtitle}</div>}
      </div>

      {rightContent && <div className="shrink-0 text-slate-400">{rightContent}</div>}
      {showChevron && <ChevronRight size={18} className="text-slate-300" />}
    </div>
  );
};

// ==========================================
// iOS TOGGLE SWITCH
// ==========================================
interface IOSToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const IOSToggle: React.FC<IOSToggleProps> = ({
  checked,
  onChange,
  disabled = false,
}) => {
  const haptics = useHaptics();

  const handleToggle = () => {
    if (disabled) return;
    haptics.medium();
    onChange(!checked);
  };

  return (
    <button
      onClick={handleToggle}
      disabled={disabled}
      className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
        checked ? 'bg-green-500' : 'bg-slate-200'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      <div
        className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
};

// ==========================================
// iOS SEGMENTED CONTROL
// ==========================================
interface IOSSegmentedControlProps {
  segments: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

export const IOSSegmentedControl: React.FC<IOSSegmentedControlProps> = ({
  segments,
  selectedIndex,
  onChange,
}) => {
  const haptics = useHaptics();

  const handleSelect = (index: number) => {
    haptics.selection();
    onChange(index);
  };

  return (
    <div className="bg-slate-100 rounded-xl p-1 flex">
      {segments.map((segment, index) => (
        <button
          key={segment}
          onClick={() => handleSelect(index)}
          className={`flex-1 py-2 px-4 text-sm font-semibold rounded-lg transition-all ${
            selectedIndex === index
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500'
          }`}
        >
          {segment}
        </button>
      ))}
    </div>
  );
};

// ==========================================
// iOS BOTTOM SHEET
// ==========================================
interface IOSBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  snapPoints?: ('content' | 'half' | 'full')[];
}

export const IOSBottomSheet: React.FC<IOSBottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  snapPoints = ['content'],
}) => {
  const haptics = useHaptics();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [translateY, setTranslateY] = useState(0);
  const startY = useRef(0);

  const handleDragStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    startY.current = e.touches[0].clientY;
  };

  const handleDragMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const deltaY = e.touches[0].clientY - startY.current;
    if (deltaY > 0) {
      setTranslateY(deltaY);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    if (translateY > 100) {
      haptics.light();
      onClose();
    }
    setTranslateY(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl animate-slide-up pb-safe"
        style={{
          transform: `translateY(${translateY}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {/* Handle */}
        <div
          className="flex justify-center py-3"
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
        >
          <div className="w-9 h-1 bg-slate-300 rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="px-4 pb-4 flex items-center justify-between border-b border-slate-100">
            <div />
            <h2 className="font-bold text-lg text-slate-900">{title}</h2>
            <button
              onClick={() => {
                haptics.light();
                onClose();
              }}
              className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

// ==========================================
// iOS ACTION SHEET
// ==========================================
interface IOSActionSheetAction {
  label: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  onClick: () => void;
}

interface IOSActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  actions: IOSActionSheetAction[];
}

export const IOSActionSheet: React.FC<IOSActionSheetProps> = ({
  isOpen,
  onClose,
  title,
  message,
  actions,
}) => {
  const haptics = useHaptics();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Action Sheet */}
      <div className="relative w-full max-w-md animate-slide-up pb-safe">
        {/* Actions Group */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden mb-2">
          {(title || message) && (
            <div className="px-4 py-3 text-center border-b border-slate-200/50">
              {title && <div className="font-semibold text-slate-700">{title}</div>}
              {message && <div className="text-sm text-slate-500 mt-1">{message}</div>}
            </div>
          )}

          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                haptics.medium();
                action.onClick();
                onClose();
              }}
              className={`w-full px-4 py-4 text-center font-medium text-lg active:bg-slate-100 transition-colors ${
                action.destructive ? 'text-red-500' : 'text-blue-500'
              } ${index > 0 ? 'border-t border-slate-200/50' : ''}`}
            >
              <div className="flex items-center justify-center gap-2">
                {action.icon}
                {action.label}
              </div>
            </button>
          ))}
        </div>

        {/* Cancel Button */}
        <button
          onClick={() => {
            haptics.light();
            onClose();
          }}
          className="w-full bg-white rounded-2xl px-4 py-4 text-center font-semibold text-lg text-blue-500 active:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

// ==========================================
// iOS ALERT
// ==========================================
interface IOSAlertProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  primaryAction?: {
    label: string;
    destructive?: boolean;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export const IOSAlert: React.FC<IOSAlertProps> = ({
  isOpen,
  onClose,
  title,
  message,
  primaryAction,
  secondaryAction,
}) => {
  const haptics = useHaptics();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />

      {/* Alert */}
      <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl w-full max-w-xs shadow-2xl animate-scale-in overflow-hidden">
        <div className="px-4 py-5 text-center">
          <h3 className="font-bold text-lg text-slate-900">{title}</h3>
          {message && <p className="text-sm text-slate-500 mt-2">{message}</p>}
        </div>

        <div className="border-t border-slate-200/50 flex">
          {secondaryAction && (
            <button
              onClick={() => {
                haptics.light();
                secondaryAction.onClick();
                onClose();
              }}
              className="flex-1 py-3 text-center font-medium text-blue-500 active:bg-slate-100 transition-colors border-r border-slate-200/50"
            >
              {secondaryAction.label}
            </button>
          )}
          {primaryAction && (
            <button
              onClick={() => {
                haptics.medium();
                primaryAction.onClick();
                onClose();
              }}
              className={`flex-1 py-3 text-center font-semibold active:bg-slate-100 transition-colors ${
                primaryAction.destructive ? 'text-red-500' : 'text-blue-500'
              }`}
            >
              {primaryAction.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// iOS SEARCH BAR
// ==========================================
interface IOSSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  showCancel?: boolean;
  onCancel?: () => void;
}

export const IOSSearchBar: React.FC<IOSSearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search',
  onFocus,
  onBlur,
  showCancel = false,
  onCancel,
}) => {
  const haptics = useHaptics();
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const handleCancel = () => {
    haptics.light();
    onChange('');
    onCancel?.();
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-slate-300 rounded-full flex items-center justify-center"
          >
            <X size={12} className="text-white" />
          </button>
        )}
      </div>
      {showCancel && (isFocused || value) && (
        <button
          onClick={handleCancel}
          className="text-orange-500 font-medium animate-fade-in"
        >
          Cancel
        </button>
      )}
    </div>
  );
};

// ==========================================
// iOS PROGRESS RING
// ==========================================
interface IOSProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  children?: React.ReactNode;
}

export const IOSProgressRing: React.FC<IOSProgressRingProps> = ({
  progress,
  size = 120,
  strokeWidth = 8,
  color = '#F97316',
  backgroundColor = '#E2E8F0',
  children,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
};

// ==========================================
// iOS PULL TO REFRESH
// ==========================================
interface IOSPullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export const IOSPullToRefresh: React.FC<IOSPullToRefreshProps> = ({
  onRefresh,
  children,
}) => {
  const haptics = useHaptics();
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling) return;
    const deltaY = e.touches[0].clientY - startY.current;
    if (deltaY > 0) {
      setPullDistance(Math.min(deltaY * 0.5, 100));
    }
  };

  const handleTouchEnd = async () => {
    setIsPulling(false);
    if (pullDistance >= 60) {
      haptics.medium();
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
    setPullDistance(0);
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="h-full overflow-y-auto"
    >
      {/* Pull indicator */}
      <div
        className="flex justify-center overflow-hidden transition-all"
        style={{ height: pullDistance }}
      >
        <div
          className={`mt-2 ${isRefreshing ? 'animate-spin' : ''}`}
          style={{
            opacity: pullDistance / 60,
            transform: `rotate(${pullDistance * 2}deg)`,
          }}
        >
          <svg
            className="w-6 h-6 text-orange-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>
      </div>
      {children}
    </div>
  );
};

export default {
  IOSButton,
  IOSNavBar,
  IOSCard,
  IOSListItem,
  IOSToggle,
  IOSSegmentedControl,
  IOSBottomSheet,
  IOSActionSheet,
  IOSAlert,
  IOSSearchBar,
  IOSProgressRing,
  IOSPullToRefresh,
};
