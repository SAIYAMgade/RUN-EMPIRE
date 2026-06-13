import React, { useEffect, useState } from 'react';
import { useUserStore } from '../../stores/userStore';
import { useTileStore } from '../../stores/tileStore';
import { GlassPanel } from '../ui/GlassPanel';
import { UserAvatar } from '../ui/UserAvatar';
import { ColorPicker } from '../ui/ColorPicker';
import { LogOut, Activity, Flame, ShieldAlert, Award } from 'lucide-react';
import { socket } from '../../lib/socket';

export function UserStatsPanel() {
  const { currentUser, token, setCurrentUser, setToken } = useUserStore();
  const { tiles } = useTileStore();
  
  const [stats, setStats] = useState({
    tilesOwned: 0,
    totalClaimed: 0,
    totalStolen: 0,
    rank: null as number | null
  });

  useEffect(() => {
    if (!currentUser) return;

    // Local count from Zustand store to keep it reactive on click
    let ownedCount = 0;
    tiles.forEach(t => {
      if (t.ownerId === currentUser.id) ownedCount++;
    });

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

    // Fetch fresh stats from backend
    fetch(`${backendUrl}/api/users/${currentUser.id}`)
      .then(res => res.json())
      .then(data => {
        setStats({
          tilesOwned: ownedCount, // Keep the live local count
          totalClaimed: data.total_claimed || data.totalClaimed || 0,
          totalStolen: data.total_stolen || data.totalStolen || 0,
          rank: data.rank
        });
      })
      .catch(err => {
        console.error('Failed to fetch user stats:', err);
      });
  }, [currentUser, tiles]);

  if (!currentUser) return null;

  const handleLogout = () => {
    // 1. Disconnect socket
    socket.disconnect();

    // 2. Clear store state
    setCurrentUser(null);
    setToken(null);
  };

  const primaryColor = currentUser.color;

  return (
    <GlassPanel className="absolute top-4 right-16 w-[300px] p-5 flex flex-col gap-4 z-[1001] border-slate-800/80 shadow-[0_15px_35px_rgba(0,0,0,0.6)]">
      {/* User Header */}
      <div className="flex items-center gap-3.5 border-b border-slate-800 pb-3">
        <UserAvatar 
          name={currentUser.name} 
          avatarUrl={currentUser.avatarUrl} 
          color={primaryColor} 
          size="lg" 
        />
        <div className="flex-1 min-w-0">
          <span className="font-bold text-slate-100 block truncate text-sm select-none">
            {currentUser.name}
          </span>
          <span className="text-[10px] text-slate-400 block tracking-wide select-none">
            COMMUTER / RUNNER
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200 cursor-pointer"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3.5">
        {/* Tiles Owned */}
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-3 flex flex-col justify-between h-20">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[9px] font-bold tracking-wider uppercase select-none">Owned</span>
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <span className="text-xl font-black text-white">{stats.tilesOwned}</span>
        </div>

        {/* Rank */}
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-3 flex flex-col justify-between h-20">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[9px] font-bold tracking-wider uppercase select-none">Rank</span>
            <Award className="w-4 h-4 text-yellow-500" />
          </div>
          <span className="text-xl font-black text-white">
            {stats.rank ? `#${stats.rank}` : '—'}
          </span>
        </div>

        {/* Total Claims */}
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-3 flex flex-col justify-between h-20">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[9px] font-bold tracking-wider uppercase select-none">All Time</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-xl font-black text-white">{stats.totalClaimed}</span>
        </div>

        {/* Total Stolen From Me */}
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-3 flex flex-col justify-between h-20">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[9px] font-bold tracking-wider uppercase select-none">Stolen From You</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <span className="text-xl font-black text-white">{stats.totalStolen}</span>
        </div>
      </div>

      {/* Color Customizer */}
      <div className="border-t border-slate-900 pt-3">
        <ColorPicker />
      </div>
    </GlassPanel>
  );
}
