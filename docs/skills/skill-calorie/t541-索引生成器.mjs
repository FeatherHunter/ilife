#!/usr/bin/env node
/** #541 · 场景04（运动 39 页）总索引生成器 —— 照仓规 `docs/agents/视觉验收墙.md` §3 第 4 条／§5。
 *
 * 索引页是给人的**细看入口**（墙是「一遍看全」、索引是「逐件查」），与两张墙、39 件产物**同目录**。
 * 按**页族**分组列出全部 39 件，每件给：编号／可点开的标题／页族／三个族名之一／念哪句话（唤醒词）／
 * 体积／**这一格该确认什么**。
 *
 * **末尾固定有「有意不出产物及其原因」一节**（§8 收口自检清单倒数第三条）——这一段省掉最多追问：
 * 本批是 39 页全出，就逐字写明「本批 39 页全出，无有意缺项」，而不是留一段空白让人猜。
 *
 * 用法：node docs/skills/skill-calorie/t541-索引生成器.mjs [产物目录=.scratch/t541/out]
 * 出：<产物目录>/t541-索引.html
 * 自检与墙生成器同源两条：① 清单点名的每一份在不在盘上；② 索引页引用到的每条链接在不在盘上。
 * （墙页要先出，索引会链接它们；缺了会**点名**并提示先跑墙生成器，不静默。）
 */
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const MANIFEST = 't541-清单.json';
const OUT = 't541-索引.html';
/** 索引页会链到的两张墙（格子宽不同，看的缺陷也不同）。 */
const WALLS = [
  { file: 't541-手机墙.html', note: '390 宽 · 看塌列／挤／触摸目标' },
  { file: 't541-桌面墙.html', note: '1280 宽 · 看排布／层级／留白' },
];
/** 「有意不出产物及其原因」一节：本批没有缺项，就逐字写明（不留空白）。 */
const NOT_SHIPPED = [
  { what: '（无）', why: '本批 39 页全出，无有意缺项。' },
];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const die = (code, msg) => { console.error(msg); process.exit(code); };
const kb = (n) => `${Math.round(n / 1024)} KB`;

const dir = resolve(process.argv[2] ?? '.scratch/t541/out');
if (!existsSync(dir)) die(2, `没有产物目录：${dir}`);
const mf = join(dir, MANIFEST);
if (!existsSync(mf)) die(2, `没有清单：${mf}`);
const text = readFileSync(mf, 'utf8');
if (text.charCodeAt(0) === 0xfeff) die(2, `清单带了签名（BOM）：${mf} —— 请存不带签名的 UTF-8`);
const rows = JSON.parse(text).rows;
if (!Array.isArray(rows) || !rows.length) die(2, `清单没有 rows：${mf}`);

/** 判据一 `dropped`：清单点名的每一份都得在盘上。 */
const dropped = rows.filter((r) => !r.file || !existsSync(join(dir, r.file)));
const kept = rows.filter((r) => !dropped.includes(r))
  .map((r) => ({ ...r, bytes: statSync(join(dir, r.file)).size }))
  .sort((a, b) => Number(a.seq) - Number(b.seq));

/** 页族分组：组序按各族最小序号。 */
const kinds = [...new Set(kept.map((r) => r.kind))].sort((a, b) =>
  Math.min(...kept.filter((r) => r.kind === a).map((r) => Number(r.seq) || 0))
  - Math.min(...kept.filter((r) => r.kind === b).map((r) => Number(r.seq) || 0)));

const sections = kinds.map((k) => {
  const inGroup = kept.filter((r) => r.kind === k);
  const body = inGroup.map((r) => `      <tr>
        <td data-l="编号">${esc(String(r.seq).padStart(2, '0'))}</td>
        <td data-l="标题"><a href="${esc(r.file)}" target="_blank" rel="noopener">${esc(r.wake)}</a></td>
        <td data-l="族">${esc(r.family)}</td>
        <td data-l="体积">${esc(kb(r.bytes))}</td>
        <td data-l="这一格该确认什么">${esc(r.check)}</td>
      </tr>`).join('\n');
  return `  <section>
    <h2>${esc(k)}<span>${inGroup.length} 件</span></h2>
    <table>
      <thead><tr><th>编号</th><th>点开看整页</th><th>族</th><th>体积</th><th>这一格该确认什么</th></tr></thead>
      <tbody>
${body}
      </tbody>
    </table>
  </section>`;
}).join('\n');

