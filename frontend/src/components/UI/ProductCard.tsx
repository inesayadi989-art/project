import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Heart } from 'lucide-react';
import type { Product } from '../../lib/types';
import { formatPrice, getDiscountPercent } from '../../lib/types';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import StarRating from './StarRating';
import toast from 'react-hot-toast';

export const DEFAULT_PRODUCT_IMAGE =
  'https://images.pexels.com/photos/5632399/pexels-photo-5632399.jpeg?auto=compress&cs=tinysrgb&w=400';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const { addItem } = useCartStore();
  const { user } = useAuthStore();

  const primaryImage =
    product.product_images?.find((img) => img.is_primary) ??
    product.product_images?.[0];
  const imageUrl = primaryImage?.url ?? DEFAULT_PRODUCT_IMAGE;

  const discount = getDiscountPercent(product.price, product.compare_price);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Connectez-vous pour ajouter au panier');
      return;
    }
    if (product.stock_qty === 0) return;
    addItem(product.id, 1, product.price, {
      id: product.id,
      name: product.name,
      price: product.price,
      stock_qty: product.stock_qty,
      store_id: product.store_id,
      product_images: product.product_images?.map((img) => ({ url: img.url, is_primary: img.is_primary })),
    });
    toast.success('Produit ajouté au panier');
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    toast.error('Fonctionnalité des favoris non disponible pour le moment');
    // Wishlist functionality not implemented yet
    // if (!user) {
    //   toast.error('Connectez-vous pour ajouter aux favoris');
    //   return;
    // }
    // setWishlistLoading(true);
    // try {
    //   if (wishlisted) {
    //     // Remove from wishlist
    //     setWishlisted(false);
    //     toast.success('Retiré des favoris');
    //   } else {
    //     // Add to wishlist
    //     setWishlisted(true);
    //     toast.success('Ajouté aux favoris');
    //   }
    // } finally {
    //   setWishlistLoading(false);
    // }
  };

  return (
    <Link to={`/product/${product.id}`} className="group block">
      <div className="card overflow-hidden hover:shadow-md transition-shadow duration-200">
        <div className="relative aspect-square overflow-hidden bg-gray-50">
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
            }}
          />
          {discount > 0 && (
            <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              -{discount}%
            </span>
          )}
          {product.stock_qty === 0 && (
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
              <span className="bg-white text-gray-800 text-sm font-medium px-3 py-1 rounded-full">
                Rupture de stock
              </span>
            </div>
          )}
          <button
            onClick={handleWishlist}
            disabled={wishlistLoading}
            className={`absolute top-2 right-2 p-1.5 rounded-full transition-colors ${
              wishlisted
                ? 'bg-red-500 text-white'
                : 'bg-white text-gray-400 hover:text-red-500'
            } shadow-sm`}
          >
            <Heart size={16} className={wishlisted ? 'fill-current' : ''} />
          </button>
        </div>

        <div className="p-3">
          {product.store && (
            <p className="text-xs text-gray-400 mb-1 line-clamp-1">{product.store.name}</p>
          )}
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1.5 min-h-[2.5rem]">
            {product.name}
          </h3>
          <StarRating rating={product.rating_avg} count={product.review_count} />
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900">{formatPrice(product.price)}</span>
            {product.compare_price && product.compare_price > product.price && (
              <span className="text-xs text-gray-400 line-through">
                {formatPrice(product.compare_price)}
              </span>
            )}
          </div>
          <button
            onClick={handleAddToCart}
            disabled={product.stock_qty === 0}
            className="mt-3 w-full btn-cart text-xs py-1.5"
          >
            <ShoppingCart size={14} />
            Ajouter au panier
          </button>
        </div>
      </div>
    </Link>
  );
}
