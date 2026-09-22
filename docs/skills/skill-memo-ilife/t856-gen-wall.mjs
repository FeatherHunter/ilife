#!/usr/bin/env node
/** #856 · 备忘录双端墙＋总索引生成器（入仓件 · 无依赖）。
 *
 * 形状照 `docs/skills/skill-calorie/scene02-验收墙/gen-wall.mjs`（四形态一体），
 * 只加两处小补丁（#825 定稿 §一）：
 *   ① 禁 `loading="lazy"` 的断言（墙输出自带、产物被扫到都红——下半页空白的对冲）；
 *   ② 产物完整性探针（首尾结构完整才收：去 BOM 后以 `<!doctype html>` 开头、以 `</html>` 结尾）。
 * 命名逻辑不动：`manifest.json` 的 `rows[].file` 就是最终发布名，复制／墙／索引／自检只读它，
 * 精确匹配（#825 v2：造册时按主体取最新时间戳实例复制为 file 名，墙批目录内只认 file 精确名）。
 * 列数与缩放沿仓规（窄三列、宽单列，缩显示不缩视口）。
 *
 * 与卡路里原版的两处有意偏离（均有出处）：
 *   a. 索引 `notShipped` 为空时不 scold：本批 34 格全部出产物时写「无有意不出」，
 *      而不是「清单未给 notShipped」（原版那句是给 83 格部分出产物的批准备的）；
 *   b. 标题与副文案为备忘录（34 格／4 族），墙页／索引名不变（手机墙-390.html／桌面墙-1280.html／总索引.html）。
 *
 * 用法（产物目录即批目录；墙页与产物必须同目录）：
 *   node docs/skills/skill-memo-ilife/t856-gen-wall.mjs [产物目录] [输出名] [宽] [高]
 *   node docs/skills/skill-memo-ilife/t856-gen-wall.mjs --stage <源目录> <产物目录>
 *   node docs/skills/skill-memo-ilife/t856-gen-wall.mjs --check <产物目录>
 *
 * 自检正反两面：正例打印「N 格；链接 M 条；缺失 0 -> 可发」exit 0；
 * 反例（清单点名却不存在／产物不完整／含惰性加载）exit 1 且逐条点名。
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const MANIFEST = 'manifest.json';
const INDEX = '总索引.html';
const WALL_MOBILE = '手机墙-390.html';
const WALL_DESKTOP = '桌面墙-1280.html';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const die = (code, msg) => { console.error(msg); process.exit(code); };

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
  const seen = new Set();
  for (const r of rows) {
    if (seen.has(r.file)) die(2, `清单 file 撞名：${r.file}（唯一性门：生成时就红）`);
    seen.add(r.file);
  }
  return { mf, rows, notShipped: Array.isArray(mf.notShipped) ? mf.notShipped : [], readings: mf.readings || {} };
}

/** 完整性探针：去 BOM 后以 doctype 开头、以 </html> 结尾（缺一即半截产物，不收）。 */
function integrityOf(html) {
  const t = html.replace(/^\uFEFF/, '').trim();
  const headOk = /^<!doctype html>/i.test(t);
  const tailOk = /<\/html>\s*$/i.test(t);
  return headOk && tailOk;
}

