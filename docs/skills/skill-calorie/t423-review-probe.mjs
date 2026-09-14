/** #423 独立对抗审查 · 自设探针（审查席另写，不引用被审测试的任何断言）。
 *
 * 打的是被审脚本 `test/exercise-receipt-fusion-423.test.mjs` 的三处盲区：
 *   P1 冻结表对账：被审测试**从不用唤醒词**，直接以命令 ＋ 手写参数调出口；
 *      本探针把 `src/triggers/scene-04-exercise.ts` 的 13 条写词逐条取出 `main_prompt.cli`，
 *      与被审测试里那 13 次 `runCli(dir, key, params, …)` 的 (key, params) 逐字对账
 *      ——判「13 条写词」是不是权威那 13 条，而不是手挑子集。
 *   P2 可见文本：被审脚本对**全文原字**检索 `calorie.view.`／`移植`，但票号样式只查了 `<title>`／眉标；
 *      本探针剥掉 `<style>`／`<script>`／标记后取**用户可见文本**，三类工程话（命令名／工序词／票号）各计命中。
 *   P3 锚点与打印：被审脚本只查「href 有对应 id」；本探针两个方向都查（悬空锚点＋导航漏项），
 *      并核对打印类**是否真由版面根那一个元素承载**（不是子元素）、样式段里三条打印规则是否齐。
 *
 * 只读：不改仓库任何被审件；产物取 `.scratch/t423/out/*.html`（本探针不重跑命令）。
 * 运行：`node tooling/run-locked.mjs --ticket 423 -- node docs/skills/skill-calorie/t423-review-probe.mjs`
 * 退出码：全部 PASS=0；任一 FAIL=1。
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const TRIGGERS = join(REPO, 'packages/skill-calorie/src/triggers/scene-04-exercise.ts');
const TESTFILE = join(REPO, 'packages/skill-calorie/test/exercise-receipt-fusion-423.test.mjs');
const SAMPLES = join(REPO, '.scratch/t423/out');

let bad = 0;
const fail = (line) => { bad += 1; console.log('FAIL ' + line); };
const rel = (p) => relative(REPO, p).split('\\').join('/');

/* ───────────────────────── P1 · 13 条写词对账冻结表 ───────────────────────── */

/** 冻结表是 `export const SCENE_04_EXERCISE: Trigger[] = [ … JSON … ];`，掐出数组体直接 JSON.parse。 */
function frozenWords() {
  const src = readFileSync(TRIGGERS, 'utf8');
  const start = src.indexOf('= [') + 2;
  const end = src.lastIndexOf(']');
  const body = src.slice(start, end + 1).replace(/,(\s*)\]$/, '$1]');
  const list = JSON.parse(body);
  return list.map((w) => ({
    wake: w.wake_word,
    key: (/(calorie\.cmd-read\s+)?([a-z]+\.[a-z-]+\.[a-z-]+)/.exec(String(w.main_prompt?.cli ?? '')) ?? [])[2] ?? '',
    cli: String(w.main_prompt?.cli ?? ''),
  }));
}

/** 从 `cli` 原文里取 `--params '<json>'` 那一截并解析成对象（不带 `--params` 即 `{}`）。 */
function cliParams(cli) {
  const m = /--params\s+'([^']*)'/.exec(cli);
  if (m === null) return {};
  return JSON.parse(m[1]);
}

/** 冻结表里 `"<日期>"` 是占位（票面：测试件填真实日期）；逐处按「任意 ISO 日期」比，其余逐字比。 */
const DATE_PLACEHOLDER = '<日期>';
function matchParams(frozen, actual) {
  if (typeof frozen === 'string' && frozen === DATE_PLACEHOLDER) {
    return typeof actual === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(actual);
  }
  if (Array.isArray(frozen)) {
    return Array.isArray(actual) && frozen.length === actual.length && frozen.every((v, k) => matchParams(v, actual[k]));
  }
  if (frozen !== null && typeof frozen === 'object') {
    if (actual === null || typeof actual !== 'object' || Array.isArray(actual)) return false;
    const fk = Object.keys(frozen);
    const ak = Object.keys(actual);
    return fk.length === ak.length && fk.every((k) => matchParams(frozen[k], actual[k]));
  }
  return frozen === actual;
}

