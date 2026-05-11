import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingBag, Store, Truck, Shield, RotateCcw, Headphones, ArrowRight, Star, Cpu, Shirt, Home, Paintbrush, Activity, HeartPulse, Leaf } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCategories, useFeaturedProducts, useTrendingProducts, useStores, useRecommendedProducts } from '../hooks/useProducts';
import ProductCard from '../components/UI/ProductCard';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { formatPrice, Category } from '../lib/types';

const CATEGORY_ICON_MAP: Record<string, any> = {
  electronique: Cpu,
  'mode-vetements': Shirt,
  'mode-&-vetements': Shirt,
  maison: Home,
  'maison-&-deco': Home,
  maisondeco: Home,
  artisanat: Paintbrush,
  'artisanat-&-art': Paintbrush,
  sport: Activity,
  loisirs: Activity,
  'sport-&-loisirs': Activity,
  sante: HeartPulse,
  beaute: HeartPulse,
  'sante-&-beaute': HeartPulse,
  jardinage: Leaf,
};

function normalizeCategoryKey(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/&/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

function getCategoryIcon(category: Category) {
  const key = category.slug?.toLowerCase() || normalizeCategoryKey(category.name);
  return CATEGORY_ICON_MAP[key] || ShoppingBag;
}

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: featuredProducts, isLoading: featuredLoading } = useFeaturedProducts();
  const { data: trendingProducts, isLoading: trendingLoading } = useTrendingProducts();
  const { data: stores } = useStores(6);
  const { data: recommendedProducts } = useRecommendedProducts(user?.id ?? '');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const trustBadges = [
    { icon: Truck, title: 'Livraison rapide', desc: 'Partout en Tunisie' },
    { icon: Shield, title: 'Paiement sécurisé', desc: 'Transactions protégées' },
    { icon: RotateCcw, title: 'Retours faciles', desc: '7 jours pour retourner' },
    { icon: Headphones, title: 'Support 24/7', desc: 'Toujours disponible' },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 text-white overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-28">
          <div className="max-w-2xl">
            <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4">
              Découvrez le meilleur du commerce tunisien
            </h1>
            <p className="text-primary-100 text-lg mb-8">
              Achetez auprès de milliers de vendeurs locaux. Des produits authentiques, livrés directement chez vous.
            </p>
            
           
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {trustBadges.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon size={20} className="text-primary-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{title}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-12">
        {/* Categories */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Catégories</h2>
            <Link to="/shop" className="text-sm text-primary-100 hover:text-white/80 flex items-center gap-1">
              Voir tout <ArrowRight size={14} />
            </Link>
          </div>
          {categoriesLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : (
            <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
              {(categories ?? []).slice(0, 8).map((cat) => {
                const CategoryIcon = getCategoryIcon(cat);
                return (
                  <Link
                    key={cat.id}
                    to={`/shop?category=${cat.id}`}
                    className="flex flex-col items-center gap-2 p-3 bg-white rounded-xl border border-gray-100 hover:border-primary-200 hover:shadow-sm transition-all group"
                  >
                    {cat.icon_url ? (
                      <img src={cat.icon_url} alt={cat.name} className="w-10 h-10 object-contain" />
                    ) : (
                      <div className="w-10 h-10 bg-primary-50 group-hover:bg-primary-100 rounded-lg flex items-center justify-center transition-colors">
                        <CategoryIcon size={20} className="text-gray-500" />
                      </div>
                    )}
                    <span className="text-xs font-medium text-gray-700 text-center line-clamp-2">
                      {cat.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Recommended */}
        {user && recommendedProducts && recommendedProducts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Recommandés pour vous</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recommendedProducts.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        {/* Featured Products */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Produits vedettes</h2>
            <Link to="/shop" className="text-sm text-primary-100 hover:text-white/80 flex items-center gap-1">
              Voir tout <ArrowRight size={14} />
            </Link>
          </div>
          {featuredLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : (featuredProducts ?? []).length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ShoppingBag size={48} className="mx-auto mb-3 opacity-40" />
              <p>Aucun produit vedette pour le moment</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(featuredProducts ?? []).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>

        {/* Popular Stores */}
        {stores && stores.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Boutiques populaires</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {stores.map((store) => (
                <div key={store.id} className="card p-4 text-center hover:shadow-md transition-shadow">
                  {store.logo_url ? (
                    <img
                      src={store.logo_url}
                      alt={store.name}
                      className="w-14 h-14 object-cover rounded-full mx-auto mb-2"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-primary-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                      <Store size={22} className="text-primary-600" />
                    </div>
                  )}
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">{store.name}</h3>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Star size={12} className="fill-yellow-400 text-yellow-400" />
                    <span className="text-xs text-gray-500">{(store.rating_avg ?? 0).toFixed(1)}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{store.total_sales} ventes</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Trending */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Tendances</h2>
            <Link to="/shop?sort=popular" className="text-sm text-primary-100 hover:text-white/80 flex items-center gap-1">
              Voir tout <ArrowRight size={14} />
            </Link>
          </div>
          {trendingLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : (trendingProducts ?? []).length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ShoppingBag size={48} className="mx-auto mb-3 opacity-40" />
              <p>Aucun produit tendance pour le moment</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(trendingProducts ?? []).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>

        {/* Seller CTA */}
        <section className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-8 md:p-12 text-white text-center">
          <Store size={40} className="mx-auto mb-4 opacity-80" />
          <h2 className="text-2xl font-bold mb-3">Vous avez des produits à vendre ?</h2>
          <p className="text-primary-100 mb-6 max-w-lg mx-auto">
            Rejoignez des milliers de vendeurs sur Souk.tn et développez votre activité en ligne dès aujourd'hui.
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary-700 font-semibold rounded-lg hover:bg-primary-50 transition-colors"
            >
              <Store size={18} /> Commencez à vendre
            </Link>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 bg-opacity-50 text-white font-semibold rounded-lg border border-white border-opacity-30 hover:bg-opacity-70 transition-colors"
            >
              En savoir plus
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
