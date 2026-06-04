import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Save, Clock, CircleCheck as CheckCircle, CircleAlert as AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useSellerStore, useUpdateStore, useCreateStore } from '../../hooks/useProducts';
// SellerLayout is provided by the route wrapper in App.tsx — do not double-wrap
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';

export default function SellerStore() {
  const { user } = useAuthStore();
  const location = useLocation();
  const isCreatePath = location.pathname === '/seller/store/create';
  const { data: store, isLoading } = useSellerStore(user?.id ?? '');
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const updateStore = useUpdateStore();
  const createStore = useCreateStore();

  useEffect(() => {
    if (store) {
      setName(store.name ?? '');
      setDescription(store.description ?? '');
      setLogoUrl(store.logo_url ?? '');
      setLogoFile(null);
      setLogoPreview('');
    }
  }, [store]);

  useEffect(() => {
    return () => {
      if (logoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      toast.error('Impossible de sauvegarder la boutique sans utilisateur connecté.');
      return;
    }

    if (!name.trim()) {
      toast.error('Le nom de la boutique est requis.');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('description', description.trim());
      if (logoFile) {
        formData.append('logo', logoFile);
      }

      if (store) {
        await updateStore.mutateAsync({
          sellerId: user.id,
          updates: formData,
        });
        toast.success('Boutique mise à jour avec succès');
      } else {
        await createStore.mutateAsync({
          sellerId: user.id,
          name: name.trim(),
          description: description.trim(),
          logo: logoFile || undefined,
        });
        toast.success('Boutique créée avec succès');
      }
    } catch (error: any) {
      console.error('Save store error:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Erreur lors de la sauvegarde de la boutique';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
    );
  }

  const isCreateMode = isCreatePath || !store;

  if (!store) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Créer boutique</h1>
          <p className="text-gray-500 text-sm mt-1">Aucune boutique n’est encore disponible pour ce vendeur. Complétez les informations ci-dessous pour créer une boutique.</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la boutique *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="input-field"
                placeholder="Nom de votre boutique"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field resize-none"
                rows={4}
                placeholder="Décrivez votre boutique..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo de la boutique</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setLogoFile(file);
                  setLogoPreview(file ? URL.createObjectURL(file) : '');
                }}
                className="input-field"
              />
            </div>
            {logoPreview && (
              <div className="rounded-2xl overflow-hidden border border-gray-200">
                <img src={logoPreview} alt="Aperçu du logo" className="w-full h-44 object-cover" />
              </div>
            )}
            <div className="pt-4 border-t border-gray-100 text-sm text-gray-500">
              <p>Votre boutique sera créée avec un statut en attente d’approbation. L’administrateur devra valider votre boutique pour qu’elle apparaisse publiquement.</p>
            </div>
            <button type="submit" disabled={saving} className="w-full btn-primary py-2.5">
              {saving ? 'Création en cours...' : 'Créer boutique'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="flex items-start justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{isCreateMode ? 'Créer boutique' : 'Modifier boutique'}</h1>
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

        <div className="card p-6">
          {(logoPreview || logoUrl) && (
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
              <img
                src={logoPreview || logoUrl}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Uploader du logo</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setLogoFile(file);
                  if (file) {
                    setLogoPreview(URL.createObjectURL(file));
                  } else {
                    setLogoPreview('');
                  }
                }}
                className="input-field"
              />
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
  );
}
