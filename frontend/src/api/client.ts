const API_BASE = '/api';

export interface TemplateVariable {
  name: string;
  label: string;
  placeholder: string;
  required: boolean;
  type: 'text' | 'textarea' | 'select';
  options?: string[];
}

export interface WizardStep {
  title: string;
  description?: string;
  variables: string[]; // List of variable names to show in this step
}

export type TemplateCategory = 'social' | 'email' | 'ads' | 'ecommerce' | 'seo' | 'general';

export interface Template {
  id: number;
  name: string;
  platform: string;
  category: string;
  description: string | null;
  prompt_template: string;
  variables: TemplateVariable[] | null;
  wizard_steps: WizardStep[] | null;
  example_output: string | null;
  is_custom: boolean;
  is_ab_template: boolean;
  created_at: string;
}

export interface CommunityTemplate {
  name: string;
  platform: string;
  category: string;
  description: string;
  prompt_template: string;
  variables?: TemplateVariable[];
  wizard_steps?: WizardStep[];
  example_output?: string;
  is_ab_template?: boolean;
}

export interface CategoryOption {
  value: string;
  label: string;
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
  variables?: Record<string, string>;
  brand_id?: number | null;
  persona_id?: number | null;
}

export interface VariationsRequest extends GenerateRequest {
  count?: number;
}

export interface ABTestRequest {
  prompt: string;
  template_id?: number | null;
  tone?: string | null;
  variables?: Record<string, string>;
  brand_id?: number | null;
  persona_id?: number | null;
}

export type RefineAction = 'improve' | 'shorten' | 'lengthen' | 'punchier' | 'formal' | 'casual';

export interface RefineRequest {
  text: string;
  action: RefineAction;
  template_id?: number | null;
  tone?: string | null;
  brand_id?: number | null;
}

// ============ Brand Types ============

