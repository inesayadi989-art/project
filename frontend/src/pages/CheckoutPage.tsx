import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CircleCheck as CheckCircle, Package, MapPin, CreditCard, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useCreateOrder } from '../hooks/useOrders';
import { useCreatePayment } from '../hooks/usePayment';
import { TUNISIAN_GOVERNORATES, formatPrice } from '../lib/types';
import { DEFAULT_PRODUCT_IMAGE } from '../components/UI/ProductCard';
import BackButton from '../components/UI/BackButton';
import toast from 'react-hot-toast';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();
  const { items, getTotal, clearCart } = useCartStore();
  const { mutateAsync: createOrder, isPending } = useCreateOrder();
  const { mutateAsync: createPayment } = useCreatePayment();

  const [step, setStep] = useState(1);
  const [orderId, setOrderId] = useState('');
  const [orderNumber, setOrderNumber] = useState('');

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [governorate, setGovernorate] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // Card information state
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (items.length === 0 && step !== 3) { navigate('/'); return; }
  }, [user, items, navigate, step]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setPhone(profile.phone ?? '');
      setAddressLine1(profile.address_line1 ?? '');
      setCity(profile.city ?? '');
      setGovernorate(profile.governorate ?? '');
      setCardName(profile.full_name?.toUpperCase() ?? '');
    }
  }, [profile]);

  const subtotal = getTotal();
  const shippingCost = 7;
  const total = subtotal + shippingCost;

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !addressLine1 || !city || !governorate) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    setStep(2);
  };

  const handlePlaceOrder = async () => {
    if (!user) return;

    // Validate card information if card payment is selected
    if (paymentMethod === 'card') {
      if (!cardNumber || !expiryDate || !cvv || !cardName) {
        toast.error('Veuillez remplir toutes les informations de carte');
        return;
      }
      if (cardNumber.replace(/\s/g, '').length < 16) {
        toast.error('Numéro de carte invalide');
        return;
      }
      if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
        toast.error('Date d\'expiration invalide (format MM/YY)');
        return;
      }
      if (cvv.length < 3) {
        toast.error('CVV invalide');
        return;
      }
    }

    try {
      const response = await createOrder({
        customerId: user.id,
        items,
        shipFullName: fullName,
        shipPhone: phone,
        shipAddressLine1: addressLine1,
        shipCity: city,
        shipGovernorate: governorate,
        notes: notes || undefined,
        paymentMethod,
      });

      const newOrderId = typeof response === 'object' ? response.orderId || response?.orderId : response;
      const orderIdString = String(newOrderId || '');
      setOrderId(orderIdString);
      setOrderNumber(`ORD-${Date.now()}`);

      if (paymentMethod === 'card') {
        const paymentResponse: any = await createPayment(orderIdString);
        const redirectUrl = paymentResponse?.paymentUrl || paymentResponse?.redirectUrl;

        await clearCart();

        if (redirectUrl) {
          window.location.href = redirectUrl;
          return;
        }

        toast.error('Impossible de démarrer le paiement en ligne.');
        return;
      }

      await clearCart();
      setStep(3);
    } catch (err) {
      toast.error('Erreur lors de la création de la commande');
      console.error(err);
    }
  };

  const OrderSummary = () => (
    <div className="card p-4">
      <h3 className="font-semibold text-gray-900 mb-4">Récapitulatif</h3>
      <div className="space-y-3 mb-4">
        {items.map((item) => {
          const img = item.product?.product_images?.find((i) => i.is_primary) ?? item.product?.product_images?.[0];
          return (
            <div key={item.id} className="flex gap-2">
              <img
                src={img?.url ?? DEFAULT_PRODUCT_IMAGE}
                alt={item.product?.name}
                className="w-12 h-12 object-cover rounded-lg flex-shrink-0 bg-gray-50"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 line-clamp-2">{item.product?.name}</p>
                <p className="text-xs text-gray-500">Qté: {item.quantity}</p>
              </div>
              <p className="text-xs font-semibold text-gray-900">
                {formatPrice(item.unit_price * item.quantity)}
              </p>
            </div>
          );
        })}
      </div>
      <div className="border-t border-gray-100 pt-3 space-y-2">
        <div className="flex justify-between text-sm text-gray-500">
          <span>Sous-total</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-500">
          <span>Livraison</span>
          <span>7.000 TND</span>
        </div>
        <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100">
          <span>Total</span>
          <span className="text-primary-600">{formatPrice(total)}</span>
        </div>
      </div>
    </div>
  );

  if (step === 3) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <div className="card p-8">
          <CheckCircle size={64} className="mx-auto mb-4 text-green-500" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Commande confirmée !</h1>
          <p className="text-gray-500 mb-2">
            Votre commande a été passée avec succès.
          </p>
          <p className="text-sm font-medium text-gray-700 bg-gray-50 rounded-lg px-4 py-2 mb-6">
            N° {orderNumber || `ORD-${orderId?.slice(0, 8)}`}
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Vous recevrez une confirmation par email. Nous vous contacterons pour organiser la livraison.
          </p>
          <div className="flex gap-3">
            <Link to="/orders" className="flex-1 btn-primary justify-center">
              <Package size={16} /> Voir mes commandes
            </Link>
            <Link to="/" className="flex-1 btn-secondary justify-center">
              Accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <BackButton />

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Finaliser la commande</h1>

      {/* Steps */}
      <div className="flex items-center gap-2 mb-8">
        {[
          { n: 1, label: 'Livraison', icon: MapPin },
          { n: 2, label: 'Paiement', icon: CreditCard },
        ].map(({ n, label, icon: Icon }, idx) => (
          <div key={n} className="flex items-center">
            {idx > 0 && <ChevronRight size={16} className="text-gray-300 mx-2" />}
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step >= n ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400'
                }`}
              >
                {step > n ? '✓' : n}
              </div>
              <span className={`text-sm font-medium ${step >= n ? 'text-gray-900' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          {step === 1 && (
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin size={18} className="text-primary-600" /> Adresse de livraison
              </h2>
              <form onSubmit={handleShippingSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="input-field" placeholder="Mohamed Ben Ali" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className="input-field" placeholder="+216 XX XXX XXX" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse *</label>
                  <input type="text" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} required className="input-field" placeholder="Rue, numéro..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ville *</label>
                    <input type="text" value={city} onChange={(e) => setCity(e.target.value)} required className="input-field" placeholder="Tunis" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gouvernorat *</label>
                    <select value={governorate} onChange={(e) => setGovernorate(e.target.value)} required className="input-field">
                      <option value="">Sélectionner...</option>
                      {TUNISIAN_GOVERNORATES.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optionnel)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="input-field resize-none"
                    rows={3}
                    placeholder="Instructions de livraison, étage, etc."
                  />
                </div>
                <button type="submit" className="w-full btn-primary py-3">
                  Continuer vers le paiement
                </button>
              </form>
            </div>
          )}

          {step === 2 && (
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard size={18} className="text-primary-600" /> Mode de paiement
              </h2>
              <div className="space-y-3 mb-6">
                <label className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors ${paymentMethod === 'cash' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="cash"
                    checked={paymentMethod === 'cash'}
                    onChange={() => setPaymentMethod('cash')}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="font-medium text-gray-900">Espèces à la livraison</p>
                    <p className="text-sm text-gray-500">Payez en cash lors de la réception</p>
                  </div>
                </label>
                <label className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors ${paymentMethod === 'card' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={() => setPaymentMethod('card')}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="font-medium text-gray-900">Carte bancaire</p>
                    <p className="text-sm text-gray-500">Paiement en ligne sécurisé</p>
                  </div>
                </label>
              </div>

              {paymentMethod === 'card' && (
                <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <h3 className="font-medium text-gray-900 mb-4">Informations de paiement</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de carte *</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
                          setCardNumber(value);
                        }}
                        placeholder="1234 5678 9012 3456"
                        className="input-field"
                        maxLength={19}
                        required={paymentMethod === 'card'}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date d'expiration *</label>
                        <input
                          type="text"
                          value={expiryDate}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            if (value.length >= 2) {
                              setExpiryDate(value.slice(0, 2) + '/' + value.slice(2, 4));
                            } else {
                              setExpiryDate(value);
                            }
                          }}
                          placeholder="MM/YY"
                          className="input-field"
                          maxLength={5}
                          required={paymentMethod === 'card'}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CVV *</label>
                        <input
                          type="text"
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                          placeholder="123"
                          className="input-field"
                          maxLength={4}
                          required={paymentMethod === 'card'}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nom sur la carte *</label>
                      <input
                        type="text"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value.toUpperCase())}
                        placeholder="MOHAMED BEN ALI"
                        className="input-field"
                        required={paymentMethod === 'card'}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                <p className="font-medium text-gray-700 mb-1">Adresse de livraison :</p>
                <p>{fullName} • {phone}</p>
                <p>{addressLine1}, {city}, {governorate}</p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="btn-secondary flex-1">
                  Retour
                </button>
                <button
                  onClick={handlePlaceOrder}
                  disabled={isPending}
                  className="btn-primary flex-1 py-3"
                >
                  {isPending ? 'Traitement...' : `Payer ${formatPrice(total)}`}
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
          <OrderSummary />
        </div>
      </div>
    </div>
  );
}
