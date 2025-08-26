// Main application logic for PaperLens
import { loadPaper, extractArxivId } from "./paper.js";
import { getSelectedProvider, callLLM, callLLMStreaming } from "./llm.js";
import { cachePaper, getStreamingEnabled, hasSavedKeys } from "./cache.js";
import { showError, showTab, updateCacheStatus, updateQAHistory, showLibrary, loadCachedPaper, deletePaper, clearCache, clearAll, initializeSetup, toggleSetup, updateProviderUI, saveApiKeyFromUI, clearActiveProviderFromUI, clearAllKeysFromUI, setActiveProviderFromUI, removeApiKeyFromUI, initializeStreaming, toggleStreaming, openSetupModal, closeSetupModal, openLibraryPanel, closeLibraryPanel, } from "./ui.js";
// Global state
let currentPaper = null;
let qaHistory = [];
const GENERATE_SUMMARY_PROMPT = `
You are an expert at summarizing academic papers. Provide a clear, comprehensive summary that covers
the main contributions, methodology, and findings.

Format your response in markdown with:
- Clear section headings (## Main Contributions, ## Methodology, ## Key Findings, etc.)
- Bullet points for lists
- **Bold** for key terms and concepts
- *Italics* for emphasis where appropriate

Provide a well-structured, readable summary.
`.trim();
const EXTRACT_CONCEPTS_PROMPT = `
You are an expert at extracting key concepts from academic papers. Identify and explain the most
important concepts, terms, methods, and ideas presented in the paper.

Format your response in markdown with:
- ## Key Concepts as a main heading
- **Concept Name**: Clear explanation for each concept
- Use bullet points for lists of related ideas
- *Italics* for technical terms
- \`code formatting\` for algorithms, formulas, or specific notation

Provide a well-organized, easy-to-scan list of concepts.
`.trim();
const ANSWER_QUESTION_PROMPT = `
You are an expert at answering questions about academic papers. Provide accurate, detailed answers
based on the paper content. If the information is not in the paper, clearly state that.

Format your response in markdown with:
- Clear structure using headings if needed
- **Bold** for key points and important information
- Bullet points for lists
- *Italics* for emphasis
- \`code formatting\` for technical terms, equations, or specific values

Provide clear, well-formatted answers.
`.trim();
// Legacy TTS-focused prompt (commented out for potential future use)
/*
const READABILITY_PROMPT = `
You are an AI readability editor preparing technical prose for high-quality text-to-speech narration.

**Goals**
• Preserve every fact, definition, symbol, and equation exactly.
• Make only SMALL edits that improve oral flow and comprehension.
• Never add personal commentary or new content.

**Edit Rules**
1. Convert inline math symbols to spoken words ("∀" → "for all", "≈" → "approximately").
2. For equations, try to summarize them since listening to symbols being read out is not quite easy to follow.
3. Replace citation brackets like "[12]" with "(reference 12)" or remove them if they disrupt flow.
4. For each displayed equation:
   • Prepend "Equation (n):" (use the existing number if present, otherwise number sequentially).
   • Append a ≤20-word plain-English gloss unless the sentence right after already explains it.
5. Keep section headings, figure captions, table captions, and bullet lists verbatim.
6. Do **not** alter variable names, numeric values, or claim meanings.
7. Output only the revised text—no explanations, markdown, or extra headings.
`.trim();
*/
const ACCESSIBILITY_PROMPT = `
You are an expert at making complex academic content accessible to a broader audience. Your goal is to transform dense academic writing into clear, understandable text while preserving all important information and maintaining scientific accuracy.

**Your Task:**
• Explain technical jargon, specialized terminology, and domain-specific concepts
• Break down complex sentences into clearer, more readable segments
• Add brief explanations for abbreviations, acronyms, and field-specific terms
• Clarify vague references, implicit assumptions, and unstated background knowledge
• Rephrase convoluted academic language into plain, direct language
• Maintain all factual content, data, and conclusions exactly as presented

**Formatting Guidelines:**
• Use markdown formatting for clear structure and readability
• Use **bold** for key terms and important concepts
• Use *italics* for emphasis and newly introduced terminology
• Use \`code formatting\` for technical terms, variables, or specific notation
• Use > blockquotes for important findings or conclusions
• Use bullet points (•) or numbered lists (1.) for complex processes or multiple concepts
• Use ## headings and ### subheadings to organize content clearly
• Add explanatory notes in [brackets] when introducing complex terms
• Keep paragraphs reasonably short for better readability

**What NOT to do:**
• Do not oversimplify to the point of losing meaning
• Do not add your own opinions or interpretations
• Do not remove important technical details
• Do not change the author's conclusions or findings
• Do not add content that wasn't in the original paper

**Target Audience:** 
Educated readers who may not be specialists in this particular field but want to understand the research thoroughly.

Format your response as a well-structured, accessible version of the academic paper using proper markdown formatting.
`.trim();
const MAX_PAPER_LENGTH = 256000; // current models support bigger windows, but staying safe.
// Helper function to render markdown
function renderMarkdown(content) {
    // @ts-ignore - marked is loaded via CDN
    return marked.parse(content);
}
// AI Generation Functions
async function generateSummary() {
    if (!currentPaper) {
        showError("Please load a paper first");
        return;
    }
    const llmConfig = getSelectedProvider();
    if (!llmConfig) {
        showError("Please enter an API key for at least one provider");
        return;
    }
    const button = event?.target;
    if (!button)
        return;
    button.disabled = true;
    button.textContent = "Generating...";
    try {
        const messages = [
            {
                role: "system",
                content: GENERATE_SUMMARY_PROMPT,
            },
            {
                role: "user",
                content: `Please provide a detailed summary of this academic paper:
Title: ${currentPaper.title}

Content:
${currentPaper.content.substring(0, MAX_PAPER_LENGTH)}`,
            },
        ];
        const summaryContent = document.getElementById("summary-content");
        const isStreamingEnabled = getStreamingEnabled();
        if (isStreamingEnabled) {
            // Streaming mode
            if (summaryContent) {
                summaryContent.style.display = "block";
                summaryContent.innerHTML = "<div class='streaming-indicator'>✨ Generating summary...</div>";
            }
            let accumulatedContent = "";
            await callLLMStreaming(messages, llmConfig.provider, llmConfig.key, {
                onToken: (token) => {
                    accumulatedContent += token;
                    if (summaryContent) {
                        summaryContent.innerHTML = renderMarkdown(accumulatedContent);
                    }
                },
                onComplete: () => {
                    currentPaper.summary = accumulatedContent;
                    cachePaper(currentPaper, currentPaper, qaHistory);
                    button.disabled = false;
                    button.textContent = "Generate Summary";
                },
                onError: (error) => {
                    const errorMessage = error instanceof Error ? error.message : "Unknown error";
                    showError(`Error generating summary: ${errorMessage}`);
                    button.disabled = false;
                    button.textContent = "Generate Summary";
                }
            });
        }
        else {
            // Regular mode
            const summary = await callLLM(messages, llmConfig.provider, llmConfig.key);
            currentPaper.summary = summary;
            if (summaryContent) {
                summaryContent.innerHTML = renderMarkdown(summary);
                summaryContent.style.display = "block";
            }
            cachePaper(currentPaper, currentPaper, qaHistory);
            button.disabled = false;
            button.textContent = "Generate Summary";
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        showError(`Error generating summary: ${errorMessage}`);
        button.disabled = false;
        button.textContent = "Generate Summary";
    }
}
async function extractConcepts() {
    if (!currentPaper) {
        showError("Please load a paper first");
        return;
    }
    const llmConfig = getSelectedProvider();
    if (!llmConfig) {
        showError("Please enter an API key for at least one provider");
        return;
    }
    const button = event?.target;
    if (!button)
        return;
    button.disabled = true;
    button.textContent = "Extracting...";
    try {
        const messages = [
            {
                role: "system",
                content: EXTRACT_CONCEPTS_PROMPT,
            },
            {
                role: "user",
                content: `Please extract and explain the key concepts from this academic paper:\n\nTitle: ${currentPaper.title}\n\nContent:\n${currentPaper.content.substring(0, MAX_PAPER_LENGTH)}`,
            },
        ];
        const conceptsContent = document.getElementById("concepts-content");
        const isStreamingEnabled = getStreamingEnabled();
        if (isStreamingEnabled) {
            // Streaming mode
            if (conceptsContent) {
                conceptsContent.style.display = "block";
                conceptsContent.innerHTML = "<div class='streaming-indicator'>✨ Extracting concepts...</div>";
            }
            let accumulatedContent = "";
            await callLLMStreaming(messages, llmConfig.provider, llmConfig.key, {
                onToken: (token) => {
                    accumulatedContent += token;
                    if (conceptsContent) {
                        conceptsContent.innerHTML = renderMarkdown(accumulatedContent);
                    }
                },
                onComplete: () => {
                    currentPaper.concepts = accumulatedContent;
                    cachePaper(currentPaper, currentPaper, qaHistory);
                    button.disabled = false;
                    button.textContent = "Extract Key Concepts";
                },
                onError: (error) => {
                    const errorMessage = error instanceof Error ? error.message : "Unknown error";
                    showError(`Error extracting concepts: ${errorMessage}`);
                    button.disabled = false;
                    button.textContent = "Extract Key Concepts";
                }
            });
        }
        else {
            // Regular mode
            const concepts = await callLLM(messages, llmConfig.provider, llmConfig.key);
            currentPaper.concepts = concepts;
            if (conceptsContent) {
                conceptsContent.innerHTML = renderMarkdown(concepts);
                conceptsContent.style.display = "block";
            }
            cachePaper(currentPaper, currentPaper, qaHistory);
            button.disabled = false;
            button.textContent = "Extract Key Concepts";
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        showError(`Error extracting concepts: ${errorMessage}`);
        button.disabled = false;
        button.textContent = "Extract Key Concepts";
    }
}
async function generateAccessible() {
    if (!currentPaper) {
        showError("Please load a paper first");
        return;
    }
    const llmConfig = getSelectedProvider();
    if (!llmConfig) {
        showError("Please enter an API key for at least one provider");
        return;
    }
    const button = event?.target;
    if (!button)
        return;
    button.disabled = true;
    button.textContent = "Generating...";
    try {
        const messages = [
            {
                role: "system",
                content: ACCESSIBILITY_PROMPT,
            },
            {
                role: "user",
                content: `Please create an accessible version of this academic paper by explaining complex concepts and making it understandable for a broader audience:

Title: ${currentPaper.title}

Content:
${currentPaper.content.substring(0, MAX_PAPER_LENGTH)}`,
            },
        ];
        const accessibleContent = document.getElementById("accessible-content");
        const isStreamingEnabled = getStreamingEnabled();
        if (isStreamingEnabled) {
            // Streaming mode
            if (accessibleContent) {
                accessibleContent.style.display = "block";
                accessibleContent.innerHTML = "<div class='streaming-indicator'>✨ Creating accessible version...</div>";
            }
            let accumulatedContent = "";
            await callLLMStreaming(messages, llmConfig.provider, llmConfig.key, {
                onToken: (token) => {
                    accumulatedContent += token;
                    if (accessibleContent) {
                        accessibleContent.innerHTML = renderMarkdown(accumulatedContent);
                    }
                },
                onComplete: () => {
                    currentPaper.accessible = accumulatedContent;
                    cachePaper(currentPaper, currentPaper, qaHistory);
                    button.disabled = false;
                    button.textContent = "Generate Accessible Version";
                },
                onError: (error) => {
                    const errorMessage = error instanceof Error ? error.message : "Unknown error";
                    showError(`Error generating accessible version: ${errorMessage}`);
                    button.disabled = false;
                    button.textContent = "Generate Accessible Version";
                }
            });
        }
        else {
            // Regular mode
            const accessibleVersion = await callLLM(messages, llmConfig.provider, llmConfig.key);
            currentPaper.accessible = accessibleVersion;
            if (accessibleContent) {
                accessibleContent.innerHTML = renderMarkdown(accessibleVersion);
                accessibleContent.style.display = "block";
            }
            cachePaper(currentPaper, currentPaper, qaHistory);
            button.disabled = false;
            button.textContent = "Generate Accessible Version";
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        showError(`Error generating accessible version: ${errorMessage}`);
        button.disabled = false;
        button.textContent = "Generate Accessible Version";
    }
}
async function askQuestion() {
    const questionInput = document.getElementById("qa-input");
    if (!questionInput)
        return;
    const question = questionInput.value.trim();
    if (!question) {
        showError("Please enter a question");
        return;
    }
    if (!currentPaper) {
        showError("Please load a paper first");
        return;
    }
    const llmConfig = getSelectedProvider();
    if (!llmConfig) {
        showError("Please enter an API key for at least one provider");
        return;
    }
    const button = event?.target;
    if (!button)
        return;
    button.disabled = true;
    button.textContent = "Asking...";
    try {
        const messages = [
            {
                role: "system",
                content: ANSWER_QUESTION_PROMPT,
            },
            {
                role: "user",
                content: `Based on this academic paper, please answer the following question:

Paper Title: ${currentPaper.title}

Paper Content:
${currentPaper.content.substring(0, MAX_PAPER_LENGTH)}

Question: ${question}`,
            },
        ];
        const isStreamingEnabled = getStreamingEnabled();
        if (isStreamingEnabled) {
            // Streaming mode
            qaHistory.push({ question, answer: "✨ Thinking..." });
            updateQAHistory(qaHistory);
            questionInput.value = "";
            let accumulatedAnswer = "";
            await callLLMStreaming(messages, llmConfig.provider, llmConfig.key, {
                onToken: (token) => {
                    accumulatedAnswer += token;
                    qaHistory[qaHistory.length - 1].answer = accumulatedAnswer;
                    updateQAHistory(qaHistory);
                },
                onComplete: () => {
                    if (currentPaper) {
                        cachePaper(currentPaper, currentPaper, qaHistory);
                    }
                    button.disabled = false;
                    button.textContent = "Ask Question";
                },
                onError: (error) => {
                    qaHistory.pop();
                    updateQAHistory(qaHistory);
                    const errorMessage = error instanceof Error ? error.message : "Unknown error";
                    showError(`Error getting answer: ${errorMessage}`);
                    button.disabled = false;
                    button.textContent = "Ask Question";
                }
            });
        }
        else {
            // Regular mode
            const answer = await callLLM(messages, llmConfig.provider, llmConfig.key);
            qaHistory.push({ question, answer });
            updateQAHistory(qaHistory);
            if (currentPaper) {
                cachePaper(currentPaper, currentPaper, qaHistory);
            }
            questionInput.value = "";
            button.disabled = false;
            button.textContent = "Ask Question";
        }
    }
    catch (error) {
        // Remove the failed question from history
        qaHistory.pop();
        updateQAHistory(qaHistory);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        showError(`Error getting answer: ${errorMessage}`);
        button.disabled = false;
        button.textContent = "Ask Question";
    }
}
// Wrapper functions for paper loading with state management
async function handleLoadPaper() {
    const updateStateCallback = (newPaper, newQaHistory) => {
        currentPaper = newPaper;
        qaHistory = newQaHistory;
    };
    const result = await loadPaper(currentPaper, qaHistory, false, updateStateCallback);
    if (result && !result.summary) {
        // Only reset if it's a new paper (not from cache)
        currentPaper = result;
        qaHistory = []; // Reset Q&A history for new paper
    }
}
// Wrapper for loadCachedPaper with state management
function handleLoadCachedPaper(arxivId) {
    const updateStateCallback = (newPaper, newQaHistory) => {
        currentPaper = newPaper;
        qaHistory = newQaHistory;
    };
    loadCachedPaper(arxivId, updateStateCallback);
}
// URL parameter handling for arxivory integration
function handleUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const paperId = urlParams.get('paper');
    const source = urlParams.get('source');
    if (paperId) {
        // Populate the arxiv input field
        const arxivInput = document.getElementById('arxiv-url');
        if (arxivInput) {
            arxivInput.value = paperId;
            updateCacheStatus(extractArxivId(paperId));
        }
        // Show a welcome message for arxivory users
        if (source === 'arxivory') {
            showArxivoryWelcome(paperId);
        }
        // Clean up URL without triggering reload
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
    }
}
function showArxivoryWelcome(paperId) {
    const headerContent = document.querySelector(".header-content");
    if (!headerContent)
        return;
    let welcomeDiv = document.getElementById("arxivory-welcome");
    if (!welcomeDiv) {
        welcomeDiv = document.createElement("div");
        welcomeDiv.id = "arxivory-welcome";
        welcomeDiv.className = "first-time-message";
        welcomeDiv.innerHTML = `
      <div class="welcome-message" style="background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);">
        🔬 <strong>Paper loaded from arxivory!</strong> 
        Paper ID: <code>${paperId}</code><br>
        ${!hasSavedKeys() ?
            'To analyze this paper, first click <strong>⚙️ Settings</strong> to add your AI provider API key, then click <strong>Load Paper</strong>.' :
            'Click <strong>Load Paper</strong> to start analyzing this paper with AI assistance!'}
      </div>
    `;
        headerContent.appendChild(welcomeDiv);
        // Auto-remove after 8 seconds
        setTimeout(() => {
            if (welcomeDiv && welcomeDiv.parentNode) {
                welcomeDiv.remove();
            }
        }, 8000);
    }
}
// Initialize the application
function initializeApp() {
    // Initialize setup section
    initializeSetup();
    initializeStreaming();
    // Handle URL parameters for arxivory integration
    handleUrlParameters();
    // Make functions globally available for onclick handlers
    window.showTab = showTab;
    window.generateSummary = generateSummary;
    window.extractConcepts = extractConcepts;
    window.generateAccessible = generateAccessible;
    window.askQuestion = askQuestion;
    window.loadPaper = handleLoadPaper;
    window.showLibrary = showLibrary;
    window.loadCachedPaper = handleLoadCachedPaper;
    window.deletePaper = deletePaper;
    window.clearCache = clearCache;
    window.clearAll = clearAll;
    window.toggleSetup = toggleSetup;
    window.updateProviderUI = updateProviderUI;
    window.saveApiKey = saveApiKeyFromUI;
    window.clearActiveProviderFromUI = clearActiveProviderFromUI;
    window.clearAllKeys = clearAllKeysFromUI;
    window.setActiveProviderFromUI = setActiveProviderFromUI;
    window.removeApiKeyFromUI = removeApiKeyFromUI;
    window.toggleStreaming = toggleStreaming;
    window.openSetupModal = openSetupModal;
    window.closeSetupModal = closeSetupModal;
    window.openLibraryPanel = openLibraryPanel;
    window.closeLibraryPanel = closeLibraryPanel;
    // Event listeners
    const qaInput = document.getElementById("qa-input");
    qaInput?.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            askQuestion();
        }
    });
    const arxivInput = document.getElementById("arxiv-url");
    arxivInput?.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            handleLoadPaper();
        }
    });
    // Update cache status when URL changes
    arxivInput?.addEventListener("input", function (e) {
        const target = e.target;
        const arxivId = extractArxivId(target.value);
        updateCacheStatus(arxivId);
    });
    // Initialize cache status
    updateCacheStatus(null);
    // Click outside modal to close
    const setupModal = document.getElementById("setup-modal");
    setupModal?.addEventListener("click", function (e) {
        if (e.target === setupModal) {
            closeSetupModal();
        }
    });
}
// Start the application when DOM is loaded
document.addEventListener("DOMContentLoaded", initializeApp);
