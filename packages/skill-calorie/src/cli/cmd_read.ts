#!/usr/bin/env node
/** T11 #30 · 卡路里唯一出口 cmd_read：argv+JSON(stdout)+exit；非 0 走 stderr；超时 terminate+TOAST 降级标记。
 * #40 · 写键同出口：35 写键（diet/water/weight/exercise/photo/product/profile/goal/body 各域，一律 receipt）
 * 走 cli/write.ts 分发（memo.create/update/remove 范式：先调 fetch 库函数写库，再用 T10 receipt 组装回执）。
 * 退出码对齐 skilllink 冻结（P9）：0 ok；1 预检；2 用法/参数；3 key；4 取数/超时；5 envelope/渲染/落盘。
 * stdout 纯净：成功只打 envelope JSON 一行（version/skill/shape/key/data 全字段，对齐 link-core 0.1.0）。
 * 组合键为 registry 合法点式（见 cli/keys.ts；内部 VIEW_KEYS 下划线键仅渲染层复用，不直接登记）。
 * 缺失阻断不返空：空库/空窗/无目标一律抛（CalorieRenderError missing-data / FetchError），exit 4，不返空数组冒充正常。
 * 仅 type-only 消费 link-core（零运行时依赖）；envelope 手工装配，形状校验本地镜像 link-core。
 * HTML 默认落盘（utf8，见下行 #87）＋ 可用 `--html` 显式覆盖：视图键走 render/html.ts 专属模板（与 T8/T9/T10 快照同源），其余走通用 section。
 * #87 · 输出命名规范复刻（M10）：不给 `--html` 时默认落
 * <SKILLS_DB_PATH>/calorie_html/<中文command>_<YYYYMMDD>_<HHMMSS>[_N].html（同秒冲突自动加后缀），
 * 中文 command 取 CALORIE_COMBOS[key].title；显式 `--html` 覆盖任意路径。
 * ⚠️ 老技能的 `--output` 别名**已由 #245 收口删除**（与其余五家同形：只认 `--html`；给 `--output` 即 exit 2）。
 * 落点随 envelope 的 data.output 回传（additive 字段，六形状守卫不校验 data 额外键）。
 * #91 · `calorie.help.center` 承载**全量速查台**（Q9）：`--params '{"mode":"file|inline|text"}'` 显式选交付形态
 * （D6，缺省 `file`）；`q`／`keyword` 保留**照片 10 键**语义（非空＝现找、空串＝全量 10 键）。envelope 恒五字段
 * `version/skill/shape/key/data`（Q8：**无 `status`**），`data` 只回索引与落点／字节数，不回 1 MB 产物。
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { openDb } from '../schema.js';
import {
  DB_FILENAME,
} from '../paths.js';
import { FetchError } from '../fetch/errors.js';
import { buildGoalView } from '../render/goal.js';
import {
  buildGoalConfig,
  buildGoalRecommend,
  buildGoalWeight,
  buildGoalStatus,
} from '../render/goalPlate.js';
import { buildGoalDraft, isGoalProfile } from '../goal/set.js';
import { buildGoalPrecheckDoc } from '../goal/precheck.js';
import { buildGoalExpiringView, buildGoalPredictView, buildGoalVsActualView } from '../render/goalExtra.js';

// #179 · 档案读链取数搬进能力目录 `src/profile/`（同一个取数不留两处）。
import { buildProfileView, buildProfileViewDoc } from '../profile/view.js';
import { buildProfileSettingDoc, buildProfileSettingView } from '../profile/setup.js';
import { buildReviewDoc } from '../render/sportPortDocs.js';
import { buildReviewView } from '../render/exercisePort.js';
import { buildProcessProgressView } from '../render/trendMiscPort.js';
import { buildProcessProgressDoc } from '../render/trendMiscPortDocs.js';
import { buildContraDoc, buildGoalPredictDoc } from '../render/trendDocs.js';

// #91 · 全量速查台（Q9）：只读消费 #88 的 `render/helpCenter.js`（三态同源，零改动）。
import { renderErrorHtml, renderGoalConfigHtml, renderGoalRecommendHtml, renderGoalWeightHtml, renderGoalStatusHtml, renderGoalHtml, renderPlanHtml, renderPlanWizardHtml, renderGoalExpiringHtml, renderGoalVsActualHtml } from '../render/html.js';
import { assertStatMetrics, buildDelivery, withDelivery } from '../render/envelope.js';
import type { Delivery } from '../render/envelope.js';
import { buildErrorReceipt } from '../render/receipt.js';
import type { ErrorReceipt } from '../render/receipt.js';
import { buildDataText } from 'base-paint';
import { CalorieRenderError } from '../render/errors.js';
import { TRIGGERS } from '../triggers/index.js';
import { execCliFor, routeWakeword } from '../triggers/help-lookup.js';

// #250 · 窗口与锚点只有一个定义地（analysis/series.ts）：读命令一律经下方 anchorOf／windowRange／dayField 取参。
import { CALORIE_COMBOS, ENVELOPE_VERSION, CALORIE_SKILL, calorieShapeFor, isCalorieWriteKey } from './keys.js';
// #294 · 参数读取与窗口口径上移共用位：能力目录里的命令与分派层用同一套口径（唯一定义地）。
import { dayField, defaultRange, fail, nums, optNum, optStr } from '../shared/params.js';
import {
  HTML_DIR_NAME,
  deliverHtml,
  resolveReceiptHtmlPath,
} from '../output.js';
import { openDbReadOnly } from '../db/readonly.js';
import { dispatchWrite } from './write.js';
// #294 · 命令索引：命中即走能力目录里的实现，未命中的老键落本文件的 switch。
import { REGISTRY } from './registry.js';
import type { DeliveryKind, ViewOut } from '../shared/commandSpec.js';
import type { EnvelopeShape } from 'base-link-core';

const DEFAULT_TIMEOUT_MS = 30000;

/** #294 · 读命令产物的形状（含交付种类）唯一定义地已上移 `shared/commandSpec.ts`：
 *  能力目录与分派层共用一份，本文件只按原名转出，既有调用方导入面不变。 */
