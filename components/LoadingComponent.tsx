import { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { hp, wp } from '../helpers/common';

interface LoadingComponentProps {
  message?: string;
}

export default function LoadingComponent({ message = 'جاري التحميل...' }: LoadingComponentProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const scaleAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    const opacityAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.5,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    scaleAnimation.start();
    opacityAnimation.start();

    return () => {
      scaleAnimation.stop();
      opacityAnimation.stop();
    };
  }, [scaleAnim, opacityAnim]);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      <Animated.View style={[styles.textContainer, { opacity: opacityAnim }]}>
        <Text style={styles.brandName}>ArabWerk</Text>
        <Text style={styles.loadingText}>{message}</Text>
      </Animated.View>

      <View style={styles.dotsContainer}>
        {[0, 1, 2].map((index) => (
          <LoadingDot key={index} delay={index * 200} />
        ))}
      </View>
    </View>
  );
}

function LoadingDot({ delay }: { delay: number }) {
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bounceAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 600,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );

    bounceAnimation.start();

    return () => {
      bounceAnimation.stop();
    };
  }, [bounceAnim, delay]);

  const translateY = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          transform: [{ translateY }],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: wp(6),
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(4),
  },
  logoWrapper: {
    shadowColor: '#2F6FDB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  logoImage: {
    width: wp(25),
    height: wp(25),
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: hp(3),
  },
  brandName: {
    fontSize: wp(7),
    fontWeight: 'bold',
    color: '#2F6FDB',
    marginBottom: hp(1),
  },
  loadingText: {
    fontSize: wp(4),
    color: '#6B7280',
    fontWeight: '600',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: wp(2),
  },
  dot: {
    width: wp(2.5),
    height: wp(2.5),
    borderRadius: wp(1.25),
    backgroundColor: '#2F6FDB',
  },
});