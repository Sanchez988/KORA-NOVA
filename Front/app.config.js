/**
 * Expo fusiona `app.json` en `config`.
 * - Maps: inyecta `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` en Android/iOS (iOS / Google nativo).
 * - APK “de tienda”: en perfiles **production** y **preview** de EAS se quita el plugin
 *   `expo-dev-client` para que la app no actúe como dev client (evita flujos raros de
 *   “actualizar” / volver a descargar la app al usar pantallas como el mapa de planes).
 */
function isExpoDevClientPlugin(entry) {
  if (entry === 'expo-dev-client') return true;
  return Array.isArray(entry) && entry[0] === 'expo-dev-client';
}

module.exports = ({ config }) => {
  const mapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || '';
  const profile = process.env.EAS_BUILD_PROFILE || '';
  const stripDevClient = profile === 'production' || profile === 'preview';

  const plugins = Array.isArray(config.plugins)
    ? config.plugins.filter((p) => !(stripDevClient && isExpoDevClientPlugin(p)))
    : config.plugins;

  return {
    ...config,
    plugins,
    android: {
      ...config.android,
      config: {
        ...(config.android && config.android.config),
        ...(mapsKey ? { googleMaps: { apiKey: mapsKey } } : {}),
      },
    },
    ios: {
      ...config.ios,
      config: {
        ...(config.ios && config.ios.config),
        ...(mapsKey ? { googleMapsApiKey: mapsKey } : {}),
      },
    },
  };
};
