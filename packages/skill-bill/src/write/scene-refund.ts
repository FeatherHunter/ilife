/** 场景件：记退款（`kind=refund`）——本件只是差异声明，块位序列住 `./template-flow.ts`。
 *
 * 本件的场景差异：退的是**哪一笔原支出**（`source_id` 那格，候选只列金额为负的记录、每条附一句「为什么是它」）、
 *   退款额写正数、分类一律「退款/冲销」、原支出只追加 `#已退款`（金额不动）。
 *   老侧两处不照抄：候选不给默认选中、超支不阻断（只写在净差那一句里）。
 */
import { runWithLanguage } from 'base-entries';
import { money2 } from './summaryRow.js';
import { wakeWordOf } from './typeBadge.js';
import type { Scene } from './scene.js';
import { bindFlowPages, candidatesFrom, crumbOf, idOf, promptButton, promptHead, textOf } from './template-flow.js';
import { m } from '../entries/index.js';

const KIND = 'refund';
const KEY = 'bill.record.add';
const WORD: string = wakeWordOf(KIND);
/** 退款一律落这个分类（老侧同一处口径）。 */
const CATEGORY = '退款/冲销';
/** 这一型自己多要的那一格：退的是哪一笔原支出。 */
const SOURCE_NAME = 'source_id';
/** 退款的标记与「已退」的标记（老侧同一处口径，属数据、不译）。 */
const TAG_REFUND = '#退款';
const TAG_REFUNDED = '#已退款';

/** 显示文案按语言取词（#1197：模块加载期不取词，构建场景时才取）。 */
const sourceLabel = () => m('skill-bill.write-scene-refund.c001');

