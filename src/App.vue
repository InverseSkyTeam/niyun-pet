<script setup lang="ts">
import { ref, onMounted } from "vue";
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

const isSettingsView = new URLSearchParams(window.location.search).get("view") === "settings";

const settings = ref<AppSettings>(loadSettings());
const history = ref<Msg[]>([]);
const waiting = ref(false);
const streamed = ref("");
const error = ref("");

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
        decorations: true,
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
        { role: "system", content: SYSTEM_PROMPT },
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
                /* keep raw */
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
    }
    if (error.value) {
        history.value.push({ role: "assistant", content: "[错误] " + error.value });
    }
    streamed.value = "";
    waiting.value = false;
}

onMounted(() => {
    if (!isSettingsView) {
        listen<AppSettings>("settings-saved", (e) => {
            settings.value = e.payload;
        });
    }
});
</script>

<template>
    <PetView
        v-if="!isSettingsView"
        :history="history"
        :waiting="waiting"
        :streamed="streamed"
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
