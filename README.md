# 逆云 (Niyun) — AI 桌宠

**逆云** 是一个基于 [Tauri](https://v2.tauri.app/) 构建的 AI 桌面宠物应用。它不仅是桌面上的一只可爱白猫兽人，更是你 coding 时的陪伴伙伴。

> "逆天团队（INS Team）的吉祥物，日常跟代码、Bug、DDL 打交道，偶尔也接点外包活糊口。"

## 特性

- **AI 对话** — 集成 DeepSeek AI，与逆云进行自然语言互动。逆云拥有傲娇、活泼的 15 岁小兽太人设，自带颜文字和口语化风格
- **桌面漫游** — 逆云会在桌面上随机走动（15-30 分钟触发），带有平滑移动和方向翻转动画
- **状态系统** — 心情和饱腹度随时间衰减，影响表现行为和对话回复
- **天气感知** — 自动获取天气信息，逆云会根据天气调整问候语和行为
- **节日特效** — 自动识别春节、樱花季、万圣节、圣诞、元旦等节日，触发对应 CG 特效
- **右键菜单** — 支持偷看屏幕（AI 分析当前屏幕）、启动视觉小说模式、打开关于窗口
- **视觉小说模式** — 独立窗口的 Galgame 玩法，包含 11 个剧本和分支选择，影响主窗口的宠物状态
- **定时提醒** — 设定间隔提醒，逆云会定时督促你休息
- **鼠标穿透** — 透明区域自动穿透，不干扰桌面操作
- **单例运行** — 防止重复启动，第二实例弹出提示

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Vue 3 + TypeScript |
| 样式 | Tailwind CSS 4 |
| 构建工具 | Vite |
| 桌面框架 | Tauri 2 |
| 后端语言 | Rust |
| AI SDK | AI SDK (DeepSeek) |
| 包管理器 | Bun |

## 快速开始

### 前置要求

- [Bun](https://bun.sh/) >= 1.x
- [Rust](https://www.rust-lang.org/) (最新稳定版)
- [Tauri 系统依赖](https://v2.tauri.app/start/prerequisites/)

### 安装与运行

```bash
# 克隆项目
git clone https://github.com/InverseSkyTeam/niyun-pet.git
cd niyun

# 安装前端依赖
bun install

# 启动开发模式
bun run tauri dev
```

### 构建

```bash
bun run tauri build
```

构建产物位于 `src-tauri/target/release/bundle/` 目录。

## 项目结构

```
niyun/
├── src/                          # 前端源码
│   ├── components/
│   │   ├── PetView.vue           # 宠物主视图（动画、状态、CG 特效）
│   │   ├── SettingsPanel.vue     # 设置面板（定时提醒、思考模式）
│   │   ├── GalgameWindow.vue     # 视觉小说模式窗口
│   │   └── AboutWindow.vue       # 关于窗口
│   ├── App.vue                   # 主应用（桌面漫游、右键菜单、事件绑定）
│   ├── ai.ts                     # AI 对话接口
│   ├── petState.ts               # 宠物状态管理（心情、饱腹度）
│   ├── systemPrompt.ts           # AI 角色设定提示词
│   ├── scenarios.ts              # 视觉小说剧本数据
│   ├── settings.ts               # 设置持久化
│   ├── weather.ts                # 天气获取
│   ├── desktopInfo.ts            # 桌面窗口信息提取
│   ├── festival.ts               # 节日检测与 CG 特效
│   ├── main.ts                   # 应用入口
│   └── style.css                 # 全局样式
├── src-tauri/                    # Rust 后端
│   └── src/
│       ├── main.rs               # 应用入口（单例、托盘、窗口管理）
│       └── lib.rs                # Tauri 命令（窗口信息、截图等）
├── package.json
├── vite.config.ts
└── tauri.conf.json
```

## 配置

### AI 密钥

在 `src/ai.ts` 中配置你的 DeepSeek API 密钥和基础 URL：

```
# 当前使用 uapi-browser-sdk 进行 AI 调用
```

### 天气

天气信息通过公开 API 获取，默认使用 IP 定位自动获取城市天气。

### 窗口大小

窗口默认尺寸为 600×450，可在 `tauri.conf.json` 中调整 `app.windows` 配置。

## 许可证

本项目采用 MIT 许可证。