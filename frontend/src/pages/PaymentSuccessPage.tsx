import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle, Loader } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useVerifyPayment } from '../hooks/usePayment';
import { useVerifySubscription } from '../hooks/useSubscriptions';
import { useAuthStore } from '../store/authStore';
import BackButton from '../components/UI/BackButton';
import toast from 'react-hot-toast';

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { refreshSubscription } = useAuthStore();
  const paymentId = searchParams.get('paymentId');
  const subscriptionId = searchParams.get('subscriptionId');
  const type = searchParams.get('type');
  const isSubscriptionType = type === 'subscription';

  const { mutate: verifyPayment, isPending: isPaymentPending } = useVerifyPayment();
  const { mutateAsync: verifySubscription } = useVerifySubscription();

  const [statusMessage, setStatusMessage] = useState('Vérification en cours...');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [planName, setPlanName] = useState<string | null>(null);
  const [nextPaymentDate, setNextPaymentDate] = useState<string | null>(null);
  const [expiryDate, setExpiryDate] = useState<string | null>(null);
  const retryCountRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);

  const checkSubscriptionStatus = async () => {
    if (!subscriptionId) {
      toast.error('Subscription ID manquant.');
      navigate('/seller/subscription');
      return;
    }

    try {
      const response: any = await verifySubscription(subscriptionId);
      const subscription = response.subscription;
      const status = subscription?.status;

      setSubscriptionStatus(status ?? null);
      setPlanName(subscription?.plan_name ?? null);
      setNextPaymentDate(subscription?.next_payment_date ?? null);
      setExpiryDate(subscription?.current_period_end ?? null);

      if (status === 'active') {
        setStatusMessage('✅ Subscription activated successfully');
        setSuccess(true);
        setPending(false);
        refreshSubscription();
        queryClient.invalidateQueries({ queryKey: ['seller-subscription'] });
        toast.success('Welcome! Your subscription is active 🚀');
      } else {
        retryCountRef.current += 1;
        setStatusMessage('⏳ Waiting for payment confirmation...');

        if (retryCountRef.current < 6) {
          timeoutRef.current = window.setTimeout(checkSubscriptionStatus, 5000);
        } else {
          setStatusMessage('En attente de confirmation du webhook. Veuillez actualiser ce page ou revenir dans quelques instants.');
          setPending(false);
        }
      }
    } catch (error) {
      console.error('Subscription verification error:', error);
      setStatusMessage('Erreur lors de la vérification de l abonnement. Réessayez plus tard.');
      setPending(false);
      toast.error('Impossible de vérifier l abonnement pour le moment.');
    }
  };

  useEffect(() => {
    if (!isSubscriptionType && !paymentId) {
      navigate('/');
      return;
    }

    if (isSubscriptionType) {
      setStatusMessage('Vérification de l abonnement en cours...');
      checkSubscriptionStatus();
      return () => {
        if (timeoutRef.current) {
          window.clearTimeout(timeoutRef.current);
        }
      };
    }

    verifyPayment(paymentId!, {
      onSuccess: () => {
        setSuccess(true);
        setPending(false);
        setStatusMessage('✅ Payment confirmed. Your order has been received.');
        toast.success('Payment confirmed 🎉');
      },
      onError: () => {
        setPending(false);
        setStatusMessage('❌ Payment failed. Please try again.');
        toast.error('Payment failed ❌');
      },
    });
  }, [verifyPayment, verifySubscription, isSubscriptionType, paymentId, subscriptionId, navigate]);

  const isLoading = isPaymentPending || pending;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-xl max-w-md w-full text-center">
          <Loader className="w-14 h-14 mx-auto mb-4 text-blue-600 animate-spin" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful</h1>
          <p className="text-gray-600">{statusMessage}</p>
        </div>
      </div>
    );
  }

  if (!success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-xl max-w-md w-full text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
            <span className="text-3xl">⏳</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Subscription Pending</h1>
          <p className="text-gray-600 mb-6">{statusMessage}</p>
          <div className="space-y-3">
            <button
              onClick={checkSubscriptionStatus}
              className="w-full rounded-2xl bg-orange-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-900"
            >
              Refresh Status
            </button>
            <Link
              to={isSubscriptionType ? '/seller/subscription' : '/'}
              className="inline-flex w-full items-center justify-center rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              {isSubscriptionType ? 'Back to Subscription' : 'Back Home'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const badgeColor =
    subscriptionStatus === 'active'
      ? 'text-green-600'
      : subscriptionStatus === 'pending'
      ? 'text-yellow-500'
      : 'text-red-500';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-xl max-w-lg w-full text-center">
        <BackButton to={isSubscriptionType ? '/seller' : '/'} className="mb-4" />

        <CheckCircle size={64} className="mx-auto mb-4 text-green-500" />
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          {isSubscriptionType ? '🎉 Your store is now active!' : 'Payment Successful'}
        </h1>
        <p className="text-gray-600 mb-6">
          {isSubscriptionType
            ? 'Your subscription is active and your seller features are unlocked.'
            : 'Your payment was successful and your order is confirmed.'}
        </p>

        <div className="space-y-4 rounded-3xl bg-slate-50 p-5 text-left">
          <p className={`font-semibold ${badgeColor}`}>Status: {subscriptionStatus?.toUpperCase() ?? 'UNKNOWN'}</p>
          {planName && <p>📦 Plan: {planName}</p>}
          {expiryDate && <p>📅 Expiry: {expiryDate}</p>}
          {nextPaymentDate && <p>🔁 Next renewal: {nextPaymentDate}</p>}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            to="/seller"
            className="inline-flex items-center justify-center rounded-2xl bg-orange-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-900"
          >
            Go to Dashboard
          </Link>
          <button
            onClick={checkSubscriptionStatus}
            className="inline-flex items-center justify-center rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Refresh Status
          </button>
        </div>
      </div>
    </div>
  );
}