/** 被审测试里的 `runCli(dir, key, params, name)` 调用（括号／引号感知截取，防对象里的 `}` 骗过正则）。 */
function testCalls(text) {
  const calls = [];
  const at = 'runCli(dir,';
  let i = text.indexOf(at);
  while (i !== -1) {
    let j = i + at.length;
    let depth = 0;
    let quote = '';
    for (; j < text.length; j += 1) {
      const ch = text[j];
      if (quote !== '') { if (ch === quote && text[j - 1] !== '\\') quote = ''; continue; }
      if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
      if ('([{'.includes(ch)) depth += 1;
      else if (')]}'.includes(ch)) { if (ch === ')' && depth === 0) break; depth -= 1; }
    }
    calls.push(text.slice(i, j + 1));
    i = text.indexOf(at, j);
  }
  return calls;
}

/** 顶层逗号切参（引号／括号感知）。 */
function splitArgs(call) {
  const body = call.slice('runCli('.length, -1);
  const args = [];
  let depth = 0;
  let quote = '';
  let cur = '';
  for (let k = 0; k < body.length; k += 1) {
    const ch = body[k];
    if (quote !== '') { cur += ch; if (ch === quote && body[k - 1] !== '\\') quote = ''; continue; }
    if (ch === "'" || ch === '"') { quote = ch; cur += ch; continue; }
    if ('([{'.includes(ch)) depth += 1;
    else if (')]}'.includes(ch)) depth -= 1;
    if (ch === ',' && depth === 0) { args.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  args.push(cur.trim());
  return args;
}

const D = { D1: '2026-09-05', D2: '2026-09-06', D3: '2026-09-07', D_EMPTY: '2026-09-09', yesterday: '2026-09-13', today: '2026-09-14' };

function evalParams(expr) {
  // 测试件里只用字面量与几个循环／局部变量；能求值的就求值，求不动（循环变量）的记成哨兵，主跑里不会出现。
  try {
    return new Function(...Object.keys(D), 'return (' + expr + ')')(
      ...Object.values(D),
    );
  } catch {
    return { __unresolved: expr };
  }
}

function p1() {
  console.log('── P1 冻结表对账 ──');
  const words = frozenWords();
  const writes = words.filter((w) => /\.(add|update|remove)$/.test(w.key));
  console.log('P1-冻结表 全表词数=' + words.length + ' 写词数=' + writes.length);
  if (writes.length !== 13) fail('P1 冻结表写词数为 ' + writes.length + '（票面与实施席都按 13 条）');

  const src = readFileSync(TESTFILE, 'utf8');
  const runs = testCalls(src)
    .map((call) => splitArgs(call))
    // 只认实参是字面量的真调用（`function runCli(dir, key, params, outName)` 这条定义不算）
    .filter((a) => /^\{/.test(a[2].trim()) && /^'/.test(a[3].trim()))
    .map((a) => ({ key: a[1].replace(/^'|'$/g, ''), params: evalParams(a[2]), name: a[3].replace(/^'|'$/g, '') }));
  // 票面约定的占位：冻结表里写 `"<日期>"`，测试件头注说明「`<日期>` 填真实日期」，逐处按「任意 ISO 日期」比。
  const primary = runs.filter((r) => /^\d\d-/.test(r.name) && !r.name.includes('seed'));
  console.log('P1-被审测试 runCli 调用数=' + runs.length + ' 其中 NN-* 主跑=' + primary.length
    + '（13 条写词 ＋ 零变更／空明细用例；种子与装配层调用另计 ' + (runs.length - primary.length) + ' 次）');

  const miss = [];
  const used = new Set();
  for (const w of writes) {
    const want = cliParams(w.cli);
    const hold = JSON.stringify(want).includes('<日期>') ? 'yes' : 'no';
    const hit = primary.filter((r) => r.key === w.key && matchParams(want, r.params));
    for (const h of hit) used.add(h.name);
    if (hit.length === 0) miss.push(w.wake);
    console.log('P1-词 ' + w.wake + ' key=' + w.key + ' 冻结params=' + JSON.stringify(want) + ' 占位=' + hold
      + ' 命中调用=' + hit.length + ' 逐字一致=' + (hit.length > 0 ? 'yes' : 'no')
      + (hit.length > 0 ? ' 用例=' + hit.map((h) => h.name).join('+') : ''));
  }
  // 反向：13 条主跑之外，还有哪些写调用（票面要求的两条「空的判据」允许在列，且必须能点名）
  const extra = primary.filter((r) => !used.has(r.name));
  console.log('P1-冻结 13 条之外的主跑=' + extra.length
    + (extra.length > 0 ? ' ' + extra.map((e) => e.name + '=' + e.key + JSON.stringify(e.params)).join(' | ') : ''));
  if (miss.length > 0) fail('P1 这 ' + miss.length + ' 条写词在测试里没有任何 (key, params) 命中的真跑：' + miss.join('、'));
  if (extra.length > 2) fail('P1 冻结 13 条之外的主跑有 ' + extra.length + ' 次（票面只允许零变更／空明细两条附加）');
  if (miss.length === 0) console.log('P1 结论 PASS 13/13 写词都能在测试里找到唯一的真跑命令与参数（含 `"<日期>"` 占位约定）');
}

/* ───────────────────────── P2 · 13 份产物的用户可见文本 ───────────────────────── */

const ARTIFACTS = [
  ['记运动', '01-add.html'], ['记运动（含备注）', '02-add-note.html'], ['记力量训练', '03-strength.html'],
  ['记有氧运动', '04-cardio.html'], ['记日常活动', '05-daily.html'], ['补记运动', '06-backfill.html'],
  ['批量补记运动', '07-batch.html'], ['复制昨日运动', '08-copy.html'], ['改运动记录', '09-update.html'],
  ['改某日运动', '10-update-day.html'], ['删运动记录', '11-remove.html'], ['删某日运动', '12-remove-day.html'],
  ['批量删运动', '13-remove-range.html'],
];

/** 用户可见文本：先摘掉样式段与脚本段，再剥标记、还原五字符表。 */
function visibleText(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}

const count = (text, re) => (text.match(re) ?? []).length;

function p2() {
  console.log('── P2 可见文本工程话 ──');
  if (!existsSync(SAMPLES)) { fail('P2 产物目录不存在：' + rel(SAMPLES)); return; }
  const have = new Set(readdirSync(SAMPLES).filter((f) => f.endsWith('.html')));
  let tot = { key: 0, port: 0, tick: 0, anyKey: 0 };
  for (const [wake, file] of ARTIFACTS) {
    if (!have.has(file)) { fail('P2 缺产物 ' + file); continue; }
    const p = join(SAMPLES, file);
    const raw = readFileSync(p, 'utf8');
    const vis = visibleText(raw);
    const m = {
      key: count(vis, /calorie\.view\./g),
      port: count(vis, /移植/g),
      tick: count(vis, /\bt\d{3}\b/gi),
      anyKey: count(vis, /calorie\.[a-z]/g),
      rawKey: count(raw, /calorie\.view\./g),
      rawPort: count(raw, /移植/g),
    };
    for (const k of ['key', 'port', 'tick', 'anyKey']) tot[k] += m[k];
    const sha = createHash('sha256').update(raw).digest('hex').slice(0, 12);
    console.log('P2-件 ' + file + ' 唤醒词=' + wake + ' bytes=' + statSync(p).size + ' sha256=' + sha
      + ' 可见文本 命令名=' + m.key + ' 移植=' + m.port + ' 票号=' + m.tick + ' calorie.*=' + m.anyKey
      + ' ｜ 全文 命令名=' + m.rawKey + ' 移植=' + m.rawPort);
  }
  console.log('P2-合计 件数=' + ARTIFACTS.length + ' 可见文本 命令名=' + tot.key + ' 移植=' + tot.port
    + ' 票号=' + tot.tick + ' calorie.*=' + tot.anyKey);
  if (tot.key + tot.port + tot.tick + tot.anyKey > 0) fail('P2 可见文本里仍有工程话');
  else console.log('P2 结论 PASS 三类工程话在 13 份产物的可见文本里命中 0');
}

/* ───────────────────────── P3 · 锚点闭合与打印根 ───────────────────────── */

const PRINT_RULES = [
  ['.ilife-page-printable {', /\.ilife-page-printable\s*\{/],
  ['page: printable', /page:\s*printable/],
  ['@page printable', /@page\s+printable\s*\{/],
  ['.ilife-page-printable .ilife-block-toc', /\.ilife-page-printable\s*\.ilife-block-toc\s*\{/],
  ['.ilife-page-printable .ilife-block-copy-block', /\.ilife-page-printable\s*\.ilife-block-copy-block\s*\{/],
];

function p3() {
  console.log('── P3 锚点与可打印绑定 ──');
  let dangling = 0;
  let missingNav = 0;
  let notRoot = 0;
  let ruleMiss = 0;
  for (const [, file] of ARTIFACTS) {
    const p = join(SAMPLES, file);
    if (!existsSync(p)) { fail('P3 缺产物 ' + file); continue; }
    const html = readFileSync(p, 'utf8');
    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    const hrefs = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
    const dang = hrefs.filter((h) => !ids.has(h));
    // 反向：导航空项清单须与「卡清单」一一对上（每张卡都在导航里，不是挑着列）
    const navItem = /<nav class="ilife-block-toc"[^>]*>([\s\S]*?)<\/nav>/.exec(html);
    const navHrefs = navItem === null ? [] : [...navItem[1].matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
    const cards = [...html.matchAll(/<section id="(sec-[^"]+)">/g)].map((m) => m[1]);
    const leaked = cards.filter((c) => !navHrefs.includes(c));
    // 打印绑定的承载元素 = 全页第一个版面根 section；比对它是否就是带 ilife-page-printable 的那一个
    const rootAt = html.indexOf('<section class="ilife-block ilife-block-page-shell');
    const tagEnd = html.indexOf('>', rootAt);
    const rootTag = rootAt === -1 ? '' : html.slice(rootAt, tagEnd + 1);
    const printableCount = count(html, /ilife-page-printable/g);
    const styleSeg = (/<style[\s\S]*?<\/style>/.exec(html) ?? [''])[0];
    const missRules = PRINT_RULES.filter(([, re]) => !re.test(styleSeg)).map(([label]) => label);
    console.log('P3-件 ' + file + ' 锚点=' + hrefs.length + ' 悬空=' + dang.length + (dang.length > 0 ? ' ' + dang.join(',') : '')
      + ' 卡片=' + cards.length + ' 导航项=' + navHrefs.length + ' 导航漏卡=' + leaked.length + (leaked.length > 0 ? ' ' + leaked.join(',') : '')
      + ' 打印类命中=' + printableCount + ' 版面根带类=' + (rootTag.includes('ilife-page-printable') ? 'yes' : 'no')
      + ' 打印规则=' + (PRINT_RULES.length - missRules.length) + '/' + PRINT_RULES.length
      + (missRules.length > 0 ? ' 缺:' + missRules.join('|') : ''));
    if (dang.length > 0) dangling += 1;
    if (leaked.length > 0) missingNav += 1;
    if (!rootTag.includes('ilife-page-printable')) notRoot += 1;
    if (missRules.length > 0) ruleMiss += 1;
  }
  console.log('P3-合计 悬空锚点件数=' + dangling + ' 导航漏卡片数=' + missingNav
    + ' 打印类不在版面根的件数=' + notRoot + ' 打印规则不全的件数=' + ruleMiss);
  if (dangling + missingNav + notRoot + ruleMiss > 0) fail('P3 锚点／打印绑定的三方向有不合');
  else console.log('P3 结论 PASS 13 件：无悬空锚点、无导航漏卡、打印类由版面根承载、五条打印规则齐');
}

p1();
p2();
p3();
console.log('PROBE-RESULT ' + (bad === 0 ? 'PASS' : 'FAIL') + ' fail=' + bad);
process.exit(bad === 0 ? 0 : 1);
