// 口径层·分类（老家 scripts/validators.py + calculations.py 口径对应）。
// 一级固定 8 个不可改；二级白名单内置默认（老家 DEFAULT_WHITELIST；用户 YAML 增量不迁）。
// 无 --skip-validation 跳过通道：坏分类一律 throw。
import { SchedulePolicyError } from '../fetch/errors.js';

export const LEVEL1_WHITELIST: ReadonlySet<string> = new Set(
  ['维持', '健康', '工作', '学习', '创作', '投入', '调整', '日常'],
);

export const DEFAULT_WHITELIST: Record<string, string[]> = {
  '维持': ['睡眠', '用餐', '做饭', '洗漱', '通勤', '采购', '就医', '护肤', '散步'],
  '健康': ['运动', '健身', '修行', '冥想', '看病', '康复', '保健', '八段锦'],
  '工作': ['AI调优', '开发', '剪辑', '文案', '运营', '会议', '财务', '调研', '学习'],
  '学习': ['技术', '语言', '考试', '读书', '研究', 'AI', '阅读'],
  '创作': ['文字', '视频', '音频', '设计', '编程', '菜谱', 'SOP', '教学'],
  '投入': ['家人', '朋友', '同事', '伴侣', '宠物', '社交', '服务', '沟通', 'AI'],
  '调整': ['游戏', '视频', '音乐', '手机', '玩耍', '发呆', '追剧', '散步', '午睡', '过渡', '休息', '阅读'],
  '日常': ['代办', '决策', '杂事', '收拾', '行政', '等候'],
};

const LEVEL1_RE = /^[\u4e00-\u9fa5]+$/;
const LEVEL2_RE = /^[\u4e00-\u9fa5A-Za-z0-9 ]+$/;

export function parseCategory(category: string): { level1: string | null; level2: string | null } {
  if (!category) return { level1: null, level2: null };
  const c = category.trim();
  if (!c.includes('.')) {
    return LEVEL1_RE.test(c) ? { level1: c, level2: null } : { level1: null, level2: null };
  }
  const i = c.indexOf('.');
  const l1 = c.slice(0, i);
  const l2 = c.slice(i + 1);
  if (!LEVEL1_RE.test(l1) || !LEVEL2_RE.test(l2)) return { level1: null, level2: null };
  return { level1: l1, level2: l2 };
}

// 校验 category；非法 throw（错误文案含字段名+当前值+期望值+怎么修）。
export function normalizeCategory(category: unknown): string {
  if (typeof category !== 'string' || category.trim().length === 0) {
    throw new SchedulePolicyError('POLICY_BAD_CATEGORY', 'category 不能为空（期望：一级 或 一级.二级）');
  }
  const c = category.trim();
  const { level1, level2 } = parseCategory(c);
  if (!level1) {
    throw new SchedulePolicyError(
      'POLICY_BAD_CATEGORY',
      'category 格式错误：' + JSON.stringify(c) + '（期望：一级 或 一级.二级；一级仅汉字 8 固定，二级汉字/字母/数字/空格）',
    );
  }
  if (!LEVEL1_WHITELIST.has(level1)) {
    throw new SchedulePolicyError(
      'POLICY_BAD_CATEGORY',
      'category 一级 ' + JSON.stringify(level1) + ' 不在白名单（允许：' + [...LEVEL1_WHITELIST].sort().join('、') + '）',
    );
  }
  if (level2 !== null && !(DEFAULT_WHITELIST[level1] || []).includes(level2)) {
    throw new SchedulePolicyError(
      'POLICY_BAD_CATEGORY',
      'category 二级 ' + JSON.stringify(level2) + ' 不在 ' + JSON.stringify(level1) + ' 白名单（允许：' +
      (DEFAULT_WHITELIST[level1] || []).join('、') + '；怎么修：提议新增 ' + c + '，后续票登记）',
    );
  }
  return c;
}

export function listLevel1(): string[] { return [...LEVEL1_WHITELIST].sort(); }

export function listLevel2(level1?: string): Record<string, string[]> {
  if (level1) return { [level1]: DEFAULT_WHITELIST[level1] || [] };
  return Object.fromEntries(Object.entries(DEFAULT_WHITELIST).map(([k, v]) => [k, [...v]]));
}

// ---- emoji（老家 CATEGORY_EMOJI_MAP + LEVEL2 对应；缺二级回一级） ----
const EMOJI_L1: Record<string, string> = {
  '维持': '🌱', '健康': '💪', '工作': '💼', '学习': '📖',
  '创作': '🎨', '投入': '🤝', '调整': '😌', '日常': '📋',
};

