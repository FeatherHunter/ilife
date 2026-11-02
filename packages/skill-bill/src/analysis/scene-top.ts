/** 场景件：**看大额**（`kind = 'top'`，命令 `bill.analysis.trend`）——本件只是差异声明与取值，
 *  块位序列住 `./template-bars.ts`（族＝读数＋条）。
 *
 * 老侧对应件：`scripts/analysis/cli.py` 的 `cmd_top`（`:572-594`）
 *  ＋ 模板 `templates/分析/analysis_view.html` 的 `renderTop`（`:721-742`）。
 *
 * 本件的差异（照老侧那一页逐点对）：
 *   ① **参数**（老侧只有 `--from`／`--to` 两个窗口参数）：
 *      · `limit`＝取前几笔，缺省 10；给了就必须是 1~50 的整数，否则 `POLICY_BAD_INPUT` 阻断（不猜、不夹取）；
 *      · 窗口三选一——给 `month` 取整月，给 `start`／`end` 取闭区间（缺一即缺槽位阻断，与老侧
 *        「`--from` 和 `--to` 必须同时指定」同一条口径），都不给＝全部时间；
 *   ② 排行取 `./agg.js` 的 `expenseTop`（支出绝对值降序、同额时间晚的在前、转账除外——老侧那段
 *      `sorted((r for r in records if r.amount < 0), key=amount)[:limit]` 的等价物）；
 *   ③ 老侧每一笔的备注另占一行，新侧并进数值栏那句话（`金额 元 · 日期 · 备注`，#681 偏好 3：
 *      信息等价、版式可全新设计），条长按最大一笔折算；
 *   ④ 期间芯片＝`TOP N · 期间`（老侧 `TOP ${limit} · ${period}` 那枚 `.filter-chip`）；
 *   ⑤ 载荷＝`./views.js` 的 `buildTrend('top', …)`（`limit` 照传）。
 */
import { runWithLanguage } from 'base-entries';
import type { BillDb, BillRow } from '../fetch/db.js';
import { BillPolicyError } from '../fetch/errors.js';
import { dayOf, expenseTop, kpiOf, round1, windowWithRecords } from './agg.js';
import { NO_WINDOW, money, textOrDash } from './pageParts.js';
import type { AnalysisScene } from './scene.js';
import { buildTrend } from './views.js';
import { m } from '../entries/index.js';

/** 取前几笔的读数：缺省 10；给了就必须是 1~50 的整数，否则阻断（坏输入不冒充正常）。 */
function limitOf(params: Record<string, unknown>): number {
  const raw = params.limit;
  if (raw === undefined || raw === null || raw === '') return 10;
  const n = typeof raw === 'string' && raw.trim() !== '' ? Number(raw.trim()) : raw;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > 50) {
    throw new BillPolicyError('POLICY_BAD_INPUT', 'limit 须为 1~50 的整数：' + String(raw));
  }
  return n;
}


function buildScene(): AnalysisScene {
  return {
  id: 'top',
  key: 'bill.analysis.trend',
  kind: 'top',
  title: m('skill-bill.analysis-scene-top.title'),
  family: 'bars',
  values: ({ params, db }) => {
    const limit = limitOf(params);
    const win = windowWithRecords(params, db, { fallback: 'all-time' });
    const items = expenseTop(win.records, limit);
    const peak = items.length === 0 ? 0 : Math.max(...items.map((r) => Math.abs(r.amount)));
    const sum = items.reduce((total, r) => total + Math.abs(r.amount), 0);
    const head = items[0];
    const chip = 'TOP ' + String(limit) + ' · ' + win.label;
    return {
      title: m('skill-bill.analysis-scene-top.title'),
      label: win.label,
      from: win.from,
      to: win.to,
      count: items.length,
      conclusion: head === undefined
        ? m('skill-bill.analysis-scene-top.c003', { p0: String(win.label) })
        : m('skill-bill.analysis-scene-top.c004', {
          p0: String(String(items.length)),
          p1: String(money(sum)),
          p2: String(textOrDash(dayOf(head.time))),
          p3: String(textOrDash(head.category)),
          p4: String(money(Math.abs(head.amount))),
        }),
      caliber: m('skill-bill.analysis-scene-top.c005', { p0: String(String(limit)) }),
      chips: [chip],
      payload: buildTrend('top', [...win.records], { limit }),
      kpi: kpiOf(win.records),
      page: {
        kpis: [],
        chips: [chip],
        charts: [],
        barGroups: [{
          title: m('skill-bill.analysis-scene-top.c006', { p0: String(String(items.length)) }),
          rows: items.map((r, i) => ({
            label: String(i + 1) + '. ' + textOrDash(r.category),
            text: m('skill-bill.analysis-scene-top.c007', {
              p0: String(money(Math.abs(r.amount))),
              p1: String(textOrDash(dayOf(r.time))),
              p2: String(textOrDash(r.note)),
            }),
            pct: peak === 0 ? 0 : round1((Math.abs(r.amount) / peak) * 100),
          })),
          emptyText: m('skill-bill.analysis-scene-top.c008'),
        }],
        listCards: [],
        factCards: [],
        empty: {
          text: m('skill-bill.analysis-scene-top.c009', { p0: String(win.label) }),
          hint: m('skill-bill.analysis-scene-top.c010'),
        },
      },
    };
  },
  };
}

export const sceneTop: AnalysisScene = buildScene();

/** 按语言重建本场景（#1197：文案经词条层，语言是运行期参数）。 */
export function sceneTopFor(language: string): AnalysisScene {
  return runWithLanguage(language, buildScene);
}
