import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

export function useCreatePayment() {
  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await api.createPaymentSession(orderId);
      return response;
    },
    onError: (error: any) => {
      const message = error instanceof Error ? error.message : 'Failed to create payment session';
      console.error('Payment creation error:', message);
      toast.error(message);
    },
  });
}

export function useVerifyPayment() {
  return useMutation({
    mutationFn: async (paymentId: string) => {
      return await api.verifyPayment(paymentId);
    },
    onError: (error: any) => {
      console.error('Payment verification error:', error);
    },
  });
}
