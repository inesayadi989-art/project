import { useState } from 'react';
import { Search, MessageSquare, Sparkles, ArrowRight } from 'lucide-react';
import { api } from '../../lib/api';
import type { Product } from '../../lib/types';
import ProductCard from './ProductCard';
import LoadingSpinner from './LoadingSpinner';

const EXAMPLE_QUERIES = [
  'هدية 120د',
  'deco salon pas cher',
  'portable travail à domicile',
  'قهوة تونسية للاهداء',
];

export default function AIShoppingAssistant() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: 'Je suis votre assistante shopping locale. Posez-moi une question en tunisien ou en français : budget, usage, cadeau, maison, travail.',
    },
  ]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const handleAssistantQuery = async (text: string) => {
    if (!text.trim()) return;

    const userText = text.trim();
    setMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setQuery('');
    setLoading(true);

    try {
      const { products: responseProducts, message } = await api.getAssistantProducts(userText);
      const normalizedProducts = (responseProducts ?? []).map((product: any) => ({
        ...product,
        product_images: (product.images ?? []).map((url: string, index: number) => ({
          id: `assistant-${product.id}-${index}`,
          product_id: product.id,
          url,
          alt_text: null,
          display_order: index,
          is_primary: index === 0,
        })),
      })) as Product[];

      setProducts(normalizedProducts);
      setMessages((prev) => [...prev, { role: 'assistant', text: message || 'Voici des produits recommandés pour vous.' }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Désolé, je n’ai pas pu trouver de produits. Réessayez avec une autre demande.' }]);
      console.error('Assistant error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await handleAssistantQuery(query);
  };

  return (
    <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 md:p-8">
        <div className="flex flex-col gap-4 mb-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-100 to-primary-200 text-primary-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] shadow-sm">
            <Sparkles size={14} /> Assistant chat
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Chat avec l’assistant</h2>
            <p className="mt-2 text-sm text-gray-600 max-w-2xl">
              Discutez comme dans un chatbot. Je comprends le français, l’anglais, l’arabe et le tounsi pour vous proposer des produits locaux.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-gray-50 overflow-hidden shadow-sm">
          <div className="h-[420px] overflow-y-auto px-4 py-5 space-y-3">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] rounded-3xl p-4 shadow-sm ${message.role === 'assistant' ? 'bg-white border border-gray-200 text-gray-700' : 'bg-primary-600 text-white'}`}>
                  <div className="text-[11px] uppercase tracking-[0.25em] mb-2 text-gray-400">
                    {message.role === 'assistant' ? 'Assistant' : 'Vous'}
                  </div>
                  <div className="text-sm leading-6">{message.text}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 bg-white p-4">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Écrivez un message, par ex. cadeau 120d, déco salon, portable"
                  className="w-full pl-11 pr-4 py-3 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-200 text-sm"
                />
              </div>
              <button
                type="submit"
                className="btn-primary w-full sm:w-auto px-6 py-3 rounded-full"
                disabled={loading}
              >
                {loading ? 'Envoi...' : 'Envoyer'}
              </button>
            </form>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
              {EXAMPLE_QUERIES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => handleAssistantQuery(example)}
                  className="rounded-full border border-gray-200 px-3 py-1 hover:border-primary-300 hover:text-primary-700 transition"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading && (
          <div className="py-10">
            <LoadingSpinner size="lg" message="Recherche des produits..." />
          </div>
        )}

        {products.length > 0 && (
          <div>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Suggestions</p>
                <h3 className="text-xl font-semibold text-gray-900">Produits recommandés</h3>
              </div>
              <a href="/shop" className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm">
                Voir tous <ArrowRight size={16} />
              </a>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {products.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
