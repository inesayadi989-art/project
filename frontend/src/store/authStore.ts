import { create } from 'zustand';
import { api } from '../lib/api';
import { useCartStore } from './cartStore';
import type { Profile, SellerSubscription } from '../lib/types';

let subscriptionFetchId = 0;

interface AuthState {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  subscription: SellerSubscription | null;
  subscriptionStatus: 'idle' | 'loading' | 'success' | 'error';
  subscriptionError: string | null;
  loading: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: 'customer' | 'seller') => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  refreshSubscription: () => Promise<void>;
  checkSubscription: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  subscription: null,
  subscriptionStatus: 'idle',
  subscriptionError: null,
  loading: true,

  initialize: async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        // Verify token by getting profile
        try {
          const { user } = await api.getProfile();
          set({
            user: { id: user.id.toString(), email: user.email },
            profile: user
          });
          localStorage.setItem('user_id', user.id.toString());
          useCartStore.getState().loadCart(user.id.toString());

          // Fetch subscription for sellers
          if (user.role === 'seller') {
            try {
              const fetchId = ++subscriptionFetchId;
              const { subscription } = await api.getSellerSubscription();

              if (fetchId === subscriptionFetchId) {
                set({ subscription, subscriptionStatus: 'success' });
              }
            } catch (error) {
              if (fetchId === subscriptionFetchId) {
                set({ subscriptionError: error instanceof Error ? error.message : 'Failed to fetch subscription', subscriptionStatus: 'error' });
              }
              console.error('Failed to fetch subscription:', error);
            }
          }
        } catch (error) {
          // Token invalid, clear it
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_id');
        }
      }
    } catch (error) {
      console.error('Initialize error:', error);
    } finally {
      set({ loading: false });
    }
  },

  signIn: async (email: string, password: string) => {
    const response = await api.signIn(email, password);
    const userId = response.user.id.toString();
    set({
      user: { id: userId, email: response.user.email },
      profile: response.user
    });
    localStorage.setItem('user_id', userId);
    useCartStore.getState().loadCart(userId);

    // Fetch subscription for sellers
    if (response.user.role === 'seller') {
      try {
        const fetchId = ++subscriptionFetchId;
        const { subscription } = await api.getSellerSubscription();

        if (fetchId === subscriptionFetchId) {
          set({ subscription, subscriptionStatus: 'success' });
        }
      } catch (error) {
        if (fetchId === subscriptionFetchId) {
          set({ subscriptionError: error instanceof Error ? error.message : 'Failed to fetch subscription', subscriptionStatus: 'error' });
        }
        console.error('Failed to fetch subscription:', error);
      }
    }
  },

  signUp: async (email: string, password: string, fullName: string, role: 'customer' | 'seller') => {
    const response = await api.signUp(email, password, fullName, role);
    const userId = response.user.id.toString();
    set({
      user: { id: userId, email: response.user.email },
      profile: response.user
    });
    localStorage.setItem('user_id', userId);
    useCartStore.getState().loadCart(userId);

    // Fetch subscription for sellers
    if (role === 'seller') {
      try {
        const fetchId = ++subscriptionFetchId;
        const { subscription } = await api.getSellerSubscription();

        if (fetchId === subscriptionFetchId) {
          set({ subscription, subscriptionStatus: 'success' });
        }
      } catch (error) {
        if (fetchId === subscriptionFetchId) {
          set({ subscriptionError: error instanceof Error ? error.message : 'Failed to fetch subscription', subscriptionStatus: 'error' });
        }
        console.error('Failed to fetch subscription:', error);
      }
    }
  },

  signOut: async () => {
    await api.signOut();
    set({ user: null, profile: null, subscription: null });
    localStorage.removeItem('user_id');
    useCartStore.getState().clearCart();
  },

  refreshProfile: async () => {
    const { user } = get();
    if (!user) return;

    const { user: profile } = await api.getProfile();
    set({ profile });
  },

  updateProfile: async (updates: Partial<Profile>) => {
    await api.updateProfile(updates);
    await get().refreshProfile();
  },

  refreshSubscription: async () => {
    const { profile } = get();
    if (!profile || profile.role !== 'seller') return;

    const fetchId = ++subscriptionFetchId;
    set({ subscriptionStatus: 'loading', subscriptionError: null });

    try {
      const { subscription } = await api.getSellerSubscription();

      // Only update if this is the latest fetch
      if (fetchId === subscriptionFetchId) {
        set({
          subscription,
          subscriptionStatus: 'success',
          subscriptionError: null
        });
      }
    } catch (error) {
      // Only update error if this is the latest fetch
      if (fetchId === subscriptionFetchId) {
        set({
          subscriptionError: error instanceof Error ? error.message : 'Failed to refresh subscription',
          subscriptionStatus: 'error'
        });
      }
      console.error('Failed to refresh subscription:', error);
    }
  },

  checkSubscription: async () => {
    const { user, profile } = get();
    if (!user || profile?.role !== 'seller') return true;

    try {
      const fetchId = ++subscriptionFetchId;
      const { subscription } = await api.getSellerSubscription();

      if (fetchId === subscriptionFetchId) {
        set({ subscription, subscriptionStatus: 'success' });
        return subscription?.status === 'active';
      }
      return false;
    } catch (error) {
      if (fetchId === subscriptionFetchId) {
        set({ subscriptionError: error instanceof Error ? error.message : 'Failed to check subscription', subscriptionStatus: 'error' });
      }
      console.error('Error checking subscription:', error);
      return false;
    }
  },
}));
