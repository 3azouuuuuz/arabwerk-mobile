import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import ClientHeader from '../../../components/ClientHeader';
import CustomModal from '../../../components/CustomModal';
import LoadingComponent from '../../../components/LoadingComponent';
import { ENV } from '../../../config/env';
import { useAuth } from '../../../context/AuthContext';
import { hp, wp } from '../../../helpers/common';

interface Category {
  id: number;
  name: string;
}

export default function NewPostScreen() {
  const { user } = useAuth();
  const router = useRouter();

  // Form state
  const [service, setService] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [cityAndZip, setCityAndZip] = useState('');
  const [image, setImage] = useState<string | null>(null);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [isLocationSuggestionsOpen, setIsLocationSuggestionsOpen] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error' | 'warning'>('success');
  const [modalMessage, setModalMessage] = useState('');

  // Errors
  const [errors, setErrors] = useState({
    service: false,
    description: false,
    cityAndZip: false,
  });

  // Refs
  const locationInputRef = useRef<TextInput>(null);

  // ── Hardware back button ─────────────────────────────────────────────────
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showCategoryPicker) {
        setShowCategoryPicker(false);
        return true;
      }
      if (isLocationSuggestionsOpen) {
        setIsLocationSuggestionsOpen(false);
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [showCategoryPicker, isLocationSuggestionsOpen]);
  // ────────────────────────────────────────────────────────────────────────

  // Fetch categories on mount + pre-fill city
  useEffect(() => {
    fetchCategories();
    if (user?.city) {
      setCityAndZip(user.city);
    } else {
      fetchUserLocation();
    }
  }, []);

  const fetchCategories = async () => {
    try {
      setIsCategoriesLoading(true);
      const response = await fetch(`${ENV.API_BASE_URL}/category`);
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      showModal('error', 'فشل تحميل الفئات');
    } finally {
      setIsCategoriesLoading(false);
    }
  };

  const fetchUserLocation = async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(`${ENV.API_BASE_URL}/user_profiles?user_id=${user.id}`);
      const data = await response.json();
      if (data.length > 0 && data[0].location) {
        setCityAndZip(data[0].location);
      }
    } catch (error) {
      console.error('Error fetching user location:', error);
    }
  };

  // Fetch German cities from Geoapify API
  const fetchLocationSuggestions = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setLocationSuggestions([]);
      setIsLocationSuggestionsOpen(false);
      return;
    }

    try {
      const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
        query
      )}&type=city&filter=countrycode:de&limit=10&lang=en&apiKey=${ENV.GEOAPIFY_API_KEY}`;

      const response = await fetch(url);
      if (!response.ok) {
        console.error('Failed to fetch cities');
        setLocationSuggestions([]);
        setIsLocationSuggestionsOpen(false);
        return;
      }

      const data = await response.json();
      const cities =
        data?.features
          ?.map((f: any) => f?.properties?.city)
          .filter((c: string | null | undefined) => Boolean(c)) ?? [];

      const uniqueCities = Array.from(new Set(cities)).sort() as string[];
      setLocationSuggestions(uniqueCities);
      setIsLocationSuggestionsOpen(uniqueCities.length > 0);
    } catch (error) {
      console.error('Error fetching cities:', error);
      setLocationSuggestions([]);
      setIsLocationSuggestionsOpen(false);
    }
  };

  // Handle location change
  const handleLocationChange = (text: string) => {
    setCityAndZip(text);
    setErrors(prev => ({ ...prev, cityAndZip: false }));
    fetchLocationSuggestions(text);
  };

  // Select location from suggestions
  const selectLocationSuggestion = (location: string) => {
    setCityAndZip(location);
    setLocationSuggestions([]);
    setIsLocationSuggestionsOpen(false);
  };

  const handleImagePick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      showModal('warning', 'نحتاج إلى إذن للوصول إلى معرض الصور');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
    }
  };

  const showModal = (type: 'success' | 'error' | 'warning', message: string) => {
    setModalType(type);
    setModalMessage(message);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    if (modalType === 'success') {
      router.push('/(client)/(tabs)');
    }
  };

  const handleSubmit = async () => {
    // Validate form
    const newErrors = {
      service: service === '',
      description: description === '',
      cityAndZip: cityAndZip === '',
    };

    setErrors(newErrors);

    if (Object.values(newErrors).some(err => err)) {
      showModal('warning', 'الرجاء ملء جميع الحقول المطلوبة');
      return;
    }

    if (!user?.id) {
      showModal('error', 'يرجى تسجيل الدخول أولاً');
      return;
    }

    // Split city and zip code
    let actualCity = '';
    let actualZipCode = '';
    if (cityAndZip) {
      const parts = cityAndZip.split(',').map(s => s.trim());
      actualCity = parts[0] || '';
      actualZipCode = parts[1] || '';
    }

    setIsSubmitting(true);

    try {
      let imageUrl = '';

      // Upload image if selected
      if (image) {
        const formData = new FormData();
        const filename = image.split('/').pop() || 'image.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('file', {
          uri: image,
          name: filename,
          type,
        } as any);

        const uploadResponse = await fetch(`${ENV.API_BASE_URL}/upload`, {
          method: 'POST',
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          imageUrl = uploadResult.url || '';
        }
      }

      // Create service request
      const requestBody = {
        id_user: user.id,
        service_type: service,
        service_images: imageUrl || null,
        service_address: actualCity,
        zip_code: actualZipCode,
        price_service: budget === '' ? null : budget,
        desc_service: description,
      };

      const response = await fetch(`${ENV.API_BASE_URL}/service_request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('فشل إنشاء الطلب');
      }

      // Send notification to admins
      const notificationTitle = 'طلب مناقصة جديد';
      const notificationContent = `قام المستخدم ${user.firstname || 'غير معروف'} ${user.lastname || ''} (ID: ${user.id}) بنشر مناقصة جديدة لخدمة ${service} بمنطقة ${actualCity}.`;

      await fetch(`${ENV.API_BASE_URL}/notifications/send-to-admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: notificationTitle,
          content: notificationContent,
        }),
      });

      showModal('success', 'تم نشر طلبك بنجاح!');
    } catch (error) {
      console.error('Error submitting request:', error);
      showModal('error', 'حدث خطأ أثناء نشر الطلب');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNotificationPress = useCallback(() => {
    console.log('🔔 Notifications pressed');
  }, []);

  // Show loading screen while submitting
  if (isSubmitting) {
    return <LoadingComponent message="جاري نشر الطلب..." />;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ClientHeader onNotificationPress={handleNotificationPress} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* User Info */}
        {user && (
          <View style={styles.userSection}>
            <View style={styles.userAvatar}>
              <Text style={styles.userInitial}>
                {user.firstname?.[0]?.toUpperCase() || '?'}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {user.firstname} {user.lastname}
              </Text>
              <Text style={styles.userSubtitle}>انشر طلب الخدمة او مناقصة</Text>
            </View>
          </View>
        )}

        {/* Service Type Picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            نوع الخدمة <Text style={styles.required}>*</Text>
          </Text>
          <Pressable
            style={[styles.pickerButton, errors.service && styles.inputError]}
            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
          >
            <Text style={service ? styles.pickerButtonText : styles.pickerPlaceholder}>
              {service || 'اختر نوع الخدمة'}
            </Text>
            <Text style={[styles.pickerArrow, showCategoryPicker && styles.pickerArrowUp]}>
              ▼
            </Text>
          </Pressable>
          
          {/* Custom Category List */}
          {showCategoryPicker && (
            <View style={styles.categoryList}>
              {isCategoriesLoading ? (
                <View style={styles.categoryLoadingContainer}>
                  <Text style={styles.categoryLoadingText}>جاري التحميل...</Text>
                </View>
              ) : (
                <ScrollView 
                  style={styles.categoryScrollView}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                >
                  {categories.map((cat) => (
                    <Pressable
                      key={cat.id}
                      style={({ pressed }) => [
                        styles.categoryItem,
                        service === cat.name && styles.categoryItemSelected,
                        pressed && styles.categoryItemPressed,
                      ]}
                      onPress={() => {
                        setService(cat.name);
                        setShowCategoryPicker(false);
                        setErrors(prev => ({ ...prev, service: false }));
                      }}
                    >
                      <Text
                        style={[
                          styles.categoryItemText,
                          service === cat.name && styles.categoryItemTextSelected,
                        ]}
                      >
                        {cat.name}
                      </Text>
                      {service === cat.name && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>
          )}
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            الوصف <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.textArea, errors.description && styles.inputError]}
            placeholder="اكتب وصفاً تفصيلياً للخدمة المطلوبة"
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              setErrors(prev => ({ ...prev, description: false }));
            }}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Location */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            الموقع <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.locationInputWrapper}>
            <View style={styles.locationInputContainer}>
              <Text style={styles.locationIconInside}>📍</Text>
              <TextInput
                ref={locationInputRef}
                style={[styles.locationInput, errors.cityAndZip && styles.inputError]}
                placeholder="اكتب اسم المدينة أو الرمز البريدي"
                placeholderTextColor="#9CA3AF"
                value={cityAndZip}
                onChangeText={handleLocationChange}
                onFocus={() => {
                  if (cityAndZip.length >= 2) {
                    setIsLocationSuggestionsOpen(true);
                  }
                }}
              />
            </View>

            {/* Location Suggestions */}
            {isLocationSuggestionsOpen && locationSuggestions.length > 0 && (
              <View style={styles.citySuggestionsList}>
                {locationSuggestions.map((location, index) => (
                  <Pressable
                    key={index}
                    style={({ pressed }) => [
                      styles.suggestionItem,
                      pressed && styles.suggestionItemPressed,
                    ]}
                    onPress={() => selectLocationSuggestion(location)}
                  >
                    <Text style={styles.suggestionIcon}>📍</Text>
                    <Text style={styles.suggestionText}>{location}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Budget */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>(اختياري) الميزانية المتوقعة</Text>
          <View style={styles.budgetContainer}>
            <TextInput
              style={[styles.input, { paddingRight: wp(16) }]}
              placeholder="أدخل المبلغ"
              placeholderTextColor="#9CA3AF"
              value={budget}
              onChangeText={setBudget}
              keyboardType="numeric"
            />
            <View style={styles.currencyLabel}>
              <Text style={styles.currencyText}>€</Text>
            </View>
          </View>
        </View>

        {/* Image Upload */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>(اختياري) ارفق صورة</Text>
          <Pressable style={styles.imageUploadButton} onPress={handleImagePick}>
            {image ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: image }} style={styles.imagePreview} />
                <Pressable
                  style={styles.removeImageButton}
                  onPress={() => setImage(null)}
                >
                  <Text style={styles.removeImageText}>✕</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Text style={styles.uploadIcon}>📷</Text>
                <Text style={styles.uploadText}>اضغط لرفع صورة</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Submit Button */}
        <Pressable
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>نشر الطلب</Text>
        </Pressable>

        {/* Browse Providers Link */}
        <Pressable
          style={styles.browseLink}
          onPress={() => router.push('/(client)/(tabs)/discover')}
        >
          <Text style={styles.browseLinkText}>
            أو استعرض جميع الحرفيين و مقدمي الخدمات في منطقتك
          </Text>
        </Pressable>
      </ScrollView>

      {/* Custom Modal */}
      <CustomModal
        visible={modalVisible}
        type={modalType}
        message={modalMessage}
        primaryButtonText="موافق"
        onPrimaryPress={handleModalClose}
        onClose={handleModalClose}
        autoClose={modalType === 'success'}
        autoCloseDelay={2000}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: wp(6),
    paddingBottom: hp(10),
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(3),
    backgroundColor: '#FFFFFF',
    padding: wp(4),
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  userAvatar: {
    width: wp(12),
    height: wp(12),
    borderRadius: wp(6),
    backgroundColor: '#2F6FDB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(3),
  },
  userInitial: {
    fontSize: wp(5),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: wp(4.5),
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: hp(0.3),
  },
  userSubtitle: {
    fontSize: wp(3.5),
    color: '#6B7280',
  },
  inputGroup: {
    marginBottom: hp(3),
  },
  label: {
    fontSize: wp(4),
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: hp(1),
  },
  required: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: wp(4),
    fontSize: wp(4),
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: wp(4),
    fontSize: wp(4),
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: hp(15),
  },
  pickerButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: wp(4),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: wp(4),
    color: '#1F2937',
    fontWeight: '500',
  },
  pickerPlaceholder: {
    fontSize: wp(4),
    color: '#9CA3AF',
  },
  pickerArrow: {
    fontSize: wp(3),
    color: '#6B7280',
  },
  pickerArrowUp: {
    transform: [{ rotate: '180deg' }],
  },
  categoryList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: hp(1),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: hp(35),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  categoryScrollView: {
    maxHeight: hp(35),
  },
  categoryLoadingContainer: {
    padding: wp(6),
    alignItems: 'center',
  },
  categoryLoadingText: {
    fontSize: wp(4),
    color: '#6B7280',
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: wp(4),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoryItemPressed: {
    backgroundColor: '#F9FAFB',
  },
  categoryItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  categoryItemText: {
    fontSize: wp(4),
    color: '#1F2937',
    fontWeight: '500',
  },
  categoryItemTextSelected: {
    color: '#2F6FDB',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: wp(5),
    color: '#2F6FDB',
    fontWeight: 'bold',
  },
  locationInputWrapper: {
    position: 'relative',
  },
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingLeft: wp(4),
  },
  locationIconInside: {
    fontSize: wp(5),
    marginRight: wp(2),
  },
  locationInput: {
    flex: 1,
    padding: wp(4),
    fontSize: wp(4),
    color: '#1F2937',
  },
  citySuggestionsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: hp(1),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: hp(25),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp(4),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionItemPressed: {
    backgroundColor: '#F9FAFB',
  },
  suggestionIcon: {
    fontSize: wp(4),
    marginRight: wp(2),
  },
  suggestionText: {
    fontSize: wp(4),
    color: '#1F2937',
  },
  budgetContainer: {
    position: 'relative',
  },
  currencyLabel: {
    position: 'absolute',
    right: wp(4),
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  currencyText: {
    fontSize: wp(4),
    color: '#6B7280',
    fontWeight: '600',
  },
  imageUploadButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    padding: wp(6),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: hp(20),
  },
  uploadPlaceholder: {
    alignItems: 'center',
  },
  uploadIcon: {
    fontSize: wp(12),
    marginBottom: hp(1),
  },
  uploadText: {
    fontSize: wp(4),
    color: '#6B7280',
  },
  imagePreviewContainer: {
    width: '100%',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: hp(25),
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: wp(2),
    right: wp(2),
    backgroundColor: '#EF4444',
    width: wp(8),
    height: wp(8),
    borderRadius: wp(4),
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#FFFFFF',
    fontSize: wp(5),
    fontWeight: '700',
  },
  submitButton: {
    backgroundColor: '#2F6FDB',
    borderRadius: 12,
    padding: wp(4),
    alignItems: 'center',
    marginTop: hp(2),
    shadowColor: '#2F6FDB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: wp(4.5),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  browseLink: {
    marginTop: hp(3),
    alignItems: 'center',
  },
  browseLinkText: {
    fontSize: wp(4),
    color: '#2F6FDB',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});