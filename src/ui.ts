// UI management and DOM manipulation for PaperLens
import { getLibrary, getCachedPaper, deleteCachedPaper, clearAllCache, getActiveProvider, saveApiKey, removeApiKey, setActiveProvider, clearActiveProvider, clearAllKeys, getSavedApiKeys, hasActiveProvider, hasSavedKeys, getStreamingEnabled, setStreamingEnabled } from "./cache.js";

interface QAItem {
  question: string;
  answer: string;
}

interface PaperData {
  id: string;
  title: string;
  content: string;
  summary?: string;
  concepts?: string;
  readable?: string;
}

interface CachedPaper extends PaperData {
  cachedAt: number;
  summary?: string;
  concepts?: string;
  readable?: string;
  qaHistory?: QAItem[];
}

type StateCallback = (paper: PaperData, qaHistory: QAItem[]) => void;

export function showError(message: string): void {
  showNotification(message, "error", 5000);
}

export function showSuccess(message: string): void {
  showNotification(message, "success", 3000);
}

function showNotification(message: string, type: "success" | "error", duration: number): void {
  const container = document.getElementById("notification-container");
  if (!container) return;
  
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <span class="notification-message">${message}</span>
    <button class="notification-close" onclick="this.parentElement.remove()">×</button>
  `;
  
  container.appendChild(notification);
  
  // Auto-remove after duration
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, duration);
  
  // Animate in
  setTimeout(() => {
    notification.classList.add("notification-show");
  }, 10);
}

export function showLoading(show: boolean = true): void {
  const loading = document.getElementById("loading");
  const paperSection = document.getElementById("paper-section");

  if (loading) loading.style.display = show ? "block" : "none";
  if (paperSection) paperSection.style.display = show ? "none" : "block";
}

export function resetGeneratedContent(): void {
  ["summary-content", "concepts-content", "readable-content"].forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.style.display = "none";
      element.textContent = "";
    }
  });

  const qaHistory = document.getElementById("qa-history");
  const qaInput = document.getElementById("qa-input") as HTMLTextAreaElement;

  if (qaHistory) {
    qaHistory.style.display = "none";
    qaHistory.innerHTML = "";
  }
  if (qaInput) {
    qaInput.value = "";
  }
}

export function showTab(tabName: string): void {
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
  const clickedButton = event?.target as HTMLElement;

  if (targetTab) targetTab.classList.add("active");
  if (clickedButton) clickedButton.classList.add("active");
}

export function updateCacheStatus(arxivId: string | null): void {
  const statusElement = document.getElementById("cache-status");
  if (!statusElement || !arxivId) {
    if (statusElement) statusElement.style.display = "none";
    return;
  }

  const cached = getCachedPaper(arxivId);
  statusElement.style.display = "inline-block";

  if (cached) {
    statusElement.className = "cache-status cached";
    statusElement.textContent = "✓ Cached";
  } else {
    statusElement.className = "cache-status not-cached";
    statusElement.textContent = "○ Not cached";
  }
}

export function loadFromCache(
  cached: CachedPaper,
  callback?: StateCallback
): { currentPaper: PaperData; qaHistory: QAItem[] } {
  const currentPaper: PaperData = {
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

  if (paperTitle) paperTitle.textContent = currentPaper.title;
  if (originalContent) {
    // Format the content with proper line breaks and preserve structure
    const formattedContent = currentPaper.content
      .replace(/\n\n+/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
    originalContent.innerHTML = formattedContent;
  }

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
  if (paperSection) paperSection.style.display = "block";

  showSuccess("Paper loaded from cache!");
  updateCacheStatus(cached.id);

  // Call callback to update app state
  if (callback) {
    callback(currentPaper, qaHistory);
  }

  return { currentPaper, qaHistory };
}

// Helper function to render markdown
function renderMarkdown(content: string): string {
  // @ts-ignore - marked is loaded via CDN
  return marked.parse(content);
}

export function updateQAHistory(qaHistory: QAItem[]): void {
  const historyDiv = document.getElementById("qa-history");
  if (!historyDiv) return;

  if (qaHistory.length === 0) {
    historyDiv.style.display = "none";
    return;
  }

  historyDiv.style.display = "block";
  historyDiv.innerHTML = qaHistory
    .map(
      (item) => `
        <div class="qa-item">
            <div class="qa-question">Q: ${item.question}</div>
            <div class="qa-answer">A: ${renderMarkdown(item.answer)}</div>
        </div>
    `
    )
    .join("");

  historyDiv.scrollTop = historyDiv.scrollHeight;
}

export function showLibrary(): void {
  const container = document.getElementById("library-container");
  const grid = document.getElementById("library-grid");

  if (!container || !grid) return;

  // Ensure the container is always visible in the new slide panel layout
  container.style.display = "block";

  const library = getLibrary();

  if (library.length === 0) {
    grid.innerHTML =
      '<div class="library-empty">No papers cached yet.<br>Load a paper to get started!</div>';
  } else {
    grid.innerHTML = library
      .sort((a, b) => b.lastAccessed - a.lastAccessed)
      .map((paper) => {
        const cached = getCachedPaper(paper.id);
        const badges: string[] = [];

        if (cached?.summary) badges.push("Summary");
        if (cached?.concepts) badges.push("Concepts");
        if (cached?.readable) badges.push("Readable");
        if (cached?.qaHistory?.length && cached.qaHistory.length > 0) {
          badges.push(`Q&A (${cached.qaHistory.length})`);
        }

        return `
                    <div class="library-item cached" onclick="loadCachedPaper('${paper.id}')">
                        <div class="library-title">${paper.title}</div>
                        <div class="library-id">arxiv:${paper.id}</div>
                        <div class="library-meta">
                            <span>${new Date(paper.lastAccessed).toLocaleDateString()}</span>
                            <div class="cache-badges">
                                ${badges
                                  .map((badge) => `<span class="cache-badge">${badge}</span>`)
                                  .join("")}
                                <button class="delete-btn" onclick="event.stopPropagation(); deletePaper('${
                                  paper.id
                                }');">Delete</button>
                            </div>
                        </div>
                    </div>
                `;
      })
      .join("");
  }
}

export function loadCachedPaper(arxivId: string, updateStateCallback?: StateCallback): void {
  const arxivInput = document.getElementById("arxiv-url") as HTMLInputElement;
  if (arxivInput) arxivInput.value = arxivId;

  const cached = getCachedPaper(arxivId);
  if (cached) {
    loadFromCache(cached, updateStateCallback);
    // Note: We no longer hide the library since it's now in a dedicated panel
  }
}

export function deletePaper(arxivId: string): void {
  if (confirm(`Delete cached paper ${arxivId}?`)) {
    deleteCachedPaper(arxivId);
    showLibrary(); // Refresh the library view
    showSuccess("Paper deleted from cache");
  }
}

export function clearCache(): void {
  if (confirm("Clear all cached papers? This cannot be undone.")) {
    clearAllCache();
    showLibrary(); // Refresh the library view to show empty state
    showSuccess("All papers cleared from cache");
  }
}

export function clearAll(): void {
  const arxivInput = document.getElementById("arxiv-url") as HTMLInputElement;
  const paperSection = document.getElementById("paper-section");

  if (arxivInput) arxivInput.value = "";
  if (paperSection) paperSection.style.display = "none";
  // Note: We no longer hide libraryContainer since it's now in a dedicated panel

  resetGeneratedContent();
  updateCacheStatus(null);

  showSuccess("All content cleared");
}

// Setup section management
export function initializeSetup(): void {
  updateActiveProviderDisplay();
  updateFirstTimeUserGuidance();
  
  // For first-time users, auto-open setup modal
  if (!hasSavedKeys()) {
    setTimeout(() => {
      openSetupModal();
    }, 1000); // Small delay to let the page load
  }
}

function updateFirstTimeUserGuidance(): void {
  const settingsButton = document.querySelector('[onclick="openSetupModal()"]') as HTMLElement;
  const searchInput = document.getElementById("arxiv-url") as HTMLInputElement;
  const loadButton = document.querySelector('[onclick="loadPaper()"]') as HTMLButtonElement;
  
  if (!hasSavedKeys()) {
    // Add visual indicator to settings button
    if (settingsButton) {
      settingsButton.classList.add('needs-attention');
      settingsButton.title = 'Click here to add your API key first!';
    }
    
    // Disable paper loading until keys are set up
    if (searchInput) {
      searchInput.placeholder = 'First, click ⚙️ to add your API key, then enter paper URL/ID';
      searchInput.disabled = true;
    }
    
    if (loadButton) {
      loadButton.disabled = true;
      loadButton.textContent = 'Add API Key First';
    }
    
    // Show guidance message
    showFirstTimeMessage();
  } else {
    // Remove indicators for existing users
    if (settingsButton) {
      settingsButton.classList.remove('needs-attention');
      settingsButton.title = 'Settings';
    }
    
    if (searchInput) {
      searchInput.placeholder = 'Enter Arxiv URL or ID (e.g., 2301.00001)';
      searchInput.disabled = false;
    }
    
    if (loadButton) {
      loadButton.disabled = false;
      loadButton.textContent = 'Load Paper';
    }
    
    // Hide guidance message
    hideFirstTimeMessage();
  }
}

function showFirstTimeMessage(): void {
  const headerContent = document.querySelector('.header-content');
  if (!headerContent) return;
  
  let messageDiv = document.getElementById('first-time-message');
  if (!messageDiv) {
    messageDiv = document.createElement('div');
    messageDiv.id = 'first-time-message';
    messageDiv.className = 'first-time-message';
    messageDiv.innerHTML = `
      <div class="welcome-message">
        👋 <strong>Welcome to PaperLens!</strong> 
        To get started, click the <strong>⚙️ Settings</strong> button to add your AI provider API key.
      </div>
    `;
    headerContent.appendChild(messageDiv);
  }
}

function hideFirstTimeMessage(): void {
  const messageDiv = document.getElementById('first-time-message');
  if (messageDiv) {
    messageDiv.remove();
  }
}

export function toggleSetup(): void {
  const setupContent = document.getElementById("setup-content");
  const setupToggle = document.getElementById("setup-toggle");
  
  if (!setupContent || !setupToggle) return;
  
  const isVisible = setupContent.style.display !== "none";
  
  setupContent.style.display = isVisible ? "none" : "block";
  setupToggle.textContent = isVisible ? "▶" : "▼";
}

export function updateProviderUI(): void {
  const providerSelect = document.getElementById("provider-select") as HTMLSelectElement;
  const apiKeyInput = document.getElementById("api-key-input") as HTMLInputElement;
  
  if (!providerSelect || !apiKeyInput) return;
  
  const provider = providerSelect.value;
  
  if (provider) {
    const placeholders = {
      openai: "sk-...",
      anthropic: "sk-ant-...",
      cohere: "Your Cohere API key"
    };
    apiKeyInput.placeholder = placeholders[provider as keyof typeof placeholders];
    apiKeyInput.disabled = false;
    apiKeyInput.value = ""; // Always start fresh
  } else {
    apiKeyInput.placeholder = "Select a provider first";
    apiKeyInput.disabled = true;
    apiKeyInput.value = "";
  }
}

export function saveApiKeyFromUI(): void {
  const providerSelect = document.getElementById("provider-select") as HTMLSelectElement;
  const apiKeyInput = document.getElementById("api-key-input") as HTMLInputElement;
  
  if (!providerSelect || !apiKeyInput) return;
  
  const provider = providerSelect.value as 'openai' | 'anthropic' | 'cohere';
  const apiKey = apiKeyInput.value.trim();
  
  if (!provider) {
    showError("Please select a provider");
    return;
  }
  
  if (!apiKey) {
    showError("Please enter an API key");
    return;
  }
  
  // Save the key and make it active
  saveApiKey(provider, apiKey);
  setActiveProvider(provider);
  updateActiveProviderDisplay();
  updateFirstTimeUserGuidance(); // Update UI guidance after saving key
  showSuccess(`${provider.charAt(0).toUpperCase() + provider.slice(1)} API key saved and set as active!`);
  
  // Clear inputs and collapse setup
  apiKeyInput.value = "";
  providerSelect.value = "";
  apiKeyInput.disabled = true;
  apiKeyInput.placeholder = "Select a provider first";
  
  // Auto-collapse setup section
  const setupContent = document.getElementById("setup-content");
  const setupToggle = document.getElementById("setup-toggle");
  
  if (setupContent) setupContent.style.display = "none";
  if (setupToggle) setupToggle.textContent = "▶";
}

export function clearActiveProviderFromUI(): void {
  clearActiveProvider();
  updateActiveProviderDisplay();
  showSuccess("API provider cleared");
}

export function clearAllKeysFromUI(): void {
  if (confirm("Are you sure you want to clear all API keys? This action cannot be undone.")) {
    clearAllKeys();
    updateActiveProviderDisplay();
    showSuccess("All API keys cleared");
  }
}

export function setActiveProviderFromUI(provider: 'openai' | 'anthropic' | 'cohere'): void {
  setActiveProvider(provider);
  updateActiveProviderDisplay();
  const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
  showSuccess(`${providerName} is now the active provider`);
}

export function removeApiKeyFromUI(provider: 'openai' | 'anthropic' | 'cohere'): void {
  const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
  if (confirm(`Are you sure you want to remove the ${providerName} API key?`)) {
    removeApiKey(provider);
    updateActiveProviderDisplay();
    showSuccess(`${providerName} API key removed`);
  }
}

function updateActiveProviderDisplay(): void {
  const savedKeysContainer = document.getElementById("saved-keys");
  if (!savedKeysContainer) return;
  
  const savedKeys = getSavedApiKeys();
  const activeProvider = getActiveProvider();
  
  if (Object.keys(savedKeys).length === 0) {
    savedKeysContainer.innerHTML = "";
    return;
  }
  
  const providerNames = {
    openai: "OpenAI",
    anthropic: "Anthropic", 
    cohere: "Cohere"
  };
  
  let html = '<div class="saved-keys-header">Saved API Keys:</div>';
  
  for (const [provider, apiKey] of Object.entries(savedKeys)) {
    const isActive = activeProvider && activeProvider.provider === provider;
    const providerName = providerNames[provider as keyof typeof providerNames] || provider;
    
    html += `
      <div class="saved-key-item ${isActive ? 'active' : ''}">
        <div class="key-info">
          <span class="provider-name">${providerName}</span>
          <span class="key-preview">${apiKey.substring(0, 8)}...</span>
          ${isActive ? '<span class="active-badge">Active</span>' : ''}
        </div>
        <div class="key-actions">
          ${!isActive ? `<button class="btn btn-small btn-primary" onclick="setActiveProviderFromUI('${provider}')">Use</button>` : ''}
          <button class="btn btn-small btn-danger" onclick="removeApiKeyFromUI('${provider}')">Remove</button>
        </div>
      </div>
    `;
  }
  
  savedKeysContainer.innerHTML = html;
}

// Streaming configuration functions
export function initializeStreaming(): void {
  const streamingCheckbox = document.getElementById("streaming-enabled") as HTMLInputElement;
  if (streamingCheckbox) {
    streamingCheckbox.checked = getStreamingEnabled();
  }
}

export function toggleStreaming(): void {
  const streamingCheckbox = document.getElementById("streaming-enabled") as HTMLInputElement;
  if (streamingCheckbox) {
    setStreamingEnabled(streamingCheckbox.checked);
    showSuccess(streamingCheckbox.checked ? "Streaming enabled" : "Streaming disabled");
  }
}

// Modal and Panel Functions
export function openSetupModal(): void {
  const modal = document.getElementById("setup-modal");
  if (modal) {
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }
}

export function closeSetupModal(): void {
  const modal = document.getElementById("setup-modal");
  if (modal) {
    modal.style.display = "none";
    document.body.style.overflow = "";
  }
}

export function openLibraryPanel(): void {
  const panel = document.getElementById("library-panel");
  if (panel) {
    panel.style.display = "block";
    setTimeout(() => {
      panel.classList.add("open");
    }, 10);
    
    // Auto-show the library content when panel opens
    showLibrary();
  }
}

export function closeLibraryPanel(): void {
  const panel = document.getElementById("library-panel");
  if (panel) {
    panel.classList.remove("open");
    setTimeout(() => {
      panel.style.display = "none";
    }, 300);
  }
}