/** ① 造册：按清单 file（最终名）把产物复制进同一目录；存在性＋完整性都过才收。 */
function stage(srcDir, dstDir) {
  const { rows } = loadManifest(dstDir);
  mkdirSync(dstDir, { recursive: true });
  const miss = [];
  const broken = [];
  for (const r of rows) {
    const from = join(srcDir, r.file);
    if (!existsSync(from)) { miss.push(`${r.seq} ${r.wake} -> ${r.file}`); continue; }
    const html = readFileSync(from, 'utf8');
    if (!integrityOf(html)) { broken.push(`${r.seq} ${r.wake} -> ${r.file}（缺首尾结构）`); continue; }
    if (/loading\s*=\s*["']lazy["']/i.test(html)) { broken.push(`${r.seq} ${r.wake} -> ${r.file}（含 loading=lazy，墙下半页会空白）`); continue; }
    copyFileSync(from, join(dstDir, r.file));
  }
  const bad = [...miss.map((m) => `源目录缺件：${m}`), ...broken.map((b) => `源产物不收：${b}`)];
  if (bad.length) die(1, `造册不通过（源 ${srcDir} -> ${dstDir}）：\n  ${bad.join('\n  ')}`);
  console.log(`复制进仓：${rows.length} 件 -> ${dstDir}（源 ${srcDir}，存在性＋完整性全过，源目录原样保留）`);
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

/* ★ #820 收尾（2026-09-22 · 视觉审查翻出）：墙原先给每格一个**死高**（缺省 820），
   而 34 页真实高度**全部 ≥938px**（最大 4290）⇒ 每格底部都被切掉，人照墙审看不到页脚。
   现在逐页量真实高度（无头浏览器把 `documentElement.scrollHeight` 写进 title 再 dump），
   按量到的高度设 iframe；量不到就退回缺省高（宁可退回，也不静默给个错的数）。 */
function chromePath() {
  const cands = [process.env.CHROME_PATH,
    join(process.env.ProgramFiles ?? '', 'Google/Chrome/Application/chrome.exe'),
    join(process.env['ProgramFiles(x86)'] ?? '', 'Google/Chrome/Application/chrome.exe'),
    join(process.env.LOCALAPPDATA ?? '', 'Google/Chrome/Application/chrome.exe'),
    '/usr/bin/google-chrome'];
  return cands.filter((p) => p && existsSync(p))[0] ?? null;
}

function measureHeights(dir, rows, fallback) {
  const chrome = chromePath();
  if (chrome === null) return new Map();
  const tmp = join(dir, '.wall-measure.html');
  const map = new Map();
  for (const r of rows) {
    try {
      const html = readFileSync(join(dir, r.file), 'utf8');
      const i = html.lastIndexOf('</body>');
      if (i < 0) continue;
      writeFileSync(tmp, html.slice(0, i)
        + '<script>setTimeout(function(){document.title=String(Math.ceil(document.documentElement.scrollHeight))},300)</script>'
        + html.slice(i), 'utf8');
      const out = execFileSync(chrome, ['--headless', '--disable-gpu', '--no-sandbox', '--disable-extensions',
        '--virtual-time-budget=4000', '--dump-dom', pathToFileURL(tmp).href],
        { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 60000 });
      const m = out.match(/<title>(\d+)<\/title>/);
      if (m) map.set(r.file, Math.max(fallback, Math.min(6000, Number(m[1]) + 8)));
    } catch { /* 量不到就退回缺省高 */ }
  }
  rmSync(tmp, { force: true });
  return map;
}

/** ② 出墙：每格一件真产物，格子宽＝要量的那个视口；**格高按每页真实高度**（量不到才退回缺省）。 */
function buildWall(dir, rows, out, w, h) {
  const cols = w <= 500 ? 3 : 1;
  const scale = w <= 500 ? 1 : Math.min(0.5, 600 / w);
  const boxW = Math.round(w * scale);
  const heights = measureHeights(dir, rows, h);
  const cells = rows.map((r) => cell(r, w, heights.get(r.file) ?? h, scale)).join('\n');
  if (heights.size > 0) {
    const hs = rows.map((r) => heights.get(r.file) ?? h);
    console.log(`格高逐页实量：${heights.size}/${rows.length} 页；${Math.min(...hs)}–${Math.max(...hs)}px（缺省 ${h}）`);
  }
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(out)}（${rows.length} 格 × ${w} 宽）</title>
<style>
${STYLE.replace(/COLS/g, String(cols)).replace(/BOXW/g, String(boxW))}
</style></head><body><div class="wrap">
<h1>备忘录验收墙 · ${rows.length} 格 × ${w} 宽（格高 ${h}）</h1>
<div class="sub">每格是一份产物在 <b>${w} 宽</b>下的<b>真实渲染</b>（可交互、媒体查询按该宽生效）。点标题在新标签打开整页。
${scale === 1 ? '格子宽＝视口宽，1:1。' : `宽产物按 <b>${scale.toFixed(3)}</b> 整体缩显示（缩的是显示不是视口，视口仍是 ${w}）。`}
细看入口：<a href="${INDEX}">总索引</a>。这一页给人看，不是交付产物。</div>
<div class="grid">
${cells}
</div></body></html>
`;
  if (/loading\s*=\s*["']lazy["']/i.test(html)) die(2, '墙生成器自带了 loading=lazy（禁令：下半页会空白）');
  writeFileSync(join(dir, out), html, 'utf8');
  return { name: out, html };
}

/** ③ 出索引：按页面族分组、每份一张卡，末尾列清「有意不出产物及其原因」。 */
function buildIndex(dir, rows, notShipped, readings) {
  const families = [...new Set(rows.map((r) => r.family || '未分组'))];
  const groups = families.map((f) => {
    const mine = rows.filter((r) => (r.family || '未分组') === f);
    const cards = mine.map((r) => `    <div class="card">
      <div class="card-head"><span class="seq">${r.seq}</span><a href="${esc(r.file)}">${esc(r.title)}</a><span class="kind">${esc(r.kind)}</span></div>
      <dl><dt>念这句</dt><dd>${esc(r.wake)}</dd>
        <dt>命令</dt><dd><code>${esc(r.key || '（清单未给）')}</code></dd>
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
    : `      <li><b>本批 ${rows.length} 格全部出产物</b>：无有意不出（有意不出须进清单 notShipped 并在此交代原因）。</li>`;
  const readKeys = Object.keys(readings || {});
  const readingsHtml = readKeys.length
    ? readKeys.map((k) => `      <li><b>${esc(k)}</b>：${esc(readings[k])}</li>`).join('\n')
    : '      <li><b>清单未给 readings</b>：本页这一段不该为空，补进 manifest.json 再重跑。</li>';

  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>备忘录验收总索引（${rows.length} 件）</title>
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
.note h2{margin-top:0}
.note ul{margin:8px 0 0 20px;font-size:13px;line-height:1.9;color:#3a3a3c}
</style></head><body><div class="wrap">
<h1>备忘录验收总索引</h1>
<div class="sub">${rows.length} 件产物按页面族分组，每份一张卡（念哪句话／命令／文件／该确认什么）。
手机墙 <b>390 宽 × 3 列</b>看塌列，桌面墙 <b>1280 宽 × 1 列</b>看排布；两张墙、本索引与产物**同目录**，
格数 ＝ 本索引卡的件数 ＝ 清单 <code>manifest.json</code> 的条目数（少任何一件，生成器自检点名并 exit 1）。
本页：${wallLine}</div>
<div class="note">
  <h2>本批机器读数（照单抄，生成器不自己算）</h2>
  <ul>
${readingsHtml}
  </ul>
</div>
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

/** ④ 自检：dropped（清单点名却没有文件）与 dead（页上引用却落不到）一起判，再加 lazy 与完整性。 */
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
  const lazyFiles = rows
    .filter((r) => r.file && existsSync(join(dir, r.file)))
    .map((r) => ({ r, html: readFileSync(join(dir, r.file), 'utf8') }))
    .filter(({ html }) => /loading\s*=\s*["']lazy["']/i.test(html))
    .map(({ r }) => r);
  const brokenFiles = rows
    .filter((r) => r.file && existsSync(join(dir, r.file)))
    .map((r) => ({ r, html: readFileSync(join(dir, r.file), 'utf8') }))
    .filter(({ html }) => {
      const t = html.replace(/^\uFEFF/, '').trim();
      return !(/^<!doctype html>/i.test(t) && /<\/html>\s*$/i.test(t));
    })
    .map(({ r }) => r);
  const bad = [
    ...dropped.map((r) => `清单点名却没有文件：${r.seq} ${r.wake} -> ${r.file || '（file 字段缺失）'}`),
    ...dead.map((d) => `页上引用却落不到：${d}`),
    ...lazyFiles.map((r) => `惰性加载：${r.seq} ${r.wake} -> ${r.file}（含 loading=lazy，墙下半页会空白）`),
    ...brokenFiles.map((r) => `产物不完整：${r.seq} ${r.wake} -> ${r.file}（缺首尾结构）`),
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
  if (!argv[1] || !argv[2]) die(2, '用法：node t856-gen-wall.mjs --stage <源目录> <产物目录>');
  const src = resolve(argv[1]), dst = resolve(argv[2]);
  if (src === dst) die(2, '--stage 的源目录不能就是产物目录本身');
  const rows = stage(src, dst);
  const { notShipped, readings } = loadManifest(dst);
  const pages = [
    buildWall(dst, rows, WALL_MOBILE, 390, 820),
    buildWall(dst, rows, WALL_DESKTOP, 1280, 860),
    buildIndex(dst, rows, notShipped, readings),
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
  const { rows, notShipped, readings } = loadManifest(dir);
  const wall = buildWall(dir, rows, out, w, h);
  buildIndex(dir, rows, notShipped, readings);
  console.log(`出墙：${join(dir, out)}（${rows.length} 格 × ${w} 宽${w <= 500 ? '' : '，按比例缩显示'}）`);
  selfCheck(dir, rows, [wall, ...pagesOnDisk(dir).filter((p) => p.name === INDEX)]);
}