export interface Brand {
  id: number;
  name: string;
  description: string | null;
  tone: string | null;
  voice_attributes: string[] | null;
  keywords: string[] | null;
  avoid_words: string[] | null;
  voice_examples: string[] | null;
  style_rules: string[] | null;
  is_default: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface BrandCreate {
  name: string;
  description?: string;
  tone?: string;
  voice_attributes?: string[];
  keywords?: string[];
  avoid_words?: string[];
  voice_examples?: string[];
  style_rules?: string[];
  is_default?: boolean;
}

export interface CustomTone {
  id: number;
  name: string;
  description: string | null;
  formality: number;
  energy: number;
  humor: number;
  prompt_prefix: string | null;
  style_instructions: string | null;
  created_at: string;
}

export interface CustomToneCreate {
  name: string;
  description?: string;
  formality?: number;
  energy?: number;
  humor?: number;
  prompt_prefix?: string;
  style_instructions?: string;
}

export interface Persona {
  id: number;
  name: string;
  description: string | null;
  age_range: string | null;
  gender: string | null;
  location: string | null;
  occupation: string | null;
  income_level: string | null;
  interests: string[] | null;
  values: string[] | null;
  pain_points: string[] | null;
  goals: string[] | null;
  buying_motivations: string[] | null;
  objections: string[] | null;
  preferred_channels: string[] | null;
  communication_style: string | null;
  language_level: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface PersonaCreate {
  name: string;
  description?: string;
  age_range?: string;
  gender?: string;
  location?: string;
  occupation?: string;
  income_level?: string;
  interests?: string[];
  values?: string[];
  pain_points?: string[];
  goals?: string[];
  buying_motivations?: string[];
  objections?: string[];
  preferred_channels?: string[];
  communication_style?: string;
  language_level?: string;
}

export interface StyleViolation {
  type: string;
  message: string;
  severity: string;
  suggestion: string | null;
}

export interface StyleCheckResponse {
  text: string;
  is_compliant: boolean;
  violations: StyleViolation[];
  score: number;
}

export interface AllTones {
  presets: { id: null; name: string; description: string; is_preset: true }[];
  custom: { id: number; name: string; description: string | null; is_preset: false; formality: number; energy: number; humor: number }[];
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
  // A/B test specific
  version?: string;
  version_start?: string;
  version_done?: string;
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

export async function fetchTemplates(params?: {
  category?: string;
  platform?: string;
  custom_only?: boolean;
}): Promise<Template[]> {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set('category', params.category);
  if (params?.platform) searchParams.set('platform', params.platform);
  if (params?.custom_only) searchParams.set('custom_only', 'true');

  const url = `${API_BASE}/templates${searchParams.toString() ? '?' + searchParams : ''}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch templates');
  return response.json();
}

export async function fetchCategories(): Promise<CategoryOption[]> {
  const response = await fetch(`${API_BASE}/templates/categories`);
  if (!response.ok) throw new Error('Failed to fetch categories');
  return response.json();
}

export async function fetchCommunityTemplates(): Promise<CommunityTemplate[]> {
  const response = await fetch(`${API_BASE}/templates/community`);
  if (!response.ok) throw new Error('Failed to fetch community templates');
  return response.json();
}

export async function importCommunityTemplate(templateName: string): Promise<Template> {
  const response = await fetch(`${API_BASE}/templates/import-community/${encodeURIComponent(templateName)}`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to import community template');
  return response.json();
}

export async function createTemplate(template: {
  name: string;
  platform: string;
  category?: string;
  description?: string;
  prompt_template: string;
  variables?: TemplateVariable[];
  example_output?: string;
  is_ab_template?: boolean;
}): Promise<Template> {
  const response = await fetch(`${API_BASE}/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(template),
  });
  if (!response.ok) throw new Error('Failed to create template');
  return response.json();
}

export async function updateTemplate(
  id: number,
  template: Partial<{
    name: string;
    platform: string;
    category: string;
    description: string;
    prompt_template: string;
    variables: TemplateVariable[];
    example_output: string;
    is_ab_template: boolean;
  }>
): Promise<Template> {
  const response = await fetch(`${API_BASE}/templates/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(template),
  });
  if (!response.ok) throw new Error('Failed to update template');
  return response.json();
}

export interface TemplateExport {
  templates: CommunityTemplate[];
  exported_at: string;
  version: string;
}

export async function exportTemplates(templateIds?: number[]): Promise<TemplateExport> {
  const response = await fetch(`${API_BASE}/templates/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(templateIds || null),
  });
  if (!response.ok) throw new Error('Failed to export templates');
  return response.json();
}

export async function importTemplates(templates: CommunityTemplate[]): Promise<Template[]> {
  const response = await fetch(`${API_BASE}/templates/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ templates }),
  });
  if (!response.ok) throw new Error('Failed to import templates');
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

export async function* generateABTestStream(
  request: ABTestRequest
): AsyncGenerator<StreamChunk> {
  const response = await fetch(`${API_BASE}/generate/ab-test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Failed to generate A/B test');
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

// ============ Brand API ============

export async function fetchBrands(): Promise<Brand[]> {
  const response = await fetch(`${API_BASE}/brand/brands`);
  if (!response.ok) throw new Error('Failed to fetch brands');
  return response.json();
}

export async function fetchBrand(id: number): Promise<Brand> {
  const response = await fetch(`${API_BASE}/brand/brands/${id}`);
  if (!response.ok) throw new Error('Failed to fetch brand');
  return response.json();
}

export async function createBrand(brand: BrandCreate): Promise<Brand> {
  const response = await fetch(`${API_BASE}/brand/brands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(brand),
  });
  if (!response.ok) throw new Error('Failed to create brand');
  return response.json();
}

export async function updateBrand(id: number, brand: Partial<BrandCreate>): Promise<Brand> {
  const response = await fetch(`${API_BASE}/brand/brands/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(brand),
  });
  if (!response.ok) throw new Error('Failed to update brand');
  return response.json();
}

export async function deleteBrand(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/brand/brands/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete brand');
}

export async function setDefaultBrand(id: number): Promise<Brand> {
  const response = await fetch(`${API_BASE}/brand/brands/${id}/set-default`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to set default brand');
  return response.json();
}

// ============ Custom Tone API ============

export async function fetchAllTones(): Promise<AllTones> {
  const response = await fetch(`${API_BASE}/brand/tones/all`);
  if (!response.ok) throw new Error('Failed to fetch tones');
  return response.json();
}

export async function fetchCustomTones(): Promise<CustomTone[]> {
  const response = await fetch(`${API_BASE}/brand/tones`);
  if (!response.ok) throw new Error('Failed to fetch custom tones');
  return response.json();
}

export async function createCustomTone(tone: CustomToneCreate): Promise<CustomTone> {
  const response = await fetch(`${API_BASE}/brand/tones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tone),
  });
  if (!response.ok) throw new Error('Failed to create custom tone');
  return response.json();
}

export async function updateCustomTone(id: number, tone: Partial<CustomToneCreate>): Promise<CustomTone> {
  const response = await fetch(`${API_BASE}/brand/tones/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tone),
  });
  if (!response.ok) throw new Error('Failed to update custom tone');
  return response.json();
}

