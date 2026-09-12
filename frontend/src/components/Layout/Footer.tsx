export default function Footer() {
  return (
    <footer className="bg-dark-900 text-gray-300 mt-16 border-t-2 border-primary-600">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <span className="font-bold text-xl text-primary-400">Souk.tn</span>
            <p className="text-sm leading-relaxed mt-4 mb-4 text-gray-400">
              La plateforme e-commerce multi-vendeurs tunisienne. Achetez et vendez facilement, en toute sécurité.
            </p>
          </div>

          <div>
            <h3 className="text-white font-bold mb-4">Acheter</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>Boutique</li>
              <li>Tendances</li>
              <li>Produits vedettes</li>
              <li>Mes commandes</li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-bold mb-4">Vendre</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>Devenir vendeur</li>
              <li>Espace vendeur</li>
              <li>Gérer mes produits</li>
              <li>Mes ventes</li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-bold mb-4">Contact</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li>Rue de la République, Tunis 1000, Tunisie</li>
              <li>+216 71 000 000</li>
              <li>contact@souk.tn</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-dark-700 mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500">
            © 2026 Souk.tn. Tous droits réservés.
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
