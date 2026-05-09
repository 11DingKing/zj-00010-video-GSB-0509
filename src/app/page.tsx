'use client';

import { useState } from 'react';
import { ProjectProvider, useProject } from '@/lib/context/ProjectContext';
import { MenuBar } from '@/components/MenuBar';
import { MediaLibrary } from '@/components/MediaLibrary';
import { PreviewPlayer } from '@/components/PreviewPlayer';
import { Timeline } from '@/components/Timeline';
import { PropertiesPanel } from '@/components/PropertiesPanel';
import { ExportPanel } from '@/components/ExportPanel';

function EditorContent() {
  const { project } = useProject();
  const [showExport, setShowExport] = useState(false);

  return (
    <div className="h-screen w-screen flex flex-col bg-dark-900 text-dark-100">
      <MenuBar />

      <div className="flex-1 flex overflow-hidden">
        <MediaLibrary />

        <div className="flex-1 flex flex-col min-w-0">
          <PreviewPlayer />
          <Timeline />
        </div>

        <PropertiesPanel />
      </div>

      {project && (
        <button
          className="fixed bottom-6 right-6 w-14 h-14 bg-accent-success hover:bg-accent-success/80 rounded-full shadow-lg flex items-center justify-center text-white text-2xl z-40"
          onClick={() => setShowExport(true)}
          title="导出视频"
        >
          ⬇
        </button>
      )}

      {showExport && project && (
        <ExportPanel onClose={() => setShowExport(false)} />
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <ProjectProvider>
      <EditorContent />
    </ProjectProvider>
  );
}
