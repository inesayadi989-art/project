import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Star } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { useSubscriptionPlans, useCreateSubscription } from '../hooks/useSubscriptions';
import toast from 'react-hot-toast';

interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  amount: number;
  currency: string;
  interval_type: 'month' | 'year';
  interval_count: number;
}

export default function SubscriptionPlansPage() {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans();
  const createSubscription = useCreateSubscription();

  if (!user) {
    navigate('/auth/login');
    return null;
  }

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    try {
      const response: any = await createSubscription.mutateAsync(parseInt(plan.id));
      if (response.paymentUrl) {
        // Redirect to Konnect payment page
        window.location.href = response.paymentUrl;
      } else {
        toast.error('Erreur lors de la création du paiement');
      }
    } catch (error) {
      toast.error('Erreur lors de la création de l\'abonnement');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Abonnement unique vendeur
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Un seul forfait à 30 TND par mois pour tous les vendeurs.
            Passez à l’action et activez votre boutique sans choix multiple.
          </p>
        </div>

        {/* Plans Grid */}
        {plansLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {plans?.map((plan) => (
              <div
                key={plan.id}
                className="relative bg-white rounded-lg shadow-lg overflow-hidden"
              >
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-gray-900">
                      {plan.amount}
                    </span>
                    <span className="text-gray-600 ml-1">
                      {plan.currency}/{plan.interval_type === 'month' ? 'mois' : 'an'}
                    </span>
                  </div>

                  {plan.description && (
                    <p className="text-gray-600 mb-6">{plan.description}</p>
                  )}

                  <button
                    onClick={() => setSelectedPlan(plan)}
                    className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                      selectedPlan?.id === plan.id
                        ? 'bg-primary-600 text-white'
                        : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                    }`}
                  >
                    {selectedPlan?.id === plan.id ? 'Sélectionné' : 'Sélectionner'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Payment Section */}
        {selectedPlan && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Paiement pour {selectedPlan.name}
            </h2>

            <div className="mb-6">
              <p className="text-gray-600">
                Vous serez redirigé vers Konnect pour effectuer le paiement en toute sécurité.
              </p>
            </div>

            <div className="flex items-center justify-between pt-6 border-t">
              <div>
                <p className="text-sm text-gray-600">
                  Total: {selectedPlan.amount} {selectedPlan.currency} / {selectedPlan.interval_type === 'month' ? 'mois' : 'an'}
                </p>
              </div>
              <button
                onClick={() => handleSubscribe(selectedPlan)}
                disabled={createSubscription.isPending}
                className="bg-primary-600 text-white px-6 py-2 rounded-md font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {createSubscription.isPending ? (
                  <>
                    <LoadingSpinner className="w-4 h-4 mr-2" />
                    Traitement...
                  </>
                ) : (
                  'Souscrire maintenant'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">
            Pourquoi choisir Souk.tn ?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-blue-800 mb-2">
                Plateforme tunisienne
              </h4>
              <p className="text-blue-700 text-sm">
                Conçue spécifiquement pour le marché tunisien avec des méthodes de paiement locales.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-2">
                Support local
              </h4>
              <p className="text-blue-700 text-sm">
                Équipe de support parlant arabe et français, disponible 24/7.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-2">
                Sécurité garantie
              </h4>
              <p className="text-blue-700 text-sm">
                Transactions sécurisées avec protection des données personnelles.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-2">
                Croissance assurée
              </h4>
              <p className="text-blue-700 text-sm">
                Outils marketing intégrés pour développer votre business.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}