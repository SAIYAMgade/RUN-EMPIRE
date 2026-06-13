import React, { useEffect, useState } from 'react';
import { useUserStore } from '../../stores/userStore';
import { GlassPanel } from '../ui/GlassPanel';
import { UserAvatar } from '../ui/UserAvatar';
import { RankBadge } from '../ui/RankBadge';
import { Trophy } from 'lucide-react';
import type { LeaderboardEntry } from '../../types';

export function LeaderboardPanel() {
  const { currentUser } = useUserStore();
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

    // 1. Fetch initial leaderboard over HTTP
    fetch(`${backendUrl}/api/leaderboard`)
      .then(res => res.json())
      .then((data: LeaderboardEntry[]) => {
        setBoard(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load leaderboard:', err);
        setLoading(false);
      });

    // 2. Listen for real-time WebSocket leaderboard updates via custom event
    const handleLeaderboardUpdate = (e: Event) => {
      const data = (e as CustomEvent).detail as LeaderboardEntry[];
      setBoard(data);
    };

    window.addEventListener('leaderboard-updated', handleLeaderboardUpdate);
    return () => {
      window.removeEventListener('leaderboard-updated', handleLeaderboardUpdate);
    };
  }, []);

  return (
    <GlassPanel className="absolute top-4 left-4 w-[280px] max-h-[400px] overflow-hidden flex flex-col p-4 z-[1001] border-slate-800/80 shadow-[0_15px_35px_rgba(0,0,0,0.6)]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-3 shrink-0">
        <Trophy className="w-5 h-5 text-amber-500 animate-pulse" />
        <span className="font-bold text-sm tracking-wider text-slate-100 uppercase select-none">
          Delhi NCR Leaders
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 scrollbar-thin">
        {loading ? (
          <div className="flex flex-col gap-2 animate-pulse py-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-slate-800/50 rounded-xl" />
            ))}
          </div>
        ) : board.length === 0 ? (
          <span className="text-xs text-slate-500 italic text-center py-6 select-none">
            No claims yet. Take a tile!
          </span>
        ) : (
          board.map((entry) => {
            const isMe = entry.userId === currentUser?.id;
            return (
              <div
                key={entry.userId}
                className={`flex items-center gap-3 p-2 rounded-xl transition-all duration-200 ${
                  isMe 
                    ? 'bg-slate-900/90 border border-slate-800/80' 
                    : 'hover:bg-slate-900/30 border border-transparent'
                }`}
                style={{
                  boxShadow: isMe ? `0 0 10px ${entry.color}15` : undefined
                }}
              >
                {/* Rank */}
                <RankBadge rank={entry.rank} />

                {/* Avatar */}
                <UserAvatar 
                  name={entry.name} 
                  avatarUrl={entry.avatarUrl} 
                  color={entry.color} 
                  size="sm" 
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <span className={`text-xs font-semibold block truncate ${
                    isMe ? 'text-white' : 'text-slate-300'
                  }`}>
                    {entry.name}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {entry.tilesOwned} {entry.tilesOwned === 1 ? 'neighborhood' : 'neighborhoods'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </GlassPanel>
  );
}
