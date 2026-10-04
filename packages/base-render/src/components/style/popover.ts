/** popover · **样式段**（本组件唯一的样式来源；本件不碰 style/ticket-family.ts）。
 *
 * 纪律与同族 popover-menu 同一套：皮肤只经 skinVar() 读、scope 在 .<prefix>page-ui 之下、
 * **一条 box-shadow 都不写**（零阴影皮肤下浮面照样立得住：**粗边 ＋ 外圈晕 ＋ 顶层**）。
 *
 * **本件的核心是那两层「同一处触发处、两种形态」的规则**——它们是 A 类根因（长详情被裁成省略号）
 * 的整条防线：
 *
 *   ① 降级层（**默认，也就是没有就绪标记的时候**）：触发处 **white-space: normal ＋ 不裁**
 *      ⇒ **没有那段 JS 时整行可见，一个字都不丢**（这是安全底线，不是可选增强）。
 *   ② 就绪层（html 上有 data-ilife-popover-ready，即运行时已绑）：回到**单行 ＋ 省略号**，
 *      与接线前的观感逐字一致；全文改由气泡卡片承载。
 *
 * 为什么要这么分层（而不是直接把省略号删了）：直接删会把版式从单行改成折行，行高与整页高度都变；
 * 分层之后「看得全」这件事**不依赖脚本**，而「省地方」这件事交给脚本——两头都不牺牲。
 *
 * **选择器预算（为什么带 html 前缀 ＋ 同时用类与属性两枚标记）**：各族那条省略号规则的
 * 特异度是 (0,2,0)（例：.ilife-ticket-detail .ilife-someday-sub；.ilife-block-list-rows-main 是 (0,1,0)）。
 * 本件两条触发处规则必须**稳定压过它们**，又不能依赖「谁写在后面」（拼装顺序会变），故显式取高：
 * 降级层 (0,3,0)、就绪层 (0,4,1)。**与源码顺序无关**。
 *
 * 触发处那一组**按钮复位**故意走低：包在 :where() 里（特异度只剩 scope 的 (0,1,0)）——
 * 复位要压过浏览器默认样式，但**不许**压过各族给副行定的 font-size: 12.5px 那些字号档。
 */
import { skinVar } from '../skin/index.js';
import {
  POPOVER_ANCHOR_QUERY, POPOVER_AREA_QUERY, POPOVER_CARD_CLASS, POPOVER_CARD_WIDTH_PX,
  POPOVER_CLASS, POPOVER_EDGE_PX, POPOVER_GAP_PX, POPOVER_READY_ATTR, POPOVER_SCOPE,
  POPOVER_TRIGGER_ATTR, POPOVER_TRIGGER_CLASS, POPOVER_DEFAULT_SELECTORS, POPOVER_MEASURE_ATTR,
} from '../popover/attrs.js';
import type { PopoverFullTextCssInput } from '../popover/model.js';

