import { useState } from 'react';
import { Search, Ban, CircleCheck as CheckCircle, Store, Users } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import AdminLayout from './AdminLayout';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import BackButton from '../../components/UI/BackButton';
import type { Profile, Store as StoreType } from '../../lib/types';
import toast from 'react-hot-toast';

type Tab = 'users' | 'stores';

function useAdminUsers() {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { users } = await api.getAdminUsers();
      return users as Profile[];
    },
  });
}

function useAdminStores(subscriptionStatus: string) {
  return useQuery({
    queryKey: ['admin-stores', subscriptionStatus],
    queryFn: async () => {
      const query = subscriptionStatus ? { subscriptionStatus } : {};
      const { stores } = await api.getAdminStores(query);
      return stores as (StoreType & { owner: { full_name: string; email: string } })[];
    },
  });
}

export default function AdminUsers() {
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [userSearch, setUserSearch] = useState('');
  const [storeSearch, setStoreSearch] = useState('');
  const [subscriptionFilter, setSubscriptionFilter] = useState('');
  const queryClient = useQueryClient();

  const { data: users, isLoading: usersLoading } = useAdminUsers();
  const { data: stores, isLoading: storesLoading } = useAdminStores(subscriptionFilter);

  const banUser = useMutation({
    mutationFn: async ({ userId, ban }: { userId: string; ban: boolean }) => {
      return await api.banUser(userId, ban);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
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
        <div>
          <BackButton />

          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        </div>

        <div className="flex gap-2 border-b border-gray-100">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'users' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'
            }`}
          >
            <Users size={16} /> Users ({users?.length ?? 0})
          </button>
          <button
            onClick={() => setActiveTab('stores')}
            className={`flex items-center gap-2 pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'stores' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'
            }`}
          >
            <Store size={16} /> Vendors ({stores?.length ?? 0})
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
                                  toast.success(user.is_banned ? 'Utilisateur débloqué' : 'Utilisateur banni');
                                }}
                                className={`text-xs font-medium flex items-center gap-1 ml-auto ${
                                  user.is_banned ? 'text-green-600 hover:text-green-700' : 'text-red-600 hover:text-red-700'
                                }`}
                              >
                                {user.is_banned ? <CheckCircle size={13} /> : <Ban size={13} />}
                                {user.is_banned ? 'Débloquer' : 'Bannir'}
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={storeSearch}
                  onChange={(e) => setStoreSearch(e.target.value)}
                  placeholder="Search vendors..."
                  className="input-field pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {['', 'active', 'pending', 'expired'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setSubscriptionFilter(status)}
                    className={`rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
                      subscriptionFilter === status
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {status === '' ? 'All' : status === 'active' ? '🟢 Active' : status === 'pending' ? '🟡 Pending' : '🔴 Expired'}
                  </button>
                ))}
              </div>
            </div>

            {storesLoading ? (
              <div className="flex justify-center py-8"><LoadingSpinner /></div>
            ) : (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Vendor</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Owner</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Status</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Plan</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Expiry</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Next Payment</th>
                        <th className="text-right text-xs font-semibold text-gray-500 uppercase px-4 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredStores.map((store) => (
                        <tr key={store.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {store.logo_url ? (
                                <img src={store.logo_url} alt={store.name} className="w-8 h-8 object-cover rounded-lg flex-shrink-0" />
                              ) : (
                                <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Store size={14} className="text-primary-600" />
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-medium text-gray-900">{store.name}</p>
                                <p className="text-xs text-gray-400">{store.governorate}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {(store as { owner?: { full_name: string } }).owner?.full_name ?? 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                              store.subscription_status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : store.subscription_status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                            }`}>
                              {store.subscription_status === 'active' ? '🟢 Active' : store.subscription_status === 'pending' ? '🟡 Pending' : '🔴 Expired'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {store.subscription_interval ? (store.subscription_interval === 'yearly' ? 'Yearly' : 'Monthly') : 'No plan'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {store.subscription_current_period_end ?? 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {store.subscription_next_payment_date ?? 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => {
                                approveStore.mutate({ storeId: store.id, approve: !store.is_approved });
                                toast.success(store.is_approved ? 'Vendor disabled' : 'Vendor enabled');
                              }}
                              className={`text-xs font-medium flex items-center gap-1 ml-auto ${
                                store.is_approved ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'
                              }`}
                            >
                              {store.is_approved ? <Ban size={13} /> : <CheckCircle size={13} />}
                              {store.is_approved ? 'Disable' : 'Enable'}
                            </button>
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
      </div>
    </AdminLayout>
  );
}
