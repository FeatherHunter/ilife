/** #81 · 唤醒词路由层（436 条 SoT 逐条恰一次 ＋ 56 键新增入口）。
 *
 * 裁定 D-1（parity 与路由分家）：`src/triggers/scene-*.ts` 唤醒词表原样冻结——它的 `main_prompt.cli` 是
 * 19 字段 sha 的 parity 证据，不是路由；本票全部新能力落在本文件。本文件**只做路由**，不复制唤醒词表的
 * 其它字段（category／desc／main_prompt.text／variants…），唤醒词集合与冻结表的相等性由断言钉死。
 *
 * 裁定 D-2（形态）：每条路由记录以唤醒词为键，436 条逐条恰一次；顺序与 `TRIGGERS` 逐位对齐。
 *   - `kind: 'exec'`     → 可执行桶，带 `key`（必在 100 键内）与 `cli`（唯一出口形态）
 *   - `kind: 'non-exec'` → 命中但不执行桶，带 `bucket` 与 `reason`
 *
 * 裁定 D-3（两个桶）：
 *   - `exec` 判据：`main_prompt.cli` 已可执行，或该词有本文件登记的单命令入口。
 *     （#180 第一步：22 条补偿串已就地落成本文件字面，本文件不再引用 `help-lookup.ts`。
 *     查找层那张 `HELP_EXEC_OVERRIDES` 的删除与 10 个场景数据文件的清理同批——单删它会让
 *     `calorie.help.lookup` 的命中行退回脚本命令原文，属行为变化，见 `t180-impact-list.md` §7。）
 *   - 补判据一（FX-81-2 · 同能力孪生词）：冻结词的能力若已由 `NEW_KEY_ROUTES` 的新拟词承载
 *     （同一 key），则该冻结词一并入 `exec` 桶并指向同一 key——旧词指向的能力已经能执行，就不能
 *     对用户说「做不到」（架构规格 `docs/calorie-architecture.md:32`／:60 的目的）。词表见
 *     `TWIN_WAKE_WORDS`，24 词／26 条记录，逐条孪生关系见 `docs/research/t81-route-evidence.md` §2.1。
 *   - 补判据二（FX-81-7 · 同 key 可参数化）：一个旧唤醒词，只要存在一条能达成其所述能力的**单命令**
 *     （同 key ＋ 参数，实跑 `exit 0`），就必须进 `exec` 桶。逐条映射（旧词 → 键 ＋ 参数 → 实跑 exit）
 *     见 `docs/research/t81-route-evidence.md` §2.3；实跑快照见 `docs/research/t81-exec-smoke.md`。
 *   - `non-exec` 细分 `bucket`：`'out-of-scope'`＝架构规格 `docs/calorie-architecture.md:60`
 *     的明确不做（定时复盘／训记／营养表／落地）；`'legacy-chain'`＝该词所述能力在 99 键内无同形可执行
 *     入口（缺参数／缺形态／缺写键）或语义上必须多步交互（wizard）——逐条理由见 §2.3 右列。
 *   - t71 O1–O6 与规格的口径差异逐条登记在 `T71_DIFFS`（两处出处都给）。
 *
 * 裁定 D-4（56/99 无入口的键）：`NEW_KEY_ROUTES` 补入口，唤醒词新拟（清单见
 * `docs/research/t81-route-evidence.md`），**不写入冻结表**。
 *
 * 零 py 命令引用（含本注释）：本文件不含任何 py 起头的命令，exec `cli` 一律 `calorie-cmd-read calorie.*` 形态；
 * 断言见 `test/calorie-routing-81.test.mjs`。
 */
import type { ExecWakeRoute, NonExecWakeRoute, WakeRoute } from './routeSpec.js';
import { ALL_ROUTES, COVERAGE_REPAIR_ROUTES, NEW_KEY_ROUTES, WAKE_ROUTES } from './routes.generated.js';

/** 记录与类型：`./routeSpec.js` 是**类型唯一处**（本文件只再导出，改名／改形都只动那一处）。 */
export type { ExecWakeRoute, NonExecWakeRoute, NonExecBucket, RouteKey, SceneNo, WakeRoute } from './routeSpec.js';

/** 非执行理由（逐字；每条 non-exec 记录的 reason 取值于此，避免重复文本）。
 *
 * FX-81-7 复核：一个旧唤醒词，只要存在一条能达成其所述能力的单命令（同 key ＋ 参数，实跑 exit 0），
 * 就必须进 exec 桶（逐条映射与实跑见 docs/research/t81-route-evidence.md §2.3 ＋ t81-exec-smoke.md）。
 * 仍留在本桶的词只有两类：① 语义上必须多步交互（wizard，归 #86）；② 99 键内无同形可执行入口
 * （缺参数／缺形态／缺写键，逐条理由见 §2.3 右列）。
 */
