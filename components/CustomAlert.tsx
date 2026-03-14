// components/CustomAlert.tsx - Themed custom alert modal
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react-native';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface CustomAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  onClose: () => void;
  type?: 'success' | 'error' | 'warning' | 'info';
}

export function CustomAlert({
  visible,
  title,
  message,
  buttons = [{ text: 'OK', style: 'default' }],
  onClose,
  type = 'info',
}: CustomAlertProps) {
  const { colors } = useTheme();

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={48} color={colors.success} />;
      case 'error':
        return <XCircle size={48} color={colors.error} />;
      case 'warning':
        return <AlertCircle size={48} color={colors.warning} />;
      default:
        return <Info size={48} color={colors.primary} />;
    }
  };

  const getButtonStyle = (style?: string) => {
    switch (style) {
      case 'destructive':
        return { backgroundColor: colors.error };
      case 'cancel':
        return { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border };
      default:
        return { backgroundColor: colors.primary };
    }
  };

  const getButtonTextColor = (style?: string) => {
    switch (style) {
      case 'cancel':
        return colors.textPrimary;
      default:
        return colors.background;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.alertContainer, { backgroundColor: colors.background }]}>
              <View style={styles.iconContainer}>{getIcon()}</View>

              <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>

              {message && <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>}

              <View style={styles.buttonContainer}>
                {buttons.map((button, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.button,
                      getButtonStyle(button.style),
                      buttons.length > 1 && index === 0 && styles.buttonMarginRight,
                    ]}
                    onPress={() => {
                      button.onPress?.();
                      onClose();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={button.text}
                  >
                    <Text style={[styles.buttonText, { color: getButtonTextColor(button.style) }]}>
                      {button.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// Hook for using the alert
export interface AlertConfig {
  title: string;
  message?: string;
  buttons?: AlertButton[];
  type?: 'success' | 'error' | 'warning' | 'info';
}

export function useCustomAlert() {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<AlertConfig>({
    title: '',
    message: '',
    buttons: [{ text: 'OK' }],
    type: 'info',
  });

  const showAlert = useCallback((alertConfig: AlertConfig) => {
    setConfig(alertConfig);
    setVisible(true);
  }, []);

  const hideAlert = useCallback(() => {
    setVisible(false);
  }, []);

  const AlertComponent = () => (
    <CustomAlert
      visible={visible}
      title={config.title}
      message={config.message}
      buttons={config.buttons}
      onClose={hideAlert}
      type={config.type}
    />
  );

  return { showAlert, hideAlert, AlertComponent };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  alertContainer: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    marginTop: Spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonMarginRight: {
    marginRight: Spacing.sm,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
