/** #89（89b 视觉锁验收）· **静态面取证链路探针**（H-01…H-11／H-15／H-17／H-18 的「不需交互」部分）。
 *
 *  跑法（仓根）：node tooling/run-locked.mjs --ticket 89 -- node docs/research/t89-probe-help-static.mjs
 *  退出码：0＝探针项全绿；1＝有探针项红；**2＝缺产物／缺 dist（链路不可用，绝不静默变绿）**。
 *
 *  ⚠ 本脚本产出的是**当前态抽样**，不是验收结论（验收结论归 #89b 实施席）。
 *  它存在的意义：给 `t89-evidence-plan.md` §1 的 A 级条目一条**可复跑的采集命令**，
 *  并把三条**判据收窄**写成代码（否则会假红／假绿）：
 *    ① H-04 零渐变**只判 HELP 页自身 CSS 区**：`buildStyleSheet()` 的 charts 区含
 *       `repeating-linear-gradient`（冻结图表资产），全量 grep 会**假红**（#88 台账 L-17 已裁定「按 CSS 区判」）。
 *    ② H-01 禁色只约束 **UI 主色**：`CHART_PALETTE` 的紫／粉是数据可视化例外（`visual-spec-help.md` D-10／C-9）。
 *    ③ H-13／H-14 在 HELP 页是 **N/A**（无 KPI 卡／无进度环），判据转内容页区块尺 B-02／B-04。
 *
 *  **底座**：断言范式（`[ASSERT] id → PASS/FAIL  实测=… 期望=…` ＋ `RESULT: n/m` ＋ `die(2)`）
 *  沿用 `docs/research/t121-browser-evidence.mjs` 与 `docs/research/t88-probe-impl-b.mjs`。
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const LF = String.fromCharCode(10);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const outArg = process.argv.indexOf('--out');
const OUT = resolve(ROOT, outArg > 0 && process.argv[outArg + 1] ? process.argv[outArg + 1] : '.scratch/t89/evidence');
const ARTIFACT = resolve(ROOT, '.scratch/t89/help-file.html');

const transcript = [];
const log = (line = '') => { transcript.push(line); console.log(line); };
const flush = () => { try { writeFileSync(join(OUT, 'probe-static.log'), transcript.join(LF) + LF, 'utf8'); } catch { /* 落盘失败不掩盖结论 */ } };
const results = [];
const observed = {};
function check(id, name, ok, actual, expect) {
  results.push({ id, name, ok: ok === true });
  log('[ASSERT] ' + id + ' ' + name + ' → ' + (ok ? 'PASS' : 'FAIL') + '  实测=' + JSON.stringify(actual) + '  期望=' + JSON.stringify(expect));
  return ok === true;
}
function die(code, message) { log('RESULT: ABORT exit=' + code + ' :: ' + message); flush(); process.exit(code); }
mkdirSync(OUT, { recursive: true });

if (!existsSync(ARTIFACT)) die(2, '缺 HELP 产物：' + ARTIFACT + '（先按 evidence-plan §2 的 A 命令生成）');
const DIST_INDEX = join(ROOT, 'packages/base-render/dist/index.js');
if (!existsSync(DIST_INDEX)) die(2, '缺 dist：' + DIST_INDEX + '（先 pnpm build）');
const html = readFileSync(ARTIFACT, 'utf8');
const buf = readFileSync(ARTIFACT);
const base = await import(pathToFileURL(DIST_INDEX).href);
const sheet = base.buildStyleSheet();
const css = sheet.css;
const count = (s, re) => (s.match(re) || []).length;
const uniq = (s, re) => [...new Set(s.match(re) || [])];

log('# #89 静态面取证链路探针（当前态抽样；**不是**验收结论）');
log('artifact=' + ARTIFACT.slice(ROOT.length + 1).replace(/\\/g, '/') + ' bytes=' + buf.length
  + ' sha256_16=' + createHash('sha256').update(buf).digest('hex').slice(0, 16).toUpperCase());
log('cssBytes=' + Buffer.byteLength(css, 'utf8') + ' cssSha256_16=' + createHash('sha256').update(css).digest('hex').slice(0, 16).toUpperCase());

