#!/usr/bin/env node
// t839 落位对账：整包按形状落位的机械验收（#839 整包落位票的器械）。
//
// 跑法：`node docs/skills/skill-chef/t839-落位对账.mjs`（只读：读源码文本＋跑 `gen-cli.mjs --check`，
// 不写盘不建库）。全过打印 `域 10／共用位残留 0／对账偏差 0` 且 exit 0；任一失败打印 FAIL 行且 exit 1。
//
// 三个数的定义（票面验收口径）:
//   域 ＝ 含 `commands.ts` 的域目录数（须为 10，英文字母序与 HELP 十域 id 逐一对照）。
//   共用位残留 ＝ 单域独占的命令实现逻辑仍住旧件（E 类）＋ 留守共享符号具名用户不足两域（G 类）。
//   对账偏差 ＝ 声明与现实对不上的项（A–D、F、H、I 类）。
// 例外类（不计残留，理由见 t839-落位对账.md §去留裁定）：WAKE_TABLE 与路由函数（#767 摘要锁钉死）、
// envelope 形状表与 buildHelpItems（help 链，票 18 冻结）、口径原语层（变化频率≈0 的稳定层）、
// 设置页三键＋体检键（设置页通道）、DDL 与开闭库（入口基建）。

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const SRC = join(ROOT, 'packages', 'skill-chef', 'src');

const EXPECT_DOMAINS = ['add', 'cook', 'data', 'history', 'relation', 'search', 'setup', 'shopping', 'update', 'view'];
const EXPECT_KEYS = ['chef.cooking.run', 'chef.history.query', 'chef.history.record', 'chef.recipe.search', 'chef.recipe.view', 'chef.recipe.write', 'chef.shopping.query'];

let residual = 0;
let deviation = 0;
function bad(kind, msg) {
  if (kind === 'residual') residual += 1; else deviation += 1;
  console.error('T839-' + (kind === 'residual' ? 'RESIDUAL' : 'DEVIATION') + ' ' + msg);
}
function ok(msg) { console.log('T839-OK ' + msg); }

