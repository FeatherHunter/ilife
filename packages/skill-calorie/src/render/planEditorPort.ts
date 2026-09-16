/** T351-v18 · 186「定训练计划」**编辑器入口**：讨论结果（`plan`）→ 编辑器状态 → 整页。
 *
 * 这一件把「可写页」从样张接到命令面上（对齐记录 A3「做成可写页而不只是结果回显」，接线口径见
 * `#553` 读法甲：186 那张页换装成编辑器，墙里 `定训练计划-*` 换成编辑器版）。
 *
 * 为什么住 `render/` 而不搬进 `workout/`：本件只做两件事——**形状翻译**（讨论结果 → `EditorState`）
 * 与**交给装配**（`planEditorDocs.buildPlanEditorDoc`），不取库、不落库；命令面只指过来一个函数名。
 * 命名与分层沿同目录先例：`wizardPort.ts`（同样是「命令 → 整页」的薄入口）；render → workout 的引用
 * 也有先例（`planPlate.ts` 引 `workout/planStore.js` 的 `validatePlan`／`getPlan`）。
 *
 * ## 键为什么沿用 `calorie.view.plan-wizard`
 *
 * `#553` 把「接哪条键」留给执行席（原文：「`calorie.view.plan-wizard`（或新键）出口出编辑器页」）。
 * 本票取**不动键**的那一支：186 是这条键的过程页，换装只换**产出**——`routes.ts` 的键与 `cli` 一字未动，
 * `keys.ts`／`registry.ts`／`routes.generated.ts` 三件生成物因此零 diff（`pnpm gen` 后仍是原样）。
 * 键之外没有第二条入口：本件是这条页唯一的产出者。
 *
 * ## 三条口径（需求正件 `t351-v14-plan-editor-design.md` §1④ ＋ 对齐记录 A3／C10）
 *
 *   ① **讨论先于生成**：给了 `plan` 就按它把编辑器**填好**（用户只微调）；`plan` 没给、不是对象、
 *      或里面一个周都没有 ⇒ 走**空态兜底**（页面上那颗「定一份计划」把空态变成母版周）。空态是兜底，
 *      不做主路径——所以它**不报错**，`metrics` 全零而不是「缺参数」失败。
 *   ② **翻译不臆造**：`sets` 有就照搬（组数＝条数、次数与负重取第一条＝页面一行一格的容量）；
 *      有氧按负责人认可的承载方式（一段 set：`unit='分钟'`、`reps`＝分钟，`weight=0`）；
 *      库里 `movements[].note` 在编辑器形状（`planEditor.ts`）没有槽位，**本件如实丢弃**。
 *   ③ **零分隔符**：本件与它写进页面的文案不出现 `|`／`-`／`·`；日期由装配层走 `cnDate`。
 *
 * ## 校验读数为什么不退场
 *
 * 页面换了，**校验器没换**：`data.metrics` 仍由 `planPlate.buildPlanWizardView`（内部走
 * `planStore.validatePlan` 的 dryRun）出 `errorCount`／`warningCount`／`checkedSessions`——
 * 既有测试（`test/render-t41.test.mjs` 断言 `errorCount`、`test/cli-smoke-t41.test.mjs` 断言
 * envelope 与整页）与命令的 `data.metrics` 形状据此不动。空态那一支不跑校验器（没有周可校）。
 */
import type { DatabaseSync } from 'node:sqlite';
import type { ViewOut } from '../shared/commandSpec.js';
import { fail, nums } from '../shared/params.js';
import { commandLine } from '../shared/writeParts.js';
import { loadPresetCatalogNames } from '../fetch/index.js';
import { WIZARD_WAKE_WORD } from '../workout/precheckPrompt.js';
import { inferEquipment } from '../workout/planStore.js';
import type { EditorDay, EditorMove, EditorState, EditorWeek } from './planEditor.js';
import { buildPlanEditorDoc } from './planEditorDocs.js';
import { buildPlanWizardView } from './planPlate.js';