/* ── H-01 单主色 ────────────────────────────────────────────────────────── */
const forbidden = uniq(css, /#0a84ff|#af52de|#ff375f|#0071e3/gi);
const blue = (css.match(/--blue:\s*[^;]+/) || [''])[0];
observed['H-01'] = { forbidden, blue };
check('H-01.1', '最终 CSS 无禁色（#0a84ff／#af52de／#ff375f／#0071e3）', forbidden.length === 0, forbidden, '[]');
check('H-01.2', '冻结主色 --blue 已声明', /--blue:\s*#007aff/.test(css), blue, '--blue: #007aff');

/* ── H-02 灰阶与边框（冻结 token 口径，R35 D-2） ────────────────────────── */
const rootBlock = (css.match(/:root\s*\{[^}]*\}/) || [''])[0];
const tokens = ['--fg', '--fg2', '--fg3', '--bg', '--card', '--line', '--shadow'].filter((t) => rootBlock.indexOf(t + ':') >= 0);
observed['H-02'] = { rootBlock: rootBlock.replace(/\s+/g, ' '), tokens };
check('H-02.1', '冻结 token 表含三灰＋页底＋卡面＋描边＋阴影（以冻结契约为准）', tokens.length === 7, tokens, '7 个');

/* ── H-03 页底与卡面可区分 ──────────────────────────────────────────────── */
const bg = (rootBlock.match(/--bg:\s*([^;]+)/) || [])[1];
const card = (rootBlock.match(/--card:\s*([^;]+)/) || [])[1];
observed['H-03'] = { bg, card };
check('H-03.1', '页底 token ≠ 卡面 token（卡面纯白）', bg !== undefined && card !== undefined && bg.trim() !== card.trim(), { bg, card }, '两者不同');

/* ── H-04 零渐变（**只判 HELP 页自身 CSS 区**，charts 区例外） ───────────── */
const chartsStart = css.indexOf('/* charts */');
const chartsEnd = css.indexOf('/* help-shell */');
const helpCss = chartsStart >= 0 && chartsEnd > chartsStart ? css.slice(0, chartsStart) + css.slice(chartsEnd) : css;
const gradAll = count(css, /linear-gradient|radial-gradient/g);
const gradHelp = count(helpCss, /linear-gradient|radial-gradient/g);
observed['H-04'] = { gradAll, gradHelp, chartsHasGradient: count(css.slice(chartsStart, chartsEnd), /linear-gradient|radial-gradient/g) };
check('H-04.1', 'HELP 页自身 CSS 区零渐变（charts 区按 D-10／L-17 例外）', gradHelp === 0, { gradHelp, gradAll }, 'help 区 0（全量可 >0）');

/* ── H-05 字号阶梯（静态 CSS 可观测部分） ───────────────────────────────── */
const fontSizes = uniq(css, /font-size:\s*[0-9.]+px/g).map((s) => parseFloat(s.replace(/[^0-9.]/g, '')));
observed['H-05'] = { fontSizes: fontSizes.sort((a, b) => a - b) };
check('H-05.1', 'CSS 中存在 ≥2 档字号（阶梯可观测；逐档 computed 判定归浏览器探针）',
  fontSizes.length >= 2, fontSizes.length, '≥2');
check('H-05.2', 'HELP 页无 ≥48px 大数字（D-9 取推荐 a：不要求）',
  fontSizes.every((v) => v < 48), fontSizes.filter((v) => v >= 48), '[]');

/* ── H-06 字体栈逐字 ───────────────────────────────────────────────────── */
const stacks = uniq(css, /font-family:[^;}]+/g).map((s) => s.replace(/\s+/g, ' '));
observed['H-06'] = { stacks, sfPro: count(css, /SF Pro Display/g), sfMono: count(css, /SF Mono/g), consolas: count(css, /Consolas/g) };
check('H-06.1', '等宽栈逐字 "SF Mono", monospace 且无 Consolas（D-13）',
  /font-family:\s*"SF Mono",\s*monospace/.test(css) && count(css, /Consolas/g) === 0, { sfMono: observed['H-06'].sfMono, consolas: observed['H-06'].consolas }, 'SF Mono 命中且 Consolas=0');
check('H-06.2', '正文栈含 "SF Pro Display"（H-06 规格值；**当前态实测**）',
  count(css, /SF Pro Display/g) > 0, { sfPro: observed['H-06'].sfPro, stacks }, '>0（若红见 §5 风险 R-3）');

/* ── H-07 tnum ─────────────────────────────────────────────────────────── */
const tnum = count(css, /font-feature-settings[^;}]*tnum/g);
observed['H-07'] = { tnum };
check('H-07.1', 'CSS 中 font-feature-settings: "tnum" 命中 > 0', tnum > 0, tnum, '>0');

