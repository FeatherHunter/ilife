#!/usr/bin/env node
/** #532 · 卡路里场景10（31 页）**总索引生成器** —— 仓规 `docs/agents/视觉验收墙.md` §3 第 4 条／§5。
 *
 * 索引页是给人的**细看入口**（墙是「一遍滚动看全」、索引是「逐件查」），与两张墙、31 件产物**同目录**。
 * 按**页族**分组列出全部 31 件，每件给：编号／可点开的标题／入口（唤醒词）／命令／体积／
 * **这一格该确认什么**；末尾固定有**「有意不出产物及其原因」**一节（§8 收口自检清单倒数第三条）。
 *
 * ── 页身份为什么写在这里（#573 的 S3 落点）────────────────────────────────────
 * 本图有两组**同字节别名**：`21 查热量缺口`＝`22 看热量缺口`、`01 预测体重(1周后)`＝`23 看体重预测`。
 * 同字节 ⇒ **页内 h1 分不出入口**（#520 报告 §7.6 的 R-59 就是这条）。两条入口都是真命令、都要验，
 * 所以墙上**按两格出**；「这一格是哪个入口」由**本索引页的「入口」列**与**墙的格标签**承担 ——
 * 这就是 #573 留下的 S3 落地处：身份标识不落在产物页里，落在验收面上。
 *
 * ── 用法 ──────────────────────────────────────────────────────────────────────
 *   node docs/skills/skill-calorie/t532-gen-索引.mjs <产物目录> [输出名=索引.html]
 * 读：<产物目录>/t532-清单.json（**与墙同一份**，见 `t532-清单.mjs`）
 * 出：<产物目录>/<输出名>
 * 自检与墙生成器同源两条：① `dropped`＝清单点名的每一份在不在盘上；② `dead`＝索引页引用到的每条链接在不在盘上。
 * （墙页要先出，索引会链接它们；缺了会**点名**并提示先跑墙生成器，不静默。）
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { readManifest, split } from './t532-清单.mjs';

/** 索引页会链到的两张墙（格子宽不同，看的缺陷也不同）。 */
const WALLS = [
  { file: '手机墙.html', note: '390 宽 · 3 列 · 看塌列／挤／触摸目标' },
  { file: '桌面墙.html', note: '1280 宽 · 1 列（整页缩到 600 看）· 看排布／层级／留白' },
];
/** 本批重出 31 页的命令（索引页上照抄，方便下一个人重出）。 */
const REGEN = 'node docs/skills/skill-calorie/t532-run-all.mjs <产物目录>';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const die = (code, msg) => { console.error(msg); process.exit(code); };
const kb = (n) => `${Math.round(n / 1024)} KB`;

const dir = resolve(process.argv[2] ?? '.scratch/t532');
const OUT = process.argv[3] ?? '索引.html';
if (!existsSync(dir)) die(2, `没有产物目录：${dir}`);
const { kept, dropped } = split(dir, readManifest(dir).rows);

/** 同字节别名对：按 sha 归并，多于一条的组就是别名组（**从清单算**，不手抄）。 */
const bySha = new Map();
for (const r of kept) {
  if (!bySha.has(r.sha256_12)) bySha.set(r.sha256_12, []);
  bySha.get(r.sha256_12).push(r);
}
const aliasGroups = [...bySha.entries()].filter(([, v]) => v.length > 1);

/** 页族分组：组序按各族最小序号（预测族 → 报告族 → 缺口与别名族）。 */
const kinds = [...new Set(kept.map((r) => r.kind))].sort((a, b) =>
  Math.min(...kept.filter((r) => r.kind === a).map((r) => Number(r.seq) || 0))
  - Math.min(...kept.filter((r) => r.kind === b).map((r) => Number(r.seq) || 0)));

