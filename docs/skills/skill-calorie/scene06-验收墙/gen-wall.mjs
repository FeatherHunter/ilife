#!/usr/bin/env node
/** 场景06「目标管理 · 25 条唤醒词」视觉验收墙生成器（入仓件 · 无依赖）。
 *
 * 口径出处：仓规 `docs/agents/视觉验收墙.md`（§3 收口七步／§4 完成判据／§5 证据件落哪／
 * §6.2 骨架／§6.3 四条形制／§7 坑）。本件照 §6.2 起，并补上它点名的那处**假绿灯**：
 * `dropped`（清单点名却没有文件）与 `dead`（页上引用却落不到）**一起判**。
 *
 * 用法（位置参数，照票面）：
 *   node gen-wall.mjs [产物目录] [输出名] [宽] [高]
 *     node gen-wall.mjs . 手机墙-390.html 390 820      # 手机墙：390 宽 × 3 列
 *     node gen-wall.mjs . 桌面墙-1280.html 1280 860    # 桌面墙：1280 宽 × 1 列
 *   缺省＝`.`／`手机墙-390.html`／`390`／`820`。列数＝宽 ≤500 取 3、否则取 1（做法 §6.3-2）。
 *   宽 >500 时**整体缩显示**：`SCALE = min(0.5, 600 / 宽)`，外面套 `overflow:hidden` 的定尺寸框、
 *   里面 iframe 用 `transform:scale()` —— **缩的是显示不是视口**，格子里的媒体查询仍按 `宽` 生效
 *   （做法 §6.3-3）。
 *   node gen-wall.mjs --stage <源目录> <产物目录>   按清单把产物复制进同目录，再出两张墙 ＋ 索引 ＋ 自检
 *   node gen-wall.mjs --check <产物目录>            只跑自检（**反例测试就是这条**，改清单即红）
 *
 * 重跑方式：产物定版后 `node gen-wall.mjs . 手机墙-390.html 390 820` 与
 * `node gen-wall.mjs . 桌面墙-1280.html 1280 860`；**产物更新时先重新复制再重跑**
 * （`node gen-wall.mjs --stage <源目录> .`，或按清单 `file` 逐件覆盖同名副本）。
 *
 * 命名规则（全仓只此一处算）：发布名 ＝ **唤醒词 ＋ `.html`**，即清单 `manifest.json` 的
 * `file` 字段；复制、墙、索引、自检都只读它，**别处不许再拼**（做法 §1「同一个名字只在一处
 * 算出来」——两侧不一致＝全墙集体死链）。墙页、索引页与产物**必须同目录**（iframe 走相对路径）。
 *
 * 自检正反两面（做法「链接自检正反两面都走」）：
 *   正例 `node gen-wall.mjs . 手机墙-390.html 390 820` → 打印「N 格；链接 M 条；缺失 0 -> 可发」**exit 0**；
 *   反例 把清单某行 `file` 改成盘上不存在的名字再跑 → **exit 1 且点名那一份**；改回再跑回 exit 0。
 *
 * 另外两处照做：**不加 `loading="lazy"`**（做法 §7 第一坑：加了下半页格子永远空白）；
 * 清单**不带 BOM**（读到时剥并告警）。
 *
 * 口径缺口（如实记，别当已读）：票面点名的 `docs/skills/skill-calorie/t351-视觉验收墙-做法.md`
 * 在本仓**不存在**（`git ls-files` 无此件、全树 glob `**\/*做法*` 零命中，2026-09-15 实测）。
 * 本件按仓规 `docs/agents/视觉验收墙.md` §6 的骨架与四条形制落地，并把票面括号里点到的几条
 * （同目录／iframe 真渲染／双端 390／1280／生成器入仓／自检正反两面／不加 lazy／索引含
 * 「有意不出产物」节／宽产物按比例缩／同名只在一处算）逐条落进代码。
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const MANIFEST = 'manifest.json';
const INDEX = '总索引.html';
const WALL_MOBILE = '手机墙-390.html';
const WALL_DESKTOP = '桌面墙-1280.html';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const die = (code, msg) => { console.error(msg); process.exit(code); };

/** 清单是唯一权威：`rows[].file` 就是最终发布名。 */
function loadManifest(dir) {
  const p = join(dir, MANIFEST);
  if (!existsSync(p)) die(2, `没有清单：${p}（清单须入仓，别让墙猜文件名）`);
  let raw = readFileSync(p, 'utf8');
  if (raw.charCodeAt(0) === 0xfeff) {
    console.error('注意：清单带 BOM（仓规 §7：读出来会 Unexpected token）——本次已剥，请存不带签名的 UTF-8');
    raw = raw.replace(/^\uFEFF/, '');
  }
  const mf = JSON.parse(raw);
  const rows = mf.rows;
  if (!Array.isArray(rows) || rows.length === 0) die(2, `${p} 的 rows 为空`);
  for (const r of rows) {
    if (r.seq === undefined || !r.kind || !r.wake || !r.file) {
      die(2, `清单第 ${r.seq ?? '?'} 行缺字段（至少 seq／kind／wake／file）：${JSON.stringify(r)}`);
    }
  }
  return { mf, rows, notShipped: Array.isArray(mf.notShipped) ? mf.notShipped : [] };
}

