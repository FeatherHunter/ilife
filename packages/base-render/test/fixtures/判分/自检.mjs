#!/usr/bin/env node
/** #868 · 夹具自检：正例两条 ＋ 反例四条，逐条判红绿（可重跑）。
 *
 *  跑法（仓根）：
 *    node tooling/run-locked.mjs --ticket 868 -- node packages/base-render/test/fixtures/判分/自检.mjs
 *
 *  六条：
 *    正例① 引擎跑夹具备——exit 0，末两行给「一致性自证差 0」与「页分／每维≥80%」
 *    正例② 同一读数目录换两套按域配置——DOMAIN-DIFF 逐页逐维最大绝对差 0
 *    反例① 权重改一位（d3 25→24）——一致性自证红、exit 1（变异件临时写在引擎同目录，跑完删）
 *    反例② 配置里写一个数字——必红并点名「配置只许路径与名单」（顶层一处 ＋ 名单里一处）
 *    反例③ 实例名单指错——必报缺件并点名那件产物，不静默取 0 分
 *    反例④ facts.json 挪走——必报缺件点名，且不吐栈
 */
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..', '..', '..', '..');
const ENGINE = 'packages/base-render/scripts/判分.mjs';
const FIX = join(HERE, '夹具');
const OUT = join(ROOT, '.scratch', 't868');
const rel = (p) => relative(ROOT, p) || '.';

mkdirSync(OUT, { recursive: true });

function runEngine(args) {
  const r = spawnSync(process.execPath, [join(ROOT, ENGINE), ...args], { cwd: ROOT, encoding: 'utf8' });
  return { code: r.status, out: r.stdout ?? '', err: (r.stderr ?? '') + (r.stdout ?? '') };
}

const results = [];
function check(title, ok, note) {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${title}${note ? '  —— ' + note : ''}`);
}

// ── 正例①：引擎跑夹具备 ────────────────────────────────────────────────────────
{
  const json = join(OUT, '自检-正例.json');
  const r = runEngine(['--dir', rel(FIX), '--json', rel(json)]);
  const lines = r.out.trim().split(/\r?\n/);
  const [last, second] = [lines[lines.length - 1] ?? '', lines[lines.length - 2] ?? ''];
  check('正例① exit 0', r.code === 0, `exit=${r.code}`);
  check('正例① 末两行给自证差 0 与页分／每维≥80%', second.includes('RECONCILE') && second.includes('差 0') && last.includes('页分'),
    `次末行「${second.slice(0, 40)}…」末行「${last.slice(0, 40)}…」`);
  check('正例① 逐页读数：100／37／90 且压线页每维达线', r.out.includes('**100**') && r.out.includes('**37**') && r.out.includes('**90**'),
    '甲-01=100 甲-02=37 甲-03=90');
}

// ── 正例②：同一读数目录换另一套按域配置 ────────────────────────────────────────
{
  const a = join(OUT, '自检-域甲.json');
  const b = join(OUT, '自检-域乙.json');
  const ra = runEngine(['--dir', rel(FIX), '--config', rel(join(HERE, '配置', '域甲.json')), '--json', rel(a)]);
  const rb = runEngine(['--config', rel(join(HERE, '配置', '域乙.json')), '--json', rel(b)]);
  check('正例② 两套按域配置各自 exit 0', ra.code === 0 && rb.code === 0, `甲 exit=${ra.code} 乙 exit=${rb.code}`);
  const cmp = runEngine(['--compare', rel(a), rel(b)]);
  check('正例② DOMAIN-DIFF 逐页逐维最大绝对差 0', cmp.code === 0 && cmp.out.includes('差 0'), cmp.out.trim().split(/\r?\n/).pop());
}

// ── 反例①：权重改一位 ─────────────────────────────────────────────────────────
{
  const src = readFileSync(join(ROOT, ENGINE), 'utf8');
  const mutated = src.replace('d3: 25', 'd3: 24');
  const mutPath = join(ROOT, 'packages/base-render/scripts/判分-变异-权重.mjs');
  if (mutated === src) throw new Error('变异没生效：引擎源码里找不到 d3: 25');
  writeFileSync(mutPath, mutated, 'utf8');
  try {
    const r = spawnSync(process.execPath, [mutPath, '--dir', rel(FIX)], { cwd: ROOT, encoding: 'utf8' });
    const out = (r.stdout ?? '') + (r.stderr ?? '');
    check('反例① 权重改一位 → exit 1 且自证红', r.status === 1 && out.includes('不一致'), `exit=${r.status}`);
  } finally {
    rmSync(mutPath, { force: true });
  }
  check('反例① 变异件已删掉', !existsSync(mutPath), rel(mutPath));
}

// ── 反例②：配置里写数字 ───────────────────────────────────────────────────────
{
  const cases = [
    ['顶层一处', { packagePath: '.', readingsDir: rel(FIX), instances: ['甲-01-记录一览.html'], d3: 25 }],
    ['名单里一处', { packagePath: '.', readingsDir: rel(FIX), instances: [{ file: 3 }] }],
  ];
  for (const [name, cfg] of cases) {
    const p = join(OUT, `自检-反例-配置数字-${name}.json`);
    writeFileSync(p, JSON.stringify(cfg, null, 2) + String.fromCharCode(10), 'utf8');
    const r = runEngine(['--dir', rel(FIX), '--config', rel(p)]);
    check(`反例② 配置写数字（${name}）→ exit 1 且点名「配置只许路径与名单」`,
      r.code === 1 && r.err.includes('配置只许路径与名单'), `exit=${r.code}｜${r.err.trim().split(/\r?\n/).pop()}`);
  }
}

// ── 反例③：实例名单指错 ───────────────────────────────────────────────────────
{
  const p = join(OUT, '自检-反例-名单指错.json');
  writeFileSync(p, JSON.stringify({
    packagePath: '.', readingsDir: rel(FIX), instances: ['甲-01-记录一览.html', '不存在-99.html'],
  }, null, 2) + String.fromCharCode(10), 'utf8');
  const r = runEngine(['--dir', rel(FIX), '--config', rel(p)]);
  check('反例③ 名单指错 → exit 1 且点名缺的产物', r.code === 1 && r.err.includes('不存在-99.html') && r.err.includes('缺件'),
    `exit=${r.code}｜${r.err.trim().split(/\r?\n/).pop()}`);
}

// ── 反例④：facts.json 挪走 ────────────────────────────────────────────────────
{
  const broken = join(OUT, '自检-反例-缺 facts');
  rmSync(broken, { recursive: true, force: true });
  cpSync(FIX, broken, { recursive: true });
  rmSync(join(broken, 'facts.json'));
  const r = runEngine(['--dir', rel(broken)]);
  const stacky = /^\s+at\s/m.test(r.err);
  check('反例④ facts.json 挪走 → exit 1 且点名 facts.json、不吐栈',
    r.code === 1 && r.err.includes('facts.json') && r.err.includes('缺件') && !stacky,
    `exit=${r.code}｜吐栈=${stacky}｜${r.err.trim().split(/\r?\n/).pop()}`);
  copyFileSync(join(FIX, 'facts.json'), join(broken, 'facts.json'));
}

const bad = results.filter((x) => !x).length;
console.log(`自检：${results.length - bad}/${results.length} 条达标${bad === 0 ? '' : `（${bad} 条不达标）`}`);
process.exitCode = bad === 0 ? 0 : 1;
