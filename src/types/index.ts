export type MediaType = 'video' | 'audio' | 'image';

export type TrackType = 'video' | 'audio' | 'subtitle';

export interface MediaAsset {
  id: string;
  name: string;
  type: MediaType;
  fileType: string;
  size: number;
  duration: number;
  width?: number;
  height?: number;
  thumbnail: string;
  blobId: string;
  createdAt: number;
}

export interface VideoEffects {
  fadeIn: number;
  fadeOut: number;
  opacity: number;
  scale: number;
  positionX: number;
  positionY: number;
  speed: number;
  volume: number;
  volumeCurve: VolumeKeyframe[];
  audioFadeIn: number;
  audioFadeOut: number;
}

export interface VolumeKeyframe {
  time: number;
  volume: number;
}

export interface Clip {
  id: string;
  assetId: string;
  trackType: TrackType;
  trackIndex: number;
  startTime: number;
  duration: number;
  offset: number;
  effects: VideoEffects;
}

export interface SubtitleClip extends Clip {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  strokeColor: string;
  strokeWidth: number;
  positionX: number;
  positionY: number;
}

export interface Track {
  type: TrackType;
  index: number;
  name: string;
  height: number;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  assets: MediaAsset[];
  clips: Clip[];
  subtitleClips: SubtitleClip[];
  duration: number;
  width: number;
  height: number;
  fps: number;
}

export interface ExportOptions {
  width: number;
  height: number;
  fps: number;
  duration: number;
  demoMode: boolean;
}
