import React from 'react';
import { useActivityStore } from '../../stores/activityStore';
import { GlassPanel } from '../ui/GlassPanel';
import { Flame, ShieldAlert, Sparkles } from 'lucide-react';

export function ActivityFeed() {
  const { activities } = useActivityStore();

  const displayedActivities = activities.slice(0, 6);

  return (
    <GlassPanel className="absolute bottom-[88px] left-4 w-[320px] max-h-[170px] overflow-hidden flex flex-col p-3 z-[1001] border-slate-800/80 shadow-[0_10px_25px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-1.5 border-b border-slate-900 pb-1.5 mb-1.5 shrink-0 select-none">
        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
        <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
          Live Capture Feed
        </span>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1 scrollbar-none">
        {displayedActivities.length === 0 ? (
          <span className="text-[10px] text-slate-500 italic py-4 text-center select-none">
            Listening for captures in Delhi NCR...
          </span>
        ) : (
          displayedActivities.map((act, index) => {
            const isSteal = act.type === 'steal';
            const actionText = isSteal ? 'captured' : 'claimed';
            
            return (
              <div
                key={index}
                className="flex items-start gap-2.5 text-[11px] leading-relaxed p-1.5 rounded-lg bg-slate-900/20 border border-slate-800/30"
              >
                {/* Icon */}
                <div className="mt-0.5 shrink-0">
                  {isSteal ? (
                    <Flame className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>

                {/* Event Text */}
                <div className="flex-1 text-slate-300">
                  <span 
                    className="font-bold"
                    style={{ color: act.actorColor }}
                  >
                    {act.actor}
                  </span>{' '}
                  {actionText}{' '}
                  <span className="font-semibold text-slate-200 uppercase tracking-wider">
                    {act.tileKey}
                  </span>
                  {isSteal && act.victim && (
                    <>
                      {' '}from{' '}
                      <span className="font-bold text-slate-400">
                        {act.victim}
                      </span>
                    </>
                  )}
                </div>

                {/* Timestamp */}
                <span className="text-[9px] text-slate-500 self-center">
                  {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
      </div>
    </GlassPanel>
  );
}
