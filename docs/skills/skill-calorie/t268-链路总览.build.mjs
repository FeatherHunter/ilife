#!/usr/bin/env node
/**
 * #521 链路总览页生成器（自写精简版，不沿用 27 KB 的 make-link-page.mjs）。
 *
 * 输入（只读）：docs/skills/skill-calorie/t268-链路清单.json 的 rows（39 条，字段齐）。
 * 字节数的唯一来源：**生成当刻 statSync 页里链接指向的那个文件**（.scratch/t268-link/out/*.html），
 * 不从 JSON 里读 product_bytes —— 链接与数字同源（编排者补丁③）。
 *
 * 跑法：node docs/skills/skill-calorie/t268-链路总览.build.mjs
 * 落盘：docs/skills/skill-calorie/t268-链路总览.html（自包含单文件，零 http／零 link／零 @import）
 */
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const PAGE = join(HERE, 't268-链路总览.html');
const LIST = join(HERE, 't268-链路清单.json');

const src = JSON.parse(readFileSync(LIST, 'utf8'));
const rows = src.rows;
if (rows.length !== 39) throw new Error('rows 不是 39 条，实为 ' + rows.length);

/* ── 口径常数（出处：.scratch/t268-link/make-link-page.mjs 的 READ7_KEYS／WRITE_KEYS） ── */
const WRITE_KEYS = ['calorie.exercise.add', 'calorie.exercise.update', 'calorie.exercise.remove'];
const READ7_KEYS = ['calorie.view.exercise-distribution', 'calorie.view.exercise-trend', 'calorie.view.exercise-recap'];
/** 真库末条运动记录的日期（出处：#268 甲轮真库对账结论，见 .scratch/t268-link/db-account-before.log） */
const REAL_DB_LAST = '2026-07-31';

/* ── 族短名（人话、无分隔符；title 属性里留 JSON 原名） ── */
const FAM = {
  '写后回执（记）': { short: '记运动回执', kind: 'write' },
  '写后回执（改／删）': { short: '改删回执', kind: 'write' },
  '记录级明细页': { short: '记录明细', kind: 'read' },
  '运动汇总页（长窗／自定义）': { short: '运动汇总', kind: 'read' },
  '对照目标页': { short: '对照目标', kind: 'read' },
  '类型分布页': { short: '类型分布', kind: 'read' },
  '力量总览页': { short: '力量总览', kind: 'read' },
  '有氧总览页': { short: '有氧总览', kind: 'read' },
  '趋势页': { short: '趋势', kind: 'read' },
  '复盘页': { short: '复盘', kind: 'read' },
};

/* ── 帮工 ── */
const esc = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const num = (n) => Number(n).toLocaleString('en-US');
const disk = (abs) => {
  try {
    return statSync(abs).size;
  } catch {
    return null;
  }
};
const tail = (s) => (String(s).includes('·') ? String(s).split('·').pop().trim() : String(s));
const prefix = (s) => (String(s).includes('·') ? String(s).split('·')[0].trim() : '');
const bar = (v, max) => (max > 0 ? Math.max(1.5, (v / max) * 100).toFixed(1) : '0');

/** 两条读数的形状之一：命令块下的代实说明（票面补丁④，两类形状分开渲染）。 */
function subst(row) {
  const d = row.command_delta;
  if (!d) return null;
  const idm = d.match(/示例参数\s*(id:\d+)\s*→\s*(id:\d+)/);
  if (idm) return { kind: 'id', pairs: [{ from: idm[1], to: idm[2] }] };
  const pairs = [...d.matchAll(/<([^>]+)>\s*→\s*([^、（\s][^、（\s]*)/g)].map((m) => ({ from: m[1], to: m[2] }));
  return pairs.length ? { kind: 'ph', pairs } : { kind: 'raw', text: d };
}

/** 真库实况的阻断归并（四类，口径同 make-link-page.mjs 的 jiaBlockClasses）。 */
function blockClass(t) {
  if (/未设运动目标/.test(t)) return '未设运动目标';
  if (/记录 ID 1 不存在/.test(t)) return '示例参数 id 在真库不可达';
  if (/昨日无运动记录可复制/.test(t)) return '昨日无可复制记录';
  return '时间窗空';
}

/* ── 派生数据 ── */
const cards = rows.map((r) => {
  const bytes = disk(r.product_abs);
  if (bytes === null) throw new Error('#' + r.n + ' 链接指向的文件当刻不存在：' + r.product_abs);
  const fam = FAM[r.page_family];
  if (!fam) throw new Error('#' + r.n + ' 页面族没有短名：' + r.page_family);
  return {
    idx: r.idx,
    n: r.n,
    wake: r.wake_word,
    prompt: r.prompt,
    cli: r.cli_ran,
    bytes,
    href: pathToFileURL(r.product_abs).href,
    abs: r.product_abs,
    fam: fam.short,
    famRaw: r.page_family,
    kind: fam.kind,
    selfTail: tail(r.page_self_title),
    selfPrefix: prefix(r.page_self_title),
    ok: !r.block_jia,
    block: r.block_jia,
    blockCls: r.block_jia ? blockClass(r.block_jia) : null,
    note: subst(r),
  };
});
const maxBytes = Math.max(...cards.map((c) => c.bytes));
const minBytes = Math.min(...cards.map((c) => c.bytes));
const sumBytes = cards.reduce((a, c) => a + c.bytes, 0);

