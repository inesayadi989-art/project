import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import AdminLayout from './AdminLayout';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { formatPrice } from '../../lib/types';
import { DEFAULT_PRODUCT_IMAGE } from '../../components/UI/ProductCard';
import type { Product } from '../../lib/types';
import toast from 'react-hot-toast';

interface AdminProduct extends Product {
  store_name?: string;
  category_name?: string;
  primary_image?: string;
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const UPLOADS_URL = import.meta.env.VITE_UPLOADS_URL || 'http://localhost:5000';

function getProductImageUrl(imageUrl?: string | null) {
  if (!imageUrl) return DEFAULT_PRODUCT_IMAGE;
  if (imageUrl.startsWith('http')) return imageUrl;
  return `${UPLOADS_URL}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
}

function useAllProducts(statusFilter: StatusFilter) {
  return useQuery({
    queryKey: ['admin-products', statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statusFilter === 'pending') {
        params.approved = 'false';
      } else if (statusFilter === 'approved') {
        params.approved = 'true';
      }
      const queryString = new URLSearchParams(params).toString();
      const response = await api.getAdminProducts(queryString ? { approved: params.approved } : {});
      return response.products as AdminProduct[];
    },
  });
}

export default function AdminProducts() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const queryClient = useQueryClient();
  const { data: products, isLoading } = useAllProducts(statusFilter);

  const approveMutation = useMutation({
    mutationFn: async ({ productId, approve }: { productId: string; approve: boolean }) => {
      return api.approveProduct(productId, approve);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
  });


  const filterButtons: { key: StatusFilter; label: string }[] = [
    { key: 'pending', label: 'En attente' },
    { key: 'approved', label: 'Approuvés' },
    { key: 'all', label: 'Tous' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des produits</h1>

        <div className="flex gap-2 flex-wrap">
          {filterButtons.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === key
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : !products || products.length === 0 ? (
          <div className="card p-12 text-center text-gray-400">
            <p>Aucun produit trouvé</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Produit</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Boutique</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Prix</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Statut</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {products.map((product) => {
                    const imageUrl = getProductImageUrl(product.primary_image);
                    return (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={imageUrl}
                              alt={product.name}
                              className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
                              onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE; }}
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-900 line-clamp-1">{product.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {product.store_name ?? product.store?.name ?? 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {formatPrice(product.price)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            product.is_approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {product.is_approved ? 'Approuvé' : 'En attente'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            {!product.is_approved ? (
                              <button
                                onClick={() => {
                                  approveMutation.mutate({ productId: product.id, approve: true });
                                  toast.success('Produit approuvé');
                                }}
                                className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium"
                              >
                                <Check size={14} /> Approuver
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  approveMutation.mutate({ productId: product.id, approve: false });
                                  toast.success('Produit rejeté');
                                }}
                                className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium"
                              >
                                <X size={14} /> Rejeter
                              </button>
                            )}
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
    </AdminLayout>
  );
}
