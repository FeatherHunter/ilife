#!/usr/bin/env node
/** #835 · 终审复核器「屏上字符面」：对**渲染后的可见文字**逐页扫三类字符，给人核档逐条引用。
 *
 * 三类（对应硬扣分 H7 与判据 ⑥ 的入口）：
 *   ① 半角标点：`, : ; ( ) / = ! ? [ ] " '`（全角版 U+FF0C 等不算；`#数字` 与日期里的 `-` 按判据口径放过）
 *   ② 英文裸词：连续 2 个以上 ASCII 字母，逐条列出并给上下文
 *   ③ 内部标识符候选：`tk_` 开头／`id`／`status`／`active`／驼峰函数名／下划线字段名
 *
 * 为什么不用 `t869-机审.mjs` 重跑一遍：那一件判的是**静态面 ＋ 载荷位**（口径见 `t869-机审读数.md` §3.1），
 * 而终审要的是**用户真正看见的那一页**（渲染后）。两把尺量的不是同一个量，本件量后者，读数与前者并列存。
 *
 * 用法（仓根）：
 *   node docs/skills/skill-memo-ilife/t835-屏上字符.mjs --pages <页群目录> --json <落点>
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const argOf = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const PAGES = resolve(argOf('--pages', 'packages/skill-memo-ilife/.scratch/t834/源'));
const JSONOUT = resolve(argOf('--json', 'packages/skill-memo-ilife/.scratch/t835-读数/屏上字符.json'));
const CSSJSON = resolve(argOf('--css', 'packages/skill-memo-ilife/.scratch/t835-读数/计算样式面.json'));

if (!existsSync(CSSJSON)) { console.error('缺渲染读数（先跑 t835-计算样式面.mjs）：' + CSSJSON); process.exit(2); }
const css = JSON.parse(readFileSync(CSSJSON, 'utf8'));

/** 判据放过清单（与 `t869-机审读数.md` §二 同口径）。 */
const ALLOW_WORDS = new Set(['AI']);
const HALF = [',', ':', ';', '(', ')', '/', '=', '!', '?', '[', ']', '{', '}', '"', "'", '<', '>', '&', '@', '*', '+', '~', '\\', '%', '$', '^', '`', '|'];

const rows = [];
let badPages = 0;
for (const row of css.rows) {
  const per = { file: `${row.stem}.html`, stem: row.stem, byWidth: {} };
  let pageHit = false;
  for (const w of Object.keys(row.byWidth)) {
    const v = row.byWidth[w];
    const text = v.visibleTextJoined;
    const halfHits = [];
    for (const c of HALF) {
      let idx = text.indexOf(c);
      while (idx >= 0) {
        const ctx = text.slice(Math.max(0, idx - 24), idx + 25);
        // 放过：`#数字`、日期里的 `-`、时间里的 `:`、`…` 之外的省略号
        const before = text.slice(Math.max(0, idx - 1), idx);
        const after = text.slice(idx + 1, idx + 2);
        const isDateDash = c === '-' && /[0-9]/.test(before) && /[0-9]/.test(after);
        const isTimeColon = c === ':' && /[0-9]/.test(before) && /[0-9]/.test(after);
        if (!isDateDash && !isTimeColon) halfHits.push({ ch: c, around: ctx });
        idx = text.indexOf(c, idx + 1);
      }
    }
    const words = [...new Set((text.match(/[A-Za-z]{2,}/g) ?? []))];
    const wordHits = [];
    for (const word of words) {
      if (ALLOW_WORDS.has(word)) continue;
      let idx = text.indexOf(word);
      wordHits.push({ word, around: text.slice(Math.max(0, idx - 24), idx + word.length + 25) });
    }
    const identHits = [...new Set((text.match(/\btk_[A-Za-z0-9_]+|[a-z]+_[a-z_]+|\b(?:id|status|active|done|pending|guid|uuid|json|html|css|payload)\b/g) ?? []))];
    per.byWidth[w] = {
      halfCount: halfHits.length, halfHits: halfHits.slice(0, 20),
      wordCount: wordHits.length, wordHits: wordHits.slice(0, 20),
      identCount: identHits.length, identHits,
    };
    if (halfHits.length + wordHits.length + identHits.length > 0) pageHit = true;
    console.log(`CHAR ${row.stem} 【${w}】半角标点 ${halfHits.length} 处／英文裸词 ${wordHits.length} 个／内部标识符候选 ${identHits.length} 个`
      + (pageHit ? `  ← ${[...halfHits.map((h) => h.ch), ...wordHits.map((h) => h.word), ...identHits].slice(0, 6).join(' ')}` : ''));
  }
  if (pageHit) badPages += 1;
  rows.push(per);
}

mkdirSync(dirname(JSONOUT), { recursive: true });
writeFileSync(JSONOUT, JSON.stringify({ at: new Date().toISOString(), pages: PAGES, rows }, null, 1), 'utf8');
console.log(`RESULT: ${rows.length} 页；屏上命中半角标点／英文裸词／内部标识符候选的页 = ${badPages}；读数落 ${JSONOUT}`);
process.exit(0);
