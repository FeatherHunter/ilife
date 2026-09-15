#!/usr/bin/env node
/** t369 · 链接自检：本目录**每个页面**里的 `href`／`src`（含墙上 `iframe` 的 `src`）都要落得到真实文件。
 *
 * 为什么要有这一件：参考件（T351 §2.4）就是靠它抓出生成器里一条指向不存在文件的死链——
 * 墙上少一格、索引点不开，肉眼要滚很久才发现；机器跑一遍就点名了。
 * 口径：外链（`http(s)://`／`//`）与非文件目标（`#`／`mailto:`／`data:`）不算；其余一律按**相对本页目录**解析。
 * 跑法：node docs/skills/skill-calorie/t369-验收/t369-链接自检.mjs   → 末行 `RESULT: n/n`
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKIP = /^(https?:)?\/\/|^#|^mailto:|^data:|^javascript:/i;
let all = 0;
let bad = 0;

for (const file of readdirSync(HERE).filter((f) => f.toLowerCase().endsWith('.html')).sort()) {
  const html = readFileSync(join(HERE, file), 'utf8');
  const refs = [...new Set([...html.matchAll(/\b(?:href|src)\s*=\s*["']([^"']*)["']/gi)].map((m) => m[1]))]
    .filter((h) => h && !SKIP.test(h));
  const miss = refs.filter((h) => {
    let p;
    try { p = decodeURIComponent(h.split('#')[0].split('?')[0]); } catch { p = h; }
    if (!p) return false;
    const target = join(HERE, p);
    return !(existsSync(target) && statSync(target).isFile());
  });
  all += refs.length;
  bad += miss.length;
  console.log(`${file}：${refs.length - miss.length}/${refs.length}${miss.length ? ' 死链 ' + miss.join('、') : ' 全部可达'}`);
}
console.log(`RESULT: ${all - bad}/${all}（死链 ${bad}）`);
process.exit(bad === 0 ? 0 : 1);
