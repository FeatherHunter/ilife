// 渲染层·HTML：envelope 按形状渲染为 section 页；转义仅 &<>"'；超体积大声失败。
// 看密码 HTML 脱敏：ticket.write kind=account op=show 的 message 含明文时，HTML 快照仅占位（JSON 真相不受影响）。
import type { Envelope } from '@feather_wch/base-link-core';
import { HomeRenderError } from './errors.js';

export const HOME_HTML_MAX_BYTES = 256 * 1024;

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function itemHtml(n: Record<string, unknown>): string {
  const id = escapeHtml(String(n.id ?? ''));
  const name = escapeHtml(String(n.name ?? ''));
  const loc = escapeHtml(String(n.location ?? n.locations ?? ''));
  const qty = n.quantity !== undefined ? ' ×' + escapeHtml(String(n.quantity)) : '';
  return '<div class="item"><div class="item-head"><span class="id">#' + id + '</span><span class="name">' + name + '</span></div><div class="content">' + loc + qty + '</div></div>';
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

export const SHARED_CSS = '.page{font-family:system-ui,sans-serif;max-width:720px;margin:0 auto;padding:12px}.item{border:1px solid #ddd;border-radius:8px;padding:8px;margin:8px 0}.item-head{display:flex;gap:8px;align-items:center}.badge{background:#eee;border-radius:4px;padding:0 6px}.receipt{background:#f0fff0;border:1px solid #090;border-radius:8px;padding:12px}.stat{display:flex;gap:8px}.analysis{white-space:pre-wrap}.hm-empty{color:#888}';
export const SHARED_HELPERS = '<script>function copyItem(id){var e=document.getElementById(id);if(e&&navigator.clipboard){navigator.clipboard.writeText(e.innerText);}}</script>';

export function fillTemplate(template: string, contentHtml: string): string {
  for (const m of [SHARED_CSS_MARKER, SHARED_HELPERS_MARKER, CONTENT_MARKER]) {
    if (template.split(m).length - 1 !== 1) {
      throw new HomeRenderError('HOME_MARKER_INVALID', '标记须恰出现 1 次：' + m);
    }
  }
  return template
    .split(SHARED_CSS_MARKER).join('<style>' + SHARED_CSS + '</style>')
    .split(SHARED_HELPERS_MARKER).join(SHARED_HELPERS)
    .split(CONTENT_MARKER).join(contentHtml);
}
