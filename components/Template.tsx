import React, { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TemplateProps {
  children: ReactNode;
  bg?: string;
}

const Template = ({ children, bg = '#FFFFFF' }: TemplateProps) => {
  const { top } = useSafeAreaInsets();
  const paddingTop = top > 0 ? top + 5 : 30;

  return (
    <View style={[styles.container, { paddingTop, backgroundColor: bg }]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default Template;