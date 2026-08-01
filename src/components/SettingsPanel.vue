<script setup lang="ts">
import { reactive, ref, computed, onMounted } from "vue";
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

function save() {
    emit("save", {
        ...props.settings,
        apiKey: form.apiKey.trim(),
        baseUrl: form.baseUrl.trim(),
        model: form.model.trim(),
        thinkingEnabled: form.thinkingEnabled,
        reasoningEffort: form.reasoningEffort.trim(),
    });
}
</script>

<template>
    <div class="h-screen overflow-y-auto bg-slate-50 font-sans">
        <div class="min-h-full flex items-center justify-center p-6">
            <div class="w-full max-w-3xl">
                <div class="mb-8">
                    <h1 class="text-2xl font-semibold tracking-tight text-slate-900">设置</h1>
                    <p class="mt-1.5 text-sm text-slate-500">配置 AI 桌宠的模型接口与推理参数。</p>
                </div>

                <div class="mb-6">
                    <div class="text-xs font-medium text-slate-500 mb-2.5 uppercase tracking-wider">
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
                                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm'
                            "
                            @click="applyPreset(p)"
                        >
                            {{ p.name }}
                        </button>
                    </div>
                </div>

                <div class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div
                        class="grid grid-cols-[240px_1fr] gap-6 px-7 py-5 border-b border-slate-100"
                    >
                        <div class="pt-0.5">
                            <div class="text-sm font-medium text-slate-900">API Key</div>
                            <div class="mt-1 text-xs text-slate-500 leading-relaxed">
                                用于鉴权的密钥，仅保存在本机。
                            </div>
                        </div>
                        <div class="space-y-1.5">
                            <input
                                id="api-key"
                                ref="apiKeyInput"
                                v-model="form.apiKey"
                                type="password"
                                class="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-900 transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:ring-offset-0 focus:outline-none shadow-sm"
                                placeholder="sk-..."
                                maxlength="400"
                            />
                            <p class="text-xs text-slate-400">{{ form.apiKey.length }} 字符</p>
                        </div>
                    </div>

                    <div
                        class="grid grid-cols-[240px_1fr] gap-6 px-7 py-5 border-b border-slate-100"
                    >
                        <div class="pt-0.5">
                            <div class="text-sm font-medium text-slate-900">Base URL</div>
                            <div class="mt-1 text-xs text-slate-500 leading-relaxed">
                                OpenAI 兼容接口地址。
                            </div>
                        </div>
                        <div class="space-y-1.5">
                            <input
                                id="base-url"
                                v-model="form.baseUrl"
                                type="text"
                                class="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-900 transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:ring-offset-0 focus:outline-none font-mono shadow-sm"
                                placeholder="https://api.example.com/v1"
                                maxlength="200"
                            />
                            <div class="flex items-center gap-2">
                                <span
                                    class="inline-flex items-center h-5 px-2.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600"
                                >
                                    {{ detectedProvider }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div
                        class="grid grid-cols-[240px_1fr] gap-6 px-7 py-5 border-b border-slate-100"
                    >
                        <div class="pt-0.5">
                            <div class="text-sm font-medium text-slate-900">Model</div>
                            <div class="mt-1 text-xs text-slate-500 leading-relaxed">
                                调用的模型 ID。
                            </div>
                        </div>
                        <input
                            id="model"
                            v-model="form.model"
                            type="text"
                            class="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-900 transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:ring-offset-0 focus:outline-none font-mono shadow-sm"
                            placeholder="glm-4.7-flash"
                            maxlength="100"
                        />
                    </div>

                    <div
                        class="grid grid-cols-[240px_1fr] gap-6 px-7 py-5 border-b border-slate-100"
                    >
                        <div class="pt-0.5">
                            <div class="text-sm font-medium text-slate-900">思考模式</div>
                            <div class="mt-1 text-xs text-slate-500 leading-relaxed">
                                启用链式推理（CoT）。
                            </div>
                        </div>
                        <div class="flex items-center gap-3 h-10">
                            <button
                                class="relative h-6 w-11 rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 focus-visible:ring-offset-2"
                                :class="form.thinkingEnabled ? 'bg-slate-900' : 'bg-slate-200'"
                                role="switch"
                                :aria-checked="form.thinkingEnabled"
                                @click="form.thinkingEnabled = !form.thinkingEnabled"
                            >
                                <span
                                    class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200"
                                    :class="
                                        form.thinkingEnabled ? 'translate-x-5' : 'translate-x-0'
                                    "
                                />
                            </button>
                            <span class="text-sm text-slate-600">{{
                                form.thinkingEnabled ? "已启用" : "已禁用"
                            }}</span>
                        </div>
                    </div>

                    <div
                        class="grid grid-cols-[240px_1fr] gap-6 px-7 py-5 border-b border-slate-100"
                    >
                        <div class="pt-0.5">
                            <div class="text-sm font-medium text-slate-900">Reason Effort</div>
                            <div class="mt-1 text-xs text-slate-500 leading-relaxed">
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
                                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
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
                        class="grid grid-cols-[240px_1fr] gap-6 px-7 py-5 border-b border-slate-100"
                    >
                        <div class="pt-0.5">
                            <div class="text-sm font-medium text-slate-900">兼容性</div>
                            <div class="mt-1 text-xs text-slate-500 leading-relaxed">
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

                    <div class="flex items-center justify-end gap-2.5 px-7 py-5 bg-slate-50/70">
                        <button
                            type="button"
                            class="h-9 px-4 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
                            @click="emit('cancel')"
                        >
                            取消
                        </button>
                        <button
                            type="button"
                            class="h-9 px-5 rounded-lg bg-slate-900 text-sm font-medium text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 focus-visible:ring-offset-2 shadow-sm"
                            @click="save"
                        >
                            保存更改
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
