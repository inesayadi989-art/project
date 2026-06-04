import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, ShoppingCart, Store, Eye, EyeOff, Check } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

type Role = 'customer' | 'seller';

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<Role>('customer');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('+216');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { signUp } = useAuthStore();

  const handleRoleSelect = (r: Role) => {
    setRole(r);
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (!acceptTerms) {
      setError('Veuillez accepter les conditions d\'utilisation');
      return;
    }
    setLoading(true);
    try {
      const response = await signUp(email, password, fullName, role);
      toast.success('Compte créé avec succès ! Vérifiez votre email.');
      // If server didn't return a token, redirect to verification page
      if (!response?.token) {
        navigate('/verify-email', { state: { email } });
      } else {
        navigate('/');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la création du compte';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
                <ShoppingBag size={20} className="text-white" />
              </div>
              <span className="font-bold text-2xl text-gray-900">Souk.tn</span>
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">Créer un compte</h1>
            <p className="text-sm text-gray-500 mt-1">
              {step === 1 ? 'Choisissez votre type de compte' : 'Remplissez vos informations'}
            </p>
          </div>

          {step === 1 && (
            <div className="space-y-3">
              <button
                onClick={() => handleRoleSelect('customer')}
                className="w-full p-4 border-2 border-gray-200 hover:border-primary-500 rounded-xl flex items-start gap-4 transition-all group"
              >
                <div className="w-12 h-12 bg-primary-50 group-hover:bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors">
                  <ShoppingCart size={22} className="text-primary-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">Acheteur</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Achetez des produits de vendeurs tunisiens
                  </p>
                </div>
              </button>
              <button
                onClick={() => handleRoleSelect('seller')}
                className="w-full p-4 border-2 border-gray-200 hover:border-primary-500 rounded-xl flex items-start gap-4 transition-all group"
              >
                <div className="w-12 h-12 bg-green-50 group-hover:bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors">
                  <Store size={22} className="text-green-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">Vendeur</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Ouvrez votre boutique et vendez vos produits
                  </p>
                </div>
              </button>
            </div>
          )}

          {step === 2 && (
            <>
              <div className="mb-4 p-3 bg-primary-50 border border-primary-100 rounded-lg flex items-center gap-2 text-sm text-primary-700">
                {role === 'seller' ? <Store size={16} /> : <ShoppingCart size={16} />}
                Compte {role === 'seller' ? 'vendeur' : 'acheteur'}
                <button
                  onClick={() => setStep(1)}
                  className="ml-auto text-primary-500 hover:text-primary-700 underline text-xs"
                >
                  Modifier
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="Mohamed Ben Ali"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="votre@email.com"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+216 XX XXX XXX"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="Min. 6 caractères"
                      className="input-field pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmer le mot de passe
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Répétez le mot de passe"
                    className="input-field"
                  />
                </div>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={() => setAcceptTerms(!acceptTerms)}
                    className="sr-only"
                  />
                  <div
                    className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      acceptTerms ? 'bg-primary-600 border-primary-600' : 'border-gray-300'
                    }`}
                  >
                    {acceptTerms && <Check size={10} className="text-white" />}
                  </div>
                  <span className="text-sm text-gray-600">
                    J'accepte les{' '}
                    <a href="#" className="text-primary-600 hover:underline">
                      conditions d'utilisation
                    </a>{' '}
                    et la{' '}
                    <a href="#" className="text-primary-600 hover:underline">
                      politique de confidentialité
                    </a>
                  </span>
                </label>
                <button type="submit" disabled={loading} className="w-full btn-primary py-2.5">
                  {loading ? 'Création en cours...' : 'Créer mon compte'}
                </button>
              </form>
            </>
          )}

          <p className="text-sm text-center text-gray-500 mt-6">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
