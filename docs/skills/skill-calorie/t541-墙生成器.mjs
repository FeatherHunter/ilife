#!/usr/bin/env node
/** #541 · 场景04（运动 39 页）验收墙生成器 —— 照仓规 `docs/agents/视觉验收墙.md` §5／§6.2／§6.3／§7。
 *
 * 起点是 `docs/skills/skill-calorie/t154-mobile-wall.mjs`（已有的缩放／分组／内建链接自检），
 * **补上了 §6.2 的 `dropped` 判据** —— t154 那个假绿灯的成因是「先按盘上有没有过滤清单、再只查
 * 页面引用」，于是**清单点名而盘上没有的件被静默剔掉**、自检照样报「缺失 0」。本件两条一起判：
 *   ① `dropped`＝清单点名的每一份在不在盘上；
 *   ② `dead`＝**墙页里引用到的每一条链接**在不在盘上。
 * 任一条非空即 exit 1 并**逐件点名**（§4 反例：往清单里加一行指向不存在的文件，必须红）。
 *
 * 用法（票面逐字的验收命令是第一条）：
 *   node docs/skills/skill-calorie/t541-墙生成器.mjs <产物目录> <输出名> <宽>
 *     出一张墙。例：`node docs/skills/skill-calorie/t541-墙生成器.mjs .scratch/t541/out t541-手机墙.html 390`
 *   node docs/skills/skill-calorie/t541-墙生成器.mjs <产物目录>
 *     两墙都出：`t541-手机墙.html`（390 宽）＋ `t541-桌面墙.html`（1280 宽），两条读数各报一行。
 *
 * 形制（§6.3）：每格一件**真产物**（iframe 里跑真 HTML，媒体查询按格子宽生效、页内可交互）；
 * 格子宽＝要量的那个视口；宽产物**整体缩**（`transform:scale`，视口不变）而不是改视口；
 * 墙上按**页族分组**、`flex-wrap` 换行铺开（不用横滚，§7「右边的格子看不见」）。
 * **不给 iframe 加 `loading="lazy"`**（§7 第一个坑：下半页格子永远空白）——生成后另有一条自证断言。
 *
 * 谁在用：场景04 整改批的收口票 #541。清单＝同目录 `t541-清单.json`（**不带签名**的 UTF-8）。
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** 清单文件名（与 `.scratch/t541/out/t541-清单.json` 逐字相同）；发布名只在清单里一处算出。 */
const MANIFEST = 't541-清单.json';
/** 格子高（§6.3 第 2 条：两墙格高一致）。 */
const CELL_H = 820;
/** 宽墙缩放（§6.3 第 3 条）：格子宽 ≤500 不缩；否则缩到 600px 可视宽，**视口仍是被量的那个宽**。 */
const SCALE_OF = (w) => (w <= 500 ? 1 : Math.min(0.5, 600 / w));
/** 只出这两张墙时用的默认名与宽（「两墙都出」分支）。 */
const PAIR = [
  { out: 't541-手机墙.html', w: 390, label: '手机墙', what: '塌列／挤／触摸目标' },
  { out: 't541-桌面墙.html', w: 1280, label: '桌面墙', what: '排布／层级／留白' },
];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const die = (code, msg) => { console.error(msg); process.exit(code); };
const kb = (n) => `${Math.round(n / 1024)} KB`;

/** 读清单。**带签名（BOM）即报错**（§7：清单读出来 `Unexpected token` 就是它）。 */
function readManifest(dir) {
  const p = join(dir, MANIFEST);
  if (!existsSync(p)) die(2, `没有清单：${p}（墙只从清单读件名，不猜文件名）`);
  const text = readFileSync(p, 'utf8');
  if (text.charCodeAt(0) === 0xfeff) die(2, `清单带了签名（BOM）：${p} —— 请存不带签名的 UTF-8（§7）`);
  let json;
  try { json = JSON.parse(text); } catch (err) { die(2, `清单解析失败：${p} —— ${err.message}`); }
  const rows = Array.isArray(json) ? json : json.rows;
  if (!Array.isArray(rows) || rows.length === 0) die(2, `清单没有 rows：${p}`);
  return rows;
}

