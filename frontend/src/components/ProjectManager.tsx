import { useState, useEffect } from 'react';
import {
  Project,
  ProjectCreate,
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
} from '../api/client';

interface ProjectManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectsChange?: () => void;
}

const PROJECT_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
];

export function ProjectManager({ isOpen, onClose, onProjectsChange }: ProjectManagerProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<ProjectCreate>({
    name: '',
    description: '',
    color: PROJECT_COLORS[0],
    icon: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen, showArchived]);

  const loadProjects = async () => {
    try {
      const data = await fetchProjects(showArchived);
      setProjects(data);
    } catch (err) {
      setError('Failed to load projects');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      if (editingProject) {
        await updateProject(editingProject.id, formData);
      } else {
        await createProject(formData);
      }
      await loadProjects();
      onProjectsChange?.();
      resetForm();
    } catch (err) {
      setError(editingProject ? 'Failed to update project' : 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      color: project.color || PROJECT_COLORS[0],
      icon: project.icon || '',
    });
    setIsCreating(true);
  };

  const handleDelete = async (project: Project) => {
    if (!confirm(`Delete "${project.name}"? Generations in this project will be unassigned.`)) {
      return;
    }

    try {
      await deleteProject(project.id);
      await loadProjects();
      onProjectsChange?.();
    } catch (err) {
      setError('Failed to delete project');
    }
  };

  const handleArchive = async (project: Project) => {
    try {
      await updateProject(project.id, { is_archived: !project.is_archived });
      await loadProjects();
      onProjectsChange?.();
    } catch (err) {
      setError('Failed to archive project');
    }
  };

  const resetForm = () => {
    setEditingProject(null);
    setIsCreating(false);
    setFormData({
      name: '',
      description: '',
      color: PROJECT_COLORS[0],
      icon: '',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75"
          onClick={onClose}
        />

        <div className="inline-block w-full max-w-2xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 rounded-xl shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Projects
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Organize your generations by campaign or client
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Create/Edit Form */}
            {isCreating ? (
              <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {editingProject ? 'Edit Project' : 'New Project'}
                </h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Project name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    autoFocus
                  />
                  <textarea
                    placeholder="Description (optional)"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                  />
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">
                      Color
                    </label>
                    <div className="flex gap-2">
                      {PROJECT_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setFormData({ ...formData, color })}
                          className={`w-8 h-8 rounded-full transition-transform ${
                            formData.color === color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={loading || !formData.name.trim()}
                      className="flex-1 py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Saving...' : editingProject ? 'Update' : 'Create'}
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full mb-4 py-3 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-colors"
              >
                + Create New Project
              </button>
            )}

            {/* Show archived toggle */}
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="showArchived"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="showArchived" className="text-sm text-gray-600 dark:text-gray-400">
                Show archived projects
              </label>
            </div>

            {/* Project List */}
            <div className="space-y-2">
              {projects.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No projects yet. Create one to organize your generations.
                </p>
              ) : (
                projects.map((project) => (
                  <div
                    key={project.id}
                    className={`p-4 border rounded-lg transition-colors ${
                      project.is_archived
                        ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 opacity-60'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-4 h-4 rounded-full mt-1 flex-shrink-0"
                        style={{ backgroundColor: project.color || PROJECT_COLORS[0] }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900 dark:text-white truncate">
                            {project.name}
                          </h3>
                          {project.is_archived && (
                            <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                              Archived
                            </span>
                          )}
                        </div>
                        {project.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {project.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {project.generation_count || 0} generations
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(project)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleArchive(project)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          title={project.is_archived ? 'Unarchive' : 'Archive'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(project)}
                          className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <button
              onClick={onClose}
              className="py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