export async function deleteCustomTone(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/brand/tones/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete custom tone');
}

// ============ Persona API ============

export async function fetchPersonas(): Promise<Persona[]> {
  const response = await fetch(`${API_BASE}/brand/personas`);
  if (!response.ok) throw new Error('Failed to fetch personas');
  return response.json();
}

export async function fetchPersona(id: number): Promise<Persona> {
  const response = await fetch(`${API_BASE}/brand/personas/${id}`);
  if (!response.ok) throw new Error('Failed to fetch persona');
  return response.json();
}

export async function createPersona(persona: PersonaCreate): Promise<Persona> {
  const response = await fetch(`${API_BASE}/brand/personas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(persona),
  });
  if (!response.ok) throw new Error('Failed to create persona');
  return response.json();
}

export async function updatePersona(id: number, persona: Partial<PersonaCreate>): Promise<Persona> {
  const response = await fetch(`${API_BASE}/brand/personas/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(persona),
  });
  if (!response.ok) throw new Error('Failed to update persona');
  return response.json();
}

export async function deletePersona(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/brand/personas/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete persona');
}

// ============ Style Check API ============

export async function checkStyle(text: string, brandId: number): Promise<StyleCheckResponse> {
  const response = await fetch(`${API_BASE}/brand/style-check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, brand_id: brandId }),
  });
  if (!response.ok) throw new Error('Failed to check style');
  return response.json();
}

// ============ Competitor Analysis API ============

export async function* analyzeCompetitorStream(request: {
  competitor_copy: string;
  product_description?: string;
  brand_id?: number;
  persona_id?: number;
  differentiation_focus?: string;
}): AsyncGenerator<StreamChunk> {
  const response = await fetch(`${API_BASE}/brand/competitor-analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Failed to analyze competitor');
  }

  yield* streamResponse(response);
}

// ============ Workspace Types ============

export interface Project {
  id: number;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  is_archived: boolean;
  created_at: string;
  updated_at?: string;
  generation_count?: number;
}