const sections = kinds.map((k) => {
  const inGroup = kept.filter((r) => r.kind === k);
  const body = inGroup.map((r) => `      <tr>
        <td data-l="编号" class="c-seq">${esc(r.seq)}</td>
        <td data-l="点开看整页" class="c-title"><a href="${esc(r.file)}" target="_blank" rel="noopener">${esc(r.title ?? '(无 title)')}</a>
          <span class="fn">${esc(r.file)}</span></td>
        <td data-l="入口（说得出口的原话）" class="c-wake">${esc(r.wake)}</td>
        <td data-l="命令" class="c-cmd"><code>${esc(r.key)}</code></td>
        <td data-l="体积" class="c-bytes">${esc(kb(r.bytes))}</td>
        <td data-l="这一格该确认什么" class="c-chk">${esc(r.check)}</td>
      </tr>`).join('\n');
  return `  <section>
    <h2>${esc(k)}<span>${inGroup.length} 件</span></h2>
    <div class="tw">
    <table>
      <thead><tr><th>编号</th><th>点开看整页</th><th>入口（说得出口的原话）</th><th>命令</th><th>体积</th><th>这一格该确认什么</th></tr></thead>
      <tbody>
${body}
      </tbody>
    </table>
    </div>
  </section>`;
}).join('\n');

const wallList = WALLS.map((w) => (existsSync(join(dir, w.file))
  ? `      <li><a href="${esc(w.file)}" target="_blank" rel="noopener">${esc(w.file)}</a><span class="note">${esc(w.note)}</span></li>`
  : `      <li class="miss">${esc(w.file)}<span class="note">${esc(w.note)}</span><b>还没出</b>：先跑 <code>node docs/skills/skill-calorie/t532-wall.mjs &lt;产物目录&gt;</code></li>`)).join('\n');

/** 「有意不出产物及其原因」：本批没有漏件，但要逐条写明**为什么是 31 而不是更少／更多**。 */
const NOT_SHIPPED = [
  { what: '（无缺件）', why: '本图 31 条唤醒词全部出产物，31/31 落盘且清单逐件对得上；这一节不是「有缺项要解释」，而是「为什么是 31」的交代。' },
  { what: '同字节别名按两格出（不是漏了，也不是重复）', why: aliasGroups.length
    ? aliasGroups.map(([sha, v]) => `${v.map((r) => r.seq).join(' 等于 ')}（同字节 ${sha}：${v.map((r) => r.wake).join('／')}）`).join('；')
      + '。两条都是能念得出口的真命令，墙按「唤醒词条目」出格，所以各占一格；同字节说明两入口落到同一份页。'
    : '（本次没有发现同字节的两件）' },
  { what: '过程型 HTML（预检页／采集页）与 HELP 页', why: '本图 31 条全是查询命令，落盘的都是结果型 HTML，没有两段式；过程型页与 HELP 页各有自己的票，不占本图。' },
  { what: '.scratch/t387/out/ 里的同名副本', why: 'out/ 是执行命令时的落点、html/ 是收拢后的样张，两者同内容；墙只读一份（本目录 .scratch/t532/），所以 out/ 的数不计入格数。' },
  { what: '.scratch/t387/html/ 里不放墙页与索引', why: '墙页与产物必须同目录（iframe 的相对路径才落得到），本批整批复制到 .scratch/t532/；t387/html/ 因此保持 31 份干净计数，不掺入非产物页。' },
  { what: '产物页内的「入口身份」标识', why: '别名两组同字节，改产物页等于改产品代码（本票不改任何产品代码）；身份改由本索引页的「入口」列与墙的格标签承担 —— #573 留下的 S3 落点。' },
];

