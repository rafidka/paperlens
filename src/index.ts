// Main application logic for PaperLens
import { loadPaper, extractArxivId } from "./paper.js";
import { getSelectedProvider, callLLM, READABILITY_PROMPT } from "./llm.js";
import { cachePaper } from "./cache.js";
import {
  showError,
  showTab,
  updateCacheStatus,
  updateQAHistory,
  showLibrary,
  loadCachedPaper,
  deletePaper,
  clearCache,
  clearAll,
} from "./ui.js";

interface PaperData {
  id: string;
  title: string;
  content: string;
  summary?: string;
  concepts?: string;
  readable?: string;
}

interface QAItem {
  question: string;
  answer: string;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Global state
let currentPaper: PaperData | null = null;
let qaHistory: QAItem[] = [];

const GENERATE_SUMMARY_PROMPT = `
You are an expert at summarizing academic papers. Provide a clear, comprehensive summary that covers
the main contributions, methodology, and findings.
`.trim();

const EXTRACT_CONCEPTS_PROMPT = `
You are an expert at extracting key concepts from academic papers. Identify and explain the most
important concepts, terms, methods, and ideas presented in the paper. Format your response as a
clear list with explanations.
`.trim();

const ANSWER_QUESTION_PROMPT = `
You are an expert at answering questions about academic papers. Provide accurate, detailed answers
based on the paper content. If the information is not in the paper, clearly state that.
`.trim();

// AI Generation Functions
async function generateSummary(): Promise<void> {
  if (!currentPaper) {
    showError("Please load a paper first");
    return;
  }

  const llmConfig = getSelectedProvider();
  if (!llmConfig) {
    showError("Please enter an API key for at least one provider");
    return;
  }

  const button = event?.target as HTMLButtonElement;
  if (!button) return;

  button.disabled = true;
  button.textContent = "Generating...";

  try {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: GENERATE_SUMMARY_PROMPT,
      },
      {
        role: "user",
        content: `Please provide a detailed summary of this academic paper:
Title: ${currentPaper.title}

Content:
${currentPaper.content.substring(0, 15000)}`,
      },
    ];

    const summary = await callLLM(messages, llmConfig.provider, llmConfig.key);

    currentPaper.summary = summary;
    const summaryContent = document.getElementById("summary-content");
    if (summaryContent) {
      summaryContent.textContent = summary;
      summaryContent.style.display = "block";
    }

    // Update cache
    cachePaper(currentPaper, currentPaper, qaHistory);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    showError(`Error generating summary: ${errorMessage}`);
  } finally {
    button.disabled = false;
    button.textContent = "Generate Summary";
  }
}

async function extractConcepts(): Promise<void> {
  if (!currentPaper) {
    showError("Please load a paper first");
    return;
  }

  const llmConfig = getSelectedProvider();
  if (!llmConfig) {
    showError("Please enter an API key for at least one provider");
    return;
  }

  const button = event?.target as HTMLButtonElement;
  if (!button) return;

  button.disabled = true;
  button.textContent = "Extracting...";

  try {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: EXTRACT_CONCEPTS_PROMPT,
      },
      {
        role: "user",
        content: `Please extract and explain the key concepts from this academic paper:\n\nTitle: ${
          currentPaper.title
        }\n\nContent:\n${currentPaper.content.substring(0, 15000)}`,
      },
    ];

    const concepts = await callLLM(messages, llmConfig.provider, llmConfig.key);

    currentPaper.concepts = concepts;
    const conceptsContent = document.getElementById("concepts-content");
    if (conceptsContent) {
      conceptsContent.textContent = concepts;
      conceptsContent.style.display = "block";
    }

    // Update cache
    cachePaper(currentPaper, currentPaper, qaHistory);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    showError(`Error extracting concepts: ${errorMessage}`);
  } finally {
    button.disabled = false;
    button.textContent = "Extract Key Concepts";
  }
}

