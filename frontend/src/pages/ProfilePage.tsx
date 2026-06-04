import { useState, useEffect } from 'react';
import { User, Shield, Save, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { TUNISIAN_GOVERNORATES } from '../lib/types';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

type Tab = 'info' | 'security';

export default function ProfilePage() {
  const { profile, updateProfile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+216');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [governorate, setGovernorate] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setPhone(profile.phone ?? '+216');
      setAddressLine1(profile.address_line1 ?? '');
      setCity(profile.city ?? '');
      setGovernorate(profile.governorate ?? '');
      setPostalCode(profile.postal_code ?? '');
    }
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile({
        fullName,
        phone,
        addressLine1,
        city,
        governorate,
        postalCode,
      });
      toast.success('Profil mis à jour avec succès');
    } catch {
      toast.error('Erreur lors de la mise à jour du profil');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    setPwLoading(true);
    try {
      await api.updatePassword(currentPassword, newPassword);
      toast.success('Mot de passe mis à jour avec succès');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du changement de mot de passe');
    } finally {
      setPwLoading(false);
    }
  };

  const initials = profile?.full_name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) ?? 'U';

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mon profil</h1>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-primary-600 to-primary-700 text-white">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold text-white">
            {initials}
          </div>
          <div>
           <h2 className="text-xl font-bold text-white">{profile?.full_name ?? 'Utilisateur'}</h2>
       <p className="text-white/75 text-sm">{profile?.email}</p>
       <span className="inline-block mt-1 text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
              {profile?.role === 'seller' ? 'Vendeur' : profile?.role === 'admin' ? 'Admin' : 'Acheteur'}
            </span>
          </div>
        </div>

        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              activeTab === 'info' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <User size={16} /> Informations
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              activeTab === 'security' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Shield size={16} /> Sécurité
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'info' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={profile?.email ?? ''} readOnly className="input-field bg-gray-50 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" placeholder="+216 XX XXX XXX" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <input type="text" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} className="input-field" placeholder="Rue, numéro..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="input-field" placeholder="Tunis" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gouvernorat</label>
                  <select value={governorate} onChange={(e) => setGovernorate(e.target.value)} className="input-field">
                    <option value="">Sélectionner...</option>
                    {TUNISIAN_GOVERNORATES.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code postal</label>
                <input type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className="input-field" placeholder="1000" />
              </div>
              <button type="submit" disabled={loading} className="w-full btn-primary py-2.5">
                <Save size={16} />
                {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </form>
          )}

          {activeTab === 'security' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700 mb-4">
                Choisissez un mot de passe fort avec au moins 6 caractères.
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe actuel</label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="input-field pr-10"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="input-field pr-10"
                    placeholder="Min. 6 caractères"
                  />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le nouveau mot de passe</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="input-field"
                  placeholder="Répétez le nouveau mot de passe"
                />
              </div>
              <button type="submit" disabled={pwLoading} className="w-full btn-primary py-2.5">
                <Shield size={16} />
                {pwLoading ? 'Mise à jour...' : 'Changer le mot de passe'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
