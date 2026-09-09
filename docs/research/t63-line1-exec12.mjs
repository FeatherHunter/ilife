// #63 主线①终局取证 · 实跑抽样（12 条 exec 唤醒词，覆盖 10 分组）。
//
// 跑法：node docs/research/t63-line1-exec12.mjs
// 退出码：0 全部断言通过；1 有断言失败。
//
// 断言（每条唤醒词 9 项）：真机 spawn `calorie-cmd-read <key> [--params …]` →
//   ① exit 0；② envelope key = 路由层 key；③ `delivery.mode === 'file'`（#83 三态契约缺省态）；
//   ④ `delivery.path` 绝对路径且文件存在非空；⑤ `delivery.bytes` = 落盘字节数；
//   ⑥ `data.output === delivery.path`（同值同源）；⑦ 产物含 HTML 标签；
//   ⑧ 落点位于 `<SKILLS_DB_PATH>/calorie_html/`；⑨ envelope 五字段（version/skill/shape/key/data）齐备。
//
// 种子库 = `docs/research/t81-seed.mjs::seedFull`（与 #81 同一份定义，只写系统 tmp，不写仓内）。
// spawn 次数 = 12（CLI）＋ 0（node 版本探测直接用 process.execPath）。
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb, DB_FILENAME } from '../../packages/skill-calorie/dist/index.js';
import { addPhotos } from '../../packages/skill-calorie/dist/fetch/photos.js';
import { WAKE_ROUTES } from '../../packages/skill-calorie/dist/triggers/routing.js';
import { PLACEHOLDER_SUBSTITUTIONS, seedFull } from './t81-seed.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
const NODE = process.execPath;

/** 抽样：每个场景（01→10）取首条 exec 路由，另补 02／10 各一条 → 12 条覆盖 10 分组。 */
const PICK = [
  '看今日主页', '记一餐', '看今日饮食', '记体重', '记运动',
  '看计划概览', '定营养目标', '设置档案', '记体脂（皮褶钳）', '记身材照',
  '看体重 vs 摄入(最近 7 天)', '看健康报告(最近 365 天)',
];

