#!/usr/bin/env node
/** #792 · **facts 读数器（作息域）**：把 61 件产物的 DOM 事实列量成判分引擎吃的 `facts.json`。
 *
 *  用途：判分引擎（`packages/base-render/scripts/判分.mjs`）要四件读数，其中 `sep`／`resp`／`fmt`
 *  三件由既有读数器现产（`t792-读数.mjs` 调度），第四件 `facts.json` 的**逐页键**由本件量。
 *
 *  量什么（照 `docs/base/base-render/t867-读数链契约.md` §四的字段；口径不另立）：
 *    · DOM 六列（机器可判）：`tables`（表格数）／`imgTags`（`<img>` 数）／`tdDataLabel`（带 `data-label` 的单元格数，
 *      即窄屏卡片化有没有做）／`tocEl`（页内目录／锚点元素数）／`aspectRatio`（带明确宽高比的图片数）／
 *      `scrollMargin`（带 `scroll-margin-top` 的元素数）；
 *    · 机器候选列：`english`（可见文本里的英文残留命中处数）／`dupFacts`（同一页里重复出现的字段事实处数）；
 *    · **人核四列**（`d1`／`d2`／`d4cut`／两列候选的判分）缺省 `0`：`d1`／`d2` 不是机器量得出来的
 *      （「内容列收得住」这类要人核／视觉判），本件**不假装量过**——写 0 并在页上留候选，由第二段的
 *      视觉打分那一步给值（`t867-facts.mjs` 的人核档就是干这件事的）。
 *
 *  真话纪律：机器能判的四列（tables／imgTags／tdDataLabel／tocEl/scrollMargin）逐页逐项量；
 *  在 HTML 里 `scroll-margin-top` 是 CSS 声明、不在元素属性上，故 `scrollMargin` 按**样式表里该选择器出现次数**
 *  的保守口径量（0 表示这一页没有任何滚动避让声明），并把这个口径写进 `_caliber` 字段。
 *
 *  用法：`node docs/skills/skill-schedule/t792-facts.mjs [--pages <产物目录>] [--out <facts.json>]`
 *  退出码：0＝量完落盘；2＝用法／目录缺失。
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..', '..');
const argOf = (n, d) => {
  const i = process.argv.indexOf(n);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const PAGES = resolve(argOf('--pages', join(REPO, '.scratch', 't792', '产物')));
const OUT = resolve(argOf('--out', join(REPO, '.scratch', 't792', '读数', 'facts.json')));

if (!existsSync(PAGES)) { console.error('ERR2 缺产物目录：' + PAGES); process.exit(2); }

/** 可见文本（剥样式、脚本、注释与标签）——英文残留与重复事实都按它判。 */
function visible(html) {
  return html
    .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]*>/g, '\u0000');
}
const count = (s, re) => (s.match(re) ?? []).length;

/** 一页的事实列。 */
function factsOf(html) {
  const vis = visible(html);
  const nodes = vis.split('\u0000').map((s) => s.replace(/\s+/g, ' ').trim()).filter((s) => s !== '');
  const text = nodes.join(' ');
  // DOM 六列
  const tables = count(html, /<table\b/gi);
  const imgTags = count(html, /<img\b/gi);
  const tdDataLabel = count(html, /<td\b[^>]*\bdata-label=/gi);
  const tocEl = count(html, /ilife-block-toc-block|id="toc|class="[^"]*\btoc\b/gi);
  const aspectRatio = count(html, /\bwidth\s*[:=]\s*["']?\d+[\s\S]{0,80}?\bheight\s*[:=]/gi);
  const scrollMargin = count(html, /scroll-margin(-top)?\s*:/gi);
  // 机器候选：英文残留（连续 ≥3 个拉丁字母的「词」，排除已知品牌／技术词与属性位）
  const ALLOW = new Set(['AI', 'JSON', 'CSV', 'HTML', 'CSS', 'SOP', 'ID', 'HELP', 'KB', 'MB', 'SQL', 'URL', 'M5']);
  const englishHits = [...new Set((text.match(/[A-Za-z][A-Za-z-]{2,}/g) ?? []))]
    .filter((w) => !ALLOW.has(w))
    .map((w) => ({ word: w, times: count(text, new RegExp('\\b' + w.replace(/[-]/g, '\\-') + '\\b', 'g')) }));
  // 机器候选：重复事实（同一段事实文本在页上出现 >1 次的条数）
  const seen = new Map();
  for (const n of nodes) {
    if (n.length < 6 || n.length > 80) continue;
    if (!/[\d年月日：:]/.test(n)) continue;   // 只挑「含数字的事实句」，避免把标题算进去
    seen.set(n, (seen.get(n) ?? 0) + 1);
  }
  const dupFacts = [...seen.values()].filter((n) => n > 1).length;
  return {
    tables, imgTags, tdDataLabel, tocEl, aspectRatio, scrollMargin,
    english: englishHits.length, dupFacts,
    // 人核四列（本件不假装量过；第二段的视觉／人核那一步给值）
    d1: 0, d2: 0, d4cut: 0,
    candidates: { english: { hits: englishHits.length, nodes: englishHits.slice(0, 12) }, dupFacts: { hits: dupFacts, kinds: [] } },
  };
}

const files = readdirSync(PAGES).filter((f) => f.toLowerCase().endsWith('.html')).sort();
const pages = {};
for (const f of files) {
  const key = f.replace(/\.html$/, '');
  if (Object.prototype.hasOwnProperty.call(pages, key)) { console.error('ERR2 页键撞车：' + key); process.exit(2); }
  pages[key] = factsOf(readFileSync(join(PAGES, f), 'utf8'));
}
writeFileSync(OUT, JSON.stringify({
  _caliber: 'facts.json（作息域）由 docs/skills/skill-schedule/t792-facts.mjs 现产：DOM 六列 ＋ 两列机器候选；人核四列（d1／d2／d4cut／两列判分）缺省 0，由第二段视觉／人核那一步给值。scrollMargin 按样式表里该声明出现次数量（CSS 声明不在元素属性上）。',
  pages,
}, null, 1) + '\n', 'utf8');

const sum = (k) => Object.values(pages).reduce((a, p) => a + p[k], 0);
console.log('facts 落盘 ' + OUT.replace(/\\/g, '/') + '：页=' + files.length
  + '；tables=' + sum('tables') + ' imgTags=' + sum('imgTags') + ' tdDataLabel=' + sum('tdDataLabel')
  + ' tocEl=' + sum('tocEl') + ' aspectRatio=' + sum('aspectRatio') + ' scrollMargin=' + sum('scrollMargin')
  + ' english候选=' + sum('english') + ' dupFacts候选=' + sum('dupFacts'));
