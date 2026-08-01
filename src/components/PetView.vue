<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from "vue";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import type { PetStats } from "../petState";
import { getFestival, generateParticles, type FestivalConfig } from "../festival";

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
    petStats?: PetStats;
    isSleeping?: boolean;
    walkingDirection?: "left" | "right" | null;
}>();

const festival = computed<FestivalConfig | null>(() => getFestival());
const particles = computed(() => festival.value ? generateParticles(festival.value) : []);

const emit = defineEmits<{
    send: [text: string];
    openSettings: [];
    feed: [];
    pet: [];
}>();

const inputText = ref("");
const inputEl = ref<HTMLInputElement | null>(null);
const msgListEl = ref<HTMLDivElement | null>(null);
const menuVisible = ref(false);
const menuPos = ref({ x: 0, y: 0 });
const autoScroll = ref(true);
const squishing = ref(false);
const eating = ref(false);
const eatBone = ref(false);
const panelVisible = ref(true);
let eatTimers: ReturnType<typeof setTimeout>[] = [];

const hungerPct = computed(() => Math.round(props.petStats?.hunger ?? 100));
const moodPct = computed(() => Math.round(props.petStats?.mood ?? 100));

const lowStatType = computed<"hunger" | "mood" | null>(() => {
    if (!props.petStats) return null;
    if (props.petStats.hunger < 20) return "hunger";
    if (props.petStats.mood < 20) return "mood";
    return null;
});

function feedPet() {
    emit("feed");
    menuVisible.value = false;
    eatTimers.forEach(clearTimeout);
    eatTimers = [];
    eating.value = true;
    eatBone.value = false;
    eatTimers.push(setTimeout(() => { eatBone.value = true; }, 2000));
    eatTimers.push(setTimeout(() => {
        eating.value = false;
        eatBone.value = false;
    }, 4000));
}

function togglePanel() {
    panelVisible.value = !panelVisible.value;
    menuVisible.value = false;
}

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
    const h = 152;
    let x = e.clientX;
    let y = e.clientY;
    if (x + w > window.innerWidth) x = window.innerWidth - w - 4;
    if (y + h > window.innerHeight) y = window.innerHeight - h - 4;
    menuPos.value = { x, y };
}

function closePet() {
    getCurrentWindow().hide();
}

function closeMenu() {
    menuVisible.value = false;
}

let moveDebounce: ReturnType<typeof setTimeout> | undefined;
let unlistenMove: (() => void) | undefined;

function onPetMouseDown(e: MouseEvent) {
    if (e.button === 0) {
        squishing.value = true;
        emit("pet");
        getCurrentWindow().startDragging();
        moveDebounce = setTimeout(() => {
            squishing.value = false;
        }, 150);
    }
}

const win = getCurrentWindow();
let ignoring = false;
let pollTimer: ReturnType<typeof setInterval> | undefined;

const petCanvas = document.createElement("canvas");
const petCtx = petCanvas.getContext("2d", { willReadFrequently: true });
let petImageLoaded = false;

function loadPetImage() {
    const img = new Image();
    img.onload = () => {
        petCanvas.width = 192;
        petCanvas.height = 210;
        petCtx?.drawImage(img, 0, 0, 192, 210);
        petImageLoaded = true;
    };
    img.src = "/1.png";
}

function isTransparentAt(x: number, y: number): boolean {
    const el = document.elementFromPoint(x, y);
    if (!el) return true;
    if (el.closest(".panel, .context-menu")) return false;
    const petArea = el.closest(".pet-area");
    if (petArea) {
        if (!petImageLoaded || !petCtx) return false;
        const rect = petArea.getBoundingClientRect();
        const localX = Math.floor(x - rect.left);
        const localY = Math.floor(y - rect.top);
        if (localX < 0 || localX >= 192 || localY < 0 || localY >= 210) return true;
        const pixel = petCtx.getImageData(localX, localY, 1, 1).data;
        return pixel[3] < 128;
    }
    return true;
}

async function setPassthrough(ignore: boolean) {
    if (ignoring === ignore) return;
    ignoring = ignore;
    await win.setIgnoreCursorEvents(ignore);
}

async function onMouseMovePassthrough(e: MouseEvent) {
    await setPassthrough(isTransparentAt(e.clientX, e.clientY));
}

