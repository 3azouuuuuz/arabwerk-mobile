import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomModal from '../../components/CustomModal';
import LoadingComponent from '../../components/LoadingComponent';
import { ENV } from '../../config/env';
import { useAuth } from '../../context/AuthContext';
import { hp, wp } from '../../helpers/common';

interface ServiceRequest {
  id: number;
  id_user: number;
  service_type: string;
  desc_service: string;
  service_address: string;
  zip_code?: string;
  price_service: number | null;
  service_images: string | null;
  created_at: string;
  agree: boolean;
}

interface Comment {
  id: number;
  service_id: number;
  sender_id: number;
  receiver_id: number;
  comment_text: string;
  reply_to_comment_id: number | null;
  created_at: string;
  replies?: Comment[];
}

interface PublicUser {
  id: number;
  firstname: string;
  lastname: string;
}

export default function RequestDetails() {
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
 
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [usersMap, setUsersMap] = useState<Record<number, PublicUser>>({});
  const [providerPlan, setProviderPlan] = useState<string>('free');
  const [lastCommentDate, setLastCommentDate] = useState<Date | null>(null);
  const [isCheckingCommentLimit, setIsCheckingCommentLimit] = useState(true);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [myProfilePicture, setMyProfilePicture] = useState<string | null>(null);
 
  const [modalConfig, setModalConfig] = useState({
    visible: false,
    type: 'error' as 'success' | 'error' | 'warning' | 'info' | 'loading' | 'confirm',
    title: '',
    message: '',
  });
 
  const showModal = (
    type: 'success' | 'error' | 'warning' | 'info' | 'loading' | 'confirm',
    title: string,
    message: string
  ) => setModalConfig({ visible: true, type, title, message });
 
  const hideModal = () => setModalConfig((prev) => ({ ...prev, visible: false }));
 
  const isPro = providerPlan === 'pro';
 
  const visibleComments: Comment[] = !user?.id
    ? []
    : comments
        .filter((c) => c.sender_id === user.id)
        .map((c) => ({
          ...c,
          replies: (c.replies ?? []).filter(
            (r) => r.sender_id === request?.id_user
          ),
        }));
 
  const canComment = () => {
    if (isPro) return true;
    if (!lastCommentDate) return true;
    const now = new Date();
    const daysSinceLastComment = Math.floor(
      (now.getTime() - lastCommentDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSinceLastComment >= 30;
  };
 
  const getDaysUntilNextComment = () => {
    if (isPro || !lastCommentDate) return 0;
    const now = new Date();
    const daysSinceLastComment = Math.floor(
      (now.getTime() - lastCommentDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(0, 30 - daysSinceLastComment);
  };
 
  const isInputDisabled = !canComment();
 
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      router.back();
      return true;
    });
    return () => backHandler.remove();
  }, [router]);
 
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (e: any) => {
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    };
    const onHide = () => setKeyboardHeight(0);
    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);
 
  useEffect(() => {
    if (id) {
      fetchRequestDetails();
      fetchComments();
      fetchPublicUsers();
      fetchProviderPlan();
      fetchUserLastComment();
      fetchMyProfilePicture();
    }
  }, [id]);
 
  const fetchMyProfilePicture = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${ENV.API_BASE_URL}/provider_profiles?user_id=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        const profile = Array.isArray(data) ? data[0] : data;
        if (profile?.profile_picture) {
          const pic: string = profile.profile_picture;
          if (pic.startsWith('http') || pic.startsWith('data:') || pic.startsWith('file:')) {
            setMyProfilePicture(pic);
          } else {
            setMyProfilePicture(`${ENV.API_BASE_URL}${pic.startsWith('/') ? '' : '/'}${pic}`);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching provider profile picture:', error);
    }
  };
 
  const fetchProviderPlan = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${ENV.API_BASE_URL}/provider_profiles?user_id=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        const profile = Array.isArray(data) ? data[0] : data;
        setProviderPlan(profile?.plan || 'free');
      }
    } catch (error) {
      console.error('Error fetching provider plan:', error);
    }
  };
 
  const fetchUserLastComment = async () => {
    if (!user?.id) { setIsCheckingCommentLimit(false); return; }
    try {
      setIsCheckingCommentLimit(true);
      const response = await fetch(`${ENV.API_BASE_URL}/comments`);
      if (response.ok) {
        const allComments: Comment[] = await response.json();
        const userComments = allComments
          .filter((c) => c.sender_id === user.id)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setLastCommentDate(userComments.length > 0 ? new Date(userComments[0].created_at) : null);
      }
    } catch (error) {
      console.error('Error fetching user last comment:', error);
    } finally {
      setIsCheckingCommentLimit(false);
    }
  };
 
  const fetchRequestDetails = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${ENV.API_BASE_URL}/service_request/${id}`);
      if (response.ok) {
        const data: ServiceRequest = await response.json();
        setRequest(data);
      }
    } catch (error) {
      console.error('Error fetching request details:', error);
    } finally {
      setIsLoading(false);
    }
  };
 
  const fetchPublicUsers = async () => {
    try {
      const response = await fetch(`${ENV.API_BASE_URL}/users/public`);
      if (response.ok) {
        const data: PublicUser[] = await response.json();
        const map: Record<number, PublicUser> = {};
        data.forEach((u) => { map[u.id] = u; });
        setUsersMap(map);
      }
    } catch (error) {
      console.error('Error fetching public users:', error);
    }
  };
 
  const fetchComments = useCallback(async () => {
    try {
      setCommentsLoading(true);
      const response = await fetch(`${ENV.API_BASE_URL}/comments/by-service?service_id=${id}`);
      if (response.ok) {
        const data: Comment[] = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  }, [id]);
 
  const getSenderName = (senderId: number): string => {
    if (senderId === user?.id) return `${user?.firstname} ${user?.lastname}`;
    const found = usersMap[senderId];
    if (found) return `${found.firstname} ${found.lastname}`;
    return `User #${senderId}`;
  };
 
  const handleSendComment = async () => {
    if (!commentText.trim() || !user?.id || !request) return;
    if (!canComment()) {
      const daysLeft = getDaysUntilNextComment();
      showModal(
        'warning',
        'تم الوصول إلى الحد المسموح',
        `الباقة المجانية تسمح بتعليق واحد كل 30 يوماً.\n\nيمكنك التعليق مرة أخرى بعد ${daysLeft} يوم.\n\nقم بترقية باقتك إلى Pro للحصول على تعليقات غير محدودة.`
      );
      return;
    }
    try {
      setIsSending(true);
      const body = {
        service_id: Number(id),
        sender_id: user.id,
        receiver_id: request.id_user,
        comment_text: commentText.trim(),
      };
      const response = await fetch(`${ENV.API_BASE_URL}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        setCommentText('');
        await fetchComments();
        await fetchUserLastComment();
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300);
      } else {
        showModal('error', 'خطأ', 'فشل إرسال التعليق، حاول مرة أخرى.');
      }
    } catch (error) {
      console.error('Error sending comment:', error);
      showModal('error', 'خطأ في الاتصال', 'تعذر الاتصال بالخادم، تحقق من اتصالك.');
    } finally {
      setIsSending(false);
    }
  };
 
  const getStatusInfo = (agree: boolean) => {
    if (agree) {
      return { label: 'مكتمل', color: '#10B981', bgColor: '#ECFDF5', borderColor: '#6EE7B7', icon: '✓' };
    }
    return { label: 'قيد الانتظار', color: '#F59E0B', bgColor: '#FFFBEB', borderColor: '#FCD34D', icon: '⏱' };
  };
 
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };
 
  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  };
 
  const formatCommentTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  };
 
  const CommentAvatar = ({ senderId, size, small = false }: { senderId: number; size: number; small?: boolean }) => {
    const isMe = senderId === user?.id;
    const name = getSenderName(senderId);
    const initial = name.charAt(0).toUpperCase();
 
    if (isMe && myProfilePicture) {
      return (
        <Image
          source={{ uri: myProfilePicture }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      );
    }
 
    return (
      <View
        style={{
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: isMe ? '#2F6FDB' : '#E5E7EB',
          justifyContent: 'center', alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: size * (small ? 0.38 : 0.4), fontWeight: '700', color: isMe ? '#FFFFFF' : '#6B7280' }}>
          {initial}
        </Text>
      </View>
    );
  };
 
  const renderCommentLimitBadge = () => {
    if (isCheckingCommentLimit) {
      return (
        <View style={[styles.limitBadge, { backgroundColor: '#F3F4F6' }]}>
          <ActivityIndicator size="small" color="#6B7280" />
          <Text style={[styles.limitBadgeText, { color: '#6B7280' }]}>جاري التحقق من الحد...</Text>
        </View>
      );
    }
    if (isPro) return <View />;
    const userCanComment = canComment();
    const daysLeft = getDaysUntilNextComment();
    const color = userCanComment ? '#10B981' : '#EF4444';
    const bgColor = userCanComment ? '#ECFDF5' : '#FEE2E2';
    return (
      <View style={[styles.limitBadge, { backgroundColor: bgColor }]}>
        <Ionicons
          name={userCanComment ? 'chatbubble-outline' : 'lock-closed-outline'}
          size={wp(3.5)}
          color={color}
        />
        <Text style={[styles.limitBadgeText, { color }]}>
          {userCanComment
            ? 'يمكنك التعليق الآن (مجاناً: 1 تعليق/شهر)'
            : `يمكنك التعليق بعد ${daysLeft} يوم`}
        </Text>
        {!isPro && (
          <Pressable
            style={styles.upgradeChip}
            onPress={() => router.push('/(provider)/choose-subscription')}
          >
            <Text style={styles.upgradeChipText}>ترقية</Text>
          </Pressable>
        )}
      </View>
    );
  };
 
  const renderReply = (reply: Comment) => {
    const isMe = reply.sender_id === user?.id;
    return (
      <View key={reply.id} style={styles.replyCard}>
        <View style={styles.replyLeftBar} />
        <View style={styles.replyContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentTime}>{formatCommentTime(reply.created_at)}</Text>
            <View style={styles.commentAuthorRow}>
              <View style={[styles.authorBadge, isMe ? styles.authorBadgeProvider : styles.authorBadgeClient]}>
                <Text style={[styles.authorBadgeText, isMe ? styles.authorBadgeTextProvider : styles.authorBadgeTextClient]}>
                  {getSenderName(reply.sender_id)}
                </Text>
              </View>
              <CommentAvatar senderId={reply.sender_id} size={wp(7)} small />
            </View>
          </View>
          <Text style={styles.replyText}>{reply.comment_text}</Text>
        </View>
      </View>
    );
  };
 
  const renderComment = (comment: Comment) => {
    const isMe = comment.sender_id === user?.id;
    return (
      <View key={comment.id} style={styles.commentCard}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentTime}>{formatCommentTime(comment.created_at)}</Text>
          <View style={styles.commentAuthorRow}>
            <View style={[styles.authorBadge, isMe ? styles.authorBadgeProvider : styles.authorBadgeClient]}>
              <Text style={[styles.authorBadgeText, isMe ? styles.authorBadgeTextProvider : styles.authorBadgeTextClient]}>
                {getSenderName(comment.sender_id)}
              </Text>
            </View>
            <CommentAvatar senderId={comment.sender_id} size={wp(9)} />
          </View>
        </View>
        <Text style={styles.commentText}>{comment.comment_text}</Text>
        {comment.replies && comment.replies.length > 0 && (
          <View style={styles.repliesContainer}>
            <View style={styles.repliesLabel}>
              <Text style={styles.repliesLabelText}>
                {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
              </Text>
              <Ionicons name="return-down-back" size={wp(3.5)} color="#9CA3AF" />
            </View>
            {comment.replies.map((reply) => renderReply(reply))}
          </View>
        )}
      </View>
    );
  };
 
  if (isLoading) return <LoadingComponent message="جاري تحميل التفاصيل..." />;
 
  if (!request) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Text style={styles.errorIcon}>❌</Text>
          </View>
          <Text style={styles.errorTitle}>الطلب غير موجود</Text>
          <Text style={styles.errorSubtitle}>لم يتم العثور على الطلب المطلوب</Text>
          <Pressable style={styles.backToListButton} onPress={() => router.back()}>
            <Text style={styles.backToListButtonText}>العودة إلى القائمة</Text>
          </Pressable>
        </View>
      </View>
    );
  }
 
  const statusInfo = getStatusInfo(request.agree);
 
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 60 : 0}
      enabled
    >
      <StatusBar style="dark" />
 
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>تفاصيل الطلب</Text>
          <Text style={styles.headerSubtitle}>#{request.id}</Text>
        </View>
        {isPro ? (
          <View style={styles.planBadgePro}>
            <Ionicons name="diamond" size={wp(5)} color="#F59E0B" />
          </View>
        ) : (
          <View style={styles.headerPlaceholder} />
        )}
      </View>
 
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: keyboardHeight > 0 ? keyboardHeight : hp(4) }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusInfo.bgColor, borderColor: statusInfo.borderColor }]}>
          <View style={[styles.statusIconCircle, { backgroundColor: statusInfo.color }]}>
            <Text style={styles.statusIconText}>{statusInfo.icon}</Text>
          </View>
          <View style={styles.statusTextContainer}>
            <Text style={styles.statusLabel}>حالة الطلب</Text>
            <Text style={[styles.statusValue, { color: statusInfo.color }]}>{statusInfo.label}</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{formatRelativeDate(request.created_at)}</Text>
          </View>
        </View>
 
        {/* Service Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>نوع الخدمة</Text>
          <View style={styles.card}>
            <Text style={styles.serviceType}>{request.service_type}</Text>
          </View>
        </View>
 
        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>وصف الخدمة</Text>
          <View style={styles.card}>
            <Text style={styles.description}>{request.desc_service}</Text>
          </View>
        </View>
 
        {/* Location + Price */}
        <View style={styles.gridRow}>
          <View style={styles.gridCard}>
            <Text style={styles.gridLabel}>الموقع</Text>
            <Text style={styles.gridValue} numberOfLines={2}>{request.service_address}</Text>
            {request.zip_code && (
              <View style={styles.zipBadge}>
                <Text style={styles.zipBadgeText}>{request.zip_code}</Text>
              </View>
            )}
          </View>
          <View style={styles.gridCard}>
            <Text style={styles.gridLabel}>الميزانية</Text>
            {request.price_service ? (
              <Text style={styles.priceValue}>{request.price_service} €</Text>
            ) : (
              <Text style={styles.noPriceText}>غير محدد</Text>
            )}
          </View>
        </View>
 
        {/* Image */}
        {request.service_images && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>الصورة المرفقة</Text>
            <View style={styles.imageCard}>
              <Image
                source={{ uri: request.service_images }}
                style={styles.serviceImage}
                resizeMode="cover"
              />
            </View>
          </View>
        )}
 
        {/* Date */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>التوقيت</Text>
          <View style={styles.card}>
            <View style={styles.timelineRow}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>تاريخ الإنشاء</Text>
                <Text style={styles.timelineValue}>{formatDate(request.created_at)}</Text>
              </View>
            </View>
          </View>
        </View>
 
        {/* Comments */}
        <View style={styles.commentsSection}>
          <View style={styles.commentsSectionHeader}>
            <View style={styles.commentsBadge}>
              <Text style={styles.commentsBadgeText}>{visibleComments.length}</Text>
            </View>
            <Text style={styles.commentsSectionTitle}>تعليقاتي</Text>
          </View>
 
          {renderCommentLimitBadge()}
 
          {commentsLoading ? (
            <View style={styles.commentsLoading}>
              <ActivityIndicator size="small" color="#2F6FDB" />
              <Text style={styles.commentsLoadingText}>جاري تحميل التعليقات...</Text>
            </View>
          ) : visibleComments.length === 0 ? (
            <View style={styles.commentsEmpty}>
              <Text style={styles.commentsEmptyIcon}>💬</Text>
              <Text style={styles.commentsEmptyText}>لم تضف أي تعليق بعد</Text>
              <Text style={styles.commentsEmptySubText}>ابدأ المحادثة مع صاحب الطلب</Text>
            </View>
          ) : (
            <View style={styles.commentsList}>
              {visibleComments.map((comment) => renderComment(comment))}
            </View>
          )}
        </View>
      </ScrollView>
 
      <View style={[
        styles.inputContainer,
        Platform.OS === 'android' && keyboardHeight > 0
          ? { marginBottom: keyboardHeight }
          : { marginBottom: insets.bottom },
      ]}>
        {isInputDisabled && (
          <View style={styles.limitWarningBar}>
            <Ionicons name="lock-closed-outline" size={wp(4)} color="#EF4444" />
            <Text style={styles.limitWarningText}>
              {`يمكنك التعليق بعد ${getDaysUntilNextComment()} يوم`}
            </Text>
            <Pressable
              style={styles.upgradeBarButton}
              onPress={() => router.push('/(provider)/choose-subscription')}
            >
              <Text style={styles.upgradeBarButtonText}>ترقية للـ Pro</Text>
            </Pressable>
          </View>
        )}
        <View style={styles.inputRow}>
          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              (!commentText.trim() || isSending || isInputDisabled) && styles.sendButtonDisabled,
              pressed && commentText.trim() && !isInputDisabled && styles.sendButtonPressed,
            ]}
            onPress={handleSendComment}
            disabled={!commentText.trim() || isSending || isInputDisabled}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={wp(5)} color="#FFFFFF" />
            )}
          </Pressable>
          <TextInput
            style={[styles.textInput, isInputDisabled && styles.textInputDisabled]}
            placeholder={
              isInputDisabled
                ? `يمكنك التعليق بعد ${getDaysUntilNextComment()} يوم`
                : 'أضف تعليقاً...'
            }
            placeholderTextColor="#9CA3AF"
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
            textAlign="right"
            editable={!isInputDisabled}
          />
        </View>
      </View>
 
      <CustomModal
        visible={modalConfig.visible}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        onClose={hideModal}
        showCloseButton
        primaryButtonText={modalConfig.type === 'warning' && !isPro ? 'ترقية الباقة' : 'حسناً'}
        onPrimaryPress={
          modalConfig.type === 'warning' && !isPro
            ? () => { hideModal(); router.push('/(provider)/choose-subscription'); }
            : hideModal
        }
        secondaryButtonText={modalConfig.type === 'warning' && !isPro ? 'إغلاق' : undefined}
        onSecondaryPress={modalConfig.type === 'warning' && !isPro ? hideModal : undefined}
      />
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: wp(4), paddingTop: hp(6), paddingBottom: hp(2),
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', zIndex: 10,
  },
  backButton: {
    width: wp(10), height: wp(10), borderRadius: wp(5),
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
  },
  backButtonText: { fontSize: wp(8), color: '#1F2937', fontWeight: 'bold', marginLeft: wp(1) },
  buttonPressed: { opacity: 0.7, transform: [{ scale: 0.95 }] },
  headerContent: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: wp(5), fontWeight: '700', color: '#1F2937' },
  headerSubtitle: { fontSize: wp(3.5), color: '#6B7280', marginTop: hp(0.3) },
  headerPlaceholder: { width: wp(10) },
  planBadgePro: {
    width: wp(10), height: wp(10), borderRadius: wp(5),
    backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center',
  },
  scrollView: { flex: 1 },
  scrollContent: { padding: wp(4) },
  statusBanner: {
    borderRadius: 16, padding: wp(4), marginBottom: hp(3), borderWidth: 2,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  statusIconCircle: {
    width: wp(12), height: wp(12), borderRadius: wp(6),
    justifyContent: 'center', alignItems: 'center', marginRight: wp(3),
  },
  statusIconText: { fontSize: wp(6), color: '#FFFFFF' },
  statusTextContainer: { flex: 1 },
  statusLabel: { fontSize: wp(3.5), color: '#6B7280', marginBottom: hp(0.3), textAlign: 'right' },
  statusValue: { fontSize: wp(4.5), fontWeight: '700', textAlign: 'right' },
  statusBadge: { backgroundColor: '#FFFFFF', paddingHorizontal: wp(3), paddingVertical: hp(0.5), borderRadius: 12 },
  statusBadgeText: { fontSize: wp(3), color: '#6B7280', fontWeight: '600' },
  section: { marginBottom: hp(2.5) },
  sectionTitle: { fontSize: wp(4.5), fontWeight: '700', color: '#1F2937', marginBottom: hp(1.5), textAlign: 'right' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: wp(4), borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  serviceType: { fontSize: wp(4.5), fontWeight: '700', color: '#2F6FDB', textAlign: 'right' },
  description: { fontSize: wp(4), color: '#4B5563', lineHeight: hp(3), textAlign: 'right' },
  gridRow: { flexDirection: 'row', gap: wp(3), marginBottom: hp(2.5) },
  gridCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: wp(4), borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  gridLabel: { fontSize: wp(3.5), color: '#6B7280', marginBottom: hp(1), textAlign: 'right', fontWeight: '600' },
  gridValue: { fontSize: wp(3.8), color: '#1F2937', fontWeight: '600', lineHeight: hp(2.5), textAlign: 'right' },
  zipBadge: {
    backgroundColor: '#F3F4F6', paddingHorizontal: wp(2), paddingVertical: hp(0.3),
    borderRadius: 6, alignSelf: 'flex-end', marginTop: hp(0.5),
  },
  zipBadgeText: { fontSize: wp(3), color: '#6B7280', fontWeight: '600' },
  priceValue: { fontSize: wp(5.5), color: '#16A34A', fontWeight: '800', textAlign: 'right' },
  noPriceText: { fontSize: wp(4), color: '#9CA3AF', fontStyle: 'italic', textAlign: 'right' },
  imageCard: { backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  serviceImage: { width: '100%', height: hp(30) },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start' },
  timelineDot: {
    width: wp(3), height: wp(3), borderRadius: wp(1.5),
    backgroundColor: '#2F6FDB', marginTop: hp(0.5), marginRight: wp(3),
  },
  timelineContent: { flex: 1 },
  timelineLabel: { fontSize: wp(3.5), color: '#6B7280', marginBottom: hp(0.3), textAlign: 'right' },
  timelineValue: { fontSize: wp(4), color: '#1F2937', fontWeight: '600', textAlign: 'right' },
  commentsSection: { marginTop: hp(1) },
  commentsSectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: wp(2),
    marginBottom: hp(1.5), paddingBottom: hp(1.5), borderBottomWidth: 2, borderBottomColor: '#E5E7EB',
  },
  commentsSectionTitle: { fontSize: wp(5), fontWeight: '800', color: '#1F2937' },
  commentsBadge: {
    backgroundColor: '#EEF5FF', borderRadius: wp(3), minWidth: wp(6), height: wp(6),
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: wp(1.5),
  },
  commentsBadgeText: { fontSize: wp(3), fontWeight: '700', color: '#2F6FDB' },
  limitBadge: {
    flexDirection: 'row', alignItems: 'center', gap: wp(2),
    paddingHorizontal: wp(4), paddingVertical: hp(1), borderRadius: 12, marginBottom: hp(2),
  },
  limitBadgeText: { fontSize: wp(3.2), fontWeight: '600', flex: 1, textAlign: 'right' },
  upgradeChip: { backgroundColor: '#2F6FDB', paddingHorizontal: wp(3), paddingVertical: hp(0.4), borderRadius: 10 },
  upgradeChipText: { fontSize: wp(3), color: '#FFFFFF', fontWeight: '700' },
  commentsLoading: { paddingVertical: hp(4), alignItems: 'center', gap: hp(1) },
  commentsLoadingText: { fontSize: wp(3.5), color: '#6B7280' },
  commentsEmpty: {
    paddingVertical: hp(5), alignItems: 'center', gap: hp(1),
    backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1,
    borderColor: '#E5E7EB', borderStyle: 'dashed',
  },
  commentsEmptyIcon: { fontSize: wp(10) },
  commentsEmptyText: { fontSize: wp(4), fontWeight: '600', color: '#1F2937' },
  commentsEmptySubText: { fontSize: wp(3.5), color: '#9CA3AF' },
  commentsList: { gap: 0 },
  commentCard: {
    backgroundColor: '#FFFFFF', paddingVertical: hp(2), paddingHorizontal: wp(4),
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  commentHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: hp(1),
  },
  commentAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: wp(2) },
  authorBadge: { paddingHorizontal: wp(2.5), paddingVertical: hp(0.3), borderRadius: 20 },
  authorBadgeProvider: { backgroundColor: '#EEF5FF' },
  authorBadgeClient: { backgroundColor: '#F3F4F6' },
  authorBadgeText: { fontSize: wp(3), fontWeight: '600' },
  authorBadgeTextProvider: { color: '#2F6FDB' },
  authorBadgeTextClient: { color: '#6B7280' },
  commentTime: { fontSize: wp(3), color: '#9CA3AF' },
  commentText: { fontSize: wp(3.8), color: '#374151', lineHeight: hp(2.8), textAlign: 'right' },
  repliesContainer: { marginTop: hp(1.5), gap: 0 },
  repliesLabel: {
    flexDirection: 'row', alignItems: 'center', gap: wp(1),
    justifyContent: 'flex-end', marginBottom: hp(1),
  },
  repliesLabelText: { fontSize: wp(3), color: '#9CA3AF', fontWeight: '600' },
  replyCard: {
    flexDirection: 'row', paddingVertical: hp(1.5), paddingRight: wp(4),
    borderTopWidth: 1, borderTopColor: '#F9FAFB', backgroundColor: '#FAFAFA',
  },
  replyLeftBar: { width: 3, backgroundColor: '#BFDBFE', borderRadius: 2, marginRight: wp(3), marginLeft: wp(2) },
  replyContent: { flex: 1 },
  replyText: { fontSize: wp(3.5), color: '#4B5563', lineHeight: hp(2.5), textAlign: 'right' },
  inputContainer: {
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB',
    paddingHorizontal: wp(4), paddingTop: hp(1.5), paddingBottom: hp(1.5),
  },
  limitWarningBar: {
    flexDirection: 'row', alignItems: 'center', gap: wp(2),
    backgroundColor: '#FEF2F2', paddingHorizontal: wp(3), paddingVertical: hp(1),
    borderRadius: 10, marginBottom: hp(1),
  },
  limitWarningText: { flex: 1, fontSize: wp(3.2), color: '#EF4444', fontWeight: '600', textAlign: 'right' },
  upgradeBarButton: { backgroundColor: '#2F6FDB', paddingHorizontal: wp(3), paddingVertical: hp(0.5), borderRadius: 10 },
  upgradeBarButtonText: { fontSize: wp(3), color: '#FFFFFF', fontWeight: '700' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: wp(3) },
  textInput: {
    flex: 1, backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: wp(4), paddingVertical: hp(1.2), fontSize: wp(3.8), color: '#1F2937',
    maxHeight: hp(12), minHeight: hp(5.5),
  },
  textInputDisabled: { backgroundColor: '#F3F4F6', color: '#9CA3AF' },
  sendButton: {
    width: wp(11), height: wp(11), borderRadius: wp(5.5), backgroundColor: '#2F6FDB',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#2F6FDB', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  sendButtonDisabled: { backgroundColor: '#D1D5DB', shadowOpacity: 0, elevation: 0 },
  sendButtonPressed: { opacity: 0.8, transform: [{ scale: 0.95 }] },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: wp(6) },
  errorIconContainer: {
    width: wp(24), height: wp(24), borderRadius: wp(12),
    backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginBottom: hp(3),
  },
  errorIcon: { fontSize: wp(12) },
  errorTitle: { fontSize: wp(6), fontWeight: '700', color: '#1F2937', marginBottom: hp(1) },
  errorSubtitle: { fontSize: wp(4), color: '#6B7280', textAlign: 'center', marginBottom: hp(3) },
  backToListButton: {
    backgroundColor: '#2F6FDB', paddingVertical: hp(1.5), paddingHorizontal: wp(8), borderRadius: 12,
    shadowColor: '#2F6FDB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  backToListButtonText: { fontSize: wp(4), fontWeight: '700', color: '#FFFFFF' },
});