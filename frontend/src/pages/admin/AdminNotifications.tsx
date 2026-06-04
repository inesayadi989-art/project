import { Bell, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSubscriptionNotifications, useMarkSubscriptionNotificationRead } from '../../hooks/useNotifications';
import AdminLayout from './AdminLayout';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';

export default function AdminNotifications() {
  const { data: notifications, isLoading, isError } = useSubscriptionNotifications();
  const markReadMutation = useMarkSubscriptionNotificationRead();

  const handleMarkRead = async (notificationId: string | number) => {
    try {
      await markReadMutation.mutateAsync(notificationId);
      toast.success('Notification marquée comme lue');
    } catch (error) {
      console.error('Mark read failed', error);
      toast.error('Impossible de marquer la notification comme lue');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary-50 p-3 text-primary-700">
              <Bell size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Notifications administrateur</h1>
              <p className="text-sm text-gray-500">Consultez les demandes d’abonnement, les paiements validés et les alertes importantes.</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          {isLoading ? (
            <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
          ) : isError ? (
            <p className="text-sm text-red-500">Impossible de charger les notifications. Réessayez plus tard.</p>
          ) : !notifications || notifications.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="text-lg font-medium">Aucune notification</p>
              <p className="mt-2">Les notifications de demande d’abonnement ou de paiement apparaîtront ici.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div key={notification.id} className={`rounded-3xl border p-5 ${notification.is_read ? 'border-gray-200 bg-gray-50' : 'border-primary-200 bg-primary-50'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-primary-700" />
                        <h2 className="text-lg font-semibold text-gray-900">{notification.title}</h2>
                      </div>
                      <p className="mt-3 text-sm text-gray-700">{notification.message}</p>
                    </div>
                    <div className="text-right text-sm text-gray-500 space-y-2">
                      <p>{format(new Date(notification.created_at), 'd MMM yyyy HH:mm', { locale: fr })}</p>
                      {!notification.is_read && (
                        <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">Non lu</span>
                      )}
                    </div>
                  </div>
                  {!notification.is_read && (
                    <div className="mt-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleMarkRead(notification.id)}
                        disabled={markReadMutation.isLoading}
                        className="rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Marquer comme lu
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
