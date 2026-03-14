import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { hp, wp } from '../helpers/common';
import { Category, ViewMode } from '../utils/types';
import ViewToggle from './ViewToggle';

interface FilterBarProps {
  selectedCategory: string;
  city: string;
  categories: Category[];
  citySuggestions: string[];
  showCategoryPicker: boolean;
  viewMode: ViewMode;
  onCategoryPress: () => void;
  onCategorySelect: (category: string) => void;
  onCityChange: (text: string) => void;
  onCitySelect: (city: string) => void;
  onViewModeChange: (mode: ViewMode) => void;
}

export default function FilterBar({
  selectedCategory,
  city,
  categories,
  citySuggestions,
  showCategoryPicker,
  viewMode,
  onCategoryPress,
  onCategorySelect,
  onCityChange,
  onCitySelect,
  onViewModeChange,
}: FilterBarProps) {
  return (
    <>
      <View style={styles.mainContainer}>
        <View style={styles.filtersRow}>
          <Pressable style={styles.filterButton} onPress={onCategoryPress}>
            <Text style={styles.filterButtonText}>
              {selectedCategory || 'نوع الخدمة'}
            </Text>
            <FontAwesome name="chevron-down" size={14} color="#6B7280" />
          </Pressable>
          <View style={styles.cityInputContainer}>
            <FontAwesome name="map-marker" size={16} color="#6B7280" />
            <TextInput
              style={styles.cityInput}
              placeholder="المدينة"
              value={city}
              onChangeText={onCityChange}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>
        <View style={styles.viewToggleRow}>
          <ViewToggle
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
          />
        </View>
      </View>

      {showCategoryPicker && (
        <View style={styles.categoryPicker}>
          <ScrollView style={styles.categoryPickerScroll}>
            <Pressable
              style={styles.categoryOption}
              onPress={() => onCategorySelect('')}
            >
              <Text style={styles.categoryOptionText}>الكل</Text>
            </Pressable>
            {categories.map((cat) => (
              <Pressable
                key={cat.id}
                style={styles.categoryOption}
                onPress={() => onCategorySelect(cat.name)}
              >
                <Text style={styles.categoryOptionText}>{cat.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {citySuggestions && citySuggestions.length > 0 && (
        <View style={styles.citySuggestions}>
          {citySuggestions.map((suggestion, idx) => (
            <Pressable
              key={idx}
              style={styles.suggestionItem}
              onPress={() => onCitySelect(suggestion)}
            >
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filtersRow: {
    flexDirection: 'row',
    gap: wp(3),
    paddingHorizontal: wp(6),
    paddingTop: hp(2),
    paddingBottom: hp(1),
  },
  viewToggleRow: {
    paddingHorizontal: wp(6),
    paddingTop: hp(1),
    paddingBottom: hp(1.5),
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.5),
  },
  filterButtonText: {
    fontSize: wp(3.5),
    color: '#1F2937',
  },
  cityInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: wp(3),
    gap: wp(2),
  },
  cityInput: {
    flex: 1,
    fontSize: wp(3.5),
    color: '#1F2937',
    paddingVertical: hp(1.5),
  },
  categoryPicker: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    maxHeight: hp(30),
  },
  categoryPickerScroll: {
    maxHeight: hp(30),
  },
  categoryOption: {
    paddingHorizontal: wp(6),
    paddingVertical: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoryOptionText: {
    fontSize: wp(3.8),
    color: '#1F2937',
    textAlign: 'right',
  },
  citySuggestions: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    maxHeight: hp(25),
  },
  suggestionItem: {
    paddingHorizontal: wp(6),
    paddingVertical: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionText: {
    fontSize: wp(3.8),
    color: '#1F2937',
    textAlign: 'right',
  },
});