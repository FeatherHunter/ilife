/** 拍账单的「图片识别外置」通道（**唯一定义地**）：这一条通道只做一件事——把「已收到几张图／
 *  哪几个要素还缺／补齐后照抄哪条命令」讲清，并给成可复制的一段。

 * 谁在用（唯一调用点，指名）：
 *   `src/write/scene-photo.ts`——拍账单那件场景件的采集页取本件这五个名字；
 *   `ESCAPE_FIELDS` 另被它用来拼三要素填空那三格的槽位（`ESCAPE_SLOTS`）。
 *   **为什么另立成件、不搬进那件场景件**：搬进去只是把「一个件对外给的东西多于五个」从共用位挪到场景位，
 *   形状超线没解决（派单点名的拆法就是这一句）；本件自成一件事，搬出来之后两边各自数得清。

 * 本件只吃普通数据、零跨目录引用（与同目录的 `photoEscape.ts` 同一形状）：入参是「本次参数」「缺项表」
 *  这类普通数据，**不引** `src/write/` 下的件，也不认 `CollectInput`／`ReceiptInput`。
 *  可引的只有：`base-paint/blocks`（现成组件）、同目录共用件。

 * 件名取自它的活：**图片识别在本仓之外办**（本仓不装识别引擎，也不做上传控件；老侧同样没有，
 *  只有一行「已收到 N 张账单图片」）。

 * 口径（三件事一处定义，别处不许再写第二份）：
 *   - **拍账单的三个要素**：金额／分类／时间，名字出自施工图 `t407-页面块清单-16词.md` 第二节点名的
 *     「文字三要素填空（金额／分类／时间）」那一行，只在本件的 `ESCAPE_FIELDS` 一处定义（明示表、提示话术两处都引它）；
 *   - **图片识别在本仓之外办**：页上只说明「收图在哪、读图在哪」，不做上传控件；
 *   - **缺项即不出复制指令**：与代表页同口径，阻断判定与写库指令原文仍由 `src/write/blockedSlots.ts`
 *     与 `src/write/photoEscape.ts` 的 `blockedPromptOf` 管，本件只把那段原文串进那段话里。

 * 本件不自造任何页面骨架与样式：明示表走 `renderDataTable`，提示条走 `renderFeedbackBlock`。
 */
import { m } from '../entries/index.js';
import { renderDataTable, renderFeedbackBlock } from 'base-paint/blocks';
import type { ToastInput } from 'base-paint/blocks';
import { blockedPromptOf } from './photoEscape.js';
import { textOf } from './recentPicks.js';

/** 拍账单的图片数入参：本仓只说明「收到了几张」，不做上传控件（老侧也没有图片入口）。 */
export interface PhotoScale {
  /** 已收到的图片张数（本次用户交上来的）。 */
  readonly count: number;
  /** 这些图现在在哪（如「助手那边／外部识别工具」）：本仓不落图片，兜底的归档位由助手那边给。 */
  readonly where: string;
}

/** 拍账单三要素（**唯一定义地**）：金额／分类／时间；明示表与提示话术都引这张表。 */
export const ESCAPE_FIELDS: readonly {
  readonly name: string;
  readonly label: string;
  readonly hint: string;
}[] = [
  { name: 'amount', label: m('skill-bill.write-outsideScan.c001'), hint: m('skill-bill.write-outsideScan.c002') },
  { name: 'category', label: m('skill-bill.write-outsideScan.c003'), hint: m('skill-bill.write-outsideScan.c004') },
  { name: 'time', label: m('skill-bill.write-outsideScan.c005'), hint: m('skill-bill.write-outsideScan.c006') },
];

/** 已收到的图片数说明（拍账单必备块）：**各占独立一块**，不与打标提示、来源提示共容器。 */
export function imageNote(scale: PhotoScale): string {
  const n = Number.isFinite(scale.count) && scale.count > 0 ? Math.floor(scale.count) : 0;
  const toast: ToastInput = {
    msg: m('skill-bill.write-outsideScan.c007', { p1: String(n) }),
    detail: n === 0
      ? m('skill-bill.write-outsideScan.c008')
      : m('skill-bill.write-outsideScan.c009', { p1: String(scale.where) }),
    icon: 'info',
    badge: { text: m('skill-bill.write-outsideScan.c010'), type: 'warn' },
    lines: [
      m('skill-bill.write-outsideScan.c011', { p1: String(scale.where) }),
      m('skill-bill.write-outsideScan.c012'),
      m('skill-bill.write-outsideScan.c013', { p1: String(ESCAPE_FIELDS.map((f) => f.label).join('／')) }),
    ],
  };
  return renderFeedbackBlock({ title: m('skill-bill.write-outsideScan.c014'), toast });
}

