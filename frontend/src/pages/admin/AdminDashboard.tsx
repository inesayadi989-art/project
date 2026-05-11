import { useQuery } from '@tanstack/react-query';
import { Users, Store, Package, ShoppingBag, TrendingUp, CircleAlert as AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AdminLayout from './AdminLayout';
import { useAdminOrders } from '../../hooks/useOrders';
import { formatPrice } from '../../lib/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import BackButton from '../../components/UI/BackButton';

function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      const sixMonthsAgoIso = sixMonthsAgo.toISOString();

      const [
        { count: usersCount },
        { count: storesCount },
        { count: pendingStores },
        { count: productsCount },
        { count: pendingProducts },
        { count: ordersCount },
        { count: activeSellersCount },
        { data: revenueData },
        { data: subscriptionRevenueData },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('stores').select('*', { count: 'exact', head: true }).eq('is_approved', true),
        supabase.from('stores').select('*', { count: 'exact', head: true }).eq('is_approved', false),
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_approved', true),
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_approved', false),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase
          .from('seller_subscriptions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active')
          .gt('current_period_end', new Date().toISOString()),
        supabase
          .from('orders')
          .select('total, created_at')
          .gte('created_at', sixMonthsAgoIso)
          .order('created_at'),
        supabase
          .from('seller_subscriptions')
          .select('amount, created_at')
          .gte('created_at', sixMonthsAgoIso)
          .order('created_at'),
      ]);

      const totalRevenue = (revenueData ?? []).reduce((sum: number, o: { total: number }) => sum + (o.total ?? 0), 0);
      const totalSubscriptionRevenue = (subscriptionRevenueData ?? []).reduce(
        (sum: number, s: { amount: number }) => sum + (s.amount ?? 0),
        0
      );

      return {
        usersCount: usersCount ?? 0,
        storesCount: storesCount ?? 0,
        pendingStores: pendingStores ?? 0,
        productsCount: productsCount ?? 0,
        pendingProducts: pendingProducts ?? 0,
        ordersCount: ordersCount ?? 0,
        activeSellersCount: activeSellersCount ?? 0,
        totalRevenue,
        totalSubscriptionRevenue,
        revenueData: revenueData ?? [],
        subscriptionRevenueData: subscriptionRevenueData ?? [],
      };
    },
  });
}

function generateMonthlyRevenue(
  orders: { total: number; created_at: string }[],
  subscriptions: { amount: number; created_at: string }[]
) {
  return Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const monthKey = format(date, 'yyyy-MM');
    const monthLabel = format(date, 'MMM', { locale: fr });

    const orderRevenue = orders
      .filter((o) => o.created_at.startsWith(monthKey))
      .reduce((sum, o) => sum + (o.total ?? 0), 0);

    const subscriptionRevenue = subscriptions
      .filter((s) => s.created_at.startsWith(monthKey))
      .reduce((sum, s) => sum + (s.amount ?? 0), 0);

    return { month: monthLabel, orderRevenue, subscriptionRevenue };
  });
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useAdminStats();
  const { data: orders } = useAdminOrders();

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      </AdminLayout>
    );
  }

  const monthlyData = generateMonthlyRevenue(
    (stats?.revenueData ?? []) as { total: number; created_at: string }[],
    (stats?.subscriptionRevenueData ?? []) as { amount: number; created_at: string }[],
  );

  const statCards = [
    { label: 'Utilisateurs', value: stats?.usersCount ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Vendeurs actifs', value: stats?.activeSellersCount ?? 0, icon: Store, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Revenu abonnements', value: stats?.totalSubscriptionRevenue ?? 0, icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Commandes', value: stats?.ordersCount ?? 0, icon: ShoppingBag, color: 'text-primary-600', bg: 'bg-primary-50' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <BackButton />

          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-gray-500 text-sm mt-1">Vue d'ensemble de la plateforme</p>
        </div>

        {/* Revenue Card */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 text-white flex items-center justify-between">
          <div>
            <p className="text-primary-100 text-sm">Revenus totaux</p>
            <p className="text-3xl font-bold mt-1">{formatPrice(stats?.totalRevenue ?? 0)}</p>
          </div>
          <TrendingUp size={40} className="opacity-30" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map(({ label, value, sub, icon: Icon, color, bg }) => (
            <div key={label} className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">{label}</p>
                <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center`}>
                  <Icon size={16} className={color} />
                </div>
              </div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              {sub && <p className="text-xs text-orange-500 mt-1 flex items-center gap-1"><AlertCircle size={11} />{sub}</p>}
            </div>
          ))}
        </div>

        {/* Monthly Revenue Chart */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Revenus mensuels (6 derniers mois)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: unknown, name: string) => [`${Number(value).toFixed(3)} TND`, name === 'orderRevenue' ? 'Commandes' : 'Abonnements']}
              />
              <Line type="monotone" dataKey="orderRevenue" stroke="#2563eb" strokeWidth={2} dot={false} name="Commandes" />
              <Line type="monotone" dataKey="subscriptionRevenue" stroke="#10b981" strokeWidth={2} dot={false} name="Abonnements" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Orders */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Commandes récentes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">N°</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Client</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Total</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(orders ?? []).slice(0, 10).map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{order.order_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {(order as { customer?: { full_name: string } }).customer?.full_name ?? 'Client'}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatPrice(order.total)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                        order.status === 'shipped' ? 'bg-orange-100 text-orange-700' :
                        order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
