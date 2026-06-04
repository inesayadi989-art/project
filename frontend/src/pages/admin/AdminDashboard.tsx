import { useQuery } from '@tanstack/react-query';
import { Users, Store, Package, ShoppingBag, TrendingUp, CircleAlert as AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';
import AdminLayout from './AdminLayout';
import { useAdminOrders } from '../../hooks/useOrders';
import { formatPrice } from '../../lib/types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      try {
        const response = await api.get('/admin/stats');
        const { stats, chartData } = response;

        // Format chart data for display (convert month to label like "Jan", "Feb", etc)
        const formattedChartData = chartData.map((item: any) => {
          const [year, month] = item.month.split('-');
          const date = new Date(year, parseInt(month) - 1);
          return {
            month: format(date, 'MMM', { locale: fr }),
            orderRevenue: item.orderRevenue || 0,
            subscriptionRevenue: item.subscriptionRevenue || 0,
            total: (item.orderRevenue || 0) + (item.subscriptionRevenue || 0)
          };
        });

        return {
          usersCount: stats.usersCount ?? 0,
          storesCount: stats.storesCount ?? 0,
          pendingStores: stats.pendingStores ?? 0,
          productsCount: stats.productsCount ?? 0,
          pendingProducts: stats.pendingProducts ?? 0,
          ordersCount: stats.ordersCount ?? 0,
          activeSellersCount: stats.activeSellersCount ?? 0,
          totalOrderRevenue: stats.totalOrderRevenue ?? 0,
          totalCommission: stats.totalCommission ?? 0,
          totalRevenue: stats.totalRevenue ?? 0,
          totalSubscriptionRevenue: stats.totalSubscriptionRevenue ?? 0,
          chartData: formattedChartData,
        };
      } catch (error) {
        console.error('Error fetching stats:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: true
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

  const statCards = [
    { label: 'Utilisateurs', value: stats?.usersCount ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Vendeurs actifs', value: stats?.activeSellersCount ?? 0, icon: Store, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Revenu abonnements', value: stats?.totalSubscriptionRevenue ?? 0, icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Revenu commissions', value: stats?.totalCommission ?? 0, icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Commandes', value: stats?.ordersCount ?? 0, color: 'text-primary-600', bg: 'bg-primary-50' },
  ];

  const revenueSplitData = [
    { name: 'Abonnements', value: stats?.totalSubscriptionRevenue ?? 0 },
    { name: 'Commissions', value: stats?.totalCommission ?? 0 },
  ];

  const overviewData = [
    { name: 'Utilisateurs', value: stats?.usersCount ?? 0 },
    { name: 'Vendeurs', value: stats?.storesCount ?? 0 },
    { name: 'Commandes', value: stats?.ordersCount ?? 0 },
  ];

  const COLORS = ['#FF6B35', '#10b981'];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-gray-500 text-sm mt-1">Vue d'ensemble de la plateforme</p>
        </div>

        {/* Revenue Card */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 text-white flex items-center justify-between">
          <div>
            <p className="text-primary-100 text-sm">Revenu plateforme</p>
            <p className="text-3xl font-bold mt-1">{formatPrice(stats?.totalRevenue ?? 0)}</p>
          </div>
          <TrendingUp size={40} className="opacity-30" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {statCards.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">{label}</p>
                {Icon ? (
                  <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center`}>
                    <Icon size={16} className={color} />
                  </div>
                ) : null}
              </div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-900">Vue d'ensemble</h2>
                <p className="text-sm text-gray-500">Utilisateurs, vendeurs et commandes</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={overviewData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: any) => `${value}`} />
                <Legend />
                <Bar dataKey="value" fill="#FF6B35" name="Total" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-900">Répartition des revenus</h2>
                <p className="text-sm text-gray-500">Abonnements vs commissions</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={revenueSplitData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={62}
                  outerRadius={100}
                  paddingAngle={4}
                  label
                >
                  {revenueSplitData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `${Number(value).toFixed(2)} TND`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Revenue Chart */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Revenus mensuels (6 derniers mois)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={stats?.chartData ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: any) => `${Number(value).toFixed(3)} TND`}
              />
              <Line type="monotone" dataKey="orderRevenue" stroke="#FF6B35" strokeWidth={2} dot={false} name="Commandes" />
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
                {(orders ?? []).slice(0, 10).map((order) => {
                  const orderNumber = order.order_number || `ORD-${String(order.id).padStart(6, '0')}`;
                  const customerName = order.customer?.full_name ?? order.customer_name ?? 'Client';
                  const statusClass = order.status === 'delivered'
                    ? 'bg-green-100 text-green-700'
                    : order.status === 'shipped'
                      ? 'bg-orange-100 text-orange-700'
                      : order.status === 'cancelled'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700';

                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{orderNumber}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{customerName}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatPrice(order.total)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusClass}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
