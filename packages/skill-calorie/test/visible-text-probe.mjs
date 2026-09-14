/** #401c · 页面「可见文本」抽取＋机器话探针（唯一定义地，供测试与证据脚本共用）。
 *
 * 为什么要有这一件：`t425-融合基准.md:129-131`（裁定 1）定死了「参数名、常量名、英文内部标识符
 * 一律不上屏」，`test/exercise-summary-goal-fusion-452.test.mjs:196-198` 已把它落成一条正则判据
 * （`/\b[a-z][a-z0-9]*_[a-z0-9_]+\b/`）。本件把那一条扩成**四类机器话**，并按同一先例处理复制载荷：
 *   · `visibleText()`        只留**渲染后给用户看的文本**——剔除 `head`／`style`／`script`／注释，
 *                            并剔除**全部标签与属性**（`style="…"` 这类属性值因此不参与判定）；
 *   · `stripCopyPayload()`   **有意**承载可照抄技术原文的那几段（复制菜单的 `data-t` 载荷，
 *                            里面是命令键与库表名）——「命令键只许落在复制载荷」是 452 的同款口径；
 *   · `machineWords()`       在**剥掉复制载荷之后**的可见文本上找机器话，四类各返回一个命中或 null。
 *
 * 抽词法照 `.scratch/audit-text/extract.mjs`（t375 审计的抽取脚本，两种实现计数一致）。
 */

/** 承载可照抄技术原文的复制载荷（复制菜单按钮的 `data-t` 属性值）。 */
export function stripCopyPayload(html) {
  return html.replace(/data-t="[^"]*"/g, 'data-t="［复制载荷］"');
}

/** 可见文本：剔除 head/style/script/注释 与全部标签、属性；实体解码后按原样返回（不切句）。 */
export function visibleText(html) {
  return visibleSegments(html).map((s) => s.text).join('\n');
}

/** 可见文本的**整行**（与 `.scratch/audit-text/report.md` 的「长行」口径同：一行＝一个文本段）。 */
export function visibleLines(html) {
  return visibleSegments(html).map((s) => s.text);
}

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function visibleSegments(html) {
  const segs = [];
  let i = 0;
  let skip = null;
  let buf = '';
  const flush = () => {
    const t = buf.replace(/\s+/g, ' ').trim();
    if (t) segs.push({ text: t });
    buf = '';
  };
  while (i < html.length) {
    const ch = html[i];
    if (skip) {
      if (skip === 'comment') {
        if (html.startsWith('-->', i)) { skip = null; i += 3; continue; }
        i++; continue;
      }
      const close = '</' + skip;
      if (html.slice(i, i + close.length).toLowerCase() === close) {
        const gt = html.indexOf('>', i);
        if (gt === -1) break;
        i = gt + 1; skip = null; continue;
      }
      i++; continue;
    }
    if (html.startsWith('<!--', i)) { flush(); skip = 'comment'; i += 4; continue; }
    if (ch === '<') {
      const m = /^<([a-zA-Z][a-zA-Z0-9]*)/.exec(html.slice(i, i + 20));
      if (m) {
        const tag = m[1].toLowerCase();
        if (['style', 'script', 'head', 'title'].includes(tag)) {
          flush(); skip = tag; i += m[0].length; continue;
        }
      }
      flush(); // 整段标签（含属性）丢弃
      let j = i + 1;
      let quote = null;
      while (j < html.length) {
        const c = html[j];
        if (quote) { if (c === quote) quote = null; }
        else if (c === '"' || c === "'") quote = c;
        else if (c === '>') break;
        j++;
      }
      if (j >= html.length) break;
      i = j + 1; continue;
    }
    buf += ch === '\n' ? ' ' : ch;
    i++;
  }
  flush();
  return segs.map((s) => ({ text: decodeEntities(s.text) }));
}

/** 四类机器话的判据（在**剥掉复制载荷**的可见文本上跑；各返回首个命中或 `null`）。 */
export const MACHINE_WORD_RULES = [
  /** A1 全大写常量：`MEAL_WINDOWS`／`TDEE`；单个大写字母（单位 `G`）不算。 */
  { kind: 'A1 全大写常量', re: /\b[A-Z][A-Z0-9_]*[A-Z0-9]\b/ },
  /** A2 snake_case（库表名那种写法）：452 判据同一条正则。 */
  { kind: 'A2 snake_case', re: /\b[a-z][a-z0-9]*_[a-z0-9_]+\b/ },
  /** A3 内部命令键：`calorie.view.home`。 */
  { kind: 'A3 内部命令键', re: /\bcalorie\.[a-z0-9._-]+/ },
  /** A5 库名／表名／文件名：`calorie_data.db`／`weight_log` 那类带扩展名的串。 */
  { kind: 'A5 库表文件名', re: /\b[\w./-]+\.(?:ts|mjs|cjs|js|db|html|json|md|sql|css)\b/ },
];

/** 逐类找机器话：`{ kind, hit }` 或 `null`。 */
export function machineWords(html) {
  const text = visibleText(stripCopyPayload(html));
  return MACHINE_WORD_RULES.map((rule) => {
    const m = rule.re.exec(text);
    return { kind: rule.kind, hit: m === null ? null : m[0], text };
  });
}

/** 长行（整段可见文本 ≥ `min` 字符）——口径同 `.scratch/audit-text/report.md` 的 B3 表。 */
export function longLines(html, min = 50) {
  return visibleLines(html).filter((t) => t.length >= min);
}

/** 「2026-09-01 ~ 2026-09-07」这种窗口区间串在**可见文本**里出现的次数。 */
export function rangeOccurrences(html, start, end) {
  const needle = start + ' ~ ' + end;
  const text = visibleText(stripCopyPayload(html));
  return text.split(needle).length - 1;
}