function readRel(p) { return readFileSync(join(SRC, p), 'utf8'); }
function domainDirs() {
  return readdirSync(SRC, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
    .filter((n) => existsSync(join(SRC, n, 'commands.ts'))).sort();
}
// 源码文本级抽 key 声明（与生成器同口径：含 kind 的扁平对象块；单引号串内花括号不当结构读）。
function keysOfCommands(text) {
  const str = "'(?:[^'\\\\]|\\\\.)*'";
  const atom = '(?:[^\\\'{}]|' + str + ')';
  const re = new RegExp('\\{(?:' + atom + ')*?\\bkind\\s*:\\s*\'(?:read|write)\'(?:' + atom + ')*?\\}', 'gs');
  const out = [];
  for (const m of text.matchAll(re)) {
    const b = m[0];
    if (b.includes('readonly')) continue;
    const k = b.match(/key\s*:\s*'((?:[^'\\]|\\.)*)'/);
    if (k) out.push(k[1]);
  }
  return out;
}
function rowsOfRoutes(text) {
  const str = "'(?:[^'\\\\]|\\\\.)*'";
  const atom = '(?:[^\\\'{}]|' + str + ')';
  const re = new RegExp('\\{(?:' + atom + ')*?\\border\\s*:\\s*(\\d+)(?:' + atom + ')*?\\}', 'gs');
  const out = [];
  for (const m of text.matchAll(re)) {
    const b = m[0];
    const order = Number(m[1]);
    const w = b.match(/wakeWord\s*:\s*'((?:[^'\\]|\\.)*)'/);
    const k = b.match(/^\s*key\s*:\s*'((?:[^'\\]|\\.)*)'/m) || b.match(/key\s*:\s*'((?:[^'\\]|\\.)*)'/);
    const c = b.match(/cli\s*:\s*'((?:[^'\\]|\\.)*)'/);
    out.push({ order, wakeWord: w ? w[1] : '', key: k ? k[1] : '', cli: c ? c[1] : '' });
  }
  return out;
}
function wakeOfPolicy(text) {
  const out = [];
  for (const m of text.matchAll(/\{\s*phrase\s*:\s*'((?:[^'\\]|\\.)*)'\s*,\s*key\s*:\s*'((?:[^'\\]|\\.)*)'/g)) {
    out.push({ phrase: m[1], key: m[2] });
  }
  return out;
}

// —— A. 域数与域名单 ————————————————————————————————
{
  const got = domainDirs();
  if (JSON.stringify(got) === JSON.stringify(EXPECT_DOMAINS)) ok('域 10（' + got.join('、') + '）');
  else bad('deviation', '域名单对不上：实得 ' + got.join('、'));
}

// —— B. 生成器门 ————————————————————————————————————
{
  try {
    execFileSync('node', [join(ROOT, 'packages', 'skill-chef', 'scripts', 'gen-cli.mjs'), '--check'], { stdio: 'pipe' });
    ok('gen-cli.mjs --check exit 0');
  } catch (e) {
    bad('deviation', 'gen --check 非零：' + String((e.stderr || e.message || '')).split('\n').slice(0, 4).join(' / '));
  }
}

// —— C. 生成物键表与按域键表 —————————————————————————
{
  const keys = readRel('cli/keys.ts');
  const srcM = keys.match(/CHEF_CLI_SOURCES[^=]*=\s*\[([\s\S]*?)\]/);
  const srcs = srcM ? [...srcM[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]).sort() : [];
  if (JSON.stringify(srcs) === JSON.stringify(EXPECT_DOMAINS)) ok('SOURCES 10 域齐');
  else bad('deviation', 'SOURCES 对不上：' + srcs.join('、'));
  const perDomain = new Map();
  for (const n of EXPECT_DOMAINS) perDomain.set(n, keysOfCommands(readRel(n + '/commands.ts')));
  const flat = [...perDomain.values()].flat().sort();
  if (JSON.stringify(flat) === JSON.stringify(EXPECT_KEYS)) ok('声明键 7（与生成物一致，由 B 门逐字节担保）');
  else bad('deviation', '声明键对不上：' + flat.join('、'));
  const dm = keys.match(/CHEF_DOMAIN_KEYS[^=]*=\s*\{([\s\S]*?)\n\};/);
  const diskMap = new Map();
  if (dm) {
    for (const m of dm[1].matchAll(/'((?:[^'\\]|\\.)*)'\s*:\s*\[([\s\S]*?)\]/g)) {
      diskMap.set(m[1], [...m[2].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((k) => k[1]));
    }
  }
  let perOk = true;
  for (const n of EXPECT_DOMAINS) {
    if (JSON.stringify(diskMap.get(n) || null) !== JSON.stringify(perDomain.get(n))) { perOk = false; break; }
  }
  if (perOk) ok('DOMAIN_KEYS 按域一致（含 4 空域）');
  else bad('deviation', 'DOMAIN_KEYS 按域对不上声明');
}

