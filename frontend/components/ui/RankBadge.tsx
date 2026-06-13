import React from 'react';
import { Trophy, Medal } from 'lucide-react';

interface RankBadgeProps {
  rank: number;
}

export function RankBadge({ rank }: RankBadgeProps) {
  if (rank === 1) {
    return (
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(245,158,11,0.5)]">
        <Trophy className="w-4 h-4" />
      </div>
    );
  }

  if (rank === 2) {
    return (
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-300 text-slate-900 font-bold shadow-[0_0_12px_rgba(203,213,225,0.5)]">
        <Medal className="w-4 h-4" />
      </div>
    );
  }

  if (rank === 3) {
    return (
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-700 text-amber-100 font-bold shadow-[0_0_12px_rgba(180,83,9,0.5)]">
        <Medal className="w-4 h-4" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs font-semibold">
      #{rank}
    </div>
  );
}
