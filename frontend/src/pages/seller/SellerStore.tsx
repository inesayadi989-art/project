import { useState, useEffect } from 'react';
import { Store, Save, Clock, CircleCheck as CheckCircle, CircleAlert as AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useSellerStore } from '../../hooks/useProducts';
import SellerLayout from './SellerLayout';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { TUNISIAN_GOVERNORATES } from '../../lib/types';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export default function SellerStore() {
  const { user } = useAuthStore();
  const { data: store, isLoading } = useSellerStore(user?.id ?? '');
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [governorate, setGovernorate] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (store) {
      setName(store.name ?? '');
      setDescription(store.description ?? '');
      setLogoUrl(store.logo_url ?? '');
      setBannerUrl(store.banner_url ?? '');
      setPhone(store.phone ?? '');
      setEmail(store.email ?? '');
      setGovernorate(store.governorate ?? '');
      setAddress(store.address ?? '');
    }
  }, [store]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.error('Mise à jour de la boutique non disponible pour le moment');
    // Store update functionality not implemented yet
    // if (!store) return;
    // setSaving(true);
    // try {
    //   // await api.updateStore(store.id, { name, description, ... });
    //   queryClient.invalidateQueries({ queryKey: ['seller-store'] });
    //   toast.success('Boutique mise à jour avec succès');
    // } catch (error) {
    //   toast.error('Erreur lors de la mise à jour');
    // } finally {
    //   setSaving(false);
    // }
  };

  if (isLoading) {
    return (
      <SellerLayout>
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      </SellerLayout>
    );
  }

  if (!store) {
    return (
      <SellerLayout>
        <div className="card p-12 text-center">
          <Clock size={48} className="mx-auto mb-4 text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-700">Boutique en cours de création</h2>
          <p className="text-gray-500 text-sm mt-2">Votre boutique est en cours de création. Veuillez patienter quelques instants.</p>
        </div>
      </SellerLayout>
    );
  }

  return (
    <SellerLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Ma Boutique</h1>
          <div className="flex items-center gap-2">
            {store.is_approved ? (
              <span className="flex items-center gap-1.5 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-full">
                <CheckCircle size={14} /> Approuvée
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-sm text-yellow-700 bg-yellow-50 px-3 py-1.5 rounded-full">
                <AlertCircle size={14} /> En attente d'approbation
              </span>
            )}
          </div>
        </div>

        {bannerUrl && (
          <div className="card overflow-hidden">
            <img src={bannerUrl} alt="Bannière" className="w-full h-40 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
        )}

        <div className="card p-6">
          {logoUrl && (
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
              <img
                src={logoUrl}
                alt="Logo"
                className="w-20 h-20 object-cover rounded-xl"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <div>
                <h2 className="text-xl font-bold text-gray-900">{store.name}</h2>
                <p className="text-gray-500 text-sm">{store.description}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la boutique *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="input-field" placeholder="Ma Super Boutique" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field resize-none" rows={3} placeholder="Décrivez votre boutique..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL du logo</label>
              <input type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className="input-field" placeholder="https://example.com/logo.jpg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL de la bannière</label>
              <input type="url" value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} className="input-field" placeholder="https://example.com/banner.jpg" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" placeholder="+216 XX XXX XXX" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="boutique@example.com" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gouvernorat</label>
                <select value={governorate} onChange={(e) => setGovernorate(e.target.value)} className="input-field">
                  <option value="">Sélectionner...</option>
                  {TUNISIAN_GOVERNORATES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="input-field" placeholder="Rue, quartier..." />
              </div>
            </div>
            <div className="pt-2 border-t border-gray-100 text-sm text-gray-500">
              <p>Commission plateforme: <span className="font-semibold text-gray-900">{store.commission_rate}%</span></p>
            </div>
            <button type="submit" disabled={saving} className="w-full btn-primary py-2.5">
              <Save size={16} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </form>
        </div>
      </div>
    </SellerLayout>
  );
}