/* 条数自证：三口径必须与清单 count 段逐字对上，对不上即抛（红） */
const nWrite = cards.filter((c, i) => WRITE_KEYS.includes(rows[i].command)).length;
const nRead7 = cards.filter((c, i) => READ7_KEYS.includes(rows[i].command)).length;
const nOther = 39 - nWrite - nRead7;
const C = src.count;
if (nWrite !== C.write13 || nRead7 !== C.read7 || nOther !== C.other_read19) {
  throw new Error('条数口径对不上：写' + nWrite + ' 读' + nRead7 + ' 其余' + nOther);
}
/* 真库实况自证 */
const okCount = cards.filter((c) => c.ok).length;
const blockRows = cards.filter((c) => !c.ok);
const clsMap = blockRows.reduce((a, c) => ((a[c.blockCls] = (a[c.blockCls] ?? 0) + 1), a), {});
if (okCount !== src.runs.jia_ok || blockRows.length !== src.runs.jia_blocked) {
  throw new Error('真库实况对不上：念得通' + okCount + ' / 念不通' + blockRows.length);
}
const clsOrder = ['时间窗空', '示例参数 id 在真库不可达', '未设运动目标', '昨日无可复制记录'];
for (const k of Object.keys(clsMap)) if (!clsOrder.includes(k)) throw new Error('未知阻断类：' + k);
const clsSum = clsOrder.reduce((a, k) => a + (clsMap[k] ?? 0), 0);
if (clsSum !== src.runs.jia_blocked) throw new Error('阻断类加总 ' + clsSum + ' ≠ ' + src.runs.jia_blocked);

/* 三组分布（页族／模板／自称页名），各自加总必须是 39 */
const distOf = (obj, keyOf) => {
  const list = Object.entries(obj).map(([k, v]) => ({ name: k, label: keyOf ? keyOf(k) : k, n: v, raw: k }));
  const s = list.reduce((a, x) => a + x.n, 0);
  if (s !== 39) throw new Error('分布加总不是 39：' + s);
  return list.sort((a, b) => b.n - a.n);
};
const distFam = distOf(src.by_page_family, (k) => FAM[k].short);
const distTpl = distOf(src.by_template, (k) => k.replace('templates/', ''));
const distSelf = distOf(src.by_product_self_title, (k) => tail(k)).map((x) => ({ ...x, chip: prefix(x.raw) }));

const nPh = cards.filter((c) => c.note?.kind === 'ph').length;
const nId = cards.filter((c) => c.note?.kind === 'id').length;
const idRow = cards.find((c) => c.note?.kind === 'id');
const phRow = cards.find((c) => c.note?.kind === 'ph');

