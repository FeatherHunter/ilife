/** T8 #27 + T9 #28 + T10 #29 + #41 · 主视图 + 目标分析盘 + 身体照片 + 读链补齐 envelope 键表（T11 出口复用同一命名；仅 type-only 消费 link-core）。
 *
 * T8 四主视图 key 另立 view 域：calorie.view_home / calorie.view_diet / calorie.view_exercise / calorie.view_goal（一律 stat）。
 * T9 目标分析盘：goal_config / goal_recommend / goal_weight / goal_progress / goal_status / combined / deficit / diet_review / health / ranking / library / search（一律 stat）。
 * T10 照片视图 key 挂 calorie.photo_*（gallery/compare/viewer/gif/help/receipt 六键，就近形状）。
 */
import { isAbsolute } from 'node:path';
import type { EnvelopeShape } from 'base-link-core';
import { calorieKey } from '../fetch/shapes.js';
import { CalorieRenderError } from './errors.js';

export const VIEW_KEYS = {
  home: calorieKey('view', 'home'),
  diet: calorieKey('view', 'diet'),
  exercise: calorieKey('view', 'exercise'),
  goal: calorieKey('view', 'goal'),
  goalConfig: calorieKey('view', 'goal_config'),
  goalRecommend: calorieKey('view', 'goal_recommend'),
  goalWeight: calorieKey('view', 'goal_weight'),
  goalProgress: calorieKey('view', 'goal_progress'),
  goalStatus: calorieKey('view', 'goal_status'),
  combined: calorieKey('view', 'combined'),
  deficit: calorieKey('view', 'deficit'),
  dietReview: calorieKey('view', 'diet_review'),
  health: calorieKey('view', 'health'),
  ranking: calorieKey('view', 'ranking'),
  library: calorieKey('view', 'library'),
  search: calorieKey('view', 'search'),
  weight: calorieKey('view', 'weight'),
  weightHistory: calorieKey('view', 'weight_history'),
  weightCompare: calorieKey('view', 'weight_compare'),
  weightReview: calorieKey('view', 'weight_review'),
  volatility: calorieKey('view', 'volatility'),
  bodyComposition: calorieKey('view', 'body_composition'),
  bodyMeasure: calorieKey('view', 'body_measure'),
  plan: calorieKey('view', 'plan'),
  planWizard: calorieKey('view', 'plan_wizard'),
  exerciseGoal: calorieKey('view', 'exercise_goal'),
  goalExpiring: calorieKey('view', 'goal_expiring'),
  goalPredict: calorieKey('view', 'goal_predict'),
  goalVsActual: calorieKey('view', 'goal_vs_actual'),
  predict: calorieKey('view', 'predict'),
  anomaly: calorieKey('view', 'anomaly'),
  contraindication: calorieKey('view', 'contraindication'),
  dedupe: calorieKey('view', 'dedupe'),
  profile: calorieKey('view', 'profile'),
} as const;
export type ViewName = keyof typeof VIEW_KEYS;

export const VIEW_SHAPES: Record<ViewName, EnvelopeShape> = {
  home: 'stat',
  diet: 'stat',
  exercise: 'stat',
  goal: 'stat',
  goalConfig: 'stat',
  goalRecommend: 'stat',
  goalWeight: 'stat',
  goalProgress: 'stat',
  goalStatus: 'stat',
  combined: 'stat',
  deficit: 'stat',
  dietReview: 'stat',
  health: 'stat',
  ranking: 'stat',
  library: 'stat',
  search: 'stat',
  weight: 'stat',
  weightHistory: 'stat',
  weightCompare: 'stat',
  weightReview: 'stat',
  volatility: 'stat',
  bodyComposition: 'stat',
  bodyMeasure: 'stat',
  plan: 'stat',
  planWizard: 'stat',
  exerciseGoal: 'stat',
  goalExpiring: 'stat',
  goalPredict: 'stat',
  goalVsActual: 'stat',
  predict: 'stat',
  anomaly: 'stat',
  contraindication: 'stat',
  dedupe: 'stat',
  profile: 'stat',
};

export function viewShapeFor(key: string): EnvelopeShape {
  const hit = (Object.entries(VIEW_KEYS) as [ViewName, string][]).find(([, v]) => v === key);
  if (!hit) throw new CalorieRenderError('bad-input', '未知视图 key：' + key);
  return VIEW_SHAPES[hit[0]];
}

/** stat 载荷守卫：metrics 须全 number（envelope 全字段前置校验，坏载荷不进渲染）。 */
export function assertStatMetrics(metrics: Record<string, unknown>): asserts metrics is Record<string, number> {
  for (const [k, v] of Object.entries(metrics)) {
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      throw new CalorieRenderError('bad-input', 'stat.metrics 值须全为有限 number：' + k);
    }
  }
}

export const PHOTO_VIEW_KEYS = {
  gallery: calorieKey('photo', 'list'),
  viewer: calorieKey('photo', 'detail'),
  compare: calorieKey('photo', 'compare'),
  receipt: calorieKey('photo', 'receipt'),
  gif: calorieKey('photo', 'gif'),
  help: calorieKey('help', 'center'),
} as const;
export type PhotoViewName = keyof typeof PHOTO_VIEW_KEYS;

export const PHOTO_VIEW_SHAPES: Record<PhotoViewName, EnvelopeShape> = {
  gallery: 'list',
  viewer: 'detail',
  compare: 'list',
  receipt: 'receipt',
  gif: 'analysis',
  help: 'list',
};

