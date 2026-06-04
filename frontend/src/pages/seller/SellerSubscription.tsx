import { useMemo, useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSubscriptionPlans, useVerifySubscription, useRequestSubscriptionRenewal } from '../../hooks/useSubscriptions';
import { useAuthStore } from '../../store/authStore';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { CreditCard, ShieldCheck, RefreshCw, CheckCircle, Clock, XCircle, Lock } from 'lucide-react';

export default function SellerSubscription() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { subscription, refreshSubscription } = useAuthStore();
  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans();
  const verifySubscription = useVerifySubscription();
  const requestRenewal = useRequestSubscriptionRenewal();
  const [requesting, setRequesting] = useState(false);

  const currentPlanName = useMemo(() => subscription?.plan_name ?? 'Aucun abonnement', [subscription]);
  const subscriptionStatus = subscription?.status ?? 'inactive';
  const plan = useMemo(() => (plans && plans.length > 0 ? plans[0] : null), [plans]);
  const hasActiveSubscription = subscriptionStatus === 'active' && subscription?.payment_status === 'paid' && !!subscription?.end_date;
  const isPendingPayment = subscriptionStatus === 'active' && subscription?.payment_status === 'unpaid';
  const expiryDate = useMemo(() => (subscription?.end_date ? new Date(subscription.end_date) : null), [subscription]);
  const daysUntilExpiry = useMemo(() => {
    if (!expiryDate) return null;
    const delta = expiryDate.getTime() - Date.now();
    return Math.max(0, Math.ceil(delta / (1000 * 60 * 60 * 24)));
  }, [expiryDate]);

  useEffect(() => {
    const success = searchParams.get('success');
    const subscriptionId = searchParams.get('subscriptionId');
    if (success === 'true' && subscriptionId) {
      toast.loading('⏳ Vérification du paiement...');
      verifySubscription.mutateAsync(subscriptionId).then(() => {
        toast.dismiss();
        toast.success('✅ Abonnement activé avec succès');
        setTimeout(() => refreshSubscription(), 1000);
      }).catch(() => {
        toast.dismiss();
        toast.error('❌ Le paiement a échoué. Veuillez réessayer.');
      });
    } else if (success === 'false' && subscriptionId) {
      toast.error('❌ Le paiement a échoué. Veuillez réessayer.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [searchParams, verifySubscription, refreshSubscription]);

  const [showPayForm, setShowPayForm] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [requestComment, setRequestComment] = useState('');
  const [isRenewalMode, setIsRenewalMode] = useState(false);

  // Refs for auto-focus
  const nameRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLInputElement>(null);
  const expiryRef = useRef<HTMLInputElement>(null);
  const cvvRef = useRef<HTMLInputElement>(null);

  const handleCardNumberChange = (value: string) => {
    const digits = value.replace(/\D/g, '').substring(0, 16);
    const formatted = digits.match(/.{1,4}/g)?.join(' ') ?? digits;
    setCardNumber(formatted);
    // Auto-advance when full
    if (digits.length === 16) expiryRef.current?.focus();
  };

  const handleExpiryChange = (value: string) => {
    const digits = value.replace(/\D/g, '').substring(0, 4);
    let formatted = digits;
    if (digits.length >= 2) formatted = digits.substring(0, 2) + '/' + digits.substring(2);
    setCardExpiry(formatted);
    if (digits.length === 4) cvvRef.current?.focus();
  };

  const handleCvvChange = (value: string) => {
    const digits = value.replace(/\D/g, '').substring(0, 4);
    setCvv(digits);
  };

  const handleSubscribe = async (planId: number) => {
    try {
      setRequesting(true);
      toast.loading('⏳ Envoi de la demande...');
      const response: any = await api.requestSellerSubscription(requestComment.trim());
      toast.dismiss();
      setRequesting(false);
      if (response?.success && response?.subscriptionId) {
        toast.success('✅ Demande envoyée. En attente de validation.');
        refreshSubscription();
        return;
      }
      toast.error(response?.message || 'Erreur lors de la demande');
    } catch (error: any) {
      toast.dismiss();
      setRequesting(false);
      toast.error(error?.message || 'Erreur lors de la demande');
    }
  };

  const handleVerify = async () => {
    if (!subscription?.id) return;
    try {
      await verifySubscription.mutateAsync(subscription.id.toString());
      toast.success('Statut vérifié');
      refreshSubscription();
    } catch (error: any) {
      toast.error(error?.message || 'Impossible de vérifier');
    }
  };

  const handleRenewal = () => {
    setIsRenewalMode(true);
    setShowPayForm(true);
    setTimeout(() => nameRef.current?.focus(), 100);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscription?.id) return;
    try {
      toast.loading('⏳ Traitement du paiement...');
      const payload = { cardNumber, expiryDate: cardExpiry, cvv, cardholderName };
      const response: any = isRenewalMode
        ? await requestRenewal.mutateAsync(payload)
        : await api.paySellerSubscription(subscription.id, payload);
      toast.dismiss();
      if (response?.success) {
        toast.success('✅ Votre renouvellement a été effectué avec succès. Nouvelle date d\'expiration enregistrée.');
        resetForm();
        setTimeout(() => { refreshSubscription(); navigate('/seller'); }, 500);
        return;
      }
      toast.error(response?.message || 'Erreur lors du paiement');
    } catch (err: any) {
      toast.dismiss();
      toast.error(err?.message || 'Erreur lors du paiement');
    }
  };

  const resetForm = () => {
    setShowPayForm(false);
    setIsRenewalMode(false);
    setCardNumber(''); setCardExpiry(''); setCvv(''); setCardholderName('');
  };

  const planAmount = plan?.price ?? subscription?.amount ?? 30;

  const PaymentForm = ({ title, amount }: { title: string; amount: number }) => (
    <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 bg-primary-600 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
          <CreditCard className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="text-xs text-primary-100">Paiement sécurisé SSL</p>
        </div>
      </div>

      <form onSubmit={handlePaySubmit} className="p-5 space-y-3">
        {/* Cardholder name */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Nom du titulaire</label>
          <input
            ref={nameRef}
            type="text"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), cardRef.current?.focus())}
            placeholder="NOM PRÉNOM"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm tracking-wide focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-300"
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
              required
              className="w-full rounded-lg border border-gray-300 py-2 pl-3 pr-9 text-sm font-mono tracking-widest focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-300"
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
              value={cardExpiry}
              onChange={(e) => handleExpiryChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), cvvRef.current?.focus())}
              placeholder="MM/AA"
              maxLength={5}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono tracking-widest focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-300"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">CVV</label>
            <div className="relative">
              <input
                ref={cvvRef}
                type="password"
                value={cvv}
                onChange={(e) => handleCvvChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                placeholder="•••"
                maxLength={4}
                required
                className="w-full rounded-lg border border-gray-300 py-2 pl-3 pr-8 text-sm font-mono tracking-widest focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-300"
              />
              <Lock className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Security + amount */}
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
          <p className="text-xs text-emerald-700">Données chiffrées — jamais stockées</p>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
          <span className="text-xs text-gray-500">Montant à payer</span>
          <span className="text-base font-bold text-gray-900">{amount} TND</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 active:scale-95"
          >
            <Lock className="h-3.5 w-3.5" />
            Payer {amount}  TND
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Abonnement vendeur</h1>

      <div className="card p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-primary-50 p-3 text-primary-700">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Plan actuel</h2>
            <p className="text-sm text-gray-500">{currentPlanName}</p>
          </div>
        </div>

        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Statut</p>
            <div className="mt-2 flex items-center gap-2">
              {hasActiveSubscription ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : isPendingPayment ? (
                <Clock className="h-4 w-4 text-yellow-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <p className="font-semibold text-gray-900 capitalize">{subscriptionStatus}</p>
            </div>
            {expiryDate && (
              <p className="mt-1 text-sm text-gray-500">
                Expire le {expiryDate.toLocaleDateString('fr-FR')}
                {daysUntilExpiry !== null && daysUntilExpiry <= 7 && (
                  <span className="ml-2 text-orange-600 font-medium">({daysUntilExpiry}j restants)</span>
                )}
              </p>
            )}
            {!hasActiveSubscription && !isPendingPayment && (
              <p className="mt-3 text-sm text-gray-500">Aucun abonnement actif.</p>
            )}
            {isPendingPayment && (
              <div className="mt-3 rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800">
                Demande acceptée. Effectuez le paiement pour activer votre abonnement.
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500 mb-3">Plans disponibles</p>
            {(!hasActiveSubscription && !isPendingPayment) ? (
              <div className="space-y-3">
                {(plans ?? []).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.price ?? 30} TND / {p.interval ?? 'mois'}</p>
                    </div>
                    <button
                      onClick={() => handleSubscribe(p.id)}
                      disabled={requesting}
                      className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50"
                    >
                      Demander
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600">
                {hasActiveSubscription ? 'Votre abonnement est actif.' : 'En attente de paiement.'}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6">
          {hasActiveSubscription && (
            <div>
              <div className="flex gap-3">
                <button
                  onClick={handleVerify}
                  disabled={requesting}
                  className="flex items-center gap-2 rounded-xl border border-primary-300 bg-white px-4 py-2.5 text-sm font-medium text-primary-700 transition hover:bg-primary-50 disabled:opacity-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  Vérifier le statut
                </button>
                <button
                  onClick={handleRenewal}
                  disabled={requesting}
                  className="flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50"
                >
                  <CreditCard className="h-4 w-4" />
                  Renouveler l'abonnement
                </button>
              </div>
              {isRenewalMode && showPayForm && (
                <PaymentForm title="Renouvellement de l'abonnement" amount={Number(planAmount)} />
              )}
            </div>
          )}

          {isPendingPayment && (
            <div>
              {!showPayForm ? (
                <button
                  onClick={() => { setShowPayForm(true); setTimeout(() => nameRef.current?.focus(), 100); }}
                  className="flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
                >
                  <CreditCard className="h-4 w-4" />
                  Payer l'abonnement
                </button>
              ) : (
                <PaymentForm title="Paiement de l'abonnement" amount={Number(planAmount)} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}