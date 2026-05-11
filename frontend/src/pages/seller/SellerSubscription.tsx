import { useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSubscriptionPlans, useVerifySubscription, useCreateSubscription } from '../../hooks/useSubscriptions';
import { useAuthStore } from '../../store/authStore';
import SellerLayout from './SellerLayout';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import BackButton from '../../components/UI/BackButton';
import toast from 'react-hot-toast';
import { formatPrice } from '../../lib/types';

export default function SellerSubscription() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { subscription, refreshSubscription } = useAuthStore();
  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans();
  const verifySubscription = useVerifySubscription();
  const createSubscription = useCreateSubscription();

  const isLoading = plansLoading;

  const currentPlanName = useMemo(() => subscription?.plan_name ?? 'Aucun abonnement', [subscription]);
  const subscriptionStatus = subscription?.status ?? 'inactive';
  const plan = useMemo(() => (plans && plans.length > 0 ? plans[0] : null), [plans]);
  const hasActiveSubscription = subscriptionStatus === 'active' && !!subscription?.current_period_end;
  const expiryDate = useMemo(() => {
    if (!subscription?.current_period_end) return null;
    return new Date(subscription.current_period_end);
  }, [subscription]);
  const daysUntilExpiry = useMemo(() => {
    if (!expiryDate) return null;
    const delta = expiryDate.getTime() - Date.now();
    return Math.max(0, Math.ceil(delta / (1000 * 60 * 60 * 24)));
  }, [expiryDate]);

  // Handle payment success/failure from Konnect redirect
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

  const handleSubscribe = async (planId: number) => {
    navigate(`/seller/subscription/configure?planId=${planId}`);
  };

  const handleVerify = async () => {
    if (!subscription?.id) return;
    try {
      await verifySubscription.mutateAsync(subscription.id.toString());
      toast.success('Statut d abonnement vérifiée');
      refreshSubscription();
    } catch (error: any) {
      toast.error(error?.message || 'Impossible de vérifier l abonnement');
    }
  };

  return (
    <SellerLayout>
      <div className="space-y-6">
        <BackButton to="/seller" />

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Activez votre boutique</h1>
              <p className="mt-2 text-gray-600 max-w-2xl">
                {hasActiveSubscription
                  ? 'Votre abonnement est actif. Vous pouvez accéder à votre dashboard vendeur et gérer vos produits.'
                  : 'Vous n’avez pas encore d’abonnement vendeur. Débloquez votre boutique en 1 minute avec un plan simple à 30 TND / mois.'}
              </p>
            </div>
            <div className="rounded-3xl border border-primary-200 bg-primary-50 px-6 py-5 text-primary-900">
              <p className="text-sm font-semibold uppercase tracking-[0.24em]">Statut abonnement</p>
              <p className="mt-3 text-2xl font-semibold">
                {subscriptionStatus === 'active' && 'Actif'}
                {subscriptionStatus === 'pending' && 'En attente de paiement'}
                {subscriptionStatus === 'processing' && 'Paiement en cours'}
                {subscriptionStatus === 'failed' && 'Paiement échoué'}
                {subscriptionStatus === 'canceled' && 'Annulé'}
                {subscriptionStatus === 'inactive' && 'Aucun abonnement actif'}
              </p>
              {hasActiveSubscription && expiryDate && (
                <p className="mt-2 text-sm text-primary-900/80">Expire le {expiryDate.toLocaleDateString('fr-FR')}</p>
              )}
              {hasActiveSubscription && daysUntilExpiry !== null && daysUntilExpiry <= 7 && (
                <p className="mt-2 text-sm font-medium text-primary-900/90">Expire dans {daysUntilExpiry} jours</p>
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary-600">Forfait vendeur</p>
                    <h2 className="mt-3 text-3xl font-semibold text-gray-900">Souk Business</h2>
                    <p className="mt-2 text-gray-600 max-w-xl">Un seul forfait pour tout le business vendeur, facturation locale en TND.</p>
                  </div>
                  <div className="rounded-3xl bg-gray-50 px-5 py-4 text-right">
                    <p className="text-sm text-gray-500">Prix mensuel</p>
                    <p className="mt-2 text-4xl font-semibold text-gray-900">30 TND</p>
                    <p className="text-sm text-gray-500">/ mois</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl bg-slate-950 p-5 text-white shadow-sm">
                    <p className="font-semibold">Ce que vous obtenez</p>
                    <ul className="mt-4 space-y-3 text-sm text-slate-200">
                      <li>✔ Produits illimités</li>
                      <li>✔ Gestion commandes</li>
                      <li>✔ Inventaire & offres</li>
                      <li>✔ Accès complet au dashboard vendeur</li>
                    </ul>
                  </div>
                  <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                    <p className="font-semibold text-gray-900">Pourquoi ce plan</p>
                    <ul className="mt-4 space-y-3 text-sm text-gray-600">
                      <li>✔ Paiement local en TND</li>
                      <li>✔ Activation rapide</li>
                      <li>✔ Solution simple sans abonnement multiple</li>
                      <li>✔ Renouvellement automatique possible</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900">Vos actions</h3>
                <p className="mt-2 text-gray-600">{hasActiveSubscription ? 'Votre abonnement est déjà actif. Vous pouvez gérer votre boutique ou renouveler avant la fin de la période.' : 'Commencez maintenant pour débloquer votre boutique vendeur.'}</p>
                <div className="mt-5 flex flex-col gap-4 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => plan && handleSubscribe(Number(plan.id))}
                    className="btn-subscribe w-full sm:w-auto"
                    disabled={!plan || createSubscription.status === 'pending'}
                  >
                    {createSubscription.status === 'pending' ? 'Redirection au paiement...' : hasActiveSubscription ? 'Renouveler mon abonnement' : "S'abonner maintenant"}
                  </button>
                  {hasActiveSubscription && (
                    <button
                      onClick={() => navigate('/seller')}
                      className="btn-secondary w-full sm:w-auto"
                    >
                      Accéder au dashboard
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900">Etat de l abonnement</h3>
                <div className="mt-4 space-y-3 text-sm text-gray-600">
                  <p>{hasActiveSubscription ? 'Votre boutique est active. Merci de votre confiance.' : 'Aucun abonnement actif pour le moment.'}</p>
                  <p>Statut actuel : <span className="font-semibold text-gray-900">{subscriptionStatus === 'active' ? 'Actif' : subscriptionStatus === 'pending' ? 'En attente' : subscriptionStatus === 'processing' ? 'Paiement en cours' : 'Inactif'}</span></p>
                  {expiryDate && (
                    <p>Fin de la période : <span className="font-semibold">{expiryDate.toLocaleDateString('fr-FR')}</span></p>
                  )}
                  {hasActiveSubscription && daysUntilExpiry !== null && daysUntilExpiry <= 14 && (
                    <p className="text-sm text-primary-700">Votre abonnement expire dans {daysUntilExpiry} jours. Renouvelez-le pour conserver l'accès.</p>
                  )}
                </div>
              </div>

              {!hasActiveSubscription && (
                <div className="rounded-3xl border border-primary-200 bg-primary-50 p-6 text-primary-900 shadow-sm">
                  <h3 className="text-xl font-semibold">Besoin d'aide ?</h3>
                  <p className="mt-3 text-sm">Si vous ne voyez pas le bouton d’abonnement, vérifiez que votre session vendeur est active et que les plans sont chargés.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </SellerLayout>
  );
}
