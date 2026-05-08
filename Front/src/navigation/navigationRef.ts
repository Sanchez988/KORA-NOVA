import { createNavigationContainerRef } from '@react-navigation/native';

/** Ref global para navegación imperativa sin ciclos con `navigation/index.tsx`. */
export const navigationRef = createNavigationContainerRef();
