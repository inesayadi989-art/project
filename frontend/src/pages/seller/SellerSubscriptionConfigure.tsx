import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSubscriptionPlans, useCreateSubscription } from '../../hooks/useSubscriptions';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';
import { formatPrice } from '../../lib/types';
import { Shield, CreditCard } from 'lucide-react';

export default function SellerSubscriptionConfigure() {
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('planId');
  const navigate = useNavigate();
  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans();
  const createSubscription = useCreateSubscription();
  const [loading, setLoading] = useState(false);

  const plan = useMemo(() => {
    if (!plans || plans.length === 0) return undefined;
    if (planId) return plans.find((plan) => plan.id.toString() === planId);
    return plans[0];
  }, [plans, planId]);

  const intervalLabel = useMemo(() => {
    const interval = (plan as any)?.interval_type || (plan as any)?.interval;
    if (interval === 'year' || interval === 'yearly') return 'Annuel';
    return 'Mensuel';
  }, [plan]);

  const handleProceedToPayment = async () => {
    if (!plan) {
      toast.error('Aucun plan sélectionné.');
      return;
    }

    setLoading(true);
    try {
      const response: any = await createSubscription.mutateAsync({ planId: Number(plan.id) });
      console.log('createSubscription response', response);
      if (response.paymentUrl) {
        const url = new URL(response.paymentUrl, window.location.origin);
        if (url.pathname === '/payment/checkout') {
          navigate(`/payment/card?subscriptionId=${encodeURIComponent(response.subscriptionId)}`);
          return;
        }
        window.location.href = response.paymentUrl;
        return;
      }
      if (response.subscriptionId) {
        navigate(`/payment/card?subscriptionId=${encodeURIComponent(response.subscriptionId)}`);
        return;
      }

      toast.error(response.message || 'Erreur lors de la création de la session de paiement.');
    } catch (error: any) {
      toast.error(error?.message || 'Erreur lors de la création de la session de paiement.');
    } finally {
      setLoading(false);
    }
  };

  if (plansLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-xl rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900">Plan introuvable</h1>
          <p className="mt-3 text-gray-600">Veuillez retourner à la page d'abonnement et sélectionner un forfait.</p>
          <button
            onClick={() => navigate('/seller/subscription')}
            className="mt-6 btn-primary"
          >
            Retour aux abonnements
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary-600">Configurer votre forfait</p>
            <h1 className="mt-3 text-3xl font-bold text-gray-900">Finalisez votre abonnement Souk.tn</h1>
            <p className="mt-2 text-gray-600 max-w-2xl">Paiement carte bancaire direct, sans code OTP.</p>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm w-full max-w-sm">
            <p className="text-sm text-gray-500">Forfait sélectionné</p>
            <h2 className="mt-3 text-2xl font-semibold text-gray-900">{plan.name}</h2>
            <p className="text-gray-600 mt-1">{plan.description}</p>
            <div className="mt-4 rounded-3xl bg-primary-50 p-4">
              <p className="text-sm text-gray-500">Montant</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{formatPrice(plan.amount)}</p>
              <p className="text-sm text-gray-500">{intervalLabel} / {plan.currency}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr] mt-8">
          <div className="space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900">Mode de paiement</h2>
              <p className="mt-2 text-gray-600">Payez directement par carte bancaire pour activer votre abonnement vendeur.</p>

              <div className="mt-6 rounded-3xl border border-gray-200 bg-primary-50 p-4 text-gray-900">
                Paiement sécurisé par carte bancaire (Visa, MasterCard).
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <><CreditCard className="h-6 w-6 text-primary-600" /><h2 className="text-xl font-semibold text-gray-900">Paiement par carte</h2></>
              </div>
              <p className="text-gray-600">
                Un paiement sécurisé par carte bancaire est requis pour activer votre abonnement vendeur. Ce flux ne demande pas d OTP.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                onClick={() => navigate('/seller/subscription')}
                className="btn-secondary w-full sm:w-auto"
              >
                Retour aux forfaits
              </button>
              <button
                onClick={handleProceedToPayment}
                disabled={loading || createSubscription.isLoading}
                className="btn-primary w-full sm:w-auto"
              >
                {loading || createSubscription.isLoading ? 'Redirection...' : 'Confirmer et payer'}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-slate-950 p-6 text-white shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/10 p-3">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Forfait Go</p>
                <h2 className="text-2xl font-semibold">{plan.name}</h2>
              </div>
            </div>
            <div className="mt-6 space-y-3 text-sm text-slate-300">
              <p>Réponses plus intelligentes et plus rapides pour votre boutique.</p>
              <p>Limites étendues pour vos annonces et stockage.</p>
              <p>Support prioritaire pour les vendeurs Souk.tn.</p>
              <p>Facturation sécurisée en TND.</p>
            </div>
            <div className="mt-6 rounded-3xl bg-white/5 p-4">
              <div className="flex justify-between text-sm text-slate-400">
                <span>Abonnement {intervalLabel}</span>
                <span>{formatPrice(plan.amount)} {plan.currency}</span>
              </div>
              <div className="mt-2 flex justify-between text-sm text-slate-400">
                <span>Taxes estimées</span>
                <span>0.00 {plan.currency}</span>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-base font-semibold text-white">
                <span>Montant dû aujourd'hui</span>
                <span>{formatPrice(plan.amount)} {plan.currency}</span>
              </div>
            </div>
            <div className="mt-6 rounded-3xl bg-green-600/10 p-4 text-sm text-green-100">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-300" />
                Paiement sécurisé pour les vendeurs Souk.tn.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
