/** 分析域三条读命令的处理体（**从 `src/cli/cmd_read.ts` 的 `dispatch` 归位到这里**）。
 *
 * `bill.analysis.overview`（9 条词）／`bill.analysis.compare`（4 条）／`bill.analysis.trend`（12 条）：
 * 一条命令一处，出口 `src/cli/cmd_read.ts` 只查注册表再调本域的门（`runRegistered` 走声明里的 `run`）。
 *
 * **本件只做三件事**：① 把命令名 ＋ 本次 `kind` 认成一件场景（`./scene.js` 的落点表）；
 *  ② 让那件场景自己去取数与取值（`./scene-*.js` 的 `values`，聚合走 `./agg.js`）；
 *  ③ 把取值结果装配成出口载荷 ＋ 一整页（按 `family` 分发到五份模板件之一）。
 *  页面装配与取值**不同件**：模板件持块序（`./template-*.js`），本件一行块位都不写。
 *
 * **红线（搬迁前既有语义，逐条有测试钉着）**：
 *   - **库为空** ⇒ `BILL_EMPTY_RANGE`（出口 exit 4、不落盘）；这是 #688 裁定 4 明文保留的那一支
 *     （空窗 ≠ 空库：**窗口**内没有记录照出完整页，**库**里一条都没有仍是取数失败）；
 *   - 坏输入阻断不冒充正常：`kind` 非法、`month`／`start`／`end` 形态不对一律 `POLICY_*`（出口 exit 2）；
 *   - 载荷形状**照搬迁前逐字不动**：`bill.analysis.overview`＝`stat`（`metrics` 全 number）、
 *     另两条＝`analysis`（`summary` 非空串）——形状由 key 定死，页面那侧只加不改。
 */
import type { BillDb } from '../fetch/index.js';
import { BillFetchError } from '../fetch/errors.js';
import { fetchAll } from '../fetch/index.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { actionStamp } from '../shared/copyArea.js';
import { projectWakeWord } from '../triggers/wakeTable.js';
import { parseCompareKind, parseOverviewKind, parseTrendKind } from './params.js';
import { analysisEnvelopeOf, statEnvelopeOf } from './pageParts.js';
import { sceneFor } from './scene.js';
import type { AnalysisKey, AnalysisScene, DocInput, FamilyPage, SceneInput, SceneResult } from './scene.js';
import { barsDoc } from './template-bars.js';
import { chartsDoc } from './template-charts.js';
import { compareDoc } from './template-compare.js';
import { insightDoc } from './template-insight.js';
import { tablesDoc } from './template-tables.js';

/** 页面内置的 envelope（复制区序列化它）：形状按 key 认，`stat` 取 `metrics`、`analysis` 取 `summary`。 */
function envelopeOf(key: AnalysisKey, payload: Record<string, unknown>): ReturnType<typeof statEnvelopeOf> {
  if (key === 'bill.analysis.overview') {
    const metrics = payload['metrics'];
    return statEnvelopeOf(key, (metrics ?? {}) as Record<string, number>);
  }
  const summary = payload['summary'];
  return analysisEnvelopeOf(key, typeof summary === 'string' ? summary : '');
}

/** 按形态族分发到那一族的模板件：`family` 与取值形状绑在一支里，窄化由类型系统保证
 *  （`case 'bars'` 里 `scene.values` 的返回类型就是 `SceneResult<BarsPage>`，模板件收的也正是它）。 */
function pageOf(
  scene: AnalysisScene,
  input: SceneInput,
  frame: { readonly params: Record<string, unknown>; readonly wakeWord: string; readonly actionAt: string },
): ViewOut {
  const base = {
    key: scene.key, params: frame.params, wakeWord: frame.wakeWord, actionAt: frame.actionAt,
  };
  switch (scene.family) {
    case 'bars': {
      const result = scene.values(input);
      return { data: result.payload, html: barsDoc(docInput(base, result)) };
    }
    case 'charts': {
      const result = scene.values(input);
      return { data: result.payload, html: chartsDoc(docInput(base, result)) };
    }
    case 'tables': {
      const result = scene.values(input);
      return { data: result.payload, html: tablesDoc(docInput(base, result)) };
    }
    case 'compare': {
      const result = scene.values(input);
      return { data: result.payload, html: compareDoc(docInput(base, result)) };
    }
    case 'insight': {
      const result = scene.values(input);
      return { data: result.payload, html: insightDoc(docInput(base, result)) };
    }
    default: return scene satisfies never;
  }
}

/** 把「取值结果」包成模板件的入参（envelope 从载荷派生，与出口那份同源）。 */
function docInput<F extends FamilyPage>(
  base: { readonly key: AnalysisKey; readonly params: Record<string, unknown>; readonly wakeWord: string; readonly actionAt: string },
  result: SceneResult<F>,
): DocInput<F> {
  return {
    key: base.key,
    params: base.params,
    wakeWord: base.wakeWord,
    actionAt: base.actionAt,
    envelope: envelopeOf(base.key, result.payload),
    result,
  };
}

/** 三条命令共用的收口：认场景 → 取值 → 出页 → 拼出口载荷。 */
function viewOf(key: AnalysisKey, kind: string, params: Record<string, unknown>, db: BillDb): ViewOut {
  if (fetchAll(db).length === 0) {
    throw new BillFetchError('BILL_EMPTY_RANGE', '记账库里还没有记录：先记一笔再来看分析（缺失阻断）');
  }
  const scene = sceneFor(key, kind);
  const wakeWord = projectWakeWord({ key, kind });
  return pageOf(scene, { key, kind, params, db }, { params, wakeWord, actionAt: actionStamp() });
}

/** `bill.analysis.overview`：看月度／看年度／看总览／看周报／看分类／看账户／看账本／看结构／做统计。 */
export function viewAnalysisOverview(params: Record<string, unknown>, db: BillDb): ViewOut {
  return viewOf('bill.analysis.overview', parseOverviewKind(params), params, db);
}

/** `bill.analysis.compare`：看对比／看双区间／看同比／看分类对比。 */
export function viewAnalysisCompare(params: Record<string, unknown>, db: BillDb): ViewOut {
  return viewOf('bill.analysis.compare', parseCompareKind(params), params, db);
}

/** `bill.analysis.trend`：看趋势／看分类趋势／看大额／看高频／看分布／看活跃／看洞察／看异常／看借贷／看报销／看分期／看退款。 */
export function viewAnalysisTrend(params: Record<string, unknown>, db: BillDb): ViewOut {
  return viewOf('bill.analysis.trend', parseTrendKind(params), params, db);
}
