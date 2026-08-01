import { streamText, type ModelMessage } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createDeepSeek, type DeepSeekLanguageModelChatOptions } from "@ai-sdk/deepseek";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import type { AppSettings } from "./settings";

export interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

export async function* streamChat(
    messages: ChatMessage[],
    settings: AppSettings,
    signal?: AbortSignal,
): AsyncGenerator<string> {
    const instructions = messages.find((m) => m.role === "system")?.content;
    const chat = messages.filter((m) => m.role !== "system") as ModelMessage[];

    const fetchImpl = tauriFetch as unknown as typeof fetch;
    const isDeepSeek = settings.baseUrl.includes("deepseek.com");

    const common = {
        messages: chat,
        instructions,
        temperature: settings.temperature,
        maxOutputTokens: settings.maxTokens,
        abortSignal: signal,
    };

    if (isDeepSeek) {
        const provider = createDeepSeek({
            apiKey: settings.apiKey,
            baseURL: settings.baseUrl,
            fetch: fetchImpl,
        });

        const deepseekOptions: DeepSeekLanguageModelChatOptions = settings.thinkingEnabled
            ? {
                  thinking: { type: "enabled" },
                  reasoningEffort:
                      (settings.reasoningEffort as DeepSeekLanguageModelChatOptions["reasoningEffort"]) ||
                      "high",
              }
            : { thinking: { type: "disabled" } };

        const result = streamText({
            ...common,
            model: provider.chat(settings.model),
            providerOptions: { deepseek: deepseekOptions },
        });

        for await (const chunk of result.textStream) {
            yield chunk;
        }
        return;
    }

    const provider = createOpenAICompatible({
        name: "niyun",
        baseURL: settings.baseUrl,
        apiKey: settings.apiKey,
        fetch: fetchImpl,
        transformRequestBody: (args) => {
            if (settings.thinkingEnabled) {
                args.thinking = { type: "enabled" };
                if (settings.reasoningEffort) {
                    args.reasoning_effort = settings.reasoningEffort;
                }
            } else {
                args.thinking = { type: "disabled" };
            }
            return args;
        },
    });

    const result = streamText({
        ...common,
        model: provider.chatModel(settings.model),
    });

    for await (const chunk of result.textStream) {
        yield chunk;
    }
}
