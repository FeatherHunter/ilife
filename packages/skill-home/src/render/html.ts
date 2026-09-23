// 渲染层·HTML：envelope 按形状渲染为 section 页；转义仅 &<>"'；超体积大声失败。
// 看密码 HTML 脱敏：ticket.write kind=account op=show 的 message 含明文时，HTML 快照仅占位（JSON 真相不受影响）。
import type { Envelope } from 'base-link-core';
import { buildSharedHelpersJs, buildStyleSheet } from 'base-paint';
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
      return head + '<div class="receipt">' + escapeHtml(msg) + '</div></section>';
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
  + '.fam-head>span:not([class]){font-size:12px;font-weight:800;color:#0a63d6}';
export const SHARED_HELPERS = '<script>function copyItem(id){var e=document.getElementById(id);if(e&&navigator.clipboard){navigator.clipboard.writeText(e.innerText);}}</script>'
  // 卡路里同款复制运行时：双通道复制 ＋ toast 反馈 ＋ `[data-action-id]` 委派（含三格式菜单开合）。
  // 老 `copyItem` 保留作迁移期兼容（旧页内联 `onclick="copyItem(...)"` 仍能点），46 页收完后再撤。
  + '\n<script>' + buildSharedHelpersJs() + '</script>';

export function fillTemplate(template: string, contentHtml: string): string {
  for (const m of [SHARED_CSS_MARKER, SHARED_HELPERS_MARKER, CONTENT_MARKER]) {
    if (template.split(m).length - 1 !== 1) throw new HomeRenderError('HOME_MARKER_INVALID', '标记须恰出现 1 次：' + m);
  }
  return template
    .split(SHARED_CSS_MARKER).join('<style>' + SHARED_CSS + '</style>')
    .split(SHARED_HELPERS_MARKER).join(SHARED_HELPERS)
    .split(CONTENT_MARKER).join(contentHtml);
}