export type DispatchOut = ViewOut;
export type { DeliveryKind } from '../shared/commandSpec.js';

function toast(msg: string): void {
  console.error('TOAST: ' + msg);
}

function preflight(): string {
  const v = process.versions.node.split('.').map(Number);
  const major = v[0] as number;
  const minor = v[1] as number;
  if (!(major > 22 || (major === 22 && minor >= 13))) fail(1, 'node 低于 22.13：' + process.versions.node);
  const p = process.env.SKILLS_DB_PATH;
  if (!p) fail(1, 'SKILLS_DB_PATH 未设置（无默认值，必设）');
  return p as string;
}

interface ReadArgs {
  key: string | undefined;
  params: string | undefined;
  html: string | undefined;
  timeout: number;
}

const USAGE = '用法：cmd_read <calorie.key> [--params JSON对象] [--html 输出路径] [--timeout 毫秒]';

function parseArgs(a: string[]): ReadArgs {
  const o: ReadArgs = {
    key: a[0], params: undefined, html: undefined, timeout: DEFAULT_TIMEOUT_MS,
  };
  for (let i = 1; i < a.length; i++) {
    if (a[i] === '--params' && i + 1 < a.length) o.params = a[++i] as string;
    else if (a[i] === '--html' && i + 1 < a.length) o.html = a[++i] as string;
    else if (a[i] === '--timeout' && i + 1 < a.length) {
      o.timeout = Number(a[++i]);
      if (!Number.isFinite(o.timeout) || (o.timeout as number) <= 0) fail(2, '--timeout 须为正数毫秒');
    } else fail(2, '未知参数：' + a[i] + '（' + USAGE + '）');
  }
  return o;
}

