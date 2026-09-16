/** #655 · 身材照片**两张过程型页**（09-06 记身材照预检确认页／09-07 生成身材照GIF 规划器）
 *  的确认清单形状与页内样式件（唯一产出者）。
 *
 * ── 为什么另立一件，不并进 `photoUi.ts` ──────────────────────────────────────────────
 *  `photoUi.ts` 是**读侧族**（看身材照／查身材照／对比两张照片／删照候选）的形状件，本族另外
 *  七页与它同生共死。本票要治的是「名＋空框＋灰示例」那种三层噪音 —— 治法只服务这两张过程型页；
 *  样式并进 `photoUiCss()` 会让那七页的**产物字节**跟着变（css 串进了它们每一个 `<style>`），
 *  等于本票顺手动了别人的页。故样式与形状同住这一件，只有这两页取用。
 *  同族先例：`weight/weightUi.ts`、`exercise/sportUi.ts`、`src/render/reviewDocsCss.ts` —— 一族一件。
 *
 * ── 口径（负责人 2026-09-16 验收打回的那张图，逐条落到形状上）──────────────────────
 *  ① 值先以**只读一行**出现；点开哪一行，才出哪一行的输入（行本体是原生 `<details>`，零 JS）。
 *     这一页的定位是「确认 AI 已经用好的值」，不是「让人逐个核对的空表单」。
 *  ② 三档层级定死，不再一屏同档：块标题 15/600（`.phu-sec`，住 `photoUi.ts`）、
 *     行名 12/600 弱色（`.phu-edit-k`）、值 14/400 主色（`.phu-edit-v`）。
 *  ③ 只读位与可编辑位**形状分得开**：只读值住白卡里的细线行，输入框只在展开后出现、走细边白底。
 *  ④ 那句「改了不会自动生效」原来是加粗长句当标题使 —— 改浅底提示条（`noticeBar`），
 *     降一档字号、不上粗体，视觉重量退回字段之下。
 *
 * ── 共享位边界（不许越）──
 *  徽章走 `base-paint/blocks` 的 `renderChips`，参数表单走公共层 `renderParamForm`（本件不重写
 *  `min／max／step／options` 的落位口径），字号与色值只用冻结 token；`packages/base-render/**` 一行不碰。
 */
import { escapeHtml } from 'base-paint';

const esc = (s: string): string => escapeHtml(s);

/** 本件两张页的页内样式。用法：放进整页 `parts` 的第一项（`assembleDocPage` 没有页内 CSS 入口，
 *  同 `photoUi.ts`／`weightUi.ts` 的处置）。 */
