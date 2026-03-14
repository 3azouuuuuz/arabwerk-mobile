import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import CustomModal from '../../components/CustomModal';
import LoadingComponent from '../../components/LoadingComponent';
import { ENV } from '../../config/env';
import { useAuth } from '../../context/AuthContext';
import { hp, wp } from '../../helpers/common';

interface Category {
  id: number;
  name: string;
}

interface ServiceRequest {
  id: number;
  id_user: number;
  service_type: string;
  desc_service: string;
  service_address: string;
  price_service: number | null;
  service_images: string | null;
  created_at: string;
  agree: boolean;
}

export default function EditRequestScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Form state
  const [service, setService] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [address, setAddress] = useState('');
  const [image, setImage] = useState<string | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
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
    address: false,
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
      router.back();
      return true;
    });
    return () => backHandler.remove();
  }, [router, showCategoryPicker, isLocationSuggestionsOpen]);
  // ────────────────────────────────────────────────────────────────────────

  // Fetch request data and categories on mount
  useEffect(() => {
    fetchCategories();
    if (id) {
      fetchRequestData();
    }
  }, [id]);

  const fetchRequestData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${ENV.API_BASE_URL}/service_request/${id}`);

      if (response.ok) {
        const data: ServiceRequest = await response.json();
        
        if (data.id_user !== user?.id) {
          showModal('error', 'ليس لديك صلاحية لتعديل هذا الطلب');
          setTimeout(() => router.back(), 2000);
          return;
        }

        setService(data.service_type);
        setDescription(data.desc_service);
        setAddress(data.service_address);
        setBudget(data.price_service ? String(data.price_service) : '');
        setImage(data.service_images);
      } else {
        showModal('error', 'فشل تحميل بيانات الطلب');
        setTimeout(() => router.back(), 2000);
      }
    } catch (error) {
      console.error('Error fetching request data:', error);
      showModal('error', 'حدث خطأ أثناء تحميل البيانات');
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleLocationChange = (text: string) => {
    setAddress(text);
    setErrors(prev => ({ ...prev, address: false }));
    fetchLocationSuggestions(text);
  };

  const selectLocationSuggestion = (location: string) => {
    setAddress(location);
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
      router.back();
    }
  };

  const handleSubmit = async () => {
    const newErrors = {
      service: service === '',
      description: description === '',
      address: address === '',
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

    setIsSubmitting(true);

    try {
      let imageUrl = image;

      if (image && image.startsWith('file://')) {
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
        } else {
          console.error('Upload failed:', await uploadResponse.text());
        }
      }

      const requestBody = {
        id_user: user.id,
        service_type: service,
        service_images: imageUrl || null,
        service_address: address,
        price_service: budget === '' ? null : parseFloat(budget),
        desc_service: description,
      };

      console.log('📤 Sending UPDATE request to:', `${ENV.API_BASE_URL}/service_request/${id}`);
      console.log('📦 Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${ENV.API_BASE_URL}/service_request/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        throw new Error('فشل تحديث الطلب');
      }

      showModal('success', 'تم تحديث طلبك بنجاح!');
    } catch (error) {
      console.error('Error updating request:', error);
      showModal('error', 'حدث خطأ أثناء تحديث الطلب');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNotificationPress = useCallback(() => {
    console.log('🔔 Notifications pressed');
  }, []);

  if (isLoading || isSubmitting) {
    return <LoadingComponent message={isLoading ? 'جاري تحميل البيانات...' : 'جاري تحديث الطلب...'} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable 
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.buttonPressed
          ]}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </Pressable>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>تعديل الطلب</Text>
          <Text style={styles.headerSubtitle}>#{id}</Text>
        </View>

        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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
                style={[styles.locationInput, errors.address && styles.inputError]}
                placeholder="اكتب اسم المدينة أو العنوان"
                placeholderTextColor="#9CA3AF"
                value={address}
                onChangeText={handleLocationChange}
                onFocus={() => {
                  if (address.length >= 2) {
                    setIsLocationSuggestionsOpen(true);
                  }
                }}
              />
            </View>

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
          <Text style={styles.submitButtonText}>حفظ التعديلات</Text>
        </Pressable>

        {/* Cancel Button */}
        <Pressable
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>إلغاء</Text>
        </Pressable>
      </ScrollView>

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
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
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
  placeholder: {
    width: wp(10),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: wp(6),
    paddingBottom: hp(10),
  },
  inputGroup: {
    marginBottom: hp(3),
  },
  label: {
    fontSize: wp(4),
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: hp(1),
    textAlign: 'right',
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
    textAlign: 'right',
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
    textAlign: 'right',
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
    textAlign: 'right',
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
    textAlign: 'right',
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
    textAlign: 'right',
    flex: 1,
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
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: wp(4),
    alignItems: 'center',
    marginTop: hp(1.5),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: wp(4.5),
    fontWeight: '600',
    color: '#6B7280',
  },
});