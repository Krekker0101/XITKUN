import React, { useEffect, useMemo, useState } from 'react';
import {
    AlertCircle,
    Check,
    CheckCircle,
    ChevronDown,
    ExternalLink,
    Loader2,
    PencilLine,
    Plus,
    RefreshCw,
    Save,
    Trash2,
} from 'lucide-react';
import {
    AIServiceDraft,
    AIServiceSummary,
    AIServiceType,
    AI_SERVICE_PRESETS,
    getAIServiceModelId,
    getAIServicePreset,
    getAIServiceTypeLabel,
    prettifyModelId,
} from '../../lib/aiServiceCatalog';

interface ModelOption {
    id: string;
    name: string;
}

interface ModelSelectProps {
    value: string;
    options: ModelOption[];
    onChange: (value: string) => void;
    placeholder?: string;
}

const ModelSelect: React.FC<ModelSelectProps> = ({ value, options, onChange, placeholder = 'Select model' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selected = options.find((option) => option.id === value);

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent-primary flex items-center justify-between hover:bg-bg-elevated transition-colors"
            >
                <span className="truncate pr-2">{selected ? selected.name : placeholder}</span>
                <ChevronDown size={14} className={`text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-bg-elevated border border-border-subtle rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto animated fadeIn">
                    <div className="p-1 space-y-0.5">
                        {options.map((option) => (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => {
                                    onChange(option.id);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-xs rounded-md flex items-center justify-between transition-colors ${value === option.id ? 'bg-bg-input text-text-primary' : 'text-text-secondary hover:bg-bg-input hover:text-text-primary'}`}
                            >
                                <span className="truncate">{option.name}</span>
                                {value === option.id && <Check size={14} className="text-accent-primary shrink-0 ml-2" />}
                            </button>
                        ))}
                        {options.length === 0 && <div className="px-3 py-2 text-xs text-text-tertiary italic">No models loaded yet</div>}
                    </div>
                </div>
            )}
        </div>
    );
};

const createDraft = (serviceType: AIServiceType = 'openrouter'): AIServiceDraft => {
    const preset = getAIServicePreset(serviceType);
    return {
        name: preset.defaultName,
        serviceType,
        model: '',
        apiKey: '',
        baseUrl: preset.defaultBaseUrl || '',
    };
};

