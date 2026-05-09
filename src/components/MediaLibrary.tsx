'use client';

import React, { useState, useRef } from 'react';
import { useProject } from '@/lib/context/ProjectContext';
import { formatTime, formatFileSize } from '@/lib/media/metadata';
import type { MediaAsset, TrackType } from '@/types';

interface MediaLibraryProps {
  onDragStart?: (asset: MediaAsset) => void;
}

export function MediaLibrary({ onDragStart }: MediaLibraryProps) {
  const { project, importMediaFiles } = useProject();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      importMediaFiles(Array.from(files));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.type.startsWith('video/') || f.type.startsWith('audio/') || f.type.startsWith('image/')
    );
    if (files.length > 0) {
      importMediaFiles(files);
    }
  };

  const handleDragStart = (e: React.DragEvent, asset: MediaAsset) => {
    e.dataTransfer.setData('application/x-asset', JSON.stringify(asset));
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart?.(asset);
  };

  const getTrackType = (asset: MediaAsset): TrackType => {
    if (asset.type === 'audio') return 'audio';
    return 'video';
  };

  return (
    <div className="w-72 bg-dark-800 border-r border-dark-500 flex flex-col">
      <div className="p-3 border-b border-dark-500 flex items-center justify-between">
        <h2 className="font-semibold text-dark-100">素材库</h2>
        <button
          className="px-3 py-1 bg-accent-primary hover:bg-accent-primary/80 rounded text-sm text-white"
          onClick={() => fileInputRef.current?.click()}
        >
          导入
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/*,audio/*,image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <div
        className={`flex-1 overflow-y-auto p-2 ${dragOver ? 'bg-dark-600' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {!project || project.assets.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-dark-400 text-sm p-8">
              <div className="text-4xl mb-3">📁</div>
              <p>拖拽素材文件到此处</p>
              <p className="mt-1">或点击导入按钮添加</p>
              <p className="mt-1 text-xs">支持 MP4/WebM/图片/音频</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {project.assets.map((asset) => (
              <div
                key={asset.id}
                draggable
                onDragStart={(e) => handleDragStart(e, asset)}
                className="p-2 bg-dark-700 rounded hover:bg-dark-600 cursor-grab active:cursor-grabbing border border-transparent hover:border-accent-primary transition-colors"
              >
                <div className="flex items-start gap-2">
                  <div className="relative flex-shrink-0">
                    <img
                      src={asset.thumbnail}
                      alt={asset.name}
                      className="w-24 h-14 object-cover rounded bg-dark-600"
                    />
                    <div className="absolute bottom-0 right-0 bg-black/70 px-1 text-xs rounded">
                      {formatTime(asset.duration)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-dark-100 truncate">
                      {asset.name}
                    </div>
                    <div className="text-xs text-dark-400 mt-0.5">
                      <span className="capitalize mr-2">
                        {asset.type === 'video' ? '📹 视频' : asset.type === 'audio' ? '🎵 音频' : '🖼️ 图片'}
                      </span>
                      {asset.width && asset.height && (
                        <span className="mr-2">{asset.width}×{asset.height}</span>
                      )}
                    </div>
                    <div className="text-xs text-dark-400">
                      {formatFileSize(asset.size)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
