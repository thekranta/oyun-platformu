import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type FeedbackType = 'error' | 'warning' | 'info';

interface FeedbackMessageProps {
  type: FeedbackType;
  title: string;
  subtitle?: string;
}

export default function FeedbackMessage({ type, title, subtitle }: FeedbackMessageProps) {
  const iconMap: Record<FeedbackType, React.ComponentProps<typeof Ionicons>['name']> = {
    error: 'close-circle',
    warning: 'warning',
    info: 'information-circle',
  };

  const colorMap: Record<FeedbackType, string> = {
    error: '#D32F2F', // red
    warning: '#FFA000', // amber
    info: '#1976D2', // blue
  };

  return (
    <View style={[styles.container, { borderColor: colorMap[type] }] }>
      <Ionicons name={iconMap[type]} size={24} color={colorMap[type]} />
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: colorMap[type] }]}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 2,
    borderRadius: 8,
    marginVertical: 8,
  },
  textContainer: {
    marginLeft: 8,
    flexShrink: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    color: '#555',
    marginTop: 2,
  },
});
