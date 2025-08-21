// UI management and DOM manipulation for PaperLens
import { getLibrary, getCachedPaper, deleteCachedPaper, clearAllCache, getActiveProvider, saveActiveProvider, clearActiveProvider, hasActiveProvider, getStreamingEnabled, setStreamingEnabled } from "./cache.js";
export function showError(message) {
    const container = document.getElementById("error-container");
    if (container) {
        container.innerHTML = `<div class="error">${message}</div>`;
        setTimeout(() => (container.innerHTML = ""), 5000);
    }
}
export function showSuccess(message) {
    const container = document.getElementById("error-container");
    if (container) {
        container.innerHTML = `<div class="success">${message}</div>`;
        setTimeout(() => (container.innerHTML = ""), 3000);
    }
}
export function showLoading(show = true) {
    const loading = document.getElementById("loading");
    const paperSection = document.getElementById("paper-section");
    if (loading)
        loading.style.display = show ? "block" : "none";
    if (paperSection)
        paperSection.style.display = show ? "none" : "block";
}
export function resetGeneratedContent() {
    ["summary-content", "concepts-content", "readable-content"].forEach((id) => {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = "none";
            element.textContent = "";
        }
    });
    const qaHistory = document.getElementById("qa-history");
    const qaInput = document.getElementById("qa-input");
    if (qaHistory) {
        qaHistory.style.display = "none";
        qaHistory.innerHTML = "";
    }
    if (qaInput) {
        qaInput.value = "";
    }
}
export function showTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll(".tab-content").forEach((tab) => {
        tab.classList.remove("active");
    });
    // Remove active class from all tabs
    document.querySelectorAll(".tab").forEach((tab) => {
        tab.classList.remove("active");
    });
    // Show selected tab content
    const targetTab = document.getElementById(`${tabName}-tab`);
    const clickedButton = event?.target;
    if (targetTab)
        targetTab.classList.add("active");
    if (clickedButton)
        clickedButton.classList.add("active");
}
export function updateCacheStatus(arxivId) {
    const statusElement = document.getElementById("cache-status");
    if (!statusElement || !arxivId) {
        if (statusElement)
            statusElement.style.display = "none";
        return;
    }
    const cached = getCachedPaper(arxivId);
    statusElement.style.display = "inline-block";
    if (cached) {
        statusElement.className = "cache-status cached";
        statusElement.textContent = "✓ Cached";
    }
    else {
        statusElement.className = "cache-status not-cached";
        statusElement.textContent = "○ Not cached";
    }
}
export function loadFromCache(cached, callback) {
    const currentPaper = {
        id: cached.id,
        title: cached.title,
        content: cached.content,
        summary: cached.summary,
        concepts: cached.concepts,
        readable: cached.readable,
    };
    const qaHistory = cached.qaHistory || [];
    // Update UI elements
    const paperTitle = document.getElementById("paper-title");
    const originalContent = document.getElementById("original-content");
    if (paperTitle)
        paperTitle.textContent = currentPaper.title;
    if (originalContent)
        originalContent.textContent = currentPaper.content;
    // Load cached AI-generated content
    if (cached.summary) {
        const summaryContent = document.getElementById("summary-content");
        if (summaryContent) {
            summaryContent.innerHTML = renderMarkdown(cached.summary);
            summaryContent.style.display = "block";
        }
    }
    if (cached.concepts) {
        const conceptsContent = document.getElementById("concepts-content");
        if (conceptsContent) {
            conceptsContent.innerHTML = renderMarkdown(cached.concepts);
            conceptsContent.style.display = "block";
        }
    }
    if (cached.readable) {
        const readableContent = document.getElementById("readable-content");
        if (readableContent) {
            readableContent.innerHTML = renderMarkdown(cached.readable);
            readableContent.style.display = "block";
        }
    }
    updateQAHistory(qaHistory);
    const paperSection = document.getElementById("paper-section");
    if (paperSection)
        paperSection.style.display = "block";
    showSuccess("Paper loaded from cache!");
    updateCacheStatus(cached.id);
    // Call callback to update app state
    if (callback) {
        callback(currentPaper, qaHistory);
    }
    return { currentPaper, qaHistory };
}
// Helper function to render markdown
function renderMarkdown(content) {
    // @ts-ignore - marked is loaded via CDN
    return marked.parse(content);
}
export function updateQAHistory(qaHistory) {
    const historyDiv = document.getElementById("qa-history");
    if (!historyDiv)
        return;
    if (qaHistory.length === 0) {
        historyDiv.style.display = "none";
        return;
    }
    historyDiv.style.display = "block";
    historyDiv.innerHTML = qaHistory
        .map((item) => `
        <div class="qa-item">
            <div class="qa-question">Q: ${item.question}</div>
            <div class="qa-answer">A: ${renderMarkdown(item.answer)}</div>
        </div>
    `)
        .join("");
    historyDiv.scrollTop = historyDiv.scrollHeight;
}
export function showLibrary() {
    const container = document.getElementById("library-container");
    const grid = document.getElementById("library-grid");
    if (!container || !grid)
        return;
    if (container.style.display === "block") {
        container.style.display = "none";
        return;
    }
    const library = getLibrary();
    if (library.length === 0) {
        grid.innerHTML =
            '<p style="grid-column: 1/-1; text-align: center; color: #7f8c8d; padding: 20px;">No cached papers found</p>';
    }
    else {
        grid.innerHTML = library
            .sort((a, b) => b.lastAccessed - a.lastAccessed)
            .map((paper) => {
            const cached = getCachedPaper(paper.id);
            const badges = [];
            if (cached?.summary)
                badges.push("Sum");
            if (cached?.concepts)
                badges.push("Con");
            if (cached?.readable)
                badges.push("Read");
            if (cached?.qaHistory?.length && cached.qaHistory.length > 0) {
                badges.push(`Q&A(${cached.qaHistory.length})`);
            }
            return `
                    <div class="library-item cached" onclick="loadCachedPaper('${paper.id}')">
                        <div class="library-title">${paper.title}</div>
                        <div class="library-id">ID: ${paper.id}</div>
                        <div class="library-meta">
                            <div class="cache-badges">
                                ${badges
                .map((badge) => `<span class="cache-badge">${badge}</span>`)
                .join("")}
                            </div>
                            <button class="delete-btn" onclick="event.stopPropagation(); deletePaper('${paper.id}');">Delete</button>
                        </div>
                    </div>
                `;
        })
            .join("");
    }
    container.style.display = "block";
}
export function loadCachedPaper(arxivId, updateStateCallback) {
    const arxivInput = document.getElementById("arxiv-url");
    if (arxivInput)
        arxivInput.value = arxivId;
    const cached = getCachedPaper(arxivId);
    if (cached) {
        loadFromCache(cached, updateStateCallback);
        const libraryContainer = document.getElementById("library-container");
        if (libraryContainer)
            libraryContainer.style.display = "none";
    }
}
export function deletePaper(arxivId) {
    if (confirm(`Delete cached paper ${arxivId}?`)) {
        deleteCachedPaper(arxivId);
        showLibrary(); // Refresh the library view
        showSuccess("Paper deleted from cache");
    }
}
export function clearCache() {
    if (confirm("Clear all cached papers? This cannot be undone.")) {
        clearAllCache();
        const libraryContainer = document.getElementById("library-container");
        if (libraryContainer)
            libraryContainer.style.display = "none";
        showSuccess("Cache cleared successfully");
    }
}
export function clearAll() {
    const arxivInput = document.getElementById("arxiv-url");
    const paperSection = document.getElementById("paper-section");
    const libraryContainer = document.getElementById("library-container");
    if (arxivInput)
        arxivInput.value = "";
    if (paperSection)
        paperSection.style.display = "none";
    if (libraryContainer)
        libraryContainer.style.display = "none";
    resetGeneratedContent();
    updateCacheStatus(null);
    showSuccess("All content cleared");
}
// Setup section management
export function initializeSetup() {
    updateActiveProviderDisplay();
    // Collapse setup if active provider exists
    if (hasActiveProvider()) {
        const setupContent = document.getElementById("setup-content");
        const setupToggle = document.getElementById("setup-toggle");
        if (setupContent)
            setupContent.style.display = "none";
        if (setupToggle)
            setupToggle.textContent = "▶";
    }
}
export function toggleSetup() {
    const setupContent = document.getElementById("setup-content");
    const setupToggle = document.getElementById("setup-toggle");
    if (!setupContent || !setupToggle)
        return;
    const isVisible = setupContent.style.display !== "none";
    setupContent.style.display = isVisible ? "none" : "block";
    setupToggle.textContent = isVisible ? "▶" : "▼";
}
export function updateProviderUI() {
    const providerSelect = document.getElementById("provider-select");
    const apiKeyInput = document.getElementById("api-key-input");
    if (!providerSelect || !apiKeyInput)
        return;
    const provider = providerSelect.value;
    if (provider) {
        const placeholders = {
            openai: "sk-...",
            anthropic: "sk-ant-...",
            cohere: "Your Cohere API key"
        };
        apiKeyInput.placeholder = placeholders[provider];
        apiKeyInput.disabled = false;
        apiKeyInput.value = ""; // Always start fresh
    }
    else {
        apiKeyInput.placeholder = "Select a provider first";
        apiKeyInput.disabled = true;
        apiKeyInput.value = "";
    }
}
export function saveApiKeyFromUI() {
    const providerSelect = document.getElementById("provider-select");
    const apiKeyInput = document.getElementById("api-key-input");
    if (!providerSelect || !apiKeyInput)
        return;
    const provider = providerSelect.value;
    const apiKey = apiKeyInput.value.trim();
    if (!provider) {
        showError("Please select a provider");
        return;
    }
    if (!apiKey) {
        showError("Please enter an API key");
        return;
    }
    // Save the active provider
    saveActiveProvider(provider, apiKey);
    updateActiveProviderDisplay();
    showSuccess(`${provider} API key saved`);
    // Clear inputs and collapse setup
    apiKeyInput.value = "";
    providerSelect.value = "";
    apiKeyInput.disabled = true;
    apiKeyInput.placeholder = "Select a provider first";
    // Auto-collapse setup section
    const setupContent = document.getElementById("setup-content");
    const setupToggle = document.getElementById("setup-toggle");
    if (setupContent)
        setupContent.style.display = "none";
    if (setupToggle)
        setupToggle.textContent = "▶";
}
export function clearActiveProviderFromUI() {
    clearActiveProvider();
    updateActiveProviderDisplay();
    showSuccess("API provider cleared");
}
function updateActiveProviderDisplay() {
    const savedKeysContainer = document.getElementById("saved-keys");
    if (!savedKeysContainer)
        return;
    const activeProvider = getActiveProvider();
    if (!activeProvider || !activeProvider.apiKey || !activeProvider.provider) {
        savedKeysContainer.innerHTML = "";
        return;
    }
    const providerNames = {
        openai: "OpenAI",
        anthropic: "Anthropic",
        cohere: "Cohere"
    };
    savedKeysContainer.innerHTML = `
    <div class="saved-keys-header">Active API Provider:</div>
    <div class="saved-key-item">
      <span class="provider-name">${providerNames[activeProvider.provider]}</span>
      <span class="key-preview">${activeProvider.apiKey.substring(0, 8)}...</span>
      <button class="btn btn-small btn-danger" onclick="clearActiveProviderFromUI()">Change</button>
    </div>
  `;
}
// Streaming configuration functions
export function initializeStreaming() {
    const streamingCheckbox = document.getElementById("streaming-enabled");
    if (streamingCheckbox) {
        streamingCheckbox.checked = getStreamingEnabled();
    }
}
export function toggleStreaming() {
    const streamingCheckbox = document.getElementById("streaming-enabled");
    if (streamingCheckbox) {
        setStreamingEnabled(streamingCheckbox.checked);
        showSuccess(streamingCheckbox.checked ? "Streaming enabled" : "Streaming disabled");
    }
}
