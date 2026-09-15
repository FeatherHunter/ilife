#!/usr/bin/env node
/** #530 · 场景09 视觉验收墙生成器（照仓规 `docs/agents/视觉验收墙.md` §5／§6.2／§6.3／§6.4／§7）。
 *
 * 用法（三条，都能独立跑）：
 *   node docs/skills/skill-calorie/t530-墙生成器.mjs --stage <交付目录> <产物目录>
 *     把交付面 16 件复制进产物目录（墙页、索引、产物**同目录**，iframe 走相对路径），
 *     写出册子 `清单.json`，出两张墙＋总索引，最后跑一次**双判据**自检。
 *   node docs/skills/skill-calorie/t530-墙生成器.mjs --check <产物目录>
 *     只跑自检。**两条判据一起判**：① `dropped`＝册子点名的每一份在不在盘上；
 *     ② `dead`＝**墙页／索引页里引用到的每一条链接在不在盘上**（只判①会出假绿灯：
 *     册子完好、墙页引用死链，自检照样报「缺失 0」）。**反例测试就是这两条**——
 *     往 `清单.json` 加一行指向不存在的文件（必 exit 1 点名），或把墙页里的一处
 *     引用改成不存在的名字（同样必须 exit 1 点名）。
 *   node docs/skills/skill-calorie/t530-墙生成器.mjs --wall <产物目录>
 *     只按当刻册子重出两张墙＋总索引（不复制产物），并自检。
 *
 * 形制（照 §6.3）：每格一件真产物；手机墙 390 宽 3 列、桌面墙 1280 宽 1 列且**整体缩放**
 * （定尺寸框 ＋ `transform:scale`，视口仍是 1280，所以墙上看到的就是 1280 档真版式）；
 * 每格标签＝编号 ＋ 点开整页的标题 ＋ **一句「这一格该确认什么」**。
 * **不给 iframe 加 `loading="lazy"`**（§7 第一个坑：下半页格子永远空白）。
 * 命名规则只在本文件一处算：册子里直接存**最终发布名**（`file` 字段），墙与索引都读它。
 *
 * 谁在用：场景09 整改波次（地图 #159）的收口票 #530；对照基准 `t524-场景09-视觉整改基准.md` §1。
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** 册子：序号／族／形态／标题／唤醒词／文件名／**这一格该确认什么**。发布名在这里一处算出。 */
const ROWS = [
  { seq: 1, family: '读侧A', kind: '结果型', wake: '看身材照', title: '看身材照（画廊·全窗22张·本页4张）', file: '09-01-看身材照（画廊·全窗22张·本页4张）.html', check: '首屏是否先看到「这一页是什么」与第一张图；卡片是否等高、图注有没有串行' },
  { seq: 2, family: '读侧A', kind: '结果型', wake: '查身材照', title: '查身材照（单张·大图超1MiB）', file: '09-02-查身材照（单张·大图超1MiB）.html', check: '大图放不下时有没有写明原因与下一步，而不是一片空白' },
  { seq: 3, family: '读侧A', kind: '结果型', wake: '查身材照', title: '查身材照（单张·大图已内嵌）', file: '09-03-查身材照（单张·大图已内嵌）.html', check: '图在手机档是否完整可看；页头那条结论有没有重复说别处已经说过的事' },
  { seq: 4, family: '读侧B', kind: '结果型', wake: '对比两张照片', title: '对比两张照片（跨标签·间隔48天）', file: '09-04-对比两张照片（跨标签·间隔48天）.html', check: '两张图是否等高并排；两张标签不同时那句人话提醒在不在' },
  { seq: 5, family: '结果型', kind: '结果型', wake: '生成身材照GIF', title: '生成身材照GIF（结果页·内嵌GIF）', file: '09-05-生成身材照GIF（结果页·内嵌GIF）.html', check: 'GIF 舞台有没有播出画面、宽度有没有被容器约束住' },
  { seq: 6, family: '过程型', kind: '预检确认页', wake: '记身材照', title: '记身材照（预检确认页）', file: '09-06-记身材照（预检确认页）.html', check: '三个填写位在不在；有没有一眼看出「这些是 AI 已用的值，要改就跟 AI 说」' },
  { seq: 7, family: '过程型', kind: '预检确认页', wake: '生成身材照GIF', title: '生成身材照GIF（前置规划页）', file: '09-07-生成身材照GIF（前置规划页）.html', check: '候选表窄屏行为（横滚或卡片化）；下拉里看得出当刻当前值' },
  { seq: 8, family: '过程型', kind: '预检确认页', wake: '删身材照', title: '删身材照（候选页·全窗）', file: '09-08-删身材照（候选页·全窗）.html', check: '候选格是否等高成栅格；缺文件的那条才挂徽章；**这一页很大（约 18.8 MB），滚到它会慢**' },
  { seq: 9, family: '回执', kind: '回执', wake: '记身材照 ／ 存身材照', title: '记身材照（写入回执）', file: '09-09-记身材照（写入回执）.html', check: '失败张是否逐张写出原因；「一张一块」的图与三槽行是否对齐' },
  { seq: 10, family: '回执', kind: '回执', wake: '改照片标签', title: '改照片标签（回执）', file: '09-10-改照片标签（回执）.html', check: '三态表（改前／改后／变化）是否一眼扫得出哪条变了' },
  { seq: 11, family: '回执', kind: '回执', wake: '加照片标签', title: '加照片标签（回执）', file: '09-11-加照片标签（回执）.html', check: '列头随场景改成「加前／加后」；新增项是否用 ＋ 与色彩标出' },
  { seq: 12, family: '回执', kind: '回执', wake: '删照片标签', title: '删照片标签（回执）', file: '09-12-删照片标签（回执）.html', check: '列头随场景改成「删除前／删除后」；移除项是否用 − 标出' },
  { seq: 13, family: '回执', kind: '回执', wake: '删身材照', title: '删身材照（写入回执）', file: '09-13-删身材照（写入回执）.html', check: '「永久删除，无法恢复」全页只出现一次；快照与警示是否成块' },
  { seq: 14, family: '过程型', kind: '预检确认页', wake: '删身材照（选中 id19）', title: '删身材照（候选快照·id19）', file: '09-14-删身材照（候选快照·id19）.html', check: '选中后的大图与基本信息是否成块；**这一页很大（约 23 MB），滚到它会慢**' },
  { seq: 15, family: 'HELP', kind: '结果型', wake: '看身材照HELP（现找）', title: '看身材照HELP（q现找·记身材照）', file: '09-15-看身材照HELP（q现找·记身材照）.html', check: '每行是否「人话在前、载荷在后」（原文收在折叠里）；每行恰一枚唤醒词徽章' },
  { seq: 16, family: 'HELP', kind: '结果型', wake: '看身材照HELP（全量）', title: '看身材照HELP（全量10键）', file: '09-16-看身材照HELP（全量10键）.html', check: '十条是否同一种行式；屏上不出现原始代码与内部标识符' },
];