function buildScene(): Scene {
  return {
  id: 'refund',
  key: KEY,
  kind: KIND,
  op: '',
  family: m('skill-bill.write-scene-refund.c002'),
  ...bindFlowPages({
    word: WORD,
    kind: KIND,
    category: CATEGORY,
    sourceSlot: {
      name: SOURCE_NAME,
      label: sourceLabel(),
      why: m('skill-bill.write-scene-refund.c003'),
    },
    candidates: (values) => {
      const amount = values.amount;
      return candidatesFrom({
        recent: values.input.recent,
        keep: (r) => r.amount < 0,
        same: (r) => amount !== null && Math.abs(r.amount + amount) <= 0.005,
        why: (r, same) => (same
          ? m('skill-bill.write-scene-refund.c004', { p0: String(money2(-r.amount)) })
          : m('skill-bill.write-scene-refund.c005')),
      });
    },
    chips: () => [m('skill-bill.write-scene-refund.c006'), m('skill-bill.write-scene-refund.c007', { p0: String(crumbOf(CATEGORY)) }), m('skill-bill.write-scene-refund.c008', { p0: String(TAG_REFUNDED) }), m('skill-bill.write-scene-refund.c009')],
    cards: (ctx) => {
      const { id: source, row: original } = ctx.source;
      const diff = ctx.amount === null || original === null
        ? null
        : Math.round((ctx.amount + original.amount) * 100) / 100;
      const over = ctx.amount !== null && original !== null && ctx.amount > -original.amount;
      return [
        { label: m('skill-bill.write-scene-refund.c010'), value: money2(ctx.amount), detail: m('skill-bill.write-scene-refund.c011', { p0: String(crumbOf(CATEGORY)) }) },
        {
          label: m('skill-bill.write-scene-refund.c012'),
          value: original === null ? m('skill-bill.write-scene-refund.c013') : money2(original.amount),
          detail: original === null
            ? (source === null ? m('skill-bill.write-scene-refund.c014') : m('skill-bill.write-scene-refund.c015', { p0: String(source) }))
            : '#' + source + '　' + original.category + '　' + original.time,
        },
        {
          label: m('skill-bill.write-scene-refund.c016'),
          value: diff === null ? m('skill-bill.write-scene-refund.c017') : money2(diff),
          detail: diff === null
            ? m('skill-bill.write-scene-refund.c018')
            : (diff === 0
              ? m('skill-bill.write-scene-refund.c019')
              : (over ? m('skill-bill.write-scene-refund.c020') : m('skill-bill.write-scene-refund.c021'))),
        },
      ];
    },
    flow: {
      first: {
        title: m('skill-bill.write-scene-refund.c022'),
        note: m('skill-bill.write-scene-refund.c023'),
        done: (ctx) => ctx.source.id !== null,
        state: (ctx) => (ctx.source.id === null ? m('skill-bill.write-scene-refund.c024') : m('skill-bill.write-scene-refund.c025', { p0: String(ctx.source.id) })),
        pick: {
          name: SOURCE_NAME,
          label: sourceLabel(),
          selectedId: (ctx) => ctx.source.id,
          hint: m('skill-bill.write-scene-refund.c026'),
        },
      },
      second: {
        title: m('skill-bill.write-scene-refund.c027'),
        note: m('skill-bill.write-scene-refund.c028', { p0: String(crumbOf(CATEGORY)) }),
        field: (slot, ctx) => ({
          name: slot.name,
          label: slot.name === 'amount' ? m('skill-bill.write-scene-refund.c029') : slot.name === 'category' ? m('skill-bill.write-scene-refund.c030') : slot.label,
          hint: slot.name === 'category' ? m('skill-bill.write-scene-refund.c031', { p0: String(crumbOf(CATEGORY)) }) : slot.hint,
          ...(slot.required ? { required: true } : {}),
          value: slot.name === 'category' && textOf(ctx.params['category']) === ''
            ? CATEGORY
            : textOf(ctx.params[slot.name]),
        }),
      },
      third: {
        title: m('skill-bill.write-scene-refund.c032'),
        note: (ctx) => (ctx.source.id === null
          ? m('skill-bill.write-scene-refund.c033', {
            p0: String(TAG_REFUNDED),
            p1: String(TAG_REFUND),
            p2: String(TAG_REFUNDED),
          })
          : m('skill-bill.write-scene-refund.c034', {
            p0: String(ctx.source.id),
            p1: String(TAG_REFUNDED),
            p2: String(TAG_REFUND),
            p3: String(TAG_REFUNDED),
          })),
      },
    },
    prompt: (ctx) => {
      const rowShown = ctx.source.row === null
        ? m('skill-bill.write-scene-refund.c035')
        : ctx.source.row.category + '　' + money2(ctx.source.row.amount) + '　' + ctx.source.row.time;
      const sourceShown = ctx.source.id === null
        ? m('skill-bill.write-scene-refund.c036')
        : '#' + ctx.source.id + '　' + rowShown;
      const idShown = ctx.source.id ?? m('skill-bill.write-scene-refund.c037');
      const head = promptHead(m('skill-bill.write-scene-refund.c038'), ctx.blocked);
      const accountShown = ctx.facts.account || m('skill-bill.write-scene-refund.c039');
      const ledgerShown = ctx.facts.ledger || m('skill-bill.write-scene-refund.c040');
      return {
        text: m('skill-bill.write-scene-refund.c041', {
          p0: String(head),
          p1: String(WORD),
          p2: String(sourceShown),
          p3: String(money2(ctx.amount)),
          p4: String(CATEGORY),
          p5: String(accountShown),
          p6: String(ledgerShown),
          p7: String(CATEGORY),
          p8: String(TAG_REFUND),
          p9: String(idShown),
          p10: String(idShown),
          p11: String(TAG_REFUNDED),
        }),
        label: promptButton(ctx.blocked, m('skill-bill.write-scene-refund.c042')),
      };
    },
    receiptTail: (input) => [
      { label: m('skill-bill.write-scene-refund.c043'), value: m('skill-bill.write-scene-refund.c044', { p0: String(input.receipt.affectedRows) }), detail: m('skill-bill.write-scene-refund.c045') },
      {
        label: m('skill-bill.write-scene-refund.c046'),
        value: idOf(input.params[SOURCE_NAME]) === null ? TAG_REFUND : TAG_REFUND + ' → ' + TAG_REFUNDED,
        detail: m('skill-bill.write-scene-refund.c047'),
      },
    ],
    receiptNote: (input) => {
      const source = idOf(input.params[SOURCE_NAME]);
      const sourceTail = source === null
        ? m('skill-bill.write-scene-refund.c048')
        : m('skill-bill.write-scene-refund.c049', { p0: String(source), p1: String(TAG_REFUNDED) });
      return {
        msg: m('skill-bill.write-scene-refund.c050', { p0: String(TAG_REFUND), p1: String(sourceTail) }),
        detail: m('skill-bill.write-scene-refund.c051', { p0: String(TAG_REFUND), p1: String(TAG_REFUNDED) }),
        icon: 'ok',
      };
    },
    receiptEyebrow: WORD,
  }),
  };
}

export const SCENE: Scene = buildScene();

/** 按语言重建本场景（#1197：文案经词条层，语言是运行期参数）。 */
export function sceneRefund(language: string): Scene {
  return runWithLanguage(language, buildScene);
}
