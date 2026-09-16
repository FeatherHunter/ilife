#!/usr/bin/env node
/** #532 · 卡路里场景10（31 页）**双端验收墙生成器** —— 仓规 `docs/agents/视觉验收墙.md` §6.2／§6.3／§7。
 *
 * 起点是 `docs/skills/skill-calorie/t154-mobile-wall.mjs`，并照 §6.4 把它的**假绿灯**补掉：
 * t154 先按「盘上有没有」过滤清单、再只查页面引用，于是**清单点名而盘上没有的件被静默剔掉**、
 * 自检照样报「缺失 0」。本件两条判据一起判（都走 `t532-清单.mjs` 的同一处读法）：
 *   ① `dropped`＝清单点名的每一份在不在盘上（含字节对不上）；
 *   ② `dead`＝**墙页里引用到的每一条链接**在不在盘上。
 * 任一条非空即 exit 1 并**逐件点名**（§4 反例：往清单里加一行指向不存在的文件，必须红）。
 *
 * ── 为什么手机墙与桌面墙是同一件 ───────────────────────────────────────────────
 * §6.3 第 2 条「**成对出**：手机墙与桌面墙只有格子宽不同（390／1280），窄的 3 列排、宽的 1 列排」。
 * 两张墙**只有格子宽不同** ⇒ 写成一件、跑两次，不可能在两张墙上出现两套样式或两套缩放算式。
 * 票面点名的生成器就是这个文件：`docs/skills/skill-calorie/t532-wall.mjs`。
 *   · 手机墙＝本件 `… <产物目录> 手机墙.html 390`（或省略参数：**默认就出这一张**）
 *   · 桌面墙＝本件 `… <产物目录> 桌面墙.html 1280`
 *   · 两墙都出＝本件 `… <产物目录>`（不给输出名）
 *
 * ── 用法 ──────────────────────────────────────────────────────────────────────
 *   node docs/skills/skill-calorie/t532-wall.mjs <产物目录> <输出名> [格子宽]
 * 出：<产物目录>/<输出名>（**与产物同目录** —— iframe 的相对路径才落得到，§7 倒数第一条）。
 *
 * ── 形制（§6.3）──────────────────────────────────────────────────────────────
 *   · 每格一件**真产物**：`iframe` 里跑真 HTML（媒体查询按格子宽生效、页内可交互），不塞缩略图；
 *   · 每格标签＝「编号 ＋ 点开整页的标题 ＋ 一句『这一格该确认什么』」；
 *   · 宽墙**整体缩**（`transform:scale`，外面套定尺寸框），**视口仍是被量的那个宽**；
 *   · 换行铺开（`flex-wrap`）而非横滚 —— §7「右边的格子看不见」；
 *   · **不给 iframe 加 `loading="lazy"`**（§7 第一个坑：下半页格子永远空白）；生成后另有断言拦它。
 *   · 格高一致：两张墙的**源视口高相同**（`CELL_H`），同一张墙里每格的显示高也相同。
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { readManifest, split } from './t532-清单.mjs';

/** 格子高（§6.3 第 2 条：两墙格高一致）—— 两张墙共用这一个常量。 */
const CELL_H = 820;
/** 宽墙缩放（§6.3 第 3 条）：格子宽 ≤500 原样；否则缩到 600px 可视宽，**视口仍是被量的那个宽**。 */
const SCALE_OF = (w) => (w <= 500 ? 1 : Math.min(0.5, 600 / w));
/** 不给输出名时成对出的两张墙（票面冻结的两个名字）。 */
const PAIR = [
  { out: '手机墙.html', w: 390, label: '手机墙', what: '塌列／挤／触摸目标' },
  { out: '桌面墙.html', w: 1280, label: '桌面墙', what: '排布／层级／留白' },
];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const die = (code, msg) => { console.error(msg); process.exit(code); };
const kb = (n) => `${Math.round(n / 1024)} KB`;

