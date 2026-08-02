<script setup lang="ts">
import { getCurrentWindow } from "@tauri-apps/api/window";

function closeAbout() {
    getCurrentWindow().close();
}
</script>

<template>
    <div class="about-root">
        <div class="title-bar" data-tauri-drag-region>
            <span class="title-text">关于</span>
            <button class="close-btn" @click="closeAbout">✕</button>
        </div>
        <div class="content">
            <div class="card">
                <div class="icon-area">
                    <span class="paw">🐾</span>
                </div>
                <div class="app-name">逆云</div>
                <div class="tagline">一只傲娇的小兽太桌宠</div>
                <div class="divider"></div>
                <div class="info-row">
                    <span class="label">作者</span>
                    <span class="value">流光</span>
                </div>
                <div class="info-row">
                    <span class="label">联系方式</span>
                    <span class="value">lightfl0w@foxmail.com</span>
                </div>
                <div class="divider"></div>
                <div class="footer-text">逆天团队（INS Team）吉祥物</div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.about-root {
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
    align-items: center;
    justify-content: center;
    padding: 24px;
    overflow: hidden;
    min-height: 0;
}

.card {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(12px);
    border-radius: 16px;
    padding: 32px 40px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    box-shadow: 0 4px 24px rgba(255, 150, 180, 0.12);
    border: 1px solid rgba(255, 214, 224, 0.5);
    max-width: 340px;
    width: 100%;
}

.icon-area {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: linear-gradient(135deg, #ffe8e0, #ffd4dc);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 4px;
}

.paw {
    font-size: 32px;
}

.app-name {
    font-size: 22px;
    font-weight: 800;
    color: #4a2d3a;
    letter-spacing: 2px;
}

.tagline {
    font-size: 13px;
    color: #9d7a88;
    margin-top: -4px;
}

.divider {
    width: 60px;
    height: 2px;
    background: linear-gradient(90deg, transparent, #ffb8c8, transparent);
    border-radius: 1px;
    margin: 4px 0;
}

.info-row {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 6px 0;
}

.label {
    font-size: 13px;
    color: #9d7a88;
    min-width: 64px;
    text-align: right;
}

.value {
    font-size: 14px;
    color: #3d2a34;
    font-weight: 600;
}

.footer-text {
    font-size: 12px;
    color: #b895a3;
    margin-top: 4px;
}
</style>