/* ── 样式（照 help 模板的十三变量与断点，全是内联，零外链） ── */
const CSS = String.raw`
:root{--fg:#1d1d1f;--fg2:#6e6e73;--fg3:#86868b;--bg:#f2f2f7;--card:#fff;--line:#d1d1d6;--blue:#007aff;--blue2:#0a63ce;--soft:#f0f6ff;--ok:#34c759;--orange:#ff9500;--red:#ff3b30;--shadow:0 1px 2px rgba(0,0,0,.04),0 4px 14px rgba(0,0,0,.05);--ok-bg:#e7f8ee;--ok-fg:#1a7a3a;--red-bg:#fdecea;--red-fg:#b3261e;--orange-bg:#fff1e2;--orange-fg:#b25b00;--mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--fg);font:400 13.5px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:1180px;margin:0 auto;padding:24px 16px 60px}
h1,h2,h3{margin:0}
a{color:var(--blue2);text-decoration:none}
.sec{margin-top:22px}
.sec>h2{font-size:15px;font-weight:800;line-height:1.4;display:flex;align-items:center;gap:8px;margin-bottom:10px}
.sec>h2 .no{flex:0 0 auto;width:20px;height:20px;border-radius:6px;background:var(--blue);color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center}
.sec>h2 em{font-style:normal;font-size:11.5px;font-weight:400;color:var(--fg3)}
.note{font-size:12px;color:var(--fg3);margin:8px 0 0}
.hero{background:var(--card);border-radius:16px;box-shadow:var(--shadow);padding:18px}
.eyebrow{font-size:11px;font-weight:800;letter-spacing:.06em;color:var(--blue);line-height:1.4}
.hero h1{font-size:20px;font-weight:800;line-height:1.25;margin:6px 0 6px}
.lead{font-size:13px;color:var(--fg2);margin:0 0 12px}
.kv{display:flex;gap:8px;align-items:baseline;padding:6px 0;border-top:1px solid #f0f0f3}
.kv .k{flex:0 0 68px;font-size:11px;font-weight:700;line-height:1.5;color:var(--fg3)}
.kv .v{font-size:12.5px;min-width:0;overflow-wrap:anywhere}
.jumpbar{display:flex;gap:8px;overflow-x:auto;min-width:0;margin-top:12px;padding-bottom:2px;scrollbar-width:none}
.jumpbar::-webkit-scrollbar{display:none}
.jumpbar a{flex:0 0 auto;display:inline-flex;align-items:center;min-height:44px;padding:0 14px;border-radius:999px;background:var(--soft);border:1px solid #d7e6ff;color:var(--blue2);font-size:12px;font-weight:700;white-space:nowrap}
.stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.stat{background:var(--card);border-radius:12px;box-shadow:var(--shadow);padding:14px}
.stat .big{font-size:26px;line-height:1;font-weight:800;font-variant-numeric:tabular-nums}
.stat .big u{font-size:13px;font-weight:700;color:var(--fg3);text-decoration:none;margin-left:2px}
.stat .nm{font-size:12.5px;font-weight:700;margin-top:8px}
.stat .det{font-size:12px;color:var(--fg2);margin-top:2px;display:flex;flex-wrap:wrap;gap:6px}
.stat .det i{font-style:normal;background:#f5f5f7;border-radius:6px;padding:1px 7px;font-size:11px;font-variant-numeric:tabular-nums}
.ratiobar{display:flex;height:12px;border-radius:999px;overflow:hidden;margin-top:12px;background:#eaeaef}
.ratiobar i{display:block;height:100%}
.ratio-legend{display:flex;flex-wrap:wrap;gap:12px;margin-top:8px}
.lg{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;color:var(--fg2)}
.lg b{color:var(--fg);font-variant-numeric:tabular-nums}
.sw{width:9px;height:9px;border-radius:3px;display:block;flex:0 0 auto}
.grp{background:var(--card);border-radius:12px;box-shadow:var(--shadow);padding:12px 14px;margin-top:10px}
.grp h3{font-size:13px;font-weight:700;margin-bottom:8px}
.grp h3 small{font-weight:400;font-size:11px;color:var(--fg3);margin-left:6px}
.dist{display:grid;grid-template-columns:minmax(84px,auto) minmax(0,1fr) 30px;gap:10px;align-items:center;padding:3px 0;font-size:12px}
.dist .d-n{color:var(--fg2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dist .d-n u{font-size:10.5px;color:var(--fg3);text-decoration:none;margin-right:4px}
.dist .d-bar i.r{background:var(--red)}
.dist .d-bar{height:8px;border-radius:999px;background:#ececf1;overflow:hidden}
.dist .d-bar i{display:block;height:100%;border-radius:999px;background:var(--blue);min-width:2px}
.dist .d-bar i.w{background:var(--orange)}
.dist .d-c{text-align:right;font-weight:700;font-variant-numeric:tabular-nums}
.grp .total{display:flex;justify-content:space-between;font-size:11.5px;color:var(--fg3);border-top:1px solid #f0f0f3;margin-top:8px;padding-top:6px}
.segbar{display:flex;height:34px;border-radius:10px;overflow:hidden;margin-top:4px}
.segbar span{display:flex;align-items:center;justify-content:center;min-width:0;color:#fff;font-size:12px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden}
.legend{display:flex;flex-wrap:wrap;gap:12px;margin-top:8px;font-size:11.5px;color:var(--fg2)}
.grp.tint{background:var(--orange-bg);border:1px solid #ffdfbd;box-shadow:none}
.grp.tint h3{color:var(--orange-fg)}
.grp.tint p{font-size:12.5px;color:#6b4a15;margin:0}
.steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.step{background:var(--card);border-radius:12px;box-shadow:var(--shadow);padding:14px}
.step .sn{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:var(--soft);color:var(--blue2);font-size:11px;font-weight:800;font-variant-numeric:tabular-nums}
.step h3{font-size:13px;font-weight:700;margin:8px 0 4px}
.step p{font-size:12px;color:var(--fg2);margin:0}
.gap{background:var(--card);border-radius:12px;box-shadow:var(--shadow);border-left:4px solid var(--orange);padding:12px 14px;margin-top:10px}
.gap .gt{font-size:13px;font-weight:700;line-height:1.5;display:flex;gap:8px;align-items:flex-start}
.gap .gt i{font-style:normal;flex:0 0 auto;width:20px;height:20px;border-radius:6px;background:var(--orange-bg);color:var(--orange-fg);font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;margin-top:2px}
.gap .gp{font-size:12px;color:var(--fg2);margin:6px 0 0}
.gap .gs{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}
.gap .gs b{font-weight:700;font-size:11px;padding:3px 9px;border-radius:999px;background:var(--orange-bg);color:var(--orange-fg);font-variant-numeric:tabular-nums}
.gap .gs b.ok{background:var(--ok-bg);color:var(--ok-fg)}
.gap .gs b.gray{background:#f0f0f3;color:var(--fg2)}
.srcs{background:var(--card);border-radius:12px;box-shadow:var(--shadow);padding:6px 14px 10px}
.srcs code{font-family:var(--mono);font-size:11.5px;background:#f5f5f7;border-radius:5px;padding:1px 5px;overflow-wrap:anywhere}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px}
.lc{background:var(--card);border-radius:12px;box-shadow:var(--shadow);padding:14px;display:flex;flex-direction:column;min-width:0}
.lc-h{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.lcn{flex:0 0 auto;width:26px;height:26px;border-radius:50%;background:var(--soft);color:var(--blue2);font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;font-variant-numeric:tabular-nums}
.lcw{font-size:15px;font-weight:800;line-height:1.35;margin-right:auto}
.fam{font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;white-space:nowrap;flex:0 0 auto}
.fam.write{background:var(--orange-bg);color:var(--orange-fg)}
.fam.read{background:var(--soft);color:var(--blue2)}
.lc .kv{border-top:0;padding:8px 0 0}
.lc .kv .k{flex-basis:52px}
.kv-cmd{align-items:stretch;padding-bottom:2px}
.kv-cmd .v{flex:1 1 auto;min-width:0}
.kv-cmd .cmd{margin-top:2px}
.cmd{background:#1d1d1f;color:#f5f5f7;border-radius:10px;padding:10px 12px;margin:0;font-family:var(--mono);font-size:13px;line-height:1.7;white-space:pre;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:thin}
.sub{font-size:11.5px;line-height:1.6;margin:8px 0 0;display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.sub .stag{font-weight:700;padding:3px 9px;border-radius:999px;font-size:11px;white-space:nowrap;flex:0 0 auto}
.sub.ph .stag{background:var(--soft);color:var(--blue2)}
.sub.id .stag{background:var(--orange-bg);color:var(--orange-fg)}
.sub code{font-family:var(--mono);font-size:11.5px;background:#f5f5f7;border-radius:5px;padding:1px 5px;overflow-wrap:anywhere}
.sub .why{color:var(--fg2)}
.acts{display:flex;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 16px;border-radius:10px;font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap}
.btn.prime{background:var(--blue);color:#fff;border:0}
.btn.prime:active{background:var(--blue2)}
.btn.ghost{background:#fff;color:var(--blue);border:1px solid var(--blue)}
.btn.ghost:active{background:var(--soft)}
.bnum{margin-left:auto;font-size:12.5px;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}
.bnum u{font-size:10.5px;font-weight:400;color:var(--fg3);text-decoration:none;margin-left:2px}
.bbar{height:6px;border-radius:999px;background:#ececf1;overflow:hidden;margin-top:8px}
.bbar i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,var(--blue),var(--blue2));min-width:2px}
.lc-f{display:flex;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap}
.pill{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;padding:5px 10px;border-radius:999px;white-space:nowrap}
.pill.ok{background:var(--ok-bg);color:var(--ok-fg)}
.pill.bad{background:var(--red-bg);color:var(--red-fg)}
.dot{width:7px;height:7px;border-radius:50%;background:var(--ok);display:block;flex:0 0 auto}
.self{font-size:12.5px;font-weight:700;min-width:0;overflow-wrap:anywhere}
.self u{font-size:10.5px;font-weight:700;color:var(--fg3);text-decoration:none;margin-right:4px}
.errbox{margin-left:auto;min-width:0}
.errbox>summary{list-style:none;cursor:pointer;min-height:44px;display:flex;align-items:center;gap:6px}
.errbox>summary::-webkit-details-marker{display:none}
.errbox>summary::after{content:"展开看原因";font-size:10.5px;color:var(--fg3)}
.errbox[open]>summary::after{content:"收起原因"}
.err{font-family:var(--mono);font-size:11.5px;line-height:1.6;color:var(--fg2);background:#f5f5f7;border-radius:8px;padding:8px 10px;margin-top:6px;overflow-wrap:anywhere}
.pabs{font-family:var(--mono);font-size:11px;line-height:1.5;color:var(--fg3);margin-top:8px;overflow-wrap:anywhere;user-select:all}
.listtools{position:sticky;top:0;z-index:40;background:rgba(242,242,247,.94);-webkit-backdrop-filter:saturate(180%) blur(14px);backdrop-filter:saturate(180%) blur(14px);padding:8px 0;margin-top:12px}
.lt-in{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.search-box{position:relative;flex:1 1 220px;min-width:0}
.search-box input{width:100%;min-height:44px;border:1px solid var(--line);border-radius:10px;padding:11px 12px 11px 34px;font-size:13px;background:#fff;outline:none;font-family:inherit}
.search-box input:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(0,122,255,.13)}
.search-box svg{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--fg3);pointer-events:none}
.pills{display:flex;gap:6px;overflow-x:auto;min-width:0;max-width:100%;padding-bottom:2px;scrollbar-width:none}
.pills::-webkit-scrollbar{display:none}
.fpill{flex:0 0 auto;min-height:44px;padding:0 14px;border-radius:999px;border:1px solid var(--line);background:#fff;color:var(--fg2);font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap}
.fpill.on{background:var(--blue);border-color:var(--blue);color:#fff}
.lt-count{font-size:11.5px;color:var(--fg3);margin-top:6px}
.lc.hide{display:none}
.empty{background:var(--card);border:1.5px dashed var(--line);border-radius:12px;padding:22px 12px;text-align:center;color:var(--fg3);font-size:12.5px;margin-top:12px}
.empty.hide{display:none}
.foot{font-size:11.5px;line-height:1.7;color:var(--fg3);margin-top:22px;border-top:1px solid var(--line);padding-top:12px}
.foot b{color:var(--fg2)}
:focus-visible{outline:2px solid var(--blue);outline-offset:2px}
@media(max-width:820px){
  .grid{grid-template-columns:minmax(0,1fr)}
  .stats{grid-template-columns:minmax(0,1fr);gap:8px}
  .stat{display:flex;align-items:center;gap:12px;padding:12px 14px}
  .stat .big{min-width:64px}
  .stat .nm{margin-top:0}
  .jumpbar{gap:6px}
  .kv .k{flex-basis:60px}
}
@media(max-width:500px){
  .wrap{padding:14px 12px 44px}
  .hero{padding:14px}
  .hero h1{font-size:18px}
  .sec>h2{font-size:14px}
  .sec>h2 em{display:none}
  .lcw{font-size:14px}
  .stat .big{font-size:22px}
  .cmd{font-size:12.5px}
  .jumpbar a,.fpill{padding:0 12px}
  .dist{grid-template-columns:minmax(70px,auto) minmax(0,1fr) 26px;gap:8px}
  .acts .btn{flex:1 1 auto}
  .bnum{margin-left:0;width:100%;text-align:right}
  .lc-f{gap:6px}
}
`;


