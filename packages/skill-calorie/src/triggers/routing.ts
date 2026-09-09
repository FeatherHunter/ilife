/** #81 · 唤醒词路由层（436 条 SoT 逐条恰一次 ＋ 40 键新增入口）。
 *
 * 裁定 D-1（parity 与路由分家）：`src/triggers/scene-*.ts` 唤醒词表原样冻结——它的 `main_prompt.cli` 是
 * 19 字段 sha 的 parity 证据，不是路由；本票全部新能力落在本文件。本文件**只做路由**，不复制唤醒词表的
 * 其它字段（category／desc／main_prompt.text／variants…），唤醒词集合与冻结表的相等性由断言钉死。
 *
 * 裁定 D-2（形态）：每条路由记录以唤醒词为键，436 条逐条恰一次；顺序与 `TRIGGERS` 逐位对齐。
 *   - `kind: 'exec'`     → 可执行桶，带 `key`（必在 83 键内）与 `cli`（唯一出口形态）
 *   - `kind: 'non-exec'` → 命中但不执行桶，带 `bucket` 与 `reason`
 *
 * 裁定 D-3（两个桶）：
 *   - `exec` 判据与 `help-lookup.ts:100-104 execCliFor` 同口径：`main_prompt.cli` 已可执行，
 *     或 `HELP_EXEC_OVERRIDES` 命中（SoT 原文不动，呈现层替换首命中）。
 *   - 补判据一（FX-81-2 · 同能力孪生词）：冻结词的能力若已由 `NEW_KEY_ROUTES` 的新拟词承载
 *     （同一 key），则该冻结词一并入 `exec` 桶并指向同一 key——旧词指向的能力已经能执行，就不能
 *     对用户说「做不到」（架构规格 `docs/calorie-architecture.md:32`／:60 的目的）。词表见
 *     `TWIN_WAKE_WORDS`，24 词／26 条记录，逐条孪生关系见 `docs/research/t81-route-evidence.md` §2.1。
 *   - 补判据二（FX-81-7 · 同 key 可参数化）：一个旧唤醒词，只要存在一条能达成其所述能力的**单命令**
 *     （同 key ＋ 参数，实跑 `exit 0`），就必须进 `exec` 桶。逐条映射（旧词 → 键 ＋ 参数 → 实跑 exit）
 *     见 `docs/research/t81-route-evidence.md` §2.3；实跑快照见 `docs/research/t81-exec-smoke.md`。
 *   - `non-exec` 细分 `bucket`：`'out-of-scope'`＝架构规格 `docs/calorie-architecture.md:60`
 *     的明确不做（定时复盘／训记／营养表／落地）；`'legacy-chain'`＝该词所述能力在 83 键内无同形可执行
 *     入口（缺参数／缺形态／缺写键）或语义上必须多步交互（wizard）——逐条理由见 §2.3 右列。
 *   - t71 O1–O6 与规格的口径差异逐条登记在 `T71_DIFFS`（两处出处都给）。
 *
 * 裁定 D-4（40/83 无入口的键）：`NEW_KEY_ROUTES` 补入口，唤醒词新拟（清单见
 * `docs/research/t81-route-evidence.md`），**不写入冻结表**。
 *
 * 零 py 命令引用（含本注释）：本文件不含任何 py 起头的命令，exec `cli` 一律 `calorie-cmd-read calorie.*` 形态；
 * 断言见 `test/calorie-routing-81.test.mjs`。
 */
import type { CalorieComboKey, CalorieWriteKey } from '../cli/keys.js';
import { HELP_EXEC_OVERRIDES } from './help-lookup.js';

/** 83 键内的路由键（读 48 ＋ 写 35；两 registry 无重叠） */
export type RouteKey = CalorieComboKey | CalorieWriteKey;

/** 场景号（与 SoT 10 场景一致） */
export type SceneNo = '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10';

/** 「命中但不执行」桶内的细分标记（D-3） */
export type NonExecBucket = 'out-of-scope' | 'legacy-chain';

/** 可执行桶记录（D-2） */
export interface ExecWakeRoute {
  readonly wakeWord: string;
  readonly scene: SceneNo;
  readonly kind: 'exec';
  /** 必须在 83 键内（编译期由 RouteKey 约束，运行期由测试断言） */
  readonly key: RouteKey;
  /** 唯一出口形态：calorie-cmd-read calorie.* */
  readonly cli: string;
}

/** 命中但不执行桶记录（D-2） */
export interface NonExecWakeRoute {
  readonly wakeWord: string;
  readonly scene: SceneNo;
  readonly kind: 'non-exec';
  readonly bucket: NonExecBucket;
  /** 逐字理由（取值来自 NON_EXEC_REASONS，单一来源） */
  readonly reason: string;
}

export type WakeRoute = ExecWakeRoute | NonExecWakeRoute;

/** 非执行理由（逐字；每条 non-exec 记录的 reason 取值于此，避免重复文本）。
 *
 * FX-81-7 复核：一个旧唤醒词，只要存在一条能达成其所述能力的单命令（同 key ＋ 参数，实跑 exit 0），
 * 就必须进 exec 桶（逐条映射与实跑见 docs/research/t81-route-evidence.md §2.3 ＋ t81-exec-smoke.md）。
 * 仍留在本桶的词只有两类：① 语义上必须多步交互（wizard，归 #86）；② 83 键内无同形可执行入口
 * （缺参数／缺形态／缺写键，逐条理由见 §2.3 右列）。
 */
