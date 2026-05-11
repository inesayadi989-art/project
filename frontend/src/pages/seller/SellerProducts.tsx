import { useState } from 'react';
import { Plus, CreditCard as Edit, Trash2, Eye, EyeOff, Package } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useSellerStore, useSellerProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from '../../hooks/useProducts';
import { useCategories } from '../../hooks/useProducts';
import SellerLayout from './SellerLayout';
import Modal from '../../components/UI/Modal';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import BackButton from '../../components/UI/BackButton';
import { formatPrice } from '../../lib/types';
import { DEFAULT_PRODUCT_IMAGE } from '../../components/UI/ProductCard';
import toast from 'react-hot-toast';
import type { Product } from '../../lib/types';

interface ProductForm {
  name: string;
  description: string;
  categoryId: string;
  price: string;
  comparePrice: string;
  stockQty: string;
  tags: string;
  imageFiles: File[];
  isFeatured: boolean;
}

const emptyForm: ProductForm = {
  name: '',
  description: '',
  categoryId: '',
  price: '',
  comparePrice: '',
  stockQty: '',
  tags: '',
  imageFiles: [],
  isFeatured: false,
};

export default function SellerProducts() {
  const { user } = useAuthStore();
  const { data: store } = useSellerStore(user?.id ?? '');
  const { data: products, isLoading } = useSellerProducts(store?.slug ?? '');
  const { data: categories } = useCategories();

  const { mutateAsync: createProduct } = useCreateProduct();
  const { mutateAsync: updateProduct } = useUpdateProduct();
  const { mutateAsync: deleteProduct } = useDeleteProduct();

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const openAdd = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description ?? '',
      categoryId: product.category_id,
      price: product.price.toString(),
      comparePrice: product.compare_price?.toString() ?? '',
      stockQty: product.stock_qty.toString(),
      tags: product.tags?.join(', ') ?? '',
      imageFiles: [],
      isFeatured: product.is_featured,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!store || !form.name || !form.price || !form.stockQty || !form.categoryId) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    setSaving(true);
    try {
      const tags = form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const slug =
        form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') +
        '-' +
        Date.now();

      if (editingProduct) {
        await updateProduct({
          id: editingProduct.id,
          name: form.name,
          slug,
          description: form.description,
          categoryId: form.categoryId,
          price: parseFloat(form.price),
          compare_price: form.comparePrice ? parseFloat(form.comparePrice) : null,
          stock_qty: parseInt(form.stockQty),
          tags,
          is_featured: form.isFeatured,
          images: form.imageFiles,
        });
        toast.success('Produit mis à jour');
      } else {
        await createProduct({
          storeId: store.id,
          categoryId: form.categoryId,
          name: form.name,
          slug,
          description: form.description,
          price: parseFloat(form.price),
          compare_price: form.comparePrice ? parseFloat(form.comparePrice) : null,
          stock_qty: parseInt(form.stockQty),
          tags,
          is_featured: form.isFeatured,
          images: form.imageFiles,
        });
        toast.success('Produit créé avec succès');
      }
      setModalOpen(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde';
      toast.error(errorMessage);
      console.error('Save product error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (product: Product) => {
    toast.error('Publication/masquage non disponible pour le moment');
    // Toggle publish functionality not implemented yet
    // try {
    //   await updateProduct({ id: product.id, is_published: !product.is_published });
    //   toast.success(product.is_published ? 'Produit masqué' : 'Produit publié');
    // } catch {
    //   toast.error('Erreur lors de la modification');
    // }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingProductId) return;
    setDeleting(true);
    try {
      await deleteProduct(deletingProductId);
      toast.success('Produit supprimé');
      setDeleteModalOpen(false);
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  const getStockBadge = (qty: number) => {
    if (qty === 0) return <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">Rupture</span>;
    if (qty <= 5) return <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700">{qty} restants</span>;
    return <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">En stock ({qty})</span>;
  };

  return (
    <SellerLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <BackButton className="mb-2" />
            <h1 className="text-2xl font-bold text-gray-900">Mes produits</h1>
          </div>
          <button onClick={openAdd} className="btn-primary">
            <Plus size={16} /> Ajouter un produit
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
        ) : !products || products.length === 0 ? (
          <div className="card p-12 text-center">
            <Package size={48} className="mx-auto mb-4 text-gray-200" />
            <p className="text-gray-600 font-medium">Aucun produit</p>
            <p className="text-gray-400 text-sm mt-1">Ajoutez votre premier produit</p>
            <button onClick={openAdd} className="mt-4 btn-primary">
              <Plus size={16} /> Ajouter un produit
            </button>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Produit</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Prix</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Stock</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {products.map((product) => {
                    const primaryImg = product.product_images?.find((i) => i.is_primary) ?? product.product_images?.[0];
                    return (
                      <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={primaryImg?.url ?? DEFAULT_PRODUCT_IMAGE}
                              alt={product.name}
                              className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
                              onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE; }}
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-900 line-clamp-1">{product.name}</p>
                              <p className="text-xs text-gray-400">{product.sold_count} vendus</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {formatPrice(product.price)}
                        </td>
                        <td className="px-4 py-3">{getStockBadge(product.stock_qty)}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => openEdit(product)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => { setDeletingProductId(product.id); setDeleteModalOpen(true); }}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProduct ? 'Modifier le produit' : 'Ajouter un produit'}
        size="xl"
      >
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom du produit *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="Nom du produit" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field resize-none" rows={3} placeholder="Description détaillée du produit" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie *</label>
            <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="input-field">
              <option value="">Sélectionner une catégorie</option>
              {(categories ?? []).map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prix (TND) *</label>
              <input type="number" step="0.001" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input-field" placeholder="0.000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prix barré (TND)</label>
              <input type="number" step="0.001" min="0" value={form.comparePrice} onChange={(e) => setForm({ ...form, comparePrice: e.target.value })} className="input-field" placeholder="0.000" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock *</label>
            <input type="number" min="0" value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: e.target.value })} className="input-field" placeholder="Quantité disponible" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags (séparés par des virgules)</label>
            <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="input-field" placeholder="tunisien, artisanat, fait main" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Images du produit</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setForm({ ...form, imageFiles: Array.from(e.target.files ?? []) })}
              className="input-field"
            />
            <p className="text-xs text-gray-500 mt-1">Choisissez un ou plusieurs fichiers image. Laisser vide pour conserver les images existantes.</p>
            {form.imageFiles.length > 0 && (
              <p className="text-xs text-gray-500 mt-2">Fichiers sélectionnés: {form.imageFiles.map((file) => file.name).join(', ')}</p>
            )}
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} className="rounded" />
            <span className="text-sm text-gray-700">Marquer comme produit vedette</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="flex-1 btn-secondary">Annuler</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 btn-primary">
              {saving ? 'Enregistrement...' : editingProduct ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Confirmer la suppression" size="sm">
        <div className="p-6">
          <p className="text-gray-600 mb-6">Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteModalOpen(false)} className="flex-1 btn-secondary">Annuler</button>
            <button onClick={handleDeleteConfirm} disabled={deleting} className="flex-1 btn-danger">
              {deleting ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
        </div>
      </Modal>
    </SellerLayout>
  );
}