/** ① 造册：按清单 `file`（＝发布名，全仓只此一处算）把产物复制进**同一目录**（不是移动）。 */
function stage(srcDir, dstDir) {
  const { rows } = loadManifest(dstDir);
  mkdirSync(dstDir, { recursive: true });
  const miss = [];
  for (const r of rows) {
    const from = join(srcDir, r.file);
    if (!existsSync(from)) { miss.push(`${r.seq} ${r.wake} -> ${r.file}`); continue; }
    copyFileSync(from, join(dstDir, r.file));
  }
  if (miss.length) die(1, `源目录缺件，先重出产物再铺墙：\n  ${miss.join('\n  ')}`);
  console.log(`复制进仓：${rows.length} 件 -> ${dstDir}（源 ${srcDir}，源目录原样保留）`);
  return rows;
}

const STYLE = `*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;background:#f5f5f7;color:#1d1d1f}
.wrap{padding:24px 20px 60px}
h1{font-size:22px;font-weight:600;margin-bottom:6px}
.sub{color:#6e6e73;font-size:13.5px;margin-bottom:20px;line-height:1.7}
.sub b{color:#1d1d1f}
.grid{display:grid;grid-template-columns:repeat(COLS,BOXWpx);gap:18px;align-items:start;justify-content:start}
figure{background:#fff;border:1px solid #d2d2d7;border-radius:12px;overflow:hidden;width:BOXWpx}
figcaption{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:8px 10px;font-size:12.5px;font-weight:600;border-bottom:1px solid #e8e8ed}
figcaption a{color:#007aff;text-decoration:none}
figcaption span{color:#86868b;font-weight:400;font-size:11.5px;white-space:nowrap}
.check{padding:7px 10px;font-size:11.5px;line-height:1.6;color:#3a3a3c;border-bottom:1px solid #e8e8ed;background:#fafafa}
.check b{color:#1d1d1f}
.shrink{overflow:hidden;position:relative}
iframe{display:block;border:0;background:#fff}`;

/** 每格＝真产物在**该宽度**下的真渲染（做法 §6.3-1：不塞缩略图；§6.3-3：宽产物整体缩显示）。 */
function cell(r, w, h, scale) {
  const boxW = Math.round(w * scale), boxH = Math.round(h * scale);
  const frame = scale === 1
    ? `    <iframe src="${esc(r.file)}" width="${w}" height="${h}" title="${esc(r.wake)}"></iframe>`
    : `    <div class="shrink" style="width:${boxW}px;height:${boxH}px">
      <iframe src="${esc(r.file)}" width="${w}" height="${h}" style="transform:scale(${scale.toFixed(3)});transform-origin:0 0" title="${esc(r.wake)}"></iframe>
    </div>`;
  return `  <figure>
    <figcaption><a href="${esc(r.file)}" target="_blank" rel="noopener">${esc(r.seq + ' ' + r.title)}</a>
      <span>${esc(r.kind)}</span></figcaption>
    <div class="check"><b>这一格该确认什么：</b>${esc(r.check || '（清单未给 check）')}</div>
${frame}
  </figure>`;
}

