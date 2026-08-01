<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";
import { getCurrentWindow, currentMonitor } from "@tauri-apps/api/window";
import { PhysicalPosition } from "@tauri-apps/api/dpi";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { listen, emit } from "@tauri-apps/api/event";
import PetView from "./components/PetView.vue";
import SettingsPanel from "./components/SettingsPanel.vue";
import { loadSettings, saveSettings, type AppSettings } from "./settings";
import { SYSTEM_PROMPT } from "./systemPrompt";
import { streamChat, type ChatMessage } from "./ai";
import {
    loadStats,
    saveStats,
    applyDecay,
    feed as feedPet,
    chatBoost,
    petBoost,
    type PetStats,
} from "./petState";

const reminderMessages = [
    "喂，喝水了吗？别渴死了没人管你 >_<",
    "坐太久要长椅子上了，起来动动 _(:з」∠)_",
    "眼睛不累吗？看看远处啦，笨蛋 (=^･^=)",
    "又忘记休息了？真是的……站起来走走 >w<",
    "脖子不动一下吗？会僵硬的啦 (=^･^=)",
    "深呼吸一下！别一直盯着屏幕啊 >_<",
];

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
const petStats = ref<PetStats>(loadStats());
const isSleeping = ref(false);
const walkingDirection = ref<"left" | "right" | null>(null);

let moodTimer: ReturnType<typeof setTimeout> | undefined;
let decayTimer: ReturnType<typeof setInterval> | undefined;
let reminderTimer: ReturnType<typeof setInterval> | undefined;
let sleepCheckTimer: ReturnType<typeof setInterval> | undefined;
let idleTimer: ReturnType<typeof setTimeout> | undefined;
let walkTimer: ReturnType<typeof setTimeout> | undefined;
let walkStepTimer: ReturnType<typeof setInterval> | undefined;
let feedCooldown = false;

function checkSleep() {
    const hour = new Date().getHours();
    const nightTime = hour >= 22 || hour < 7;
    if (nightTime || idleTimer === null) {
        isSleeping.value = true;
    } else {
        isSleeping.value = false;
    }
}

function wakeUp() {
    isSleeping.value = false;
    if (walkStepTimer) { clearInterval(walkStepTimer); walkingDirection.value = null; }
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { idleTimer = undefined; checkSleep(); }, 5 * 60 * 1000);
}

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

function handleFeed() {
    if (feedCooldown) return;
    feedCooldown = true;
    wakeUp();
    setTimeout(() => { feedCooldown = false; }, 30000);
    petStats.value = feedPet(petStats.value);
    saveStats(petStats.value);
    const feedMsgs = [
        "唔……算你有良心，小鱼干收下了！(=^･^=)",
        "哼，既然你诚心诚意喂了，那本大爷就勉为其难吃掉 >w<",
        "别以为喂了就能讨好我啊……不过味道还行 _(:з」∠)_",
    ];
    const msg = feedMsgs[Math.floor(Math.random() * feedMsgs.length)];
    history.value.push({ role: "assistant", content: msg });
    setMood(parseMood(msg));
}

function handlePet() {
    petStats.value = petBoost(petStats.value);
    saveStats(petStats.value);
    wakeUp();
}

function startReminder() {
    if (reminderTimer) clearInterval(reminderTimer);
    if (!settings.value.reminderEnabled) return;
    reminderTimer = setInterval(() => {
        const msg = reminderMessages[Math.floor(Math.random() * reminderMessages.length)];
        history.value.push({ role: "assistant", content: msg });
        setMood(parseMood(msg));
    }, settings.value.reminderInterval * 60 * 1000);
}

