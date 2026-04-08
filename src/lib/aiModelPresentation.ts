import { AIServiceSummary, getAIServiceIdFromModelId, prettifyModelId } from './aiServiceCatalog';

export interface CustomProviderSummary {
    id: string;
    name: string;
}

export interface RuntimeModelOption {
    id: string;
    name: string;
    type: 'service' | 'custom' | 'local' | 'legacy';
}

const LEGACY_LABELS: Record<string, string> = {
    'gemini-3.1-flash-lite-preview': 'Gemini 3.1 Flash',
    'gemini-3.1-pro-preview': 'Gemini 3.1 Pro',
    'llama-3.3-70b-versatile': 'Groq Llama 3.3',
    'gpt-5.4': 'GPT 5.4',
    'claude-sonnet-4-6': 'Claude Sonnet 4.6',
};

export const formatRuntimeModelLabel = (
    modelId: string,
    aiServices: AIServiceSummary[] = [],
    customProviders: CustomProviderSummary[] = []
): string => {
    if (!modelId) return '';

    const serviceId = getAIServiceIdFromModelId(modelId);
    if (serviceId) {
        const service = aiServices.find((item) => item.id === serviceId);
        return service ? service.name : prettifyModelId(modelId.replace(/^service:/, ''));
    }

    if (modelId.startsWith('ollama-')) {
        return modelId.replace(/^ollama-/, '');
    }

    const custom = customProviders.find((provider) => provider.id === modelId);
    if (custom) {
        return custom.name;
    }

    return LEGACY_LABELS[modelId] || prettifyModelId(modelId);
};

export const buildRuntimeModelOptions = (
    aiServices: AIServiceSummary[] = [],
    customProviders: CustomProviderSummary[] = [],
    ollamaModels: string[] = []
): RuntimeModelOption[] => {
    const options: RuntimeModelOption[] = [];

    aiServices.forEach((service) => {
        options.push({
            id: `service:${service.id}`,
            name: `${service.name} • ${service.model}`,
            type: 'service',
        });
    });

    customProviders.forEach((provider) => {
        options.push({
            id: provider.id,
            name: provider.name,
            type: 'custom',
        });
    });

    ollamaModels.forEach((model) => {
        options.push({
            id: `ollama-${model}`,
            name: `${model} (Local)`,
            type: 'local',
        });
    });

    return options;
};
