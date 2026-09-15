/** #270 · 写后回执页「15＋1 条」逐条真跑（可复跑；日志落 `.scratch/t270/`）。
 *
 * 判据（票面）：16 条逐条**真出口** exit 0 ⇒ 产物是**完整文档**（`<!doctype html>` 在第 0 字节、
 * 含 charset 与内联样式、双击可开）⇒ 四块标题（老实物 `crud_receipt.html` 逐字）在场 ⇒
 * 页内导航锚点逐个可解析 ⇒ 复制日志第 4 段是本次命令原文（含本次 `--params`）。
 * 删类两块按老实物隐藏（`:374-387` 的 `op !== 'delete'` 与 `:390` 的 `items.length`），故按 op 判。
 *
 * 跑法（仓根）：`node docs/skills/skill-calorie/t270-真跑.mjs`
 * 每条跑前把库还原成**同一份播种快照**（写词会改库，见 `t155-派单/01` 第十五节）。
 * 摘要行：`RESULT: n/16`；逐条读数落 `.scratch/t270/t270-真跑-结果.json`。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
const OUTDIR = join(ROOT, '.scratch', 't270');

const { openDb } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);

/** 15＋1 条：14 条命令挂 15 条唤醒词（`calorie.diet.add` 一条命令 5 词），＋批量导入那一条。 */
const CASES = [
  ['记一餐', 'calorie.diet.add', { foodName: '鸡胸', calories: 200, protein: 35, note: '训练后' }],
  ['记一餐（含备注）', 'calorie.diet.add', { foodName: '牛肉饭', calories: 620, protein: 28, note: '外食' }],
  ['补记饮食', 'calorie.diet.add', { foodName: '燕麦', calories: 180, protein: 6, date: SEED_TODAY, time: '07:30:00' }],
  ['批量补记饮食', 'calorie.diet.batch', { items: [
    { foodName: '豆浆', calories: 90, protein: 6, date: SEED_TODAY, time: '07:40:00' },
    { foodName: '煎蛋', calories: 120, protein: 8, date: SEED_TODAY, time: '07:45:00' },
  ] }],
  ['记喝水', 'calorie.water.log', { ml: 300 }],
  ['复制昨日饮食', 'calorie.diet.copy', {}],
  ['改饮食记录', 'calorie.diet.update', { id: 1, calories: 260, grams: 180 }],
  ['改某日饮食', 'calorie.diet.update-by-date', { date: SEED_TODAY, note: '统一改备注' }],
  ['删饮食记录', 'calorie.diet.remove', { id: 2 }],
  ['删一餐', 'calorie.diet.remove-by-type', { date: SEED_TODAY, mealType: '早餐' }],
  ['删某日饮食', 'calorie.diet.remove-by-date', { date: '2026-08-15' }],
  ['批量删饮食', 'calorie.diet.remove-by-range', { start: '2026-08-01', end: '2026-08-08' }],
  ['存食品', 'calorie.product.add', { productName: '希腊酸奶', calories: 59, protein: 10, fat: 0, carbohydrates: 3, sodium: 36 }],
  ['改食品', 'calorie.product.update', { id: 1, note: '改过备注' }],
  ['下架食品', 'calorie.product.deprecate', { id: 2 }],
  ['批量导入食品', 'calorie.product.import', { items: [
    { productName: '全麦面包', calories: 247, protein: 13, fat: 3, carbohydrates: 41, sodium: 400 },
    { productName: '鸡胸肉', calories: 133, protein: 24, fat: 3, carbohydrates: 1, sodium: 60 },
  ] }],
];

const TITLES = ['✅ 操作回执', '📋 字段变更', '📊 今日累计', '📋 复制明细'];
/** 删类合法地不出的两块（老实物 `:374-387`／`:390`）。 */
const DELETE_SKIP = ['📊 今日累计', '📋 复制明细'];

function runCase(dir, key, params, outFile) {
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params), '--html', outFile], {
    encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_TODAY: SEED_TODAY },
  });
  return { status: r.status, stderr: String(r.stderr || '').trim(), outFile };
}

/** 复制日志那一段的载荷落在 `data-t` 属性里、五字符经转义表 ⇒ 比对命令原文前先还原实体。 */
function decodeAttr(html) {
  return html.replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

function checkDoc(html, commandLine) {
  const fail = [];
  const decoded = decodeAttr(html);
  const need = [
    ['doctype-第0字节', html.startsWith('<!doctype html>\n<html lang="zh-CN">')],
    ['charset', html.includes('<meta charset="utf-8">')],
    ['style', html.includes('<style>')],
    ['script', html.includes('<script>')],
    ['page-shell', html.includes('ilife-page')],
    ['无残留注释位', !html.includes('<!--')],
    ['复制数据按钮', html.includes('aria-label="复制数据（点开选格式）"')],
    ['复制日志按钮', html.includes('ilife-copy-log')],
    ['三格式-text', html.includes('data-fmt="text"')],
    ['三格式-json', html.includes('data-fmt="json"')],
    ['三格式-csv', html.includes('data-fmt="csv"')],
    ['日志第4段＝命令原文', decoded.includes(commandLine)],
    ['来源脚注', html.includes('📊 数据来源：本机饮食库')],
  ];
  for (const [name, ok] of need) if (!ok) fail.push(name);
  const deleteOp = html.includes('>删除成功<');
  for (const t of TITLES) {
    if (deleteOp && DELETE_SKIP.includes(t)) {
      if (html.includes(t)) fail.push('删类不该出：' + t);
      continue;
    }
    if (!html.includes(t)) fail.push('缺标题：' + t);
  }
  for (const m of html.matchAll(/<nav class="ilife-block-toc"[^>]*>([\s\S]*?)<\/nav>/g)) {
    for (const a of m[1].matchAll(/href="#([^"]+)"/g)) {
      if (!html.includes('id="' + a[1] + '"')) fail.push('导航锚点解析不到：' + a[1]);
    }
  }
  return fail;
}

mkdirSync(OUTDIR, { recursive: true });
let pass = 0;
const rows = [];
for (const [word, key, params] of CASES) {
  const dir = mkdtempSync(join(tmpdir(), 't270-'));
  const db = openDb(join(dir, 'calorie_data.db'));
  seedFull(db);
  db.close();
  const outFile = join(dir, key.replace(/\./g, '_') + '.html');
  const r = runCase(dir, key, params, outFile);
  const commandLine = 'calorie-cmd-read ' + key + " --params '" + JSON.stringify(params) + "'";
  let fail = [];
  if (r.status !== 0) fail.push('exit=' + r.status + ' stderr=' + r.stderr.slice(-160));
  else if (!existsSync(outFile)) fail.push('没落盘');
  else fail = checkDoc(readFileSync(outFile, 'utf8'), commandLine);
  const bytes = existsSync(outFile) ? statSync(outFile).size : 0;
  if (fail.length === 0) pass += 1;
  rows.push({ word, key, exit: r.status, bytes, path: outFile, fail });
  console.log((fail.length === 0 ? 'OK   ' : 'FAIL ') + word + ' [' + key + '] exit=' + r.status
    + ' bytes=' + bytes + ' ' + (fail.length === 0 ? '' : ':: ' + fail.join(' | ')));
}
writeFileSync(join(OUTDIR, 't270-真跑-结果.json'), JSON.stringify({
  at: new Date().toISOString(), seedToday: SEED_TODAY, rows,
}, null, 2), 'utf8');
console.log('RESULT: ' + pass + '/' + CASES.length);
process.exit(pass === CASES.length ? 0 : 1);