/** ② 出墙：每格一件真产物，格子宽＝要量的那个视口，高一致。 */
function buildWall(dir, rows, out, w, h) {
  const cols = w <= 500 ? 3 : 1;
  const scale = w <= 500 ? 1 : Math.min(0.5, 600 / w);
  const boxW = Math.round(w * scale);
  const cells = rows.map((r) => cell(r, w, h, scale)).join('\n');
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(out)}（${rows.length} 格 × ${w} 宽）</title>
<style>
${STYLE.replace(/COLS/g, String(cols)).replace(/BOXW/g, String(boxW))}
</style></head><body><div class="wrap">
<h1>场景06 验收墙 · ${rows.length} 格 × ${w} 宽（格高 ${h}）</h1>
<div class="sub">每格是一份产物在 <b>${w} 宽</b>下的<b>真实渲染</b>（可交互、媒体查询按该宽生效）。点标题在新标签打开整页。
${scale === 1 ? '格子宽＝视口宽，1:1。' : `宽产物按 <b>${scale.toFixed(3)}</b> 整体缩显示（缩的是显示不是视口，视口仍是 ${w}）。`}
细看入口：<a href="${INDEX}">总索引</a>。这一页给人看，不是交付产物。</div>
<div class="grid">
${cells}
</div></div></body></html>
`;
  writeFileSync(join(dir, out), html, 'utf8');
  return { name: out, html };
}

/** ③ 出索引：按页面族分组、每份一张卡，末尾列清「有意不出产物及其原因」（做法 §3-4）。 */
function buildIndex(dir, rows, notShipped) {
  const families = [...new Set(rows.map((r) => r.family || '未分组'))];
  const groups = families.map((f) => {
    const mine = rows.filter((r) => (r.family || '未分组') === f);
    const cards = mine.map((r) => `    <div class="card">
      <div class="card-head"><span class="seq">${r.seq}</span><a href="${esc(r.file)}">${esc(r.title)}</a><span class="kind">${esc(r.kind)}</span></div>
      <dl><dt>念这句</dt><dd>${esc(r.wake)}</dd>
        <dt>命令键</dt><dd><code>${esc(r.key || '（清单未给）')}</code></dd>
        <dt>文件</dt><dd><code>${esc(r.file)}</code></dd>
        <dt>该确认什么</dt><dd>${esc(r.check || '（清单未给）')}</dd></dl>
    </div>`).join('\n');
    return `  <h2>${esc(f)}（${mine.length} 件）</h2>
  <div class="cards">
${cards}
  </div>`;
  }).join('\n');

  const walls = [WALL_MOBILE, WALL_DESKTOP].filter((w) => existsSync(join(dir, w)));
  const wallLine = walls.length
    ? walls.map((w) => `<a href="${esc(w)}">${esc(w)}</a>`).join(' · ')
    : '（本次未出墙页）';
  const notShippedHtml = notShipped.length
    ? notShipped.map((n) => `      <li><b>${esc(n.what)}</b>：${esc(n.why)}</li>`).join('\n')
    : '      <li><b>清单未给 notShipped</b>：本页这一段不该为空，补进 manifest.json 再重跑。</li>';

  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>场景06 验收总索引（${rows.length} 件）</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;background:#f5f5f7;color:#1d1d1f}
.wrap{padding:28px 22px 60px;max-width:1080px}
h1{font-size:24px;font-weight:600;margin-bottom:6px}
.sub{color:#6e6e73;font-size:13.5px;line-height:1.8;margin-bottom:22px}
.sub b{color:#1d1d1f}
h2{font-size:15px;font-weight:600;margin:26px 0 10px}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px}
.card{background:#fff;border:1px solid #d2d2d7;border-radius:12px;padding:13px 15px}
.card-head{display:flex;align-items:baseline;gap:8px;margin-bottom:9px}
.seq{background:#1d1d1f;color:#fff;border-radius:6px;font-size:11.5px;font-weight:600;padding:1px 7px}
.card-head a{color:#007aff;text-decoration:none;font-size:14px;font-weight:600}
.kind{margin-left:auto;color:#86868b;font-size:11.5px}
dl{display:grid;grid-template-columns:70px 1fr;gap:3px 8px;font-size:12.5px;line-height:1.6}
dt{color:#86868b}
dd{color:#1d1d1f}
code{font-size:11.5px;color:#6e6e73;word-break:break-all}
.note{margin-top:28px;background:#fff;border:1px solid #d2d2d7;border-radius:12px;padding:16px 18px}
.note ul{margin:8px 0 0 20px;font-size:13px;line-height:1.9;color:#3a3a3c}
</style></head><body><div class="wrap">
<h1>场景06「目标管理 · 25 条唤醒词」验收总索引</h1>
<div class="sub">${rows.length} 件产物按页面族分组，每份一张卡（念哪句话／命令键／文件／该确认什么）。
手机墙 <b>390 宽 × 3 列</b>看塌列，桌面墙 <b>1280 宽 × 1 列</b>看排布；两张墙、本索引与产物**同目录**，
格数 ＝ 本索引卡的件数 ＝ 清单 <code>manifest.json</code> 的条目数（少任何一件，生成器自检点名并 exit 1）。
本页：${wallLine}</div>
${groups}
<div class="note">
  <h2>有意不出产物及其原因</h2>
  <ul>
${notShippedHtml}
  </ul>
</div>
</div></body></html>
`;
  writeFileSync(join(dir, INDEX), html, 'utf8');
  return { name: INDEX, html };
}

/** ④ 自检：`dropped`（清单点名却没有文件）与 `dead`（页上引用却落不到）**一起判**，
 *  再加 S2（#611 复核）：清单 `rows.length` ＝ 两张墙 `<figure>` 数 ＝ 总索引卡数，不等即点名 exit 1
 * （防墙上砍掉一格仍报可发的假绿灯）。 */
