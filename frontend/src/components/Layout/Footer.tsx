import { Link } from 'react-router-dom';
import { ShoppingBag, Globe, Mail, Phone } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <ShoppingBag size={18} className="text-white" />
              </div>
              <span className="font-bold text-xl text-white">Souk.tn</span>
            </Link>
            <p className="text-sm leading-relaxed mb-4">
              La plateforme e-commerce multi-vendeurs tunisienne. Achetez et vendez facilement, en toute sécurité.
            </p>
            <div className="flex gap-3">
              <a href="https://souk.tn" className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                <Globe size={16} />
              </a>
              <a href="mailto:contact@souk.tn" className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                <Mail size={16} />
              </a>
              <a href="tel:+21671000000" className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                <Phone size={16} />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Acheter</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/shop" className="hover:text-white transition-colors">
                  Boutique
                </Link>
              </li>
              <li>
                <Link to="/shop?sort=popular" className="hover:text-white transition-colors">
                  Tendances
                </Link>
              </li>
              <li>
                <Link to="/shop?featured=true" className="hover:text-white transition-colors">
                  Produits vedettes
                </Link>
              </li>
              <li>
                <Link to="/orders" className="hover:text-white transition-colors">
                  Mes commandes
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Vendre</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/register" className="hover:text-white transition-colors">
                  Devenir vendeur
                </Link>
              </li>
              <li>
                <Link to="/seller" className="hover:text-white transition-colors">
                  Espace vendeur
                </Link>
              </li>
              <li>
                <Link to="/seller/products" className="hover:text-white transition-colors">
                  Gérer mes produits
                </Link>
              </li>
              <li>
                <Link to="/seller/orders" className="hover:text-white transition-colors">
                  Mes ventes
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Contact</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <Globe size={14} className="mt-0.5 flex-shrink-0" />
                <span>Rue de la République, Tunis 1000, Tunisie</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={14} className="flex-shrink-0" />
                <span>+216 71 000 000</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={14} className="flex-shrink-0" />
                <a href="mailto:contact@souk.tn" className="hover:text-white transition-colors">
                  contact@souk.tn
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm">
            &copy; {new Date().getFullYear()} Souk.tn. Tous droits réservés.
          </p>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-green-400 font-medium">Paiements sécurisés</span>
            <span className="text-gray-600">|</span>
            <span>SSL Encrypt</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