/** 这条键：186「定训练计划」的过程页就是它（换装前后键名不变，见件头）。 */
const EDITOR_KEY = 'calorie.view.plan-wizard';
/** 每段选一个时段（负责人 2026-09-15 第 2 节；真库 `session_label` 的时段前缀取值域同此）。 */
const SLOTS: readonly string[] = ['凌晨', '上午', '下午', '晚上'];
/** 每天 4 段（负责人 2026-09-15 明确「每天 4 段」）——同时是页面「加一次训练」的上限。 */
const MAX_SESSIONS_PER_DAY = 4;
/** 一次训练最多几个动作（编辑器形状既有上限 `planEditor.ts` 的 `maxMovesPerSession`）。 */
const MAX_MOVES_PER_SESSION = 6;
/** 周数上限：与页内运行时 `setWeeks` 同一口径（52）。 */
const WEEK_CAP = 52;
const CARDIO = '有氧';
const MINUTE_UNIT = '分钟';
/** 认不出部位的动作：给它一个能上屏、也能被选择层分组的词（空串会在选择层里出一颗空胶囊）。 */
const UNKNOWN_PART = '未分类';
/** 新动作的默认参数（与页内运行时 `pick` 分支逐字同值：4 组乘 8 次、负重 0、有氧 30 分钟）。 */
const NEW_MOVE_SETS = 4;
const NEW_MOVE_REPS = 8;
const NEW_MOVE_MINUTES = 30;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const asText = (v: unknown): string => (typeof v === 'string' ? v : '');
const asNum = (v: unknown, dflt: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : dflt);
const rowsOf = (v: unknown): readonly unknown[] => (Array.isArray(v) ? v : []);

