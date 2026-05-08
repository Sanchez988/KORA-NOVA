import React, { useState, useMemo } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { borderRadius, spacing } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type Theme } from '../context/ThemeContext';

interface ModernInputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
}

export const ModernInput: React.FC<ModernInputProps> = ({
  label,
  error,
  icon,
  isPassword,
  ...props
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputFocused,
          error && styles.inputError,
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={20}
            color={isFocused ? theme.brandPurple : theme.textMuted}
            style={styles.icon}
          />
        ) : null}
        <TextInput
          {...props}
          style={[
            styles.input,
            props.style,
            isPassword && !showPassword && Platform.OS === 'web'
              ? ({ WebkitTextSecurity: 'disc' } as object)
              : undefined,
          ]}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholderTextColor={theme.textMuted}
          secureTextEntry={isPassword && !showPassword && Platform.OS !== 'web'}
        />
        {isPassword ? (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={theme.textMuted}
            />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      marginBottom: spacing.md,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      marginBottom: spacing.xs,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.inputBg,
      borderRadius: borderRadius.md,
      borderWidth: 2,
      borderColor: theme.border,
      paddingHorizontal: spacing.md,
    },
    inputFocused: {
      borderColor: theme.brandPurple,
      backgroundColor: theme.isDark ? theme.surface2 : theme.surface,
      ...(!theme.isDark
        ? {
            shadowColor: theme.brandPurple,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 8,
            elevation: 2,
          }
        : {}),
    },
    inputError: {
      borderColor: '#EF476F',
    },
    input: {
      flex: 1,
      paddingVertical: spacing.md,
      fontSize: 16,
      color: theme.text,
    },
    icon: {
      marginRight: spacing.sm,
    },
    eyeIcon: {
      padding: spacing.xs,
    },
    error: {
      color: '#EF476F',
      fontSize: 12,
      marginTop: spacing.xs,
      marginLeft: spacing.xs,
    },
  });
}
