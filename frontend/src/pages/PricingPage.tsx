import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Zap, Shield, Headphones, TrendingUp } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useSubscriptionPlans, useCreateSubscription } from '../hooks/useSubscriptions';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';

export default function PricingPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans();
  const createSubscription = useCreateSubscription();
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (plans && plans.length > 0 && !selectedPlan) {
      setSelectedPlan(plans[0]);
    }
  }, [plans]);

  const handleSubscribe = async (plan: any) => {
    if (!user) {
      navigate('/login');
      return;
    }

    setIsProcessing(true);
    try {
      const response: any = await createSubscription.mutateAsync(parseInt(plan.id));

      if (response.paymentUrl) {
        // Show "redirecting" toast
        toast.loading('Redirection vers le paiement sécurisé...', { duration: 2000 });
        
        // Redirect to Konnect after short delay
        setTimeout(() => {
          window.location.href = response.paymentUrl;
        }, 500);
      } else {
        toast.error('Erreur lors de la création de la session de paiement');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Erreur lors de l\'abonnement');
    } finally {
      setIsProcessing(false);
    }
  };

  const features = [
    {
      icon: Zap,
      title: 'Performances optimales',
      description: 'Infrastructure rapide et fiable pour votre boutique en ligne',
    },
    {
      icon: Shield,
      title: 'Sécurité garantie',
      description: 'Paiements sécurisés via Konnect, protection des données client',
    },
    {
      icon: TrendingUp,
      title: 'Outils marketing',
      description: 'Promotions, codes de réduction, analytics en temps réel',
    },
    {
      icon: Headphones,
      title: 'Support local 24/7',
      description: 'Équipe parlant arabe et français, support illimité',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 mb-4">
            Un seul forfait, tout ce dont vous avez besoin
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-2">
            Lancez votre boutique en ligne en Tunisie avec Souk Business
          </p>
          <p className="text-sm text-gray-500">
            Facturation mensuelle · Annulation possible à tout moment
          </p>
        </div>
      </div>

      {/* Pricing Card */}
      {plansLoading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : plans && plans.length > 0 ? (
        <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="relative rounded-2xl border-2 border-primary-600 bg-white shadow-xl overflow-hidden">
            {/* Badge */}
            <div className="absolute top-0 right-0 bg-primary-600 text-white px-4 py-1 text-sm font-semibold rounded-bl-lg">
              Plan unique
            </div>

            <div className="p-8 sm:p-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {selectedPlan?.name || plans[0].name}
              </h2>
              
              {selectedPlan?.description && (
                <p className="text-gray-600 mb-6">{selectedPlan.description}</p>
              )}

              {/* Price */}
              <div className="mb-8">
                <div className="flex items-baseline">
                  <span className="text-5xl font-extrabold text-gray-900">
                    {selectedPlan?.amount || plans[0].amount}
                  </span>
                  <span className="ml-2 text-xl text-gray-600">
                    {selectedPlan?.currency || plans[0].currency}
                  </span>
                </div>
                <p className="text-gray-600 mt-2">
                  par {selectedPlan?.interval_type === 'year' ? 'année' : 'mois'}
                </p>
              </div>

              {/* CTA Button */}
              <button
                onClick={() => handleSubscribe(selectedPlan || plans[0])}
                disabled={isProcessing || createSubscription.isPending}
                className="w-full bg-primary-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition mb-8 flex items-center justify-center"
              >
                {isProcessing || createSubscription.isPending ? (
                  <>
                    <LoadingSpinner className="w-5 h-5 mr-2" />
                    Redirection en cours...
                  </>
                ) : (
                  '💳 Activer mon abonnement'
                )}
              </button>

              {/* Features List */}
              <div className="space-y-4 border-t pt-8">
                {features.map((feature, idx) => {
                  const Icon = feature.icon;
                  return (
                    <div key={idx} className="flex items-start gap-3">
                      <Check className="h-6 w-6 text-primary-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                        <p className="text-sm text-gray-600">{feature.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Trust Section */}
          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-4">Confiance garantie</p>
            <div className="flex justify-center gap-4 flex-wrap">
              <div className="text-sm text-gray-600">
                ✅ Paiement sécurisé avec Konnect
              </div>
              <div className="text-sm text-gray-600">
                ✅ Données protégées
              </div>
              <div className="text-sm text-gray-600">
                ✅ Support local 24/7
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-center py-20">
          <p className="text-gray-600">Aucun plan disponible pour le moment</p>
        </div>
      )}

      {/* FAQ-like Section */}
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8 mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
          Questions fréquentes
        </h2>
        
        <div className="grid gap-6 md:gap-8">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              💳 Quels modes de paiement acceptez-vous?
            </h3>
            <p className="text-gray-600">
              Nous acceptons les cartes bancaires (Visa, MasterCard) et les portefeuilles numériques tunisiens via Konnect. Tous les paiements sont sécurisés et cryptés.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              📅 Puis-je annuler mon abonnement?
            </h3>
            <p className="text-gray-600">
              Oui, vous pouvez annuler votre abonnement à tout moment. L'accès sera maintenu jusqu'à la fin de la période facturée.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              🔄 Comment fonctionnent les renouvellements?
            </h3>
            <p className="text-gray-600">
              Votre abonnement se renouvelle automatiquement chaque mois. Vous recevrez un rappel 3 jours avant le renouvellement.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              📞 Avez-vous une équipe support?
            </h3>
            <p className="text-gray-600">
              Oui! Notre équipe parle arabe et français et est disponible 24h/24, 7j/7 pour vous aider avec n'importe quelle question.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
