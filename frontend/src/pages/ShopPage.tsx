import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { useProducts, useCategories } from '../hooks/useProducts';
import ProductCard from '../components/UI/ProductCard';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import BackButton from '../components/UI/BackButton';

const PAGE_SIZE = 20;

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const categoryId = searchParams.get('category') ?? undefined;
  const search = searchParams.get('search') ?? undefined;
  const minPrice = searchParams.get('minPrice') !== null ? Number(searchParams.get('minPrice')) : undefined;
  const maxPrice = searchParams.get('maxPrice') !== null ? Number(searchParams.get('maxPrice')) : undefined;
  const sortBy = searchParams.get('sort') ?? 'newest';
  const page = Number(searchParams.get('page') ?? 1);

  const [localMinPrice, setLocalMinPrice] = useState(minPrice?.toString() ?? '');
  const [localMaxPrice, setLocalMaxPrice] = useState(maxPrice?.toString() ?? '');

  const { data: categories } = useCategories();
  const { data, isLoading } = useProducts({
    categoryId,
    search,
    minPrice,
    maxPrice,
    sortBy,
    page,
    pageSize: PAGE_SIZE,
  });

  const fetchedProducts = data?.products ?? [];
  const products = fetchedProducts.filter((product) => {
    const price = Number(product.price);
    if (!Number.isFinite(price)) return true;
    if (minPrice !== undefined && price < minPrice) return false;
    if (maxPrice !== undefined && price > maxPrice) return false;
    return true;
  });

  const totalCount = products.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const updateParam = (key: string, value: string | undefined) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page');
    setSearchParams(params);
  };

  const handlePriceFilter = () => {
    const params = new URLSearchParams(searchParams);
    if (localMinPrice) params.set('minPrice', localMinPrice);
    else params.delete('minPrice');
    if (localMaxPrice) params.set('maxPrice', localMaxPrice);
    else params.delete('maxPrice');
    params.delete('page');
    setSearchParams(params);
  };

  const handleClearFilters = () => {
    setSearchParams({});
    setLocalMinPrice('');
    setLocalMaxPrice('');
  };

  useEffect(() => {
    setLocalMinPrice(minPrice?.toString() ?? '');
    setLocalMaxPrice(maxPrice?.toString() ?? '');
  }, [minPrice, maxPrice]);

  const FiltersContent = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Catégories</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="category"
              checked={!categoryId}
              onChange={() => updateParam('category', undefined)}
              className="text-primary-600"
            />
            <span className="text-sm text-gray-700">Toutes les catégories</span>
          </label>
          {(categories ?? []).map((cat) => (
            <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="category"
                checked={categoryId === cat.slug}
                onChange={() => updateParam('category', cat.slug)}
                className="text-primary-600"
              />
              <span className="text-sm text-gray-700">{cat.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <h3 className="font-semibold text-gray-900 mb-3">Prix (TND)</h3>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            value={localMinPrice}
            onChange={(e) => setLocalMinPrice(e.target.value)}
            placeholder="Min"
            className="input-field w-24 text-xs"
          />
          <span className="text-gray-400">—</span>
          <input
            type="number"
            value={localMaxPrice}
            onChange={(e) => setLocalMaxPrice(e.target.value)}
            placeholder="Max"
            className="input-field w-24 text-xs"
          />
        </div>
        <button type="button" onClick={handlePriceFilter} className="mt-2 btn-secondary text-xs w-full">
          Appliquer
        </button>
      </div>

      <button onClick={handleClearFilters} className="w-full btn-secondary text-xs">
        Effacer les filtres
      </button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <BackButton to="/" />

      {search && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-gray-500">Résultats pour :</span>
          <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
            {search}
            <button onClick={() => updateParam('search', undefined)}>
              <X size={14} />
            </button>
          </span>
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar - Desktop */}
        <aside className="hidden md:block w-56 flex-shrink-0">
          <div className="card p-4 sticky top-24">
            <FiltersContent />
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4 gap-3">
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-900">{totalCount}</span> produit{totalCount !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFiltersOpen(true)}
                className="md:hidden btn-secondary text-xs"
              >
                <SlidersHorizontal size={14} /> Filtres
              </button>
              <select
                value={sortBy}
                onChange={(e) => updateParam('sort', e.target.value)}
                className="input-field text-xs w-auto"
              >
                <option value="newest">Plus récents</option>
                <option value="price_asc">Prix croissant</option>
                <option value="price_desc">Prix décroissant</option>
                <option value="popular">Plus vendus</option>
                <option value="rating">Mieux notés</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size="lg" message="Chargement des produits..." />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <SlidersHorizontal size={48} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium text-gray-600">Aucun produit trouvé</p>
              <p className="text-sm mt-1">Essayez de modifier vos filtres</p>
              <button onClick={handleClearFilters} className="mt-4 btn-primary">
                Effacer les filtres
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => updateParam('page', String(page - 1))}
                    disabled={page <= 1}
                    className="btn-secondary p-2 disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => updateParam('page', String(pageNum))}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          page === pageNum
                            ? 'bg-primary-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => updateParam('page', String(page + 1))}
                    disabled={page >= totalPages}
                    className="btn-secondary p-2 disabled:opacity-40"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {filtersOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setFiltersOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Filtres</h2>
              <button onClick={() => setFiltersOpen(false)}>
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <FiltersContent />
          </div>
        </div>
      )}
    </div>
  );
}
