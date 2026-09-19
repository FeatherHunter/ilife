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
  { name: 'amount', label: '金额', hint: '识别出来的金额照原样写：支出为负、收入为正，如 -12.5' },
  { name: 'category', label: '分类', hint: '要选到最细那一级，如「午餐」' },
  { name: 'time', label: '时间', hint: '账单上的日期，如 2026-09-14 或 2026-09-14 12:00:00' },
];

/** 已收到的图片数说明（拍账单必备块）：**各占独立一块**，不与打标提示、来源提示共容器。 */
export function imageNote(scale: PhotoScale): string {
  const n = Number.isFinite(scale.count) && scale.count > 0 ? Math.floor(scale.count) : 0;
  const toast: ToastInput = {
    msg: '已收到 ' + n + ' 张账单图片',
    detail: n === 0
      ? '本次一张图都没交上来：那就走三要素文字填空这条路，照样能记。'
      : '图放在 ' + scale.where + '，本仓不存图也不读图。识别在外部办完，把三样要素填回来。',
    icon: 'info',
    badge: { text: '已收图片数', type: 'warn' },
    lines: [
      '收图这一步在哪：' + scale.where,
      '读图这一步在哪：本仓之外（本仓不装识别引擎，也不做上传控件）',
      ESCAPE_FIELDS.map((f) => f.label).join('／') + '三样要素：由外部识别结果或你手填，填回下面那张卡',
    ],
  };
  return renderFeedbackBlock({ title: '已收图片数与识别分工（各占独立一块）', toast });
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
    现在: textOf(input.params[f.name]) === '' ? '还没填' : textOf(input.params[f.name]),
    找谁: '外部识别结果（或用你眼睛看一眼账单）',
  }));
  const missing = ESCAPE_FIELDS.filter((f) => textOf(input.params[f.name]) === '');
  return renderDataTable({
    columns: [
      { key: 'field', label: '要素' },
      { key: '现在', label: '现在' },
      { key: '找谁', label: '这一步谁办' },
    ],
    rows,
    caption: '图片识别外置：三要素现在到了哪一步'
      + (missing.length === 0
        ? '（三样齐了，可以直接写库）'
        : '（还缺 ' + missing.map((f) => f.label).join('、') + '，缺一样就不写库）'),
  }) + renderDataTable({
    columns: [
      { key: 'step', label: '这一步' },
      { key: 'who', label: '在哪办' },
      { key: 'detail', label: '办成什么样' },
    ],
    rows: [
      { step: '收图', who: '你交图的那一头', detail: '图上内容原样，本仓不裁剪不读取' },
      {
        step: '读图取三要素',
        who: '本仓之外（外部识别工具／你手填）',
        detail: ESCAPE_FIELDS.map((f) => f.label).join('／') + '三样文字',
      },
      { step: '落库', who: '这台手机上的记账技能', detail: '三样齐了才写；缺一样只出这一页，不写库' },
    ],
    caption: '每一步在谁那里办（识别不落在本仓）',
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
  const head = '拍账单：本仓不装识别引擎、也不做上传控件，图片识别在外部办（本仓之外）。'
    + '已收到 ' + (input.scale.count > 0 ? input.scale.count : 0) + ' 张图。'
    + (missing.length === 0
      ? '三要素齐了，可以落库。'
      : '还缺 ' + missing.map((f) => f.label).join('、') + '，缺一样不许写库、也不替你猜。');
  const ask = '请在外部识别（或眼看）之后，把 ' + ESCAPE_FIELDS.map((f) => f.label).join('／')
    + '三样写成参数，然后照抄下面这条命令重跑：\n'
    + blockedPromptOf({
      key: 'bill.record.add',
      params: input.params,
      blocked: input.blocked,
      replaces: {
        amount: '<外部识别出的金额：支出为负、收入为正>',
        category: '<外部识别出的分类：L1/L2/L3>',
        time: '<账单上的时间>',
      },
    }).command;
  return head + '\n' + ask;
}
