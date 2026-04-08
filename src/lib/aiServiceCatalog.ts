export type AIServiceType = 'openai' | 'openrouter' | 'deepseek' | 'custom-openai';

export interface AIServiceDraft {
    id?: string;
    name: string;
    serviceType: AIServiceType;
    model: string;
    apiKey?: string;
    baseUrl?: string;
}

export interface AIServiceRecord extends Omit<AIServiceDraft, 'id'> {
    id: string;
}

export interface AIServiceSummary {
    id: string;
    name: string;
    serviceType: AIServiceType;
    model: string;
    hasApiKey: boolean;
    baseUrl?: string;
}

export interface AIServicePreset {
    id: AIServiceType;
    label: string;
    defaultName: string;
    keyPlaceholder: string;
    keyUrl?: string;
    defaultBaseUrl?: string;
    description: string;
}

export const AI_SERVICE_PRESETS: AIServicePreset[] = [
    {
        id: 'openai',
        label: 'ChatGPT / OpenAI',
        defaultName: 'ChatGPT',
        keyPlaceholder: 'sk-...',
        keyUrl: 'https://platform.openai.com/api-keys',
        defaultBaseUrl: 'https://api.openai.com/v1',
        description: 'Official OpenAI API. Enter your model manually or fetch it from the service.',
    },
    {
        id: 'openrouter',
        label: 'OpenRouter',
        defaultName: 'OpenRouter',
        keyPlaceholder: 'sk-or-...',
        keyUrl: 'https://openrouter.ai/keys',
        defaultBaseUrl: 'https://openrouter.ai/api/v1',
        description: 'OpenAI-compatible gateway with access to many hosted models.',
    },
    {
        id: 'deepseek',
        label: 'DeepSeek',
        defaultName: 'DeepSeek',
        keyPlaceholder: 'sk-...',
        keyUrl: 'https://platform.deepseek.com/api_keys',
        defaultBaseUrl: 'https://api.deepseek.com',
        description: 'DeepSeek OpenAI-compatible endpoint for chat models.',
    },
    {
        id: 'custom-openai',
        label: 'Custom OpenAI-compatible',
        defaultName: 'My AI Service',
        keyPlaceholder: 'API key',
        defaultBaseUrl: 'https://your-endpoint.example.com/v1',
        description: 'Any OpenAI-compatible API with its own base URL and model name.',
    },
];

export const getAIServicePreset = (serviceType: AIServiceType): AIServicePreset => {
    return AI_SERVICE_PRESETS.find((preset) => preset.id === serviceType) || AI_SERVICE_PRESETS[0];
};

export const getAIServiceBaseUrl = (serviceType: AIServiceType, baseUrl?: string): string => {
    const trimmed = baseUrl?.trim();
    if (trimmed) {
        return trimmed.replace(/\/+$/, '');
    }
    return getAIServicePreset(serviceType).defaultBaseUrl || '';
};

export const getAIServiceModelId = (serviceId: string): string => `service:${serviceId}`;

export const isAIServiceModelId = (modelId: string): boolean => modelId.startsWith('service:');

export const getAIServiceIdFromModelId = (modelId: string): string | null => {
    if (!isAIServiceModelId(modelId)) {
        return null;
    }
    return modelId.slice('service:'.length) || null;
};

export const prettifyModelId = (id: string): string => {
    if (!id) return '';
    return id.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

export const getAIServiceTypeLabel = (serviceType: AIServiceType): string => {
    return getAIServicePreset(serviceType).label;
};
