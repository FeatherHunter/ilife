#!/usr/bin/env node
/**
 * t830 · checkin 域交付产物驱动器（可重跑）：临时库 ＋ 家目录隔离 → 3 场景逐条真跑唯一出口
 * → 把产物收进 `--out` 目录，供五道门读。
 *
 * 为什么不需要 lark 挡板（与 #829 的驱动器不同）：打卡类**只落本地**（`ensureWish` 的分类不是
 * `心愿` 就不调远端，回执 `remote='not-applicable'`），故回执 message 里不会出现内部命令名，
 * 六列机审 ⑥ 列不会被「本机没装飞书」点红。
 *
 * 用法：node docs/skills/skill-memo-ilife/t830-产物驱动器.mjs [--out <目录>]
 */
import { cpSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { mkMemoDb, seedNote } from '../../../packages/skill-memo-ilife/test/helpers/memo-sqlite.mjs';

const argOf = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const ROOT = resolve('.');
const OUT = resolve(argOf('--out', '.scratch/t830/pages'));
const CLI = join(ROOT, 'packages', 'skill-memo-ilife', 'dist', 'cli', 'cmd_read.js');

/* ── 夹具：临时库 ＋ 临时家目录 ─────────────────────────────────────────────── */
const home = mkdtempSync(join(tmpdir(), 't830-pages-home-'));
const dbDir = mkMemoDb('t830-pages-db-');
mkdirSync(join(home, '.ilife'), { recursive: true });
writeFileSync(join(home, '.ilife', 'memo.yaml'),
  ['db:', '  dir: ' + JSON.stringify(dbDir.replace(/\\/g, '/')), '  name: memo.db',
   'html:', '  dir: memo_html', ''].join('\n'), 'utf8');

const ENV = { ...process.env, USERPROFILE: home, HOME: home };

/* ── 夹具数据：两条打卡（改／删各用一条）＋ 一条备忘（反例：不该出本域页）──────── */
const i1 = seedNote(dbDir, { content: '今天跑步 5 公里', category: '打卡', sub: '跑步' });
const i2 = seedNote(dbDir, { content: '早起打卡', category: '打卡' });
seedNote(dbDir, { content: '买牛奶', category: '备忘' });

const run = (key, params) => spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params)], { encoding: 'utf8', env: ENV, maxBuffer: 32 * 1024 * 1024 });
const landing = join(dbDir, 'memo_html');
const listing = () => (existsSync(landing) ? readdirSync(landing) : []);

/* ── 3 格逐条真跑（册子 seq 23／24／25；参数用 HELP 的字段名）──────────────────── */
const steps = [];
const step = (tag, key, params) => {
  const r = run(key, params);
  let env = null;
  try { env = JSON.parse(String(r.stdout)); } catch { /* 落盘仍可能成 */ }
  steps.push({ tag, key, exit: r.status, message: env?.data?.message ?? null, bytes: env?.delivery?.bytes ?? null, page: env?.delivery?.path?.split(/[\\/]/).pop() ?? null });
};
step('序23 记打卡', 'memo.create', { content: '今天跑步 7 公里', category: '打卡', sub_category: '跑步' });
step('序25 改打卡', 'memo.update', { id: i1, content: '今天跑步 6 公里', category: '打卡' });
step('序24 删打卡', 'memo.remove', { id: i2, confirm: true });

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
for (const f of listing()) cpSync(join(landing, f), join(OUT, f));

console.log('# t830 产物驱动器');
for (const s of steps) console.log('RESULT ' + s.tag + ' | ' + s.key + ' | exit=' + s.exit + ' | 产物=' + (s.page ?? '(无)') + ' | bytes=' + s.bytes + ' | message=' + String(s.message).slice(0, 60));
console.log('SUMMARY 出页 ' + steps.filter((s) => s.page).length + '/' + steps.length + '；目录件 ' + readdirSync(OUT).length);
console.log('ARTIFACT ' + OUT);
writeFileSync(join(ROOT, '.scratch', 't830', 'driver-result.json'), JSON.stringify({ dbDir, noteIds: { i1, i2 }, steps, out: OUT }, null, 2), 'utf8');
