import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, X, Star, TrendingDown, Crown, ThumbsUp } from 'lucide-react';
import { useSmartAssistant } from '../../hooks/useSmartAssistant';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

// TypeScript interfaces
interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  rating: number;
  stock: number;
  description?: string;
  store_name?: string;
  rating_avg?: number;
  review_count?: number;
  score?: number;
  price_match?: number;
}

interface Recommendations {
  bestForYou?: Product[];
  cheaperOption?: Product[];
  premiumOption?: Product[];
  alternatives?: Product[];
}

interface Metadata {
  budget?: number;
  intent?: string;
  priceRange?: string;
  totalMatches?: number;
}

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  products?: Product[] | null;
  recommendations?: Recommendations;
  metadata?: Metadata;
}

interface CategoryBadgeProps {
  category: string;
}

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  products: Product[] | null;
  recommendations?: Recommendations;
  metadata?: Metadata;
  timestamp: Date;
}

interface ExpandedCategories {
  top: boolean;
  alternatives: boolean;
  bestForYou: boolean;
  cheaperOption: boolean;
  premiumOption: boolean;
}

interface ProductCardSmallProps {
  product: Product;
  category: string;
}

// Product category badge
const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category }) => {
  const badges = {
    bestForYou: { icon: ThumbsUp, text: '✨ Best Match', color: 'bg-green-100 text-green-700' },
    cheaperOption: { icon: TrendingDown, text: '💰 Budget friendly', color: 'bg-blue-100 text-blue-700' },
    premiumOption: { icon: Crown, text: '👑 Premium', color: 'bg-purple-100 text-purple-700' },
    topRanked: { icon: Star, text: '🔥 Best Match', color: 'bg-orange-100 text-orange-700' },
    alternative: { icon: Star, text: '⭐ Alternative', color: 'bg-gray-100 text-gray-700' }
  };
  
  const badge = badges[category as keyof typeof badges] || badges.topRanked;
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${badge.color}`}>
      {badge.text}
    </span>
  );
};

const preprocessInput = (text: string) => {
  return text
    .replace(/\btel\b/gi, 'téléphone')
    .replace(/\bpc\b/gi, 'laptop')
    .replace(/\bportable\b/gi, 'téléphone portable')
    .replace(/\bb(\d{2,4})\b/gi, 'sous $1')
    .trim();
};

const buildRecommendations = (products: Product[] = [], budget?: number) => {
  if (!products.length) {
    return {} as Recommendations;
  }

  const normalizedProducts = products.map(product => ({
    ...product,
    ratingValue: product.rating ?? product.rating_avg ?? 0,
    scoreValue: typeof product.score === 'number' ? product.score : 1
  }));

  const sorted = [...normalizedProducts].sort((a, b) => {
    if (a.scoreValue !== b.scoreValue) {
      return a.scoreValue - b.scoreValue;
    }
    return (b.ratingValue || 0) - (a.ratingValue || 0);
  });

  const bestForYou = sorted.slice(0, 1);
  const alternatives = sorted.slice(1, 4);
  const cheaperOption = budget
    ? sorted.filter(product => product.price <= budget && !bestForYou.some(p => p.id === product.id)).slice(0, 3)
    : [];

  const maxPrice = Math.max(...sorted.map(product => product.price || 0));
  const premiumOption = sorted
    .filter(product => product.price >= maxPrice * 0.65 || product.ratingValue >= 4.5)
    .slice(0, 3);

  return {
    bestForYou,
    alternatives,
    cheaperOption,
    premiumOption
  };
};

// Chat message component
const ChatMessage: React.FC<ChatMessageProps> = ({ message, isUser, products, recommendations, metadata }) => {
  const [expandedCategories, setExpandedCategories] = useState<ExpandedCategories>({
    top: true,
    alternatives: false,
    bestForYou: false,
    cheaperOption: false,
    premiumOption: false
  });

  const toggleCategory = (category: keyof ExpandedCategories) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const ProductCardSmall: React.FC<ProductCardSmallProps> = ({ product, category }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition cursor-pointer">
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1">
          <CategoryBadge category={category} />
          <h4 className="font-semibold text-gray-900 text-sm line-clamp-2 mt-1">
            {product.name}
          </h4>
          <p className="text-xs text-gray-600 mt-1">
            {product.store_name}
          </p>
        </div>
        <span className="font-bold text-blue-600 whitespace-nowrap text-sm">
          {product.price} DT
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs flex-wrap">
        <div className="flex items-center bg-yellow-50 px-1.5 py-0.5 rounded">
          <span className="text-yellow-400">★</span>
          <span className="text-gray-700 ml-0.5">
            {((product.rating ?? product.rating_avg) || 0).toFixed(1)}
          </span>
        </div>
        <span className="text-gray-500">
          ({product.review_count || 0} reviews)
        </span>
        {typeof product.score === 'number' && (
          <span className="bg-blue-50 px-1.5 py-0.5 rounded text-blue-700 font-semibold">
            {Math.round(product.score * 100)}%
          </span>
        )}
      </div>

      {product.price_match && product.price_match > 0 && (
        <div className="mt-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
          💯 {product.price_match}% match to your budget
        </div>
      )}

      {product.why && product.why.length > 0 && (
        <div className="mt-2 space-y-1 text-xs text-green-800">
          {product.why.map((reason, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-green-50 px-2 py-1 rounded">
              <span className="text-green-700">✔</span>
              <span>{reason}</span>
            </div>
          ))}
        </div>
      )}

      {product.stock > 0 && (
        <button className="mt-2 w-full bg-orange-800 hover:bg-orange-900 text-white text-xs py-1 rounded transition">
          View Details →
        </button>
      )}
    </div>
  );

  return (
    <div className={`flex gap-3 mb-4 animate-fadeIn ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser ? 'bg-blue-500' : 'bg-gradient-to-br from-purple-500 to-pink-500'
      }`}>
        {isUser ? (
          <span className="text-white text-sm font-bold">U</span>
        ) : (
          <MessageCircle className="w-5 h-5 text-white" />
        )}
      </div>

      <div className={`max-w-2xl ${isUser ? 'text-right' : 'text-left'}`}>
        <div className={`rounded-lg px-4 py-3 ${
          isUser 
            ? 'bg-blue-500 text-white rounded-br-none' 
            : 'bg-gray-100 text-gray-800 rounded-bl-none'
        }`}>
          <p className="text-sm whitespace-pre-wrap">{message}</p>
        </div>

        {/* Top Products */}
        {products && products.length > 0 && (
          <div className="mt-3 space-y-2">
            <button 
              onClick={() => toggleCategory('top')}
              className="text-sm font-bold text-gray-700 hover:text-gray-900 flex items-center gap-1"
            >
              🔥 Best Match For You ({products.length})
              <span className={`transform transition ${expandedCategories.top ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {expandedCategories.top && products.map((product, idx) => (
              <ProductCardSmall key={`top-${idx}`} product={product} category={idx === 0 ? 'topRanked' : 'alternative'} />
            ))}
          </div>
        )}

        {/* Alternatives */}
        {recommendations?.alternatives && recommendations.alternatives.length > 0 && (
          <div className="mt-3 space-y-2">
            <button 
              onClick={() => toggleCategory('alternatives')}
              className="text-sm font-bold text-gray-700 hover:text-gray-900 flex items-center gap-1"
            >
              ⭐ Alternatives ({recommendations.alternatives.length})
              <span className={`transform transition ${expandedCategories.alternatives ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {expandedCategories.alternatives && recommendations.alternatives.map((product, idx) => (
              <ProductCardSmall key={`alt-${idx}`} product={product} category="alternative" />
            ))}
          </div>
        )}

        {/* Best for You */}
        {recommendations?.bestForYou && recommendations.bestForYou.length > 0 && (
          <div className="mt-3 space-y-2 border-l-4 border-green-500 pl-2">
            <button 
              onClick={() => toggleCategory('bestForYou')}
              className="text-sm font-bold text-green-700 hover:text-green-900 flex items-center gap-1"
            >
              ✨ Best Match ({recommendations.bestForYou.length})
              <span className={`transform transition ${expandedCategories.bestForYou ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {expandedCategories.bestForYou && recommendations.bestForYou.map((product, idx) => (
              <ProductCardSmall key={`best-${idx}`} product={product} category="bestForYou" />
            ))}
          </div>
        )}

        {/* Cheaper Option */}
        {recommendations?.cheaperOption && recommendations.cheaperOption.length > 0 && (
          <div className="mt-3 space-y-2 border-l-4 border-blue-500 pl-2">
            <button 
              onClick={() => toggleCategory('cheaperOption')}
              className="text-sm font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1"
            >
              💰 Budget Friendly ({recommendations.cheaperOption.length})
              <span className={`transform transition ${expandedCategories.cheaperOption ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {expandedCategories.cheaperOption && recommendations.cheaperOption.map((product, idx) => (
              <ProductCardSmall key={`cheap-${idx}`} product={product} category="cheaperOption" />
            ))}
          </div>
        )}

        {/* Premium Option */}
        {recommendations?.premiumOption && recommendations.premiumOption.length > 0 && (
          <div className="mt-3 space-y-2 border-l-4 border-purple-500 pl-2">
            <button 
              onClick={() => toggleCategory('premiumOption')}
              className="text-sm font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1"
            >
              👑 Premium ({recommendations.premiumOption.length})
              <span className={`transform transition ${expandedCategories.premiumOption ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {expandedCategories.premiumOption && recommendations.premiumOption.map((product, idx) => (
              <ProductCardSmall key={`prem-${idx}`} product={product} category="premiumOption" />
            ))}
          </div>
        )}

        {metadata && (
          <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
            {metadata.budget && <p>💰 Budget: {metadata.budget} TND</p>}
            {metadata.intent && metadata.intent !== 'general' && <p>🎯 Category: {metadata.intent}</p>}
            {metadata.priceRange && metadata.priceRange !== 'any' && <p>🏷️ Price: {metadata.priceRange}</p>}
            {metadata.totalMatches && <p>📊 Found: {metadata.totalMatches} products</p>}
          </div>
        )}
      </div>
    </div>
  );
};

// Main Smart Assistant Component
export default function SmartAssistant() {
  const { profile, loading: authLoading } = useAuthStore();
  console.log('SmartAssistant render:', { profile, authLoading, role: profile?.role });

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: '✨ مرحبا بيك\nفاش نجم نعاونك اليوم؟',
      isUser: false,
      products: null,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const smartAssistant = useSmartAssistant();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (authLoading) return null;
  if (!profile || profile.role !== 'customer') return null;

  const askAssistant = async (rawText: string, clearInput = false) => {
    const text = preprocessInput(rawText);
    if (!text.trim()) return;

    const userMessage: Message = {
      id: messages.length + 1,
      text: rawText,
      isUser: true,
      products: null,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    if (clearInput) {
      setInput('');
    }
    setLoading(true);

    try {
      const result = await smartAssistant.mutateAsync(text);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Assistant error');
      }

      const budgetValue = result.data.parsed_input?.budget;
      const isSpecialResponse = result.data.parsed_input?.intent === 'greeting' || result.data.parsed_input?.intent === 'general';
      const botText = isSpecialResponse
        ? result.data.message
        : result.data.total_found === 0
        ? budgetValue
          ? `😕 ما لقيتش produit تحت ${budgetValue} DT. جرّب كلمات أخرى أو زيد الميزانية 😊`
          : '😕 ما لقيتش produit مطابق. جرّب كلمات أخرى 😊'
        : result.data.message;

      const recommendations = buildRecommendations(result.data.products || [], budgetValue);

      const botMessage: Message = {
        id: messages.length + 2,
        text: botText,
        isUser: false,
        products: result.data.products || [],
        recommendations,
        timestamp: new Date(),
        metadata: {
          budget: budgetValue,
          intent: result.data.parsed_input?.intent,
          priceRange: budgetValue ? `sous ${budgetValue} DT` : 'any',
          totalMatches: result.data.total_found
        }
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error: any) {
      console.error('Assistant error:', error);
      toast.error(error?.message || 'Erreur - essayez une autre demande');

      const errorMessage: Message = {
        id: messages.length + 2,
        text: 'Désolé, j\'ai eu une erreur. Pouvez-vous réessayer? 🔄',
        isUser: false,
        products: null,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    await askAssistant(input, true);
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !loading) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition transform hover:scale-110 z-40"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 flex justify-between items-center">
        <div>
          <h3 className="text-white font-bold text-lg">AI Shopping Assistant 🔥</h3>
          <p className="text-purple-100 text-xs">Meilleures suggestions produit, budget et popularité</p>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white hover:bg-white/20 p-1 rounded transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg.text}
            isUser={msg.isUser}
            products={msg.products}
            recommendations={msg.recommendations}
            metadata={msg.metadata}
          />
        ))}

        {loading && (
          <div className="flex gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div className="flex gap-1 items-center">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Dites-moi ce que vous cherchez... (tel, tapis, cadeau 500d...)"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-black placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-2 rounded-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
