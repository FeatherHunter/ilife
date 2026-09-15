#!/usr/bin/env node
/** t369 · 生成「视觉验收墙」（桌面墙／手机墙）与「总索引」三页。
 *
 * 为什么要这一页（学自 T351 §2「视觉验收墙」，见交接件
 * `…/Temp/t351-健身计划-写入口页设计-交接-20260915.md`）：
 *  · **一眼看全**：18 件逐页点开要点 18 次，墙上滚一遍就看完；
 *  · **量的是真页面**：`<iframe>` 里跑的是真 HTML——窄屏媒体查询生效、页签能点，缩略图做不到；
 *  · 顺带成了双端巡查手段（同一批页面在 1100 宽与 390 宽下各看一遍）。
 *
 * 三个坑（照参考件避开，改这一页时别踩回去）：
 *  ① **不要加 `loading="lazy"`**——靠后的格子会不加载；
 *  ② 墙是**给人看的**，不是自动化扫描的输入（整页截图只栅格化靠前的行，靠后的格子在截图里是空白，
 *     真浏览器里滚动就会画出来）；
 *  ③ 视觉模型说「这一格空白」时先自己打开看——它是提示器，不是证据。
 *
 * 落位口径：三页与产物**同目录**、`href`／`src` 一律**相对路径**，整套目录可整体搬动。
 * 跑法：node docs/skills/skill-calorie/t369-验收/t369-墙.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const man = JSON.parse(readFileSync(join(HERE, 'manifest.json'), 'utf8'));

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const items = [
  ...man.process.map((p) => ({ ...p, type: '过程型', word: p.word, order: '' })),
  ...man.results.map((r) => ({ ...r, type: '结果型', order: String(r.order) })),
];

/** 每格「这一格该确认什么」——口径见 `docs/agents/视觉验收墙.md` §6.3-1。 */
const CHECK_LINE = {
  '记体脂（皮褶钳）': '7 点逐格 10／12／14／11／13／12／10、合计 82mm、体脂 12.02% 都在页上',
  '记体脂（外部测量）': '18.5% 与来源「健身房 InBody」在页上；同日冲突块把上一条的 7 点带出来',
  '记围度': '腰围 85／臀围 95 落格，其余 11 项写「—」（没量就不编）',
  '补记体脂': '日期 2026-09-06、体脂 19%；冲突块列出该日原有那条 20.5%',
  '补记围度': '日期 2026-09-06、腰围 86；同日原有那条 13 项仍整条可见',
  '看体脂': '窗口＝全部历史 7 条（含 2025-12-25 那条）；最新 18.5%',
  '看体脂趋势': '窗口＝近 90 天 6 条；2025-12-25 不该出现在页上',
  '看围度': '窗口 90 天共 9 条；13 项全量表；对比基准日 2026-09-05 在表里',
  '看围度趋势': '与本目录 08 号页逐字节相同（同键同参）——该确认「是否该合成一条词」',
  '对比体脂': '两段 21% → 20%、差值 -1%、变化率 -4.76%',
  '对比围度': '13 项「前／后／差值／变化率」逐格对得上手算（如腰围 85→84 -1 -1.18%）',
  '删体脂': '#1（2025-12-25 · 25.5%）记软删：已从查询排除、行仍在库',
  '删围度': '#1（2025-12-25）记软删，删除前 13 项原值整条列出',
  '看体脂向导': '空白可填的配置向导＋要粘的那段 prompt（写前预检页）',
  '看围度向导': '13 项分 3 组的填空向导＋要粘的那段 prompt（写前预检页）',
};
const checkLineOf = (it) => CHECK_LINE[it.word] ?? '（本票未写这一格的确认点）';

const rows = items.filter((it) => existsSync(join(HERE, it.rel)));
const dropped = items.filter((it) => !rows.includes(it)); // 清单点名、盘上没有 → 报出来，不静默剔
const status = (it) => (it.status === 'green' ? '绿' : '红');

/* ── 墙（两页同一个模板，只换 iframe 与栅格宽） ── */
/** 每格挂一行机器读数（#534 波次的判据面）：分隔符节点级命中 0 才绿、三档溢出归零是回归门、
 *  版式要点（390 档触摸不足／最小字号）与视觉分（若当轮跑过 vision 终审）。**读数缺项写 `—`，不写假绿。** */
