import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import LoadingSpinner from './components/UI/LoadingSpinner'
import AIAdvisor from './components/AIAdvisor'
import Navbar from './components/Layout/Navbar'
import Footer from './components/Layout/Footer'
import SellerLayout from './pages/seller/SellerLayout'

// Lazy loaded pages
const HomePage = lazy(() => import('./pages/HomePage'))
const ShopPage = lazy(() => import('./pages/ShopPage'))
const ProductPage = lazy(() => import('./pages/ProductPage'))
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'))
const OrdersPage = lazy(() => import('./pages/OrdersPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'))
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage'))
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'))
const SellerDashboard = lazy(() => import('./pages/seller/SellerDashboard'))
const SellerProducts = lazy(() => import('./pages/seller/SellerProducts'))
const SellerOrders = lazy(() => import('./pages/seller/SellerOrders'))
const SellerStore = lazy(() => import('./pages/seller/SellerStore'))
const SellerSubscription = lazy(() => import('./pages/seller/SellerSubscription'))
const SellerSubscriptionConfigure = lazy(() => import('./pages/seller/SellerSubscriptionConfigure'))
const SellerNotifications = lazy(() => import('./pages/seller/SellerNotifications.tsx'))
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccessPage'))
const PaymentFailurePage = lazy(() => import('./pages/PaymentFailurePage'))
const SubscriptionCheckoutPage = lazy(() => import('./pages/SubscriptionCheckoutPage'))
const CardPaymentPage = lazy(() => import('./pages/CardPaymentPage'))
const SubscriptionPlansPage = lazy(() => import('./pages/SubscriptionPlansPage'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'))
const AdminVendorPayments = lazy(() => import('./pages/admin/AdminVendorPayments'))
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'))
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'))
const AdminSubscriptions = lazy(() => import('./pages/admin/AdminSubscriptions'))
const AdminNotifications = lazy(() => import('./pages/admin/AdminNotifications.tsx'))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()
  if (loading) return <LoadingSpinner fullscreen />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RoleRoute({ children, role }: { children: React.ReactNode; role: 'seller' | 'admin' }) {
  const { user, profile, loading } = useAuthStore()
  if (loading) return <LoadingSpinner fullscreen />
  if (!user) return <Navigate to="/login" replace />
  if (profile && profile.role !== role && profile.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()
  if (loading) return <LoadingSpinner fullscreen />
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )
}

function ScrollToTop() {
  const location = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])
  return null
}

export default function App() {
  const { loading, user } = useAuthStore()

  useEffect(() => {
    useAuthStore.getState().initialize()
  }, [])

  if (loading) {
    return <LoadingSpinner fullscreen message="Chargement..." />
  }

  return (
    <>
      <ScrollToTop />
      {user && <AIAdvisor />}
      <Suspense fallback={<LoadingSpinner fullscreen />}>
        <Routes>
          {/* Guest-only routes */}
          <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
          <Route path="/reset-password" element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />

          {/* Seller routes */}
          <Route
            path="/seller"
            element={
              <RoleRoute role="seller">
                <SellerLayout><SellerDashboard /></SellerLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/seller/products"
            element={
              <RoleRoute role="seller">
                <SellerLayout><SellerProducts /></SellerLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/seller/orders"
            element={
              <RoleRoute role="seller">
                <SellerLayout><SellerOrders /></SellerLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/seller/store/create"
            element={
              <RoleRoute role="seller">
                <SellerLayout><SellerStore /></SellerLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/seller/store"
            element={
              <RoleRoute role="seller">
                <SellerLayout><SellerStore /></SellerLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/seller/subscription"
            element={
              <RoleRoute role="seller">
                <SellerLayout><SellerSubscription /></SellerLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/seller/subscription/configure"
            element={
              <RoleRoute role="seller">
                <SellerLayout><SellerSubscriptionConfigure /></SellerLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/seller/notifications"
            element={
              <RoleRoute role="seller">
                <SellerLayout><SellerNotifications /></SellerLayout>
              </RoleRoute>
            }
          />

          {/* Admin routes */}
          <Route path="/admin" element={<RoleRoute role="admin"><AdminDashboard /></RoleRoute>} />
          <Route path="/admin/users" element={<RoleRoute role="admin"><AdminUsers /></RoleRoute>} />
          <Route path="/admin/vendor-payments" element={<RoleRoute role="admin"><AdminVendorPayments /></RoleRoute>} />
          <Route path="/admin/products" element={<RoleRoute role="admin"><AdminProducts /></RoleRoute>} />
          <Route path="/admin/orders" element={<RoleRoute role="admin"><AdminOrders /></RoleRoute>} />
          <Route
            path="/admin/subscriptions"
            element={
              <RoleRoute role="admin">
                <AdminSubscriptions />
              </RoleRoute>
            }
          />
          <Route
            path="/admin/notifications"
            element={
              <RoleRoute role="admin">
                <AdminNotifications />
              </RoleRoute>
            }
          />
          {/* Main layout routes */}
          <Route path="/" element={<MainLayout><HomePage /></MainLayout>} />
          <Route path="/shop" element={<MainLayout><ShopPage /></MainLayout>} />
          <Route path="/product/:id" element={<MainLayout><ProductPage /></MainLayout>} />

          <Route
            path="/checkout"
            element={<MainLayout><ProtectedRoute><CheckoutPage /></ProtectedRoute></MainLayout>}
          />
          <Route
            path="/orders"
            element={<MainLayout><ProtectedRoute><OrdersPage /></ProtectedRoute></MainLayout>}
          />
          <Route
            path="/profile"
            element={<MainLayout><ProtectedRoute><ProfilePage /></ProtectedRoute></MainLayout>}
          />
          <Route
            path="/subscription-plans"
            element={<MainLayout><ProtectedRoute><SubscriptionPlansPage /></ProtectedRoute></MainLayout>}
          />
          <Route
            path="/payment/checkout"
            element={<MainLayout><ProtectedRoute><SubscriptionCheckoutPage /></ProtectedRoute></MainLayout>}
          />
          <Route
            path="/payment/card"
            element={<MainLayout><ProtectedRoute><CardPaymentPage /></ProtectedRoute></MainLayout>}
          />
          <Route
            path="/payment/success"
            element={<MainLayout><ProtectedRoute><PaymentSuccessPage /></ProtectedRoute></MainLayout>}
          />
          <Route
            path="/payment/failure"
            element={<MainLayout><ProtectedRoute><PaymentFailurePage /></ProtectedRoute></MainLayout>}
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  )
}