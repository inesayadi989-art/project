import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShoppingCart, ChevronRight, Minus, Plus, Store, Package } from 'lucide-react';
import { useProduct, useRelatedProducts, useTrackProductView } from '../hooks/useProducts';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import ProductCard from '../components/UI/ProductCard';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { formatPrice, getDiscountPercent } from '../lib/types';
import { DEFAULT_PRODUCT_IMAGE } from '../components/UI/ProductCard';
import toast from 'react-hot-toast';

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile, isClientMode } = useAuthStore();
  const { addItem } = useCartStore();
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const { data: product, isLoading } = useProduct(id ?? '');
  const { data: relatedProducts } = useRelatedProducts(
    id ?? '',
    product?.category?.slug ?? ''
  );

  useTrackProductView(user?.id, id ?? '');

  const handleAddToCart = () => {
    if (!user) { toast.error('Connectez-vous pour ajouter au panier'); return; }
    // Only customers or sellers in client mode can add to cart
    if (profile?.role !== 'customer' && !(profile?.role === 'seller' && isClientMode)) {
      if (profile?.role === 'seller') {
        toast.error('Activez le mode client pour ajouter au panier');
      }
      return;
    }
    if (!product) return;
    addItem(product.id, quantity, product.price, {
      id: product.id,
      name: product.name,
      price: product.price,
      stock_qty: product.stock_qty,
      product_images: product.product_images?.map((img) => ({ url: img.url, is_primary: img.is_primary })),
    });
    toast.success('Produit ajouté au panier');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner size="lg" message="Chargement du produit..." />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <Package size={64} className="mx-auto mb-4 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-700">Produit introuvable</h2>
        <Link to="/shop" className="mt-4 btn-primary inline-flex">Retour à la boutique</Link>
      </div>
    );
  }

  const images = product.product_images ?? [];
  const currentImage = images[selectedImageIndex]?.url ?? DEFAULT_PRODUCT_IMAGE;
  const discount = getDiscountPercent(product.price, product.compare_price);
  const maxQty = Math.min(product.stock_qty, 10);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-400 mb-6 flex-wrap">
        <Link to="/" className="hover:text-primary-600">Accueil</Link>
        <ChevronRight size={14} />
        {product.category && (
          <>
            <Link to={`/shop?category=${product.category.slug}`} className="hover:text-primary-600">
              {product.category.name}
            </Link>
            <ChevronRight size={14} />
          </>
        )}
        <span className="text-gray-700 line-clamp-1">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* Images */}
        <div>
          <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden mb-3">
            <img
              src={currentImage}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE; }}
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                    idx === selectedImageIndex ? 'border-primary-500' : 'border-gray-200'
                  }`}
                >
                  <img
                    src={img.url}
                    alt={img.alt_text ?? product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE; }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{product.name}</h1>

          {profile?.role === 'seller' && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-sm text-gray-500">{product.view_count} vues</span>
              </div>

              <div className="flex items-center gap-2 mb-4">
                {product.stock_qty > 0 ? (
                  <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    En stock ({product.stock_qty} disponibles)
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-sm text-red-600 font-medium">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    Rupture de stock
                  </span>
                )}
              </div>
            </>
          )}

          <div className="flex items-end gap-3 mb-6">
            <span className="text-3xl font-bold text-gray-900">{formatPrice(product.price)}</span>
            {product.compare_price && product.compare_price > product.price && (
              <>
                <span className="text-lg text-gray-400 line-through">{formatPrice(product.compare_price)}</span>
                <span className="bg-red-100 text-red-600 text-sm font-bold px-2 py-0.5 rounded-full">
                  -{discount}%
                </span>
              </>
            )}
          </div>

          {product.stock_qty > 0 && (
            <div className="flex items-center gap-3 mb-6">
              <span className="text-sm font-medium text-gray-700">Quantité:</span>
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-9 h-9 flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                  <Minus size={14} />
                </button>
                <span className="w-10 text-center text-sm font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(maxQty, quantity + 1))}
                  className="w-9 h-9 flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3 mb-6">
            <button
              onClick={handleAddToCart}
              disabled={product.stock_qty === 0}
              className="flex-1 btn-primary py-3"
            >
              <ShoppingCart size={18} />
              {product.stock_qty === 0 ? 'Rupture de stock' : 'Ajouter au panier'}
            </button>
          </div>

          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {product.tags.map((tag) => (
                <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Seller Info */}
          {product.store && (
            <div className="card p-4">
              <div className="flex items-center gap-3">
                {product.store.logo_url ? (
                  <img
                    src={product.store.logo_url}
                    alt={product.store.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <Store size={20} className="text-primary-600" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{product.store.name}</h3>
                  {product.store.rating_avg != null && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      Note: {product.store.rating_avg.toFixed(1)}
                    </div>
                  )}
                </div>
                <Link
                  to={`/shop?store=${product.store_id}`}
                  className="btn-secondary text-xs"
                >
                  Voir la boutique
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {product.description && (
        <div className="card p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
          <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{product.description}</p>
        </div>
      )}


      {/* Related Products */}
      {relatedProducts && relatedProducts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Produits similaires</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