const readingsLine = (it) => {
  const v = man.verdict?.[it.rel] ?? null;
  const sep = it.sep ? `${it.sep.node === 0 ? '✓ 0 处' : '✗ ' + it.sep.node + ' 处'}` : '—';
  const ovf = v?.overflow ?? '—';
  const touch = it.fmt ? String((it.fmt.widths?.['390'] ?? it.fmt.widths?.[390])?.touchSmall ?? '—') : '—';
  const minFont = it.fmt ? String((it.fmt.widths?.['390'] ?? it.fmt.widths?.[390])?.minFontPx ?? '—') : '—';
  const vision = v?.vision === undefined || v?.vision === null ? '—' : String(v.vision);
  return `分隔符命中 ${sep} · 三档溢出 ${ovf} · 390 档触摸不足 ${touch} 处 · 390 档最小字号 ${minFont}px · 视觉 ${vision} 分`;
};
function wall({ title, sub, w, h, colW }) {
  const cells = rows.map((it) => `  <figure class="cell-${it.type === '过程型' ? 'p' : 'r'}">
    <figcaption><a href="${esc(it.rel)}" target="_blank" rel="noopener">${esc(it.order ? it.order + ' ' : '')}${esc(it.word)}</a><span>${esc(it.type)} · ${esc(status(it))}</span></figcaption>
    <div class="ask">该确认：${esc(checkLineOf(it))}</div>
    <div class="mread">${esc(readingsLine(it))}</div>
    <iframe src="${esc(it.rel)}" width="${w}" height="${h}" title="${esc(it.word)}"></iframe>
    <div class="fn">${esc(it.rel)}</div>
  </figure>`).join('\n');
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;background:#f5f5f7;color:#1d1d1f}
.wrap{padding:24px 20px 60px}
h1{font-size:22px;font-weight:600;margin-bottom:6px}
.sub{color:#6e6e73;font-size:13.5px;margin-bottom:18px;line-height:1.7}
.legend{display:flex;gap:16px;font-size:12.5px;color:#6e6e73;margin-bottom:14px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,${colW}px);gap:20px;justify-content:center}
figure{background:#fff;border:1px solid #d2d2d7;border-radius:12px;overflow:hidden}
figure.cell-p{border-color:#c7d7f5}
figcaption{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:8px 10px;font-size:12.5px;font-weight:600;border-bottom:1px solid #e8e8ed}
figcaption a{color:#007aff;text-decoration:none}
figcaption span{color:#86868b;font-weight:400;font-size:11.5px;white-space:nowrap}
iframe{display:block;width:${w}px;height:${h}px;border:0;background:#fff}
.fn{font-size:11px;color:#a1a1a6;padding:6px 10px;border-top:1px solid #f0f0f2;word-break:break-all}
.ask{font-size:11.5px;color:#4a4a4f;background:#f7f8fa;padding:6px 10px;border-bottom:1px solid #ececf0}
.mread{font-size:11px;color:#5b6b5b;background:#f2f7f2;padding:5px 10px;border-bottom:1px solid #e2ece2;overflow-wrap:anywhere}
a.back{display:inline-block;margin-bottom:14px;font-size:13px;color:#007aff;text-decoration:none}
</style>
</head>
<body>
<div class="wrap">
  <a class="back" href="t369-总索引.html">← 回总索引</a>
  <h1>${esc(title)}</h1>
  <div class="sub">${esc(sub)}</div>
  <div class="legend"><span>每格是一份产物在 ${w} 宽下的真实渲染（可交互：页签能点、勾选能勾）</span><span>点标题在新标签打开整页</span></div>
  <div class="grid">
${cells}
  </div>
</div>
</body>
</html>
`;
}

const desktopWall = wall({
  title: `桌面墙 · ${items.length} 件 × 1280 宽`,
  sub: `本批 ${man.results.length} 件结果型 ＋ ${man.process.length} 件过程型的整页并排。桌面宽（1280）下看版式、信息密度与「是不是更空而不是更好」；窄屏看手机墙。`,
  w: 1280, h: 900, colW: 1320,
});
const mobileWall = wall({
  title: `手机墙 · ${items.length} 件 × 390 宽`,
  sub: `同一批产物在手机宽度（390×844）下的真实渲染：媒体查询按 390 生效，窄屏塌列、卡片化表格、触摸目标一眼可见。`,
  w: 390, h: 844, colW: 430,
});
writeFileSync(join(HERE, 't369-桌面墙.html'), desktopWall);
writeFileSync(join(HERE, 't369-手机墙.html'), mobileWall);

/* ── 总索引 ── */
const card = (it) => `  <article class="card ${it.type === '过程型' ? 'p' : 'r'}">
    <h3><a href="${esc(it.rel)}" target="_blank">${esc(it.order ? it.order + ' · ' : '')}${esc(it.word)}</a>
      <span class="badge">${esc(it.type)}</span><span class="badge ${it.status === 'green' ? 'ok' : 'bad'}">${esc(status(it))}</span></h3>
    ${it.type === '过程型' ? '<p class="hint">页面入口词（SKILL.md 场景 08 索引表第 6／7 行）；<code>src/body/commands.ts:15-17</code> 记：这两个向导页是写词的<strong>流程内页</strong>、不设代表唤醒词，<code>看体脂向导</code>／<code>看围度向导</code> 是<strong>路由面的自造入口词</strong>（归路由面收口票）。</p>' : ''}
    <dl>
      <dt>命令</dt><dd><code>${esc(it.declCli ?? it.cmd ?? '—')}</code></dd>
      <dt>实跑</dt><dd><code>${esc(it.cmd ?? '—')}</code></dd>
      <dt>文件</dt><dd><code>${esc(it.rel)}</code>（${it.bytes} B）</dd>
      <dt>状态</dt><dd>exit ${it.exit ?? 0} · 整页 ${it.fullPage?.ok ? '是' : '否'}（doctype／charset／内联样式 ${it.fullPage?.styleBytes ?? 0} B／外链 ${it.fullPage?.externals?.length ?? 0} 条）· 关键字段 ${it.fields ? it.fields.hit + '/' + it.fields.total : '（过程页）'}${it.sha256 ? ' · sha256 <code>' + it.sha256.slice(0, 16) + '…</code>' : ''}</dd>
      ${it.forWord ? `<dt>服务</dt><dd>「${esc(it.forWord)}」等写词的写前预检确认页</dd>` : ''}
    </dl>
  </article>`;

const noteItems = [
  ['「看体成分」（order 24）与「看围度记录」（order 25）', '这两条与本批的 06「看体脂」／08「看围度」<strong>同键同参</strong>（<code>calorie.view.body-composition</code>／<code>calorie.view.body-measure</code>，都不带参数），再跑一遍只会得到逐字节相同的页；<strong>有意不出产物</strong>（墙上重复一遍同一页没有信息量）。'],
  ['「删体脂」与「删围度」', '删除类<strong>没有写前向导页</strong>（SKILL.md 场景 08 表下第一条写明：先读定位 → 给用户看过 → 再调删命令），所以这两条<strong>有意不出「过程型」页</strong>；它们的结果型页里带软删除说明（行保留、已从查询与统计中排除）。'],
  ['夹具暖库的种子写', '档案／目标／围度 8 行（含对比两日与 4 个趋势点）／体成分 4 行是<strong>跑之前的一次性准备</strong>，不是唤醒词产物；回执留在草稿区 <code>.scratch/t369/stage/_seed-*.html</code>，<strong>不进</strong>本验收目录。'],
  ['2 条页面入口词（看体脂向导／看围度向导）', '它们是 5 件「过程型」页的词面，<strong>不在 436 词表内</strong>（<code>src/triggers/wake-assets.ts</code> 查无），属路由面的自造入口词；本轮<strong>只按入口页列在这里</strong>，不算进 13 条唤醒词。'],
  ['本票 13 条之外的其它唤醒词', '本目录只覆盖票面点名的 13 条（<code>order</code> 237–249）＋ 借作写前预检页的 2 条入口词；场景 08／09 的其余词不在本票写集。'],
];

const page = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>t369 · 总索引（${man.results.length} 件结果型 ＋ ${man.process.length} 件过程型）</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;background:#f5f5f7;color:#1d1d1f;line-height:1.6}
.wrap{padding:24px 20px 80px;max-width:1180px;margin:0 auto}
h1{font-size:22px;font-weight:600;margin-bottom:6px}
.sub{color:#6e6e73;font-size:13.5px;margin-bottom:18px}
.gates{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 22px}
.pill{background:#fff;border:1px solid #d2d2d7;border-radius:999px;padding:5px 12px;font-size:12.5px}
.pill.ok{background:#eef8ee;border-color:#bfe3bf}
.pill.bad{background:#fdeeee;border-color:#f0c2c2}
h2{font-size:16px;font-weight:600;margin:26px 0 12px;padding-bottom:6px;border-bottom:1px solid #e2e2e7}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:14px}
.card{background:#fff;border:1px solid #d2d2d7;border-radius:12px;padding:12px 14px}
.card.p{border-color:#c7d7f5;background:#fbfdff}
h3{font-size:14px;font-weight:600;display:flex;flex-wrap:wrap;gap:6px;align-items:baseline}
h3 a{color:#007aff;text-decoration:none}
.badge{font-size:11px;font-weight:400;color:#6e6e73;background:#f0f0f2;border-radius:5px;padding:1px 6px}
.badge.ok{background:#e8f6e8;color:#2b6b2b}
.badge.bad{background:#fdeaea;color:#a33}
dl{display:grid;grid-template-columns:52px 1fr;gap:3px 10px;font-size:12.5px;color:#3a3a3c;margin-top:8px}
dt{color:#86868b}
dd{overflow-wrap:anywhere}
code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11.5px;background:#f6f6f8;border-radius:4px;padding:1px 4px}
.hint{font-size:12px;color:#6e6e73;background:#f4f7fd;border-left:3px solid #c7d7f5;padding:6px 8px;border-radius:0 6px 6px 0;margin:8px 0 2px}
ol.notes{font-size:13px;color:#3a3a3c;padding-left:20px}
ol.notes li{margin:8px 0}
a.big{display:inline-block;margin-right:16px;font-size:13.5px;color:#007aff;text-decoration:none}
</style>
</head>
<body>
<div class="wrap">
  <h1>t369 · 卡路里场景 08「身体细节」13 条逐条真跑 · 总索引</h1>
  <div class="sub">票 <a href="https://github.com/FeatherHunter/ilife/issues/369">#369</a>（装机 ＋ 13 条逐条真跑）。
  跑法：临时库 <code>.scratch/t369/tmpdb</code>（真库零写入）；每条都走真出口
  <code>packages/skill-calorie/dist/cli/cmd_read.js</code>，键取自路由声明
  <code>src/body/routes.ts</code>。清单见 <code>docs/skills/skill-calorie/t369-逐条清单.md</code>，证据见 <code>t369-证据.md</code>。</div>
  <div>
    <a class="big" href="t369-桌面墙.html">桌面墙（1100 宽 × ${items.length} 件）→</a>
    <a class="big" href="t369-手机墙.html">手机墙（390 宽 × ${items.length} 件）→</a>
  </div>
  <div class="gates">
    ${(() => {
      const g = man.gate ?? {};
      const s = g.separator ?? null;
      const pills = [];
      pills.push(s
        ? `<span class="pill ${s.green === s.pages ? 'ok' : 'bad'}">分隔符与内部标识符：${s.green}/${s.pages} 页 0 命中</span>`
        : '<span class="pill bad">分隔符读数缺</span>');
      if (s && s.totals) pills.push(`<span class="pill">节点级命中合计 R1 ${s.totals.R1}／R2 ${s.totals.R2}／R3 ${s.totals.R3}／R4 ${s.totals.R4}／R5 ${s.totals.R5}／R6 ${s.totals.R6}／R7 ${s.totals.R7}</span>`);
      if (g.overflow !== null && g.overflow !== undefined) pills.push(`<span class="pill ok">三档溢出：${g.overflow} 件读数在册（回归门）</span>`);
      if (g.fmt) pills.push(`<span class="pill">版式读数：${g.fmt.pages} 件</span>`);
      if (g.vision) pills.push(`<span class="pill ${g.vision.pass ? 'ok' : 'bad'}">视觉终审：均分 ${g.vision.avg}（${g.vision.pass ? '过线' : '未过线'}）</span>`);
      pills.push(`<span class="pill">生成于 ${esc(man.generatedAt)}</span>`);
      return pills.join('\n    ');
    })()}
  </div>

  <h2>过程型（写前）· ${man.process.length} 件</h2>
  <div class="cards">
${man.process.map(card).join('\n')}
  </div>

  <h2>结果型 · ${man.results.length} 件</h2>
  <div class="cards">
${man.results.map(card).join('\n')}
  </div>

  <h2>有意不出产物的项与原因</h2>
  <ol class="notes">
${noteItems.map(([k, v]) => `    <li><strong>${k}</strong>：${v}</li>`).join('\n')}
  </ol>
</div>
</body>
</html>
`;
writeFileSync(join(HERE, 't369-总索引.html'), page);

/* 生成完自己查一遍（口径见 `docs/agents/视觉验收墙.md` §4／§6.2）：
   ① 清单点名、盘上没有的（dropped）要报出来，不许静默剔；
   ② 页面里每个 href／src 都要落得到真实文件；
   ③ 格数要与清单条目数对得上。
   全过 exit 0，任一红 exit 1 并点名。 */
const refs = [...new Set([desktopWall, mobileWall, page].flatMap((html) => [...html.matchAll(/(?:src|href)="([^"#]+\.html)"/g)].map((m) => m[1])))];
const dead = refs.filter((r) => !existsSync(join(HERE, decodeURIComponent(r))));
const bad = [...new Set([...dropped.map((r) => r.rel), ...dead])];
const clean = bad.length === 0 && rows.length === items.length;
console.log(`墙与索引：${items.length} 格（结果型 ${man.results.length} ＋ 过程型 ${man.process.length}）；链接 ${refs.length} 条；`
  + (clean ? `缺失 0 -> t369-手机墙.html／t369-桌面墙.html／t369-总索引.html 可发` : `缺 ${bad.length} 件 -> ${bad.join('、')}`));
process.exit(clean ? 0 : 1);