export const NON_EXEC_REASONS = {
  wizard:
    '命中但不执行：需多步交互（wizard）——先预览／确认再写库，非单条命令可达成（归 #86）。',
  noNoteFilter:
    '命中但不执行：83 键无「备注」筛选参数（饮食／体重／运动三面的备注均非任何键的筛选维度），单命令不可达成（逐条见 docs/research/t81-route-evidence.md §2.3）。',
  noNutrientDetail:
    '命中但不执行：83 键无钠／糖／纤维等营养素明细维度（view.diet-review 的 macro 只有蛋白／碳水／脂肪配比），单命令不可达成。',
  noNutritionAdvice:
    '命中但不执行：83 键无营养建议形态（view.diet-review／view.health 给数据盘，不给建议条目）。',
  compoundCurve:
    '命中但不执行：该词要的是「曲线＋标注」（目标线／里程碑／异常点）复合形态；view.weight-history 只给历史点与变化量，view.anomaly 只给异常点，无单键同形。',
  anchorCompare:
    '命中但不执行：该词需先派生锚点日期（平台期首日／历史最低／历史最高／里程碑日／季节最低／极端月）再对比；view.weight-compare 的四个参数皆为调用方给出的日期段，无锚点派生参数，单命令不可达成。',
  reviewWindowOnly:
    '命中但不执行：view.weight-review 只吃 today／date（复核形态），无期间窗口参数；view.weight-history 为历史点＋变化量，非复盘形态 → 期间复盘无单命令同形。',
  milestoneForwardOnly:
    '命中但不执行：view.weight-review 的 milestone 是「目标达成预测」（estDays／estDate 前向），不是里程碑回溯列表 → 无单命令同形。',
  recordFilterMissing:
    '命中但不执行：83 键无运动记录级列表／筛选参数（view.exercise 是汇总盘：byType／byCategory 为分项统计，不含逐条记录与备注筛选）。',
  categoryOverviewMissing:
    '命中但不执行：view.exercise 无 category 参数（分项统计按运动类型 byType 渲染 TOP4，byCategory 未渲染，力量／有氧非独立形态），无单命令同形。',
  planFilterMissing:
    '命中但不执行：view.plan 无周／日／动作筛选参数（返回全计划），与词的周／日／动作粒度不同 → 无单命令同形。',
  planWriteMissing:
    '命中但不执行：83 键无训练计划写键（旧链 --live-plan-* 系列），本仓执行层不承接计划写入。',
  planReviewMissing:
    '命中但不执行：83 键无计划完成率／未完成训练／动作完成率入口（view.exercise-goal 只对照运动目标，不对照训练计划）→ 无单命令同形。',
  bodyCompareMissing:
    '命中但不执行：view.body-composition／view.body-measure 只有 days／source／limit／metric 等参数，无两期对比参数 → 无单命令同形（渲染层已有 buildBodyCompositionCompare／buildBodyMeasureCompare：render/bodyPlate.ts:49／:112，经 render/index.ts:25 导出，但 CLI 侧未接线）。',
  reportKindMissing:
    '命中但不执行：旧链 report --kind 的 BMI／TDEE／BMR／蛋白／水分／评分／趋势／对比属「报告子形态」，83 键内无同形报告键（view.health 只有 full 健康盘；TDEE／BMR 仅作为 view.goal-recommend 推荐盘的依据字段出现，非报告产物）。',
  multiTrendMissing:
    '命中但不执行：83 键无多指标趋势键（view.combined 只吃两指标配对，旧链 trend --group g1–g11 为 2–4 指标组合）→ 无单命令同形。',
  predictParamMissing:
    '命中但不执行：view.predict 只有 start／end／horizonDays（体重外推），无 target（目标体重）／deficit（每日缺口）／摄入速率参数 → 无单命令同形。',
  sixFactorsMissing:
    '命中但不执行：83 键无「每日 6 因素综合」形态（view.home 为当日总览，不含旧链 six 的 6 因素评分）。',
  lintMissing:
    '命中但不执行：83 键无数据质量／lint 形态（旧链 render_lint_health.py 为数据体检）。',
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

/** 436 条 SoT 唤醒词路由（顺序与 TRIGGERS 逐位对齐） */
export const WAKE_ROUTES: readonly WakeRoute[] = [
  // ---- 场景 01 ----
  { wakeWord: '看今日主页', scene: '01', kind: 'exec', key: 'calorie.view.home', cli: HELP_EXEC_OVERRIDES.home_today_overview },
  { wakeWord: '看今日饮食概览', scene: '01', kind: 'exec', key: 'calorie.view.diet', cli: HELP_EXEC_OVERRIDES.home_today_diet_overview },
  { wakeWord: '看今日运动概览', scene: '01', kind: 'exec', key: 'calorie.view.exercise', cli: HELP_EXEC_OVERRIDES.home_today_exercise_overview },
  { wakeWord: '看今日体重概览', scene: '01', kind: 'exec', key: 'calorie.view.weight', cli: HELP_EXEC_OVERRIDES.home_today_weight_overview },
  { wakeWord: '看今日目标进度', scene: '01', kind: 'exec', key: 'calorie.view.goal-progress', cli: HELP_EXEC_OVERRIDES.home_today_goal_progress },
  { wakeWord: '看本周主页', scene: '01', kind: 'exec', key: 'calorie.view.home', cli: HELP_EXEC_OVERRIDES.home_week_overview },
  { wakeWord: '看本月主页', scene: '01', kind: 'exec', key: 'calorie.view.home', cli: HELP_EXEC_OVERRIDES.home_month_overview },
  { wakeWord: '看连续记录天数', scene: '01', kind: 'exec', key: 'calorie.view.home', cli: HELP_EXEC_OVERRIDES.home_streak_days },
  { wakeWord: '看今日热量预算', scene: '01', kind: 'exec', key: 'calorie.view.home', cli: HELP_EXEC_OVERRIDES.home_today_budget },
  // ---- 场景 02 ----
  { wakeWord: '记一餐', scene: '02', kind: 'exec', key: 'calorie.diet.add', cli: 'calorie-cmd-read calorie.diet.add --params \'{"foodName":"鸡胸","calories":200,"protein":35}\'' },
  { wakeWord: '记一餐（含备注）', scene: '02', kind: 'exec', key: 'calorie.diet.add', cli: 'calorie-cmd-read calorie.diet.add --params \'{"foodName":"鸡胸","calories":200,"protein":35,"note":"加了辣酱"}\'' },
  { wakeWord: '补记饮食', scene: '02', kind: 'exec', key: 'calorie.diet.add', cli: 'calorie-cmd-read calorie.diet.add --params \'{"foodName":"米饭","calories":500,"protein":10,"date":"2026-09-06","time":"12:30:00"}\'' },
  { wakeWord: '批量补记饮食', scene: '02', kind: 'exec', key: 'calorie.diet.batch', cli: 'calorie-cmd-read calorie.diet.batch --params \'{"items":[{"foodName":"粥","calories":150,"protein":3,"date":"2026-09-06"}]}\'' },
  { wakeWord: '拍营养表记一餐', scene: '02', kind: 'non-exec', bucket: 'out-of-scope', reason: NON_EXEC_REASONS.oosLabel },
  { wakeWord: '拍营养表补记一餐', scene: '02', kind: 'non-exec', bucket: 'out-of-scope', reason: NON_EXEC_REASONS.oosLabel },
  { wakeWord: '记喝水', scene: '02', kind: 'exec', key: 'calorie.water.log', cli: 'calorie-cmd-read calorie.water.log --params \'{"ml":300}\'' },
  { wakeWord: '复制昨日饮食', scene: '02', kind: 'exec', key: 'calorie.diet.copy', cli: 'calorie-cmd-read calorie.diet.copy --params \'{"from":"2026-09-06"}\'' },
  { wakeWord: '改饮食记录', scene: '02', kind: 'exec', key: 'calorie.diet.update', cli: 'calorie-cmd-read calorie.diet.update --params \'{"id":1,"grams":150}\'' },
  { wakeWord: '改某日饮食', scene: '02', kind: 'exec', key: 'calorie.diet.update-by-date', cli: 'calorie-cmd-read calorie.diet.update-by-date --params \'{"date":"2026-09-06","note":"食堂"}\'' },
  { wakeWord: '删饮食记录', scene: '02', kind: 'exec', key: 'calorie.diet.remove', cli: 'calorie-cmd-read calorie.diet.remove --params \'{"id":1}\'' },
  { wakeWord: '删一餐', scene: '02', kind: 'exec', key: 'calorie.diet.remove-by-type', cli: 'calorie-cmd-read calorie.diet.remove-by-type --params \'{"date":"2026-09-06","mealType":"早餐"}\'' },
  { wakeWord: '删某日饮食', scene: '02', kind: 'exec', key: 'calorie.diet.remove-by-date', cli: 'calorie-cmd-read calorie.diet.remove-by-date --params \'{"date":"2026-09-06"}\'' },
  { wakeWord: '批量删饮食', scene: '02', kind: 'exec', key: 'calorie.diet.remove-by-range', cli: 'calorie-cmd-read calorie.diet.remove-by-range --params \'{"start":"2026-09-01","end":"2026-09-02"}\'' },
  { wakeWord: '看今日饮食', scene: '02', kind: 'exec', key: 'calorie.today', cli: 'calorie-cmd-read calorie.today --params \'{"date":"2026-09-07"}\'' },
  { wakeWord: '看昨日饮食', scene: '02', kind: 'exec', key: 'calorie.view.diet', cli: 'calorie-cmd-read calorie.view.diet --params \'{"start":"2026-09-06","end":"2026-09-06"}\'' },
  { wakeWord: '看本周饮食', scene: '02', kind: 'exec', key: 'calorie.view.diet', cli: 'calorie-cmd-read calorie.view.diet --params \'{"start":"2026-09-07","end":"2026-09-07"}\'' },
  { wakeWord: '看上周饮食', scene: '02', kind: 'exec', key: 'calorie.view.diet', cli: 'calorie-cmd-read calorie.view.diet --params \'{"start":"2026-08-31","end":"2026-09-06"}\'' },
  { wakeWord: '看本月饮食', scene: '02', kind: 'exec', key: 'calorie.view.diet', cli: 'calorie-cmd-read calorie.view.diet --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看上月饮食', scene: '02', kind: 'exec', key: 'calorie.view.diet', cli: 'calorie-cmd-read calorie.view.diet --params \'{"start":"2026-08-01","end":"2026-08-31"}\'' },
  { wakeWord: '看最近 7 天饮食', scene: '02', kind: 'exec', key: 'calorie.view.diet', cli: 'calorie-cmd-read calorie.view.diet --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看最近 30 天饮食', scene: '02', kind: 'exec', key: 'calorie.view.diet', cli: 'calorie-cmd-read calorie.view.diet --params \'{"start":"2026-08-09","end":"2026-09-07"}\'' },
  { wakeWord: '看某段时间饮食', scene: '02', kind: 'exec', key: 'calorie.view.diet', cli: 'calorie-cmd-read calorie.view.diet --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看今日喝水', scene: '02', kind: 'exec', key: 'calorie.view.home', cli: 'calorie-cmd-read calorie.view.home --params \'{"date":"2026-09-07"}\'' },
  { wakeWord: '看有备注的饮食记录', scene: '02', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.noNoteFilter },
  { wakeWord: '查食品', scene: '02', kind: 'exec', key: 'calorie.view.search', cli: 'calorie-cmd-read calorie.view.search --params \'{"keyword":"鸡胸"}\'' },
  { wakeWord: '查食品（按分类）', scene: '02', kind: 'exec', key: 'calorie.view.library', cli: 'calorie-cmd-read calorie.view.library --params \'{"category":"蛋白类"}\'' },
  { wakeWord: '存食品', scene: '02', kind: 'exec', key: 'calorie.product.add', cli: 'calorie-cmd-read calorie.product.add --params \'{"productName":"鸡胸肉","calories":165,"protein":31,"fat":3.6,"carbohydrates":0,"sodium":70}\'' },
  { wakeWord: '改食品', scene: '02', kind: 'exec', key: 'calorie.product.update', cli: 'calorie-cmd-read calorie.product.update --params \'{"id":1,"note":"新版"}\'' },
  { wakeWord: '下架食品', scene: '02', kind: 'exec', key: 'calorie.product.deprecate', cli: 'calorie-cmd-read calorie.product.deprecate --params \'{"id":1}\'' },
  { wakeWord: '看食品库（去重）', scene: '02', kind: 'exec', key: 'calorie.view.dedupe', cli: 'calorie-cmd-read calorie.view.dedupe' },
  { wakeWord: '批量导入食品', scene: '02', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.wizard },
  { wakeWord: '校验批量导入', scene: '02', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.wizard },
  { wakeWord: '看食品来源统计', scene: '02', kind: 'exec', key: 'calorie.view.library', cli: 'calorie-cmd-read calorie.view.library --params \'{"category":"蛋白类"}\'' },
  { wakeWord: '看营养结构', scene: '02', kind: 'exec', key: 'calorie.view.diet-review', cli: 'calorie-cmd-read calorie.view.diet-review --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看今日营养', scene: '02', kind: 'exec', key: 'calorie.view.diet-review', cli: 'calorie-cmd-read calorie.view.diet-review --params \'{"start":"2026-09-07","end":"2026-09-07"}\'' },
  { wakeWord: '看饮食总览', scene: '02', kind: 'exec', key: 'calorie.view.diet', cli: 'calorie-cmd-read calorie.view.diet --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看营养素深度', scene: '02', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.noNutrientDetail },
  { wakeWord: '看高热量榜', scene: '02', kind: 'exec', key: 'calorie.view.ranking', cli: 'calorie-cmd-read calorie.view.ranking --params \'{"category":"high_calorie","start":"2026-09-01","end":"2026-09-07","topN":10}\'' },
  { wakeWord: '看低热量榜', scene: '02', kind: 'exec', key: 'calorie.view.ranking', cli: 'calorie-cmd-read calorie.view.ranking --params \'{"category":"low_calorie","start":"2026-09-01","end":"2026-09-07","topN":10}\'' },
  { wakeWord: '看频繁吃榜', scene: '02', kind: 'exec', key: 'calorie.view.ranking', cli: 'calorie-cmd-read calorie.view.ranking --params \'{"category":"frequent","start":"2026-09-01","end":"2026-09-07","topN":10}\'' },
  { wakeWord: '看高碳水榜', scene: '02', kind: 'exec', key: 'calorie.view.ranking', cli: 'calorie-cmd-read calorie.view.ranking --params \'{"category":"high_carb","start":"2026-09-01","end":"2026-09-07","topN":10}\'' },
  { wakeWord: '看高蛋白榜', scene: '02', kind: 'exec', key: 'calorie.view.ranking', cli: 'calorie-cmd-read calorie.view.ranking --params \'{"category":"high_protein","start":"2026-09-01","end":"2026-09-07","topN":10}\'' },
  { wakeWord: '看全部排行榜', scene: '02', kind: 'exec', key: 'calorie.view.ranking', cli: 'calorie-cmd-read calorie.view.ranking --params \'{"start":"2026-09-01","end":"2026-09-07","topN":10}\'' },
  { wakeWord: '看高热量榜（最近 30 天）', scene: '02', kind: 'exec', key: 'calorie.view.ranking', cli: 'calorie-cmd-read calorie.view.ranking --params \'{"category":"high_calorie","start":"2026-08-09","end":"2026-09-07","topN":10}\'' },
  { wakeWord: '看高热量榜（本月）', scene: '02', kind: 'exec', key: 'calorie.view.ranking', cli: 'calorie-cmd-read calorie.view.ranking --params \'{"category":"high_calorie","start":"2026-09-01","end":"2026-09-07","topN":10}\'' },
  { wakeWord: '看高热量榜（自定义）', scene: '02', kind: 'exec', key: 'calorie.view.ranking', cli: 'calorie-cmd-read calorie.view.ranking --params \'{"category":"high_calorie","start":"2026-09-01","end":"2026-09-07","topN":10}\'' },
  { wakeWord: '看低热量榜（最近 30 天）', scene: '02', kind: 'exec', key: 'calorie.view.ranking', cli: 'calorie-cmd-read calorie.view.ranking --params \'{"category":"low_calorie","start":"2026-08-09","end":"2026-09-07","topN":10}\'' },
  { wakeWord: '看低热量榜（本月）', scene: '02', kind: 'exec', key: 'calorie.view.ranking', cli: 'calorie-cmd-read calorie.view.ranking --params \'{"category":"low_calorie","start":"2026-09-01","end":"2026-09-07","topN":10}\'' },
  { wakeWord: '看低热量榜（自定义）', scene: '02', kind: 'exec', key: 'calorie.view.ranking', cli: 'calorie-cmd-read calorie.view.ranking --params \'{"category":"low_calorie","start":"2026-09-01","end":"2026-09-07","topN":10}\'' },
  { wakeWord: '看频繁吃榜（最近 30 天）', scene: '02', kind: 'exec', key: 'calorie.view.ranking', cli: 'calorie-cmd-read calorie.view.ranking --params \'{"category":"frequent","start":"2026-08-09","end":"2026-09-07","topN":10}\'' },
  { wakeWord: '看频繁吃榜（本月）', scene: '02', kind: 'exec', key: 'calorie.view.ranking', cli: 'calorie-cmd-read calorie.view.ranking --params \'{"category":"frequent","start":"2026-09-01","end":"2026-09-07","topN":10}\'' },
  { wakeWord: '看频繁吃榜（自定义）', scene: '02', kind: 'exec', key: 'calorie.view.ranking', cli: 'calorie-cmd-read calorie.view.ranking --params \'{"category":"frequent","start":"2026-09-01","end":"2026-09-07","topN":10}\'' },
  { wakeWord: '看高碳水榜（最近 30 天）', scene: '02', kind: 'exec', key: 'calorie.view.ranking', cli: 'calorie-cmd-read calorie.view.ranking --params \'{"category":"high_carb","start":"2026-08-09","end":"2026-09-07","topN":10}\'' },
  { wakeWord: '看高碳水榜（本月）', scene: '02', kind: 'exec', key: 'calorie.view.ranking', cli: 'calorie-cmd-read calorie.view.ranking --params \'{"category":"high_carb","start":"2026-09-01","end":"2026-09-07","topN":10}\'' },
  { wakeWord: '看高碳水榜（自定义）', scene: '02', kind: 'exec', key: 'calorie.view.ranking', cli: 'calorie-cmd-read calorie.view.ranking --params \'{"category":"high_carb","start":"2026-09-01","end":"2026-09-07","topN":10}\'' },
  { wakeWord: '看高蛋白榜（最近 30 天）', scene: '02', kind: 'exec', key: 'calorie.view.ranking', cli: 'calorie-cmd-read calorie.view.ranking --params \'{"category":"high_protein","start":"2026-08-09","end":"2026-09-07","topN":10}\'' },
  { wakeWord: '看高蛋白榜（本月）', scene: '02', kind: 'exec', key: 'calorie.view.ranking', cli: 'calorie-cmd-read calorie.view.ranking --params \'{"category":"high_protein","start":"2026-09-01","end":"2026-09-07","topN":10}\'' },
  { wakeWord: '看高蛋白榜（自定义）', scene: '02', kind: 'exec', key: 'calorie.view.ranking', cli: 'calorie-cmd-read calorie.view.ranking --params \'{"category":"high_protein","start":"2026-09-01","end":"2026-09-07","topN":10}\'' },
  { wakeWord: '饮食复盘（本周）', scene: '02', kind: 'exec', key: 'calorie.view.diet-review', cli: 'calorie-cmd-read calorie.view.diet-review --params \'{"start":"2026-09-07","end":"2026-09-07"}\'' },
  { wakeWord: '饮食复盘（本月）', scene: '02', kind: 'exec', key: 'calorie.view.diet-review', cli: 'calorie-cmd-read calorie.view.diet-review --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '饮食复盘（最近 90 天）', scene: '02', kind: 'exec', key: 'calorie.view.diet-review', cli: 'calorie-cmd-read calorie.view.diet-review --params \'{"start":"2026-06-10","end":"2026-09-07"}\'' },
  { wakeWord: '饮食复盘（今年）', scene: '02', kind: 'exec', key: 'calorie.view.diet-review', cli: 'calorie-cmd-read calorie.view.diet-review --params \'{"start":"2026-01-01","end":"2026-09-07"}\'' },
  { wakeWord: '饮食复盘（自定义时间）', scene: '02', kind: 'exec', key: 'calorie.view.diet-review', cli: 'calorie-cmd-read calorie.view.diet-review --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看早餐（最近 7 天）', scene: '02', kind: 'exec', key: 'calorie.view.diet', cli: 'calorie-cmd-read calorie.view.diet --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看午餐（最近 7 天）', scene: '02', kind: 'exec', key: 'calorie.view.diet', cli: 'calorie-cmd-read calorie.view.diet --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看晚餐（最近 7 天）', scene: '02', kind: 'exec', key: 'calorie.view.diet', cli: 'calorie-cmd-read calorie.view.diet --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看加餐（最近 7 天）', scene: '02', kind: 'exec', key: 'calorie.view.diet', cli: 'calorie-cmd-read calorie.view.diet --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看全部餐别分布（最近 7 天）', scene: '02', kind: 'exec', key: 'calorie.view.diet', cli: 'calorie-cmd-read calorie.view.diet --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看「有备注」的饮食记录', scene: '02', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.noNoteFilter },
  // ---- 场景 03 ----
  { wakeWord: '记体重', scene: '03', kind: 'exec', key: 'calorie.weight.log', cli: 'calorie-cmd-read calorie.weight.log --params \'{"kg":70.5}\'' },
  { wakeWord: '记体重（含备注）', scene: '03', kind: 'exec', key: 'calorie.weight.log', cli: 'calorie-cmd-read calorie.weight.log --params \'{"kg":70.5,"note":"晨起空腹"}\'' },
  { wakeWord: '补录体重', scene: '03', kind: 'exec', key: 'calorie.weight.log', cli: 'calorie-cmd-read calorie.weight.log --params \'{"kg":70.5,"date":"2026-09-06"}\'' },
  { wakeWord: '批量补录体重', scene: '03', kind: 'exec', key: 'calorie.weight.batch', cli: 'calorie-cmd-read calorie.weight.batch --params \'{"items":[{"date":"2026-09-06","kg":70.5}]}\'' },
  { wakeWord: '看今日体重', scene: '03', kind: 'exec', key: 'calorie.view.weight', cli: 'calorie-cmd-read calorie.view.weight --params \'{"start":"2026-09-07","end":"2026-09-07"}\'' },
  { wakeWord: '改体重记录', scene: '03', kind: 'exec', key: 'calorie.weight.update', cli: 'calorie-cmd-read calorie.weight.update --params \'{"id":1,"kg":70.2}\'' },
  { wakeWord: '改某日体重', scene: '03', kind: 'exec', key: 'calorie.weight.update', cli: 'calorie-cmd-read calorie.weight.update --params \'{"date":"2026-09-06","kg":70.2}\'' },
  { wakeWord: '删体重记录', scene: '03', kind: 'exec', key: 'calorie.weight.remove', cli: 'calorie-cmd-read calorie.weight.remove --params \'{"id":1}\'' },
  { wakeWord: '删某日体重', scene: '03', kind: 'exec', key: 'calorie.weight.remove', cli: 'calorie-cmd-read calorie.weight.remove --params \'{"date":"2026-09-06"}\'' },
  { wakeWord: '批量删体重', scene: '03', kind: 'exec', key: 'calorie.weight.remove', cli: 'calorie-cmd-read calorie.weight.remove --params \'{"start":"2026-09-01","end":"2026-09-02"}\'' },
  { wakeWord: '看本周体重', scene: '03', kind: 'exec', key: 'calorie.view.weight-history', cli: 'calorie-cmd-read calorie.view.weight-history --params \'{"start":"2026-09-07","end":"2026-09-07"}\'' },
  { wakeWord: '看上周体重', scene: '03', kind: 'exec', key: 'calorie.view.weight-history', cli: 'calorie-cmd-read calorie.view.weight-history --params \'{"start":"2026-08-31","end":"2026-09-06"}\'' },
  { wakeWord: '看本月体重', scene: '03', kind: 'exec', key: 'calorie.view.weight-history', cli: 'calorie-cmd-read calorie.view.weight-history --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看上月体重', scene: '03', kind: 'exec', key: 'calorie.view.weight-history', cli: 'calorie-cmd-read calorie.view.weight-history --params \'{"start":"2026-08-01","end":"2026-08-31"}\'' },
  { wakeWord: '看最近 7 天体重', scene: '03', kind: 'exec', key: 'calorie.view.weight-history', cli: 'calorie-cmd-read calorie.view.weight-history --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看最近 90 天体重', scene: '03', kind: 'exec', key: 'calorie.view.weight-history', cli: 'calorie-cmd-read calorie.view.weight-history --params \'{"start":"2026-06-10","end":"2026-09-07"}\'' },
  { wakeWord: '看某段时间体重', scene: '03', kind: 'exec', key: 'calorie.view.weight-history', cli: 'calorie-cmd-read calorie.view.weight-history --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看体重曲线', scene: '03', kind: 'exec', key: 'calorie.view.weight-history', cli: 'calorie-cmd-read calorie.view.weight-history --params \'{"start":"2026-08-09","end":"2026-09-07"}\'' },
  { wakeWord: '看体重曲线（带目标）', scene: '03', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.compoundCurve },
  { wakeWord: '看体重曲线（带里程碑）', scene: '03', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.compoundCurve },
  { wakeWord: '看体重曲线（带异常点）', scene: '03', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.compoundCurve },
  { wakeWord: '看本月体重曲线', scene: '03', kind: 'exec', key: 'calorie.view.weight-history', cli: 'calorie-cmd-read calorie.view.weight-history --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看上月体重曲线', scene: '03', kind: 'exec', key: 'calorie.view.weight-history', cli: 'calorie-cmd-read calorie.view.weight-history --params \'{"start":"2026-08-01","end":"2026-08-31"}\'' },
  { wakeWord: '看最近 90 天体重曲线', scene: '03', kind: 'exec', key: 'calorie.view.weight-history', cli: 'calorie-cmd-read calorie.view.weight-history --params \'{"start":"2026-06-10","end":"2026-09-07"}\'' },
  { wakeWord: '看最近 180 天体重曲线', scene: '03', kind: 'exec', key: 'calorie.view.weight-history', cli: 'calorie-cmd-read calorie.view.weight-history --params \'{"start":"2026-03-12","end":"2026-09-07"}\'' },
  { wakeWord: '看最近 365 天体重曲线', scene: '03', kind: 'exec', key: 'calorie.view.weight-history', cli: 'calorie-cmd-read calorie.view.weight-history --params \'{"start":"2025-09-08","end":"2026-09-07"}\'' },
  { wakeWord: '看某段时间体重曲线', scene: '03', kind: 'exec', key: 'calorie.view.weight-history', cli: 'calorie-cmd-read calorie.view.weight-history --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看体重稳不稳（增强版）', scene: '03', kind: 'exec', key: 'calorie.view.volatility', cli: 'calorie-cmd-read calorie.view.volatility --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看本月波动', scene: '03', kind: 'exec', key: 'calorie.view.volatility', cli: 'calorie-cmd-read calorie.view.volatility --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看最近 90 天波动', scene: '03', kind: 'exec', key: 'calorie.view.volatility', cli: 'calorie-cmd-read calorie.view.volatility --params \'{"start":"2026-06-10","end":"2026-09-07"}\'' },
  { wakeWord: '看最近 180 天波动', scene: '03', kind: 'exec', key: 'calorie.view.volatility', cli: 'calorie-cmd-read calorie.view.volatility --params \'{"start":"2026-03-12","end":"2026-09-07"}\'' },
  { wakeWord: '看波动异常点', scene: '03', kind: 'exec', key: 'calorie.view.volatility', cli: 'calorie-cmd-read calorie.view.volatility --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看「有备注」的体重记录', scene: '03', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.noNoteFilter },
  { wakeWord: '对比体重：最近 30 天 vs 之前 30 天', scene: '03', kind: 'exec', key: 'calorie.view.weight-compare', cli: 'calorie-cmd-read calorie.view.weight-compare --params \'{"start":"2026-08-09","end":"2026-09-07","compareStart":"2026-07-10","compareEnd":"2026-08-08"}\'' },
  { wakeWord: '对比体重：自定义两段时间', scene: '03', kind: 'exec', key: 'calorie.view.weight-compare', cli: 'calorie-cmd-read calorie.view.weight-compare --params \'{"start":"2026-09-01","end":"2026-09-07","compareStart":"2026-08-01","compareEnd":"2026-08-31"}\'' },
  { wakeWord: '对比体重：本周 vs 上周', scene: '03', kind: 'exec', key: 'calorie.view.weight-compare', cli: 'calorie-cmd-read calorie.view.weight-compare --params \'{"start":"2026-09-07","end":"2026-09-07","compareStart":"2026-08-31","compareEnd":"2026-09-06"}\'' },
  { wakeWord: '对比体重：本月 vs 上月', scene: '03', kind: 'exec', key: 'calorie.view.weight-compare', cli: 'calorie-cmd-read calorie.view.weight-compare --params \'{"start":"2026-09-01","end":"2026-09-07","compareStart":"2026-08-01","compareEnd":"2026-08-31"}\'' },
  { wakeWord: '对比体重：近 N 天 vs 上一个 N 天', scene: '03', kind: 'exec', key: 'calorie.view.weight-compare', cli: 'calorie-cmd-read calorie.view.weight-compare --params \'{"start":"2026-09-01","end":"2026-09-07","compareStart":"2026-08-25","compareEnd":"2026-08-31"}\'' },
  { wakeWord: '对比体重：今天 vs 一年前今天', scene: '03', kind: 'exec', key: 'calorie.view.weight-compare', cli: 'calorie-cmd-read calorie.view.weight-compare --params \'{"start":"2026-09-07","end":"2026-09-07","compareStart":"2025-09-07","compareEnd":"2025-09-07"}\'' },
  { wakeWord: '对比体重：今天 vs 半年前今天', scene: '03', kind: 'exec', key: 'calorie.view.weight-compare', cli: 'calorie-cmd-read calorie.view.weight-compare --params \'{"start":"2026-09-07","end":"2026-09-07","compareStart":"2026-03-07","compareEnd":"2026-03-07"}\'' },
  { wakeWord: '对比体重：今天 vs 三月前今天', scene: '03', kind: 'exec', key: 'calorie.view.weight-compare', cli: 'calorie-cmd-read calorie.view.weight-compare --params \'{"start":"2026-09-07","end":"2026-09-07","compareStart":"2026-06-07","compareEnd":"2026-06-07"}\'' },
  { wakeWord: '对比体重：当前 vs 目标体重', scene: '03', kind: 'exec', key: 'calorie.view.goal-weight', cli: 'calorie-cmd-read calorie.view.goal-weight --params \'{"start":"2026-08-09","end":"2026-09-07"}\'' },
  { wakeWord: '对比体重：当前 vs 平台期首日', scene: '03', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.anchorCompare },
  { wakeWord: '对比体重：当前 vs 历史最低', scene: '03', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.anchorCompare },
  { wakeWord: '对比体重：当前 vs 历史最高', scene: '03', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.anchorCompare },
  { wakeWord: '对比体重：减重 5kg 那天 vs 今天', scene: '03', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.anchorCompare },
  { wakeWord: '对比体重：减重 10kg 那天 vs 今天', scene: '03', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.anchorCompare },
  { wakeWord: '对比体重：当前 vs 入夏最低', scene: '03', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.anchorCompare },
  { wakeWord: '对比体重：当前 vs 入冬最低', scene: '03', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.anchorCompare },
  { wakeWord: '对比体重：运动多 vs 运动少的两个月', scene: '03', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.anchorCompare },
  { wakeWord: '对比体重：工作日 vs 周末', scene: '03', kind: 'exec', key: 'calorie.view.weight-compare', cli: 'calorie-cmd-read calorie.view.weight-compare --params \'{"start":"2026-08-31","end":"2026-09-04","compareStart":"2026-09-05","compareEnd":"2026-09-07"}\'' },
  { wakeWord: '看体重总览', scene: '03', kind: 'exec', key: 'calorie.view.weight', cli: 'calorie-cmd-read calorie.view.weight --params \'{"start":"2026-08-09","end":"2026-09-07"}\'' },
  { wakeWord: '体重复盘（本周）', scene: '03', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.reviewWindowOnly },
  { wakeWord: '体重复盘（本月）', scene: '03', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.reviewWindowOnly },
  { wakeWord: '体重复盘（最近 90 天）', scene: '03', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.reviewWindowOnly },
  { wakeWord: '体重复盘（今年）', scene: '03', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.reviewWindowOnly },
  { wakeWord: '体重复盘（自定义时间）', scene: '03', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.reviewWindowOnly },
  { wakeWord: '看里程碑回溯', scene: '03', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.milestoneForwardOnly },
  // ---- 场景 04 ----
  { wakeWord: '记运动', scene: '04', kind: 'exec', key: 'calorie.exercise.add', cli: 'calorie-cmd-read calorie.exercise.add --params \'{"type":"慢跑","calories":320,"minutes":30}\'' },
  { wakeWord: '记运动（含备注）', scene: '04', kind: 'exec', key: 'calorie.exercise.add', cli: 'calorie-cmd-read calorie.exercise.add --params \'{"type":"慢跑","calories":320,"minutes":30,"note":"夜跑"}\'' },
  { wakeWord: '记力量训练', scene: '04', kind: 'exec', key: 'calorie.exercise.add', cli: 'calorie-cmd-read calorie.exercise.add --params \'{"type":"卧推","calories":150,"category":"力量","loadKg":60,"reps":10}\'' },
  { wakeWord: '记有氧运动', scene: '04', kind: 'exec', key: 'calorie.exercise.add', cli: 'calorie-cmd-read calorie.exercise.add --params \'{"type":"户外跑","calories":300,"minutes":30,"category":"有氧","distance":5}\'' },
  { wakeWord: '记日常活动', scene: '04', kind: 'exec', key: 'calorie.exercise.add', cli: 'calorie-cmd-read calorie.exercise.add --params \'{"type":"步行","calories":80,"minutes":20,"category":"日常","steps":3000}\'' },
  { wakeWord: '补记运动', scene: '04', kind: 'exec', key: 'calorie.exercise.add', cli: 'calorie-cmd-read calorie.exercise.add --params \'{"type":"慢跑","calories":320,"minutes":30,"date":"2026-09-06"}\'' },
  { wakeWord: '批量补记运动', scene: '04', kind: 'exec', key: 'calorie.exercise.add', cli: 'calorie-cmd-read calorie.exercise.add --params \'{"items":[{"type":"慢跑","calories":320,"minutes":30,"date":"2026-09-06"}]}\'' },
  { wakeWord: '复制昨日运动', scene: '04', kind: 'exec', key: 'calorie.exercise.add', cli: 'calorie-cmd-read calorie.exercise.add --params \'{"copyFrom":"yesterday"}\'' },
  { wakeWord: '改运动记录', scene: '04', kind: 'exec', key: 'calorie.exercise.update', cli: 'calorie-cmd-read calorie.exercise.update --params \'{"id":1,"minutes":40}\'' },
  { wakeWord: '改某日运动', scene: '04', kind: 'exec', key: 'calorie.exercise.update', cli: 'calorie-cmd-read calorie.exercise.update --params \'{"date":"2026-09-06","note":"补记"}\'' },
  { wakeWord: '删运动记录', scene: '04', kind: 'exec', key: 'calorie.exercise.remove', cli: 'calorie-cmd-read calorie.exercise.remove --params \'{"id":1}\'' },
  { wakeWord: '删某日运动', scene: '04', kind: 'exec', key: 'calorie.exercise.remove', cli: 'calorie-cmd-read calorie.exercise.remove --params \'{"date":"2026-09-06"}\'' },
  { wakeWord: '批量删运动', scene: '04', kind: 'exec', key: 'calorie.exercise.remove', cli: 'calorie-cmd-read calorie.exercise.remove --params \'{"from":"2026-09-01","to":"2026-09-02"}\'' },
  { wakeWord: '看今日运动', scene: '04', kind: 'exec', key: 'calorie.view.exercise', cli: 'calorie-cmd-read calorie.view.exercise --params \'{"start":"2026-09-07","end":"2026-09-07"}\'' },
  { wakeWord: '看昨日运动', scene: '04', kind: 'exec', key: 'calorie.view.exercise', cli: 'calorie-cmd-read calorie.view.exercise --params \'{"start":"2026-09-06","end":"2026-09-06"}\'' },
  { wakeWord: '看本周运动', scene: '04', kind: 'exec', key: 'calorie.view.exercise', cli: 'calorie-cmd-read calorie.view.exercise --params \'{"start":"2026-09-07","end":"2026-09-07"}\'' },
  { wakeWord: '看上周运动', scene: '04', kind: 'exec', key: 'calorie.view.exercise', cli: 'calorie-cmd-read calorie.view.exercise --params \'{"start":"2026-08-31","end":"2026-09-06"}\'' },
  { wakeWord: '看本月运动', scene: '04', kind: 'exec', key: 'calorie.view.exercise', cli: 'calorie-cmd-read calorie.view.exercise --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看上月运动', scene: '04', kind: 'exec', key: 'calorie.view.exercise', cli: 'calorie-cmd-read calorie.view.exercise --params \'{"start":"2026-08-01","end":"2026-08-31"}\'' },
  { wakeWord: '看最近 7 天运动', scene: '04', kind: 'exec', key: 'calorie.view.exercise', cli: 'calorie-cmd-read calorie.view.exercise --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看最近 30 天运动', scene: '04', kind: 'exec', key: 'calorie.view.exercise', cli: 'calorie-cmd-read calorie.view.exercise --params \'{"start":"2026-08-09","end":"2026-09-07"}\'' },
  { wakeWord: '看某段时间运动', scene: '04', kind: 'exec', key: 'calorie.view.exercise', cli: 'calorie-cmd-read calorie.view.exercise --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看今日运动（vs 目标）', scene: '04', kind: 'exec', key: 'calorie.view.exercise-goal', cli: 'calorie-cmd-read calorie.view.exercise-goal --params \'{"start":"2026-09-07","end":"2026-09-07"}\'' },
  { wakeWord: '看本周运动（vs 目标）', scene: '04', kind: 'exec', key: 'calorie.view.exercise-goal', cli: 'calorie-cmd-read calorie.view.exercise-goal --params \'{"start":"2026-09-07","end":"2026-09-07"}\'' },
  { wakeWord: '看运动记录（有备注）', scene: '04', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.noNoteFilter },
  { wakeWord: '看运动记录（按力量筛选）', scene: '04', kind: 'exec', key: 'calorie.view.exercise-strength', cli: 'calorie-cmd-read calorie.view.exercise-strength --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看运动记录（按有氧筛选）', scene: '04', kind: 'exec', key: 'calorie.view.exercise-cardio', cli: 'calorie-cmd-read calorie.view.exercise-cardio --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看最近 60 天运动', scene: '04', kind: 'exec', key: 'calorie.view.exercise', cli: 'calorie-cmd-read calorie.view.exercise --params \'{"start":"2026-07-10","end":"2026-09-07"}\'' },
  { wakeWord: '看最近 180 天运动', scene: '04', kind: 'exec', key: 'calorie.view.exercise', cli: 'calorie-cmd-read calorie.view.exercise --params \'{"start":"2026-03-12","end":"2026-09-07"}\'' },
  { wakeWord: '看最近 365 天运动', scene: '04', kind: 'exec', key: 'calorie.view.exercise', cli: 'calorie-cmd-read calorie.view.exercise --params \'{"start":"2025-09-08","end":"2026-09-07"}\'' },
  { wakeWord: '看运动类型分布', scene: '04', kind: 'exec', key: 'calorie.view.exercise', cli: 'calorie-cmd-read calorie.view.exercise --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看力量训练总览', scene: '04', kind: 'exec', key: 'calorie.view.exercise-strength', cli: 'calorie-cmd-read calorie.view.exercise-strength --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看有氧训练总览', scene: '04', kind: 'exec', key: 'calorie.view.exercise-cardio', cli: 'calorie-cmd-read calorie.view.exercise-cardio --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看运动趋势', scene: '04', kind: 'exec', key: 'calorie.view.exercise', cli: 'calorie-cmd-read calorie.view.exercise --params \'{"start":"2026-08-09","end":"2026-09-07"}\'' },
  { wakeWord: '运动复盘（本周）', scene: '04', kind: 'exec', key: 'calorie.view.exercise', cli: 'calorie-cmd-read calorie.view.exercise --params \'{"start":"2026-09-07","end":"2026-09-07"}\'' },
  { wakeWord: '运动复盘（本月）', scene: '04', kind: 'exec', key: 'calorie.view.exercise', cli: 'calorie-cmd-read calorie.view.exercise --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '运动复盘（最近 90 天）', scene: '04', kind: 'exec', key: 'calorie.view.exercise', cli: 'calorie-cmd-read calorie.view.exercise --params \'{"start":"2026-06-10","end":"2026-09-07"}\'' },
  { wakeWord: '运动复盘（今年）', scene: '04', kind: 'exec', key: 'calorie.view.exercise', cli: 'calorie-cmd-read calorie.view.exercise --params \'{"start":"2026-01-01","end":"2026-09-07"}\'' },
  { wakeWord: '运动复盘（自定义时间）', scene: '04', kind: 'exec', key: 'calorie.view.exercise', cli: 'calorie-cmd-read calorie.view.exercise --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  // ---- 场景 05 ----
  { wakeWord: '看本周计划', scene: '05', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.planFilterMissing },
  { wakeWord: '看下周计划', scene: '05', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.planFilterMissing },
  { wakeWord: '看上周计划', scene: '05', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.planFilterMissing },
  { wakeWord: '看指定周计划', scene: '05', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.planFilterMissing },
  { wakeWord: '看今天练什么', scene: '05', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.planFilterMissing },
  { wakeWord: '看某动作安排', scene: '05', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.planFilterMissing },
  { wakeWord: '看某天练什么', scene: '05', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.planFilterMissing },
  { wakeWord: '看计划概览', scene: '05', kind: 'exec', key: 'calorie.view.plan', cli: 'calorie-cmd-read calorie.view.plan' },
  { wakeWord: '看完整计划', scene: '05', kind: 'exec', key: 'calorie.view.plan', cli: 'calorie-cmd-read calorie.view.plan' },
  { wakeWord: '看计划 vs 实际', scene: '05', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.planFilterMissing },
  { wakeWord: '定训练计划', scene: '05', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.planWriteMissing },
  { wakeWord: '复制训练计划', scene: '05', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.planWriteMissing },
  { wakeWord: '定休息日', scene: '05', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.planWriteMissing },
  { wakeWord: '加训练动作', scene: '05', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.planWriteMissing },
  { wakeWord: '定一周计划', scene: '05', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.planWriteMissing },
  { wakeWord: '改训练计划', scene: '05', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.planWriteMissing },
  { wakeWord: '改某天训练', scene: '05', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.planWriteMissing },
  { wakeWord: '删某天训练', scene: '05', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.planWriteMissing },
  { wakeWord: '改动作', scene: '05', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.planWriteMissing },
  { wakeWord: '撤销训练计划', scene: '05', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.planWriteMissing },
  { wakeWord: '落地训练', scene: '05', kind: 'non-exec', bucket: 'out-of-scope', reason: NON_EXEC_REASONS.oosLanding },
  { wakeWord: '落地到本周末', scene: '05', kind: 'non-exec', bucket: 'out-of-scope', reason: NON_EXEC_REASONS.oosLanding },
  { wakeWord: '落地到本月底', scene: '05', kind: 'non-exec', bucket: 'out-of-scope', reason: NON_EXEC_REASONS.oosLanding },
  { wakeWord: '同步到训记', scene: '05', kind: 'non-exec', bucket: 'out-of-scope', reason: NON_EXEC_REASONS.oosXunji },
  { wakeWord: '拉训记实绩', scene: '05', kind: 'non-exec', bucket: 'out-of-scope', reason: NON_EXEC_REASONS.oosXunji },
  { wakeWord: '计划复盘（本周）', scene: '05', kind: 'exec', key: 'calorie.view.exercise-review', cli: 'calorie-cmd-read calorie.view.exercise-review --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '计划复盘（本月）', scene: '05', kind: 'exec', key: 'calorie.view.exercise-review', cli: 'calorie-cmd-read calorie.view.exercise-review --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '计划复盘（全部）', scene: '05', kind: 'exec', key: 'calorie.view.exercise-review', cli: 'calorie-cmd-read calorie.view.exercise-review --params \'{"start":"2026-08-31","end":"2026-09-07"}\'' },
  { wakeWord: '看计划完成率', scene: '05', kind: 'exec', key: 'calorie.view.exercise-review', cli: 'calorie-cmd-read calorie.view.exercise-review --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看未完成训练', scene: '05', kind: 'exec', key: 'calorie.view.exercise-review', cli: 'calorie-cmd-read calorie.view.exercise-review --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看动作完成率', scene: '05', kind: 'exec', key: 'calorie.view.exercise-review', cli: 'calorie-cmd-read calorie.view.exercise-review --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '扫禁忌', scene: '05', kind: 'exec', key: 'calorie.view.contraindication', cli: 'calorie-cmd-read calorie.view.contraindication' },
  // ---- 场景 06 ----
  { wakeWord: '定营养目标', scene: '06', kind: 'exec', key: 'calorie.goal.set', cli: 'calorie-cmd-read calorie.goal.set --params \'{"calorie":1800,"protein":150,"carbs":200,"fat":50,"water":2000}\'' },
  { wakeWord: '定营养目标(自动算)', scene: '06', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.wizard },
  { wakeWord: '定体重目标', scene: '06', kind: 'exec', key: 'calorie.goal.weight', cli: 'calorie-cmd-read calorie.goal.weight --params \'{"kg":68}\'' },
  { wakeWord: '定体重目标(自动算截止)', scene: '06', kind: 'exec', key: 'calorie.goal.weight', cli: 'calorie-cmd-read calorie.goal.weight --params \'{"kg":68,"deadline":"2026-12-31"}\'' },
  { wakeWord: '定体重目标(含起始日)', scene: '06', kind: 'exec', key: 'calorie.goal.weight', cli: 'calorie-cmd-read calorie.goal.weight --params \'{"kg":68,"deadline":"2026-12-31","startKg":72,"startDate":"2026-09-01"}\'' },
  { wakeWord: '定饮水目标', scene: '06', kind: 'exec', key: 'calorie.goal.water', cli: 'calorie-cmd-read calorie.goal.water --params \'{"water":2000}\'' },
  { wakeWord: '定饮水目标(自动算)', scene: '06', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.wizard },
  { wakeWord: '一键定全套目标', scene: '06', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.wizard },
  { wakeWord: '看今日目标', scene: '06', kind: 'exec', key: 'calorie.view.goal-progress', cli: HELP_EXEC_OVERRIDES.goal_view_today },
  { wakeWord: '看本周目标', scene: '06', kind: 'exec', key: 'calorie.view.goal-progress', cli: HELP_EXEC_OVERRIDES.goal_view_week },
  { wakeWord: '看营养目标进度', scene: '06', kind: 'exec', key: 'calorie.view.goal-progress', cli: HELP_EXEC_OVERRIDES.goal_view_nutrition_progress },
  { wakeWord: '看体重目标进度', scene: '06', kind: 'exec', key: 'calorie.view.goal-weight', cli: HELP_EXEC_OVERRIDES.goal_view_weight_progress },
  { wakeWord: '看饮水目标进度', scene: '06', kind: 'exec', key: 'calorie.view.goal-progress', cli: HELP_EXEC_OVERRIDES.goal_view_water_progress },
  { wakeWord: '看目标对比实际', scene: '06', kind: 'exec', key: 'calorie.view.goal-vs-actual', cli: HELP_EXEC_OVERRIDES.goal_view_vs_actual },
  { wakeWord: '看目标完成度', scene: '06', kind: 'exec', key: 'calorie.view.goal', cli: HELP_EXEC_OVERRIDES.goal_view_completion },
  { wakeWord: '看即将到期的目标', scene: '06', kind: 'exec', key: 'calorie.view.goal-expiring', cli: HELP_EXEC_OVERRIDES.goal_view_expiring },
  { wakeWord: '看目标完成率(按周)', scene: '06', kind: 'exec', key: 'calorie.view.goal-progress', cli: HELP_EXEC_OVERRIDES.goal_view_completion_rate_week },
  { wakeWord: '看目标完成率(按月)', scene: '06', kind: 'exec', key: 'calorie.view.goal-progress', cli: HELP_EXEC_OVERRIDES.goal_view_completion_rate_month },
  { wakeWord: '改营养目标', scene: '06', kind: 'exec', key: 'calorie.goal.set', cli: 'calorie-cmd-read calorie.goal.set --params \'{"calorie":1800,"protein":150,"carbs":200,"fat":50}\'' },
  { wakeWord: '改体重目标', scene: '06', kind: 'exec', key: 'calorie.goal.weight', cli: 'calorie-cmd-read calorie.goal.weight --params \'{"kg":67.5}\'' },
  { wakeWord: '改饮水目标', scene: '06', kind: 'exec', key: 'calorie.goal.water', cli: 'calorie-cmd-read calorie.goal.water --params \'{"water":2200}\'' },
  { wakeWord: '暂停所有目标', scene: '06', kind: 'exec', key: 'calorie.goal.pause', cli: 'calorie-cmd-read calorie.goal.pause' },
  { wakeWord: '重启所有目标', scene: '06', kind: 'exec', key: 'calorie.goal.resume', cli: 'calorie-cmd-read calorie.goal.resume' },
  { wakeWord: '看目标历史完成', scene: '06', kind: 'exec', key: 'calorie.view.goal', cli: HELP_EXEC_OVERRIDES.goal_view_history_complete },
  { wakeWord: '看目标预测达成', scene: '06', kind: 'exec', key: 'calorie.view.goal-predict', cli: 'calorie-cmd-read calorie.view.goal-predict --params \'{"start":"2026-08-25","end":"2026-09-07"}\'' },
  // ---- 场景 07 ----
  { wakeWord: '设置档案', scene: '07', kind: 'exec', key: 'calorie.profile.set', cli: 'calorie-cmd-read calorie.profile.set --params \'{"heightCm":175,"age":30,"gender":"male","activityLevel":"moderate"}\'' },
  { wakeWord: '设活动量', scene: '07', kind: 'exec', key: 'calorie.profile.activity', cli: 'calorie-cmd-read calorie.profile.activity --params \'{"activityLevel":"active"}\'' },
  { wakeWord: '改档案', scene: '07', kind: 'exec', key: 'calorie.profile.update', cli: 'calorie-cmd-read calorie.profile.update --params \'{"field":"heightCm","value":176}\'' },
  { wakeWord: '查档案', scene: '07', kind: 'exec', key: 'calorie.view.profile', cli: 'calorie-cmd-read calorie.view.profile' },
  // ---- 场景 08 ----
  { wakeWord: '记体脂（皮褶钳）', scene: '08', kind: 'exec', key: 'calorie.body.composition-add', cli: 'calorie-cmd-read calorie.body.composition-add --params \'{"source":"home_caliper","bodyFatPct":18.5,"date":"2026-09-06","caliper_chest_mm":10,"caliper_abdominal_mm":12,"caliper_thigh_mm":14,"caliper_tricep_mm":11,"caliper_subscapular_mm":13,"caliper_suprailiac_mm":12,"caliper_midaxillary_mm":10}\'' },
  { wakeWord: '记体脂（外部测量）', scene: '08', kind: 'exec', key: 'calorie.body.composition-add', cli: 'calorie-cmd-read calorie.body.composition-add --params \'{"source":"gym","bodyFatPct":18.5,"date":"2026-09-06"}\'' },
  { wakeWord: '记围度', scene: '08', kind: 'exec', key: 'calorie.body.measure-add', cli: 'calorie-cmd-read calorie.body.measure-add --params \'{"waistCm":85,"hipCm":95}\'' },
  { wakeWord: '补记体脂', scene: '08', kind: 'exec', key: 'calorie.body.composition-add', cli: 'calorie-cmd-read calorie.body.composition-add --params \'{"source":"gym","bodyFatPct":19,"date":"2026-09-01"}\'' },
  { wakeWord: '补记围度', scene: '08', kind: 'exec', key: 'calorie.body.measure-add', cli: 'calorie-cmd-read calorie.body.measure-add --params \'{"waistCm":86,"date":"2026-09-01"}\'' },
  { wakeWord: '看体脂', scene: '08', kind: 'exec', key: 'calorie.view.body-composition', cli: 'calorie-cmd-read calorie.view.body-composition' },
  { wakeWord: '看体脂趋势', scene: '08', kind: 'exec', key: 'calorie.view.body-composition', cli: 'calorie-cmd-read calorie.view.body-composition --params \'{"days":90}\'' },
  { wakeWord: '看围度', scene: '08', kind: 'exec', key: 'calorie.view.body-measure', cli: 'calorie-cmd-read calorie.view.body-measure' },
  { wakeWord: '看围度趋势', scene: '08', kind: 'exec', key: 'calorie.view.body-measure', cli: 'calorie-cmd-read calorie.view.body-measure --params \'{"days":90}\'' },
  { wakeWord: '对比体脂', scene: '08', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.bodyCompareMissing },
  { wakeWord: '对比围度', scene: '08', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.bodyCompareMissing },
  { wakeWord: '删体脂', scene: '08', kind: 'exec', key: 'calorie.body.composition-remove', cli: 'calorie-cmd-read calorie.body.composition-remove --params \'{"id":1}\'' },
  { wakeWord: '删围度', scene: '08', kind: 'exec', key: 'calorie.body.measure-remove', cli: 'calorie-cmd-read calorie.body.measure-remove --params \'{"id":1}\'' },
  // ---- 场景 09 ----
  { wakeWord: '记身材照', scene: '09', kind: 'exec', key: 'calorie.photo.add', cli: 'calorie-cmd-read calorie.photo.add --params \'{"srcPaths":["<照片路径>"],"tag":"正面"}\'' },
  { wakeWord: '记身材照', scene: '09', kind: 'exec', key: 'calorie.photo.add', cli: 'calorie-cmd-read calorie.photo.add --params \'{"srcPaths":["<照片路径>"],"tag":"正面"}\'' },
  { wakeWord: '记身材照', scene: '09', kind: 'exec', key: 'calorie.photo.add', cli: 'calorie-cmd-read calorie.photo.add --params \'{"srcPaths":["<照片路径>"],"tag":"正面"}\'' },
  { wakeWord: '查身材照', scene: '09', kind: 'exec', key: 'calorie.photo.list', cli: 'calorie-cmd-read calorie.photo.list --params \'{"tag":"正面"}\'' },
  { wakeWord: '对比两张照片', scene: '09', kind: 'exec', key: 'calorie.photo.compare', cli: 'calorie-cmd-read calorie.photo.compare --params \'{"id1":1,"id2":2}\'' },
  { wakeWord: '生成身材照GIF', scene: '09', kind: 'exec', key: 'calorie.photo.gif', cli: 'calorie-cmd-read calorie.photo.gif --params \'{"tag":"正面"}\'' },
  { wakeWord: '删身材照', scene: '09', kind: 'exec', key: 'calorie.photo.remove', cli: 'calorie-cmd-read calorie.photo.remove --params \'{"id":1}\'' },
  { wakeWord: '改照片标签', scene: '09', kind: 'exec', key: 'calorie.photo.tag', cli: 'calorie-cmd-read calorie.photo.tag --params \'{"id":1,"op":"set","tag":"晨起"}\'' },
  { wakeWord: '加照片标签', scene: '09', kind: 'exec', key: 'calorie.photo.tag', cli: 'calorie-cmd-read calorie.photo.tag --params \'{"id":1,"op":"add","tag":"晨起"}\'' },
  { wakeWord: '删照片标签', scene: '09', kind: 'exec', key: 'calorie.photo.tag', cli: 'calorie-cmd-read calorie.photo.tag --params \'{"id":1,"op":"remove","tag":"晨起"}\'' },
  // ---- 场景 10 ----
  { wakeWord: '看体重 vs 摄入(最近 7 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_calorie","window":"7d"}\'' },
  { wakeWord: '看体重 vs 摄入(最近 15 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_calorie","window":"15d"}\'' },
  { wakeWord: '看体重 vs 摄入(最近 30 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_calorie","window":"30d"}\'' },
  { wakeWord: '看体重 vs 摄入(最近 60 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_calorie","window":"60d"}\'' },
  { wakeWord: '看体重 vs 摄入(最近 90 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_calorie","window":"90d"}\'' },
  { wakeWord: '看体重 vs 摄入(最近 180 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_calorie","window":"180d"}\'' },
  { wakeWord: '看体重 vs 摄入(最近 365 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_calorie","window":"365d"}\'' },
  { wakeWord: '看体重 vs 摄入(本周)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_calorie","window":"week_cur"}\'' },
  { wakeWord: '看体重 vs 摄入(本月)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_calorie","window":"month_cur"}\'' },
  { wakeWord: '看体重 vs 摄入(自定义)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_calorie","window":"custom","start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看体重 vs 运动(最近 7 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_exercise","window":"7d"}\'' },
  { wakeWord: '看体重 vs 运动(最近 15 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_exercise","window":"15d"}\'' },
  { wakeWord: '看体重 vs 运动(最近 30 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_exercise","window":"30d"}\'' },
  { wakeWord: '看体重 vs 运动(最近 60 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_exercise","window":"60d"}\'' },
  { wakeWord: '看体重 vs 运动(最近 90 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_exercise","window":"90d"}\'' },
  { wakeWord: '看体重 vs 运动(最近 180 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_exercise","window":"180d"}\'' },
  { wakeWord: '看体重 vs 运动(最近 365 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_exercise","window":"365d"}\'' },
  { wakeWord: '看体重 vs 运动(本周)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_exercise","window":"week_cur"}\'' },
  { wakeWord: '看体重 vs 运动(本月)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_exercise","window":"month_cur"}\'' },
  { wakeWord: '看体重 vs 运动(自定义)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_exercise","window":"custom","start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看体重 vs 蛋白(最近 7 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_protein","window":"7d"}\'' },
  { wakeWord: '看体重 vs 蛋白(最近 15 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_protein","window":"15d"}\'' },
  { wakeWord: '看体重 vs 蛋白(最近 30 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_protein","window":"30d"}\'' },
  { wakeWord: '看体重 vs 蛋白(最近 60 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_protein","window":"60d"}\'' },
  { wakeWord: '看体重 vs 蛋白(最近 90 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_protein","window":"90d"}\'' },
  { wakeWord: '看体重 vs 蛋白(最近 180 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_protein","window":"180d"}\'' },
  { wakeWord: '看体重 vs 蛋白(最近 365 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_protein","window":"365d"}\'' },
  { wakeWord: '看体重 vs 蛋白(本周)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_protein","window":"week_cur"}\'' },
  { wakeWord: '看体重 vs 蛋白(本月)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_protein","window":"month_cur"}\'' },
  { wakeWord: '看体重 vs 蛋白(自定义)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_protein","window":"custom","start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看体重 vs 缺口(最近 7 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_deficit","window":"7d"}\'' },
  { wakeWord: '看体重 vs 缺口(最近 15 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_deficit","window":"15d"}\'' },
  { wakeWord: '看体重 vs 缺口(最近 30 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_deficit","window":"30d"}\'' },
  { wakeWord: '看体重 vs 缺口(最近 60 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_deficit","window":"60d"}\'' },
  { wakeWord: '看体重 vs 缺口(最近 90 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_deficit","window":"90d"}\'' },
  { wakeWord: '看体重 vs 缺口(最近 180 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_deficit","window":"180d"}\'' },
  { wakeWord: '看体重 vs 缺口(最近 365 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_deficit","window":"365d"}\'' },
  { wakeWord: '看体重 vs 缺口(本周)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_deficit","window":"week_cur"}\'' },
  { wakeWord: '看体重 vs 缺口(本月)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_deficit","window":"month_cur"}\'' },
  { wakeWord: '看体重 vs 缺口(自定义)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_deficit","window":"custom","start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看摄入 vs 运动(最近 7 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"calorie_exercise","window":"7d"}\'' },
  { wakeWord: '看摄入 vs 运动(最近 30 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"calorie_exercise","window":"30d"}\'' },
  { wakeWord: '看摄入 vs 运动(最近 90 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"calorie_exercise","window":"90d"}\'' },
  { wakeWord: '看摄入 vs 运动(最近 180 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"calorie_exercise","window":"180d"}\'' },
  { wakeWord: '看摄入 vs 运动(最近 365 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"calorie_exercise","window":"365d"}\'' },
  { wakeWord: '看摄入 vs 运动(自定义)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"calorie_exercise","window":"custom","start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看体重 vs 体脂(最近 7 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_bodyfat","window":"7d"}\'' },
  { wakeWord: '看体重 vs 体脂(最近 30 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_bodyfat","window":"30d"}\'' },
  { wakeWord: '看体重 vs 体脂(最近 90 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_bodyfat","window":"90d"}\'' },
  { wakeWord: '看体重 vs 体脂(最近 180 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_bodyfat","window":"180d"}\'' },
  { wakeWord: '看体重 vs 体脂(最近 365 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_bodyfat","window":"365d"}\'' },
  { wakeWord: '看体重 vs 体脂(自定义)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_bodyfat","window":"custom","start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看体重 vs 围度(最近 7 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_waist","window":"7d"}\'' },
  { wakeWord: '看体重 vs 围度(最近 30 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_waist","window":"30d"}\'' },
  { wakeWord: '看体重 vs 围度(最近 90 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_waist","window":"90d"}\'' },
  { wakeWord: '看体重 vs 围度(最近 180 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_waist","window":"180d"}\'' },
  { wakeWord: '看体重 vs 围度(最近 365 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_waist","window":"365d"}\'' },
  { wakeWord: '看体重 vs 围度(自定义)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_waist","window":"custom","start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看饮水 vs 体重(最近 30 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"water_weight","window":"30d"}\'' },
  { wakeWord: '看饮水 vs 体重(自定义)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"water_weight","window":"custom","start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看健康报告(本周)', scene: '10', kind: 'exec', key: 'calorie.view.health', cli: 'calorie-cmd-read calorie.view.health --params \'{"start":"2026-09-07","end":"2026-09-07"}\'' },
  { wakeWord: '看健康报告(上周)', scene: '10', kind: 'exec', key: 'calorie.view.health', cli: 'calorie-cmd-read calorie.view.health --params \'{"start":"2026-08-31","end":"2026-09-06"}\'' },
  { wakeWord: '看健康报告(最近 7 天)', scene: '10', kind: 'exec', key: 'calorie.view.health', cli: 'calorie-cmd-read calorie.view.health --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看健康报告(最近 30 天)', scene: '10', kind: 'exec', key: 'calorie.view.health', cli: 'calorie-cmd-read calorie.view.health --params \'{"start":"2026-08-09","end":"2026-09-07"}\'' },
  { wakeWord: '看健康报告(最近 90 天)', scene: '10', kind: 'exec', key: 'calorie.view.health', cli: 'calorie-cmd-read calorie.view.health --params \'{"start":"2026-06-10","end":"2026-09-07"}\'' },
  { wakeWord: '看健康报告(最近 180 天)', scene: '10', kind: 'exec', key: 'calorie.view.health', cli: 'calorie-cmd-read calorie.view.health --params \'{"start":"2026-03-12","end":"2026-09-07"}\'' },
  { wakeWord: '看健康报告(最近 365 天)', scene: '10', kind: 'exec', key: 'calorie.view.health', cli: 'calorie-cmd-read calorie.view.health --params \'{"start":"2025-09-08","end":"2026-09-07"}\'' },
  { wakeWord: '看健康报告(本月)', scene: '10', kind: 'exec', key: 'calorie.view.health', cli: 'calorie-cmd-read calorie.view.health --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看健康报告(上月)', scene: '10', kind: 'exec', key: 'calorie.view.health', cli: 'calorie-cmd-read calorie.view.health --params \'{"start":"2026-08-01","end":"2026-08-31"}\'' },
  { wakeWord: '看健康报告(今年)', scene: '10', kind: 'exec', key: 'calorie.view.health', cli: 'calorie-cmd-read calorie.view.health --params \'{"start":"2026-01-01","end":"2026-09-07"}\'' },
  { wakeWord: '看健康报告(自定义)', scene: '10', kind: 'exec', key: 'calorie.view.health', cli: 'calorie-cmd-read calorie.view.health --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看BMI报告', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.reportKindMissing },
  { wakeWord: '看TDEE报告', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.reportKindMissing },
  { wakeWord: '看BMR报告', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.reportKindMissing },
  { wakeWord: '看蛋白质摄入报告', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.reportKindMissing },
  { wakeWord: '看水分摄入报告', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.reportKindMissing },
  { wakeWord: '看综合评分', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.reportKindMissing },
  { wakeWord: '看健康趋势', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.reportKindMissing },
  { wakeWord: '看健康报告(含对比)', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.reportKindMissing },
  { wakeWord: '看整体趋势(体重+摄入+运动)', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.multiTrendMissing },
  { wakeWord: '看整体趋势(体重+体脂+围度)', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.multiTrendMissing },
  { wakeWord: '看整体趋势(饮食+蛋白+纤维)', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.multiTrendMissing },
  { wakeWord: '看整体趋势(运动+力量+有氧)', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.multiTrendMissing },
  { wakeWord: '看整体趋势(BMI+体脂+肌肉量)', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.multiTrendMissing },
  { wakeWord: '看整体趋势(摄入+蛋白+运动)', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.multiTrendMissing },
  { wakeWord: '看整体趋势(体重+蛋白+缺口)', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.multiTrendMissing },
  { wakeWord: '看整体趋势(体重+摄入+缺口)', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.multiTrendMissing },
  { wakeWord: '看整体趋势(体重+摄入+运动+缺口)', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.multiTrendMissing },
  { wakeWord: '看整体趋势(蛋白+运动)', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.multiTrendMissing },
  { wakeWord: '看整体趋势(综合多指标)', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.multiTrendMissing },
  { wakeWord: '看整体趋势(含月度对比)', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.multiTrendMissing },
  { wakeWord: '看整体趋势(含季度对比)', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.multiTrendMissing },
  { wakeWord: '看整体趋势(含年度对比)', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.multiTrendMissing },
  { wakeWord: '看整体趋势(含目标对比)', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.multiTrendMissing },
  { wakeWord: '诊断体重波动原因', scene: '10', kind: 'exec', key: 'calorie.view.anomaly', cli: 'calorie-cmd-read calorie.view.anomaly --params \'{"kind":"weight_volatility","start":"2026-06-10","end":"2026-09-07"}\'' },
  { wakeWord: '诊断体重停滞(含平台期判断)', scene: '10', kind: 'exec', key: 'calorie.view.anomaly', cli: 'calorie-cmd-read calorie.view.anomaly --params \'{"kind":"weight_plateau","start":"2026-06-10","end":"2026-09-07"}\'' },
  { wakeWord: '诊断体重反弹', scene: '10', kind: 'exec', key: 'calorie.view.anomaly', cli: 'calorie-cmd-read calorie.view.anomaly --params \'{"kind":"weight_rebound","start":"2026-06-10","end":"2026-09-07"}\'' },
  { wakeWord: '诊断体重下降原因', scene: '10', kind: 'exec', key: 'calorie.view.anomaly', cli: 'calorie-cmd-read calorie.view.anomaly --params \'{"kind":"weight_loss_cause","start":"2026-06-10","end":"2026-09-07"}\'' },
  { wakeWord: '诊断体重异常点', scene: '10', kind: 'exec', key: 'calorie.view.anomaly', cli: 'calorie-cmd-read calorie.view.anomaly --params \'{"kind":"weight_anomaly","start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '诊断体重vs体脂围度背离', scene: '10', kind: 'exec', key: 'calorie.view.anomaly', cli: 'calorie-cmd-read calorie.view.anomaly --params \'{"kind":"weight_divergence","start":"2026-03-12","end":"2026-09-07"}\'' },
  { wakeWord: '诊断饮食超标', scene: '10', kind: 'exec', key: 'calorie.view.anomaly', cli: 'calorie-cmd-read calorie.view.anomaly --params \'{"kind":"diet_over","start":"2026-08-09","end":"2026-09-07"}\'' },
  { wakeWord: '诊断饮食不足', scene: '10', kind: 'exec', key: 'calorie.view.anomaly', cli: 'calorie-cmd-read calorie.view.anomaly --params \'{"kind":"diet_under","start":"2026-08-09","end":"2026-09-07"}\'' },
  { wakeWord: '诊断营养不均衡(含均衡判断)', scene: '10', kind: 'exec', key: 'calorie.view.anomaly', cli: 'calorie-cmd-read calorie.view.anomaly --params \'{"kind":"diet_unbalanced","start":"2026-08-09","end":"2026-09-07"}\'' },
  { wakeWord: '诊断饮食结构问题', scene: '10', kind: 'exec', key: 'calorie.view.anomaly', cli: 'calorie-cmd-read calorie.view.anomaly --params \'{"kind":"diet_structure","start":"2026-08-09","end":"2026-09-07"}\'' },
  { wakeWord: '诊断运动不足', scene: '10', kind: 'exec', key: 'calorie.view.anomaly', cli: 'calorie-cmd-read calorie.view.anomaly --params \'{"kind":"exercise_insufficient","start":"2026-08-09","end":"2026-09-07"}\'' },
  { wakeWord: '诊断运动过量', scene: '10', kind: 'exec', key: 'calorie.view.anomaly', cli: 'calorie-cmd-read calorie.view.anomaly --params \'{"kind":"exercise_overload","start":"2026-08-09","end":"2026-09-07"}\'' },
  { wakeWord: '诊断运动类型失衡', scene: '10', kind: 'exec', key: 'calorie.view.anomaly', cli: 'calorie-cmd-read calorie.view.anomaly --params \'{"kind":"exercise_type_imbalance","start":"2026-08-09","end":"2026-09-07"}\'' },
  { wakeWord: '诊断运动效率(含有效判断)', scene: '10', kind: 'exec', key: 'calorie.view.anomaly', cli: 'calorie-cmd-read calorie.view.anomaly --params \'{"kind":"exercise_efficiency","start":"2026-08-09","end":"2026-09-07"}\'' },
  { wakeWord: '诊断运动建议(含类型推荐)', scene: '10', kind: 'exec', key: 'calorie.view.anomaly', cli: 'calorie-cmd-read calorie.view.anomaly --params \'{"kind":"exercise_advice","start":"2026-08-09","end":"2026-09-07"}\'' },
  { wakeWord: '为什么我没瘦', scene: '10', kind: 'exec', key: 'calorie.view.anomaly', cli: 'calorie-cmd-read calorie.view.anomaly --params \'{"kind":"why_not_losing","start":"2026-08-09","end":"2026-09-07"}\'' },
  { wakeWord: '为什么我瘦太快', scene: '10', kind: 'exec', key: 'calorie.view.anomaly', cli: 'calorie-cmd-read calorie.view.anomaly --params \'{"kind":"why_losing_fast","start":"2026-08-09","end":"2026-09-07"}\'' },
  { wakeWord: '我的减重速度合理吗', scene: '10', kind: 'exec', key: 'calorie.view.anomaly', cli: 'calorie-cmd-read calorie.view.anomaly --params \'{"kind":"rate_reasonable","start":"2026-08-09","end":"2026-09-07"}\'' },
  { wakeWord: '我的减肥策略对吗', scene: '10', kind: 'exec', key: 'calorie.view.goal-progress', cli: HELP_EXEC_OVERRIDES.diag_strategy_check },
  { wakeWord: '我距离目标还差什么', scene: '10', kind: 'exec', key: 'calorie.view.goal-weight', cli: HELP_EXEC_OVERRIDES.diag_gap_to_goal },
  { wakeWord: '我这个月做得好的', scene: '10', kind: 'exec', key: 'calorie.view.anomaly', cli: 'calorie-cmd-read calorie.view.anomaly --params \'{"kind":"month_highlights","start":"2026-08-09","end":"2026-09-07"}\'' },
  { wakeWord: '我这个月需要改的', scene: '10', kind: 'exec', key: 'calorie.view.anomaly', cli: 'calorie-cmd-read calorie.view.anomaly --params \'{"kind":"month_improve","start":"2026-08-09","end":"2026-09-07"}\'' },
  { wakeWord: '综合健康评估', scene: '10', kind: 'exec', key: 'calorie.view.anomaly', cli: 'calorie-cmd-read calorie.view.anomaly --params \'{"kind":"overall","start":"2026-08-09","end":"2026-09-07"}\'' },
  { wakeWord: '看蛋白 vs 碳水(最近 7 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"protein_carbs","window":"7d"}\'' },
  { wakeWord: '看蛋白 vs 碳水(最近 30 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"protein_carbs","window":"30d"}\'' },
  { wakeWord: '看蛋白 vs 碳水(最近 90 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"protein_carbs","window":"90d"}\'' },
  { wakeWord: '看蛋白 vs 碳水(自定义)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"protein_carbs","window":"custom","start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看蛋白 vs 脂肪(最近 30 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"protein_fat","window":"30d"}\'' },
  { wakeWord: '看蛋白 vs 脂肪(最近 90 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"protein_fat","window":"90d"}\'' },
  { wakeWord: '看蛋白 vs 脂肪(自定义)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"protein_fat","window":"custom","start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看碳水 vs 脂肪(最近 30 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"carbs_fat","window":"30d"}\'' },
  { wakeWord: '看碳水 vs 脂肪(最近 90 天)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"carbs_fat","window":"90d"}\'' },
  { wakeWord: '看碳水 vs 脂肪(自定义)', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"carbs_fat","window":"custom","start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看钠糖纤维趋势', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.noNutrientDetail },
  { wakeWord: '看钠糖纤维综合', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.noNutrientDetail },
  { wakeWord: '看营养建议', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.noNutritionAdvice },
  { wakeWord: '看三大营养交叉(最近 30 天)', scene: '10', kind: 'exec', key: 'calorie.view.diet-review', cli: 'calorie-cmd-read calorie.view.diet-review --params \'{"start":"2026-08-09","end":"2026-09-07"}\'' },
  { wakeWord: '看三大营养交叉(最近 90 天)', scene: '10', kind: 'exec', key: 'calorie.view.diet-review', cli: 'calorie-cmd-read calorie.view.diet-review --params \'{"start":"2026-06-10","end":"2026-09-07"}\'' },
  { wakeWord: '看三大营养交叉(自定义)', scene: '10', kind: 'exec', key: 'calorie.view.diet-review', cli: 'calorie-cmd-read calorie.view.diet-review --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '预测体重(1 周后)', scene: '10', kind: 'exec', key: 'calorie.view.predict', cli: 'calorie-cmd-read calorie.view.predict --params \'{"start":"2026-08-25","end":"2026-09-07","horizonDays":7}\'' },
  { wakeWord: '预测体重(1 月后)', scene: '10', kind: 'exec', key: 'calorie.view.predict', cli: 'calorie-cmd-read calorie.view.predict --params \'{"start":"2026-08-25","end":"2026-09-07","horizonDays":30}\'' },
  { wakeWord: '预测体重(3 月后)', scene: '10', kind: 'exec', key: 'calorie.view.predict', cli: 'calorie-cmd-read calorie.view.predict --params \'{"start":"2026-08-25","end":"2026-09-07","horizonDays":90}\'' },
  { wakeWord: '预测体重(6 月后)', scene: '10', kind: 'exec', key: 'calorie.view.predict', cli: 'calorie-cmd-read calorie.view.predict --params \'{"start":"2026-08-25","end":"2026-09-07","horizonDays":180}\'' },
  { wakeWord: '预测体重(自定义时间)', scene: '10', kind: 'exec', key: 'calorie.view.predict', cli: 'calorie-cmd-read calorie.view.predict --params \'{"start":"2026-08-25","end":"2026-09-07","horizonDays":60}\'' },
  { wakeWord: '预测体重(自定义目标)', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.predictParamMissing },
  { wakeWord: '模拟减重(每天-300卡)', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.predictParamMissing },
  { wakeWord: '模拟减重(每天-500卡)', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.predictParamMissing },
  { wakeWord: '模拟减重(每天-700卡)', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.predictParamMissing },
  { wakeWord: '模拟减重(30天减Xkg)', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.predictParamMissing },
  { wakeWord: '模拟减重(60天减Xkg)', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.predictParamMissing },
  { wakeWord: '模拟减重(90天减Xkg)', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.predictParamMissing },
  { wakeWord: '模拟减重(自定义天数减Xkg)', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.predictParamMissing },
  { wakeWord: '摄入预测(按当前速率 1 周)', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.predictParamMissing },
  { wakeWord: '摄入预测(按当前速率 1 月)', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.predictParamMissing },
  { wakeWord: '摄入预测(按当前速率 3 月)', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.predictParamMissing },
  { wakeWord: '摄入预测(自定义)', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.predictParamMissing },
  { wakeWord: '摄入预测(营养目标达成预测)', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.predictParamMissing },
  { wakeWord: '摄入预测(卡路里缺口预测)', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.predictParamMissing },
  { wakeWord: '摄入预测(摄入稳定性预测)', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.predictParamMissing },
  { wakeWord: '看每日 6 因素综合', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.sixFactorsMissing },
  { wakeWord: '今日复盘', scene: '10', kind: 'exec', key: 'calorie.view.diet-review', cli: 'calorie-cmd-read calorie.view.diet-review --params \'{"start":"2026-09-07","end":"2026-09-07"}\'' },
  { wakeWord: '关闭定时复盘', scene: '10', kind: 'non-exec', bucket: 'out-of-scope', reason: NON_EXEC_REASONS.oosCron },
  { wakeWord: '复盘', scene: '10', kind: 'exec', key: 'calorie.view.diet-review', cli: 'calorie-cmd-read calorie.view.diet-review --params \'{"start":"2026-09-07","end":"2026-09-07"}\'' },
  { wakeWord: '复盘日期范围', scene: '10', kind: 'exec', key: 'calorie.view.diet-review', cli: 'calorie-cmd-read calorie.view.diet-review --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '开启定时复盘', scene: '10', kind: 'non-exec', bucket: 'out-of-scope', reason: NON_EXEC_REASONS.oosCron },
  { wakeWord: '本周复盘', scene: '10', kind: 'exec', key: 'calorie.view.diet-review', cli: 'calorie-cmd-read calorie.view.diet-review --params \'{"start":"2026-09-07","end":"2026-09-07"}\'' },
  { wakeWord: '本年复盘', scene: '10', kind: 'exec', key: 'calorie.view.diet-review', cli: 'calorie-cmd-read calorie.view.diet-review --params \'{"start":"2026-01-01","end":"2026-09-07"}\'' },
  { wakeWord: '本月复盘', scene: '10', kind: 'exec', key: 'calorie.view.diet-review', cli: 'calorie-cmd-read calorie.view.diet-review --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '查低热量榜', scene: '10', kind: 'exec', key: 'calorie.view.ranking', cli: 'calorie-cmd-read calorie.view.ranking --params \'{"category":"low_calorie","start":"2026-09-01","end":"2026-09-07","topN":10}\'' },
  { wakeWord: '查健康报告', scene: '10', kind: 'exec', key: 'calorie.view.health', cli: 'calorie-cmd-read calorie.view.health --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '查卡路里数据', scene: '10', kind: 'non-exec', bucket: 'legacy-chain', reason: NON_EXEC_REASONS.lintMissing },
  { wakeWord: '查定时复盘', scene: '10', kind: 'non-exec', bucket: 'out-of-scope', reason: NON_EXEC_REASONS.oosCron },
  { wakeWord: '查热量缺口', scene: '10', kind: 'exec', key: 'calorie.view.deficit', cli: 'calorie-cmd-read calorie.view.deficit --params \'{"start":"2026-09-05","end":"2026-09-07"}\'' },
  { wakeWord: '查热量趋势', scene: '10', kind: 'exec', key: 'calorie.history', cli: 'calorie-cmd-read calorie.history --params \'{"days":7}\'' },
  { wakeWord: '查营养结构', scene: '10', kind: 'exec', key: 'calorie.view.diet-review', cli: 'calorie-cmd-read calorie.view.diet-review --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '查运动分布', scene: '10', kind: 'exec', key: 'calorie.view.exercise', cli: 'calorie-cmd-read calorie.view.exercise --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '查运动贡献', scene: '10', kind: 'exec', key: 'calorie.view.exercise', cli: 'calorie-cmd-read calorie.view.exercise --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '查频繁吃榜', scene: '10', kind: 'exec', key: 'calorie.view.ranking', cli: 'calorie-cmd-read calorie.view.ranking --params \'{"category":"frequent","start":"2026-09-01","end":"2026-09-07","topN":10}\'' },
  { wakeWord: '查食物排行', scene: '10', kind: 'exec', key: 'calorie.view.ranking', cli: 'calorie-cmd-read calorie.view.ranking --params \'{"start":"2026-09-01","end":"2026-09-07","topN":10}\'' },
  { wakeWord: '查高热量榜', scene: '10', kind: 'exec', key: 'calorie.view.ranking', cli: 'calorie-cmd-read calorie.view.ranking --params \'{"start":"2026-09-05","end":"2026-09-07"}\'' },
  { wakeWord: '查高碳水榜', scene: '10', kind: 'exec', key: 'calorie.view.ranking', cli: 'calorie-cmd-read calorie.view.ranking --params \'{"category":"high_carb","start":"2026-09-01","end":"2026-09-07","topN":10}\'' },
  { wakeWord: '查高蛋白榜', scene: '10', kind: 'exec', key: 'calorie.view.ranking', cli: 'calorie-cmd-read calorie.view.ranking --params \'{"category":"high_protein","start":"2026-09-01","end":"2026-09-07","topN":10}\'' },
];

/** FX-81-5 覆盖修复：3 条链式 wizard 词的键失去**唯一**可跑入口，故补 1 条单命令入口。
 *
 * FX-81-7 复核后：`看目标预测达成` 已改 exec（≥14 天窗口实跑 exit 0）→ 其键
 * `calorie.view.goal-predict` 由该词自身承接，原修复入口 `看目标达成预测` 删除（不再需要）。
 * `定营养目标(自动算)`／`定饮水目标(自动算)`／`一键定全套目标` 三条链式词保留 non-exec（wizard），
 * 其键 `calorie.view.goal-recommend` 由本条承接（D2③「83 键全部有可执行入口」不放宽）。 */
export const COVERAGE_REPAIR_ROUTES: readonly ExecWakeRoute[] = [
  { wakeWord: '看目标推荐', scene: '06', kind: 'exec', key: 'calorie.view.goal-recommend', cli: 'calorie-cmd-read calorie.view.goal-recommend --params \'{"profile":"cut"}\'' },
];

/** D-4：40 个无入口键的新拟入口（唤醒词新拟，不写入冻结表） */
export const NEW_KEY_ROUTES: readonly ExecWakeRoute[] = [
  { wakeWord: '存身材照', scene: '09', kind: 'exec', key: 'calorie.photo.add', cli: 'calorie-cmd-read calorie.photo.add --params \'{"srcPaths":["<照片路径>"],"tag":"正面"}\'' },
  { wakeWord: '移除身材照', scene: '09', kind: 'exec', key: 'calorie.photo.remove', cli: 'calorie-cmd-read calorie.photo.remove --params \'{"id":1}\'' },
  { wakeWord: '设置照片标签', scene: '09', kind: 'exec', key: 'calorie.photo.tag', cli: 'calorie-cmd-read calorie.photo.tag --params \'{"id":1,"op":"add","tag":"晨起"}\'' },
  { wakeWord: '看今日饮食记录', scene: '02', kind: 'exec', key: 'calorie.today', cli: 'calorie-cmd-read calorie.today --params \'{"date":"2026-09-07"}\'' },
  { wakeWord: '看目标配置', scene: '06', kind: 'exec', key: 'calorie.view.goal-config', cli: 'calorie-cmd-read calorie.view.goal-config' },
  { wakeWord: '看目标状态', scene: '06', kind: 'exec', key: 'calorie.view.goal-status', cli: 'calorie-cmd-read calorie.view.goal-status' },
  { wakeWord: '看组合分析', scene: '10', kind: 'exec', key: 'calorie.view.combined', cli: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_calorie","window":"7d"}\'' },
  { wakeWord: '看热量缺口', scene: '10', kind: 'exec', key: 'calorie.view.deficit', cli: 'calorie-cmd-read calorie.view.deficit --params \'{"start":"2026-09-05","end":"2026-09-07"}\'' },
  { wakeWord: '看饮食复盘', scene: '02', kind: 'exec', key: 'calorie.view.diet-review', cli: 'calorie-cmd-read calorie.view.diet-review --params \'{"start":"2026-09-07","end":"2026-09-07"}\'' },
  { wakeWord: '看健康盘', scene: '10', kind: 'exec', key: 'calorie.view.health', cli: 'calorie-cmd-read calorie.view.health --params \'{"start":"2026-09-07","end":"2026-09-07"}\'' },
  { wakeWord: '查高热量排行', scene: '02', kind: 'exec', key: 'calorie.view.ranking', cli: 'calorie-cmd-read calorie.view.ranking --params \'{"start":"2026-09-05","end":"2026-09-07"}\'' },
  { wakeWord: '查食品库', scene: '02', kind: 'exec', key: 'calorie.view.library', cli: 'calorie-cmd-read calorie.view.library' },
  { wakeWord: '搜食品', scene: '02', kind: 'exec', key: 'calorie.view.search', cli: 'calorie-cmd-read calorie.view.search --params \'{"keyword":"鸡胸"}\'' },
  { wakeWord: '看身材照', scene: '09', kind: 'exec', key: 'calorie.photo.list', cli: 'calorie-cmd-read calorie.photo.list --params \'{"tag":"正面"}\'' },
  { wakeWord: '查身材照详情', scene: '09', kind: 'exec', key: 'calorie.photo.detail', cli: 'calorie-cmd-read calorie.photo.detail --params \'{"id":1}\'' },
  { wakeWord: '对比身材照', scene: '09', kind: 'exec', key: 'calorie.photo.compare', cli: 'calorie-cmd-read calorie.photo.compare --params \'{"id1":1,"id2":2}\'' },
  { wakeWord: '做身材照GIF', scene: '09', kind: 'exec', key: 'calorie.photo.gif', cli: 'calorie-cmd-read calorie.photo.gif --params \'{"tag":"正面"}\'' },
  { wakeWord: '看身材照HELP', scene: '09', kind: 'exec', key: 'calorie.help.center', cli: 'calorie-cmd-read calorie.help.center --params \'{"q":"记身材照"}\'' },
  { wakeWord: '查唤醒词', scene: '10', kind: 'exec', key: 'calorie.help.lookup', cli: 'calorie-cmd-read calorie.help.lookup --params \'{"q":"看今日主页"}\'' },
  { wakeWord: '查热量历史', scene: '10', kind: 'exec', key: 'calorie.history', cli: 'calorie-cmd-read calorie.history --params \'{"days":7}\'' },
  { wakeWord: '看体重历史', scene: '03', kind: 'exec', key: 'calorie.view.weight-history', cli: 'calorie-cmd-read calorie.view.weight-history' },
  { wakeWord: '看体重对比', scene: '03', kind: 'exec', key: 'calorie.view.weight-compare', cli: 'calorie-cmd-read calorie.view.weight-compare --params \'{"start":"2026-09-01","end":"2026-09-07","compareStart":"2026-08-23","compareEnd":"2026-08-29"}\'' },
  { wakeWord: '看体重复核', scene: '03', kind: 'exec', key: 'calorie.view.weight-review', cli: 'calorie-cmd-read calorie.view.weight-review' },
  { wakeWord: '看波动分析', scene: '03', kind: 'exec', key: 'calorie.view.volatility', cli: 'calorie-cmd-read calorie.view.volatility' },
  { wakeWord: '看体成分', scene: '08', kind: 'exec', key: 'calorie.view.body-composition', cli: 'calorie-cmd-read calorie.view.body-composition' },
  { wakeWord: '看围度记录', scene: '08', kind: 'exec', key: 'calorie.view.body-measure', cli: 'calorie-cmd-read calorie.view.body-measure' },
  { wakeWord: '看训练计划', scene: '05', kind: 'exec', key: 'calorie.view.plan', cli: 'calorie-cmd-read calorie.view.plan' },
  { wakeWord: '看构建向导', scene: '05', kind: 'exec', key: 'calorie.view.plan-wizard', cli: 'calorie-cmd-read calorie.view.plan-wizard --params \'{"plan":{"config":{"title":"减脂4周","start_date":"2026-09-07","user_level":"中手","available_equipment":["瑜伽垫"]},"weeks":[{"week_number":1,"days":[{"day_of_week":1,"sessions":[{"session_label":"上肢","movements":[{"name":"俯卧撑","part":"胸","type":"力量","sets":[]}]}]}]}]}}\'' },
  { wakeWord: '看运动目标', scene: '04', kind: 'exec', key: 'calorie.view.exercise-goal', cli: 'calorie-cmd-read calorie.view.exercise-goal' },
  { wakeWord: '看体重预测', scene: '10', kind: 'exec', key: 'calorie.view.predict', cli: 'calorie-cmd-read calorie.view.predict --params \'{"start":"2026-08-25","end":"2026-09-07","horizonDays":7}\'' },
  { wakeWord: '看异常诊断', scene: '10', kind: 'exec', key: 'calorie.view.anomaly', cli: 'calorie-cmd-read calorie.view.anomaly --params \'{"kind":"diet_over","start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看禁忌扫描', scene: '05', kind: 'exec', key: 'calorie.view.contraindication', cli: 'calorie-cmd-read calorie.view.contraindication' },
  { wakeWord: '看去重报告', scene: '02', kind: 'exec', key: 'calorie.view.dedupe', cli: 'calorie-cmd-read calorie.view.dedupe' },
  { wakeWord: '看档案视图', scene: '07', kind: 'exec', key: 'calorie.view.profile', cli: 'calorie-cmd-read calorie.view.profile' },
  // #111 · 运动移植 6 键新拟入口（D2③ 83 键全可达；其中 strength／cardio／review 已由上文促进词覆盖，本表补齐 distribution／recap／trend＋三键短名）。
  { wakeWord: '看力量总览', scene: '04', kind: 'exec', key: 'calorie.view.exercise-strength', cli: 'calorie-cmd-read calorie.view.exercise-strength --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看有氧总览', scene: '04', kind: 'exec', key: 'calorie.view.exercise-cardio', cli: 'calorie-cmd-read calorie.view.exercise-cardio --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看运动分类占比', scene: '04', kind: 'exec', key: 'calorie.view.exercise-distribution', cli: 'calorie-cmd-read calorie.view.exercise-distribution --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看运动复盘', scene: '04', kind: 'exec', key: 'calorie.view.exercise-recap', cli: 'calorie-cmd-read calorie.view.exercise-recap --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
  { wakeWord: '看训练计划复盘', scene: '05', kind: 'exec', key: 'calorie.view.exercise-review', cli: 'calorie-cmd-read calorie.view.exercise-review --params \'{"start":"2026-08-31","end":"2026-09-07"}\'' },
  { wakeWord: '看运动消耗趋势', scene: '04', kind: 'exec', key: 'calorie.view.exercise-trend', cli: 'calorie-cmd-read calorie.view.exercise-trend --params \'{"start":"2026-09-01","end":"2026-09-07"}\'' },
];



/** 全量路由（436 条 SoT ＋ 40 条新拟入口 ＋ 1 条覆盖修复入口） */
export const ALL_ROUTES: readonly WakeRoute[] = [...WAKE_ROUTES, ...NEW_KEY_ROUTES, ...COVERAGE_REPAIR_ROUTES];

/** 唤醒词 → 路由（记身材照 3 条，故值为数组） */
export const ROUTES_BY_WAKE_WORD: Readonly<Record<string, readonly WakeRoute[]>> = ALL_ROUTES.reduce(
  (acc, r) => {
    (acc[r.wakeWord] ??= [] as WakeRoute[]).push(r);
    return acc;
  },
  {} as Record<string, WakeRoute[]>,
);

/** calorie key → 首条可执行路由（83 键全可达的索引） */
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
