import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useOrders } from '../hooks/useOrders';
import { formatPrice } from '../lib/types';
import { DEFAULT_PRODUCT_IMAGE } from '../components/UI/ProductCard';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import BackButton from '../components/UI/BackButton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const statusConfig: Record<string, { label: string; classes: string }> = {
  pending: { label: 'En attente', classes: 'bg-yellow-100 text-yellow-700' },
  processing: { label: 'En traitement', classes: 'bg-blue-100 text-blue-700' },
  shipped: { label: 'Expédié', classes: 'bg-orange-100 text-orange-700' },
  delivered: { label: 'Livré', classes: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulé', classes: 'bg-red-100 text-red-700' },
};

export default function OrdersPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!user) {
    navigate('/login');
    return null;
  }

  const { data: orders, isLoading } = useOrders(user.id);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <LoadingSpinner size="lg" message="Chargement des commandes..." />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <BackButton />

      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Package size={24} /> Mes commandes
      </h1>

      {!orders || orders.length === 0 ? (
        <div className="card p-12 text-center">
          <Package size={64} className="mx-auto mb-4 text-gray-200" />
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Aucune commande</h2>
          <p className="text-gray-500 text-sm mb-4">Vous n'avez pas encore passé de commande.</p>
          <button onClick={() => navigate('/shop')} className="btn-primary">
            Découvrir les produits
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const status = statusConfig[order.status] ?? { label: order.status, classes: 'bg-gray-100 text-gray-600' };
            const isExpanded = expandedId === order.id;

            return (
              <div key={order.id} className="card overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package size={18} className="text-primary-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{order.order_number}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(order.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${status.classes}`}>
                      {status.label}
                    </span>
                    <span className="font-bold text-gray-900 text-sm">{formatPrice(order.total)}</span>
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-400" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50">
                    {order.order_items && order.order_items.length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Articles :</h3>
                        <div className="space-y-2">
                          {order.order_items.map((item) => (
                            <div key={item.id} className="flex gap-3 bg-white rounded-lg p-2">
                              <img
                                src={item.product_image ?? DEFAULT_PRODUCT_IMAGE}
                                alt={item.product_name}
                                className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                                onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE; }}
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{item.product_name}</p>
                                <p className="text-xs text-gray-500">Quantité: {item.quantity}</p>
                              </div>
                              <p className="text-sm font-bold text-gray-900">{formatPrice(item.total_price)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-3">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                          <MapPin size={12} /> Adresse de livraison
                        </h3>
                        <p className="text-sm text-gray-900 font-medium">{order.ship_full_name}</p>
                        <p className="text-sm text-gray-600">{order.ship_phone}</p>
                        <p className="text-sm text-gray-600">{order.ship_address_line1}</p>
                        <p className="text-sm text-gray-600">{order.ship_city}, {order.ship_governorate}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Paiement</h3>
                        <p className="text-sm text-gray-900">
                          {order.payment_method === 'cash' ? 'Espèces à la livraison' : 'Carte bancaire'}
                        </p>
                        <p className="text-sm text-gray-600">
                          Statut: {order.payment_status === 'pending' ? 'En attente' : 'Payé'}
                        </p>
                        <div className="mt-2 border-t border-gray-100 pt-2">
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Sous-total:</span>
                            <span>{formatPrice(order.subtotal)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Livraison:</span>
                            <span>{formatPrice(order.shipping_cost)}</span>
                          </div>
                          <div className="flex justify-between text-sm font-bold text-gray-900 mt-1">
                            <span>Total:</span>
                            <span>{formatPrice(order.total)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {order.notes && (
                      <div className="mt-3 bg-white rounded-lg p-3">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Notes</h3>
                        <p className="text-sm text-gray-600">{order.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
