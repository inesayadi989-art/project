import { useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useSellerStore } from '../../hooks/useProducts';
import { useSellerOrders } from '../../hooks/useOrders';
import SellerLayout from './SellerLayout';
import Modal from '../../components/UI/Modal';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import BackButton from '../../components/UI/BackButton';
import { formatPrice } from '../../lib/types';
import { DEFAULT_PRODUCT_IMAGE } from '../../components/UI/ProductCard';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { OrderItem, Order } from '../../lib/types';

type SellerOrderItem = OrderItem & { order: Order };

const statusConfig: Record<string, { label: string; classes: string }> = {
  pending: { label: 'En attente', classes: 'bg-yellow-100 text-yellow-700' },
  processing: { label: 'En traitement', classes: 'bg-blue-100 text-blue-700' },
  shipped: { label: 'Expédié', classes: 'bg-orange-100 text-orange-700' },
  delivered: { label: 'Livré', classes: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulé', classes: 'bg-red-100 text-red-700' },
};

export default function SellerOrders() {
  const { user } = useAuthStore();
  const { data: store } = useSellerStore(user?.id ?? '');
  const { data: orders, isLoading } = useSellerOrders(store?.id ?? '');
  const [selectedOrder, setSelectedOrder] = useState<SellerOrderItem | null>(null);

  return (
    <SellerLayout>
      <div className="space-y-6">
        <div>
          <BackButton />

          <h1 className="text-2xl font-bold text-gray-900">Mes ventes</h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
        ) : !orders || orders.length === 0 ? (
          <div className="card p-12 text-center">
            <ShoppingBag size={48} className="mx-auto mb-4 text-gray-200" />
            <p className="text-gray-600 font-medium">Aucune vente pour le moment</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Commande</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Produit</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Date</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Qté</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Gains</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Statut</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase px-4 py-3">Détails</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {orders.map((item) => {
                    const status = statusConfig[item.order.status] ?? { label: item.order.status, classes: 'bg-gray-100 text-gray-600' };
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {item.order.order_number}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <img
                              src={item.product_image ?? DEFAULT_PRODUCT_IMAGE}
                              alt={item.product_name}
                              className="w-8 h-8 object-cover rounded-lg flex-shrink-0"
                              onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE; }}
                            />
                            <span className="text-sm text-gray-700 line-clamp-1">{item.product_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {format(new Date(item.order.created_at), 'dd/MM/yyyy', { locale: fr })}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-green-600">
                          {formatPrice(item.seller_earnings)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.classes}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setSelectedOrder(item)}
                            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                          >
                            Voir
                          </button>
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

      <Modal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} title="Détails de la vente" size="md">
        {selectedOrder && (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <img
                src={selectedOrder.product_image ?? DEFAULT_PRODUCT_IMAGE}
                alt={selectedOrder.product_name}
                className="w-16 h-16 object-cover rounded-lg"
              />
              <div>
                <p className="font-medium text-gray-900">{selectedOrder.product_name}</p>
                <p className="text-sm text-gray-500">Quantité: {selectedOrder.quantity}</p>
                <p className="text-sm text-gray-500">Prix unitaire: {formatPrice(selectedOrder.unit_price)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-gray-500 text-xs mb-1">N° de commande</p>
                <p className="font-semibold text-gray-900">{selectedOrder.order.order_number}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-gray-500 text-xs mb-1">Date</p>
                <p className="font-semibold text-gray-900">
                  {format(new Date(selectedOrder.order.created_at), 'dd MMMM yyyy', { locale: fr })}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-gray-500 text-xs mb-1">Total produit</p>
                <p className="font-semibold text-gray-900">{formatPrice(selectedOrder.total_price)}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-gray-500 text-xs mb-1">Vos gains</p>
                <p className="font-bold text-green-600">{formatPrice(selectedOrder.seller_earnings)}</p>
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg text-sm">
              <p className="text-gray-500 text-xs mb-2 font-semibold">Livraison</p>
              <p className="font-medium text-gray-900">{selectedOrder.order.ship_full_name}</p>
              <p className="text-gray-600">{selectedOrder.order.ship_phone}</p>
              <p className="text-gray-600">{selectedOrder.order.ship_address_line1}</p>
              <p className="text-gray-600">{selectedOrder.order.ship_city}, {selectedOrder.order.ship_governorate}</p>
            </div>
          </div>
        )}
      </Modal>
    </SellerLayout>
  );
}
