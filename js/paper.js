// Paper loading and processing for PaperLens
import { getCachedPaper, cachePaper } from "./cache.js";
import { showError, showSuccess, showLoading, resetGeneratedContent, updateCacheStatus, loadFromCache, } from "./ui.js";
export function extractArxivId(input) {
    input = input.trim();
    // If it's already just an ID
    if (/^\d{4}\.\d{4,5}$/.test(input)) {
        return input;
    }
    // Extract from URL
    const match = input.match(/(?:arxiv\.org\/abs\/|arxiv:)(\d{4}\.\d{4,5})/);
    return match ? match[1] : null;
}
export async function loadPaper(currentPaper, qaHistory, fromCache = false, updateStateCallback) {
    const arxivInput = document.getElementById("arxiv-url");
    if (!arxivInput)
        return null;
    const arxivId = extractArxivId(arxivInput.value);
    if (!arxivId) {
        showError("Please enter a valid Arxiv URL or ID (e.g., 2301.00001)");
        return null;
    }
    // Check cache first
    const cached = getCachedPaper(arxivId);
    if (cached && fromCache !== false) {
        loadFromCache(cached, updateStateCallback);
        return cached;
    }
    showLoading(true);
    try {
        // Use Ar5iv service to get HTML version
        const ar5ivUrl = `https://ar5iv.labs.arxiv.org/html/${arxivId}`;
        const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(ar5ivUrl)}`);
        if (!response.ok) {
            throw new Error("Failed to fetch paper from Ar5iv");
        }
        const data = await response.json();
        const htmlContent = data.contents;
        // Parse the HTML to extract text content
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, "text/html");
        // Get title
        const title = doc.querySelector("h1.ltx_title")?.textContent ||
            doc.querySelector("title")?.textContent ||
            `Arxiv Paper ${arxivId}`;
        // Extract main content (remove nav, header, footer elements)
        const mainContent = doc.querySelector("article") || doc.querySelector("main") || doc.body;
        if (mainContent) {
            // Remove unwanted elements
            const unwantedSelectors = [
                "nav",
                "header",
                "footer",
                ".ltx_navigation",
                ".ltx_page_header",
                ".ltx_page_footer",
            ];
            unwantedSelectors.forEach((selector) => {
                const elements = mainContent.querySelectorAll(selector);
                elements.forEach((el) => el.remove());
            });
        }
        // Get clean text content
        const textContent = mainContent?.textContent || mainContent?.innerText || "";
        const paperData = {
            id: arxivId,
            title: title.trim(),
            content: textContent.trim(),
        };
        // Cache the paper
        cachePaper(paperData, currentPaper, qaHistory);
        const paperTitle = document.getElementById("paper-title");
        const originalContent = document.getElementById("original-content");
        if (paperTitle)
            paperTitle.textContent = paperData.title;
        if (originalContent) {
            // Format the content with proper line breaks and preserve structure
            const formattedContent = paperData.content
                .replace(/\n\n+/g, '</p><p>')
                .replace(/\n/g, '<br>')
                .replace(/^/, '<p>')
                .replace(/$/, '</p>');
            originalContent.innerHTML = formattedContent;
        }
        showLoading(false);
        showSuccess("Paper loaded and cached successfully!");
        // Reset all generated content
        resetGeneratedContent();
        updateCacheStatus(arxivId);
        return paperData;
    }
    catch (error) {
        showLoading(false);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        showError(`Error loading paper: ${errorMessage}`);
        console.error("Error:", error);
        return null;
    }
}
