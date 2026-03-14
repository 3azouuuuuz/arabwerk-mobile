import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ClientHeader from '../../../components/ClientHeader';
import { ENV } from '../../../config/env';
import { useAuth } from '../../../context/AuthContext';
import { hp, wp } from '../../../helpers/common';

interface ServiceRequest {
  id: number;
  id_user: number;
  service_type: string;
  service_images: string | null;
  service_address: string;
  zip_code: string;
  price_service: number | null;
  desc_service: string;
  created_at: string;
  status?: string;
  agree?: boolean;
}

export default function ClientHomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<ServiceRequest[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchUserPosts();
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) fetchUserPosts();
    }, [user?.id])
  );

  const fetchUserPosts = async () => {
    if (!user?.id) return;
    try {
      setIsLoadingPosts(true);
      const response = await fetch(
        `${ENV.API_BASE_URL}/service_request?id_user=${user.id}`
      );
      if (response.ok) {
        const data = await response.json();
        const userPosts = data.filter((post: ServiceRequest) => post.id_user === user.id);
        const sortedPosts = userPosts
          .sort((a: ServiceRequest, b: ServiceRequest) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          .slice(0, 2);
        setPosts(sortedPosts);
      }
    } catch (error) {
      console.error('Error fetching user posts:', error);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInMs = now.getTime() - postDate.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    if (diffInHours < 1) return 'منذ أقل من ساعة';
    if (diffInHours < 24) return `منذ ${diffInHours} ${diffInHours === 1 ? 'ساعة' : 'ساعات'}`;
    if (diffInDays === 1) return 'منذ يوم';
    if (diffInDays === 2) return 'منذ يومين';
    return `منذ ${diffInDays} أيام`;
  };

  const handleNotificationPress = () => {
    console.log('🔔 Notifications pressed');
  };

  const handlePostNewJob = () => {
    router.push('/(client)/(tabs)/new-post');
  };

  const handleViewAllPosts = () => {
    router.push('/(client)/all-requests');
  };

  const handlePostPress = (postId: number) => {
    router.push(`/(client)/request-details?id=${postId}`);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ClientHeader onNotificationPress={handleNotificationPress} />
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Greeting */}
        <View style={styles.greetingSection}>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.userName}>{user?.firstname} {user?.lastname}</Text>
        </View>

        {/* Post New Job Button */}
        <Pressable
          style={({ pressed }) => [styles.postJobButton, pressed && styles.postJobButtonPressed]}
          onPress={handlePostNewJob}
        >
          <View style={styles.postJobContent}>
            <View style={styles.postJobIcon}>
              <Text style={styles.postJobIconText}>✏️</Text>
            </View>
            <View style={styles.postJobTextContainer}>
              <Text style={styles.postJobTitle}>Post a New Job</Text>
              <Text style={styles.postJobSubtitle}>Find the perfect professional for your needs</Text>
            </View>
          </View>
        </Pressable>

        {/* My Recent Posts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Posts</Text>
            {posts.length > 0 && (
              <Pressable onPress={handleViewAllPosts}>
                <Text style={styles.viewAllText}>View All</Text>
              </Pressable>
            )}
          </View>

          {isLoadingPosts ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2F6FDB" />
              <Text style={styles.loadingText}>Loading your posts...</Text>
            </View>
          ) : posts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📝</Text>
              <Text style={styles.emptyTitle}>No posts yet</Text>
              <Text style={styles.emptySubtitle}>
                Create your first job post to get started
              </Text>
              <Pressable style={styles.emptyButton} onPress={handlePostNewJob}>
                <Text style={styles.emptyButtonText}>Create Post</Text>
              </Pressable>
            </View>
          ) : (
            posts.map((post) => (
              <Pressable
                key={post.id}
                style={({ pressed }) => [
                  styles.postCard,
                  pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
                ]}
                onPress={() => handlePostPress(post.id)}
              >
                <View style={styles.postHeader}>
                  <View style={[
                    styles.postStatusBadge,
                    { backgroundColor: post.agree ? '#ECFDF5' : '#FFF7ED' }
                  ]}>
                    <Text style={[
                      styles.postStatusText,
                      { color: post.agree ? '#059669' : '#D97706' }
                    ]}>
                      {post.agree ? '✓ تمت الموافقة' : '⏳ قيد المراجعة'}
                    </Text>
                  </View>
                  <Text style={styles.postTitle}>{post.service_type}</Text>
                </View>
                <Text style={styles.postDescription} numberOfLines={2}>
                  {post.desc_service}
                </Text>
                <Text style={styles.postLocation}>
                  📍 {post.service_address}{post.zip_code ? `, ${post.zip_code}` : ''}
                </Text>
                {post.price_service && (
                  <Text style={styles.postBudget}>
                    💰 Budget: €{post.price_service}
                  </Text>
                )}
                <View style={styles.postFooter}>
                  <View style={styles.postInfo}>
                    <FontAwesome name="clock-o" size={14} color="#6B7280" />
                    <Text style={styles.postInfoText}>
                      {formatTimeAgo(post.created_at)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContainer: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent: { paddingHorizontal: wp(6), paddingTop: hp(1), paddingBottom: hp(15) },
  greetingSection: { marginBottom: hp(3) },
  greeting: { fontSize: wp(4), color: '#6B7280' },
  userName: { fontSize: wp(6.5), fontWeight: '700', color: '#1F2937' },
  postJobButton: {
    backgroundColor: '#2F6FDB', borderRadius: 16, padding: wp(5), marginBottom: hp(3),
    shadowColor: '#2F6FDB', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  postJobButtonPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  postJobContent: { flexDirection: 'row', alignItems: 'center' },
  postJobIcon: {
    width: wp(14), height: wp(14), borderRadius: wp(7),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center', alignItems: 'center', marginRight: wp(4),
  },
  postJobIconText: { fontSize: wp(7) },
  postJobTextContainer: { flex: 1 },
  postJobTitle: { fontSize: wp(5), fontWeight: '700', color: '#FFFFFF', marginBottom: hp(0.5) },
  postJobSubtitle: { fontSize: wp(3.5), color: 'rgba(255, 255, 255, 0.9)' },
  section: { marginBottom: hp(3) },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: hp(2),
  },
  sectionTitle: { fontSize: wp(5), fontWeight: '700', color: '#1F2937' },
  viewAllText: { fontSize: wp(3.5), fontWeight: '600', color: '#2F6FDB' },
  loadingContainer: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: wp(8), alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  loadingText: { marginTop: hp(2), fontSize: wp(3.5), color: '#6B7280' },
  emptyContainer: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: wp(8), alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  emptyIcon: { fontSize: wp(16), marginBottom: hp(2) },
  emptyTitle: { fontSize: wp(5), fontWeight: '700', color: '#1F2937', marginBottom: hp(1) },
  emptySubtitle: { fontSize: wp(3.5), color: '#6B7280', textAlign: 'center', marginBottom: hp(3) },
  emptyButton: {
    backgroundColor: '#2F6FDB', paddingVertical: hp(1.5),
    paddingHorizontal: wp(8), borderRadius: 12,
  },
  emptyButtonText: { fontSize: wp(4), fontWeight: '700', color: '#FFFFFF' },
  postCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: wp(4), marginBottom: hp(2),
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  postHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: hp(1),
  },
  postTitle: {
    fontSize: wp(4.5), fontWeight: '700', color: '#1F2937',
    flex: 1, textAlign: 'right', paddingLeft: wp(2),
  },
  postStatusBadge: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.5), borderRadius: 8,
  },
  postStatusText: { fontSize: wp(3), fontWeight: '600' },
  postDescription: { fontSize: wp(3.5), color: '#6B7280', marginBottom: hp(1), lineHeight: wp(5) },
  postLocation: { fontSize: wp(3.5), color: '#4B5563', marginBottom: hp(0.5) },
  postBudget: { fontSize: wp(3.5), color: '#059669', fontWeight: '600', marginBottom: hp(1) },
  postFooter: {
    flexDirection: 'row', justifyContent: 'flex-start',
    alignItems: 'center', marginTop: hp(0.5),
  },
  postInfo: { flexDirection: 'row', alignItems: 'center', gap: wp(1.5) },
  postInfoText: { fontSize: wp(3.2), color: '#6B7280' },
});