const wallList = WALLS.map((w) => (existsSync(join(dir, w.file))
  ? `      <li><a href="${esc(w.file)}" target="_blank" rel="noopener">${esc(w.file)}</a>　${esc(w.note)}</li>`
  : `      <li class="miss">${esc(w.file)}　${esc(w.note)}　<b>还没出</b>：先跑 <code>node docs/skills/skill-calorie/t541-墙生成器.mjs &lt;产物目录&gt;</code></li>`)).join('\n');

const page = `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>场景04 运动 · 验收总索引（${kept.length} 件）</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;background:#f5f5f7;color:#1d1d1f;font-size:14px;line-height:1.7}
.wrap{padding:28px 22px 64px;max-width:1120px;margin:0 auto}
h1{font-size:24px;font-weight:600;margin-bottom:8px}
.sub{color:#6e6e73;font-size:13.5px;margin-bottom:18px}
.sub b{color:#1d1d1f}
.entry{background:#fff;border:1px solid #d2d2d7;border-radius:12px;padding:14px 18px;margin-bottom:26px}
.entry h3{font-size:13.5px;font-weight:600;margin-bottom:8px}
.entry ul{margin:0 0 0 20px;font-size:13px}
.entry li{margin:2px 0}
.entry li.miss{color:#b3261e}
h2{font-size:15px;font-weight:600;margin:26px 0 10px;padding-left:9px;border-left:4px solid #007aff}
h2 span{color:#86868b;font-weight:400;font-size:12.5px;margin-left:8px}
table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #d2d2d7;border-radius:12px;overflow:hidden}
th,td{text-align:left;padding:9px 12px;border-bottom:1px solid #ececf0;font-size:13px;vertical-align:top}
th{background:#fafafa;font-weight:600;color:#3a3a3c;white-space:nowrap}
tbody tr:last-child td{border-bottom:0}
a{color:#007aff;text-decoration:none}
a:hover{text-decoration:underline}
code{background:#e8e8ed;border-radius:4px;padding:1px 5px;font-size:12px}
.note{margin-top:30px;background:#fff;border:1px solid #d2d2d7;border-radius:12px;padding:16px 18px}
.note h2{margin-top:0}
.note ul{margin:0 0 0 20px;font-size:13px}
/* 手机端：表格转成卡片式一行一件，五列各带一个小标签，不横滚、不塌成竖条（用户六条第 ① ② 条） */
@media (max-width:720px){
  .wrap{padding:20px 14px 48px}
  h1{font-size:20px}
  table{display:block;border:0;background:transparent}
  thead{display:none}
  tbody{display:block}
  tbody tr{display:block;background:#fff;border:1px solid #d2d2d7;border-radius:12px;padding:10px 12px;margin-bottom:12px}
  tbody td{display:block;border:0;padding:2px 0;font-size:13px}
  tbody td[data-l]:before{content:attr(data-l) "：";color:#86868b;font-size:12px}
  tbody td[data-l="编号"]{font-weight:600}
}
</style></head><body><div class="wrap">
  <h1>场景04「运动」验收总索引</h1>
  <div class="sub">${kept.length} 件产物按<b>页族</b>分组；每件给「编号／可点开的标题／族／体积／<b>这一格该确认什么</b>」。
  两张墙与产物同目录：手机墙（390 宽，3 列）看塌列，桌面墙（1280 宽，1 列、整体缩放）看排布；格数＝清单条目数。</div>
  <div class="entry">
    <h3>先看这两张墙（滚动一遍看全）</h3>
    <ul>
${wallList}
    </ul>
  </div>
${sections}
  <div class="note">
    <h2>有意不出产物及其原因</h2>
    <ul>
${NOT_SHIPPED.map((n) => `      <li><b>${esc(n.what)}</b>：${esc(n.why)}</li>`).join('\n')}
    </ul>
  </div>
</div></body></html>
`;
writeFileSync(join(dir, OUT), page, 'utf8');

/* 自检：dropped 与 dead 一起判（只判一条会出假绿灯，见墙生成器件头）。 */
const refs = [...page.matchAll(/(?:src|href)="([^"#?]+\.html)"/g)].map((m) => m[1]);
const dead = refs.filter((r) => !existsSync(join(dir, decodeURIComponent(r))));
const missing = [...dropped.map((r) => `${r.file ?? '(无 file 字段)'}（清单点名而盘上没有）`), ...dead.map((d) => `${d}（索引页引用了它）`)];
console.log(`索引 ${OUT}：${kept.length} 件；链接 ${refs.length} 条；`
  + (missing.length === 0 ? '缺失 0 -> 可发' : `缺 ${missing.length} 件 -> ${missing.join('、')}`));
if (missing.length) { for (const m of missing) console.error(`缺失 ${m}`); process.exit(1); }
