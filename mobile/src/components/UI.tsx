import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

export const colors = {
  background: '#F4F7FB',
  panel: '#FFFFFF',
  border: '#D6DEE8',
  text: '#17212B',
  muted: '#5D6B79',
  primary: '#0E7490',
  primaryDark: '#155E75',
  danger: '#B91C1C',
  success: '#047857',
};

export function ScreenShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}

export function SectionCard({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Input(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.muted} style={[styles.input, props.multiline ? styles.textarea : undefined]} {...props} />;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' ? styles.buttonPrimary : undefined,
        variant === 'secondary' ? styles.buttonSecondary : undefined,
        variant === 'danger' ? styles.buttonDanger : undefined,
        pressed && !isDisabled ? styles.buttonPressed : undefined,
        isDisabled ? styles.buttonDisabled : undefined,
      ]}
    >
      {loading ? <ActivityIndicator color={variant === 'secondary' ? colors.text : '#FFFFFF'} /> : <Text style={[styles.buttonText, variant === 'secondary' ? styles.buttonTextSecondary : undefined]}>{label}</Text>}
    </Pressable>
  );
}

export function ErrorText({ message }: { message?: string | null }) {
  if (!message) {
    return null;
  }

  return <Text style={styles.error}>{message}</Text>;
}

export const uiStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  muted: {
    color: colors.muted,
    fontSize: 13,
  },
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: '#E6F6FB',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '600',
  },
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    color: colors.muted,
    marginTop: -4,
    marginBottom: 2,
  },
  card: {
    backgroundColor: colors.panel,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },
  label: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  input: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 42,
  },
  textarea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  button: {
    minHeight: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: '#EDF2F7',
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonDanger: {
    backgroundColor: colors.danger,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  buttonTextSecondary: {
    color: colors.text,
  },
  error: {
    color: colors.danger,
    fontWeight: '600',
  },
  bottomSpace: {
    height: 36,
  },
});
