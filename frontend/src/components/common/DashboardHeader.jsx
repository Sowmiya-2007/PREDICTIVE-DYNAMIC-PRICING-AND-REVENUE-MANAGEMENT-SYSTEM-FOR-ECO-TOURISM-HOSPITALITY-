import React, { useState } from 'react';
import {
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Bell,
  Calendar,
  Clock,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { dataService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const DashboardHeader = ({
  title,
  subtitle,
  onRefresh,
  isRefreshing,
  dateRangeText = 'Last 14 Days & Forward Forecast'
}) => {
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState(null);
  const { user } = useAuth();

  const handleResetData = async () => {
    if (!window.confirm("Reset demonstration database to initial pristine dataset?")) return;
    setIsResetting(true);
    try {
      await dataService.resetSeed();
      setResetMessage({ type: 'success', text: 'Database reset to initial demo state!' });
      if (onRefresh) onRefresh();
    } catch (err) {
      setResetMessage({ type: 'error', text: 'Failed to reset database.' });
    } finally {
      setIsResetting(false);
      setTimeout(() => setResetMessage(null), 4000);
    }
  };

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-sage-200/90 px-6 sm:px-8 py-4 sticky top-0 z-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Title and Context */}
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-charcoal-800">
              {title}
            </h1>
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live ML Pipeline
            </div>
          </div>
          {subtitle && (
            <p className="text-xs text-charcoal-500 mt-1 font-normal leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {/* Action Controls & Top Meta */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Notification / Feedback Banner if present */}
          {resetMessage && (
            <div className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-xs transition-all ${
              resetMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {resetMessage.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
              <span>{resetMessage.text}</span>
            </div>
          )}

          {/* Date Range Selector Pill */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sage-50 border border-sage-200 text-xs font-medium text-charcoal-600">
            <Calendar className="w-3.5 h-3.5 text-forest-700" />
            <span>{dateRangeText}</span>
          </div>

          {/* Sync indicator */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-sage-50 text-xs text-charcoal-500">
            <Clock className="w-3 h-3 text-sage-400" />
            <span className="text-[11px]">Synced: Just now</span>
          </div>

          {/* Reset Demo Data Button */}
          <button
            onClick={handleResetData}
            disabled={isResetting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-charcoal-700 bg-sage-50 hover:bg-sage-100 hover:text-charcoal-900 border border-sage-200 transition-all disabled:opacity-50"
            title="Reset demonstration database to initial verified state"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin text-forest-700' : 'text-sage-500'}`} />
            <span className="hidden sm:inline">{isResetting ? 'Resetting...' : 'Reset Demo'}</span>
          </button>

          {/* Refresh Action */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-forest-800 hover:bg-forest-900 shadow-sm shadow-forest-950/10 transition-all disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Updating...' : 'Sync View'}</span>
            </button>
          )}

          {/* User Profile Avatar with Initials */}
          <div className="flex items-center pl-2 border-l border-sage-200 gap-2">
            <div className="w-8 h-8 rounded-full bg-forest-800 text-white font-semibold text-xs flex items-center justify-center shadow-xs ring-2 ring-forest-100">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'M'}
            </div>
          </div>

        </div>

      </div>
    </header>
  );
};

export default DashboardHeader;
