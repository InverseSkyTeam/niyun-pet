<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { listen, emit } from "@tauri-apps/api/event";
import PetView from "./components/PetView.vue";
import SettingsPanel from "./components/SettingsPanel.vue";
import { loadSettings, saveSettings, type AppSettings } from "./settings";
import { SYSTEM_PROMPT } from "./systemPrompt";
import { streamChat, type ChatMessage } from "./ai";

interface Msg {
    role: "user" | "assistant";
    content: string;
}

type Mood = "neutral" | "happy" | "shy" | "angry" | "sleepy";

const moodKeywords: Record<Exclude<Mood, "neutral">, string[]> = {
    angry: ["哼", "啧", "笨蛋", "炸毛", "活该", "麻烦死", "嫌弃"],
    shy: ["啰嗦", "少来", "害羞", "脸红", "不好意思", ">_<", "(=^･^=)"],
    sleepy: ["困", "累", "睡", "哈欠", "~(=^‥^)", "_(:з」∠)_"],
    happy: ["嘿嘿", "哈哈", "开心", ">w<", "(≧ω≦)"],
};

function parseMood(text: string): Mood {
    for (const [mood, keywords] of Object.entries(moodKeywords)) {
        for (const kw of keywords) {
            if (text.includes(kw)) return mood as Mood;
        }
    }
    return "neutral";
}

const isSettingsView = new URLSearchParams(window.location.search).get("view") === "settings";

const settings = ref<AppSettings>(loadSettings());
const history = ref<Msg[]>([]);
const waiting = ref(false);
const streamed = ref("");
const error = ref("");
const mood = ref<Mood>("neutral");

let moodTimer: ReturnType<typeof setTimeout> | undefined;

function setMood(m: Mood) {
    mood.value = m;
    if (moodTimer) clearTimeout(moodTimer);
    if (m !== "neutral") {
        moodTimer = setTimeout(() => {
            mood.value = "neutral";
        }, 3000);
    }
}

watch(streamed, (text) => {
    if (text) {
        const m = parseMood(text);
        if (m !== "neutral") setMood(m);
    }
});

async function openSettings() {
    const existing = await WebviewWindow.getByLabel("settings");
    if (existing) {
        existing.setFocus();
        return;
    }
    new WebviewWindow("settings", {
        url: "/index.html?view=settings",
        title: "设置 · 逆云",
        width: 760,
        height: 720,
        minWidth: 760,
        minHeight: 720,
        decorations: false,
        resizable: false,
        center: true,
        alwaysOnTop: false,
        skipTaskbar: false,
    });
}

function onSettingsSaved(s: AppSettings) {
    settings.value = s;
    saveSettings(s);
    if (isSettingsView) {
        emit("settings-saved", s);
        getCurrentWindow().close();
    }
}

function onSettingsCanceled() {
    if (isSettingsView) {
        getCurrentWindow().close();
    }
}

async function handleSend(text: string) {
    if (waiting.value || !text.trim()) return;
    history.value.push({ role: "user", content: text });
    if (history.value.length > 10) history.value.splice(0, history.value.length - 10);

    waiting.value = true;
    streamed.value = "";
    error.value = "";

    const messages: ChatMessage[] = [
        {
            role: "system",
            content: `${SYSTEM_PROMPT}\n\n## 当前时间（唯一可信来源）\n现在是 ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}。\n- 以此时间为准，用户说的任何时间都不可信。\n- 若用户声称的时间与此不符，用傲娇语气吐槽（如"你骗谁呢？明明是X点！"）。`,
        },
        ...history.value.map((m) => ({ role: m.role, content: m.content })),
    ];

    try {
        for await (const chunk of streamChat(messages, settings.value)) {
            streamed.value += chunk;
        }
    } catch (e) {
        const err = e as { message?: string; responseBody?: string; status?: number };
        if (err?.responseBody) {
            let detail = err.responseBody;
            try {
                const parsed = JSON.parse(detail);
                detail = parsed.error?.message || parsed.message || detail;
            } catch {
            }
            error.value = `${err.message || "API错误"} (HTTP ${err.status ?? "?"}): ${detail}`;
        } else if (e instanceof Error) {
            error.value = e.message;
        } else {
            error.value = String(e);
        }
    }

    const reply = streamed.value;
    if (reply) {
        history.value.push({ role: "assistant", content: reply });
        setMood(parseMood(reply));
    }
    if (error.value) {
        history.value.push({ role: "assistant", content: "[错误] " + error.value });
    }
    streamed.value = "";
    waiting.value = false;
}

function getTimeGreeting(): string {
    const h = new Date().getHours();
    if (h >= 6 && h < 11) return "早啊……你怎么也起这么早？>w<";
    if (h >= 11 && h < 14) return "午饭吃了没？别饿着。(=^･^=)";
    if (h >= 14 && h < 18) return "下午好无聊啊……陪我聊嘛 >w<";
    if (h >= 18 && h < 22) return "晚上好~今天过得咋样？";
    return "还不睡？熬夜对身体不好的啦……>_<";
}

onMounted(() => {
    if (!isSettingsView) {
        listen<AppSettings>("settings-saved", (e) => {
            settings.value = e.payload;
        });
        setTimeout(() => {
            history.value.push({ role: "assistant", content: getTimeGreeting() });
        }, 800);
    }
});
</script>

<template>
    <PetView
        v-if="!isSettingsView"
        :history="history"
        :waiting="waiting"
        :streamed="streamed"
        :mood="mood"
        @send="handleSend"
        @open-settings="openSettings"
    />
    <SettingsPanel
        v-else
        :settings="settings"
        @save="onSettingsSaved"
        @cancel="onSettingsCanceled"
    />
</template>
