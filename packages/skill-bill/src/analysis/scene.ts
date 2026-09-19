/** 分析域·**场景契约与落点表**（唯一定义地）。
 *
 * 本件回答三件事：
 *   ① 一件场景件长什么样——`AnalysisScene`（一条唤醒词的落点：id／命令名／老侧 `type`／标题／形态族／取值函数）；
 *   ② 五个**形态族**各吃什么（`BarsPage`／`ChartsPage`／`TablesPage`／`ComparePage`／`InsightPage`）；
 *   ③ 一条唤醒词该落哪一件——`ANALYSIS_SCENES` 那张 **25 行落点表** ＋ `sceneFor`。
 *
 * **形态族＝页型（第二层）**：分片数由 `packages/skill-bill/docs/t685-按域页型表.md` §2.3 定死
 * （25 个渲染器逐条归并成 5 族：读数＋条 13／读数＋图 4／读数＋表 3／对比＋变更 4／解读＋多卡 1），
 * 判据是「内容卡的种类」——即**卡内装配代码**的变化频率，不是卡出几张。
 *
 * **块位序列住各族的模板件**（`./template-*.ts`）：本件只声明「这一族吃哪几个槽」，
 * 槽的出现与否是数据（老侧渲染器本身就有的 ●恒出／○有内容才出），**槽的顺序一律由模板件定**。
 * 场景件因此只写差异值：取值（走 `./agg.js` 与 `../shared/`）、文案、槽里放什么。
 *
 * **老侧对应件**：`scripts/analysis/cli.py`（25 个 `cmd_*` 取数）＋ `templates/分析/analysis_view.html`
 * （25 个页面级渲染器）。逐族的行号对照见 t685 §2.3 那张表。
 *
 * 谁在用（两个调用点，指名）：
 *   ① `src/analysis/read.ts`——三条读命令的处理体：解析 kind → `sceneFor` 取件 → 取件出页；
 *   ② `src/analysis/index.ts`——域门把 `ANALYSIS_SCENES` 转出给测试（域内别处不读它）。
 */
import type { ChartBlockChartInput, ChartBlockInput, DataTableColumn, DataTableRow, KpiCardInput } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import type { BillDb } from '../fetch/db.js';
import { BillPolicyError } from '../fetch/errors.js';
import type { Kpi } from './agg.js';
import { sceneAccount } from './scene-account.js';
import { sceneActivity } from './scene-activity.js';
import { sceneAnomaly } from './scene-anomaly.js';
import { sceneCatCompare } from './scene-cat-compare.js';
import { sceneCatTrend } from './scene-cat-trend.js';
import { sceneCategory } from './scene-category.js';
import { sceneDebt } from './scene-debt.js';
import { sceneDistribution } from './scene-distribution.js';
import { sceneInsight } from './scene-insight.js';
import { sceneInstallment } from './scene-installment.js';
import { sceneLedger } from './scene-ledger.js';
import { sceneMonthly } from './scene-monthly.js';
import { sceneOverview } from './scene-overview.js';
import { scenePeriodCompare } from './scene-period-compare.js';
import { sceneRangeCompare } from './scene-range-compare.js';
import { sceneRefund } from './scene-refund.js';
import { sceneReimburse } from './scene-reimburse.js';
import { sceneStats } from './scene-stats.js';
import { sceneStructure } from './scene-structure.js';
import { sceneTop } from './scene-top.js';
import { sceneTopFreq } from './scene-top-freq.js';
import { sceneTrend } from './scene-trend.js';
import { sceneWeek } from './scene-week.js';
import { sceneYearly } from './scene-yearly.js';
import { sceneYoy } from './scene-yoy.js';

/** 本域三条命令名（跨技能契约，冻结不动）。 */
export type AnalysisKey = 'bill.analysis.overview' | 'bill.analysis.compare' | 'bill.analysis.trend';

/** 形态族（＝页型第二层；数字与族名照 t685 §2.3 的归并结果）。 */
export type Family = 'bars' | 'charts' | 'tables' | 'compare' | 'insight';

