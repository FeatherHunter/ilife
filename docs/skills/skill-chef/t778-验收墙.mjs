#!/usr/bin/env node
/** #778（地图 #765 票 13 收口 B）· 私家大厨双端视觉验收墙 ＋ 总索引生成器（入仓件 · 无依赖）。
 *
 * 形状照 `docs/skills/skill-memo-ilife/t856-gen-wall.mjs`（它自己照
 * `docs/skills/skill-calorie/scene02-验收墙/gen-wall.mjs`），本件按本图三处口径改：
 *   ① 清单＝收口 A 的 `manifest.json`（#777 交付，数组，中文键：卡id／组／域／唤醒词／命令／
 *      参数／产物绝对路径／exit／bytes／sha256／来源片段）。**册子条目数就是格数**（验收墙 §4）。
 *      产物发布名不另算：`<域中文名>/<卡 slug>.html`（t767-命名 §二），墙／索引／自检只读册子。
 *   ② 进墙要过 **票 3 的页面质量门**（`docs/skills/skill-chef/t768-质量门.mjs` 机审六列）：
 *      门的 JSON 读数放批目录 `t778-质量门.json`；有列红的页**不进墙**，逐条点名进索引页
 *      「有意不出产物及其原因」一节。门读数缺失即 exit 2（不许静默当全绿）。
 *   ③ `dropped`（册子点名却盘上没有）与 `dead`（页上引用却落不到）**一起判**——照 §6.2，
 *      别照抄 `t154-mobile-wall.mjs` 的假绿灯；另加两项完整性判据：册子 sha256 复核、
 *      产物与墙页禁 `loading="lazy"`。
 *
 * 用法（产物目录即批目录；墙页、索引、产物必须同目录，iframe 走相对路径）：
 *   node docs/skills/skill-chef/t778-验收墙.mjs <产物目录> [输出名] [宽] [高]
 *   node docs/skills/skill-chef/t778-验收墙.mjs --stage <源目录> <产物目录>
 *   node docs/skills/skill-chef/t778-验收墙.mjs --check <产物目录>
 *
 * 形制（**维护者裁定 2026-09-21**：桌面墙和手机墙保持现状、不要拆）：本批就是**双端各一张**
 * ——`手机墙-390.html`（390 宽 ×3 列 ×格高 820）与 `桌面墙-1280.html`（1280 宽 ×1 列 ×格高 860，
 * 整体缩显示不改视口）。48 行单列的滚动代价已被接受，**别再按页族拆墙**；要细看用同目录 `总索引.html`。
 *
 * 自检正反两面：正例打印「N 格；链接 M 条；缺失 0 -> 可发」exit 0；
 * 反例（册子点名却不存在／页上引用落不到／sha256 不符／含惰性加载）exit 1 且逐条点名。
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, dirname, join, resolve } from 'node:path';

const MANIFEST = 'manifest.json';
const GATE = 't778-质量门.json';
const INDEX = '总索引.html';
const WALL_MOBILE = '手机墙-390.html';
const WALL_DESKTOP = '桌面墙-1280.html';
/** 质量门六列（与 `t768-质量门.mjs` 的列名逐字相同）。 */
const GATE_COLS = ['横向溢出', '触摸目标', '触屏三件', '分隔符懒政', '英文裸词', '重复句'];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const die = (code, msg) => { console.error(msg); process.exit(code); };

/** 页面族 ＋ 每格「该确认什么」。族名照 `docs/skills/skill-chef/t768-页面族配方.md`（三族），
 *  归属按命令键的动词面判定（写侧三件：`write`／`record`／`batch`／`init`；过程侧 `cooking`）。 */