// —— D. 路由覆盖：WAKE 短语 ⊆ 域 ROUTES（同 key） ————————————
{
  const wake = wakeOfPolicy(readRel('policy/wakewords.ts'));
  if (wake.length !== 37) { bad('deviation', 'WAKE_TABLE 非 37 条（实 ' + wake.length + '，摘要锁口径漂移）'); }
  else {
    const byPhrase = new Map();
    for (const d of EXPECT_DOMAINS) {
      for (const r of rowsOfRoutes(readRel(d + '/routes.ts'))) {
        if (r.key === 'tbd') continue;
        if (!byPhrase.has(r.wakeWord)) byPhrase.set(r.wakeWord, []);
        byPhrase.get(r.wakeWord).push({ domain: d, key: r.key });
      }
    }
    // help 链例外：4 条 HELP 短语的事实住冻结的 help/（票 18），域 ROUTES 不声明它们。
    const routable = wake.filter((w) => w.key !== 'chef.help.lookup');
    if (wake.length - routable.length !== 4) bad('deviation', 'HELP 短语非 4 条，help 链口径漂移');
    let n = 0;
    for (const w of routable) {
      const hits = byPhrase.get(w.phrase) || [];
      if (hits.length !== 1 || hits[0].key !== w.key) {
        bad('deviation', '路由未覆盖/错配：' + w.phrase + '（表内 ' + w.key + '，路由 ' + JSON.stringify(hits) + '）');
      } else n += 1;
    }
    if (n === 33) ok('WAKE 33 短语逐条有且仅有一处同 key 路由（HELP 4 条由 help 链覆盖，不在域）');
  }
  // 非 tbd 的 order:0 行只允许 data 的备份（#767 定去向未入表，待接入）。
  for (const d of EXPECT_DOMAINS) {
    for (const r of rowsOfRoutes(readRel(d + '/routes.ts'))) {
      if (r.key === 'tbd') {
        if (d !== 'relation' && d !== 'setup') bad('deviation', 'tbd 行越界：' + d + '／' + r.wakeWord);
        if (r.order !== 0 || r.cli !== '') bad('deviation', 'tbd 行形状不对：' + d + '／' + r.wakeWord);
      } else if (r.order === 0) {
        if (!(d === 'data' && r.wakeWord === '备份' && r.key === 'chef.history.query')) {
          bad('deviation', 'order:0 非 tbd 行越界：' + d + '／' + r.wakeWord);
        }
      }
    }
  }
}

