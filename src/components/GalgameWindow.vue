<script setup lang="ts">
import { ref } from "vue";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { emit } from "@tauri-apps/api/event";
import { scenarios, type Scenario, type ScenarioNode, type ScenarioChoice } from "../scenarios";

const win = getCurrentWindow();

const screen = ref<"menu" | "play">("menu");
const currentScenario = ref<Scenario | null>(null);
const currentNodeId = ref("");
const typingText = ref("");
const isTyping = ref(false);
const showChoices = ref(false);
const ended = ref(false);
let typeTimer: ReturnType<typeof setInterval> | undefined;

function getNode(id: string): ScenarioNode | undefined {
    return currentScenario.value?.nodes.find((n) => n.id === id);
}

function startTyping(text: string) {
    typingText.value = "";
    isTyping.value = true;
    showChoices.value = false;
    let i = 0;
    typeTimer = setInterval(() => {
        if (i < text.length) {
            typingText.value += text[i];
            i++;
        } else {
            clearInterval(typeTimer);
            isTyping.value = false;
            const node = getNode(currentNodeId.value);
            if (node?.choices) {
                showChoices.value = true;
            }
        }
    }, 28);
}

function skipTyping() {
    if (typeTimer) clearInterval(typeTimer);
    isTyping.value = false;
    const node = getNode(currentNodeId.value);
    if (node) {
        typingText.value = node.text;
        if (node.choices) {
            showChoices.value = true;
        }
    }
}

function advance() {
    if (showChoices.value) return;
    if (isTyping.value) {
        skipTyping();
        return;
    }
    const node = getNode(currentNodeId.value);
    if (!node) return;
    if (node.nextId) {
        goToNode(node.nextId);
    } else if (node.end || (!node.choices && !node.nextId)) {
        endScenario();
    }
}

function goToNode(id: string) {
    const node = getNode(id);
    if (!node) { endScenario(); return; }
    currentNodeId.value = id;
    startTyping(node.text);
}

function selectChoice(choice: ScenarioChoice) {
    const md = choice.moodEffect ?? 0;
    const hd = choice.hungerEffect ?? 0;
    if (md !== 0 || hd !== 0) {
        emit("galgame-effect", { moodDelta: md, hungerDelta: hd });
    }
    showChoices.value = false;
    goToNode(choice.nextId);
}

function startScenario(id: string) {
    const s = scenarios.find((sc) => sc.id === id);
    if (!s) return;
    currentScenario.value = s;
    currentNodeId.value = s.startNode;
    screen.value = "play";
    ended.value = false;
    const startNode = getNode(s.startNode);
    if (startNode) startTyping(startNode.text);
}

function endScenario() {
    ended.value = true;
    setTimeout(() => {
        if (typeTimer) clearInterval(typeTimer);
        screen.value = "menu";
        currentScenario.value = null;
        currentNodeId.value = "";
        typingText.value = "";
        showChoices.value = false;
        ended.value = false;
    }, 1500);
}

function closeWindow() {
    win.close();
}
</script>

<template>
    <div class="galgame-root" data-tauri-drag-region>
        <div class="title-bar" data-tauri-drag-region>
            <span class="title-text">视觉小说</span>
            <button class="close-btn" @click="closeWindow">✕</button>
        </div>
        <div class="content">
            <div v-if="screen === 'menu'" class="menu-screen">
                <div class="menu-title">视觉小说</div>
                <div class="menu-sub">选择一个故事开始</div>
                <div class="scenario-list">
                    <button v-for="s in scenarios" :key="s.id" class="scenario-btn" @click="startScenario(s.id)">
                        <span class="s-icon">{{ s.icon }}</span>
                        <span class="s-info">
                            <span class="s-title">{{ s.title }}</span>
                            <span class="s-desc">{{ s.desc }}</span>
                        </span>
                    </button>
                </div>
            </div>
            <div v-if="screen === 'play'" class="play-screen">
                <div class="sprite-area">
                    <div class="pet-img" :class="'mood-' + (getNode(currentNodeId)?.mood || 'neutral')"></div>
                </div>
                <div class="dialogue-area" @click="advance">
                    <div class="name-tag">{{ currentScenario?.title || '逆云' }}</div>
                    <div class="dialogue-text">{{ typingText }}<span v-if="isTyping" class="cursor">|</span></div>
                </div>
                <div v-if="showChoices" class="choices-area">
                    <button v-for="(c, i) in getNode(currentNodeId)?.choices" :key="i" class="choice-btn" @click="selectChoice(c)">
                        {{ c.text }}
                    </button>
                </div>
                <div v-if="ended" class="end-text">—— 完 ——</div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.galgame-root {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: linear-gradient(135deg, #fdf6f0 0%, #f5e6e8 50%, #f0e6f6 100%);
    overflow: hidden;
    user-select: none;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

.title-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 40px;
    min-height: 40px;
    padding: 0 14px;
    background: rgba(255, 248, 243, 0.92);
    border-bottom: 1px solid rgba(255, 214, 224, 0.7);
    flex-shrink: 0;
}

.title-text {
    font-size: 14px;
    font-weight: 700;
    color: #5c3d4e;
}

.close-btn {
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: #9d6f7e;
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.12s ease, color 0.12s ease;
}

.close-btn:hover {
    background: rgba(255, 90, 130, 0.15);
    color: #ff5a82;
}

.content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
}

