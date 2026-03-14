import messaging from '@react-native-firebase/messaging';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { ENV } from '../config/env';
import { useAuth } from './AuthContext';

export interface Notification {
  notification_id: number;
  user_id: number;
  title: string;
  content: string;
  type: string | null;
  notification_link: string | null;
  is_read: boolean;
  user_type: string;
  created_at: string;
  updated_at: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: number) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const tokenRegistered = useRef(false); // ✅ prevent duplicate registrations

  // ── Fetch notifications ──────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }
    try {
      setIsLoading(true);
      const response = await fetch(`${ENV.API_BASE_URL}/notifications/user/${user.id}`);
      if (response.ok) {
        const data: Notification[] = await response.json();
        const sorted = data.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setNotifications(sorted);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // ── Register FCM token ───────────────────────────────────────────────────
  const registerPushToken = useCallback(async () => {
    if (!user?.id || !token) return;
    if (tokenRegistered.current) return; // ✅ already registered this session

    try {
      // Android 13+ explicit permission
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Notification permission denied by user');
          return;
        }
      }

      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.log('FCM permission not granted');
        return;
      }

      const fcmToken = await messaging().getToken();
      if (!fcmToken) {
        console.log('Failed to get FCM token');
        return;
      }

      console.log('FCM Token obtained:', fcmToken);

      const response = await fetch(`${ENV.API_BASE_URL}/push-tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token: fcmToken }),
      });

      if (response.ok) {
        tokenRegistered.current = true; // ✅ mark as registered
        console.log('FCM token saved to backend successfully');
      } else {
        console.error('Failed to save FCM token, status:', response.status);
      }
    } catch (error) {
      console.error('Failed to register push token:', error);
    }
  }, [user?.id, token]);

  // ── Reset registration flag on logout ───────────────────────────────────
  useEffect(() => {
    if (!user?.id) {
      tokenRegistered.current = false;
      setNotifications([]);
    }
  }, [user?.id]);

  // ── Firebase listeners + token registration ──────────────────────────────
  useEffect(() => {
    if (!user?.id || !token) return;

    registerPushToken();

    // Foreground messages
    const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
      console.log('Foreground push received:', remoteMessage);
      fetchNotifications();
    });

    // Background tap
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Notification opened from background:', remoteMessage);
      fetchNotifications();
    });

    // Quit state tap
    messaging().getInitialNotification().then(remoteMessage => {
      if (remoteMessage) {
        console.log('App opened from quit state:', remoteMessage);
        fetchNotifications();
      }
    });

    return () => {
      unsubscribeForeground();
    };
  }, [user?.id, token, registerPushToken, fetchNotifications]);

  // ── Periodic fetch ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user?.id, fetchNotifications]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      const response = await fetch(
        `${ENV.API_BASE_URL}/notifications/mark-as-read/${notificationId}`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' } }
      );
      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => (n.notification_id === notificationId ? { ...n, is_read: true } : n))
        );
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id || unreadCount === 0) return;
    try {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(
        unread.map(n =>
          fetch(`${ENV.API_BASE_URL}/notifications/mark-as-read/${n.notification_id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
          })
        )
      );
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, [user?.id, notifications, unreadCount]);

  const deleteNotification = useCallback(async (notificationId: number) => {
    try {
      const response = await fetch(`${ENV.API_BASE_URL}/notifications/${notificationId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.notification_id !== notificationId));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        refreshNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};