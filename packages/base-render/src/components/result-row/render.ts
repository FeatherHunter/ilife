/** resultRow · **渲染**（纯函数：一份入参 → 一段标记；零 DOM、零副作用）。
 *
 *  形态 A（单行，值在右）：`缩略格 ｜ 标题 ＋ 副语 ｜ 读数`。
 *  命中词在**渲染期**就标出来（`<mark data-ilife-search-hit>`）：页面没挂搜索框时它也读得懂
 *  「这句为什么命中」；挂了搜索框，运行时会按用户新打的词重算高亮（静态高亮被真高亮取代）。
 *
 *  高亮**不靠色块**：`<mark>` 是语义标签，视觉是「下划线 ＋ 加粗」——色不是唯一信息。
 *  转义先于拼接：命中词只切原文，切出来的每一段各自 `esc()`，标记不会从词里漏出来。
 */
import { esc } from '../shared/escape.js';
import {
  RESULT_DEFAULTS, RESULT_EMPTY_ATTR, RESULT_FORM_ATTR, RESULT_ITEM_ATTR, RESULT_NAME_ATTR,
  RESULT_ROOT_CLASS, RESULT_SEARCH_HIT_ATTR, RESULT_SEARCH_ITEM_ATTR, RESULT_SEARCH_REGION_ATTR,
  RESULT_SEARCH_TAGS_ATTR,
} from './attrs.js';
import { normalizeResultRow } from './model.js';
import type { ResultItem } from './model.js';

/** 在原文里把命中词标出来（大小写不敏感；同一处只标一次；切出来的段各自转义）。 */
export function markTerms(raw: string, terms: readonly string[]): string {
  if (terms.length === 0 || raw === '') return esc(raw);
  const low = raw.toLowerCase();
  let at = 0;
  let out = '';
  while (at < raw.length) {
    let bestAt = -1;
    let bestLen = 0;
    for (const term of terms) {
      const found = low.indexOf(term.toLowerCase(), at);
      if (found < 0) continue;
      if (bestAt < 0 || found < bestAt || (found === bestAt && term.length > bestLen)) {
        bestAt = found;
        bestLen = term.length;
      }
    }
    if (bestAt < 0) break;
    out += esc(raw.slice(at, bestAt))
      + '<mark ' + RESULT_SEARCH_HIT_ATTR + '="">' + esc(raw.slice(bestAt, bestAt + bestLen)) + '</mark>';
    at = bestAt + bestLen;
  }
  return out + esc(raw.slice(at));
}

function itemHtml(it: ResultItem): string {
  const c = RESULT_ROOT_CLASS;
  const attrs: string[] = ['class="' + esc(it.extraClass === undefined ? c + '-item' : c + '-item ' + it.extraClass) + '"',
    RESULT_ITEM_ATTR + '=""', RESULT_SEARCH_ITEM_ATTR + '=""'];
  if (it.tags.length > 0) attrs.push(RESULT_SEARCH_TAGS_ATTR + '="' + esc(it.tags.join(' ')) + '"');

  const thumb = it.thumb === undefined ? ''
    : '<span class="' + c + '-thumb" aria-hidden="true">' + esc(it.thumb) + '</span>';
  const sub = it.subtitle === undefined ? ''
    : '<p class="' + c + '-sub">'
      + it.tags.map((t) => '<span class="' + c + '-tag">' + esc(t) + '</span>').join('')
      + markTerms(it.subtitle, it.highlights) + '</p>';
  const tagsOnly = it.subtitle === undefined && it.tags.length > 0
    ? '<p class="' + c + '-sub">' + it.tags.map((t) => '<span class="' + c + '-tag">' + esc(t) + '</span>').join('') + '</p>'
    : '';
  const none = it.value === undefined;
  const value = '<p class="' + c + '-v' + (none ? ' ' + c + '-v-none' : '') + '">'
    + '<b class="' + c + '-v-num">' + esc(none ? RESULT_DEFAULTS.unset : (it.value as string)) + '</b>'
    + (it.valueLabel === undefined ? '' : '<em class="' + c + '-v-lab">' + esc(it.valueLabel) + '</em>')
    + '</p>';

  return '<article ' + attrs.join(' ') + '>'
    + thumb
    + '<div class="' + c + '-main">'
    + '<p class="' + c + '-title">' + markTerms(it.title, it.highlights) + '</p>'
    + sub + tagsOnly
    + '</div>' + value + '</article>';
}

/** 渲染一批结果行。入参不合规一律 `bad-input`（不静默降级）。 */
export function renderResultRow(input: unknown): string {
  const m = normalizeResultRow(input);
  const c = RESULT_ROOT_CLASS;
  const hasThumb = m.items.some((it) => it.thumb !== undefined);
  const classes = [c, hasThumb ? c + '--thumb' : c + '--plain'];
  if (m.extraClass !== undefined) classes.push(m.extraClass);

  const rootAttrs: string[] = ['class="' + esc(classes.join(' ')) + '"', RESULT_FORM_ATTR + '="' + esc(m.form) + '"'];
  if (m.name !== undefined) {
    rootAttrs.push(RESULT_NAME_ATTR + '="' + esc(m.name) + '"');
    rootAttrs.push(RESULT_SEARCH_REGION_ATTR + '="' + esc(m.name) + '"');
  }
  if (m.label !== undefined) rootAttrs.push('aria-label="' + esc(m.label) + '"');

  if (m.items.length === 0) {
    return '<div ' + rootAttrs.join(' ') + '>'
      + '<p class="' + c + '-empty" ' + RESULT_EMPTY_ATTR + '="">' + esc(m.emptyText) + '</p></div>';
  }
  return '<div ' + rootAttrs.join(' ') + '>' + m.items.map((it) => itemHtml(it)).join('') + '</div>';
}
