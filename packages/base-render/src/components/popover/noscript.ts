/** popover · **无 JS 降级层**（#1134）——独立成件，因为它**只在 `<noscript>` 里生效**。
 *
 *  为什么必须独立、且不能留在主样式段：
 *   · 降级的定义是「**脚本没跑**时把长文本摊开、全文不丢」。CSS 本身分不出「脚本跑没跑」，
 *     于是早前那版把它塞进主样式段、靠「就绪层」(`html[data-ilify-popover-ready]`) 反向压回去。
 *     实测那条竞争链**压不住**：明细卡自己那些 `text-overflow:ellipsis` 的行规则特异度更高
 *     （w12 搜备注漏 6 处、a20 看洞察漏 3 处）；上 `!important` 又会连就绪层一起压掉，
 *     a06 反过来冒出 1 处——按下葫芦浮起瓢。
 *   · `<noscript>` 是 HTML 层的机制：**脚本被禁用时浏览器才解析它的内容**。放进这里，
 *     有脚本 ⇒ 这段根本不进 DOM，与主样式段**不在同一条竞争链上**；无脚本 ⇒ 就绪层也不存在，
 *     摊开就是唯一规则。零 `!important`、零特异度博弈。
 *
 *  范围：作用域根下的**所有**可能被裁的元素（不是只补那三条默认选择器）——补选择器必然漏网
 *  （w12 漏的是**无 class 的 SPAN**，a20 漏的是 `.list-rows-main` 内层），兜底一次到位。
 *  摊开的绝大多数是本来就短的文字，它们本来就不溢出，摊开后观感不变。
 */
import { POPOVER_DEFAULT_SELECTORS, POPOVER_SCOPE } from './attrs.js';

const root = POPOVER_SCOPE;

/** `!important` 的字面（**只此一处**）：早前把它内联进字符串时漏了 `important` 三个字，
 *  产物成了 `white-space:normal!` —— 浏览器当它是非法声明**整条丢弃**，降级层静默失效。 */
const BANG = String.fromCharCode(33) + 'important';

/** 兜底范围：三条默认落点 ＋ 结构类名里那批「装文字的子件」 ＋ 票据纸明细行整棵子树。 */
const CATCH_ALL: readonly string[] = [
  ...POPOVER_DEFAULT_SELECTORS,
  '[class*="-main"]',
  '[class*="-sub"]',
  '[class*="-note"]',
  '[class*="-line"]',
  '[class*="-text"]',
  '[class*="-label"]',
  '.ilife-ticket-entry-text',
  /* w12 搜备注漏网那 6 处：`.ilife-someday-sub` 里那几枚**运行时才拿到类**的元素——
     有 JS 时它们是触发处，无 JS 时是**裸节点**（`.ilife-someday-sub > span` 链上更深的子节点）。
     按 class 匹配永远兜不住「还没被升级的它们」，所以这里按**结构**兜：这几条容器下的整棵子树。
     摊开的绝大多数是本来就短的文字，摊开后观感不变。 */
  '.ilife-ticket-entry-text *',
  '.ilife-someday-sub *',
  '.ilife-someday-mono *',
  '.ilife-block-list-rows-main',
  '.ilife-block-list-rows-main *',
];

/** 无 JS 降级用的那段 `<style>` 文本（由 docShell 包进 `<noscript>`）。 */
export function popoverNoScriptCss(): string {
  return [
    '/* popover 无 JS 降级：脚本禁用时把长文本摊开，全文可读（全文不丢＝安全底线）。 */',
    /* 这里的 !important 是**安全**的：整段住在 <noscript> 里，有脚本时**根本不解析**、
       零副作用；无脚本时它是唯一兜底，必须压得住明细行自己那条 text-overflow:ellipsis
       （那条特异性更高，w12 搜备注的 6 处就是被它压住的）。 */
    root + ' ' + CATCH_ALL.join(',' + root + ' ') + '{white-space:normal' + BANG + ';overflow:visible' + BANG + ';text-overflow:clip' + BANG + '}',
  ].join('\n');
}

/** 包好标签的那一整段（直接进 `<head>`）。不启用本件时**一个字节都不产出**。 */
export function popoverNoScriptHtml(): string {
  return '<noscript><style>' + popoverNoScriptCss() + '</style></noscript>';
}
