import { useState, useEffect } from 'react';
import {
  Webhook,
  WebhookEvent,
  APIKey,
  APIKeyCreated,
  fetchWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhook,
  fetchAPIKeys,
  createAPIKey,
  deleteAPIKey,
  revokeAPIKey,
  getIntegrationSettings,
  IntegrationSettings,
} from '../api/client';

const WEBHOOK_EVENTS: { value: WebhookEvent; label: string }[] = [
  { value: 'generation.created', label: 'Generation Created' },
  { value: 'generation.favorited', label: 'Generation Favorited' },
  { value: 'generation.deleted', label: 'Generation Deleted' },
  { value: 'template.created', label: 'Template Created' },
  { value: 'template.updated', label: 'Template Updated' },
  { value: 'brand.created', label: 'Brand Created' },
  { value: 'brand.updated', label: 'Brand Updated' },
  { value: 'abtest.decided', label: 'A/B Test Decided' },
];

const API_SCOPES = [
  { value: 'read', label: 'Read', description: 'Read generations, templates, brands' },
  { value: 'write', label: 'Write', description: 'Create and update content' },
  { value: 'delete', label: 'Delete', description: 'Delete content' },
  { value: 'admin', label: 'Admin', description: 'Full access including settings' },
];

type Tab = 'webhooks' | 'api-keys' | 'integrations';

