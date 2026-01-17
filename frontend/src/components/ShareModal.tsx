import { useState, useEffect } from 'react';
import {
  ShareLink,
  fetchShareLinks,
  createShareLink,
  updateShareLink,
  deleteShareLink,
} from '../api/client';

interface ShareModalProps {
  generationId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareModal({ generationId, isOpen, onClose }: ShareModalProps) {
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [allowComments, setAllowComments] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && generationId) {
      loadShareLinks();
    }
  }, [isOpen, generationId]);

  const loadShareLinks = async () => {
    try {
      const data = await fetchShareLinks(generationId);
      setShareLinks(data);
    } catch (err) {
      setError('Failed to load share links');
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    setError(null);

    try {
      await createShareLink(generationId, {
        title: title.trim() || undefined,
        allow_comments: allowComments,
        expires_in_days: expiresInDays,
      });
      await loadShareLinks();
      resetForm();
    } catch (err) {
      setError('Failed to create share link');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (share: ShareLink) => {
    try {
      await updateShareLink(share.id, { is_active: !share.is_active });
      await loadShareLinks();
    } catch (err) {
      setError('Failed to update share link');
    }
  };

  const handleDelete = async (shareId: number) => {
    if (!confirm('Delete this share link? Anyone with the link will no longer be able to access it.')) {
      return;
    }

    try {
      await deleteShareLink(shareId);
      await loadShareLinks();
    } catch (err) {
      setError('Failed to delete share link');
    }
  };

  const copyToClipboard = async (share: ShareLink) => {
    const url = `${window.location.origin}/share/${share.token}`;
    await navigator.clipboard.writeText(url);
    setCopied(share.id);
    setTimeout(() => setCopied(null), 2000);
  };

  const resetForm = () => {
    setIsCreating(false);
    setTitle('');
    setAllowComments(false);
    setExpiresInDays(undefined);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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

        <div className="inline-block w-full max-w-lg my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 rounded-xl shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Share
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Create shareable links for this generation
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

            {/* Create Form */}
            {isCreating ? (
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  New Share Link
                </h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Title (optional)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="allowComments"
                      checked={allowComments}
                      onChange={(e) => setAllowComments(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="allowComments" className="text-sm text-gray-700 dark:text-gray-300">
                      Allow comments
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                      Expires in
                    </label>
                    <select
                      value={expiresInDays || ''}
                      onChange={(e) => setExpiresInDays(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">Never expires</option>
                      <option value="1">1 day</option>
                      <option value="7">7 days</option>
                      <option value="30">30 days</option>
                      <option value="90">90 days</option>
                      <option value="365">1 year</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreate}
                      disabled={loading}
                      className="flex-1 py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Creating...' : 'Create Link'}
                    </button>
                    <button
                      onClick={resetForm}
                      className="py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full mb-4 py-3 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-colors"
              >
                + Create Share Link
              </button>
            )}

            {/* Share Links List */}
            <div className="space-y-3">
              {shareLinks.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                  No share links yet. Create one to share this generation.
                </p>
              ) : (
                shareLinks.map((share) => (
                  <div
                    key={share.id}
                    className={`p-4 border rounded-lg ${
                      share.is_active
                        ? 'border-gray-200 dark:border-gray-700'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900 dark:text-white truncate">
                            {share.title || 'Untitled Share'}
                          </h4>
                          {!share.is_active && (
                            <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                          <span>{share.view_count} views</span>
                          {share.allow_comments && <span>Comments on</span>}
                          {share.expires_at && (
                            <span>Expires {formatDate(share.expires_at)}</span>
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <code className="flex-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300 truncate">
                            {window.location.origin}/share/{share.token}
                          </code>
                          <button
                            onClick={() => copyToClipboard(share)}
                            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                              copied === share.id
                                ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                                : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800'
                            }`}
                          >
                            {copied === share.id ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleActive(share)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          title={share.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {share.is_active ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(share.id)}
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
