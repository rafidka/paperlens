// LLM provider integrations for PaperLens
import { getActiveProvider } from "./cache.js";

// Model constants
const OPENAI_MODEL = "gpt-5";
const ANTHROPIC_MODEL = "claude-opus-4-1-20250805";
const COHERE_MODEL = "command-a-03-2025";

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

// Individual provider functions
async function callOpenAI(messages: ChatMessage[], apiKey: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: messages,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callAnthropic(messages: ChatMessage[], apiKey: string): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
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
}

async function callCohere(messages: ChatMessage[], apiKey: string): Promise<string> {
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
      model: COHERE_MODEL,
      message: lastMessage.content,
      preamble: systemMessage?.content || "",
    }),
  });

  if (!response.ok) {
    throw new Error(`Cohere API error: ${response.status}`);
  }

  const data = await response.json();
  return data.text;
}

// Main LLM dispatcher function
export async function callLLM(
  messages: ChatMessage[],
  provider: string,
  apiKey: string
): Promise<string> {
  switch (provider) {
    case "openai":
      return await callOpenAI(messages, apiKey);
    case "anthropic":
      return await callAnthropic(messages, apiKey);
    case "cohere":
      return await callCohere(messages, apiKey);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

