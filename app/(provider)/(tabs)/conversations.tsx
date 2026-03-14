import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LoadingComponent from '../../../components/LoadingComponent';
import Template from '../../../components/Template';
import { ENV } from '../../../config/env';
import { useAuth } from '../../../context/AuthContext';
import { hp, wp } from '../../../helpers/common';

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  message: string;
  timestamp: string;
  is_read: boolean;
}

interface User {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  last_online: string;
}

interface Conversation {
  id: number;
  name: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
  avatar: string;
}

export default function Conversations() {
  const router = useRouter();
  const { user, token } = useAuth();
  const userId = user?.id;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = useCallback(() => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }, [token]);

  const fetchConversations = useCallback(async () => {
    if (!userId) { setConversations([]); setIsLoading(false); return; }
    if (!token) { setIsLoading(false); setError('خطأ في المصادقة. الرجاء تسجيل الدخول مرة أخرى.'); return; }

    try {
      setError(null);

      const messagesRes = await fetch(`${ENV.API_BASE_URL}/messages`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!messagesRes.ok) {
        if (messagesRes.status === 401) {
          setError('انتهت صلاحية الجلسة. الرجاء تسجيل الدخول مرة أخرى.');
          setIsLoading(false); setIsRefreshing(false); return;
        }
        throw new Error(`Failed to fetch messages: ${messagesRes.status}`);
      }

      const allMessages: Message[] = await messagesRes.json();
      const userMessages = allMessages.filter(
        (msg) => msg.sender_id === userId || msg.receiver_id === userId
      );

      if (userMessages.length === 0) {
        setConversations([]); setIsLoading(false); setIsRefreshing(false); return;
      }

      const conversationsMap = new Map<number, Message>();
      for (const msg of userMessages.reverse()) {
        const otherUserId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
        if (!conversationsMap.has(otherUserId)) conversationsMap.set(otherUserId, msg);
      }

      const otherUserIds = Array.from(conversationsMap.keys());

      const usersRes = await fetch(`${ENV.API_BASE_URL}/users/public`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (!usersRes.ok) throw new Error(`Failed to fetch users: ${usersRes.status}`);
      const allUsers: User[] = await usersRes.json();

      const unreadCounts = new Map<number, number>();
      userMessages.forEach((msg) => {
        if (msg.receiver_id === userId && !msg.is_read) {
          unreadCounts.set(msg.sender_id, (unreadCounts.get(msg.sender_id) || 0) + 1);
        }
      });

      const conversationsList: Conversation[] = allUsers
        .filter((u) => otherUserIds.includes(u.id))
        .map((u) => {
          const lastMsg = conversationsMap.get(u.id)!;
          const diffMinutes = (Date.now() - new Date(u.last_online).getTime()) / 60000;
          return {
            id: u.id,
            name: `${u.firstname} ${u.lastname}`,
            lastMessage: lastMsg.message,
            lastMessageTime: lastMsg.timestamp,
            unreadCount: unreadCounts.get(u.id) || 0,
            isOnline: diffMinutes < 5,
            avatar: u.firstname.charAt(0).toUpperCase(),
          };
        })
        .sort((a, b) =>
          new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
        );

      setConversations(conversationsList);
    } catch (err) {
      console.error('❌ Error fetching conversations:', err);
      setError(err instanceof Error ? err.message : 'حدث خطأ في تحميل المحادثات');
      if (!isRefreshing) {
        Alert.alert('خطأ في التحميل', 'فشل تحميل المحادثات. الرجاء المحاولة مرة أخرى.', [{ text: 'حسناً' }]);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userId, token, isRefreshing, getAuthHeaders]);

  useEffect(() => {
    if (userId && token) {
      fetchConversations();
      const interval = setInterval(fetchConversations, 5000);
      return () => clearInterval(interval);
    } else {
      setIsLoading(false);
    }
  }, [userId, token, fetchConversations]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchConversations();
  }, [fetchConversations]);

  // ── Mark messages from this sender as read, then navigate ──
  const handleConversationPress = useCallback(async (conversation: Conversation) => {
    // Optimistically clear unread badge in UI immediately
    if (conversation.unreadCount > 0) {
      setConversations((prev) =>
        prev.map((c) => (c.id === conversation.id ? { ...c, unreadCount: 0 } : c))
      );

      // Notify backend
      try {
        await fetch(
          `${ENV.API_BASE_URL}/messages/read?senderId=${conversation.id}`,
          {
            method: 'PATCH',
            headers: getAuthHeaders(),
          }
        );
      } catch (err) {
        console.warn('Failed to mark messages as read:', err);
        // Non-critical — don't block navigation
      }
    }

    router.push({
      pathname: '/(provider)/chat',
      params: { receiverId: String(conversation.id) },
    });
  }, [router, getAuthHeaders]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = Math.abs(now.getTime() - date.getTime());
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24)
      return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  };

  const renderConversation = useCallback(({ item }: { item: Conversation }) => (
    <Pressable
      style={({ pressed }) => [styles.conversationCard, pressed && styles.conversationCardPressed]}
      onPress={() => handleConversationPress(item)}
    >
      <View style={styles.avatarContainer}>
        <View style={[styles.avatar, item.unreadCount > 0 && styles.avatarUnread]}>
          <Text style={[styles.avatarText, item.unreadCount > 0 && styles.avatarTextUnread]}>
            {item.avatar}
          </Text>
        </View>
        {item.isOnline && <View style={styles.onlineIndicator} />}
      </View>

      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={[styles.personName, item.unreadCount > 0 && styles.personNameUnread]}>
            {item.name}
          </Text>
          <Text style={styles.timestamp}>{formatTimestamp(item.lastMessageTime)}</Text>
        </View>

        <View style={styles.conversationBody}>
          <View style={styles.messagePreview}>
            <Text
              style={[styles.lastMessage, item.unreadCount > 0 && styles.lastMessageUnread]}
              numberOfLines={1}
            >
              {item.lastMessage}
            </Text>
          </View>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.arrowContainer}>
        <Text style={styles.arrow}>›</Text>
      </View>
    </Pressable>
  ), [handleConversationPress]);

  if (isLoading) return <LoadingComponent message="جاري تحميل المحادثات..." />;

  const unreadConversationsCount = conversations.filter(c => c.unreadCount > 0).length;

  return (
    <Template bg="#F9FAFB">
      <View style={styles.container}>
        <StatusBar style="dark" />

        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>المحادثات</Text>
          <View style={styles.headerStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{conversations.length}</Text>
              <Text style={styles.statLabel}>محادثة</Text>
            </View>
            {unreadConversationsCount > 0 && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: '#EF4444' }]}>
                    {unreadConversationsCount}
                  </Text>
                  <Text style={styles.statLabel}>غير مقروء</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={fetchConversations}>
              <Text style={styles.retryButtonText}>إعادة المحاولة</Text>
            </Pressable>
          </View>
        )}

        {!error && (
          <FlatList
            data={conversations}
            renderItem={renderConversation}
            keyExtractor={(item) => item.id.toString()}
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
                <Text style={styles.emptyIcon}>💬</Text>
                <Text style={styles.emptyTitle}>لا توجد محادثات</Text>
                <Text style={styles.emptySubtitle}>
                  ستظهر هنا محادثاتك مع العملاء
                </Text>
              </View>
            }
          />
        )}
      </View>
    </Template>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  headerSection: {
    paddingHorizontal: wp(6), paddingVertical: hp(2),
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: wp(6), fontWeight: '700', color: '#1F2937', marginBottom: hp(1), textAlign: 'right' },
  headerStats: { flexDirection: 'row', alignItems: 'center', gap: wp(4) },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: wp(2) },
  statValue: { fontSize: wp(4.5), fontWeight: '700', color: '#2F6FDB' },
  statLabel: { fontSize: wp(3.5), color: '#6B7280' },
  statDivider: { width: 1, height: hp(2), backgroundColor: '#E5E7EB' },

  errorContainer: {
    backgroundColor: '#FEE2E2', padding: wp(4), margin: wp(4),
    borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#FCA5A5',
  },
  errorIcon: { fontSize: wp(10), marginBottom: hp(1) },
  errorText: { fontSize: wp(3.5), color: '#DC2626', textAlign: 'center', marginBottom: hp(1.5) },
  retryButton: { backgroundColor: '#DC2626', paddingHorizontal: wp(6), paddingVertical: hp(1), borderRadius: 8 },
  retryButtonText: { fontSize: wp(3.5), fontWeight: '600', color: '#FFFFFF' },

  listContent: { padding: wp(4), paddingBottom: hp(10) },

  conversationCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: wp(4),
    marginBottom: hp(2), flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  conversationCardPressed: { opacity: 0.7, backgroundColor: '#F9FAFB', transform: [{ scale: 0.98 }] },

  avatarContainer: { position: 'relative', marginLeft: wp(3) },
  avatar: {
    width: wp(14), height: wp(14), borderRadius: wp(7),
    backgroundColor: '#EEF5FF', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#E5E7EB',
  },
  avatarUnread: { backgroundColor: '#2F6FDB', borderColor: '#2F6FDB' },
  avatarText: { fontSize: wp(6), fontWeight: '700', color: '#2F6FDB' },
  avatarTextUnread: { color: '#FFFFFF' },
  onlineIndicator: {
    position: 'absolute', bottom: 0, right: 0,
    width: wp(4), height: wp(4), borderRadius: wp(2),
    backgroundColor: '#10B981', borderWidth: 2, borderColor: '#FFFFFF',
  },

  conversationContent: { flex: 1 },
  conversationHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: hp(0.5),
  },
  personName: { fontSize: wp(4.2), fontWeight: '600', color: '#1F2937', flex: 1, textAlign: 'right', paddingRight: wp(13) },
  personNameUnread: { fontWeight: '700' },
  timestamp: { fontSize: wp(3), color: '#9CA3AF', marginRight: wp(2) },

  conversationBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  messagePreview: { flex: 1, marginLeft: wp(2) },
  lastMessage: { fontSize: wp(3.5), color: '#6B7280', lineHeight: hp(2.5), textAlign: 'right' },
  lastMessageUnread: { fontWeight: '600', color: '#374151' },

  unreadBadge: {
    backgroundColor: '#EF4444', borderRadius: wp(3),
    minWidth: wp(6), height: wp(6),
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: wp(2),
  },
  unreadText: { fontSize: wp(3), fontWeight: '700', color: '#FFFFFF' },

  arrowContainer: { marginRight: wp(2) },
  arrow: { fontSize: wp(6), color: '#D1D5DB', fontWeight: 'bold' },

  emptyContainer: { alignItems: 'center', paddingVertical: hp(15) },
  emptyIcon: { fontSize: wp(20), marginBottom: hp(2) },
  emptyTitle: { fontSize: wp(5), fontWeight: '700', color: '#1F2937', marginBottom: hp(1) },
  emptySubtitle: { fontSize: wp(3.5), color: '#6B7280', textAlign: 'center', paddingHorizontal: wp(10), lineHeight: hp(2.5) },
});