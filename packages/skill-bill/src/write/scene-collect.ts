/** 场景件：记收回（`kind=collect`）——本件只是差异声明，块位序列住 `./template-flow.ts`。
 *
 * 本件的场景差异：候选**只列带 `#借出` 且还带 `#未还` 的记录**（老侧 `scripts/render_write.py:312` 的 `pool`，已还的不列）、
 *   收回这一笔落「借贷/收回」＋ `#收回`、金额写正数，原记录把 `#未还` 换成 `#已还`（金额不动）。
 *   消标与金额都要用户确认，不按最近一笔顶替（施工图第二节「缺项阻断」那一格）。
 *
 *  #1204 第三件（多语言文本外置）：本件的用户可见文案不住这里，住 `../entries/zh.ts`（中文基准）
 *  与 `../entries/en.ts`（英文列）；`sceneCollect(language)` 按语言取值，`SCENE` 是 `zh`
 *  的那一份（不启用多语言时与改造前逐字节相同）。写入库的用户数据（分类与标签，
 *  跟'餐饮'同类）不进词条表：`CATEGORY` 与 `TAG_*` 留在源码，展示侧保持源语言，
 *  插标签的整句以 `{tag}`／`{tagUnpaid}`… 为参（运行时值恒为中文标签）。
 *  参数名（`source_id`）与命令键冻结，不进词条表。`WORD`（`wakeWordOf` 运行时算）不动。
 *  `family` 与回执计数行复用记分期那一组的 key（同一概念只一处定义）。
 */
import { resolve } from 'base-entries';
import { SKILL_BILL_CATALOG, type SkillBillMessageId } from '../entries/index.js';
import { money2 } from './summaryRow.js';
import { wakeWordOf } from './typeBadge.js';
import type { Scene } from './scene.js';
import { bindFlowPages, candidatesFrom, crumbOf, idOf, promptButton, promptHead, textOf } from './template-flow.js';

const KIND = 'collect';
const KEY = 'bill.record.add';
const WORD: string = wakeWordOf(KIND);
/** 收回一律落这个分类（老侧同一处口径）。用户数据：写入库的分类，不进词条表。 */
const CATEGORY = '借贷/收回';
/** 这一格：哪一笔借出收回来了。 */
const SOURCE_NAME = 'source_id';
/** 借贷标签：只列没还的那一批。用户数据：写入库的标签，不进词条表。 */
const TAG_LEND = '#借出';
const TAG_UNPAID = '#未还';
const TAG_PAID = '#已还';
const TAG_COLLECT = '#收回';

