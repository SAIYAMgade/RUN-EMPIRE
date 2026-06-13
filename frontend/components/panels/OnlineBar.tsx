import React from 'react';
import { useUserStore } from '../../stores/userStore';
import { GlassPanel } from '../ui/GlassPanel';
import { UserAvatar } from '../ui/UserAvatar';
import { Users } from 'lucide-react';

export function OnlineBar() {
  const { onlineCount, onlineUsers } = useUserStore();

  const userList = Array.from(onlineUsers.values());

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1001] max-w-[90%] md:max-w-[500px]">
      <GlassPanel className="rounded-full px-5 py-2.5 flex items-center gap-4 border-slate-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        {/* Status indicator */}
        <div className="flex items-center gap-2 shrink-0 border-r border-slate-800/80 pr-4 select-none">
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-bold text-slate-200">
              {onlineCount} {onlineCount === 1 ? 'player' : 'players'}
            </span>
          </div>
        </div>

        {/* Avatars Scroll */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-[300px] scrollbar-none">
          {userList.length === 0 ? (
            <span className="text-[10px] text-slate-500 italic py-1 select-none">
              Searching for runners...
            </span>
          ) : (
            userList.map((user) => (
              <div key={user.id} className="relative shrink-0 hover:scale-110 transition-transform duration-200" title={user.name}>
                <UserAvatar
                  name={user.name}
                  avatarUrl={user.avatarUrl}
                  color={user.color}
                  size="sm"
                />
              </div>
            ))
          )}
        </div>
      </GlassPanel>
    </div>
  );
}