/* ── 一族共用的几个小形状（五个族都从这几个拼） ───────────────────────────────── */

/** 一条**条卡里的条**（老侧 `.cat-bar`）：名字 ＋ 数值栏那句话 ＋ 条长比例。
 *  版式改（#681 偏好 3「信息等价、版式可全新设计」）：老侧条下那行小字（如「最近一笔 …」）
 *  并进 `text` 那一栏，不再单出一行——事实一个不少，只是换了摆法。 */
export interface BarRow {
  readonly label: string;
  /** 数值栏那句话（如 `312.50 元 · 9 笔 · 28.4%`）；**成句在这里，模板只摆位**。 */
  readonly text: string;
  /** 条长：0–100 的有限数（公共层 `renderDistributionRows` 夹取越界值）。 */
  readonly pct: number;
}

/** 一组条卡（老侧一张 `.card` ＋ 里头若干 `.cat-bar`）：标题 ＋ 若干条 ＋ 这一组的空态句。
 *  标题里的计数（老侧标题右那枚「13 类」）由场景**并进标题文本**——版式件不给第二枚槽位。 */
export interface BarGroup {
  readonly title: string;
  readonly rows: readonly BarRow[];
  /** 这一组没有内容时出的空态句（老侧 `emptyState({text})`）。 */
  readonly emptyText: string;
}

/** 一行列表卡（老侧 `.records` 里的 `.record`）：`左 ｜ 主文 ｜ 右` 三栏，与公共层 `renderListRows` 同形同数。
 *  老侧那条「备注第二行」并进 `main`（换行在公共层是转义文本，不另占一栏）。 */
export interface ListRow {
  readonly left: string;
  readonly main: string;
  readonly right: string;
  /** 完成态（公共层出删除线＋成功色）：本域只用在「已还清」那类行上。 */
  readonly done?: boolean;
}

/** 一张列表卡：标题 ＋ 行 ＋ 空态句。 */
export interface ListCard {
  readonly title: string;
  readonly rows: readonly ListRow[];
  readonly emptyText: string;
}

/** 一张键值行卡（老侧 `.fact-row` 那一列 `k ／ v`）。 */
export interface FactCard {
  /** 卡标题；空串＝不出标题（老侧「区间标注」那张有标题）。 */
  readonly title: string;
  readonly rows: readonly { readonly k: string; readonly v: string }[];
}

/** 一张图卡：图 kind ＋ 图数据 ＋ 卡标题。**图一律走公共层**（`renderChartBlock`，零 SVG 副本）。
 *  `kind` 的类型取自公共层 `ChartBlockInput` 的字段（不另抄一份 kind 字面量：闭集事实只住公共层）。 */
export interface ChartCard {
  readonly title: string;
  readonly kind: ChartBlockInput['kind'];
  readonly input: ChartBlockChartInput;
}

/** 一张小表卡（老侧 `.records` 之外的表格形；走公共层 `renderDataTable`）。 */
export interface TableCard {
  readonly title: string;
  readonly columns: readonly DataTableColumn[];
  readonly rows: readonly DataTableRow[];
  readonly caption?: string;
  /** 无行时出的空态句（老侧 `emptyState({text})`）。 */
  readonly emptyText: string;
}

/** 空态：一句话 ＋ 一句「接下来怎么办」。 */
export interface EmptySpec {
  readonly text: string;
  readonly hint: string;
}

/* ── 五个形态族各自吃的那一份（＝模板件的入参形状） ───────────────────────────── */

/** ① 读数＋条（13 个场景）：读数卡区 → 芯片列 →〔对比双卡＋变更徽标〕→〔图卡〕→ 条卡组 →〔列表卡〕→〔事实卡〕。 */
export interface BarsPage {
  readonly kpis: readonly KpiCardInput[];
  readonly chips: readonly string[];
  readonly charts: readonly ChartCard[];
  readonly barGroups: readonly BarGroup[];
  readonly listCards: readonly ListCard[];
  readonly factCards: readonly FactCard[];
  readonly empty: EmptySpec;
}

