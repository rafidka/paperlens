// Cache management for PaperLens
const CACHE_PREFIX = 'paperlens_';
const LIBRARY_KEY = 'paperlens_library';
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
