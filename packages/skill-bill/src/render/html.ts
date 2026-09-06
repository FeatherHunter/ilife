// 渲染层·HTML：envelope 按形状渲染为 section 页；转义仅 &<>"'；超体积大声失败。
import type { Envelope } from '@feather_wch/base-link-core';
import { BillRenderError } from './errors.js';

export const BILL_HTML_MAX_BYTES = 256 * 1024;

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function billItemHtml(n: Record<string, unknown>): string {
  const time = escapeHtml(String(n.time ?? ''));
  const cat = escapeHtml(String(n.category ?? ''));
  const amt = escapeHtml(String(n.amount ?? ''));
  const note = escapeHtml(String(n.note ?? ''));
  const id = escapeHtml(String(n.id ?? ''));
  return '<div class="item"><div class="item-head"><span class="id">' + id + '</span><span class="time">' + time + '</span><span class="badge">' + cat + '</span><span class="amt">' + amt + '</span></div><div class="content">' + note + '</div></div>';
}

function listHtml(items: unknown[]): string {
  if (!items.length) return '<div class="hm-empty">暂无记录</div>';
  return items.map((x) => billItemHtml(x as Record<string, unknown>)).join('');
}

// 按形状渲染 envelope 为 section 页；未知形状 throw 不返空页。
export function renderEnvelopeHtml(env: Envelope): string {
  const head = '<section data-skill="bill" data-shape="' + env.shape + '" data-key="' + escapeHtml(env.key) + '">';
  const d = env.data as Record<string, unknown>;
  switch (env.shape) {
    case 'list': return head + listHtml(d.items as unknown[]) + '</section>';
    case 'detail': return head + billItemHtml(d.item as Record<string, unknown>) + '</section>';
    case 'receipt': return head + '<div class="receipt">' + escapeHtml(String(d.message)) + '</div></section>';
    case 'stat': {
      const rows = Object.entries((d.metrics || {}) as Record<string, number>);
      return head + rows.map(([k, v]) => '<div class="stat"><b>' + v + '</b><span>' + escapeHtml(k) + '</span></div>').join('') + '</section>';
    }
    case 'analysis': return head + '<div class="analysis">' + escapeHtml(String(d.summary)).replace(/\n/g, '<br>') + '</div></section>';
    case 'fallback': return head + '<div data-degraded="1">' + escapeHtml(String(d.reason)) + '</div></section>';
    default: throw new BillRenderError('BILL_SHAPE_MISMATCH', '无法渲染形状：' + String((env as { shape?: unknown }).shape));
  }
}

export function estimateBytes(html: string): number { return Buffer.byteLength(html, 'utf8'); }

// 体积门：超限 throw（调用方走 fallback 形状显式降级，不静默截断）。
export function assertHtmlSize(html: string, max = BILL_HTML_MAX_BYTES): void {
  if (estimateBytes(html) > max) {
    throw new BillRenderError('BILL_HTML_TOO_LARGE', 'HTML 超体积：' + estimateBytes(html) + ' > ' + max);
  }
}

// 共享标记填充（老家离线注入壳对应）：CSS/HELPERS/CONTENT 三标记各恰出现 1 次，否则 throw。
export const SHARED_CSS_MARKER = '<!--SHARED-CSS-->';
export const SHARED_HELPERS_MARKER = '<!--SHARED-HELPERS-->';
export const CONTENT_MARKER = '<!--CONTENT-->';

export const SHARED_CSS = '.page{font-family:system-ui,sans-serif;max-width:720px;margin:0 auto;padding:12px}.item{border:1px solid #ddd;border-radius:8px;padding:8px;margin:8px 0}.item-head{display:flex;gap:8px;align-items:center}.badge{background:#eee;border-radius:4px;padding:0 6px}.amt{font-weight:700}.receipt{background:#f0fff0;border:1px solid #090;border-radius:8px;padding:12px}.stat{display:flex;gap:8px}.analysis{white-space:pre-wrap}.hm-empty{color:#888}';
export const SHARED_HELPERS = '<script>function copyItem(id){var e=document.getElementById(id);if(e&&navigator.clipboard){navigator.clipboard.writeText(e.innerText);}}</script>';

export function fillTemplate(template: string, contentHtml: string): string {
  for (const m of [SHARED_CSS_MARKER, SHARED_HELPERS_MARKER, CONTENT_MARKER]) {
    if (template.split(m).length - 1 !== 1) {
      throw new BillRenderError('BILL_MARKER_INVALID', '标记须恰出现 1 次：' + m);
    }
  }
  return template
    .split(SHARED_CSS_MARKER).join('<style>' + SHARED_CSS + '</style>')
    .split(SHARED_HELPERS_MARKER).join(SHARED_HELPERS)
    .split(CONTENT_MARKER).join(contentHtml);
}
