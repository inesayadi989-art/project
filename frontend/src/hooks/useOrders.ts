import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import type { Order, OrderItem, CartItem } from '../lib/types';

export function useOrders(userId: string) {
  return useQuery({
    queryKey: ['orders', userId],
    queryFn: async () => {
      const { orders } = await api.getOrders();
      return orders as Order[];
    },
    enabled: !!userId,
  });
}

interface CreateOrderInput {
  customerId: string;
  items: CartItem[];
  shipFullName: string;
  shipPhone: string;
  shipAddressLine1: string;
  shipCity: string;
  shipGovernorate: string;
  notes?: string;
  paymentMethod: string;
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const { isClientMode } = useAuthStore();

  return useMutation({
    mutationFn: async (input: CreateOrderInput) => {
      const orderItems = input.items.map((item) => ({
        productId: Number(item.product_id),
        quantity: item.quantity,
      }));

      let storeId =
        Number(input.items[0]?.product?.store_id) ||
        Number(input.items[0]?.product?.store?.id);

      // If storeId is not available in cart item, fetch the product details
      if (!storeId && input.items[0]?.product_id) {
        try {
          const productDetails = await api.getProduct(input.items[0].product_id);
          storeId =
            Number(productDetails.product?.store_id) ||
            Number(productDetails.product?.store?.id);
        } catch (error) {
          console.error('Failed to fetch product details:', error);
        }
      }

      if (!storeId) {
        throw new Error('Impossible de déterminer la boutique pour la commande');
      }

      const orderData = {
        storeId,
        items: orderItems,
        paymentMethod: input.paymentMethod,
        shippingAddress: {
          full_name: input.shipFullName,
          phone: input.shipPhone,
          address_line1: input.shipAddressLine1,
          city: input.shipCity,
          governorate: input.shipGovernorate,
        },
        ...(isClientMode ? { mode: 'client' } : {}),
      };
      return await api.createOrder(orderData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useSellerOrders(storeId: string) {
  return useQuery({
    queryKey: ['seller-orders', storeId],
    queryFn: async () => {
      const { orders } = await api.getSellerOrders();
      return (orders ?? []) as Order[];
    },
    enabled: !!storeId,
    retry: 1,
    staleTime: 60000,
  });
}

export function useAdminOrders() {
  return useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { orders } = await api.getAdminOrders();
      return orders as (Order & { customer: { id: string; full_name: string; email: string } })[];
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: Order['status'] }) => {
      return await api.updateOrderStatus(orderId, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
