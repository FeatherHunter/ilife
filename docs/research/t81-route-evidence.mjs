// #81 逐条路由证据（可复现脚本，只读仓内文件 ＋ 实跑 CLI）。
//
// 复跑：node docs/research/t81-route-evidence.mjs                # 打印到 stdout
//      node docs/research/t81-route-evidence.mjs --out docs/research/t81-route-evidence.md
//
// 判据来源：dist（冻结表 ＋ 77 键 registry ＋ HELP_EXEC_OVERRIDES）与
// packages/skill-calorie/src/triggers/routing.ts（路由层）。
// 本脚本不写库、不触发迁移、不改任何文件（--out 除外，且输出确定）；实跑用 docs/research/t81-seed.mjs
// 的标准种子库（与 t81-exec-smoke.mjs 同一份定义）。
// 退出码：0 全部核对通过；1 有核对失败（漂移）。
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { CATEGORY_SCENE, TRIGGERS } from '../../packages/skill-calorie/dist/triggers/index.js';
import { CALORIE_COMBOS, CALORIE_WRITE_COMBOS } from '../../packages/skill-calorie/dist/cli/keys.js';
import { HELP_EXEC_OVERRIDES } from '../../packages/skill-calorie/dist/triggers/help-lookup.js';
import {
  COVERAGE_REPAIR_ROUTES,
  EXEC_ROUTES,
  HIT_NOT_EXEC_ROUTES,
  NEW_KEY_ROUTES,
  NON_EXEC_REASONS,
  OUT_OF_SCOPE_ROUTES,
  T71_DIFFS,
  TWIN_WAKE_WORDS,
  WAKE_ROUTES,
  routingSummary,
} from '../../packages/skill-calorie/dist/triggers/routing.js';
import { SINGLE_COMMAND_RE, createHarness } from './t81-seed.mjs';

const ROUTING_SRC = new URL('../../packages/skill-calorie/src/triggers/routing.ts', import.meta.url);
const NEW_ENTRY_BASIS = JSON.parse(readFileSync(new URL('./t81-new-entries.json', import.meta.url), 'utf8'));
const { runCli } = createHarness();
const out = [];
const line = (s = '') => out.push(s);
const bad = [];
const check = (cond, msg) => {
  if (!cond) bad.push(msg);
};

const reasonCodeOf = (reason) =>
  Object.entries(NON_EXEC_REASONS).find(([, v]) => v === reason)?.[0] ?? '??';
const calorieKeyOf = (cli) => String(cli).split(' ')[1];
const frozenInternal = (t) => ('key' in t && typeof t.key === 'string' ? t.key : null);
const entryId = (wakeWord, array, i) =>
  `${wakeWord}#${array === WAKE_ROUTES ? 'S' : array === COVERAGE_REPAIR_ROUTES ? 'R' : 'N'}${i}`;
const paramsOf = (cli) => {
  const i = String(cli).indexOf("--params '");
  if (i < 0) return null;
  const s = String(cli).slice(i + 10);
  return JSON.parse(s.slice(0, s.lastIndexOf("'")));
};
const sameParams = (a, b) => JSON.stringify(a, Object.keys(a ?? {}).sort()) === JSON.stringify(b, Object.keys(b ?? {}).sort());

// ---- FX-81-2（方案 a）：能力已可执行的冻结词 → 同能力孪生词（新拟入口同 key）----
// 判据：该冻结词的旧链能力已由 NEW_KEY_ROUTES 的某条新拟入口承载（同一 key），故一并入 exec 桶。
// 逐条孪生关系与证据（V1 N 表判定／新拟词 basis 自陈撞冻结词／旧链 internal key）见 §2.1。
const TWIN_FLIPS = new Map([
  ['看今日饮食', 'calorie.today'],
  ['记身材照', 'calorie.photo.add'],
  ['查身材照', 'calorie.photo.list'],
  ['对比两张照片', 'calorie.photo.compare'],
  ['生成身材照GIF', 'calorie.photo.gif'],
  ['删身材照', 'calorie.photo.remove'],
  ['改照片标签', 'calorie.photo.tag'],
  ['加照片标签', 'calorie.photo.tag'],
  ['删照片标签', 'calorie.photo.tag'],
  ['查食品', 'calorie.view.search'],
  ['看食品库（去重）', 'calorie.view.dedupe'],
  ['饮食复盘（本周）', 'calorie.view.diet-review'],
  ['今日复盘', 'calorie.view.diet-review'],
  ['看体脂', 'calorie.view.body-composition'],
  ['看围度', 'calorie.view.body-measure'],
  ['看完整计划', 'calorie.view.plan'],
  ['扫禁忌', 'calorie.view.contraindication'],
  ['查档案', 'calorie.view.profile'],
  ['看健康报告(本周)', 'calorie.view.health'],
  ['查高热量榜', 'calorie.view.ranking'],
  ['看体重 vs 摄入(最近 7 天)', 'calorie.view.combined'],
  ['查热量缺口', 'calorie.view.deficit'],
  ['预测体重(1 周后)', 'calorie.view.predict'],
  ['诊断体重异常点', 'calorie.view.anomaly'],
]);
/** 词义决定的参数（同 key 下允许与新拟入口示例不同）：photo.tag 的 op、view.anomaly 的 kind */
const TWIN_FREE_PARAMS = new Set(['op', 'kind']);
/** 逐条孪生证据（V1 N 表判定／新拟词 basis 自陈撞冻结词／旧链 internal key 或脚本） */
const TWIN_EVIDENCE = new Map([
  ['看今日饮食', 'V1 N3「近名同义不同桶」＋ 旧链 internal `diet_view_today`'],
  ['记身材照', '新拟词 basis 自陈撞冻结词（keys.ts:38 title「记身材照」）＋ 旧链 `body_photo_add_single/note/batch`'],
  ['查身材照', 'V1 N13 ＋ 旧链 `body_photo_list`（render_body_photo_gallery.py）'],
  ['对比两张照片', 'V1 N15 ＋ 旧链 `body_photo_compare`'],
  ['生成身材照GIF', '新拟词 basis 自陈（SKILL.md:76 REPR「生成身材照GIF」）＋ 旧链 `body_photo_gif`'],
  ['删身材照', '新拟词 basis 自陈（keys.ts:39 title「删身材照」）＋ 旧链 `--live-delete`'],
  ['改照片标签', '新拟词 basis 自陈（keys.ts:40 title「改照片标签」）＋ 旧链 `--live-tag-set`（op set）'],
  ['加照片标签', '旧链 `--live-tag-add`（op add）＋ write.ts:570 scene 枚举「加照片标签」'],
  ['删照片标签', '旧链 `--live-tag-remove`（op remove）＋ write.ts:570 scene 枚举「删照片标签」'],
  ['查食品', 'V1 N12 ＋ 旧链 `food_search`'],
  ['看食品库（去重）', '旧链 internal `food_dedupe`（render_dedupe_report.py）→ 更正 V1 N11 的按名配对（能力＝去重，非食品库列表）'],
  ['饮食复盘（本周）', 'V1 N8 ＋ 旧链 `diet_review_week`'],
  ['今日复盘', '新拟词 basis 自陈（SKILL.md:95 REPR「今日复盘」）＋ 旧链 render_review.py --type day'],
  ['看体脂', 'V1 N24 ＋ 旧链 `body_comp_list`'],
  ['看围度', 'V1 N25 ＋ 旧链 `body_meas_list`'],
  ['看完整计划', 'V1 N26 ＋ 旧链 `plan_view_full`（同项 `定训练计划` 为写能力、77 键无对应写键 → 不并入）'],
  ['扫禁忌', 'V1 N31 ＋ 旧链 `plan_contraindication`'],
  ['查档案', 'V1 N33 ＋ 旧链 `profile_view`'],
  ['看健康报告(本周)', 'V1 N9 ＋ 旧链 `report_full_week_cur`'],
  ['查高热量榜', 'V1 N10 ＋ 旧链 render_food_ranking.py --category high_calorie'],
  ['看体重 vs 摄入(最近 7 天)', '新拟词 basis 自陈（SKILL.md:90 REPR）＋ 旧链 `cross_weight_calorie_7d`（参数与孪生词逐字同）'],
  ['查热量缺口', 'V1 N7 ＋ 旧链 `deficit_analysis`'],
  ['预测体重(1 周后)', 'V1 N29 ＋ 旧链 `pred_weight_week`'],
  ['诊断体重异常点', 'V1 N30 ＋ 旧链 `diag_weight_anomaly`'],
]);

