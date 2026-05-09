'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useProject } from '@/lib/context/ProjectContext';
import { formatTime } from '@/lib/media/metadata';
import type { Clip, SubtitleClip } from '@/types';

export function PreviewPlayer() {
  const {
    project,
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    getAssetUrl,
    timelineScale,
  } = useProject();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRefsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const startCurrentTimeRef = useRef<number>(0);
  const [videoUrls, setVideoUrls] = useState<Map<string, string>>(new Map());
  const [loadingVideos, setLoadingVideos] = useState<Set<string>>(new Set());

  const activeClips = React.useMemo(() => {
    if (!project) return { video: [], audio: [], subtitles: [] };
    const videoClips = project.clips
      .filter((c) => c.trackType === 'video')
      .sort((a, b) => b.trackIndex - a.trackIndex);
    const audioClips = project.clips.filter((c) => c.trackType === 'audio');
    return { video: videoClips, audio: audioClips, subtitles: project.subtitleClips };
  }, [project]);

  const frameInterval = project ? 1 / project.fps : 1 / 30;

  useEffect(() => {
    if (!project) return;
    const assetIds = new Set<string>();
    activeClips.video.forEach((c) => assetIds.add(c.assetId));
    
    const loadUrls = async () => {
      const newUrls = new Map(videoUrls);
      const newLoading = new Set(loadingVideos);
      
      for (const assetId of assetIds) {
        if (!newUrls.has(assetId) && !newLoading.has(assetId)) {
          newLoading.add(assetId);
          const url = await getAssetUrl(assetId);
          if (url) {
            newUrls.set(assetId, url);
          }
          newLoading.delete(assetId);
        }
      }
      
      setVideoUrls(newUrls);
      setLoadingVideos(newLoading);
    };
    
    loadUrls();
  }, [activeClips, getAssetUrl, project]);

  const renderFrame = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !project) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const videoClipsAtTime = activeClips.video.filter(
      (c) => time >= c.startTime && time < c.startTime + c.duration
    );

    for (const clip of videoClipsAtTime) {
      const url = videoUrls.get(clip.assetId);
      if (!url) continue;

      const asset = project.assets.find((a) => a.id === clip.assetId);
      if (!asset) continue;

      const clipTime = (time - clip.startTime) / clip.effects.speed;
      const videoTime = clip.offset + clipTime;

      let video = videoRefsRef.current.get(clip.id);
      if (!video) {
        video = document.createElement('video');
        video.src = url;
        video.preload = 'auto';
        video.muted = true;
        video.crossOrigin = 'anonymous';
        videoRefsRef.current.set(clip.id, video);
      }

      if (!isNaN(video.duration) && video.duration > 0) {
        const seekTime = Math.min(Math.max(videoTime, 0), video.duration);
        if (Math.abs(video.currentTime - seekTime) > 0.03) {
          video.currentTime = seekTime;
        }

        const scale = clip.effects.scale;
        const posX = clip.effects.positionX;
        const posY = clip.effects.positionY;

        let opacity = clip.effects.opacity;
        if (clip.effects.fadeIn > 0 && clipTime < clip.effects.fadeIn) {
          opacity *= clipTime / clip.effects.fadeIn;
        }
        if (clip.effects.fadeOut > 0) {
          const fadeOutStart = clip.duration - clip.effects.fadeOut;
          if (clipTime > fadeOutStart) {
            opacity *= (clip.duration - clipTime) / clip.effects.fadeOut;
          }
        }

        ctx.save();
        ctx.globalAlpha = opacity;

        const drawWidth = canvas.width * scale;
        const drawHeight = canvas.height * scale;
        const x = (canvas.width - drawWidth) / 2 + posX;
        const y = (canvas.height - drawHeight) / 2 + posY;

        if (asset.type === 'video') {
          ctx.drawImage(video, x, y, drawWidth, drawHeight);
        } else if (asset.type === 'image') {
          const img = new Image();
          img.src = url;
          if (img.complete) {
            ctx.drawImage(img, x, y, drawWidth, drawHeight);
          }
        }

        ctx.restore();
      }
    }

    const subtitlesAtTime = activeClips.subtitles.filter(
      (c) => time >= c.startTime && time < c.startTime + c.duration
    );

    for (const sub of subtitlesAtTime) {
      ctx.save();
      ctx.font = `bold ${sub.fontSize}px ${sub.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';

      const x = canvas.width * (sub.positionX / 100);
      const y = canvas.height * (sub.positionY / 100);

      if (sub.strokeWidth > 0) {
        ctx.strokeStyle = sub.strokeColor;
        ctx.lineWidth = sub.strokeWidth * 2;
        ctx.lineJoin = 'round';
        ctx.strokeText(sub.text, x, y);
      }

      ctx.fillStyle = sub.fontColor;
      ctx.fillText(sub.text, x, y);
      ctx.restore();
    }
  }, [project, videoUrls, activeClips]);

  useEffect(() => {
    if (!isPlaying) {
      renderFrame(currentTime);
      return;
    }

    startTimeRef.current = performance.now();
    startCurrentTimeRef.current = currentTime;

    const animate = (timestamp: number) => {
      const elapsed = (timestamp - startTimeRef.current) / 1000;
      let newTime = startCurrentTimeRef.current + elapsed;

      if (project && newTime >= project.duration) {
        newTime = 0;
        startTimeRef.current = timestamp;
        startCurrentTimeRef.current = 0;
      }

      setCurrentTime(newTime);
      renderFrame(newTime);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, renderFrame, setCurrentTime, project, currentTime]);

  useEffect(() => {
    if (!isPlaying) {
      renderFrame(currentTime);
    }
  }, [currentTime, isPlaying, renderFrame]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          setIsPlaying(!isPlaying);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setCurrentTime(Math.max(0, currentTime - frameInterval));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setCurrentTime(Math.min(project?.duration || 0, currentTime + frameInterval));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTime, frameInterval, project, setIsPlaying, setCurrentTime]);

  const handleCanvasClick = () => {
    setIsPlaying(!isPlaying);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = x / rect.width;
    if (project) {
      setCurrentTime(ratio * project.duration);
    }
  };

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center bg-dark-900">
        <div className="text-center text-dark-400">
          <div className="text-6xl mb-4">🎬</div>
          <p className="text-lg">请创建或打开一个工程</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-dark-900 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div
          className="relative bg-black shadow-2xl"
          style={{ aspectRatio: `${project.width}/${project.height}`, maxHeight: '100%', maxWidth: '100%' }}
        >
          <canvas
            ref={canvasRef}
            width={project.width}
            height={project.height}
            className="w-full h-full cursor-pointer"
            onClick={handleCanvasClick}
          />
          {isPlaying && (
            <div className="absolute top-3 left-3 bg-black/50 px-2 py-1 rounded text-sm text-white">
              ▶ 播放中
            </div>
          )}
        </div>
      </div>

      <div className="p-4 bg-dark-800 border-t border-dark-500">
        <div className="flex items-center gap-4 max-w-4xl mx-auto">
          <button
            className="w-12 h-12 flex items-center justify-center bg-accent-primary hover:bg-accent-primary/80 rounded-full text-xl"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          <div className="flex-1">
            <div
              className="h-2 bg-dark-600 rounded cursor-pointer overflow-hidden"
              onClick={handleProgressClick}
            >
              <div
                className="h-full bg-accent-primary"
                style={{ width: `${(currentTime / project.duration) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-dark-400 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(project.duration)}</span>
            </div>
          </div>

          <div className="text-xs text-dark-400 whitespace-nowrap">
            {project.width}×{project.height} @ {project.fps}fps
          </div>
        </div>
      </div>
    </div>
  );
}
