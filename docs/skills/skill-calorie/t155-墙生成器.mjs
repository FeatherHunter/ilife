/** T155 · 生成「视觉验收墙」：把 MAP #155 场景 02（饮食）的真跑产物铺成一页，给人肉眼滚完签字。
 *
 * 形制照 `docs/agents/视觉验收墙.md`（§6.2 骨架 ＋ §6.3 四条形制），起点件 `t154-mobile-wall.mjs`。
 * 起点件有**一个假绿灯**（§6.4 点名）：它先按「盘上有没有」把清单过滤一遍，再只查页面引用，
 * 于是**缺件被静默剔掉、自检照样报「缺失 0」**。本脚本把 `dropped` 判据补上 ——
 * 册子点名却没有文件的条目单独成 `dropped`，`dropped` 与 `dead` **一起判**，缺一件即 exit 1 并点名。
 *
 * 双端各一张（§3 第 3 条）：手机墙 390 宽（多列，看塌列）／桌面墙 1280 宽（单列，看排布）；格高一致。
 * 宽产物**整体缩**、不改视口（§6.3 第 3 条）：视口仍是 W，所以按 W 截的图与墙上看到的是同一版式。
 * **不加 `loading="lazy"`**（§7 第一个坑：加了下半页格子永远空白）。
 *
 * 册子与墙**共用同一个名字来源**：册子里的 `file` 就是盘上实名（发布名），墙只读不算（§6.1：
 * 同一个名字只在一处算出来，两侧不一致＝全墙集体死链）。
 *
 * 用法：
 *   node docs/skills/skill-calorie/t155-墙生成器.mjs --book-from-run          # 先从真跑记录重出册子
 *   node docs/skills/skill-calorie/t155-墙生成器.mjs                         # 双端两张墙 ＋ 自检
 *   node docs/skills/skill-calorie/t155-墙生成器.mjs --width 1280            # 只出桌面墙
 *   node docs/skills/skill-calorie/t155-墙生成器.mjs --out 别的名字.html      # 换输出名
 *   node docs/skills/skill-calorie/t155-墙生成器.mjs --book 别的册子.json     # 换册子（反例用）
 *
 * 出：<产物目录>/t155-墙-手机.html、<产物目录>/t155-墙-桌面.html
 *     （墙页与产物**必须同目录**，iframe 的相对路径才落得到 —— §3 第 2 条）
 * 退出码：0＝册子点名全落盘、页面引用全落盘；1＝有缺件，点名那一行在 stdout。
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/ilife';
const SRC = join(ROOT, '.scratch/t155o/live-db/calorie_html');
const RUN = join(ROOT, '.scratch/t155o/live-run.json');
const BOOK_DEF = join(ROOT, 'docs/skills/skill-calorie/t155-产物册子.json');

/* ── 命令行 ── */
const argv = process.argv.slice(2);
const opt = (name, def) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : def;
};
const has = (name) => argv.includes('--' + name);
const BOOK = opt('book', BOOK_DEF);
const WANT_W = Number(opt('width', 0)) || 0;

/* ── 页族：与册子同一套口径（册子若已有 family 就用册子的，墙不另算一遍） ── */
const FAMILIES = [
  ['读页 · 今日与餐别', /^calorie\.(today|view\.today-water)$/],
  ['读页 · 区间总览', /^calorie\.view\.diet$/],
  ['读页 · 营养分析', /^calorie\.view\.(nutrition-detail|nutrition-ratio|nutrition-analysis|six-factors)$/],
  ['读页 · 排行与榜单', /^calorie\.view\.ranking$/],
  ['读页 · 饮食复盘', /^calorie\.view\.diet-review$/],
  ['读页 · 食品库', /^calorie\.view\.(search|library|dedupe|source-stats)$/],
  ['过程页 · 写前确认', /^calorie\.view\.batch-import-preview$/],
  ['写后回执 · 记饮食与水', /^calorie\.(diet\.(add|batch|copy)|water\.log)$/],
  ['写后回执 · 改与删', /^calorie\.diet\.(update|update-by-date|remove|remove-by-type|remove-by-date|remove-by-range)$/],
  ['写后回执 · 食品库管理', /^calorie\.product\.(add|update|deprecate|import)$/],
];
const ORDER = [...FAMILIES.map(([f]) => f), '其它'];
const familyOf = (key) => (FAMILIES.find(([, re]) => re.test(String(key)))?.[0]) ?? '其它';