/* ── H-08 标题禁 emoji ─────────────────────────────────────────────────── */
const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;
const headings = html.match(/<h[12][^>]*>[\s\S]*?<\/h[12]>/gi) || [];
const emojiHeadings = headings.filter((t) => emojiRe.test(t));
observed['H-08'] = { headings: headings.length, emojiHeadings: emojiHeadings.length, first: (headings[0] || '').replace(/<[^>]*>/g, '').trim().slice(0, 40) };
check('H-08.1', 'h1／h2 文本 emoji 数 = 0', emojiHeadings.length === 0, { headings: headings.length, hit: emojiHeadings.length }, '0');

/* ── H-09 容器宽度与页边距 ─────────────────────────────────────────────── */
observed['H-09'] = { maxWidth960: count(css, /max-width:\s*960px/g), padding: count(css, /padding:\s*32px\s+20px\s+80px/g) };
check('H-09.1', 'CSS 含 max-width:960px ＋ padding:32px 20px 80px 逐字',
  observed['H-09'].maxWidth960 >= 1 && observed['H-09'].padding >= 1, observed['H-09'], '两者各 ≥1');

/* ── H-10 形状 token 规定集（**同样排除 charts 区**：2px 属图表色板/图例，D-10 例外） ────── */
const ALLOWED_RADIUS = new Set(['8px', '14px', '20px', '999px', '50%']);
const radii = uniq(css, /border-radius:\s*[^;}]+/g).map((s) => s.split(':')[1].trim());
const radiiHelp = uniq(helpCss, /border-radius:\s*[^;}]+/g).map((s) => s.split(':')[1].trim());
const badRadiiAll = radii.filter((r) => !ALLOWED_RADIUS.has(r));
const badRadiiHelp = radiiHelp.filter((r) => !ALLOWED_RADIUS.has(r));
const shadows = uniq(css, /box-shadow:\s*[^;}]+/g).map((s) => s.split(':')[1].trim());
observed['H-10'] = { radii, badRadiiAll, badRadiiHelp, shadows };
check('H-10.1', 'HELP 页自身 CSS 区圆角集合 ⊆ {8px,14px,20px,999px,50%}（charts 区按 D-10 例外）',
  badRadiiHelp.length === 0, { badRadiiHelp, badRadiiAll, radiiHelp }, '[]');
check('H-10.2', '阴影只取冻结单条 var(--shadow)（D-4）', shadows.every((s) => s.indexOf('var(--shadow)') >= 0), shadows, '全部 var(--shadow)');

