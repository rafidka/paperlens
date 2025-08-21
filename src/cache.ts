// Cache management for PaperLens

interface PaperData {
    id: string;
    title: string;
    content: string;
    summary?: string;
    concepts?: string;
    readable?: string;
}

interface LibraryEntry extends PaperData {
    lastAccessed: number;
}

interface CachedPaper extends PaperData {
    cachedAt: number;
    summary?: string;
    concepts?: string;
    readable?: string;
    qaHistory?: QAItem[];
}

interface QAItem {
    question: string;
    answer: string;
}

const CACHE_PREFIX = 'paperlens_';
const LIBRARY_KEY = 'paperlens_library';
const API_KEYS_KEY = 'paperlens_api_keys';

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
        readable: currentPaper?.readable,
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

// API Key management - Single active provider
export interface ActiveProvider {
    provider: 'openai' | 'anthropic' | 'cohere';
    apiKey: string;
}

export function getActiveProvider(): ActiveProvider | null {
    const stored = localStorage.getItem(API_KEYS_KEY);
    return stored ? JSON.parse(stored) : null;
}

export function saveActiveProvider(provider: 'openai' | 'anthropic' | 'cohere', apiKey: string): void {
    const activeProvider: ActiveProvider = { provider, apiKey };
    localStorage.setItem(API_KEYS_KEY, JSON.stringify(activeProvider));
}

export function clearActiveProvider(): void {
    localStorage.removeItem(API_KEYS_KEY);
}

export function hasActiveProvider(): boolean {
    return getActiveProvider() !== null;
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