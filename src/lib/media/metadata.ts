import type { MediaType } from '@/types';

export function getMediaTypeFromFile(file: File): MediaType {
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type.startsWith('image/')) return 'image';
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext || '')) return 'video';
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext || '')) return 'audio';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext || '')) return 'image';
  return 'video';
}

export function extractVideoMetadata(file: File): Promise<{
  duration: number;
  width: number;
  height: number;
  thumbnail: string;
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const url = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 90;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas context not available'));
        return;
      }

      video.currentTime = Math.min(1, video.duration / 4);
      
      video.onseeked = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
        URL.revokeObjectURL(url);
        resolve({
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          thumbnail,
        });
      };
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(video.error);
    };

    video.src = url;
    video.load();
  });
}

export function extractAudioMetadata(file: File): Promise<{
  duration: number;
  thumbnail: string;
}> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    const url = URL.createObjectURL(file);

    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 90;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#3a3a47';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#8b5cf6';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🎵 Audio', canvas.width / 2, canvas.height / 2);
      }
      resolve({
        duration: audio.duration,
        thumbnail: canvas.toDataURL('image/jpeg', 0.7),
      });
    };

    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(audio.error);
    };

    audio.src = url;
    audio.load();
  });
}

export function extractImageMetadata(file: File): Promise<{
  duration: number;
  width: number;
  height: number;
  thumbnail: string;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 90;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas context not available'));
        return;
      }

      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const x = (canvas.width - img.width * scale) / 2;
      const y = (canvas.height - img.height * scale) / 2;
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      
      const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
      URL.revokeObjectURL(url);
      resolve({
        duration: 5,
        width: img.width,
        height: img.height,
        thumbnail,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
