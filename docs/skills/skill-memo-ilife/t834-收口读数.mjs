#!/usr/bin/env node
/** #834 · 收口批的**读数链驱动器**：把 34 格真产物一路推到「四件读数 ＋ 判分」。
 *
 * 为什么要单列一件：34 格的读数链要走四步（三件 reader ＋ facts 装配 ＋ 判分），
 * 而每一步的输入是上一步的落点。手工敲四遍命令，收口下一批人复算不了。
 *
 * 用法（仓根）：
 *   node docs/skills/skill-memo-ilife/t834-收口读数.mjs --pages <页群目录> --human <人核档> --out <读数目录>
 *   node docs/skills/skill-memo-ilife/t834-收口读数.mjs --pages <页群目录> --out <读数目录> --probe-human
 *      ↑ `--probe-human` 现产一份「全零 ＋ 采纳候选」的探针人核档（只为取机器候选与页行数），
 *        真判据的人核档要人写（见 `t867-读数链契约.md` §五）。
 *
 * 产物：`<读数目录>/sep.json`／`resp.json`／`fmt.json`／`facts.json`／`判分结果.json`；
 * 末尾打印逐页页分与每维读数，任一页 <90 或某维 < 满权 80% 即 exit 1。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..', '..');
const argOf = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const PAGES = resolve(argOf('--pages', '.scratch/t834-源'));
const OUT = resolve(argOf('--out', '.scratch/t834-读数'));
const PROBE = process.argv.includes('--probe-human');
let HUMAN = argOf('--human', '');

if (!existsSync(PAGES)) { console.error('页群目录不存在：' + PAGES); process.exit(2); }
mkdirSync(OUT, { recursive: true });
const keys = readdirSync(PAGES).filter((f) => f.endsWith('.html')).map((f) => f.replace(/\.html$/, '')).sort();
if (keys.length === 0) { console.error('页群目录里没有 .html：' + PAGES); process.exit(2); }

if (PROBE) {
  HUMAN = join(OUT, '人核档-探针.md');
  const body = ['# 探针人核档（只为取机器候选与页行数；真判据另写）', ''];
  for (const k of keys) {
    body.push('### ' + k, '',
      '- english = 0 ｜ 判=采纳候选 ｜ 出处=静态 — ｜ 理由=探针',
      '- dupFacts = 0 ｜ 判=采纳候选 ｜ 出处=静态 — ｜ 理由=探针',
      '- d1 = 0 ｜ 出处=静态 — ｜ 理由=探针', '- d2 = 0 ｜ 出处=静态 — ｜ 理由=探针', '');
  }
  writeFileSync(HUMAN, body.join('\n'), 'utf8');
  console.log('探针人核档：' + HUMAN + '（' + keys.length + ' 页）');
} else if (HUMAN === '') {
  console.error('用法：--human <人核档>，或 --probe-human 现产探针档');
  process.exit(2);
}

const run = (label, argv) => {
  const r = spawnSync(process.execPath, argv, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const tail = String(r.stdout ?? '').trim().split(/\r?\n/).filter((l) => /RESULT|FACTS-WROTE|PASS|FAIL|判分|引擎|逐页|RECONCILE|缺件|不一致/.test(l));
  console.log('\n── ' + label + '（exit=' + r.status + '）');
  for (const l of tail.slice(-24)) console.log('   ' + l);
  if (r.status === 2) { console.error(String(r.stderr ?? '').slice(0, 800)); process.exit(2); }
  return r.status;
};

const chain = run('四件读数（sep／resp／fmt／facts）', [
  join(ROOT, 'docs', 'skills', 'skill-memo-ilife', 't867-facts.mjs'),
  '--dir', PAGES, '--human', HUMAN, '--json', join(OUT, 'facts.json'), '--readings', OUT,
]);
console.log('   页键 ' + keys.length + ' 个；facts.json ' + (existsSync(join(OUT, 'facts.json')) ? '在' : '不在'));

// 按域配置（判分引擎只许「路径 ＋ 名单」；名单由本件现产，页名带时间戳也不会发霉）
const CONFIG = join(OUT, '判分配置.json');
const cfg = {
  packagePath: 'packages/skill-memo-ilife',
  readingsDir: '.',
  instances: JSON.parse(readFileSync(join(OUT, 'facts.json'), 'utf8')).pages
    ? Object.keys(JSON.parse(readFileSync(join(OUT, 'facts.json'), 'utf8')).pages).map((k) => ({ file: k + '.html', key: k }))
    : [],
};
writeFileSync(CONFIG, JSON.stringify(cfg, null, 2) + '\n', 'utf8');

const score = run('判分（公共层引擎 ＋ 按域配置）', [
  join(ROOT, 'packages', 'base-render', 'scripts', '判分.mjs'),
  '--dir', OUT, '--config', CONFIG, '--json', join(OUT, '判分结果.json'),
]);

console.log('\nRESULT: 读数链 ' + (chain === 0 ? 'PASS' : 'FAIL') + '；判分 ' + (score === 0 ? 'PASS' : 'FAIL')
  + '；读数目录 ' + OUT);
process.exit(chain === 0 && score === 0 ? 0 : 1);
