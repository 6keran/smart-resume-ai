'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export interface UserProfileData {
  id: string;
  name: string;
  email: string | null;
  role?: string;
  createdAt?: string;
}

interface UserContextValue {
  user: UserProfileData | null;
  loading: boolean;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  logout: () => Promise<void>;
  refreshUser: (freshUser?: UserProfileData | null) => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<UserProfileData | null>>;
  saveProfile: (name: string, email?: string) => Promise<{ success: boolean; error?: string }>;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdminRoute = pathname?.startsWith('/admin');

  const fetchProfile = useCallback(async () => {
    if (isAdminRoute) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to load user session:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [isAdminRoute]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store' });
    } catch (err) {
      console.error('Error logging out:', err);
    } finally {
      setUser(null);
      // Hard navigation on logout ensures all React state, cache, and session cookies are cleanly reset
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = '/login';
    }
  };

  const saveProfile = async (name: string, email?: string) => {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2) {
      return { success: false, error: 'Please enter your real full name (at least 2 characters).' };
    }

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, email: email?.trim() || null }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message || 'Failed to save profile.' };
      }

      setUser(data.user);
      return { success: true };
    } catch {
      return { success: false, error: 'Connection error. Please try again.' };
    }
  };

  const refreshUser = useCallback(async (freshUser?: UserProfileData | null) => {
    if (freshUser !== undefined) {
      setUser(freshUser);
      setLoading(false);
      return;
    }
    await fetchProfile();
  }, [fetchProfile]);

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        isModalOpen: false,
        openModal: () => {},
        closeModal: () => {},
        logout,
        refreshUser,
        setUser,
        saveProfile,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProvider');
  }
  return context;
}
