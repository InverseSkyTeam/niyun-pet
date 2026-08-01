export interface AppSettings {
    apiKey: string;
    baseUrl: string;
    model: string;
    temperature: number;
    maxTokens: number;
    thinkingEnabled: boolean;
    reasoningEffort: string;
    reminderEnabled: boolean;
    reminderInterval: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
    apiKey: "e7041c8cd63b42eda6b4b95a64490324.mj7fhDdqwq9dqSLJ",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    model: "glm-4.7-flash",
    temperature: 0.8,
    maxTokens: 1024,
    thinkingEnabled: false,
    reasoningEffort: "",
    reminderEnabled: true,
    reminderInterval: 45,
};

const STORAGE_KEY = "niyun_settings";

export function loadSettings(): AppSettings {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...DEFAULT_SETTINGS };
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
}

export function saveSettings(s: AppSettings) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}
