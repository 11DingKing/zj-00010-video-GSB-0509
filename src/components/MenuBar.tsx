'use client';

import React, { useState, useRef } from 'react';
import { useProject } from '@/lib/context/ProjectContext';

export function MenuBar() {
  const {
    project,
    isModified,
    projects,
    newProject,
    openProject,
    saveCurrentProject,
    deleteProject,
    importMediaFiles,
    exportProjectJson,
    importProjectJson,
  } = useProject();

  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showOpenProjectModal, setShowOpenProjectModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectFileInputRef = useRef<HTMLInputElement>(null);

  const handleNewProject = () => {
    if (newProjectName.trim()) {
      newProject(newProjectName.trim());
      setShowNewProjectModal(false);
      setNewProjectName('');
    }
  };

  const handleMediaImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      importMediaFiles(Array.from(files));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportJson = () => {
    if (!project) return;
    const json = exportProjectJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = event.target?.result as string;
          importProjectJson(json);
        } catch (err) {
          alert('无效的工程文件');
        }
      };
      reader.readAsText(file);
    }
    if (projectFileInputRef.current) projectFileInputRef.current.value = '';
  };

  return (
    <>
      <div className="h-10 bg-dark-700 border-b border-dark-500 flex items-center px-4 text-sm">
        <div className="relative">
          <button
            className={`px-3 py-1.5 rounded hover:bg-dark-500 flex items-center gap-1 ${
              showProjectMenu ? 'bg-dark-500' : ''
            }`}
            onClick={() => setShowProjectMenu(!showProjectMenu)}
          >
            工程
            <span className="text-xs">▼</span>
          </button>
          {showProjectMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowProjectMenu(false)} />
              <div className="absolute top-full left-0 mt-1 w-48 bg-dark-600 border border-dark-500 rounded shadow-lg z-20 py-1">
                <button
                  className="w-full text-left px-4 py-2 hover:bg-dark-500 text-left"
                  onClick={() => {
                    setShowProjectMenu(false);
                    setShowNewProjectModal(true);
                  }}
                >
                  新建工程
                </button>
                <button
                  className="w-full text-left px-4 py-2 hover:bg-dark-500 text-left"
                  onClick={() => {
                    setShowProjectMenu(false);
                    setShowOpenProjectModal(true);
                  }}
                >
                  打开工程
                </button>
                <button
                  className="w-full text-left px-4 py-2 hover:bg-dark-500 text-left disabled:opacity-50"
                  disabled={!project}
                  onClick={() => {
                    saveCurrentProject();
                    setShowProjectMenu(false);
                  }}
                >
                  保存工程 {isModified ? '*' : ''}
                </button>
                <div className="border-t border-dark-500 my-1" />
                <button
                  className="w-full text-left px-4 py-2 hover:bg-dark-500 text-left disabled:opacity-50"
                  disabled={!project}
                  onClick={() => {
                    setShowProjectMenu(false);
                    setShowExportModal(true);
                  }}
                >
                  导出工程...
                </button>
                <button
                  className="w-full text-left px-4 py-2 hover:bg-dark-500 text-left"
                  onClick={() => {
                    projectFileInputRef.current?.click();
                    setShowProjectMenu(false);
                  }}
                >
                  导入工程...
                </button>
                <div className="border-t border-dark-500 my-1" />
                <button
                  className="w-full text-left px-4 py-2 hover:bg-dark-500 text-left disabled:opacity-50"
                  disabled={!project}
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowProjectMenu(false);
                  }}
                >
                  导入素材...
                </button>
              </div>
            </>
          )}
        </div>

        {project && (
          <div className="ml-4 text-dark-300">
            <span className="text-dark-400">当前工程：</span>
            <span className="text-dark-100">{project.name}</span>
            {isModified && <span className="text-accent-warning ml-1">*</span>}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/*,audio/*,image/*"
          className="hidden"
          onChange={handleMediaImport}
        />
        <input
          ref={projectFileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImportJson}
        />
      </div>

      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-dark-700 rounded-lg shadow-xl w-96 p-6 border border-dark-500">
            <h3 className="text-lg font-semibold mb-4 text-dark-100">新建工程</h3>
            <input
              type="text"
              placeholder="工程名称"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="w-full px-3 py-2 bg-dark-600 border border-dark-500 rounded text-dark-100 placeholder-dark-400 focus:outline-none focus:border-accent-primary"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleNewProject()}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-4 py-2 bg-dark-600 hover:bg-dark-500 rounded"
                onClick={() => setShowNewProjectModal(false)}
              >
                取消
              </button>
              <button
                className="px-4 py-2 bg-accent-primary hover:bg-accent-primary/80 rounded text-white"
                onClick={handleNewProject}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {showOpenProjectModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-dark-700 rounded-lg shadow-xl w-96 p-6 border border-dark-500">
            <h3 className="text-lg font-semibold mb-4 text-dark-100">打开工程</h3>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {projects.length === 0 ? (
                <p className="text-dark-400 text-center py-8">暂无工程</p>
              ) : (
                projects
                  .sort((a, b) => b.updatedAt - a.updatedAt)
                  .map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 bg-dark-600 rounded hover:bg-dark-500 cursor-pointer"
                      onClick={() => {
                        openProject(p.id);
                        setShowOpenProjectModal(false);
                      }}
                    >
                      <div>
                        <div className="text-dark-100 font-medium">{p.name}</div>
                        <div className="text-xs text-dark-400">
                          {new Date(p.updatedAt).toLocaleString('zh-CN')}
                        </div>
                      </div>
                      <button
                        className="px-2 py-1 text-xs bg-accent-danger hover:bg-accent-danger/80 rounded text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`确定删除工程 "${p.name}"？`)) {
                            deleteProject(p.id);
                          }
                        }}
                      >
                        删除
                      </button>
                    </div>
                  ))
              )}
            </div>
            <div className="flex justify-end mt-4">
              <button
                className="px-4 py-2 bg-dark-600 hover:bg-dark-500 rounded"
                onClick={() => setShowOpenProjectModal(false)}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-dark-700 rounded-lg shadow-xl w-96 p-6 border border-dark-500">
            <h3 className="text-lg font-semibold mb-4 text-dark-100">导出工程</h3>
            <div className="space-y-3">
              <button
                className="w-full p-3 bg-dark-600 hover:bg-dark-500 rounded text-left"
                onClick={handleExportJson}
              >
                <div className="font-medium text-dark-100">导出为 JSON</div>
                <div className="text-sm text-dark-400">
                  包含所有工程数据，可随时导入恢复
                </div>
              </button>
            </div>
            <div className="flex justify-end mt-4">
              <button
                className="px-4 py-2 bg-dark-600 hover:bg-dark-500 rounded"
                onClick={() => setShowExportModal(false)}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
