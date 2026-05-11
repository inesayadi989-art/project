import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import BackButton from '../components/UI/BackButton';
import toast from 'react-hot-toast';
import { CreditCard, Shield, Smartphone, ArrowLeft, Lock } from 'lucide-react';

export default function SubscriptionCheckoutPage() {
  const [searchParams] = useSearchParams();
  const subscriptionId = searchParams.get('subscriptionId');
  const paymentMethod = searchParams.get('paymentMethod') || 'd17';
  const type = searchParams.get('type') || 'subscription';
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [phone, setPhone] = useState('');

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\D/g, '').slice(0, 16);
    return v.match(/.{1,4}/g)?.join(' ') || '';
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\D/g, '').slice(0, 4);
    // Ajouter le slash uniquement si on a au moins 2 chiffres
    if (v.length >= 2) {
      return `${v.slice(0, 2)}/${v.slice(2, 4)}`;
    }
    return v;
  };

  const handleMockPayment = async () => {
    if (!subscriptionId) {
      toast.error('Identifiant de souscription manquant.');
      return;
    }

    setLoading(true);
    try {
      let payload: any = { paymentMethod };

      if (paymentMethod === 'card') {
        const number = cardNumber.replace(/\s/g, '');
        const expiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
        if (number.length < 13 || number.length > 19) {
          throw new Error('Numéro de carte invalide.');
        }
        if (!expiryRegex.test(expiryDate)) {
          throw new Error('Date d\'expiration invalide.');
        }
        if (cvv.length < 3 || cvv.length > 4) {
          throw new Error('CVV invalide.');
        }
        if (!cardholderName.trim()) {
          throw new Error('Nom du titulaire requis.');
        }
        payload = {
          ...payload,
          cardNumber: number,
          expiryDate,
          cvv,
          cardholderName,
        };
      } else {
        const phoneRegex = /^(\+216|00216)?[2459]\d{7}$/;
        if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
          throw new Error('Numéro de téléphone tunisien invalide.');
        }
        payload = {
          ...payload,
          phone,
        };
      }

      await api.mockSubscriptionPayment(subscriptionId, payload);
      toast.success('Paiement simulé confirmé. Abonnement activé.');
      navigate(`/payment/success?type=${encodeURIComponent(type)}&subscriptionId=${encodeURIComponent(subscriptionId)}`);
    } catch (error: any) {
      toast.error(error?.message || 'Impossible de traiter le paiement simulé.');
    } finally {
      setLoading(false);
    }
  };

  if (!subscriptionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900">Erreur de paiement</h1>
          <p className="mt-4 text-gray-600">Aucun identifiant d'abonnement n'a été trouvé.</p>
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
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <BackButton to="/seller/subscription" className="mb-4" />

        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-6">
            <h1 className="mt-3 text-3xl font-bold text-gray-900">{paymentMethod === 'card' ? 'Paiement par carte' : 'Paiement D17'}</h1>
            <p className="mt-4 text-gray-600">
              Complétez votre paiement pour activer votre abonnement vendeur.
            </p>
          </div>

          <div className="rounded-3xl bg-primary-50 p-6">
            <p className="text-sm text-primary-700">Mode de paiement</p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">{paymentMethod === 'card' ? 'Carte bancaire' : 'D17 Mobile'}</p>
            <p className="mt-2 text-gray-600">Abonnement vendeur</p>
            <p className="mt-2 text-gray-600">ID d'abonnement: {subscriptionId}</p>
          </div>

          <div className="mt-8 space-y-6">
            {paymentMethod === 'card' ? (
              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="grid gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Numéro de carte</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                        className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={loading}
                      />
                      <CreditCard className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date d'expiration</label>
                      <input
                        type="text"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                        placeholder="MM/YY"
                        maxLength={5}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">CVV</label>
                      <div className="relative">
                        <input
                          type="password"
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                          placeholder="123"
                          maxLength={4}
                          className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          disabled={loading}
                        />
                        <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nom du titulaire</label>
                    <input
                      type="text"
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
                      placeholder="NOM PRENOM"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Numéro de téléphone D17</label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+216 12 345 678"
                        className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        disabled={loading}
                      />
                      <Smartphone className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleMockPayment}
              disabled={loading || (paymentMethod === 'card' ? !cardNumber || !expiryDate || !cvv || !cardholderName : !phone)}
              className="w-full rounded-3xl bg-primary-600 px-6 py-4 text-base font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-70"
            >
              {loading ? <LoadingSpinner size="sm" /> : paymentMethod === 'card' ? 'Payer maintenant' : 'Payer avec D17'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