/* ── 卡片 ── */
function substHtml(c) {
  const n = c.note;
  if (!n) return '';
  if (n.kind === 'ph') {
    const pairs = n.pairs
      .map((p) => '<code>' + esc(p.from) + ' → ' + esc(p.to) + '</code>')
      .join('');
    return (
      '<p class="sub ph"><span class="stag">按当天代实</span>' +
      pairs +
      '<span class="why">命令里的日期占位符已经按本页当天填好，你念词时不用手填。</span></p>'
    );
  }
  if (n.kind === 'id') {
    const p = n.pairs[0];
    return (
      '<p class="sub id"><span class="stag">示例参数换成真 id</span><code>' +
      esc(p.from) +
      ' → ' +
      esc(p.to) +
      '</code><span class="why">冻结表里的示例参数在任何真库都取不到，这里换成了副本里真实存在的那条（已立票 #478）。</span></p>'
    );
  }
  return '<p class="sub"><span class="why">' + esc(n.text ?? '') + '</span></p>';
}

const card = (c) => `<article class="lc" data-k="${c.kind}" data-b="${c.ok ? 'ok' : 'bad'}" data-s="${esc(
  (c.n + ' ' + c.wake + ' ' + c.prompt).toLowerCase()
)}">
<div class="lc-h"><span class="lcn">${c.n}</span><h3 class="lcw">${esc(c.wake)}</h3><span class="fam ${
  c.kind
}" title="${esc(c.famRaw)}">${esc(c.fam)}</span></div>
<div class="kv"><span class="k">你会说</span><span class="v">${esc(c.prompt)}</span></div>
<div class="kv kv-cmd"><span class="k">命令</span><span class="v"><pre class="cmd">${esc(c.cli)}</pre></span></div>
${substHtml(c)}
<div class="acts"><a class="btn prime" href="${esc(c.href)}" title="打开产物页面">打开产物</a><button class="btn ghost" type="button" data-copy="${esc(
  c.abs
)}">复制路径</button><span class="bnum">${num(c.bytes)}<u>字节</u></span></div>
<div class="bbar" title="占 39 条里最大那份的 ${bar(c.bytes, maxBytes)}%"><i style="width:${bar(
  c.bytes,
  maxBytes
)}%"></i></div>
<div class="lc-f"><span class="self"><u>页首自称</u>${esc(c.selfTail)}</span>${
  c.ok
    ? '<span class="pill ok"><i class="dot"></i>念得通</span>'
    : `<details class="errbox"><summary><span class="pill bad">念不通</span></summary><div class="err">${esc(
        c.block
      )}</div></details>`
}</div>
<noscript><div class="pabs">${esc(c.abs)}</div></noscript>
</article>`;

