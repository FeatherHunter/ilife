/** #617 复核席自设探针（第二席）：**按格钉死「这一格怎么来的」那一列的渲出文本**，
 *  并顺带复查被审探针覆盖不到的三处残留。
 *
 *  跟被审探针（`t617-探针-tag.mjs`）的差别（这四条就是本探针存在的理由）：
 *    ① 被审探针只判「可见文本里**不含** `&lt;`／裸 `<span`／`precheck-tag`」——**缺字也算过**：
 *       若那一列渲成空串、或旧形状被别的类名重现，它照判 VERDICT=GREEN。本探针逐格比**渲出的整句**：
 *       该是「识别得到」就得逐字是这三字，两句话那格就得是「识别得到，要你核对」。老缺陷形状在
 *       **可见文本**里正是被转义后的整串 `&lt;span class=&quot;precheck-tag is-ai&quot;&gt;识别得到&lt;/span&gt;`，
 *       本探针的「整格文本逐字比」当场红——它吃住的是缺陷本体，不只是它的类名残留。
 *    ② 被审探针不查**类名残留**：`is-ai`／`is-check`／`class="precheck-tag` 三个串它一个都不判
 *       （只判 `precheck-tag is-check` 这一种相邻写法）。本探针把三类残留逐页数一遍，上限都钉 0。
 *    ③ 被审探针的徽章计数是**正则会话**：正文里若印出**假**的 `<span class="ilife-status-badge…">`，
 *       它同样计入。本探针按**格**取，逐格读出的 class 只许是本列那两档
 *       （`ilife-status-badge-empty`／`…-warn`），并核对该格段数＝徽章枚数（一段一枚）。
 *    ④ 本探针另加一例**数据带元字符**的真出口跑（字段值里塞 `<span class="q">`）：验那张表的
 *       **纯文本面**没有被这次改动放松——`cellHtml` 是受信位，`renderDataTable` 的其它列仍一律转义。
 *
 *  跑法（仓库根）：`node docs/skills/skill-calorie/t617r-探针-格子.mjs [--out <目录>]`
 *  只读工作区：产物落系统临时目录，副本只落给定目录。全绿 exit 0，任一页出格即 exit 1。
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');

const outArg = process.argv.indexOf('--out');
const OUT = outArg >= 0 ? process.argv[outArg + 1] : null;

const { openDb } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);

/** 那一列的两句读者话（判据用的字面）。 */
const WORD_AI = '识别得到';
const WORD_CHECK = '要你核对';
/** 那一列两档徽章的完整 class。 */
const CLS_AI = 'ilife-status-badge ilife-status-badge-empty';
const CLS_CHECK = 'ilife-status-badge ilife-status-badge-warn';
/** 体里一处都不许有的旧类名残留。 */
const OLD_CLASS = ['precheck-tag', 'is-ai', 'is-check'];

const CASES = [
  { wake: '拍营养表记一餐', key: 'calorie.diet.add', cells: 8, check: [],
    params: { foodName: '鸡胸', calories: 200, protein: 35, carbohydrates: 2, fat: 4, note: '营养表识别', source: 'photo', entry: 'precheck' } },
  { wake: '拍营养表补记一餐', key: 'calorie.diet.add', cells: 8, check: [],
    params: { foodName: '米饭', calories: 500, protein: 10, carbohydrates: 85, fat: 5, date: SEED_TODAY, time: '12:30:00', note: '营养表补记', source: 'photo', entry: 'precheck' } },
  { wake: '预检确认页（点名两格不确定）', key: 'calorie.view.label-precheck', cells: 8, check: [2, 3],
    params: { productName: '酸奶', calories: 120, protein: 6, carbohydrates: 10, fat: 3, uncertain: 'protein,fat' } },
  { wake: '预检确认页（字段值带元字符）', key: 'calorie.view.label-precheck', cells: 8, check: [],
    params: { productName: '<span class="q">酸奶</span>', calories: 120, protein: 6, note: 'a&b' } },
];

