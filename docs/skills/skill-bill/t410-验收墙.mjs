#!/usr/bin/env node
/** t410 写入域视觉验收墙生成器（入仓件 · 无依赖）。
 *
 * 口径出处：仓规 `docs/agents/视觉验收墙.md`（§3收口七步／§4完成判据／§5证据件落哪／
 * §6.2骨架／§6.3四条形制／§7坑）。照 `docs/skills/skill-calorie/scene02-验收墙/gen-wall.mjs`
 * 起，两处同形处逐字同义（缩放算式、列数规则、`dropped`／`dead`一起判、不加`loading="lazy"`、
 * 清单不带BOM）；本批另加：索引按prompt→唤醒词→命令→绝对路径成表，file列用绝对路径URL可点，
 * 末尾有意不出节列他域61词归他图。
 *
 * 用法（位置参数，照票面）：
 *   node docs/skills/skill-bill/t410-验收墙.mjs .scratch/t410-wall
 *     出两张墙＋总索引并自检：手机墙-390.html（390宽×3列1:1）＋桌面墙-1280.html（1280宽×1列整体缩）
 *     ＋总索引.html，格高一致980。
 *   node docs/skills/skill-bill/t410-验收墙.mjs --check .scratch/t410-wall
 *     只跑自检（反例测试就是这条：改清单某行file为不存在名再跑即红）。
 *
 * 命名规则（全仓只此一处算）：发布名＝`t410-页-<唤醒词>-<采集页/回执页>.html`，即清单
 * `.scratch/t410-wall/manifest.json` 的 `rows[].file`（＝`pages[].file`同一套名，重出脚本与
 * 本生成器都只读它，别处不许再拼；做法§1两侧不一致＝全墙集体死链）。墙页、索引页与产物**必须
 * 同目录**（iframe走相对路径；索引file列另给绝对路径URL可点）。
 *
 * 自检正反两面（做法链接自检正反两面都走）：
 *   正例 `node t410-验收墙.mjs .scratch/t410-wall` → 打印「32格；链接M条；缺失0->可发」**exit 0**；
 *   反例 把清单某行`file`改成盘上不存在的名字再跑`--check` → **exit 1且点名那一份**；改回再跑回exit 0。
 *
 * 另外三处照做：**不加`loading="lazy"`**（做法§7第一坑：加了下半页格子永远空白）；
 * 清单**不带BOM**（读到时剥并告警）；`dropped`（清单点名却没有文件）与`dead`（页上引用却落不到）
 * **一起判**（§7假绿灯坑：先过滤再查引用会把缺件静默剔掉）。
 *
 * 本批读数（照单抄，生成器不自己算）：写入域16词×采集回执**32格**，字节约72-83KB／页；
 * 真跑32/32全绿见`.scratch/t410-wall/run.log`（SEED-OK＋RESULT 32/32）；他域61词归他图见索引末尾。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const MANIFEST = 'manifest.json';
const INDEX = '总索引.html';
const WALL_MOBILE = '手机墙-390.html';
const WALL_DESKTOP = '桌面墙-1280.html';
const H = 980;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const die = (code, msg) => { console.error(msg); process.exit(code); };

/** 清单是唯一权威：`rows[].file`就是最终发布名（与`pages[].file`同一套）。 */
function loadManifest(dir) {
  const p = join(dir, MANIFEST);
  if (!existsSync(p)) die(2, '没有清单：' + p + '（清单须先真跑铺底，别让墙猜文件名）');
  let raw = readFileSync(p, 'utf8');
  if (raw.charCodeAt(0) === 0xfeff) {
    console.error('注意：清单带BOM（仓规§7读出来会Unexpected token）——本次已剥，请存不带签名的UTF-8');
    raw = raw.replace(/^\uFEFF/, '');
  }
  const mf = JSON.parse(raw);
  const rows = mf.rows;
  if (!Array.isArray(rows) || rows.length === 0) die(2, p + ' 的rows为空');
  for (const r of rows) {
    if (r.seq === undefined || !r.wake || !r.title || !r.file || !r.prompt || !r.key || !r.cli || !r.check) {
      die(2, '清单第' + (r.seq ?? '?') + '行缺字段（至少seq／wake／title／file／prompt／key／cli／check）：' + JSON.stringify(r).slice(0, 160));
    }
  }
  return { mf, rows, notShipped: Array.isArray(mf.notShipped) ? mf.notShipped : [] };
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

/** 每格＝真产物在该宽度下的真渲染（§6.3-1不塞缩略图；§6.3-3宽产物整体缩显示；无loading）。 */
function cell(r, w, h, scale) {
  const boxW = Math.round(w * scale), boxH = Math.round(h * scale);
  const frame = scale === 1
    ? '    <iframe src="' + esc(r.file) + '" width="' + w + '" height="' + h + '" title="' + esc(r.wake) + '"></iframe>'
    : '    <div class="shrink" style="width:' + boxW + 'px;height:' + boxH + 'px">\n'
    + '      <iframe src="' + esc(r.file) + '" width="' + w + '" height="' + h + '" style="transform:scale(' + scale.toFixed(3) + ');transform-origin:0 0" title="' + esc(r.wake) + '"></iframe>\n'
    + '    </div>';
  return '  <figure>\n'
    + '    <figcaption><a href="' + esc(r.file) + '" target="_blank" rel="noopener">' + esc(r.seq + ' ' + r.title) + '</a>\n'
    + '      <span>' + esc(r.kind || '') + '</span></figcaption>\n'
    + '    <div class="check"><b>这一格该确认什么：</b>' + esc(r.check) + '</div>\n'
    + frame + '\n  </figure>';
}

/** 出墙：每格一件真产物，格子宽＝要量的那个视口，格高一致；列数宽≤500取3否则取1。 */
function buildWall(dir, rows, out, w, h) {
  const cols = w <= 500 ? 3 : 1;
  const scale = w <= 500 ? 1 : Math.min(0.5, 600 / w);
  const boxW = Math.round(w * scale);
  const cells = rows.map((r) => cell(r, w, h, scale)).join('\n');
  const html = '<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8">\n'
    + '<meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(out) + '（' + rows.length + '格×' + w + '宽）</title>\n'
    + '<style>\n' + STYLE.replace(/COLS/g, String(cols)).replace(/BOXW/g, String(boxW)) + '\n</style></head><body><div class="wrap">\n'
    + '<h1>t410 写入域验收墙 · ' + rows.length + '格 × ' + w + '宽（格高' + h + '）</h1>\n'
    + '<div class="sub">每格是一份产物在 <b>' + w + '宽</b>下的<b>真实渲染</b>（可交互、媒体查询按该宽生效）。点标题在新标签打开整页。'
    + (scale === 1 ? '格子宽＝视口宽，1:1。' : '宽产物按 <b>' + scale.toFixed(3) + '</b> 整体缩显示（缩的是显示不是视口，视口仍是' + w + '）。')
    + '细看入口：<a href="' + INDEX + '">总索引</a>。这一页给人看，不是交付产物。</div>\n'
    + '<div class="grid">\n' + cells + '\n</div></div></body></html>\n';
  writeFileSync(join(dir, out), html, 'utf8');
  return { name: out, html };
}

/** 出索引：按页面族分组，每族一张表（prompt→唤醒词→命令→绝对路径），file列绝对路径URL可点。 */
function buildIndex(dir, rows, notShipped) {
  const families = [...new Set(rows.map((r) => r.family || '未分组'))];
  const groups = families.map((f) => {
    const mine = rows.filter((r) => (r.family || '未分组') === f);
    const trs = mine.map((r) => {
      const abs = resolve(dir, r.file);
      const url = pathToFileURL(abs).href;
      return '      <tr><td>' + r.seq + '</td>'
        + '<td><pre>' + esc(r.prompt) + '</pre></td>'
        + '<td>' + esc(r.wake) + '<br><span class="muted">' + esc(r.title) + '</span></td>'
        + '<td><code>' + esc(r.key) + '</code><br><code>' + esc(r.cli) + '</code></td>'
        + '<td><a href="' + esc(url) + '">' + esc(abs) + '</a><br><span class="muted">' + esc(r.file) + '</span></td>'
        + '<td>' + esc(r.check) + '</td></tr>';
    }).join('\n');
    return '  <h2>' + esc(f) + '（' + mine.length + '件）</h2>\n'
      + '  <div class="tbl"><table><thead><tr><th>序号</th><th>prompt</th><th>唤醒词</th><th>命令</th><th>绝对路径</th><th>该确认什么</th></tr></thead>\n'
      + '  <tbody>\n' + trs + '\n  </tbody></table></div>';
  }).join('\n');

  const walls = [WALL_MOBILE, WALL_DESKTOP].filter((w) => existsSync(join(dir, w)));
  const wallLine = walls.length
    ? walls.map((w) => '<a href="' + esc(w) + '">' + esc(w) + '</a>').join(' · ')
    : '（本次未出墙页）';
  const notShippedHtml = notShipped.length
    ? notShipped.map((n) => '      <li><b>' + esc(n.what) + '</b>：' + esc(n.why) + '</li>').join('\n')
    : '      <li><b>清单未给notShipped</b>：本页这一段不该为空，补进manifest.json再重跑。</li>';

  const html = '<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8">\n'
    + '<meta name="viewport" content="width=device-width,initial-scale=1"><title>t410 写入域验收总索引（' + rows.length + '件）</title>\n'
    + '<style>\n*{margin:0;padding:0;box-sizing:border-box}\n'
    + 'body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;background:#f5f5f7;color:#1d1d1f}\n'
    + '.wrap{padding:28px 22px 60px;max-width:1200px}\n'
    + 'h1{font-size:24px;font-weight:600;margin-bottom:6px}\n'
    + '.sub{color:#6e6e73;font-size:13.5px;line-height:1.8;margin-bottom:22px}\n'
    + '.sub b{color:#1d1d1f}\n'
    + 'h2{font-size:15px;font-weight:600;margin:26px 0 10px}\n'
    + '.tbl{overflow-x:auto;background:#fff;border:1px solid #d2d2d7;border-radius:12px}\n'
    + 'table{border-collapse:collapse;width:100%;font-size:12.5px;line-height:1.6}\n'
    + 'th,td{border-bottom:1px solid #e8e8ed;padding:9px 10px;text-align:left;vertical-align:top}\n'
    + 'th{color:#86868b;font-weight:600;white-space:nowrap;background:#fafafa}\n'
    + 'pre{white-space:pre-wrap;font-size:11.5px;color:#1d1d1f}\n'
    + 'code{font-size:11.5px;color:#6e6e73;word-break:break-all}\n'
    + '.muted{color:#86868b;font-size:11.5px}\n'
    + 'td a{color:#007aff;word-break:break-all}\n'
    + '.note{margin-top:28px;background:#fff;border:1px solid #d2d2d7;border-radius:12px;padding:16px 18px}\n'
    + '.note h2{margin-top:0}\n'
    + '.note ul{margin:8px 0 0 20px;font-size:13px;line-height:1.9;color:#3a3a3c}\n'
    + '</style></head><body><div class="wrap">\n'
    + '<h1>t410 写入域验收总索引</h1>\n'
    + '<div class="sub">' + rows.length + '件产物按页面族分组，每行一张表（prompt→唤醒词→命令→绝对路径）。'
    + '手机墙 <b>390宽×3列</b>看塌列，桌面墙 <b>1280宽×1列</b>看排布；两张墙、本索引与产物<b>同目录</b>，'
    + '格数＝本索引行数＝清单<code>manifest.json</code>的条目数（少任何一件，生成器自检点名并exit 1）。'
    + '本页：' + wallLine + '</div>\n'
    + groups + '\n<div class="note">\n  <h2>有意不出产物及其原因</h2>\n  <ul>\n' + notShippedHtml + '\n  </ul>\n</div>\n'
    + '</div></body></html>\n';
  writeFileSync(join(dir, INDEX), html, 'utf8');
  return { name: INDEX, html };
}

/** 自检：`dropped`（清单点名却没有文件）与`dead`（页上引用却落不到）一起判。页上引用含相对与file://绝对两种。 */
function selfCheck(dir, rows, pages) {
  const dropped = rows.filter((r) => !r.file || !existsSync(join(dir, r.file)));
  const refs = [];
  const perPage = [];
  for (const p of pages) {
    const urls = [...p.html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
    const files = [];
    for (const u of urls) {
      const clean = u.split(/[?#]/)[0];
      if (!clean.endsWith('.html')) continue;
      if (clean.startsWith('file://')) {
        try {
          const name = decodeURIComponent(clean.split('/').pop());
          files.push(name);
        } catch { files.push(clean); }
      } else if (!clean.includes('://')) {
        files.push(decodeURIComponent(clean));
      }
    }
    refs.push(...files);
    perPage.push(p.name + ' ' + files.length);
  }
  const dead = [...new Set(refs)].filter((r) => !existsSync(join(dir, r)));
  const bad = [
    ...dropped.map((r) => '清单点名却没有文件：' + r.seq + ' ' + r.wake + ' -> ' + (r.file || '（file缺失）')),
    ...dead.map((d) => '页上引用却落不到：' + d),
  ];
  const kept = rows.length - dropped.length;
  const clean = bad.length === 0;
  console.log(kept + '格；链接' + refs.length + '条（' + perPage.join(' ＋ ') + '）；缺失' + bad.length + ' -> ' + (clean ? '可发' : '不可发'));
  if (!clean) {
    for (const b of bad) console.error('  ' + b);
    console.error('不可发（产物目录 ' + dir + '）');
  }
  process.exit(clean ? 0 : 1);
}

/** `--check`模式：读盘上已出的墙与索引，把它们的引用也一起查。 */
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
if (argv[0] === '--check') {
  const dir = resolve(argv[1] ?? '.scratch/t410-wall');
  const { rows } = loadManifest(dir);
  selfCheck(dir, rows, pagesOnDisk(dir));
} else {
  const dir = resolve(argv[0] ?? '.scratch/t410-wall');
  const { rows, notShipped } = loadManifest(dir);
  const pages = [
    buildWall(dir, rows, WALL_MOBILE, 390, H),
    buildWall(dir, rows, WALL_DESKTOP, 1280, H),
    buildIndex(dir, rows, notShipped),
  ];
  console.log('墙与索引已重出：' + join(dir, WALL_MOBILE) + ' / ' + WALL_DESKTOP + ' / ' + INDEX);
  selfCheck(dir, rows, pages);
}
