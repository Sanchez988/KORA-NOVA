/**
 * Android: mapa con teselas Carto (sin SDK de Google Maps en pantalla).
 * Evita cierres y el aviso «La aplicación sigue fallando» cuando Play Services / clave API fallan.
 * iOS sigue usando `PlansMapCanvas.native.tsx` (aspecto tipo Apple/Google según config).
 */
import PlansMapCanvasCarto from './PlansMapCanvasCarto';

export default PlansMapCanvasCarto;
