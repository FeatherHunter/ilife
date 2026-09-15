/** #269 复核席 · 新探针①：**故意让取数失败**，看是否按设计 `exit 4` ＋ `ERR 4: 取数失败（缺失阻断）：…`，
 *  而**不是**落一份半成品文档。四条：
 *    a) `calorie.profile.update` 空库（档案不存在）
 *    b) `calorie.goal.water` 空库（目标不存在）
 *    c) `calorie.diet.remove` 记录号不存在
 *    d) `calorie.diet.update` 记录号不存在
 *  判据：exit≠0；`ERR n:` 行如实抄下；落盘文件不得是**完整文档**（三样齐 ＋ >10KB）。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve('.scratch/t269r/inj2');
const BIN = resolve('packages/skill-calorie/dist/cli/cmd_read.js');
const CASES = [
  { key: 'calorie.profile.update', params: { fields: { heightCm: 174 } }, why: '空库：档案不存在' },
  { key: 'calorie.goal.water', params: { water: 2000 }, why: '空库：目标未设' },
  { key: 'calorie.diet.remove', params: { id: 999999 }, why: '记录号不存在' },
  { key: 'calorie.diet.update', params: { id: 999999, grams: 1 }, why: '记录号不存在' },
];
const isDoc = (h) => h.startsWith('<!doctype html>') && /<head[\s\S]*?charset=["']?utf-8/i.test(h) && /<style[^>]*>[\s\S]{200,}?<\/style>/i.test(h) && h.length > 10000;

rmSync(ROOT, { recursive: true, force: true });
mkdirSync(ROOT, { recursive: true });
let blocked = 0; let noHalf = 0;
for (const c of CASES) {
  const dir = join(ROOT, c.key);
  mkdirSync(dir, { recursive: true });
  const out = join(dir, 'receipt.html');
  const r = spawnSync(process.execPath, [BIN, c.key, '--params', JSON.stringify(c.params), '--html', out],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, env: { ...process.env, SKILLS_DB_PATH: dir } });
  const html = existsSync(out) ? readFileSync(out, 'utf8') : '';
  const errLine = (String(r.stdout).match(/^ERR \d+:[^\n]*/m) ?? String(r.stderr).match(/^ERR \d+:[^\n]*/m) ?? [null])[0];
  if (r.status !== 0) blocked++;
  if (!isDoc(html)) noHalf++;
  console.log(`INJ2 key=${c.key} why=${c.why} exit=${r.status} fileWritten=${html === '' ? 0 : 1} fullDoc=${isDoc(html) ? 1 : 0} bytes=${Buffer.byteLength(html, 'utf8')} err=${errLine === null ? '(无 ERR 行) stdout=' + String(r.stdout).trim().slice(0, 120) : errLine}`);
}
console.log(`RESULT: INJ2 blocked=${blocked}/${CASES.length} noFullDoc=${noHalf}/${CASES.length}`);
