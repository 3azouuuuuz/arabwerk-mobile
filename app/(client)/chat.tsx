import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ENV } from '../../config/env';
import { useAuth } from '../../context/AuthContext';
import { hp, wp } from '../../helpers/common';

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  message: string;
  timestamp: string;
  is_read: boolean;
}

interface ReceiverInfo {
  id: number;
  firstname: string;
  lastname: string;
  last_online: string;
  role?: string;
}

export default function ChatScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { receiverId } = useLocalSearchParams<{ receiverId: string }>();
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [receiver, setReceiver] = useState<ReceiverInfo | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedStars, setSelectedStars] = useState(0);
  const [existingRatingId, setExistingRatingId] = useState<number | null>(null);
  const [currentRating, setCurrentRating] = useState(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [ratingSuccess, setRatingSuccess] = useState(false);

  const authHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // ── Hardware back button ─────────────────────────────────────────────────
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      router.back();
      return true;
    });
    return () => backHandler.remove();
  }, [router]);
  // ────────────────────────────────────────────────────────────────────────

  // ── Keyboard listeners ───────────────────────────────────────────────────
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: any) => {
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    };
    const onHide = () => setKeyboardHeight(0);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);
  // ────────────────────────────────────────────────────────────────────────

  const markMessagesAsRead = useCallback(async () => {
    if (!receiverId || !token) return;
    try {
      await fetch(`${ENV.API_BASE_URL}/messages/read?senderId=${receiverId}`, {
        method: 'PATCH',
        headers: authHeaders,
      });
    } catch (e) {
      console.warn('Failed to mark messages as read:', e);
    }
  }, [receiverId, token]);

  const fetchReceiver = useCallback(async () => {
    if (!receiverId) return;
    try {
      const res = await fetch(`${ENV.API_BASE_URL}/users/public`, { headers: authHeaders });
      if (res.ok) {
        const users: ReceiverInfo[] = await res.json();
        const found = users.find(u => u.id === Number(receiverId));
        if (found) {
          setReceiver(found);
          const diffMins = (Date.now() - new Date(found.last_online).getTime()) / 60000;
          setIsOnline(diffMins < 5);
        }
      }
    } catch (e) {
      console.error('Error fetching receiver:', e);
    }
  }, [receiverId]);

  const fetchMessages = useCallback(async () => {
    if (!user?.id || !receiverId) return;
    try {
      const res = await fetch(`${ENV.API_BASE_URL}/messages?withUser=${receiverId}`, { headers: authHeaders });
      if (res.ok) {
        const data: Message[] = await res.json();
        setMessages(data);
      }
    } catch (e) {
      console.error('Error fetching messages:', e);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, receiverId]);

  const fetchExistingRating = useCallback(async () => {
    if (!user?.id || !receiverId) return;
    try {
      const res = await fetch(
        `${ENV.API_BASE_URL}/ratings?provider_id=${receiverId}&user_id=${user.id}`,
        { headers: authHeaders }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setExistingRatingId(data[0].id);
          setCurrentRating(data[0].rating);
          setSelectedStars(data[0].rating);
        }
      }
    } catch (e) {
      console.error('Error fetching existing rating:', e);
    }
  }, [user?.id, receiverId]);

  useEffect(() => {
    fetchReceiver();
    fetchMessages();
    markMessagesAsRead();
    fetchExistingRating();

    const interval = setInterval(() => {
      fetchMessages();
      markMessagesAsRead();
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchReceiver, fetchMessages, markMessagesAsRead, fetchExistingRating]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    const text = messageText.trim();
    if (!text || !user?.id || !receiverId || isSending) return;

    const optimistic: Message = {
      id: Date.now(),
      sender_id: user.id,
      receiver_id: Number(receiverId),
      message: text,
      timestamp: new Date().toISOString(),
      is_read: false,
    };
    setMessages(prev => [...prev, optimistic]);
    setMessageText('');

    try {
      setIsSending(true);
      await fetch(`${ENV.API_BASE_URL}/messages`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ receiver_id: Number(receiverId), message: text }),
      });
      await fetchMessages();
    } catch (e) {
      console.error('Error sending message:', e);
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setMessageText(text);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmitRating = async () => {
    if (!selectedStars || !user?.id || !receiverId) return;
    setIsSubmittingRating(true);
    try {
      if (existingRatingId) {
        await fetch(`${ENV.API_BASE_URL}/ratings/${existingRatingId}`, {
          method: 'PATCH',
          headers: authHeaders,
          body: JSON.stringify({ rating: selectedStars }),
        });
      } else {
        await fetch(`${ENV.API_BASE_URL}/ratings`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            provider_id: String(receiverId),
            user_id: String(user.id),
            rating: selectedStars,
          }),
        });
      }
      setCurrentRating(selectedStars);
      setRatingSuccess(true);
      setTimeout(() => {
        setRatingSuccess(false);
        setRatingModalVisible(false);
        fetchExistingRating();
      }, 1200);
    } catch (e) {
      console.error('Error submitting rating:', e);
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const openRatingModal = () => {
    setSelectedStars(currentRating || 0);
    setRatingSuccess(false);
    setRatingModalVisible(true);
  };

  const formatTime = (ts: string) => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  };

  const formatDaySeparator = (ts: string) => {
    const msgDate = new Date(ts);
    const now = new Date();
    const msgDay = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.floor((today.getTime() - msgDay.getTime()) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return msgDate.toLocaleDateString('en-GB', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const shouldShowSeparator = (index: number): boolean => {
    if (index === 0) return true;
    const curr = new Date(messages[index].timestamp).toDateString();
    const prev = new Date(messages[index - 1].timestamp).toDateString();
    return curr !== prev;
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.sender_id === user?.id;
    const showSep = shouldShowSeparator(index);
    const isLastInGroup =
      index === messages.length - 1 || messages[index + 1].sender_id !== item.sender_id;

    return (
      <>
        {showSep && (
          <View style={styles.dateSeparator}>
            <View style={styles.dateSepLine} />
            <Text style={styles.dateSepText}>{formatDaySeparator(item.timestamp)}</Text>
            <View style={styles.dateSepLine} />
          </View>
        )}
        <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowThem]}>
          {!isMe && (
            <View style={[styles.msgAvatar, !isLastInGroup && styles.msgAvatarHidden]}>
              <Text style={styles.msgAvatarText}>
                {receiver?.firstname?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <View style={[styles.bubbleWrapper, isMe ? styles.bubbleWrapperMe : styles.bubbleWrapperThem]}>
            <View style={[
              styles.bubble,
              isMe ? styles.bubbleMe : styles.bubbleThem,
              isLastInGroup && isMe && styles.bubbleMeTail,
              isLastInGroup && !isMe && styles.bubbleThemTail,
            ]}>
              <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
                {item.message}
              </Text>
            </View>
            {isLastInGroup && (
              <View style={[styles.metaRow, isMe ? styles.metaRowMe : styles.metaRowThem]}>
                <Text style={styles.metaTime}>{formatTime(item.timestamp)}</Text>
                {isMe && (
                  <Ionicons
                    name={item.is_read ? 'checkmark-done' : 'checkmark'}
                    size={wp(3.5)}
                    color={item.is_read ? '#2F6FDB' : '#9CA3AF'}
                  />
                )}
              </View>
            )}
          </View>
        </View>
      </>
    );
  };

  const receiverName = receiver ? `${receiver.firstname} ${receiver.lastname}` : 'Loading...';
  const HEADER_HEIGHT = hp(6) + hp(1.5) + wp(10);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? HEADER_HEIGHT : 0}
      enabled
    >
      <StatusBar style="dark" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={wp(6)} color="#1F2937" />
        </Pressable>

        <View style={styles.headerCenter}>
          <View style={styles.headerAvatarWrap}>
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>
                {receiver?.firstname?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
            {isOnline && <View style={styles.headerOnlineDot} />}
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>{receiverName}</Text>
            <Text style={[styles.headerStatus, isOnline && styles.headerStatusOnline]}>
              {isOnline ? '● Online' : '● Offline'}
            </Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.ratingBtn, pressed && { opacity: 0.6 }]}
          onPress={openRatingModal}
        >
          <Ionicons
            name={currentRating > 0 ? 'star' : 'star-outline'}
            size={wp(5.5)}
            color={currentRating > 0 ? '#F59E0B' : '#9CA3AF'}
          />
          {currentRating > 0 && <Text style={styles.ratingBtnText}>{currentRating}</Text>}
        </Pressable>
      </View>

      {/* ── Messages ── */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2F6FDB" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="chatbubble-ellipses-outline" size={wp(14)} color="#CBD5E1" />
          </View>
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptySubtitle}>Say hello to {receiver?.firstname || 'them'}!</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        />
      )}

      {/* ── Input Bar ── */}
      <View style={[
        styles.inputBar,
        Platform.OS === 'android' && keyboardHeight > 0
          ? { marginBottom: keyboardHeight }
          : { paddingBottom: Math.max(insets.bottom, hp(1.5)) },
      ]}>
        <TextInput
          style={styles.input}
          placeholder="Write a message..."
          placeholderTextColor="#9CA3AF"
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={1000}
        />
        <Pressable
          style={({ pressed }) => [
            styles.sendBtn,
            (!messageText.trim() || isSending) && styles.sendBtnDisabled,
            pressed && messageText.trim() && styles.sendBtnPressed,
          ]}
          onPress={handleSend}
          disabled={!messageText.trim() || isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={wp(5)} color="#FFFFFF" />
          )}
        </Pressable>
      </View>

      {/* ── Rating Modal ── */}
      <Modal
        visible={ratingModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRatingModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setRatingModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {ratingSuccess ? (
              <View style={styles.successContainer}>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark-circle" size={wp(16)} color="#10B981" />
                </View>
                <Text style={styles.successTitle}>Rating Submitted!</Text>
                <Text style={styles.successSubtitle}>
                  You rated {receiver?.firstname} {selectedStars} ⭐
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalAvatarWrap}>
                    <Text style={styles.modalAvatarText}>
                      {receiver?.firstname?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                  </View>
                  <View style={styles.modalHeaderInfo}>
                    <Text style={styles.modalTitle}>Rate Provider</Text>
                    <Text style={styles.modalSubtitle}>{receiverName}</Text>
                  </View>
                  <Pressable style={styles.modalCloseBtn} onPress={() => setRatingModalVisible(false)}>
                    <Ionicons name="close" size={wp(5)} color="#9CA3AF" />
                  </Pressable>
                </View>

                {existingRatingId && (
                  <View style={styles.existingRatingHint}>
                    <Ionicons name="information-circle-outline" size={wp(4)} color="#2F6FDB" />
                    <Text style={styles.existingRatingHintText}>
                      You already rated this provider. Tap to update.
                    </Text>
                  </View>
                )}

                <Text style={styles.ratingPrompt}>How was your experience?</Text>

                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Pressable
                      key={star}
                      onPress={() => setSelectedStars(star)}
                      style={({ pressed }) => [styles.starBtn, pressed && { transform: [{ scale: 1.2 }] }]}
                    >
                      <Ionicons
                        name={star <= selectedStars ? 'star' : 'star-outline'}
                        size={wp(10)}
                        color={star <= selectedStars ? '#F59E0B' : '#D1D5DB'}
                      />
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.starLabel}>
                  {selectedStars === 0 && 'Tap a star to rate'}
                  {selectedStars === 1 && 'Poor'}
                  {selectedStars === 2 && 'Fair'}
                  {selectedStars === 3 && 'Good'}
                  {selectedStars === 4 && 'Very Good'}
                  {selectedStars === 5 && 'Excellent!'}
                </Text>

                <Pressable
                  style={({ pressed }) => [
                    styles.submitBtn,
                    !selectedStars && styles.submitBtnDisabled,
                    pressed && selectedStars && { opacity: 0.85 },
                  ]}
                  onPress={handleSubmitRating}
                  disabled={!selectedStars || isSubmittingRating}
                >
                  {isSubmittingRating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      {existingRatingId ? 'Update Rating' : 'Submit Rating'}
                    </Text>
                  )}
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: wp(4), paddingTop: hp(6), paddingBottom: hp(1.5),
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 4,
  },
  backBtn: {
    width: wp(10), height: wp(10), borderRadius: wp(5),
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: wp(1) },
  headerAvatarWrap: { position: 'relative' },
  headerAvatar: {
    width: wp(10), height: wp(10), borderRadius: wp(5),
    backgroundColor: '#2F6FDB', justifyContent: 'center', alignItems: 'center',
  },
  headerAvatarText: { fontSize: wp(4.5), fontWeight: '800', color: '#FFFFFF' },
  headerOnlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: wp(3), height: wp(3), borderRadius: wp(1.5),
    backgroundColor: '#10B981', borderWidth: 2, borderColor: '#FFFFFF',
  },
  headerInfo: { alignItems: 'flex-start' },
  headerName: { fontSize: wp(4.2), fontWeight: '700', color: '#1F2937', maxWidth: wp(45) },
  headerStatus: { fontSize: wp(3), color: '#9CA3AF', marginTop: hp(0.2) },
  headerStatusOnline: { color: '#10B981', fontWeight: '600' },
  ratingBtn: {
    width: wp(10), height: wp(10), borderRadius: wp(5),
    backgroundColor: '#FFFBEB', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#FDE68A', flexDirection: 'row', gap: wp(0.5),
  },
  ratingBtnText: { fontSize: wp(3.2), fontWeight: '700', color: '#D97706' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: hp(1.5) },
  loadingText: { fontSize: wp(3.8), color: '#6B7280' },
  emptyContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    gap: hp(1.5), paddingHorizontal: wp(8),
  },
  emptyIconWrap: {
    width: wp(22), height: wp(22), borderRadius: wp(11),
    backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: hp(1),
  },
  emptyTitle: { fontSize: wp(5), fontWeight: '700', color: '#1F2937' },
  emptySubtitle: { fontSize: wp(3.8), color: '#9CA3AF', textAlign: 'center' },

  messagesList: { paddingHorizontal: wp(4), paddingVertical: hp(2), paddingBottom: hp(3) },
  dateSeparator: { flexDirection: 'row', alignItems: 'center', marginVertical: hp(2), gap: wp(3) },
  dateSepLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  dateSepText: { fontSize: wp(3), color: '#94A3B8', fontWeight: '600', paddingHorizontal: wp(1) },

  messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: hp(0.5), gap: wp(2) },
  messageRowMe: { justifyContent: 'flex-end' },
  messageRowThem: { justifyContent: 'flex-start' },
  msgAvatar: {
    width: wp(8), height: wp(8), borderRadius: wp(4),
    backgroundColor: '#2F6FDB', justifyContent: 'center', alignItems: 'center', marginBottom: hp(0.3),
  },
  msgAvatarHidden: { opacity: 0 },
  msgAvatarText: { fontSize: wp(3.2), fontWeight: '800', color: '#FFFFFF' },

  bubbleWrapper: { maxWidth: wp(72) },
  bubbleWrapperMe: { alignItems: 'flex-end' },
  bubbleWrapperThem: { alignItems: 'flex-start' },
  bubble: { paddingVertical: hp(1.1), paddingHorizontal: wp(4), borderRadius: 18 },
  bubbleMe: { backgroundColor: '#2F6FDB', borderRadius: 18 },
  bubbleMeTail: { borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: '#E5E7EB' },
  bubbleThemTail: { borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: wp(3.9), lineHeight: hp(2.7) },
  bubbleTextMe: { color: '#FFFFFF' },
  bubbleTextThem: { color: '#1F2937' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: wp(1), marginTop: hp(0.4), paddingHorizontal: wp(1) },
  metaRowMe: { justifyContent: 'flex-end' },
  metaRowThem: { justifyContent: 'flex-start' },
  metaTime: { fontSize: wp(2.8), color: '#9CA3AF' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: wp(3),
    paddingHorizontal: wp(4), paddingTop: hp(1.5),
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB',
  },
  input: {
    flex: 1, backgroundColor: '#F3F4F6', borderRadius: 22,
    paddingHorizontal: wp(4), paddingVertical: hp(1.2),
    fontSize: wp(3.9), color: '#1F2937',
    maxHeight: hp(14), minHeight: hp(5.5),
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  sendBtn: {
    width: wp(12), height: wp(12), borderRadius: wp(6),
    backgroundColor: '#2F6FDB', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#2F6FDB', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35, shadowRadius: 6, elevation: 5,
  },
  sendBtnDisabled: { backgroundColor: '#D1D5DB', shadowOpacity: 0, elevation: 0 },
  sendBtnPressed: { opacity: 0.8, transform: [{ scale: 0.95 }] },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: wp(6),
  },
  modalCard: {
    width: '100%', backgroundColor: '#FFFFFF', borderRadius: 24, padding: wp(6),
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: wp(3), marginBottom: hp(2) },
  modalAvatarWrap: {
    width: wp(12), height: wp(12), borderRadius: wp(6),
    backgroundColor: '#2F6FDB', justifyContent: 'center', alignItems: 'center',
  },
  modalAvatarText: { fontSize: wp(5), fontWeight: '800', color: '#FFFFFF' },
  modalHeaderInfo: { flex: 1 },
  modalTitle: { fontSize: wp(4.5), fontWeight: '800', color: '#1F2937' },
  modalSubtitle: { fontSize: wp(3.5), color: '#6B7280', marginTop: hp(0.3) },
  modalCloseBtn: {
    width: wp(8), height: wp(8), borderRadius: wp(4),
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
  },
  existingRatingHint: {
    flexDirection: 'row', alignItems: 'center', gap: wp(2),
    backgroundColor: '#EEF5FF', borderRadius: 10,
    paddingHorizontal: wp(3), paddingVertical: hp(1), marginBottom: hp(2),
  },
  existingRatingHintText: { fontSize: wp(3.2), color: '#2F6FDB', flex: 1 },
  ratingPrompt: { fontSize: wp(4), fontWeight: '600', color: '#374151', textAlign: 'center', marginBottom: hp(2) },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: wp(2), marginBottom: hp(1.5) },
  starBtn: { padding: wp(1) },
  starLabel: { fontSize: wp(4), fontWeight: '700', color: '#F59E0B', textAlign: 'center', height: hp(3), marginBottom: hp(3) },
  submitBtn: {
    backgroundColor: '#2F6FDB', borderRadius: 14, paddingVertical: hp(1.8), alignItems: 'center',
    shadowColor: '#2F6FDB', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  submitBtnDisabled: { backgroundColor: '#E5E7EB', shadowOpacity: 0, elevation: 0 },
  submitBtnText: { fontSize: wp(4.2), fontWeight: '700', color: '#FFFFFF' },
  successContainer: { alignItems: 'center', paddingVertical: hp(3), gap: hp(1.5) },
  successIcon: { marginBottom: hp(1) },
  successTitle: { fontSize: wp(5.5), fontWeight: '800', color: '#1F2937' },
  successSubtitle: { fontSize: wp(4), color: '#6B7280', textAlign: 'center' },
});