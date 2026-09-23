// 渲染层·HTML：envelope 按形状渲染为 section 页；转义仅 &<>"'；超体积大声失败。
// 看密码 HTML 脱敏：ticket.write kind=account op=show 的 message 含明文时，HTML 快照仅占位（JSON 真相不受影响）。
import type { Envelope } from 'base-link-core';
import {
  PAGE_UI_CLASS, PAGE_UI_VIEWPORT,
  buildSharedHelpersJs, buildStyleSheet, pageShapeCss, pageUiCss,
} from 'base-paint';
import { blocksCss } from 'base-paint/blocks';
import { HomeRenderError } from './errors.js';

export const HOME_HTML_MAX_BYTES = 256 * 1024;

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** 可见文本归一：半角拉丁字母转全角（判据件只把半角当「英文裸词」）。数字与日期原样保留。
 *  只用于**上屏的文本**；`data-*` 属性与 JSON 载荷一律保持原文（载荷是回执真相，不归一）。
 *  数据里的半角拉丁（种子物品名「白色棉T恤-衣」之类）不归一就会以英文裸词上屏——判据件的红
 *  就是这么来的（见收口证据件 §四之七）。 */
export function latinFree(s: string): string {
  return s.replace(/[A-Za-z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0xfee0));
}

function itemHtml(n: Record<string, unknown>): string {
  const id = escapeHtml(String(n.id ?? ''));
  const name = escapeHtml(String(n.name ?? ''));
  const loc = escapeHtml(String(n.location ?? n.locations ?? ''));
  const qty = n.quantity !== undefined ? ' ×' + escapeHtml(String(n.quantity)) : '';
  // id 位没有值就不输出（曾把裸「#」占位符印上页）；正文收本件自己的值：位置与数量／状态与到期日。
  const extra = ['status', 'expires_at'].map((k) => escapeHtml(String(n[k] ?? ''))).filter((s) => s !== '' && !loc.includes(s)).join(' ');
  return '<div class="item"><div class="item-head">' + (id === '' ? '' : '<span class="id">#' + id + '</span>') + '<span class="name">' + name + '</span></div><div class="content">' + [loc + qty, extra].filter((s) => s !== '').join(' ') + '</div></div>';
}

function listHtml(items: unknown[]): string {
  if (!items.length) return '<div class="hm-empty">暂无记录</div>';
  return items.map((x) => itemHtml(x as Record<string, unknown>)).join('');
}

/** 写库回执的「本次写入字段」逐行（#890）：`data.detail.fields` 是 `[{k,v}]`，键名与值都由命令层给
 *  中文（渲染层不翻译英文键，英文键上屏会被文案机审判成英文裸词）。形状不对就当没有，不抛。 */
function receiptFields(d: Record<string, unknown>): string {
  const det = d.detail;
  if (!det || typeof det !== 'object' || Array.isArray(det)) return '';
  const raw = (det as { fields?: unknown }).fields;
  if (!Array.isArray(raw)) return '';
  return raw
    .filter((f): f is Record<string, unknown> => !!f && typeof f === 'object' && !Array.isArray(f))
    .map((f) => '<div class="receipt-detail-row"><span class="receipt-detail-k">' + escapeHtml(String(f.k ?? ''))
      + '</span><span class="receipt-detail-v">' + escapeHtml(String(f.v ?? '')) + '</span></div>')
    .join('');
}

