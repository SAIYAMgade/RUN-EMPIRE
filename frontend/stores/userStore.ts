import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface OnlineUser {
  id: string;
  name: string;
  color: string;
  avatarUrl: string;
}

interface UserStoreState {
  currentUser:   User | null;
  token:         string | null;
  onlineCount:   number;
  onlineUsers:   Map<string, OnlineUser>;

  setCurrentUser:  (user: User | null) => void;
  setToken:        (token: string | null) => void;
  setOnlineCount:  (count: number) => void;
  addOnlineUser:   (user: OnlineUser) => void;
  removeOnlineUser:(userId: string) => void;
  setOnlineUsers:  (users: OnlineUser[]) => void;
  updateOnlineUserColor: (userId: string, color: string) => void;
}

export const useUserStore = create<UserStoreState>()(
  persist(
    (set) => ({
      currentUser:   null,
      token:         null,
      onlineCount:   1,
      onlineUsers:   new Map(),

      setCurrentUser:  (user) => set({ currentUser: user }),
      setToken:        (token) => set({ token }),
      setOnlineCount:  (count) => set({ onlineCount: count }),
      addOnlineUser:   (user) => set((state) => {
        const next = new Map(state.onlineUsers);
        next.set(user.id, user);
        return { onlineUsers: next };
      }),
      removeOnlineUser:(userId) => set((state) => {
        const next = new Map(state.onlineUsers);
        next.delete(userId);
        return { onlineUsers: next };
      }),
      setOnlineUsers:  (users) => set(() => {
        const next = new Map<string, OnlineUser>();
        users.forEach(u => next.set(u.id, u));
        return { onlineUsers: next };
      }),
      updateOnlineUserColor: (userId, color) => set((state) => {
        const next = new Map(state.onlineUsers);
        const existing = next.get(userId);
        if (existing && existing.color !== color) {
          next.set(userId, {
            ...existing,
            color
          });
          return { onlineUsers: next };
        }
        return {};
      }),
    }),
    {
      name: 'terrirun-user-session',
      partialize: (state) => ({
        currentUser: state.currentUser,
        token: state.token,
      }),
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          return parsed;
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
        },
      },
    }
  )
);
