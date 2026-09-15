#!/usr/bin/env node
/** #269 运行时终验 · 可复跑脚本（饮食域 13 条写操作逐条实跑 ＋ 断言 ＋ 出表）。
 *
 * 一条命令重跑出报告里的那张表：
 *   node docs/skills/skill-calorie/t269-终验-run.mjs
 * 可选：
 *   --lane=<目录>      默认 <检出>/.scratch/t269（库里放 calorie_data.db，页落 calorie_html/）
 *   --checkout=<目录>  默认本脚本所在检出（`../../..`），可指向另一份检出做前后对比
 *   --keep             不先清库（默认清库：删 calorie_data.db 与 calorie_html/，保证可复现）
 *   --out=<文件>       同时把 Markdown 表写到文件
 *
 * 断言（逐条，脚本判，不靠肉眼）：
 *   ① exit 0；② envelope 给出落盘路径且文件存在；③ 字节数 > 0；
 *   ④ 第 0 字节起恰为 `<!doctype html>`；⑤ 含 `charset`；⑥ 含 `<style`；⑦ 末尾有 `</html>`。
 * 13 条命令按下列次序跑（彼此有数据依赖：先造行、再改、再按各种口径删），
 * 每一步都能落在非空目标上，故 13 条必全是 exit 0。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const argOf = (name, def) => {
  const hit = process.argv.slice(2).find((a) => a.startsWith('--' + name + '='));
  return hit === undefined ? def : hit.slice(name.length + 3);
};
const CHECKOUT = resolve(argOf('checkout', join(HERE, '..', '..', '..')));
const LANE = resolve(argOf('lane', join(CHECKOUT, '.scratch', 't269')));
const KEEP = process.argv.includes('--keep');
const OUT = argOf('out', '');

const CLI = join(CHECKOUT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
const DB_DIR = join(LANE, 'calorie_html');

/* ── 日期（相对词也认，这里显式算成 ISO，跨零点复跑结果不变） ───────────────── */
function iso(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
const T = iso(0);
const Y = iso(-1);

function plan() {
  return [
    ['calorie.diet.add', { foodName: '鸡胸', calories: 200, protein: 35, time: '08:00', meal: '早餐' }],
    ['calorie.diet.batch', {
      items: [
        { foodName: '燕麦粥', calories: 150, protein: 5, date: Y, time: '08:00' },
        { foodName: '鸡胸', calories: 200, protein: 35, date: Y, time: '12:00' },
        { foodName: '米饭', calories: 250, protein: 5, date: T, time: '12:00' },
      ],
    }],
    ['calorie.diet.copy', { from: Y, to: T }],
    ['calorie.diet.update', null, (ids) => ({ id: ids.add, grams: 150 })],
    ['calorie.diet.update-by-date', { date: T, note: '食堂' }],
    ['calorie.diet.remove', null, (ids) => ({ id: ids.add })],
    ['calorie.diet.remove-by-type', { date: T, mealType: '早餐' }],
    ['calorie.diet.remove-by-range', { start: Y, end: Y }],
    ['calorie.diet.remove-by-date', { date: T }],
    ['calorie.product.add', {
      productName: '鸡胸肉', brand: '终验', calories: 165, protein: 31, fat: 3.6,
      carbohydrates: 0, sodium: 70,
    }],
    ['calorie.product.update', null, (ids) => ({ id: ids.product, note: '新版' })],
    ['calorie.product.import', {
      items: [{
        productName: '测试导入燕麦', calories: 389, protein: 13, fat: 7, carbohydrates: 66, sodium: 5,
      }],
    }],
    ['calorie.product.deprecate', null, (ids) => ({ id: ids.product })],
  ];
}

function run(key, params) {
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params)], {
    env: { ...process.env, SKILLS_DB_PATH: LANE },
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  let env = null;
  try {
    env = JSON.parse(String(r.stdout).trim().split('\n').pop());
  } catch { /* 失败分支没有 envelope 是正常的，断言里会红 */ }
  return { status: r.status, env, stderr: String(r.stderr).trim() };
}

/** envelope 里的落盘路径（`data.output` 与 `delivery.path` 同值同源，取前者）。 */
function outPathOf(env) {
  if (env === null || typeof env !== 'object') return null;
  const data = env['data'];
  if (data !== null && typeof data === 'object' && typeof data['output'] === 'string') return data['output'];
  const d = env['delivery'];
  if (d !== null && typeof d === 'object' && typeof d['path'] === 'string') return d['path'];
  return null;
}

