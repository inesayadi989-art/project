import { Link, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingBag, Store, Bell } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useSellerStore } from '../../hooks/useProducts';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}

interface SellerLayoutProps {
  children: React.ReactNode;
}

export default function SellerLayout({ children }: SellerLayoutProps) {
  const location = useLocation();
  const { subscription, subscriptionStatus, profile, user } = useAuthStore();
  const { data: store } = useSellerStore(user?.id ?? '');
  const isSubscriptionPage = location.pathname === '/seller/subscription' || location.pathname.startsWith('/seller/subscription/');
  const isCreateStorePage = location.pathname === '/seller/store/create';

  if (!isSubscriptionPage && !isCreateStorePage && (subscriptionStatus === 'loading' || subscriptionStatus === 'idle')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="p-6 bg-white rounded-2xl shadow-sm">
          Chargement de l'abonnement...
        </div>
      </div>
    );
  }

  const hasActiveSubscription = subscription?.status === 'active' && subscription?.payment_status === 'paid';
  if (!isSubscriptionPage && !isCreateStorePage && subscriptionStatus !== 'loading' && subscriptionStatus !== 'idle' && !hasActiveSubscription) {
    return <Navigate to="/seller/subscription" replace />;
  }

  const navItems: NavItem[] = [
    { to: '/seller', label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
    { to: '/seller/products', label: 'Produits', icon: Package },
    { to: '/seller/orders', label: 'Commandes', icon: ShoppingBag },
    { to: '/seller/store/create', label: 'Créer boutique', icon: Store },
    { to: '/seller/store', label: 'Modifier boutique', icon: Store, exact: true },
    { to: '/seller/subscription', label: 'Abonnement', icon: Package },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-56 bg-white border-r border-gray-100 flex-shrink-0 hidden md:block">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Store size={18} className="text-primary-600" />
            Espace Vendeur
          </h2>
        </div>
        <nav className="p-2">
          {navItems.map(({ to, label, icon: Icon, exact }) => {
            const isActive = exact ? location.pathname === to : location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon size={17} />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile tabs */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-20">
        <div className="flex">
          {navItems.map(({ to, label, icon: Icon, exact }) => {
            const isActive = exact ? location.pathname === to : location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors ${
                  isActive ? 'text-primary-600' : 'text-gray-400'
                }`}
              >
                <Icon size={20} />
                <span className="mt-0.5">{label.split(' ')[0]}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <main className="flex-1 p-6 pb-20 md:pb-6 min-w-0">{children}</main>
    </div>
  );
}