/* ── 分布条（页族／模板／自称页名三组） ── */
const distRows = (list, opt = {}) =>
  list
    .map((x) => {
      const w = opt.write && opt.write(x) ? ' w' : '';
      const label = x.chip
        ? '<span class="d-n" title="' + esc(x.raw) + '"><u>' + esc(x.chip) + '</u>' + esc(x.label) + '</span>'
        : '<span class="d-n" title="' + esc(x.raw) + '">' + esc(x.label) + '</span>';
      return (
        '<div class="dist">' +
        label +
        '<span class="d-bar"><i class="' + w.trim() + '" style="width:' + bar(x.n, opt.max) + '%"></i></span>' +
        '<span class="d-c">' + x.n + '</span></div>'
      );
    })
    .join('');

/* ── ① 一眼总览 ── */
const overview = () => {
  const w2 = (v) => ((v / 39) * 100).toFixed(2);
  const blockDist = clsOrder
    .filter((k) => clsMap[k])
    .map(
      (k) =>
        '<div class="dist"><span class="d-n" title="' +
        esc(k) +
        '">' +
        esc(k) +
        '</span><span class="d-bar"><i class="r" style="width:' +
        bar(clsMap[k], 20) +
        '%"></i></span><span class="d-c">' +
        clsMap[k] +
        '</span></div>'
    )
    .join('');
  return `<section class="sec" id="overview">
<h2><span class="no">1</span>一眼总览<em>39 条词，三刀怎么切都是 39</em></h2>
<div class="stats">
  <div class="stat"><div class="big">${nWrite}<u>条</u></div><div class="nm">写</div><div class="det"><i>记运动回执 8</i><i>改删回执 5</i></div></div>
  <div class="stat"><div class="big">${nRead7}<u>条</u></div><div class="nm">读</div><div class="det"><i>类型分布 1</i><i>趋势 1</i><i>复盘 5</i></div></div>
  <div class="stat"><div class="big">${nOther}<u>条</u></div><div class="nm">其余读类</div><div class="det"><i>记录明细 5</i><i>运动汇总 10</i><i>对照目标 2</i><i>总览 2</i></div></div>
</div>
<div class="grp">
  <h3>39 条怎么切<small>同一批 39 行按命令数三遍，加总都是 39</small></h3>
  <div class="ratiobar"><i title="写 ${nWrite} 条" style="width:${w2(nWrite)}%;background:var(--blue)"></i><i title="读 ${nRead7} 条" style="width:${w2(
    nRead7
  )}%;background:var(--ok)"></i><i title="其余读类 ${nOther} 条" style="width:${w2(
    nOther
  )}%;background:var(--fg3)"></i></div>
  <div class="ratio-legend"><span class="lg"><i class="sw" style="background:var(--blue)"></i>写 <b>${nWrite}</b></span><span class="lg"><i class="sw" style="background:var(--ok)"></i>读 <b>${nRead7}</b></span><span class="lg"><i class="sw" style="background:var(--fg3)"></i>其余读类 <b>${nOther}</b></span></div>
</div>
<div class="stats">
  <div class="stat"><div class="big">39<u>份</u></div><div class="nm">产物页面点得开</div><div class="det"><i>每份都是完整 HTML 文档</i></div></div>
  <div class="stat"><div class="big">${num(maxBytes)}<u>字节</u></div><div class="nm">最大的那一份</div><div class="det"><i>最小 ${num(
    minBytes
  )}</i><i>合计 ${num(sumBytes)}</i></div></div>
  <div class="stat"><div class="big">0<u>条</u></div><div class="nm">链接缺失</div><div class="det"><i>39 条逐个断言文件存在</i></div></div>
</div>
<div class="grp"><h3>按页面族<small>族短名只为上屏好读，鼠标停上去能看到清单里的原名</small></h3>${distRows(distFam, {
    max: 10,
    write: (x) => FAM[x.raw].kind === 'write',
  })}<div class="total"><span>十族</span><span>合计 39</span></div></div>
<div class="grp"><h3>按模板<small>数的是产物页面用了哪个模板</small></h3>${distRows(distTpl, { max: 15 })}<div class="total"><span>八个模板</span><span>合计 39</span></div></div>
<div class="grp"><h3>按产物自称页名<small>产物页自己第一行 title 里写的名字</small></h3>${distRows(distSelf, {
    max: 13,
  })}<div class="total"><span>八种自称</span><span>合计 39</span></div></div>
<div class="grp" id="realdb">
  <h3>真库实况<small>拿真库原样跑一遍，39 条里出得来多少</small></h3>
  <div class="segbar"><span title="念得通 ${okCount} 条" style="width:${((okCount / 39) * 100).toFixed(
    1
  )}%;background:var(--ok)">念得通 ${okCount}</span><span title="念不通 ${blockRows.length} 条" style="width:${(
    (blockRows.length / 39) *
    100
  ).toFixed(1)}%;background:var(--red)">念不通 ${blockRows.length}</span></div>
  <div style="margin-top:10px">${blockDist}</div>
</div>
<div class="grp tint" id="noprocess">
  <h3>过程型页 0 条</h3>
  <p>39 条词的 prompt 逐条看过，没有一条要求先问再确认，一次跑动直接出最终页面。实测 2 条例外，看今日运动（vs 目标）与看本周运动（vs 目标）的原文写了先问我目标值，实现上走缺失阻断，产物仍然是成终页。</p>
</div>
<p class="note">字节数是生成当刻在盘上量出来的，不是从清单里抄的，所以和产物页始终对得上。</p>
</section>`;
};

