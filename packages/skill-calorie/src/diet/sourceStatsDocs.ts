/** #274 · 食品来源统计页装配（老实物 `source_stats.html` 5539 B：2 读数＋按来源分组占比条）。
 *
 * **本件是从 `diet/nutritionPortDocs.ts` 就地搬出来的**（那里原来与服务 ⑥ 类四页的另三支同住，
 * 本包告警线台账记它 492 行超线）：编排者 2026-09-15 裁定 (b)——⑤ 食品库类页＝`food_search`／
 * `dedupe_report`／`source_stats` 三张（`t425-融合基准.md` §一 第 ⑤ 类），来源统计的**页面**属 #274、
 * 原来却住在 #275 的件里，是归属错配；搬成姊妹件也正是那条台账行写好的拆法第一步。
 *
 * 搬迁口径照 #393 那一轮：先**函数体原样照抄**搬一次并比产物 sha256（逐字节相同，
 * 读数见 `docs/skills/skill-calorie/t274-来源统计页搬迁.md`）；搬完再按 `t425` §五 第 ⑤ 类骨架补缺的
 * 四行——眉标行（唤醒词 · 饮食 ＋ 徽章）／结论句一条／页内导航／来源脚注，并把复制区从
 * 「只有一颗点了没反应的「复制日志」按钮」补成**双按钮＋日志第 4 段＝本次命令原文**（裁定 7）。
 * 取数（`buildSourceStatsView` 住 `./nutritionPort.ts`）与接线（`./library.ts` 的 `viewSourceStats`）都留原地。
 */
import { renderCaliberLine, renderChartBlock, renderDataTable, renderKpiGrid, renderTocBlock } from 'base-paint/blocks';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { DB_FILENAME } from '../paths.js';
import { nowStamp } from '../render/receipt.js';
import type { DataTextInput } from 'base-paint';
import type { SourceStatsView } from './nutritionPort.js';
import { m } from '../entries/index.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** head 标题（与 `diet/` 其余件的域口径一致）。 */
const DOC_TITLE = (): string => m('skill-calorie.diet-sourceStatsDocs.c024');

/** 类型徽章（`t425` §五 第 1 行右槽）：本类四页同属食品库。 */
const BADGE = (): string => m('skill-calorie.diet-sourceStatsDocs.c025');

/** 页内一张卡（`id` 即页内导航的锚点，导航项按同一份清单生成）。 */
interface Card { readonly id: string; readonly label: string; readonly html: string }

function shell(card: Card): string {
  return '<section id="' + card.id + '">' + card.html + '</section>';
}

/* ── 食品来源统计（老实物 source_stats.html：来源数＋总数＋按来源分组） ── */

export function buildSourceStatsDoc(v: SourceStatsView, command: string): string {
  const cards: Card[] = [
    {
      id: 'sec-count',
      label: m('skill-calorie.diet-sourceStatsDocs.c001'),
      html: renderKpiGrid([
        { label: m('skill-calorie.diet-sourceStatsDocs.c002'), value: String(v.sources), unit: m('skill-calorie.diet-sourceStatsDocs.c003') },
        /* #496 · 原写 `nutrition_products（下架已排除）`——库表名上屏（审查件第 49 条）。 */
        { label: m('skill-calorie.diet-sourceStatsDocs.c004'), value: String(v.total), unit: m('skill-calorie.diet-sourceStatsDocs.c005'), detail: m('skill-calorie.diet-sourceStatsDocs.c006') },
      ]),
    },
  ];
  let charts = false;
  if (v.items.length > 0) {
    cards.push({
      id: 'sec-chart',
      label: m('skill-calorie.diet-sourceStatsDocs.c007'),
      html: renderChartBlock({
        kind: 'bar',
        title: m('skill-calorie.diet-sourceStatsDocs.c008'),
        input: { items: v.items.map((it) => ({ label: it.source, value: it.count })) },
      }),
    });
    charts = true;
  }
  cards.push({
    id: 'sec-table',
    label: m('skill-calorie.diet-sourceStatsDocs.c009'),
    html: renderDataTable({
      columns: [
        { key: 'source', label: m('skill-calorie.diet-sourceStatsDocs.c010') },
        { key: 'count', label: m('skill-calorie.diet-sourceStatsDocs.c011'), align: 'right' },
        { key: 'pct', label: m('skill-calorie.diet-sourceStatsDocs.c012'), align: 'right' },
      ],
      rows: v.items.map((it) => ({ source: it.source, count: it.count, pct: it.pct })),
      /* #581 · 表题只留题名：下架口径与「未知」口径各走一条口径行（#496 原 caption 里的源码词早已改成人话）。 */
      caption: m('skill-calorie.diet-sourceStatsDocs.c013'),
      emptyText: m('skill-calorie.diet-sourceStatsDocs.c014'),
    }) + renderCaliberLine(m('skill-calorie.diet-sourceStatsDocs.c015'))
      + renderCaliberLine(m('skill-calorie.diet-sourceStatsDocs.c016')),
  });
  const envelope: DataTextInput['envelope'] = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.source-stats',
    data: {
      metrics: metricsOf({ total: v.total, sources: v.sources }),
    },
  };
  const body = [
    renderTocBlock({ items: cards.map((c) => ({ id: c.id, text: c.label })) }),
    cards.map(shell).join(''),
    /* 口径说明行（§五 第 13 行）：占比怎么算的，页面上说清（表题的「按来源统计」不重复一遍）。 */
    renderCaliberLine(m('skill-calorie.diet-sourceStatsDocs.c017')),
    copyArea({
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({
          command, source: m('skill-calorie.diet-sourceStatsDocs.c018', { p0: String(DB_FILENAME) }), actionAt: nowStamp(), version: DOC_VERSION,
        }),
      },
    }),
    /* 来源脚注一行（§五 第 15 行；裁定 2-补：走公共层普通小字行，不走 `notice` 深底块）。 */
    renderCaliberLine(m('skill-calorie.diet-sourceStatsDocs.c019', { p0: String(v.total) })),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE(),
    title: m('skill-calorie.diet-sourceStatsDocs.c020'),
    pageUi: true,
    eyebrow: '',
    subtitle: null,
    metaLeft: m('skill-calorie.diet-sourceStatsDocs.c021'),
    badge: BADGE(),
    summary: sourceStatsSummary(v),
    content: body,
    charts,
  });
}

/** 结论句（§五 第 3 行，句内含本页读数）：来源数与最多的一条各自报数。 */
function sourceStatsSummary(v: SourceStatsView): string {
  const top = v.items[0];
  const head = m('skill-calorie.diet-sourceStatsDocs.c022', { p0: String(v.total), p1: String(v.sources) });
  if (top === undefined) return head + '。';
  return m('skill-calorie.diet-sourceStatsDocs.c023', {
    p0: String(head),
    p1: String(top.source),
    p2: String(top.count),
    p3: String(top.pct),
  });
}