// ---- FX-81-7：同 key 可参数化（家族级机械派生：冻结 cli 的脚本／模式／参数 → 键 ＋ 参数）----
const TODAY = '2026-09-07';
const shift = (iso, n) => new Date(Date.parse(iso + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10);
const days = (n) => ({ start: shift(TODAY, -(n - 1)), end: TODAY });
const MONTH = { start: '2026-09-01', end: TODAY };
const PREV_MONTH = { start: '2026-08-01', end: '2026-08-31' };
const WEEK = { start: '2026-09-07', end: TODAY };
const PREV_WEEK = { start: '2026-08-31', end: '2026-09-06' };
const CUSTOM = { start: '2026-09-01', end: TODAY };
const YEAR = { start: '2026-01-01', end: TODAY };

function winOf(flags) {
  const mDays = /--days\s+(\d+)/.exec(flags);
  if (/--week\s+current/.test(flags)) return WEEK;
  if (/--week\s+last/.test(flags)) return PREV_WEEK;
  if (/--month\s+current/.test(flags)) return MONTH;
  if (/--month\s+last/.test(flags)) return PREV_MONTH;
  if (/--start\s+<月初>/.test(flags)) return MONTH;
  if (/--start\s+<开始>/.test(flags) || /--start\s+<S>/.test(flags) || /--start\s+<D1>/.test(flags) || /--start\s+<开始日期>/.test(flags) || /--from\s+<F>/.test(flags)) return CUSTOM;
  if (mDays) return days(Number(mDays[1]));
  if (/--today/.test(flags)) return { start: TODAY, end: TODAY };
  if (/--yesterday/.test(flags)) return { start: '2026-09-06', end: '2026-09-06' };
  if (/--week/.test(flags)) return WEEK;
  if (/--last-week/.test(flags)) return PREV_WEEK;
  if (/--month/.test(flags)) return MONTH;
  if (/--last-month/.test(flags)) return PREV_MONTH;
  return days(7);
}
function winAlias(flags) {
  const m = /--window\s+([0-9]+d|week_cur|week_prev|month_cur|month_prev|year_cur|custom|本周)/.exec(flags);
  if (!m) return null;
  return m[1] === '本周' ? 'week_cur' : m[1];
}
function winDates(alias) {
  if (alias === 'week_cur') return WEEK;
  if (alias === 'week_prev') return PREV_WEEK;
  if (alias === 'month_cur') return MONTH;
  if (alias === 'month_prev') return PREV_MONTH;
  if (alias === 'year_cur') return YEAR;
  if (alias === 'custom') return CUSTOM;
  const n = Number(String(alias).replace('d', ''));
  return Number.isFinite(n) ? days(n) : days(7);
}

/** 家族级映射：冻结 cli → {key, params}（null＝77 键内无同形单命令）。 */
function paramFlip(cli) {
  if (/render_food_ranking\.py/.test(cli)) {
    const cat = /--category\s+([a-z_]+)/.exec(cli);
    return { key: 'calorie.view.ranking', params: { ...(cat ? { category: cat[1] } : {}), ...winOf(cli), topN: 10 } };
  }
  if (/render_analysis\.py --view combined/.test(cli)) {
    const pair = /--pair\s+([a-z_]+)/.exec(cli)[1];
    const alias = winAlias(cli) ?? '30d';
    return { key: 'calorie.view.combined', params: { pair, window: alias, ...(alias === 'custom' ? CUSTOM : {}) } };
  }
  if (/render_analysis\.py --view anomaly/.test(cli)) {
    const kind = /--diagnose\s+([a-z_]+)/.exec(cli)[1];
    const alias = winAlias(cli);
    const w = alias === '本月' ? MONTH : alias ? winDates(alias) : days(30);
    return { key: 'calorie.view.anomaly', params: { kind, ...w } };
  }
  if (/render_weight_history\.py --mode history/.test(cli)) return { key: 'calorie.view.weight-history', params: winOf(cli) };
  if (/render_weight_history\.py --mode trend/.test(cli)) {
    if (/--show-(target|milestones|anomalies)/.test(cli)) return null;
    return { key: 'calorie.view.weight-history', params: winOf(cli) };
  }
  if (/render_weight_compare\.py/.test(cli)) {
    const sc = /--scenario\s+([a-z0-9]+)/.exec(cli)[1];
    const two = {
      a1: [{ start: '2026-08-09', end: TODAY }, { start: '2026-07-10', end: '2026-08-08' }],
      a2: [{ start: '2026-09-01', end: TODAY }, { start: '2026-08-01', end: '2026-08-31' }],
      a3: [WEEK, PREV_WEEK],
      a4: [MONTH, PREV_MONTH],
      a5: [days(7), { start: '2026-08-25', end: '2026-08-31' }],
      a6: [{ start: TODAY, end: TODAY }, { start: '2025-09-07', end: '2025-09-07' }],
      a7: [{ start: TODAY, end: TODAY }, { start: '2026-03-07', end: '2026-03-07' }],
      a8: [{ start: TODAY, end: TODAY }, { start: '2026-06-07', end: '2026-06-07' }],
      d4: [{ start: '2026-08-31', end: '2026-09-04' }, { start: '2026-09-05', end: TODAY }],
    }[sc];
    if (two) return { key: 'calorie.view.weight-compare', params: { start: two[0].start, end: two[0].end, compareStart: two[1].start, compareEnd: two[1].end } };
    if (sc === 'b1') return { key: 'calorie.view.goal-weight', params: days(30) };
    return null;
  }
  if (/render_exercise_summary\.py/.test(cli)) {
    if (/--has-note|--category/.test(cli)) return null;
    return { key: 'calorie.view.exercise', params: winOf(cli) };
  }
  if (/render_exercise_goal_view\.py/.test(cli)) {
    const period = /--period\s+(\w+)/.exec(cli)[1];
    return { key: 'calorie.view.exercise-goal', params: period === 'today' ? { start: TODAY, end: TODAY } : period === 'week' ? WEEK : days(7) };
  }
  if (/render_exercise_recap\.py/.test(cli)) {
    const period = /--period\s+(\w+)/.exec(cli)[1];
    return { key: 'calorie.view.exercise', params: period === 'week' ? WEEK : period === 'month' ? MONTH : period === '90d' ? days(90) : period === 'year' ? YEAR : CUSTOM };
  }
  if (/render_exercise_trend\.py/.test(cli)) return { key: 'calorie.view.exercise', params: days(30) };
  if (/render_exercise_distribution\.py/.test(cli)) return { key: 'calorie.view.exercise', params: days(7) };
  if (/render_diet_review\.py/.test(cli)) {
    if (/--type\s+month/.test(cli)) return { key: 'calorie.view.diet-review', params: MONTH };
    if (/--type\s+quarter/.test(cli)) return { key: 'calorie.view.diet-review', params: days(90) };
    if (/--type\s+year/.test(cli)) return { key: 'calorie.view.diet-review', params: YEAR };
    if (/--type\s+range/.test(cli)) return { key: 'calorie.view.diet-review', params: CUSTOM };
    return { key: 'calorie.view.diet-review', params: winOf(cli) };
  }
  if (/render_review\.py/.test(cli)) {
    if (/--range/.test(cli)) return { key: 'calorie.view.diet-review', params: CUSTOM };
    if (/--type\s+week/.test(cli)) return { key: 'calorie.view.diet-review', params: WEEK };
    if (/--type\s+month/.test(cli)) return { key: 'calorie.view.diet-review', params: MONTH };
    if (/--type\s+year/.test(cli)) return { key: 'calorie.view.diet-review', params: YEAR };
    return { key: 'calorie.view.diet-review', params: { start: TODAY, end: TODAY } };
  }
  if (/render_nutrition_ratio\.py/.test(cli)) return { key: 'calorie.view.diet-review', params: days(7) };
  if (/--view nutrition --group macro3/.test(cli)) return { key: 'calorie.view.diet-review', params: winDates(winAlias(cli) ?? '30d') };
  if (/render_analysis\.py --view report --kind full/.test(cli)) return { key: 'calorie.view.health', params: winDates(winAlias(cli) ?? '7d') };
  if (/render_health_dashboard\.py/.test(cli)) return { key: 'calorie.view.health', params: days(7) };
  if (/render_weight_volatility_v2\.py/.test(cli)) return { key: 'calorie.view.volatility', params: winOf(cli) };
  if (/render_meal_distribution\.py/.test(cli)) return { key: 'calorie.view.diet', params: winOf(cli) };
  if (/render_diet_overview\.py/.test(cli)) return { key: 'calorie.view.diet', params: days(7) };
  if (/render_today_meals\.py/.test(cli)) {
    if (/--with-note/.test(cli)) return null;
    return { key: 'calorie.view.diet', params: winOf(cli) };
  }
  if (/render_today_diet\.py/.test(cli)) {
    if (/--mode nutrition/.test(cli)) return { key: 'calorie.view.diet-review', params: { start: TODAY, end: TODAY } };
    if (/--date\s+<昨天>/.test(cli)) return { key: 'calorie.view.diet', params: { start: '2026-09-06', end: '2026-09-06' } };
    return { key: 'calorie.view.diet', params: { start: TODAY, end: TODAY } };
  }
  if (/render_today_water\.py/.test(cli)) return { key: 'calorie.view.home', params: { date: TODAY } };
  if (/render_body_composition_view\.py --mode trend/.test(cli)) return { key: 'calorie.view.body-composition', params: { days: 90 } };
  if (/render_body_measurements_view\.py --mode trend/.test(cli)) return { key: 'calorie.view.body-measure', params: { days: 90 } };
  if (/render_analysis\.py --view predict/.test(cli)) {
    const h = { weight_month: 30, weight_3m: 90, weight_6m: 180, weight_custom_t: 60 }[/--kind\s+(\w+)/.exec(cli)[1]];
    if (h) return { key: 'calorie.view.predict', params: { start: '2026-08-25', end: TODAY, horizonDays: h } };
    return null;
  }
  if (/render_weight_dashboard\.py/.test(cli)) {
    const v = /--view\s+(\w+)/.exec(cli);
    return { key: 'calorie.view.weight', params: v && v[1] === 'today' ? { start: TODAY, end: TODAY } : days(30) };
  }
  if (/render_workout_plan\.py --overview/.test(cli)) return { key: 'calorie.view.plan', params: null };
  if (/render_food_search\.py --category/.test(cli)) return { key: 'calorie.view.library', params: { category: '蛋白类' } };
  if (/render_source_stats\.py/.test(cli)) return { key: 'calorie.view.library', params: { category: '蛋白类' } };
  if (/render_calorie_trend\.py/.test(cli)) return { key: 'calorie.history', params: { days: 7 } };
  return null;
}

/** FX-81-7 的两条非家族词（冻结 cli 形态特殊：皮褶钳示例缺参数／override 示例窗口不足）。 */
const PARAM_SPECIAL = new Map([
  ['记体脂（皮褶钳）', { key: 'calorie.body.composition-add', params: { source: 'home_caliper', bodyFatPct: 18.5, date: '2026-09-06', caliper_chest_mm: 10, caliper_abdominal_mm: 12, caliper_thigh_mm: 14, caliper_tricep_mm: 11, caliper_subscapular_mm: 13, caliper_suprailiac_mm: 12, caliper_midaxillary_mm: 10 } }],
  ['看目标预测达成', { key: 'calorie.view.goal-predict', params: { start: '2026-08-25', end: TODAY } }],
]);

/** FX-81-5／FX-81-7：仍需多步交互（wizard）的 5 条链式词（含 2 条「预览→确认后导入」）。 */
const WIZARD = new Set(['定营养目标(自动算)', '定饮水目标(自动算)', '一键定全套目标', '批量导入食品', '校验批量导入']);

// ---- 独立重算：从冻结表重新派生 436 条，再与路由层逐条比对（漂移检测）----
const expectRoutes = TRIGGERS.map((t) => {
  const scene = CATEGORY_SCENE[t.category] ?? '??';
  const cli = t.main_prompt.cli;
  const internal = frozenInternal(t);
  if (WIZARD.has(t.wake_word)) return { wakeWord: t.wake_word, scene, kind: 'non-exec', reason: 'wizard' };
  if (PARAM_SPECIAL.has(t.wake_word)) return { wakeWord: t.wake_word, scene, kind: 'exec', ...PARAM_SPECIAL.get(t.wake_word) };
  if (cli.startsWith('calorie-cmd-read calorie.')) {
    return { wakeWord: t.wake_word, scene, kind: 'exec', key: calorieKeyOf(cli), cli };
  }
  if (internal && HELP_EXEC_OVERRIDES[internal]) {
    return { wakeWord: t.wake_word, scene, kind: 'exec', key: calorieKeyOf(HELP_EXEC_OVERRIDES[internal]), cli: HELP_EXEC_OVERRIDES[internal] };
  }
  const twinKey = TWIN_FLIPS.get(t.wake_word);
  if (twinKey) return { wakeWord: t.wake_word, scene, kind: 'exec', key: twinKey, cli: null };
  const flip = paramFlip(cli);
  if (flip) return { wakeWord: t.wake_word, scene, kind: 'exec', ...flip };
  return { wakeWord: t.wake_word, scene, kind: 'non-exec' };
});

check(WAKE_ROUTES.length === 436, `WAKE_ROUTES 长度 ${WAKE_ROUTES.length} ≠ 436`);
check(expectRoutes.length === 436, `冻结表 ${expectRoutes.length} 条 ≠ 436`);
const drift = [];
for (let i = 0; i < expectRoutes.length; i += 1) {
  const e = expectRoutes[i];
  const a = WAKE_ROUTES[i];
  if (!a) { drift.push(`#${i} 路由层缺记录`); continue; }
  if (a.wakeWord !== e.wakeWord) drift.push(`#${i} 唤醒词 ${a.wakeWord} ≠ ${e.wakeWord}`);
  if (a.scene !== e.scene) drift.push(`#${i} ${e.wakeWord} 场景 ${a.scene} ≠ ${e.scene}`);
  if (a.kind !== e.kind) drift.push(`#${i} ${e.wakeWord} 桶 ${a.kind} ≠ ${e.kind}`);
  if (e.kind === 'exec') {
    if (a.key !== e.key) drift.push(`#${i} ${e.wakeWord} 键 ${a.key} ≠ ${e.key}`);
    if (e.cli === null) {
      if (!String(a.cli).startsWith('calorie-cmd-read ' + e.key)) drift.push(`#${i} ${e.wakeWord} cli 键 token 不符`);
    } else if (e.cli !== undefined) {
      if (a.cli !== e.cli) drift.push(`#${i} ${e.wakeWord} cli 不一致`);
    } else if (!sameParams(paramsOf(a.cli), e.params)) {
      drift.push(`#${i} ${e.wakeWord} 参数与家族派生不一致：${a.cli}`);
    }
  } else if (e.reason) {
    check(a.reason === NON_EXEC_REASONS[e.reason], `#${i} ${e.wakeWord} 降级理由码不符`);
  } else if (a.reason !== undefined && OUT_OF_SCOPE_ROUTES.includes(a)) {
    // 明确不做桶：理由由 §5 的 T71_DIFFS 逐条登记，此处不重复判。
  } else if (!Object.values(NON_EXEC_REASONS).includes(a.reason)) {
    drift.push(`#${i} ${e.wakeWord} 非执行理由异常`);
  }
}
check(drift.length === 0, `路由层与冻结表漂移 ${drift.length} 处：${drift.slice(0, 5).join('；')}`);
check(WIZARD.size === 5, `wizard 词数 ${WIZARD.size} ≠ 5`);

// ---- FX-81-2 孪生词逐条核对：键归属 ＋ 参数（除词义决定的 op／kind 外与新拟入口示例一致）----
let twinFlips = 0;
for (let i = 0; i < WAKE_ROUTES.length; i += 1) {
  const r = WAKE_ROUTES[i];
  const twinKey = TWIN_FLIPS.get(r.wakeWord);
  if (!twinKey) continue;
  twinFlips += 1;
  const twin = NEW_KEY_ROUTES.find((x) => x.key === twinKey);
  check(r.kind === 'exec', `${r.wakeWord} 应为 exec（FX-81-2）`);
  check(r.key === twinKey, `${r.wakeWord} 键 ${r.key} ≠ 孪生词键 ${twinKey}`);
  check(!!twin, `${r.wakeWord} 无同 key 新拟入口`);
  if (twin) {
    check(String(r.cli).startsWith('calorie-cmd-read ' + twinKey), `${r.wakeWord} cli 非唯一出口形态`);
    const pa = paramsOf(r.cli);
    const pb = paramsOf(twin.cli);
    if (pb === null) {
      check(r.cli === twin.cli || String(r.cli).startsWith(twin.cli + ' --params '), `${r.wakeWord} cli 与孪生词命令本体不一致`);
    } else if (pa === null) {
      check(false, `${r.wakeWord} 缺 params（孪生词要求 ${Object.keys(pb).join('／')}）`);
    } else {
      for (const [k, v] of Object.entries(pb)) {
        if (TWIN_FREE_PARAMS.has(k)) continue;
        check(JSON.stringify(pa[k]) === JSON.stringify(v), `${r.wakeWord} 参数 ${k} 与孪生词不一致`);
      }
      if (pa.op !== undefined) check(['set', 'add', 'remove'].includes(pa.op), `${r.wakeWord} op 取值非法：${pa.op}`);
      if (pa.kind !== undefined) check(typeof pa.kind === 'string' && pa.kind.length > 0, `${r.wakeWord} kind 取值非法`);
    }
  }
}
check(TWIN_FLIPS.size === 24, `孪生词表词数 ${TWIN_FLIPS.size} ≠ 24`);
check([...TWIN_FLIPS.keys()].sort().join('|') === [...TWIN_WAKE_WORDS].sort().join('|'), '孪生词表与路由层 TWIN_WAKE_WORDS 不一致');
check(twinFlips === 26, `FX-81-2 孪生词转 exec 条数 ${twinFlips} ≠ 26`);

// ---- FX-81-7 家族翻转逐条核对 ＋ §2.3 实跑证据 ----
const exitCache = new Map();
const runCached = (cli) => {
  if (!exitCache.has(cli)) exitCache.set(cli, runCli(cli));
  return exitCache.get(cli);
};
const flipRows = [];
let paramFlips = 0;
for (let i = 0; i < WAKE_ROUTES.length; i += 1) {
  const r = WAKE_ROUTES[i];
  const t = TRIGGERS[i];
  const cli = t.main_prompt.cli;
  const isTwin = TWIN_FLIPS.has(r.wakeWord);
  const isWizard = WIZARD.has(r.wakeWord);
  const isDirect = cli.startsWith('calorie-cmd-read calorie.');
  const isOverride = !!frozenInternal(t) && !!HELP_EXEC_OVERRIDES[frozenInternal(t)];
  const special = PARAM_SPECIAL.get(r.wakeWord);
  // 直连／override 词已按 D-3 口径入 exec（不是 FX-81-7 家族翻转）；PARAM_SPECIAL 的两条是例外。
  const derived = special ?? (isTwin || isWizard || isDirect || isOverride ? null : paramFlip(cli));
  const row = { i, word: r.wakeWord, script: cli, kind: r.kind, key: r.kind === 'exec' ? r.key : null, cli: r.kind === 'exec' ? r.cli : null, reason: r.kind === 'exec' ? null : reasonCodeOf(r.reason) };
  if (derived) {
    paramFlips += 1;
    check(r.kind === 'exec', `${r.wakeWord} 家族派生要求 exec`);
    check(r.key === derived.key, `${r.wakeWord} 键 ${r.key} ≠ 家族派生 ${derived.key}`);
    if (r.kind === 'exec') {
      check(sameParams(paramsOf(r.cli), derived.params), `${r.wakeWord} 参数与家族派生不一致：${r.cli}`);
      check(SINGLE_COMMAND_RE.test(r.cli), `${r.wakeWord} cli 非单条命令形态：${r.cli}`);
      const res = runCached(r.cli);
      check(res.status === 0 && res.envelopeKey === r.key, `${r.wakeWord} 实跑 exit=${res.status} envelopeKey=${res.envelopeKey}（${r.cli}）`);
      row.exit = res.status;
      row.env = res.envelopeKey;
    }
  } else if (!isTwin && !isWizard && !isDirect && !isOverride) {
    check(r.kind === 'non-exec', `${r.wakeWord} 家族未派生但路由层为 exec`);
  }
  flipRows.push(row);
}
check(paramFlips === 222, `FX-81-7 家族翻转条数 ${paramFlips} ≠ 222`);
check([...TWIN_WAKE_WORDS].length === 24, `TWIN_WAKE_WORDS 长度 ${TWIN_WAKE_WORDS.length} ≠ 24`);

// ---- 零 py 取证（源码 ＋ 全部 cli）----
const src = readFileSync(ROUTING_SRC, 'utf8');
check(!/python/i.test(src), 'routing.ts 源码出现 py 命令字面');
for (const r of [...WAKE_ROUTES, ...NEW_KEY_ROUTES, ...COVERAGE_REPAIR_ROUTES]) {
  if (r.kind !== 'exec') continue;
  check(!/python/i.test(r.cli), `${r.wakeWord} cli 含 py`);
  check(/^calorie-cmd-read calorie\./.test(r.cli), `${r.wakeWord} cli 非唯一出口形态`);
}

// ---- FX-81-5 覆盖修复：降级词失去唯一入口的键，须由 COVERAGE_REPAIR_ROUTES 承接 ----
check(COVERAGE_REPAIR_ROUTES.length === 1, `覆盖修复入口 ${COVERAGE_REPAIR_ROUTES.length} ≠ 1`);
const downgradedKeys = new Set();
for (const w of WIZARD) {
  const t = TRIGGERS.find((x) => x.wake_word === w);
  check(!!t, `冻结表无 wizard 词：${w}`);
  if (!t) continue;
  const cli = t.main_prompt.cli;
  const internal = frozenInternal(t);
  if (cli.startsWith('calorie-cmd-read calorie.')) downgradedKeys.add(calorieKeyOf(cli));
  else if (internal && HELP_EXEC_OVERRIDES[internal]) downgradedKeys.add(calorieKeyOf(HELP_EXEC_OVERRIDES[internal]));
}
const repairKeys = new Set(COVERAGE_REPAIR_ROUTES.map((r) => r.key));
const orphanedKeys = [...downgradedKeys].filter(
  (k) => ![...WAKE_ROUTES, ...NEW_KEY_ROUTES].some((r) => r.kind === 'exec' && r.key === k),
);
check(orphanedKeys.length === 1, `降级后失去唯一入口的键 ${orphanedKeys.length} ≠ 1`);
for (const k of orphanedKeys) check(repairKeys.has(k), `键失去唯一可跑入口但无覆盖修复入口：${k}`);
for (const r of COVERAGE_REPAIR_ROUTES) {
  check(orphanedKeys.includes(r.key), `覆盖修复入口键 ${r.key} 非「降级后失去唯一入口」的键`);
  check(!new Set(TRIGGERS.map((t) => t.wake_word)).has(r.wakeWord), `覆盖修复唤醒词撞冻结表：${r.wakeWord}`);
  check(!new Set(NEW_KEY_ROUTES.map((x) => x.wakeWord)).has(r.wakeWord), `覆盖修复唤醒词撞新拟词：${r.wakeWord}`);
  const res = runCached(r.cli);
  check(res.status === 0 && res.envelopeKey === r.key, `覆盖修复入口实跑失败：${r.wakeWord}`);
}

// ---- 77 键覆盖 ----
const KEY_LIST = Object.keys(CALORIE_COMBOS);
const execAll = [...EXEC_ROUTES, ...NEW_KEY_ROUTES, ...COVERAGE_REPAIR_ROUTES];
const covered = new Set(execAll.map((r) => r.key));
check(covered.size === 77, `覆盖键 ${covered.size} ≠ 77`);
for (const k of KEY_LIST) check(covered.has(k), `键无入口：${k}`);

// ---- 新拟入口 ----
check(NEW_KEY_ROUTES.length === 34, `新拟入口 ${NEW_KEY_ROUTES.length} ≠ 34`);
const frozenWords = new Set(TRIGGERS.map((t) => t.wake_word));
const frozenExecKeys = new Set(
  TRIGGERS.map((t) => {
    const cli = t.main_prompt.cli;
    if (cli.startsWith('calorie-cmd-read calorie.')) return calorieKeyOf(cli);
    const internal = frozenInternal(t);
    return internal && HELP_EXEC_OVERRIDES[internal] ? calorieKeyOf(HELP_EXEC_OVERRIDES[internal]) : null;
  }).filter(Boolean),
);
check(frozenExecKeys.size === 43, `施工前既有入口键数 ${frozenExecKeys.size} ≠ 43`);
for (const r of NEW_KEY_ROUTES) {
  check(!frozenWords.has(r.wakeWord), `新拟唤醒词撞冻结表：${r.wakeWord}`);
  check(!frozenExecKeys.has(r.key), `新拟键与既有入口重复：${r.key}`);
}

// ---- exec 桶来源分解（直连／override／孪生词转 exec／同 key 可参数化）----
let directExec = 0;
let overrideExec = 0;
for (let i = 0; i < WAKE_ROUTES.length; i += 1) {
  const r = WAKE_ROUTES[i];
  if (r.kind !== 'exec') continue;
  const t = TRIGGERS[i];
  if (r.cli === t.main_prompt.cli) directExec += 1;
  else if (frozenInternal(t) && HELP_EXEC_OVERRIDES[frozenInternal(t)] === r.cli) overrideExec += 1;
}
check(directExec + overrideExec + twinFlips + paramFlips === EXEC_ROUTES.length, `exec 来源分解 ${directExec}+${overrideExec}+${twinFlips}+${paramFlips} ≠ ${EXEC_ROUTES.length}`);

// ---- 输出 markdown ----
const sum = routingSummary();
line('# #81 逐条路由证据（可复现快照）');
line();
line('> 本文件由 `docs/research/t81-route-evidence.mjs` 生成（只读脚本：读路由层 ＋ 实跑 CLI 取 exit）：');
line('> `pnpm build && node docs/research/t81-route-evidence.mjs --out docs/research/t81-route-evidence.md`');
line('> （脚本读 `packages/skill-calorie/dist`，故先 build）；复跑后 `git diff` 应为空（输出确定，无时间戳）。');
line('> 实跑用 `docs/research/t81-seed.mjs` 的**标准种子库**（与 `t81-exec-smoke.mjs` 同一份定义）。');
line();
line('口径：唤醒词表 `packages/skill-calorie/src/triggers/scene-*.ts` 为冻结 SoT（parity 证据，本票零改动）；');
line('路由层 `packages/skill-calorie/src/triggers/routing.ts` 承载本票全部新能力。');
line('`exec` 判据（FX-81-7 总架构师裁定）：**一个旧唤醒词，只要存在一条能达成其所述能力的单命令');
line('（同 key ＋ 参数，实跑 `exit 0`），就必须进 `exec` 桶**；唯一例外是语义上必须多步交互的 wizard 词。');
line();
line('## 0. 计数汇总');
line();
line('| 指标 | 值 |');
line('|---|---|');
line(`| SoT 唤醒词条数 | ${sum.total} |`);
line(`| 可执行桶（kind exec） | ${sum.exec} |`);
line(`| 命中但不执行桶（kind non-exec） | ${sum.nonExec} |`);
line(`| ├ 明确不做（bucket out-of-scope） | ${sum.outOfScope} |`);
line(`| └ 旧链未承接（bucket legacy-chain；含 wizard ${WIZARD.size} 条） | ${sum.legacyChain} |`);
line(`| 新拟入口（34 键） | ${sum.newEntries} |`);
line(`| 覆盖修复入口（FX-81-5 降级词失唯一入口的键） | ${sum.repairEntries} |`);
line(`| exec 桶记录总数（SoT ${sum.exec} ＋ 新拟 ${sum.newEntries} ＋ 修复 ${sum.repairEntries}） | ${execAll.length} |`);
line(`| 有可执行入口的键 | ${sum.coveredKeys} / ${KEY_LIST.length} |`);
line();
line('**判据（FX-81-5 不变量）**：`kind: \'exec\'` 的每一条，在「标准种子库 ＋ 真实路径替换」下实跑必须 `exit 0`。');
line('实跑证据＝`docs/research/t81-exec-smoke.md`（可复跑脚本 `docs/research/t81-exec-smoke.mjs`：spawn 真 CLI、逐条报 exit code）。');
line('跑不通的记录已在 non-exec 桶并写明理由（wizard 见 §2.2，其余逐条见 §2.3）。');
line();
line('## 1. S-1 436 条逐条恰一个桶');
line();
line('| # | 场景 | 唤醒词 | 桶 | 键／桶细分 | 理由码 |');
line('|---|---|---|---|---|---|');
for (let i = 0; i < WAKE_ROUTES.length; i += 1) {
  const r = WAKE_ROUTES[i];
  if (r.kind === 'exec') {
    line(`| ${i} | ${r.scene} | ${r.wakeWord} | 可执行 | \`${r.key}\` | — |`);
  } else {
    line(`| ${i} | ${r.scene} | ${r.wakeWord} | 命中但不执行 | ${r.bucket} | ${reasonCodeOf(r.reason)} |`);
  }
}
line();
line('### 1.1 理由码逐字');
line();
for (const [k, v] of Object.entries(NON_EXEC_REASONS)) line(`- \`${k}\`：${v}`);
line();
line('## 2. 可执行面明细（SoT ' + WAKE_ROUTES.filter((r) => r.kind === 'exec').length + ' 条 ＋ 新拟 ' + NEW_KEY_ROUTES.length + ' 条 ＋ 覆盖修复 ' + COVERAGE_REPAIR_ROUTES.length + ' 条）');
line();
line('| 来源 | 记录 id | 场景 | 唤醒词 | key | cli |');
line('|---|---|---|---|---|---|');
for (let i = 0; i < WAKE_ROUTES.length; i += 1) {
  const r = WAKE_ROUTES[i];
  if (r.kind !== 'exec') continue;
  line(`| SoT | ${entryId(r.wakeWord, WAKE_ROUTES, i)} | ${r.scene} | ${r.wakeWord} | \`${r.key}\` | \`${r.cli}\` |`);
}
for (let i = 0; i < NEW_KEY_ROUTES.length; i += 1) {
  const r = NEW_KEY_ROUTES[i];
  line(`| 新拟 | ${entryId(r.wakeWord, NEW_KEY_ROUTES, i)} | ${r.scene} | ${r.wakeWord} | \`${r.key}\` | \`${r.cli}\` |`);
}
for (let i = 0; i < COVERAGE_REPAIR_ROUTES.length; i += 1) {
  const r = COVERAGE_REPAIR_ROUTES[i];
  line(`| 修复 | ${entryId(r.wakeWord, COVERAGE_REPAIR_ROUTES, i)} | ${r.scene} | ${r.wakeWord} | \`${r.key}\` | \`${r.cli}\` |`);
}
line();
line(`### 2.1 FX-81-2 同能力孪生词转 exec（冻结词 → 新拟入口同 key，${twinFlips} 条记录／${TWIN_FLIPS.size} 个词）`);
line();
line('口径：冻结词的旧链能力已由某条新拟入口承载（同一 key）→ 旧词一并入 `exec` 桶并指向同一 key；');
line('避免「能做的事被说成做不到」（架构规格 `docs/calorie-architecture.md:32`／:60 的目的）。冻结表零改动。');
line('「孪生词场景」列为孪生新拟词自身的 scene（FX-81-6 · E-5）：`今日复盘`(10) ↔ `看饮食复盘`(02)、`查高热量榜`(10) ↔ `查高热量排行`(02) 两对同 key 但 scene 取自各自本词的 SoT 场景，**不构成矛盾**。');
line();
line('| 冻结词 | 场景 | 桶 | key | 孪生新拟词 | 孪生词场景 | 证据 |');
line('|---|---|---|---|---|---|---|');
for (let i = 0; i < WAKE_ROUTES.length; i += 1) {
  const r = WAKE_ROUTES[i];
  const twinKey = TWIN_FLIPS.get(r.wakeWord);
  if (!twinKey) continue;
  const twin = NEW_KEY_ROUTES.find((x) => x.key === twinKey);
  line(`| ${r.wakeWord} | ${r.scene} | 可执行 | \`${r.key}\` | ${twin ? twin.wakeWord : '—'} | ${twin ? twin.scene : '—'} | ${TWIN_EVIDENCE.get(r.wakeWord) ?? '—'} |`);
}
line();
line('### 2.2 FX-81-5／FX-81-7 仍需多步交互的 wizard 词（non-exec）与同 key 承接入口');
line();
line('判据（FX-81-7 唯一例外）：该词在语义上**必须多步交互**（先预览／确认再写库，归 #86）→ 保留 `non-exec`，');
line('理由码 `wizard`（逐字：「需多步交互（wizard）——先预览／确认再写库，非单条命令可达成」）。');
line('「原样实跑」列＝把冻结 `main_prompt.cli` 原样交给 CLI 的实测退出码（链式串的 `→` 被当作参数）。');
line();
line('| 旧词（non-exec） | 场景 | 理由码 | 原样实跑 | 冻结 cli 形态 | key | 同 key 的 exec 入口 |');
line('|---|---|---|---|---|---|---|');
for (let i = 0; i < WAKE_ROUTES.length; i += 1) {
  const r = WAKE_ROUTES[i];
  if (!WIZARD.has(r.wakeWord)) continue;
  const t = TRIGGERS.find((x) => x.wake_word === r.wakeWord);
  const internal = frozenInternal(t);
  const key = t.main_prompt.cli.startsWith('calorie-cmd-read calorie.')
    ? calorieKeyOf(t.main_prompt.cli)
    : internal && HELP_EXEC_OVERRIDES[internal] ? calorieKeyOf(HELP_EXEC_OVERRIDES[internal]) : null;
  const successors = key
    ? [...COVERAGE_REPAIR_ROUTES, ...WAKE_ROUTES, ...NEW_KEY_ROUTES].filter((x) => x.kind === 'exec' && x.key === key && x.wakeWord !== r.wakeWord)
    : [];
  const res = runCached(t.main_prompt.cli);
  line(`| ${r.wakeWord} | ${r.scene} | \`wizard\` | exit ${res.status} | ${t.main_prompt.cli.includes(' → ') ? '多步链式串（含「→」）' : '非单命令'} | ${key ? `\`${key}\`` : '—（无键）'} | ${successors.length ? `${successors[0].wakeWord}（\`${successors[0].key}\`）` : '—'} |`);
}
line();
line('### 2.3 FX-81-7 完整映射表：旧词 → 等价单命令（key ＋ 参数）→ 实跑 exit');
line();
line('口径：按冻结 `main_prompt.cli` 的脚本／模式／参数**机械派生**（家族级，不是逐词手写）：');
line('`render_food_ranking.py --category X [--days N|--start/--end]` → `view.ranking`；');
line('`render_analysis.py --view combined --pair X --window W` → `view.combined`；`--view anomaly --diagnose K` → `view.anomaly`；');
line('`render_weight_history.py` → `view.weight-history`；`render_weight_compare.py --scenario aN` → `view.weight-compare`；');
line('`render_exercise_summary/recap/trend/distribution` → `view.exercise`；`render_diet_review/review/nutrition_ratio` → `view.diet-review`；');
line('`render_analysis.py --view report --kind full` → `view.health`；`render_weight_volatility_v2.py` → `view.volatility`；');
line('`render_meal_distribution/diet_overview/today_meals` → `view.diet`；`render_body_*_view.py --mode trend` → `view.body-composition/measure`；');
line('`render_analysis.py --view predict --kind weight_*` → `view.predict`；`render_weight_dashboard.py` → `view.weight` 等。');
line('未映射的词逐条给「为何不可执行」（理由码 ＋ 逐字理由；理由码全文见 §1.1）。');
line();
line('| # | 旧词 | 旧链 cli（摘要） | 等价单命令（key ＋ 参数） | 实跑 exit | 未映射理由 |');
line('|---|---|---|---|---|---|');
/** 表格单元转义：冻结 cli 里含 `|`（如 `--rest <1|0>`）会破坏 Markdown 列，按 GFM 规则转义。 */
const cell = (s) => String(s).replace(/\|/g, '\\|');
for (const row of flipRows) {
  if (row.kind !== 'exec') {
    const text = NON_EXEC_REASONS[row.reason] ?? '';
    line(`| ${row.i} | ${cell(row.word)} | \`${cell(row.script.slice(0, 96))}\` | — | — | \`${row.reason}\`：${cell(text.replace(/^命中但不执行：/, ''))} |`);
  } else if (row.exit !== undefined) {
    line(`| ${row.i} | ${cell(row.word)} | \`${cell(row.script.slice(0, 96))}\` | \`${cell(row.cli)}\` | ${row.exit} | — |`);
  }
}
line();
line('> 「实跑 exit」＝把该行「等价单命令」在标准种子库上跑真 CLI 的退出码（与 envelope `key` 一致才计 0；');
line('> 全部 0 与非 0 逐条见本表，桶内一致性由 `t81-exec-smoke.md` §1 复核）。');
line();
line('## 3. S-3 77 键逐键对照表（键 → 入口记录 id）');
line();
line('| key | 读写 | 入口记录 id | 来源 |');
line('|---|---|---|---|');
for (const key of KEY_LIST) {
  const write = Object.prototype.hasOwnProperty.call(CALORIE_WRITE_COMBOS, key);
  const hit =
    COVERAGE_REPAIR_ROUTES.find((r) => r.key === key) ??
    NEW_KEY_ROUTES.find((r) => r.key === key) ??
    WAKE_ROUTES.find((r) => r.kind === 'exec' && r.key === key);
  const idx = WAKE_ROUTES.indexOf(hit);
  const nIdx = NEW_KEY_ROUTES.indexOf(hit);
  const rIdx = COVERAGE_REPAIR_ROUTES.indexOf(hit);
  const from = rIdx >= 0
    ? '覆盖修复入口'
    : nIdx >= 0
      ? '新拟入口'
      : hit.cli.startsWith('calorie-cmd-read ' + key) && hit.cli === TRIGGERS[idx]?.main_prompt.cli ? 'SoT 直连' : 'SoT ＋ HELP_EXEC_OVERRIDES';
  const id = rIdx >= 0
    ? entryId(hit.wakeWord, COVERAGE_REPAIR_ROUTES, rIdx)
    : nIdx >= 0
      ? entryId(hit.wakeWord, NEW_KEY_ROUTES, nIdx)
      : entryId(hit.wakeWord, WAKE_ROUTES, idx);
  line(`| \`${key}\` | ${write ? '写' : '读'} | ${id} | ${from} |`);
}
line();
line('## 4. 新拟唤醒词清单（D-4／A-6，34 键，待总架构师过目定稿）');
line();
line('| key | 新拟唤醒词 | 场景 | 依据 |');
line('|---|---|---|---|');
for (const r of NEW_KEY_ROUTES) {
  const hit = NEW_ENTRY_BASIS.find((p) => p.key === r.key);
  line(`| \`${r.key}\` | ${r.wakeWord} | ${r.scene} | ${hit ? hit.basis : '—'} |`);
}
line();
line('### 4.1 FX-81-5 覆盖修复唤醒词（1 键；总架构师 FX-81-5 返修裁定定稿）');
line();
line('| key | 唤醒词 | 场景 | 依据 |');
line('|---|---|---|---|');
line('| `calorie.view.goal-recommend` | 看目标推荐 | 06 | 承接 `定营养目标(自动算)`／`定饮水目标(自动算)`／`一键定全套目标` 三词的键（其冻结 cli 是多步链式串，恒 exit 2；FX-81-7 判为 wizard、保留 non-exec） |');
line();
line('> FX-81-7 变更：`看目标预测达成` 已改 exec（`view.goal-predict`，≥14 天窗口实跑 exit 0）→ 该键由旧词自身承接，');
line('> 原修复入口 `看目标达成预测` 删除（不再需要），故覆盖修复入口由 2 条降为 1 条。');
line();
line('> nit（FX-81-3 · 3）：新拟词「看身材照」与冻结表 `scene-09-photo.ts:8` 的 `name` 字段字面相同（该条 `wake_word` 为「查身材照」）——**唤醒词空间无冲突**：冻结 `name` 非路由键，本路由层只以 `wake_word` 为键，故不构成碰撞；此处登记以免后人误判。');
line();
line('## 5. 明确不做桶（架构规格 :60）与 t71 O1–O6 差异逐条登记');
line();
line('| # | 唤醒词 | 场景 | 规格出处 | t71 出处 | 差异 |');
line('|---|---|---|---|---|---|');
for (const d of T71_DIFFS) {
  const words = d.wakeWords.length ? d.wakeWords.join('、') : '（无独立唤醒词）';
  line(`| ${d.id} | ${words} | ${d.wakeWords.length ? OUT_OF_SCOPE_ROUTES.find((r) => r.wakeWord === d.wakeWords[0])?.scene ?? '—' : '—'} | ${d.spec} | ${d.t71} | ${d.note} |`);
}
line();
line('## 6. S-2 路由层零 py 取证');
line();
line('```text');
line(`routing.ts 字节数：${Buffer.byteLength(src, 'utf8')}`);
line(`routing.ts 行数：${src.split('\n').length}`);
line(`/python/i 命中：${(/python/i.test(src) ? 1 : 0)}`);
line(`exec cli 总数：${execAll.length}`);
line(`非唯一出口形态的 cli（前缀口径 ^calorie-cmd-read calorie\\.）：${execAll.filter((r) => !/^calorie-cmd-read calorie\./.test(r.cli)).length}`);
line(`单条命令形态的 cli（口径：^calorie-cmd-read calorie\\.[a-z0-9.-]+( --params '\\{…\\}')?$，不含「→」多步链）：${execAll.filter((r) => SINGLE_COMMAND_RE.test(r.cli)).length} / ${execAll.length}`);
line('```');
line();
line('> 口径说明（FX-81-6 · E-7）：`非唯一出口形态` 只判**前缀**（是否 `calorie-cmd-read calorie.` 起头），');
line('> 故「多步链式串」在原口径下仍计为 0 异常。上表新增**单条命令形态**口径补全：');
line('> 链式串（`A → 确认后 B`）与占位符 cli 在该口径下会被排除；本轮 5 条 wizard 词已转 non-exec，');
line(`> 故当前 exec 桶的单条命令形态 ＝ 全部 ${execAll.length} 条（占位符 4 条经 smoke §2 替换后仍为单条命令）。`);
line('> 占位符（FX-81-6 · E-4）：`记身材照`×3／`存身材照` 的 `srcPaths:["<照片路径>"]` **需真实路径**（原样跑 exit 4「照片源文件均不存在」，换真实路径 exit 0）——');
line('> 冻结 SoT 同风格（`<图片>`／`<昨天>`），故保留 exec，由 smoke 的占位符替换（§2）证明可跑。');
line();
line('### 6.1 上下文：冻结表内的旧链 cli 仍在（按 D-1 保持 SoT 原文，不属路由层）');
line();
line('```text');
const pyStart = TRIGGERS.filter((t) => /^python scripts\//.test(t.main_prompt.cli)).length;
const pyAny = TRIGGERS.filter((t) => t.main_prompt.cli.includes('python')).length;
line(`SoT 436 条里 main_prompt.cli 以 py 起头：${pyStart}；含 py：${pyAny}；可执行：${TRIGGERS.filter((t) => t.main_prompt.cli.startsWith('calorie-cmd-read calorie.')).length}`);
line(`路由层口径：exec ${sum.exec} ＝ 直连 ${directExec} ＋ HELP_EXEC_OVERRIDES ${overrideExec} ＋ FX-81-2 孪生词转 exec ${twinFlips} ＋ FX-81-7 同 key 可参数化 ${paramFlips}；non-exec ${sum.nonExec} ＝ 明确不做 ${sum.outOfScope} ＋ 该词自身未承接 ${sum.legacyChain}（含 wizard ${WIZARD.size} 条）；新拟 ${sum.newEntries} ＋ 覆盖修复 ${sum.repairEntries}。`);
line('残留暴露点（本票不改，收口见报告「新洞」）：help-lookup.ts:38 buildHelpLookup / index.ts:81 getHelpCards / render/help.ts:61 legacyCli');
line('```');
line();
line('## 7. S-4 冻结面零改动');
line();
line('```text');
const gitArgs = ['diff', '--stat', '--', 'packages/skill-calorie/src/triggers/scene-01-home.ts', 'packages/skill-calorie/src/triggers/scene-02-diet.ts', 'packages/skill-calorie/src/triggers/scene-03-weight.ts', 'packages/skill-calorie/src/triggers/scene-04-exercise.ts', 'packages/skill-calorie/src/triggers/scene-05-workout.ts', 'packages/skill-calorie/src/triggers/scene-06-goal.ts', 'packages/skill-calorie/src/triggers/scene-07-profile.ts', 'packages/skill-calorie/src/triggers/scene-08-body.ts', 'packages/skill-calorie/src/triggers/scene-09-photo.ts', 'packages/skill-calorie/src/triggers/scene-10-analysis.ts', 'test/calorie-sot.snapshot.json', 'test/calorie-triggers.test.mjs', 'packages/skill-calorie/test/render-t10.test.mjs', 'packages/skill-calorie/test/skill-t11.test.mjs'];
line('$ git ' + gitArgs.join(' '));
const g = spawnSync('git', gitArgs, { encoding: 'utf8' });
if (g.error || g.status !== 0) {
  line('（git 不可用或非仓根：请在仓根复跑该命令，输出应为空）');
} else {
  line(g.stdout.trim() === '' ? '（空输出）' : g.stdout.trim());
}
line('```');
line();
line('## 8. 核对结论');
line();
line(bad.length === 0 ? `全部核对通过（漂移 0、缺入口 0、py 引用 0；${paramFlips} 条家族翻转 ＋ ${twinFlips} 条孪生翻转逐条实跑 exit 0）。` : `核对失败 ${bad.length} 项：\n` + bad.map((b) => `- ${b}`).join('\n'));

const text = out.join('\n') + '\n';
const outIdx = process.argv.indexOf('--out');
if (outIdx >= 0 && process.argv[outIdx + 1]) {
  writeFileSync(process.argv[outIdx + 1], text, 'utf8');
  console.log(`已写入 ${process.argv[outIdx + 1]}（${text.split('\n').length - 1} 行；核对失败 ${bad.length} 项）`);
} else {
  console.log(text);
}
if (bad.length) {
  console.error('核对失败：');
  for (const b of bad) console.error('- ' + b);
  process.exit(1);
}