/* ── 页头 ── */
const hero = () => `<header class="hero">
  <div class="eyebrow">场景 04 运动</div>
  <h1>链路总览：39 条唤醒词，39 份产物</h1>
  <p class="lead">一句人话怎么长成一份页面：prompt → 唤醒词 → 命令 → 产物 HTML。</p>
  <div class="kv"><span class="k">范围</span><span class="v">卡路里技能场景 04 运动，冻结表里 39 条唤醒词各出一份产物页面</span></div>
  <div class="kv"><span class="k">自包含</span><span class="v">本页零外部依赖，没有网络请求，也没有外链字体，双击就能看</span></div>
  <div class="kv"><span class="k">日期口径</span><span class="v">本页当天按 ${esc(src.today_pinned)} 算，产物字节数是生成当刻盘上文件的真实大小</span></div>
  <nav class="jumpbar"><a href="#overview">一眼总览</a><a href="#howto">怎么用</a><a href="#gaps">已知遗漏</a><a href="#list">39 条逐条</a><a href="#sources">口径与出处</a></nav>
</header>`;

/* ── ② 怎么用 ── */
const howto = () => `<section class="sec" id="howto">
<h2><span class="no">2</span>怎么用<em>三步，一分钟</em></h2>
<div class="steps">
  <div class="step"><span class="sn">01</span><h3>打开本页</h3><p>双击这份 HTML 文件，浏览器里就能看全 39 条，不用起服务，也不用联网。</p></div>
  <div class="step"><span class="sn">02</span><h3>点「打开产物」</h3><p>卡片上的蓝色按钮直接打开那一份产物页面，看的就是这条词真实跑出来的东西。</p></div>
  <div class="step"><span class="sn">03</span><h3>打不开就复制路径</h3><p>浏览器拦住本地文件时，点「复制路径」把绝对路径拿去文件管理器打开。脚本关掉也拿得到，卡片底部会把路径直接显示出来。</p></div>
</div>
<p class="note">红色的「念不通」徽章可以点开，里面是真库原样跑时的报错原文。</p>
</section>`;