/** 日期：ISO 就用它，否则用今天（本件自备，免得把时间口径引到分析层）。 */
function isoOrToday(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date();
  const pad = (n: number): string => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

/** 时段：标签里认出哪个就是哪个（时段是分类签，一天里同一时段可建多段，不做占用分配）。 */
function slotOf(label: string): string {
  for (const s of SLOTS) if (label.includes(s)) return s;
  return SLOTS[0];
}

/** 一个动作 → 编辑器行。`sets` 只取第一条当「组数 × 次数 × 负重」的代表（页面一行一格，铺不开多组不同次数）。 */
function moveOf(raw: unknown): EditorMove | null {
  if (!isRecord(raw)) return null;
  const name = asText(raw['name']).trim();
  if (name === '') return null;
  const sets = rowsOf(raw['sets']);
  const first = sets[0];
  const unit = isRecord(first) ? asText(first['unit']) : '';
  const part0 = asText(raw['part']).trim();
  const type = asText(raw['type']).trim();
  const equip = inferEquipment(name) ?? '';
  const firstRec = isRecord(first) ? first : {};
  if (type.includes(CARDIO) || unit === MINUTE_UNIT) {
    return {
      name, part: part0 === '' ? UNKNOWN_PART : part0, type, equip, kind: CARDIO, goal: '',
      sets: sets.length, reps: 0, mode: 'kg', load: 0,
      minutes: first === undefined ? NEW_MOVE_MINUTES : asNum(firstRec['reps'], NEW_MOVE_MINUTES),
    };
  }
  const reps = first === undefined ? NEW_MOVE_REPS : asNum(firstRec['reps'], NEW_MOVE_REPS);
  return {
    name, part: part0 === '' ? UNKNOWN_PART : part0, type, equip, kind: '力量', goal: '',
    sets: sets.length > 0 ? sets.length : NEW_MOVE_SETS,
    reps,
    mode: unit === 'RM' ? 'rm' : 'kg',
    load: first === undefined ? 0 : asNum(firstRec['weight'], 0),
    minutes: 0,
  };
}

/** 起止时间：库里 `time_start/time_end`（`HH:MM`），脏值按没定处理（页面上就是没填的两格）。 */
function timeOf(v: unknown): string {
  return typeof v === 'string' && /^\d{2}:\d{2}$/.test(v) ? v : '';
}

/** 一次训练（＝库里的一行）：最多 4 段；`is_rest_day` 的那条不进编辑器（页面上「没排训练的那天」就是休息日）。 */
function sessionsOf(value: unknown): { slot: string; timeStart: string; timeEnd: string; moves: EditorMove[] }[] {
  const out: { slot: string; timeStart: string; timeEnd: string; moves: EditorMove[] }[] = [];
  for (const item of rowsOf(value)) {
    if (out.length >= MAX_SESSIONS_PER_DAY) break;
    if (!isRecord(item)) continue;
    if (item['is_rest_day'] === true) continue;
    const slot = slotOf(asText(item['session_label']));
    const moves: EditorMove[] = [];
    for (const m of rowsOf(item['movements'])) {
      const one = moveOf(m);
      if (one !== null) moves.push(one);
    }
    out.push({ slot, timeStart: timeOf(item['time_start']), timeEnd: timeOf(item['time_end']), moves });
  }
  return out;
}

/** 一周：恒 7 天（页面一次只显示一天，没排的那天就是空天）；**第 2 周起 locked**（只许改参数，负责人③）。 */
function weekOf(raw: unknown, index: number): EditorWeek {
  const days: EditorDay[] = [];
  for (let i = 0; i < 7; i++) days.push({ sessions: [] });
  const list = isRecord(raw) ? rowsOf(raw['days']) : [];
  for (const item of list) {
    if (!isRecord(item)) continue;
    const dow = asNum(item['day_of_week'], 0);
    if (!Number.isInteger(dow) || dow < 1 || dow > 7) continue;
    days[dow - 1] = { sessions: sessionsOf(item['sessions']) };
  }
  return { locked: index > 0, days };
}

function weeksOf(plan: Record<string, unknown>): EditorWeek[] {
  return rowsOf(plan['weeks']).slice(0, WEEK_CAP).map((w, i) => weekOf(w, i));
}

/** 动作库（选择层「从库里选」那一半）：只装库里的动作，库外动作不进选择层。
 *  库面两档：用户传了 `catalog` 参数就用它的；没传就用包内预置训记官方库
 *  （`data/训记官方动作.json`，读法见 `fetch/xunji-catalog.ts` 的 `loadPresetCatalogNames`）；
 *  两者都没有就空库。页面**不内嵌全库**（对齐记录 B3 的后半句——预置库落地后
 *  参数只作覆盖用；D1 的格式问题随预置文件一并落定：名数组）。
 *  预置库名只有名、没有部位/类型，一律按力量默认参数进选择层（与原来 `catalog` 参数同口）。
 *  预置库只管「从库里选」，不管校验口径——校验读数（`buildPlanWizardView`）仍只吃用户传的 catalog：
 *  官方库里没有爬楼机/椭圆机这类有氧名，校验口径一并切过去会把现有页染红，故两条线分开。 */
function libOf(catalog: readonly string[] | undefined, fromPreset: boolean): { lib: EditorMove[]; libSource: string } {
  const seen = new Map<string, Omit<EditorMove, 'sets' | 'reps' | 'mode' | 'load' | 'minutes'>>();
  for (const name of catalog ?? []) {
    if (name === '' || seen.has(name)) continue;
    seen.set(name, { name, part: UNKNOWN_PART, type: '', equip: inferEquipment(name) ?? '', kind: '力量', goal: '' });
  }
  const lib = [...seen.values()].map((h) => ({ ...h, sets: NEW_MOVE_SETS, reps: NEW_MOVE_REPS, mode: 'kg' as const, load: 0, minutes: h.kind === CARDIO ? NEW_MOVE_MINUTES : 0 }));
  const src = catalog === undefined
    ? '动作库：暂无可用来源（' + lib.length + ' 件）'
    : (fromPreset
      ? '动作库：预置训记官方库（' + lib.length + ' 件）'
      : '动作库：命令参数 catalog（' + lib.length + ' 件）');
  return { lib, libSource: src };
}

function countOf(weeks: readonly EditorWeek[], what: 'sessions' | 'moves'): number {
  let n = 0;
  for (const w of weeks) {
    for (const d of w.days) n += what === 'sessions' ? d.sessions.length : d.sessions.reduce((a, s) => a + s.moves.length, 0);
  }
  return n;
}

/** `catalog`（可选）：给了就必须是字符串数组——坏参数报用法错（exit 2，与旧件同一口径）。 */
function catalogOf(params: Record<string, unknown>): readonly string[] | undefined {
  const raw = params['catalog'];
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw) || !raw.every((x) => typeof x === 'string')) fail(2, 'catalog 须为字符串数组');
  return raw as readonly string[];
}

