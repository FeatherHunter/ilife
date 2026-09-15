/** #269 复核席 · 前后逐字节比对的一侧（判据 ②）。
 *  用法：node .scratch/t269r/cmp.mjs after|before
 *  产物落 `.scratch/t269r/cmp/<mode>/<key>/`；每条记 exit／字节／**归一化 sha256**；
 *  归一化只做两件事：把临时目录串换成 <DIR>、把时刻串换成 <TS>（其余逐字节）。
 *  结果写 `.scratch/t269r/cmp-<mode>.json`，逐条打 `CMPRES`。
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const MODE = process.argv[2] ?? 'after';
const ROOT = resolve(`.scratch/t269r/cmp/${MODE}`);
const BIN = resolve('packages/skill-calorie/dist/cli/cmd_read.js');
const sha = (s) => createHash('sha256').update(s).digest('hex');

const FOOD = { foodName: '鸡胸', calories: 200, protein: 35, date: '2026-09-08', time: '08:00:00' };
const PROD = { productName: '燕麦片', calories: 389, protein: 13, fat: 7, carbohydrates: 66, sodium: 5 };

const DIET13 = [
  { key: 'calorie.diet.add', params: FOOD },
  { key: 'calorie.diet.batch', params: { items: [{ foodName: '粥', calories: 150, protein: 3, date: '2026-09-08', time: '08:10:00' }] } },
  { key: 'calorie.diet.copy', pre: ['calorie.diet.add', FOOD], params: { from: '2026-09-08', to: '2026-09-09' } },
  { key: 'calorie.diet.remove', pre: ['calorie.diet.add', FOOD], idOf: true, mk: (id) => ({ id }) },
  { key: 'calorie.diet.remove-by-date', pre: ['calorie.diet.add', FOOD], params: { date: '2026-09-08' } },
  { key: 'calorie.diet.remove-by-range', pre: ['calorie.diet.add', FOOD], params: { start: '2026-09-08', end: '2026-09-08' } },
  { key: 'calorie.diet.remove-by-type', pre: ['calorie.diet.add', FOOD], params: { mealType: '早餐', date: '2026-09-08' } },
  { key: 'calorie.diet.update', pre: ['calorie.diet.add', FOOD], idOf: true, mk: (id) => ({ id, grams: 150 }) },
  { key: 'calorie.diet.update-by-date', pre: ['calorie.diet.add', FOOD], params: { date: '2026-09-08', note: '食堂' } },
  { key: 'calorie.product.add', params: PROD },
  { key: 'calorie.product.update', pre: ['calorie.product.add', PROD], idOf: true, mk: (id) => ({ id, note: '新版' }) },
  { key: 'calorie.product.deprecate', pre: ['calorie.product.add', PROD], idOf: true, mk: (id) => ({ id }) },
  { key: 'calorie.water.log', params: { ml: 300, date: '2026-09-08', time: '09:00:00' } },
];
/* 非饮食侧抽样 7 条：覆盖全部非饮食域，且落在装配链的**不同位置**
   （档案＝链首那两个口、运动＝中段、体重／身体＝后段各自整页口、目标＝落片段回退面）。
   选它们是因为本票改的正是链上那一跳：最该证明「摘掉这一跳，这 7 条一个字节都不变」。 */
const OTHERS = [
  { key: 'calorie.profile.set', params: { heightCm: 175, age: 30, gender: '男', activityLevel: '中度' } },
  { key: 'calorie.profile.update', params: { fields: { heightCm: 174, note: '改过一次' } } },
  { key: 'calorie.exercise.add', params: { type: '慢跑', calories: 320, minutes: 30, date: '2026-09-06' } },
  { key: 'calorie.weight.log', params: { kg: 70.2, date: '2026-09-06', time: '07:00:00' } },
  { key: 'calorie.body.measure-add', params: { waistCm: 85, date: '2026-09-06' } },
  { key: 'calorie.goal.set', params: { calorie: 1800, protein: 150, carbs: 200, fat: 50 } },
  { key: 'calorie.goal.water', params: { water: 2000 } },
];
const ALL = [...DIET13.map((c) => ({ ...c, side: 'diet13' })), ...OTHERS.map((c) => ({ ...c, side: 'others' }))];

const norm = (s, dir) => String(s)
  .split(dir).join('<DIR>')
  .replace(/\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/g, '<TS>')
  .replace(/\d{2}:\d{2}:\d{2}/g, '<TS>');

function run(key, params, dir, htmlOut) {
  const args = [BIN, key, '--params', JSON.stringify(params ?? {})];
  if (htmlOut) args.push('--html', htmlOut);
  const r = spawnSync(process.execPath, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, SKILLS_DB_PATH: dir } });
  let env = null; try { env = JSON.parse(String(r.stdout)); } catch { env = null; }
  return { status: r.status, env, stdout: String(r.stdout), stderr: String(r.stderr) };
}

rmSync(ROOT, { recursive: true, force: true });
mkdirSync(ROOT, { recursive: true });
const out = {};
for (const c of ALL) {
  const dir = join(ROOT, c.key);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, 'receipt.html');
  let params = c.params; let exit = 0; let preExit = null;
  if (c.pre) {
    const pre = run(c.pre[0], c.pre[1], dir, null);
    preExit = pre.status;
    if (pre.status !== 0 || pre.env === null) { out[c.key] = { side: c.side, exit: 'pre-' + pre.status, bytes: 0, sha: null }; console.log(`CMPRES mode=${MODE} key=${c.key} exit=pre-${pre.status} bytes=0 sha16=-`); continue; }
    if (c.idOf) params = c.mk(pre.env.data.receipt.recordId);
  }
  const r = run(c.key, params, dir, file);
  exit = r.status;
  const html = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const n = html === '' ? '' : norm(html, dir);
  out[c.key] = { side: c.side, exit, preExit, bytes: Buffer.byteLength(html, 'utf8'), sha: n === '' ? null : sha(n), template: r.env && r.env.delivery ? r.env.delivery.template : null };
  console.log(`CMPRES mode=${MODE} key=${c.key} exit=${exit} bytes=${out[c.key].bytes} sha16=${n === '' ? '-' : sha(n).slice(0, 16)} template=${out[c.key].template}`);
}
writeFileSync(resolve(`.scratch/t269r/cmp-${MODE}.json`), JSON.stringify(out, null, 1), 'utf8');
const bad = Object.entries(out).filter(([, v]) => v.exit !== 0).length;
console.log(`RESULT: CMP mode=${MODE} n=${ALL.length} fail=${bad} json=.scratch/t269r/cmp-${MODE}.json`);