/* ── ③ 已知遗漏（4 条：一行事实 + 一条形状） ── */
const gaps = () => `<section class="sec" id="gaps">
<h2><span class="no">3</span>已知遗漏<em>照实写，不是免检牌</em></h2>
<div class="gap"><div class="gt"><i>1</i>真库实况下只有 ${okCount} 条出得来</div>
<p class="gp">真库末条运动记在 ${REAL_DB_LAST}，之后所有时间窗都是空的。本页产物来自临时库副本，补了当日运动记录与运动目标，所以 39 条齐。</p>
<div class="gs"><b>末条运动 ${REAL_DB_LAST}</b><b class="ok">真库念得通 ${okCount} 条</b><b>念不通 ${blockRows.length} 条</b></div></div>
<div class="gap"><div class="gt"><i>2</i>两条写词的示例参数 id:1 在任何真库都不可达</div>
<p class="gp">真库的 id 域是 3 到 8305，id:1 取不到。本页对改运动记录与删运动记录这两条改用副本里真实存在的 id，并在卡片上注明。</p>
<div class="gs"><b>id:1 取不到</b><b class="gray">副本改用 ${esc(idRow ? idRow.note.pairs[0].to : 'id:8344')}</b><b>已立票 #478</b></div></div>
<div class="gap"><div class="gt"><i>3</i>同族两处口径不一致，收口票在办</div>
<p class="gp">来源行还印着库表名 exercise_log，载荷头还印着命令而不是人话页名，两处都留给收口票处理。</p>
<div class="gs"><b>#470 来源行印库表名</b><b>#477 载荷头印命令</b></div></div>
<div class="gap"><div class="gt"><i>4</i>本场景没有过程型页面</div>
<p class="gp">39 条词都是一次跑动直接出最终页面，没有跑一半先停下来等确认的过程页。</p>
<div class="gs"><b class="gray">过程型页 0 条</b></div></div>
</section>`;

/* ── ⑤ 口径与出处（4 条来源行；路径只进 title，不上屏） ── */
const srcRow = (k, file, abs, text) =>
  `<div class="kv"><span class="k">${k}</span><span class="v"><code title="${esc(abs)}">${esc(file)}</code>${text}</span></div>`;
const sources = () => `<section class="sec" id="sources">
<h2><span class="no">5</span>口径与出处<em>每个数字都能回查</em></h2>
<div class="srcs">
${srcRow('词表', 'scene-04-exercise.ts', 'packages/skill-calorie/src/triggers/scene-04-exercise.ts', '冻结表，39 条唤醒词与命令都从它取。')}
${srcRow('逐条字段', 't268-链路清单.json', 'docs/skills/skill-calorie/t268-链路清单.json', '本页的 prompt 和命令都取自它的 rows，页面族与自称页名也一样。')}
${srcRow('两轮跑动', 'run39-link.json', '.scratch/t268-link/run39-link.json', '甲轮拿真库原样跑，乙轮拿补过当日记录的副本跑，本页链接指向乙轮产物。')}
${srcRow('真库对账', 'db-account-before.log', '.scratch/t268-link/db-account-before.log', '与 <code title=".scratch/t268-link/db-account-after.log">db-account-after.log</code> 一起证明跑前跑后真库没动过。')}
</div>
<p class="note">页面族和模板名都是清单里的原文，族短名只是上屏短写。鼠标停在徽章或条目上能看到原名。</p>
</section>`;

/* ── 卡片区工具条与列表 ── */
const listSection = () => `<section class="sec" id="list">
<h2><span class="no">4</span>39 条逐条<em>点开就是那一份产物页</em></h2>
<p class="note">39 条都是<strong>成终页</strong>，一次跑动直接出最终页面，没有过程型页。为什么能这么断定，见 <a href="#noprocess">过程型页 0 条</a>。</p>
<div class="listtools">
  <div class="lt-in">
    <div class="search-box"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-4-4"></path></svg><input id="q" type="search" placeholder="搜唤醒词，或者搜你会说的那句话" aria-label="搜索唤醒词"></div>
    <div class="pills"><button class="fpill on" type="button" data-f="all">全部 39</button><button class="fpill" type="button" data-f="write">写 ${nWrite}</button><button class="fpill" type="button" data-f="read">读 ${39 - nWrite}</button><button class="fpill" type="button" data-f="blocked">念不通 ${blockRows.length}</button></div>
  </div>
  <div class="lt-count" id="cnt" aria-live="polite">显示 39 条（共 39 条）</div>
  <noscript><style>.listtools .lt-in{display:none}</style><p class="note">脚本关掉了，搜索和筛选用不了，39 条都平铺在下面。</p></noscript>
</div>
<div class="grid">${cards.map(card).join('')}</div>
<div class="empty hide" id="empty">没有匹配的唤醒词，换个词试试。</div>
</section>`;