/** 外部识别通道那张明示卡：三要素逐条 ＋ 每一步在谁那里办 ＋ 缺了会怎样。
 *  第 3 轮返工（上级追加的定点小修）：原先四列里有一列「参数名」，把库列名（`amount`／`category`／`time`）
 *  印到了可见正文上——全批 32 页里就这一处区外印了库列名。整列删掉：要素那一列写的就是中文名，
 *  下一张表照旧交代每一步在谁那里办。命令原文仍只活在复制载荷区（`pre` 与 `data-t`），本件不碰。 */
export function escapeCard(input: {
  readonly params: Record<string, unknown>;
}): string {
  const rows = ESCAPE_FIELDS.map((f) => ({
    field: f.label,
    现在: textOf(input.params[f.name]) === '' ? m('skill-bill.write-outsideScan.c015') : textOf(input.params[f.name]),
    找谁: m('skill-bill.write-outsideScan.c016'),
  }));
  const missing = ESCAPE_FIELDS.filter((f) => textOf(input.params[f.name]) === '');
  return renderDataTable({
    columns: [
      { key: 'field', label: m('skill-bill.write-outsideScan.c017') },
      { key: m('skill-bill.write-outsideScan.c018'), label: m('skill-bill.write-outsideScan.c019') },
      { key: m('skill-bill.write-outsideScan.c020'), label: m('skill-bill.write-outsideScan.c021') },
    ],
    rows,
    caption: m('skill-bill.write-outsideScan.c022', { p1: missing.length === 0
        ? m('skill-bill.write-outsideScan.c038')
        : m('skill-bill.write-outsideScan.c039', { p1: String(missing.map((f) => f.label).join('、')) }) }),
  }) + renderDataTable({
    columns: [
      { key: 'step', label: m('skill-bill.write-outsideScan.c023') },
      { key: 'who', label: m('skill-bill.write-outsideScan.c024') },
      { key: 'detail', label: m('skill-bill.write-outsideScan.c025') },
    ],
    rows: [
      { step: m('skill-bill.write-outsideScan.c026'), who: m('skill-bill.write-outsideScan.c027'), detail: m('skill-bill.write-outsideScan.c028') },
      {
        step: m('skill-bill.write-outsideScan.c029'),
        who: m('skill-bill.write-outsideScan.c030'),
        detail: m('skill-bill.write-outsideScan.c031', { p1: String(ESCAPE_FIELDS.map((f) => f.label).join('／')) }),
      },
      { step: m('skill-bill.write-outsideScan.c032'), who: m('skill-bill.write-outsideScan.c033'), detail: m('skill-bill.write-outsideScan.c034') },
    ],
    caption: m('skill-bill.write-outsideScan.c035'),
  });
}

/** 外部识别通道那段可复制的话：说清「识别在本仓之外办完」，并给出补齐后照抄重跑的那条命令。
 *  那条命令原文由 `photoEscape.ts` 的 `blockedPromptOf` 出（缺的值留尖括号占位符），本件不另写一份。 */
export function escapePrompt(input: {
  readonly params: Record<string, unknown>;
  readonly blocked: readonly { readonly name: string; readonly label: string; readonly why: string }[];
  readonly scale: PhotoScale;
}): string {
  const missing = ESCAPE_FIELDS.filter((f) => textOf(input.params[f.name]) === '');
  const head = m('skill-bill.write-outsideScan.c036', { p1: String(input.scale.count > 0 ? input.scale.count : 0), p2: missing.length === 0
      ? m('skill-bill.write-outsideScan.c040')
      : m('skill-bill.write-outsideScan.c041', { p1: String(missing.map((f) => f.label).join('、')) }) });
  const ask = m('skill-bill.write-outsideScan.c037', { p1: String(ESCAPE_FIELDS.map((f) => f.label).join('／')), p2: String(blockedPromptOf({
      key: 'bill.record.add',
      params: input.params,
      blocked: input.blocked,
      replaces: {
        amount: m('skill-bill.write-outsideScan.c042'),
        category: m('skill-bill.write-outsideScan.c043'),
        time: m('skill-bill.write-outsideScan.c044'),
      },
    }).command) });
  return head + '\n' + ask;
}
