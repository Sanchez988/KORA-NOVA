import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Platform,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  REPORT_REASON_OPTIONS,
  createReport,
  reportErrorMessage,
  REPORT_CONFIRM_MESSAGE,
  getReportStatus,
  revokeReportToUser,
  type ReportReasonValue,
} from '../services/report.service';

export type ReportUserModalProps = {
  visible: boolean;
  onClose: () => void;
  reportedUserId: string;
  /** Tras enviar el reporte y pulsar OK (sin deshacer). */
  onSuccess?: () => void;
  /** Tras retirar el reporte (desde este modal). */
  onReportRevoked?: () => void;
};

type Step = 'reasons' | 'confirm';

export default function ReportUserModal({
  visible,
  onClose,
  reportedUserId,
  onSuccess,
  onReportRevoked,
}: ReportUserModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<Step>('reasons');
  const [selectedReason, setSelectedReason] = useState<ReportReasonValue | null>(null);
  const [otherDetail, setOtherDetail] = useState('');
  const [hasReported, setHasReported] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setStep('reasons');
      setSelectedReason(null);
      setOtherDetail('');
      setHasReported(false);
      setStatusLoading(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || !reportedUserId) return;
    let cancelled = false;
    setStatusLoading(true);
    (async () => {
      try {
        const s = await getReportStatus(reportedUserId);
        if (!cancelled) {
          const reported = Boolean(s?.hasReported);
          setHasReported(reported);
          setStep('reasons');
        }
      } catch {
        if (!cancelled) {
          setHasReported(false);
          setStep('reasons');
        }
      } finally {
        if (!cancelled) setStatusLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, reportedUserId]);

  const reasonLabel = (r: ReportReasonValue) =>
    REPORT_REASON_OPTIONS.find((o) => o.value === r)?.label ?? r;

  const runRevoke = useCallback(async () => {
    if (submitting || !reportedUserId) return;
    setSubmitting(true);
    try {
      const { message } = await revokeReportToUser(reportedUserId);
      const msg = message?.trim() || 'Reporte retirado.';
      setHasReported(false);
      setStep('reasons');
      onClose();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(msg);
        onReportRevoked?.();
        return;
      }
      Alert.alert('', msg, [{ text: 'OK', onPress: () => onReportRevoked?.() }]);
    } catch (e) {
      Alert.alert('No se pudo deshacer', reportErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }, [submitting, reportedUserId, onClose, onReportRevoked]);

  const confirmUndo = useCallback(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm('¿Retirar el reporte a esta persona?')) void runRevoke();
      return;
    }
    Alert.alert(
      'Deshacer reporte',
      'Esta persona volverá a mostrarse para ti en descubrimiento y conversaciones cuando corresponda.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Retirar reporte', style: 'destructive', onPress: () => void runRevoke() },
      ]
    );
  }, [runRevoke]);

  const finishSuccess = (msg: string) => {
    onClose();
    const doUndo = () => {
      void (async () => {
        try {
          const { message: undoMsg } = await revokeReportToUser(reportedUserId);
          const m = undoMsg?.trim() || 'Reporte retirado.';
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.alert(m);
            onReportRevoked?.();
            return;
          }
          Alert.alert('', m, [{ text: 'OK', onPress: () => onReportRevoked?.() }]);
        } catch (e) {
          Alert.alert('No se pudo deshacer', reportErrorMessage(e));
        }
      })();
    };
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(msg);
      if (window.confirm('¿Deshacer este reporte ahora?')) doUndo();
      else onSuccess?.();
      return;
    }
    Alert.alert('', msg, [
      { text: 'Deshacer', style: 'destructive', onPress: doUndo },
      { text: 'OK', onPress: () => onSuccess?.() },
    ]);
  };

  const sendReport = async () => {
    if (submitting || !selectedReason) return;
    if (selectedReason === 'OTHER') {
      const t = otherDetail.trim();
      if (t.length < 4) {
        Alert.alert('Motivo requerido', 'Describe el motivo con al menos 4 caracteres.');
        return;
      }
    }
    setSubmitting(true);
    try {
      const { message } = await createReport({
        reportedUserId,
        reason: selectedReason,
        description: selectedReason === 'OTHER' ? otherDetail.trim() : undefined,
      });
      const msg = message?.trim() || REPORT_CONFIRM_MESSAGE;
      finishSuccess(msg);
    } catch (e) {
      Alert.alert('No se pudo enviar', reportErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const pickReason = (r: ReportReasonValue) => {
    setSelectedReason(r);
    if (r !== 'OTHER') setOtherDetail('');
    setStep('confirm');
  };

  const goBackToReasons = () => {
    setStep('reasons');
    setSelectedReason(null);
    setOtherDetail('');
  };

  const sheetBody = () => {
    if (statusLoading) {
      return (
        <View style={styles.centerPad}>
          <ActivityIndicator color="#6C5CE7" />
        </View>
      );
    }

    if (hasReported) {
      return (
        <>
          <Text style={styles.sub}>
            Ya enviaste un reporte sobre esta persona. Puedes retirarlo si fue un error.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={confirmUndo}
            disabled={submitting}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Deshacer reporte</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={onClose} disabled={submitting}>
            <Text style={styles.secondaryBtnText}>Cerrar</Text>
          </TouchableOpacity>
          {submitting ? <ActivityIndicator style={styles.spinner} color="#6C5CE7" /> : null}
        </>
      );
    }

    if (step === 'reasons') {
      return (
        <>
          <Text style={styles.sub}>Elige un motivo</Text>
          {REPORT_REASON_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={styles.row}
              disabled={submitting}
              onPress={() => pickReason(opt.value)}
              activeOpacity={0.75}
            >
              <Text style={styles.rowText}>{opt.label}</Text>
              <Ionicons name="chevron-forward" size={18} color="#A29BFE" />
            </TouchableOpacity>
          ))}
        </>
      );
    }

    // confirm
    const r = selectedReason!;
    return (
      <>
        <TouchableOpacity style={styles.backRow} onPress={() => !submitting && goBackToReasons()} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color="#A29BFE" />
          <Text style={styles.backTxt}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.confirmLead}>Confirmar reporte</Text>
        <Text style={styles.confirmReason}>
          Motivo: <Text style={styles.confirmReasonBold}>{reasonLabel(r)}</Text>
        </Text>
        {r === 'OTHER' ? (
          <>
            <Text style={[styles.sub, { marginTop: 12 }]}>Describe el motivo</Text>
            <TextInput
              style={styles.textArea}
              value={otherDetail}
              onChangeText={setOtherDetail}
              placeholder="Escribe qué ocurrió…"
              placeholderTextColor="rgba(255,255,255,0.35)"
              multiline
              editable={!submitting}
              maxLength={2000}
            />
            <Text style={styles.hint}>{otherDetail.trim().length}/2000 · mín. 4 caracteres</Text>
          </>
        ) : (
          <Text style={[styles.sub, { marginTop: 8 }]}>
            Al enviar, esta persona dejará de mostrarse para ti hasta que retires el reporte en
            Ajustes.
          </Text>
        )}
        <TouchableOpacity
          style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
          onPress={() => void sendReport()}
          disabled={submitting}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Enviar reporte</Text>
        </TouchableOpacity>
        {submitting ? <ActivityIndicator style={styles.spinner} color="#6C5CE7" /> : null}
      </>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => !submitting && onClose()}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kav}
      >
        <Pressable style={styles.backdrop} onPress={() => !submitting && onClose()}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.sheetHeader}>
                <Text style={styles.title}>Reportar usuario</Text>
                <TouchableOpacity onPress={() => !submitting && onClose()} hitSlop={12} accessibilityRole="button">
                  <Ionicons name="close" size={24} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
              </View>
              {sheetBody()}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1C1C35',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 28,
    paddingHorizontal: 18,
    maxHeight: '88%',
    borderTopWidth: 1,
    borderColor: 'rgba(162,155,254,0.2)',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 18,
    paddingBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 10,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  rowText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '500',
  },
  spinner: { marginTop: 14 },
  centerPad: { paddingVertical: 28, alignItems: 'center' },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  backTxt: { color: '#A29BFE', fontSize: 15, fontWeight: '600' },
  confirmLead: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  confirmReason: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  confirmReasonBold: { color: '#FFFFFF', fontWeight: '700' },
  textArea: {
    minHeight: 100,
    maxHeight: 160,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 12,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(162,155,254,0.2)',
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 6,
    marginBottom: 14,
  },
  primaryBtn: {
    backgroundColor: '#6C5CE7',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: { color: 'rgba(255,255,255,0.55)', fontSize: 15 },
});
