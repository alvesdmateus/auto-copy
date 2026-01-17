import { useState, useEffect } from 'react';
import {
  Comment,
  fetchComments,
  createComment,
  updateComment,
  deleteComment,
} from '../api/client';

interface CommentsPanelProps {
  generationId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function CommentsPanel({ generationId, isOpen, onClose }: CommentsPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && generationId) {
      loadComments();
    }
  }, [isOpen, generationId]);

  const loadComments = async () => {
    try {
      const data = await fetchComments(generationId);
      setComments(data);
    } catch (err) {
      setError('Failed to load comments');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await createComment(generationId, {
        content: newComment.trim(),
        author_name: authorName.trim() || undefined,
      });
      await loadComments();
      setNewComment('');
    } catch (err) {
      setError('Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (commentId: number) => {
    if (!editContent.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await updateComment(commentId, editContent.trim());
      await loadComments();
      setEditingId(null);
      setEditContent('');
    } catch (err) {
      setError('Failed to update comment');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    if (!confirm('Delete this comment?')) return;

    try {
      await deleteComment(commentId);
      await loadComments();
    } catch (err) {
      setError('Failed to delete comment');
    }
  };

  const startEditing = (comment: Comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
                Comments
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {comments.length} comment{comments.length !== 1 ? 's' : ''}
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
          <div className="px-6 py-4 max-h-[50vh] overflow-y-auto">
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Comments List */}
            <div className="space-y-4 mb-4">
              {comments.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                  No comments yet. Be the first to add one!
                </p>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    {editingId === comment.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none text-sm"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdate(comment.id)}
                            disabled={loading || !editContent.trim()}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {comment.author_name || 'Anonymous'}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatDate(comment.created_at)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEditing(comment)}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              title="Edit"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(comment.id)}
                              className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                              title="Delete"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Add Comment Form */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Your name (optional)"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={2}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none text-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={loading || !newComment.trim()}
                  className="py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Adding...' : 'Add Comment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
