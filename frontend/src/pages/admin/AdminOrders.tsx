import { useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { useAdminOrders } from '../../hooks/useOrders';
import AdminLayout from './AdminLayout';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { formatPrice } from '../../lib/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
// types and toast not required in this view

type StatusFilter = 'all' | 'en_attente' | 'confirmees' | 'payees' | 'refusees' | 'annulees';

const statusConfig: Record<string, { label: string; classes: string }> = {
  pending: { label: 'En attente', classes: 'bg-yellow-100 text-yellow-700' },
  pending_vendor: { label: 'En attente', classes: 'bg-yellow-100 text-yellow-700' },
  pending_vendor_confirmation: { label: 'En attente', classes: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: 'Confirmée', classes: 'bg-green-100 text-green-700' },
  paid_confirmed: { label: 'Payée', classes: 'bg-green-200 text-green-800' },
  rejected: { label: 'Refusée', classes: 'bg-red-100 text-red-700' },
  rejected_by_vendor: { label: 'Refusée', classes: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Annulée', classes: 'bg-red-100 text-red-700' },
  processing: { label: 'En traitement', classes: 'bg-blue-100 text-blue-700' },
  shipped: { label: 'Expédié', classes: 'bg-orange-100 text-orange-700' },
  delivered: { label: 'Livré', classes: 'bg-green-100 text-green-700' },
};

export default function AdminOrders() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const { data: orders, isLoading } = useAdminOrders();

  const filterButtons: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'Tous' },
    { key: 'en_attente', label: 'En attente' },
    { key: 'confirmees', label: 'Confirmées' },
    { key: 'payees', label: 'Payées' },
    { key: 'refusees', label: 'Refusées' },
    { key: 'annulees', label: 'Annulées' },
  ];

  const filteredOrders = (orders ?? []).filter((o) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'en_attente') return ['pending', 'pending_vendor', 'pending_vendor_confirmation'].includes(o.status);
    if (statusFilter === 'confirmees') return ['confirmed'].includes(o.status);
    if (statusFilter === 'payees') return ['paid_confirmed'].includes(o.status);
    if (statusFilter === 'refusees') return ['rejected', 'rejected_by_vendor'].includes(o.status);
    if (statusFilter === 'annulees') return o.status === 'cancelled';
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des commandes</h1>

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
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredOrders.map((order) => {
                    const status = statusConfig[order.status] ?? { label: order.status, classes: 'bg-gray-100 text-gray-600' };
                    const customerName = order.customer?.full_name ?? order.customer_name ?? 'N/A';
                    const orderNumber = order.order_number || `ORD-${String(order.id).padStart(6, '0')}`;
                    const shippingLocation = [order.ship_city, order.ship_governorate].filter(Boolean).join(', ');
                    return (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{orderNumber}</td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-900">{customerName}</p>
                          <p className="text-xs text-gray-500">{shippingLocation}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatPrice(order.total)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.classes}`}>{status.label}</span>
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
