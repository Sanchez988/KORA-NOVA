/**
 * DatePickerInput
 * - Web:    <input type="date"> visible y estilizado con CSS inline
 * - Native: Modal con ruedas Dia/Mes/Anno usando @react-native-picker/picker
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { colors, spacing, borderRadius } from '../theme/colors';

// helpers
const pad = (n: number) => String(n).padStart(2, '0');

const parseDisplay = (s: string): Date | null => {
  const parts = s.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y || y < 1900) return null;
  return new Date(y, m - 1, d);
};

const toDisplay = (date: Date) =>
  `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;

const toISO = (s: string) => {
  const parts = s.split('/');
  if (parts.length !== 3) return '';
  const [d, m, y] = parts;
  return `${y}-${m}-${d}`;
};

const fromISO = (iso: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const WEB_DATE_INPUT_CLASS = 'kora-web-date-input';

const defaultMaxDate = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d;
};

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

// Web: input type=date visible y estilizado
const WebDateInput = ({
  value,
  onChange,
  maxDate,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  maxDate: Date;
  placeholder: string;
}) => {
  const maxISO = `${maxDate.getFullYear()}-${pad(maxDate.getMonth() + 1)}-${pad(maxDate.getDate())}`;
  const valueISO = toISO(value);

  /** Icono nativo del calendario: en fondos oscuros queda casi negro sin filtro WebKit */
  const webPickerCss =
    `.${WEB_DATE_INPUT_CLASS}::-webkit-calendar-picker-indicator{` +
    `cursor:pointer;opacity:1;width:22px;height:22px;margin-left:4px;` +
    `filter:invert(78%)sepia(19%)saturate(920%)hue-rotate(207deg)brightness(107%);` +
    '}';

  return (
    <View style={webStyles.wrapper}>
      <style dangerouslySetInnerHTML={{ __html: webPickerCss }} />
      {/* @ts-ignore — DOM <input>; className sólo web */}
      <input
        className={WEB_DATE_INPUT_CLASS}
        type="date"
        value={valueISO}
        max={maxISO}
        min="1900-01-01"
        onChange={(e: any) => onChange(fromISO(e.target.value))}
        placeholder={placeholder}
        style={{
          width: '100%',
          height: 52,
          backgroundColor: colors.backgroundDark,
          border: `1.5px solid ${colors.border}`,
          borderRadius: borderRadius.md,
          paddingLeft: 16,
          paddingRight: 14,
          fontSize: 16,
          color: value ? colors.text.primary : colors.text.tertiary,
          cursor: 'pointer',
          outline: 'none',
          boxSizing: 'border-box',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          colorScheme: 'dark',
        }}
      />
    </View>
  );
};

const webStyles = StyleSheet.create({
  wrapper: { width: '100%' },
});

// Native: modal con ruedas
const NativeDatePicker = ({
  value,
  onChange,
  maxDate,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  maxDate: Date;
  placeholder: string;
}) => {
  const [visible, setVisible] = useState(false);

  const initialDate = parseDisplay(value) ?? (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 22);
    return d;
  })();

  const [selectedDay, setSelectedDay] = useState(initialDate.getDate());
  const [selectedMonth, setSelectedMonth] = useState(initialDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(initialDate.getFullYear());

  const maxYear = maxDate.getFullYear();
  const years = Array.from({ length: maxYear - 1950 + 1 }, (_, i) => maxYear - i);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const handleConfirm = () => {
    onChange(toDisplay(new Date(selectedYear, selectedMonth - 1, selectedDay)));
    setVisible(false);
  };

  const hasValue = !!value;

  return (
    <>
      <TouchableOpacity
        style={[nativeStyles.trigger, hasValue && nativeStyles.triggerFilled]}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={hasValue ? nativeStyles.valueText : nativeStyles.placeholder}>
          {hasValue ? value : placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={hasValue ? colors.primary : colors.text.tertiary} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={nativeStyles.overlay}>
          <View style={nativeStyles.sheet}>
            <View style={nativeStyles.sheetHeader}>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Text style={nativeStyles.cancelBtn}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={nativeStyles.sheetTitle}>Fecha de Nacimiento</Text>
              <TouchableOpacity onPress={handleConfirm}>
                <Text style={nativeStyles.confirmBtn}>Listo</Text>
              </TouchableOpacity>
            </View>
            <View style={nativeStyles.pickersRow}>
              <View style={nativeStyles.pickerCol}>
                <Text style={nativeStyles.pickerLabel}>Dia</Text>
                <Picker selectedValue={selectedDay} onValueChange={(v) => setSelectedDay(Number(v))} style={nativeStyles.picker}>
                  {days.map((d) => <Picker.Item key={d} label={pad(d)} value={d} />)}
                </Picker>
              </View>
              <View style={nativeStyles.pickerCol}>
                <Text style={nativeStyles.pickerLabel}>Mes</Text>
                <Picker selectedValue={selectedMonth} onValueChange={(v) => setSelectedMonth(Number(v))} style={nativeStyles.picker}>
                  {MONTHS.map((m, i) => <Picker.Item key={i} label={m} value={i + 1} />)}
                </Picker>
              </View>
              <View style={nativeStyles.pickerCol}>
                <Text style={nativeStyles.pickerLabel}>Anno</Text>
                <Picker selectedValue={selectedYear} onValueChange={(v) => setSelectedYear(Number(v))} style={nativeStyles.picker}>
                  {years.map((y) => <Picker.Item key={y} label={String(y)} value={y} />)}
                </Picker>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const nativeStyles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    height: 52,
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  triggerFilled: {
    borderColor: colors.primary,
    backgroundColor: '#FFF0F5',
  },
  valueText: { color: colors.text.primary, fontSize: 16 },
  placeholder: { color: colors.text.tertiary, fontSize: 16 },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: colors.text.primary },
  cancelBtn: { fontSize: 15, color: colors.text.secondary },
  confirmBtn: { fontSize: 15, color: colors.primary, fontWeight: '700' },
  pickersRow: { flexDirection: 'row', paddingHorizontal: spacing.sm },
  pickerCol: { flex: 1, alignItems: 'center' },
  pickerLabel: { fontSize: 12, color: colors.text.tertiary, marginTop: spacing.md, marginBottom: 4 },
  picker: { width: '100%', color: colors.text.primary },
});

// Export
interface DatePickerInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxDate?: Date;
  style?: any;
}

export const DatePickerInput = ({
  value,
  onChange,
  placeholder = 'DD/MM/AAAA',
  maxDate,
}: DatePickerInputProps) => {
  const max = maxDate ?? defaultMaxDate();

  if (Platform.OS === 'web') {
    return <WebDateInput value={value} onChange={onChange} maxDate={max} placeholder={placeholder} />;
  }

  return <NativeDatePicker value={value} onChange={onChange} maxDate={max} placeholder={placeholder} />;
};

export default DatePickerInput;
