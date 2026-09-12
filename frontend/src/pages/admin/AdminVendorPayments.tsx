import { useState } from 'react';
import { Wallet, List, Clock3, CheckCircle2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Store, VendorSettlement } from '../../lib/types';
import AdminLayout from './AdminLayout';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';

function useAdminVendorPayouts() {
  return useQuery({
    queryKey: ['admin-vendor-payouts'],
    queryFn: async () => {
      const { stores } = await api.getAdminVendorPayouts();
      return stores as Store[];
    },
  });
}

function useAdminVendorSettlements() {
  return useQuery({
    queryKey: ['admin-vendor-settlements'],
    queryFn: async () => {
      const { settlements } = await api.getAdminVendorSettlements();
      return settlements as VendorSettlement[];
    },
  });
}

export default function AdminVendorPayments() {
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const queryClient = useQueryClient();
  const { data: payouts, isLoading: payoutsLoading } = useAdminVendorPayouts();
  const { data: settlements, isLoading: settlementsLoading } = useAdminVendorSettlements();

  const markStorePaid = useMutation({
    mutationFn: async ({ storeId }: { storeId: string | number }) => {
      return await api.markStorePaid(storeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendor-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-vendor-settlements'] });
      toast.success('Paiement enregistré et vendeur notifié');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Impossible de marquer le paiement');
    },
  });

  const payoutCount = payouts?.length ?? 0;
  const settlementCount = settlements?.length ?? 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Paiements vendeurs</h1>
              <p className="mt-2 text-sm text-gray-500">Gérez les soldes des vendeurs, marquez les paiements en espèces comme effectués, et consultez l'historique des règlements.</p>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-2">
                <Wallet size={16} /> {payoutCount} en attente
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-2">
                <List size={16} /> {settlementCount} règlements
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold ${activeTab === 'pending' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            <Wallet size={16} /> En attente de paiement ({payoutCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold ${activeTab === 'history' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            <Clock3 size={16} /> Historique ({settlementCount})
          </button>
        </div>

        {activeTab === 'pending' && (
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            {payoutsLoading ? (
              <div className="flex justify-center py-10"><LoadingSpinner /></div>
            ) : !payouts || payouts.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <p className="text-lg font-medium">Aucun paiement à traiter pour l'instant.</p>
                <p className="mt-2">Les boutiques apparaîtront ici lorsque leur solde de portefeuille dépasse 500 TND.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Boutique</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Propriétaire</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Email</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Téléphone</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Solde</th>
                      <th className="text-right text-xs font-semibold text-gray-500 uppercase px-4 py-3">Action</th>

                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {payouts.map((store) => (
                      <tr key={store.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900">{store.name}</p>
                          <p className="text-xs text-gray-500">{store.slug}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {store.full_name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {store.email || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {store.phone || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-semibold text-gray-900">{Number(store.wallet_balance || 0).toFixed(2)} TND</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              const confirmed = window.confirm('Confirmer le paiement en espèces et réinitialiser le solde du vendeur ?');
                              if (confirmed) {
                                markStorePaid.mutate({ storeId: store.id });
                              }
                            }}
                            disabled={markStorePaid.isLoading}
                            className="rounded-full bg-primary-600 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                          >
                            {markStorePaid.isLoading ? 'En cours...' : 'Marquer payé'}
                          </button>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            {settlementsLoading ? (
              <div className="flex justify-center py-10"><LoadingSpinner /></div>
            ) : !settlements || settlements.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <p className="text-lg font-medium">Aucun règlement enregistré pour l'instant.</p>
                <p className="mt-2">Les règlements apparaîtront ici après validation côté administrateur.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Boutique</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Vendeur</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Montant</th>
                      <th className="text-right text-xs font-semibold text-gray-500 uppercase px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {settlements.map((settlement) => (
                      <tr key={settlement.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-700">{settlement.store_name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{settlement.seller_name || '-'}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">{Number(settlement.amount || 0).toFixed(2)} TND</td>
                        <td className="px-4 py-3 text-right text-sm text-gray-500">{new Date(settlement.created_at).toLocaleString('fr-FR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
