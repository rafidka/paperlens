// LLM provider integrations for PaperLens
import { getActiveProvider } from "./cache.js";
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { CohereClient } from 'cohere-ai';
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
    const openai = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true,
    });
    const response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: messages,
    });
    return response.choices[0].message.content || "";
}
async function callAnthropic(messages, apiKey) {
    const anthropic = new Anthropic({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true,
    });
    const systemMessage = messages.find((m) => m.role === "system");
    const userMessages = messages.filter((m) => m.role !== "system");
    const response = await anthropic.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 4096,
        messages: userMessages.map((m) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
        })),
        system: systemMessage?.content || "",
    });
    return response.content[0].type === "text" ? response.content[0].text : "";
}
async function callCohere(messages, apiKey) {
    const cohere = new CohereClient({
        token: apiKey,
    });
    // Convert messages to Cohere format
    const systemMessage = messages.find((m) => m.role === "system");
    const userMessages = messages.filter((m) => m.role !== "system");
    const lastMessage = userMessages[userMessages.length - 1];
    const response = await cohere.chat({
        model: COHERE_MODEL,
        message: lastMessage.content,
        preamble: systemMessage?.content || "",
    });
    return response.text;
}
// Streaming provider functions
async function callOpenAIStreaming(messages, apiKey, callback) {
    const openai = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true,
    });
    try {
        const stream = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            messages: messages,
            stream: true,
        });
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
                callback.onToken(content);
            }
            if (chunk.choices[0]?.finish_reason) {
                callback.onComplete();
                return;
            }
        }
    }
    catch (error) {
        callback.onError(error instanceof Error ? error : new Error("OpenAI streaming error"));
    }
}
async function callAnthropicStreaming(messages, apiKey, callback) {
    const anthropic = new Anthropic({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true,
    });
    const systemMessage = messages.find((m) => m.role === "system");
    const userMessages = messages.filter((m) => m.role !== "system");
    try {
        const stream = await anthropic.messages.create({
            model: ANTHROPIC_MODEL,
            max_tokens: 4096,
            messages: userMessages.map((m) => ({
                role: m.role === "assistant" ? "assistant" : "user",
                content: m.content,
            })),
            system: systemMessage?.content || "",
            stream: true,
        });
        for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                callback.onToken(event.delta.text);
            }
            else if (event.type === 'message_stop') {
                callback.onComplete();
                return;
            }
        }
    }
    catch (error) {
        callback.onError(error instanceof Error ? error : new Error("Anthropic streaming error"));
    }
}
async function callCohereStreaming(messages, apiKey, callback) {
    const cohere = new CohereClient({
        token: apiKey,
    });
    // Convert messages to Cohere format
    const systemMessage = messages.find((m) => m.role === "system");
    const userMessages = messages.filter((m) => m.role !== "system");
    const lastMessage = userMessages[userMessages.length - 1];
    try {
        const stream = await cohere.chatStream({
            model: COHERE_MODEL,
            message: lastMessage.content,
            preamble: systemMessage?.content || "",
        });
        for await (const event of stream) {
            if (event.eventType === 'text-generation') {
                const content = event.text;
                if (content) {
                    callback.onToken(content);
                }
            }
            else if (event.eventType === 'stream-end') {
                callback.onComplete();
                return;
            }
        }
    }
    catch (error) {
        callback.onError(error instanceof Error ? error : new Error("Cohere streaming error"));
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
