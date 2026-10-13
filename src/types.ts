import type { useAuth } from './auth';

export interface AoiItem {
  id: string;
  title: string;
  lng: number;
  lat: number;
  color: string;
  icon: string;
  imageUrl: string;
  imageCaption: string;
  calloutLng: number;
  calloutLat: number;
  showCallout: boolean;
  showInLegend: boolean;
  legendLabel: string;
  legendImageUrl: string;
}

export type BasemapTone = 'sat' | 'light' | 'dark';
export interface BasemapDef {
  name: string;
  url: string;
  desc: string;
  thumb: string;
  group: string;
  tone: BasemapTone;
  attr: string;
  maxzoom?: number;
  needsKey?: 'carto';
}

/** Hasil useAuth(): user, status loading, refreshUser, dst. */
export type Auth = ReturnType<typeof useAuth>;
