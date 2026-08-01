<script setup lang="ts">
import { ref, computed, nextTick, watch } from "vue";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface Msg {
    role: "user" | "assistant";
    content: string;
}

const props = defineProps<{
    history: Msg[];
    waiting: boolean;
    streamed: string;
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

function onPetMouseDown(e: MouseEvent) {
    if (e.button === 0) {
        getCurrentWindow().startDragging();
    }
}
</script>

<template>
    <div class="pet-root" @mousedown="menuVisible = false">
        <div
            class="pet-area"
            @mousedown="onPetMouseDown"
            @contextmenu.prevent="openMenu"
            @click="menuVisible = false"
        >
            <div class="pet-img"></div>
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
}

.pet-img {
    width: 100%;
    height: 100%;
    background-image: url("/1.png");
    background-size: 100% 100%;
    background-repeat: no-repeat;
    background-position: center;
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
    background: rgba(248, 248, 252, 0.92);
    border: 1px solid rgba(180, 180, 195, 0.85);
    border-radius: 16px;
    box-shadow: 0 4px 16px rgba(30, 30, 50, 0.18);
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
    border-right: 11px solid rgba(248, 248, 252, 0.92);
    filter: drop-shadow(-1px 0 0 rgba(180, 180, 195, 0.85));
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
    color: #3264b4;
    font-weight: 600;
}
.msg.user .content {
    color: #2a3d6b;
}
.msg.assistant .label {
    color: #7a3b8f;
    font-weight: 600;
}
.msg.assistant .content {
    color: #15151f;
}

.hint {
    color: #45455a;
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
    border: 1px solid rgba(120, 120, 150, 0.9);
    border-radius: 12px;
    background: rgba(40, 40, 52, 0.95);
    color: #ffffff;
    font-size: 14px;
    caret-color: #ffffff;
    outline: none;
    transition:
        border-color 0.15s ease,
        box-shadow 0.15s ease;
}

.input::placeholder {
    color: rgba(180, 180, 190, 0.55);
    font-size: 13px;
}

.input:focus {
    border-color: #6ca6ff;
    box-shadow: 0 0 0 2px rgba(108, 166, 255, 0.25);
}

.waiting {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 36px;
    padding: 0 12px;
    border: 1px dashed rgba(140, 140, 160, 0.6);
    border-radius: 12px;
    background: rgba(40, 40, 52, 0.7);
    color: rgba(200, 200, 210, 0.85);
    font-size: 13px;
}

.dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #6ca6ff;
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
    background: rgba(52, 54, 70, 0.95);
    border: 1px solid rgba(130, 140, 170, 0.8);
    border-radius: 10px;
    padding: 4px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
}

.menu-item {
    width: 100%;
    padding: 8px 0;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: #ffffff;
    font-size: 14px;
    font-family: inherit;
    cursor: pointer;
    transition: background 0.12s ease;
}

.menu-item:hover {
    background: rgba(108, 166, 255, 0.35);
}
</style>