/** 判据一 `dropped`：清单点名的每一份都得在盘上（**不许静默剔**）。 */
function split(dir, rows) {
  const kept = [];
  const dropped = [];
  for (const r of rows) {
    const ok = Boolean(r.file) && existsSync(join(dir, r.file));
    if (ok) kept.push({ ...r, bytes: statSync(join(dir, r.file)).size });
    else dropped.push({ ...r, why: r.file ? '盘上没有这个文件' : '这一行没有 file 字段' });
  }
  kept.sort((a, b) => Number(a.seq) - Number(b.seq) || String(a.file).localeCompare(String(b.file)));
  return { kept, dropped };
}

/** 出墙：格子宽＝视口宽；宽产物整体缩、外面套一个定尺寸框（§6.3 第 3 条）。 */
function buildWall(dir, kept, w, out, label) {
  const s = SCALE_OF(w);
  const boxW = Math.round(w * s);
  const boxH = Math.round(CELL_H * s);
  /** 页族分组：组序按各族最小序号，组内按序号。 */
  const kinds = [...new Set(kept.map((r) => r.kind))].sort((a, b) =>
    Math.min(...kept.filter((r) => r.kind === a).map((r) => Number(r.seq) || 0))
    - Math.min(...kept.filter((r) => r.kind === b).map((r) => Number(r.seq) || 0)));
  const sections = kinds.map((k) => {
    const inGroup = kept.filter((r) => r.kind === k);
    const cells = inGroup.map((r) => `    <figure>
      <figcaption><a href="${esc(r.file)}" target="_blank" rel="noopener">${esc(`${String(r.seq).padStart(2, '0')} ${r.wake}`)}</a>
        <span>${esc(`${r.family} · ${kb(r.bytes)}`)}</span></figcaption>
      <div class="cell"><iframe src="${esc(r.file)}" width="${w}" height="${CELL_H}" title="${esc(r.wake)}"></iframe></div>
      <p class="chk">${esc(r.check)}</p>
    </figure>`).join('\n');
    return `  <h2>${esc(k)}<span>${inGroup.length} 件</span></h2>
  <div class="grid">
${cells}
  </div>`;
  }).join('\n');
  const page = `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(out)}（场景04 运动 · ${kept.length} 格 × ${w} 宽）</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;background:#f5f5f7;color:#1d1d1f}
.wrap{padding:24px 20px 60px}
h1{font-size:22px;font-weight:600;margin-bottom:6px}
.sub{color:#6e6e73;font-size:13.5px;margin-bottom:8px;line-height:1.7}
h2{font-size:15px;font-weight:600;margin:26px 0 12px;padding-left:9px;border-left:4px solid #007aff}
h2 span{color:#86868b;font-weight:400;font-size:12.5px;margin-left:8px}
.grid{display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start}
figure{background:#fff;border:1px solid #d2d2d7;border-radius:12px;overflow:hidden;width:${w <= 500 ? w : boxW}px}
figcaption{display:block;padding:8px 10px;font-size:12.5px;font-weight:600;border-bottom:1px solid #e8e8ed;line-height:1.6}
figcaption a{color:#007aff;text-decoration:none}
figcaption a:hover{text-decoration:underline}
figcaption span{display:block;color:#86868b;font-weight:400;font-size:11.5px;margin-top:2px}
.cell{width:${boxW}px;height:${boxH}px;overflow:hidden;background:#fff}
iframe{display:block;width:${w}px;height:${CELL_H}px;border:0;background:#fff;transform:scale(${s});transform-origin:0 0}
.chk{margin:0;padding:7px 10px 9px;font-size:12px;line-height:1.6;color:#3a3a3c;border-top:1px solid #e8e8ed;background:#fbfbfd}
</style></head><body><div class="wrap">
  <h1>${esc(label)} · 场景04 运动 39 页 · ${kept.length} 格 × ${esc(String(w))} 宽</h1>
  <div class="sub">每格是一份产物在 <b>${esc(String(w))} 宽</b>下的真实渲染（iframe 里跑真 HTML：媒体查询按 ${esc(String(w))} 生效、页内可交互）。
  点标题在新标签打开整页；每格下面那句是<b>这一格该确认什么</b>。这一页是给「一遍看完 39 页」用的，不是交付产物。
  手机墙看<b>塌列</b>、桌面墙看<b>排布</b>；两张墙格数相同、格高一致。</div>
${sections}
</div></body></html>
`;
  writeFileSync(join(dir, out), page, 'utf8');
  return page;
}

