import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CircleCheck as CheckCircle, Package, MapPin, CreditCard, ChevronRight, Clock, AlertCircle, Lock, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useCreateOrder } from '../hooks/useOrders';
import { useCreatePayment } from '../hooks/usePayment';
import { api } from '../lib/api';
import { TUNISIAN_GOVERNORATES, formatPrice } from '../lib/types';
import { DEFAULT_PRODUCT_IMAGE } from '../components/UI/ProductCard';
import toast from 'react-hot-toast';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user, profile, isClientMode } = useAuthStore();
  const { items, getTotal, clearCart } = useCartStore();
  const { mutateAsync: createOrder, isPending } = useCreateOrder();
  const { mutateAsync: createPayment } = useCreatePayment();

  const [step, setStep] = useState(1);
  const [orderId, setOrderId] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [orderStatus, setOrderStatus] = useState<'pending' | 'confirmed' | 'paid' | 'rejected'>('pending');

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+216');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [governorate, setGovernorate] = useState('');
  const [notes, setNotes] = useState('');

  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');

  // Auto-focus refs for card fields
  const cardRef = useRef<HTMLInputElement>(null);
  const expiryRef = useRef<HTMLInputElement>(null);
  const cvvRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (profile && profile.role !== 'customer' && !(profile.role === 'seller' && isClientMode)) {
      toast.error('Seuls les clients peuvent passer des commandes');
      navigate('/shop');
      return;
    }
    if (items.length === 0 && step !== 3) { navigate('/'); return; }
  }, [user, profile, items, navigate, step]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setPhone(profile.phone ?? '+216');
      setAddressLine1(profile.address_line1 ?? '');
      setCity(profile.city ?? '');
      setGovernorate(profile.governorate ?? '');
      setCardName(profile.full_name?.toUpperCase() ?? '');
    }
  }, [profile]);

  useEffect(() => {
    if (step !== 2 || !orderId) return;
    const pollInterval = setInterval(async () => {
      try {
        const response = await api.get(`/orders/${orderId}`);
        const { order } = response;
        if (order.status === 'confirmed') {
          setOrderStatus('confirmed');
          setStep(3);
          clearInterval(pollInterval);
        } else if (order.status === 'cancelled' || order.status === 'rejected_by_vendor') {
          setOrderStatus('rejected');
          setStep(3);
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error('Error polling order status:', err);
      }
    }, 3000);
    return () => clearInterval(pollInterval);
  }, [step, orderId]);

  const subtotal = getTotal();
  const shippingCost = 7;
  const total = subtotal + shippingCost;

  // Card formatting helpers
  const handleCardNumberChange = (val: string) => {
    const digits = val.replace(/\D/g, '').substring(0, 16);
    const formatted = digits.match(/.{1,4}/g)?.join(' ') ?? digits;
    setCardNumber(formatted);
    if (digits.length === 16) expiryRef.current?.focus();
  };

  const handleExpiryChange = (val: string) => {
    const digits = val.replace(/\D/g, '').substring(0, 4);
    const formatted = digits.length >= 2 ? digits.substring(0, 2) + '/' + digits.substring(2) : digits;
    setExpiryDate(formatted);
    if (digits.length === 4) cvvRef.current?.focus();
  };

  const handleShippingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !addressLine1 || !city || !governorate) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    if (!user) return;
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
        paymentMethod: 'card',
      });
      const newOrderId = typeof response === 'object' ? response.orderId : response;
      setOrderId(String(newOrderId || ''));
      setOrderNumber(typeof response === 'object' ? response.orderNumber || `ORD-${String(newOrderId).padStart(6, '0')}` : `ORD-${String(newOrderId).padStart(6, '0')}`);
      setOrderStatus('pending');
      await clearCart();
      setStep(2);
    } catch (err) {
      toast.error(`Erreur: ${err instanceof Error ? err.message : 'Erreur création commande'}`);
    }
  };

  const handlePlaceOrder = async () => {
    if (!cardNumber || !expiryDate || !cvv || !cardName) {
      toast.error('Veuillez remplir toutes les informations de carte');
      return;
    }
    if (cardNumber.replace(/\s/g, '').length < 16) { toast.error('Numéro de carte invalide'); return; }
    if (!/^\d{2}\/\d{2}$/.test(expiryDate)) { toast.error('Date d\'expiration invalide (MM/YY)'); return; }
    if (cvv.length < 3) { toast.error('CVV invalide'); return; }
    try {
      const paymentResponse: any = await createPayment({ orderId, cardNumber, expiryDate, cvv, cardholderName: cardName });
      if (paymentResponse?.success) { setOrderStatus('paid'); setStep(4); return; }
      const redirectUrl = paymentResponse?.paymentUrl || paymentResponse?.redirectUrl;
      if (redirectUrl) { window.location.href = redirectUrl; return; }
      toast.error('Impossible de démarrer le paiement.');
    } catch (err) {
      toast.error('Commande non confirmée par le vendeur. Veuillez attendre.');
      setStep(2);
    }
  };

  const OrderSummary = () => (
    <div className="card p-4">
      <h3 className="font-semibold text-gray-900 mb-3 text-sm">Récapitulatif</h3>
      <div className="space-y-2 mb-3">
        {items.map((item) => {
          const img = item.product?.product_images?.find((i) => i.is_primary) ?? item.product?.product_images?.[0];
          return (
            <div key={item.id} className="flex gap-2">
              <img src={img?.url ?? DEFAULT_PRODUCT_IMAGE} alt={item.product?.name}
                className="w-10 h-10 object-cover rounded-lg flex-shrink-0 bg-gray-50" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 line-clamp-1">{item.product?.name}</p>
                <p className="text-xs text-gray-400">Qté: {item.quantity}</p>
              </div>
              <p className="text-xs font-semibold text-gray-900 whitespace-nowrap">
                {formatPrice(item.unit_price * item.quantity)}
              </p>
            </div>
          );
        })}
      </div>
      <div className="border-t border-gray-100 pt-3 space-y-1.5">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Sous-total</span><span>{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Livraison</span><span>7.000 TND</span>
        </div>
        <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100 text-sm">
          <span>Total</span>
          <span className="text-primary-600">{formatPrice(total)}</span>
        </div>
      </div>
    </div>
  );

  // ── Step 4: Success ──
  if (step === 4) {
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 2);
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <div className="card p-8">
          <CheckCircle size={56} className="mx-auto mb-4 text-green-500" />
          <h1 className="text-xl font-bold text-gray-900 mb-1">✅ Paiement effectué !</h1>
          <p className="text-gray-500 text-sm mb-3">
            📅 Livraison prévue : {deliveryDate.toLocaleDateString('fr-TN', { weekday: 'long', day: 'numeric', month: 'long' })} (dans 2 jours)
          </p>
          <p className="text-sm text-gray-700 mb-1">Vous recevrez une confirmation par email.</p>
          <p className="text-sm text-gray-700 mb-5">Un SMS de suivi sera envoyé lors de la livraison.</p>
          <p className="text-sm font-medium text-gray-700 bg-gray-50 rounded-lg px-4 py-2 mb-4">
            N° {orderNumber || `ORD-${orderId?.slice(0, 8)}`}
          </p>
          <div className="flex gap-3">
            <Link to="/orders" className="flex-1 btn-primary justify-center"><Package size={15} />Mes commandes</Link>
            <Link to="/" className="flex-1 btn-secondary justify-center">Accueil</Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: Waiting for vendor ──
  if (step === 2) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <div className="card p-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-100 mb-4">
            <Clock size={28} className="text-blue-500 animate-spin" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Commande en attente</h1>
          <p className="text-gray-500 text-sm mb-3">En attente de confirmation du vendeur.</p>
          <p className="text-sm font-medium text-gray-700 bg-blue-50 rounded-lg px-4 py-2 mb-5 border border-blue-200">
            N° {orderNumber || `ORD-${orderId?.slice(0, 8)}`}
          </p>
          <div className="mb-5 space-y-2 text-left">
            {['Le vendeur va examiner votre commande', 'Vous serez notifié dès confirmation', 'Le paiement se fera après confirmation'].map((txt) => (
              <div key={txt} className="flex items-start gap-2">
                <AlertCircle size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-600">{txt}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mb-4">Page mise à jour automatiquement...</p>
          <Link to="/orders" className="w-full btn-secondary justify-center"><Package size={15} />Voir mes commandes</Link>
        </div>
      </div>
    );
  }

  // ── Step 3: Payment ──
  if (step === 3) {
    if (orderStatus === 'rejected') {
      return (
        <div className="max-w-md mx-auto px-4 py-12 text-center">
          <div className="card p-8">
            <AlertCircle size={56} className="mx-auto mb-4 text-red-400" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Commande refusée</h1>
            <p className="text-gray-500 text-sm mb-6">Le vendeur a refusé votre commande. Vous pouvez modifier votre panier.</p>
            <Link to="/shop" className="btn-primary w-full justify-center">Retour à la boutique</Link>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Finaliser la commande</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">

            {/* Delivery recap */}
            <div className="card p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <MapPin size={15} className="text-primary-600" /> Adresse de livraison
              </h2>
              <p className="text-sm text-gray-800 font-medium">{fullName} · {phone}</p>
              <p className="text-sm text-gray-500">{addressLine1}, {city}, {governorate}</p>
            </div>

            {/* Payment form */}
            <div className="card overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 bg-slate-800 px-5 py-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                  <CreditCard className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Paiement par carte</p>
                  <p className="text-xs text-slate-400">Paiement sécurisé SSL</p>
                </div>
              </div>

              <div className="p-5 space-y-3">
                {/* Cardholder */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Nom du titulaire</label>
                  <input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), cardRef.current?.focus())}
                    placeholder="NOM PRÉNOM"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm tracking-wide focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
                  />
                </div>

                {/* Card number */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Numéro de carte</label>
                  <div className="relative">
                    <input
                      ref={cardRef}
                      type="text"
                      value={cardNumber}
                      onChange={(e) => handleCardNumberChange(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), expiryRef.current?.focus())}
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                      className="w-full rounded-lg border border-gray-300 py-2 pl-3 pr-9 text-sm font-mono tracking-widest focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
                    />
                    <CreditCard className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                  </div>
                </div>

                {/* Expiry + CVV */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Expiration</label>
                    <input
                      ref={expiryRef}
                      type="text"
                      value={expiryDate}
                      onChange={(e) => handleExpiryChange(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), cvvRef.current?.focus())}
                      placeholder="MM/AA"
                      maxLength={5}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono tracking-widest focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">CVV</label>
                    <div className="relative">
                      <input
                        ref={cvvRef}
                        type="password"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').substring(0, 4))}
                        placeholder="•••"
                        maxLength={4}
                        className="w-full rounded-lg border border-gray-300 py-2 pl-3 pr-8 text-sm font-mono tracking-widest focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
                      />
                      <Lock className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                    </div>
                  </div>
                </div>

                {/* Security badge */}
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                  <p className="text-xs text-emerald-700">Données chiffrées — jamais stockées</p>
                </div>

                {/* Amount summary */}
                <div className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
                  <span className="text-xs text-gray-500">Montant total</span>
                  <span className="text-base font-bold text-gray-900">{formatPrice(total)}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setStep(1)}
                    className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                  >
                    Retour
                  </button>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={isPending}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-800 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 active:scale-95 transition disabled:opacity-50"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    Payer {formatPrice(total)}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <OrderSummary />
        </div>
      </div>
    );
  }

  // ── Step 1: Shipping ──
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Finaliser la commande</h1>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {[{ n: 1, label: 'Livraison' }, { n: 2, label: 'Confirmation' }, { n: 3, label: 'Paiement' }].map(({ n, label }, idx) => (
          <div key={n} className="flex items-center">
            {idx > 0 && <ChevronRight size={16} className="text-gray-300 mx-2" />}
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${step >= n ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                {step > n ? '✓' : n}
              </div>
              <span className={`text-sm font-medium ${step >= n ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-sm">
              <MapPin size={16} className="text-primary-600" /> Adresse de livraison
            </h2>
            <form onSubmit={handleShippingSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nom complet *</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="input-field" placeholder="Mohamed Ben Ali" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Téléphone *</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className="input-field" placeholder="+216 XX XXX XXX" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Adresse *</label>
                <input type="text" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} required className="input-field" placeholder="Rue, numéro..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Ville *</label>
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)} required className="input-field" placeholder="Tunis" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Gouvernorat *</label>
                  <select value={governorate} onChange={(e) => setGovernorate(e.target.value)} required className="input-field">
                    <option value="">Sélectionner...</option>
                    {TUNISIAN_GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optionnel)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input-field resize-none" rows={2} placeholder="Instructions de livraison, étage, etc." />
              </div>
              <button type="submit" className="w-full btn-primary py-2.5" disabled={isPending}>
                {isPending ? '⏳ Création...' : 'Continuer vers confirmation'}
              </button>
            </form>
          </div>
        </div>
        <OrderSummary />
      </div>
    </div>
  );
}