async function generateReadable(): Promise<void> {
  if (!currentPaper) {
    showError("Please load a paper first");
    return;
  }

  const llmConfig = getSelectedProvider();
  if (!llmConfig) {
    showError("Please enter an API key for at least one provider");
    return;
  }

  const button = event?.target as HTMLButtonElement;
  if (!button) return;

  button.disabled = true;
  button.textContent = "Generating...";

  try {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: READABILITY_PROMPT,
      },
      {
        role: "user",
        content: `Please edit this academic paper for text-to-speech narration:\n\n${currentPaper.content.substring(
          0,
          15000
        )}`,
      },
    ];

    const readableVersion = await callLLM(messages, llmConfig.provider, llmConfig.key);

    currentPaper.readable = readableVersion;
    const readableContent = document.getElementById("readable-content");
    if (readableContent) {
      readableContent.textContent = readableVersion;
      readableContent.style.display = "block";
    }

    // Update cache
    cachePaper(currentPaper, currentPaper, qaHistory);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    showError(`Error generating readable version: ${errorMessage}`);
  } finally {
    button.disabled = false;
    button.textContent = "Generate Readable Version";
  }
}

async function askQuestion(): Promise<void> {
  const questionInput = document.getElementById("qa-input") as HTMLTextAreaElement;
  if (!questionInput) return;

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

  const button = event?.target as HTMLButtonElement;
  if (!button) return;

  button.disabled = true;
  button.textContent = "Asking...";

  try {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: ANSWER_QUESTION_PROMPT,
      },
      {
        role: "user",
        content: `Based on this academic paper, please answer the following question:

Paper Title: ${currentPaper.title}

Paper Content:
${currentPaper.content.substring(0, 15000)}

Question: ${question}`,
      },
    ];

    const answer = await callLLM(messages, llmConfig.provider, llmConfig.key);

    qaHistory.push({ question, answer });
    updateQAHistory(qaHistory);

    // Update cache with new Q&A
    if (currentPaper) {
      cachePaper(currentPaper, currentPaper, qaHistory);
    }

    questionInput.value = "";
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    showError(`Error getting answer: ${errorMessage}`);
  } finally {
    button.disabled = false;
    button.textContent = "Ask Question";
  }
}

// Wrapper functions for paper loading with state management
async function handleLoadPaper(): Promise<void> {
  const updateStateCallback = (newPaper: PaperData, newQaHistory: QAItem[]) => {
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
function handleLoadCachedPaper(arxivId: string): void {
  const updateStateCallback = (newPaper: PaperData, newQaHistory: QAItem[]) => {
    currentPaper = newPaper;
    qaHistory = newQaHistory;
  };

  loadCachedPaper(arxivId, updateStateCallback);
}

// Initialize the application
function initializeApp(): void {
  // Make functions globally available for onclick handlers
  (window as any).showTab = showTab;
  (window as any).generateSummary = generateSummary;
  (window as any).extractConcepts = extractConcepts;
  (window as any).generateReadable = generateReadable;
  (window as any).askQuestion = askQuestion;
  (window as any).loadPaper = handleLoadPaper;
  (window as any).showLibrary = showLibrary;
  (window as any).loadCachedPaper = handleLoadCachedPaper;
  (window as any).deletePaper = deletePaper;
  (window as any).clearCache = clearCache;
  (window as any).clearAll = clearAll;

  // Event listeners
  const qaInput = document.getElementById("qa-input");
  qaInput?.addEventListener("keydown", function (e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askQuestion();
    }
  });

  const arxivInput = document.getElementById("arxiv-url");
  arxivInput?.addEventListener("keydown", function (e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleLoadPaper();
    }
  });

  // Update cache status when URL changes
  arxivInput?.addEventListener("input", function (e: Event) {
    const target = e.target as HTMLInputElement;
    const arxivId = extractArxivId(target.value);
    updateCacheStatus(arxivId);
  });

  // Initialize cache status
  updateCacheStatus(null);
}

// Start the application when DOM is loaded
document.addEventListener("DOMContentLoaded", initializeApp);