.menu-screen {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 20px 24px;
    overflow: hidden;
    min-height: 0;
}

.menu-title {
    font-size: 22px;
    font-weight: 800;
    color: #4a3a44;
    text-align: center;
    margin-bottom: 4px;
}

.menu-sub {
    font-size: 13px;
    color: #9d6f7e;
    text-align: center;
    margin-bottom: 16px;
}

.scenario-list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-right: 4px;
}

.scenario-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border: 1px solid rgba(255, 205, 214, 0.6);
    border-radius: 12px;
    background: rgba(255, 248, 243, 0.8);
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
}

.scenario-btn:hover {
    background: rgba(255, 248, 243, 0.98);
    border-color: #ff7a9c;
    transform: translateY(-1px);
}

.scenario-btn:active {
    transform: translateY(0);
}

.s-icon {
    font-size: 26px;
    flex-shrink: 0;
}

.s-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.s-title {
    font-size: 15px;
    font-weight: 700;
    color: #4a3a44;
}

.s-desc {
    font-size: 12px;
    color: #9d6f7e;
}

.play-screen {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 12px 16px;
    gap: 10px;
    position: relative;
    overflow: hidden;
    min-height: 0;
}

.sprite-area {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
}

.pet-img {
    width: 160px;
    height: 180px;
    background-image: url("/1.png");
    background-size: 100% 100%;
    background-repeat: no-repeat;
    background-position: center;
    animation: breathe 3.2s ease-in-out infinite;
    transition: filter 0.4s ease;
}

.pet-img.mood-happy {
    filter: brightness(1.08) saturate(1.15);
    animation: bounce 0.7s ease-in-out;
}

.pet-img.mood-shy {
    filter: hue-rotate(-15deg) saturate(1.4) brightness(1.05);
    animation: shake 0.5s ease-in-out 2;
}

.pet-img.mood-angry {
    filter: hue-rotate(-25deg) saturate(1.6) brightness(1.08);
    animation: angry-shake 0.18s ease-in-out infinite;
}

.pet-img.mood-sleepy {
    filter: brightness(0.82) saturate(0.8);
    animation: slow-breathe 4.5s ease-in-out infinite;
}

.dialogue-area {
    background: rgba(255, 248, 243, 0.95);
    border: 1px solid rgba(255, 214, 224, 0.8);
    border-radius: 14px;
    padding: 14px 16px;
    min-height: 100px;
    cursor: pointer;
    transition: background 0.15s ease;
    flex-shrink: 0;
}

.dialogue-area:hover {
    background: rgba(255, 248, 243, 0.98);
}

.name-tag {
    font-size: 13px;
    font-weight: 700;
    color: #9d6fd8;
    margin-bottom: 6px;
}

.dialogue-text {
    font-size: 15px;
    line-height: 1.8;
    color: #3d2f3f;
    word-break: break-word;
    white-space: pre-wrap;
}

.cursor {
    display: inline-block;
    animation: blink-cursor 0.6s step-end infinite;
    color: #ff7a9c;
    font-weight: bold;
}

@keyframes blink-cursor {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
}

.choices-area {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex-shrink: 0;
}

.choice-btn {
    padding: 10px 14px;
    border: 1px solid rgba(255, 205, 214, 0.7);
    border-radius: 11px;
    background: rgba(255, 240, 245, 0.85);
    color: #4a3a44;
    font-size: 14px;
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    transition: background 0.12s ease, border-color 0.12s ease;
}

.choice-btn:hover {
    background: rgba(255, 122, 156, 0.15);
    border-color: #ff7a9c;
}

.end-text {
    position: absolute;
    bottom: 50%;
    left: 50%;
    transform: translate(-50%, 50%);
    color: #9d6f7e;
    font-size: 16px;
    font-weight: 600;
    animation: fade-in 0.5s ease;
}

@keyframes fade-in {
    0% { opacity: 0; }
    100% { opacity: 1; }
}

@keyframes breathe {
    0%, 100% { transform: scaleY(1); }
    50% { transform: scaleY(1.03); }
}

@keyframes slow-breathe {
    0%, 100% { transform: rotate(-4deg) scaleY(1); }
    50% { transform: rotate(-4deg) scaleY(1.02); }
}

@keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
}

@keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-4px); }
    75% { transform: translateX(4px); }
}

@keyframes angry-shake {
    0%, 100% { transform: translateX(0) rotate(0); }
    25% { transform: translateX(-3px) rotate(-1.5deg); }
    75% { transform: translateX(3px) rotate(1.5deg); }
}
</style>