const routeOf = (w) => WAKE_ROUTES.find((r) => r.wakeWord === w);
const rows = [];
const fails = [];
let n = 0;
const check = (name, cond, detail = '') => {
  n += 1;
  const pass = Boolean(cond);
  if (!pass) fails.push(`${name}${detail ? ' — ' + detail : ''}`);
  rows.push(`  ${pass ? 'ok  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
  return pass;
};

// ── 标准种子库（与 #81 同源；只写系统 tmp） ────────────────────────────────────
const workDir = mkdtempSync(join(tmpdir(), 't63-line1-'));
const photosDir = join(workDir, 'photos');
const srcDir = join(workDir, 'src');
const tplDir = join(workDir, 'tpl');
for (const d of [photosDir, srcDir, tplDir]) mkdirSync(d, { recursive: true });
const srcFile = (name) => { const p = join(srcDir, name); writeFileSync(p, 'seed-' + name); return p; };
{
  const db = openDb(join(tplDir, DB_FILENAME));
  seedFull(db);
  addPhotos(db, photosDir, { srcPaths: [srcFile('a.jpg'), srcFile('b.jpg')], tag: '正面', today: '2026-09-06', nowTime: '08:00:00' });
  db.close();
}
const templateDb = join(tplDir, DB_FILENAME);
PLACEHOLDER_SUBSTITUTIONS.set('<照片路径>', srcFile('placeholder.jpg'));
const jsonEscape = (s) => JSON.stringify(String(s)).slice(1, -1);

const tokenize = (cli) => {
  const out = []; let cur = ''; let q = null;
  for (const ch of String(cli)) {
    if (q) { if (ch === q) q = null; else cur += ch; } else if (ch === "'" || ch === '"') q = ch;
    else if (ch === ' ') { if (cur) { out.push(cur); cur = ''; } } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
};

let runSeq = 0;
const runCli = (cli) => {
  let effective = String(cli);
  const substituted = [];
  for (const [ph, real] of PLACEHOLDER_SUBSTITUTIONS) {
    if (effective.includes(ph)) { effective = effective.split(ph).join(jsonEscape(real)); substituted.push(ph); }
  }
  runSeq += 1;
  const dir = join(workDir, 'run-' + runSeq);
  mkdirSync(dir, { recursive: true });
  copyFileSync(templateDb, join(dir, DB_FILENAME));
  const toks = tokenize(effective);
  const r = spawnSync(NODE, [CLI, ...toks.slice(1)], {
    encoding: 'utf8',
    env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_PHOTOS_DIR: photosDir },
  });
  let env = null;
  try { env = JSON.parse(String(r.stdout || '').trim()); } catch { env = null; }
  return { status: r.status, env, stdout: String(r.stdout || ''), stderr: String(r.stderr || '').trim(), dir, substituted, effective };
};

console.log('# #63 主线①实跑抽样（12 条 exec 唤醒词 / 10 分组 / 最终代码 5fffe1e）');
console.log(`# 种子库：docs/research/t81-seed.mjs::seedFull（tmp=${workDir.replace(workDir, '<tmp>')}）`);
console.log(`# CLI：packages/skill-calorie/dist/cli/cmd_read.js（node ${process.version}）`);
console.log('');
console.log('| # | 场景 | 唤醒词 | key | exit | delivery.mode | 落盘字节 | 判定 |');
console.log('|---|---|---|---|---|---|---|---|');

const covered = new Set();
for (let i = 0; i < PICK.length; i += 1) {
  const word = PICK[i];
  const r = routeOf(word);
  if (!r || r.kind !== 'exec') { check(`#${i} ${word} 路由为 exec`, false, '路由缺失或非 exec'); continue; }
  covered.add(r.scene);
  const res = runCli(r.cli);
  const env = res.env ?? {};
  const d = env.delivery ?? {};
  const path = typeof d.path === 'string' ? d.path : null;
  const exists = path !== null && existsSync(path);
  const bytes = exists ? statSync(path).size : -1;
  const body = exists ? readFileSync(path, 'utf8') : '';
  const expectDir = join(res.dir, 'calorie_html');
  const c = [];
  c.push(check(`#${i} ${word} exit 0`, res.status === 0, `exit=${res.status} stderr=${res.stderr.slice(0, 120)}`));
  c.push(check(`#${i} ${word} envelope.key = ${r.key}`, env.key === r.key, `实际 ${env.key}`));
  c.push(check(`#${i} ${word} delivery.mode = 'file'`, d.mode === 'file', `实际 ${d.mode}`));
  c.push(check(`#${i} ${word} delivery.path 绝对且落盘非空`, isAbsolute(path ?? '') && exists && bytes > 0,
    `path=${path} exists=${exists} bytes=${bytes}`));
  c.push(check(`#${i} ${word} delivery.bytes = 落盘字节数`, d.bytes === bytes, `${d.bytes} vs ${bytes}`));
  c.push(check(`#${i} ${word} data.output = delivery.path`, env.data && env.data.output === path, `实际 ${env.data && env.data.output}`));
  c.push(check(`#${i} ${word} 产物含 HTML 标签`, /<[a-zA-Z!/]/.test(body) && body.length > 200, `len=${body.length}`));
  c.push(check(`#${i} ${word} 落点在 <SKILLS_DB_PATH>/calorie_html/`, path !== null && path.startsWith(expectDir),
    `path=${path}`));
  c.push(check(`#${i} ${word} envelope 五字段齐备（version/skill/shape/key/data）`,
    ['version', 'skill', 'shape', 'key', 'data'].every((k) => k in env), `键=${Object.keys(env).join(',')}`));
  const allOk = c.every(Boolean);
  console.log(`| ${i + 1} | ${r.scene} | ${word} | \`${r.key}\` | ${res.status} | ${d.mode} | ${bytes} | ${allOk ? 'PASS' : 'FAIL'} |`);
}

check('抽样覆盖 10 个分组', covered.size === 10, `覆盖 ${covered.size}：${[...covered].sort().join(',')}`);
check('抽样条数 = 12', PICK.length === 12, `实际 ${PICK.length}`);

// ── 补充诊断：`t81-exec-smoke.md`（#86 重生成）登记的唯一非零记录「复制昨日运动」 ──
// 该词 cli 的 `copyFrom:'yesterday'` 以**系统日期**为锚（cli/write.ts:556 todayISO → :558 copyYesterday），
// 而标准种子库数据止于 2026-09-07 → 墙钟漂移后必然 exit 4 missing-data（种子窗口缺口，非 cli 缺陷）。
// 诊断：① 原样 cli 复现非零；② 按该词自身 fill_hint「复制到哪一天(选填)」显式给 date 消解墙钟依赖 → exit 0。
console.log('');
console.log('## 补充诊断：`复制昨日运动`（`t81-exec-smoke.md` 唯一非零记录）');
console.log('| 形态 | cli | exit | delivery.mode | 落盘字节 | 判定 |');
console.log('|---|---|---|---|---|---|');
const copyRoute = routeOf('复制昨日运动');
{
  const raw = runCli(copyRoute.cli);
  const rawOk = raw.status === 4 && /昨日无运动记录可复制/.test(raw.stderr);
  check("诊断① 复制昨日运动 原样 cli = exit 4（missing-data，种子窗口缺口）", rawOk,
    `exit=${raw.status} stderr=${raw.stderr.slice(0, 80)}`);
  const fixed = runCli("calorie-cmd-read calorie.exercise.add --params '{\"copyFrom\":\"yesterday\",\"date\":\"2026-09-07\"}'");
  const fenv = fixed.env ?? {};
  const fd = fenv.delivery ?? {};
  const fpath = typeof fd.path === 'string' ? fd.path : null;
  const fbytes = fpath && existsSync(fpath) ? statSync(fpath).size : -1;
  const fixedOk = fixed.status === 0 && fenv.key === 'calorie.exercise.add' && fd.mode === 'file' && fbytes > 0;
  check('诊断② 复制昨日运动 显式 date=2026-09-07 → exit 0 ＋ delivery.mode=file ＋ 落盘非空', fixedOk,
    `exit=${fixed.status} mode=${fd.mode} bytes=${fbytes}`);
  console.log(`| 原样 cli | \`${copyRoute.cli}\` | ${raw.status} | ${(raw.env?.delivery ?? {}).mode ?? '—'} | — | ${rawOk ? 'PASS（数据缺口，非缺陷）' : 'FAIL'} |`);
  console.log(`| 显式 date | \`calorie-cmd-read calorie.exercise.add --params '{"copyFrom":"yesterday","date":"2026-09-07"}'\` | ${fixed.status} | ${fd.mode} | ${fbytes} | ${fixedOk ? 'PASS' : 'FAIL'} |`);
}

const pass = n - fails.length;
console.log('');
console.log(`SUMMARY 抽样 ${PICK.length} 条 / 分组 ${covered.size}/10 / 补充诊断 2 条 / spawn ${runSeq} 次（≤20 预算）`);
console.log(`RESULT: ${pass}/${n}`);
if (fails.length) {
  console.error('FAIL 明细：');
  for (const f of fails) console.error('- ' + f);
  process.exit(1);
}
