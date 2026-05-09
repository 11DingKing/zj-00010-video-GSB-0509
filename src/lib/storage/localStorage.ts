import type { Project } from '@/types';

const PROJECTS_KEY = 'video_editor_projects';
const CURRENT_PROJECT_KEY = 'video_editor_current_project';

export function saveProjects(projects: Project[]): void {
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error('Failed to save projects to localStorage:', error);
  }
}

export function loadProjects(): Project[] {
  try {
    const data = localStorage.getItem(PROJECTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load projects from localStorage:', error);
    return [];
  }
}

export function saveProject(project: Project): void {
  const projects = loadProjects();
  const index = projects.findIndex((p) => p.id === project.id);
  if (index >= 0) {
    projects[index] = project;
  } else {
    projects.push(project);
  }
  saveProjects(projects);
  saveCurrentProjectId(project.id);
}

export function loadProject(id: string): Project | null {
  const projects = loadProjects();
  return projects.find((p) => p.id === id) || null;
}

export function deleteProject(id: string): void {
  const projects = loadProjects().filter((p) => p.id !== id);
  saveProjects(projects);
  const current = getCurrentProjectId();
  if (current === id) {
    localStorage.removeItem(CURRENT_PROJECT_KEY);
  }
}

export function saveCurrentProjectId(id: string): void {
  localStorage.setItem(CURRENT_PROJECT_KEY, id);
}

export function getCurrentProjectId(): string | null {
  return localStorage.getItem(CURRENT_PROJECT_KEY);
}

export function clearCurrentProjectId(): void {
  localStorage.removeItem(CURRENT_PROJECT_KEY);
}