function selfCheck(dir, rows, pages) {
  const dropped = rows.filter((r) => !r.file || !existsSync(join(dir, r.file)));
  const refs = [];
  const perPage = [];
  for (const p of pages) {
    const mine = [...p.html.matchAll(/(?:src|href)="([^"#]+\.html)"/g)].map((m) => m[1]);
    refs.push(...mine);
    perPage.push(`${p.name} ${mine.length}`);
  }
  const dead = [...new Set(refs)].filter((r) => !existsSync(join(dir, decodeURIComponent(r))));
  // S2：按盘上文件数格子（刚建的墙已落盘，读盘即最新；--check 模式同样覆盖两张墙＋总索引）。
  const countBad = [];
  for (const wn of [WALL_MOBILE, WALL_DESKTOP]) {
    const wp = join(dir, wn);
    if (existsSync(wp)) {
      const html = readFileSync(wp, 'utf8');
      const figs = (html.match(/<figure[\s>]/g) || []).length;
      if (figs !== rows.length) countBad.push(`墙格数不对：${wn} 有 ${figs} 格，清单有 ${rows.length} 行`);
    }
  }
  const ip = join(dir, INDEX);
  if (existsSync(ip)) {
    const html = readFileSync(ip, 'utf8');
    const cards = (html.match(/class="card"/g) || []).length;
    if (cards !== rows.length) countBad.push(`总索引卡数不对：${INDEX} 有 ${cards} 卡，清单有 ${rows.length} 行`);
  }
  const bad = [
    ...dropped.map((r) => `清单点名却没有文件：${r.seq} ${r.wake} -> ${r.file || '（file 字段缺失）'}`),
    ...dead.map((d) => `页上引用却落不到：${d}`),
    ...countBad,
  ];
  const kept = rows.length - dropped.length;
  const clean = bad.length === 0;
  console.log(`${kept} 格；链接 ${refs.length} 条（${perPage.join(' ＋ ')}）；缺失 ${bad.length} -> ${clean ? '可发' : '不可发'}`);
  if (!clean) {
    for (const b of bad) console.error(`  ${b}`);
    console.error(`不可发（产物目录 ${dir}）`);
  }
  process.exit(clean ? 0 : 1);
}

/** `--check` 模式：读盘上已出的墙与索引，把它们的引用也一起查。 */
function pagesOnDisk(dir) {
  const pages = [];
  for (const n of [WALL_MOBILE, WALL_DESKTOP, INDEX]) {
    const p = join(dir, n);
    if (existsSync(p)) pages.push({ name: n, html: readFileSync(p, 'utf8') });
  }
  if (pages.length === 0) console.error('（盘上还没有墙页／索引：本次只判清单点名，未判页上引用）');
  return pages;
}

const argv = process.argv.slice(2);
const mode = argv[0] === '--stage' ? 'stage' : argv[0] === '--check' ? 'check' : 'wall';
const argOf = (i, dflt) => (argv[i] === undefined || argv[i] === '' ? dflt : argv[i]);

if (mode === 'stage') {
  if (!argv[1] || !argv[2]) die(2, '用法：node gen-wall.mjs --stage <源目录> <产物目录>');
  const src = resolve(argv[1]), dst = resolve(argv[2]);
  if (src === dst) die(2, '--stage 的源目录不能就是产物目录本身');
  const rows = stage(src, dst);
  const { notShipped } = loadManifest(dst);
  const pages = [
    buildWall(dst, rows, WALL_MOBILE, 390, 820),
    buildWall(dst, rows, WALL_DESKTOP, 1280, 860),
    buildIndex(dst, rows, notShipped),
  ];
  console.log(`墙与索引已重出：${join(dst, WALL_MOBILE)} / ${WALL_DESKTOP} / ${INDEX}`);
  selfCheck(dst, rows, pages);
} else if (mode === 'check') {
  const dir = resolve(argOf(1, '.'));
  const { rows } = loadManifest(dir);
  selfCheck(dir, rows, pagesOnDisk(dir));
} else {
  const dir = resolve(argOf(0, '.'));
  const out = argOf(1, WALL_MOBILE);
  const w = Number(argOf(2, 390));
  const h = Number(argOf(3, 820));
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) die(2, `宽高必须是正数：${w}×${h}`);
  const { rows, notShipped } = loadManifest(dir);
  const wall = buildWall(dir, rows, out, w, h);
  buildIndex(dir, rows, notShipped);
  console.log(`出墙：${join(dir, out)}（${rows.length} 格 × ${w} 宽${w <= 500 ? '' : '，按比例缩显示'}）`);
  selfCheck(dir, rows, [wall, ...pagesOnDisk(dir).filter((p) => p.name === INDEX)]);
}
