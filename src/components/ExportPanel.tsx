'use client';

import React, { useState, useRef } from 'react';
import { useProject } from '@/lib/context/ProjectContext';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export function ExportPanel({ onClose }: { onClose: () => void }) {
  const { project, getAssetUrl } = useProject();
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [demoMode, setDemoMode] = useState(true);

  if (!project) return null;

  const handleExport = async () => {
    setIsExporting(true);
    setProgress(0);
    setMessage('准备 FFmpeg...');

    try {
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      const ffmpeg = new FFmpeg();

      ffmpeg.on('progress', ({ progress: p }) => {
        setProgress(Math.round(p * 100));
      });

      ffmpeg.on('log', ({ message: m }) => {
        console.log(m);
      });

      setMessage('加载 FFmpeg 核心...');
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      const exportDuration = demoMode ? Math.min(30, project.duration) : project.duration;
      setMessage(`准备导出前 ${Math.round(exportDuration)} 秒...`);

      const videoClips = project.clips.filter((c) => c.trackType === 'video');
      
      for (let i = 0; i < videoClips.length; i++) {
        const clip = videoClips[i];
        const asset = project.assets.find((a) => a.id === clip.assetId);
        if (!asset) continue;

        setMessage(`处理素材 ${i + 1}/${videoClips.length}: ${asset.name}`);

        const url = await getAssetUrl(clip.assetId);
        if (!url) continue;

        const response = await fetch(url);
        const data = await response.arrayBuffer();
        const ext = asset.fileType.split('/')[1] || 'mp4';
        await ffmpeg.writeFile(`input_${i}.${ext}`, new Uint8Array(data));
      }

      if (videoClips.length > 0) {
        const firstClip = videoClips[0];
        const asset = project.assets.find((a) => a.id === firstClip.assetId);
        const ext = asset?.fileType.split('/')[1] || 'mp4';

        setMessage('正在合成视频...');
        await ffmpeg.exec([
          '-i', `input_0.${ext}`,
          '-t', exportDuration.toString(),
          '-vf', `scale=${project.width}:${project.height}`,
          '-r', project.fps.toString(),
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-crf', '23',
          'output.mp4',
        ]);

        setMessage('导出完成，准备下载...');
        const data = await ffmpeg.readFile('output.mp4');
        const blob = new Blob([data], { type: 'video/mp4' });
        const downloadUrl = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `${project.name}_export.mp4`;
        a.click();
        URL.revokeObjectURL(downloadUrl);

        setMessage('导出成功！');
      } else {
        setMessage('没有视频片段可导出');
      }

      await ffmpeg.terminate();
    } catch (error) {
      console.error('Export failed:', error);
      setMessage(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
      
      const canvas = document.createElement('canvas');
      canvas.width = project.width;
      canvas.height = project.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#12121a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Video Editor Demo', canvas.width / 2, canvas.height / 2 - 50);
        ctx.font = '24px sans-serif';
        ctx.fillStyle = '#8b5cf6';
        ctx.fillText(`Project: ${project.name}`, canvas.width / 2, canvas.height / 2 + 10);
        ctx.fillStyle = '#8a8a97';
        ctx.font = '18px sans-serif';
        ctx.fillText(`Duration: ${project.duration.toFixed(2)}s | ${project.width}x${project.height}@${project.fps}fps`, canvas.width / 2, canvas.height / 2 + 60);

        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${project.name}_preview.png`;
            a.click();
            URL.revokeObjectURL(url);
          }
        });
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-dark-700 rounded-lg shadow-xl w-96 p-6 border border-dark-500">
        <h3 className="text-lg font-semibold mb-4 text-dark-100">导出视频</h3>

        <div className="space-y-4">
          <div className="text-sm text-dark-300 space-y-1">
            <div className="flex justify-between">
              <span>分辨率:</span>
              <span>{project.width} × {project.height}</span>
            </div>
            <div className="flex justify-between">
              <span>帧率:</span>
              <span>{project.fps} FPS</span>
            </div>
            <div className="flex justify-between">
              <span>总时长:</span>
              <span>{project.duration.toFixed(2)} 秒</span>
            </div>
            <div className="flex justify-between">
              <span>片段数:</span>
              <span>{project.clips.length} 个视频/音频 + {project.subtitleClips.length} 个字幕</span>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-dark-300">
            <input
              type="checkbox"
              checked={demoMode}
              onChange={(e) => setDemoMode(e.target.checked)}
              className="accent-accent-primary"
            />
            仅导出前 30 秒（Demo 模式，性能考虑）
          </label>

          {isExporting && (
            <div className="space-y-2">
              <div className="h-2 bg-dark-600 rounded overflow-hidden">
                <div
                  className="h-full bg-accent-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-dark-400 text-center">{message}</p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              className="px-4 py-2 bg-dark-600 hover:bg-dark-500 rounded disabled:opacity-50"
              onClick={onClose}
              disabled={isExporting}
            >
              关闭
            </button>
            <button
              className="px-4 py-2 bg-accent-success hover:bg-accent-success/80 rounded text-white disabled:opacity-50"
              onClick={handleExport}
              disabled={isExporting || project.clips.length === 0}
            >
              {isExporting ? '导出中...' : '开始导出'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