/** 每格那一句「这一格该确认什么」（§6.3 第 1 条）。 */
const HINTS = {
  '读页 · 今日与餐别': '该确认：餐别分组对不对、每餐条数与合计读得出来、窄屏没挤成一条线。',
  '读页 · 区间总览': '该确认：区间起止写明白、逐日逐餐列得下、窄屏没塌成一列竖条。',
  '读页 · 营养分析': '该确认：占比数值与图对齐、长数字没溢出框、单位（g/kcal）标了没。',
  '读页 · 排行与榜单': '该确认：榜单名与唤醒词一致（查高热量排行别出成「全部排行」）、名次与数值没串行。',
  '读页 · 饮食复盘': '该确认：区间写明白、结论段与明细段分得开、空区间有没有话说。',
  '读页 · 食品库': '该确认：列表／空态写得清、每行食品名与热量对得上、去重报告没糊成一段。',
  '过程页 · 写前确认': '该确认：明确是「还没写库」的预览页、条目逐条列清、有确认口。',
  '写后回执 · 记饮食与水': '该确认：回执写的量／条目与唤醒词一致、没有内部函数名印上屏、落库时间看得见。',
  '写后回执 · 改与删': '该确认：改前改后／删了几条说清、影响范围写明白、没有内部函数名印上屏。',
  '写后回执 · 食品库管理': '该确认：食品名与营养值对得上、新增／下架的状态词说清、没有内部函数名印上屏。',
  '其它': '该确认：页面没报错、版式在窄屏下没塌、文案是人话。',
};

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** 页面里人读的那一行标题（<h1>）。实测 81 份里 <title> 只有 5 种取值，当标题等于没标。 */
function h1Of(abs) {
  try {
    const m = readFileSync(abs, 'utf8').match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    return m ? m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';
  } catch { return ''; }
}

/* ── ① 按需从真跑记录重出册子（册子＝唯一取数口） ── */
if (has('book-from-run')) buildBook();

function buildBook() {
  const run = JSON.parse(readFileSync(RUN, 'utf8'));
  const rows = run.map((r, i) => {
    const file = r.made && r.made[0] ? r.made[0] : null;
    const abs = r.path || (file ? join(SRC, file) : null);
    const onDisk = Boolean(abs && existsSync(abs));
    return {
      seq: i + 1,
      family: familyOf(r.key),
      wake: r.wake,
      title: onDisk ? h1Of(abs) : '',
      file: onDisk ? file : null,
      cmd: r.key,
      params: r.params ?? null,
      cli: r.cli ?? '',
      bytes: onDisk ? statSync(abs).size : 0,
      delivered: onDisk,
      notDeliveredReason: onDisk ? null
        : (r.status !== 0 ? `真跑 exit ${r.status}：${String(r.err || '').slice(0, 120)}`
          : '真跑 exit 0 但没有落盘的 made 文件'),
    };
  });
  rows.sort((a, b) => ORDER.indexOf(a.family) - ORDER.indexOf(b.family) || a.seq - b.seq);

  const inBook = new Set(rows.map((r) => r.file).filter(Boolean));
  /* 墙页自己也落在产物目录里（§3 第 2 条），但它不是产物 —— 从「未入册」里排掉，
   * 免得把自己算成「遗留文件」。排掉的是墙页，产物一个不动。 */
  const notInBook = readdirSync(SRC).filter((f) => f.endsWith('.html'))
    .filter((f) => !inBook.has(f) && !/^t155-墙-/.test(f)).sort();

  const counts = {};
  for (const r of rows) {
    const k = r.family + (r.delivered ? '' : '（没交出产物）');
    counts[k] = (counts[k] || 0) + 1;
  }
  const book = {
    $schema: 't155-product-book/1',
    note: 'MAP #155 场景 02（饮食）全量真跑产物册子。墙只读这份；file 即发布名（抄盘上实名，不重算）。',
    generatedFrom: RUN.replace(/\\/g, '/'),
    productDir: SRC.replace(/\\/g, '/'),
    totalRows: rows.length,
    delivered: rows.filter((r) => r.delivered).length,
    notDelivered: rows.filter((r) => !r.delivered).length,
    familyOrder: ORDER,
    familyCounts: counts,
    hints: Object.fromEntries(ORDER.map((f) => [f, HINTS[f] ?? HINTS['其它']])),
    rows,
    notInBook,
  };
  writeFileSync(BOOK, JSON.stringify(book, null, 1) + '\n', 'utf8');
  console.log('册子 ' + BOOK.replace(/\\/g, '/').split('/').pop() + '：' + rows.length + ' 条（交出 '
    + book.delivered + '，未交出 ' + book.notDelivered + '）；产物目录另有 ' + notInBook.length
    + ' 份未入册（早先探查轮遗留，见 notInBook）');
}