export function photoShapeFor(key: string): EnvelopeShape {
  const hit = (Object.entries(PHOTO_VIEW_KEYS) as [PhotoViewName, string][]).find(([, v]) => v === key);
  if (!hit) throw new CalorieRenderError('bad-input', '未知照片视图 key：' + key);
  return PHOTO_VIEW_SHAPES[hit[0]];
}

/* ── #83 · 三态交付契约（M4 HTML-First 铁则 ＋ 渲染失败回执） ────────────────────────────────
 *
 * 旧铁则正本（只读基线 `D:\2Study\StudyNotes\SKILLS\卡路里\SKILL.md:18-19`）：
 *   4. HTML-First：唤醒词命中后**只要模板表列出对应 HTML，AI 必须 invoke HTML 工作流（渲染 → 打开），严禁文字答**；
 *      渲染失败处理契约（v2.4.19 增 · #242）：render 脚本**必须** invoke，**不得手写 HTML 兜底**；
 *      判定成功 ＝ 退出码 0 且产物 HTML 文件存在；渲染失败（退出码非 0／产物缺失）→ 输出**错误回执**
 *      （说明失败原因 ＋ 建议命令），**严禁**手写 HTML 代替渲染产物。
 *
 * 新架构落点（维护者 2026-09-08 拍定**方案 A**）：`delivery` 作为 envelope 的**追加字段**
 * （`{mode,path?,template?,bytes?}`，六形状与既有五字段一字不改），stdout 仍守 P9「一行 JSON」。
 * 三态同源：同一个 key、同一份 `data`，绝不各自取数（②③ 的载荷都由该次 envelope 派生）。
 */
export const DELIVERY_MODES = ['file', 'inline', 'text'] as const;
export type DeliveryMode = (typeof DELIVERY_MODES)[number];

/** 产物族（**结构判定**，非配置表）：描述该产物由哪一类模板／壳产出，供调用方选渲染宿主。 */
export const DELIVERY_TEMPLATES = ['help-shell', 'doc-shell', 'receipt', 'fragment', 'text'] as const;
export type DeliveryTemplate = (typeof DELIVERY_TEMPLATES)[number];

export interface Delivery {
  /** 交付通道（必填）：`file` 落盘绝对路径／`inline` 产物随 envelope 回传／`text` 结构化文本。 */
  readonly mode: DeliveryMode;
  /** 落盘绝对路径（仅 `file` 态，或落盘成功的 `text` 态如 `help.center` 的 text 交付）。 */
  readonly path?: string;
  /** 产物族。 */
  readonly template?: DeliveryTemplate;
  /** 产物 UTF-8 字节数。 */
  readonly bytes?: number;
}

/** 产物族判定（首命中即定，纯结构、零配置、零取数）：
 *  空／无标签 → `text`；含 #88 速查台壳标记 → `help-shell`；`<!DOCTYPE` → `doc-shell`；
 *  `receipt` 形 → `receipt`；其余 → `fragment`。 */
export function deliveryTemplateOf(shape: EnvelopeShape, html: string): DeliveryTemplate {
  const s = typeof html === 'string' ? html : '';
  if (s.trim() === '' || !/<[a-zA-Z!/]/.test(s)) return 'text';
  if (s.includes('id="ilife-help-shell"')) return 'help-shell';
  if (/^\s*<!DOCTYPE/i.test(s)) return 'doc-shell';
  if (shape === 'receipt') return 'receipt';
  return 'fragment';
}

/** 交付信号构造（唯一入口）：`mode` 闭集校验、`path` 只许绝对路径、`bytes` 非负整数。
 *  `template` 缺省按产物结构判定；文本交付由调用方显式给 `'text'`（文本里可能出现 `<N>` 之类
 *  非标签串，结构判定对文本不可靠，故不猜）。 */
export function buildDelivery(input: {
  mode: DeliveryMode;
  path?: string;
  shape: EnvelopeShape;
  html?: string;
  bytes?: number;
  template?: DeliveryTemplate;
}): Delivery {
  if (!(DELIVERY_MODES as readonly string[]).includes(input.mode)) {
    throw new CalorieRenderError('bad-input', '交付通道非法：' + String(input.mode) + '（须为 ' + DELIVERY_MODES.join('／') + '）');
  }
  const out: { mode: DeliveryMode; path?: string; template?: DeliveryTemplate; bytes?: number } = { mode: input.mode };
  if (input.path !== undefined) {
    if (!isAbsolute(input.path)) throw new CalorieRenderError('bad-input', 'delivery.path 须为绝对路径：' + input.path);
    out.path = input.path;
  }
  if (input.template !== undefined) {
    if (!(DELIVERY_TEMPLATES as readonly string[]).includes(input.template)) {
      throw new CalorieRenderError('bad-input', '交付产物族非法：' + String(input.template));
    }
    out.template = input.template;
  } else {
    out.template = deliveryTemplateOf(input.shape, input.html ?? '');
  }
  if (input.bytes !== undefined) {
    if (!Number.isInteger(input.bytes) || input.bytes < 0) {
      throw new CalorieRenderError('bad-input', 'delivery.bytes 须为非负整数：' + String(input.bytes));
    }
    out.bytes = input.bytes;
  }
  return out;
}

/** 顶层追加 `delivery`（**只追加**：既有五字段 `version/skill/shape/key/data` 一字不改、序不变）。 */
export function withDelivery(env: Record<string, unknown>, delivery: Delivery): Record<string, unknown> {
  return { ...env, delivery };
}
