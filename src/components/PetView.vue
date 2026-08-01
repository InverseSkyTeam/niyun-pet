<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from "vue";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface Msg {
    role: "user" | "assistant";
    content: string;
}

type Mood = "neutral" | "happy" | "shy" | "angry" | "sleepy";

const props = defineProps<{
    history: Msg[];
    waiting: boolean;
    streamed: string;
    mood?: Mood;
}>();

const emit = defineEmits<{
    send: [text: string];
    openSettings: [];
}>();

const inputText = ref("");
const inputEl = ref<HTMLInputElement | null>(null);
const msgListEl = ref<HTMLDivElement | null>(null);
const menuVisible = ref(false);
const menuPos = ref({ x: 0, y: 0 });
const autoScroll = ref(true);
const squishing = ref(false);

const displayMsgs = computed(() => {
    const msgs: { role: "user" | "assistant"; content: string }[] = [...props.history];
    if (props.waiting && props.streamed) {
        msgs.push({ role: "assistant", content: props.streamed });
    }
    return msgs;
});

function send() {
    const text = inputText.value;
    if (!text.trim()) return;
    inputText.value = "";
    emit("send", text);
    nextTick(() => inputEl.value?.focus());
}

function onWheel(e: WheelEvent) {
    const el = msgListEl.value;
    if (!el) return;
    el.scrollTop += e.deltaY;
    autoScroll.value = el.scrollTop + el.clientHeight >= el.scrollHeight - 20;
}

watch(
    () => props.history.length + props.streamed.length,
    async () => {
        if (autoScroll.value) {
            await nextTick();
            const el = msgListEl.value;
            if (el) el.scrollTop = el.scrollHeight;
        }
    },
);

function openMenu(e: MouseEvent) {
    menuVisible.value = true;
    const w = 130;
    const h = 80;
    let x = e.clientX;
    let y = e.clientY;
    if (x + w > window.innerWidth) x = window.innerWidth - w - 4;
    if (y + h > window.innerHeight) y = window.innerHeight - h - 4;
    menuPos.value = { x, y };
}

function closePet() {
    getCurrentWindow().close();
}

function closeMenu() {
    menuVisible.value = false;
}

let moveDebounce: ReturnType<typeof setTimeout> | undefined;
let unlistenMove: (() => void) | undefined;

function onPetMouseDown(e: MouseEvent) {
    if (e.button === 0) {
        squishing.value = true;
        getCurrentWindow().startDragging();
        moveDebounce = setTimeout(() => {
            squishing.value = false;
        }, 150);
    }
}

onMounted(async () => {
    unlistenMove = await getCurrentWindow().onMoved(() => {
        if (moveDebounce) clearTimeout(moveDebounce);
        moveDebounce = setTimeout(() => {
            squishing.value = false;
        }, 80);
    });
});

onUnmounted(() => {
    unlistenMove?.();
});
</script>

<template>
    <div class="pet-root" @mousedown="menuVisible = false">
        <div
            class="pet-area"
            :class="{ squishing: squishing }"
            @mousedown="onPetMouseDown"
            @contextmenu.prevent="openMenu"
            @click="menuVisible = false"
        >
            <div class="pet-mood" :class="'mood-' + (mood || 'neutral')">
                <div class="pet-img"></div>
            </div>
        </div>

        <div class="panel">
            <div class="bubble">
                <div class="bubble-arrow"></div>
                <div class="msg-list" ref="msgListEl" @wheel="onWheel">
                    <template v-if="displayMsgs.length">
                        <div v-for="(m, i) in displayMsgs" :key="i" class="msg" :class="m.role">
                            <span class="label">{{ m.role === "user" ? "我: " : "逆云: " }}</span>
                            <span class="content">{{ m.content }}</span>
                        </div>
                    </template>
                    <div v-else class="hint">和我说说话吧~</div>
                </div>
            </div>

            <div class="input-row">
                <input
                    v-if="!waiting"
                    ref="inputEl"
                    v-model="inputText"
                    class="input"
                    placeholder="输入消息, 按 Enter 发送..."
                    maxlength="400"
                    @keydown.enter.prevent="send"
                />
                <div v-else class="waiting">
                    <span class="dot"></span>
                    逆云正在回复中, 请稍候...
                </div>
            </div>
        </div>

        <div
            v-if="menuVisible"
            class="context-menu"
            :style="{ left: menuPos.x + 'px', top: menuPos.y + 'px' }"
            @mousedown.stop
        >
            <button
                class="menu-item"
                @click="
                    emit('openSettings');
                    menuVisible = false;
                "
            >
                设置
            </button>
            <button
                class="menu-item"
                @click="
                    closePet();
                    menuVisible = false;
                "
            >
                关闭
            </button>
        </div>
    </div>
</template>

<style scoped>
.pet-root {
    position: relative;
    width: 100%;
    height: 100%;
    background: transparent;
}