/** 出墙：格子宽＝视口宽；宽产物整体缩、外面套一个定尺寸框（§6.3 第 3 条）。 */
function buildWall(dir, kept, w, out, label, dropped) {
  const s = SCALE_OF(w);
  const boxW = Math.round(w * s);
  const boxH = Math.round(CELL_H * s);
  /* 页族分组：组序按各族最小序号（预测族 → 报告族 → 缺口与别名族）。 */
  const kinds = [...new Set(kept.map((r) => r.kind))].sort((a, b) =>
    Math.min(...kept.filter((r) => r.kind === a).map((r) => Number(r.seq) || 0))
    - Math.min(...kept.filter((r) => r.kind === b).map((r) => Number(r.seq) || 0)));
  const sections = kinds.map((k) => {
    const inGroup = kept.filter((r) => r.kind === k);
    const cells = inGroup.map((r) => `    <figure id="cell-${esc(r.seq)}">
      <figcaption>
        <a href="${esc(r.file)}" target="_blank" rel="noopener">${esc(r.seq)} ${esc(r.wake)}</a>
        <span class="meta">${esc(`${kb(r.bytes)} · ${r.sha256_12}`)}</span>
      </figcaption>
      <div class="cell"><iframe src="${esc(r.file)}" width="${w}" height="${CELL_H}" title="${esc(r.seq + ' ' + r.wake)}"></iframe></div>
      <p class="chk"><b>这一格该确认什么：</b>${esc(r.check)}</p>
    </figure>`).join('\n');
    return `  <h2>${esc(k)}<span>${inGroup.length} 格</span></h2>
  <div class="grid">
${cells}
  </div>`;
  }).join('\n');

  const dropNote = dropped.length
    ? `<p class="bad">清单点名但盘上没有 ${dropped.length} 件：${esc(dropped.map((r) => r.file + '（' + r.why + '）').join('、'))}</p>`
    : '';

  const page = `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(label)} · 卡路里场景10 · ${kept.length} 格 × ${w} 宽</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;background:#f5f5f7;color:#1d1d1f}
.wrap{padding:24px 20px 60px}
h1{font-size:22px;font-weight:600;margin-bottom:6px}
.sub{color:#6e6e73;font-size:13.5px;margin-bottom:8px;line-height:1.7}
.sub b{color:#1d1d1f}
.bad{margin:10px 0 0;padding:9px 12px;border:1px solid #ffd6d3;background:#fff0ef;color:#c22f26;border-radius:9px;font-size:13px}
h2{font-size:15px;font-weight:600;margin:26px 0 12px;padding-left:9px;border-left:4px solid #007aff}
h2 span{color:#86868b;font-weight:400;font-size:12.5px;margin-left:8px}
.grid{display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start}
/* 边框走 box-shadow 而不是 border：border 会把内容盒挤掉 2px（全局 box-sizing:border-box 下
   figure 宽 390 的内容盒只剩 388），格子右缘那 2px 就被 overflow:hidden 悄悄裁掉。
   box-shadow 不占布局 ⇒ 内容盒正好等于格子宽，iframe 的 390（或缩放前的 1280）一分不裁。 */
figure{background:#fff;box-shadow:0 0 0 1px #d2d2d7;border-radius:12px;overflow:hidden;width:${w <= 500 ? w : boxW}px}
figcaption{display:block;padding:8px 10px;font-size:12.5px;font-weight:600;border-bottom:1px solid #e8e8ed;line-height:1.6}
figcaption a{color:#007aff;text-decoration:none}
figcaption a:hover{text-decoration:underline}
figcaption .meta{display:block;color:#86868b;font-weight:400;font-size:11.5px;margin-top:2px;font-variant-numeric:tabular-nums}
.cell{width:${boxW}px;height:${boxH}px;overflow:hidden;background:#fff}
iframe{display:block;width:${w}px;height:${CELL_H}px;border:0;background:#fff;transform:scale(${s});transform-origin:0 0}
.chk{margin:0;padding:7px 10px 9px;font-size:12px;line-height:1.6;color:#3a3a3c;border-top:1px solid #e8e8ed;background:#fbfbfd}
.chk b{color:#1d1d1f}
/* 窄浏览器（≤ 格子宽＋24）里把页边距让出去，格子正好落满一屏——**不藏横滚**（§7），
   只是不再多占两边的空白；文字块自己留 14px 内边距，读起来不贴边。 */
@media (max-width:${boxW + 24}px){
  .wrap{padding:16px 0 48px}
  h1,.sub,.bad{padding:0 14px;margin-left:0;margin-right:0}
  h2{margin-left:14px;margin-right:14px}
  .grid{gap:14px;justify-content:center}
}
</style></head><body><div class="wrap">
  <h1>${esc(label)} · 卡路里场景10（31 页）· ${kept.length} 格 × ${esc(String(w))} 宽</h1>
  <div class="sub">每格是一份产物在 <b>${esc(String(w))} 宽</b>下的真实渲染（iframe 里跑真 HTML：媒体查询按 ${esc(String(w))} 生效、页内可交互）。
  点标题在新标签打开整页；每格下面那句是<b>这一格该确认什么</b>。这一页是给「一遍看完 31 页」用的，<b>不是交付产物</b>。
  手机墙看<b>塌列</b>、桌面墙看<b>排布</b>；两张墙格数相同、源视口高相同（${CELL_H}），格高一致。
  本页格子<b>不加惰性加载属性</b>（§7 第一个坑：加了则下半页永远空白）。
  产物与本页同目录（${esc(dir.replace(/\\/g, '/'))}），所以 iframe 的相对路径与「点开整页」都落得到。
  ${w <= 500
    ? '这一页在 390 宽的浏览器里也不横滚（格子宽＝要量的那个视口，正好落满一屏）。'
    : `桌面墙请在桌面浏览器上滚：格子宽 ${w}，整页缩到 ${boxW}px 看（视口仍是 ${w}，媒体查询按 ${w} 生效）——窄于 ${boxW + 24}px 的窗口放不下它，那正是它要量的视口。`}
  </div>
  ${dropNote}
${sections}
</div></body></html>
`;
  writeFileSync(join(dir, out), page, 'utf8');
  return page;
}

