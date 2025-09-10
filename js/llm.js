// LLM provider integrations for PaperLens
import { getActiveProvider } from "./cache.js";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { CohereClientV2 } from "cohere-ai";
// Available models for each provider
export const AVAILABLE_MODELS = {
    openai: [
        { id: "gpt-5", name: "GPT-5" },
        { id: "gpt-5-mini", name: "GPT-5 Mini" },
        { id: "gpt-5-nano", name: "GPT-5 Mini" },
        { id: "gpt-4.1", name: "GPT-4.1" },
    ],
    anthropic: [
        { id: "claude-opus-4-1-20250805", name: "Claude Opus 4.1" },
        { id: "claude-sonnet-4-20250522", name: "Claude Sonnet 4" },
    ],
    cohere: [
        { id: "command-a-03-2025", name: "Command A (03/2025)" },
        { id: "command-a-reasoning-08-2025", name: "Command A Reasoning (08/2025)" },
    ],
};
// Default models (first in each list)
const DEFAULT_MODELS = {
    openai: AVAILABLE_MODELS.openai[0].id,
    anthropic: AVAILABLE_MODELS.anthropic[0].id,
    cohere: AVAILABLE_MODELS.cohere[0].id,
};
export function getSelectedProvider() {
    const activeProvider = getActiveProvider();
    if (activeProvider) {
        return {
            provider: activeProvider.provider,
            key: activeProvider.apiKey,
            model: activeProvider.model || DEFAULT_MODELS[activeProvider.provider],
        };
    }
    return null;
}
// Individual provider functions
async function callOpenAI(messages, apiKey, model) {
    const openai = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true,
    });
    const response = await openai.chat.completions.create({
        model: model || DEFAULT_MODELS.openai,
        messages: messages,
    });
    return response.choices[0].message.content || "";
}
async function callAnthropic(messages, apiKey, model) {
    const anthropic = new Anthropic({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true,
    });
    const systemMessage = messages.find((m) => m.role === "system");
    const userMessages = messages.filter((m) => m.role !== "system");
    const response = await anthropic.messages.create({
        model: model || DEFAULT_MODELS.anthropic,
        max_tokens: 4096,
        messages: userMessages.map((m) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
        })),
        system: systemMessage?.content || "",
    });
    return response.content[0].type === "text" ? response.content[0].text : "";
}
async function callCohere(messages, apiKey, model) {
    const cohere = new CohereClientV2({
        token: apiKey,
    });
    // Convert messages to Cohere V2 format - system message goes at the beginning of messages array
    const cohereMessages = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
    }));
    const response = await cohere.chat({
        model: model || DEFAULT_MODELS.cohere,
        messages: cohereMessages,
    });
    // Handle different content types in response
    const content = response.message.content;
    if (content && content.length > 0) {
        const firstContent = content[0];
        if ("text" in firstContent) {
            return firstContent.text;
        }
    }
    return "";
}
// Streaming provider functions
async function callOpenAIStreaming(messages, apiKey, model, callback) {
    const openai = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true,
    });
    try {
        const stream = await openai.chat.completions.create({
            model: model || DEFAULT_MODELS.openai,
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
async function callAnthropicStreaming(messages, apiKey, model, callback) {
    const anthropic = new Anthropic({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true,
    });
    const systemMessage = messages.find((m) => m.role === "system");
    const userMessages = messages.filter((m) => m.role !== "system");
    try {
        const stream = await anthropic.messages.create({
            model: model || DEFAULT_MODELS.anthropic,
            max_tokens: 4096,
            messages: userMessages.map((m) => ({
                role: m.role === "assistant" ? "assistant" : "user",
                content: m.content,
            })),
            system: systemMessage?.content || "",
            stream: true,
        });
        for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
                callback.onToken(event.delta.text);
            }
            else if (event.type === "message_stop") {
                callback.onComplete();
                return;
            }
        }
    }
    catch (error) {
        callback.onError(error instanceof Error ? error : new Error("Anthropic streaming error"));
    }
}
async function callCohereStreaming(messages, apiKey, model, callback) {
    const cohere = new CohereClientV2({
        token: apiKey,
    });
    // Convert messages to Cohere V2 format - system message goes at the beginning of messages array
    const cohereMessages = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
    }));
    try {
        const stream = await cohere.chatStream({
            model: model || DEFAULT_MODELS.cohere,
            messages: cohereMessages,
        });
        for await (const event of stream) {
            if (event.type === "content-delta") {
                // Handle different types of content deltas
                const delta = event.delta;
                if (delta && "text" in delta && typeof delta.text === "string") {
                    callback.onToken(delta.text);
                }
            }
            else if (event.type === "message-end") {
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
export async function callLLM(messages, provider, apiKey, model) {
    switch (provider) {
        case "openai":
            return await callOpenAI(messages, apiKey, model);
        case "anthropic":
            return await callAnthropic(messages, apiKey, model);
        case "cohere":
            return await callCohere(messages, apiKey, model);
        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
}
// Streaming LLM dispatcher function
export async function callLLMStreaming(messages, provider, apiKey, model, callback) {
    switch (provider) {
        case "openai":
            return await callOpenAIStreaming(messages, apiKey, model, callback);
        case "anthropic":
            return await callAnthropicStreaming(messages, apiKey, model, callback);
        case "cohere":
            return await callCohereStreaming(messages, apiKey, model, callback);
        default:
            callback.onError(new Error(`Unknown provider: ${provider}`));
    }
}