async function pollCursor() {
    if (!ignoring) return;
    try {
        const [cx, cy] = await invoke<[number, number]>("get_cursor_pos");
        const winPos = await win.outerPosition();
        const scaleFactor = await win.scaleFactor();
        const localX = (cx - winPos.x) / scaleFactor;
        const localY = (cy - winPos.y) / scaleFactor;
        if (!isTransparentAt(localX, localY)) {
            await setPassthrough(false);
        }
    } catch {}
}

onMounted(async () => {
    loadPetImage();
    unlistenMove = await getCurrentWindow().onMoved(() => {
        if (moveDebounce) clearTimeout(moveDebounce);
        moveDebounce = setTimeout(() => {
            squishing.value = false;
        }, 80);
    });
    document.addEventListener("mousemove", onMouseMovePassthrough);
    pollTimer = setInterval(pollCursor, 100);
});

onUnmounted(() => {
    unlistenMove?.();
    eatTimers.forEach(clearTimeout);
    document.removeEventListener("mousemove", onMouseMovePassthrough);
    if (pollTimer) clearInterval(pollTimer);
});
</script>

<template>
    <div class="pet-root" @mousedown="menuVisible = false">
        <div v-if="particles.length" class="festival-overlay" aria-hidden="true">
            <span
                v-for="(p, i) in particles"
                :key="i"
                class="festival-particle"
                :class="festival?.animation"
                :style="{
                    left: p.left + '%',
                    animationDelay: p.delay + 's',
                    animationDuration: p.duration + 's',
                    fontSize: p.size + 'px',
                }"
            >{{ festival?.particle }}</span>
        </div>
        <div
            class="pet-area"
            :class="{ squishing: squishing }"
            @mousedown="onPetMouseDown"
            @contextmenu.prevent="openMenu"
            @click="menuVisible = false"
        >
            <div
                class="pet-mood"
                :class="[
                    'mood-' + (mood || 'neutral'),
                    {
                        sleeping: isSleeping,
                        'low-stat': lowStatType,
                        walking: walkingDirection,
                        'walk-left': walkingDirection === 'left',
                    },
                ]"
            >
                <div class="pet-img"></div>
            </div>

            <div v-if="isSleeping" class="cg-sleep">
                <span class="zzz z1">z</span>
                <span class="zzz z2">Z</span>
                <span class="zzz z3">Z</span>
            </div>

            <div v-if="lowStatType" class="cg-lowstat">
                <span class="lowstat-icon">{{ lowStatType === 'hunger' ? '💢' : '💧' }}</span>
            </div>

            <div v-if="eating" class="cg-eat">
                <span class="eat-icon" :class="{ bone: eatBone }">{{ eatBone ? '🦴' : '🐟' }}</span>
            </div>

            <div class="pet-stats">
                <div class="stat">
                    <span class="stat-icon">🍣</span>
                    <div class="stat-bar"><div class="stat-fill" :style="{ width: hungerPct + '%' }"></div></div>
                </div>
                <div class="stat">
                    <span class="stat-icon">💖</span>
                    <div class="stat-bar"><div class="stat-fill mood" :style="{ width: moodPct + '%' }"></div></div>
                </div>
            </div>
        </div>

        <div v-if="panelVisible" class="panel">
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
            <button class="menu-item" @click="feedPet">投喂小鱼干</button>
            <button class="menu-item" @click="togglePanel">{{ panelVisible ? '收起对话框' : '展开对话框' }}</button>
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
    pointer-events: none;
}

.pet-area {
    position: absolute;
    left: 0;
    top: 0;
    width: 192px;
    height: 210px;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    pointer-events: auto;
}

.pet-area.squishing {
    transform: scaleY(0.82) scaleX(1.15);
    transition: transform 0.1s ease-out;
}

.pet-stats {
    position: absolute;
    bottom: 4px;
    left: 8px;
    right: 8px;
    display: flex;
    flex-direction: column;
    gap: 3px;
    pointer-events: none;
}

.stat {
    display: flex;
    align-items: center;
    gap: 4px;
}

.stat-icon {
    font-size: 11px;
    line-height: 1;
}