/* ── H-11 列表分隔线 ───────────────────────────────────────────────────── */
const firstChildNoBorder = count(css, /:first-child[^{]*\{[^}]*border-top:\s*0/g);
observed['H-11'] = { firstChildNoBorder };
check('H-11.1', '存在「首行无上边框」规则（:first-child border-top:0）', firstChildNoBorder > 0, firstChildNoBorder, '>0');

/* ── H-12 断点（静态部分；行为判定归交互探针） ─────────────────────────── */
observed['H-12'] = { m640: count(css, /max-width:\s*640px/g), m400: count(css, /max-width:\s*400px/g), m720: count(css, /max-width:\s*720px/g), m820: count(css, /max-width:\s*820px/g) };
check('H-12.1', '页面断点恰 640px／400px 各 1（图表 720／toast 栈 820 并存，D-6）',
  observed['H-12'].m640 === 1 && observed['H-12'].m400 === 1, observed['H-12'], '{m640:1,m400:1}');

/* ── H-13／H-14 HELP 页 N/A ────────────────────────────────────────────── */
observed['H-13'] = { kpiHits: count(html, /ilife-kpi/g) };
observed['H-14'] = { svg: count(html, /<svg/gi), circle: count(html, /<circle/gi) };
log('[N/A ] H-13 HELP 页 KPI 卡 → 转内容页区块尺 B-02（实测 .kpi 命中 ' + observed['H-13'].kpiHits + '）');
log('[N/A ] H-14 HELP 页进度环 → 转内容页区块尺 B-04（实测 svg=' + observed['H-14'].svg + '）');

/* ── H-15 逐字命令板 ───────────────────────────────────────────────────── */
const pres = html.match(/<pre[^>]*>/gi) || [];
observed['H-15'] = { preCount: pres.length, preAttrs: [...new Set(pres)].slice(0, 6), preWrap: count(css, /white-space:\s*pre-wrap/g), overflowX: count(css, /overflow-x:\s*auto/g), lineHeight155: count(css, /line-height:\s*1\.55/g) };
check('H-15.1', '命令块载体是 <pre>（数量 > 0）', pres.length > 0, { preCount: pres.length, preAttrs: observed['H-15'].preAttrs }, '>0');
check('H-15.2', 'CSS 含 pre-wrap ＋ overflow-x:auto ＋ line-height:1.55',
  observed['H-15'].preWrap > 0 && observed['H-15'].overflowX > 0 && observed['H-15'].lineHeight155 > 0, observed['H-15'], '三者各 >0');

/* ── H-16 静态部分（按钮属性；时序判定归交互探针） ─────────────────────── */
observed['H-16'] = { dataActionId: count(html, /data-action-id=/g), dataT: count(html, /data-t=/g), copiedRule: count(css, /\.copied/g) };
check('H-16.1', '每个复制按钮同时带 data-action-id 与 data-t（两者计数相等且 >0）',
  observed['H-16'].dataActionId > 0 && observed['H-16'].dataActionId === observed['H-16'].dataT, observed['H-16'], '相等且 >0');
check('H-16.2', 'CSS 存在 .copied 成功态规则', observed['H-16'].copiedRule > 0, observed['H-16'].copiedRule, '>0');

/* ── H-17 表格 ─────────────────────────────────────────────────────────── */
const tables = count(html, /<table/gi);
observed['H-17'] = { tables };
check('H-17.1', 'HELP 页含语义 <table>（规格要求表格组件存在）', tables > 0, tables, '>0（若红见 §5 风险 R-4）');

/* ── H-18 空态 ─────────────────────────────────────────────────────────── */
observed['H-18'] = { emptyHits: count(html, /ilife-empty/g), pad4820: count(css, /48px\s+20px/g), icon40: count(css, /font-size:\s*40px/g) };
check('H-18.1', '空态控件存在且 CSS 含 48px 20px ＋ 图标 40px',
  observed['H-18'].emptyHits > 0 && observed['H-18'].pad4820 > 0 && observed['H-18'].icon40 > 0, observed['H-18'], '三者各 >0');

/* ── H-19／H-20 静态部分（行为判定归交互探针） ─────────────────────────── */
observed['H-19'] = { backtopRule: count(css, /backtop/g) };
observed['H-20'] = { focusVisible: count(css, /:focus-visible/g), reducedMotion: count(css, /prefers-reduced-motion/g) };
check('H-19.1', 'CSS 含回顶按钮规则', observed['H-19'].backtopRule > 0, observed['H-19'], '>0');
check('H-20.1', 'CSS 含 :focus-visible（≥1）＋ prefers-reduced-motion（≥1）',
  observed['H-20'].focusVisible > 0 && observed['H-20'].reducedMotion > 0, observed['H-20'], '两者各 ≥1');

/* ── 契约面守卫（B-01 占位符／id 唯一／根类名前缀） ────────────────────── */
const residual = count(html, /<!--[A-Z][A-Z0-9-]+-->/g);
const ids = html.match(/\sid="[^"]+"/g) || [];
const rootCls = (html.match(/<body>\s*<[a-z]+[^>]*class="([^"]+)"/i) || [])[1];
observed['B-01'] = { residual, ids: new Set(ids).size + '/' + ids.length, rootCls };
check('B-01.1', '占位符零残留（<!--[A-Z0-9-]+--> 命中 0）', residual === 0, residual, 0);
check('B-01.2', '元素 id 全唯一', new Set(ids).size === ids.length, observed['B-01'].ids, 'n/n');
check('B-01.3', '根节点类名以冻结 STYLE_PREFIX 开头', typeof rootCls === 'string' && rootCls.indexOf(String(base.STYLE_PREFIX || 'ilife-')) === 0, rootCls, 'ilife- 开头');

const pass = results.filter((r) => r.ok).length;
log('');
log('observed=' + JSON.stringify(observed).slice(0, 1400));
log('RESULT: ' + pass + '/' + results.length + ' PASS, ' + (results.length - pass) + ' FAIL');
if (pass !== results.length) log('FAILED: ' + results.filter((r) => !r.ok).map((r) => r.id).join(' '));
writeFileSync(join(OUT, 'probe-static.json'), JSON.stringify({ artifact: ARTIFACT.slice(ROOT.length + 1), sha256_16: createHash('sha256').update(buf).digest('hex').slice(0, 16).toUpperCase(), observed, results }, null, 2), 'utf8');
flush();
process.exit(pass === results.length ? 0 : 1);
