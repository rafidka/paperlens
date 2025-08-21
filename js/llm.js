// LLM provider integrations for PaperLens
import { getActiveProvider } from "./cache.js";
// Model constants
const OPENAI_MODEL = "gpt-5";
const ANTHROPIC_MODEL = "claude-opus-4-1-20250805";
const COHERE_MODEL = "command-a-03-2025";
export function getSelectedProvider() {
    const activeProvider = getActiveProvider();
    if (activeProvider) {
        return { provider: activeProvider.provider, key: activeProvider.apiKey };
    }
    return null;
}
// Individual provider functions
async function callOpenAI(messages, apiKey) {
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
async function callAnthropic(messages, apiKey) {
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
async function callCohere(messages, apiKey) {
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
// Streaming provider functions
async function callOpenAIStreaming(messages, apiKey, callback) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: OPENAI_MODEL,
            messages: messages,
            stream: true,
        }),
    });
    if (!response.ok) {
        callback.onError(new Error(`OpenAI API error: ${response.status}`));
        return;
    }
    const reader = response.body?.getReader();
    if (!reader) {
        callback.onError(new Error("Failed to get response reader"));
        return;
    }
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n').filter(line => line.trim() !== '');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') {
                        callback.onComplete();
                        return;
                    }
                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices?.[0]?.delta?.content;
                        if (content) {
                            callback.onToken(content);
                        }
                    }
                    catch (e) {
                        // Skip invalid JSON lines
                    }
                }
            }
        }
    }
    catch (error) {
        callback.onError(error instanceof Error ? error : new Error("Stream error"));
    }
}
async function callAnthropicStreaming(messages, apiKey, callback) {
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
            stream: true,
        }),
    });
    if (!response.ok) {
        callback.onError(new Error(`Anthropic API error: ${response.status}`));
        return;
    }
    const reader = response.body?.getReader();
    if (!reader) {
        callback.onError(new Error("Failed to get response reader"));
        return;
    }
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n').filter(line => line.trim() !== '');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.type === 'content_block_delta') {
                            const content = parsed.delta?.text;
                            if (content) {
                                callback.onToken(content);
                            }
                        }
                        else if (parsed.type === 'message_stop') {
                            callback.onComplete();
                            return;
                        }
                    }
                    catch (e) {
                        // Skip invalid JSON lines
                    }
                }
            }
        }
    }
    catch (error) {
        callback.onError(error instanceof Error ? error : new Error("Stream error"));
    }
}
async function callCohereStreaming(messages, apiKey, callback) {
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
            stream: true,
        }),
    });
    if (!response.ok) {
        callback.onError(new Error(`Cohere API error: ${response.status}`));
        return;
    }
    const reader = response.body?.getReader();
    if (!reader) {
        callback.onError(new Error("Failed to get response reader"));
        return;
    }
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n').filter(line => line.trim() !== '');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.event_type === 'text-generation') {
                            const content = parsed.text;
                            if (content) {
                                callback.onToken(content);
                            }
                        }
                        else if (parsed.event_type === 'stream-end') {
                            callback.onComplete();
                            return;
                        }
                    }
                    catch (e) {
                        // Skip invalid JSON lines
                    }
                }
            }
        }
    }
    catch (error) {
        callback.onError(error instanceof Error ? error : new Error("Stream error"));
    }
}
// Main LLM dispatcher function
export async function callLLM(messages, provider, apiKey) {
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
// Streaming LLM dispatcher function
export async function callLLMStreaming(messages, provider, apiKey, callback) {
    switch (provider) {
        case "openai":
            return await callOpenAIStreaming(messages, apiKey, callback);
        case "anthropic":
            return await callAnthropicStreaming(messages, apiKey, callback);
        case "cohere":
            return await callCohereStreaming(messages, apiKey, callback);
        default:
            callback.onError(new Error(`Unknown provider: ${provider}`));
    }
}
