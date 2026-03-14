import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Pressable, StyleSheet, View } from 'react-native';
import { hp, wp } from '../helpers/common';
import { ViewMode } from '../utils/types';

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export default function ViewToggle({
  viewMode,
  onViewModeChange,
}: ViewToggleProps) {
  return (
    <View style={styles.container}>
      <View style={styles.toggleGroup}>
        <Pressable
          style={[
            styles.toggleButton,
            viewMode === 'list' && styles.toggleButtonActive,
          ]}
          onPress={() => onViewModeChange('list')}
        >
          <FontAwesome
            name="list"
            size={16}
            color={viewMode === 'list' ? '#FFFFFF' : '#6B7280'}
          />
        </Pressable>
        <Pressable
          style={[
            styles.toggleButton,
            viewMode === 'grid' && styles.toggleButtonActive,
          ]}
          onPress={() => onViewModeChange('grid')}
        >
          <FontAwesome
            name="th"
            size={16}
            color={viewMode === 'grid' ? '#FFFFFF' : '#6B7280'}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(0.5),
    backgroundColor: '#FFFFFF',
  },
  toggleGroup: {
    flexDirection: 'row',
    gap: wp(2),
  },
  toggleButton: {
    width: wp(10),
    height: hp(4.5),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  toggleButtonActive: {
    backgroundColor: '#2F6FDB',
    borderColor: '#2F6FDB',
  },
});