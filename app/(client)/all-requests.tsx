import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import LoadingComponent from '../../components/LoadingComponent';
import { ENV } from '../../config/env';
import { useAuth } from '../../context/AuthContext';
import { hp, wp } from '../../helpers/common';

type RequestStatus = 'all' | 'pending' | 'in_progress' | 'completed';

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

export default function AllRequestsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<RequestStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Hardware back button ─────────────────────────────────────────────────
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      router.back();
      return true;
    });
    return () => backHandler.remove();
  }, [router]);
  // ────────────────────────────────────────────────────────────────────────

  // Fetch all user's requests
  const fetchRequests = useCallback(async (showLoader = true) => {
    if (!user?.id) return;

    try {
      if (showLoader) setIsLoading(true);
      
      const response = await fetch(`${ENV.API_BASE_URL}/service_request`);
      
      if (response.ok) {
        const allData: ServiceRequest[] = await response.json();
        
        const userRequests = allData.filter(
          request => request.id_user === user.id
        );
        
        console.log('📊 Total requests in DB:', allData.length);
        console.log('👤 Current user requests:', userRequests.length);
        
        const sortedData = userRequests.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        setRequests(sortedData);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchRequests(false);
  }, [fetchRequests]);

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [fetchRequests])
  );

  const getRequestStatus = (request: ServiceRequest): string => {
    if (request.agree) {
      return 'completed';
    }
    return 'pending';
  };

  const filteredRequests = useMemo(() => {
    let filtered = requests;

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(req => getRequestStatus(req) === selectedStatus);
    }

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(req => 
        req.service_type.toLowerCase().includes(query) ||
        req.desc_service.toLowerCase().includes(query) ||
        req.service_address.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [requests, selectedStatus, searchQuery]);

  const statusCounts = useMemo(() => {
    const counts = {
      all: requests.length,
      pending: 0,
      in_progress: 0,
      completed: 0,
    };

    requests.forEach(req => {
      const status = getRequestStatus(req);
      if (status === 'pending') counts.pending++;
      else if (status === 'in_progress') counts.in_progress++;
      else if (status === 'completed') counts.completed++;
    });

    return counts;
  }, [requests]);

  const statusOptions = [
    { key: 'all', label: 'الكل', count: statusCounts.all },
    { key: 'pending', label: 'قيد الانتظار', count: statusCounts.pending },
    { key: 'in_progress', label: 'قيد التنفيذ', count: statusCounts.in_progress },
    { key: 'completed', label: 'مكتمل', count: statusCounts.completed },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'in_progress': return '#3B82F6';
      case 'completed': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'قيد الانتظار';
      case 'in_progress': return 'قيد التنفيذ';
      case 'completed': return 'مكتمل';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'اليوم';
    if (diffDays === 1) return 'أمس';
    if (diffDays < 7) return `منذ ${diffDays} أيام`;
    if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسابيع`;
    return date.toLocaleDateString('ar-EG');
  };

  const handleRequestPress = (requestId: number) => {
    router.push(`/(client)/request-details?id=${requestId}`);
  };

  const renderRequestCard = ({ item }: { item: ServiceRequest }) => {
    const status = getRequestStatus(item);
    const statusColor = getStatusColor(status);
    
    return (
      <Pressable
        style={({ pressed }) => [
          styles.requestCard,
          pressed && styles.requestCardPressed,
        ]}
        onPress={() => handleRequestPress(item.id)}
      >
        <View style={styles.requestHeader}>
          <View style={styles.requestTitleRow}>
            <Text style={styles.requestServiceType}>{item.service_type}</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {getStatusLabel(status)}
              </Text>
            </View>
          </View>
          <Text style={styles.requestDate}>{formatDate(item.created_at)}</Text>
        </View>

        <Text style={styles.requestDescription} numberOfLines={2}>
          {item.desc_service}
        </Text>

        <View style={styles.requestFooter}>
          <View style={styles.locationContainer}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.locationText}>
              {item.service_address}
              {item.zip_code && `, ${item.zip_code}`}
            </Text>
          </View>
          
          {item.price_service && (
            <View style={styles.priceContainer}>
              <Text style={styles.priceAmount}>{item.price_service} €</Text>
            </View>
          )}
        </View>

        <View style={styles.arrowContainer}>
          <Text style={styles.arrow}>›</Text>
        </View>
      </Pressable>
    );
  };

  if (isLoading) {
    return <LoadingComponent message="جاري تحميل الطلبات..." />;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </Pressable>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>جميع الطلبات</Text>
          <Text style={styles.headerSubtitle}>{requests.length} طلب</Text>
        </View>

        <View style={styles.placeholderButton} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث عن طلب..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <Text style={styles.clearIcon}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Status Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statusFilterContainer}
        contentContainerStyle={styles.statusFilterContent}
      >
        {statusOptions.map((option) => (
          <Pressable
            key={option.key}
            style={[
              styles.statusTab,
              selectedStatus === option.key && styles.statusTabActive,
            ]}
            onPress={() => setSelectedStatus(option.key as RequestStatus)}
          >
            <Text
              style={[
                styles.statusTabText,
                selectedStatus === option.key && styles.statusTabTextActive,
              ]}
            >
              {option.label}
            </Text>
            <View
              style={[
                styles.statusTabBadge,
                selectedStatus === option.key && styles.statusTabBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.statusTabBadgeText,
                  selectedStatus === option.key && styles.statusTabBadgeTextActive,
                ]}
              >
                {option.count}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* Requests List */}
      <FlatList
        data={filteredRequests}
        renderItem={renderRequestCard}
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
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>لا توجد طلبات</Text>
            <Text style={styles.emptyText}>
              {searchQuery.trim() !== '' 
                ? 'لم يتم العثور على أي طلبات تطابق البحث'
                : selectedStatus !== 'all'
                ? 'لا توجد طلبات بهذه الحالة'
                : 'لم تقم بإنشاء أي طلبات بعد'}
            </Text>
            {searchQuery.trim() === '' && selectedStatus === 'all' && (
              <Pressable 
                style={styles.emptyButton}
                onPress={() => router.push('/(client)/(tabs)/new-post')}
              >
                <Text style={styles.emptyButtonText}>إنشاء طلب جديد</Text>
              </Pressable>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingTop: hp(6),
    paddingBottom: hp(2),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: wp(8),
    color: '#1F2937',
    fontWeight: 'bold',
    marginLeft: wp(1),
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: wp(5),
    fontWeight: '700',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: wp(3.5),
    color: '#6B7280',
    marginTop: hp(0.3),
  },
  placeholderButton: {
    width: wp(10),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: wp(4),
    paddingHorizontal: wp(4),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    fontSize: wp(5),
    marginRight: wp(2),
  },
  searchInput: {
    flex: 1,
    paddingVertical: hp(1.5),
    fontSize: wp(4),
    color: '#1F2937',
  },
  clearIcon: {
    fontSize: wp(4),
    color: '#9CA3AF',
    padding: wp(2),
  },
  statusFilterContainer: {
    maxHeight: hp(7),
    marginBottom: hp(1),
  },
  statusFilterContent: {
    paddingHorizontal: wp(4),
    gap: wp(2),
  },
  statusTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: wp(2),
  },
  statusTabActive: {
    backgroundColor: '#2F6FDB',
    borderColor: '#2F6FDB',
  },
  statusTabText: {
    fontSize: wp(3.5),
    fontWeight: '600',
    color: '#6B7280',
  },
  statusTabTextActive: {
    color: '#FFFFFF',
  },
  statusTabBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.3),
    borderRadius: 10,
    minWidth: wp(6),
    alignItems: 'center',
  },
  statusTabBadgeActive: {
    backgroundColor: '#FFFFFF20',
  },
  statusTabBadgeText: {
    fontSize: wp(3),
    fontWeight: '700',
    color: '#1F2937',
  },
  statusTabBadgeTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: wp(4),
    paddingBottom: hp(10),
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: wp(4),
    marginBottom: hp(2),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  requestCardPressed: {
    backgroundColor: '#F9FAFB',
    transform: [{ scale: 0.98 }],
  },
  requestHeader: {
    marginBottom: hp(1.5),
  },
  requestTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(0.5),
  },
  requestServiceType: {
    fontSize: wp(4.5),
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.5),
    borderRadius: 12,
    gap: wp(1.5),
  },
  statusDot: {
    width: wp(2),
    height: wp(2),
    borderRadius: wp(1),
  },
  statusText: {
    fontSize: wp(3),
    fontWeight: '600',
  },
  requestDate: {
    fontSize: wp(3),
    color: '#9CA3AF',
  },
  requestDescription: {
    fontSize: wp(3.5),
    color: '#6B7280',
    lineHeight: hp(2.5),
    marginBottom: hp(1.5),
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: hp(1.5),
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationIcon: {
    fontSize: wp(4),
    marginRight: wp(1),
  },
  locationText: {
    fontSize: wp(3.5),
    color: '#6B7280',
    fontWeight: '500',
  },
  priceContainer: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.5),
    borderRadius: 8,
  },
  priceAmount: {
    fontSize: wp(3.5),
    fontWeight: '700',
    color: '#16A34A',
  },
  arrowContainer: {
    position: 'absolute',
    right: wp(4),
    top: '50%',
    transform: [{ translateY: -wp(3) }],
  },
  arrow: {
    fontSize: wp(6),
    color: '#D1D5DB',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: hp(10),
  },
  emptyIcon: {
    fontSize: wp(20),
    marginBottom: hp(2),
  },
  emptyTitle: {
    fontSize: wp(5),
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: hp(1),
  },
  emptyText: {
    fontSize: wp(4),
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: wp(10),
    marginBottom: hp(2),
  },
  emptyButton: {
    backgroundColor: '#2F6FDB',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(8),
    borderRadius: 12,
    marginTop: hp(1),
  },
  emptyButtonText: {
    fontSize: wp(4),
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
