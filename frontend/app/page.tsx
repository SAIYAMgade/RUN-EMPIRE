'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '../stores/userStore';
import { GameMap } from '../components/map/GameMap';
import { LeaderboardPanel } from '../components/panels/LeaderboardPanel';
import { UserStatsPanel } from '../components/panels/UserStatsPanel';
import { ActivityFeed } from '../components/panels/ActivityFeed';
import { OnlineBar } from '../components/panels/OnlineBar';
import { NotificationManager } from '../components/notifications/NotificationManager';
import { socket } from '../lib/socket';
import { Compass } from 'lucide-react';

export default function GamePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { currentUser, token } = useUserStore();

  // 1. Mark component as mounted to prevent hydration mismatches
  useEffect(() => {
    setMounted(true);
  }, []);

  // 2. Protect route: redirect to login if no auth is active after mounting
  useEffect(() => {
    if (mounted && !currentUser) {
      router.push('/login');
    }
  }, [mounted, currentUser, router]);

  // 3. Connect Socket.io when user context becomes available
  useEffect(() => {
    if (currentUser && token) {
      if (!socket.connected) {
        socket.auth = { 
          token: token 
        };
        socket.connect();
      }
    }

    return () => {
      // Socket cleanup
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, [currentUser, token]);

  const loading = !mounted || !currentUser;

  if (loading) {
    return (
      <div className="relative min-h-screen bg-[#070b12] text-slate-100 flex flex-col justify-center items-center overflow-hidden">
        {/* Grids and lights */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-10 pointer-events-none" />
        <div className="absolute w-[250px] h-[250px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="flex flex-col items-center gap-3 relative z-10 select-none animate-pulse">
          <Compass className="w-10 h-10 text-indigo-500 animate-spin" />
          <h2 className="text-xl font-black tracking-widest text-slate-200">LOADING MAP</h2>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            Connecting to Delhi NCR Grid...
          </span>
        </div>
      </div>
    );
  }

  // Render main game board HUD
  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950">
      {/* 1. Full-screen Canvas-overlaid Google Map */}
      <GameMap />

      {/* 2. Floating panels and managers */}
      <LeaderboardPanel />
      <UserStatsPanel />
      <ActivityFeed />
      <OnlineBar />
      <NotificationManager />
    </main>
  );
}