.stat-bar {
    flex: 1;
    height: 5px;
    background: rgba(255, 255, 255, 0.4);
    border-radius: 3px;
    overflow: hidden;
}

.stat-fill {
    height: 100%;
    background: #ff7a9c;
    border-radius: 3px;
    transition: width 0.5s ease;
}

.stat-fill.mood {
    background: #9d6fd8;
}

.pet-mood.sleeping {
    filter: brightness(0.55) saturate(0.7);
}

.pet-mood.low-stat {
    filter: grayscale(0.4) brightness(0.85);
}

.cg-sleep {
    position: absolute;
    top: 10px;
    right: 20px;
    pointer-events: none;
}

.zzz {
    position: absolute;
    font-size: 14px;
    font-weight: bold;
    color: rgba(157, 111, 216, 0.8);
    animation: float-z 2.4s ease-in-out infinite;
}

.z1 { animation-delay: 0s; left: 0; }
.z2 { animation-delay: 0.8s; left: 10px; font-size: 18px; }
.z3 { animation-delay: 1.6s; left: 20px; font-size: 16px; }

@keyframes float-z {
    0% { transform: translateY(0) scale(0.6); opacity: 0; }
    20% { opacity: 1; }
    80% { opacity: 0.6; }
    100% { transform: translateY(-30px) scale(1.1); opacity: 0; }
}

.cg-lowstat {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    pointer-events: none;
}

.lowstat-icon {
    font-size: 16px;
    display: inline-block;
    animation: shake-icon 0.5s ease-in-out infinite;
}

@keyframes shake-icon {
    0%, 100% { transform: rotate(-8deg) translateY(0); }
    50% { transform: rotate(8deg) translateY(-3px); }
}

.cg-eat {
    position: absolute;
    top: 50%;
    right: -10px;
    transform: translateY(-50%);
    pointer-events: none;
}

.eat-icon {
    font-size: 22px;
    display: inline-block;
    animation: eat-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.eat-icon.bone {
    animation: bone-fade 0.3s ease-out;
}

@keyframes eat-pop {
    0% { transform: scale(0) rotate(-20deg); opacity: 0; }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
}

@keyframes bone-fade {
    0% { transform: scale(0.5); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
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
    pointer-events: auto;
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
    pointer-events: auto;
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

.festival-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: hidden;
    z-index: 200;
}

.festival-particle {
    position: absolute;
    top: -20px;
    animation-iteration-count: infinite;
    animation-timing-function: linear;
    opacity: 0.9;
}

.festival-fall {
    animation-name: particle-fall;
}

.festival-sway {
    animation-name: particle-sway;
}

.festival-float {
    animation-name: particle-float;
}

@keyframes particle-fall {
    0% { transform: translateY(0) rotate(0deg); opacity: 0; }
    10% { opacity: 0.9; }
    90% { opacity: 0.9; }
    100% { transform: translateY(250px) rotate(360deg); opacity: 0; }
}

@keyframes particle-sway {
    0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
    10% { opacity: 0.9; }
    50% { transform: translateY(120px) translateX(20px) rotate(180deg); }
    90% { opacity: 0.9; }
    100% { transform: translateY(250px) translateX(-15px) rotate(360deg); opacity: 0; }
}

@keyframes particle-float {
    0% { transform: translateY(0) scale(0.8); opacity: 0; }
    20% { opacity: 0.9; }
    50% { transform: translateY(-15px) scale(1.1); }
    80% { opacity: 0.9; }
    100% { transform: translateY(0) scale(0.8); opacity: 0; }
}

.pet-mood.walking .pet-img {
    animation: walk-bounce 0.35s ease-in-out infinite;
}

.pet-mood.walk-left .pet-img {
    transform: scaleX(-1);
}

@keyframes walk-bounce {
    0%, 100% { transform: translateY(0) scaleY(1); }
    50% { transform: translateY(-4px) scaleY(0.97); }
}

.pet-mood.walk-left.walking .pet-img {
    animation: walk-bounce-flip 0.35s ease-in-out infinite;
}

@keyframes walk-bounce-flip {
    0%, 100% { transform: scaleX(-1) translateY(0) scaleY(1); }
    50% { transform: scaleX(-1) translateY(-4px) scaleY(0.97); }
}
</style>
