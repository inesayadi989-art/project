import { useState } from 'react';
import { ShoppingBag, CheckCircle, XCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useSellerStore } from '../../hooks/useProducts';
import { useSellerOrders } from '../../hooks/useOrders';
import Modal from '../../components/UI/Modal';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { formatPrice } from '../../lib/types';
import { DEFAULT_PRODUCT_IMAGE } from '../../components/UI/ProductCard';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { api } from '../../lib/api';
import type { OrderItem, Order } from '../../lib/types';

const UPLOADS_URL = import.meta.env.VITE_UPLOADS_URL || 'http://localhost:5000';

function getImageUrl(imageUrl?: string | null): string {
  if (!imageUrl) return DEFAULT_PRODUCT_IMAGE;
  if (imageUrl.startsWith('http')) return imageUrl;
  return `${UPLOADS_URL}${imageUrl}`;
}

type SellerOrder = Order & { items?: OrderItem[] };

const statusConfig: Record<string, { label: string; classes: string }> = {
  pending:                     { label: 'En attente',                        classes: 'bg-yellow-100 text-yellow-700' },
  pending_vendor:              { label: 'En attente vendeur',                 classes: 'bg-orange-100 text-orange-700' },
  pending_vendor_confirmation: { label: 'En attente de confirmation vendeur', classes: 'bg-orange-100 text-orange-700' },
  confirmed:                   { label: 'Confirmée',                          classes: 'bg-blue-100 text-blue-700' },
  paid_confirmed:              { label: 'Payée',                              classes: 'bg-green-100 text-green-700' },
  paid:                        { label: 'Payée',                              classes: 'bg-green-100 text-green-700' },
  rejected:                    { label: 'Refusée',                            classes: 'bg-red-100 text-red-700' },
  rejected_by_vendor:          { label: 'Rejetée par le vendeur',             classes: 'bg-red-100 text-red-700' },
  shipped:                     { label: 'Expédiée',                           classes: 'bg-indigo-100 text-indigo-700' },
  delivered:                   { label: 'Livrée',                             classes: 'bg-green-100 text-green-700' },
  cancelled:                   { label: 'Annulée',                            classes: 'bg-red-100 text-red-700' },
};