/** 剥掉页面壳与样式段：只看**体**（票面口径：样式段里的类名不计）。 */
function bodyOf(html) {
  const m = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return (m === null ? html : m[1]).replace(/<style[\s\S]*?<\/style>/gi, '');
}

/** 「识别出的字段」表那一列的逐格**渲出 HTML**（按列头 `data-label` 取；取不到即空数组＝红）。 */
function tagCells(body) {
  return [...body.matchAll(/<td class="[^"]*data-table-cell-[a-z]+" data-label="这一格怎么来的">([\s\S]*?)<\/td>/g)]
    .map((mm) => mm[1]);
}

const unescapeHtml = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
/** 渲出文本：**先去标签、后解转义**（反了会把还原出来的真 `<span>` 当标签吃掉）。 */
const textOf = (s) => unescapeHtml(s.replace(/<[^>]*>/g, '')).trim();
const count = (s, needle) => (s.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length;

/** 一格的读数：逐段徽章（class ＋ 文本）、格内夹着的裸文字、整格渲出文本。 */
function readCell(cell) {
  const badges = [...cell.matchAll(/<span class="([^"]*)">([\s\S]*?)<\/span>/g)]
    .map((mm) => ({ cls: mm[1], text: textOf(mm[2]) }));
  const loose = textOf(cell.replace(/<span class="[^"]*">[\s\S]*?<\/span>/g, ''));
  return { badges, loose, text: textOf(cell) };
}

const dir = mkdtempSync(join(tmpdir(), 't617r-probe-'));
const db = openDb(join(dir, 'calorie_data.db'));
seedFull(db);
db.close();

const fails = [];
for (const c of CASES) {
  const r = spawnSync(process.execPath, [CLI, c.key, '--params', JSON.stringify(c.params)], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_TODAY: SEED_TODAY },
  });
  let env = null;
  try { env = JSON.parse(String(r.stdout || '').trim()); } catch { env = null; }
  const path = env?.data?.output ?? null;
  const html = path !== null && existsSync(path) ? readFileSync(path, 'utf8') : '';
  const body = html === '' ? '' : bodyOf(html);
  const cells = tagCells(body).map(readCell);
  const bad = [];
  if (r.status !== 0) bad.push('exit=' + r.status + ' stderr尾=' + String(r.stderr || '').trim().slice(-200));
  if (html === '') bad.push('产物读不到');
  if (cells.length !== c.cells) bad.push('那一列格数=' + cells.length + '（应=' + c.cells + '）');
  /* 逐格钉死：段数＝徽章枚数、class 只许本列两档、整格渲出文本＝读者话逐字。 */
  cells.forEach((cell, i) => {
    const two = c.check.includes(i + 1);
    const want = two ? WORD_AI + WORD_CHECK : WORD_AI; /* 两枚徽章是**相邻结构**，渲出文本里没有分隔符 */
    const wantCls = two ? CLS_CHECK : CLS_AI;
    if (cell.loose !== '') bad.push('第 ' + (i + 1) + ' 格夹着裸文字：' + JSON.stringify(cell.loose.slice(0, 60)));
    if (cell.badges.length !== (two ? 2 : 1)) bad.push('第 ' + (i + 1) + ' 格段数=' + cell.badges.length + '（应=' + (two ? 2 : 1) + '）');
    if (cell.text !== want) bad.push('第 ' + (i + 1) + ' 格整格文本=' + JSON.stringify(cell.text) + '（应=' + want + '）');
    if (!cell.badges.some((b) => b.cls === wantCls && b.text === (two ? WORD_CHECK : WORD_AI))) {
      bad.push('第 ' + (i + 1) + ' 格没有「' + wantCls + '」档的读者话徽章：' + JSON.stringify(cell.badges));
    }
    for (const b of cell.badges) {
      if (b.cls !== CLS_AI && b.cls !== CLS_CHECK) bad.push('第 ' + (i + 1) + ' 格段 class 不是本列两档：' + b.cls);
      if (b.text !== WORD_AI && b.text !== WORD_CHECK) bad.push('第 ' + (i + 1) + ' 格段文本不是读者话：' + b.text);
    }
  });
  /* 那一列之外的体里，转义壳一处不许有：读回正文的那一格一旦又印源码，这里当场红
     （老缺陷的形状在可见文本里正是 `&lt;span class=&quot;precheck-tag is-ai&quot;&gt;…`）。
     带元字符那一例是**故意**把 `&lt;` 塞进别的槽，故它单独判、不并进这一条。 */
  const metaCase = c.wake.includes('元字符');
  const esc = count(body, '&lt;');
  if (!metaCase && esc !== 0) bad.push('体里还有转义壳 &lt;=' + esc);
  /* 那一列**逐格**另数一遍：本列即便在同页别的槽有元字符时，也不许出现转义壳。 */
  const cellEsc = tagCells(body).reduce((n, s) => n + count(s, '&lt;'), 0);
  if (cellEsc !== 0) bad.push('那一列格子里有转义壳 &lt;=' + cellEsc);
  const old = OLD_CLASS.map((s) => count(body, s));
  OLD_CLASS.forEach((s, i) => { if (old[i] !== 0) bad.push('体里还有旧类名残留 ' + s + '=' + old[i]); });
  /* 那两句读者话仍读得到（改后不许把标记一并撤掉）。 */
  const text = body.replace(/<[^>]*>/g, ' ');
  if (!text.includes(WORD_AI)) bad.push('可见文本读不到「' + WORD_AI + '」');
  if (c.check.length > 0 && !text.includes(WORD_CHECK)) bad.push('可见文本读不到「' + WORD_CHECK + '」');
  /* ④ 那一例：元字符走的是别的槽（页头摘要／来源脚注／「确认后操作」表），一处都不许原样露出。
     注：`calories`／`protein` 那几个数值槽过 `numOf` 会被转成数字，元字符进不去——真正能把任意
     文本带进来的只有 `productName` 与 `note` 这两个自由文本槽，所以这一例打的是它们。 */
  if (c.wake.includes('元字符')) {
    const escSpan = count(body, '&lt;span class=&quot;q&quot;&gt;酸奶&lt;/span&gt;');
    if (body.includes('<span class="q">')) bad.push('自由文本槽的元字符**原样露出**成真标签');
    if (!body.includes('a&amp;b')) bad.push('备注里的与号没有按 a&amp;b 转义');
    /* 这一例是**标定用**：`&lt;` 该出现几次由数据面决定，读数照抄、并附落点切片供核对，
       不猜数、不当门禁（门禁是下面那一条：命中处里不许有一处是那一列的读者话被印成源码）。 */
    console.log('  CALIB 元字符例：转义壳 &lt;=' + esc
      + ' ／ 元字符壳=' + escSpan + ' ／ 落点＝'
      + [...body.matchAll(/.{40}&lt;.{40}/gs)].map((mm) => JSON.stringify(mm[0])).join(' ｜ '));
    const inCells = tagCells(body).filter((s) => s.includes('&lt;'));
    if (inCells.length !== 0) bad.push('那一列有格子印着转义壳：' + inCells[0].slice(0, 80));
  }
  if (bad.length > 0) fails.push(c.wake);
  console.log('T617R ' + c.wake + ' exit=' + r.status + ' bytes=' + html.length
    + ' 列格数=' + cells.length + ' 首格=' + JSON.stringify(cells[0]?.text ?? '')
    + ' 旧类名=' + old.join('/') + ' 转义壳=' + esc
    + ' VERDICT=' + (bad.length === 0 ? 'GREEN' : 'RED'));
  for (const b of bad) console.log('  RED ' + c.wake + ' · ' + b);
  if (OUT !== null && html !== '') {
    mkdirSync(OUT, { recursive: true });
    copyFileSync(path, join(OUT, c.wake.replace(/[（）]/g, '') + '.html'));
  }
}
console.log('RESULT: ' + (CASES.length - fails.length) + '/' + CASES.length + ' '
  + (fails.length === 0 ? 'PASS' : 'FAIL') + (fails.length === 0 ? '' : ' 红页：' + fails.join('　')));
process.exit(fails.length === 0 ? 0 : 1);