const EMOJI_L2: Record<string, Record<string, string>> = {
  '维持': { '睡眠': '😴', '用餐': '🍚', '做饭': '🍳', '洗漱': '🚿', '通勤': '🚴', '采购': '🛒', '就医': '💊', '护肤': '💆', '散步': '🚶' },
  '健康': { '运动': '🏃', '健身': '🏋️', '修行': '🧘', '冥想': '🧠', '看病': '🩺', '康复': '🩹', '保健': '🛡️', '八段锦': '☯️' },
  '工作': { 'AI调优': '🤖', '开发': '💻', '剪辑': '🎬', '文案': '📝', '运营': '📊', '会议': '🤝', '财务': '💰', '调研': '🔍', '学习': '📚' },
  '学习': { '技术': '💻', '语言': '🗣️', '考试': '✏️', '读书': '📕', '研究': '🔬', 'AI': '🤖', '阅读': '📰' },
  '创作': { '文字': '✍️', '视频': '🎥', '音频': '🎵', '设计': '🖌️', '编程': '💻', '菜谱': '🍴', 'SOP': '📋', '教学': '👨‍🏫' },
  '投入': { '家人': '👨‍👩‍👧', '朋友': '🧑‍🤝‍🧑', '同事': '👔', '伴侣': '❤️', '宠物': '🐾', '社交': '👋', '服务': '🛎️', '沟通': '💬', 'AI': '🤖' },
  '调整': { '游戏': '🎮', '视频': '📺', '音乐': '🎧', '手机': '📱', '玩耍': '🎈', '发呆': '💭', '追剧': '🍿', '散步': '🚶', '午睡': '😴', '过渡': '⏳', '休息': '🛋️', '阅读': '📰' },
  '日常': { '代办': '☑️', '决策': '🤔', '杂事': '🔧', '收拾': '🧹', '行政': '📑', '等候': '⏳' },
};

export function getEmojiPrefix(category: string): string {
  if (!category) return '';
  const { level1, level2 } = parseCategory(category);
  if (!level1 || !EMOJI_L1[level1]) return '';
  const l2 = level2 ? (EMOJI_L2[level1] || {})[level2] : '';
  return l2 ? EMOJI_L1[level1] + l2 : EMOJI_L1[level1];
}

// ---- 老词别名 → 新 8 L1（老家 _L1_ALIAS；分隔符兼容 ./·/・/•） ----
const L1_ALIAS: Record<string, string> = {
  '运动': '健康', '通勤': '维持', '休息': '调整', '起居': '维持', '娱乐': '调整',
  '休闲': '调整', '社交': '投入', '餐饮': '维持', '洗漱': '维持', '阅读': '学习',
  '家务': '日常', '出行': '维持', '健身': '健康', '计划': '日常', '饮食': '维持',
};

export function l1Of(category: string): string {
  if (!category) return '未知';
  for (const sep of ['.', '·', '・', '•']) {
    if (category.includes(sep)) {
      const base = category.split(sep)[0];
      return L1_ALIAS[base] || base;
    }
  }
  return L1_ALIAS[category] || category;
}

// ---- 时长/百分比格式（老家 fmt_dur 双版本） ----
export function fmtDur(mins: number): string {
  if (mins <= 0) return '0分钟';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return h + '小时' + m + '分钟';
  if (h) return h + '小时';
  return m + '分钟';
}

export function fmtDurShort(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return h + 'h' + m + 'm';
  if (h) return h + 'h';
  return m + 'm';
}

export function fmtPct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

// ---- 健康分（老家 compute_health_score 口径）：工作≤目标 100、≤1.5 倍线性衰减、否则 0；
// 其余维度≥目标 100、≥0.8 按比、≥0.5×0.7、否则×0.4；7 维取均（创作不参评）。 ----
export const HEALTH_TARGETS: Record<string, number> = {
  '维持': 600, '健康': 60, '工作': 480, '学习': 60, '调整': 120, '日常': 120, '投入': 60,
};

export function healthDimScore(dim: string, minutes: number): number {
  const tgt = HEALTH_TARGETS[dim];
  if (tgt === undefined || minutes < 0) return 0;
  if (dim === '工作') {
    if (minutes <= tgt) return 100;
    if (minutes <= tgt * 1.5) return Math.round(((tgt * 1.5 - minutes) / (tgt * 0.5)) * 100);
    return 0;
  }
  if (minutes >= tgt) return 100;
  if (minutes >= tgt * 0.8) return Math.round((minutes / tgt) * 100);
  if (minutes >= tgt * 0.5) return Math.round((minutes / tgt) * 70);
  return Math.round((minutes / tgt) * 40);
}

export function computeHealthScore(byL1: Record<string, number>): { score: number; dims: Record<string, number> } {
  const dims: Record<string, number> = {};
  for (const d of Object.keys(HEALTH_TARGETS)) dims[d] = healthDimScore(d, byL1[d] || 0);
  const vals = Object.values(dims);
  return { score: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length), dims };
}

// ---- 异常检测（老家 detect_anomalies 口径）：环比变化 ±20% 红、±10% 黄 ----
export interface Anomaly { dim: string; cur: number; prev: number; deltaPct: number; level: 'red' | 'yellow' | null; }

export function detectAnomalies(cur: Record<string, number>, prev: Record<string, number>): Anomaly[] {
  const out: Anomaly[] = [];
  for (const dim of Object.keys(HEALTH_TARGETS)) {
    const c = cur[dim] || 0;
    const p = prev[dim] || 0;
    if (p <= 0) continue;
    const deltaPct = Math.round(((c - p) / p) * 1000) / 10;
    const abs = Math.abs(deltaPct);
    out.push({ dim, cur: c, prev: p, deltaPct, level: abs >= 20 ? 'red' : abs >= 10 ? 'yellow' : null });
  }
  return out.filter((a) => a.level !== null);
}
