import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

export default function PaymentFailurePage() {
  const [searchParams] = useSearchParams();
  const errorMessage = searchParams.get('errorMessage') || 'Le paiement a échoué. Veuillez réessayer.';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="card p-8 text-center max-w-md">
        <AlertTriangle size={52} className="mx-auto mb-4 text-red-500" />
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Paiement échoué</h1>
        <p className="text-gray-600 mb-6">{errorMessage}</p>
        <div className="flex gap-3">
          <Link to="/checkout" className="flex-1 btn-primary justify-center">
            Réessayer le paiement
          </Link>
          <Link to="/" className="flex-1 btn-secondary justify-center">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