const page = `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>卡路里场景10 · 验收总索引（31 件）</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;background:#f5f5f7;color:#1d1d1f;font-size:14px;line-height:1.7}
.wrap{padding:28px 22px 64px;max-width:1180px;margin:0 auto}
h1{font-size:24px;font-weight:600;margin-bottom:8px}
.sub{color:#6e6e73;font-size:13.5px;margin-bottom:18px}
.sub b{color:#1d1d1f}
.entry{background:#fff;border:1px solid #d2d2d7;border-radius:12px;padding:14px 18px;margin-bottom:26px}
.entry h3{font-size:13.5px;font-weight:600;margin-bottom:8px}
.entry ul{margin:0 0 0 20px;font-size:13px;list-style:none}
.entry li{margin:4px 0}
.entry li .note{color:#86868b;font-size:12.5px;margin-left:8px}
.entry li.miss{color:#b3261e}
h2{font-size:15px;font-weight:600;margin:26px 0 10px;padding-left:9px;border-left:4px solid #007aff}
h2 span{color:#86868b;font-weight:400;font-size:12.5px;margin-left:8px}
.tw{overflow-x:auto}
table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #d2d2d7;border-radius:12px;overflow:hidden}
th,td{text-align:left;padding:9px 12px;border-bottom:1px solid #ececf0;font-size:13px;vertical-align:top}
th{background:#fafafa;font-weight:600;color:#3a3a3c;white-space:nowrap}
tbody tr:last-child td{border-bottom:0}
.c-seq{font-variant-numeric:tabular-nums;color:#86868b;font-weight:600;white-space:nowrap}
.c-title{font-weight:600}
.c-title .fn{display:block;color:#86868b;font-weight:400;font-size:11.5px;margin-top:2px}
.c-wake{color:#3a3a3c}
.c-cmd code{color:#3a3a3c;font-size:12px}
.c-bytes{font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap;color:#3a3a3c}
.c-chk{color:#3a3a3c;font-size:12.5px}
a{color:#007aff;text-decoration:none}
a:hover{text-decoration:underline}
code{background:#e8e8ed;border-radius:4px;padding:1px 5px;font-size:12px}
.note-box{margin-top:30px;background:#fff;border:1px solid #d2d2d7;border-radius:12px;padding:16px 18px}
.note-box h2{margin-top:0}
.note-box ul{margin:0 0 0 20px;font-size:13px}
.note-box li{margin-bottom:8px}
/* 手机端：表格转成卡片式一行一件，六列各带一个小标签，不横滚、不塌成竖条。 */
@media (max-width:720px){
  .wrap{padding:20px 14px 48px}
  h1{font-size:20px}
  .entry{padding:12px 14px}
  .entry ul{margin-left:0}
  .tw{overflow-x:visible}
  table{display:block;border:0;background:transparent}
  thead{display:none}
  tbody{display:block}
  tbody tr{display:block;background:#fff;border:1px solid #d2d2d7;border-radius:12px;padding:10px 12px;margin-bottom:12px}
  tbody td{display:block;border:0;padding:2px 0;font-size:13px}
  tbody td[data-l]:before{content:attr(data-l) "：";color:#86868b;font-size:12px;font-weight:400}
  tbody td.c-bytes{text-align:left}
}
</style></head><body><div class="wrap">
  <h1>卡路里场景10「预测模拟／报告／缺口与别名」验收总索引</h1>
  <div class="sub">${kept.length} 件产物按<b>页族</b>分组；每件给「编号、可点开的标题、入口（说得出口的原话）、命令、体积、<b>这一格该确认什么</b>」。
  两张墙与产物<b>同目录</b>：手机墙（390 宽，3 列）看塌列，桌面墙（1280 宽，1 列、整页缩到 600 看）看排布；格数＝清单条目数＝${kept.length}。
  重出这 31 页：<code>${esc(REGEN)}</code></div>
  <div class="entry">
    <h3>先看这两张墙（滚动一遍看全）</h3>
    <ul>
${wallList}
    </ul>
  </div>
${sections}
  <div class="note-box">
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
const missing = [
  ...dropped.map((r) => `${r.file ?? '(无 file 字段)'}（清单第 ${r.seq} 行：${r.why}）`),
  ...dead.map((d) => `${d}（索引页引用了它）`),
];
console.log(`索引 ${OUT}：${kept.length} 件；链接 ${refs.length} 条；`
  + (missing.length === 0 ? '缺失 0 -> 可发' : `缺 ${missing.length} 件 -> ${missing.join('、')}`));
if (missing.length) { for (const m of missing) console.error(`缺失 ${m}`); process.exit(1); }
