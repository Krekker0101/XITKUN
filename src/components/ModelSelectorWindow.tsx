import React, { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { AIServiceSummary } from '../lib/aiServiceCatalog';
import { buildRuntimeModelOptions, CustomProviderSummary, RuntimeModelOption } from '../lib/aiModelPresentation';
import { useResolvedTheme } from '../hooks/useResolvedTheme';

const ModelSelectorWindow = () => {
    const isLight = useResolvedTheme() === 'light';
    const [currentModel, setCurrentModel] = useState<string>(() => localStorage.getItem('cached-current-model') || '');
    const [availableModels, setAvailableModels] = useState<RuntimeModelOption[]>(() => {
        try {
            const cached = localStorage.getItem('cached-models');
            return cached ? JSON.parse(cached) : [];
        } catch {
            return [];
        }
    });
    const [isLoading, setIsLoading] = useState<boolean>(() => availableModels.length === 0);

    useEffect(() => {
        const loadModels = async () => {
            try {
                if (availableModels.length === 0) {
                    setIsLoading(true);
                }

                const [services, customProviders, ollamaModels, config] = await Promise.all([
                    window.electronAPI.getAiServices(),
                    window.electronAPI.getCustomProviders() as Promise<CustomProviderSummary[]>,
                    window.electronAPI.getAvailableOllamaModels().catch(() => [] as string[]),
                    window.electronAPI.getCurrentLlmConfig(),
                ]);

                const models = buildRuntimeModelOptions(services as AIServiceSummary[], customProviders || [], ollamaModels || []);
                localStorage.setItem('cached-models', JSON.stringify(models));
                setAvailableModels(models);

                if (config?.model) {
                    setCurrentModel(config.model);
                    localStorage.setItem('cached-current-model', config.model);
                }
            } catch (error) {
                console.error('Failed to load models:', error);
            } finally {
                setIsLoading(false);
            }
        };

        void loadModels();
        window.addEventListener('focus', loadModels);
        const unsubscribe = window.electronAPI.onModelChanged((modelId: string) => setCurrentModel(modelId));
        return () => {
            unsubscribe?.();
            window.removeEventListener('focus', loadModels);
        };
    }, []);

    const handleSelect = (modelId: string) => {
        setCurrentModel(modelId);
        localStorage.setItem('cached-current-model', modelId);
        window.electronAPI.setModel(modelId).catch((error: any) => console.error('Failed to set model:', error));
    };

    const panelClass = isLight
        ? 'bg-[#F3F4F6]/92 border-black/10 shadow-black/10'
        : 'bg-[#1E1E1E]/80 border-white/10 shadow-black/40';

    return (
        <div className="w-fit h-fit bg-transparent flex flex-col">
            <div className={`w-[210px] h-[220px] backdrop-blur-md border rounded-[16px] overflow-hidden shadow-2xl p-2 flex flex-col animate-scale-in origin-top-left ${panelClass}`}>
                {isLoading ? (
                    <div className={`flex items-center justify-center py-4 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        <span className="text-xs">Loading models...</span>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col gap-0.5">
                        {availableModels.length === 0 ? (
                            <div className={`px-4 py-3 text-center text-xs ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                                No models connected.<br />Check Settings.
                            </div>
                        ) : (
                            availableModels.map((model) => {
                                const isSelected = currentModel === model.id;
                                return (
                                    <button
                                        key={model.id}
                                        onClick={() => handleSelect(model.id)}
                                        className={`w-full text-left px-3 py-2 flex items-center justify-between group transition-colors duration-200 rounded-lg ${isSelected ? (isLight ? 'bg-black/[0.07] text-slate-900' : 'bg-white/10 text-white') : (isLight ? 'text-slate-500 hover:bg-black/[0.04] hover:text-slate-800' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200')}`}
                                    >
                                        <span className="text-[12px] font-medium truncate flex-1 min-w-0">{model.name}</span>
                                        {isSelected && <Check className={`w-3.5 h-3.5 shrink-0 ml-2 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />}
                                    </button>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModelSelectorWindow;
