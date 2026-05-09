'use client';

import React from 'react';
import { useProject } from '@/lib/context/ProjectContext';
import { formatTime } from '@/lib/media/metadata';
import type { SubtitleClip } from '@/types';

export function PropertiesPanel() {
  const {
    project,
    selectedClipId,
    updateClip,
    updateSubtitleClip,
    timelineScale,
  } = useProject();

  if (!project) {
    return (
      <div className="w-72 bg-dark-800 border-l border-dark-500 p-4 flex items-center justify-center">
        <p className="text-dark-400 text-sm text-center">
          创建或打开工程后编辑属性
        </p>
      </div>
    );
  }

  const allClips = [...project.clips, ...project.subtitleClips];
  const selectedClip = selectedClipId ? allClips.find((c) => c.id === selectedClipId) : null;
  const isSubtitle = selectedClip && 'text' in selectedClip;
  const isVideo = selectedClip?.trackType === 'video';
  const isAudio = selectedClip?.trackType === 'audio';
  const asset = selectedClip && selectedClip.assetId
    ? project.assets.find((a) => a.id === selectedClip.assetId)
    : null;

  if (!selectedClip) {
    return (
      <div className="w-72 bg-dark-800 border-l border-dark-500 p-4 flex items-center justify-center">
        <p className="text-dark-400 text-sm text-center">
          选择时间线片段编辑属性
        </p>
      </div>
    );
  }

  const SliderInput = ({
    label,
    value,
    min,
    max,
    step = 0.1,
    onChange,
    unit = '',
  }: {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (val: number) => void;
    unit?: string;
  }) => (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-dark-300">{label}</span>
        <span className="text-dark-200">{value.toFixed(step < 1 ? 1 : 0)}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-accent-primary"
      />
    </div>
  );

  return (
    <div className="w-72 bg-dark-800 border-l border-dark-500 flex flex-col">
      <div className="p-3 border-b border-dark-500">
        <h2 className="font-semibold text-dark-100">属性</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-dark-200 border-b border-dark-600 pb-1">
            基本信息
          </h3>
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-dark-400">类型:</span>
              <span className="text-dark-200 capitalize">
                {isSubtitle ? '字幕' : selectedClip.trackType === 'video' ? (asset?.type === 'image' ? '图片' : '视频') : '音频'}
              </span>
            </div>
            {asset && (
              <>
                <div className="flex justify-between">
                  <span className="text-dark-400">素材:</span>
                  <span className="text-dark-200 truncate max-w-32" title={asset.name}>
                    {asset.name}
                  </span>
                </div>
                {asset.width && asset.height && (
                  <div className="flex justify-between">
                    <span className="text-dark-400">分辨率:</span>
                    <span className="text-dark-200">{asset.width}×{asset.height}</span>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between">
              <span className="text-dark-400">轨道:</span>
              <span className="text-dark-200">
                {selectedClip.trackType === 'video' ? `视频 ${selectedClip.trackIndex + 1}` :
                 selectedClip.trackType === 'audio' ? `音频 ${selectedClip.trackIndex + 1}` : '字幕'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-400">起始时间:</span>
              <span className="text-dark-200">{formatTime(selectedClip.startTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-400">时长:</span>
              <span className="text-dark-200">{formatTime(selectedClip.duration)}</span>
            </div>
          </div>
        </div>

        {(isVideo || isAudio) && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-dark-200 border-b border-dark-600 pb-1">
              视频效果
            </h3>
            <SliderInput
              label="不透明度"
              value={selectedClip.effects.opacity}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => updateClip(selectedClip.id, {
                effects: { ...selectedClip.effects, opacity: v },
              })}
            />
            <SliderInput
              label="淡入"
              value={selectedClip.effects.fadeIn}
              min={0}
              max={Math.min(5, selectedClip.duration / 2)}
              step={0.1}
              unit="s"
              onChange={(v) => updateClip(selectedClip.id, {
                effects: { ...selectedClip.effects, fadeIn: v },
              })}
            />
            <SliderInput
              label="淡出"
              value={selectedClip.effects.fadeOut}
              min={0}
              max={Math.min(5, selectedClip.duration / 2)}
              step={0.1}
              unit="s"
              onChange={(v) => updateClip(selectedClip.id, {
                effects: { ...selectedClip.effects, fadeOut: v },
              })}
            />
            {isVideo && (
              <SliderInput
                label="缩放"
                value={selectedClip.effects.scale}
                min={0.1}
                max={3}
                step={0.1}
                onChange={(v) => updateClip(selectedClip.id, {
                  effects: { ...selectedClip.effects, scale: v },
                })}
                unit="x"
              />
            )}
            {isVideo && (
              <SliderInput
                label="位置 X"
                value={selectedClip.effects.positionX}
                min={-project.width}
                max={project.width}
                step={10}
                onChange={(v) => updateClip(selectedClip.id, {
                  effects: { ...selectedClip.effects, positionX: v },
                })}
              />
            )}
            {isVideo && (
              <SliderInput
                label="位置 Y"
                value={selectedClip.effects.positionY}
                min={-project.height}
                max={project.height}
                step={10}
                onChange={(v) => updateClip(selectedClip.id, {
                  effects: { ...selectedClip.effects, positionY: v },
                })}
              />
            )}
            {isVideo && asset?.type === 'video' && (
              <SliderInput
                label="速度"
                value={selectedClip.effects.speed}
                min={0.5}
                max={2}
                step={0.1}
                onChange={(v) => updateClip(selectedClip.id, {
                  effects: { ...selectedClip.effects, speed: v },
                })}
                unit="x"
              />
            )}
          </div>
        )}

        {isAudio && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-dark-200 border-b border-dark-600 pb-1">
              音频效果
            </h3>
            <SliderInput
              label="音量"
              value={selectedClip.effects.volume}
              min={0}
              max={2}
              step={0.05}
              onChange={(v) => updateClip(selectedClip.id, {
                effects: { ...selectedClip.effects, volume: v },
              })}
            />
            <SliderInput
              label="音频淡入"
              value={selectedClip.effects.audioFadeIn}
              min={0}
              max={Math.min(5, selectedClip.duration / 2)}
              step={0.1}
              unit="s"
              onChange={(v) => updateClip(selectedClip.id, {
                effects: { ...selectedClip.effects, audioFadeIn: v },
              })}
            />
            <SliderInput
              label="音频淡出"
              value={selectedClip.effects.audioFadeOut}
              min={0}
              max={Math.min(5, selectedClip.duration / 2)}
              step={0.1}
              unit="s"
              onChange={(v) => updateClip(selectedClip.id, {
                effects: { ...selectedClip.effects, audioFadeOut: v },
              })}
            />
          </div>
        )}

        {isSubtitle && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-dark-200 border-b border-dark-600 pb-1">
              字幕设置
            </h3>
            <div className="mb-3">
              <label className="text-xs text-dark-400 block mb-1">文本</label>
              <input
                type="text"
                value={(selectedClip as SubtitleClip).text}
                onChange={(e) => updateSubtitleClip(selectedClip.id, { text: e.target.value })}
                className="w-full px-2 py-1 bg-dark-600 border border-dark-500 rounded text-sm text-dark-100"
              />
            </div>
            <div className="mb-3">
              <label className="text-xs text-dark-400 block mb-1">字体</label>
              <select
                value={(selectedClip as SubtitleClip).fontFamily}
                onChange={(e) => updateSubtitleClip(selectedClip.id, { fontFamily: e.target.value })}
                className="w-full px-2 py-1 bg-dark-600 border border-dark-500 rounded text-sm text-dark-100"
              >
                <option value="sans-serif">无衬线</option>
                <option value="serif">衬线</option>
                <option value="monospace">等宽</option>
                <option value="Arial">Arial</option>
                <option value="Georgia">Georgia</option>
                <option value="'Times New Roman'">Times New Roman</option>
              </select>
            </div>
            <SliderInput
              label="字号"
              value={(selectedClip as SubtitleClip).fontSize}
              min={12}
              max={120}
              step={2}
              onChange={(v) => updateSubtitleClip(selectedClip.id, { fontSize: v })}
            />
            <div className="mb-3">
              <label className="text-xs text-dark-400 block mb-1">字体颜色</label>
              <input
                type="color"
                value={(selectedClip as SubtitleClip).fontColor}
                onChange={(e) => updateSubtitleClip(selectedClip.id, { fontColor: e.target.value })}
                className="w-full h-8 bg-transparent cursor-pointer"
              />
            </div>
            <div className="mb-3">
              <label className="text-xs text-dark-400 block mb-1">描边颜色</label>
              <input
                type="color"
                value={(selectedClip as SubtitleClip).strokeColor}
                onChange={(e) => updateSubtitleClip(selectedClip.id, { strokeColor: e.target.value })}
                className="w-full h-8 bg-transparent cursor-pointer"
              />
            </div>
            <SliderInput
              label="描边宽度"
              value={(selectedClip as SubtitleClip).strokeWidth}
              min={0}
              max={10}
              step={0.5}
              onChange={(v) => updateSubtitleClip(selectedClip.id, { strokeWidth: v })}
            />
            <SliderInput
              label="位置 X"
              value={(selectedClip as SubtitleClip).positionX}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={(v) => updateSubtitleClip(selectedClip.id, { positionX: v })}
            />
            <SliderInput
              label="位置 Y"
              value={(selectedClip as SubtitleClip).positionY}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={(v) => updateSubtitleClip(selectedClip.id, { positionY: v })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
