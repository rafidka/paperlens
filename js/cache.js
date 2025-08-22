// Cache management for PaperLens
const CACHE_PREFIX = 'paperlens_';
const LIBRARY_KEY = 'paperlens_library';
const API_KEYS_KEY = 'paperlens_api_keys';
const ACTIVE_PROVIDER_KEY = 'paperlens_active_provider';
export function getCacheKey(arxivId) {
    return CACHE_PREFIX + arxivId;
}
export function getLibrary() {
    const library = localStorage.getItem(LIBRARY_KEY);
    return library ? JSON.parse(library) : [];
}
export function updateLibrary(paperData) {
    let library = getLibrary();
    const existingIndex = library.findIndex(p => p.id === paperData.id);
    if (existingIndex >= 0) {
        library[existingIndex] = { ...library[existingIndex], ...paperData, lastAccessed: Date.now() };
    }
    else {
        library.push({ ...paperData, lastAccessed: Date.now() });
    }
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
}
export function removeFromLibrary(arxivId) {
    let library = getLibrary();
    library = library.filter(p => p.id !== arxivId);
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
}
export function cachePaper(paperData, currentPaper, qaHistory) {
    const cacheKey = getCacheKey(paperData.id);
    const cacheData = {
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
export function getCachedPaper(arxivId) {
    const cacheKey = getCacheKey(arxivId);
    const cached = localStorage.getItem(cacheKey);
    return cached ? JSON.parse(cached) : null;
}
export function deleteCachedPaper(arxivId) {
    const cacheKey = getCacheKey(arxivId);
    localStorage.removeItem(cacheKey);
    removeFromLibrary(arxivId);
}
export function clearAllCache() {
    const library = getLibrary();
    library.forEach(paper => {
        localStorage.removeItem(getCacheKey(paper.id));
    });
    localStorage.removeItem(LIBRARY_KEY);
}
export function getSavedApiKeys() {
    const stored = localStorage.getItem(API_KEYS_KEY);
    return stored ? JSON.parse(stored) : {};
}
export function saveApiKey(provider, apiKey) {
    const savedKeys = getSavedApiKeys();
    savedKeys[provider] = apiKey;
    localStorage.setItem(API_KEYS_KEY, JSON.stringify(savedKeys));
}
export function removeApiKey(provider) {
    const savedKeys = getSavedApiKeys();
    delete savedKeys[provider];
    localStorage.setItem(API_KEYS_KEY, JSON.stringify(savedKeys));
    // If the removed key was the active one, clear active provider
    const activeProvider = getActiveProvider();
    if (activeProvider && activeProvider.provider === provider) {
        clearActiveProvider();
    }
}
export function getActiveProvider() {
    const stored = localStorage.getItem(ACTIVE_PROVIDER_KEY);
    if (!stored)
        return null;
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
export function setActiveProvider(provider) {
    const savedKeys = getSavedApiKeys();
    if (savedKeys[provider]) {
        localStorage.setItem(ACTIVE_PROVIDER_KEY, JSON.stringify({ provider }));
    }
}
export function clearActiveProvider() {
    localStorage.removeItem(ACTIVE_PROVIDER_KEY);
}
export function clearAllKeys() {
    localStorage.removeItem(API_KEYS_KEY);
    localStorage.removeItem(ACTIVE_PROVIDER_KEY);
}
export function hasActiveProvider() {
    return getActiveProvider() !== null;
}
export function hasSavedKeys() {
    const savedKeys = getSavedApiKeys();
    return Object.keys(savedKeys).length > 0;
}
// Streaming preference
const STREAMING_KEY = 'paperlens_streaming_enabled';
export function getStreamingEnabled() {
    const stored = localStorage.getItem(STREAMING_KEY);
    return stored === 'true'; // Default to false
}
export function setStreamingEnabled(enabled) {
    localStorage.setItem(STREAMING_KEY, enabled.toString());
}
