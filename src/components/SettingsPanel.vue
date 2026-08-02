<script setup lang="ts">
import { reactive, ref, computed, onMounted } from "vue";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { AppSettings } from "../settings";

const props = defineProps<{ settings: AppSettings }>();

const emit = defineEmits<{
    save: [s: AppSettings];
    cancel: [];
}>();

const form = reactive({
    apiKey: props.settings.apiKey,
    baseUrl: props.settings.baseUrl,
    model: props.settings.model,
    thinkingEnabled: props.settings.thinkingEnabled,
    reasoningEffort: props.settings.reasoningEffort,
    reminderEnabled: props.settings.reminderEnabled,
    reminderInterval: props.settings.reminderInterval,
});

const apiKeyInput = ref<HTMLInputElement | null>(null);
onMounted(() => setTimeout(() => apiKeyInput.value?.focus(), 80));

const presets = [
    { name: "ZHIPU", baseUrl: "https://open.bigmodel.cn/api/paas/v4", model: "glm-4.7-flash" },
    { name: "DeepSeek", baseUrl: "https://api.deepseek.com", model: "deepseek-v4-flash" },
    { name: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
];

function applyPreset(p: (typeof presets)[number]) {
    form.baseUrl = p.baseUrl;
    form.model = p.model;
}

const detectedProvider = computed(() => {
    const u = form.baseUrl.toLowerCase();
    if (u.includes("deepseek")) return "DeepSeek";
    if (u.includes("bigmodel") || u.includes("zhipu")) return "ZHIPU";
    if (u.includes("openai")) return "OpenAI";
    return "Custom";
});

const effortOptions = ["low", "medium", "high", "xhigh", "max"] as const;
const intervalOptions = [15, 30, 45, 60, 90] as const;

function save() {
    emit("save", {
        ...props.settings,
        apiKey: form.apiKey.trim(),
        baseUrl: form.baseUrl.trim(),
        model: form.model.trim(),
        thinkingEnabled: form.thinkingEnabled,
        reasoningEffort: form.reasoningEffort.trim(),
        reminderEnabled: form.reminderEnabled,
        reminderInterval: form.reminderInterval,
    });
}

function closeSettings() {
    getCurrentWindow().close();
}
</script>

<template>
    <div class="h-screen flex flex-col bg-stone-50 font-sans overflow-hidden">
        <div
            class="title-bar flex items-center justify-between px-4 py-3 bg-white/70 backdrop-blur-md border-b border-stone-200"
            data-tauri-drag-region
        >
            <div class="flex items-center gap-2">
                <span class="text-stone-600 text-sm font-medium tracking-wide">设置</span>
            </div>
            <button
                class="title-btn w-7 h-7 rounded-md flex items-center justify-center text-stone-400 hover:bg-stone-200 hover:text-stone-600 transition-all duration-150"
                @click="closeSettings"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                    <line x1="6" y1="6" x2="18" y2="18" />
                    <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
            </button>
        </div>

        <div class="flex-1 overflow-y-auto">
            <div class="min-h-full flex items-center justify-center p-6">
                <div class="w-full max-w-3xl">
                    <div class="mb-8">
                        <h1 class="text-2xl font-semibold tracking-tight text-stone-800">设置</h1>
                        <p class="mt-1.5 text-sm text-stone-400">配置 AI 桌宠的模型接口与推理参数。</p>
                    </div>

                <div class="mb-6">
                    <div class="text-xs font-medium text-stone-500 mb-2.5 uppercase tracking-wider">
                        模型预设
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <button
                            v-for="p in presets"
                            :key="p.name"
                            type="button"
                            class="h-9 px-4 rounded-md border text-sm font-medium transition-all duration-200"
                            :class="
                                detectedProvider === p.name
                                    ? 'border-stone-700 bg-stone-700 text-white shadow-sm'
                                    : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-100 hover:shadow-sm'
                            "
                            @click="applyPreset(p)"
                        >
                            {{ p.name }}
                        </button>
                    </div>
                </div>

                <div class="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
                    <div
                        class="grid grid-cols-[240px_1fr] gap-6 px-7 py-5 border-b border-stone-100"
                    >
                        <div class="pt-0.5">
                            <div class="text-sm font-medium text-stone-800">API Key</div>
                            <div class="mt-1 text-xs text-stone-400 leading-relaxed">
                                用于鉴权的密钥，仅保存在本机。
                            </div>
                        </div>
                        <div class="space-y-1.5">
                            <input
                                id="api-key"
                                ref="apiKeyInput"
                                v-model="form.apiKey"
                                type="password"
                                class="flex h-10 w-full rounded-lg border border-stone-200 bg-white px-3.5 text-sm text-stone-800 transition-all duration-200 placeholder:text-stone-400 hover:border-stone-300 focus:border-stone-500 focus:ring-2 focus:ring-stone-500/10 focus:ring-offset-0 focus:outline-none shadow-sm"
                                placeholder="sk-..."
                                maxlength="400"
                            />
                            <p class="text-xs text-stone-400">{{ form.apiKey.length }} 字符</p>
                        </div>
                    </div>

                    <div
                        class="grid grid-cols-[240px_1fr] gap-6 px-7 py-5 border-b border-stone-100"
                    >
                        <div class="pt-0.5">
                            <div class="text-sm font-medium text-stone-800">Base URL</div>
                            <div class="mt-1 text-xs text-stone-400 leading-relaxed">
                                OpenAI 兼容接口地址。
                            </div>
                        </div>
                        <div class="space-y-1.5">
                            <input
                                id="base-url"
                                v-model="form.baseUrl"
                                type="text"
                                class="flex h-10 w-full rounded-lg border border-stone-200 bg-white px-3.5 text-sm text-stone-800 transition-all duration-200 placeholder:text-stone-400 hover:border-stone-300 focus:border-stone-500 focus:ring-2 focus:ring-stone-500/10 focus:ring-offset-0 focus:outline-none font-mono shadow-sm"
                                placeholder="https://api.example.com/v1"
                                maxlength="200"
                            />
                            <div class="flex items-center gap-2">
                                <span
                                    class="inline-flex items-center h-5 px-2.5 rounded-full text-[11px] font-medium bg-stone-100 text-stone-600"
                                >
                                    {{ detectedProvider }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div
                        class="grid grid-cols-[240px_1fr] gap-6 px-7 py-5 border-b border-stone-100"
                    >
                        <div class="pt-0.5">
                            <div class="text-sm font-medium text-stone-800">Model</div>
                            <div class="mt-1 text-xs text-stone-400 leading-relaxed">
                                调用的模型 ID。
                            </div>
                        </div>
                        <input
                            id="model"
                            v-model="form.model"
                            type="text"
                            class="flex h-10 w-full rounded-lg border border-stone-200 bg-white px-3.5 text-sm text-stone-800 transition-all duration-200 placeholder:text-stone-400 hover:border-stone-300 focus:border-stone-500 focus:ring-2 focus:ring-stone-500/10 focus:ring-offset-0 focus:outline-none font-mono shadow-sm"
                            placeholder="glm-4.7-flash"
                            maxlength="100"
                        />
                    </div>

                    <div
                        class="grid grid-cols-[240px_1fr] gap-6 px-7 py-5 border-b border-stone-100"
                    >
                        <div class="pt-0.5">
                            <div class="text-sm font-medium text-stone-800">思考模式</div>
                            <div class="mt-1 text-xs text-stone-400 leading-relaxed">
                                启用链式推理（CoT）。
                            </div>
                        </div>
                        <div class="flex items-center gap-3 h-10">
                            <button
                                class="relative h-6 w-11 rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500/20 focus-visible:ring-offset-2"
                                :class="form.thinkingEnabled ? 'bg-stone-700' : 'bg-stone-300'"
                                role="switch"
                                :aria-checked="form.thinkingEnabled"
                                @click="form.thinkingEnabled = !form.thinkingEnabled"
                            >
                                <span
                                    class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200"
                                    :class="form.thinkingEnabled ? 'translate-x-5' : 'translate-x-0'"
                                />
                            </button>
                            <span class="text-sm text-stone-500">{{
                                form.thinkingEnabled ? "已启用" : "已禁用"
                            }}</span>
                        </div>
                    </div>

                    <div
                        class="grid grid-cols-[240px_1fr] gap-6 px-7 py-5 border-b border-stone-100"
                    >
                        <div class="pt-0.5">
                            <div class="text-sm font-medium text-stone-800">Reason Effort</div>
                            <div class="mt-1 text-xs text-stone-400 leading-relaxed">
                                推理力度，仅在思考模式启用时生效。
                            </div>
                        </div>
                        <div class="flex flex-wrap gap-1.5">
                            <button
                                v-for="opt in effortOptions"
                                :key="opt"
                                type="button"
                                class="h-8 px-3.5 rounded-md border text-sm font-mono transition-all duration-200"
                                :class="
                                    form.reasoningEffort === opt
                                        ? 'border-stone-700 bg-stone-700 text-white shadow-sm'
                                        : 'border-stone-200 bg-white text-stone-500 hover:border-stone-300 hover:bg-stone-100'
                                "
                                @click="
                                    form.reasoningEffort = form.reasoningEffort === opt ? '' : opt
                                "
                            >
                                {{ opt }}
                            </button>
                        </div>
                    </div>

                    <div
                        class="grid grid-cols-[240px_1fr] gap-6 px-7 py-5 border-b border-stone-100"
                    >
                        <div class="pt-0.5">
                            <div class="text-sm font-medium text-stone-800">定时提醒</div>
                            <div class="mt-1 text-xs text-stone-400 leading-relaxed">
                                逆云会定时提醒你休息、喝水。
                            </div>
                        </div>
                        <div class="flex items-center gap-3 h-10">
                            <button
                                class="relative h-6 w-11 rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500/20 focus-visible:ring-offset-2"
                                :class="form.reminderEnabled ? 'bg-stone-700' : 'bg-stone-300'"
                                role="switch"
                                :aria-checked="form.reminderEnabled"
                                @click="form.reminderEnabled = !form.reminderEnabled"
                            >
                                <span
                                    class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200"
                                    :class="form.reminderEnabled ? 'translate-x-5' : 'translate-x-0'"
                                />
                            </button>
                            <div v-if="form.reminderEnabled" class="flex flex-wrap gap-1.5">
                                <button
                                    v-for="opt in intervalOptions"
                                    :key="opt"
                                    type="button"
                                    class="h-8 px-3.5 rounded-md border text-sm font-mono transition-all duration-200"
                                    :class="
                                        form.reminderInterval === opt
                                            ? 'border-stone-700 bg-stone-700 text-white shadow-sm'
                                            : 'border-stone-200 bg-white text-stone-500 hover:border-stone-300 hover:bg-stone-100'
                                    "
                                    @click="form.reminderInterval = opt"
                                >
                                    {{ opt }}min
                                </button>
                            </div>
                        </div>
                    </div>

                    <div
                        class="grid grid-cols-[240px_1fr] gap-6 px-7 py-5 border-b border-stone-100"
                    >
                        <div class="pt-0.5">
                            <div class="text-sm font-medium text-stone-800">兼容性</div>
                            <div class="mt-1 text-xs text-stone-400 leading-relaxed">
                                支持的接口协议。
                            </div>
                        </div>
                        <div class="flex items-center h-10">
                            <div
                                class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200/60"
                            >
                                <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#b45309"
                                    stroke-width="2.5"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <path
                                        d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                                    />
                                    <line x1="12" y1="9" x2="12" y2="13" />
                                    <line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                                <span class="text-xs text-amber-800 font-medium"
                                    >仅兼容 OpenAI 格式 API</span
                                >
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center justify-end gap-2.5 px-7 py-5 bg-stone-50">
                        <button
                            type="button"
                            class="h-9 px-4 rounded-lg border border-stone-200 bg-white text-sm font-medium text-stone-600 transition-all duration-200 hover:bg-stone-100 hover:border-stone-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500/20"
                            @click="emit('cancel')"
                        >
                            取消
                        </button>
                        <button
                            type="button"
                            class="h-9 px-5 rounded-lg bg-stone-700 text-sm font-medium text-white transition-all duration-200 hover:bg-stone-800 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500/20 focus-visible:ring-offset-2 shadow-sm"
                            @click="save"
                        >
                            保存更改
                        </button>
                    </div>
                </div>
            </div>
        </div>
        </div>
    </div>
</template>