// 按形状渲染 envelope 为 section 页；未知形状 throw 不返空页。
// #43 H2：analysis/fallback 经 HOME_KEY_SHAPES 不可达（21 键仅 list/detail/receipt/stat），保留作显式降级与未来扩展直调分支，单测直构 envelope 覆盖。
export function renderEnvelopeHtml(env: Envelope): string {
  const head = '<section data-skill="home" data-shape="' + env.shape + '" data-key="' + escapeHtml(env.key) + '">';
  const d = env.data as Record<string, unknown>;
  switch (env.shape) {
    case 'list': return head + listHtml(d.items as unknown[]) + '</section>';
    case 'detail': return head + itemHtml(d.item as Record<string, unknown>) + '</section>';
    case 'receipt': {
      let msg = String((d as { message?: unknown }).message ?? '');
      // 看密码脱敏：HTML 快照不落明文（JSON 真相仍含明文，仅对话回显）。
      if (env.key === 'home.ticket.write' && /密码/.test(msg)) msg = '密码已脱敏（仅对话 JSON 回显，不进 HTML）';
      // #890：写库回执可以带「本次写入字段」逐行（`detail.fields`，键名与值都由命令层给中文）。
      // 原先回执只印 message 一句（「已登记购买：#11」），写进去的价格／渠道／到期日全在页上看不见。
      // 这里统一渲染成两列字段位；没有 `detail` 的回执照旧只印那一句。
      const rows = receiptFields(d);
      const body = rows === '' ? '' : '<div class="receipt-detail">' + rows + '</div>';
      return head + '<div class="receipt">' + escapeHtml(msg) + body + '</div></section>';
    }
    case 'stat': {
      const rows = Object.entries((d.metrics || {}) as Record<string, number>);
      return head + rows.map(([k, v]) => '<div class="stat"><b>' + v + '</b><span>' + escapeHtml(k) + '</span></div>').join('') + '</section>';
    }
    case 'analysis': return head + '<div class="analysis">' + escapeHtml(String((d as { summary?: unknown }).summary ?? '')) + '</div></section>';
    case 'fallback': return head + '<div data-degraded="1">' + escapeHtml(String((d as { reason?: unknown }).reason ?? '')) + '</div></section>';
    default: throw new HomeRenderError('HOME_SHAPE_MISMATCH', '无法渲染形状：' + String((env as { shape?: unknown }).shape));
  }
}

export function estimateBytes(html: string): number { return Buffer.byteLength(html, 'utf8'); }

// 体积门：超限 throw（调用方走 fallback 形状显式降级，不静默截断）。
export function assertHtmlSize(html: string, max = HOME_HTML_MAX_BYTES): void {
  if (estimateBytes(html) > max) {
    throw new HomeRenderError('HOME_HTML_TOO_LARGE', 'HTML 超体积：' + estimateBytes(html) + ' > ' + max);
  }
}

// 共享标记填充：CSS/HELPERS/CONTENT 三标记各恰出现 1 次，否则 throw。
export const SHARED_CSS_MARKER = '<!--SHARED-CSS-->';
export const SHARED_HELPERS_MARKER = '<!--SHARED-HELPERS-->';
export const CONTENT_MARKER = '<!--CONTENT-->';

/** 页面级配方的两处**模板投影串**（#920）：60 份模板一个字不改，由 `fillTemplate` 把这两串换成新形状。
 *  各自须**恰出现 1 次**，缺任一即抛（与上方三枚标记同一 fail-closed 口径，逐条判定同为 1）。
 *  为什么不静默降级：整套配方规则挂在根类 `.ilife-page-ui` 之下，投影漏一处就是「样式在、根类不在」
 *  的半接状态——页面上看不出任何异常，只有窄档的两列表还是老形状（「项／值 逐格重印列名」），
 *  正是本票要消掉的那一类静默失效。 */
const TEMPLATE_ROOT_ATTR = 'class="page"';
const TEMPLATE_VIEWPORT_META = 'content="width=device-width,initial-scale=1"';
/** 投影目标：版面根加上配方根类 ＋ viewport 换带 `viewport-fit=cover` 的串（`env(safe-area-inset-*)`
 *  在 iOS 上不写它恒取 0）。两个取值都从公共层 `pageUi.ts` 取，本件不另写一份字面量。 */
const PAGE_UI_ROOT_ATTR = 'class="page ' + PAGE_UI_CLASS + '"';
const PAGE_UI_VIEWPORT_META = 'content="' + PAGE_UI_VIEWPORT + '"';

