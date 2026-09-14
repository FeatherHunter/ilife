/** 页面模板与页头（写入域每张页都有的第一件，**唯一定义地**）：`<section>` 段 ＋ 标题三件套 ＋ 整页装配。
 *
 * 谁在用（两个调用点，指名）：
 *   ① `src/record/collect.ts`——过程型采集页：`pageShell` 出一整页（页头 ＋ 九块正文）；
 *   ② `src/record/receipt.ts`——结果型回执整页：同一件，出一整页（页头 ＋ 回执块序列）。
 *  第二个消费者：`src/query/`（随兄弟图 #403 的查询域一起到位，出来的是同一套采集页／回执页／复制区）。
 *  本票实测：本包 `src/` 下真引用本件的就是上面两个调用点，再无第三处。
 *
 * 分工（三件不要混）：
 *   - `./docPage.ts`＝文档装配那一层（`fillTemplate` 包裹、样式资产注入），本件往下调它，不重写；
 *   - 本件＝页面模板与页头的取值口径（眉标只此一句、标题三件套只出一处；`data-page` 是选页那一枚标记）；
 *   - 页内块序列（表单／摘要行／复制区…）归两张页自己，本件不管；类型徽章另立 `./typeBadge.ts`。
 *
 * 口径出处：`docs/skills/skill-bill/t407-页面块清单-16词.md` 第一节第 1 行。
 * 1.1 节硬口径照旧：`blocksCss()` 拼进 `TemplateAssets.sharedCssText` 再交 `fillTemplate`（住 `./docPage.ts`），
 * 不得走 `StyleSheetInput.extraCss`。
 */
import { assembleDocPage } from './docPage.js';
import { writeSection } from './writeParts.js';

/** 眉标（正文标题上方那一行）：16 张页同一句，别处不得再写第二条字面量。 */
const PAGE_EYEBROW = '记账 · 写入域';

/** 页面模板与页头的入参：标题三件套 ＋ 已组合好的正文 ＋ 页面标记五件。 */
export interface PageShellInput {
  /** head 的 `<title>` 文本。 */
  readonly docTitle: string;
  /** 正文 H1。 */
  readonly title: string;
  /** 正文副标题（空串＝不写这一行）。 */
  readonly subtitle: string;
  /** `<section>` 上的槽位：`collect`＝过程型采集页、`receipt`＝结果型回执整页。 */
  readonly slot: 'collect' | 'receipt';
  /** `<section>` 上**选页用的那一枚**：`collect`／`receipt`；与 `slot` 同值，下游选页读它。 */
  readonly page: 'collect' | 'receipt';
  /** `<section>` 上的形状（＝本次 envelope 的形状，与老回执页同一枚；契约，不随页型改）。 */
  readonly shape: string;
  /** `<section>` 上的命令名（对外全名）。 */
  readonly key: string;
  /** 已组合好的页内块序列。 */
  readonly content: string;
}

/** 页面模板与页头：`<section>` 段 ＋ 标题三件套 ＋ 整页装配。一页只调一次。 */
export function pageShell(input: PageShellInput): string {
  const body = writeSection({
    slot: input.slot,
    page: input.page,
    shape: input.shape,
    key: input.key,
    content: input.content,
  });
  return assembleDocPage({
    docTitle: input.docTitle,
    title: input.title,
    eyebrow: PAGE_EYEBROW,
    subtitle: input.subtitle,
    content: body,
  });
}
