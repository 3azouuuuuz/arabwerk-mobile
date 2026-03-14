import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import {
  BackHandler,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import CustomModal from '../../components/CustomModal';
import LoadingComponent from '../../components/LoadingComponent';
import { Notification, useNotifications } from '../../context/NotificationContext';
import { hp, wp } from '../../helpers/common';

export default function ProviderNotificationsScreen() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    isLoading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  // ── Modal states ──────────────────────────────────────────────────────────
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [markAllConfirmVisible, setMarkAllConfirmVisible] = useState(false);
  const [noUnreadModalVisible, setNoUnreadModalVisible] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  // ─────────────────────────────────────────────────────────────────────────

  // ── Hardware back button ──────────────────────────────────────────────────
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      router.back();
      return true;
    });
    return () => backHandler.remove();
  }, [router]);
  // ─────────────────────────────────────────────────────────────────────────

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshNotifications();
    setIsRefreshing(false);
  }, [refreshNotifications]);

  const handleNotificationPress = useCallback(async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.notification_id);
    }
    setSelectedNotification(notification);
    setDetailModalVisible(true);
  }, [markAsRead]);

  const handleCloseDetail = useCallback(() => {
    setDetailModalVisible(false);
    setSelectedNotification(null);
  }, []);

  // ── Delete from detail modal ──────────────────────────────────────────────
  const handleDeleteFromModal = useCallback(() => {
    if (!selectedNotification) return;
    setPendingDeleteId(selectedNotification.notification_id);
    setDetailModalVisible(false);
    setTimeout(() => setDeleteConfirmVisible(true), 300);
  }, [selectedNotification]);

  // ── Delete from list (trash icon) ────────────────────────────────────────
  const handleDeleteNotification = useCallback((notificationId: number) => {
    setPendingDeleteId(notificationId);
    setDeleteConfirmVisible(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (pendingDeleteId == null) return;
    await deleteNotification(pendingDeleteId);
    setDeleteConfirmVisible(false);
    setPendingDeleteId(null);
  }, [pendingDeleteId, deleteNotification]);

  // ── Mark all as read ──────────────────────────────────────────────────────
  const handleMarkAllAsRead = useCallback(() => {
    if (unreadCount === 0) {
      setNoUnreadModalVisible(true);
      return;
    }
    setMarkAllConfirmVisible(true);
  }, [unreadCount]);

  const confirmMarkAll = useCallback(async () => {
    await markAllAsRead();
    setMarkAllConfirmVisible(false);
  }, [markAllAsRead]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getNotificationIcon = (type: string | null) => {
    switch (type) {
      case 'info': return 'ℹ️';
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '🔔';
    }
  };

  const getNotificationColor = (type: string | null) => {
    switch (type) {
      case 'info': return '#3B82F6';
      case 'success': return '#10B981';
      case 'warning': return '#F59E0B';
      case 'error': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getModalType = (type: string | null): 'info' | 'success' | 'warning' | 'error' => {
    switch (type) {
      case 'info': return 'info';
      case 'success': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'info';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffMinutes < 1) return 'الآن';
    if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays === 1) return 'أمس';
    if (diffDays < 7) return `منذ ${diffDays} أيام`;
    return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      weekday: 'long', year: 'numeric', month: 'long',
      day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };
  // ─────────────────────────────────────────────────────────────────────────

  const renderNotification = useCallback(({ item }: { item: Notification }) => {
    const color = getNotificationColor(item.type);
    const icon = getNotificationIcon(item.type);

    return (
      <Pressable
        style={({ pressed }) => [
          styles.notificationCard,
          !item.is_read && styles.notificationCardUnread,
          pressed && styles.notificationCardPressed,
        ]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
          <Text style={styles.icon}>{icon}</Text>
        </View>

        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={styles.notificationTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {!item.is_read && <View style={styles.unreadDot} />}
          </View>

          <Text style={styles.notificationText} numberOfLines={2}>
            {item.content}
          </Text>

          <View style={styles.notificationFooter}>
            <Text style={styles.notificationDate}>{formatDate(item.created_at)}</Text>
            <Pressable onPress={() => handleNotificationPress(item)}>
              <Text style={styles.viewMoreButton}>عرض المزيد ›</Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          style={styles.deleteButton}
          onPress={() => handleDeleteNotification(item.notification_id)}
        >
          <Text style={styles.deleteIcon}>🗑️</Text>
        </Pressable>
      </Pressable>
    );
  }, [handleNotificationPress, handleDeleteNotification]);

  if (isLoading && notifications.length === 0) {
    return <LoadingComponent message="جاري تحميل الإشعارات..." />;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>الإشعارات</Text>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>

        {unreadCount > 0 ? (
          <Pressable style={styles.markAllButton} onPress={handleMarkAllAsRead}>
            <Text style={styles.markAllIcon}>✓✓</Text>
          </Pressable>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      {/* ── Stats Bar ── */}
      {notifications.length > 0 && (
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{notifications.length}</Text>
            <Text style={styles.statLabel}>إجمالي</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{unreadCount}</Text>
            <Text style={styles.statLabel}>غير مقروء</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              {notifications.length - unreadCount}
            </Text>
            <Text style={styles.statLabel}>مقروء</Text>
          </View>
        </View>
      )}

      {/* ── List ── */}
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.notification_id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#2F6FDB']}
            tintColor="#2F6FDB"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>لا توجد إشعارات</Text>
            <Text style={styles.emptyText}>سيتم عرض الإشعارات الجديدة هنا</Text>
          </View>
        }
      />

      {/* ══════════════════════════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════════════════════════ */}

      {/* ── Notification Detail Modal ── */}
      <CustomModal
        visible={detailModalVisible}
        type={selectedNotification ? getModalType(selectedNotification.type) : 'info'}
        title={selectedNotification?.title || ''}
        message={formatFullDate(selectedNotification?.created_at || new Date().toISOString())}
        primaryButtonText="إغلاق"
        secondaryButtonText="🗑️ حذف"
        onPrimaryPress={handleCloseDetail}
        onSecondaryPress={handleDeleteFromModal}
        onClose={handleCloseDetail}
        showCloseButton={true}
      >
        {selectedNotification && (
          <View style={styles.detailContent}>
            {/* Status + type badges */}
            <View style={styles.detailMetaRow}>
              <View style={[
                styles.detailBadge,
                { backgroundColor: selectedNotification.is_read ? '#ECFDF5' : '#EEF5FF' },
              ]}>
                <Text style={[
                  styles.detailBadgeText,
                  { color: selectedNotification.is_read ? '#10B981' : '#2F6FDB' },
                ]}>
                  {selectedNotification.is_read ? '✓ مقروء' : '● غير مقروء'}
                </Text>
              </View>
              {selectedNotification.type && (
                <View style={[
                  styles.detailBadge,
                  { backgroundColor: `${getNotificationColor(selectedNotification.type)}15` },
                ]}>
                  <Text style={[
                    styles.detailBadgeText,
                    { color: getNotificationColor(selectedNotification.type) },
                  ]}>
                    {getNotificationIcon(selectedNotification.type)} {selectedNotification.type}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.detailDivider} />

            <Text style={styles.detailLabel}>المحتوى</Text>
            <Text style={styles.detailBody}>{selectedNotification.content}</Text>
          </View>
        )}
      </CustomModal>

      {/* ── Delete Confirm Modal ── */}
      <CustomModal
        visible={deleteConfirmVisible}
        type="warning"
        title="تأكيد الحذف"
        message="هل تريد حذف هذا الإشعار نهائياً؟"
        primaryButtonText="حذف"
        secondaryButtonText="إلغاء"
        onPrimaryPress={confirmDelete}
        onSecondaryPress={() => setDeleteConfirmVisible(false)}
        onClose={() => setDeleteConfirmVisible(false)}
        showCloseButton={true}
      />

      {/* ── Mark All Confirm Modal ── */}
      <CustomModal
        visible={markAllConfirmVisible}
        type="confirm"
        title="تعليم الكل كمقروء"
        message="هل تريد تعليم جميع الإشعارات كمقروءة؟"
        primaryButtonText="تأكيد"
        secondaryButtonText="إلغاء"
        onPrimaryPress={confirmMarkAll}
        onSecondaryPress={() => setMarkAllConfirmVisible(false)}
        onClose={() => setMarkAllConfirmVisible(false)}
        showCloseButton={true}
      />

      {/* ── No Unread Modal ── */}
      <CustomModal
        visible={noUnreadModalVisible}
        type="info"
        title="معلومة"
        message="لا توجد إشعارات غير مقروءة"
        primaryButtonText="حسناً"
        onPrimaryPress={() => setNoUnreadModalVisible(false)}
        onClose={() => setNoUnreadModalVisible(false)}
        showCloseButton={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: wp(4), paddingTop: hp(6), paddingBottom: hp(2),
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: wp(10), height: wp(10), borderRadius: wp(5),
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
  },
  backIcon: { fontSize: wp(8), fontWeight: 'bold', color: '#1F2937', marginLeft: wp(1) },
  headerContent: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: wp(2),
  },
  headerTitle: { fontSize: wp(5), fontWeight: '700', color: '#1F2937' },
  headerBadge: {
    backgroundColor: '#EF4444', borderRadius: wp(3),
    paddingHorizontal: wp(2), paddingVertical: hp(0.3),
    minWidth: wp(6), alignItems: 'center',
  },
  headerBadgeText: { fontSize: wp(3), fontWeight: '700', color: '#FFFFFF' },
  markAllButton: {
    width: wp(10), height: wp(10), borderRadius: wp(5),
    backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center',
  },
  markAllIcon: { fontSize: wp(5), color: '#FFFFFF' },
  placeholder: { width: wp(10) },

  // ── Stats ────────────────────────────────────────────────────────────────
  statsBar: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    paddingVertical: hp(2), paddingHorizontal: wp(4),
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: wp(6), fontWeight: '800', color: '#2F6FDB', marginBottom: hp(0.3) },
  statLabel: { fontSize: wp(3), color: '#6B7280' },
  statDivider: { width: 1, backgroundColor: '#E5E7EB' },

  // ── List ─────────────────────────────────────────────────────────────────
  listContent: { padding: wp(4), paddingBottom: hp(10) },

  notificationCard: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16,
    padding: wp(4), marginBottom: hp(2), borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  notificationCardUnread: { backgroundColor: '#EEF5FF', borderColor: '#BFDBFE' },
  notificationCardPressed: { backgroundColor: '#F9FAFB', transform: [{ scale: 0.98 }] },

  iconContainer: {
    width: wp(12), height: wp(12), borderRadius: wp(6),
    justifyContent: 'center', alignItems: 'center', marginLeft: wp(3),
  },
  icon: { fontSize: wp(6) },

  notificationContent: { flex: 1 },
  notificationHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: hp(0.5),
  },
  notificationTitle: {
    fontSize: wp(4), fontWeight: '700', color: '#1F2937',
    flex: 1, textAlign: 'right',
  },
  unreadDot: {
    width: wp(2.5), height: wp(2.5), borderRadius: wp(1.25),
    backgroundColor: '#EF4444', marginRight: wp(2),
  },
  notificationText: {
    fontSize: wp(3.5), color: '#6B7280', lineHeight: hp(2.5),
    marginBottom: hp(0.5), textAlign: 'right',
  },
  notificationFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  notificationDate: { fontSize: wp(3), color: '#9CA3AF' },
  viewMoreButton: { fontSize: wp(3.5), color: '#2F6FDB', fontWeight: '600' },
  deleteButton: { padding: wp(2), justifyContent: 'center', alignItems: 'center' },
  deleteIcon: { fontSize: wp(5) },

  // ── Empty ────────────────────────────────────────────────────────────────
  emptyContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: hp(15),
  },
  emptyIcon: { fontSize: wp(20), marginBottom: hp(2) },
  emptyTitle: { fontSize: wp(5), fontWeight: '700', color: '#1F2937', marginBottom: hp(1) },
  emptyText: {
    fontSize: wp(4), color: '#6B7280', textAlign: 'center', paddingHorizontal: wp(10),
  },

  // ── Detail Modal Content (inside CustomModal children) ───────────────────
  detailContent: { width: '100%' },
  detailMetaRow: {
    flexDirection: 'row', gap: wp(2), justifyContent: 'center',
    flexWrap: 'wrap', marginBottom: hp(1.5),
  },
  detailBadge: {
    paddingHorizontal: wp(3), paddingVertical: hp(0.5), borderRadius: 20,
  },
  detailBadgeText: { fontSize: wp(3.2), fontWeight: '600' },
  detailDivider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: hp(1.5) },
  detailLabel: {
    fontSize: wp(3.5), fontWeight: '700', color: '#374151',
    textAlign: 'right', marginBottom: hp(0.8),
  },
  detailBody: {
    fontSize: wp(3.8), color: '#1F2937', lineHeight: hp(3),
    textAlign: 'right', backgroundColor: '#F9FAFB',
    borderRadius: 12, padding: wp(4),
  },
});