import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Server, Settings2, Terminal } from 'lucide-react';
import { AIServiceSummary } from '../../lib/aiServiceCatalog';
import { buildRuntimeModelOptions, CustomProviderSummary, formatRuntimeModelLabel, RuntimeModelOption } from '../../lib/aiModelPresentation';

interface ModelSelectorProps {
    currentModel: string;
    onSelectModel: (model: string) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ currentModel, onSelectModel }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<RuntimeModelOption[]>([]);
    const [aiServices, setAiServices] = useState<AIServiceSummary[]>([]);
    const [customProviders, setCustomProviders] = useState<CustomProviderSummary[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const load = async () => {
            try {
                const [services, custom, ollamaModels] = await Promise.all([
                    window.electronAPI.getAiServices(),
                    window.electronAPI.getCustomProviders() as Promise<CustomProviderSummary[]>,
                    window.electronAPI.getAvailableOllamaModels(),
                ]);
                setAiServices(services as AIServiceSummary[]);
                setCustomProviders(custom || []);
                setOptions(buildRuntimeModelOptions(services as AIServiceSummary[], custom || [], ollamaModels || []));
            } catch (error) {
                console.error('Failed to load model options:', error);
                setOptions([]);
            }
        };

        if (isOpen || options.length === 0) {
            void load();
        }
    }, [isOpen]);

    const grouped = {
        service: options.filter((option) => option.type === 'service'),
        custom: options.filter((option) => option.type === 'custom'),
        local: options.filter((option) => option.type === 'local'),
    };

    const renderGroup = (title: string, items: RuntimeModelOption[], icon: React.ReactNode) => {
        if (items.length === 0) return null;
        return (
            <div className="space-y-1">
                <div className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-[0.16em] text-text-tertiary flex items-center gap-2">
                    {icon}
                    <span>{title}</span>
                </div>
                {items.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => {
                            onSelectModel(item.id);
                            setIsOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors group ${currentModel === item.id ? 'bg-accent-primary/10' : 'hover:bg-bg-input'}`}
                    >
                        <div className="text-left">
                            <div className={`text-xs font-medium truncate max-w-[180px] ${currentModel === item.id ? 'text-accent-primary' : 'text-text-primary'}`}>{item.name}</div>
                        </div>
                        {currentModel === item.id && <Check size={14} className="text-accent-primary" />}
                    </button>
                ))}
            </div>
        );
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-bg-input hover:bg-bg-elevated border border-border-subtle rounded-lg transition-colors text-xs font-medium text-text-primary max-w-[190px]"
            >
                <span className="truncate">{formatRuntimeModelLabel(currentModel, aiServices, customProviders)}</span>
                <ChevronDown size={14} className={`shrink-0 text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-72 bg-bg-item-surface border border-border-subtle rounded-xl shadow-xl z-50 overflow-hidden animated fadeIn">
                    <div className="p-2 max-h-72 overflow-y-auto space-y-2">
                        {renderGroup('AI Services', grouped.service, <Settings2 size={12} />)}
                        {renderGroup('Custom', grouped.custom, <Terminal size={12} />)}
                        {renderGroup('Local Ollama', grouped.local, <Server size={12} />)}
                        {options.length === 0 && (
                            <div className="text-center py-6 text-text-tertiary">
                                <p className="text-xs mb-2">No models available.</p>
                                <p className="text-[10px] opacity-70">Add an AI service in Settings or install an Ollama model.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
