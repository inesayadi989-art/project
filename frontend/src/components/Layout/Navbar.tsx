import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, Search, ShoppingCart, Menu, X, ChevronDown, LogOut, Settings, LayoutDashboard, Bell } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { useCategories } from '../../hooks/useProducts';
import { useSubscriptionNotifications } from '../../hooks/useNotifications';
import CartDrawer from '../Cart/CartDrawer';
import { NotificationDropdown } from './NotificationDropdown';
import toast from 'react-hot-toast';

export default function Navbar() {
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut, isClientMode, setClientMode } = useAuthStore();
  const { getCount } = useCartStore();
  const { data: categories } = useCategories();
  const { data: notifications } = useSubscriptionNotifications({ enabled: !!user });
  const cartCount = getCount();
  const unreadCount = (notifications ?? []).filter((n: any) => !n.is_read).length;
  const showCartButton = profile?.role !== 'admin' && profile?.role !== 'seller';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setUserMenuOpen(false);
    toast.success('Déconnexion réussie');
    navigate('/');
  };

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? 'U';

  return (
    <>
      <header className="sticky top-0 z-30 bg-white shadow-md border-b-2 border-primary-600">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-4 h-16">
            <Link to="/" className="flex items-center gap-2 flex-shrink-0 group">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-all">
                <ShoppingBag size={18} className="text-white" />
              </div>
              <span className="font-bold text-xl bg-gradient-to-r from-primary-600 to-secondary-500 bg-clip-text text-transparent">Souk.tn</span>
            </Link>


            <form onSubmit={handleSearch} className="flex-1 max-w-xl hidden md:flex">
              <div className="relative w-full">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher des produits..."
                  className="input-field pl-9 pr-4 focus:ring-primary-600"
                />
              </div>
            </form>

            <div className="ml-auto flex items-center gap-3">
                {showCartButton && (
                <button
                  onClick={() => setCartOpen(true)}
                  className="relative p-2 text-gray-600 hover:text-primary-600 transition-all duration-200 hover:bg-primary-50 rounded-lg"
                >
                  <ShoppingCart size={22} />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-primary-600 to-primary-700 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md">
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </button>
              )}

              {user && (
                <div className="relative">
                  <button
                    onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
                    className="relative p-2 text-gray-600 hover:text-secondary-500 transition-all duration-200 hover:bg-secondary-50 rounded-lg"
                  >
                    <Bell size={22} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-secondary-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                  <NotificationDropdown
                    isOpen={notificationDropdownOpen}
                    onClose={() => setNotificationDropdownOpen(false)}
                  />
                </div>
              )}

              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-primary-50 transition-all duration-200"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-full flex items-center justify-center text-sm font-semibold shadow-md">
                      {initials}
                    </div>
                    <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
                  </button>

                  {userMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setUserMenuOpen(false)}
                      />
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 z-20 py-1 overflow-hidden">
                        <div className="px-3 py-2 border-b-2 border-primary-100 bg-gradient-to-r from-primary-50 to-transparent">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {profile?.full_name ?? 'Utilisateur'}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                        <Link
                          to="/profile"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                        >
                          <Settings size={15} /> Mon profil
                        </Link>
                        {profile?.role !== 'seller' && profile?.role !== 'admin' && (
                          <Link
                            to="/orders"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                          >
                            <ShoppingBag size={15} /> Mes commandes
                          </Link>
                        )}
                        {profile?.role === 'seller' && (
                          <Link
                            to="/seller"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-secondary-50 hover:text-secondary-600 transition-colors"
                          >
                            <LayoutDashboard size={15} /> Seller Dashboard
                          </Link>
                        )}
                        {profile?.role === 'admin' && (
                          <Link
                            to="/admin"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-secondary-50 hover:text-secondary-600 transition-colors"
                          >
                            <LayoutDashboard size={15} /> Admin
                          </Link>
                        )}
                        <button
                          onClick={handleSignOut}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <LogOut size={15} /> Déconnexion
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-2">
                  <Link to="/login" className="btn-secondary text-xs px-3 py-1.5">
                    Connexion
                  </Link>
                  <Link to="/register" className="btn-primary text-xs px-3 py-1.5">
                    S'inscrire
                  </Link>
                </div>
              )}

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-gray-600 hover:text-primary-600 transition-colors"
              >
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>

          {categories && categories.length > 0 && (
            <div className="hidden md:flex items-center gap-1 overflow-x-auto scrollbar-hide pb-2 pt-1 border-t border-gray-100">
              <Link
                to="/shop"
                className="flex-shrink-0 text-xs text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md hover:bg-primary-50 transition-all font-medium"
              >
                Tous
              </Link>
              {categories.slice(0, 10).map((cat) => (
                <Link
                  key={cat.id}
                  to={`/shop?category=${cat.slug}`}
                  className="flex-shrink-0 text-xs text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md hover:bg-primary-50 transition-all whitespace-nowrap"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t-2 border-primary-100 bg-light px-4 py-3 space-y-3">
            <form onSubmit={handleSearch} className="flex">
              <div className="relative w-full">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher..."
                  className="input-field pl-9"
                />
              </div>
            </form>
            {!user && (
              <div className="flex gap-2">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="flex-1 btn-secondary text-center text-xs">
                  Connexion
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="flex-1 btn-primary text-center text-xs">
                  S'inscrire
                </Link>
              </div>
            )}
            {user && (
              <div className="flex items-center gap-2 py-1 bg-primary-50 px-3 rounded-lg">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  {initials}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
              {categories?.slice(0, 8).map((cat) => (
                <Link
                  key={cat.id}
                  to={`/shop?category=${cat.slug}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-shrink-0 text-xs bg-secondary-100 text-secondary-700 px-3 py-1.5 rounded-full font-medium hover:bg-secondary-200 transition-colors"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {showCartButton && <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />}
    </>

  );
}