export interface ProjectCreate {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface Tag {
  id: number;
  name: string;
  color?: string;
  created_at: string;
  usage_count?: number;
}

export interface TagCreate {
  name: string;
  color?: string;
}

export interface Comment {
  id: number;
  generation_id: number;
  content: string;
  author_name?: string;
  created_at: string;
  updated_at?: string;
}

export interface CommentCreate {
  content: string;
  author_name?: string;
}

export interface GenerationVersion {
  id: number;
  generation_id: number;
  version_number: number;
  content: string;
  change_description?: string;
  created_at: string;
}

export interface ShareLink {
  id: number;
  generation_id: number;
  token: string;
  title?: string;
  is_active: boolean;
  allow_comments: boolean;
  expires_at?: string;
  view_count: number;
  created_at: string;
  share_url?: string;
}

export interface ShareLinkCreate {
  title?: string;
  allow_comments?: boolean;
  expires_in_days?: number;
}

export interface SharedContent {
  title?: string;
  output: string;
  prompt?: string;
  tone?: string;
  created_at: string;
  allow_comments: boolean;
  comments?: Comment[];
}

export interface GenerationWithWorkspace extends GenerationHistory {
  project_id?: number;
  updated_at?: string;
  project?: Project;
  tags: Tag[];
  comment_count: number;
  version_count: number;
  has_share_link: boolean;
}

// ============ Project API ============

export async function fetchProjects(includeArchived = false): Promise<Project[]> {
  const params = new URLSearchParams();
  if (includeArchived) params.append('include_archived', 'true');

  const response = await fetch(`${API_BASE}/workspace/projects?${params}`);
  if (!response.ok) throw new Error('Failed to fetch projects');
  return response.json();
}

export async function fetchProject(id: number): Promise<Project> {
  const response = await fetch(`${API_BASE}/workspace/projects/${id}`);
  if (!response.ok) throw new Error('Failed to fetch project');
  return response.json();
}

export async function createProject(project: ProjectCreate): Promise<Project> {
  const response = await fetch(`${API_BASE}/workspace/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  });
  if (!response.ok) throw new Error('Failed to create project');
  return response.json();
}

export async function updateProject(id: number, project: Partial<ProjectCreate & { is_archived?: boolean }>): Promise<Project> {
  const response = await fetch(`${API_BASE}/workspace/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  });
  if (!response.ok) throw new Error('Failed to update project');
  return response.json();
}

export async function deleteProject(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/workspace/projects/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete project');
}

// ============ Tag API ============

export async function fetchTags(): Promise<Tag[]> {
  const response = await fetch(`${API_BASE}/workspace/tags`);
  if (!response.ok) throw new Error('Failed to fetch tags');
  return response.json();
}

export async function createTag(tag: TagCreate): Promise<Tag> {
  const response = await fetch(`${API_BASE}/workspace/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tag),
  });
  if (!response.ok) throw new Error('Failed to create tag');
  return response.json();
}

export async function updateTag(id: number, tag: Partial<TagCreate>): Promise<Tag> {
  const response = await fetch(`${API_BASE}/workspace/tags/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tag),
  });
  if (!response.ok) throw new Error('Failed to update tag');
  return response.json();
}

export async function deleteTag(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/workspace/tags/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete tag');
}

// ============ Comment API ============

export async function fetchComments(generationId: number): Promise<Comment[]> {
  const response = await fetch(`${API_BASE}/workspace/generations/${generationId}/comments`);
  if (!response.ok) throw new Error('Failed to fetch comments');
  return response.json();
}

export async function createComment(generationId: number, comment: CommentCreate): Promise<Comment> {
  const response = await fetch(`${API_BASE}/workspace/generations/${generationId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(comment),
  });
  if (!response.ok) throw new Error('Failed to create comment');
  return response.json();
}

export async function updateComment(commentId: number, content: string): Promise<Comment> {
  const response = await fetch(`${API_BASE}/workspace/comments/${commentId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) throw new Error('Failed to update comment');
  return response.json();
}

export async function deleteComment(commentId: number): Promise<void> {
  const response = await fetch(`${API_BASE}/workspace/comments/${commentId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete comment');
}

// ============ Version History API ============

export async function fetchVersions(generationId: number): Promise<GenerationVersion[]> {
  const response = await fetch(`${API_BASE}/workspace/generations/${generationId}/versions`);
  if (!response.ok) throw new Error('Failed to fetch versions');
  return response.json();
}

export async function createVersion(generationId: number, content: string, changeDescription?: string): Promise<GenerationVersion> {
  const response = await fetch(`${API_BASE}/workspace/generations/${generationId}/versions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, change_description: changeDescription }),
  });
  if (!response.ok) throw new Error('Failed to create version');
  return response.json();
}