/** 本地 envelope 形状校验（镜像 link-core assertShapeData，不运行时 import）。 */
function assertEnvelopeData(shape: EnvelopeShape, data: Record<string, unknown>): void {
  switch (shape) {
    case 'list':
      if (!Array.isArray(data['items'])) throw new CalorieRenderError('bad-input', 'list 形缺 items 数组');
      if (data['total'] !== undefined && typeof data['total'] !== 'number') throw new CalorieRenderError('bad-input', 'list 形 total 须为 number');
      break;
    case 'detail':
      if (typeof data['item'] !== 'object' || data['item'] === null || Array.isArray(data['item'])) {
        throw new CalorieRenderError('bad-input', 'detail 形缺 item 对象');
      }
      break;
    case 'stat':
      if (typeof data['metrics'] !== 'object' || data['metrics'] === null || Array.isArray(data['metrics'])) {
        throw new CalorieRenderError('bad-input', 'stat 形缺 metrics 对象');
      }
      assertStatMetrics(data['metrics'] as Record<string, unknown>);
      break;
    case 'receipt':
      if (typeof data['ok'] !== 'boolean' || typeof data['message'] !== 'string') {
        throw new CalorieRenderError('bad-input', 'receipt 形缺 ok/message 全字段');
      }
      break;
    case 'analysis':
      if (typeof data['summary'] !== 'string' || (data['summary'] as string).length === 0) {
        throw new CalorieRenderError('bad-input', 'analysis 形缺 summary 全字段');
      }
      break;
    case 'fallback':
      if (typeof data['reason'] !== 'string' || (data['reason'] as string).length === 0 || data['degraded'] !== true) {
        throw new CalorieRenderError('bad-input', 'fallback 形缺 reason/degraded:true 全字段');
      }
      break;
    default:
      throw new CalorieRenderError('bad-input', '未知 shape：' + String(shape));
  }
}

function buildEnvelope(key: string, shape: EnvelopeShape, data: Record<string, unknown>): Record<string, unknown> {
  assertEnvelopeData(shape, data);
  return { version: ENVELOPE_VERSION, skill: CALORIE_SKILL, shape, key, data };
}

