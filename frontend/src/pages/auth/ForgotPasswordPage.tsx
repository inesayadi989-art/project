import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/send-email-code', { email, purpose: 'reset' });
      toast.success('Code envoyé par email. Vérifiez votre boîte, puis définissez votre nouveau mot de passe.');
      navigate('/reset-password', { state: { email } });
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
          <h1 className="text-xl font-semibold mb-4">Mot de passe oublié</h1>
          <p className="text-sm text-gray-600 mb-4">
            Entrez votre email pour recevoir un code par email. Après réception, vous serez dirigé vers la page de réinitialisation.
          </p>

          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} required className="input-field" />
            </div>
            <button type="submit" disabled={loading} className="w-full btn-primary py-2.5">
              {loading ? 'Envoi...' : 'Envoyer le code'}
            </button>
          </form>

          <p className="text-sm text-gray-500 mt-4">
            Une fois le code reçu, vous pourrez le saisir avec votre nouveau mot de passe sur la page de réinitialisation.
          </p>
        </div>
      </div>
    </div>
  );
}