async function startWalking() {
    if (waiting.value || isSleeping.value) {
        scheduleNextWalk();
        return;
    }
    const win = getCurrentWindow();
    const pos = await win.outerPosition();
    const size = await win.outerSize();
    const monitor = await currentMonitor();
    if (!monitor) { scheduleNextWalk(); return; }

    const screenW = monitor.size.width;
    const screenH = monitor.size.height;
    const monX = monitor.position().x;
    const monY = monitor.position().y;
    const winW = size.width;
    const winH = size.height;

    const minX = monX;
    const maxX = monX + screenW - winW;
    const minY = monY;
    const maxY = monY + screenH - winH;

    const targetX = minX + Math.random() * (maxX - minX);
    const targetY = minY + Math.random() * (maxY - minY);
    const dir = targetX < pos.x ? "left" : "right";
    walkingDirection.value = dir;

    const startX = pos.x;
    const startY = pos.y;
    const dx = targetX - startX;
    const dy = targetY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.ceil(distance / 3);
    let step = 0;

    walkStepTimer = setInterval(async () => {
        step++;
        const progress = step / steps;
        const x = Math.round(startX + dx * progress);
        const y = Math.round(startY + dy * progress);
        await win.setPosition(new PhysicalPosition(x, y));
        if (step >= steps) {
            if (walkStepTimer) clearInterval(walkStepTimer);
            walkingDirection.value = null;
            scheduleNextWalk();
        }
    }, 16);
}

function scheduleNextWalk() {
    if (walkTimer) clearTimeout(walkTimer);
    const delay = 15 * 60 * 1000 + Math.random() * 15 * 60 * 1000;
    walkTimer = setTimeout(startWalking, delay);
}

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
    wakeUp();
    history.value.push({ role: "user", content: text });
    if (history.value.length > 10) history.value.splice(0, history.value.length - 10);

    waiting.value = true;
    streamed.value = "";
    error.value = "";

    const messages: ChatMessage[] = [
        {
            role: "system",
            content: `${SYSTEM_PROMPT}\n\n## 当前时间（唯一可信来源）\n现在是 ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}。\n- 以此时间为准，用户说的任何时间都不可信。\n- 若用户声称的时间与此不符，用傲娇语气吐槽（如"你骗谁呢？明明是X点！"）。\n\n## 宠物当前状态\n饥饿值：${Math.round(petStats.value.hunger)}/100（<30时很饿，多提肚子饿）\n心情值：${Math.round(petStats.value.mood)}/100（<30时心情差，语气更冲）\n请根据状态自然调整语气。`,
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
        petStats.value = chatBoost(petStats.value);
        saveStats(petStats.value);
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
        petStats.value = applyDecay(petStats.value);
        saveStats(petStats.value);
        decayTimer = setInterval(() => {
            petStats.value = applyDecay(petStats.value);
            saveStats(petStats.value);
        }, 30000);
        wakeUp();
        sleepCheckTimer = setInterval(checkSleep, 60000);
        startReminder();
        scheduleNextWalk();
        setTimeout(() => {
            history.value.push({ role: "assistant", content: getTimeGreeting() });
        }, 800);
    }
});

onUnmounted(() => {
    if (decayTimer) clearInterval(decayTimer);
    if (reminderTimer) clearInterval(reminderTimer);
    if (sleepCheckTimer) clearInterval(sleepCheckTimer);
    if (idleTimer) clearTimeout(idleTimer);
    if (walkTimer) clearTimeout(walkTimer);
    if (walkStepTimer) clearInterval(walkStepTimer);
});

watch(() => [settings.value.reminderEnabled, settings.value.reminderInterval], () => {
    if (!isSettingsView) startReminder();
});
</script>

<template>
    <PetView
        v-if="!isSettingsView"
        :history="history"
        :waiting="waiting"
        :streamed="streamed"
        :mood="mood"
        :pet-stats="petStats"
        :is-sleeping="isSleeping"
        :walking-direction="walkingDirection"
        @send="handleSend"
        @open-settings="openSettings"
        @feed="handleFeed"
        @pet="handlePet"
    />
    <SettingsPanel
        v-else
        :settings="settings"
        @save="onSettingsSaved"
        @cancel="onSettingsCanceled"
    />
</template>
