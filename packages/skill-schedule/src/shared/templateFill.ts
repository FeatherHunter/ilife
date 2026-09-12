// 共用位·标记填充：模板三标记各恰出现 1 次，否则 throw；CSS 包 <style>，helpers 原样注入。
import { ScheduleRenderError } from '../render/errors.js';

// 共享标记填充（老家离线注入壳对应）：CSS/HELPERS/CONTENT 三标记各恰出现 1 次，否则 throw。
const SHARED_CSS_MARKER = '<!--SHARED-CSS-->';
const SHARED_HELPERS_MARKER = '<!--SHARED-HELPERS-->';
const CONTENT_MARKER = '<!--CONTENT-->';

export const SHARED_CSS = '.page{font-family:system-ui,sans-serif;max-width:720px;margin:0 auto;padding:12px}.item{border:1px solid #ddd;border-radius:8px;padding:8px;margin:8px 0}.item-head{display:flex;gap:8px;align-items:center}.badge{background:#eee;border-radius:4px;padding:0 6px}.receipt{background:#f0fff0;border:1px solid #090;border-radius:8px;padding:12px}.stat{display:flex;gap:8px}.analysis{white-space:pre-wrap}.hm-empty{color:#888}';
export const SHARED_HELPERS = '<script>function copyItem(id){var e=document.getElementById(id);if(e&&navigator.clipboard){navigator.clipboard.writeText(e.innerText);}}</script>';

export function fillTemplate(template: string, contentHtml: string): string {
  for (const m of [SHARED_CSS_MARKER, SHARED_HELPERS_MARKER, CONTENT_MARKER]) {
    if (template.split(m).length - 1 !== 1) {
      throw new ScheduleRenderError('SCHEDULE_MARKER_INVALID', '标记须恰出现 1 次：' + m);
    }
  }
  return template
    .split(SHARED_CSS_MARKER).join('<style>' + SHARED_CSS + '</style>')
    .split(SHARED_HELPERS_MARKER).join(SHARED_HELPERS)
    .split(CONTENT_MARKER).join(contentHtml);
}