// 全键分发：读走 render/fetch 读，HELP 走触发词现找；未知键上游已拦，此处再拦一道。
/** #41 · 测试直调出口（纯 CLI 同逻辑，不经过 argv/spawn；CLI 唯一出口仍为 main）。 */
export function dispatch(key: string, params: Record<string, unknown>, db: DatabaseSync): DispatchOut {
  // #294 · 注册表先行：命中即走能力目录那道门（新增能力／新增命令都不必碰这个文件）；
  // 未命中的老键照旧落下面这口 switch——两条路各有断言（test/cmd-registry-294）。
  const spec = REGISTRY[key];
  if (spec) {
    if (spec.kind !== 'read') fail(3, '写键不走读分派：' + key);
    return spec.run(params, db);
  }
  switch (key) {
    case 'calorie.view.profile-wizard': {
      const v = buildProfileSettingView(db, params);
      const metrics = nums({
        filledCount: v.filledCount, hasProfile: v.before ? 1 : 0,
        latestWeightKg: v.latestWeightKg, activityLevels: v.activityChoices.length,
      });
      return { data: { metrics }, html: buildProfileSettingDoc(v) };
    }
    case 'calorie.view.goal-wizard': {
      // #251 · 目标管理写前预检页：`profile`（选填）决定算不算推荐，`wake`（选填）决定本页展开哪条写词。
      const profileRaw = optStr(params, 'profile');
      if (profileRaw !== undefined && !isGoalProfile(profileRaw)) {
        throw new CalorieRenderError('bad-input', 'profile 非法（cut/maintain/bulk）: ' + profileRaw);
      }
      const wakeWord = optStr(params, 'wake') ?? null;
      const draft = buildGoalDraft(db, { profile: profileRaw === undefined ? null : profileRaw });
      const hit = wakeWord === null ? null : TRIGGERS.find((t) => t.wake_word === wakeWord) ?? null;
      const v = {
        wakeWord,
        draft,
        prompt: hit !== null && 'prompt_template' in hit ? String(hit.prompt_template ?? '') : '',
        // 该写词要跑的命令：先取它的可执行路由；三条自动算词今天还没有可执行路由，
        // 回落它自己的 `main_prompt.cli`（那串「先算 → 确认后写」的两段式）——执行接线归 #252。
        command: (wakeWord === null ? '' : routeWakeword(wakeWord)?.cli ?? '')
          || (hit !== null && 'main_prompt' in hit ? hit.main_prompt.cli : '')
          || execCliFor(null, 'calorie-cmd-read calorie.view.goal-wizard'),
      };
      const metrics = nums({
        hasGoal: draft.current === null ? 0 : 1,
        recommendReady: draft.recommend === null ? 0 : 1,
        missingCount: draft.energy.missing.length,
      });
      return { data: { metrics }, html: buildGoalPrecheckDoc(v) };
    }
    case 'calorie.view.goal': {
      const { start, end } = defaultRange(db, params);
      const v = buildGoalView(db, start, end);
      const metrics = nums({
        calorie_goal: v.nutrition.calorie_goal, protein_goal: v.nutrition.protein_goal,
        carbs_goal: v.nutrition.carbs_goal, fat_goal: v.nutrition.fat_goal, water_goal: v.nutrition.water_goal,
        completionPct: v.completionPct, weeklyDeficit: v.deficit.summary.weeklyDeficit,
        predictedLossKg: v.deficit.summary.predictedLossKg, avgDeficit: v.deficit.summary.avgDeficit,
        avgIntake: v.deficit.summary.avgIntake, trendAvg: v.trend.summary.avg,
        completedCount: v.history.completedCount, incompleteCount: v.history.incompleteCount,
      });
      return { data: { metrics }, html: renderGoalHtml(v) };
    }
    case 'calorie.view.goal-config': {
      const g = buildGoalConfig(db);
      const metrics = nums({
        calorie_goal: g.nutrition.calorie_goal, protein_goal: g.nutrition.protein_goal,
        carbs_goal: g.nutrition.carbs_goal, fat_goal: g.nutrition.fat_goal, water_goal: g.nutrition.water_goal,
        diffKcal: g.diffKcal, consistent: g.consistent ? 1 : 0, paused: g.paused ? 1 : 0,
      });
      return { data: { metrics }, html: renderGoalConfigHtml(g) };
    }
    case 'calorie.view.goal-recommend': {
      const profile = optStr(params, 'profile') ?? 'cut';
      if (!['cut', 'maintain', 'bulk'].includes(profile)) fail(2, 'profile 非法（cut/maintain/bulk）：' + profile);
      const g = buildGoalRecommend(db, profile);
      const metrics = nums({
        calorieGoal: g.recommend.calorieGoal, proteinGoal: g.recommend.proteinGoal, carbsGoal: g.recommend.carbsGoal,
        fatGoal: g.recommend.fatGoal, waterGoal: g.recommend.waterGoal, tdee: g.recommend.tdee, bmr: g.recommend.bmr,
        weeklyRateKg: g.recommend.weeklyRateKg, weightKg: g.recommend.basis.weightKg,
        recommendedWaterMl: g.water.recommendedWaterMl, mlPerKg: g.water.mlPerKg,
      });
      return { data: { metrics }, html: renderGoalRecommendHtml(g) };
    }
    case 'calorie.view.goal-weight': {
      const { start, end } = defaultRange(db, params);
      const g = buildGoalWeight(db, start, end);
      const metrics = nums({ weightGoal: g.weightGoal, latestKg: g.latestKg, deltaKg: g.deltaKg, loggedDays: g.loggedDays });
      return { data: { metrics }, html: renderGoalWeightHtml(g) };
    }
    case 'calorie.view.goal-status': {
      const g = buildGoalStatus(db);
      const metrics = nums({ paused: g.paused ? 1 : 0, calorie_goal: g.nutrition.calorie_goal, water_goal: g.nutrition.water_goal });
      return { data: { metrics }, html: renderGoalStatusHtml(g) };
    }
    case 'calorie.view.goal-expiring': {
      const withinDays = optNum(params, 'withinDays') ?? optNum(params, 'days') ?? 14;
      const today = dayField(params, 'today') ?? dayField(params, 'date');
      const v = buildGoalExpiringView(db, withinDays as number, today ?? undefined);
      const metrics = nums({ daysLeft: v.daysLeft, withinDays: v.withinDays, expiring: v.expiring ? 1 : 0, weightGoal: v.weightGoal, calorieGoal: v.calorieGoal });
      return { data: { metrics }, html: renderGoalExpiringHtml(v) };
    }
    case 'calorie.view.goal-predict': {
      // #103 G2 · 目标预测需 ≥14 条体重记录（simulate SIM_MIN_DAYS=14），7 天默认窗结构性不可达 → 默认 14 天。
      const { start, end } = defaultRange(db, params, 14);
      const v = buildGoalPredictView(db, start, end);
      const metrics = nums({ targetKg: v.targetKg, current: v.current, daysLeft: v.daysLeft, ratePerWeek: v.ratePerWeek, feasible: v.feasible ? 1 : 0 });
      return { data: { metrics }, html: buildGoalPredictDoc(v) };
    }
    case 'calorie.view.goal-vs-actual': {
      const { start, end } = defaultRange(db, params);
      const historyDays = optNum(params, 'historyDays') ?? 30;
      const v = buildGoalVsActualView(db, start, end, historyDays as number);
      const metrics = nums({
        completedCount: v.completedCount, incompleteCount: v.incompleteCount,
        completionPct: v.completionPct, trendAvg: v.trendAvg, calorieGoal: v.calorieGoal,
      });
      return { data: { metrics }, html: renderGoalVsActualHtml(v) };
    }
    case 'calorie.view.profile': {
      const v = buildProfileView(db);
      const metrics = nums({
        age: v.profile.age, heightCm: v.profile.height_cm,
        hasGoal: v.hasGoal ? 1 : 0, latestWeightKg: v.latestWeightKg,
        calorieGoal: v.nutrition?.calorie_goal,
      });
      // #179 · 结果页换整页装配（原 `renderProfileHtml` 只出 `<section>` 片段，双击打不开）。
      return { data: { metrics }, html: buildProfileViewDoc(v) };
    }
    default:
      fail(3, '未知 calorie key：' + key);
      throw new Error('unreachable');
  }
}

