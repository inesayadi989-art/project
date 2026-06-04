import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '../lib/api';
import type { Category, Product, Store, Review } from '../lib/types';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { categories } = await api.getCategories();
      return (categories as Category[]).map((category) => ({
        ...category,
        name: category.name?.toString().normalize('NFC').trim() ?? category.name,
      }));
    },
  });
}

interface ProductFilters {
  categoryId?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  page?: number;
  pageSize?: number;
}

export function useProducts(filters: ProductFilters = {}) {
  const { categoryId, search, minPrice, maxPrice, sortBy = 'newest', page = 1, pageSize = 20 } = filters;

  return useQuery({
    queryKey: ['products', filters],
    queryFn: async () => {
      const params: any = {
        page,
        limit: pageSize,
      };

      if (categoryId) params.category = categoryId;
      if (search) params.search = search;
      if (minPrice !== undefined) params.minPrice = minPrice;
      if (maxPrice !== undefined) params.maxPrice = maxPrice;
      if (sortBy) params.sort = sortBy;

      const { products, page: currentPage, limit } = await api.getProducts(params);
      return { products: products as Product[], count: products.length };
    },
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { product } = await api.getProduct(id);
      return product as Product;
    },
    enabled: !!id,
  });
}

export function useFeaturedProducts() {
  return useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      const { products } = await api.getProducts({ limit: 8 });
      return products.slice(0, 8) as Product[];
    },
  });
}

export function useTrendingProducts() {
  return useQuery({
    queryKey: ['trending-products'],
    queryFn: async () => {
      const { products } = await api.getProducts({ limit: 8 });
      return products.slice(0, 8) as Product[];
    },
  });
}

export function useStores(limit?: number) {
  return useQuery({
    queryKey: ['stores', limit],
    queryFn: async () => {
      const { stores } = await api.getStores();
      return (limit ? stores.slice(0, limit) : stores) as Store[];
    },
  });
}

export function useStore(id: string) {
  return useQuery({
    queryKey: ['store', id],
    queryFn: async () => {
      return await api.getStore(id);
    },
    enabled: !!id,
  });
}

export function useSellerStore(userId: string) {
  return useQuery({
    queryKey: ['seller-store', userId],
    queryFn: async () => {
      try {
        const { store } = await api.getSellerStore(userId);
        return store as Store;
      } catch (error: any) {
        if (error?.message?.toString().includes('Store not found')) {
          return null as Store | null;
        }
        throw error;
      }
    },
    enabled: !!userId,
  });
}

interface CreateStoreInput {
  sellerId: string;
  name: string;
  description?: string;
  logo?: File;
  banner_url?: string;
  phone?: string;
  email?: string;
  governorate?: string;
  address?: string;
}

export function useCreateStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateStoreInput) => {
      const { sellerId, logo, ...rest } = input;
      const formData = new FormData();
      Object.entries(rest).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
      if (logo) {
        formData.append('logo', logo);
      }
      return await api.createStore(sellerId, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-store'] });
    },
  });
}

interface UpdateStoreInput {
  sellerId: string;
  updates: Partial<{
    name: string;
    description: string;
    logo_url: string;
    banner_url: string;
    phone: string;
    email: string;
    governorate: string;
    address: string;
  }> | FormData;
}

export function useUpdateStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sellerId, updates }: UpdateStoreInput) => {
      const { store } = await api.put(`/products/stores/seller/${sellerId}`, updates);
      return store as Store;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-store'] });
    },
  });
}

export function useSellerProducts(storeSlug: string) {
  return useQuery({
    queryKey: ['seller-products', storeSlug],
    queryFn: async () => {
      const { products } = await api.getSellerProducts(storeSlug);
      return products as Product[];
    },
    enabled: !!storeSlug,
  });
}

export function useProductReviews(productId: string) {
  return useQuery({
    queryKey: ['reviews', productId],
    queryFn: async () => {
      // Reviews not implemented yet in API
      return [] as Review[];
    },
    enabled: !!productId,
  });
}

export function useRelatedProducts(productId: string, categorySlug: string) {
  return useQuery({
    queryKey: ['related-products', productId, categorySlug],
    queryFn: async () => {
      const { products } = await api.getProducts({ category: categorySlug, limit: 4 });
      return products.filter(p => p.id !== productId) as Product[];
    },
    enabled: !!productId && !!categorySlug,
  });
}

export function useRecommendedProducts(userId: string) {
  return useQuery({
    queryKey: ['recommended-products', userId],
    queryFn: async () => {
      // For now, return featured products as recommendations
      const { products } = await api.getProducts({ limit: 8 });
      return products as Product[];
    },
    enabled: !!userId,
  });
}

export function useTrackProductView(userId: string | undefined, productId: string) {
  useEffect(() => {
    // Product view tracking not implemented yet
    // if (!userId || !productId) return;
    // api.trackProductView(userId, productId);
  }, [userId, productId]);
}

interface CreateProductInput {
  storeId: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compare_price?: number | null;
  stock_qty: number;
  tags?: string[];
  is_featured?: boolean;
  images?: File[];
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateProductInput) => {
      const { images, storeId, categoryId, tags, ...rest } = input;
      const formData = new FormData();
      formData.append('store_id', storeId);
      formData.append('category_id', categoryId);
      Object.entries(rest).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
      if (Array.isArray(tags)) {
        tags.forEach((tag) => formData.append('tags[]', tag));
      }
      (images ?? []).forEach((file) => formData.append('images', file));
      return await api.createProduct(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
    },
  });
}

interface UpdateProductInput extends Partial<CreateProductInput> {
  id: string;
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, images, storeId, categoryId, tags, ...rest }: UpdateProductInput) => {
      const formData = new FormData();
      Object.entries(rest).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
      if (categoryId) formData.append('category_id', categoryId);
      if (Array.isArray(tags)) {
        tags.forEach((tag) => formData.append('tags[]', tag));
      }
      (images ?? []).forEach((file) => formData.append('images', file));
      return await api.updateProduct(id, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      queryClient.invalidateQueries({ queryKey: ['product'] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (productId: string) => {
      return await api.deleteProduct(productId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