/** 按语言取本件的差异声明（key 拼错编译期红：`SkillBillMessageId` 从 zh 表派生）。 */
export function sceneCollect(language: string = 'zh'): Scene {
  const t = (id: SkillBillMessageId, params?: { readonly [key: string]: string | number }): string =>
    resolve(SKILL_BILL_CATALOG, language, id, params);
  return {
    id: 'collect',
    key: KEY,
    kind: KIND,
    op: '',
    family: t('installment.family'),
    ...bindFlowPages({
      word: WORD,
      kind: KIND,
      category: CATEGORY,
      sourceSlot: {
        name: SOURCE_NAME,
        label: t('scene-collect.source.label'),
        why: t('scene-collect.source.why', { tag: TAG_UNPAID }),
      },
      candidates: (values) => {
        const amount = values.amount;
        return candidatesFrom({
          recent: values.input.recent,
          keep: (r) => r.note.includes(TAG_LEND) && r.note.includes(TAG_UNPAID),
          same: (r) => amount !== null && Math.abs(Math.abs(r.amount) - amount) <= 0.005,
          why: (_r, same) => (same
            ? t('scene-collect.candidates.why-same', { tag: TAG_UNPAID })
            : t('scene-collect.candidates.why-different', { tag: TAG_UNPAID })),
        });
      },
      chips: () => [
        t('scene-collect.chips.positive'),
        t('scene-collect.chips.category', { crumb: crumbOf(CATEGORY) }),
        t('scene-collect.chips.swap', { tagUnpaid: TAG_UNPAID, tagPaid: TAG_PAID }),
        t('scene-collect.chips.amount-steady'),
      ],
      cards: (ctx) => {
        const { id: source, row: original } = ctx.source;
        const diff = ctx.amount === null || original === null
          ? null
          : Math.round((ctx.amount - Math.abs(original.amount)) * 100) / 100;
        return [
          {
            label: t('scene-collect.cards.amount.label'),
            value: money2(ctx.amount),
            detail: t('scene-collect.cards.amount.detail', { crumb: crumbOf(CATEGORY) }),
          },
          {
            label: t('scene-collect.cards.source.label'),
            value: original === null ? t('scene-collect.cards.source.unknown') : money2(original.amount),
            detail: source === null
              ? t('scene-collect.cards.source.no-id')
              : original === null
                ? t('scene-collect.cards.source.missing', { source })
                : t('scene-collect.cards.source.with-row', { source, category: original.category, time: original.time }),
          },
          {
            label: t('scene-collect.cards.diff.label'),
            value: diff === null ? t('scene-collect.cards.diff.pending') : money2(diff),
            detail: diff === null
              ? t('scene-collect.cards.diff.pending-detail')
              : (diff === 0 ? t('scene-collect.cards.diff.full') : t('scene-collect.cards.diff.partial')),
          },
        ];
      },
      note: () => ({
        msg: t('scene-collect.note.msg'),
        detail: t('scene-collect.note.detail', { tagLend: TAG_LEND, tagUnpaid: TAG_UNPAID }),
        icon: 'info',
      }),
      flow: {
        first: {
          title: t('scene-collect.flow.first.title'),
          note: t('scene-collect.flow.first.note', { tagLend: TAG_LEND, tagUnpaid: TAG_UNPAID }),
          done: (ctx) => ctx.source.id !== null,
          state: (ctx) => {
            const sid = ctx.source.id;
            return sid === null
              ? t('scene-collect.cards.source.unknown')
              : t('scene-collect.flow.first.state.known', { id: sid });
          },
          pick: {
            name: SOURCE_NAME,
            label: t('scene-collect.source.label'),
            selectedId: (ctx) => ctx.source.id,
            hint: t('scene-collect.flow.first.pick.hint'),
          },
        },
        second: {
          title: t('scene-collect.flow.second.title'),
          note: t('scene-collect.flow.second.note', { crumb: crumbOf(CATEGORY) }),
          field: (slot, ctx) => ({
            name: slot.name,
            label: slot.name === 'amount'
              ? t('scene-collect.cards.amount.label')
              : slot.name === 'category' ? t('scene-collect.flow.second.field.category') : slot.label,
            hint: slot.name === 'category'
              ? t('scene-collect.flow.second.field.category-hint', { crumb: crumbOf(CATEGORY) })
              : slot.hint,
            ...(slot.required ? { required: true } : {}),
            value: slot.name === 'category' && textOf(ctx.params['category']) === ''
              ? CATEGORY
              : textOf(ctx.params[slot.name]),
          }),
        },
        third: {
          title: t('scene-collect.flow.third.title'),
          note: (ctx) => {
            const sid = ctx.source.id;
            return sid === null
              ? t('scene-collect.flow.third.note.pending', { tagUnpaid: TAG_UNPAID, tagPaid: TAG_PAID, tagCollect: TAG_COLLECT })
              : t('scene-collect.flow.third.note.done', { id: sid, tagUnpaid: TAG_UNPAID, tagPaid: TAG_PAID, tagCollect: TAG_COLLECT });
          },
        },
      },
      prompt: (ctx) => {
        const sid = ctx.source.id;
        const row = ctx.source.row;
        const sourceText = sid === null
          ? t('scene-collect.prompt.source.missing')
          : row === null
            ? t('scene-collect.prompt.source.no-row', { id: sid })
            : t('scene-collect.prompt.source.with-row', {
              id: sid, category: row.category, amount: money2(row.amount), time: row.time,
            });
        return {
          text: promptHead(t('scene-collect.prompt.head'), ctx.blocked)
            + t('scene-collect.prompt.body', {
              wakeWord: WORD,
              source: sourceText,
              amount: money2(ctx.amount),
              category: CATEGORY,
              account: ctx.facts.account || t('scene-collect.prompt.account-missing'),
              ledger: ctx.facts.ledger || t('scene-collect.prompt.ledger-missing'),
              sourceId: sid ?? t('scene-collect.prompt.source.missing'),
              tagCollect: TAG_COLLECT,
              tagUnpaid: TAG_UNPAID,
              tagPaid: TAG_PAID,
            }),
          label: promptButton(ctx.blocked, t('scene-collect.prompt.label')),
        };
      },
      receiptTail: (input) => [
        {
          label: t('installment.receipt.rows-label'),
          value: t('scene-collect.receipt.rows-count', { count: input.receipt.affectedRows }),
          detail: t('installment.receipt.rows-detail'),
        },
        {
          label: t('scene-collect.receipt.pair.label'),
          value: idOf(input.params[SOURCE_NAME]) === null ? TAG_COLLECT : TAG_UNPAID + ' → ' + TAG_PAID,
          detail: t('scene-collect.receipt.pair.detail'),
        },
      ],
      receiptNote: (input) => {
        const source = idOf(input.params[SOURCE_NAME]);
        return {
          msg: source === null
            ? t('scene-collect.receipt-note.msg.without-source', { tagCollect: TAG_COLLECT })
            : t('scene-collect.receipt-note.msg.with-source', { tagCollect: TAG_COLLECT, source, tagPaid: TAG_PAID }),
          detail: t('scene-collect.receipt-note.detail', { tagUnpaid: TAG_UNPAID }),
          icon: 'ok',
        };
      },
      receiptEyebrow: WORD,
    }),
  };
}

export const SCENE: Scene = sceneCollect('zh');
