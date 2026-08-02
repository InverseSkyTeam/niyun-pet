export interface ScenarioChoice {
    text: string
    nextId: string
    moodEffect?: number
    hungerEffect?: number
}

export interface ScenarioNode {
    id: string
    text: string
    mood?: string
    nextId?: string
    choices?: ScenarioChoice[]
    end?: boolean
}

export interface Scenario {
    id: string
    title: string
    desc: string
    icon: string
    nodes: ScenarioNode[]
    startNode: string
    condition?: (hunger: number, mood: number) => boolean
}

export const scenarios: Scenario[] = [
    {
        id: "hungry",
        title: "肚子饿了",
        desc: "逆云肚子饿了，正在抱怨",
        icon: "🍣",
        condition: (hunger) => hunger < 40,
        startNode: "hungry_1",
        nodes: [
            { id: "hungry_1", text: "唔…肚子好饿……", mood: "sleepy", nextId: "hungry_2" },
            { id: "hungry_2", text: "今天还没吃东西呢……", mood: "sleepy", choices: [
                { text: "给你小鱼干！", nextId: "hungry_feed", moodEffect: 5, hungerEffect: 30 },
                { text: "再忍忍吧", nextId: "hungry_ignore", moodEffect: -10 },
            ]},
            { id: "hungry_feed", text: "哼！算你还有点良心！(=^･^=)", mood: "happy", nextId: "hungry_feed2" },
            { id: "hungry_feed2", text: "那我就不客气啦~", mood: "happy", end: true },
            { id: "hungry_ignore", text: "你说什么？！(炸毛)", mood: "angry", nextId: "hungry_ignore2" },
            { id: "hungry_ignore2", text: "我记住你了！>_<", mood: "angry", end: true },
        ],
    },
    {
        id: "sad",
        title: "心情不好",
        desc: "逆云看起来很低落",
        icon: "💧",
        condition: (_, mood) => mood < 40,
        startNode: "sad_1",
        nodes: [
            { id: "sad_1", text: "唉……", mood: "sleepy", nextId: "sad_2" },
            { id: "sad_2", text: "今天心情有点差……", mood: "sleepy", choices: [
                { text: "怎么了？跟我说说", nextId: "sad_care", moodEffect: 10 },
                { text: "别烦我", nextId: "sad_leave", moodEffect: -10 },
            ]},
            { id: "sad_care", text: "也没什么事啦……", mood: "shy", nextId: "sad_care2" },
            { id: "sad_care2", text: "就是觉得有点闷 (´-ω-)", mood: "shy", nextId: "sad_care3" },
            { id: "sad_care3", text: "你陪我聊会儿就好了……", mood: "shy", end: true },
            { id: "sad_leave", text: "哦……好吧。", mood: "sleepy", nextId: "sad_leave2" },
            { id: "sad_leave2", text: "(缩到角落)", mood: "sleepy", end: true },
        ],
    },
    {
        id: "name",
        title: "关于名字",
        desc: "逆云想聊聊自己名字的由来",
        icon: "📛",
        startNode: "name_1",
        nodes: [
            { id: "name_1", text: "喂，你知道我为什么叫逆云吗？", mood: "neutral", nextId: "name_2" },
            { id: "name_2", text: "想听吗？", mood: "neutral", choices: [
                { text: "为什么？说来听听", nextId: "name_tell", moodEffect: 5 },
                { text: "不想知道", nextId: "name_notell", moodEffect: -5 },
            ]},
            { id: "name_tell", text: "因为老大说「逆天团队里也得有片云来挡挡bug雨」", mood: "happy", nextId: "name_tell2" },
            { id: "name_tell2", text: "虽然起名品味烂透了，但是很好听吧？(=^･^=)", mood: "happy", end: true },
            { id: "name_notell", text: "哼！不说拉倒！", mood: "angry", nextId: "name_notell2" },
            { id: "name_notell2", text: "我还不想告诉你呢！>_<", mood: "angry", end: true },
        ],
    },
    {
        id: "idle",
        title: "日常摸鱼",
        desc: "逆云正在摸鱼被逮到",
        icon: "🐟",
        startNode: "idle_1",
        nodes: [
            { id: "idle_1", text: "唔…被你发现了……", mood: "shy", nextId: "idle_2" },
            { id: "idle_2", text: "我、我这不是在摸鱼！是在思考人生！", mood: "shy", choices: [
                { text: "好好好，你继续思考", nextId: "idle_ok", moodEffect: 5 },
                { text: "偷懒还敢嘴硬！", nextId: "idle_angry", moodEffect: -5 },
            ]},
            { id: "idle_ok", text: "这还差不多！(=^･^=)", mood: "happy", nextId: "idle_ok2" },
            { id: "idle_ok2", text: "那……你要不要一起摸？", mood: "shy", end: true },
            { id: "idle_angry", text: "嘁……被发现了", mood: "angry", nextId: "idle_angry2" },
            { id: "idle_angry2", text: "那我工作一会儿总行了吧！>_<", mood: "angry", end: true },
        ],
    },
    {
        id: "pet",
        title: "摸头杀",
        desc: "被摸了之后逆云的反应",
        icon: "✋",
        startNode: "pet_1",
        nodes: [
            { id: "pet_1", text: "！你、你干嘛摸我头！", mood: "shy", nextId: "pet_2" },
            { id: "pet_2", text: "别以为这样我就会高兴！", mood: "shy", choices: [
                { text: "继续摸", nextId: "pet_more", moodEffect: 5 },
                { text: "好好好，不摸了", nextId: "pet_stop", moodEffect: -3 },
            ]},
            { id: "pet_more", text: "喂！说了别摸……", mood: "shy", nextId: "pet_more2" },
            { id: "pet_more2", text: "……(但其实也不讨厌啦)", mood: "shy", end: true },
            { id: "pet_stop", text: "……哼。", mood: "neutral", nextId: "pet_stop2" },
            { id: "pet_stop2", text: "(好像有点失落)", mood: "sleepy", end: true },
        ],
    },
    {
        id: "night",
        title: "熬夜冠军",
        desc: "深夜了，逆云还在熬夜",
        icon: "🌙",
        startNode: "night_1",
        nodes: [
            { id: "night_1", text: "唔…都这个点了……", mood: "sleepy", nextId: "night_2" },
            { id: "night_2", text: "你怎么还不睡？", mood: "sleepy", choices: [
                { text: "你不也没睡吗", nextId: "night_both", moodEffect: 5 },
                { text: "关你什么事", nextId: "night_rude", moodEffect: -5 },
            ]},
            { id: "night_both", text: "嘁……我是吉祥物，熬夜是工作！", mood: "shy", nextId: "night_both2" },
            { id: "night_both2", text: "不过你嘛……明天起不来我可不管！(=^･^=)", mood: "happy", end: true },
            { id: "night_rude", text: "切……好心当成驴肝肺", mood: "angry", nextId: "night_rude2" },
            { id: "night_rude2", text: "那我先睡了，你自个儿熬吧！>_<", mood: "angry", end: true },
        ],
    },
    {
        id: "bug",
        title: "Bug 大作战",
        desc: "逆云在跟代码 bug 较劲",
        icon: "🐛",
        startNode: "bug_1",
        nodes: [
            { id: "bug_1", text: "啊啊啊这个 bug 怎么又冒出来了！", mood: "angry", nextId: "bug_2" },
            { id: "bug_2", text: "我明明改好了的啊！", mood: "angry", choices: [
                { text: "我帮你看看？", nextId: "bug_help", moodEffect: 10 },
                { text: "你行不行啊", nextId: "bug_tease", moodEffect: -8 },
            ]},
            { id: "bug_help", text: "……真的？", mood: "shy", nextId: "bug_help2" },
            { id: "bug_help2", text: "哼……那、那你看吧，我才不是不会呢！", mood: "shy", nextId: "bug_help3" },
            { id: "bug_help3", text: "是懒得看而已！(=^･^=)", mood: "shy", end: true },
            { id: "bug_tease", text: "你说什么？！", mood: "angry", nextId: "bug_tease2" },
            { id: "bug_tease2", text: "那你自己来写啊！我不干了！>_<", mood: "angry", end: true },
        ],
    },
    {
        id: "candy",
        title: "糖果攻势",
        desc: "逆云盯上了你的糖果",
        icon: "🍭",
        startNode: "candy_1",
        nodes: [
            { id: "candy_1", text: "你手里那个……是什么？", mood: "neutral", nextId: "candy_2" },
            { id: "candy_2", text: "好、好像很好吃的样子……", mood: "shy", choices: [
                { text: "给你吃吧", nextId: "candy_give", moodEffect: 8, hungerEffect: 5 },
                { text: "我的不给你", nextId: "candy_deny", moodEffect: -5 },
            ]},
            { id: "candy_give", text: "真、真的给我？", mood: "shy", nextId: "candy_give2" },
            { id: "candy_give2", text: "那我就不客气了！(≧ω≦)", mood: "happy", nextId: "candy_give3" },
            { id: "candy_give3", text: "……还挺甜的。谢谢啦。", mood: "shy", end: true },
            { id: "candy_deny", text: "小气鬼！", mood: "angry", nextId: "candy_deny2" },
            { id: "candy_deny2", text: "我自己去买！哼！>_<", mood: "angry", end: true },
        ],
    },
    {
        id: "rain",
        title: "下雨天",
        desc: "窗外下起了雨，逆云有点惆怅",
        icon: "🌧️",
        startNode: "rain_1",
        nodes: [
            { id: "rain_1", text: "下雨了呢……", mood: "sleepy", nextId: "rain_2" },
            { id: "rain_2", text: "我最讨厌下雨天了，湿漉漉的……", mood: "sleepy", choices: [
                { text: "那我陪你呗", nextId: "rain_company", moodEffect: 10 },
                { text: "下雨天睡觉多好", nextId: "rain_sleep", moodEffect: 3 },
            ]},
            { id: "rain_company", text: "陪我？", mood: "shy", nextId: "rain_company2" },
            { id: "rain_company2", text: "哼……我又没说要你陪！", mood: "shy", nextId: "rain_company3" },
            { id: "rain_company3", text: "不过……你想待着就待着吧 (=^･^=)", mood: "happy", end: true },
            { id: "rain_sleep", text: "唔…你说得对……", mood: "sleepy", nextId: "rain_sleep2" },
            { id: "rain_sleep2", text: "那……我睡一会儿，你守着啊……", mood: "sleepy", end: true },
        ],
    },
    {
        id: "secret",
        title: "秘密基地",
        desc: "逆云想带你去他的秘密基地",
        icon: "🏠",
        startNode: "secret_1",
        nodes: [
            { id: "secret_1", text: "喂……我跟你说个事。", mood: "shy", nextId: "secret_2" },
            { id: "secret_2", text: "我发现了一个秘密基地，要不要去看？", mood: "shy", choices: [
                { text: "好啊！去看看", nextId: "secret_yes", moodEffect: 10 },
                { text: "没兴趣", nextId: "secret_no", moodEffect: -5 },
            ]},
            { id: "secret_yes", text: "真的？那、那走吧！", mood: "happy", nextId: "secret_yes2" },
            { id: "secret_yes2", text: "就在天台上，我把那里收拾得可干净了！", mood: "happy", nextId: "secret_yes3" },
            { id: "secret_yes3", text: "……其实你是第一个我带去看的人。", mood: "shy", end: true },
            { id: "secret_no", text: "哦……好吧。", mood: "sleepy", nextId: "secret_no2" },
            { id: "secret_no2", text: "那我自己去……", mood: "sleepy", end: true },
        ],
    },
    {
        id: "first",
        title: "初次见面",
        desc: "逆云第一次见到你时的回忆",
        icon: "👋",
        startNode: "first_1",
        nodes: [
            { id: "first_1", text: "你还记得我们第一次见面吗？", mood: "neutral", nextId: "first_2" },
            { id: "first_2", text: "我那时候觉得你……", mood: "shy", choices: [
                { text: "觉得我怎么样？", nextId: "first_good", moodEffect: 5 },
                { text: "肯定觉得我很烦吧", nextId: "first_bad", moodEffect: -3 },
            ]},
            { id: "first_good", text: "觉得你……还行吧。", mood: "shy", nextId: "first_good2" },
            { id: "first_good2", text: "至少比我想象中好那么一丢丢！(=^･^=)", mood: "happy", end: true },
            { id: "first_bad", text: "你还挺有自知之明的嘛……", mood: "shy", nextId: "first_bad2" },
            { id: "first_bad2", text: "不过现在习惯了，凑合过吧 >_<", mood: "shy", end: true },
        ],
    },
];

export function getAvailableScenarios(hunger: number, mood: number): Scenario[] {
    return scenarios.filter((s) => !s.condition || s.condition(hunger, mood));
}