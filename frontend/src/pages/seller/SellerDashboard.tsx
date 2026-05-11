import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { useSellerStore, useSellerProducts } from '../../hooks/useProducts';
import { useSellerOrders } from '../../hooks/useOrders';
import SellerLayout from './SellerLayout';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import BackButton from '../../components/UI/BackButton';
import { formatPrice } from '../../lib/types';
import { TrendingUp, Package, ShoppingBag, Star } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useEffect } from 'react';

function generateWeeklyData(orders: Array<{ order: { created_at?: string; total?: number } }>) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayKey = format(date, 'yyyy-MM-dd');
    const dayLabel = format(date, 'EEE', { locale: fr });
    const revenue = orders
      .filter((o) => o.order.created_at?.startsWith(dayKey))
      .reduce((sum, o) => sum + (o.order.total ?? 0), 0);
    return { day: dayLabel, revenue };
  });
  return days;
}

export default function SellerDashboard() {
  const { user, subscription, subscriptionStatus, refreshSubscription } = useAuthStore();
  const queryClient = useQueryClient();
  
  // Always call hooks with stable dependencies - NEVER conditionally
  const userId = user?.id || '';
  const { data: store, isLoading: storeLoading } = useSellerStore(userId);
  
  // Only use store data if it exists, otherwise use empty strings
  const storeSlug = store?.slug || '';
  const storeId = store?.id || '';
  
  const { data: products } = useSellerProducts(storeSlug);
  const { data: orders } = useSellerOrders(storeId);

  // Check if subscription is expired locally
  const isSubscriptionExpired = subscription?.current_period_end && new Date(subscription.current_period_end) < new Date();
  const effectiveSubscriptionStatus = isSubscriptionExpired ? 'expired' : subscription?.status;
  const subscriptionIntervalLabel = subscription?.interval_type === 'year' ? 'Yearly' : subscription?.interval_type === 'month' ? 'Monthly' : 'None';
  const subscriptionAmount = subscription ? Number(subscription.amount) : 0;

  // All hooks must be called BEFORE any early returns
  // Periodic refresh to check for expired subscriptions
  useEffect(() => {
    const interval = setInterval(() => {
      if (subscription && subscription.current_period_end) {
        const expiryDate = new Date(subscription.current_period_end);
        const now = new Date();
        
        // Refresh if expired or expires within next hour
        if (expiryDate < now || (expiryDate.getTime() - now.getTime()) < 3600000) {
          refreshSubscription();
        }
      }
    }, 300000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, [subscription, refreshSubscription]);

  if (storeLoading || subscriptionStatus === 'loading') {
    return (
      <SellerLayout>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </SellerLayout>
    );
  }

  if (!store) {
    return (
      <SellerLayout>
        <div className="text-center py-12 text-gray-500">
          <p>Votre boutique est en cours de création. Veuillez patienter.</p>
        </div>
      </SellerLayout>
    );
  }

  const weeklyData = generateWeeklyData(orders ?? []);
  const totalEarnings = (orders ?? []).reduce((sum, o) => sum + (o.order.total ?? 0), 0);
  const topProducts = (products ?? []).slice().sort((a, b) => b.sold_count - a.sold_count).slice(0, 5);
  const recentOrders = (orders ?? []).slice(0, 5);

  const ratingAverage = store.rating_avg ? Number(store.rating_avg) : 0;

  const subscriptionStatusText = effectiveSubscriptionStatus ?? 'inactive';
  const statusBadgeText = {
    active: '🟢 Active',
    pending: '🟡 Pending',
    expired: '🔴 Expired',
    inactive: '🔴 Expired',
  } as const;
  const subscriptionLabel = subscriptionStatusText === 'active'
    ? 'Active subscription'
    : subscriptionStatusText === 'pending'
      ? 'Pending verification'
      : 'Expired';
  const statusStyles = subscriptionStatusText === 'active'
    ? 'bg-green-100 text-green-700'
    : subscriptionStatusText === 'pending'
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-red-100 text-red-700';
  const badgeText = statusBadgeText[subscriptionStatusText as keyof typeof statusBadgeText];

  const stats = [
    {
      label: 'Revenus totaux',
      value: formatPrice(store.total_revenue ?? totalEarnings),
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Commandes',
      value: (orders ?? []).length.toString(),
      icon: ShoppingBag,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Produits',
      value: (products ?? []).length.toString(),
      icon: Package,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      label: 'Note moyenne',
      value: ratingAverage.toFixed(1),
      icon: Star,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
    },
  ];

  return (
    <SellerLayout>
      <div className="space-y-6">
        <div>
          <BackButton />

          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-gray-500 text-sm mt-1">Bienvenue, {store.name}</p>
        </div>

        {!store.is_approved && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
            Votre boutique est en attente d'approbation par l'administrateur. Vous pouvez ajouter des produits mais ils ne seront pas visibles jusqu'à l'approbation.
          </div>
        )}

        <div className="p-6 border border-gray-200 bg-white shadow-sm rounded-3xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.16em] text-gray-500">Seller Dashboard</p>
              <h2 className="mt-2 text-2xl font-bold text-gray-900">Subscription Overview</h2>
            </div>
            <button
              onClick={refreshSubscription}
              className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>

          <div className="mt-6 rounded-3xl border border-gray-100 bg-slate-50 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600">Status</p>
                <p className={`mt-2 text-lg font-semibold ${statusStyles}`}>{badgeText}</p>
              </div>
              <div className="text-sm text-gray-600">
                <p>📅 Expiry: {subscription?.current_period_end ?? 'N/A'}</p>
                <p className="mt-1">📦 Plan: {subscriptionIntervalLabel}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Plan</p>
                <p className="mt-2 text-sm font-semibold text-gray-900">{subscription?.plan_name ?? 'No plan selected'}</p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Next Payment</p>
                <p className="mt-2 text-sm font-semibold text-gray-900">{subscription?.next_payment_date ?? 'N/A'}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-600">{subscription ? `Amount: ${formatPrice(subscriptionAmount)}` : 'You have no active seller subscription yet.'}</p>
              <a
                href="/seller/subscription"
                className="inline-flex justify-center rounded-full bg-orange-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-900"
              >
                {subscription ? 'Renew Subscription' : 'Subscribe Now'}
              </a>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">{label}</p>
                <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center`}>
                  <Icon size={16} className={color} />
                </div>
              </div>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Weekly Revenue Chart */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Revenus des 7 derniers jours</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: unknown) => [`${Number(value).toFixed(3)} TND`, 'Revenus']}
              />
              <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Products */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Top produits</h2>
            {topProducts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Aucun produit vendu</p>
            ) : (
              <div className="space-y-3">
                {topProducts.map((product, idx) => (
                  <div key={product.id} className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.sold_count} vendus</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{formatPrice(product.price)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Orders */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Commandes récentes</h2>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Aucune commande</p>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">Commande #{order.id}</p>
                      <p className="text-xs text-gray-500">
                        {order.order.status} • {new Date(order.order.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-green-600">
                      {formatPrice(order.order.total)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </SellerLayout>
  );
}