/* ── #83 · 三态交付装配（M4 HTML-First ＋ 渲染失败回执） ───────────────────────────────── */

/** 交付落点的可读描述（回执文案用；默认目录名必须出现在文案里，便于用户定位）。 */
function describeDeliveryTarget(explicit: string | undefined): string {
  return explicit !== undefined ? '显式落点 ' + explicit : '默认目录 <SKILLS_DB_PATH>/' + HTML_DIR_NAME;
}

/** ③ 文本态的结构化文本：**同源**取 `buildDataText`（#77 契约，五 shape 投影）。
 *  `fallback` 形不在 `SERIALIZABLE_SHAPES` 内（#93 登记：无 CLI 出口）——此时退化为缩进 JSON，
 *  仍是「结构化文本」且零编造；本退化分支由 `delivery-83.test.mjs` 直接钉住。 */
function dataTextOf(shape: EnvelopeShape, key: string, data: Record<string, unknown>): string {
  try {
    return buildDataText({
      envelope: { version: ENVELOPE_VERSION, skill: CALORIE_SKILL, shape, key, data },
      format: 'text',
    } as unknown as Parameters<typeof buildDataText>[0]);
  } catch {
    return JSON.stringify(data, null, 2);
  }
}

/** 三态判定 ＋ envelope 装配（**唯一交付落点**：同一 key、同一份 `data`，绝不各自取数）：
 *  ③ 文本态：用户**明确**要文本（通用 `--params '{"delivery":"text"}'`）／渲染层已产出文本
 *     （#91 `help.center` 的 `mode:'text'`）／**无 HTML 产物**（结构缝：`html` 为空 ⇒ 无对应模板，允许文字答）；
 *  ② 内联态：有 HTML 产物但写不进去（只读／沙箱 `EACCES|EPERM|EROFS|EBUSY`）⇒ 产物随 envelope 回传；
 *  ① 文件态（默认）：落盘 `calorie_html/*.html`，`data.output` 与 `delivery.path` 同值同源。
 *  `delivery` 为 envelope 的**顶层追加字段**（既有五字段一字不改）；P9「stdout 一行 JSON」不变。 */