export const AIProvidersSettings: React.FC = () => {
    const [aiServices, setAiServices] = useState<AIServiceSummary[]>([]);
    const [ollamaModels, setOllamaModels] = useState<string[]>([]);
    const [defaultModel, setDefaultModel] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
    const [draft, setDraft] = useState<AIServiceDraft>(createDraft());
    const [hasStoredKey, setHasStoredKey] = useState(false);
    const [serviceModels, setServiceModels] = useState<Array<{ id: string; label: string }>>([]);
    const [isFetchingModels, setIsFetchingModels] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isRefreshingOllama, setIsRefreshingOllama] = useState(false);
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [errorText, setErrorText] = useState('');

    const preset = getAIServicePreset(draft.serviceType);

    const defaultOptions = useMemo<ModelOption[]>(() => {
        const options: ModelOption[] = aiServices.map((service) => ({
            id: getAIServiceModelId(service.id),
            name: `${service.name} • ${service.model}`,
        }));
        ollamaModels.forEach((model) => {
            options.push({ id: `ollama-${model}`, name: `${model} (Local)` });
        });
        if (defaultModel && !options.find((option) => option.id === defaultModel)) {
            options.unshift({ id: defaultModel, name: prettifyModelId(defaultModel) });
        }
        return options;
    }, [aiServices, defaultModel, ollamaModels]);

    const fetchedModelOptions = useMemo<ModelOption[]>(
        () => serviceModels.map((model) => ({ id: model.id, name: model.label })),
        [serviceModels]
    );

    const loadData = async () => {
        const [services, storedDefault, detectedOllamaModels] = await Promise.all([
            window.electronAPI.getAiServices(),
            window.electronAPI.getDefaultModel(),
            window.electronAPI.getAvailableOllamaModels().catch(() => [] as string[]),
        ]);
        setAiServices(services || []);
        setDefaultModel(storedDefault.model || '');
        setOllamaModels(detectedOllamaModels || []);
    };

    useEffect(() => {
        void loadData();
        const unsubscribe = window.electronAPI.onModelChanged((modelId: string) => setDefaultModel(modelId));
        return () => unsubscribe();
    }, []);

    const resetEditor = (serviceType: AIServiceType = 'openrouter') => {
        setIsEditing(false);
        setEditingServiceId(null);
        setDraft(createDraft(serviceType));
        setHasStoredKey(false);
        setServiceModels([]);
        setTestStatus('idle');
        setErrorText('');
        setIsFetchingModels(false);
    };

    const updateDraft = <K extends keyof AIServiceDraft>(key: K, value: AIServiceDraft[K]) => {
        setDraft((current) => ({ ...current, [key]: value }));
    };

    const changeServiceType = (serviceType: AIServiceType) => {
        const nextPreset = getAIServicePreset(serviceType);
        setDraft((current) => {
            const previousPreset = getAIServicePreset(current.serviceType);
            const replaceName = !current.name.trim() || current.name.trim() === previousPreset.defaultName;
            const replaceBaseUrl = !current.baseUrl?.trim() || current.baseUrl.trim() === (previousPreset.defaultBaseUrl || '');
            return {
                ...current,
                serviceType,
                name: replaceName ? nextPreset.defaultName : current.name,
                baseUrl: replaceBaseUrl ? (nextPreset.defaultBaseUrl || '') : current.baseUrl,
            };
        });
        setServiceModels([]);
        setTestStatus('idle');
        setErrorText('');
    };

    const beginCreate = () => {
        setIsEditing(true);
        setEditingServiceId(null);
        setDraft(createDraft());
        setHasStoredKey(false);
        setServiceModels([]);
        setTestStatus('idle');
        setErrorText('');
    };

    const beginEdit = (service: AIServiceSummary) => {
        setIsEditing(true);
        setEditingServiceId(service.id);
        setDraft({
            id: service.id,
            name: service.name,
            serviceType: service.serviceType,
            model: service.model,
            apiKey: '',
            baseUrl: service.baseUrl || getAIServicePreset(service.serviceType).defaultBaseUrl || '',
        });
        setHasStoredKey(service.hasApiKey);
        setServiceModels([]);
        setTestStatus('idle');
        setErrorText('');
    };

    const testService = async (service: Partial<AIServiceDraft> & { id?: string }) => {
        setTestStatus('testing');
        setErrorText('');
        try {
            const result = await window.electronAPI.testAiService(service);
            if (result.success) {
                setTestStatus('success');
                setTimeout(() => setTestStatus('idle'), 2500);
                return;
            }
            setTestStatus('error');
            setErrorText(result.error || 'Connection failed.');
        } catch (error: any) {
            setTestStatus('error');
            setErrorText(error.message || 'Connection failed.');
        }
    };

    const fetchModels = async () => {
        setIsFetchingModels(true);
        setErrorText('');
        try {
            const result = await window.electronAPI.fetchAiServiceModels(draft);
            if (!result.success || !result.models) {
                setErrorText(result.error || 'Could not fetch models.');
                return;
            }
            setServiceModels(result.models);
            if (!draft.model.trim() && result.models[0]) {
                updateDraft('model', result.models[0].id);
            }
        } catch (error: any) {
            setErrorText(error.message || 'Could not fetch models.');
        } finally {
            setIsFetchingModels(false);
        }
    };

    const saveService = async () => {
        setErrorText('');
        if (!draft.name.trim()) return setErrorText('Service name is required.');
        if (!draft.model.trim()) return setErrorText('Model name is required.');
        if (!draft.baseUrl?.trim()) return setErrorText('Base URL is required.');
        if (!editingServiceId && !draft.apiKey?.trim()) return setErrorText('API key is required for a new service.');

        setIsSaving(true);
        try {
            const result = await window.electronAPI.saveAiService(draft);
            if (!result.success) {
                setErrorText(result.error || 'Could not save the service.');
                return;
            }

            const runtimeId = result.id ? getAIServiceModelId(result.id) : '';
            await loadData();

            if (!defaultModel || defaultModel === runtimeId || defaultModel === getAIServiceModelId(editingServiceId || '')) {
                if (runtimeId) {
                    await window.electronAPI.setDefaultModel(runtimeId);
                    setDefaultModel(runtimeId);
                }
            }

            resetEditor(draft.serviceType);
        } catch (error: any) {
            setErrorText(error.message || 'Could not save the service.');
        } finally {
            setIsSaving(false);
        }
    };

    const deleteService = async (service: AIServiceSummary) => {
        if (!confirm(`Delete AI service "${service.name}"?`)) return;
        await window.electronAPI.deleteAiService(service.id);
        await loadData();
    };

    const refreshOllama = async () => {
        setIsRefreshingOllama(true);
        try {
            const models = await window.electronAPI.getAvailableOllamaModels();
            setOllamaModels(models || []);
        } finally {
            setTimeout(() => setIsRefreshingOllama(false), 300);
        }
    };

    return (
        <div className="space-y-5 animated fadeIn pb-10">
            <div className="space-y-5">
                <div>
                    <h3 className="text-sm font-bold text-text-primary mb-1">Default AI Model</h3>
                    <p className="text-xs text-text-secondary mb-2">Choose which configured service or local Ollama model should answer by default.</p>
                </div>
                <div className="bg-bg-item-surface rounded-xl p-5 border border-border-subtle flex items-center justify-between gap-4">
                    <div>
                        <label className="block text-xs font-medium text-text-primary uppercase tracking-wide mb-0">Active Model</label>
                        <p className="text-[10px] text-text-secondary">Only services you added yourself and detected local Ollama models appear here.</p>
                    </div>
                    <div className="w-72 max-w-full">
                        <ModelSelect
                            value={defaultModel}
                            options={defaultOptions}
                            onChange={(value) => {
                                setDefaultModel(value);
                                void window.electronAPI.setDefaultModel(value).catch(console.error);
                            }}
                            placeholder="Add a service first"
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-text-primary mb-1">AI Services</h3>
                        <p className="text-xs text-text-secondary">Add ChatGPT, OpenRouter, DeepSeek or any OpenAI-compatible API with your own key and model.</p>
                    </div>
                    {!isEditing && (
                        <button type="button" onClick={beginCreate} className="flex items-center gap-2 px-3 py-1.5 bg-bg-input hover:bg-bg-elevated border border-border-subtle rounded-lg text-xs font-medium text-text-primary transition-colors">
                            <Plus size={14} />
                            Add Service
                        </button>
                    )}
                </div>

                {isEditing && (
                    <div className="bg-bg-item-surface rounded-xl p-5 border border-border-subtle animated fadeIn">
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <div>
                                <h4 className="text-sm font-bold text-text-primary">{editingServiceId ? 'Edit AI Service' : 'New AI Service'}</h4>
                                <p className="text-xs text-text-secondary mt-1">{preset.description}</p>
                            </div>
                            {preset.keyUrl && (
                                <button type="button" onClick={() => void window.electronAPI.openExternal(preset.keyUrl!)} className="text-xs text-text-tertiary hover:text-text-primary flex items-center gap-1 transition-colors">
                                    <span className="text-[10px] uppercase tracking-wide">Get Key</span>
                                    <ExternalLink size={12} />
                                </button>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-text-primary uppercase tracking-wide mb-1">Service Type</label>
                                    <select value={draft.serviceType} onChange={(event) => changeServiceType(event.target.value as AIServiceType)} className="w-full bg-bg-input border border-border-subtle rounded-lg px-4 py-2.5 text-xs text-text-primary focus:outline-none focus:border-accent-primary transition-colors">
                                        {AI_SERVICE_PRESETS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-text-primary uppercase tracking-wide mb-1">Display Name</label>
                                    <input type="text" value={draft.name} onChange={(event) => updateDraft('name', event.target.value)} placeholder={preset.defaultName} className="w-full bg-bg-input border border-border-subtle rounded-lg px-4 py-2.5 text-xs text-text-primary focus:outline-none focus:border-accent-primary transition-colors" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-text-primary uppercase tracking-wide mb-1">Base URL</label>
                                    <input type="text" value={draft.baseUrl || ''} onChange={(event) => updateDraft('baseUrl', event.target.value)} placeholder={preset.defaultBaseUrl || 'https://your-endpoint.example.com/v1'} className="w-full bg-bg-input border border-border-subtle rounded-lg px-4 py-2.5 text-xs text-text-primary focus:outline-none focus:border-accent-primary transition-colors font-mono" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-text-primary uppercase tracking-wide mb-1">
                                        API Key
                                        {hasStoredKey && <span className="ml-2 text-green-500 normal-case">Stored on device</span>}
                                    </label>
                                    <input type="password" value={draft.apiKey || ''} onChange={(event) => updateDraft('apiKey', event.target.value)} placeholder={hasStoredKey ? 'Leave empty to keep saved key' : preset.keyPlaceholder} className="w-full bg-bg-input border border-border-subtle rounded-lg px-4 py-2.5 text-xs text-text-primary focus:outline-none focus:border-accent-primary transition-colors" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
                                <div>
                                    <label className="block text-xs font-medium text-text-primary uppercase tracking-wide mb-1">Model Name</label>
                                    <input type="text" value={draft.model} onChange={(event) => updateDraft('model', event.target.value)} placeholder="gpt-4.1-mini / deepseek-chat / openai/gpt-4.1-mini" className="w-full bg-bg-input border border-border-subtle rounded-lg px-4 py-2.5 text-xs text-text-primary focus:outline-none focus:border-accent-primary transition-colors font-mono" />
                                </div>
                                <button type="button" onClick={fetchModels} disabled={isFetchingModels} className={`px-4 py-2.5 rounded-lg text-xs font-medium transition-colors border border-border-subtle flex items-center justify-center gap-2 ${isFetchingModels ? 'bg-bg-input text-text-secondary' : 'bg-accent-primary/10 text-accent-primary border-accent-primary/20 hover:bg-accent-primary/20'}`}>
                                    {isFetchingModels ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                    {isFetchingModels ? 'Loading...' : 'Fetch Models'}
                                </button>
                            </div>

                            {fetchedModelOptions.length > 0 && (
                                <div>
                                    <label className="block text-xs font-medium text-text-primary uppercase tracking-wide mb-1">Detected Models</label>
                                    <ModelSelect value={draft.model} options={fetchedModelOptions} onChange={(value) => updateDraft('model', value)} placeholder="Select a detected model" />
                                </div>
                            )}

                            <div className="flex items-center justify-between gap-3 pt-2">
                                <button type="button" onClick={() => void testService(draft)} disabled={testStatus === 'testing'} className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors border border-border-subtle flex items-center gap-2 ${testStatus === 'success' ? 'bg-green-500/10 text-green-500 border-green-500/20' : testStatus === 'error' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-bg-input hover:bg-bg-elevated text-text-primary'}`}>
                                    {testStatus === 'testing' && <Loader2 size={14} className="animate-spin" />}
                                    {testStatus === 'success' && <CheckCircle size={14} />}
                                    {testStatus === 'error' && <AlertCircle size={14} />}
                                    {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                                </button>
                                <div className="flex items-center gap-3">
                                    <button type="button" onClick={() => resetEditor(draft.serviceType)} className="px-4 py-2 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-input transition-colors">Cancel</button>
                                    <button type="button" onClick={saveService} disabled={isSaving} className="px-4 py-2 rounded-lg text-xs font-medium bg-accent-primary text-white hover:bg-accent-secondary transition-colors flex items-center gap-2 disabled:opacity-60">
                                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                        {isSaving ? 'Saving...' : 'Save Service'}
                                    </button>
                                </div>
                            </div>

                            {errorText && (
                                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
                                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                    <span>{errorText}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {!isEditing && (
                    <div className="space-y-3">
                        {aiServices.length === 0 ? (
                            <div className="text-center py-8 bg-bg-item-surface rounded-xl border border-border-subtle border-dashed">
                                <p className="text-xs text-text-tertiary">No API services added yet.</p>
                            </div>
                        ) : (
                            aiServices.map((service) => {
                                const runtimeId = getAIServiceModelId(service.id);
                                const isDefault = defaultModel === runtimeId;
                                return (
                                    <div key={service.id} className="bg-bg-item-surface rounded-xl p-4 border border-border-subtle flex items-center justify-between gap-4">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="text-sm font-medium text-text-primary">{service.name}</h4>
                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-bg-input text-text-secondary border border-border-subtle">{getAIServiceTypeLabel(service.serviceType)}</span>
                                                {isDefault && <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-green-500/10 text-green-500 border border-green-500/20">Default</span>}
                                            </div>
                                            <p className="text-[11px] text-text-secondary font-mono mt-1 truncate">{service.model}</p>
                                            <p className="text-[10px] text-text-tertiary mt-1">{service.hasApiKey ? 'API key saved on this device' : 'API key missing'}</p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button type="button" onClick={() => { setDefaultModel(runtimeId); void window.electronAPI.setDefaultModel(runtimeId).catch(console.error); }} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-bg-input hover:bg-bg-elevated border border-border-subtle text-text-primary transition-colors">Use</button>
                                            <button type="button" onClick={() => void testService({ id: service.id })} className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-input transition-colors" title="Test connection"><CheckCircle size={14} /></button>
                                            <button type="button" onClick={() => beginEdit(service)} className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-input transition-colors" title="Edit"><PencilLine size={14} /></button>
                                            <button type="button" onClick={() => void deleteService(service)} className="p-2 rounded-lg text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>

            <div className="space-y-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-text-primary mb-1">Local Models (Ollama)</h3>
                        <p className="text-xs text-text-secondary">If a model is already downloaded in Ollama, it will appear here automatically and work offline.</p>
                    </div>
                    <button type="button" onClick={refreshOllama} className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-input transition-colors" title="Refresh Ollama models" disabled={isRefreshingOllama}>
                        <RefreshCw size={18} className={isRefreshingOllama ? 'animate-spin' : ''} />
                    </button>
                </div>
                <div className="bg-bg-item-surface rounded-xl p-5 border border-border-subtle">
                    {ollamaModels.length > 0 ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs text-green-400 mb-3">
                                <CheckCircle size={14} />
                                <span>{ollamaModels.length} local model{ollamaModels.length > 1 ? 's' : ''} detected</span>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {ollamaModels.map((model) => (
                                    <div key={model} className="flex items-center justify-between p-2 bg-bg-input rounded-lg border border-border-subtle">
                                        <span className="text-xs text-text-primary font-mono">{model}</span>
                                        <button type="button" onClick={() => { const runtimeId = `ollama-${model}`; setDefaultModel(runtimeId); void window.electronAPI.setDefaultModel(runtimeId).catch(console.error); }} className="text-[10px] px-2 py-1 rounded border border-border-subtle hover:bg-bg-elevated transition-colors">Use</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-text-secondary">No local Ollama models detected right now. If you download one later, it will appear here automatically.</p>
                    )}
                </div>
            </div>
        </div>
    );
};
