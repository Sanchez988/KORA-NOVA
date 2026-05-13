import React, { useState } from 'react';
import { Alert, Platform, StyleSheet } from 'react-native';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { User } from '../types';
import { LegalConsentSheet } from '../components/LegalConsentSheet';
import { LEGAL_DOC_VERSION } from '../constants/legal';
import { authService } from '../services/auth.service';
import { navigationRef } from './navigationRef';
import { MatchSocketSubscriber } from '../components/MatchSocketSubscriber';

// Pantallas
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import VerifyEmailScreen from '../screens/VerifyEmailScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import TermsScreen from '../screens/TermsScreen';
import CreateProfileScreen from '../screens/CreateProfileScreen';
import DiscoveryScreen from '../screens/DiscoveryScreen';
import ProfileDetailScreen from '../screens/ProfileDetailScreen';
import MatchesScreen from '../screens/MatchesScreen';
import MensajesScreen from '../screens/MensajesScreen';
import ChatScreen from '../screens/ChatScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PlanesScreen from '../screens/PlanesScreen';
import MatchCelebrationScreen from '../screens/MatchCelebrationScreen';
import StoriesHubScreen from '../screens/StoriesHubScreen';
import CreateStoryScreen from '../screens/CreateStoryScreen';
import StoryViewerScreen from '../screens/StoryViewerScreen';
import PlansMapScreen from '../screens/PlansMapScreen';

const Stack = createNativeStackNavigator();
const DiscoveryStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ─── Tab icon helper ──────────────────────────────────────────────────────────

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TabIcon = ({
  name,
  focused,
  color,
}: {
  name: IoniconName;
  focused: boolean;
  color: string;
}) => <Ionicons name={focused ? name : (`${name}-outline` as IoniconName)} size={26} color={color} />;

/** Llama / Descubrir — activo con gradiente marca (referencia). */
const NovaFlameTabIcon = ({ focused }: { focused: boolean }) => {
  const { theme } = useTheme();
  if (focused) {
    return (
      <LinearGradient
        colors={['#6C5CE7', '#FF6B8B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: 44,
          height: 44,
          borderRadius: 15,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="flame" size={24} color="#FFFFFF" />
      </LinearGradient>
    );
  }
  return <Ionicons name="flame-outline" size={28} color={theme.tabBarInactive} />;
};

// ─── Discovery nested stack (keeps tab bar visible on profile detail) ───────
const DiscoveryStackNav = () => (
  <DiscoveryStack.Navigator screenOptions={{ headerShown: false }}>
    <DiscoveryStack.Screen name="DiscoveryMain" component={DiscoveryScreen} />
    <DiscoveryStack.Screen name="ProfileDetail" component={ProfileDetailScreen} />
    <DiscoveryStack.Screen name="MatchCelebration" component={MatchCelebrationScreen} />
  </DiscoveryStack.Navigator>
);

const MainTabs = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  /** Aire fijo bajo las etiquetas + inset del sistema (evita barra “apeñuscada”). */
  const tabBarTopPad = 12;
  const tabBarExtraBottom = 10;
  const tabBarBottomPad = Math.max(insets.bottom, 12) + tabBarExtraBottom;
  const tabBarContentMin = 58;
  return (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: theme.tabBarActive,
      tabBarInactiveTintColor: theme.tabBarInactive,
      tabBarStyle: {
        backgroundColor: theme.tabBarBg,
        borderTopColor: theme.tabBarBorder,
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingTop: tabBarTopPad,
        paddingBottom: tabBarBottomPad,
        minHeight: tabBarTopPad + tabBarContentMin + tabBarBottomPad,
      },
      tabBarItemStyle: {
        paddingVertical: 6,
      },
      tabBarIconStyle: {
        marginBottom: 4,
      },
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 0,
        letterSpacing: 0.15,
      },
    }}
  >
    <Tab.Screen
      name="Discovery"
      component={DiscoveryStackNav}
      options={{
        tabBarLabel: 'Descubrir',
        tabBarIcon: ({ focused }) => <NovaFlameTabIcon focused={focused} />,
        tabBarActiveTintColor: '#FFFFFF',
      }}
    />
    <Tab.Screen
      name="Matches"
      component={MatchesScreen}
      options={{
        tabBarLabel: 'Explorar',
        tabBarIcon: ({ focused, color }) => <TabIcon name="search" focused={focused} color={color} />,
      }}
    />
    <Tab.Screen
      name="Mensajes"
      component={MensajesScreen}
      options={{
        tabBarLabel: 'Chats',
        tabBarIcon: ({ focused, color }) => <TabIcon name="chatbubble" focused={focused} color={color} />,
      }}
    />
    <Tab.Screen
      name="Planes"
      component={PlanesScreen}
      options={{
        tabBarLabel: 'Planes',
        tabBarIcon: ({ focused, color }) => <TabIcon name="calendar" focused={focused} color={color} />,
      }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{
        tabBarLabel: 'Perfil',
        tabBarIcon: ({ focused, color }) => <TabIcon name="person" focused={focused} color={color} />,
      }}
    />
  </Tab.Navigator>
  );
};

