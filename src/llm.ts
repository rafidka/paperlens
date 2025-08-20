// LLM provider integrations for PaperLens
import { getActiveProvider } from "./cache.js";

interface LLMProvider {
  provider: "openai" | "anthropic" | "cohere";
  key: string;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export function getSelectedProvider(): LLMProvider | null {
  const activeProvider = getActiveProvider();
  
  if (activeProvider) {
    return { provider: activeProvider.provider, key: activeProvider.apiKey };
  }
  
  return null;
}

export async function callLLM(
  messages: ChatMessage[],
  provider: string,
  apiKey: string
): Promise<string> {
  if (provider === "openai") {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messages,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } else if (provider === "anthropic") {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4000,
        messages: messages
          .filter((m) => m.role !== "system")
          .map((m) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
          })),
        system: messages.find((m) => m.role === "system")?.content || "",
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
  } else if (provider === "cohere") {
    // Convert messages to Cohere format
    const systemMessage = messages.find((m) => m.role === "system");
    const userMessages = messages.filter((m) => m.role !== "system");
    const lastMessage = userMessages[userMessages.length - 1];

    const response = await fetch("https://api.cohere.ai/v1/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "command-r-plus",
        message: lastMessage.content,
        preamble: systemMessage?.content || "",
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Cohere API error: ${response.status}`);
    }

    const data = await response.json();
    return data.text;
  }

  throw new Error(`Unknown provider: ${provider}`);
}

export const READABILITY_PROMPT = `
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