/* ── ② 读册子 ── */
const book = JSON.parse(readFileSync(BOOK, 'utf8'));
const all = book.rows;
const hints = book.hints ?? HINTS;

/* ── ③ 自检判据：三套分开，别把「本就没交出」当成「点名了却没落盘」──
 *   dropped 册子**点了名**（file 非空）却盘上没有 → 这一条必须报、必须 exit 1（§6.2 的假绿灯就在这）
 *   absent  册子**从头就记着没交出**（file 为 null，带原因）→ 如实列在墙尾，不是缺件
 *   dead    墙页上引用出去的链接落不到 → 也得报（§6.2 骨架原有的那一半判据） */
const rows = all.filter((r) => r.file && existsSync(join(SRC, r.file)));
const dropped = all.filter((r) => r.file && !existsSync(join(SRC, r.file)));
const absent = all.filter((r) => !r.file);

/* ── ④ 成品 ── */
const made = [];
function build(W, OUT, COLS) {
  const SCALE = W <= 500 ? 1 : Math.min(0.5, 600 / W);     // §6.3 第 3 条：窄的不缩、宽的整体缩
  const CW = Math.ceil(W * SCALE), CH = Math.ceil(820 * SCALE);

  const sections = ORDER.filter((f) => rows.some((r) => (r.family ?? familyOf(r.cmd)) === f)).map((fam) => {
    const list = rows.filter((r) => (r.family ?? familyOf(r.cmd)) === fam);
    const cells = list.map((r) => '    <figure>\n'
      + '      <figcaption><span class="n">' + String(r.seq).padStart(2, '0') + '</span> '
      + '<a href="' + esc(r.file) + '" target="_blank" rel="noopener">' + esc(r.file) + '</a></figcaption>\n'
      + '      <div class="cap"><b>' + esc(r.wake) + '</b>'
      + (r.title ? ' <span class="page">' + esc(r.title) + '</span>' : '')
      + (r.bytes ? ' <span class="kb">' + Math.round(r.bytes / 1024) + 'KB</span>' : '') + '</div>\n'
      + '      <p class="hint">' + esc(hints[fam] ?? '') + '</p>\n'
      + '      <div class="shot"><iframe src="' + esc(r.file) + '" width="' + W + '" height="820" '
      + 'title="' + esc(String(r.seq) + ' ' + r.wake) + '"></iframe></div>\n'
      + '    </figure>').join('\n');
    return '  <h2>' + esc(fam) + '<span>' + list.length + ' 格</span></h2>\n  <div class="grid">\n'
      + cells + '\n  </div>';
  }).join('\n');

  const off = absent;
  const page = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>场景02 饮食 · ${W <= 500 ? '手机' : '桌面'}墙（${rows.length} 格 × ${W} 宽）</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--cw:${CW}px;--ch:${CH}px;--box:${CW + 20}px}
