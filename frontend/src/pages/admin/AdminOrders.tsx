import { useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { useAdminOrders, useUpdateOrderStatus } from '../../hooks/useOrders';
import AdminLayout from './AdminLayout';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import BackButton from '../../components/UI/BackButton';
import { formatPrice } from '../../lib/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Order } from '../../lib/types';
import toast from 'react-hot-toast';

type StatusFilter = 'all' | Order['status'];

const statusConfig: Record<string, { label: string; classes: string }> = {
  pending: { label: 'En attente', classes: 'bg-yellow-100 text-yellow-700' },
  processing: { label: 'En traitement', classes: 'bg-blue-100 text-blue-700' },
  shipped: { label: 'Expédié', classes: 'bg-orange-100 text-orange-700' },
  delivered: { label: 'Livré', classes: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulé', classes: 'bg-red-100 text-red-700' },
};

const statusOptions: Order['status'][] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function AdminOrders() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const { data: orders, isLoading } = useAdminOrders();
  const { mutate: updateStatus } = useUpdateOrderStatus();

  const filterButtons: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'Tous' },
    ...statusOptions.map((s) => ({ key: s as StatusFilter, label: statusConfig[s]?.label ?? s })),
  ];

  const filteredOrders = statusFilter === 'all'
    ? (orders ?? [])
    : (orders ?? []).filter((o) => o.status === statusFilter);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <BackButton />

          <h1 className="text-2xl font-bold text-gray-900">Gestion des commandes</h1>
        </div>

        <div className="flex gap-2 flex-wrap">
          {filterButtons.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === key
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : filteredOrders.length === 0 ? (
          <div className="card p-12 text-center">
            <ShoppingBag size={48} className="mx-auto mb-4 text-gray-200" />
            <p className="text-gray-500">Aucune commande trouvée</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">N° Commande</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Client</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Date</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Total</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Statut</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase px-4 py-3">Modifier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredOrders.map((order) => {
                    const status = statusConfig[order.status] ?? { label: order.status, classes: 'bg-gray-100 text-gray-600' };
                    const customer = (order as { customer?: { full_name: string } }).customer;
                    return (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {order.order_number}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-900">{customer?.full_name ?? 'N/A'}</p>
                          <p className="text-xs text-gray-500">{order.ship_city}, {order.ship_governorate}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          {formatPrice(order.total)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.classes}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <select
                            value={order.status}
                            onChange={(e) => {
                              updateStatus({ orderId: order.id, status: e.target.value as Order['status'] });
                              toast.success('Statut mis à jour');
                            }}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                          >
                            {statusOptions.map((s) => (
                              <option key={s} value={s}>{statusConfig[s]?.label ?? s}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
