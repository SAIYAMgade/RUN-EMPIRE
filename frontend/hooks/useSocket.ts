import { useEffect } from 'react';
import { socket } from '../lib/socket';
import { useTileStore } from '../stores/tileStore';
import { useUserStore } from '../stores/userStore';
import { useActivityStore } from '../stores/activityStore';
import type { LeaderboardEntry } from '../types';

export function useSocket() {
  const { applyUpdate, applyBatchUpdate, setInitialState, updateUserColorInTiles } = useTileStore();
  const { setOnlineCount, addOnlineUser, removeOnlineUser, updateOnlineUserColor } = useUserStore();
  const { addActivity } = useActivityStore();

  useEffect(() => {
    // 1. Connection events
    socket.on('connect', () => {
      console.log('🔌 WebSocket connected successfully');
    });

    socket.on('disconnect', () => {
      console.log('🔌 WebSocket disconnected');
    });

    // 2. Initial state sync
    socket.on('tiles:initial-state', (tiles) => {
      setInitialState(tiles);
    });

    // 3. Real-time updates
    socket.on('tile:updated', (data) => {
      applyUpdate(data);

      // Trigger custom window event for the Canvas overlay ripple animation
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tile-animate', {
          detail: {
            tileKey: data.tileKey,
            color:   data.ownerColor,
            type:    data.isSteal ? 'steal' : 'claim'
          }
        }));
      }
    });

    socket.on('tiles:batch-updated', (updates) => {
      applyBatchUpdate(updates);
      
      // Trigger canvas animations for all in batch
      if (typeof window !== 'undefined') {
        updates.forEach(u => {
          window.dispatchEvent(new CustomEvent('tile-animate', {
            detail: {
              tileKey: u.tileKey,
              color:   u.ownerColor,
              type:    u.isSteal ? 'steal' : 'claim'
            }
          }));
        });
      }
    });

    // 4. Online Presence Tracking
    socket.on('users:online-count', (count) => {
      setOnlineCount(count);
    });

    socket.on('users:joined', (user) => {
      addOnlineUser(user);
    });

    socket.on('users:left', (userId) => {
      removeOnlineUser(userId);
    });

    // 5. Leaderboard live sync
    socket.on('leaderboard:update', (leaderboard: LeaderboardEntry[]) => {
      // Dispatch a custom event to update the leaderboard panels
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('leaderboard-updated', {
          detail: leaderboard
        }));
      }
    });

    // 6. Live Activity feeds
    socket.on('activity:event', (event) => {
      addActivity(event);
    });

    // 7. Stolen territory alerts
    socket.on('tile:stolen-alert', (data) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('stolen-alert', {
          detail: data
        }));
      }
    });

    // 8. User color updates
    socket.on('user:color-updated', ({ userId, color }) => {
      updateUserColorInTiles(userId, color);
      updateOnlineUserColor(userId, color);
      
      const currentUser = useUserStore.getState().currentUser;
      if (currentUser && currentUser.id === userId && currentUser.color !== color) {
        useUserStore.getState().setCurrentUser({
          ...currentUser,
          color
        });
      }
    });

    // Heartbeat ping loop
    const pingInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('user:ping');
      }
    }, 15000);

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('tiles:initial-state');
      socket.off('tile:updated');
      socket.off('tiles:batch-updated');
      socket.off('users:online-count');
      socket.off('users:joined');
      socket.off('users:left');
      socket.off('leaderboard:update');
      socket.off('activity:event');
      socket.off('tile:stolen-alert');
      socket.off('user:color-updated');
      clearInterval(pingInterval);
    };
  }, [applyUpdate, applyBatchUpdate, setInitialState, setOnlineCount, addOnlineUser, removeOnlineUser, addActivity]);

  return { socket };
}