/* ── 页脚数字口径注 ── */
const footer = () => `<p class="foot"><b>数字口径</b>　产物字节数是生成当刻在盘上量出来的，39 份合计 ${num(
  sumBytes
)} 字节，最小 ${num(minBytes)}，最大 ${num(maxBytes)}。念得通与念不通两枚徽章是甲轮真库实况的读数。本页只讲结构与呈现，39 份产物页面后续整改后这批评分会过期，重新生成归产物整改收口票。</p>`;

/* ── 搜索、筛选、复制路径（无脚本时全都不用，39 条照样在） ── */
const JS = `(function(){
var cards=[].slice.call(document.querySelectorAll('.lc'));
var q=document.getElementById('q'),cnt=document.getElementById('cnt'),empty=document.getElementById('empty'),cur='all';
function apply(){
  var s=(q&&q.value?q.value:'').trim().toLowerCase(),n=0;
  cards.forEach(function(c){
    var k=c.getAttribute('data-k'),b=c.getAttribute('data-b');
    var okF=cur==='all'||(cur==='write'&&k==='write')||(cur==='read'&&k==='read')||(cur==='blocked'&&b==='bad');
    var show=okF&&(!s||(c.getAttribute('data-s')||'').indexOf(s)>=0);
    c.classList.toggle('hide',!show); if(show)n++;
  });
  var ps=document.querySelectorAll('.fpill');
  for(var i=0;i<ps.length;i++){ps[i].classList.toggle('on',ps[i].getAttribute('data-f')===cur);}
  if(cnt)cnt.textContent='显示 '+n+' 条（共 '+cards.length+' 条）';
  if(empty)empty.classList.toggle('hide',n>0);
}
if(q)q.addEventListener('input',apply);
[].forEach.call(document.querySelectorAll('.fpill'),function(b){
  b.addEventListener('click',function(){cur=b.getAttribute('data-f');apply();});
});
document.addEventListener('click',function(e){
  var b=e.target&&e.target.closest?e.target.closest('[data-copy]'):null; if(!b)return;
  var v=b.getAttribute('data-copy'),old=b.textContent;
  function done(m){b.textContent=m;setTimeout(function(){b.textContent=old;},1600);}
  function fb(){
    var a=document.createElement('textarea');a.value=v;a.setAttribute('readonly','');
    a.style.position='fixed';a.style.top='-1000px';document.body.appendChild(a);a.select();
    var ok=false;try{ok=document.execCommand('copy');}catch(err){ok=false;}
    document.body.removeChild(a);done(ok?'已复制路径':'请手动选中路径');
  }
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(v).then(function(){done('已复制路径');},fb);}else{fb();}
});
})();`;

/* ── 拼装并落盘 ── */
const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>链路总览：卡路里场景 04 运动 39 条唤醒词</title>
<style>${CSS}</style>
</head>
<body>
<div class="wrap">
${hero()}
${overview()}
${howto()}
${gaps()}
${listSection()}
${sources()}
${footer()}
</div>
<script>${JS}</script>
</body>
</html>
`;

for (const bad of ['http', '<link', '@import']) {
  if (html.includes(bad)) throw new Error('生成结果里有禁用串：' + bad);
}
const nCard = (html.match(/<article class="lc"/g) ?? []).length;
if (nCard !== 39) throw new Error('生成结果不是 39 张卡：' + nCard);
const nPath = (html.match(/<noscript><div class="pabs">/g) ?? []).length;
if (nPath !== 39) throw new Error('无脚本兜底路径不是 39 条：' + nPath);
/** --dry：只在内存里拼装并打读数，不落盘。--out <路径>：落到别处（拿来在票内暂存目录里试跑，正式出页不带这两个开关）。 */
const DRY = process.argv.includes('--dry');
const oi = process.argv.indexOf('--out');
const TARGET = oi > 0 && process.argv[oi + 1] ? resolve(process.argv[oi + 1]) : PAGE;
if (!DRY) writeFileSync(TARGET, html, 'utf8');

console.log(
  'BUILD page=' + TARGET + ' bytes=' + Buffer.byteLength(html, 'utf8') + ' cards=' + nCard + (DRY ? '  [dry 未落盘]' : '')
);
console.log(
  'BUILD 条数自证 39 = 写 ' + nWrite + ' ＋ 读 ' + nRead7 + ' ＋ 其余读类 ' + nOther + '（与清单 count 段逐字对上）'
);
console.log('BUILD 真库实况 念得通 ' + okCount + ' ＋ 念不通 ' + blockRows.length + ' = 39；阻断四类 ' + clsOrder.map((k) => k + ' ' + (clsMap[k] ?? 0)).join('、'));
console.log('BUILD 代实两类 占位符 ' + nPh + ' 条、示例 id ' + nId + ' 条；样例 ' + phRow?.n + ' 与 ' + idRow?.n);
console.log('BUILD 字节同源 当刻盘上 39 份 ' + num(minBytes) + ' 到 ' + num(maxBytes) + ' 字节，合计 ' + num(sumBytes) + '；分布三组各加总 39');

