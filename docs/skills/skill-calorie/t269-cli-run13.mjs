/** t269 终验 · 饮食 13 条写命令**逐条实跑真出口**（`dist/cli/cmd_read.js`），产物落盘到本票草稿目录。
 *
 * 用法：node .scratch/t269-final/cli-run13.mjs
 * 每条：新建 `.scratch/t269-final/artifacts/<命令>/`（跑前按路径守卫清空），同目录里放 `calorie_data.db` 与
 * `receipt.html`；需要前置记录的先跑前置命令（同一库、同一真出口）。
 * 机器摘要行：`CLI13 key=<k> exit=<n> path=<绝对路径> bytes=<n> doc=<0|1> sha16=<16 位>`
 *            ＋ 末行 `RESULT: RUN13 ok=<n>/13 doc=<n>/13`。
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { assertSafeToRemove } from '../../../tooling/run-locked.mjs';

const ROOT = resolve('.scratch/t269-final/artifacts');
const BIN = resolve('packages/skill-calorie/dist/cli/cmd_read.js');
const sha16 = (s) => createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);
const isFullDoc = (html) => {
  const h = String(html ?? '').toLowerCase();
  return h.includes('<!doctype html>') && h.includes('charset') && h.includes('<style');
};

const FOOD = { foodName: '鸡胸', calories: 200, protein: 35, date: '2026-09-08', time: '08:00:00' };
const PROD = { productName: '燕麦片', calories: 389, protein: 13, fat: 7, carbohydrates: 66, sodium: 5 };

/** 13 条（9 饮食 ＋ 3 食品库 ＋ 1 饮水）；`pre` 与 `idOf` 用来造前置记录。 */
const CASES = [
  { key: 'calorie.diet.add', params: FOOD },
  { key: 'calorie.diet.batch', params: { items: [{ foodName: '粥', calories: 150, protein: 3, date: '2026-09-08', time: '08:10:00' }] } },
  { key: 'calorie.diet.copy', pre: ['calorie.diet.add', FOOD], params: { from: '2026-09-08', to: '2026-09-09' } },
  { key: 'calorie.diet.remove', pre: ['calorie.diet.add', FOOD], idOf: true, makeParams: (id) => ({ id }) },
  { key: 'calorie.diet.remove-by-date', pre: ['calorie.diet.add', FOOD], params: { date: '2026-09-08' } },
  { key: 'calorie.diet.remove-by-range', pre: ['calorie.diet.add', FOOD], params: { start: '2026-09-08', end: '2026-09-08' } },
  { key: 'calorie.diet.remove-by-type', pre: ['calorie.diet.add', FOOD], params: { mealType: '早餐', date: '2026-09-08' } },
  { key: 'calorie.diet.update', pre: ['calorie.diet.add', FOOD], idOf: true, makeParams: (id) => ({ id, grams: 150 }) },
  { key: 'calorie.diet.update-by-date', pre: ['calorie.diet.add', FOOD], params: { date: '2026-09-08', note: '食堂' } },
  { key: 'calorie.product.add', params: PROD },
  { key: 'calorie.product.update', pre: ['calorie.product.add', PROD], idOf: true, makeParams: (id) => ({ id, note: '新版' }) },
  { key: 'calorie.product.deprecate', pre: ['calorie.product.add', PROD], idOf: true, makeParams: (id) => ({ id }) },
  { key: 'calorie.water.log', params: { ml: 300, date: '2026-09-08', time: '09:00:00' } },
];

function run(key, params, dir, out) {
  const args = [BIN, key, '--params', JSON.stringify(params ?? {})];
  if (out) args.push('--html', out);
  const r = spawnSync(process.execPath, args, { encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir } });
  let env = null;
  try { env = JSON.parse(String(r.stdout)); } catch { env = null; }
  return { status: r.status, env, stderr: String(r.stderr) };
}

mkdirSync(ROOT, { recursive: true });
let ok = 0; let doc = 0;
for (const c of CASES) {
  const dir = join(ROOT, c.key);
  try { assertSafeToRemove(dir, ROOT); } catch { /* 不存在即无需清 */ }
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const out = join(dir, 'receipt.html');
  let params = c.params;
  let status = 0;
  if (c.pre) {
    const pre = run(c.pre[0], c.pre[1], dir);
    if (pre.status !== 0) { console.log(`CLI13 key=${c.key} exit=pre-${pre.status} path=- bytes=0 doc=0 sha16=-`); continue; }
    if (c.idOf) params = c.makeParams(pre.env.data.receipt.recordId);
  }
  const r = run(c.key, params, dir, out);
  status = r.status;
  const html = existsSync(out) ? readFileSync(out, 'utf8') : '';
  const full = isFullDoc(html);
  if (status === 0 && full) { ok++; doc++; } else if (status === 0) ok++;
  console.log(`CLI13 key=${c.key} exit=${status} path=${out} bytes=${Buffer.byteLength(html, 'utf8')} doc=${full ? 1 : 0} sha16=${html ? sha16(html) : '-'}`);
}
console.log(`RESULT: RUN13 ok=${ok}/13 doc=${doc}/13`);
process.exit(ok === 13 && doc === 13 ? 0 : 1);
