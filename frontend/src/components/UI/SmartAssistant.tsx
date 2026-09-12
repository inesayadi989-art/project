import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, X, Star, TrendingDown, Crown, ThumbsUp } from 'lucide-react';
import toast from 'react-hot-toast';

// Product category badge
const CategoryBadge = ({ category }) => {
  const badges = {
    bestForYou: { icon: ThumbsUp, text: '✨ Best for you', color: 'bg-green-100 text-green-700' },
    cheaperOption: { icon: TrendingDown, text: '💰 Cheaper option', color: 'bg-blue-100 text-blue-700' },
    premiumOption: { icon: Crown, text: '👑 Premium choice', color: 'bg-purple-100 text-purple-700' },
    topRanked: { icon: Star, text: '🔥 Top match', color: 'bg-orange-100 text-orange-700' },
    alternative: { icon: Star, text: '⭐ Alternative', color: 'bg-gray-100 text-gray-700' }
  };
  
  const badge = badges[category] || badges.topRanked;
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${badge.color}`}>
      {badge.text}
    </span>
  );
};

// Chat message component
const ChatMessage = ({ message, isUser, products, recommendations, metadata }) => {
  const [expandedCategories, setExpandedCategories] = useState({
    top: true,
    alternatives: false,
    bestForYou: false,
    cheaperOption: false,
    premiumOption: false
  });

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const ProductCardSmall = ({ product, category }) => (
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
            {(parseFloat(product.rating_avg) || 0).toFixed(1)}
          </span>
        </div>
        <span className="text-gray-500">
          ({parseInt(product.review_count) || 0} reviews)
        </span>
        {product.score && (
          <span className="bg-blue-50 px-1.5 py-0.5 rounded text-blue-700 font-semibold">
            {product.score}%
          </span>
        )}
      </div>

      {product.price_match && product.price_match > 0 && (
        <div className="mt-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
          💯 {product.price_match}% match to your budget
        </div>
      )}

      {product.stock > 0 && (
        <button className="mt-2 w-full bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 rounded transition">
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
              🔥 Top Recommendations ({products.length})
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
               Also Consider ({recommendations.alternatives.length})
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
            > Best for you ({recommendations.bestForYou.length})
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
               Budget-friendly ({recommendations.cheaperOption.length})
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
               Premium choice ({recommendations.premiumOption.length})
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
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: 'Bonjour! 👋 Je suis votre assistant shopping intelligent.\n\nJe peux vous aider à:\n✅ Trouver les meilleures produits\n✅ Comprendre votre budget\n✅ Détecter vos besoins\n✅ Vous proposer des alternatives\n\nQue cherchez-vous? 🔍',
      isUser: false,
      products: null,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      text: input,
      isUser: true,
      products: null,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Call smart assistant API
      const response = await fetch('http://localhost:5000/api/products/smart-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: input
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Assistant error');
      }

      // Add bot response with recommendations
      const botMessage = {
        id: messages.length + 2,
        text: data.message,
        isUser: false,
        products: data.top || [],
        recommendations: {
          alternatives: data.alternatives || [],
          bestForYou: data.recommendations?.bestForYou || [],
          cheaperOption: data.recommendations?.cheaperOption || [],
          premiumOption: data.recommendations?.premiumOption || []
        },
        timestamp: new Date(),
        metadata: {
          budget: data.parsed?.budget,
          intent: data.parsed?.intent,
          priceRange: data.parsed?.priceRange,
          totalMatches: data.total_matches
        }
      };

      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      console.error('Assistant error:', error);
      toast.error('Erreur - essayez une autre demande');

      const errorMessage = {
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

  // Handle suggestion click
  const handleSuggestion = async (suggestion) => {
    const userMessage = {
      id: messages.length + 1,
      text: suggestion,
      isUser: true,
      products: null,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/products/smart-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: suggestion
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Assistant error');
      }

      const botMessage = {
        id: messages.length + 2,
        text: data.message,
        isUser: false,
        products: data.top || [],
        recommendations: {
          alternatives: data.alternatives || [],
          bestForYou: data.recommendations?.bestForYou || [],
          cheaperOption: data.recommendations?.cheaperOption || [],
          premiumOption: data.recommendations?.premiumOption || []
        },
        timestamp: new Date(),
        metadata: {
          budget: data.parsed?.budget,
          intent: data.parsed?.intent,
          priceRange: data.parsed?.priceRange,
          totalMatches: data.total_matches
        }
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Assistant error:', error);
      toast.error('Erreur - essayez une autre demande');
    } finally {
      setLoading(false);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !loading) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Suggested queries
  const suggestions = [
    'Je cherche un phone sous 500 DT',
    'Ça qui deco pas cher pour la maison',
    'Cadeau premium pour mon ami',
    'Laptop sous 1000 DT',
    'ملابس رخيصة',
    'تيليفون ممتاز',
    'Déco cuisine qualité'
  ];

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
          <h3 className="text-white font-bold text-lg">Smart Assistant 🤖</h3>
          <p className="text-purple-100 text-xs">Votre expert shopping</p>
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

      {/* Suggestions (show when assistant just started) */}
      {messages.length === 1 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-white">
          <p className="text-xs text-gray-600 mb-2 font-semibold">Exemples:</p>
          <div className="space-y-2">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestion(suggestion)}
                className="w-full text-left text-xs p-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition disabled:opacity-50"
                disabled={loading}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Que cherchez-vous? (téléphone, deco...)"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
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
