import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, CheckCheck } from 'lucide-react';
import { useSubscriptionNotifications, useMarkSubscriptionNotificationRead } from '../../hooks/useNotifications';
import type { SubscriptionNotification } from '../../lib/types';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationDropdown({ isOpen, onClose }: NotificationDropdownProps) {
  const [showAll, setShowAll] = useState(false);
  const { data: notifications = [] } = useSubscriptionNotifications({ enabled: isOpen });
  const { mutate: markAsRead } = useMarkSubscriptionNotificationRead();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setShowAll(false);
    }
  }, [isOpen]);

  const handleMarkAsRead = (notification: SubscriptionNotification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'renewal':
        return '🔄';
      case 'expiration':
        return '⏰';
      case 'payment':
        return '💳';
      case 'alert':
        return '⚠️';
      default:
        return '📌';
    }
  };

  if (!isOpen) return null;

  const visibleNotifications = showAll ? notifications : notifications.slice(0, 4);

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[calc(100vh-10rem)] overflow-y-auto"
    >
      {/* Header */}
      <div className="sticky top-0 bg-gradient-to-r from-primary-600 to-primary-700 text-white p-4 flex justify-between items-center border-b">
        <h3 className="font-semibold">Notifications</h3>
        <button
          onClick={onClose}
          className="text-white hover:bg-primary-800 p-1 rounded"
        >
          <X size={18} />
        </button>
      </div>

      {/* Notifications List */}
      <div className="divide-y">
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Bell size={32} className="mx-auto mb-2 opacity-50" />
            <p>Aucune notification</p>
          </div>
        ) : (
          visibleNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 hover:bg-gray-50 cursor-pointer transition ${
                !notification.is_read ? 'bg-blue-50' : ''
              }`}
              onClick={() => handleMarkAsRead(notification)}
            >
              <div className="flex gap-3">
                <span className="text-xl">{getNotificationIcon(notification.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-semibold text-sm text-gray-900 truncate">
                      {notification.title}
                    </h4>
                    {!notification.is_read && (
                      <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5"></span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {notification.message}
                  </p>
                  <span className="text-xs text-gray-400 mt-1 block">
                    {new Date(notification.created_at).toLocaleDateString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="sticky bottom-0 bg-gray-50 p-3 border-t text-center">
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            className="text-sm text-primary-600 font-semibold hover:text-primary-700"
          >
            {showAll ? 'Voir moins' : 'Voir toutes les notifications'}
          </button>
        </div>
      )}
    </div>
  );
}