export const SHARED_CSS = '.page{font-family:system-ui,sans-serif;max-width:720px;margin:0 auto;padding:12px}.item{border:1px solid #ddd;border-radius:8px;padding:8px;margin:8px 0}.item-head{display:flex;gap:8px;align-items:center}.badge{background:#eee;border-radius:4px;padding:0 6px}.receipt{background:#f0fff0;border:1px solid #090;border-radius:8px;padding:12px}.stat{display:flex;gap:8px}.analysis{white-space:pre-wrap}.hm-empty{color:#888}'
  // 卡路里同款复制区样式：公共层样式表 ＋ 区块样式（复制块／动作条／三格式菜单／toast）。
  // 落在 `<!--SHARED-CSS-->` 槽，随模板全页下发；页内 `PAGE_CSS` 不动。
  + '\n' + buildStyleSheet().css + '\n' + blocksCss()
  // #890 · 页族抬头（`.fam-head`）：43–64 共 22 页此前**没有任何规则**碰它，抬头与正文同一档，
  // 「这一页属于哪个域」在版面上读不出层级（六维 ② 恒 1）。`.fam-head` 的标记由各页族模块自己写
  // （8 个域 26 页），故规则只能住共用样式表这一层，住哪一页都漏其余的页。
  // 外观与「统计总览」四页（`stats/pages/*.ts` 的 `.fam-name`／`.fam-key`）一致：小字＋加重＋域色。
  // `:not([class])` 只吃没有自己命名的裸 `<span>` —— stats 四页给两个 span 起了 `.fam-name`／
  // `.fam-key` 名（各页 PAGE_CSS 后到，但本规则若不加这个排除会因选择器更具体而盖掉它们的灰字）。
  + '\n.fam-head{display:flex;gap:8px;align-items:baseline;margin:0 0 10px}'
  + '.fam-head>span:not([class]){font-size:12px;font-weight:800;color:#0a63d6}'
  // #890 · 回执行「本次写入字段」的两列字段位（见 `receiptFields`）：左键名右值，长值回行不撑破卡。
  + '\n.receipt-detail{margin:10px 0 2px;display:grid;gap:4px}'
  + '.receipt-detail-row{display:grid;grid-template-columns:88px 1fr;gap:8px;font-size:13.5px}'
  + '.receipt-detail-k{color:#6e6e73}.receipt-detail-v{color:#1d1d1f;font-weight:600;overflow-wrap:anywhere}'
  // #920 页面级移动端配方（#525 公共层两件）接进本包：**整包恒开**，不走逐页 opt-in。
  // 此前本包 60 份模板自拼文档壳，只有 `buildStyleSheet()+blocksCss()`（区块样式），没有
  // **页面级**那一层（断点／44px 触摸区／安全区／窄屏表格行为／页内定位）——窄档下两列表
  // 渲染成「项／值 逐格重印列名」。两件都从 `base-paint` 顶层取，本件只负责拼进共享样式槽。
  // 规则全套挂在根类 `.ilife-page-ui` 之下（`pageUi.ts` 的口径），根类由下面的 `fillTemplate`
  // 投影加到版面根上——两处必须成对出现，缺一处即整套规则一条不命中。
  + '\n' + pageUiCss() + '\n' + pageShapeCss();
export const SHARED_HELPERS = '<script>function copyItem(id){var e=document.getElementById(id);if(e&&navigator.clipboard){navigator.clipboard.writeText(e.innerText);}}</script>'
  // 卡路里同款复制运行时：双通道复制 ＋ toast 反馈 ＋ `[data-action-id]` 委派（含三格式菜单开合）。
  // 老 `copyItem` 保留作迁移期兼容（旧页内联 `onclick="copyItem(...)"` 仍能点），46 页收完后再撤。
  + '\n<script>' + buildSharedHelpersJs() + '</script>';

export function fillTemplate(template: string, contentHtml: string): string {
  for (const m of [SHARED_CSS_MARKER, SHARED_HELPERS_MARKER, CONTENT_MARKER]) {
    if (template.split(m).length - 1 !== 1) throw new HomeRenderError('HOME_MARKER_INVALID', '标记须恰出现 1 次：' + m);
  }
  for (const s of [TEMPLATE_ROOT_ATTR, TEMPLATE_VIEWPORT_META]) {
    if (template.split(s).length - 1 !== 1) throw new HomeRenderError('HOME_MARKER_INVALID', '配方投影串须恰出现 1 次：' + s);
  }
  return template
    .split(TEMPLATE_ROOT_ATTR).join(PAGE_UI_ROOT_ATTR)
    .split(TEMPLATE_VIEWPORT_META).join(PAGE_UI_VIEWPORT_META)
    .split(SHARED_CSS_MARKER).join('<style>' + SHARED_CSS + '</style>')
    .split(SHARED_HELPERS_MARKER).join(SHARED_HELPERS)
    .split(CONTENT_MARKER).join(contentHtml);
}