/** 本组件的样式段。 */
export function popoverFullTextCss(input?: PopoverFullTextCssInput): string {
  const root = POPOVER_SCOPE;
  const trig = '.' + POPOVER_TRIGGER_CLASS;
  const card = '.' + POPOVER_CARD_CLASS;
  const wrap = '.' + POPOVER_CLASS;
  const edge = 'color-mix(in srgb, ' + skinVar('ink') + ' 30%, ' + skinVar('line') + ')';
  const halo = 'color-mix(in srgb, ' + skinVar('ink') + ' 9%, transparent)';
  const width = 'min(' + String(POPOVER_CARD_WIDTH_PX) + 'px, calc(100vw - ' + String(POPOVER_EDGE_PX * 2) + 'px))';
  const lift = root + ' ' + trig + '[' + POPOVER_TRIGGER_ATTR + ']';
  /* 候选落点**不带** trigger 标记那一层（降级层要用它：没有 JS 时没人包标记，见 ① 层注释）。
     读的是与运行时**同一份**选择器常量（`attrs.ts` 唯一定义），逗号连接成一条规则。 */
  const bare = root + ' ' + POPOVER_DEFAULT_SELECTORS.join(',' + root + ' ');
  if (input !== undefined && input !== null && typeof input.prefix === 'string' && input.prefix !== '') {
    throw new Error('popoverFullTextCss: prefix 暂不支持改名（作用域根类由 page-ui 件给）；去掉这个入参。');
  }
  return [
    '/* popover（气泡卡片 · 承载长文本全文）：popover ＋ 原生 popovertarget；零 box-shadow。 */',
    '/* 层次：粗边 ＋ 外圈晕 ＋ 顶层（' + card + ' 的顶层是浏览器给的，不靠任何投影）。 */',
    /* 挂载点不生成盒子：把触发处包一层是为了挂卡片，版面一个字都不许挪。 */
    root + ' ' + wrap + '{display:contents}',
    /* 触发处按钮复位：只压浏览器默认样式，**不许**压各族给这一行定的字号/字重档
       （故整段包在 :where() 里，特异度只剩 scope 那一枚）。 */
    root + ' :where(button.' + POPOVER_TRIGGER_CLASS + '),',
    root + ' :where(.' + POPOVER_TRIGGER_CLASS + '){appearance:none;-webkit-appearance:none;',
    '  border:0;margin:0;padding:0;background:none;color:inherit;',
    '  font-family:inherit;font-size:inherit;font-weight:inherit;line-height:inherit;',
    '  text-align:inherit;max-width:100%;overflow-wrap:inherit;',
    /* 触发 button 自己是 inline 盒：撑满原行宽、裁切规则与被它包住的那枚原元素一致，
       这样「一个省略号」这件事在升级前后是同一件事（版面不因升级而变）。 */
    '  display:block;white-space:inherit;overflow:inherit;text-overflow:inherit}',
    root + ' :where(button.' + POPOVER_TRIGGER_CLASS + '):focus-visible{outline:2px solid ' + skinVar('accent') + ';outline-offset:2px}',
    /* ① 测量层：运行时判定「这处真被裁到」时**临时挂上这一枚**再量，量完摘掉。 */
    'html[' + POPOVER_MEASURE_ATTR + '] ' + bare + '{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    'html[' + POPOVER_MEASURE_ATTR + '] ' + lift + '{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    /* ② 就绪层：运行时已绑 → 回到单行省略号，与接线前观感一致；全文交给气泡卡片。
       **不带 !important**：无 JS 降级层已搬去 `<noscript>`（popover/noscript.ts），
       主样式段里这里不需要跟任何东西抢优先级。 */
    'html[' + POPOVER_READY_ATTR + '] ' + bare + '{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;',
    '  cursor:pointer;overflow-wrap:normal}',
    'html[' + POPOVER_READY_ATTR + '] ' + lift + '{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;',
    '  cursor:pointer;overflow-wrap:normal}',
    /* 卡片：贴触发处下方，宽 min(320px, 视口-24px)，2px 粗边 ＋ 3px 外圈晕，全文折行不裁。 */
    root + ' ' + card + '{box-sizing:border-box;position:fixed;inset:auto;margin:' + String(POPOVER_GAP_PX) + 'px 0 0;',
    '  width:' + width + ';max-height:60vh;overflow:auto;',
    '  padding:10px 12px;background:' + skinVar('surface') + ';color:' + skinVar('ink') + ';',
    '  border:2px solid ' + edge + ';border-radius:' + skinVar('radius-card') + ';outline:3px solid ' + halo + ';',
    '  font:400 ' + skinVar('fs-sm') + '/1.6 ' + skinVar('font') + ';',
    '  white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;text-align:left}',
    root + ' ' + card + ':not(:popover-open){display:none}',
    /* 锚定定位（**只在支持锚定 API 的引擎里**生效；能力查询与运行时读同一份常量）。
       贴不下时翻到上方。 */
    '@supports (' + POPOVER_ANCHOR_QUERY + '){',
    '  @supports (' + POPOVER_AREA_QUERY + '){',
    '    ' + root + ' ' + card + ':popover-open{position-area:block-end span-inline-start;',
    '      position-try-fallbacks:flip-block}',
    '  }',
    '}',
    '@media (hover:hover) and (pointer:fine){',
    '  ' + lift + ':hover{text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px}',
    '}',
  ].join('\n');
}