// —— E. 注册表残留：搬出逻辑不得在 cmd_read.ts 出现 ———————————
{
  const cli = readRel('cli/cmd_read.ts');
  const moved = ['buildRecipeSearch(', 'filterRecipes(', 'searchRecipes(', 'recordHistory(', 'buildShoppingList(',
    'healthCheck(', 'buildCookingRun(', 'buildHistoryRecord(', 'toHistoryItem(', 'addRecipe(', 'updateRecipe(',
    'deprecateRecipe(', 'addIngredient(', 'addStep(', 'getRecipeDetail(', 'resolveNameOrId(', 'resolveRecipeId(',
    'pickStr(', 'pickNum(', 'needServings(', 'todayStr(', 'needName(', 'needNames(', 'validateCategory(',
    'validateRating(', 'toRecipeItem(', 'recipeDetail(', 'buildRecipeReceipt(', 'buildShopping(',
    'buildHistoryQuery(', 'listRecipes(', 'queryHistory(', 'historyStats(', 'FILTER_KEYS'];
  let clean = true;
  for (const s of moved) {
    if (cli.includes(s)) { bad('residual', 'cmd_read.ts 残留搬出逻辑：' + s); clean = false; }
  }
  const cases = (cli.match(/case 'chef\./g) || []).length;
  if (cases !== 8) { bad('residual', 'cmd_read.ts case 数非 8（实 ' + cases + '）'); clean = false; }
  if (clean) ok('cmd_read.ts 薄注册表（8 case，无搬出逻辑残留）');
}

// —— F. 搬出符号双向断言（新家有、旧址无） ————————————————————
{
  const moves = [
    ['searchRecipes', 'search/run.ts', 'fetch/db.ts'],
    ['filterRecipes', 'search/run.ts', 'fetch/db.ts'],
    ['recordHistory', 'history/run-record.ts', 'fetch/db.ts'],
    ['buildShoppingList', 'shopping/run.ts', 'fetch/db.ts'],
    ['healthCheck', 'data/run-query.ts', 'fetch/db.ts'],
    ['buildRecipeSearch', 'search/run.ts', 'render/views.ts'],
    ['buildCookingRun', 'cook/run.ts', 'render/views.ts'],
    ['buildShopping', 'shopping/run.ts', 'render/views.ts'],
    ['buildHistoryRecord', 'history/run-record.ts', 'render/views.ts'],
    ['toHistoryItem', 'history/run-query.ts', 'render/views.ts'],
    ['recipeDetail', 'view/run.ts', 'render/views.ts'],
    ['addRecipe', 'add/run-write.ts', 'fetch/db.ts'],
    ['addIngredient', 'add/run-write.ts', 'fetch/db.ts'],
    ['addStep', 'add/run-write.ts', 'fetch/db.ts'],
    ['updateRecipe', 'update/run-write.ts', 'fetch/db.ts'],
    ['deprecateRecipe', 'update/run-write.ts', 'fetch/db.ts'],
  ];
  let n = 0;
  for (const [sym, home, old] of moves) {
    const hasNew = readRel(home).includes('export function ' + sym);
    const hasOld = readRel(old).includes('export function ' + sym);
    if (!hasNew) bad('deviation', sym + ' 在新家 ' + home + ' 缺失');
    else if (hasOld) bad('residual', sym + ' 在旧址 ' + old + ' 未搬净');
    else n += 1;
  }
  if (n === moves.length) ok('搬出 ' + moves.length + ' 件双向断言全过（新家有、旧址无）');
}

// —— G. 留守共享符号 ≥2 具名域用户（grep 实证） ————————————————
{
  const runFiles = [];
  for (const d of EXPECT_DOMAINS) {
    for (const f of ['run.ts', 'run-write.ts', 'run-record.ts', 'run-query.ts']) {
      const p = d + '/' + f;
      if (existsSync(join(SRC, p))) runFiles.push(p);
    }
  }
  // 注意：只数域 run 文件里的调用（定义地 shared/slots.ts 与 policy 不计入用户）。
  const usersOf = (sym) => {
    const users = new Set();
    for (const f of runFiles) {
      const t = readRel(f);
      if (t.includes(sym + '(') || t.includes(sym + ' ')) users.add(f.split('/')[0]);
    }
    return [...users].sort();
  };
  const need2 = ['getRecipeDetail', 'listRecipes', 'queryHistory', 'historyStats',
    'buildRecipeReceipt', 'buildHistoryQuery', 'toRecipeItem',
    'resolveNameOrId', 'needName'];
  let n = 0;
  for (const sym of need2) {
    const u = usersOf(sym).filter((x) => x !== '..');
    if (u.length >= 2) n += 1;
    else bad('residual', sym + ' 具名域用户不足两域（实：' + (u.join('、') || '无') + '）');
  }
  if (n === need2.length) ok('留守 ' + need2.length + ' 件共享符号各 ≥2 域用户');
}

// —— H. 行数门（350 LF，节点口径） —————————————————————————————
{
  const files = [];
  for (const d of [...EXPECT_DOMAINS, 'shared']) {
    for (const e of readdirSync(join(SRC, d))) if (e.endsWith('.ts')) files.push(d + '/' + e);
  }
  files.push('cli/cmd_read.ts', 'fetch/db.ts', 'fetch/schema.ts', 'fetch/index.ts', 'render/views.ts', 'render/index.ts');
  const lf = (p) => readRel(p).split('\n').length - 1;
  let n = 0;
  for (const f of files) {
    const c = lf(f);
    if (c > 350) bad('deviation', f + ' 超线（' + c + ' LF）');
    else n += 1;
  }
  if (n === files.length) ok('行数门全过（' + files.length + ' 件 ≤350，最大 ' + Math.max(...files.map(lf)) + '）');
}

// —— I. tbd 行只许 relation/setup —————————————————————————————（已在 D 中断言，此处只报数）
{
  let tbd = 0;
  for (const d of ['relation', 'setup']) tbd += rowsOfRoutes(readRel(d + '/routes.ts')).filter((r) => r.key === 'tbd').length;
  ok('tbd 占位 ' + tbd + ' 行（relation 3＋setup 1，域票接入时填实）');
}

console.log('域 ' + EXPECT_DOMAINS.length + '／共用位残留 ' + residual + '／对账偏差 ' + deviation);
process.exit(residual + deviation === 0 ? 0 : 1);
