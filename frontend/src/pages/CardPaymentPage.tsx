import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';
import { CreditCard, Shield, ArrowLeft, Lock } from 'lucide-react';

export default function CardPaymentPage() {
  const [searchParams] = useSearchParams();
  const subscriptionId = searchParams.get('subscriptionId');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    // Limiter à 4 chiffres (MMYY)
    const digits = v.substring(0, 4);
    
    if (digits.length >= 2) {
      return digits.substring(0, 2) + '/' + digits.substring(2, 4);
    }
    return digits;
  };

  const handleConfirmPayment = async () => {
    if (!subscriptionId) {
      toast.error('Identifiant de souscription manquant.');
      return;
    }

    if (!cardNumber || !expiryDate || !cvv || !cardholderName) {
      toast.error('Veuillez remplir tous les champs de carte bancaire.');
      return;
    }

    // Basic validation
    const cardNumberClean = cardNumber.replace(/\s/g, '');
    if (cardNumberClean.length < 13 || cardNumberClean.length > 19) {
      toast.error('Numéro de carte invalide.');
      return;
    }

    const expiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
    if (!expiryRegex.test(expiryDate)) {
      toast.error('Date d\'expiration invalide (MM/YY).');
      return;
    }

    if (cvv.length < 3 || cvv.length > 4) {
      toast.error('CVV invalide.');
      return;
    }

    setLoading(true);
    try {
      toast.loading('Traitement du paiement en cours...');
      await api.simulatePaymentSuccess(subscriptionId);
      toast.dismiss();
      toast.success('Paiement confirmé avec succès. Abonnement activé.');
      navigate(`/payment/success?type=subscription&subscriptionId=${encodeURIComponent(subscriptionId)}`);
    } catch (error: any) {
      toast.dismiss();
      toast.error(error?.message || 'Impossible de traiter le paiement.');
    } finally {
      setLoading(false);
    }
  };

  if (!subscriptionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm max-w-md">
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
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <CreditCard className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Paiement par carte</h1>
            <p className="mt-2 text-gray-600">Entrez vos informations de carte bancaire</p>
          </div>
        </div>

        {/* Payment Form */}
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="space-y-6">
            {/* Card Information Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations de carte bancaire</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Numéro de carte *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="1234 5678 9012 3456"
                    className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    maxLength={19}
                    disabled={loading}
                  />
                  <CreditCard className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date d'expiration *
                  </label>
                  <input
                    type="text"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                    placeholder="MM/YY"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    maxLength={5}
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CVV *
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="123"
                      className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      maxLength={4}
                      disabled={loading}
                    />
                    <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du titulaire *
                </label>
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

            <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Paiement sécurisé SSL</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Vos données bancaires sont chiffrées et sécurisées. Nous n'enregistrons jamais vos informations de carte.
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="rounded-2xl bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Résumé du paiement</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Abonnement vendeur</span>
                  <span>ID: {subscriptionId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Méthode</span>
                  <span>Carte bancaire</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleConfirmPayment}
              disabled={loading || !cardNumber || !expiryDate || !cvv || !cardholderName}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Traitement en cours...
                </>
              ) : (
                <>
                  <Lock className="h-5 w-5" />
                  Payer maintenant
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Vos informations de paiement sont sécurisées et cryptées.</p>
          <p className="mt-1">Support: contact@souk.tn</p>
        </div>
      </div>
    </div>
  );
}