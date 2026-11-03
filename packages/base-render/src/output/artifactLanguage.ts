/** HTML 产物文件名主体（`stem`）的语言后缀——#1235 裁决与 #1197 US7 的落点。
 *
 * 口径（逐字来自 `docs/agents/多语言-文件名裁决.md`）：
 *  - 基准语言（`zh`，也是「未进入语言上下文」的缺省值）**不加后缀**，存量中文产物逐字节与今日一致；
 *  - 其它语言在主体后加 `_<lang>`（英文即 `_en`）；语言标签按 BCP 47 主标签取小写（`en-US` → `en`）；
 *  - 只作用于**按通式落一份**的 `stem` 口子；用户逐字指定的 `file`（`--html`／`--output`）不加工。
 *
 * 为什么放在 `base-render/output/` 而不是 `saveHtml.ts` 里：本件是 `base-paint/save-html` 子路径的
 * 运行时出口，出口名单被 `output-save-html-237.test.mjs` 逐字钉死；新逻辑单开一件、只增加 import。
 */
import { BASE_LANGUAGE, currentRenderLanguage } from 'base-entries';

/** 取渲染语言的 BCP 47 主标签（小写）：`en`／`zh`；空串按基准语言处理。 */
function primarySubtag(language: string): string {
  return language.trim().toLowerCase().split('-')[0] ?? '';
}

/** 给「按通式落一份」的文件名主体加语言后缀：基准语言原样返回，其它语言返回 `<stem>_<主标签>`。
 *
 *  纯函数、不读上下文之外的状态：同一 `stem` 在 zh 与 en 下产出互不相同的主体，
 *  于是 `reuse`（按本件自己产出的名字扫目录）天然按语言分窗，不会把中文那份当英文的复用命中。
 */
export function artifactStemForLanguage(stem: string): string {
  const lang = primarySubtag(currentRenderLanguage());
  return lang === '' || lang === BASE_LANGUAGE ? stem : stem + '_' + lang;
}
