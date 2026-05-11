import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import BackButton from '../components/UI/BackButton';
import toast from 'react-hot-toast';
import { Smartphone, Shield, ArrowLeft, CheckCircle, MessageSquare } from 'lucide-react';

type Step = 'phone' | 'otp' | 'processing';

export default function D17PaymentPage() {
  const [searchParams] = useSearchParams();
  const subscriptionId = searchParams.get('subscriptionId');
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('phone');
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [fullName, setFullName] = useState('');

  const handleSendOtp = async () => {
    if (!subscriptionId) {
      toast.error('Identifiant de souscription manquant.');
      return;
    }

    if (!phoneNumber) {
      toast.error('Veuillez saisir votre numéro de téléphone D17.');
      return;
    }

    // Basic phone number validation (Tunisian format)
    const phoneRegex = /^(\+216|00216)?[2459]\d{7}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
      toast.error('Numéro de téléphone invalide. Utilisez le format tunisien.');
      return;
    }

    setLoading(true);
    try {
      toast.loading('Envoi du code de confirmation...');
      const result = await api.sendSubscriptionOtp(subscriptionId, phoneNumber);
      toast.dismiss();

      if (!result.success) {
        throw new Error(result.warning || result.message || 'Impossible d\'envoyer le code.');
      }

      toast.success('Code envoyé avec succès sur votre téléphone !');
      setStep('otp');
    } catch (error: any) {
      toast.dismiss();
      toast.error(error?.message || 'Impossible d\'envoyer le code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!subscriptionId) {
      toast.error('Identifiant de souscription manquant.');
      return;
    }

    if (!otpCode || otpCode.length !== 6) {
      toast.error('Veuillez saisir le code à 6 chiffres.');
      return;
    }

    setLoading(true);
    setStep('processing');
    try {
      toast.loading('Vérification du code et traitement du paiement...');
      await api.verifySubscriptionOtp(subscriptionId, otpCode);
      toast.dismiss();
      toast.success('Paiement confirmé avec succès. Abonnement activé.');
      navigate(`/payment/success?type=subscription&subscriptionId=${encodeURIComponent(subscriptionId)}`);
    } catch (error: any) {
      toast.dismiss();
      toast.error(error?.message || 'Code invalide ou paiement échoué.');
      setStep('otp');
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
          <BackButton />
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
              <Smartphone className="h-8 w-8 text-orange-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Paiement D17</h1>
            <p className="mt-2 text-gray-600">Confirmez votre paiement mobile tunisien</p>
          </div>
        </div>

        {/* Payment Form */}
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="space-y-6">
            {/* Step Indicator */}
            <div className="flex items-center justify-center space-x-4">
              <div className={`flex items-center space-x-2 ${step === 'phone' || step === 'otp' || step === 'processing' ? 'text-orange-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step === 'phone' || step === 'otp' || step === 'processing' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  1
                </div>
                <span className="text-sm font-medium">Téléphone</span>
              </div>
              <div className="w-8 h-px bg-gray-300"></div>
              <div className={`flex items-center space-x-2 ${step === 'otp' || step === 'processing' ? 'text-orange-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step === 'otp' || step === 'processing' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  2
                </div>
                <span className="text-sm font-medium">Code OTP</span>
              </div>
              <div className="w-8 h-px bg-gray-300"></div>
              <div className={`flex items-center space-x-2 ${step === 'processing' ? 'text-orange-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step === 'processing' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  3
                </div>
                <span className="text-sm font-medium">Paiement</span>
              </div>
            </div>

            {/* Personal Information Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations du titulaire</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom complet
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Votre nom complet"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    disabled={loading || step !== 'phone'}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Optionnel - pour la facture d'abonnement
                  </p>
                </div>
              </div>
            </div>

            {/* D17 Information Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations de paiement D17</h3>
              
              {step === 'phone' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numéro de téléphone D17
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+216 XX XXX XXX"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    disabled={loading}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Entrez votre numéro D17 au format tunisien
                  </p>
                </div>
              )}

              {step === 'otp' && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-700">Code envoyé au {phoneNumber}</span>
                  </div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Code de confirmation (6 chiffres)
                  </label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-center text-2xl font-mono tracking-widest text-black"
                    disabled={loading}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Vérifiez vos SMS et saisissez le code reçu
                  </p>
                  <button
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="mt-2 text-sm text-orange-600 hover:text-orange-700 underline"
                  >
                    Renvoyer le code
                  </button>
                </div>
              )}

              {step === 'processing' && (
                <div className="text-center py-8">
                  <LoadingSpinner size="lg" />
                  <p className="mt-4 text-gray-600">Traitement du paiement en cours...</p>
                  <p className="text-sm text-gray-500 mt-2">Veuillez patienter, cela peut prendre quelques secondes.</p>
                </div>
              )}

              <div className="mt-4 p-4 bg-orange-50 rounded-xl border border-orange-200">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-orange-800">Sécurisé par D17</p>
                    <p className="text-sm text-orange-700 mt-1">
                      {step === 'phone' && 'Un code de confirmation sera envoyé sur votre téléphone pour valider le paiement.'}
                      {step === 'otp' && 'Saisissez le code reçu pour finaliser votre paiement.'}
                      {step === 'processing' && 'Votre paiement est en cours de traitement sécurisé.'}
                    </p>
                  </div>
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
                  <span>D17 Mobile</span>
                </div>
              </div>
            </div>

            {step === 'phone' && (
              <button
                onClick={handleSendOtp}
                disabled={loading || !phoneNumber}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Envoi du code...
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-5 w-5" />
                    Recevoir le code de confirmation
                  </>
                )}
              </button>
            )}

            {step === 'otp' && (
              <button
                onClick={handleVerifyOtp}
                disabled={loading || otpCode.length !== 6}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Vérification...
                  </>
                ) : (
                  <>
                    <Smartphone className="h-5 w-5" />
                    Confirmer et payer
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Le code SMS confirme uniquement votre abonnement. Aucun retrait réel n'est effectué.</p>
          <p className="mt-1">Support: contact@souk.tn</p>
        </div>
      </div>
    </div>
  );
}