import type { PlanMapPin, PlansMapPayload } from '../services/plan.service';

export type PlansMapCanvasRef = {
  zoomIn: () => void;
  zoomOut: () => void;
  recenter: () => void;
};

/** Props comunes; los campos web son obligatorios en `PlansMapCanvas.web`. */
export type PlansMapCanvasProps = {
  data: PlansMapPayload;
  mapW: number;
  mapHeight: number;
  mosaicFail?: boolean;
  mosaicUrls?: [string, string, string, string];
  planPins?: { pin: PlanMapPin; style: { left: number; top: number } }[];
  mePos?: { left: number; top: number } | null;
  panHandlers?: object;
  mapWebWheel?: Record<string, unknown>;
  onMosaicTileError?: () => void;
};
