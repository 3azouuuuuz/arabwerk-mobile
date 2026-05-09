import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
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

interface ProviderProfile {
  user_id: number;
  business_name: string | null;
  city: string;
  phone: string | null;
  category: string | null;
  plan_name: string;
  profile_picture: string | null;
  description: string | null;
}

interface UserInfo {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
}

export default function RequestDetailsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error' | 'warning'>('success');
  const [modalMessage, setModalMessage] = useState('');

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);

  const [usersMap, setUsersMap] = useState<Record<number, UserInfo>>({});
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // ── Provider profile pictures map (keyed by user_id) ────────────────────
  // Populated lazily as comments are loaded — one fetch per unique provider.
  const [providerPicturesMap, setProviderPicturesMap] = useState<Record<number, string | null>>({});
  // ─────────────────────────────────────────────────────────────────────────

  // Provider profile modal
  const [providerModalVisible, setProviderModalVisible] = useState(false);
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null);
  const [providerUser, setProviderUser] = useState<UserInfo | null>(null);
  const [providerLoading, setProviderLoading] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null);
  const [providerRating, setProviderRating] = useState<number | null>(null);
  const [providerRatingCount, setProviderRatingCount] = useState<number>(0);

  // ── Hardware back button ─────────────────────────────────────────────────
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (providerModalVisible) { setProviderModalVisible(false); return true; }
      if (showDropdown) { setShowDropdown(false); return true; }
      router.back();
      return true;
    });
    return () => backHandler.remove();
  }, [router, providerModalVisible, showDropdown]);
  // ────────────────────────────────────────────────────────────────────────

  // ── Keyboard listeners ───────────────────────────────────────────────────
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
  // ────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (id) {
      fetchRequestDetails();
      fetchComments();
      fetchPublicUsers();
    }
  }, [id]);

  // ── When comments load, fetch profile pictures for every unique provider ─
  useEffect(() => {
    if (comments.length === 0 || !user?.id) return;

    // Collect unique sender IDs that are NOT the current user (i.e. providers)
    const providerIds = [
      ...new Set(
        comments
          .flatMap(c => [c.sender_id, ...(c.replies ?? []).map(r => r.sender_id)])
          .filter(sid => sid !== user.id),
      ),
    ];

    providerIds.forEach(async (pid) => {
      // Skip if already fetched (even if result was null)
      if (pid in providerPicturesMap) return;

      try {
        const res = await fetch(`${ENV.API_BASE_URL}/provider_profiles?user_id=${pid}`);
        if (res.ok) {
          const data = await res.json();
          const profile = Array.isArray(data) ? data[0] : data;
          const pic: string | null = profile?.profile_picture ?? null;
          let resolved: string | null = null;
          if (pic) {
            if (pic.startsWith('http') || pic.startsWith('data:') || pic.startsWith('file:')) {
              resolved = pic;
            } else {
              resolved = `${ENV.API_BASE_URL}${pic.startsWith('/') ? '' : '/'}${pic}`;
            }
          }
          setProviderPicturesMap(prev => ({ ...prev, [pid]: resolved }));
        }
      } catch (e) {
        // Mark as fetched even on failure so we don't retry repeatedly
        setProviderPicturesMap(prev => ({ ...prev, [pid]: null }));
      }
    });
  }, [comments, user?.id]);
  // ─────────────────────────────────────────────────────────────────────────

  const fetchRequestDetails = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${ENV.API_BASE_URL}/service_request/${id}`);
      if (response.ok) {
        const data: ServiceRequest = await response.json();
        if (data.id_user !== user?.id) {
          showModal('error', 'ليس لديك صلاحية لعرض هذا الطلب');
          setTimeout(() => router.back(), 2000);
          return;
        }
        setRequest(data);
      } else {
        showModal('error', 'فشل تحميل تفاصيل الطلب');
      }
    } catch (error) {
      showModal('error', 'حدث خطأ أثناء تحميل التفاصيل');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPublicUsers = async () => {
    try {
      const response = await fetch(`${ENV.API_BASE_URL}/users/public`);
      if (response.ok) {
        const data: UserInfo[] = await response.json();
        const map: Record<number, UserInfo> = {};
        data.forEach(u => { map[u.id] = u; });
        setUsersMap(map);
      }
    } catch (error) {
      console.error('Error fetching public users:', error);
    }
  };

  const getSenderName = (senderId: number): string => {
    if (senderId === user?.id) return `${user?.firstname ?? ''} ${user?.lastname ?? ''}`.trim();
const found = usersMap[senderId];
if (found) return `${found.firstname ?? ''} ${found.lastname ?? ''}`.trim();
    return `مستخدم #${senderId}`;
  };

  const fetchComments = async () => {
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
  };

  const fetchProviderProfile = async (providerId: number) => {
    if (selectedProviderId === providerId && providerProfile) {
      setProviderModalVisible(true);
      return;
    }
    try {
      setProviderLoading(true);
      setSelectedProviderId(providerId);
      setProviderModalVisible(true);
      setProviderProfile(null);
      setProviderUser(null);
      setProviderRating(null);
      setProviderRatingCount(0);

      const [profileRes, ratingsRes] = await Promise.all([
        fetch(`${ENV.API_BASE_URL}/provider_profiles?user_id=${providerId}`),
        fetch(`${ENV.API_BASE_URL}/ratings?provider_id=${providerId}`),
      ]);

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        const profile = Array.isArray(profileData) ? profileData[0] : profileData;
        setProviderProfile(profile);

        // Also update the pictures map so the modal avatar is consistent
        if (profile?.profile_picture) {
          const pic: string = profile.profile_picture;
          const resolved =
            pic.startsWith('http') || pic.startsWith('data:') || pic.startsWith('file:')
              ? pic
              : `${ENV.API_BASE_URL}${pic.startsWith('/') ? '' : '/'}${pic}`;
          setProviderPicturesMap(prev => ({ ...prev, [providerId]: resolved }));
        }
      }

      const foundUser = usersMap[providerId];
      if (foundUser) setProviderUser(foundUser);

      if (ratingsRes.ok) {
        const ratingsData = await ratingsRes.json();
        if (Array.isArray(ratingsData) && ratingsData.length > 0) {
          const avg =
            ratingsData.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) /
            ratingsData.length;
          setProviderRating(parseFloat(avg.toFixed(1)));
          setProviderRatingCount(ratingsData.length);
        }
      }
    } catch (error) {
      console.error('Error fetching provider profile:', error);
    } finally {
      setProviderLoading(false);
    }
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || !user?.id || !request) return;
    try {
      setIsSending(true);
      const body: any = {
        service_id: Number(id),
        sender_id: user.id,
        receiver_id: replyingTo ? replyingTo.sender_id : request.id_user,
        comment_text: commentText.trim(),
      };
      if (replyingTo) body.reply_to_comment_id = replyingTo.id;

      const response = await fetch(`${ENV.API_BASE_URL}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        setCommentText('');
        setReplyingTo(null);
        await fetchComments();
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300);
      }
    } catch (error) {
      console.error('Error sending comment:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleMessageProvider = () => {
    if (!providerProfile || !user) return;
    setProviderModalVisible(false);
    router.push(`/(client)/chat?receiverId=${providerProfile.user_id}`);
  };

  const showModal = (type: 'success' | 'error' | 'warning', message: string) => {
    setModalType(type);
    setModalMessage(message);
    setModalVisible(true);
  };

  const handleDelete = () => {
    setShowDropdown(false);
    Alert.alert(
      'تأكيد الحذف',
      'هل أنت متأكد من حذف هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'حذف', style: 'destructive', onPress: confirmDelete },
      ]
    );
  };

  const handleEdit = () => {
    setShowDropdown(false);
    if (!request?.id) { showModal('error', 'معرف الطلب غير صالح'); return; }
    router.push(`/(client)/edit-request?id=${request.id}`);
  };

  const confirmDelete = async () => {
    if (!request) return;
    try {
      setIsDeleting(true);
      const response = await fetch(`${ENV.API_BASE_URL}/service_request/${request.id}`, { method: 'DELETE' });
      if (response.ok) {
        showModal('success', 'تم حذف الطلب بنجاح');
        setTimeout(() => router.back(), 1500);
      } else {
        showModal('error', 'فشل حذف الطلب');
      }
    } catch (error) {
      showModal('error', 'حدث خطأ أثناء حذف الطلب');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusInfo = (agree: boolean) => {
    if (agree) return { label: 'مكتمل', color: '#10B981', bgColor: '#ECFDF5', borderColor: '#6EE7B7', icon: '✓' };
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
    const diffDays = Math.ceil(Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
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
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  };

  const renderStars = (rating: number) =>
    [1, 2, 3, 4, 5].map(star => (
      <Ionicons
        key={star}
        name={star <= Math.round(rating) ? 'star' : 'star-outline'}
        size={wp(4)}
        color="#F59E0B"
        style={{ marginHorizontal: wp(0.3) }}
      />
    ));

  // ── Avatar component ──────────────────────────────────────────────────────
  // isMe (client)  → green initial circle (clients have no profile picture)
  // !isMe (provider) → profile picture if available, else blue initial circle
  const CommentAvatar = ({
    senderId,
    size,
  }: {
    senderId: number;
    size: number;
  }) => {
    const isMe = senderId === user?.id;
    const name = getSenderName(senderId);
    const initial = name.charAt(0).toUpperCase();
    const picUrl = !isMe ? providerPicturesMap[senderId] : null;

    if (!isMe && picUrl) {
      return (
        <Image
          source={{ uri: picUrl }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      );
    }

    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isMe ? '#10B981' : '#2F6FDB',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontSize: size * 0.4,
            fontWeight: '800',
            color: '#FFFFFF',
          }}
        >
          {initial}
        </Text>
      </View>
    );
  };
  // ─────────────────────────────────────────────────────────────────────────

  const renderReply = (reply: Comment) => {
    const isMe = reply.sender_id === user?.id;
    return (
      <View key={reply.id} style={styles.replyCard}>
        <View style={styles.replyThreadLine} />
        <View style={styles.replyBubble}>
          <View style={styles.replyHeader}>
            <Text style={styles.replyTime}>{formatCommentTime(reply.created_at)}</Text>
            <View style={styles.replyAuthorRow}>
              {/* ── Reply avatar ── */}
              <Pressable
                onPress={() => !isMe && fetchProviderProfile(reply.sender_id)}
              >
                <CommentAvatar senderId={reply.sender_id} size={wp(6)} />
              </Pressable>
              <Text style={[styles.replyAuthorName, isMe ? styles.replyAuthorMe : styles.replyAuthorProvider]}>
                {getSenderName(reply.sender_id)}
              </Text>
            </View>
          </View>
          <Text style={styles.replyText}>{reply.comment_text}</Text>
        </View>
      </View>
    );
  };

  const renderComment = (comment: Comment, index: number) => {
    const isMe = comment.sender_id === user?.id;
    const hasReplies = !!(comment.replies && comment.replies.length > 0);
    return (
      <View key={comment.id} style={[styles.commentCard, index === 0 && styles.commentCardFirst]}>
        <View style={styles.commentTopRow}>
          <Text style={styles.commentTime}>{formatCommentTime(comment.created_at)}</Text>
          <View style={styles.commentMeta}>
            <Text style={[styles.commentAuthorLabel, isMe ? styles.authorLabelMe : styles.authorLabelProvider]}>
              {getSenderName(comment.sender_id)}
            </Text>
            {/* ── Comment avatar ── */}
            <Pressable onPress={() => !isMe && fetchProviderProfile(comment.sender_id)}>
              <CommentAvatar senderId={comment.sender_id} size={wp(8)} />
            </Pressable>
          </View>
        </View>

        <View style={[styles.commentBubble, isMe ? styles.commentBubbleMe : styles.commentBubbleProvider]}>
          <Text style={[styles.commentText, isMe ? styles.commentTextMe : styles.commentTextProvider]}>
            {comment.comment_text}
          </Text>
        </View>

        {!isMe && (
          <Pressable style={styles.replyButton} onPress={() => setReplyingTo(comment)}>
            <Ionicons name="return-down-back-outline" size={wp(3.5)} color="#6B7280" />
            <Text style={styles.replyButtonText}>رد</Text>
          </Pressable>
        )}

        {hasReplies && (
          <View style={styles.repliesContainer}>
            <View style={styles.repliesDivider}>
              <View style={styles.repliesDividerLine} />
              <Text style={styles.repliesDividerText}>
                {comment.replies!.length} {comment.replies!.length === 1 ? 'reply' : 'replies'}
              </Text>
              <View style={styles.repliesDividerLine} />
            </View>
            {comment.replies!.map(reply => renderReply(reply))}
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
          <View style={styles.errorIconContainer}><Text style={styles.errorIcon}>❌</Text></View>
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
  const HEADER_HEIGHT = hp(6) + hp(2) + wp(10);

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
        <Pressable style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>‹</Text>
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>تفاصيل الطلب</Text>
          <Text style={styles.headerSubtitle}>#{request.id}</Text>
        </View>
        <Pressable style={({ pressed }) => [styles.menuButton, pressed && styles.buttonPressed]} onPress={() => setShowDropdown(!showDropdown)}>
          <View style={styles.menuDots}>
            <View style={styles.dot} /><View style={styles.dot} /><View style={styles.dot} />
          </View>
        </Pressable>
      </View>

      {/* ── Dropdown ── */}
      {showDropdown && (
        <View style={styles.dropdownContainer}>
          <View style={styles.dropdownMenu}>
            <Pressable style={({ pressed }) => [styles.dropdownItem, pressed && styles.dropdownItemPressed]} onPress={handleEdit}>
              <View style={styles.dropdownIconContainer}><Text style={styles.dropdownIcon}>✏️</Text></View>
              <Text style={styles.dropdownText}>تعديل الطلب</Text>
            </Pressable>
            <View style={styles.dropdownDivider} />
            <Pressable style={({ pressed }) => [styles.dropdownItem, pressed && styles.dropdownItemPressed]} onPress={handleDelete}>
              <View style={[styles.dropdownIconContainer, styles.dropdownIconDanger]}><Text style={styles.dropdownIcon}>🗑️</Text></View>
              <Text style={[styles.dropdownText, styles.dropdownTextDanger]}>حذف الطلب</Text>
            </Pressable>
          </View>
        </View>
      )}
      {showDropdown && <Pressable style={styles.dropdownOverlay} onPress={() => setShowDropdown(false)} />}

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: keyboardHeight > 0 ? keyboardHeight + hp(2) : hp(4) },
        ]}
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
          <View style={styles.card}><Text style={styles.serviceType}>{request.service_type}</Text></View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>وصف الخدمة</Text>
          <View style={styles.card}><Text style={styles.description}>{request.desc_service}</Text></View>
        </View>

        {/* Location & Budget */}
        <View style={styles.gridRow}>
          <View style={styles.gridCard}>
            <Text style={styles.gridLabel}>الموقع</Text>
            <Text style={styles.gridValue} numberOfLines={2}>{request.service_address}</Text>
            {request.zip_code && <View style={styles.zipBadge}><Text style={styles.zipBadgeText}>{request.zip_code}</Text></View>}
          </View>
          <View style={styles.gridCard}>
            <Text style={styles.gridLabel}>الميزانية</Text>
            {request.price_service
              ? <Text style={styles.priceValue}>{request.price_service} €</Text>
              : <Text style={styles.noPriceText}>غير محدد</Text>}
          </View>
        </View>

        {/* Image */}
        {request.service_images && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>الصورة المرفقة</Text>
            <View style={styles.imageCard}>
              <Image source={{ uri: request.service_images }} style={styles.serviceImage} resizeMode="cover" />
              <View style={styles.imageOverlay}>
                <Pressable style={styles.viewImageButton}>
                  <Text style={styles.viewImageButtonText}>عرض الصورة</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* Timeline */}
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

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <View style={styles.commentsSectionLabelWrap}>
            <View style={styles.commentsSectionLine} />
            <View style={styles.commentsSectionLabel}>
              <Ionicons name="chatbubbles" size={wp(4)} color="#FFFFFF" />
              <Text style={styles.commentsSectionLabelText}>التعليقات</Text>
              {comments.length > 0 && (
                <View style={styles.commentsSectionCount}>
                  <Text style={styles.commentsSectionCountText}>{comments.length}</Text>
                </View>
              )}
            </View>
            <View style={styles.commentsSectionLine} />
          </View>

          {commentsLoading ? (
            <View style={styles.commentsLoading}>
              <ActivityIndicator size="small" color="#2F6FDB" />
              <Text style={styles.commentsLoadingText}>جاري تحميل التعليقات...</Text>
            </View>
          ) : comments.length === 0 ? (
            <View style={styles.commentsEmpty}>
              <View style={styles.commentsEmptyIconWrap}>
                <Ionicons name="chatbubble-ellipses-outline" size={wp(10)} color="#CBD5E1" />
              </View>
              <Text style={styles.commentsEmptyText}>لا توجد تعليقات بعد</Text>
              <Text style={styles.commentsEmptySubText}>سيظهر هنا ردود مقدمي الخدمة على طلبك</Text>
            </View>
          ) : (
            <View style={styles.commentsList}>
              {comments.map((comment, idx) => renderComment(comment, idx))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Comment Input ── */}
      <View style={[
        styles.inputContainer,
        Platform.OS === 'android' && keyboardHeight > 0
          ? { marginBottom: keyboardHeight }
          : { paddingBottom: Math.max(insets.bottom, hp(1.5)) },
      ]}>
        {replyingTo && (
          <View style={styles.replyIndicator}>
            <Pressable onPress={() => setReplyingTo(null)}>
              <Ionicons name="close-circle" size={wp(5)} color="#6B7280" />
            </Pressable>
            <Text style={styles.replyIndicatorText} numberOfLines={1}>
              رداً على: {replyingTo.comment_text}
            </Text>
            <Ionicons name="return-down-back" size={wp(4)} color="#2F6FDB" />
          </View>
        )}
        <View style={styles.inputRow}>
          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              (!commentText.trim() || isSending) && styles.sendButtonDisabled,
              pressed && commentText.trim() && styles.sendButtonPressed,
            ]}
            onPress={handleSendComment}
            disabled={!commentText.trim() || isSending}
          >
            {isSending
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : <Ionicons name="send" size={wp(4.5)} color="#FFFFFF" />}
          </Pressable>
          <TextInput
            style={styles.textInput}
            placeholder={replyingTo ? 'اكتب رداً...' : 'اكتب تعليقاً...'}
            placeholderTextColor="#9CA3AF"
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
            textAlign="right"
          />
        </View>
      </View>

      {/* ── Provider Profile Modal ── */}
      <Modal
        visible={providerModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setProviderModalVisible(false)}
      >
        <View style={styles.providerModalOverlay}>
          <Pressable style={styles.providerModalBackdrop} onPress={() => setProviderModalVisible(false)} />
          <View style={styles.providerModalContainer}>
            <View style={styles.modalHandle} />

            <View style={styles.providerModalHeader}>
              <Pressable style={styles.modalCloseBtn} onPress={() => setProviderModalVisible(false)}>
                <Ionicons name="close" size={wp(5)} color="#6B7280" />
              </Pressable>
              <Text style={styles.providerModalTitle}>ملف مقدم الخدمة</Text>
              <View style={{ width: wp(9) }} />
            </View>

            {providerLoading ? (
              <View style={styles.providerLoadingContainer}>
                <ActivityIndicator size="large" color="#2F6FDB" />
                <Text style={styles.providerLoadingText}>جاري تحميل البيانات...</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.providerModalContent}>
                <View style={styles.providerHero}>
                  <View style={styles.providerHeroBg} />
                  <View style={styles.providerAvatarWrapper}>
                    {providerProfile?.profile_picture ? (
                      <Image
                        source={{
                          uri: providerProfile.profile_picture.startsWith('http') ||
                               providerProfile.profile_picture.startsWith('data:') ||
                               providerProfile.profile_picture.startsWith('file:')
                            ? providerProfile.profile_picture
                            : `${ENV.API_BASE_URL}${providerProfile.profile_picture.startsWith('/') ? '' : '/'}${providerProfile.profile_picture}`
                        }}
                        style={styles.providerAvatar}
                      />
                    ) : (
                      <View style={styles.providerAvatarFallback}>
                        <Text style={styles.providerAvatarFallbackText}>
                          {providerUser?.firstname?.charAt(0)?.toUpperCase() || 'م'}
                        </Text>
                      </View>
                    )}
                    <View style={styles.onlineDot} />
                  </View>

                  <Text style={styles.providerName}>
                    {providerUser ? `${providerUser.firstname ?? ''} ${providerUser.lastname ?? ''}`.trim() : 'مقدم الخدمة'}
                  </Text>
                  {providerProfile?.business_name && (
                    <Text style={styles.providerBusinessName}>{providerProfile.business_name}</Text>
                  )}
                  {providerProfile?.category && (
                    <View style={styles.categoryChip}>
                      <Ionicons name="briefcase-outline" size={wp(3.5)} color="#2F6FDB" />
                      <Text style={styles.categoryChipText}>{providerProfile.category}</Text>
                    </View>
                  )}

                  <View style={styles.ratingRow}>
                    {providerRating !== null ? (
                      <>
                        <Text style={styles.ratingCount}>({providerRatingCount} ratings)</Text>
                        <Text style={styles.ratingNumber}>{providerRating}</Text>
                        <View style={styles.starsRow}>{renderStars(providerRating)}</View>
                      </>
                    ) : (
                      <Text style={styles.noRatingText}>No ratings yet</Text>
                    )}
                  </View>
                </View>

                <View style={styles.providerInfoRow}>
                  {providerProfile?.city && (
                    <View style={styles.providerInfoCard}>
                      <View style={[styles.infoIconCircle, { backgroundColor: '#EEF5FF' }]}>
                        <Ionicons name="location" size={wp(5)} color="#2F6FDB" />
                      </View>
                      <Text style={styles.providerInfoLabel}>City</Text>
                      <Text style={styles.providerInfoValue}>{providerProfile.city}</Text>
                    </View>
                  )}
                  {providerProfile?.phone && (
                    <View style={styles.providerInfoCard}>
                      <View style={[styles.infoIconCircle, { backgroundColor: '#F0FDF4' }]}>
                        <Ionicons name="call" size={wp(5)} color="#10B981" />
                      </View>
                      <Text style={styles.providerInfoLabel}>Phone</Text>
                      <Text style={styles.providerInfoValue}>{providerProfile.phone}</Text>
                    </View>
                  )}
                </View>

                {providerProfile?.description && (
                  <View style={styles.providerDescCard}>
                    <Text style={styles.providerDescTitle}>About the provider</Text>
                    <Text style={styles.providerDescText}>{providerProfile.description}</Text>
                  </View>
                )}

                <View style={styles.actionButtons}>
                  <Pressable
                    style={({ pressed }) => [styles.messageButton, pressed && styles.messageButtonPressed]}
                    onPress={handleMessageProvider}
                  >
                    <Ionicons name="chatbubble-ellipses" size={wp(5)} color="#FFFFFF" />
                    <Text style={styles.messageButtonText}>إرسال رسالة</Text>
                  </Pressable>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <CustomModal
        visible={modalVisible}
        type={modalType}
        message={modalMessage}
        primaryButtonText="موافق"
        onPrimaryPress={() => setModalVisible(false)}
        onClose={() => setModalVisible(false)}
        autoClose={modalType === 'success'}
        autoCloseDelay={1500}
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
  backButton: { width: wp(10), height: wp(10), borderRadius: wp(5), backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  backButtonText: { fontSize: wp(8), color: '#1F2937', fontWeight: 'bold', marginLeft: wp(1) },
  buttonPressed: { opacity: 0.7, transform: [{ scale: 0.95 }] },
  headerContent: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: wp(5), fontWeight: '700', color: '#1F2937' },
  headerSubtitle: { fontSize: wp(3.5), color: '#6B7280', marginTop: hp(0.3) },
  menuButton: { width: wp(10), height: wp(10), borderRadius: wp(5), backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  menuDots: { flexDirection: 'column', gap: hp(0.4) },
  dot: { width: wp(1.2), height: wp(1.2), borderRadius: wp(0.6), backgroundColor: '#6B7280' },

  dropdownContainer: { position: 'absolute', top: hp(12), right: wp(4), zIndex: 1000 },
  dropdownMenu: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8, minWidth: wp(45) },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', padding: wp(4) },
  dropdownItemPressed: { backgroundColor: '#F9FAFB' },
  dropdownIconContainer: { width: wp(9), height: wp(9), borderRadius: wp(4.5), backgroundColor: '#EEF5FF', justifyContent: 'center', alignItems: 'center', marginLeft: wp(3) },
  dropdownIconDanger: { backgroundColor: '#FEE2E2' },
  dropdownIcon: { fontSize: wp(4.5) },
  dropdownText: { fontSize: wp(4), fontWeight: '600', color: '#1F2937', textAlign: 'right', flex: 1 },
  dropdownTextDanger: { color: '#DC2626' },
  dropdownDivider: { height: 1, backgroundColor: '#E5E7EB' },
  dropdownOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 },

  scrollView: { flex: 1 },
  scrollContent: { padding: wp(4) },

  statusBanner: { borderRadius: 16, padding: wp(4), marginBottom: hp(3), borderWidth: 2, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  statusIconCircle: { width: wp(12), height: wp(12), borderRadius: wp(6), justifyContent: 'center', alignItems: 'center', marginRight: wp(3) },
  statusIconText: { fontSize: wp(6), color: '#FFFFFF' },
  statusTextContainer: { flex: 1 },
  statusLabel: { fontSize: wp(3.5), color: '#6B7280', marginBottom: hp(0.3), textAlign: 'right' },
  statusValue: { fontSize: wp(4.5), fontWeight: '700', textAlign: 'right' },
  statusBadge: { backgroundColor: '#FFFFFF', paddingHorizontal: wp(3), paddingVertical: hp(0.5), borderRadius: 12 },
  statusBadgeText: { fontSize: wp(3), color: '#6B7280', fontWeight: '600' },

  section: { marginBottom: hp(2.5) },
  sectionTitle: { fontSize: wp(4.5), fontWeight: '700', color: '#1F2937', marginBottom: hp(1.5), textAlign: 'right' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: wp(4), borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  serviceType: { fontSize: wp(4.5), fontWeight: '700', color: '#2F6FDB', textAlign: 'right' },
  description: { fontSize: wp(4), color: '#4B5563', lineHeight: hp(3), textAlign: 'right' },
  gridRow: { flexDirection: 'row', gap: wp(3), marginBottom: hp(2.5) },
  gridCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: wp(4), borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  gridLabel: { fontSize: wp(3.5), color: '#6B7280', marginBottom: hp(1), textAlign: 'right', fontWeight: '600' },
  gridValue: { fontSize: wp(3.8), color: '#1F2937', fontWeight: '600', lineHeight: hp(2.5), textAlign: 'right' },
  zipBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: wp(2), paddingVertical: hp(0.3), borderRadius: 6, alignSelf: 'flex-end', marginTop: hp(0.5) },
  zipBadgeText: { fontSize: wp(3), color: '#6B7280', fontWeight: '600' },
  priceValue: { fontSize: wp(5.5), color: '#16A34A', fontWeight: '800', textAlign: 'right' },
  noPriceText: { fontSize: wp(4), color: '#9CA3AF', fontStyle: 'italic', textAlign: 'right' },
  imageCard: { backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  serviceImage: { width: '100%', height: hp(30) },
  imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: wp(3), backgroundColor: 'rgba(0,0,0,0.5)' },
  viewImageButton: { backgroundColor: '#FFFFFF', paddingVertical: hp(1), paddingHorizontal: wp(4), borderRadius: 8, alignSelf: 'flex-start' },
  viewImageButtonText: { fontSize: wp(3.5), color: '#1F2937', fontWeight: '600' },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start' },
  timelineDot: { width: wp(3), height: wp(3), borderRadius: wp(1.5), backgroundColor: '#2F6FDB', marginTop: hp(0.5), marginRight: wp(3) },
  timelineContent: { flex: 1 },
  timelineLabel: { fontSize: wp(3.5), color: '#6B7280', marginBottom: hp(0.3), textAlign: 'right' },
  timelineValue: { fontSize: wp(4), color: '#1F2937', fontWeight: '600', textAlign: 'right' },

  commentsSection: { marginTop: hp(1), marginBottom: hp(2) },
  commentsSectionLabelWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: hp(2.5), gap: wp(3) },
  commentsSectionLine: { flex: 1, height: 1.5, backgroundColor: '#E2E8F0', borderRadius: 2 },
  commentsSectionLabel: { flexDirection: 'row', alignItems: 'center', gap: wp(1.5), backgroundColor: '#2F6FDB', paddingHorizontal: wp(4), paddingVertical: hp(0.9), borderRadius: 50, shadowColor: '#2F6FDB', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 5 },
  commentsSectionLabelText: { fontSize: wp(3.8), fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },
  commentsSectionCount: { backgroundColor: '#FFFFFF', borderRadius: wp(3), minWidth: wp(5.5), height: wp(5.5), justifyContent: 'center', alignItems: 'center', paddingHorizontal: wp(1), marginLeft: wp(0.5) },
  commentsSectionCountText: { fontSize: wp(2.8), fontWeight: '800', color: '#2F6FDB' },

  commentsLoading: { paddingVertical: hp(4), alignItems: 'center', gap: hp(1) },
  commentsLoadingText: { fontSize: wp(3.5), color: '#6B7280' },
  commentsEmpty: { paddingVertical: hp(5), alignItems: 'center', gap: hp(1.5), backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1.5, borderColor: '#E2E8F0', borderStyle: 'dashed', marginHorizontal: wp(1) },
  commentsEmptyIconWrap: { width: wp(18), height: wp(18), borderRadius: wp(9), backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: hp(0.5) },
  commentsEmptyText: { fontSize: wp(4.5), fontWeight: '700', color: '#374151' },
  commentsEmptySubText: { fontSize: wp(3.5), color: '#9CA3A', textAlign: 'center', paddingHorizontal: wp(4) },

  commentsList: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 },
  commentCard: { paddingVertical: hp(2), paddingHorizontal: wp(4), borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  commentCardFirst: { borderTopWidth: 0 },
  commentTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: hp(1) },
  commentMeta: { flexDirection: 'row', alignItems: 'center', gap: wp(2) },
  commentAuthorLabel: { fontSize: wp(3.5), fontWeight: '700' },
  authorLabelMe: { color: '#10B981' },
  authorLabelProvider: { color: '#2F6FDB' },
  commentTime: { fontSize: wp(3), color: '#9CA3AF' },

  commentBubble: { borderRadius: 14, paddingVertical: hp(1.2), paddingHorizontal: wp(3.5), marginBottom: hp(0.8), maxWidth: '90%' },
  commentBubbleMe: { backgroundColor: '#EEF5FF', alignSelf: 'flex-end', borderTopRightRadius: 4 },
  commentBubbleProvider: { backgroundColor: '#F3F4F6', alignSelf: 'flex-start', borderTopLeftRadius: 4 },
  commentText: { fontSize: wp(3.8), lineHeight: hp(2.8), textAlign: 'right' },
  commentTextMe: { color: '#1E3A5F' },
  commentTextProvider: { color: '#374151' },

  replyButton: { flexDirection: 'row', alignItems: 'center', gap: wp(1), alignSelf: 'flex-start', paddingVertical: hp(0.4), paddingHorizontal: wp(1.5) },
  replyButtonText: { fontSize: wp(3.2), color: '#6B7280', fontWeight: '600' },

  repliesContainer: { marginTop: hp(1.5), paddingTop: hp(1) },
  repliesDivider: { flexDirection: 'row', alignItems: 'center', gap: wp(2), marginBottom: hp(1.5), paddingHorizontal: wp(1) },
  repliesDividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  repliesDividerText: { fontSize: wp(3), color: '#9CA3AF', fontWeight: '600' },

  replyCard: { flexDirection: 'row', marginBottom: hp(1.2), paddingRight: wp(1) },
  replyThreadLine: { width: 2, backgroundColor: '#BFDBFE', borderRadius: 2, marginRight: wp(3), marginLeft: wp(1) },
  replyBubble: { flex: 1 },
  replyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: hp(0.6) },
  replyAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: wp(1.5) },
  replyAuthorName: { fontSize: wp(3.2), fontWeight: '700' },
  replyAuthorMe: { color: '#10B981' },
  replyAuthorProvider: { color: '#2F6FDB' },
  replyTime: { fontSize: wp(2.8), color: '#9CA3AF' },
  replyText: { fontSize: wp(3.5), color: '#4B5563', lineHeight: hp(2.5), textAlign: 'right' },

  avatarProvider: { backgroundColor: '#2F6FDB' },
  avatarClient: { backgroundColor: '#10B981' },

  inputContainer: {
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB',
    paddingHorizontal: wp(4), paddingTop: hp(1.5),
  },
  replyIndicator: { flexDirection: 'row', alignItems: 'center', gap: wp(2), backgroundColor: '#EEF5FF', borderRadius: 10, paddingHorizontal: wp(3), paddingVertical: hp(0.8), marginBottom: hp(1), borderLeftWidth: 3, borderLeftColor: '#2F6FDB' },
  replyIndicatorText: { flex: 1, fontSize: wp(3.2), color: '#2F6FDB', textAlign: 'right', fontWeight: '500' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: wp(3) },
  textInput: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: wp(4), paddingVertical: hp(1.2), fontSize: wp(3.8), color: '#1F2937', maxHeight: hp(12), minHeight: hp(5.5) },
  sendButton: { width: wp(11), height: wp(11), borderRadius: wp(5.5), backgroundColor: '#2F6FDB', justifyContent: 'center', alignItems: 'center', shadowColor: '#2F6FDB', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  sendButtonDisabled: { backgroundColor: '#D1D5DB', shadowOpacity: 0, elevation: 0 },
  sendButtonPressed: { opacity: 0.8, transform: [{ scale: 0.95 }] },

  providerModalOverlay: { flex: 1, justifyContent: 'flex-end' },
  providerModalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' },
  providerModalContainer: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: hp(88), paddingBottom: hp(4) },
  modalHandle: { width: wp(12), height: hp(0.6), backgroundColor: '#E5E7EB', borderRadius: 3, alignSelf: 'center', marginTop: hp(1.5), marginBottom: hp(0.5) },
  providerModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: wp(5), paddingVertical: hp(1.5), borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalCloseBtn: { width: wp(9), height: wp(9), borderRadius: wp(4.5), backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  providerModalTitle: { fontSize: wp(4.5), fontWeight: '700', color: '#1F2937' },
  providerLoadingContainer: { paddingVertical: hp(8), alignItems: 'center', gap: hp(2) },
  providerLoadingText: { fontSize: wp(3.5), color: '#6B7280' },
  providerModalContent: { paddingBottom: hp(2) },

  providerHero: { alignItems: 'center', paddingTop: hp(1), paddingBottom: hp(3), paddingHorizontal: wp(5), position: 'relative', overflow: 'hidden' },
  providerHeroBg: { position: 'absolute', top: 0, left: 0, right: 0, height: hp(12), backgroundColor: '#EEF5FF', borderBottomLeftRadius: wp(8), borderBottomRightRadius: wp(8) },
  providerAvatarWrapper: { position: 'relative', marginTop: hp(2), marginBottom: hp(1.5) },
  providerAvatar: { width: wp(22), height: wp(22), borderRadius: wp(11), borderWidth: 3, borderColor: '#FFFFFF' },
  providerAvatarFallback: { width: wp(22), height: wp(22), borderRadius: wp(11), backgroundColor: '#2F6FDB', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFFFFF', shadowColor: '#2F6FDB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  providerAvatarFallbackText: { fontSize: wp(10), fontWeight: '800', color: '#FFFFFF' },
  onlineDot: { position: 'absolute', bottom: wp(0.5), right: wp(0.5), width: wp(4), height: wp(4), borderRadius: wp(2), backgroundColor: '#10B981', borderWidth: 2, borderColor: '#FFFFFF' },
  providerName: { fontSize: wp(5.5), fontWeight: '800', color: '#1F2937', marginBottom: hp(0.3), textAlign: 'center' },
  providerBusinessName: { fontSize: wp(3.8), color: '#6B7280', fontWeight: '500', marginBottom: hp(1), textAlign: 'center' },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: wp(1.5), backgroundColor: '#EEF5FF', paddingHorizontal: wp(3.5), paddingVertical: hp(0.6), borderRadius: 20, marginBottom: hp(1.5) },
  categoryChipText: { fontSize: wp(3.5), color: '#2F6FDB', fontWeight: '600' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: wp(1.5), backgroundColor: '#FFFBEB', paddingHorizontal: wp(4), paddingVertical: hp(0.8), borderRadius: 20 },
  starsRow: { flexDirection: 'row', alignItems: 'center' },
  ratingNumber: { fontSize: wp(4), fontWeight: '800', color: '#F59E0B' },
  ratingCount: { fontSize: wp(3), color: '#9CA3AF' },
  noRatingText: { fontSize: wp(3.5), color: '#9CA3AF', fontStyle: 'italic' },

  providerInfoRow: { flexDirection: 'row', gap: wp(3), paddingHorizontal: wp(5), marginBottom: hp(2) },
  providerInfoCard: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 14, padding: wp(3.5), alignItems: 'center', gap: hp(0.5), borderWidth: 1, borderColor: '#E5E7EB' },
  infoIconCircle: { width: wp(10), height: wp(10), borderRadius: wp(5), justifyContent: 'center', alignItems: 'center', marginBottom: hp(0.5) },
  providerInfoLabel: { fontSize: wp(3), color: '#9CA3AF', fontWeight: '500' },
  providerInfoValue: { fontSize: wp(3.8), color: '#1F2937', fontWeight: '700', textAlign: 'center' },

  providerDescCard: { marginHorizontal: wp(5), backgroundColor: '#F9FAFB', borderRadius: 14, padding: wp(4), borderWidth: 1, borderColor: '#E5E7EB', marginBottom: hp(2.5) },
  providerDescTitle: { fontSize: wp(3.8), fontWeight: '700', color: '#374151', marginBottom: hp(0.8), textAlign: 'right' },
  providerDescText: { fontSize: wp(3.5), color: '#6B7280', lineHeight: hp(2.6), textAlign: 'right' },

  actionButtons: { paddingHorizontal: wp(5) },
  messageButton: { backgroundColor: '#2F6FDB', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: wp(2), paddingVertical: hp(2), borderRadius: 14, shadowColor: '#2F6FDB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  messageButtonPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  messageButtonText: { fontSize: wp(4.5), fontWeight: '700', color: '#FFFFFF' },

  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: wp(6) },
  errorIconContainer: { width: wp(24), height: wp(24), borderRadius: wp(12), backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginBottom: hp(3) },
  errorIcon: { fontSize: wp(12) },
  errorTitle: { fontSize: wp(6), fontWeight: '700', color: '#1F2937', marginBottom: hp(1) },
  errorSubtitle: { fontSize: wp(4), color: '#6B7280', textAlign: 'center', marginBottom: hp(3) },
  backToListButton: { backgroundColor: '#2F6FDB', paddingVertical: hp(1.5), paddingHorizontal: wp(8), borderRadius: 12 },
  backToListButtonText: { fontSize: wp(4), fontWeight: '700', color: '#FFFFFF' },
});