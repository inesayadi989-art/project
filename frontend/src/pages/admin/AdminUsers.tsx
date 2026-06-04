import { useState } from 'react';
import { Search, Ban, CircleCheck as CheckCircle, Store, Users } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import AdminLayout from './AdminLayout';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import type { Profile, Store as StoreType } from '../../lib/types';
import toast from 'react-hot-toast';

type Tab = 'users' | 'stores';

// Utility function to format dates
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('fr-FR');
  } catch {
    return 'N/A';
  }
};

function useAdminUsers(role?: string) {
  return useQuery({
    queryKey: ['admin-users', role],
    queryFn: async () => {
      const { users } = await api.getAdminUsers();
      if (role) {
        return (users as Profile[]).filter(u => u.role === role);
      }
      return users as Profile[];
    },
  });
}

function useAdminStores() {
  return useQuery({
    queryKey: ['admin-stores'],
    queryFn: async () => {
      const { stores } = await api.getAdminStores();
      return stores as StoreType[];
    },
  });
}

export default function AdminUsers() {
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [userSearch, setUserSearch] = useState('');
  const [storeSearch, setStoreSearch] = useState('');
  const [subscriptionFilter, setSubscriptionFilter] = useState('');
  const queryClient = useQueryClient();

  const { data: users, isLoading: usersLoading } = useAdminUsers('customer');
  const { data: stores, isLoading: storesLoading } = useAdminStores();

  const banUser = useMutation({
    mutationFn: async ({ userId, ban }: { userId: string; ban: boolean }) => {
      return await api.banUser(userId, ban);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stores'] });
    },
  });

  const approveStore = useMutation({
    mutationFn: async ({ storeId, approve }: { storeId: string; approve: boolean }) => {
      return await api.approveStore(storeId, approve);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stores'] });
    },
  });

  const markStorePaid = useMutation({
    mutationFn: async ({ storeId }: { storeId: string }) => {
      return await api.markStorePaid(storeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stores'] });
      toast.success('Paiement marqué et vendeur notifié');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Erreur lors du marquage du paiement');
    }
  });

  const filteredUsers = (users ?? []).filter((u) =>
    u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredStores = (stores ?? []).filter((s) =>
    s.name?.toLowerCase().includes(storeSearch.toLowerCase())
  );

  const roleLabel = (role: string) => {
    if (role === 'admin') return <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">Admin</span>;
    if (role === 'seller') return <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">Vendeur</span>;
    return <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">Acheteur</span>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>

        <div className="flex gap-2 border-b border-gray-100">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'users' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'
            }`}
          >
            <Users size={16} /> Client ({users?.length ?? 0})
          </button>
          <button
            onClick={() => setActiveTab('stores')}
            className={`flex items-center gap-2 pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'stores' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'
            }`}
          >
            <Store size={16} /> Vendeurs ({stores?.length ?? 0})
          </button>
        </div>

        {activeTab === 'users' && (
          <>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Rechercher un utilisateur..."
                className="input-field pl-9"
              />
            </div>

            {usersLoading ? (
              <div className="flex justify-center py-8"><LoadingSpinner /></div>
            ) : filteredUsers.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-gray-500">Aucun client trouvé</p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Utilisateur</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Rôle</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Statut</th>
                        <th className="text-right text-xs font-semibold text-gray-500 uppercase px-4 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                              <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">{roleLabel(user.role)}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              user.is_banned ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {user.is_banned ? 'Banni' : 'Actif'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {user.role !== 'admin' && (
                              <button
                                onClick={() => {
                                  banUser.mutate({ userId: user.id, ban: !user.is_banned });
                                  toast.success(user.is_banned ? 'Utilisateur débloqué' : 'Utilisateur bloqué');
                                }}
                                className={`text-xs font-medium flex items-center gap-1 ml-auto ${
                                  user.is_banned ? 'text-green-600 hover:text-green-700' : 'text-red-600 hover:text-red-700'
                                }`}
                              >
                                {user.is_banned ? <CheckCircle size={13} /> : <Ban size={13} />}
                                {user.is_banned ? 'Débloquer' : 'Bloquer'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'stores' && (
          <>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={storeSearch}
                onChange={(e) => setStoreSearch(e.target.value)}
                placeholder="Rechercher un vendeur..."
                className="input-field pl-9"
              />
            </div>

            {storesLoading ? (
              <div className="flex justify-center py-8"><LoadingSpinner /></div>
            ) : filteredStores.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-gray-500">Aucun vendeur trouvé</p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Vendeurs</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Propriétaire</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Plan</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Abonnement</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Expiration</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Prochain paiement</th>
                        <th className="text-right text-xs font-semibold text-gray-500 uppercase px-4 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredStores.map((store) => {
                        // Plan display - use plan_name from subscription if available
                        const planLabel = (store as any).subscription_plan_name || 'Aucun plan';
                        const subscriptionStatusLabel = store.subscription_status === 'active' && store.subscription_payment_status === 'paid'
                          ? 'Actif'
                          : store.subscription_status === 'active' && store.subscription_payment_status === 'unpaid'
                            ? 'En attente de paiement'
                            : store.subscription_status === 'pending'
                              ? 'En attente'
                              : store.subscription_status === 'rejected' || store.subscription_status === 'rejected_by_vendor'
                                ? 'Rejeté'
                                : 'Expiré';
                        const subscriptionStatusColor = store.subscription_status === 'active' && store.subscription_payment_status === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : store.subscription_status === 'active' && store.subscription_payment_status === 'unpaid'
                            ? 'bg-yellow-100 text-yellow-700'
                            : store.subscription_status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : store.subscription_status === 'rejected' || store.subscription_status === 'rejected_by_vendor'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-red-100 text-red-700';
                        
                        // Format dates safely
                        const expiryDate = formatDate(store.subscription_current_period_end);
                        const nextPaymentDate = formatDate(store.subscription_next_payment_date);
                        
                        // Use owner_is_banned to determine button state
                        const isOwnerBanned = !!store.owner_is_banned;

                        return (
                          <tr key={store.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <p className="text-sm font-medium text-gray-900">{store.name}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm text-gray-600">{store.owner_name || 'N/A'}</p>
                              <p className="text-xs text-gray-500">{store.owner_email || 'N/A'}</p>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{planLabel}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${subscriptionStatusColor}`}>
                                {subscriptionStatusLabel}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{expiryDate}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{nextPaymentDate}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {Number(store.wallet_balance || 0) >= 500 && (
                                  <button
                                    onClick={() => {
                                      const ok = window.confirm('Marquer le paiement du vendeur comme effectué ?');
                                      if (!ok) return;
                                      markStorePaid.mutate({ storeId: store.id });
                                    }}
                                    disabled={markStorePaid.isLoading}
                                    className="text-xs font-medium bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700"
                                  >
                                    {markStorePaid.isLoading ? 'En cours...' : 'Marquer comme payé'}
                                  </button>
                                )}

                                <button
                                  onClick={() => {
                                    banUser.mutate({ userId: store.owner_id, ban: !isOwnerBanned });
                                    toast.success(isOwnerBanned ? 'Vendeur débloqué' : 'Vendeur bloqué');
                                  }}
                                  className={`text-xs font-medium flex items-center gap-1 ${
                                    isOwnerBanned ? 'text-green-600 hover:text-green-700' : 'text-red-600 hover:text-red-700'
                                  }`}
                                >
                                  {isOwnerBanned ? <CheckCircle size={13} /> : <Ban size={13} />}
                                  {isOwnerBanned ? 'Débloquer' : 'Bloquer'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