const FAMILY_CHECK = {
  过程型: '过程页：当前步、本步用料、炊具是否一眼读到；翻页后还停在这一步吗',
  结果型: '结果页：分块层级与数值是否读得清；长列表在 390 档有没有塌成一条',
  回执型: '回执页：这次写入的结果与字段变更是否写在明面上；失败点有没有点名',
};
function familyOf(key) {
  if (/^chef\.cooking\./.test(key)) return '过程型';
  if (/(\.write$|\.record$|\.batch$|\.init$|\.deprecate$)/.test(key)) return '回执型';
  return '结果型';
}
/** 产物自己的页面标题：`page-shell-title` → `<title>` 去后缀 → 唤醒词（兜底）。 */
function titleOf(html, wake) {
  const shell = html.match(/<[a-z]+[^>]*class="[^"]*ilife-block-page-shell-title[^"]*"[^>]*>([\s\S]{0,200}?)<\//);
  if (shell !== null) {
    const t = shell[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (t !== '') return t;
  }
  const doc = (html.match(/<title>([^<]*)<\/title>/) ?? [])[1] ?? '';
  const cut = doc.split(/[｜|（(]/)[0].replace(/\s*-\s*私家大厨$/, '').trim();
  return cut !== '' ? cut : wake;
}

/* ── 册子 ─────────────────────────────────────────────────────────────── */
function loadManifest(dir) {
  const p = join(dir, MANIFEST);
  if (!existsSync(p)) die(2, `没有册子：${p}（册子由收口 A #777 交出，别让墙猜文件名）`);
  let raw = readFileSync(p, 'utf8');
  if (raw.charCodeAt(0) === 0xfeff) {
    console.error('注意：册子带 BOM（仓规 §7：读出来会 Unexpected token）——本次已剥，请存不带签名的 UTF-8');
    raw = raw.replace(/^\uFEFF/, '');
  }
  let parsed;
  try { parsed = JSON.parse(raw); } catch (e) { die(2, `${p} 不是合法 JSON：${e.message}`); }
  const list = Array.isArray(parsed) ? parsed : parsed.rows;
  if (!Array.isArray(list) || list.length === 0) die(2, `${p} 里没有条目（数组或 rows 皆空）`);
  const rows = list.map((r, i) => {
    const wake = r.唤醒词 ?? r.wake;
    const abs = r.产物绝对路径 ?? r.absPath;
    const domain = r.域 ?? r.domain;
    if (!wake || !abs || !domain) die(2, `册子第 ${i + 1} 条缺字段（要 唤醒词／域／产物绝对路径）：${JSON.stringify(r).slice(0, 200)}`);
    // 发布名＝`<域目录中文名>/<卡 slug>.html`（t767-命名 §二）。域目录名从册子路径的父目录取：
    // 册子的 `域` 字段是英文键（cook／view／…），目录才是中文 label（做菜／查看／…）。
    const file = `${basename(dirname(abs))}/${basename(abs)}`;
    const html = existsSync(join(dir, file)) ? readFileSync(join(dir, file), 'utf8') : '';
    const key = r.命令 ?? r.key ?? '';
    return {
      seq: i + 1, id: r.卡id ?? r.id ?? '', wake, domain: basename(dirname(abs)), domainKey: domain,
      group: r.组 ?? r.group ?? '', key, args: r.参数 ?? r.args ?? null, file, bytes: r.bytes,
      sha256: r.sha256 ?? '', source: r.来源片段 ?? '',
      title: html === '' ? wake : titleOf(html, wake), family: familyOf(key),
    };
  });
  const seen = new Set();
  for (const r of rows) { if (seen.has(r.file)) die(2, `册子 file 撞名：${r.file}（唯一性门）`); seen.add(r.file); }
  return rows;
}

/** 质量门读数：批目录 `t778-质量门.json`（`t768-质量门.mjs --json` 出的那份）。 */
function loadGate(dir) {
  const p = join(dir, GATE);
  if (!existsSync(p)) {
    die(2, `没有质量门读数：${p}\n先跑：node docs/skills/skill-chef/t768-质量门.mjs <批目录里的产物文件…> --json ${p}\n`
      + '（进墙的产物须已过票 3 的页面质量门；没有读数就不许出墙——别把「门没跑」当「门全绿」）');
  }
  let raw = readFileSync(p, 'utf8');
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.replace(/^\uFEFF/, '');
  const js = JSON.parse(raw);
  const by = new Map();
  for (const r of js.results ?? []) {
    // 键＝`<域目录>/<文件名>`（与册子派生的发布名同形）：读数绑批目录的绝对路径，
    // 换批目录（造册到别处）时仍对得上——反例在临时副本里跑就是靠这一条。
    const p = resolve(r.file);
    const rel = `${basename(dirname(p))}/${basename(p)}`;
    const red = GATE_COLS.filter((c) => r.cols?.[c]?.red === true);
    const detail = Object.fromEntries(GATE_COLS.map((c) => [c, String(r.cols?.[c]?.detail ?? '')]));
    by.set(rel, { red, detail, variant: r.variant ?? null });
  }
  return { at: js.at ?? '', widths: js.widths ?? [390, 1280], by };
}

/** 这一页过没过门：读数里有它、且六列无红。**读数里没有它＝没过门**（不许把「没量」当「全绿」）。 */
const passedGate = (gate, file) => (gate.by.get(file)?.red.length ?? -1) === 0;

/* ── 造册（复制进墙批目录：存在性 ＋ 首尾结构 ＋ 禁惰性加载 ＋ sha256）── */
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
/** 完整性探针：去 BOM 后以 doctype 开头、以 </html> 结尾（缺一即半截产物，不收）。 */
const integrityOk = (html) => {
  const t = html.replace(/^\uFEFF/, '').trim();
  return /^<!doctype html>/i.test(t) && /<\/html>\s*$/i.test(t);
};

function stage(srcDir, dstDir) {
  if (resolve(srcDir) === resolve(dstDir)) die(2, '--stage 的源目录不能就是批目录本身');
  const rows = loadManifest(srcDir);
  rmSync(dstDir, { recursive: true, force: true });
  mkdirSync(dstDir, { recursive: true });
  copyFileSync(join(srcDir, MANIFEST), join(dstDir, MANIFEST));
  for (const g of [GATE]) if (existsSync(join(srcDir, g))) copyFileSync(join(srcDir, g), join(dstDir, g));
  const bad = [];
  let copied = 0;
  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const out = join(dstDir, entry.name);
    mkdirSync(out, { recursive: true });
    for (const f of readdirSync(join(srcDir, entry.name))) {
      if (!f.toLowerCase().endsWith('.html')) continue;
      const buf = readFileSync(join(srcDir, entry.name, f));
      const html = buf.toString('utf8');
      if (!integrityOk(html)) { bad.push(`产物不完整（缺首尾结构）：${entry.name}/${f}`); continue; }
      if (/loading\s*=\s*["']lazy["']/i.test(html)) { bad.push(`产物含 loading=lazy（墙下半页会空白）：${entry.name}/${f}`); continue; }
      const row = rows.find((r) => r.file === `${entry.name}/${f}`);
      if (row !== undefined && row.sha256 !== '' && sha256(buf) !== row.sha256) {
        bad.push(`sha256 与册子不符：${entry.name}/${f}（册子 ${row.sha256.slice(0, 12)}… 盘上 ${sha256(buf).slice(0, 12)}…）`);
        continue;
      }
      writeFileSync(join(out, f), buf);
      copied += 1;
    }
  }
  const missing = rows.filter((r) => !existsSync(join(dstDir, r.file))).map((r) => `册子点名却未复制：${r.seq} ${r.wake} -> ${r.file}`);
  // 根级 HTML（收口 A 的链路总表页）也搬：它是给人点开 50 行的入口，按地图三层目录③与本批同目录。
  for (const f of readdirSync(srcDir).filter((x) => x.toLowerCase().endsWith('.html'))) {
    copyFileSync(join(srcDir, f), join(dstDir, f));
  }
  const all = [...bad, ...missing];
  if (all.length) die(1, `造册不通过（源 ${srcDir} -> ${dstDir}）：\n  ${all.join('\n  ')}`);
  console.log(`造册：复制 ${copied} 件 HTML -> ${dstDir}（册子 ${rows.length} 格齐、存在性＋完整性＋sha256 全过；源目录原样保留）`);
  return rows;
}

/* ── 出墙 ─────────────────────────────────────────────────────────────── */
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
      <span>${esc(r.wake + '｜' + r.family)}</span></figcaption>
    <div class="check"><b>这一格该确认什么：</b>${esc(FAMILY_CHECK[r.family])}</div>
${frame}
  </figure>`;
}

function buildWall(dir, rows, out, w, h, gateAt) {
  const cols = w <= 500 ? 3 : 1;
  const scale = w <= 500 ? 1 : Math.min(0.5, 600 / w);
  const boxW = Math.round(w * scale);
  const cells = rows.map((r) => cell(r, w, h, scale)).join('\n');
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(out)}（${rows.length} 格 × ${w} 宽）</title>
<style>
${STYLE.replace(/COLS/g, String(cols)).replace(/BOXW/g, String(boxW))}
</style></head><body><div class="wrap">
<h1>私家大厨验收墙 · ${rows.length} 格 × ${w} 宽（格高 ${h}）</h1>
<div class="sub">每格是一份产物在 <b>${w} 宽</b>下的<b>真实渲染</b>（可交互、媒体查询按该宽生效）。点标题在新标签打开整页。
${scale === 1 ? '格子宽＝视口宽，1:1。' : `宽产物按 <b>${scale.toFixed(3)}</b> 整体缩显示（缩的是显示不是视口，视口仍是 ${w}）。`}
这 ${rows.length} 格＝册子 <code>${MANIFEST}</code> 的全部条目（过不了机审六列的页不进墙，见
<a href="${INDEX}">总索引</a> 的「有意不出产物及其原因」）。质量门读数 ${esc(gateAt)}。
这一页给人看，不是交付产物。</div>
<div class="grid">
${cells}
</div></body></html>
`;
  if (/loading\s*=\s*["']lazy["']/i.test(html)) die(2, '墙生成器自带了 loading=lazy（禁令：下半页会空白）');
  writeFileSync(join(dir, out), html, 'utf8');
  return { name: out, html };
}

/* ── 出索引 ───────────────────────────────────────────────────────────── */
/** 「有意不出产物及其原因」的条目来自两处：质量门红的页（机械派生）＋ 批内不上墙的件（册子外）。 */
function buildIndex(dir, rows, outOfWall, gate, manifestReadings) {
  const domains = [...new Set(rows.map((r) => r.domain))];
  const groups = domains.map((d) => {
    const mine = rows.filter((r) => r.domain === d);
    const cards = mine.map((r) => `    <div class="card">
      <div class="card-head"><span class="seq">${r.seq}</span><a href="${esc(r.file)}">${esc(r.title)}</a><span class="kind">${esc(r.family)}</span></div>
      <dl><dt>念这句</dt><dd>${esc(r.wake)}</dd>
        <dt>命令</dt><dd><code>${esc(r.key)}</code></dd>
        <dt>参数</dt><dd><code>${esc(compactArgs(r.args))}</code></dd>
        <dt>文件</dt><dd><code>${esc(r.file)}</code></dd>
        <dt>字节</dt><dd>${esc(String(r.bytes ?? '—'))} B｜sha256 <code>${esc(String(r.sha256).slice(0, 12))}…</code></dd>
        <dt>该确认什么</dt><dd>${esc(FAMILY_CHECK[r.family])}</dd></dl>
    </div>`).join('\n');
    return `  <h2>${esc(d)}（${mine.length} 件）</h2>
  <div class="cards">
${cards}
  </div>`;
  }).join('\n');

  const walls = [WALL_MOBILE, WALL_DESKTOP].filter((w) => existsSync(join(dir, w)));
  const wallLine = walls.length ? walls.map((w) => `<a href="${esc(w)}">${esc(w)}</a>`).join(' · ') : '（本次未出墙页）';
  const notShipped = outOfWall.length
    ? outOfWall.map((n) => `      <li><b>${esc(n.what)}</b>：${esc(n.why)}</li>`).join('\n')
    : `      <li><b>本批 ${rows.length} 格全部出产物、全部上墙</b>：无件被排除（被排除的件须在此逐条点名并交代原因）。</li>`;
  const readings = [
    `册子条目 ${rows.length} 格（同一份产物只记一格）｜墙格数＝册子条目数（验收墙 §4「格数对得上」）`,
    `质量门读数 ${gate.at} · 视口 ${gate.widths.join('／')} 窄 | 六列全绿 ${rows.length} 页；有列红 ${outOfWall.filter((x) => x.kind === 'gate').length} 页`,    ...manifestReadings.map((x) => `${x.k}：${x.v}`),
  ].map((t) => `      <li>${esc(t)}</li>`).join('\n');

  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>私家大厨验收总索引（${rows.length} 件）</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;background:#f5f5f7;color:#1d1d1f}
.wrap{padding:28px 22px 60px;max-width:1080px}
h1{font-size:24px;font-weight:600;margin-bottom:6px}
.sub{color:#6e6e73;font-size:13.5px;line-height:1.8;margin-bottom:22px}
.sub b{color:#1d1d1f}
h2{font-size:15px;font-weight:600;margin:26px 0 10px}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:14px}
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
<h1>私家大厨验收总索引</h1>
<div class="sub">${rows.length} 件产物按功能域分组，每份一张卡（念哪句话／命令／参数／文件／该确认什么）。
手机墙 <b>390 宽 × 3 列</b>看塌列，桌面墙 <b>1280 宽 × 1 列</b>看排布；两张墙、本索引与产物<b>同目录</b>，
格数 ＝ 本索引卡的件数 ＝ 册子 <code>${MANIFEST}</code> 的条目数（少任何一件，生成器自检点名并 exit 1）。
本批：${wallLine}。链路总表（50 词逐行可点）见同目录 <a href="t777-链路总表.html">t777-链路总表.html</a>。</div>
<div class="note">
  <h2>本批机器读数（照单抄：册子 ＋ 质量门读数，生成器不自己算）</h2>
  <ul>
${readings}
  </ul>
</div>
${groups}
<div class="note">
  <h2>有意不出产物及其原因</h2>
  <ul>
${notShipped}
  </ul>
</div>
</div></body></html>
`;
  writeFileSync(join(dir, INDEX), html, 'utf8');
  return { name: INDEX, html };
}

function compactArgs(args) {
  if (args === null || args === undefined) return '（无）';
  const s = typeof args === 'string' ? args : JSON.stringify(args);
  if (s === '{}' || s === '' || s === 'null') return '（无）';
  return s.length > 120 ? s.slice(0, 117) + '…' : s;
}

/* ── 自检：dropped（册子点名却没有文件）与 dead（页上引用却落不到）一起判 ──
 * ⚠️ `rows` 必须是**册子全量**，不能传「过门后剩下的那批」：先按盘上有没有过滤、再只查页上引用，
 * 就是 `t154-mobile-wall.mjs` 那条假绿灯（缺件被静默剔掉、自检照样报「缺失 0」）。墙格另行传参。 */
function selfCheck(dir, rows, wallRows, pages, gate) {
  const dropped = rows.filter((r) => !existsSync(join(dir, r.file)));
  const refs = [];
  const perPage = [];
  for (const p of pages) {
    const mine = [...p.html.matchAll(/(?:src|href)="([^"#]+\.html)"/g)].map((m) => m[1]);
    refs.push(...mine);
    perPage.push(`${p.name} ${mine.length}`);
  }
  const dead = [...new Set(refs)].filter((r) => !existsSync(join(dir, decodeURIComponent(r))));
  const checks = rows
    .filter((r) => !dropped.includes(r) && r.sha256 !== '')
    .map((r) => ({ r, buf: readFileSync(join(dir, r.file)) }))
    .filter(({ r, buf }) => sha256(buf) !== r.sha256);
  const lazy = [];
  for (const r of rows) {
    if (dropped.includes(r)) continue;
    if (/loading\s*=\s*["']lazy["']/i.test(readFileSync(join(dir, r.file), 'utf8'))) lazy.push(`${r.seq} ${r.wake} -> ${r.file}`);
  }
  for (const p of pages) if (/loading\s*=\s*["']lazy["']/i.test(p.html)) lazy.push(`墙页／索引 -> ${p.name}`);
  const bad = [
    ...dropped.map((r) => `册子点名却没有文件：${r.seq} ${r.wake} -> ${r.file}`),
    ...dead.map((d) => `页上引用却落不到：${d}`),
    ...checks.map(({ r }) => `sha256 与册子不符：${r.seq} ${r.wake} -> ${r.file}`),
    ...lazy.map((t) => `惰性加载（禁令）：${t}`),
  ];
  const kept = rows.length - dropped.length;
  const clean = bad.length === 0;
  const gated = gate == null ? '（未读质量门）' : `质量门 ${GATE_COLS.map((c) => `${c}红 ${rows.filter((r) => gate.by.get(r.file)?.red.includes(c)).length}`).join('／')}`;
  console.log(`${kept} 格；链接 ${refs.length} 条；缺失 ${bad.length} -> ${clean ? '可发' : '不可发'}`);
  console.log(`自检：墙格 ${wallRows.length}／册子 ${rows.length}／不进墙 ${rows.length - wallRows.length}；${perPage.join(' ＋ ')}；${gated}；册子 ${MANIFEST}`);
  if (!clean) {
    for (const b of bad) console.error(`  ${b}`);
    console.error(`不可发（批目录 ${dir}）`);
  }
  process.exit(clean ? 0 : 1);
}

function pagesOnDisk(dir) {
  const pages = [];
  for (const n of [WALL_MOBILE, WALL_DESKTOP, INDEX]) {
    if (existsSync(join(dir, n))) pages.push({ name: n, html: readFileSync(join(dir, n), 'utf8') });
  }
  if (pages.length === 0) console.error('（盘上还没有墙页／索引：本次只判册子点名，未判页上引用）');
  return pages;
}

/** 不上墙的件（进索引的「有意不出产物及其原因」）：
 *  ① 没过质量门的页（有列红，或读数里根本没有它）；② 批内册子外的产物（变体／HELP …），
 *     原因按事实派生——与哪一份册内产物逐字节相同就点哪一份。 */
function outOfWallOf(dir, rows, gate) {
  const out = [];
  for (const r of rows) {
    if (!existsSync(join(dir, r.file))) {
      out.push({ kind: 'gate', what: `第 ${r.seq} 格 ${r.title}（${r.wake}）`, why: `盘上没有这一份（册子点名缺件 ${r.file}）` });
      continue;
    }
    const g = gate.by.get(r.file);
    if (g === undefined) {
      out.push({ kind: 'gate', what: `第 ${r.seq} 格 ${r.title}（${r.wake}）`, why: '质量门读数里没有这一页（没量 ≠ 过门）' });
      continue;
    }
    if (g.red.length > 0) {
      const detail = g.red.map((c) => `${c}（${g.detail[c] || '见质量门读数'}）`).join('；');
      out.push({ kind: 'gate', what: `第 ${r.seq} 格 ${r.title}（${r.wake}）`, why: `机审六列有红：${detail}` });
    }
  }
  const onWall = new Set(rows.filter((r) => passedGate(gate, r.file)).map((r) => r.file));
  const hashOf = new Map();
  for (const r of rows) if (existsSync(join(dir, r.file))) hashOf.set(sha256(readFileSync(join(dir, r.file))), r);
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue;
    for (const f of readdirSync(join(dir, entry.name)).sort()) {
      if (!f.toLowerCase().endsWith('.html')) continue;
      const rel = `${entry.name}/${f}`;
      if (onWall.has(rel)) continue;
      const twin = hashOf.get(sha256(readFileSync(join(dir, rel))));
      const g = gate.by.get(rel);
      const gateNote = g === undefined ? '机审六列无读数' : (g.red.length === 0 ? '机审六列全绿' : `机审六列有红：${g.red.join('、')}`);
      const why = twin !== undefined
        ? `与第 ${twin.seq} 格 ${twin.file} 逐字节相同（同一份产物复用，链路总表该行已注明）；${gateNote}`
        : (entry.name === 'HELP' ? `HELP 说明页（4 条 HELP 词共用一份），不属本图 48 张场景卡，本图不重复出格；${gateNote}`
          : `不在收口 A 册子的 48 格里（册子口径见本页顶部与证据件）；${gateNote}`);
      out.push({ kind: 'outside', what: `${rel}`, why });
    }
  }
  return out;
}

/* ── CLI ──────────────────────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const mode = argv[0] === '--stage' ? 'stage' : argv[0] === '--check' ? 'check' : 'wall';
const argOf = (i, dflt) => (argv[i] === undefined || argv[i] === '' ? dflt : argv[i]);

if (mode === 'stage') {
  if (!argv[1] || !argv[2]) die(2, '用法：node t778-验收墙.mjs --stage <源目录> <批目录>');
  const src = resolve(argv[1]), dst = resolve(argv[2]);
  const rows = stage(src, dst);
  console.log(`批目录就绪：${dst}（${rows.length} 格；下一步跑质量门再出墙）`);
} else if (mode === 'check') {
  const dir = resolve(argOf(1, '.'));
  const rows = loadManifest(dir);
  const gate = loadGate(dir);
  selfCheck(dir, rows, rows, pagesOnDisk(dir), gate);
} else {
  const dir = resolve(argOf(0, '.'));
  const out = argOf(1, WALL_MOBILE);
  const w = Number(argOf(2, 390));
  const h = Number(argOf(3, w <= 500 ? 820 : 860));
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) die(2, `宽高必须是正数：${w}×${h}`);
  const all = loadManifest(dir);
  const gate = loadGate(dir);
  const outOfWall = outOfWallOf(dir, all, gate);
  const rows = all.filter((r) => passedGate(gate, r.file));
  const manifestReadings = [
    { k: '产物字节区间', v: `${Math.min(...all.map((r) => r.bytes ?? 0))} – ${Math.max(...all.map((r) => r.bytes ?? 0))} B` },
    { k: '来源片段', v: [...new Set(all.map((r) => r.source))].filter((x) => x !== '').sort().join('＋') },
    { k: '域分布', v: [...new Set(all.map((r) => r.domain))].map((d) => `${d} ${all.filter((r) => r.domain === d).length}`).join('｜') },
  ];
  const wall = buildWall(dir, rows, out, w, h, gate.at);
  buildIndex(dir, rows, outOfWall, gate, manifestReadings);
  console.log(`出墙：${join(dir, out)}（${rows.length} 格 × ${w} 宽${w <= 500 ? '' : '，按比例缩显示'}，格高 ${h}）`);
  if (outOfWall.length > 0) console.log(`不进墙 ${outOfWall.length} 件，已写进索引「有意不出产物及其原因」：${outOfWall.map((x) => x.what).join('、')}`);
  selfCheck(dir, all, rows, [wall, ...pagesOnDisk(dir).filter((p) => p.name === INDEX)], gate);
}
