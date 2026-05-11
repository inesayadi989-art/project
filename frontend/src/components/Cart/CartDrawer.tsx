import { X, ShoppingBag, Minus, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import { formatPrice } from '../../lib/types';
import { DEFAULT_PRODUCT_IMAGE } from '../UI/ProductCard';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, removeItem, updateQuantity, getTotal, getCount } = useCartStore();
  const total = getTotal();
  const count = getCount();

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-xl z-50 transform transition-transform duration-300 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Panier ({count})
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center px-6">
              <ShoppingBag size={64} className="text-gray-200 mb-4" />
              <p className="text-gray-500 font-medium">Votre panier est vide</p>
              <p className="text-gray-400 text-sm mt-1">
                Ajoutez des produits pour commencer vos achats
              </p>
              <button
                onClick={onClose}
                className="mt-4 btn-primary"
              >
                Continuer mes achats
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {items.map((item) => {
                const primaryImage =
                  item.product?.product_images?.find((img) => img.is_primary) ??
                  item.product?.product_images?.[0];
                const imageUrl = primaryImage?.url ?? DEFAULT_PRODUCT_IMAGE;

                return (
                  <div key={item.id} className="flex gap-3 p-4">
                    <img
                      src={imageUrl}
                      alt={item.product?.name ?? 'Produit'}
                      className="w-16 h-16 object-cover rounded-lg flex-shrink-0 bg-gray-50"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 line-clamp-2">
                        {item.product?.name ?? 'Produit'}
                      </h3>
                      <p className="text-sm font-bold text-primary-600 mt-1">
                        {formatPrice(item.unit_price)}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-6 h-6 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-sm font-medium w-6 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.id,
                              Math.min(item.quantity + 1, item.product?.stock_qty ?? 99)
                            )
                          }
                          className="w-6 h-6 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="ml-auto text-gray-300 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-gray-100 p-4 space-y-3">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Sous-total</span>
              <span className="font-medium text-gray-900">{formatPrice(total)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Livraison</span>
              <span className="text-gray-900">7.000 TND</span>
            </div>
            <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t border-gray-100">
              <span>Total</span>
              <span className="text-primary-600">{formatPrice(total + 7)}</span>
            </div>
            <Link
              to="/checkout"
              onClick={onClose}
              className="block w-full btn-primary text-center"
            >
              Commander
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