/** 判据二 `dead` ＋ 禁 lazy 自证：墙页里引用到的每条链接都得在盘上。
 *  `loading` 只在**标签属性位**里找（正文里解释「不要用惰性加载」那句话不是属性，不能误红）。 */
function refCheck(dir, out, page) {
  const lazy = page.match(/<[a-z][a-z0-9-]*\b[^>]*\bloading\s*=\s*["']?lazy/i);
  if (lazy) die(1, `墙 ${out} 里的标签出现了惰性加载属性：${lazy[0].slice(0, 120)}（§7 第一个坑：下半页格子永远空白）`);
  const refs = [...page.matchAll(/(?:src|href)="([^"#?]+\.html)"/g)].map((m) => m[1]);
  const dead = refs.filter((r) => !existsSync(join(dir, decodeURIComponent(r))));
  return { refs, dead };
}

/** 一行的总自检：dropped ＋ dead 一起判；干净打「缺失 0 -> 可发」，否则逐件点名。 */
function report(dir, out, kept, dropped, label) {
  const page = readFileSync(join(dir, out), 'utf8');
  const { refs, dead } = refCheck(dir, out, page);
  const missing = [
    ...dropped.map((r) => `${r.file ?? '(无 file 字段)'}（清单第 ${r.seq} 行：${r.why}）`),
    ...dead.map((d) => `${d}（墙页引用了它）`),
  ];
  const clean = missing.length === 0;
  console.log(`${label} ${out}：${kept.length} 格；链接 ${refs.length} 条；`
    + (clean ? '缺失 0 -> 可发' : `缺 ${missing.length} 件 -> ${missing.join('、')}`));
  return missing;
}

const args = process.argv.slice(2);
const dir = resolve(args[0] ?? '.scratch/t532');
if (!existsSync(dir)) die(2, `没有产物目录：${dir}`);
const { kept, dropped } = split(dir, readManifest(dir).rows);

/** 出哪几张墙：给了输出名就出一张，否则两墙成对出。 */
const jobs = args[1]
  ? [{ out: args[1], w: Number(args[2]) || 390, label: (Number(args[2]) || 390) <= 500 ? '手机墙' : '桌面墙' }]
  : PAIR;

let bad = [];
const own = new Set(jobs.map((j) => j.out));
for (const j of jobs) {
  const page = buildWall(dir, kept, j.w, j.out, j.label, dropped);
  refCheck(dir, j.out, page);            // 早失败：lazy 当场红
  bad = bad.concat(report(dir, j.out, kept, dropped, j.label));
}
/* 本批自己的非产物页（两墙＋索引）不算残留；**除 31 件与这三件之外的 html** 一律提示出来
   （旧名字残留、误落盘的页都在这里露头——§7「点进第二跳找不到文件」多半是这么来的）。 */
const OWN = new Set([...own, '手机墙.html', '桌面墙.html', '索引.html']);
const stray = readdirSync(dir).filter((f) => f.endsWith('.html')
  && !kept.some((r) => r.file === f) && !OWN.has(f));
if (stray.length) console.log(`提示：产物目录里有 ${stray.length} 个既不在清单、也不是本批墙／索引的 html：${stray.join('、')}`);

if (bad.length) { for (const b of bad) console.error(`缺失 ${b}`); process.exit(1); }
