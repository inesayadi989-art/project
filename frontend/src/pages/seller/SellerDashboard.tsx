import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useSellerStore, useSellerProducts, useCreateStore } from '../../hooks/useProducts';
import { useSellerOrders } from '../../hooks/useOrders';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { formatPrice } from '../../lib/types';
import { TrendingUp, Package, ShoppingBag } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Date non définie';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Date invalide';
    return date.toLocaleDateString('fr-FR');
  } catch {
    return 'Date invalide';
  }
};

type DashboardOrderItem = {
  product_id?: number | string;
  product_name?: string | null;
  quantity?: number;
  price?: number;
  unit_price?: number;
};

type DashboardOrder = {
  id: string;
  order_number?: string;
  status?: string;
  total?: number;
  created_at?: string;
  items?: DashboardOrderItem[];
};

function generateWeeklyData(orders: Array<{ created_at?: string; total?: number }>) {
  return Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayKey = format(date, 'yyyy-MM-dd');
    const dayLabel = format(date, 'EEE', { locale: fr });
    const dailyOrders = orders.filter((o) => o.created_at?.startsWith(dayKey));
    const revenue = dailyOrders.reduce((sum, o) => sum + (o.total ?? 0), 0);
    return { day: dayLabel, revenue, commandes: dailyOrders.length };
  });
}