body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;background:#f5f5f7;color:#1d1d1f}
.wrap{padding:24px 20px 60px}
h1{font-size:22px;font-weight:600;margin-bottom:6px}
.sub{color:#6e6e73;font-size:13.5px;margin-bottom:8px;line-height:1.7}
.sub code{background:#e8e8ed;border-radius:4px;padding:1px 5px;font-size:12.5px}
h2{font-size:15px;font-weight:600;margin:26px 0 12px;padding-left:9px;border-left:4px solid #007aff}
h2 span{color:#86868b;font-weight:400;font-size:12.5px;margin-left:8px}
.grid{display:grid;grid-template-columns:repeat(${COLS},minmax(0,${CW + 20}px));gap:18px;align-items:start;justify-content:start}
figure{background:#fff;border:1px solid #d2d2d7;border-radius:12px;overflow:hidden;width:var(--box);justify-self:start}
figcaption{display:flex;align-items:baseline;gap:7px;padding:8px 10px 0;font-size:11.5px;min-width:0}
figcaption .n{color:#86868b;font-variant-numeric:tabular-nums;font-weight:600}
figcaption a{color:#007aff;text-decoration:none;word-break:break-all;font-weight:600;min-width:0;overflow-wrap:anywhere}
figcaption a:hover{text-decoration:underline}
.cap{padding:6px 10px 0;font-size:13px;line-height:1.5;overflow-wrap:anywhere}
.cap .page{color:#6e6e73;font-weight:400}
.cap .kb{color:#86868b;font-weight:400;font-size:11.5px;white-space:nowrap}
.hint{padding:5px 10px 9px;font-size:12px;color:#6e6e73;line-height:1.6;border-bottom:1px solid #e8e8ed;overflow-wrap:anywhere}
.shot{width:var(--cw);height:var(--ch);overflow:hidden;background:#fff}
iframe{display:block;width:${W}px;height:820px;border:0;background:#fff;transform:scale(${SCALE});transform-origin:0 0}
.off{margin:26px 0 0;padding:12px 16px;background:#fff8ec;border:1px solid #ffd9a0;border-radius:12px;font-size:13px;line-height:1.8}
.off h2{border:0;padding:0;margin:0 0 6px}
.off li{margin-left:18px}
</style>
</head>
<body>
<div class="wrap">
  <h1>${W <= 500 ? '手机' : '桌面'}墙 · 场景 02 饮食 · ${rows.length} 格 × ${W} 宽</h1>
  <div class="sub">每格是一份真跑产物的<b>真实渲染</b>（iframe 里跑真 HTML：媒体查询按 ${W} 生效、页内可交互）。
  每格三行字：<b>标题链接</b>（点开整页）／<b>唤醒词 ＋ 页内 h1</b>（对得上不对得上，一眼看）／<b>该确认什么</b>。
  这一页给人看，不是交付产物；<b>别拿它当自动化扫描的输入</b>（整页截图只栅格化靠前的行）。</div>
${sections}
${off.length ? '  <div class="off"><h2>册子记着「没交出产物」的 ' + off.length + ' 条（不给格，逐条给原因）</h2><ul>'
    + off.map((r) => '<li>' + esc(String(r.seq).padStart(2, '0') + ' ' + r.wake) + ' —— ' + esc(r.notDeliveredReason || '') + '</li>').join('')
    + '</ul></div>' : ''}
</div>
</body>
</html>
`;
  writeFileSync(join(SRC, OUT), page, 'utf8');

  /* 链接自检：iframe src 与标题链接都要落得到真实文件。 */
  const refs = [...page.matchAll(/(?:src|href)="([^"#]+\.html)"/g)].map((m) => m[1]);
  const dead = refs.filter((r) => !existsSync(join(SRC, decodeURIComponent(r))));
  const clean = dropped.length === 0 && dead.length === 0;
  const bad = [...dropped.map((r) => r.file), ...dead.map((d) => d + '（页面引用落不到）')];
  console.log(OUT + '：' + rows.length + ' 格；链接 ' + refs.length + ' 条；'
    + (clean ? '缺失 0 -> ' + OUT + ' 可发'
      : '缺 ' + bad.length + ' 件 -> ' + bad.join('、')));
  return { OUT, cells: rows.length, refs: refs.length, clean, bad, dead: dead.length, dropped: dropped.length };
}

for (const [W, OUT, COLS] of [[390, 't155-墙-手机.html', 3], [1280, 't155-墙-桌面.html', 1]]) {
  if (WANT_W && WANT_W !== W) continue;
  made.push(build(W, OUT, COLS));
}

/* ── ⑤ 格数 vs 册子条目数 ── */
const geo = made.map((m) => m.cells);
console.log('格数 ' + geo.join(' / ') + ' vs 册子条目 ' + all.length
  + '（交出 ' + all.filter((r) => r.file).length + ' ＋ 未交出 ' + absent.length
  + '）；两张墙格数' + (new Set(geo).size === 1 ? '一致' : '不一致') + '。'
  + (geo.every((g) => g === all.length - absent.length) ? '对账相符' : '对账不符'));

const out = made.some((m) => !m.clean) ? 1 : 0;
console.log('SELFCHECK ' + (out === 0 ? 'PASS' : 'FAIL') + ' exit=' + out);
process.exit(out);