/** 有意不出产物的条目（索引页末尾那一节：省掉最多追问）。 */
const NOT_SHIPPED = [
  { what: '看身材照HELP（逐字查「看身材照HELP」）', why: '该词是自造入口词，逐字查 0 命中、命令退出码 4；路由表残留归 #446，故本批只出 q=「记身材照」与 q=「」（全量）两态。' },
];

const MANIFEST = '清单.json';
const CELL_H = 820;
/** 宽墙缩放（§6.3 第 3 条）：格子宽 ≤500 不缩；否则缩到 600px 可视宽，视口仍是被量的那个宽。 */
const SCALE_OF = (w) => (w <= 500 ? 1 : Math.min(0.5, 600 / w));

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const argOf = (flag, dflt) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
};
const die = (code, msg) => { console.error(msg); process.exit(code); };

/** ① 造册：把交付面 16 件复制进产物目录（同目录布局），并写册子。 */
function stage(srcDir, dstDir) {
  if (!existsSync(srcDir)) die(2, `没有交付目录：${srcDir}`);
  mkdirSync(dstDir, { recursive: true });
  const missing = [];
  for (const r of ROWS) {
    const from = join(srcDir, r.file);
    if (!existsSync(from)) { missing.push(r.file); continue; }
    copyFileSync(from, join(dstDir, r.file));
  }
  const manifest = { madeAt: new Date().toISOString().slice(0, 16).replace('T', ' '), srcDir, rows: ROWS, notShipped: NOT_SHIPPED };
  writeFileSync(join(dstDir, MANIFEST), JSON.stringify(manifest, null, 2) + '\n', 'utf8');  // 不带签名（§7）
  if (missing.length) console.log(`交付面缺件（先重出再铺墙，不算自检红）：${missing.join('、')}`);
}