export function wizardUiCss(): string {
  return '<style>'
    // ── 块标题行：标题在左（`.phu-sec` 的 15/600 住 photoUi.ts），右侧一句辅助档小字（不上加粗）──
    + '.phu-sechead{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:4px 10px;margin:22px 0 8px}'
    + '.phu-sechead .phu-sec{margin:0}'
    + '.phu-sechead-s{font-size:12px;font-weight:400;color:var(--fg3)}'
    // ── 提示条：浅底 ＋ 左侧一道主色细线（页面底色 `--bg` 与 `--soft` 只差几个色阶，
    //  只铺底色看不出这是「一条」）──
    + '.phu-alert{margin:0 0 12px;padding:10px 14px;border-radius:12px;background:var(--soft);'
    + 'border-left:3px solid var(--blue2);font-size:13px;font-weight:400;line-height:1.65;color:var(--fg2)}'
    // ── 清单本体：一张白卡 ＋ 行间细线（块与块之间有分割，行不悬空）──
    + '.phu-edits{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:0 14px}'
    + '.phu-edit{border-top:1px solid var(--line)}'
    + '.phu-edit:first-child{border-top:0}'
    // 行＝`<summary>`，四格栅格：行名 ｜ 值 ｜ 角标 ｜ 折角（后两格缺位时自然收成 0 宽）。
    // `min-height:44px` 是手机端的触摸面下限；窄屏（≤640）塌成「名字一行、值一行」，见下方媒体段。
    + '.phu-edit-row{display:grid;grid-template-columns:88px minmax(0,1fr) auto auto;align-items:center;'
    + 'gap:4px 12px;min-height:44px;padding:9px 0;cursor:pointer;list-style:none}'
    + '.phu-edit-row::-webkit-details-marker{display:none}'
    + '.phu-edit-row::after{content:"";grid-column:4;justify-self:end;width:7px;height:7px;'
    + 'border-right:1.6px solid var(--fg3);border-bottom:1.6px solid var(--fg3);transform:rotate(45deg);'
    + 'transition:transform .15s}'
    + '.phu-edit[open]>.phu-edit-row::after{transform:rotate(225deg)}'
    + '.phu-edit-k{grid-column:1;font-size:12px;font-weight:600;color:var(--fg3)}'
    + '.phu-edit-v{grid-column:2;min-width:0;font-size:14px;font-weight:400;color:var(--fg);overflow-wrap:anywhere}'
    + '.phu-edit-v.is-empty{color:var(--fg3)}'
    // 一个值里的多行（多张照片路径）：一行一件，**一行一个文本节点** —— 不是排版讲究，
    // 是让「一个值」与「一串并列」在节点级分得开（`audit-separators.mjs` 的 R3 判据）。
    + '.phu-edit-v>.phu-line{display:block}'
    + '.phu-edit-n{grid-column:3;justify-self:end;font-size:12px;font-weight:600;color:var(--blue2);'
    + 'background:var(--soft);border-radius:999px;padding:2px 9px;font-variant-numeric:tabular-nums}'
    // ── 展开后的编辑位：与只读行的白卡形状分得开 —— 细边 ＋ 白底 ＋ 一点点浮起 ──
    + '.phu-edit-body{padding:0 0 12px}'
    + '.phu-edits .ilife-block-param-form{margin:0}'
    + '.phu-edits .ilife-block-param-form-field{margin:0}'
    + '.phu-edits .ilife-block-param-form-input{border:1px solid var(--line);background:var(--card);'
    + 'box-shadow:0 1px 2px rgba(0,0,0,.03)}'
    // ── 手机端（断点与 `photoUi.ts` 同值：820 管触摸面、640 管塌列）──
    + '@media (max-width:820px){'
    + '  .phu-edit-row{-webkit-tap-highlight-color:transparent;touch-action:manipulation}'
    + '}'
    + '@media (max-width:640px){'
    // 名字（＋角标＋折角）一行、值另起一行满宽：长路径不再挤在 76px 的窄柱里换成四行。
    + '  .phu-edit-row{grid-template-columns:minmax(0,1fr) auto auto;row-gap:3px}'
    + '  .phu-edit-k{grid-column:1;grid-row:1}'
    + '  .phu-edit-n{grid-column:2;grid-row:1}'
    + '  .phu-edit-row::after{grid-column:3;grid-row:1}'
    + '  .phu-edit-v{grid-column:1/-1;grid-row:2}'
    + '}'
    + '</style>';
}

/** 确认清单的一项：右栏是**当刻值**（只读），`bodyHtml` 是**点开后才出现**的编辑体。 */
export interface EditRowInput {
  /** 行名（辅助档 12px／600／弱色）。 */
  readonly k: string;
  /** 当刻值（正文档 14px／400／主色）；`\n` 分段（每段各自成一个文本节点，见 `.phu-line`）。 */
  readonly v: string;
  /** `v` 为空时显示的那句话（缺省「还没填」；可选栏写「没填」）。 */
  readonly emptyText?: string;
  /** 值尾的角标（如张数）；空串／缺省＝不出这一格（零信息值不留位）。 */
  readonly badge?: string;
  /** 展开后的编辑体（受信 HTML：一处参数表单；本件原样透传，调用方自行转义插值）。 */
  readonly bodyHtml: string;
}

/** 确认清单（#655 两页共用）：一行一个「名字 ＋ 当刻值」，行本体就是原生 `<details>` 的
 *  `<summary>` —— **值是只读一行，只有点开的那一行才出输入框**（零 JS）。
 *  为什么不用 `renderDisclosure`：那个件只收一个标题串，装不下「行名 ＋ 值」这个形状。 */
export function editRows(rows: readonly EditRowInput[]): string {
  const body = rows.map((r) => {
    const empty = r.v === '';
    const lines = (empty ? [r.emptyText ?? '还没填'] : r.v.split('\n'))
      .map((s) => '<span class="phu-line">' + esc(s) + '</span>').join('');
    const badge = r.badge === undefined || r.badge === ''
      ? '' : '<span class="phu-edit-n">' + esc(r.badge) + '</span>';
    return '<details class="phu-edit"><summary class="phu-edit-row">'
      + '<span class="phu-edit-k">' + esc(r.k) + '</span>'
      + '<span class="phu-edit-v' + (empty ? ' is-empty' : '') + '">' + lines + '</span>'
      + badge + '</summary><div class="phu-edit-body">' + r.bodyHtml + '</div></details>';
  }).join('');
  return body === '' ? '' : '<div class="phu-edits">' + body + '</div>';
}

/** 浅色提示条（#655）：那句「改了不会自动生效」原来用加粗长句当标题使，视觉重量压过字段 ——
 *  换浅底条 ＋ 13px ＋ 不上粗体。**文本原样**（措辞归调用方，本件只管形状）。 */
export function noticeBar(text: string): string {
  return '<p class="phu-alert">' + esc(text) + '</p>';
}
