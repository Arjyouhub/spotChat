import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const ProfileScreen = ({ navigation }: any) => {
  const { colors, theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [showE2EEModal, setShowE2EEModal] = useState<boolean>(false);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.headerTitle}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile & Settings</Text>
      </View>

      {/* Avatar & User Details */}
      <View style={[styles.profileCard, { backgroundColor: colors.surface }]}>
        <Image source={{ uri: user?.avatar }} style={styles.avatar} />
        <Text style={[styles.name, { color: colors.text }]}>{user?.name}</Text>
        <Text style={[styles.username, { color: colors.textSecondary }]}>@{user?.username || user?.email?.split('@')[0]}</Text>
        <Text style={[styles.status, { color: colors.textMuted }]}>{user?.status || 'Hey there! I am using spotChat'}</Text>
      </View>

      {/* Clean WhatsApp Style E2EE Notice */}
      <TouchableOpacity
        style={[styles.e2eeBanner, { backgroundColor: colors.surface, borderColor: colors.primary }]}
        onPress={() => setShowE2EEModal(true)}
      >
        <Text style={styles.e2eeIcon}>🔒</Text>
        <View style={styles.e2eeInfo}>
          <Text style={[styles.e2eeTitle, { color: colors.primary }]}>
            Messages and calls are end-to-end encrypted.
          </Text>
          <Text style={[styles.e2eeSubtitle, { color: colors.primary }]}>Tap to learn more</Text>
        </View>
      </TouchableOpacity>

      {/* Settings Options */}
      <View style={styles.optionsSection}>
        <TouchableOpacity
          style={[styles.optionRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
          onPress={toggleTheme}
        >
          <Text style={[styles.optionLabel, { color: colors.text }]}>🌙 Dark Mode</Text>
          <Text style={[styles.optionValue, { color: colors.primary }]}>{theme === 'dark' ? 'Enabled' : 'Disabled'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.optionRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
          onPress={() => logout()}
        >
          <Text style={[styles.optionLabel, { color: colors.danger }]}>🚪 Log Out</Text>
        </TouchableOpacity>
      </View>

      {/* E2EE Info Modal */}
      <Modal visible={showE2EEModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowE2EEModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={styles.modalIcon}>🔒</Text>
            <Text style={[styles.modalTitle, { color: colors.text }]}>End-to-End Encrypted</Text>
            <Text style={[styles.modalBody, { color: colors.textSecondary }]}>
              Your personal messages and calls are secured with end-to-end encryption. No one outside of this chat, not even spotChat, can read your messages or listen to your calls.
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowE2EEModal(false)}
            >
              <Text style={styles.modalButtonText}>OK, Got it</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  profileCard: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  username: {
    fontSize: 14,
    marginTop: 2,
  },
  status: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  e2eeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginBottom: 16,
  },
  e2eeIcon: {
    fontSize: 20,
  },
  e2eeInfo: {
    flex: 1,
  },
  e2eeTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  e2eeSubtitle: {
    fontSize: 11,
    textDecorationLine: 'underline',
    marginTop: 2,
  },
  optionsSection: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  optionValue: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  modalIcon: {
    fontSize: 36,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  modalButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
