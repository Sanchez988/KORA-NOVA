import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography } from '../theme/colors';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwn }) => {
  const formatTime = (date: string) => {
    const messageDate = new Date(date);
    return messageDate.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isOwn) {
    return (
      <View style={[styles.container, styles.ownContainer]}>
        <LinearGradient
          colors={colors.gradient.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.ownBubble}
        >
          <Text style={styles.ownText}>{message.content}</Text>
          <Text style={styles.ownTime}>{formatTime(message.sentAt)}</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.otherContainer]}>
      <View style={styles.otherBubble}>
        <Text style={styles.otherText}>{message.content}</Text>
        <Text style={styles.otherTime}>{formatTime(message.sentAt)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  ownContainer: {
    alignItems: 'flex-end',
  },
  otherContainer: {
    alignItems: 'flex-start',
  },
  ownBubble: {
    maxWidth: '75%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    maxWidth: '75%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.lg,
    borderBottomLeftRadius: 4,
  },
  ownText: {
    ...typography.body,
    color: colors.text.inverse,
    marginBottom: spacing.xs,
  },
  otherText: {
    ...typography.body,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  ownTime: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    alignSelf: 'flex-end',
  },
  otherTime: {
    fontSize: 11,
    color: colors.text.tertiary,
    alignSelf: 'flex-end',
  },
});
