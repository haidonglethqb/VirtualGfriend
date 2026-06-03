'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Brain, CheckCircle2, Key, RefreshCw, Save, SlidersHorizontal, Trash2, Zap } from 'lucide-react';

type Provider = 'system' | 'groq' | 'codex_router' | 'openai';

interface ProviderInfo {
  label: string;
  baseUrl: string;
  wireApi: string;
  models: string[];
  apiKeyConfigured: boolean;
  maskedKey: string | null;
  keyUpdatedAt?: string;
}

interface AiSettings {
  activeProvider: Provider;
  selectedModels: Record<Exclude<Provider, 'system'>, string>;
  contextLimits: ContextLimits;
  maxContextLimits: ContextLimits;
  providers: Record<Provider, ProviderInfo>;
}

interface ContextLimits {
  messageLimit: number;
  factLimit: number;
  summaryLimit: number;
}

const PROVIDERS: Provider[] = ['system', 'groq', 'codex_router', 'openai'];
const KEY_PROVIDERS: Array<Exclude<Provider, 'system'>> = ['groq', 'codex_router', 'openai'];

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

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const providerInfo = settings?.providers[provider];
  const modelOptions = useMemo(() => providerInfo?.models || [], [providerInfo]);
  const selectedModel = useMemo(() => {
    if (provider === 'system') return modelOptions[0] || 'system';
    return models[provider] || modelOptions[0] || '';
  }, [modelOptions, models, provider]);

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

  async function updateKey(keyProvider: Exclude<Provider, 'system'>, action: 'replace' | 'clear') {
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
      setTestResult(`${json.data.provider} - ${json.data.model}: ${json.data.response || 'ok'}`);
      showToast('AI test succeeded', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'AI test failed', 'error');
    } finally {
      setTesting(false);
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
              onChange={(event) => setProvider(event.target.value as Provider)}
              className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-white"
            >
              {PROVIDERS.map((item) => (
                <option key={item} value={item}>{settings?.providers[item].label || item}</option>
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
    </div>
  );
}