export default function IntegrationsSettings() {
  const [activeTab, setActiveTab] = useState<Tab>('webhooks');
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [integrationSettings, setIntegrationSettings] = useState<IntegrationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Webhook form state
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [webhookForm, setWebhookForm] = useState({
    name: '',
    url: '',
    events: [] as WebhookEvent[],
    secret: '',
    is_active: true,
  });
  const [testingWebhookId, setTestingWebhookId] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<{ id: number; success: boolean; message: string } | null>(null);

  // API Key form state
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);
  const [apiKeyForm, setApiKeyForm] = useState({
    name: '',
    description: '',
    scopes: ['read', 'write'] as string[],
    expires_in_days: undefined as number | undefined,
  });
  const [newApiKey, setNewApiKey] = useState<APIKeyCreated | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [webhooksData, apiKeysData, settingsData] = await Promise.all([
        fetchWebhooks(),
        fetchAPIKeys(),
        getIntegrationSettings(),
      ]);
      setWebhooks(webhooksData);
      setApiKeys(apiKeysData);
      setIntegrationSettings(settingsData);
    } catch (err) {
      setError('Failed to load integration settings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Webhook handlers
  async function handleCreateWebhook() {
    try {
      const webhook = await createWebhook(webhookForm);
      setWebhooks([...webhooks, webhook]);
      resetWebhookForm();
    } catch (err) {
      setError('Failed to create webhook');
    }
  }

  async function handleUpdateWebhook() {
    if (!editingWebhook) return;
    try {
      const updated = await updateWebhook(editingWebhook.id, webhookForm);
      setWebhooks(webhooks.map(w => (w.id === updated.id ? updated : w)));
      resetWebhookForm();
    } catch (err) {
      setError('Failed to update webhook');
    }
  }

  async function handleDeleteWebhook(id: number) {
    if (!confirm('Are you sure you want to delete this webhook?')) return;
    try {
      await deleteWebhook(id);
      setWebhooks(webhooks.filter(w => w.id !== id));
    } catch (err) {
      setError('Failed to delete webhook');
    }
  }

  async function handleTestWebhook(id: number) {
    setTestingWebhookId(id);
    setTestResult(null);
    try {
      const result = await testWebhook(id);
      setTestResult({
        id,
        success: result.success,
        message: result.success
          ? `Success! Status ${result.status_code} in ${result.response_time_ms}ms`
          : result.error || 'Test failed',
      });
    } catch (err) {
      setTestResult({ id, success: false, message: 'Failed to test webhook' });
    } finally {
      setTestingWebhookId(null);
    }
  }

  function resetWebhookForm() {
    setShowWebhookForm(false);
    setEditingWebhook(null);
    setWebhookForm({ name: '', url: '', events: [], secret: '', is_active: true });
  }

  function startEditWebhook(webhook: Webhook) {
    setEditingWebhook(webhook);
    setWebhookForm({
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      secret: '',
      is_active: webhook.is_active,
    });
    setShowWebhookForm(true);
  }

  // API Key handlers
  async function handleCreateApiKey() {
    try {
      const apiKey = await createAPIKey({
        ...apiKeyForm,
        expires_in_days: apiKeyForm.expires_in_days || undefined,
      });
      setApiKeys([...apiKeys, apiKey]);
      setNewApiKey(apiKey);
      setShowApiKeyForm(false);
      setApiKeyForm({ name: '', description: '', scopes: ['read', 'write'], expires_in_days: undefined });
    } catch (err) {
      setError('Failed to create API key');
    }
  }

  async function handleRevokeApiKey(id: number) {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) return;
    try {
      const revoked = await revokeAPIKey(id);
      setApiKeys(apiKeys.map(k => (k.id === revoked.id ? revoked : k)));
    } catch (err) {
      setError('Failed to revoke API key');
    }
  }

  async function handleDeleteApiKey(id: number) {
    if (!confirm('Are you sure you want to delete this API key?')) return;
    try {
      await deleteAPIKey(id);
      setApiKeys(apiKeys.filter(k => k.id !== id));
    } catch (err) {
      setError('Failed to delete API key');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Integrations & API</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          {[
            { id: 'webhooks', label: 'Webhooks', count: webhooks.length },
            { id: 'api-keys', label: 'API Keys', count: apiKeys.length },
            { id: 'integrations', label: 'Integrations', count: null },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Webhooks Tab */}
      {activeTab === 'webhooks' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-gray-600">
              Connect to Zapier, Make, or any webhook-compatible service to automate your workflow.
            </p>
            <button
              onClick={() => setShowWebhookForm(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Add Webhook
            </button>
          </div>

          {/* Webhook Form Modal */}
          {showWebhookForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4">
                  {editingWebhook ? 'Edit Webhook' : 'Create Webhook'}
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={webhookForm.name}
                      onChange={e => setWebhookForm({ ...webhookForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="My Webhook"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                    <input
                      type="url"
                      value={webhookForm.url}
                      onChange={e => setWebhookForm({ ...webhookForm, url: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="https://hooks.zapier.com/..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Secret (optional)</label>
                    <input
                      type="password"
                      value={webhookForm.secret}
                      onChange={e => setWebhookForm({ ...webhookForm, secret: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="For HMAC signature verification"
                    />
                    <p className="text-xs text-gray-500 mt-1">Minimum 16 characters for security</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Events</label>
                    <div className="grid grid-cols-2 gap-2">
                      {WEBHOOK_EVENTS.map(event => (
                        <label key={event.value} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={webhookForm.events.includes(event.value)}
                            onChange={e => {
                              if (e.target.checked) {
                                setWebhookForm({ ...webhookForm, events: [...webhookForm.events, event.value] });
                              } else {
                                setWebhookForm({
                                  ...webhookForm,
                                  events: webhookForm.events.filter(ev => ev !== event.value),
                                });
                              }
                            }}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-sm text-gray-700">{event.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={webhookForm.is_active}
                      onChange={e => setWebhookForm({ ...webhookForm, is_active: e.target.checked })}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={resetWebhookForm}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingWebhook ? handleUpdateWebhook : handleCreateWebhook}
                    disabled={!webhookForm.name || !webhookForm.url || webhookForm.events.length === 0}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingWebhook ? 'Update' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Webhooks List */}
          {webhooks.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No webhooks configured yet</p>
              <p className="text-sm text-gray-400 mt-1">Create a webhook to start automating</p>
            </div>
          ) : (
            <div className="space-y-4">
              {webhooks.map(webhook => (
                <div key={webhook.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-gray-800">{webhook.name}</h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            webhook.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {webhook.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {webhook.failure_count > 0 && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">
                            {webhook.failure_count} failures
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1 font-mono truncate">{webhook.url}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {webhook.events.map(event => (
                          <span
                            key={event}
                            className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs"
                          >
                            {event}
                          </span>
                        ))}
                      </div>
                      {webhook.last_triggered && (
                        <p className="text-xs text-gray-400 mt-2">
                          Last triggered: {new Date(webhook.last_triggered).toLocaleString()}
                          {webhook.last_status && ` (Status: ${webhook.last_status})`}
                        </p>
                      )}
                      {testResult?.id === webhook.id && (
                        <p
                          className={`text-sm mt-2 ${
                            testResult.success ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {testResult.message}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleTestWebhook(webhook.id)}
                        disabled={testingWebhookId === webhook.id}
                        className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                      >
                        {testingWebhookId === webhook.id ? 'Testing...' : 'Test'}
                      </button>
                      <button
                        onClick={() => startEditWebhook(webhook)}
                        className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteWebhook(webhook.id)}
                        className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* API Keys Tab */}
      {activeTab === 'api-keys' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-gray-600">
              Create API keys to access Auto-Copy programmatically.
            </p>
            <button
              onClick={() => setShowApiKeyForm(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Create API Key
            </button>
          </div>

          {/* New API Key Display */}
          {newApiKey && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2">API Key Created!</h4>
              <p className="text-sm text-green-700 mb-3">
                Make sure to copy your API key now. You won't be able to see it again!
              </p>
              <div className="flex items-center gap-2 bg-white border border-green-300 rounded-lg p-2">
                <code className="flex-1 text-sm font-mono break-all">{newApiKey.key}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(newApiKey.key);
                    alert('API key copied to clipboard!');
                  }}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  Copy
                </button>
              </div>
              <button
                onClick={() => setNewApiKey(null)}
                className="mt-3 text-sm text-green-600 hover:text-green-800"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* API Key Form Modal */}
          {showApiKeyForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 w-full max-w-lg">
                <h3 className="text-lg font-semibold mb-4">Create API Key</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={apiKeyForm.name}
                      onChange={e => setApiKeyForm({ ...apiKeyForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="My Integration"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (optional)
                    </label>
                    <textarea
                      value={apiKeyForm.description}
                      onChange={e => setApiKeyForm({ ...apiKeyForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      rows={2}
                      placeholder="What is this key used for?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Scopes</label>
                    <div className="space-y-2">
                      {API_SCOPES.map(scope => (
                        <label key={scope.value} className="flex items-start gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={apiKeyForm.scopes.includes(scope.value)}
                            onChange={e => {
                              if (e.target.checked) {
                                setApiKeyForm({ ...apiKeyForm, scopes: [...apiKeyForm.scopes, scope.value] });
                              } else {
                                setApiKeyForm({
                                  ...apiKeyForm,
                                  scopes: apiKeyForm.scopes.filter(s => s !== scope.value),
                                });
                              }
                            }}
                            className="mt-1 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <div>
                            <span className="text-sm font-medium text-gray-700">{scope.label}</span>
                            <p className="text-xs text-gray-500">{scope.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expires in (days, optional)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={apiKeyForm.expires_in_days || ''}
                      onChange={e =>
                        setApiKeyForm({
                          ...apiKeyForm,
                          expires_in_days: e.target.value ? parseInt(e.target.value) : undefined,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Leave empty for no expiration"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowApiKeyForm(false);
                      setApiKeyForm({ name: '', description: '', scopes: ['read', 'write'], expires_in_days: undefined });
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateApiKey}
                    disabled={!apiKeyForm.name || apiKeyForm.scopes.length === 0}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* API Keys List */}
          {apiKeys.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No API keys created yet</p>
              <p className="text-sm text-gray-400 mt-1">Create an API key to integrate with external services</p>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map(apiKey => (
                <div key={apiKey.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-gray-800">{apiKey.name}</h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            apiKey.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {apiKey.is_active ? 'Active' : 'Revoked'}
                        </span>
                      </div>
                      {apiKey.description && (
                        <p className="text-sm text-gray-500 mt-1">{apiKey.description}</p>
                      )}
                      <p className="text-sm font-mono text-gray-400 mt-1">
                        {apiKey.key_prefix}...
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {apiKey.scopes.map(scope => (
                          <span
                            key={scope}
                            className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs"
                          >
                            {scope}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-4 mt-2 text-xs text-gray-400">
                        <span>Created: {new Date(apiKey.created_at).toLocaleDateString()}</span>
                        {apiKey.last_used && (
                          <span>Last used: {new Date(apiKey.last_used).toLocaleDateString()}</span>
                        )}
                        <span>Usage: {apiKey.usage_count} requests</span>
                        {apiKey.expires_at && (
                          <span>
                            Expires: {new Date(apiKey.expires_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {apiKey.is_active && (
                        <button
                          onClick={() => handleRevokeApiKey(apiKey.id)}
                          className="px-3 py-1.5 text-sm border border-yellow-300 text-yellow-700 rounded-lg hover:bg-yellow-50"
                        >
                          Revoke
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteApiKey(apiKey.id)}
                        className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Integrations Tab */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          <p className="text-gray-600">
            Connect third-party services to enhance your workflow.
          </p>

          <div className="grid gap-6">
            {/* Notion Integration */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">N</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">Notion</h3>
                    <p className="text-sm text-gray-500">Export content directly to Notion pages</p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm ${
                    integrationSettings?.notion.is_connected
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {integrationSettings?.notion.is_connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              <div className="mt-4">
                <button className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
                  {integrationSettings?.notion.is_connected ? 'Manage Connection' : 'Connect Notion'}
                </button>
              </div>
            </div>

            {/* Google Integration */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">G</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">Google Docs</h3>
                    <p className="text-sm text-gray-500">Export content to Google Docs</p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm ${
                    integrationSettings?.google.is_connected
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {integrationSettings?.google.is_connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              <div className="mt-4">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  {integrationSettings?.google.is_connected ? 'Manage Connection' : 'Connect Google'}
                </button>
              </div>
            </div>

            {/* Slack Integration */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-700 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">S</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">Slack</h3>
                    <p className="text-sm text-gray-500">Share generated content to Slack channels</p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm ${
                    integrationSettings?.slack.is_connected
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {integrationSettings?.slack.is_connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              <div className="mt-4">
                <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                  {integrationSettings?.slack.is_connected ? 'Manage Connection' : 'Connect Slack'}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Third-party integrations require OAuth authentication.
              Connect your accounts to enable direct export functionality.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
