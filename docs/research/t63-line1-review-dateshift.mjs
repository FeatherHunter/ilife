// #63 对抗式审查席 · 探针③：墙钟（系统日期）依赖实证。
//
// 手法：`--require` 预载脚本把 `Date` 钉死到指定时刻（`todayISO()` 用 `new Date().toISOString()`），
// 同一份标准种子库 + 同一批 exec 唤醒词，在不同"今天"下真机 spawn，看谁从 exit 0 翻红。
// 只写系统 tmp。用法：node docs/research/t63-line1-review-dateshift.mjs
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb, DB_FILENAME } from '../../packages/skill-calorie/dist/index.js';
import { addPhotos } from '../../packages/skill-calorie/dist/fetch/photos.js';
import { WAKE_ROUTES } from '../../packages/skill-calorie/dist/triggers/routing.js';
import { PLACEHOLDER_SUBSTITUTIONS, seedFull } from './t81-seed.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
const NODE = process.execPath;
const workDir = mkdtempSync(join(tmpdir(), 't63-review-clock-'));
const photosDir = join(workDir, 'photos'); const srcDir = join(workDir, 'src'); const tplDir = join(workDir, 'tpl');
for (const d of [photosDir, srcDir, tplDir]) mkdirSync(d, { recursive: true });
const srcFile = (n) => { const p = join(srcDir, n); writeFileSync(p, 'seed-' + n); return p; };
{
  const db = openDb(join(tplDir, DB_FILENAME));
  seedFull(db);
  addPhotos(db, photosDir, { srcPaths: [srcFile('a.jpg'), srcFile('b.jpg')], tag: '正面', today: '2026-09-06', nowTime: '08:00:00' });
  db.close();
}
const templateDb = join(tplDir, DB_FILENAME);
PLACEHOLDER_SUBSTITUTIONS.set('<照片路径>', srcFile('placeholder.jpg'));

// Date 钉死预载
const preload = join(workDir, 'freeze-date.cjs');
writeFileSync(preload, [
  'const FAKE = process.env.T63_FAKE_NOW;',
  'if (FAKE) {',
  '  const RealDate = Date; const fixed = RealDate.parse(FAKE);',
  '  class FakeDate extends RealDate {',
  '    constructor(...a) { if (a.length === 0) super(fixed); else super(...a); }',
  '    static now() { return fixed; }',
  '    static parse(s) { return RealDate.parse(s); }',
  '    static UTC(...a) { return RealDate.UTC(...a); }',
  '  }',
  '  globalThis.Date = FakeDate;',
  '}',
  '',
].join('\n'));

const WORDS = [
  '复制昨日运动', '复制昨日饮食', '记喝水',
  '看今日主页', '记一餐', '看今日饮食', '记体重', '记运动', '看计划概览',
  '定营养目标', '设置档案', '记体脂（皮褶钳）', '记身材照',
  '看体重 vs 摄入(最近 7 天)', '看健康报告(最近 365 天)',
];
const routeOf = (w) => WAKE_ROUTES.find((r) => r.wakeWord === w);
let seq = 0;
const runCli = (cli, fakeNow) => {
  let effective = String(cli);
  for (const [ph, real] of PLACEHOLDER_SUBSTITUTIONS) if (effective.includes(ph)) effective = effective.split(ph).join(JSON.stringify(String(real)).slice(1, -1));
  seq += 1;
  const dir = join(workDir, 'run-' + seq); mkdirSync(dir, { recursive: true });
  copyFileSync(templateDb, join(dir, DB_FILENAME));
  const toks = [];
  { let cur = ''; let q = null;
    for (const ch of effective) { if (q) { if (ch === q) q = null; else cur += ch; } else if (ch === "'" || ch === '"') q = ch; else if (ch === ' ') { if (cur) { toks.push(cur); cur = ''; } } else cur += ch; }
    if (cur) toks.push(cur); }
  const r = spawnSync(NODE, ['--require', preload, CLI, ...toks.slice(1)], {
    encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_PHOTOS_DIR: photosDir, ...(fakeNow ? { T63_FAKE_NOW: fakeNow } : {}) },
  });
  let env = null; try { env = JSON.parse(String(r.stdout || '').trim()); } catch { env = null; }
  const d = env?.delivery ?? {};
  const bytes = d.path && existsSync(d.path) ? statSync(d.path).size : -1;
  return { status: r.status, key: env?.key ?? null, mode: d.mode ?? null, bytes, stderr: String(r.stderr || '').trim().slice(0, 90) };
};
const phase = (label, fakeNow, words) => {
  console.log(`\n## ${label}  fakeNow=${fakeNow ?? '(真实系统日期)'}`);
  console.log('| 唤醒词 | key | exit | delivery.mode | 落盘字节 | 判定 |');
  console.log('|---|---|---|---|---|---|');
  for (const w of words) {
    const r = routeOf(w);
    if (!r) { console.log(`| ${w} | — | — | — | — | 路由缺失 |`); continue; }
    const res = runCli(r.cli, fakeNow);
    console.log(`| ${w} | \`${r.key}\` | ${res.status} | ${res.mode ?? '—'} | ${res.bytes} | ${res.status === 0 && res.mode === 'file' && res.bytes > 0 ? 'PASS' : 'FAIL ' + res.stderr} |`);
  }
};
phase('P3-1 真实系统日期基线（15 词）', null, WORDS);
phase('P3-2 钉死 2026-09-08T04:00:00Z（昨日有数据的一天）', '2026-09-08T04:00:00Z', ['复制昨日运动']);
phase('P3-3 钉死 2027-01-01T04:00:00Z（远期墙钟）', '2027-01-01T04:00:00Z', WORDS);
console.log(`\nSUMMARY spawn=${seq} 次（本席预算 ≤40；未跑 t81-exec-smoke.mjs）`);