export async function restoreVersion(generationId: number, versionId: number): Promise<void> {
  const response = await fetch(`${API_BASE}/workspace/generations/${generationId}/versions/${versionId}/restore`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to restore version');
}

// ============ Share Link API ============

export async function fetchShareLinks(generationId: number): Promise<ShareLink[]> {
  const response = await fetch(`${API_BASE}/workspace/generations/${generationId}/shares`);
  if (!response.ok) throw new Error('Failed to fetch share links');
  return response.json();
}

export async function createShareLink(generationId: number, options: ShareLinkCreate = {}): Promise<ShareLink> {
  const response = await fetch(`${API_BASE}/workspace/generations/${generationId}/shares`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  if (!response.ok) throw new Error('Failed to create share link');
  return response.json();
}

export async function updateShareLink(shareId: number, options: Partial<ShareLinkCreate & { is_active?: boolean }>): Promise<ShareLink> {
  const response = await fetch(`${API_BASE}/workspace/shares/${shareId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  if (!response.ok) throw new Error('Failed to update share link');
  return response.json();
}

export async function deleteShareLink(shareId: number): Promise<void> {
  const response = await fetch(`${API_BASE}/workspace/shares/${shareId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete share link');
}

export async function fetchSharedContent(token: string): Promise<SharedContent> {
  const response = await fetch(`${API_BASE}/workspace/share/${token}`);
  if (!response.ok) {
    if (response.status === 410) throw new Error('Share link has expired or is inactive');
    throw new Error('Failed to fetch shared content');
  }
  return response.json();
}

// ============ Generation Organization API ============

export async function organizeGeneration(
  generationId: number,
  options: { project_id?: number | null; tag_ids?: number[] }
): Promise<GenerationWithWorkspace> {
  const response = await fetch(`${API_BASE}/workspace/generations/${generationId}/organize`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_id: options.project_id === null ? 0 : options.project_id,
      tag_ids: options.tag_ids,
    }),
  });
  if (!response.ok) throw new Error('Failed to organize generation');
  return response.json();
}

// ============ Content Types ============

// Long-form content
export interface OutlineSection {
  title: string;
  key_points: string[];
}

export interface LongFormRequest {
  topic: string;
  content_type?: string; // blog_post, article, guide, tutorial
  target_audience?: string;
  word_count?: number;
  tone?: string;
  keywords?: string[];
  outline?: OutlineSection[];
  brand_id?: number;
  persona_id?: number;
}

export interface LongFormOutline {
  title: string;
  introduction: string;
  sections: OutlineSection[];
  conclusion: string;
  estimated_word_count: number;
}

// Email sequences
export type EmailType = 'welcome' | 'nurture' | 'sales' | 'onboarding' | 're_engagement' | 'abandoned_cart';

export interface EmailSequenceRequest {
  sequence_type: EmailType;
  product_or_service: string;
  target_audience?: string;
  email_count?: number;
  days_between?: number;
  tone?: string;
  key_benefits?: string[];
  call_to_action?: string;
  brand_id?: number;
  persona_id?: number;
}

// Ad campaigns
export type AdPlatform = 'google' | 'facebook' | 'instagram' | 'linkedin' | 'twitter' | 'tiktok';

export interface AdCampaignRequest {
  platform: AdPlatform;
  product_or_service: string;
  target_audience?: string;
  campaign_goal?: string;
  key_benefits?: string[];
  offer?: string;
  variations?: number;
  tone?: string;
  brand_id?: number;
  persona_id?: number;
}

// SEO content
export interface SEOContentRequest {
  page_url?: string;
  page_topic: string;
  target_keywords: string[];
  page_type?: string; // landing, blog, product, service, about
  brand_id?: number;
}

// Landing page
export interface LandingPageRequest {
  product_or_service: string;
  target_audience?: string;
  unique_value_proposition?: string;
  key_features?: string[];
  pain_points?: string[];
  testimonials_count?: number;
  faq_count?: number;
  tone?: string;
  brand_id?: number;
  persona_id?: number;
}

// Video scripts
export type VideoType = 'tiktok' | 'youtube_short' | 'instagram_reel' | 'youtube_long' | 'explainer' | 'testimonial';

export interface VideoScriptRequest {
  video_type: VideoType;
  topic: string;
  target_audience?: string;
  duration_seconds?: number;
  key_message?: string;
  call_to_action?: string;
  tone?: string;
  brand_id?: number;
  persona_id?: number;
}

// ============ Content API ============

export async function generateLongFormOutline(request: LongFormRequest): Promise<LongFormOutline> {
  const response = await fetch(`${API_BASE}/content/long-form/outline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error('Failed to generate outline');
  return response.json();
}

export async function* generateLongFormStream(request: LongFormRequest): AsyncGenerator<StreamChunk> {
  const response = await fetch(`${API_BASE}/content/long-form/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error('Failed to generate long-form content');
  yield* streamResponse(response);
}

export async function* generateEmailSequenceStream(request: EmailSequenceRequest): AsyncGenerator<StreamChunk> {
  const response = await fetch(`${API_BASE}/content/email-sequence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error('Failed to generate email sequence');
  yield* streamResponse(response);
}

export async function* generateAdCampaignStream(request: AdCampaignRequest): AsyncGenerator<StreamChunk> {
  const response = await fetch(`${API_BASE}/content/ad-campaign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error('Failed to generate ad campaign');
  yield* streamResponse(response);
}

export async function* generateSEOContentStream(request: SEOContentRequest): AsyncGenerator<StreamChunk> {
  const response = await fetch(`${API_BASE}/content/seo-content`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error('Failed to generate SEO content');
  yield* streamResponse(response);
}

export async function* generateLandingPageStream(request: LandingPageRequest): AsyncGenerator<StreamChunk> {
  const response = await fetch(`${API_BASE}/content/landing-page`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error('Failed to generate landing page copy');
  yield* streamResponse(response);
}

export async function* generateVideoScriptStream(request: VideoScriptRequest): AsyncGenerator<StreamChunk> {
  const response = await fetch(`${API_BASE}/content/video-script`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error('Failed to generate video script');
  yield* streamResponse(response);
}

// ============ Analytics Types ============

export interface ReadabilityMetrics {
  flesch_reading_ease: number;
  flesch_kincaid_grade: number;
  gunning_fog: number;
  smog_index: number;
  automated_readability_index: number;
  coleman_liau_index: number;
  avg_grade_level: number;
  reading_time_seconds: number;
  word_count: number;
  sentence_count: number;
  paragraph_count: number;
  avg_words_per_sentence: number;
  avg_syllables_per_word: number;
  difficulty_level: string;
  target_audience: string;
}

export interface EmotionScore {
  emotion: string;
  score: number;
}

export interface SentimentAnalysis {
  overall_sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  sentiment_score: number;
  confidence: number;
  emotions: EmotionScore[];
  is_urgent: boolean;
  is_persuasive: boolean;
  is_informative: boolean;
  is_casual: boolean;
  is_formal: boolean;
  call_to_action_strength: number;
  emotional_appeal: number;
}

export interface KeywordAnalysis {
  keyword: string;
  count: number;
  density: number;
  in_title: boolean;
  in_headings: boolean;
  in_first_paragraph: boolean;
}

export interface HeadingStructure {
  tag: string;
  text: string;
  word_count: number;
}

export interface SEOAnalysis {
  seo_score: number;
  word_count: number;
  ideal_word_count_range: string;
  keywords: KeywordAnalysis[];
  keyword_stuffing_warning: boolean;
  headings: HeadingStructure[];
  has_h1: boolean;
  heading_hierarchy_valid: boolean;
  paragraph_count: number;
  avg_paragraph_length: number;
  short_paragraphs_ratio: number;
  suggestions: string[];
}

export interface EngagementPrediction {
  overall_score: number;
  headline_score: number;
  hook_score: number;
  readability_score: number;
  emotional_score: number;
  cta_score: number;
  predicted_click_rate: string;
  predicted_read_completion: number;
  predicted_share_likelihood: string;
  strengths: string[];
  improvements: string[];
}

export interface FullAnalysis {
  readability: ReadabilityMetrics;
  sentiment: SentimentAnalysis;
  seo: SEOAnalysis;
  engagement: EngagementPrediction;
}

export interface TemplateUsageStats {
  template_id: number;
  template_name: string;
  usage_count: number;
  last_used?: string;
  avg_output_length: number;
  favorite_rate: number;
}

export interface GenerationStats {
  total_generations: number;
  generations_today: number;
  generations_this_week: number;
  generations_this_month: number;
  avg_generations_per_day: number;
  peak_hour?: number;
  peak_day?: string;
  generations_by_tone: Record<string, number>;
  generations_by_template: Record<string, number>;
  total_favorites: number;
  favorite_rate: number;
  avg_output_length: number;
}

export interface UsageAnalytics {
  generation_stats: GenerationStats;
  top_templates: TemplateUsageStats[];
  recent_activity: Array<{
    id: number;
    prompt: string;
    created_at: string;
    is_favorite: boolean;
  }>;
}

export interface ABTestResult {
  id: number;
  generation_id: number;
  variant_a: string;
  variant_b: string;
  winner?: string;
  winner_reason?: string;
  created_at: string;
  decided_at?: string;
}

export interface ABTestStats {
  total_tests: number;
  decided_tests: number;
  variant_a_wins: number;
  variant_b_wins: number;
  undecided_tests: number;
  avg_decision_time_hours?: number;
}

// ============ Analytics API ============

export async function analyzeReadability(text: string): Promise<ReadabilityMetrics> {
  const response = await fetch(`${API_BASE}/analytics/readability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) throw new Error('Failed to analyze readability');
  return response.json();
}

export async function analyzeSentiment(text: string): Promise<SentimentAnalysis> {
  const response = await fetch(`${API_BASE}/analytics/sentiment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) throw new Error('Failed to analyze sentiment');
  return response.json();
}

export async function analyzeSEO(
  text: string,
  targetKeywords?: string[],
  contentType?: string
): Promise<SEOAnalysis> {
  const response = await fetch(`${API_BASE}/analytics/seo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      target_keywords: targetKeywords,
      content_type: contentType || 'blog',
    }),
  });
  if (!response.ok) throw new Error('Failed to analyze SEO');
  return response.json();
}

export async function predictEngagement(
  text: string,
  contentType?: string,
  platform?: string
): Promise<EngagementPrediction> {
  const response = await fetch(`${API_BASE}/analytics/engagement`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      content_type: contentType || 'social',
      platform,
    }),
  });
  if (!response.ok) throw new Error('Failed to predict engagement');
  return response.json();
}

export async function getFullAnalysis(
  text: string,
  targetKeywords?: string[],
  contentType?: string,
  platform?: string
): Promise<FullAnalysis> {
  const response = await fetch(`${API_BASE}/analytics/full`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      target_keywords: targetKeywords,
      content_type: contentType || 'blog',
      platform,
    }),
  });
  if (!response.ok) throw new Error('Failed to get full analysis');
  return response.json();
}

export async function getUsageAnalytics(): Promise<UsageAnalytics> {
  const response = await fetch(`${API_BASE}/analytics/usage`);
  if (!response.ok) throw new Error('Failed to get usage analytics');
  return response.json();
}

export async function createABTest(
  generationId: number,
  variantA: string,
  variantB: string
): Promise<ABTestResult> {
  const response = await fetch(`${API_BASE}/analytics/ab-tests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      generation_id: generationId,
      variant_a: variantA,
      variant_b: variantB,
    }),
  });
  if (!response.ok) throw new Error('Failed to create A/B test');
  return response.json();
}

export async function getABTests(decidedOnly = false): Promise<ABTestResult[]> {
  const params = new URLSearchParams();
  if (decidedOnly) params.append('decided_only', 'true');
  const response = await fetch(`${API_BASE}/analytics/ab-tests?${params}`);
  if (!response.ok) throw new Error('Failed to get A/B tests');
  return response.json();
}

export async function recordABTestWinner(
  testId: number,
  winner: 'A' | 'B',
  reason?: string
): Promise<ABTestResult> {
  const response = await fetch(`${API_BASE}/analytics/ab-tests/${testId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ winner, winner_reason: reason }),
  });
  if (!response.ok) throw new Error('Failed to record A/B test winner');
  return response.json();
}

export async function getABTestStats(): Promise<ABTestStats> {
  const response = await fetch(`${API_BASE}/analytics/ab-tests/stats`);
  if (!response.ok) throw new Error('Failed to get A/B test stats');
  return response.json();
}
