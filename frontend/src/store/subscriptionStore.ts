import { create } from 'zustand';
import { api } from '../lib/api';
import type { SellerSubscription, SubscriptionPlan } from '../lib/types';

interface SubscriptionState {
  subscription: SellerSubscription | null;
  plans: SubscriptionPlan[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchSubscription: () => Promise<void>;
  fetchPlans: () => Promise<void>;
  createSubscription: (planId: number, paymentMethod?: string) => Promise<{ paymentUrl?: string; subscriptionId?: string }>;
  verifySubscription: (subscriptionId: string) => Promise<SellerSubscription | null>;
  refreshSubscription: () => Promise<void>;
  clearSubscription: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  subscription: null,
  plans: [],
  loading: false,
  error: null,

  fetchSubscription: async () => {
    set({ loading: true, error: null });
    try {
      const { subscription } = await api.getSellerSubscription();
      set({ subscription, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch subscription', loading: false });
    }
  },

  fetchPlans: async () => {
    set({ loading: true, error: null });
    try {
      const { plans } = await api.getSubscriptionPlans();
      set({ plans, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch plans', loading: false });
    }
  },

  createSubscription: async (planId: number, paymentMethod?: string) => {
    set({ loading: true, error: null });
    try {
      const response = await api.createSubscription(planId, paymentMethod);
      set({ loading: false });
      return response;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create subscription', loading: false });
      throw error;
    }
  },

  verifySubscription: async (subscriptionId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await api.verifySubscription(subscriptionId);
      const subscription = response.subscription;
      set({ subscription, loading: false });
      return subscription;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to verify subscription', loading: false });
      throw error;
    }
  },

  refreshSubscription: async () => {
    await get().fetchSubscription();
  },

  clearSubscription: () => {
    set({ subscription: null, error: null });
  },
}));