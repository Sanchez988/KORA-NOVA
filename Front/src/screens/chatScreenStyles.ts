import { StyleSheet, Platform } from 'react-native';
import type { Theme } from '../context/ThemeContext';

const ONLINE = '#34D399';

/**
 * Estilos del chat alineados con ThemeContext (claro / oscuro).
 */
export function createChatStyles(theme: Theme) {
  const isDark = theme.isDark;
  const bg = theme.bg;
  const surface = theme.surface2;
  const surfaceHigh = theme.surfaceHigh;
  const border = theme.border;
  const text = theme.text;
  const textSub = theme.textSub;
  const textMuted = theme.textMuted;
  const hairline = isDark ? 'rgba(162,155,254,0.15)' : 'rgba(108,92,231,0.12)';
  const bannerBg = isDark ? 'rgba(108,92,231,0.08)' : 'rgba(108,92,231,0.1)';
  const quickTop = isDark ? 'rgba(108,92,231,0.1)' : 'rgba(108,92,231,0.08)';
  const toolBg = isDark ? 'rgba(30,30,56,0.95)' : theme.surface;
  const roundBg = isDark ? 'rgba(162,155,254,0.06)' : 'rgba(108,92,231,0.08)';
  const roundBorder = isDark ? 'rgba(162,155,254,0.12)' : 'rgba(108,92,231,0.18)';
  const chipBg = isDark ? 'rgba(162,155,254,0.12)' : 'rgba(108,92,231,0.1)';
  const chipBorder = isDark ? 'rgba(162,155,254,0.25)' : 'rgba(108,92,231,0.2)';
  const emptyMuted = isDark ? 'rgba(162,155,254,0.5)' : 'rgba(108,92,231,0.45)';
  const scrollFabBg = isDark ? 'rgba(108,92,231,0.35)' : 'rgba(108,92,231,0.32)';
  const scrollFabBr = isDark ? 'rgba(162,155,254,0.35)' : 'rgba(108,92,231,0.38)';
  const quickDiv = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(18,18,35,0.08)';
  const pillBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(108,92,231,0.08)';
  const pillTxt = isDark ? 'rgba(255,255,255,0.38)' : textMuted;
  const handleBar = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(18,18,35,0.15)';
  const visInactiveBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(108,92,231,0.06)';
  const cancelBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(108,92,231,0.06)';
  const vwBar = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(18,18,35,0.12)';
  const vwIconBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(108,92,231,0.1)';
  const icCard = isDark ? 'rgba(30,30,56,0.85)' : 'rgba(255,255,255,0.92)';
  const icBorder = isDark ? 'rgba(162,155,254,0.28)' : theme.border;

  const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: bg },
    loading: { flex: 1, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' },
    messagesFlex: { flex: 1 },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingBottom: 14,
      paddingHorizontal: 12,
      backgroundColor: bg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: hairline,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(108,92,231,0.12)' : 'rgba(108,92,231,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    avatarRing: { width: 46, height: 46, borderRadius: 23, padding: 2.5, marginRight: 10 },
    avatarInner: { flex: 1, borderRadius: 20, overflow: 'hidden', borderWidth: 2, borderColor: bg },
    avatarImg: { width: '100%', height: '100%' },
    avatarFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { fontSize: 14, fontWeight: '800', color: '#fff' },
    hInfo: { flex: 1 },
    hName: { fontSize: 16, fontWeight: '700', color: text },
    onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
    onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: ONLINE },
    onlineDotOff: { backgroundColor: isDark ? 'rgba(162,155,254,0.45)' : 'rgba(108,92,231,0.35)' },
    onlineTxt: { fontSize: 12, color: ONLINE, fontWeight: '600' },
    onlineTxtOff: { color: isDark ? 'rgba(162,155,254,0.72)' : textSub },
    hActions: { flexDirection: 'row', gap: 6 },
    hBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(108,92,231,0.12)' : 'rgba(108,92,231,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    overlapRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    miniBubble: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: bg,
    },
    miniBubbleFirst: { zIndex: 2, marginRight: -14 },
    miniBubbleSecond: { zIndex: 1 },
    miniBubbleTxt: { fontSize: 12, fontWeight: '800', color: '#fff', letterSpacing: -0.2 },
    banner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: bannerBg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: hairline,
      padding: 14,
      paddingHorizontal: 16,
    },
    bannerTxt: { fontSize: 13, fontWeight: '600', color: textSub, marginBottom: 8 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: {
      backgroundColor: chipBg,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: chipBorder,
    },
    chipTxt: { fontSize: 12, color: isDark ? theme.textAccent : theme.brandPurple, fontWeight: '600' },

    scrollFab: {
      position: 'absolute',
      right: 18,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: scrollFabBg,
      borderWidth: 1,
      borderColor: scrollFabBr,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.35 : 0.2,
      shadowRadius: 6,
      elevation: 8,
    },

    list: { paddingVertical: 12, paddingBottom: 8, flexGrow: 1 },
    emptyBox: { flex: 1, alignItems: 'center', paddingTop: 60, paddingBottom: 20 },
    emptyEmoji: { fontSize: 54, marginBottom: 12 },
    emptyTxt: { fontSize: 15, color: emptyMuted },

    quickBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 7,
      borderTopWidth: 1,
      borderTopColor: quickTop,
      backgroundColor: bg,
    },
    quickBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingVertical: 5,
    },
    quickTxt: { fontSize: 11, color: textSub, fontWeight: '600' },
    quickDiv: { width: 1, height: 18, backgroundColor: quickDiv },

    recordingMiniPill: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: 'rgba(255,107,139,0.35)',
      backgroundColor: 'rgba(255,107,139,0.14)',
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginLeft: 2,
    },
    recordingMiniDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      marginRight: 7,
      backgroundColor: '#FF6B8B',
    },
    recordingMiniTxt: { color: '#FFD7E1', fontSize: 12, fontWeight: '700' },

    inputDock: {
      paddingTop: 8,
      paddingHorizontal: 10,
      backgroundColor: bg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: hairline,
      gap: 4,
    },
    toolbarScroll: {
      alignItems: 'center',
      paddingVertical: 4,
      gap: 10,
      paddingRight: 8,
    },
    toolHit: { marginRight: 6 },
    toolCircle: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: toolBg,
      borderWidth: 1,
      borderColor: border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    composerRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 6,
      paddingTop: 2,
      paddingBottom: 2,
    },
    inputWrap: {
      flex: 1,
      backgroundColor: surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: border,
      paddingHorizontal: 16,
      paddingVertical: Platform.OS === 'ios' ? 12 : 8,
      maxHeight: 120,
      minHeight: 46,
      justifyContent: 'center',
    },
    input: { fontSize: 15, color: text, lineHeight: 21, minHeight: 22 },
    roundHit: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 3,
      borderRadius: 14,
      backgroundColor: roundBg,
      borderWidth: 1,
      borderColor: roundBorder,
    },
    roundHitRecording: {
      backgroundColor: 'rgba(255,107,139,0.12)',
      borderColor: 'rgba(255,107,139,0.35)',
    },
    sendOrb: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 3,
      shadowColor: '#6C5CE7',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.45,
      shadowRadius: 8,
      elevation: 10,
    },

    hBtnDemo: { borderWidth: 1, borderColor: 'rgba(255,107,139,0.3)' },
    demoBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 7,
      backgroundColor: isDark ? 'rgba(253,203,110,0.07)' : 'rgba(253,203,110,0.12)',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(253,203,110,0.15)' : 'rgba(217,119,6,0.2)',
    },
    demoBannerTxt: {
      flex: 1,
      fontSize: 12,
      color: isDark ? 'rgba(253,203,110,0.88)' : 'rgba(120,53,15,0.92)',
      fontWeight: '600',
    },
    demoBannerExit: { fontSize: 12, color: '#FF6B8B', fontWeight: '700' },
  });

  const qa = StyleSheet.create({
    overlayRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
    flexTap: { flex: 1 },
    sheetOuter: {
      backgroundColor: bg,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      borderTopWidth: 1,
      borderColor: border,
    },
    sheetInner: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 16,
      gap: 10,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: handleBar,
      alignSelf: 'center',
      marginBottom: 8,
    },
    title: { fontSize: 18, fontWeight: '800', color: text },
    subtitle: { fontSize: 13, color: theme.textAccent, fontWeight: '700', marginTop: 4 },
    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, minHeight: 32 },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: 'rgba(250,204,21,0.12)',
      borderWidth: 1,
      borderColor: 'rgba(250,204,21,0.35)',
    },
    chipAlt: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(108,92,231,0.16)' : 'rgba(108,92,231,0.1)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(162,155,254,0.35)' : 'rgba(108,92,231,0.25)',
    },
    chipTxt: { color: text, fontSize: 12, fontWeight: '600' },
    emptyTxt: { color: textMuted, fontSize: 12, fontStyle: 'italic', paddingVertical: 4 },
    scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
    scoreNum: { color: text, fontSize: 34, fontWeight: '800' },
    levelPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    levelTxt: { fontSize: 12, fontWeight: '700' },
    progressBg: {
      width: '100%',
      height: 10,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(162,155,254,0.18)' : 'rgba(108,92,231,0.12)',
      overflow: 'hidden',
      marginBottom: 4,
    },
    progressFill: {
      height: '100%',
      borderRadius: 999,
      backgroundColor: '#A29BFE',
    },
    metricRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark ? 'rgba(162,155,254,0.22)' : 'rgba(108,92,231,0.15)',
    },
    metricLabel: { color: textSub, fontSize: 13, fontWeight: '600' },
    metricVal: { color: text, fontSize: 12, fontWeight: '700', maxWidth: '52%', textAlign: 'right' },
    closeBtn: {
      marginTop: 8,
      alignSelf: 'stretch',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      paddingVertical: 12,
      backgroundColor: isDark ? 'rgba(108,92,231,0.2)' : 'rgba(108,92,231,0.12)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(162,155,254,0.35)' : 'rgba(108,92,231,0.25)',
    },
    closeTxt: { color: text, fontSize: 14, fontWeight: '700' },
  });

  const pv = StyleSheet.create({
    overlayRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
    flexTap: { flex: 1 },
    sheetOuter: {
      backgroundColor: bg,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      borderTopWidth: 1,
      borderColor: border,
    },
    sheetInner: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16, gap: 12 },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: handleBar,
      alignSelf: 'center',
      marginBottom: 2,
    },
    title: { fontSize: 16, fontWeight: '800', color: text },
    previewImageWrap: {
      width: '100%',
      height: 240,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: border,
      backgroundColor: surface,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewImage: { width: '100%', height: '100%' },
    docBox: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: border,
      backgroundColor: surface,
      padding: 14,
      gap: 6,
    },
    docName: { fontSize: 14, color: text, fontWeight: '700' },
    docMeta: { fontSize: 12, color: textSub },
    visibilityWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    visibilityChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: border,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: visInactiveBg,
    },
    visibilityChipActive: {
      borderColor: '#A29BFE',
      backgroundColor: isDark ? 'rgba(162,155,254,0.2)' : 'rgba(108,92,231,0.14)',
    },
    visibilityTxt: { color: textSub, fontSize: 12, fontWeight: '600' },
    visibilityTxtActive: { color: text },
    customVisibilityRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    customVisibilityInput: {
      minWidth: 150,
      flexGrow: 1,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: border,
      backgroundColor: visInactiveBg,
      color: text,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
      fontWeight: '600',
    },
    customUnitWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    customUnitChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: border,
      backgroundColor: visInactiveBg,
      paddingHorizontal: 8,
      paddingVertical: 7,
    },
    customUnitChipActive: {
      borderColor: '#A29BFE',
      backgroundColor: isDark ? 'rgba(162,155,254,0.2)' : 'rgba(108,92,231,0.14)',
    },
    customUnitTxt: { color: textSub, fontSize: 11, fontWeight: '700' },
    customUnitTxtActive: { color: text },
    customVisibilityBtn: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(162,155,254,0.45)' : 'rgba(108,92,231,0.35)',
      backgroundColor: isDark ? 'rgba(108,92,231,0.2)' : 'rgba(108,92,231,0.12)',
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    customVisibilityBtnTxt: { color: text, fontSize: 12, fontWeight: '700' },
    visibilityHint: {
      color: textSub,
      fontSize: 12,
      fontWeight: '600',
      marginTop: -2,
    },
    row: { flexDirection: 'row', gap: 10, marginTop: 2 },
    editBtn: {
      flex: 1.25,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(162,155,254,0.5)' : 'rgba(108,92,231,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      backgroundColor: isDark ? 'rgba(108,92,231,0.16)' : 'rgba(108,92,231,0.1)',
    },
    editTxt: { color: theme.textAccent, fontSize: 13, fontWeight: '700' },
    cancelBtn: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: border,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      backgroundColor: cancelBg,
    },
    cancelTxt: { color: textSub, fontSize: 14, fontWeight: '700' },
    sendBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
    sendGrad: { paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
    sendTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },
  });

  const vw = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 14,
      paddingHorizontal: 12,
      paddingBottom: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: vwBar,
      gap: 10,
    },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: vwIconBg,
    },
    title: { flex: 1, color: text, fontSize: 13, fontWeight: '700' },
    actions: { flexDirection: 'row', gap: 8 },
    body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 14 },
    image: { width: '100%', height: '100%' },
    fileBox: {
      width: '100%',
      maxWidth: 360,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: border,
      backgroundColor: surface,
      padding: 18,
      alignItems: 'center',
      gap: 12,
    },
    fileName: { color: text, fontSize: 14, fontWeight: '700', textAlign: 'center' },
    openBtn: {
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(108,92,231,0.22)' : 'rgba(108,92,231,0.14)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(162,155,254,0.4)' : 'rgba(108,92,231,0.3)',
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    openTxt: { color: text, fontSize: 13, fontWeight: '700' },
  });

  const ds = StyleSheet.create({
    row: { alignItems: 'center', marginVertical: 16, paddingHorizontal: 16 },
    pill: {
      alignSelf: 'center',
      fontSize: 12,
      color: pillTxt,
      fontWeight: '600',
      letterSpacing: 0.4,
      backgroundColor: pillBg,
      paddingHorizontal: 14,
      paddingVertical: 5,
      borderRadius: 999,
      overflow: 'hidden',
    },
  });

  const ic = StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: icCard,
      borderRadius: 20,
      marginHorizontal: 16,
      marginVertical: 8,
      padding: 14,
      borderWidth: 1,
      borderColor: icBorder,
      gap: 12,
    },
    sparkWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? 'rgba(108,92,231,0.15)' : 'rgba(108,92,231,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    q: { flex: 1, fontSize: 14, color: textSub, lineHeight: 20, fontWeight: '500' },
    btn: {
      backgroundColor: isDark ? 'rgba(108,92,231,0.22)' : 'rgba(108,92,231,0.12)',
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(108,92,231,0.45)' : 'rgba(108,92,231,0.25)',
    },
    btnTxt: { fontSize: 13, fontWeight: '700', color: theme.textAccent },
  });

  const em = StyleSheet.create({
    overlayRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
    flexTap: { flex: 1 },
    sheetOuter: {
      backgroundColor: bg,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      borderTopWidth: 1,
      borderColor: border,
    },
    sheetInner: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 12,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: handleBar,
      alignSelf: 'center',
      marginBottom: 16,
    },
    title: { fontSize: 16, fontWeight: '700', color: text, marginBottom: 14 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-start' },
    emojiCell: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: border,
    },
    emojiChar: { fontSize: 28 },
  });

  const at = StyleSheet.create({
    overlayRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
    flexTap: { flex: 1 },
    sheetOuter: {
      backgroundColor: bg,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      borderTopWidth: 1,
      borderColor: border,
    },
    sheetInner: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14 },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: handleBar,
      alignSelf: 'center',
      marginBottom: 16,
    },
    title: { fontSize: 16, fontWeight: '700', color: text, marginBottom: 8 },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
    iconWrap: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    label: { flex: 1, fontSize: 16, fontWeight: '600', color: text },
  });

  const bub = StyleSheet.create({
    ownWrap: { alignItems: 'flex-end', marginHorizontal: 16, marginBottom: 8 },
    ownBubble: { maxWidth: '80%', borderRadius: 22, borderBottomRightRadius: 6, padding: 14, paddingBottom: 9 },
    ownTxt: { fontSize: 15, color: '#fff', lineHeight: 21 },
    ownTime: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
    meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 5 },
    otherWrap: { alignItems: 'flex-start', marginHorizontal: 16, marginBottom: 8 },
    otherBubble: {
      maxWidth: '80%',
      borderRadius: 22,
      borderBottomLeftRadius: 6,
      padding: 14,
      paddingBottom: 9,
      borderWidth: 1,
      borderColor: border,
      backgroundColor: surfaceHigh,
    },
    otherTxt: { fontSize: 15, color: text, lineHeight: 21 },
    otherTime: { fontSize: 11, color: textMuted, marginTop: 5, textAlign: 'right' },
    img: { width: 210, height: 158, borderRadius: 12, marginBottom: 6 },
    audioRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, minWidth: 140 },
    audioWave: { flex: 1, height: 3, borderRadius: 1.5 },
    audioDur: { fontSize: 11, minWidth: 28 },
    fileRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
    fileIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    fileName: { fontSize: 13, fontWeight: '600' },
    fileSize: { fontSize: 11, color: textMuted, marginTop: 1 },
    expiredTxt: { fontSize: 12, color: '#FF9AA2', fontStyle: 'italic', marginBottom: 4 },
  });

  return { s, pv, vw, qa, ds, ic, em, at, bub };
}

