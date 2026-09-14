/** 页壳与页头 ＋ 类型徽章（写入域每张页都出现的头两件，**唯一定义地**）。
 *
 * 谁在用（两个调用点，指名）：
 *   ① `src/record/collect.ts`——过程型采集页：页壳与页头（`pageFrame`）＋ 类型徽章（`typeBadge`，报「待补槽位 · 未写库」）；
 *   ② `src/record/receipt.ts`——结果型回执整页：同一套（徽章报「写库成功」）。
 *  第二个消费者：`src/query/`（随兄弟图 #403 的查询域一起到位，出来的是同一套采集页／回执页／复制区）。
 *
 * 分工（三件不要混）：
 *   - `./docPage.ts`＝文档装配那一层（`fillTemplate` 包裹、样式资产注入），本件往下调它，不重写；
 *   - 本件＝页壳与页头的取值口径（眉标只此一句、标题三件套只出一处）＋ 类型徽章那一句话；
 *   - 页内块序列（表单／摘要行／复制区…）归两张页自己，本件不管。
 *
 * 口径出处：`docs/skills/skill-bill/t407-页面块清单-16词.md` 第一节前两行 ＋ 第二节「类型徽章」列。
 * 1.1 节硬口径照旧：`blocksCss()` 拼进 `TemplateAssets.sharedCssText` 再交 `fillTemplate`（住 `./docPage.ts`），
 * 不得走 `StyleSheetInput.extraCss`。
 */
import { renderStatusBadge } from 'base-paint';
import type { StatusKind } from 'base-paint';
import { assembleDocPage } from './docPage.js';
import { writeSection } from './writeParts.js';

/** 眉标（正文标题上方那一行）：16 张页同一句，别处不得再写第二条字面量。 */
export const PAGE_EYEBROW = '记账 · 写入域';

/** 一型一句话：代表唤醒词 ＋ 这一型的方向口径（施工图第二节「类型徽章」列逐条抄来）。 */
const KIND_TYPES: Record<string, { readonly wakeWord: string; readonly note: string }> = {
  expense: { wakeWord: '记支出', note: '支出（金额取负数）' },
  income: { wakeWord: '记收入', note: '收入（金额取正数）' },
  photo: { wakeWord: '拍账单', note: '图片识别确认（识别在本仓之外办）' },
  batch: { wakeWord: '批量录入', note: '批量（现阶段单笔化：一次只落一笔）' },
  refund: { wakeWord: '记退款', note: '退款（#tag 流转）' },
  reimburse: { wakeWord: '记报销', note: '报销（打 #待报销）' },
  'reimburse-done': { wakeWord: '报销到账', note: '到账（消 #待报销）' },
  lend: { wakeWord: '记借出', note: '借出（#借贷 流转）' },
  borrow: { wakeWord: '记借入', note: '借入（#借贷 流转）' },
  collect: { wakeWord: '记收回', note: '收回（消借出标）' },
  repay: { wakeWord: '记偿还', note: '偿还（消借入标）' },
  installment: { wakeWord: '记分期', note: '分期（分摊预览）' },
};

/** 无 preset 的那一条（记一笔）：方向按金额符号判，不由唤醒词定。 */
const PLAIN_TYPE = { wakeWord: '记一笔', note: '按金额符号判支出／收入' };

/** 类型徽章的入参。 */
export interface TypeBadgeInput {
  /** `params.kind`（空串＝没有 preset 的「记一笔」）。 */
  readonly kind: string;
  /** 命令名（对外全名，如 `bill.record.add`）。 */
  readonly key: string;
  /** 四档之一：`ok`＝已写库、`warn`＝待补、`danger`＝已阻断、`empty`＝无数据。 */
  readonly status: StatusKind;
  /** 这一页现在是什么状态（如「待补槽位 · 未写库」／「写库成功」）。 */
  readonly state: string;
}

/** 类型徽章：报「这一页是哪条唤醒词、哪一型、哪条命令、什么状态」。
 *  金额符号即方向那句（支出负数／收入正数）由本徽章负责写出来（施工图第一节第 2 行）。 */
export function typeBadge(input: TypeBadgeInput): string {
  const kind = typeof input.kind === 'string' ? input.kind : '';
  const t = kind === '' ? PLAIN_TYPE : (KIND_TYPES[kind] ?? { wakeWord: kind, note: '本仓尚未定额的型' });
  return renderStatusBadge({
    status: input.status,
    text: t.wakeWord + ' · ' + t.note + ' · ' + input.key + ' · ' + input.state,
  });
}

/** 页壳与页头的入参：标题三件套 ＋ 已组合好的正文 ＋ 页面标记四件。 */
export interface PageFrameInput {
  /** head 的 `<title>` 文本。 */
  readonly docTitle: string;
  /** 正文 H1。 */
  readonly title: string;
  /** 正文副标题（空串＝不写这一行）。 */
  readonly subtitle: string;
  /** `<section>` 上的槽位：`collect`＝过程型采集页、`receipt`＝结果型回执整页。 */
  readonly slot: 'collect' | 'receipt';
  /** `<section>` 上的形状（＝本次 envelope 的形状，与老回执页同一枚）。 */
  readonly shape: string;
  /** `<section>` 上的命令名（对外全名）。 */
  readonly key: string;
  /** 已组合好的页内块序列。 */
  readonly content: string;
}

/** 页壳与页头：`<section>` 段 ＋ 标题三件套 ＋ 整页装配。一页只调一次。 */
export function pageFrame(input: PageFrameInput): string {
  const body = writeSection({ slot: input.slot, shape: input.shape, key: input.key, content: input.content });
  return assembleDocPage({
    docTitle: input.docTitle,
    title: input.title,
    eyebrow: PAGE_EYEBROW,
    subtitle: input.subtitle,
    content: body,
  });
}