/** ②-a 判据一 `dropped`：册子点名的每一份都得在盘上。返回留下的行。 */
function manifestCheck(dir) {
  const mf = join(dir, MANIFEST);
  if (!existsSync(mf)) die(2, `没有册子：${mf}（先跑 --stage）`);
  const { rows } = JSON.parse(readFileSync(mf, 'utf8'));
  const dropped = rows.filter((r) => !r.file || !existsSync(join(dir, r.file)));
  return { kept: rows.filter((r) => !dropped.includes(r)), dropped };
}

/** ②-b 判据二 `dead`：**墙页／索引页里引用到的每一条链接**都得在盘上（只判 ① 会假绿灯）。 */
function refCheck(dir, pages, kept) {
  const dead = [];
  let refs = 0;
  for (const p of pages) {
    const f = join(dir, p);
    if (!existsSync(f)) { dead.push(`${p}（页面本身不存在）`); continue; }
    const html = readFileSync(f, 'utf8');
    for (const m of html.matchAll(/(?:src|href)="([^"#?]+\.html)"/g)) {
      refs += 1;
      const target = decodeURIComponent(m[1]);
      if (target === p) continue;                       // 索引页自指不算
      if (!existsSync(join(dir, target))) dead.push(`${p} -> ${target}`);
    }
  }
  console.log(`墙 ${pages.join('、')}：${kept.length} 格；链接 ${refs} 条；`
    + (dead.length === 0 ? '缺失 0 -> 可发' : `缺 ${dead.length} 件 -> ${dead.join('、')}`));
  return dead;
}

/** ③ 出墙：手机墙 390 宽 3 列；桌面墙 1280 宽 1 列且整体缩放（§6.3）。 */
function wall(dir, kept) {
  const build = (w, cols, out, label) => {
    const s = SCALE_OF(w);
    const boxH = Math.round(CELL_H * s);
    const cells = kept.map((r) => `  <figure>
    <figcaption><a href="${esc(r.file)}" target="_blank" rel="noopener">${esc(r.seq + ' ' + r.title)}</a>
      <span>${esc(r.kind)}</span></figcaption>
    <div class="cell"><iframe src="${esc(r.file)}" width="${w}" height="${CELL_H}" title="${esc(r.title)}"
      style="width:${w}px;height:${CELL_H}px;transform:scale(${s});transform-origin:0 0"></iframe></div>
    <p class="chk">${esc(r.check)}</p>
  </figure>`).join('\n');
    const page = `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(out)}（${kept.length} 格 × ${w} 宽）</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;background:#f5f5f7;color:#1d1d1f}
.wrap{padding:24px 20px 60px}
h1{font-size:22px;font-weight:600;margin-bottom:6px}
.sub{color:#6e6e73;font-size:13.5px;margin-bottom:20px;line-height:1.7}
.grid{display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start}
figure{background:#fff;border:1px solid #d2d2d7;border-radius:12px;overflow:hidden;width:${w <= 500 ? w : 600}px}
figcaption{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:8px 10px;font-size:12.5px;font-weight:600;border-bottom:1px solid #e8e8ed}
figcaption a{color:#007aff;text-decoration:none}
figcaption span{color:#86868b;font-weight:400;font-size:11.5px;white-space:nowrap}
.cell{width:${w <= 500 ? w : 600}px;height:${boxH}px;overflow:hidden;background:#fff}
iframe{display:block;border:0;background:#fff}
.chk{margin:0;padding:7px 10px 9px;font-size:12px;line-height:1.6;color:#3a3a3c;border-top:1px solid #e8e8ed;background:#fbfbfd}
</style></head><body><div class="wrap">
<h1>${esc(label)} · ${kept.length} 格 × ${w} 宽</h1>
<div class="sub">每格是一份产物在 ${w} 宽下的<b>真实渲染</b>（可交互；格子里能滚动、能点）。点标题在新标签打开整页。
每格下面那句是<b>这一格该确认什么</b>。这一页给人看，不是交付产物。</div>
<div class="grid">
${cells}
</div></div></body></html>
`;
    writeFileSync(join(dir, out), page, 'utf8');
    return out;
  };
  const a = build(390, 3, '场景09-手机墙.html', '手机墙');
  const b = build(1280, 1, '场景09-桌面墙.html', '桌面墙');

  const families = [...new Set(kept.map((r) => r.family))];
  const groups = families.map((f) => {
    const rows = kept.filter((r) => r.family === f).map((r) => `      <tr><td>${r.seq}</td><td><a href="${esc(r.file)}">${esc(r.title)}</a></td>
        <td>${esc(r.kind)}</td><td>${esc(r.wake)}</td><td>${esc(r.check)}</td></tr>`).join('\n');
    return `    <h2>${esc(f)}（${kept.filter((r) => r.family === f).length} 件）</h2>
    <table><thead><tr><th>#</th><th>标题</th><th>形态</th><th>念这句（唤醒词）</th><th>这一格该确认什么</th></tr></thead>
    <tbody>
${rows}
    </tbody></table>`;
  }).join('\n');
  const notShipped = NOT_SHIPPED.map((n) => `      <li><b>${esc(n.what)}</b>：${esc(n.why)}</li>`).join('\n');
  const index = `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>场景09 验收总索引（${kept.length} 件）</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;background:#f5f5f7;color:#1d1d1f}
.wrap{padding:28px 22px 60px;max-width:1080px}
h1{font-size:24px;font-weight:600;margin-bottom:6px}
.sub{color:#6e6e73;font-size:13.5px;line-height:1.8;margin-bottom:22px}
h2{font-size:15px;font-weight:600;margin:26px 0 10px}
table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #d2d2d7;border-radius:12px;overflow:hidden}
th,td{text-align:left;padding:9px 12px;border-bottom:1px solid #ececf0;font-size:13px;vertical-align:top}
th{background:#fafafa;font-weight:600;color:#3a3a3c}
a{color:#007aff;text-decoration:none}
ul{margin:8px 0 0 20px;font-size:13px;line-height:1.9;color:#3a3a3c}
.note{margin-top:28px;background:#fff;border:1px solid #d2d2d7;border-radius:12px;padding:16px 18px}
</style></head><body><div class="wrap">
<h1>场景09「身材照片」验收总索引</h1>
<div class="sub">16 件产物按页面族分组；每件给「念哪句话（唤醒词）／什么形态／<b>这一格该确认什么</b>」。
手机墙（390 宽，3 列）看塌列，桌面墙（1280 宽，1 列、整体缩放）看排布；两张墙与产物同目录，格数＝册子条目数。</div>
${groups}
<div class="note">
  <h2>有意不出产物及原因</h2>
  <ul>
${notShipped}
  </ul>
</div>
</div></body></html>
`;
  const idx = '场景09-总索引.html';
  writeFileSync(join(dir, idx), index, 'utf8');
  return [a, b, idx];
}

const mode = process.argv.includes('--stage') ? 'stage' : process.argv.includes('--wall') ? 'wall' : process.argv.includes('--check') ? 'check' : '';
if (!mode) die(2, '用法：--stage <交付目录> <产物目录> | --check <产物目录> | --wall <产物目录>');

const WALL_PAGES = ['场景09-手机墙.html', '场景09-桌面墙.html', '场景09-总索引.html'];

if (mode === 'stage') {
  const src = argOf('--stage', '');
  const dst = process.argv[process.argv.length - 1];
  if (!src || !dst || src === dst) die(2, '用法：--stage <交付目录> <产物目录>');
  stage(resolve(src), resolve(dst));
  const { kept, dropped } = manifestCheck(resolve(dst));
  const pages = wall(resolve(dst), kept);
  const dead = refCheck(resolve(dst), pages, kept);
  const bad = [...dropped.map((r) => r.file), ...dead];
  if (bad.length) { for (const b of bad) console.error(`缺失 ${b}`); process.exit(1); }
  console.log(`墙与索引：${join(resolve(dst), '场景09-手机墙.html')} / 桌面墙 / 总索引`);
} else if (mode === 'check') {
  const dir = resolve(argOf('--check', '.'));
  const { kept, dropped } = manifestCheck(dir);
  const dead = refCheck(dir, WALL_PAGES, kept);
  if (dropped.length || dead.length) { for (const d of dropped) console.error(`册子点名而盘上没有：${d.file}`); for (const d of dead) console.error(`墙页引用而盘上没有：${d}`); process.exit(1); }
} else {
  const dir = resolve(argOf('--wall', '.'));
  const { kept, dropped } = manifestCheck(dir);
  const pages = wall(dir, kept);
  const dead = refCheck(dir, pages, kept);
  if (dropped.length || dead.length) { for (const d of dropped) console.error(`册子点名而盘上没有：${d.file}`); for (const d of dead) console.error(`墙页引用而盘上没有：${d}`); process.exit(1); }
  console.log(`墙与索引已重出：${dir}`);
}
