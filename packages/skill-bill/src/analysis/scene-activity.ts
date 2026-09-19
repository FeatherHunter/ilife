/** 场景件：**看活跃**（`kind = 'activity'`，命令 `bill.analysis.trend`）——本件只是差异声明与取值，
 *  块位序列住 `./template-bars.ts`（族＝读数＋条）。
 *
 * 老侧对应件：`scripts/analysis/cli.py` 的 `cmd_activity`（`:695-722`，取数走 `_fetch()` 全库）
 *  ＋ 模板 `templates/分析/analysis_view.html` 的 `renderActivity`（`:824-848`）。
 *
 * 本件的差异（照老侧那一页逐点对）：
 *   ① **无参数、取全库**（老侧同）；页头只出一枚芯片「共 N 条记录」（老侧 `.filter-chip` 的等价物），
 *      这一页不报收支读数，故不出读数卡（老侧那页也没有）；
 *   ② 周几分堆**周一到周日七条恒出**（老侧 `weekday_names` 七条全出、零值也出行），条长按最忙的一天折算；
 *   ③ 时段分堆**只出笔数 > 0 的小时**（老侧 `activeHours = hours.filter(h => h.count > 0)` 就是这条口径，
 *      新侧照抄；与 #688 裁定 3「零值不出柱身」同向），条长按最忙的那个小时折算；
 *   ④ 星期与小时都从记录时刻现算（老侧 `re.match`／`re.search` 两条正则的等价物，写成局部函数）；
 *   ⑤ 载荷＝`./views.js` 的 `buildTrend('activity', …)`。
 *
 *  计数口径：本页数的是「记了几笔」（不是收支金额）——转账记录也是记录，一并算在里面；
 *  这一点与 `./agg.js` 各聚合件（转账不入收支）不冲突：那几件算的是钱，本件算的是笔数。
 */
import type { BillRow } from '../fetch/db.js';
import { allRecords, kpiOf, round1 } from './agg.js';
import { NO_WINDOW } from './pageParts.js';
import type { AnalysisScene } from './scene.js';
import { buildTrend } from './views.js';

/** 一周七天的名字（逐字照老侧 `weekday_names` 的次序；`getUTCDay()` 是 0＝周日）。 */
const WEEKDAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const;

/** 记录时刻落在星期几；时间串认不得＝空串（这一笔不归堆）。 */
function weekdayOf(time: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(time);
  if (m === null) return '';
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return WEEKDAY_NAMES[(d.getUTCDay() + 6) % 7];
}

/** 记录时刻落在几点（两位小时串）；时间串认不得＝空串（这一笔不归堆）。 */
function hourOf(time: string): string {
  const m = /^\d{4}-\d{2}-\d{2} (\d{2}):/.exec(time);
  return m === null ? '' : m[1];
}

/** 一格的桶（键 ＋ 计数）。 */
interface Bucket {
  readonly key: string;
  readonly count: number;
}

/** 按某个键分堆（只收键非空的记录）。 */
function tally(records: readonly BillRow[], keyOf: (r: BillRow) => string): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of records) {
    const k = keyOf(r);
    if (k === '') continue;
    out.set(k, (out.get(k) ?? 0) + 1);
  }
  return out;
}

/** 计数最大的一格（并列取先出现的那一格；没有桶＝null）。 */
function peakOf(buckets: readonly Bucket[]): Bucket | null {
  let best: Bucket | null = null;
  for (const b of buckets) if (best === null || b.count > best.count) best = b;
  return best;
}

export const sceneActivity: AnalysisScene = {
  id: 'activity',
  key: 'bill.analysis.trend',
  kind: 'activity',
  title: '看活跃',
  family: 'bars',
  values: ({ db }) => {
    const rows = allRecords(db);
    const total = rows.length;
    const byWeekday = tally(rows, (r) => weekdayOf(r.time));
    const byHour = tally(rows, (r) => hourOf(r.time));
    const weekdays: Bucket[] = WEEKDAY_NAMES.map((name) => ({ key: name, count: byWeekday.get(name) ?? 0 }));
    const hours: Bucket[] = [...byHour.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => a.key.localeCompare(b.key));
    const peakDay = weekdays.reduce((max, w) => Math.max(max, w.count), 0);
    const peakHour = hours.reduce((max, h) => Math.max(max, h.count), 0);
    const busiestDay = peakOf(weekdays);
    const busiestHour = peakOf(hours);
    return {
      title: '看活跃',
      label: '全部时间',
      from: NO_WINDOW,
      to: NO_WINDOW,
      count: total,
      conclusion: total === 0
        ? '全库还没有记录，看不出活跃规律。'
        : '一共 ' + String(total) + ' 笔记录，记最多的是' + String(busiestDay === null ? '' : busiestDay.key)
          + '（' + String(busiestDay === null ? 0 : busiestDay.count) + ' 笔）'
          + (busiestHour === null
            ? '。'
            : '；最常记的时段是 ' + busiestHour.key + ' 点（' + String(busiestHour.count) + ' 笔）。'),
      caliber: '按记录时刻的星期与小时归堆：周一到周日七行恒出，时段只列有记录的小时；转账记录也是记录，一并算在内。',
      chips: ['共 ' + String(total) + ' 条记录'],
      payload: buildTrend('activity', [...rows]),
      kpi: kpiOf(rows),
      page: {
        kpis: [],
        chips: [],
        charts: [],
        barGroups: [
          {
            title: '周几分布（周一 ~ 周日）',
            rows: weekdays.map((w) => ({
              label: w.key,
              text: String(w.count) + ' 笔',
              pct: peakDay === 0 ? 0 : round1((w.count / peakDay) * 100),
            })),
            emptyText: '还没有记录，看不出周几记得多',
          },
          {
            title: '时段分布（' + String(hours.length) + ' 个时段）',
            rows: hours.map((h) => ({
              label: h.key + ' 点',
              text: String(h.count) + ' 笔',
              pct: peakHour === 0 ? 0 : round1((h.count / peakHour) * 100),
            })),
            emptyText: '还没有记录，看不出哪个时段记得多',
          },
        ],
        listCards: [],
        factCards: [],
        empty: {
          text: '全库还没有记录，看不出活跃规律。',
          hint: '先说「记支出」或「记收入」记一笔，回来看这里就有数了。',
        },
      },
    };
  },
};