/** ② 读数＋图（4 个场景）：读数卡区／芯片列 → 图卡 → 明细卡（列表或事实行卡）。 */
export interface ChartsPage {
  readonly kpis: readonly KpiCardInput[];
  readonly chips: readonly string[];
  readonly charts: readonly ChartCard[];
  readonly listCards: readonly ListCard[];
  readonly factCards: readonly FactCard[];
  readonly empty: EmptySpec;
}

/** ③ 读数＋表（3 个场景）：读数卡区 →〔芯片列〕→ 小表卡 →〔事实卡〕。 */
export interface TablesPage {
  readonly kpis: readonly KpiCardInput[];
  readonly chips: readonly string[];
  readonly tables: readonly TableCard[];
  readonly factCards: readonly FactCard[];
  readonly empty: EmptySpec;
}

/** ④ 对比＋变更（4 个场景）：对比卡（两段出入）→ 变更徽标 →〔差异条卡〕→〔事实卡〕。 */
export interface ComparePage {
  readonly kpis: readonly KpiCardInput[];
  readonly chips: readonly string[];
  readonly sides: readonly { readonly title: string; readonly kpis: readonly KpiCardInput[] }[];
  readonly change: { readonly text: string; readonly detail: string; readonly direction: 'up' | 'down' | 'flat' };
  readonly barGroups: readonly BarGroup[];
  readonly factCards: readonly FactCard[];
  readonly empty: EmptySpec;
}

/** ⑤ 解读＋多卡（1 个场景）：解读条（由结论句承载）→ 读数卡区 → 事实卡 → 条卡组 → 图卡 → 列表卡。 */
export interface InsightPage {
  readonly kpis: readonly KpiCardInput[];
  readonly factCards: readonly FactCard[];
  readonly barGroups: readonly BarGroup[];
  readonly charts: readonly ChartCard[];
  readonly listCards: readonly ListCard[];
  readonly empty: EmptySpec;
}

/** 五族的取值类型联合（按 `family` 窄化；模板件的入参就是它对应的那一支）。 */
export type FamilyPage = BarsPage | ChartsPage | TablesPage | ComparePage | InsightPage;

/** 一次取值的结果里**与族无关**的那一半（页面骨架与载荷都要）：五族模板件的入参都含它。 */
export interface PageFacts {
  /** 页标题（唤醒词逐字；`scene.title` 是缺省，个别场景要带期间后缀时在这里改）。 */
  readonly title: string;
  /** 期间标签（副标题与来源脚注那一行）。 */
  readonly label: string;
  /** 来源脚注的窗口起止（没有时间窗的查法给「不限」）。 */
  readonly from: string;
  readonly to: string;
  /** 本页取到的事实条数（来源脚注「共 N 条」）。 */
  readonly count: number;
  /** 页头结论句（一句话说这批数是什么局面）。 */
  readonly conclusion: string;
  /** 口径说明行（怎么算的；图表族还要在这里点名没有记录的月）。 */
  readonly caliber: string;
  /** 结果胶囊：第二枚起（第一枚恒是唤醒词）。 */
  readonly chips: readonly string[];
  /** 出口载荷（envelope `data`）：`bill.analysis.overview` 是 `stat` 形（`metrics` 全 number）、
   *  另两条是 `analysis` 形（`summary` 非空串）。**形状由 key 定死**，各场景不许自造第三种。 */
  readonly payload: Record<string, unknown>;
  /** 本页的收支读数（载荷与页面共用同一份）。 */
  readonly kpi: Kpi;
}

/** 一次取值的结果：与族无关的那一半（`PageFacts`）＋ 这一族的那一份卡（`page`）。
 *  载荷与页面同源不同形：载荷给机器（形状由 key 定，过 `base-link-core` 的守卫），页面给人。 */
export type SceneResult<F extends FamilyPage> = PageFacts & { readonly page: F };

