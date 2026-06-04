import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

export default function VerifyEmailPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!email && (location.state as any)?.email) {
      setEmail((location.state as any).email);
    }
  }, [location.state]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/verify-email', { email, code });
      toast.success('Email vérifié');
      navigate('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <h1 className="text-xl font-semibold mb-4">Vérifier l'email</h1>
          <p className="text-sm text-gray-600 mb-4">Entrez votre adresse email et le code reçu par email.</p>

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} required className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} required className="input-field" />
            </div>
            <button type="submit" disabled={loading} className="w-full btn-primary py-2.5">
              {loading ? 'Vérification...' : 'Vérifier'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
