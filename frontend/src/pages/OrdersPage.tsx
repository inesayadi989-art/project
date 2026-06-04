import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ChevronDown, ChevronUp, MapPin, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { useOrders } from '../hooks/useOrders';
import { useCreatePayment } from '../hooks/usePayment';
import type { Order } from '../lib/types';
import { formatPrice } from '../lib/types';
import { DEFAULT_PRODUCT_IMAGE } from '../components/UI/ProductCard';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const UPLOADS_URL = import.meta.env.VITE_UPLOADS_URL || 'http://localhost:5000';

function getImageUrl(imageUrl?: string | null): string {
  if (!imageUrl) return DEFAULT_PRODUCT_IMAGE;
  if (imageUrl.startsWith('http')) return imageUrl;
  return `${UPLOADS_URL}${imageUrl}`;
}

const statusConfig: Record<string, { label: string; classes: string }> = {
  pending:                       { label: 'En attente',                         classes: 'bg-yellow-100 text-yellow-700' },
  processing:                    { label: 'En traitement',                       classes: 'bg-blue-100 text-blue-700' },
  pending_vendor:                { label: 'En attente vendeur',                  classes: 'bg-orange-100 text-orange-700' },
  pending_vendor_confirmation:   { label: 'En attente de confirmation vendeur',  classes: 'bg-orange-100 text-orange-700' },
  confirmed:                     { label: 'Confirmée',                           classes: 'bg-blue-100 text-blue-700' },
  paid_confirmed:                { label: 'Payée',                               classes: 'bg-green-100 text-green-700' },
  paid:                          { label: 'Payée',                               classes: 'bg-green-100 text-green-700' },
  shipped:                       { label: 'Expédié',                             classes: 'bg-indigo-100 text-indigo-700' },
  delivered:                     { label: 'Livré',                               classes: 'bg-green-100 text-green-700' },
  cancelled:                     { label: 'Annulé',                              classes: 'bg-red-100 text-red-700' },
};

export default function OrdersPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState(profile?.full_name?.toUpperCase() ?? '');
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);

  if (!user) { navigate('/login'); return null; }

  const { data: orders, isLoading, refetch } = useOrders(user.id);
  const { mutateAsync: createPayment } = useCreatePayment();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <LoadingSpinner size="lg" message="Chargement des commandes..." />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
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
                    {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50">
                    {order.items && order.items.length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Articles :</h3>
                        <div className="space-y-2">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex gap-3 bg-white rounded-lg p-2">
                              <img
                                src={getImageUrl(item.image_url)}
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
                            <span>Sous-total:</span><span>{formatPrice(order.subtotal)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Livraison:</span><span>{formatPrice(order.shipping_cost)}</span>
                          </div>
                          <div className="flex justify-between text-sm font-bold text-gray-900 mt-1">
                            <span>Total:</span><span>{formatPrice(order.total)}</span>
                          </div>
                        </div>

                        {order.status === 'confirmed' && order.payment_method === 'card' && order.payment_status !== 'paid' && order.payment_status !== 'paid_confirmed' && (
                          <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <p className="text-sm font-semibold text-blue-800 mb-3">Paiement par carte</p>
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Nom sur la carte</label>
                                <input value={cardholderName} onChange={(e) => setCardholderName(e.target.value)} placeholder="NOM PRENOM" className="input-field w-full" />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Numéro de carte</label>
                                  <input value={cardNumber} onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim())} placeholder="1234 5678 9012 3456" className="input-field w-full" maxLength={19} />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Date d'expiration</label>
                                  <input value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} placeholder="MM/YY" className="input-field w-full" maxLength={5} />
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">CVV</label>
                                <input value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))} placeholder="123" className="input-field w-full" maxLength={4} />
                              </div>
                              <button
                                onClick={async () => {
                                  if (!cardholderName || !cardNumber || !expiryDate || !cvv) { toast.error('Veuillez remplir tous les champs.'); return; }
                                  const cleanCardNumber = cardNumber.replace(/\s/g, '');
                                  if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) { toast.error('Numéro de carte invalide.'); return; }
                                  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiryDate)) { toast.error('Date d\'expiration invalide (MM/YY).'); return; }
                                  if (cvv.length < 3 || cvv.length > 4) { toast.error('CVV invalide.'); return; }
                                  setIsPaymentLoading(true);
                                  try {
                                    const response: any = await createPayment({ orderId: order.id, cardNumber: cleanCardNumber, expiryDate, cvv, cardholderName });
                                    if (response?.success) {
                                      toast.success('✅ Paiement reçu !');
                                      setCardNumber(''); setExpiryDate(''); setCvv('');
                                      await refetch();
                                    } else { toast.error(response?.message || 'Erreur paiement.'); }
                                  } catch (error: any) { toast.error(error?.message || 'Erreur paiement.'); }
                                  finally { setIsPaymentLoading(false); }
                                }}
                                disabled={isPaymentLoading}
                                className="mt-2 w-full btn-primary"
                              >
                                {isPaymentLoading ? 'Traitement...' : 'Payer maintenant'}
                              </button>
                            </div>
                          </div>
                        )}
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