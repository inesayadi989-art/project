import { create } from 'zustand';
import type { CartItem } from '../lib/types';

interface CartState {
  items: CartItem[];
  loadCart: (userId: string) => Promise<void>;
  addItem: (
    productId: string,
    quantity: number,
    price: number,
    product?: CartItem['product']
  ) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, qty: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getTotal: () => number;
  getCount: () => number;
}

const CART_STORAGE_KEY = 'souktn_cart';

const loadInitialCart = (): CartItem[] => {
  const userId = localStorage.getItem('user_id');
  if (!userId) return [];
  const stored = localStorage.getItem(`${CART_STORAGE_KEY}_${userId}`);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as CartItem[];
  } catch (error) {
    console.error('Failed to parse initial cart from localStorage:', error);
    return [];
  }
};

export const useCartStore = create<CartState>((set, get) => ({
  items: loadInitialCart(),

  loadCart: async (userId: string) => {
    const stored = localStorage.getItem(`${CART_STORAGE_KEY}_${userId}`);
    if (stored) {
      try {
        const items = JSON.parse(stored);
        set({ items });
      } catch (error) {
        console.error('Failed to load cart from localStorage:', error);
      }
    }
  },

  addItem: async (productId, quantity, price, product) => {
    const { items } = get();
    const existing = items.find((i) => i.product_id === productId);

    if (existing) {
      const newQty = existing.quantity + quantity;
      const updatedItems = items.map((i) =>
        i.product_id === productId ? { ...i, quantity: newQty } : i
      );
      set({ items: updatedItems });
      // Save to localStorage
      const userId = localStorage.getItem('user_id');
      if (userId) {
        localStorage.setItem(`${CART_STORAGE_KEY}_${userId}`, JSON.stringify(updatedItems));
      }
    } else {
      const newItem: CartItem = {
        id: `temp_${Date.now()}`,
        product_id: productId,
        quantity,
        unit_price: price,
        product,
      };
      const updatedItems = [...items, newItem];
      set({ items: updatedItems });
      // Save to localStorage
      const userId = localStorage.getItem('user_id');
      if (userId) {
        localStorage.setItem(`${CART_STORAGE_KEY}_${userId}`, JSON.stringify(updatedItems));
      }
    }
  },

  removeItem: async (itemId: string) => {
    const { items } = get();
    const updatedItems = items.filter((i) => i.id !== itemId);
    set({ items: updatedItems });
    // Save to localStorage
    const userId = localStorage.getItem('user_id');
    if (userId) {
      localStorage.setItem(`${CART_STORAGE_KEY}_${userId}`, JSON.stringify(updatedItems));
    }
  },

  updateQuantity: async (itemId: string, qty: number) => {
    const { items } = get();
    if (qty <= 0) {
      await get().removeItem(itemId);
      return;
    }
    const updatedItems = items.map((i) => (i.id === itemId ? { ...i, quantity: qty } : i));
    set({ items: updatedItems });
    // Save to localStorage
    const userId = localStorage.getItem('user_id');
    if (userId) {
      localStorage.setItem(`${CART_STORAGE_KEY}_${userId}`, JSON.stringify(updatedItems));
    }
  },

  clearCart: async () => {
    set({ items: [] });
    // Clear from localStorage
    const userId = localStorage.getItem('user_id');
    if (userId) {
      localStorage.removeItem(`${CART_STORAGE_KEY}_${userId}`);
    }
  },

  getTotal: () => {
    return get().items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  },

  getCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },
}));