export function buildDeliveredEnvelope(input: {
  key: string;
  shape: EnvelopeShape;
  out: DispatchOut;
  params: Record<string, unknown>;
  explicit: string | undefined;
}): Record<string, unknown> {
  const { key, shape, params, out } = input;
  const html = typeof out.html === 'string' ? out.html : '';
  const askedText = params['delivery'] === 'text';
  const kind: DeliveryKind = askedText ? 'text' : (out.deliveryKind ?? (html.trim() === '' ? 'text' : 'html'));

  if (kind === 'text') {
    // 三态同源：文本由**同一份** envelope data 经 #77 `buildDataText` 投影（技能侧不自产第二套序列化）。
    const text = typeof out.data['text'] === 'string' ? (out.data['text'] as string) : dataTextOf(shape, key, out.data);
    const data: Record<string, unknown> = { ...out.data, text };
    // 渲染层已定文本交付的键（#91 `help.center` text 态）**保留既有落盘**（`data.output` 指向该文本文件）；
    // 其余键的文本态只走 envelope（③ 产物＝结构化文本，不落 HTML 文件）。
    if (out.deliveryKind === 'text') {
      const d = deliverHtml({ key, params, explicit: input.explicit, target: out.target, html: text });
      if (d.mode === 'file') data['output'] = d.path;
      return withDelivery(buildEnvelope(key, shape, data), buildDelivery({
        mode: 'text', path: d.mode === 'file' ? d.path : undefined, shape, html: text, bytes: d.bytes, template: 'text',
      }));
    }
    return withDelivery(buildEnvelope(key, shape, data), buildDelivery({
      mode: 'text', shape, html: text, bytes: Buffer.byteLength(text, 'utf8'), template: 'text',
    }));
  }

  const d = deliverHtml({ key, params, explicit: input.explicit, target: out.target, html });
  const data: Record<string, unknown> = d.mode === 'file'
    ? { ...out.data, output: d.path }
    : { ...out.data, html };
  return withDelivery(buildEnvelope(key, shape, data), buildDelivery({
    mode: d.mode, path: d.mode === 'file' ? d.path : undefined, shape, html, bytes: d.bytes,
  }));
}

/** #83 · M4「渲染失败回执」：**模板化**回执（`buildErrorReceipt` ＋ `renderErrorHtml`，旧
 *  `render_error_receipt.py` 的等价物）——**严禁手写 HTML 兜底**。回执自身也走三态：默认目录可写即落盘，
 *  否则内联随 stderr 回传。机器可读回执以一行 `RECEIPT {…}` 落 **stderr**（P9：stdout 保持纯净，
 *  不吐半截 envelope），exit 5 与既有「渲染/落盘失败」口径一致。 */
function failWithReceipt(reason: string, key: string | undefined): never {
  console.error('ERR 5: ' + reason);
  try {
    const receipt: ErrorReceipt = buildErrorReceipt({
      sceneName: '渲染',
      wakeWord: key ?? '渲染失败',
      op: '渲染／落盘未完成',
      reason,
      suggestions: [
        '检查 SKILLS_DB_PATH 与 ' + HTML_DIR_NAME + ' 目录权限（只读／沙箱会自动转内联交付）',
        '用 --html <可写绝对路径> 显式指定落点后重试',
        '确认 ' + HTML_DIR_NAME + ' 未被同名文件占位（占位会挡住落点解析）',
      ],
      fixPrompt: 'calorie-cmd-read ' + (key ?? '<key>') + " --params '{…}' --html <可写绝对路径>",
    });
    const receiptHtml = renderErrorHtml(receipt);
    let delivery: Delivery;
    try {
      const d = deliverHtml({
        key: key ?? 'calorie.help.center', params: {}, target: resolveReceiptHtmlPath(), html: receiptHtml,
      });
      delivery = buildDelivery({
        mode: d.mode, path: d.mode === 'file' ? d.path : undefined, shape: 'receipt', html: receiptHtml, bytes: d.bytes,
      });
    } catch {
      delivery = buildDelivery({
        mode: 'inline', shape: 'receipt', html: receiptHtml, bytes: Buffer.byteLength(receiptHtml, 'utf8'),
      });
    }
    // 内联回执把模板化回执页面一并回传（否则调用方拿不到回执正文）；落盘态只回路径。
    console.error('RECEIPT ' + JSON.stringify({
      ok: false, ...receipt, delivery, html: delivery.mode === 'inline' ? receiptHtml : undefined,
    }));
  } catch (e) {
    console.error('TOAST: 回执生成失败（' + ((e as Error).message || String(e)) + '）');
  }
  process.exit(5);
}

