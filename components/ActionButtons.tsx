import { Pressable, StyleSheet, Text } from 'react-native';

type ActionButtonsProps = {
  text: string;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: number;
  showShadow?: boolean;
  onPress?: () => void;
};

export default function ActionButtons({
  text,
  backgroundColor = '#2F6FDB',
  textColor = '#FFFFFF',
  borderColor,
  borderWidth,
  showShadow = true,
  onPress = () => console.log('Button pressed'),
}: ActionButtonsProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.buttonBase,
        { backgroundColor },
        borderColor && { borderColor },
        borderWidth && { borderWidth },
        showShadow && styles.shadow,
        pressed && styles.buttonPressed,
      ]}
    >
      <Text style={[styles.buttonText, { color: textColor }]}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  buttonBase: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
});
