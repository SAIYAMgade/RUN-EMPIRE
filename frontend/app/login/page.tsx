'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '../../stores/userStore';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { socket } from '../../lib/socket';
import { Compass, Eye, EyeOff, Lock, User as UserIcon, LogIn, UserPlus } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { currentUser, setCurrentUser, setToken } = useUserStore();
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, redirect to home
  useEffect(() => {
    if (currentUser) {
      router.push('/');
    }
  }, [currentUser, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(isRegistering ? 'register' : 'login');
    setError(null);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
    const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';

    try {
      const res = await fetch(`${backendUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: username.trim(),
          password
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Save to Zustand store
      setCurrentUser(data.user);
      setToken(data.token);

      // Connect Socket.io with credentials
      socket.auth = { token: data.token };
      socket.connect();

      // Redirect to play map
      router.push('/');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(null);
    }
  };

  const handleMockLogin = async (playerName: string) => {
    setLoading(playerName);
    setError(null);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
    
    try {
      // First try to login, if that fails, try to register the mock account
      let res = await fetch(`${backendUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: playerName, password: 'mockpassword123' })
      });

      let data = await res.json();
      
      if (!res.ok) {
        // Try registering it
        res = await fetch(`${backendUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: playerName, password: 'mockpassword123' })
        });
        data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || 'Mock login failed');
        }
      }

      // Save to Zustand
      setCurrentUser(data.user);
      setToken(data.token);

      // Connect Socket.io with credentials
      socket.auth = { token: data.token };
      socket.connect();

      // Redirect
      router.push('/');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(null);
    }
  };

  const mockUsers = [
    { name: 'Ramesh', desc: 'India Gate Jogger', color: '#EF4444' },
    { name: 'Priya', desc: 'Cyber City Commuter', color: '#10B981' },
    { name: 'Amit', desc: 'Metro Daily Rider', color: '#3B82F6' },
    { name: 'Pooja', desc: 'Hauz Khas Resident', color: '#F59E0B' },
    { name: 'Vikram', desc: 'Noida Tech Explorer', color: '#8B5CF6' }
  ];

  return (
    <div className="relative min-h-screen bg-[#070b12] text-slate-100 flex flex-col justify-center items-center p-4 overflow-hidden">
      {/* Visual cybernetic grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-25 pointer-events-none" />

      {/* Full Screen Running Person Background Image */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        <img 
          src="/bg-runner-sharp.jpg" 
          alt="Runner Background" 
          className="w-full h-full object-cover opacity-35 filter brightness-[0.6] contrast-125" 
        />
        {/* Dark radial gradient overlay for premium vignette look */}
        <div 
          className="absolute inset-0 opacity-70" 
          style={{ backgroundImage: 'radial-gradient(circle at center, transparent 30%, #070b12 90%)' }}
        />
      </div>

      {/* Glowing background light points */}
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-indigo-600/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-cyan-600/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Login Card */}
      <GlassPanel className="w-full max-w-[440px] p-8 relative z-10 border-slate-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
        {/* Title */}
        <div className="flex flex-col items-center mb-8 text-center select-none">
          <div className="relative w-16 h-16 mb-4 rounded-2xl overflow-hidden border border-indigo-500/40 shadow-[0_0_20px_rgba(99,102,241,0.25)] flex items-center justify-center bg-slate-950">
            <img 
              src="/logo.jpg" 
              alt="Run Empire Logo" 
              className="w-full h-full object-cover scale-105" 
            />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]">
              RUN EMPIRE
            </h1>
          </div>
          <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">
            Delhi NCR Real Time Territory Control
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center font-medium animate-fadeIn">
            {error}
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
              Username
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Enter username..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading !== null}
                className="w-full pl-11 pr-4 py-3 text-sm bg-slate-950/60 hover:bg-slate-950/90 focus:bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl text-slate-100 outline-none transition-all duration-200"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading !== null}
                className="w-full pl-11 pr-11 py-3 text-sm bg-slate-950/60 hover:bg-slate-950/90 focus:bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl text-slate-100 outline-none transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-500 hover:text-slate-300 transition-colors duration-150 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading !== null}
            className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-500 active:scale-98 disabled:opacity-50 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:shadow-[0_0_25px_rgba(99,102,241,0.4)]"
          >
            {loading === 'login' || loading === 'register' ? (
              <span>Authenticating...</span>
            ) : isRegistering ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>

          <div className="text-center mt-2">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
              }}
              disabled={loading !== null}
              className="text-xs text-slate-400 hover:text-indigo-400 transition-colors duration-200 cursor-pointer font-medium underline underline-offset-4"
            >
              {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
            </button>
          </div>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 select-none my-6">
          <div className="h-[1px] bg-slate-800 flex-1" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            or test quick commuter accounts
          </span>
          <div className="h-[1px] bg-slate-800 flex-1" />
        </div>

        {/* Developer Quick-logins */}
        <div className="flex flex-col gap-2">
          {mockUsers.map((user) => {
            const isUserLoading = loading === user.name;
            return (
              <button
                key={user.name}
                onClick={() => handleMockLogin(user.name)}
                disabled={loading !== null}
                className="w-full text-left p-3.5 rounded-xl border border-slate-800 hover:border-slate-700/80 bg-slate-950/40 hover:bg-slate-900/30 transition-all duration-200 cursor-pointer flex items-center justify-between group active:scale-99 disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm shrink-0 transition-transform duration-200 group-hover:scale-110"
                    style={{ 
                      backgroundColor: user.color,
                      boxShadow: `0 0 10px ${user.color}44`
                    }}
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">
                      {user.name}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {user.desc}
                    </span>
                  </div>
                </div>
                
                <span className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider group-hover:translate-x-0.5 transition-transform duration-200">
                  {isUserLoading ? 'Connecting...' : 'Claim ➔'}
                </span>
              </button>
            );
          })}
        </div>
      </GlassPanel>
      
      {/* Footer Info */}
      <span className="absolute bottom-6 text-[10px] text-slate-600 font-medium select-none flex items-center gap-1">
        <Compass className="w-3.5 h-3.5" />
        DELHI NCR CAPTURE GAME v1.0.0
      </span>
    </div>
  );
}