export default function SellerOrders() {
  const { user } = useAuthStore();
  const { data: store, isLoading: isStoreLoading, isError: isStoreError } = useSellerStore(user?.id ?? '');
  const storeId = store?.id ? String(store.id) : '';
  const { data: orders, isLoading: isOrdersLoading, isError, refetch } = useSellerOrders(storeId) as {
    data?: SellerOrder[]; isLoading: boolean; isError: boolean; error: unknown; refetch: () => void;
  };

  const [selectedOrder, setSelectedOrder] = useState<SellerOrder | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const handleConfirmOrder = async (orderId: string | number) => {
    try {
      setActionLoading(Number(orderId));
      await api.request(`/orders/${orderId}/decision`, { method: 'PUT', body: JSON.stringify({ decision: 'accept' }) });
      await refetch();
      alert('✅ Commande confirmée avec succès');
    } catch { alert('❌ Erreur lors de la confirmation'); }
    finally { setActionLoading(null); }
  };

  const handleRejectOrder = async (orderId: string | number) => {
    try {
      setActionLoading(Number(orderId));
      await api.request(`/orders/${orderId}/decision`, { method: 'PUT', body: JSON.stringify({ decision: 'reject' }) });
      await refetch();
      alert('❌ Commande rejetée');
    } catch { alert('❌ Erreur lors du rejet'); }
    finally { setActionLoading(null); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Mes commandes</h1>

      {isStoreLoading || isOrdersLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : isStoreError ? (
        <div className="card p-12 text-center">
          <ShoppingBag size={48} className="mx-auto mb-4 text-red-200" />
          <p className="text-red-700 font-medium">Impossible de charger la boutique.</p>
        </div>
      ) : isError ? (
        <div className="card p-12 text-center">
          <ShoppingBag size={48} className="mx-auto mb-4 text-red-200" />
          <p className="text-red-700 font-medium">Impossible de récupérer les commandes.</p>
        </div>
      ) : !orders || orders.length === 0 ? (
        <div className="card p-12 text-center">
          <ShoppingBag size={48} className="mx-auto mb-4 text-gray-200" />
          <p className="text-gray-600 font-medium">Aucune commande pour le moment</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Commande', 'Produit', 'Date', 'Qté', 'Montant', 'Statut', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((order: SellerOrder) => {
                  const orderStatus = order.status || 'pending';
                  const status = statusConfig[orderStatus] || { label: orderStatus, classes: 'bg-gray-100 text-gray-600' };
                  const firstItem = order.items?.[0];

                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {order.order_number || `ORD-${String(order.id).padStart(6, '0')}`}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={getImageUrl(firstItem?.image_url)}
                            alt={firstItem?.product_name ?? 'Produit'}
                            className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE; }}
                          />
                          <span className="text-sm text-gray-700 line-clamp-1">
                            {firstItem?.product_name ?? 'Produit inconnu'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {order.created_at ? format(new Date(order.created_at), 'dd/MM/yyyy', { locale: fr }) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{firstItem?.quantity ?? '-'}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-600">{formatPrice(order.total ?? 0)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${status.classes}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {(orderStatus === 'pending_vendor' || orderStatus === 'pending_vendor_confirmation') && (
                            <>
                              <button
                                onClick={() => handleConfirmOrder(order.id)}
                                disabled={actionLoading === Number(order.id)}
                                className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-60"
                              >
                                <CheckCircle size={14} /> Accepter
                              </button>
                              <button
                                onClick={() => handleRejectOrder(order.id)}
                                disabled={actionLoading === Number(order.id)}
                                className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-60"
                              >
                                <XCircle size={14} /> Rejeter
                              </button>
                            </>
                          )}
                          <button onClick={() => setSelectedOrder(order)} className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                            Voir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal détails */}
      <Modal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} title="Détails commande" size="md">
        {selectedOrder && (
          <div className="p-6 space-y-4">
            {selectedOrder.items && selectedOrder.items.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Articles :</h3>
                <div className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex gap-3 bg-white rounded-lg p-2 border border-gray-100">
                      <img
                        src={getImageUrl(item.image_url)}
                        alt={item.product_name}
                        className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE; }}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{item.product_name}</p>
                        <p className="text-xs text-gray-500">Quantité: {item.quantity}</p>
                        <p className="text-sm font-bold text-gray-900">{formatPrice(item.total_price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: 'Commande', value: selectedOrder.order_number || `#${selectedOrder.id}` },
                { label: 'Date', value: selectedOrder.created_at ? format(new Date(selectedOrder.created_at), 'dd MMMM yyyy', { locale: fr }) : '-' },
                { label: 'Total', value: formatPrice(selectedOrder.total ?? 0) },
                { label: 'Gains vendeur', value: formatPrice(selectedOrder.total ?? 0), green: true },
              ].map(({ label, value, green }) => (
                <div key={label} className={`p-3 rounded-lg ${green ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <p className="text-gray-500 text-xs mb-1">{label}</p>
                  <p className={`font-semibold ${green ? 'text-green-600' : 'text-gray-900'}`}>{value}</p>
                </div>
              ))}
            </div>

            <div className="p-3 bg-gray-50 rounded-lg text-sm">
              <p className="text-gray-500 text-xs mb-2 font-semibold">Livraison</p>
              <p className="font-medium text-gray-900">{selectedOrder.ship_full_name || 'N/A'}</p>
              <p className="text-gray-600">{selectedOrder.ship_phone || 'N/A'}</p>
              <p className="text-gray-600">{selectedOrder.ship_address_line1 || 'N/A'}</p>
              <p className="text-gray-600">{selectedOrder.ship_city || 'N/A'}, {selectedOrder.ship_governorate || 'N/A'}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}