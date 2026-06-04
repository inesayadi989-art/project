import { useEffect, useState } from "react";
import { api } from '../../lib/api';
import AdminLayout from './AdminLayout';
import { CheckCircle, XCircle, Clock, RefreshCw, User, CreditCard, Calendar, MessageSquare } from 'lucide-react';

export default function AdminSubscriptions() {
  const [allRequests, setAllRequests] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'accepted' | 'rejected'>('pending');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res: any = await api.request('/subscriptions/admin/all-requests');
      setAllRequests(res.requests || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load subscription requests', err);
      setError('Impossible de charger les demandes');
      setAllRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleAction = async (id: number, approved: boolean) => {
    try {
      setActionLoading(id);
      if (approved) {
        const ok = window.confirm('Confirmer l\'approbation de cette demande ?');
        if (!ok) return;
        await api.request(`/subscriptions/admin/requests/${id}`, { method: 'PUT', body: { approved: true } });
      } else {
        const reason = window.prompt('Raison du rejet (facultatif) :');
        const ok = window.confirm('Confirmer le rejet de cette demande ?');
        if (!ok) return;
        await api.request(`/subscriptions/admin/requests/${id}`, { method: 'PUT', body: { approved: false, reason } });
      }
      setAllRequests(prev =>
        (prev || []).map(r => r.id === id ? { ...r, status: approved ? 'active' : 'rejected' } : r)
      );
    } catch (err) {
      alert('Erreur lors de la mise à jour. Réessayez.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRenew = async (id: number) => {
    try {
      const ok = window.confirm('Renouveler cet abonnement pour 30 jours et réactiver les produits du vendeur ?');
      if (!ok) return;
      setActionLoading(id);
      const response: any = await api.request(`/subscriptions/admin/renew/${id}`, { method: 'PUT' });
      setAllRequests(prev => (prev || []).map(r => r.id === id ? { ...r, status: 'active', end_date: new Date(Date.now() + 30*24*3600*1000).toISOString() } : r));
      alert(`✅ ${response?.message || 'Abonnement renouvelé et produits réactivés.'}`);
    } catch (err) {
      console.error('Failed to renew subscription', err);
      alert('Erreur lors du renouvellement.');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingRequests  = (allRequests || []).filter(r => r.status === 'pending_admin');
  const acceptedRequests = (allRequests || []).filter(r => r.status === 'active');
  const rejectedRequests = (allRequests || []).filter(r => r.status === 'rejected');

  const displayedRequests =
    activeTab === 'pending'  ? pendingRequests  :
    activeTab === 'accepted' ? acceptedRequests :
    rejectedRequests;

  const tabs = [
    { key: 'pending',  label: 'En attente', count: pendingRequests.length,  icon: Clock,       color: '#E67E22', bg: '#FFF4ED', border: '#E67E22' },
    { key: 'accepted', label: 'Acceptées',  count: acceptedRequests.length, icon: CheckCircle, color: '#27AE60', bg: '#EAFAF1', border: '#27AE60' },
    { key: 'rejected', label: 'Rejetées',   count: rejectedRequests.length, icon: XCircle,     color: '#E74C3C', bg: '#FDEDEC', border: '#E74C3C' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 p-1">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Demandes d'abonnement</h2>
          <p className="text-sm text-gray-500 mt-0.5">Gérez les demandes des vendeurs</p>
        </div>
        <button
          onClick={fetchRequests}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-3 gap-4">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <div
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className="cursor-pointer rounded-2xl p-4 border-2 transition-all"
              style={{
                background: activeTab === tab.key ? tab.bg : 'white',
                borderColor: activeTab === tab.key ? tab.border : '#F3F4F6',
                boxShadow: activeTab === tab.key ? `0 4px 16px ${tab.color}22` : '0 2px 8px rgba(0,0,0,0.06)'
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: tab.bg }}>
                  <Icon size={18} style={{ color: tab.color }} />
                </div>
                <span className="text-2xl font-bold" style={{ color: tab.color }}>{tab.count}</span>
              </div>
              <p className="text-sm font-semibold text-gray-700">{tab.label}</p>
            </div>
          );
        })}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#F3F4F6' }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: isActive ? 'white' : 'transparent',
                color: isActive ? tab.color : '#6B7280',
                boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <Icon size={14} />
              {tab.label}
              <span className="px-1.5 py-0.5 rounded-full text-xs font-bold"
                style={{ background: isActive ? tab.bg : '#E5E7EB', color: isActive ? tab.color : '#6B7280' }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-10 h-10 border-4 border-gray-200 rounded-full animate-spin"
            style={{ borderTopColor: '#9B59B6' }} />
          <p className="text-sm text-gray-500">Chargement des demandes…</p>
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-100">
          <XCircle size={20} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : displayedRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: '#F3F4F6' }}>
            <Clock size={28} className="text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">
            {activeTab === 'pending'  && 'Aucune demande en attente'}
            {activeTab === 'accepted' && 'Aucune demande acceptée'}
            {activeTab === 'rejected' && 'Aucune demande rejetée'}
          </p>
          <p className="text-sm text-gray-400">Les demandes apparaîtront ici</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedRequests.map((r: any) => (
            <div key={r.id}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all hover:shadow-md"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>

              {/* Card Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #E74C3C, #9B59B6)' }}>
                    {(r.seller_name || 'V')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{r.seller_name || 'Vendeur #' + r.seller_id}</p>
                    <p className="text-xs text-gray-500">{r.seller_email || ''}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Status badge */}
                  {r.status === 'pending_admin' && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                      style={{ background: '#FFF4ED', color: '#E67E22' }}>
                      <Clock size={11} /> En attente
                    </span>
                  )}
                  {r.status === 'active' && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                      style={{ background: '#EAFAF1', color: '#27AE60' }}>
                      <CheckCircle size={11} /> Acceptée
                    </span>
                  )}
                  {r.status === 'rejected' && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                      style={{ background: '#FDEDEC', color: '#E74C3C' }}>
                      <XCircle size={11} /> Rejetée
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {r.created_at ? new Date(r.created_at).toLocaleString('fr-FR') : ''}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="px-5 py-4 grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: '#F5F0FF' }}>
                    <CreditCard size={14} style={{ color: '#9B59B6' }} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Plan</p>
                    <p className="text-sm font-semibold text-gray-800">{r.plan_name || 'Souk Business'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: '#FFF0EE' }}>
                    <span className="text-sm font-bold" style={{ color: '#E74C3C' }}>DT</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Montant</p>
                    <p className="text-sm font-semibold text-gray-800">{r.amount} TND</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: '#F0F9FF' }}>
                    <MessageSquare size={14} style={{ color: '#2E86C1' }} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Commentaire</p>
                    <p className="text-sm font-medium text-gray-600">
                      {r.comment || <span className="text-gray-400 italic">Aucun</span>}
                    </p>
                  </div>
                </div>
              </div>

              {/* Raison rejet */}
              {r.rejected_reason && (
                <div className="mx-5 mb-4 px-4 py-3 rounded-xl flex items-start gap-2"
                  style={{ background: '#FDEDEC' }}>
                  <XCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">
                    <span className="font-semibold">Raison : </span>{r.rejected_reason}
                  </p>
                </div>
              )}

              {/* Actions */}
              {r.status === 'pending_admin' && (
                <div className="px-5 pb-4 flex gap-2">
                  <button
                    onClick={() => handleAction(r.id, true)}
                    disabled={actionLoading === r.id}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #27AE60, #1E8449)' }}
                  >
                    <CheckCircle size={15} />
                    {actionLoading === r.id ? 'En cours...' : 'Approuver'}
                  </button>
                  <button
                    onClick={() => handleAction(r.id, false)}
                    disabled={actionLoading === r.id}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #E74C3C, #C0392B)' }}
                  >
                    <XCircle size={15} />
                    Rejeter
                  </button>
                </div>
              )}
              {r.status === 'expired' && (
                <div className="px-5 pb-4 flex gap-2">
                  <button
                    onClick={() => handleRenew(r.id)}
                    disabled={actionLoading === r.id}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}
                  >
                    <RefreshCw size={15} />
                    {actionLoading === r.id ? 'En cours...' : 'Renouveler'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      </div>
    </AdminLayout>
  );
}