// Cache management for PaperLens

interface PaperData {
    id: string;
    title: string;
    content: string;
    summary?: string;
    concepts?: string;
    accessible?: string;
}

interface LibraryEntry extends PaperData {
    lastAccessed: number;
}

interface CachedPaper extends PaperData {
    cachedAt: number;
    summary?: string;
    concepts?: string;
    accessible?: string;
    qaHistory?: QAItem[];
}

interface QAItem {
    question: string;
    answer: string;
}

const CACHE_PREFIX = 'paperlens_';
const LIBRARY_KEY = 'paperlens_library';
const API_KEYS_KEY = 'paperlens_api_keys';
const ACTIVE_PROVIDER_KEY = 'paperlens_active_provider';

export function getCacheKey(arxivId: string): string {
    return CACHE_PREFIX + arxivId;
}

export function getLibrary(): LibraryEntry[] {
    const library = localStorage.getItem(LIBRARY_KEY);
    return library ? JSON.parse(library) : [];
}

export function updateLibrary(paperData: PaperData): void {
    let library = getLibrary();
    const existingIndex = library.findIndex(p => p.id === paperData.id);
    
    if (existingIndex >= 0) {
        library[existingIndex] = { ...library[existingIndex], ...paperData, lastAccessed: Date.now() };
    } else {
        library.push({ ...paperData, lastAccessed: Date.now() });
    }
    
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
}

export function removeFromLibrary(arxivId: string): void {
    let library = getLibrary();
    library = library.filter(p => p.id !== arxivId);
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
}

export function cachePaper(paperData: PaperData, currentPaper: PaperData | null, qaHistory: QAItem[]): void {
    const cacheKey = getCacheKey(paperData.id);
    const cacheData: CachedPaper = {
        ...paperData,
        cachedAt: Date.now(),
        summary: currentPaper?.summary,
        concepts: currentPaper?.concepts,
        accessible: currentPaper?.accessible,
        qaHistory: qaHistory.length > 0 ? qaHistory : undefined
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    updateLibrary(paperData);
}

export function getCachedPaper(arxivId: string): CachedPaper | null {
    const cacheKey = getCacheKey(arxivId);
    const cached = localStorage.getItem(cacheKey);
    return cached ? JSON.parse(cached) : null;
}

export function deleteCachedPaper(arxivId: string): void {
    const cacheKey = getCacheKey(arxivId);
    localStorage.removeItem(cacheKey);
    removeFromLibrary(arxivId);
}

export function clearAllCache(): void {
    const library = getLibrary();
    library.forEach(paper => {
        localStorage.removeItem(getCacheKey(paper.id));
    });
    localStorage.removeItem(LIBRARY_KEY);
}

// API Key management - Multiple providers with active selection
export interface SavedApiKeys {
    [provider: string]: string; // provider -> apiKey
}

export interface ActiveProvider {
    provider: 'openai' | 'anthropic' | 'cohere';
    apiKey: string;
}

export function getSavedApiKeys(): SavedApiKeys {
    const stored = localStorage.getItem(API_KEYS_KEY);
    return stored ? JSON.parse(stored) : {};
}

export function saveApiKey(provider: 'openai' | 'anthropic' | 'cohere', apiKey: string): void {
    const savedKeys = getSavedApiKeys();
    savedKeys[provider] = apiKey;
    localStorage.setItem(API_KEYS_KEY, JSON.stringify(savedKeys));
}

export function removeApiKey(provider: 'openai' | 'anthropic' | 'cohere'): void {
    const savedKeys = getSavedApiKeys();
    delete savedKeys[provider];
    localStorage.setItem(API_KEYS_KEY, JSON.stringify(savedKeys));
    
    // If the removed key was the active one, clear active provider
    const activeProvider = getActiveProvider();
    if (activeProvider && activeProvider.provider === provider) {
        clearActiveProvider();
    }
}

export function getActiveProvider(): ActiveProvider | null {
    const stored = localStorage.getItem(ACTIVE_PROVIDER_KEY);
    if (!stored) return null;
    
    const activeProvider = JSON.parse(stored);
    const savedKeys = getSavedApiKeys();
    
    // Verify the active provider still has a saved key
    if (savedKeys[activeProvider.provider]) {
        return {
            provider: activeProvider.provider,
            apiKey: savedKeys[activeProvider.provider]
        };
    }
    
    // If not, clear the invalid active provider
    clearActiveProvider();
    return null;
}

export function setActiveProvider(provider: 'openai' | 'anthropic' | 'cohere'): void {
    const savedKeys = getSavedApiKeys();
    if (savedKeys[provider]) {
        localStorage.setItem(ACTIVE_PROVIDER_KEY, JSON.stringify({ provider }));
    }
}

export function clearActiveProvider(): void {
    localStorage.removeItem(ACTIVE_PROVIDER_KEY);
}

export function clearAllKeys(): void {
    localStorage.removeItem(API_KEYS_KEY);
    localStorage.removeItem(ACTIVE_PROVIDER_KEY);
}

export function hasActiveProvider(): boolean {
    return getActiveProvider() !== null;
}

export function hasSavedKeys(): boolean {
    const savedKeys = getSavedApiKeys();
    return Object.keys(savedKeys).length > 0;
}

// Streaming preference
const STREAMING_KEY = 'paperlens_streaming_enabled';

export function getStreamingEnabled(): boolean {
    const stored = localStorage.getItem(STREAMING_KEY);
    return stored === 'true'; // Default to false
}

export function setStreamingEnabled(enabled: boolean): void {
    localStorage.setItem(STREAMING_KEY, enabled.toString());
}