import { Link } from 'react-router-dom';
import { ShoppingBag, Globe, Mail, Phone } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-dark-900 text-gray-300 mt-16 border-t-2 border-primary-600">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4 group">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all">
                <ShoppingBag size={18} className="text-white" />
              </div>
              <span className="font-bold text-xl bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent">Souk.tn</span>
            </Link>
            <p className="text-sm leading-relaxed mb-4 text-gray-400">
              La plateforme e-commerce multi-vendeurs tunisienne. Achetez et vendez facilement, en toute sécurité.
            </p>
            <div className="flex gap-3">
              <a href="https://souk.tn" className="p-2 bg-dark-800 rounded-lg hover:bg-primary-600 transition-all duration-200 hover:text-white hover:shadow-lg">
                <Globe size={16} />
              </a>
              <a href="mailto:contact@souk.tn" className="p-2 bg-dark-800 rounded-lg hover:bg-secondary-500 transition-all duration-200 hover:text-white hover:shadow-lg">
                <Mail size={16} />
              </a>
              <a href="tel:+21671000000" className="p-2 bg-dark-800 rounded-lg hover:bg-primary-600 transition-all duration-200 hover:text-white hover:shadow-lg">
                <Phone size={16} />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <span className="w-1 h-1 bg-secondary-500 rounded-full"></span>
              Acheter
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/shop" className="text-gray-400 hover:text-secondary-400 transition-colors font-medium">
                  Boutique
                </Link>
              </li>
              <li>
                <Link to="/shop?sort=popular" className="text-gray-400 hover:text-secondary-400 transition-colors">
                  Tendances
                </Link>
              </li>
              <li>
                <Link to="/shop?featured=true" className="text-gray-400 hover:text-secondary-400 transition-colors">
                  Produits vedettes
                </Link>
              </li>
              <li>
                <Link to="/orders" className="text-gray-400 hover:text-secondary-400 transition-colors">
                  Mes commandes
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <span className="w-1 h-1 bg-primary-600 rounded-full"></span>
              Vendre
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/register" className="text-gray-400 hover:text-primary-400 transition-colors font-medium">
                  Devenir vendeur
                </Link>
              </li>
              <li>
                <Link to="/seller" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Espace vendeur
                </Link>
              </li>
              <li>
                <Link to="/seller/products" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Gérer mes produits
                </Link>
              </li>
              <li>
                <Link to="/seller/orders" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Mes ventes
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <span className="w-1 h-1 bg-secondary-500 rounded-full"></span>
              Contact
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Globe size={14} className="mt-0.5 flex-shrink-0 text-secondary-500" />
                <span className="text-gray-400">Rue de la République, Tunis 1000, Tunisie</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={14} className="flex-shrink-0 text-primary-600" />
                <span className="text-gray-400">+216 71 000 000</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={14} className="flex-shrink-0 text-secondary-500" />
                <a href="mailto:contact@souk.tn" className="text-gray-400 hover:text-secondary-400 transition-colors">
                  contact@souk.tn
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-dark-700 mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Souk.tn. Tous droits réservés.
          </p>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-secondary-400 font-bold">🔒 Paiements sécurisés</span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-500">SSL Encrypt</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