function parseReadArgs(a: string[]): ReadArgs {
  return parseArgs(a);
}

async function main(): Promise<void> {
  const o = parseReadArgs(process.argv.slice(2));
  if (!o.key) fail(2, USAGE);
  const dbPath = preflight();
  let params: Record<string, unknown> = {};
  if (o.params !== undefined) {
    try {
      params = JSON.parse(o.params as string) as Record<string, unknown>;
    } catch (e) {
      fail(2, '--params 须为 JSON：' + (e as Error).message);
    }
    if (typeof params !== 'object' || params === null || Array.isArray(params)) fail(2, '--params 须为 JSON 对象');
  }
  let shape: EnvelopeShape;
  try {
    shape = calorieShapeFor(o.key as string);
  } catch (e) {
    fail(3, (e as Error).message);
    throw new Error('unreachable');
  }
  void (CALORIE_COMBOS as Record<string, unknown>)[o.key as string];
  const timer = setTimeout(() => {
    toast('cmd_read 超时 terminate（' + String(o.timeout) + 'ms），已终止取数');
    process.exit(4);
  }, o.timeout as number);
  (timer as unknown as { unref: () => void }).unref();
  let env: Record<string, unknown> | null = null;
  try {
    const dbFile = join(dbPath as string, DB_FILENAME);
    // #93 · 读键走只读打开（不建表、不迁移、写入被拒）；写键或库文件尚不存在时仍走 openDb。
    const db = isCalorieWriteKey(o.key as string) || !existsSync(dbFile) ? openDb(dbFile) : openDbReadOnly(dbFile);
    try {
      // #40 · 唯一出口：写键走 write.ts 分发（memo.create/update/remove 范式），读键走既有 dispatch。
      const out = isCalorieWriteKey(o.key as string)
        ? dispatchWrite(o.key as string, params, db)
        : dispatch(o.key as string, params, db);
      // #83 · 三态交付（M4 HTML-First）：① 文件态（默认）／② 内联态（只读·沙箱回退）／③ 文本态。
      // 落点：--html（显式覆盖）> 默认 calorie_html/<中文command>_<TS>[_N].html（#87／#119）。
      // ⚠️ 老技能的 `--output` 别名**已删**（#245 收口，与其余五家同形：只认 `--html`；给 `--output` 即 exit 2）。
      // 只读类写失败 → 内联交付（产物随 envelope 回传，绝不因写不进去而文字答）；
      // 结构错／渲染错 → 渲染失败回执（模板化回执，exit 5；严禁手写 HTML 兜底）。
      try {
        env = buildDeliveredEnvelope({
          key: o.key as string, shape: shape as EnvelopeShape, out, params, explicit: o.html,
        });
      } catch (e) {
        if (e instanceof CalorieRenderError) throw e;
        failWithReceipt('渲染失败：' + describeDeliveryTarget(o.html) + '：'
          + ((e as Error).message || String(e)), o.key as string);
      }
    } finally {
      db.close();
    }
  } catch (e) {
    if (e instanceof CalorieRenderError) {
      if (e.code === 'missing-data') fail(4, '取数失败（缺失阻断）：' + e.message);
      if (e.code === 'bad-input') fail(2, '参数失败：' + e.message);
      failWithReceipt('渲染失败：' + e.message, o.key as string);
    }
    if (e instanceof FetchError) fail(4, '取数失败：' + (e as Error).message);
    fail(4, '未知失败：' + ((e as Error).message || String(e)));
  } finally {
    clearTimeout(timer);
  }
  process.stdout.write(JSON.stringify(env) + '\n');
}

const invokedAsCli = (process.argv[1] ?? '').replace(/\\/g, '/').endsWith('cmd_read.js');
if (invokedAsCli) await main();