export const NON_EXEC_REASONS = {
  wizard:
    '命中但不执行：需多步交互（wizard）——先预览／确认再写库，非单条命令可达成（归 #86）。',
  noNoteFilter:
    '命中但不执行：95 键无「备注」筛选参数（饮食／体重／运动三面的备注均非任何键的筛选维度），单命令不可达成（逐条见 docs/research/t81-route-evidence.md §2.3）。',
  noNutrientDetail:
    '命中但不执行：95 键出现前无钠／糖／纤维趋势／综合报告形态（#113 起 nutrition-analysis 给窗内配比＋微量＋规则建议，看钠糖纤维趋势／综合两词已翻转；view.diet-review 的 macro 只有蛋白／碳水／脂肪配比）。',
  noNutritionAdvice:
    '命中但不执行：95 键无营养建议形态（view.diet-review／view.health 给数据盘，不给建议条目）。',
  compoundCurve:
    '命中但不执行：该词要的是「曲线＋标注」（目标线／里程碑／异常点）复合形态；view.weight-history 只给历史点与变化量，view.anomaly 只给异常点，无单键同形。',
  anchorCompare:
    '命中但不执行：该词需先派生锚点日期（平台期首日／历史最低／历史最高／里程碑日／季节最低／极端月）再对比；view.weight-compare 的四个参数皆为调用方给出的日期段，无锚点派生参数，单命令不可达成。',
  reviewWindowOnly:
    '命中但不执行：view.weight-review 只吃 today／date（复核形态），无期间窗口参数；view.weight-history 为历史点＋变化量，非复盘形态 → 期间复盘无单命令同形。',
  milestoneForwardOnly:
    '命中但不执行：view.weight-review 的 milestone 是「目标达成预测」（estDays／estDate 前向），不是里程碑回溯列表 → 无单命令同形。',
  recordFilterMissing:
    '命中但不执行：95 键无运动记录级列表／筛选参数（view.exercise 是汇总盘：byType／byCategory 为分项统计，不含逐条记录与备注筛选）。',
  categoryOverviewMissing:
    '命中但不执行：view.exercise 无 category 参数（分项统计按运动类型 byType 渲染 TOP4，byCategory 未渲染，力量／有氧非独立形态），无单命令同形。',
  planFilterMissing:
    '命中但不执行：view.plan 无周／日／动作筛选参数（返回全计划），与词的周／日／动作粒度不同 → 无单命令同形。',
  planWriteMissing:
    '命中但不执行：95 键无训练计划写键（旧链 --live-plan-* 系列），本仓执行层不承接计划写入。',
  planReviewMissing:
    '命中但不执行：95 键无计划完成率／未完成训练／动作完成率入口（view.exercise-goal 只对照运动目标，不对照训练计划）→ 无单命令同形。',
  bodyCompareMissing:
    '命中但不执行：view.body-composition／view.body-measure 只有 days／source／limit／metric 等参数，无两期对比参数 → 无单命令同形（渲染层已有 buildBodyCompositionCompare／buildBodyMeasureCompare：render/bodyPlate.ts:49／:112，经 render/index.ts:25 导出，但 CLI 侧未接线）。',
  reportKindMissing:
    '命中但不执行：旧链 report --kind 的 BMI／TDEE／BMR／蛋白／水分／评分／趋势／对比属「报告子形态」，95 键内无同形报告键（view.health 只有 full 健康盘；TDEE／BMR 仅作为 view.goal-recommend 推荐盘的依据字段出现，非报告产物）。',
  multiTrendMissing:
    '命中但不执行：95 键无多指标趋势键（view.combined 只吃两指标配对，旧链 trend --group g1–g11 为 2–4 指标组合）→ 无单命令同形。',
  predictParamMissing:
    '命中但不执行：view.predict 只有 start／end／horizonDays（体重外推），无 target（目标体重）／deficit（每日缺口）／摄入速率参数 → 无单命令同形。',
  sixFactorsMissing:
    '命中但不执行：95 键出现前无「每日 6 因素综合」形态（#113 起 six-factors 给热量/蛋白/饮水/运动/称重/三餐六因素评分，看每日 6 因素综合已翻转；view.home 为当日总览，不含评分）。',
  lintMissing:
    '命中但不执行：95 键出现前无数据质量／lint 形态（#113 起 lint-health 给未匹配库/零负热量/未来日期/疑似重复四项体检，查卡路里数据已翻转；旧链 render_lint_health.py 为数据体检）。',
  oosCron: '明确不做（架构规格 docs/calorie-architecture.md:60：定时复盘）；词只保证命中与文案，执行层不承接（t71 O1 同项）。',
  oosXunji: '明确不做（架构规格 docs/calorie-architecture.md:60：训记）；词只保证命中与文案，执行层不承接（t71 O3 同项）。',
  oosLabel: '明确不做（架构规格 docs/calorie-architecture.md:60：营养表）；词只保证命中与文案，执行层不承接（t71 O4 同项）。',
  oosLanding:
    '明确不做（架构规格 docs/calorie-architecture.md:60：落地）；词只保证命中与文案，执行层不承接（t71 属 M8 需移植项、非 O1–O4，差异见 T71_DIFFS）。',
} as const;