/** Tonos de iconos del chat: en claro se oscurecen para mejor contraste sobre fondos lavanda/blancos. */
export function chatIconColors(theme: Theme) {
  const d = theme.isDark;
  const purple = theme.brandPurple;
  const pink = theme.brandPink;
  return {
    back: d ? '#A29BFE' : purple,
    headerAction: d ? 'rgba(162,155,254,0.82)' : purple,
    bannerDismiss: d ? 'rgba(255,255,255,0.45)' : 'rgba(18,18,35,0.52)',
    quickCalendar: d ? 'rgba(162,155,254,0.82)' : purple,
    quickStar: d ? '#FACC15' : '#B45309',
    quickHeart: pink,
    scrollFab: d ? '#FFFFFF' : purple,
    composerEmoji: d ? 'rgba(162,155,254,0.85)' : purple,
    composerMicIdle: d ? 'rgba(162,155,254,0.85)' : purple,
    toolbarAttach: d ? '#A29BFE' : purple,
    toolbarCamera: d ? '#A29BFE' : purple,
    toolbarDoc: d ? '#7DD3FC' : '#0369A1',
    toolbarGallery: pink,
    previewMic: d ? '#FDCB6E' : '#B45309',
    previewDoc: d ? '#7DD3FC' : '#0369A1',
    demoFlask: d ? '#FDCB6E' : '#B45309',
    iceSparkles: theme.textAccent,
    attachChevron: d ? 'rgba(255,255,255,0.35)' : theme.textSub,
  };
}
