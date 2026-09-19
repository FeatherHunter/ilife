/** 场景件：**看高频**（`kind = 'frequent'`，命令 `bill.analysis.trend`）——本件只是差异声明与取值，
 *  块位序列住 `./template-bars.ts`（族＝读数＋条）。
 *
 * 老侧对应件：`scripts/analysis/cli.py` 的 `cmd_top_freq`（`:597-629`）
 *  ＋ 模板 `templates/分析/analysis_view.html` 的 `renderTopFreq`（`:745-766`）。
 *
 * 本件的差异（照老侧那一页逐点对）：
 *   ① **参数**与「看大额」同一套（老侧只有 `--from`／`--to`）：`limit` 缺省 10、给了必须是 1~50 的整数；
 *      窗口给 `month` 取整月、给 `start`／`end` 取闭区间（缺一即缺槽位阻断），都不给＝全部时间；
 *   ② **按笔数排，不是按金额**（老侧 `items.sort(key=count, reverse=True)` 同）：先按 **L1 分类**把支出记录归堆
 *      （`./agg.js` 的 `aggBy(…, l1Of(category), { direction: 'expense' })`），再按笔数降序取前 N；
 *      每一堆的金额合计、单均、最近一笔都**在同一批支出记录里**算（老侧那个 `defaultdict` 循环的等价物）；
 *   ③ **笔数并列时的次序**与老侧不同：老侧靠取数顺序（`fetch_all` 的倒序）稳定排序，结果依赖读取顺序；
 *      新侧在笔数相同处按**金额大的先出**、再按分类名升序兜底，读数确定可复现；
 *   ④ 老侧「最近一笔」另占一行，新侧并进数值栏那句话（`N 笔 · 金额 元 · 单均 X · 最近 日期`，#681 偏好 3），
 *      条长按最大笔数折算；
 *   ⑤ 期间芯片＝`TOP N · 期间`（老侧 `TOP ${limit} · ${period}` 那枚 `.filter-chip`）；
 *   ⑥ 载荷＝`./views.js` 的 `buildTrend('freq', …)`（`limit` 照传）。
 */
import type { BillDb, BillRow } from '../fetch/db.js';
import { BillPolicyError } from '../fetch/errors.js';
import { l1Of } from '../shared/category.js';
import { aggBy, dayOf, filterOf, kpiOf, round1, round2, windowWithRecords } from './agg.js';
import { NO_WINDOW, money, textOrDash } from './pageParts.js';
import type { AnalysisScene } from './scene.js';
import { buildTrend } from './views.js';

/** 取前几名的读数：缺省 10；给了就必须是 1~50 的整数，否则阻断（坏输入不冒充正常）。 */
function limitOf(params: Record<string, unknown>): number {
  const raw = params.limit;
  if (raw === undefined || raw === null || raw === '') return 10;
  const n = typeof raw === 'string' && raw.trim() !== '' ? Number(raw.trim()) : raw;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > 50) {
    throw new BillPolicyError('POLICY_BAD_INPUT', 'limit 须为 1~50 的整数：' + String(raw));
  }
  return n;
}


/** 每个一级分类最近一笔的时刻（就在传进来的这一批记录里算；分类名空的不立堆）。 */
function lastTimesOf(records: readonly BillRow[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const r of records) {
    const key = l1Of(r.category);
    if (key === '') continue;
    const cur = out.get(key);
    if (cur === undefined || r.time > cur) out.set(key, r.time);
  }
  return out;
}

export const sceneTopFreq: AnalysisScene = {
  id: 'top_freq',
  key: 'bill.analysis.trend',
  kind: 'frequent',
  title: '看高频',
  family: 'bars',
  values: ({ params, db }) => {
    const limit = limitOf(params);
    const win = windowWithRecords(params, db, { fallback: 'all-time' });
    const batch = filterOf(win.records, { direction: 'expense' });
    const buckets = aggBy(batch, (r) => l1Of(r.category), { direction: 'expense' });
    const lastAt = lastTimesOf(batch);
    const items = [...buckets]
      .sort((a, b) => b.count - a.count || b.value - a.value || a.key.localeCompare(b.key))
      .slice(0, limit);
    const peak = items.length === 0 ? 0 : Math.max(...items.map((x) => x.count));
    const head = items[0];
    const second = items[1];
    const chip = 'TOP ' + String(limit) + ' · ' + win.label;
    return {
      title: '看高频',
      label: win.label,
      from: win.from,
      to: win.to,
      count: items.length,
      conclusion: head === undefined
        ? win.label + '：没有支出记录。'
        : '按支出笔数排，最多的是「' + head.key + '」' + String(head.count) + ' 笔（合计 '
          + money(head.value) + ' 元）'
          + (second === undefined
            ? '。'
            : '；其次是「' + second.key + '」' + String(second.count) + ' 笔。'),
      caliber: '按一级分类的支出笔数从多到少取前 ' + String(limit) + ' 名（不是按金额；笔数相同处金额大的先出）；'
        + '金额、单均、最近一笔都按这一批支出记录算；转账与收入都不上这一页。',
      chips: [chip],
      payload: buildTrend('freq', [...win.records], { limit }),
      kpi: kpiOf(win.records),
      page: {
        kpis: [],
        chips: [chip],
        charts: [],
        barGroups: [{
          title: '高频消费排行（' + String(items.length) + ' 类）',
          rows: items.map((x, i) => ({
            label: String(i + 1) + '. ' + x.key,
            text: String(x.count) + ' 笔 · ' + money(x.value) + ' 元 · 单均 ' + money(round2(x.value / x.count))
              + ' · 最近 ' + textOrDash(dayOf(lastAt.get(x.key) ?? '')),
            pct: peak === 0 ? 0 : round1((x.count / peak) * 100),
          })),
          emptyText: '这段时间还没有支出记录',
        }],
        listCards: [],
        factCards: [],
        empty: {
          text: win.label + ' 还没有支出记录。',
          hint: '先说「记支出」记一笔，回来看这里就有数了。',
        },
      },
    };
  },
};
