import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { SubscriptionPlan, SellerSubscription } from '../lib/types';

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { plans } = await api.getSubscriptionPlans();
      return plans as SubscriptionPlan[];
    },
  });
}

export function useSellerSubscription() {
  return useQuery({
    queryKey: ['seller-subscription'],
    queryFn: async () => {
      const { subscription } = await api.getSellerSubscription();
      return subscription as SellerSubscription | null;
    },
  });
}

export function useCreateSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: number | { planId: number; paymentMethod?: string }) => {
      if (typeof payload === 'number') {
        return api.createSubscription(payload);
      }
      return api.createSubscription(payload.planId, payload.paymentMethod);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-subscription'] });
    },
  });
}

export function useVerifySubscription() {
  return useMutation({
    mutationFn: async (subscriptionId: string) => {
      const response = await api.verifySubscription(subscriptionId);
      return response;
    },
  });
}

export function useSendSubscriptionOtp() {
  return useMutation({
    mutationFn: async (payload: { subscriptionId: string; phone: string }) => {
      return api.sendSubscriptionOtp(payload.subscriptionId, payload.phone);
    },
  });
}

export function useVerifySubscriptionOtp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { subscriptionId: string; code: string }) => {
      return api.verifySubscriptionOtp(payload.subscriptionId, payload.code);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-subscription'] });
    },
  });
}
