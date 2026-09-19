/** 页面模板与页头（每张页都有的第一件，**唯一定义地**）：`<section>` 段 ＋ 标题三件套 ＋ 整页装配。
 *
 * 谁在用（两个能力，指名）：
 *   ① `src/write/`——写入域：过程型采集页（页头 ＋ 九块正文）与结果型回执整页（页头 ＋ 回执块序列）；
 *   ② `src/query/`——查询域：通用查询列表页（页头 ＋ KPI 行 ＋ 数据表 ＋ 复制区）同走本件，
 *      眉标给 `domain: 'query'`。
 *  本票实测：本包 `src/` 下真引用本件的就是上面两个域，再无第三处。
 *
 * 分工（三件不要混）：
 *   - `./docPage.ts`＝文档装配那一层（`fillTemplate` 包裹、样式资产注入），本件往下调它，不重写；
 *   - 本件＝页面模板与页头的取值口径（**眉标两域各一句**、标题三件套只出一处；`data-page` 是选页那一枚标记）；
 *   - 页内块序列（表单／摘要行／复制区…）归各域自己，本件不管；类型徽章另立 `./typeBadge.ts`。
 *
 * 口径出处：`docs/skills/skill-bill/t407-页面块清单-16词.md` 第一节第 1 行。
 * 1.1 节硬口径照旧：`blocksCss()` 拼进 `TemplateAssets.sharedCssText` 再交 `fillTemplate`（住 `./docPage.ts`），
 * 不得走 `StyleSheetInput.extraCss`。
 */
import { assembleDocPage } from './docPage.js';
import { writeSection } from './writeParts.js';

/** 眉标（正文标题上方那一行）：每域一句，**取值只在本件**，别处不得再写这些字面量。 */
const PAGE_EYEBROW: Readonly<Record<'write' | 'query', string>> = {
  write: '记账 · 写入域',
  query: '记账 · 查询域',
};

/** 页面模板与页头的入参：标题三件套 ＋ 已组合好的正文 ＋ 页面标记五件。 */
export interface PageShellInput {
  /** head 的 `<title>` 文本。 */
  readonly docTitle: string;
  /** 正文 H1。 */
  readonly title: string;
  /** 正文副标题（空串＝不写这一行）。 */
  readonly subtitle: string;
  /** `<section>` 上的槽位：`collect`＝过程型采集页、`receipt`＝结果型回执整页、`list`＝查询域列表页。 */
  readonly slot: 'collect' | 'receipt' | 'list';
  /** `<section>` 上**选页用的那一枚**：`collect`／`receipt`／`list`；与 `slot` 同值，下游选页读它。 */
  readonly page: 'collect' | 'receipt' | 'list';
  /** `<section>` 上的形状（＝本次 envelope 的形状，与老回执页同一枚；契约，不随页型改）。 */
  readonly shape: string;
  /** `<section>` 上的命令名（对外全名）。 */
  readonly key: string;
  /** 已组合好的页内块序列。 */
  readonly content: string;
  /** 这一页属于哪个域（眉标那一行）：缺省 `write`＝写入域；查询域给 `query`。 */
  readonly domain?: 'write' | 'query';
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
    eyebrow: PAGE_EYEBROW[input.domain ?? 'write'],
    subtitle: input.subtitle,
    content: body,
  });
}