/**
 * Un solo root stack (invitado ↔ sesión) evita estados colgados tras OAuth en web.
 * Dos `<Stack.Navigator>` hermanos dentro del mismo contenedor suelen dejar la UI en Login aunque `user` exista.
 */
function RootStackNavigator({
  user,
  isNewUser,
}: {
  user: User | null;
  isNewUser: boolean;
}) {
  const { theme } = useTheme();
  const authenticated = user != null;
  const stackKey = authenticated ? user.id : 'guest';
  const initialRouteName = !authenticated
    ? 'Login'
    : isNewUser
      ? 'Onboarding'
      : 'MainTabs';

  return (
    <Stack.Navigator
      key={stackKey}
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.bg },
      }}
    >
      {!authenticated ? (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Terms" component={TermsScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="CreateProfile" component={CreateProfileScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="StoriesHub" component={StoriesHubScreen} />
          <Stack.Screen name="CreateStory" component={CreateStoryScreen} />
          <Stack.Screen
            name="StoryViewer"
            component={StoryViewerScreen}
            options={{
              animation: 'fade',
              presentation: 'fullScreenModal',
              contentStyle:
                Platform.OS === 'web'
                  ? ({
                      flex: 1,
                      backgroundColor: '#000',
                      minHeight: '100vh',
                      height: '100%',
                      maxHeight: '100vh',
                      overflow: 'hidden',
                      width: '100%',
                    } as unknown as import('react-native').ViewStyle)
                  : { flex: 1, backgroundColor: '#000' },
            }}
          />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="PlansMap" component={PlansMapScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

const Navigation = () => {
  const { user, loading, onboardingCompleted, refreshUser } = useAuth();
  const { theme, isDark } = useTheme();

  /** Mientras el usuario abre `Terms` desde el sheet, el modal se oculta para poder leer */
  const [legalSheetSuppressed, setLegalSheetSuppressed] = useState(false);
  /** `legalConsentVersion` persiste por usuario en el servidor */
  const needsLegalConsent = Boolean(
    user && user.legalConsentVersion !== LEGAL_DOC_VERSION
  );

  const acceptLegalConsent = async () => {
    try {
      await authService.acceptLegalConsent(LEGAL_DOC_VERSION);
      await refreshUser();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } }).response?.data?.message ||
        'Revisa tu conexión e inténtalo de nuevo.';
      Alert.alert('No se pudo registrar la aceptación', msg);
    }
  };

  if (loading) {
    return null;
  }

  const isNewUser = !onboardingCompleted && !user?.profile;

  const navTheme = isDark
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: theme.bg, card: theme.surface } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: theme.bg, card: theme.surface } };

  const openLegal = (tab: 'Términos y Condiciones' | 'Privacidad') => {
    if (navigationRef.isReady()) {
      // Root types no declarados: navegación imperativa al legal desde el sheet
      (navigationRef as unknown as { navigate: (n: string, p?: object) => void }).navigate('Terms', {
        readOnly: true,
        tab,
      });
    }
  };

  const syncLegalSheetVisibility = () => {
    if (!navigationRef.isReady()) return;
    const name = navigationRef.getCurrentRoute()?.name;
    setLegalSheetSuppressed(name === 'Terms');
  };

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navTheme}
      onReady={syncLegalSheetVisibility}
      onStateChange={syncLegalSheetVisibility}
    >
      {user ? <MatchSocketSubscriber /> : null}
      <RootStackNavigator user={user} isNewUser={isNewUser} />

      {user && needsLegalConsent && !legalSheetSuppressed && (
        <LegalConsentSheet
          visible
          onAccept={acceptLegalConsent}
          onOpenFullTerms={() => openLegal('Términos y Condiciones')}
          onOpenPrivacy={() => openLegal('Privacidad')}
        />
      )}
    </NavigationContainer>
  );
};

export { navigationRef } from './navigationRef';
export default Navigation;
