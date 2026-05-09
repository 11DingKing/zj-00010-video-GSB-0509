'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Project, MediaAsset, Clip, SubtitleClip, VideoEffects, TrackType } from '@/types';
import { saveProject, loadProject, getCurrentProjectId, clearCurrentProjectId, loadProjects, deleteProject as deleteProjectFromStorage } from '@/lib/storage/localStorage';
import { saveBlob, getBlobURL, revokeBlobURL, deleteBlob } from '@/lib/storage/indexedDB';
import { getMediaTypeFromFile, extractVideoMetadata, extractAudioMetadata, extractImageMetadata } from '@/lib/media/metadata';

interface ProjectContextType {
  project: Project | null;
  currentTime: number;
  isPlaying: boolean;
  timelineScale: number;
  selectedClipId: string | null;
  isModified: boolean;
  projects: Project[];
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setTimelineScale: (scale: number) => void;
  setSelectedClipId: (id: string | null) => void;
  newProject: (name: string) => void;
  openProject: (id: string) => void;
  saveCurrentProject: () => void;
  deleteProject: (id: string) => void;
  importMediaFiles: (files: File[]) => Promise<void>;
  addClip: (assetId: string, trackType: TrackType, trackIndex: number, startTime: number, duration?: number, offset?: number) => void;
  addSubtitleClip: (startTime: number, duration: number, trackIndex: number) => void;
  updateClip: (id: string, updates: Partial<Clip>) => void;
  updateSubtitleClip: (id: string, updates: Partial<SubtitleClip>) => void;
  splitClip: (id: string) => void;
  deleteClip: (id: string) => void;
  duplicateClip: (id: string) => void;
  moveClipToTrack: (id: string, newTrackType: TrackType, newTrackIndex: number) => void;
  getAssetUrl: (assetId: string) => Promise<string | null>;
  exportProjectJson: () => string;
  importProjectJson: (json: string) => void;
  refreshProjects: () => void;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

const DEFAULT_EFFECTS: VideoEffects = {
  fadeIn: 0,
  fadeOut: 0,
  opacity: 1,
  scale: 1,
  positionX: 0,
  positionY: 0,
  speed: 1,
  volume: 1,
  volumeCurve: [],
  audioFadeIn: 0,
  audioFadeOut: 0,
};

function createEmptyProject(name: string): Project {
  const now = Date.now();
  return {
    id: uuidv4(),
    name,
    createdAt: now,
    updatedAt: now,
    assets: [],
    clips: [],
    subtitleClips: [],
    duration: 60,
    width: 1920,
    height: 1080,
    fps: 30,
  };
}

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [project, setProject] = useState<Project | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timelineScale, setTimelineScale] = useState(50);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [isModified, setIsModified] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const lastSaveRef = useRef(Date.now());
  const assetUrlCacheRef = useRef<Map<string, string>>(new Map());

  const refreshProjects = useCallback(() => {
    setProjects(loadProjects());
  }, []);

  useEffect(() => {
    refreshProjects();
    const currentId = getCurrentProjectId();
    if (currentId) {
      const proj = loadProject(currentId);
      if (proj) {
        setProject(proj);
      }
    }
  }, [refreshProjects]);

  useEffect(() => {
    if (!project || !isModified) return;
    
    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastSaveRef.current > 10000) {
        saveCurrentProject();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [project, isModified]);

  const newProject = useCallback((name: string) => {
    assetUrlCacheRef.current.forEach((url) => revokeBlobURL(url));
    assetUrlCacheRef.current.clear();
    
    const newProj = createEmptyProject(name);
    setProject(newProj);
    setCurrentTime(0);
    setIsPlaying(false);
    setSelectedClipId(null);
    setIsModified(true);
    saveProject(newProj);
    refreshProjects();
  }, [refreshProjects]);

  const openProject = useCallback((id: string) => {
    assetUrlCacheRef.current.forEach((url) => revokeBlobURL(url));
    assetUrlCacheRef.current.clear();
    
    const proj = loadProject(id);
    if (proj) {
      setProject(proj);
      setCurrentTime(0);
      setIsPlaying(false);
      setSelectedClipId(null);
      setIsModified(false);
    }
  }, []);

  const saveCurrentProject = useCallback(() => {
    if (!project) return;
    const updated = { ...project, updatedAt: Date.now() };
    saveProject(updated);
    setProject(updated);
    setIsModified(false);
    lastSaveRef.current = Date.now();
    refreshProjects();
  }, [project, refreshProjects]);

  const deleteProject = useCallback((id: string) => {
    const proj = loadProject(id);
    if (proj) {
      proj.assets.forEach((asset) => {
        const cachedUrl = assetUrlCacheRef.current.get(asset.id);
        if (cachedUrl) {
          revokeBlobURL(cachedUrl);
          assetUrlCacheRef.current.delete(asset.id);
        }
        deleteBlob(asset.blobId);
      });
    }
    deleteProjectFromStorage(id);
    if (project?.id === id) {
      setProject(null);
      clearCurrentProjectId();
    }
    refreshProjects();
  }, [project, refreshProjects]);

  const importMediaFiles = useCallback(async (files: File[]) => {
    if (!project) return;

    const newAssets: MediaAsset[] = [];

    for (const file of files) {
      try {
        const type = getMediaTypeFromFile(file);
        const blobId = uuidv4();
        await saveBlob(blobId, file);

        let metadata: any = { duration: 5, thumbnail: '' };

        try {
          if (type === 'video') {
            metadata = await extractVideoMetadata(file);
          } else if (type === 'audio') {
            metadata = await extractAudioMetadata(file);
          } else if (type === 'image') {
            metadata = await extractImageMetadata(file);
          }
        } catch (e) {
          console.warn('Failed to extract metadata, using defaults', e);
          const canvas = document.createElement('canvas');
          canvas.width = 160;
          canvas.height = 90;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#3a3a47';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#8b5cf6';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(type.toUpperCase(), canvas.width / 2, canvas.height / 2);
          }
          metadata = {
            duration: type === 'image' ? 5 : 30,
            thumbnail: canvas.toDataURL('image/jpeg', 0.7),
          };
        }

        const asset: MediaAsset = {
          id: uuidv4(),
          name: file.name,
          type,
          fileType: file.type || file.name.split('.').pop() || '',
          size: file.size,
          duration: metadata.duration,
          width: metadata.width,
          height: metadata.height,
          thumbnail: metadata.thumbnail,
          blobId,
          createdAt: Date.now(),
        };

        newAssets.push(asset);
      } catch (error) {
        console.error('Failed to import file:', file.name, error);
      }
    }

    if (newAssets.length > 0) {
      setProject((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          assets: [...prev.assets, ...newAssets],
        };
      });
      setIsModified(true);
    }
  }, [project]);

  const addClip = useCallback((
    assetId: string,
    trackType: TrackType,
    trackIndex: number,
    startTime: number,
    duration?: number,
    offset?: number
  ) => {
    setProject((prev) => {
      if (!prev) return null;
      const asset = prev.assets.find((a) => a.id === assetId);
      if (!asset) return prev;

      const clip: Clip = {
        id: uuidv4(),
        assetId,
        trackType,
        trackIndex,
        startTime,
        duration: duration ?? asset.duration,
        offset: offset ?? 0,
        effects: { ...DEFAULT_EFFECTS },
      };

      let newDuration = prev.duration;
      const endTime = startTime + clip.duration;
      if (endTime > newDuration) {
        newDuration = Math.ceil(endTime) + 10;
      }

      return {
        ...prev,
        clips: [...prev.clips, clip],
        duration: newDuration,
      };
    });
    setIsModified(true);
  }, []);

  const addSubtitleClip = useCallback((startTime: number, duration: number, trackIndex: number) => {
    setProject((prev) => {
      if (!prev) return null;

      const clip: SubtitleClip = {
        id: uuidv4(),
        assetId: '',
        trackType: 'subtitle',
        trackIndex,
        startTime,
        duration,
        offset: 0,
        effects: { ...DEFAULT_EFFECTS },
        text: '字幕文本',
        fontFamily: 'sans-serif',
        fontSize: 48,
        fontColor: '#ffffff',
        strokeColor: '#000000',
        strokeWidth: 2,
        positionX: 50,
        positionY: 85,
      };

      let newDuration = prev.duration;
      const endTime = startTime + duration;
      if (endTime > newDuration) {
        newDuration = Math.ceil(endTime) + 10;
      }

      return {
        ...prev,
        subtitleClips: [...prev.subtitleClips, clip],
        duration: newDuration,
      };
    });
    setIsModified(true);
  }, []);

  const updateClip = useCallback((id: string, updates: Partial<Clip>) => {
    setProject((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        clips: prev.clips.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        subtitleClips: prev.subtitleClips.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      };
    });
    setIsModified(true);
  }, []);

  const updateSubtitleClip = useCallback((id: string, updates: Partial<SubtitleClip>) => {
    setProject((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        subtitleClips: prev.subtitleClips.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      };
    });
    setIsModified(true);
  }, []);

  const splitClip = useCallback((id: string) => {
    setProject((prev) => {
      if (!prev) return null;
      const clipIndex = prev.clips.findIndex((c) => c.id === id);
      const clip = clipIndex >= 0 ? prev.clips[clipIndex] : null;
      if (!clip) return prev;

      const splitPos = currentTime - clip.startTime;
      if (splitPos <= 0 || splitPos >= clip.duration) return prev;

      const firstClip: Clip = {
        ...clip,
        duration: splitPos,
      };

      const secondClip: Clip = {
        ...clip,
        id: uuidv4(),
        startTime: clip.startTime + splitPos,
        duration: clip.duration - splitPos,
        offset: clip.offset + splitPos,
      };

      const newClips = [...prev.clips];
      newClips.splice(clipIndex, 1, firstClip, secondClip);

      return { ...prev, clips: newClips };
    });
    setIsModified(true);
  }, [currentTime]);

  const deleteClip = useCallback((id: string) => {
    setProject((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        clips: prev.clips.filter((c) => c.id !== id),
        subtitleClips: prev.subtitleClips.filter((c) => c.id !== id),
      };
    });
    if (selectedClipId === id) {
      setSelectedClipId(null);
    }
    setIsModified(true);
  }, [selectedClipId]);

  const duplicateClip = useCallback((id: string) => {
    setProject((prev) => {
      if (!prev) return null;
      const clip = prev.clips.find((c) => c.id === id);
      const subClip = prev.subtitleClips.find((c) => c.id === id);
      
      if (clip) {
        const newClip: Clip = {
          ...clip,
          id: uuidv4(),
          startTime: clip.startTime + clip.duration + 0.5,
        };
        return { ...prev, clips: [...prev.clips, newClip] };
      }
      
      if (subClip) {
        const newClip: SubtitleClip = {
          ...subClip,
          id: uuidv4(),
          startTime: subClip.startTime + subClip.duration + 0.5,
        };
        return { ...prev, subtitleClips: [...prev.subtitleClips, newClip] };
      }
      
      return prev;
    });
    setIsModified(true);
  }, []);

  const moveClipToTrack = useCallback((id: string, newTrackType: TrackType, newTrackIndex: number) => {
    setProject((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        clips: prev.clips.map((c) =>
          c.id === id ? { ...c, trackType: newTrackType, trackIndex: newTrackIndex } : c
        ),
        subtitleClips: prev.subtitleClips.map((c) =>
          c.id === id ? { ...c, trackType: newTrackType, trackIndex: newTrackIndex } : c
        ),
      };
    });
    setIsModified(true);
  }, []);

  const getAssetUrl = useCallback(async (assetId: string): Promise<string | null> => {
    const cached = assetUrlCacheRef.current.get(assetId);
    if (cached) return cached;

    if (!project) return null;
    const asset = project.assets.find((a) => a.id === assetId);
    if (!asset) return null;

    const url = await getBlobURL(asset.blobId);
    if (url) {
      assetUrlCacheRef.current.set(assetId, url);
    }
    return url;
  }, [project]);

  const exportProjectJson = useCallback((): string => {
    if (!project) return '';
    return JSON.stringify(project, null, 2);
  }, [project]);

  const importProjectJson = useCallback((json: string) => {
    try {
      const proj = JSON.parse(json) as Project;
      assetUrlCacheRef.current.forEach((url) => revokeBlobURL(url));
      assetUrlCacheRef.current.clear();
      setProject(proj);
      saveProject(proj);
      setIsModified(false);
      setCurrentTime(0);
      setIsPlaying(false);
      setSelectedClipId(null);
      refreshProjects();
    } catch (e) {
      console.error('Failed to import project JSON:', e);
      throw e;
    }
  }, [refreshProjects]);

  return (
    <ProjectContext.Provider
      value={{
        project,
        currentTime,
        isPlaying,
        timelineScale,
        selectedClipId,
        isModified,
        projects,
        setCurrentTime,
        setIsPlaying,
        setTimelineScale,
        setSelectedClipId,
        newProject,
        openProject,
        saveCurrentProject,
        deleteProject,
        importMediaFiles,
        addClip,
        addSubtitleClip,
        updateClip,
        updateSubtitleClip,
        splitClip,
        deleteClip,
        duplicateClip,
        moveClipToTrack,
        getAssetUrl,
        exportProjectJson,
        importProjectJson,
        refreshProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
