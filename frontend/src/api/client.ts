const API_BASE = '/api';

export interface Template {
  id: number;
  name: string;
  platform: string;
  prompt_template: string;
  is_custom: boolean;
  created_at: string;
}

export interface GenerationHistory {
  id: number;
  prompt: string;
  template_id: number | null;
  tone: string | null;
  output: string;
  is_favorite: boolean;
  created_at: string;
}

export interface GenerateRequest {
  prompt: string;
  template_id?: number | null;
  tone?: string | null;
}

export interface VariationsRequest extends GenerateRequest {
  count?: number;
}

export type RefineAction = 'improve' | 'shorten' | 'lengthen' | 'punchier' | 'formal' | 'casual';

export interface RefineRequest {
  text: string;
  action: RefineAction;
  template_id?: number | null;
  tone?: string | null;
}

export interface StreamChunk {
  chunk?: string;
  done?: boolean;
  id?: number;
  error?: string;
  variation?: number;
  variation_start?: number;
  variation_done?: number;
  count?: number;
}

// Platform character limits
export const PLATFORM_LIMITS: Record<string, { chars: number; label: string }> = {
  instagram: { chars: 2200, label: 'Instagram' },
  twitter: { chars: 280, label: 'Twitter/X' },
  linkedin: { chars: 3000, label: 'LinkedIn' },
  facebook: { chars: 63206, label: 'Facebook' },
  tiktok: { chars: 2200, label: 'TikTok' },
  youtube: { chars: 5000, label: 'YouTube' },
  email_subject: { chars: 50, label: 'Email Subject' },
};

async function* streamResponse(
  response: Response
): AsyncGenerator<StreamChunk> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        yield data;
      }
    }
  }
}

export async function fetchTemplates(): Promise<Template[]> {
  const response = await fetch(`${API_BASE}/templates`);
  if (!response.ok) throw new Error('Failed to fetch templates');
  return response.json();
}

export async function createTemplate(template: {
  name: string;
  platform: string;
  prompt_template: string;
}): Promise<Template> {
  const response = await fetch(`${API_BASE}/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(template),
  });
  if (!response.ok) throw new Error('Failed to create template');
  return response.json();
}

export async function deleteTemplate(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/templates/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete template');
}

export async function* generateCopyStream(
  request: GenerateRequest
): AsyncGenerator<StreamChunk> {
  const response = await fetch(`${API_BASE}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Failed to generate copy');
  }

  yield* streamResponse(response);
}

export async function* generateVariationsStream(
  request: VariationsRequest
): AsyncGenerator<StreamChunk> {
  const response = await fetch(`${API_BASE}/generate/variations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Failed to generate variations');
  }

  yield* streamResponse(response);
}

export async function* refineCopyStream(
  request: RefineRequest
): AsyncGenerator<StreamChunk> {
  const response = await fetch(`${API_BASE}/generate/refine`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Failed to refine copy');
  }

  yield* streamResponse(response);
}

export async function fetchHistory(params?: {
  favorites_only?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<GenerationHistory[]> {
  const searchParams = new URLSearchParams();
  if (params?.favorites_only) searchParams.set('favorites_only', 'true');
  if (params?.search) searchParams.set('search', params.search);
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());

  const url = `${API_BASE}/history${searchParams.toString() ? '?' + searchParams : ''}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch history');
  return response.json();
}

export async function toggleFavorite(id: number): Promise<{ is_favorite: boolean }> {
  const response = await fetch(`${API_BASE}/history/${id}/favorite`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to toggle favorite');
  return response.json();
}

export async function deleteHistoryItem(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/history/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete history item');
}

// Utility functions
export function countText(text: string): { chars: number; words: number } {
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return { chars, words };
}

export function exportAsMarkdown(text: string, title?: string): string {
  const header = title ? `# ${title}\n\n` : '';
  return header + text;
}

export function exportAsHtml(text: string, title?: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  const titleHtml = title ? `<h1>${title}</h1>\n` : '';
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title || 'Generated Copy'}</title>
</head>
<body>
  ${titleHtml}<p>${escaped}</p>
</body>
</html>`;
}