/** FX-81-2 词级孪生词（24 词／26 记录）：能力已由 NEW_KEY_ROUTES 同 key 入口承载。
 * 与 FX-81-7 的「同 key 可参数化」家族区分：本表是**词级**判定，FX-81-7 是按脚本＋参数机械派生的**家族级**判定。 */
export const TWIN_WAKE_WORDS: readonly string[] = [
  '看今日饮食',
  '记身材照',
  '查身材照',
  '对比两张照片',
  '生成身材照GIF',
  '删身材照',
  '改照片标签',
  '加照片标签',
  '删照片标签',
  '查食品',
  '看食品库（去重）',
  '饮食复盘（本周）',
  '今日复盘',
  '看体脂',
  '看围度',
  '看完整计划',
  '扫禁忌',
  '查档案',
  '看健康报告(本周)',
  '查高热量榜',
  '看体重 vs 摄入(最近 7 天)',
  '查热量缺口',
  '预测体重(1 周后)',
  '诊断体重异常点',
];


/** 三个列表与全量路由：**记录数据住生成物** `./routes.generated.js`（`pnpm gen` 产出，按声明的
 * `(list, order)` 排序复原）；本文件只再导出——导出面与改造前逐名一致（`routesFor` 被
 * `src/render/helpCenter.ts:46` 用着）。改动顺序请改声明件的 `order`，不要改生成物。
 */

/** FX-81-5 覆盖修复：3 条链式 wizard 词的键失去**唯一**可跑入口，故补 1 条单命令入口。
 *
 * FX-81-7 复核后：`看目标预测达成` 已改 exec（≥14 天窗口实跑 exit 0）→ 其键
 * `calorie.view.goal-predict` 由该词自身承接，原修复入口 `看目标达成预测` 删除（不再需要）。
 * `定营养目标(自动算)`／`定饮水目标(自动算)`／`一键定全套目标` 三条链式词保留 non-exec（wizard），
 * 其键 `calorie.view.goal-recommend` 由本条承接（D2③「99 键全部有可执行入口」不放宽）。 */

/** D-4：52 个无入口键的新拟入口（唤醒词新拟，不写入冻结表）。逐条映射与实跑见
 * `docs/research/t81-route-evidence.md`。 */
export { ALL_ROUTES, COVERAGE_REPAIR_ROUTES, NEW_KEY_ROUTES, WAKE_ROUTES };

/** 唤醒词 → 路由（记身材照 3 条，故值为数组） */
export const ROUTES_BY_WAKE_WORD: Readonly<Record<string, readonly WakeRoute[]>> = ALL_ROUTES.reduce(
  (acc, r) => {
    (acc[r.wakeWord] ??= [] as WakeRoute[]).push(r);
    return acc;
  },
  {} as Record<string, WakeRoute[]>,
);

/** calorie key → 首条可执行路由（100 键全可达的索引） */
export const EXEC_ROUTE_BY_KEY: Readonly<Record<string, ExecWakeRoute>> = ALL_ROUTES.filter(
  (r): r is ExecWakeRoute => r.kind === 'exec',
).reduce(
  (acc, r) => {
    acc[r.key] ??= r;
    return acc;
  },
  {} as Record<string, ExecWakeRoute>,
);

/** t71 O1–O4 与架构规格 :60 的口径差异（逐条登记，两处出处都给） */
export interface T71Diff {
  readonly id: string;
  readonly wakeWords: readonly string[];
  readonly spec: string;
  readonly t71: string;
  readonly note: string;
}