/** `openWeek`（可选，样张／链接用）：首屏停在第几个周页签（0 基）。 */
function openWeekOf(params: Record<string, unknown>): number | undefined {
  const raw = params['openWeek'];
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 0) fail(2, 'openWeek 须为非负整数');
  return raw;
}

/** 把讨论结果翻成编辑器初始状态（纯函数；命令面与证据件都走它，免得两处各译一份）。 */
export function editorStateFromPlan(plan: unknown, opts: { catalog?: readonly string[]; openWeek?: number } = {}): EditorState {
  const p = isRecord(plan) ? plan : {};
  const weeks = weeksOf(p);
  // 库面两档（只管「从库里选」，校验读数仍只吃用户传的 catalog，见 viewPlanEditor）：
  // 用户显式传了 catalog 就用它的；没传就读包内预置训记官方库；预置库也缺就空库。
  const userCatalog = opts.catalog;
  const presetNames = userCatalog === undefined ? loadPresetCatalogNames() : [];
  const { lib, libSource } = userCatalog !== undefined
    ? libOf(userCatalog, false)
    : (presetNames.length > 0 ? libOf(presetNames, true) : libOf(undefined, false));
  const cfg = isRecord(p['config']) ? p['config'] : {};
  const title = asText(cfg['title']).trim();
  return {
    title: title === '' ? '训练计划' : title,
    startDate: isoOrToday(asText(cfg['start_date'])),
    slots: [...SLOTS],
    maxSessionsPerDay: MAX_SESSIONS_PER_DAY,
    maxMovesPerSession: MAX_MOVES_PER_SESSION,
    libSource,
    lib,
    weeks,
    wakeWord: WIZARD_WAKE_WORD,
    openWeek: opts.openWeek ?? 0,
  };
}

/** `calorie.view.plan-wizard` · 定训练计划（可写页）：`plan` 给了就预填，不给走空态兜底。 */
export function viewPlanEditor(params: Record<string, unknown>, _db: DatabaseSync): ViewOut {
  const catalog = catalogOf(params);
  const state = editorStateFromPlan(params['plan'], { catalog, openWeek: openWeekOf(params) });
  // 校验读数只在真有周的时候跑（空态是兜底，不是失败）；形状与旧件逐键同形，既有断言不动。
  const checked = state.weeks.length === 0
    ? { errorCount: 0, warningCount: 0, checkedSessions: 0 }
    : (() => {
      const v = buildPlanWizardView(params['plan'], catalog === undefined ? undefined : [...catalog]);
      return { errorCount: v.errorCount, warningCount: v.warningCount, checkedSessions: v.checkedSessions };
    })();
  const metrics = nums({
    ...checked,
    weeks: state.weeks.length,
    trainings: countOf(state.weeks, 'sessions'),
    moves: countOf(state.weeks, 'moves'),
    libSize: state.lib.length,
  });
  const html = buildPlanEditorDoc(state, { key: EDITOR_KEY, command: commandLine(EDITOR_KEY, params) });
  return { data: { metrics }, html };
}
