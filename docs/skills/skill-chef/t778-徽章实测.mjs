#!/usr/bin/env node
/** #778 对抗式复核用：把「徽章断行参差」这类**版式印象**变成 CDP 实量读数。
 *
 * 判什么：390／1280 宽下每页的徽章件（`[class*="chip"|"badge"|"status"]`）——
 *   ① 按 top 聚成几行 ② 每行的左右缘 ③ 行与行的间距差。
 * 读法：出现「行距差 > 2px」才叫行间不齐；行的左缘一致、行距一致 ⇒ 「折了两行」是事实、「参差」是印象。
 *
 * 用法：node docs/skills/skill-chef/t778-徽章实测.mjs <批目录> [文件名关键字…]
 * 依赖：本机 headless Chrome／Edge（与 `t768-质量门.mjs` 同一个 `withBrowser`）。
 */
import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { withBrowser } from './t768-质量门.mjs';

const dir = resolve(process.argv[2] ?? '.scratch/t778');
const only = process.argv.length > 3 ? process.argv.slice(3) : null;
const files = [];
for (const d of readdirSync(dir, { withFileTypes: true })) {
  if (!d.isDirectory() || d.name === 'shots' || d.name === 'HELP') continue;
  for (const f of readdirSync(join(dir, d.name)).filter((x) => x.endsWith('.html')).sort()) {
    const rel = `${d.name}/${f}`;
    if (only !== null && !only.some((o) => rel.includes(o))) continue;
    files.push({ rel, path: join(dir, d.name, f) });
  }
}

const PROBE = `(function () {
  var nodes = [].slice.call(document.querySelectorAll('[class*="chip"],[class*="badge"],[class*="status"]'));
  var pIdx = new Map(), next = 0;
  var boxes = nodes.map(function (n) {
    var r = n.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) return null;
    var p = n.parentElement || document.body;
    if (!pIdx.has(p)) pIdx.set(p, next++);
    return { g: pIdx.get(p), t: Math.round(r.top), l: Math.round(r.left), rt: Math.round(r.right), txt: String(n.textContent || '').trim().slice(0, 10) };
  }).filter(Boolean);
  if (boxes.length === 0) return { chips: 0, groups: [] };
  // 关键：**按父容器分组再聚类**——不同分区的徽章（如每一步的「本步用料」）不在同一行带，
  // 混在一起算行距会造出「行距差 226px」这种假读数（第一版就吃过这个误报）。
  var byGroup = new Map();
  for (var i = 0; i < boxes.length; i += 1) { var b = boxes[i]; if (!byGroup.has(b.g)) byGroup.set(b.g, []); byGroup.get(b.g).push(b); }
  var groups = [];
  byGroup.forEach(function (items) {
    items.sort(function (a, b) { return a.t - b.t || a.l - b.l; });
    var rows = [];
    for (var j = 0; j < items.length; j += 1) {
      var it = items[j], last = rows[rows.length - 1];
      if (last && Math.abs(last.t - it.t) <= 4) last.items.push(it);
      else rows.push({ t: it.t, items: [it] });
    }
    groups.push({ n: items.length, rows: rows.map(function (r) { return { t: r.t, n: r.items.length, left: Math.min.apply(null, r.items.map(function (x) { return x.l; })), right: Math.max.apply(null, r.items.map(function (x) { return x.rt; })), first: r.items[0].txt }; }) });
  });
  return { chips: boxes.length, groups: groups };
}())`;

const got = await withBrowser(async ({ s, sleep }) => {
  const out = [];
  for (const f of files) {
    await s('Emulation.setDeviceMetricsOverride', { width: 390, height: 820, deviceScaleFactor: 1, mobile: true });
    await s('Page.navigate', { url: pathToFileURL(f.path).href });
    for (let i = 0; i < 80; i += 1) {
      const r = await s('Runtime.evaluate', { expression: 'document.readyState === "complete"', returnByValue: true });
      if (r.result && r.result.value === true) break;
      await sleep(50);
    }
    await sleep(120);
    const r = await s('Runtime.evaluate', { expression: PROBE, returnByValue: true });
    out.push({ rel: f.rel, ...r.result.value });
  }
  return out;
});
if (got.error !== undefined) { console.error('借浏览器失败：' + got.error); process.exit(2); }

let bad = 0;
for (const r of got) {
  if (r.chips === 0) { console.log(`${r.rel}  无徽章`); continue; }
  const judged = r.groups.filter((g) => g.rows.length > 1);
  let worst = 0;
  for (const g of judged) {
    const gaps = [];
    for (let i = 1; i < g.rows.length; i += 1) gaps.push(g.rows[i].t - g.rows[i - 1].t);
    const spread = gaps.length > 1 ? Math.max(...gaps) - Math.min(...gaps) : 0;
    if (spread > worst) worst = spread;
  }
  const uneven = worst > 2;
  if (uneven) bad += 1;
  console.log(`${r.rel}  徽章 ${r.chips} 枚／折行的容器 ${judged.length} 个  最差行距差 ${worst}px  → ${uneven ? '行距不均' : '行内齐、行间等距'}`);
  for (const g of judged) {
    for (const row of g.rows) console.log(`      row t=${row.t} n=${row.n} 左 ${row.left} 右 ${row.right} 起「${row.first}」`);
  }
}
console.log(`\n共 ${got.length} 页；判「行距不均」的 ${bad} 页`);
