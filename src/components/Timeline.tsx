'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useProject } from '@/lib/context/ProjectContext';
import { formatTime } from '@/lib/media/metadata';
import type { TrackType, Clip, SubtitleClip, MediaAsset } from '@/types';

const TRACK_CONFIGS = [
  { type: 'video' as TrackType, index: 0, name: '视频轨 1', height: 60, color: 'bg-indigo-600/50' },
  { type: 'video' as TrackType, index: 1, name: '视频轨 2', height: 60, color: 'bg-indigo-500/50' },
  { type: 'audio' as TrackType, index: 0, name: '音频轨 1', height: 50, color: 'bg-emerald-600/50' },
  { type: 'audio' as TrackType, index: 1, name: '音频轨 2', height: 50, color: 'bg-emerald-500/50' },
  { type: 'subtitle' as TrackType, index: 0, name: '字幕轨', height: 40, color: 'bg-amber-600/50' },
];

export function Timeline() {
  const {
    project,
    currentTime,
    setCurrentTime,
    timelineScale,
    setTimelineScale,
    selectedClipId,
    setSelectedClipId,
    addClip,
    addSubtitleClip,
    updateClip,
    splitClip,
    deleteClip,
    duplicateClip,
    moveClipToTrack,
  } = useProject();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    type: 'move' | 'resize-left' | 'resize-right' | 'drop' | null;
    clipId: string | null;
    startX: number;
    startY: number;
    originalStartTime: number;
    originalDuration: number;
    originalOffset: number;
    originalTrackType: TrackType;
    originalTrackIndex: number;
    asset: MediaAsset | null;
  }>({
    type: null,
    clipId: null,
    startX: 0,
    startY: 0,
    originalStartTime: 0,
    originalDuration: 0,
    originalOffset: 0,
    originalTrackType: 'video',
    originalTrackIndex: 0,
    asset: null,
  });

  if (!project) return null;

  const pixelsPerSecond = timelineScale;
  const totalWidth = Math.max(project.duration * pixelsPerSecond, 1000);

  const getTrackClips = (type: TrackType, index: number) => {
    if (type === 'subtitle') {
      return project.subtitleClips.filter((c) => c.trackIndex === index);
    }
    return project.clips.filter((c) => c.trackType === type && c.trackIndex === index);
  };

  const getTrackTop = (type: TrackType, index: number): number => {
    let top = 0;
    for (const track of TRACK_CONFIGS) {
      if (track.type === type && track.index === index) break;
      top += track.height;
    }
    return top;
  };

  const getTrackAtPosition = (y: number): { type: TrackType; index: number } | null => {
    let cumulativeY = 0;
    for (const track of TRACK_CONFIGS) {
      if (y >= cumulativeY && y < cumulativeY + track.height) {
        return { type: track.type, index: track.index };
      }
      cumulativeY += track.height;
    }
    return null;
  };

  const handleTrackClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = x / pixelsPerSecond;
    setCurrentTime(Math.max(0, Math.min(project.duration, time)));
    setSelectedClipId(null);
  };

  const handleClipClick = (e: React.MouseEvent, clipId: string) => {
    e.stopPropagation();
    setSelectedClipId(clipId);
  };

  const handleClipDragStart = (e: React.MouseEvent, clip: Clip | SubtitleClip) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedClipId(clip.id);
    setDragState({
      type: 'move',
      clipId: clip.id,
      startX: e.clientX,
      startY: e.clientY,
      originalStartTime: clip.startTime,
      originalDuration: clip.duration,
      originalOffset: clip.offset,
      originalTrackType: clip.trackType,
      originalTrackIndex: clip.trackIndex,
      asset: null,
    });
  };

  const handleClipResizeStart = (
    e: React.MouseEvent,
    clip: Clip | SubtitleClip,
    edge: 'left' | 'right'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedClipId(clip.id);
    setDragState({
      type: edge === 'left' ? 'resize-left' : 'resize-right',
      clipId: clip.id,
      startX: e.clientX,
      startY: e.clientY,
      originalStartTime: clip.startTime,
      originalDuration: clip.duration,
      originalOffset: clip.offset,
      originalTrackType: clip.trackType,
      originalTrackIndex: clip.trackIndex,
      asset: null,
    });
  };

  const handleTrackDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const assetData = e.dataTransfer.getData('application/x-asset');
      if (!assetData) return;

      const asset: MediaAsset = JSON.parse(assetData);
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const scrollContainer = scrollRef.current?.parentElement;
      const scrollLeft = scrollContainer?.scrollLeft || 0;
      const x = e.clientX - rect.left + scrollLeft;
      const y = e.clientY - rect.top;
      const time = x / pixelsPerSecond;
      const track = getTrackAtPosition(y);

      if (track) {
        if (track.type === 'subtitle') {
          addSubtitleClip(time, 3, track.index);
        } else if ((track.type === 'video' && (asset.type === 'video' || asset.type === 'image')) ||
                   (track.type === 'audio' && asset.type === 'audio') ||
                   (track.type === 'video' && asset.type === 'audio')) {
          if (track.type === 'audio' && asset.type === 'audio') {
            addClip(asset.id, 'audio', track.index, time);
          } else if (track.type === 'video' && (asset.type === 'video' || asset.type === 'image')) {
            addClip(asset.id, 'video', track.index, time);
          }
        }
      }
    },
    [pixelsPerSecond, addClip, addSubtitleClip]
  );

  const handleTrackDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  useEffect(() => {
    if (!dragState.type) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState.type || !dragState.clipId) return;

      const dx = (e.clientX - dragState.startX) / pixelsPerSecond;
      const dy = e.clientY - dragState.startY;

      if (dragState.type === 'move') {
        let newStartTime = dragState.originalStartTime + dx;
        newStartTime = Math.max(0, newStartTime);

        let newTrackType = dragState.originalTrackType;
        let newTrackIndex = dragState.originalTrackIndex;

        if (scrollRef.current) {
          const rect = scrollRef.current.getBoundingClientRect();
          const y = e.clientY - rect.top;
          const targetTrack = getTrackAtPosition(y);
          if (targetTrack) {
            newTrackType = targetTrack.type;
            newTrackIndex = targetTrack.index;
          }
        }

        if (newTrackType !== dragState.originalTrackType || newTrackIndex !== dragState.originalTrackIndex) {
          moveClipToTrack(dragState.clipId, newTrackType, newTrackIndex);
          dragState.originalTrackType = newTrackType;
          dragState.originalTrackIndex = newTrackIndex;
        }

        updateClip(dragState.clipId, { startTime: newStartTime });
      } else if (dragState.type === 'resize-right') {
        let newDuration = dragState.originalDuration + dx;
        newDuration = Math.max(0.1, newDuration);
        updateClip(dragState.clipId, { duration: newDuration });
      } else if (dragState.type === 'resize-left') {
        let newStartTime = dragState.originalStartTime + dx;
        let newDuration = dragState.originalDuration - dx;
        let newOffset = dragState.originalOffset + dx;

        newStartTime = Math.max(0, newStartTime);
        newDuration = Math.max(0.1, newDuration);
        newOffset = Math.max(0, newOffset);

        updateClip(dragState.clipId, {
          startTime: newStartTime,
          duration: newDuration,
          offset: newOffset,
        });
      }
    };

    const handleMouseUp = () => {
      setDragState({
        type: null,
        clipId: null,
        startX: 0,
        startY: 0,
        originalStartTime: 0,
        originalDuration: 0,
        originalOffset: 0,
        originalTrackType: 'video',
        originalTrackIndex: 0,
        asset: null,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, pixelsPerSecond, updateClip, moveClipToTrack]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!selectedClipId) return;

    switch (e.key) {
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        deleteClip(selectedClipId);
        break;
      case 's':
      case 'S':
        if (e.ctrlKey || e.metaKey) return;
        e.preventDefault();
        splitClip(selectedClipId);
        break;
      case 'd':
      case 'D':
        if (e.ctrlKey || e.metaKey) return;
        e.preventDefault();
        duplicateClip(selectedClipId);
        break;
    }
  };

  const renderTimelineMarkers = () => {
    const markers = [];
    const step = Math.max(1, Math.floor(10 / (pixelsPerSecond / 100)));
    for (let t = 0; t <= project.duration; t += step) {
      markers.push(
        <div
          key={t}
          className="absolute top-0 bottom-0 border-l border-dark-500"
          style={{ left: `${t * pixelsPerSecond}px` }}
        >
          <span className="absolute -top-5 left-1 text-xs text-dark-400">
            {formatTime(t)}
          </span>
        </div>
      );
    }
    return markers;
  };

  const renderClip = (clip: Clip | SubtitleClip, trackConfig: typeof TRACK_CONFIGS[0]) => {
    const asset = project.assets.find((a) => a.id === clip.assetId);
    const isSelected = selectedClipId === clip.id;
    const left = clip.startTime * pixelsPerSecond;
    const width = Math.max(clip.duration * pixelsPerSecond, 4);
    const isSubtitle = 'text' in clip;

    return (
      <div
        key={clip.id}
        className={`absolute top-1 bottom-1 rounded cursor-move flex items-center overflow-hidden transition-shadow ${
          isSelected
            ? 'ring-2 ring-accent-highlight shadow-lg shadow-accent-highlight/20'
            : 'hover:ring-1 hover:ring-accent-primary/50'
        }`}
        style={{
          left: `${left}px`,
          width: `${width}px`,
          backgroundColor: isSubtitle ? '#d97706' : trackConfig.type === 'audio' ? '#059669' : '#4f46e5',
        }}
        onClick={(e) => handleClipClick(e, clip.id)}
        onMouseDown={(e) => handleClipDragStart(e, clip)}
      >
        <div
          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30"
          onMouseDown={(e) => handleClipResizeStart(e, clip, 'left')}
        />

        <div className="flex-1 px-2 min-w-0 flex items-center gap-2">
          {asset?.thumbnail && width > 80 && (
            <img
              src={asset.thumbnail}
              alt=""
              className="h-8 w-12 object-cover rounded flex-shrink-0"
            />
          )}
          <div className="min-w-0 text-xs text-white">
            <div className="font-medium truncate">
              {isSubtitle ? (clip as SubtitleClip).text : asset?.name || 'Clip'}
            </div>
            {width > 100 && (
              <div className="opacity-75">
                {formatTime(clip.duration)}
              </div>
            )}
          </div>
        </div>

        <div
          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30"
          onMouseDown={(e) => handleClipResizeStart(e, clip, 'right')}
        />
      </div>
    );
  };

  const totalTracksHeight = TRACK_CONFIGS.reduce((sum, t) => sum + t.height, 0);

  return (
    <div className="h-80 bg-dark-800 border-t border-dark-500 flex flex-col" onKeyDown={handleKeyDown} tabIndex={0}>
      <div className="h-10 px-4 flex items-center justify-between border-b border-dark-500 bg-dark-700">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-dark-400">缩放:</span>
            <input
              type="range"
              min="10"
              max="200"
              value={timelineScale}
              onChange={(e) => setTimelineScale(parseInt(e.target.value))}
              className="w-32 accent-accent-primary"
            />
            <span className="text-dark-300 w-12">{timelineScale}px/s</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <button
            className={`px-3 py-1 rounded ${
              selectedClipId
                ? 'bg-accent-warning hover:bg-accent-warning/80 text-white'
                : 'bg-dark-600 text-dark-400 cursor-not-allowed'
            }`}
            disabled={!selectedClipId}
            onClick={() => selectedClipId && splitClip(selectedClipId)}
            title="在指针处分割 (S)"
          >
            分割 (S)
          </button>
          <button
            className={`px-3 py-1 rounded ${
              selectedClipId
                ? 'bg-accent-secondary hover:bg-accent-secondary/80 text-white'
                : 'bg-dark-600 text-dark-400 cursor-not-allowed'
            }`}
            disabled={!selectedClipId}
            onClick={() => selectedClipId && duplicateClip(selectedClipId)}
            title="复制片段 (D)"
          >
            复制 (D)
          </button>
          <button
            className={`px-3 py-1 rounded ${
              selectedClipId
                ? 'bg-accent-danger hover:bg-accent-danger/80 text-white'
                : 'bg-dark-600 text-dark-400 cursor-not-allowed'
            }`}
            disabled={!selectedClipId}
            onClick={() => selectedClipId && deleteClip(selectedClipId)}
            title="删除片段 (Delete)"
          >
            删除 (Del)
          </button>
          <button
            className="px-3 py-1 rounded bg-accent-primary hover:bg-accent-primary/80 text-white"
            onClick={() => addSubtitleClip(currentTime, 3, 0)}
            title="在当前时间添加字幕"
          >
            + 字幕
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-28 flex-shrink-0 bg-dark-700 border-r border-dark-500">
          {TRACK_CONFIGS.map((track) => (
            <div
              key={`${track.type}-${track.index}`}
              className="flex items-center px-2 text-xs text-dark-300 border-b border-dark-600"
              style={{ height: `${track.height}px` }}
            >
              {track.name}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-auto">
          <div
            ref={scrollRef}
            className="relative overflow-hidden"
            style={{ width: `${Math.max(totalWidth + 100, 0)}px`, height: `${totalTracksHeight + 30}px` }}
            onDrop={handleTrackDrop}
            onDragOver={handleTrackDragOver}
            onClick={handleTrackClick}
          >
            <div className="absolute top-0 left-0 right-0 h-6 border-b border-dark-600">
              {renderTimelineMarkers()}
            </div>

            {TRACK_CONFIGS.map((track, i) => {
              const clips = getTrackClips(track.type, track.index);
              const top = 30 + TRACK_CONFIGS.slice(0, i).reduce((sum, t) => sum + t.height, 0);

              return (
                <div
                  key={`${track.type}-${track.index}`}
                  className={`absolute left-0 right-0 ${track.color} border-b border-dark-600`}
                  style={{
                    top: `${top}px`,
                    height: `${track.height}px`,
                  }}
                >
                  {clips.map((clip) => renderClip(clip, track))}
                </div>
              );
            })}

            <div
              className="absolute top-0 bottom-0 w-0.5 bg-accent-danger pointer-events-none z-10"
              style={{
                left: `${currentTime * pixelsPerSecond}px`,
                boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
              }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-accent-danger rotate-45" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