/** 一件场景件跑起来要的现场：本次参数、库句柄、命令名、老侧 `type`。 */
export interface SceneInput {
  readonly key: AnalysisKey;
  readonly kind: string;
  readonly params: Record<string, unknown>;
  readonly db: BillDb;
}

/** 五族模板件的入参（**同一份**）：本次是谁 ＋ 复制区要的三样取数 ＋ 场景取值的结果。
 *  族的差别只在模板件里那份**块序**，入参形状全族一致。 */
export interface DocInput<F extends FamilyPage> {
  readonly key: AnalysisKey;
  readonly params: Record<string, unknown>;
  /** 唤醒词（页头第一枚胶囊；由域声明投影算出）。 */
  readonly wakeWord: string;
  /** 本次执行时刻（复制日志第 5 段）。 */
  readonly actionAt: string;
  /** 页面内置 envelope（复制区序列化它；形状与本次出口载荷一致）。 */
  readonly envelope: SerializableEnvelope;
  readonly result: SceneResult<F>;
}

/** 一件场景件：一条唤醒词的落点。`family` 与 `values` 绑在一支里——取值出的形状必须配得上那一族的模板。 */
export type AnalysisScene =
  | { readonly id: string; readonly key: AnalysisKey; readonly kind: string; readonly title: string; readonly family: 'bars'; readonly values: (input: SceneInput) => SceneResult<BarsPage> }
  | { readonly id: string; readonly key: AnalysisKey; readonly kind: string; readonly title: string; readonly family: 'charts'; readonly values: (input: SceneInput) => SceneResult<ChartsPage> }
  | { readonly id: string; readonly key: AnalysisKey; readonly kind: string; readonly title: string; readonly family: 'tables'; readonly values: (input: SceneInput) => SceneResult<TablesPage> }
  | { readonly id: string; readonly key: AnalysisKey; readonly kind: string; readonly title: string; readonly family: 'compare'; readonly values: (input: SceneInput) => SceneResult<ComparePage> }
  | { readonly id: string; readonly key: AnalysisKey; readonly kind: string; readonly title: string; readonly family: 'insight'; readonly values: (input: SceneInput) => SceneResult<InsightPage> };

/** **25 行落点表**（唯一定义地）：顺序＝域声明 `src/analysis/declaration.ts` 里 `entries` 的书写顺序
 *  （看月度 → 看年度 → … → 看退款），与老侧 `scenes/analysis.yaml` 的二级组顺序同族。 */
export const ANALYSIS_SCENES: readonly AnalysisScene[] = [
  sceneMonthly, sceneYearly, sceneOverview, sceneWeek, sceneCategory, sceneAccount, sceneLedger, sceneStructure, sceneStats,
  scenePeriodCompare, sceneRangeCompare, sceneYoy, sceneCatCompare,
  sceneTrend, sceneCatTrend, sceneTop, sceneTopFreq, sceneDistribution, sceneActivity, sceneInsight, sceneAnomaly,
  sceneDebt, sceneReimburse, sceneInstallment, sceneRefund,
];

/** 落点表按 `命令名 + 老侧 type` 建索引：**两个域里同名的 kind 靠命令名分开**
 *  （`category` 这个 kind 三条命令各有一支：看分类／看分类对比／看分类趋势）。 */
const BY_KEY_KIND = new Map<string, AnalysisScene>(ANALYSIS_SCENES.map((s) => [s.key + '|' + s.kind, s]));

/** 取件：按 `命令名 + kind` 认。认不得即抛——**不猜、不兜底**（kind 已在 `./params.js` 拦过一道，
 *  走到这里还认不得就是落点表与 kind 词表走散了，属代码缺陷）。 */
export function sceneFor(key: AnalysisKey, kind: string): AnalysisScene {
  const hit = BY_KEY_KIND.get(key + '|' + kind);
  if (hit === undefined) {
    throw new BillPolicyError('POLICY_BAD_INPUT', '分析域没有这一支场景：' + key + ' / ' + kind);
  }
  return hit;
}