function getTopProductsFromOrders(orders: DashboardOrder[]) {
  const productSales = new Map<string, { id: string; name: string; quantity: number; revenue: number; price: number }>();
  orders.flatMap((o) => o.items ?? []).forEach((item) => {
    const productId = String(item.product_id ?? item.product_name ?? 'unknown');
    const productName = item.product_name ?? 'Produit inconnu';
    const quantity = Number(item.quantity ?? 0);
    const price = Number(item.price ?? item.unit_price ?? 0);
    if (quantity <= 0) return;
    const existing = productSales.get(productId);
    if (existing) {
      existing.quantity += quantity;
      existing.revenue += price * quantity;
    } else {
      productSales.set(productId, { id: productId, name: productName, quantity, revenue: price * quantity, price });
    }
  });
  return Array.from(productSales.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
}

// Custom tooltip for chart
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name} :</span>
          <span className="font-semibold text-gray-800">
            {p.name === 'Revenu' ? `${Number(p.value).toFixed(2)} TND` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function SellerDashboard() {
  const { user, subscription, subscriptionStatus, refreshSubscription } = useAuthStore();

  const userId = user?.id || '';
  const { data: store, isLoading: storeLoading } = useSellerStore(userId);
  const createStore = useCreateStore();
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreDescription, setNewStoreDescription] = useState('');
  const [newStoreLogoFile, setNewStoreLogoFile] = useState<File | null>(null);
  const [newStoreLogoPreview, setNewStoreLogoPreview] = useState('');
  const [creatingStore, setCreatingStore] = useState(false);
  const storeSlug = store?.slug || '';
  const storeId = store?.id || '';

  const { data: products } = useSellerProducts(storeSlug);
  const { data: orders } = useSellerOrders(storeId);

  const completedOrders = ((orders ?? []) as DashboardOrder[]).filter(
    (o) => o.status === 'completed' || o.status === 'paid_confirmed'
  );
  const weeklyData = generateWeeklyData(completedOrders);
  const totalEarnings = completedOrders.reduce((sum, o) => sum + (o.total ?? 0), 0);
  const topProducts = getTopProductsFromOrders(completedOrders);
  const recentOrders = completedOrders.slice(0, 5);

  const isSubscriptionExpired = subscription?.end_date && new Date(subscription.end_date) < new Date();
  const subscriptionAmount = subscription ? Number(subscription.amount) : 0;
  const hasActiveSubscription = subscription?.status === 'active' && subscription?.payment_status === 'paid';
  const subscriptionStatusText = isSubscriptionExpired
    ? 'expired'
    : subscription?.status === 'active' && subscription?.payment_status === 'unpaid'
    ? 'pending'
    : subscription?.status ?? 'inactive';

  useEffect(() => {
    const interval = setInterval(() => {
      if (subscription?.end_date) {
        const expiryDate = new Date(subscription.end_date);
        const now = new Date();
        if (expiryDate < now || expiryDate.getTime() - now.getTime() < 3600000) {
          refreshSubscription();
        }
      }
    }, 300000);
    return () => clearInterval(interval);
  }, [subscription, refreshSubscription]);

  useEffect(() => {
    return () => {
      if (newStoreLogoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(newStoreLogoPreview);
      }
    };
  }, [newStoreLogoPreview]);

  const handleCreateStore = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // Check subscription before creating store
    if (!hasActiveSubscription) {
      toast.error('Vous devez avoir un abonnement actif pour créer une boutique.');
      return;
    }

    if (!userId) {
      toast.error('Impossible de créer la boutique sans utilisateur connecté.');
      return;
    }

    if (!newStoreName.trim()) {
      toast.error('Le nom de la boutique est requis.');
      return;
    }

    setCreatingStore(true);
    try {
      await createStore.mutateAsync({
        sellerId: userId,
        name: newStoreName.trim(),
        description: newStoreDescription.trim(),
        logo: newStoreLogoFile || undefined,
      });

      toast.success('Boutique créée avec succès.');
      setNewStoreName('');
      setNewStoreDescription('');
      setNewStoreLogoFile(null);
      setNewStoreLogoPreview('');
    } catch (error: any) {
      const errorMessage = error?.message || 'Impossible de créer la boutique.';
      toast.error(errorMessage);
    } finally {
      setCreatingStore(false);
    }
  };

  if (storeLoading || subscriptionStatus === 'loading') {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  if (!store) {
    if (!hasActiveSubscription) {
      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Créer votre boutique</h1>
            <p className="text-gray-500 text-sm mt-1">Activez votre abonnement vendeur pour créer une boutique.</p>
          </div>

          <div className="p-8 border border-amber-200 bg-amber-50 rounded-3xl text-center">
            <div className="inline-block p-4 bg-amber-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 4v2" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Abonnement requis</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Vous devez avoir un abonnement vendeur actif et payé pour créer une boutique et commencer à vendre sur Souk.tn.
            </p>
            <a href="/seller/subscription" className="btn-primary inline-block">
              Activer mon abonnement
            </a>
          </div>

          <div className="p-6 border border-gray-200 bg-white shadow-sm rounded-3xl">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.16em] text-gray-500">Pourquoi un abonnement ?</p>
              <h3 className="text-lg font-semibold text-gray-900">Avantages de l'abonnement vendeur</h3>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-blue-50 p-4">
                <p className="text-sm font-semibold text-blue-900">✓ Accès complet</p>
                <p className="text-sm text-blue-600 mt-2">Accédez à tous les outils pour gérer votre boutique.</p>
              </div>
              <div className="rounded-3xl bg-green-50 p-4">
                <p className="text-sm font-semibold text-green-900">✓ Support prioritaire</p>
                <p className="text-sm text-green-600 mt-2">Bénéficiez d'un support dédié pour votre boutique.</p>
              </div>
              <div className="rounded-3xl bg-purple-50 p-4">
                <p className="text-sm font-semibold text-purple-900">✓ Visibilité accrue</p>
                <p className="text-sm text-purple-600 mt-2">Votre boutique sera mieux référencée sur la plateforme.</p>
              </div>
              <div className="rounded-3xl bg-orange-50 p-4">
                <p className="text-sm font-semibold text-orange-900">✓ Outils avancés</p>
                <p className="text-sm text-orange-600 mt-2">Utilisez des fonctionnalités exclusives pour optimiser vos ventes.</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Créer votre boutique</h1>
          <p className="text-gray-500 text-sm mt-1">Votre boutique n’existe pas encore. Complétez les informations pour la créer directement depuis votre dashboard.</p>
        </div>

        <div className="p-6 border border-gray-200 bg-white shadow-sm rounded-3xl">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.16em] text-gray-500">Nouvelle boutique</p>
            <h2 className="text-xl font-semibold text-gray-900">Informations de la boutique</h2>
            <p className="text-sm text-gray-500">Une fois créée, votre boutique sera prête à être gérée et pourra être soumise à l’approbation de l’administrateur.</p>
          </div>

          <form onSubmit={handleCreateStore} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la boutique *</label>
              <input
                type="text"
                value={newStoreName}
                onChange={(e) => setNewStoreName(e.target.value)}
                required
                className="input-field"
                placeholder="Nom de votre boutique"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={newStoreDescription}
                onChange={(e) => setNewStoreDescription(e.target.value)}
                className="input-field resize-none"
                rows={4}
                placeholder="Parlez de votre boutique..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo de la boutique</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setNewStoreLogoFile(file);
                  setNewStoreLogoPreview(file ? URL.createObjectURL(file) : '');
                }}
                className="input-field"
              />
            </div>
            {newStoreLogoPreview && (
              <div className="rounded-2xl overflow-hidden border border-gray-200">
                <img src={newStoreLogoPreview} alt="Aperçu du logo" className="w-full h-44 object-cover" />
              </div>
            )}
            <div className="pt-4 border-t border-gray-100 text-sm text-gray-500">
              <p>Votre boutique sera créée avec un statut non approuvé. Un administrateur devra valider votre boutique avant qu’elle apparaisse publiquement.</p>
            </div>
            <button type="submit" disabled={creatingStore} className="w-full btn-primary py-2.5">
              {creatingStore ? 'Création en cours...' : 'Créer boutique'}
            </button>
          </form>
        </div>

        <div className="p-6 border border-gray-200 bg-white shadow-sm rounded-3xl">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.16em] text-gray-500">Étapes suivantes</p>
            <h2 className="text-xl font-semibold text-gray-900">Après la création de votre boutique</h2>
            <p className="text-sm text-gray-500">Une fois créée, votre boutique sera envoyée à l’administrateur pour approbation. Vous pourrez ensuite commencer à ajouter des produits et gérer vos commandes.</p>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">1. Créez votre boutique</p>
              <p className="text-sm text-slate-600 mt-2">Remplissez le nom, la description et un logo si vous en avez un.</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">2. Attendez l’approbation</p>
              <p className="text-sm text-slate-600 mt-2">Le responsable vérifiera votre boutique avant de la rendre active sur la plateforme.</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">3. Ajoutez des produits</p>
              <p className="text-sm text-slate-600 mt-2">Dès que votre boutique est approuvée, allez dans la section Produits pour commencer à vendre.</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">4. Suivez vos commandes</p>
              <p className="text-sm text-slate-600 mt-2">Utilisez le tableau de bord pour suivre les ventes, les revenus et les commandes.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusBadgeText = {
    active: '🟢 Actif',
    pending: '🟡 En attente',
    expired: '🔴 Expiré',
    inactive: '🔴 Inactif',
  } as const;

  const statusStyles =
    subscriptionStatusText === 'active' ? 'bg-green-100 text-green-700'
    : subscriptionStatusText === 'pending' ? 'bg-yellow-100 text-yellow-700'
    : 'bg-red-100 text-red-700';

  const badgeText = statusBadgeText[subscriptionStatusText as keyof typeof statusBadgeText];
  const storeBalance = Number((store as any)?.wallet_balance ?? 0);

  const stats = [
    { label: 'Revenus totaux', value: formatPrice(store.total_revenue ?? totalEarnings), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Solde boutique', value: formatPrice(storeBalance), icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Commandes', value: completedOrders.length.toString(), color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Produits', value: (products ?? []).length.toString(), icon: Package, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500 text-sm mt-1">Bienvenue, {store.name}</p>
      </div>

      {!store.is_approved && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
          Votre boutique est en attente d'approbation. Vous pouvez ajouter des produits mais ils ne seront pas visibles jusqu'à l'approbation.
        </div>
      )}

      {/* Subscription card */}
      <div className="p-6 border border-gray-200 bg-white shadow-sm rounded-3xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.16em] text-gray-500">Abonnement vendeur</p>
            <h2 className="mt-1 text-xl font-bold text-gray-900">{subscription?.plan_name ?? 'Aucun plan'}</h2>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${statusStyles}`}>
            {badgeText}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wider text-gray-400">Date d'expiration</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{formatDate(subscription?.end_date)}</p>
          </div>
          <div className="rounded-2xl bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wider text-gray-400">Montant</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {subscription ? formatPrice(subscriptionAmount) : '—'}
            </p>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <a href="/seller/subscription" className="inline-flex justify-center rounded-full bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-700">
            {subscription ? "Renouveler l'abonnement" : "S'abonner"}
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="stat-card">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">{label}</p>
              {Icon ? (
                <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center`}>
                  <Icon size={16} className={color} />
                </div>
              ) : null}
            </div>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Revenus et commandes des 7 derniers jours</h2>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={weeklyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={32} />
            <Bar yAxisId="left" dataKey="revenue" name="Revenu" fill="#FF6B35" radius={[4, 4, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="commandes" name="Commandes" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Top products + Recent orders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Top produits</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Aucun produit vendu</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((product, idx) => (
                <div key={product.id} className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.quantity === 0 ? 'Aucune vente' : `${product.quantity} vendus`}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{formatPrice(product.price)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Commandes récentes</h2>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Aucune commande</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => {
                const orderNumber = order.order_number || `ORD-${String(order.id).padStart(6, '0')}`;
                return (
                  <div key={order.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{orderNumber}</p>
                      <p className="text-xs text-gray-500">
                        {order.status} • {order.created_at ? new Date(order.created_at).toLocaleDateString('fr-FR') : 'Date inconnue'}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-green-600">{formatPrice(order.total ?? 0)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}