/** 回执里的记录编号（`data.receipt.recordId`；三种形态各认一遍，取不到返回 null）。 */
function recordIdOf(env) {
  if (env === null || typeof env !== 'object') return null;
  const data = env['data'];
  if (data === null || typeof data !== 'object') return null;
  const receipt = data['receipt'];
  if (receipt !== null && typeof receipt === 'object' && typeof receipt['recordId'] === 'number') {
    return receipt['recordId'];
  }
  if (typeof data['recordId'] === 'number') return data['recordId'];
  const ids = data['ids'];
  if (Array.isArray(ids) && typeof ids[0] === 'number') return ids[0];
  return null;
}

function check(path) {
  if (path === null) return { ok: false, why: 'envelope 无落盘路径' };
  if (!existsSync(path)) return { ok: false, why: '文件不存在' };
  const buf = readFileSync(path);
  const head = buf.subarray(0, 15).toString('utf8');
  const text = buf.toString('utf8');
  const bad = [];
  if (buf.length === 0) bad.push('零字节');
  if (head !== '<!doctype html>') bad.push('第 0 字节不是 <!doctype html>（实为 ' + JSON.stringify(head) + '）');
  if (!text.includes('charset')) bad.push('无 charset');
  if (!text.includes('<style')) bad.push('无 <style');
  if (!text.trimEnd().endsWith('</html>')) bad.push('未以 </html> 收尾');
  return { ok: bad.length === 0, why: bad.join('；'), bytes: buf.length };
}

/* ── 跑 ─────────────────────────────────────────────────────────────────── */
if (!existsSync(CLI)) {
  console.error('FAIL：CLI 不存在（先 pnpm build）：' + CLI);
  process.exit(1);
}
if (!KEEP) {
  rmSync(join(LANE, 'calorie_data.db'), { force: true });
  rmSync(DB_DIR, { recursive: true, force: true });
}
mkdirSync(DB_DIR, { recursive: true });

const rows = [];
const ids = { add: null, product: null };
let failed = 0;
for (const [key, fixed, lazy] of plan()) {
  const params = lazy === undefined ? fixed : lazy(ids);
  const r = run(key, params);
  const path = outPathOf(r.env);
  const c = check(path);
  const ok = r.status === 0 && c.ok;
  if (!ok) failed += 1;
  if (key === 'calorie.diet.add') ids.add = recordIdOf(r.env);
  if (key === 'calorie.product.add') ids.product = recordIdOf(r.env);
  rows.push({
    key, exit: r.status, path, bytes: c.bytes ?? null, doctype: c.why === '' || !c.why.includes('<!doctype'), ok,
    why: c.why, stderr: r.status === 0 ? '' : r.stderr.split('\n')[0],
  });
}

const md = [];
md.push('| # | 命令 | exit | 落盘绝对路径 | 字节数 | 完整文档 |');
md.push('|---|---|---|---|---|---|');
rows.forEach((r, i) => {
  md.push('| ' + (i + 1) + ' | `' + r.key + '` | ' + r.exit + ' | `' + (r.path ?? '(无)') + '` | '
    + (r.bytes === null ? '(无)' : String(r.bytes)) + ' | ' + (r.ok ? '是' : '否：' + r.why) + ' |');
});
md.push('');
md.push('断言口径：exit 0 ＋ 文件存在 ＋ 字节数 >0 ＋ 第 0 字节起 `<!doctype html>` ＋ 含 `charset` ＋ 含 `<style` ＋ `</html>` 收尾。');
md.push('库：`' + join(LANE, 'calorie_data.db') + '`；页：`' + DB_DIR + '`；T=' + T + '，昨日=' + Y + '。');
md.push('读数：**' + (13 - failed) + '/13 绿**' + (failed === 0 ? '' : '（红 ' + failed + ' 条）'));

const text = md.join('\n');
console.log(text);
if (OUT !== '') writeFileSync(OUT, text + '\n', 'utf8');
for (const r of rows) if (!r.ok) console.error('RED ' + r.key + '：exit=' + r.exit + ' ' + (r.why || r.stderr));
process.exit(failed === 0 ? 0 : 1);
