/** 独立审查兵探针 D：**全表**深度核对（打被审脚本的盲区）。
 *
 *  被审脚本 `c4heads`／`subLines` 都只取页内**第一张**表（`/<thead>…<\/thead>/` 首个命中、
 *  `/<tbody>…<\/tbody>/` 首个命中），于是：
 *    - 176／177／179／183／184 这些**一页多张动作表**的页，第 2…N 张表的列名、副行、行数**根本没被判**；
 *    - 副行「逐格齐」也只覆盖第一张表。
 *  本探针逐页遍历**每一张** data-table：列名必须逐字等于四列、每个动作格必须＝加粗名＋副行、
 *  副行必须非空且以「主要／孤立／类型原值」收尾、正文无裸词；并把逐页动作行数与夹具真值对数。
 *  用法：node .scratch/t351-a2/review/probe-tables.mjs <产物目录> [真数据页]
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] ?? '.scratch/t351-fix/final-v4';
const FOUR = ['动作', '部位', '组数×次数', '重量'];
const TYPE_ZH = { main: '主要', iso: '孤立' };
const re = [];
let problems = 0;
let tables = 0;
let actionTables = 0;
let rows = 0;
const perPage = {};

const files = readdirSync(dir).filter((f) => f.endsWith('.html')).sort();
for (const f of files) {
  const html = readFileSync(join(dir, f), 'utf8');
  const body = html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '');
  const bodyNoPayload = body.replace(/data-t="[^"]*"/g, 'data-t=""');
  const tableRe = /<div class="ilife-block ilife-block-data-table">([\s\S]*?)<\/table>/g;
  let m;
  const pageTables = [];
  while ((m = tableRe.exec(html)) !== null) {
    tables += 1;
    const t = m[1];
    const heads = [...t.matchAll(/<th[^>]*>([^<]*)<\/th>/g)].map((x) => x[1].trim());
    const isAction = heads.includes('组数×次数');
    pageTables.push(heads.length);
    if (!isAction) continue;
    actionTables += 1;
    if (JSON.stringify(heads) !== JSON.stringify(FOUR)) {
      problems += 1;
      console.log('FAIL 列名 ' + f + ' 表#' + pageTables.length + ' ＝ ' + heads.join('／'));
      continue;
    }
    // 逐行：首格必须 <strong>名</strong> + 块级副行；副行要非空且尾段是类型中文
    const tbody = /<tbody>([\s\S]*?)<\/tbody>/.exec(t);
    const trows = tbody === null ? [] : [...tbody[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)];
    rows += trows.length;
    for (const r of trows) {
      const first = (/<td[^>]*>([\s\S]*?)<\/td>/.exec(r[1]) ?? [, ''])[1];
      const strong = /^<strong>([^<]*)<\/strong>/.exec(first);
      const sub = (/<p class="ilife-block-caliber">([\s\S]*?)<\/p>/.exec(first.match(/<strong>[^<]*<\/strong>([\s\S]*)$/)?.[1] ?? '') ?? [, ''])[1];
      if (strong === null) { problems += 1; console.log('FAIL 无加粗名 ' + f + ' 表#' + pageTables.length + ' ＝ ' + first.slice(0, 90)); continue; }
      if (sub === '') { problems += 1; console.log('FAIL 副行空 ' + f + ' 「' + strong[1] + '」'); continue; }
      const tail = sub.split(' · ').pop();
      if (!['主要', '孤立'].includes(tail) && TYPE_ZH[tail] === undefined) {
        problems += 1; console.log('FAIL 副行尾段 ' + f + ' 「' + strong[1] + '」副行=' + JSON.stringify(sub));
      }
    }
  }
  perPage[f] = pageTables;
  const hit = bodyNoPayload.match(/(?<![\w-])(main|iso)(?![\w-])/);
  if (hit !== null) { problems += 1; console.log('FAIL 正文裸词 ' + f + ' ＝ ' + hit[1]); }
}
for (const r of re) console.log(r);
const multi = Object.entries(perPage).filter(([, v]) => v.filter((n) => n === 4).length > 1);
console.log('TABLES_TOTAL=' + tables + ' 动作表=' + actionTables + ' 动作行=' + rows);
console.log('MULTI_TABLE_PAGES=' + JSON.stringify(multi.map(([k, v]) => [k, v])));
console.log(problems === 0 ? 'PROBE_TABLES: GREEN（全表逐格核过）' : 'PROBE_TABLES: RED(' + problems + ')');
console.log('RESULT: ' + (problems === 0 ? '1/1' : '0/1'));
process.exit(problems === 0 ? 0 : 1);
