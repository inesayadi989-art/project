import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import AdminLayout from './AdminLayout';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { formatPrice } from '../../lib/types';
import { DEFAULT_PRODUCT_IMAGE } from '../../components/UI/ProductCard';
import type { Product } from '../../lib/types';

interface AdminProduct extends Product {
  store_name?: string;
  category_name?: string;
  primary_image?: string;
}

const UPLOADS_URL = import.meta.env.VITE_UPLOADS_URL || 'http://localhost:5000';

function getProductImageUrl(imageUrl?: string | null) {
  if (!imageUrl) return DEFAULT_PRODUCT_IMAGE;
  if (imageUrl.startsWith('http')) return imageUrl;
  return `${UPLOADS_URL}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
}

export default function AdminProducts() {
  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const response = await api.getAdminProducts({});
      return response.products as AdminProduct[];
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Consulter produits</h1>

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