/** 判据二 `dead`＋禁 lazy 自证：墙页里引用到的每条链接都得在盘上。 */
function refCheck(dir, out, page) {
  if (/loading\s*=\s*["']lazy["']/.test(page)) die(1, `墙 ${out} 里出现了 loading="lazy"（§7 第一个坑：下半页格子永远空白）`);
  const refs = [...page.matchAll(/(?:src|href)="([^"#?]+\.html)"/g)].map((m) => m[1]);
  const dead = refs.filter((r) => !existsSync(join(dir, decodeURIComponent(r))));
  return { refs, dead };
}

/** 一行的总自检：dropped ＋ dead 一起判；干净打「缺失 0 -> 可发」，否则逐件点名并 exit 1。 */
function report(dir, out, kept, dropped, w, label) {
  const page = readFileSync(join(dir, out), 'utf8');
  const { refs, dead } = refCheck(dir, out, page);
  const missing = [...dropped.map((r) => `${r.file ?? '(无 file 字段)'}（清单第 ${r.seq ?? '?'} 行：${r.why}）`), ...dead.map((d) => `${d}（墙页引用了它）`)];
  const clean = missing.length === 0;
  console.log(`${label} ${out}：${kept.length} 格；链接 ${refs.length} 条；`
    + (clean ? '缺失 0 -> 可发' : `缺 ${missing.length} 件 -> ${missing.join('、')}`));
  return missing;
}

const args = process.argv.slice(2);
const dir = resolve(args[0] ?? '.scratch/t541/out');
if (!existsSync(dir)) die(2, `没有产物目录：${dir}`);
const rows = readManifest(dir);
const { kept, dropped } = split(dir, rows);

/** 出哪几张墙：给了输出名与宽就出一张，否则两墙都出。 */
const jobs = args[1]
  ? [{ out: args[1], w: Number(args[2]) || 390, label: (Number(args[2]) || 390) <= 500 ? '手机墙' : '桌面墙' }]
  : PAIR;

let bad = [];
for (const j of jobs) {
  const page = buildWall(dir, kept, j.w, j.out, j.label);
  const r = refCheck(dir, j.out, page);           // 早失败：lazy 当场红
  if (r.dead.length) { /* 交由 report 逐件点名 */ }
  bad = bad.concat(report(dir, j.out, kept, dropped, j.w, j.label));
}
/* 本批自己的非产物页（两墙＋索引）不算残留；**除 39 件与这三件之外的 html** 一律提示出来
   （旧名字残留、误落盘的页都在这里露头——先例 §7「点进第二跳找不到文件」多半是这么来的）。 */
const OWN = new Set([...PAIR.map((p) => p.out), 't541-索引.html']);
const stray = readdirSync(dir).filter((f) => f.endsWith('.html')
  && !kept.some((r) => r.file === f) && !OWN.has(f));
if (stray.length) console.log(`提示：产物目录里有 ${stray.length} 个既不在清单、也不是本批墙／索引的 html：${stray.join('、')}`);

if (bad.length) {
  for (const b of bad) console.error(`缺失 ${b}`);
  process.exit(1);
}
