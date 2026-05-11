import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShoppingCart, Heart, ChevronRight, Minus, Plus, Star, Store, Package } from 'lucide-react';
import { useProduct, useProductReviews, useRelatedProducts, useTrackProductView } from '../hooks/useProducts';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import ProductCard from '../components/UI/ProductCard';
import StarRating from '../components/UI/StarRating';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import BackButton from '../components/UI/BackButton';
import { formatPrice, getDiscountPercent } from '../lib/types';
import { DEFAULT_PRODUCT_IMAGE } from '../components/UI/ProductCard';
import toast from 'react-hot-toast';

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const { addItem } = useCartStore();
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [wishlisted, setWishlisted] = useState(false);

  const { data: product, isLoading } = useProduct(id ?? '');
  const { data: reviews } = useProductReviews(id ?? '');
  const { data: relatedProducts } = useRelatedProducts(
    id ?? '',
    product?.category_id ?? ''
  );

  useTrackProductView(user?.id, id ?? '');

  const handleAddToCart = () => {
    if (!user) { toast.error('Connectez-vous pour ajouter au panier'); return; }
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

  const handleWishlist = async () => {
    toast.error('Fonctionnalité des favoris non disponible pour le moment');
    // Wishlist functionality not implemented yet
    // if (!user) { toast.error('Connectez-vous pour ajouter aux favoris'); return; }
    // if (!product) return;
    // if (wishlisted) {
    //   // Remove from wishlist
    //   setWishlisted(false);
    //   toast.success('Retiré des favoris');
    // } else {
    //   // Add to wishlist
    //   setWishlisted(true);
    //   toast.success('Ajouté aux favoris');
    // }
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
            <Link to={`/shop?category=${product.category.id}`} className="hover:text-primary-600">
              {product.category.name}
            </Link>
            <ChevronRight size={14} />
          </>
        )}
        <span className="text-gray-700 line-clamp-1">{product.name}</span>
      </nav>

      <BackButton to="/shop" />

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

          <div className="flex items-center gap-3 mb-4">
            <StarRating rating={product.rating_avg} count={product.review_count} size="md" />
            <span className="text-sm text-gray-400">•</span>
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
              className="flex-1 btn-cart py-3"
            >
              <ShoppingCart size={18} />
              {product.stock_qty === 0 ? 'Rupture de stock' : 'Ajouter au panier'}
            </button>
            <button
              onClick={handleWishlist}
              className={`p-3 rounded-lg border transition-colors ${
                wishlisted ? 'bg-red-50 border-red-200 text-red-500' : 'border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-400'
              }`}
            >
              <Heart size={20} className={wishlisted ? 'fill-current' : ''} />
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
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star size={12} className="fill-yellow-400 text-yellow-400" />
                    <span className="text-xs text-gray-500">{product.store.rating_avg?.toFixed(1)}</span>
                  </div>
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

      {/* Reviews */}
      <div className="card p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Avis clients</h2>
        {reviews && reviews.length > 0 ? (
          <>
            <div className="flex items-center gap-6 mb-6 p-4 bg-gray-50 rounded-xl">
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-900">{product.rating_avg.toFixed(1)}</div>
                <StarRating rating={product.rating_avg} size="md" />
                <p className="text-xs text-gray-500 mt-1">{product.review_count} avis</p>
              </div>
              <div className="flex-1">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = reviews.filter((r) => Math.round(r.rating) === star).length;
                  const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 mb-1">
                      <span className="text-xs w-3">{star}</span>
                      <Star size={10} className="fill-yellow-400 text-yellow-400 flex-shrink-0" />
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-400 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-6">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="border-b border-gray-50 pb-4 last:border-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold">
                        {review.customer?.full_name?.[0]?.toUpperCase() ?? 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {review.customer?.full_name ?? 'Client anonyme'}
                        </p>
                        <StarRating rating={review.rating} size="sm" />
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(review.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  {review.title && <p className="text-sm font-medium text-gray-900 mb-1">{review.title}</p>}
                  {review.body && <p className="text-sm text-gray-600">{review.body}</p>}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <Star size={32} className="mx-auto mb-2 opacity-30" />
            <p>Aucun avis pour ce produit</p>
          </div>
        )}
      </div>

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