export const T71_DIFFS: readonly T71Diff[] = [
  {
    id: 'O1',
    wakeWords: ['关闭定时复盘', '开启定时复盘', '查定时复盘'],
    spec: 'docs/calorie-architecture.md:60「定时复盘」',
    t71: 'docs/research/t71-old-baseline-inventory.md:741 O1（定时复盘 / cron）',
    note: '同项：规格与 t71 都判明确不做。',
  },
  {
    id: 'O2',
    wakeWords: [],
    spec: 'docs/calorie-architecture.md:60 未列「飞书发送归档」（:90 Out of Scope 列）',
    t71: 'docs/research/t71-old-baseline-inventory.md:742 O2（飞书发送/归档）',
    note: '差异：436 条无独立唤醒词（飞书只出现在 scene-10-analysis.ts:161 的 desc 与 scene-09-photo.ts:5,6 的渠道文案）→ 无词可入桶，登记为「无词项」。',
  },
  {
    id: 'O3',
    wakeWords: ['同步到训记', '拉训记实绩'],
    spec: 'docs/calorie-architecture.md:60「训记」',
    t71: 'docs/research/t71-old-baseline-inventory.md:743 O3（训记同步）',
    note: '同项。',
  },
  {
    id: 'O4',
    wakeWords: ['拍营养表记一餐', '拍营养表补记一餐'],
    spec: 'docs/calorie-architecture.md:60「营养表」',
    t71: 'docs/research/t71-old-baseline-inventory.md:744 O4（mmx vision 拍营养表）',
    note: '同项。',
  },
  {
    id: 'O5',
    wakeWords: [],
    spec: 'docs/calorie-architecture.md:60 未列「DSH 面板」',
    t71: 'docs/research/t71-old-baseline-inventory.md:745 O5（DSH 面板 · plugin-calorie 取数）',
    note: '无词项：436 条无「面板」独立唤醒词（面板取数归插件包，本票不碰 packages/plugin-*），登记为「无词项」。',
  },
  {
    id: 'O6',
    wakeWords: [],
    spec: 'docs/calorie-architecture.md:60 未列「跨技能联动执行」',
    t71: 'docs/research/t71-old-baseline-inventory.md:746 O6（跨技能联动 · cross_skill_sleep）',
    note: '无词项：436 条无跨技能联动独立唤醒词（外联动 out of scope，本票只动技能包与 CLI 出口），登记为「无词项」。',
  },
  {
    id: 'M8',
    wakeWords: ['落地训练', '落地到本周末', '落地到本月底'],
    spec: 'docs/calorie-architecture.md:60「落地」',
    t71: 'docs/research/t71-old-baseline-inventory.md:203 M8 需移植项（process_progress.html）',
    note: '差异：按规格 :60 入「明确不做」；按 t71 属 M8「需移植」，不在 O1–O4 之内。',
  },
];

/** 明确不做桶成员（按规格 :60 建立；t71 差异见 T71_DIFFS） */
export const OUT_OF_SCOPE_ROUTES: readonly NonExecWakeRoute[] = WAKE_ROUTES.filter(
  (r): r is NonExecWakeRoute => r.kind === 'non-exec' && r.bucket === 'out-of-scope',
);

/** 命中但不执行桶成员 */
export const HIT_NOT_EXEC_ROUTES: readonly NonExecWakeRoute[] = WAKE_ROUTES.filter(
  (r): r is NonExecWakeRoute => r.kind === 'non-exec',
);

/** 可执行桶成员 */
export const EXEC_ROUTES: readonly ExecWakeRoute[] = WAKE_ROUTES.filter(
  (r): r is ExecWakeRoute => r.kind === 'exec',
);

/** 唤醒词 → 路由（查表；无命中返空数组，不返 null 冒充） */
export function routesFor(wakeWord: string): readonly WakeRoute[] {
  return ROUTES_BY_WAKE_WORD[String(wakeWord ?? '').trim()] ?? [];
}

/** calorie key → 可执行 cli（无入口返 null） */
export function execCliForKey(key: string): string | null {
  const hit = EXEC_ROUTE_BY_KEY[key];
  return hit ? hit.cli : null;
}

/** 路由计数（证据表用） */
export function routingSummary(): {
  total: number;
  exec: number;
  nonExec: number;
  outOfScope: number;
  legacyChain: number;
  newEntries: number;
  repairEntries: number;
  coveredKeys: number;
} {
  return {
    total: WAKE_ROUTES.length,
    exec: EXEC_ROUTES.length,
    nonExec: HIT_NOT_EXEC_ROUTES.length,
    outOfScope: OUT_OF_SCOPE_ROUTES.length,
    legacyChain: HIT_NOT_EXEC_ROUTES.length - OUT_OF_SCOPE_ROUTES.length,
    newEntries: NEW_KEY_ROUTES.length,
    repairEntries: COVERAGE_REPAIR_ROUTES.length,
    coveredKeys: Object.keys(EXEC_ROUTE_BY_KEY).length,
  };
}
