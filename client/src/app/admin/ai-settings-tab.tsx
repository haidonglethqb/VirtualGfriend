'use client';
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Brain, CheckCircle2, Edit, Key, Plus, RefreshCw, Save, SlidersHorizontal, Trash2, X, Zap } from 'lucide-react';

type Provider = string;

interface ProviderInfo {
  label: string;
  baseUrl: string;
  wireApi: string;
  models: string[];
  apiKeyConfigured: boolean;
  maskedKey: string | null;
  keyUpdatedAt?: string;
  isCustom?: boolean;
}

interface AiSettings {
  activeProvider: string;
  selectedModels: Record<string, string>;
  contextLimits: ContextLimits;
  maxContextLimits: ContextLimits;
  providers: Record<string, ProviderInfo>;
}

interface ContextLimits {
  messageLimit: number;
  factLimit: number;
  summaryLimit: number;
}

interface AiDebugLogItem {
  id: string;
  createdAt: string;
  metricKey: string;
  severity: string;
  source: string;
  requestId?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown> | null;
}

// Using dynamic providers from backend settings instead of static list
const KEY_PROVIDERS = ['groq', 'codex_router', 'openai'];

export function AiSettingsTab({
  apiCall,
  showToast,
}: {
  apiCall: (endpoint: string, options?: RequestInit, authToken?: string) => Promise<Response>;
  showToast: (message: string, type?: 'success' | 'error') => void;
}) {
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [provider, setProvider] = useState<Provider>('system');
  const [models, setModels] = useState<Record<string, string>>({});
  const [contextLimits, setContextLimits] = useState<ContextLimits>({
    messageLimit: 300,
    factLimit: 200,
    summaryLimit: 20,
  });
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<AiDebugLogItem[]>([]);
  const [debugLoading, setDebugLoading] = useState(false);
  const [debugClearing, setDebugClearing] = useState(false);

  // Custom AI provider form states
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formLabel, setFormLabel] = useState('');
  const [formBaseUrl, setFormBaseUrl] = useState('');
  const [formModelId, setFormModelId] = useState('');
  const [formModels, setFormModels] = useState<string[]>([]);
  const [formApiKey, setFormApiKey] = useState('');

  const customProviders = useMemo(() => {
    if (!settings?.providers) return [];
    return Object.entries(settings.providers)
      .filter(([_, info]) => info.isCustom)
      .map(([id, info]) => ({ id, ...info }));
  }, [settings]);

  function resetForm() {
    setEditingId(null);
    setFormLabel('');
    setFormBaseUrl('');
    setFormModelId('');
    setFormModels([]);
    setFormApiKey('');
    setShowForm(false);
  }

  function handleEditCustomProvider(custom: any) {
    setEditingId(custom.id);
    setFormLabel(custom.label);
    setFormBaseUrl(custom.baseUrl);
    setFormModels(custom.models || []);
    setFormModelId('');
    setFormApiKey('');
    setShowForm(true);
  }

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCall('/ai-settings');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || json.error || 'Unable to load AI settings');
      const data = json.data as AiSettings;
      setSettings(data);
      setProvider(data.activeProvider);
      setModels(data.selectedModels || {});
      setContextLimits(data.contextLimits);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to load AI settings', 'error');
    } finally {
      setLoading(false);
    }
  }, [apiCall, showToast]);

  const fetchDebugLogs = useCallback(async () => {
    setDebugLoading(true);
    try {
      const res = await apiCall('/ai-settings/debug?limit=50');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || json.error || 'Unable to load AI debug logs');
      setDebugLogs(Array.isArray(json.data) ? json.data as AiDebugLogItem[] : []);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to load AI debug logs', 'error');
    } finally {
      setDebugLoading(false);
    }
  }, [apiCall, showToast]);

  useEffect(() => {
    void fetchSettings();
    void fetchDebugLogs();
  }, [fetchDebugLogs, fetchSettings]);

  const providerInfo = settings?.providers[provider];
  const modelOptions = useMemo(() => providerInfo?.models || [], [providerInfo]);
  const selectedModel = useMemo(() => {
    if (provider === 'system') return modelOptions[0] || 'system';
    return models[provider] || modelOptions[0] || '';
  }, [modelOptions, models, provider]);
  const codexRouterHint = useMemo(() => {
    const info = settings?.providers.codex_router;
    if (!info) return null;
    return `${info.label}: ${info.baseUrl} (${info.wireApi})`;
  }, [settings]);

  async function saveProvider() {
    setSaving(true);
    try {
      const res = await apiCall('/ai-settings/provider', {
        method: 'PUT',
        body: JSON.stringify({
          provider,
          ...(provider === 'system' ? {} : { model: selectedModel }),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || json.error || 'Save failed');
      setSettings(json.data as AiSettings);
      showToast('AI provider/model saved', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to save AI settings', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function updateKey(keyProvider: string, action: 'replace' | 'clear') {
    try {
      const res = await apiCall(`/ai-settings/keys/${keyProvider}`, {
        method: 'PUT',
        body: JSON.stringify({
          action,
          ...(action === 'replace' ? { apiKey: keys[keyProvider] || '' } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || json.error || 'Key update failed');
      setSettings(json.data as AiSettings);
      setKeys((prev) => ({ ...prev, [keyProvider]: '' }));
      showToast(action === 'clear' ? 'API key cleared' : 'API key saved', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to update key', 'error');
    }
  }

  async function saveContextLimits() {
    setSaving(true);
    try {
      const res = await apiCall('/ai-settings/context', {
        method: 'PUT',
        body: JSON.stringify(contextLimits),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || json.error || 'Context update failed');
      setSettings(json.data as AiSettings);
      setContextLimits((json.data as AiSettings).contextLimits);
      showToast('AI context limits saved', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to save context limits', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const apiKey = provider !== 'system' ? keys[provider] : undefined;
      const res = await apiCall('/ai-settings/test', {
        method: 'POST',
        body: JSON.stringify({
          provider,
          ...(provider === 'system' ? {} : { model: selectedModel }),
          ...(apiKey ? { apiKey } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || json.error || 'Test failed');
      setTestResult(`${json.data.provider} - ${json.data.model} - ${json.data.wireApi}: ${json.data.response || 'ok'}`);
      void fetchDebugLogs();
      showToast('AI test succeeded', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'AI test failed', 'error');
      void fetchDebugLogs();
    } finally {
      setTesting(false);
    }
  }

  async function handleSaveCustomProvider(event: React.FormEvent) {
    event.preventDefault();
    if (!formLabel.trim() || !formBaseUrl.trim() || formModels.length === 0) {
      showToast('Label, Base URL and at least one model are required', 'error');
      return;
    }
    if (!editingId && !formApiKey.trim()) {
      showToast('API key is required for new custom providers', 'error');
      return;
    }

    setSaving(true);
    try {
      const endpoint = editingId
        ? `/ai-settings/custom-providers/${editingId}`
        : '/ai-settings/custom-providers';
      const method = editingId ? 'PUT' : 'POST';
      const res = await apiCall(endpoint, {
        method,
        body: JSON.stringify({
          label: formLabel,
          baseUrl: formBaseUrl,
          models: formModels,
          ...(formApiKey.trim() ? { apiKey: formApiKey } : {}),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || json.error || 'Failed to save custom provider');

      setSettings(json.data as AiSettings);
      showToast(editingId ? 'Custom provider updated' : 'Custom provider added', 'success');
      resetForm();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to save custom provider', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCustomProvider(id: string) {
    if (!confirm('Are you sure you want to delete this custom provider?')) return;
    try {
      const res = await apiCall(`/ai-settings/custom-providers/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || json.error || 'Delete failed');

      setSettings(json.data as AiSettings);
      if (provider === id) {
        setProvider('system');
      }
      showToast('Custom provider deleted', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to delete custom provider', 'error');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center gap-3 mb-6">
          <Brain className="w-6 h-6 text-purple-400" />
          <div>
            <h2 className="text-xl font-bold text-white">AI Settings</h2>
            <p className="text-sm text-gray-400">Choose the provider/model used for chat, facts, and summaries.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <label className="space-y-2">
            <span className="text-sm text-gray-300">Active provider</span>
            <select
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-white"
            >
              {settings && Object.keys(settings.providers).map((item) => (
                <option key={item} value={item}>{settings.providers[item].label || item}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm text-gray-300">Current model</span>
            <select
              value={selectedModel}
              disabled={provider === 'system'}
              onChange={(event) => setModels((prev) => ({ ...prev, [provider]: event.target.value }))}
              className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-white disabled:opacity-60"
            >
              {modelOptions.map((model) => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
          <div className="p-3 bg-gray-900/60 rounded-lg border border-gray-700">
            <span className="text-gray-500">Base URL</span>
            <p className="text-gray-200 mt-1 break-all">{providerInfo?.baseUrl}</p>
          </div>
          <div className="p-3 bg-gray-900/60 rounded-lg border border-gray-700">
            <span className="text-gray-500">Wire API</span>
            <p className="text-gray-200 mt-1">{providerInfo?.wireApi}</p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p className="font-medium">Compatibility note</p>
          <p className="mt-1 text-amber-100/80">
            If your key follows the `luongchidung.online/v1` guide with `wire_api = responses`, use the `codex_router` provider, not `openai`.
          </p>
          {codexRouterHint && (
            <p className="mt-2 text-xs text-amber-100/70">{codexRouterHint}</p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={saveProvider}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 rounded-lg text-white"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save provider/model'}
          </button>
          <button
            type="button"
            onClick={testConnection}
            disabled={testing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg text-white"
          >
            <Zap className="w-4 h-4" />
            {testing ? 'Testing...' : 'Test connection'}
          </button>
        </div>

        {testResult && (
          <div className="mt-4 flex items-start gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-200 text-sm">
            <CheckCircle2 className="w-4 h-4 mt-0.5" />
            <span>{testResult}</span>
          </div>
        )}
      </div>

      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center gap-3 mb-6">
          <SlidersHorizontal className="w-6 h-6 text-cyan-400" />
          <div>
            <h3 className="text-lg font-semibold text-white">Context Memory</h3>
            <p className="text-sm text-gray-400">Controls how much conversation memory is sent to the selected model.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            ['messageLimit', 'Recent messages', settings?.maxContextLimits.messageLimit || 1000],
            ['factLimit', 'Stored facts', settings?.maxContextLimits.factLimit || 500],
            ['summaryLimit', 'Summaries', settings?.maxContextLimits.summaryLimit || 50],
          ].map(([key, label, max]) => (
            <label key={key} className="space-y-2">
              <span className="text-sm text-gray-300">{label}</span>
              <input
                type="number"
                min={1}
                max={max as number}
                value={contextLimits[key as keyof ContextLimits]}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setContextLimits((prev) => ({
                    ...prev,
                    [key]: Number.isFinite(value) ? value : prev[key as keyof ContextLimits],
                  }));
                }}
                className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-white"
              />
              <p className="text-xs text-gray-500">Max {max}</p>
            </label>
          ))}
        </div>

        <button
          type="button"
          onClick={saveContextLimits}
          disabled={saving}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-60 rounded-lg text-white"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save context limits'}
        </button>
      </div>

      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center gap-3 mb-6">
          <Key className="w-6 h-6 text-amber-400" />
          <div>
            <h3 className="text-lg font-semibold text-white">Provider API Keys</h3>
            <p className="text-sm text-gray-400">Keys are encrypted on the server; the UI only shows status.</p>
          </div>
        </div>

        <div className="space-y-4">
          {KEY_PROVIDERS.map((keyProvider) => {
            const info = settings?.providers[keyProvider];
            return (
              <div key={keyProvider} className="p-4 bg-gray-900/60 rounded-lg border border-gray-700">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-white">{info?.label || keyProvider}</p>
                    <p className="text-xs text-gray-500">
                      {info?.apiKeyConfigured ? `Configured: ${info.maskedKey}` : 'Not configured'}
                      {info?.keyUpdatedAt ? ` - ${new Date(info.keyUpdatedAt).toLocaleString()}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void updateKey(keyProvider, 'clear')}
                    disabled={!info?.apiKeyConfigured}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-red-500/15 hover:bg-red-500/25 disabled:opacity-50 rounded-lg text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear key
                  </button>
                </div>
                <div className="flex flex-col md:flex-row gap-3">
                  <input
                    type="password"
                    value={keys[keyProvider] || ''}
                    onChange={(event) => setKeys((prev) => ({ ...prev, [keyProvider]: event.target.value }))}
                    placeholder="Paste new API key"
                    className="flex-1 px-4 py-3 rounded-lg bg-gray-950 border border-gray-700 text-white"
                  />
                  <button
                    type="button"
                    onClick={() => void updateKey(keyProvider, 'replace')}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
                  >
                    <Save className="w-4 h-4" />
                    Save key
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <SlidersHorizontal className="w-6 h-6 text-purple-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">Custom AI Providers</h3>
              <p className="text-sm text-gray-400">Configure your own OpenAI-compatible providers, e.g., local LLMs or custom endpoints.</p>
            </div>
          </div>
          {!showForm && (
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Provider
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSaveCustomProvider} className="mb-6 p-4 bg-gray-900/60 rounded-lg border border-gray-700 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-white">{editingId ? 'Edit Custom Provider' : 'Add Custom Provider'}</h4>
              <button type="button" onClick={resetForm} className="p-1 hover:bg-gray-800 rounded-full text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-1 block">
                <span className="text-xs text-gray-400">Label / Name</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. My Local Ollama"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-gray-950 border border-gray-700 text-white text-sm"
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-xs text-gray-400">Base URL</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. http://localhost:11434/v1"
                  value={formBaseUrl}
                  onChange={(e) => setFormBaseUrl(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-gray-950 border border-gray-700 text-white text-sm"
                />
              </label>

              <label className="space-y-1 block md:col-span-2">
                <span className="text-xs text-gray-400">Models (press Enter or comma to add)</span>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-gray-950 border border-gray-700 min-h-[42px]">
                  {formModels.map((m, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-md bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 text-xs text-purple-200">
                      {m}
                      <button
                        type="button"
                        onClick={() => setFormModels((prev) => prev.filter((_, idx) => idx !== i))}
                        className="hover:text-red-300 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder={formModels.length === 0 ? 'e.g. llama3, gpt-4o' : 'Add more...'}
                    value={formModelId}
                    onChange={(e) => setFormModelId(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ',') && formModelId.trim()) {
                        e.preventDefault();
                        const newModel = formModelId.trim().replace(/,$/,'');
                        if (newModel && !formModels.includes(newModel)) {
                          setFormModels((prev) => [...prev, newModel]);
                        }
                        setFormModelId('');
                      }
                      if (e.key === 'Backspace' && !formModelId && formModels.length > 0) {
                        setFormModels((prev) => prev.slice(0, -1));
                      }
                    }}
                    onBlur={() => {
                      if (formModelId.trim()) {
                        const newModel = formModelId.trim();
                        if (!formModels.includes(newModel)) {
                          setFormModels((prev) => [...prev, newModel]);
                        }
                        setFormModelId('');
                      }
                    }}
                    className="flex-1 min-w-[120px] bg-transparent text-white text-sm outline-none placeholder-gray-600"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Add models you want available for this provider</p>
              </label>

              <label className="space-y-1 block">
                <span className="text-xs text-gray-400">API Key {editingId && '(Leave blank to keep current key)'}</span>
                <input
                  type="password"
                  required={!editingId}
                  placeholder={editingId ? '••••••••' : 'Enter API Key'}
                  value={formApiKey}
                  onChange={(e) => setFormApiKey(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-gray-950 border border-gray-700 text-white text-sm"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 rounded-lg text-white text-sm font-semibold"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Provider'}
              </button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {customProviders.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-700 bg-gray-900/40 p-6 text-center text-sm text-gray-400">
              No custom providers configured yet. Click &quot;Add Provider&quot; above to create one.
            </div>
          ) : (
            customProviders.map((custom) => (
              <div key={custom.id} className="p-4 bg-gray-900/60 rounded-lg border border-gray-700 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{custom.label}</span>
                    {provider === custom.id && (
                      <span className="inline-flex items-center gap-1 rounded bg-purple-500/10 px-2 py-0.5 text-xs font-semibold text-purple-400 border border-purple-500/20">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    <span className="text-gray-400">Base URL:</span> {custom.baseUrl} | <span className="text-gray-400">Models:</span> {custom.models.join(', ')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {custom.apiKeyConfigured ? `Key: ${custom.maskedKey}` : 'No key configured'}
                    {custom.keyUpdatedAt ? ` - Updated: ${new Date(custom.keyUpdatedAt).toLocaleString()}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleEditCustomProvider(custom)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-200 text-xs"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteCustomProvider(custom.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 rounded-lg text-red-300 text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-emerald-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">AI Debug Log</h3>
              <p className="text-sm text-gray-400">Recent provider/runtime/test activity from staging for fast diagnosis.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void fetchDebugLogs()}
              disabled={debugLoading}
              className="inline-flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-60 rounded-lg text-white"
            >
              <RefreshCw className={`w-4 h-4 ${debugLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={async () => {
                setDebugClearing(true);
                try {
                  const res = await apiCall('/ai-settings/debug', {
                    method: 'DELETE',
                  });
                  const json = await res.json();
                  if (!res.ok) throw new Error(json.error?.message || json.error || 'Unable to clear AI debug logs');
                  setDebugLogs([]);
                  showToast(`Cleared ${json.data?.deletedCount || 0} AI debug logs`, 'success');
                } catch (error) {
                  showToast(error instanceof Error ? error.message : 'Unable to clear AI debug logs', 'error');
                } finally {
                  setDebugClearing(false);
                }
              }}
              disabled={debugClearing || debugLogs.length === 0}
              className="inline-flex items-center gap-2 px-3 py-2 bg-red-500/15 hover:bg-red-500/25 disabled:opacity-50 rounded-lg text-red-200"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {debugLogs.length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-700 bg-gray-900/40 p-4 text-sm text-gray-400">
              No AI debug logs yet. Run a test connection or send a chat message on staging, then refresh here.
            </div>
          )}

          {debugLogs.map((item) => {
            const metadata = item.metadata || {};
            const providerName = typeof metadata.provider === 'string' ? metadata.provider : '-';
            const modelName = typeof metadata.model === 'string' ? metadata.model : '-';
            const baseUrl = typeof metadata.baseUrl === 'string' ? metadata.baseUrl : '';
            const wireApi = typeof metadata.wireApi === 'string' ? metadata.wireApi : '';
            const responsePreview = typeof metadata.responsePreview === 'string' ? metadata.responsePreview : '';
            const errorMessage = typeof metadata.errorMessage === 'string' ? metadata.errorMessage : '';
            const errorCause = typeof metadata.errorCause === 'string' ? metadata.errorCause : '';
            const systemPromptChars = typeof metadata.systemPromptChars === 'number' ? metadata.systemPromptChars : null;
            const nonSystemChars = typeof metadata.nonSystemChars === 'number' ? metadata.nonSystemChars : null;
            const messageCount = typeof metadata.messageCount === 'number' ? metadata.messageCount : null;

            return (
              <div key={item.id} className="rounded-lg border border-gray-700 bg-gray-900/50 p-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                  <span className="rounded-full bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-200">{item.metricKey}</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    item.severity === 'error' || item.severity === 'critical'
                      ? 'bg-red-500/15 text-red-200'
                      : item.severity === 'warn'
                        ? 'bg-amber-500/15 text-amber-200'
                        : 'bg-emerald-500/15 text-emerald-200'
                  }`}>
                    {item.severity}
                  </span>
                  <span className="text-gray-400">{new Date(item.createdAt).toLocaleString()}</span>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-300 lg:grid-cols-2">
                  <p><span className="text-gray-500">Provider:</span> {providerName}</p>
                  <p><span className="text-gray-500">Model:</span> {modelName}</p>
                  <p><span className="text-gray-500">Wire API:</span> {wireApi || '-'}</p>
                  <p><span className="text-gray-500">Source:</span> {item.source}</p>
                  {messageCount !== null && <p><span className="text-gray-500">Messages:</span> {messageCount}</p>}
                  {systemPromptChars !== null && <p><span className="text-gray-500">System chars:</span> {systemPromptChars}</p>}
                  {nonSystemChars !== null && <p><span className="text-gray-500">User/history chars:</span> {nonSystemChars}</p>}
                </div>

                {baseUrl && (
                  <p className="mt-2 break-all text-sm text-gray-300">
                    <span className="text-gray-500">Base URL:</span> {baseUrl}
                  </p>
                )}

                {errorMessage && (
                  <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-100">
                    {errorMessage}
                    {errorCause && (
                      <div className="mt-2 text-xs text-red-100/80">{errorCause}</div>
                    )}
                  </div>
                )}

                {responsePreview && !errorMessage && (
                  <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                    {responsePreview}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