.pet-area {
    position: absolute;
    left: 0;
    top: 0;
    width: 192px;
    height: 210px;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.pet-area.squishing {
    transform: scaleY(0.82) scaleX(1.15);
    transition: transform 0.1s ease-out;
}

.pet-mood {
    width: 100%;
    height: 100%;
    transition:
        filter 0.4s ease,
        transform 0.4s ease;
}

.pet-mood.mood-happy {
    filter: brightness(1.08) saturate(1.15);
    animation: bounce 0.7s ease-in-out;
}

.pet-mood.mood-shy {
    filter: hue-rotate(-15deg) saturate(1.4) brightness(1.05);
    animation: shake 0.5s ease-in-out 2;
}

.pet-mood.mood-angry {
    filter: hue-rotate(-25deg) saturate(1.6) brightness(1.08);
    animation: angry-shake 0.18s ease-in-out infinite;
}

.pet-mood.mood-sleepy {
    filter: brightness(0.82) saturate(0.8);
    animation: slow-breathe 4.5s ease-in-out infinite;
}

.pet-img {
    width: 100%;
    height: 100%;
    background-image: url("/1.png");
    background-size: 100% 100%;
    background-repeat: no-repeat;
    background-position: center;
    animation: breathe 3.2s ease-in-out infinite;
}

@keyframes breathe {
    0%,
    100% {
        transform: scaleY(1);
    }
    50% {
        transform: scaleY(1.03);
    }
}

@keyframes slow-breathe {
    0%,
    100% {
        transform: rotate(-4deg) scaleY(1);
    }
    50% {
        transform: rotate(-4deg) scaleY(1.02);
    }
}

@keyframes bounce {
    0%,
    100% {
        transform: translateY(0);
    }
    50% {
        transform: translateY(-10px);
    }
}

@keyframes shake {
    0%,
    100% {
        transform: translateX(0);
    }
    25% {
        transform: translateX(-4px);
    }
    75% {
        transform: translateX(4px);
    }
}

@keyframes angry-shake {
    0%,
    100% {
        transform: translateX(0) rotate(0);
    }
    25% {
        transform: translateX(-3px) rotate(-1.5deg);
    }
    75% {
        transform: translateX(3px) rotate(1.5deg);
    }
}

.panel {
    position: absolute;
    left: 200px;
    top: 5px;
    width: 300px;
    height: 220px;
}

.bubble {
    position: relative;
    width: 100%;
    height: 155px;
    background: rgba(255, 248, 243, 0.95);
    border: 1px solid rgba(255, 214, 224, 0.9);
    border-radius: 16px;
    box-shadow: 0 4px 16px rgba(255, 122, 156, 0.15);
    overflow: hidden;
}

.bubble-arrow {
    position: absolute;
    left: -10px;
    top: 24px;
    width: 0;
    height: 0;
    border-top: 9px solid transparent;
    border-bottom: 9px solid transparent;
    border-right: 11px solid rgba(255, 248, 243, 0.95);
    filter: drop-shadow(-1px 0 0 rgba(255, 214, 224, 0.9));
}

.msg-list {
    position: absolute;
    inset: 0;
    padding: 10px 12px;
    overflow-y: auto;
    overflow-x: hidden;
}

.msg {
    font-size: 14px;
    line-height: 1.6;
    word-break: break-word;
    white-space: pre-wrap;
    margin-bottom: 4px;
}

.msg.user .label {
    color: #ff5a82;
    font-weight: 600;
}
.msg.user .content {
    color: #5c3d4e;
}
.msg.assistant .label {
    color: #9d6fd8;
    font-weight: 600;
}
.msg.assistant .content {
    color: #3d2f3f;
}

.hint {
    color: #9d6f7e;
    font-size: 14px;
    padding-top: 4px;
}

.input-row {
    position: absolute;
    top: 166px;
    left: 0;
    width: 100%;
    height: 40px;
}

.input {
    width: 100%;
    height: 36px;
    padding: 0 12px;
    border: 1px solid rgba(255, 205, 214, 0.9);
    border-radius: 12px;
    background: rgba(255, 240, 245, 0.95);
    color: #4a3a44;
    font-size: 14px;
    caret-color: #ff7a9c;
    outline: none;
    transition:
        border-color 0.15s ease,
        box-shadow 0.15s ease;
}

.input::placeholder {
    color: rgba(255, 122, 156, 0.5);
    font-size: 13px;
}

.input:focus {
    border-color: #ff7a9c;
    box-shadow: 0 0 0 2px rgba(255, 122, 156, 0.2);
}

.waiting {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 36px;
    padding: 0 12px;
    border: 1px dashed rgba(255, 205, 214, 0.8);
    border-radius: 12px;
    background: rgba(255, 240, 245, 0.8);
    color: #9d6f7e;
    font-size: 13px;
}

.dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ff7a9c;
    animation: blink 1s ease-in-out infinite;
}

@keyframes blink {
    0%,
    100% {
        opacity: 0.25;
        transform: scale(0.8);
    }
    50% {
        opacity: 1;
        transform: scale(1.1);
    }
}

.context-menu {
    position: absolute;
    z-index: 100;
    width: 130px;
    background: rgba(74, 58, 68, 0.96);
    border: 1px solid rgba(107, 85, 96, 0.8);
    border-radius: 10px;
    padding: 4px;
    box-shadow: 0 6px 20px rgba(255, 122, 156, 0.2);
}

.menu-item {
    width: 100%;
    padding: 8px 0;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: #fff8f3;
    font-size: 14px;
    font-family: inherit;
    cursor: pointer;
    transition: background 0.12s ease;
}

.menu-item:hover {
    background: rgba(255, 122, 156, 0.3);
}
</style>
