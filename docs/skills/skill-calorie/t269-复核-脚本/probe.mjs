/** #269 复核席（t269r）· 自造探针。**不调用、不引用作者任何脚本或 sha 清单。**
 *
 * 用法（持锁窗口内）：
 *   node .scratch/t269r/probe.mjs after     仅跑「当刻真出口」这一侧
 *   node .scratch/t269r/mkbefore.mjs        先造 before 树（.scratch/t269r/dist-before/）
 *   node .scratch/t269r/probe.mjs both      两侧都跑并逐条比对
 *
 * 四组读数，每组一条 RESULT 行：
 *   A13   13 条饮食写命令走真出口 dist/cli/cmd_read.js；严格完整文档断言（doctype 在第 0 字节 ＋
 *         <html lang> ＋ head 内 charset ＋ 非空 <style> 块 ＋ </html> 收口 ＋ 长度）；另跑 2 条
 *         **不给 --html**，验证默认落点是 <SKILLS_DB_PATH>/calorie_html/ 下的时间戳文件名。
 *   B46   46 条写命令的键集**闭包**逐条验：db=null、receipt=null 时调 dietReceiptDoc()——
 *         非饮食命令必须原样返回 null（证明早退、无副作用），饮食命令必须不早退（抛）。
 *   CMP   before/after 两侧逐条产物按「时刻串→<TS>、临时目录串→<DIR>」归一后逐字节比 sha256。
 *   INJ   取数失败注入：库文件损坏 / --html 落点非法；断言非零退出**且不留完整文档**（半成品）。
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve('.scratch/t269r');
const BIN_AFTER = process.env.PROBE_BIN ? resolve(process.env.PROBE_BIN) : resolve('packages/skill-calorie/dist/cli/cmd_read.js');
const BIN_BEFORE = process.env.PROBE_BEFORE ? resolve(process.env.PROBE_BEFORE) : join(ROOT, 'dist-before', 'cli', 'cmd_read.js');
const sha = (s) => createHash('sha256').update(s).digest('hex');
const sha16 = (s) => sha(s).slice(0, 16);

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

/* 非饮食侧抽样：覆盖全部非饮食域，且含分派链**不同位置**的键
   （档案＝链首、体重／身体＝链后段＋各自整页口、目标＝落片段回退面、运动＝中间段）。
   理由：本票改的是 `?? dietReceiptDoc(...) ??` 这一跳，最该看它有没有扰动链上别的口。 */
const OTHERS = [
  { key: 'calorie.profile.set', params: { heightCm: 175, age: 30, gender: '男', activityLevel: '中度' }, why: '链首口，档案域' },
  { key: 'calorie.profile.update', params: { fields: { heightCm: 174, note: '改过一次' } }, why: '链首口，档案域' },
  { key: 'calorie.weight.log', params: { kg: 70.2, date: '2026-09-06', time: '07:00:00' }, why: '体重域，链上后段自有整页口' },
  { key: 'calorie.body.measure-add', params: { waistCm: 85, date: '2026-09-06' }, why: '身体域，链上末段自有整页口' },
  { key: 'calorie.goal.set', params: { calorie: 1800, protein: 150, carbs: 200, fat: 50 }, why: '目标域，落旧片段回退面' },
  { key: 'calorie.goal.water', params: { water: 2000 }, why: '目标域，落旧片段回退面' },
  { key: 'calorie.exercise.add', params: { type: '慢跑', calories: 320, minutes: 30, date: '2026-09-06' }, why: '运动域（作者称此条曾只差时刻串）' },
];

const norm = (s, dir) => String(s)
  .split(dir).join('<DIR>')
  .split(dir.replace(/\\/g, '/')).join('<DIR>')
  .replace(/\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/g, '<TS>')
  .replace(/\d{2}:\d{2}:\d{2}/g, '<TS>')
  .replace(/_\d{8}_\d{6}/g, '_<TS>');

const STRICT = {
  doctype0: (h) => h.startsWith('<!doctype html>'),
  langTag: (h) => /<html[^>]*lang=/i.test(h),
  metaCharset: (h) => /<head[\s\S]*?<meta[^>]*charset=["']?utf-8/i.test(h),
  styleBlock: (h) => {
    const m = /<style[^>]*>([\s\S]*?)<\/style>/i.exec(h);
    return m !== null && m[1].trim().length > 200;
  },
  closed: (h) => /<\/html>\s*$/i.test(h),
  size: (h) => h.length > 10000,
};
const LENIENT = (h) => { const t = h.toLowerCase(); return t.includes('<!doctype html>') && t.includes('charset') && t.includes('<style'); };

function run(bin, key, params, dir, htmlOut) {
  const args = [bin, key, '--params', JSON.stringify(params ?? {})];
  if (htmlOut) args.push('--html', htmlOut);
  const r = spawnSync(process.execPath, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, SKILLS_DB_PATH: dir } });
  let env = null; try { env = JSON.parse(String(r.stdout)); } catch { env = null; }
  const errLine = (String(r.stdout).match(/^ERR \d+:[^\n]*/m) ?? String(r.stderr).match(/^ERR \d+:[^\n]*/m) ?? [null])[0];
  return { status: r.status, env, errLine, stderr: String(r.stderr), stdout: String(r.stdout) };
}

function fresh(cmd) {
  const dir = join(ROOT, 'w', cmd);
  rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
  mkdirSync(dir, { recursive: true });
  return dir;
}

/* ── A13 ─────────────────────────────────────────────────────────────────── */
function groupA() {
  let ok = 0; let strict = 0; let lenient = 0;
  for (const c of DIET13) {
    const dir = fresh('a-' + c.key);
    const out = join(dir, 'receipt.html');
    let params = c.params; let st = 0;
    if (c.pre) {
      const pre = run(BIN_AFTER, c.pre[0], c.pre[1], dir, null);
      if (pre.status !== 0 || pre.env === null) { console.log(`A13 key=${c.key} exit=pre-${pre.status} strict=0`); continue; }
      if (c.idOf) params = c.mk(pre.env.data.receipt.recordId);
    }
    const r = run(BIN_AFTER, c.key, params, dir, out);
    st = r.status;
    const html = existsSync(out) ? readFileSync(out, 'utf8') : '';
    const fails = Object.entries(STRICT).filter(([, f]) => !f(html)).map(([k]) => k);
    if (st === 0) ok++;
    if (st === 0 && fails.length === 0) strict++;
    if (LENIENT(html)) lenient++;
    console.log(`A13 key=${c.key} exit=${st} bytes=${Buffer.byteLength(html, 'utf8')} strict=${fails.length === 0 ? 1 : 0} lenientAuthor=${LENIENT(html) ? 1 : 0} fail=${fails.join(',') || '-'} path=${out} sha16=${html ? sha16(html) : '-'}`);
  }
  console.log(`RESULT: A13 ok=${ok}/13 strict=${strict}/13 lenientAuthor=${lenient}/13`);

  // 默认落点（不给 --html）：口径＝<SKILLS_DB_PATH>/calorie_html/<中文名>_<YYYYMMDD_HHMMSS>.html
  for (const c of [DIET13[0], DIET13[12]]) {
    const dir = fresh('d-' + c.key);
    const r = run(BIN_AFTER, c.key, c.params, dir, null);
    const p = r.env && r.env.delivery ? r.env.delivery.path : null;
    const okDir = p !== null && p.includes(join(dir, 'calorie_html'));
    const okName = p !== null && /_\d{8}_\d{6}\.html$/.test(p);
    const onDisk = p !== null && existsSync(p);
    const html = onDisk ? readFileSync(p, 'utf8') : '';
    console.log(`DEF key=${c.key} exit=${r.status} dirOk=${okDir ? 1 : 0} nameOk=${okName ? 1 : 0} onDisk=${onDisk ? 1 : 0} bytes=${Buffer.byteLength(html, 'utf8')} strict=${Object.values(STRICT).every((f) => f(html)) ? 1 : 0} path=${p}`);
  }
}

/* ── B46：命令集闭包（不需要参数，逐条可判） ───────────────────────────────── */
async function groupB() {
  const keysMod = await import('file://' + resolve('packages/skill-calorie/dist/cli/keys.js').replace(/\\/g, '/'));
  const recMod = await import('file://' + resolve('packages/skill-calorie/dist/diet/receipt.js').replace(/\\/g, '/'));
  const all = Object.keys(keysMod.CALORIE_WRITE_COMBOS);
  let dietMembers = 0; let othersEarlyNull = 0; let bad = 0;
  for (const key of all) {
    let early = null;
    try { const v = recMod.dietReceiptDoc(key, {}, null, null); early = v === null ? 'null' : 'value'; }
    catch { early = 'throw'; }
    const isDiet = early === 'throw';
    if (isDiet) dietMembers++; else if (early === 'null') othersEarlyNull++;
    if (early === 'value') bad++;
    console.log(`B46 key=${key} earlyReturn=${early}`);
  }
  console.log(`RESULT: B46 total=${all.length} dietMembers=${dietMembers} othersEarlyNull=${othersEarlyNull} valueReturned=${bad}`);
}

/* ── CMP：before / after 逐字节归一比对 ──────────────────────────────────── */
function runSide(bin, c, tag) {
  const dir = fresh(tag + '-' + c.key);
  const out = join(dir, 'receipt.html');
  let params = c.params; if (c.idOf) params = c.mk(0);
  if (c.pre) {
    const pre = run(bin, c.pre[0], c.pre[1], dir, null);
    if (pre.status !== 0 || pre.env === null) return { exit: 'pre-' + pre.status, html: null };
    if (c.idOf) params = c.mk(pre.env.data.receipt.recordId);
  }
  const r = run(bin, c.key, params, dir, out);
  const html = existsSync(out) ? readFileSync(out, 'utf8') : null;
  return { exit: r.status, html: html === null ? null : norm(html, dir), bytes: html === null ? 0 : Buffer.byteLength(html, 'utf8') };
}

function groupC() {
  if (!existsSync(BIN_BEFORE)) { console.log('RESULT: CMP skipped=1 reason=no-before-tree'); return; }
  let changed = 0; let same = 0; let fail = 0;
  for (const c of [...DIET13, ...OTHERS]) {
    const a = runSide(BIN_AFTER, c, 'ca');
    const b = runSide(BIN_BEFORE, c, 'cb');
    if (a.html === null || b.html === null || a.exit !== 0 || b.exit !== 0) {
      fail++; console.log(`CMP key=${c.key} FAIL afterExit=${a.exit} beforeExit=${b.exit} afterBytes=${a.bytes} beforeBytes=${b.bytes}`);
      continue;
    }
    const same0 = a.html === b.html;
    if (same0) same++; else changed++;
    console.log(`CMP key=${c.key} same=${same0 ? 1 : 0} afterBytes=${a.bytes} beforeBytes=${b.bytes} shaAfter16=${sha16(a.html)} shaBefore16=${sha16(b.html)}`);
  }
  console.log(`RESULT: CMP changed=${changed} same=${same} fail=${fail}`);
}

/* ── INJ：取数失败注入 ─────────────────────────────────────────────────── */
function groupInj() {
  let blocked = 0; let noDoc = 0;
  for (const c of DIET13) {
    const dir = fresh('i-' + c.key);
    writeFileSync(join(dir, 'calorie_data.db'), 'this is not a sqlite database at all\n'.repeat(20));
    const out = join(dir, 'receipt.html');
    const r = run(BIN_AFTER, c.key, c.params, dir, out);
    const html = existsSync(out) ? readFileSync(out, 'utf8') : '';
    const isDoc = Object.values(STRICT).every((f) => f(html));
    if (r.status !== 0) blocked++;
    if (!isDoc) noDoc++;
    console.log(`INJ key=${c.key} exit=${r.status} fileWritten=${html === '' ? 0 : 1} fullDoc=${isDoc ? 1 : 0} err=${r.errLine ?? '-'}`);
  }
  // 落点非法（父路径是一个文件）
  const dir = fresh('i-badout');
  writeFileSync(join(dir, 'blocker'), 'x');
  const bad = join(dir, 'blocker', 'receipt.html');
  const r = run(BIN_AFTER, 'calorie.diet.add', FOOD, dir, bad);
  console.log(`INJ key=calorie.diet.add.badOut exit=${r.status} fileWritten=${existsSync(bad) ? 1 : 0} err=${r.errLine ?? '-'}`);
  console.log(`RESULT: INJ blocked=${blocked}/13 noFullDoc=${noDoc}/13 badOutExit=${r.status}`);
}

const mode = process.argv[2] ?? 'after';
const groups = new Set((process.argv[3] ?? 'a,b,c,inj').split(','));
console.log(`SHA sources: HEAD=${process.env.PIN_HEAD ?? '?'} BIN_AFTER=${BIN_AFTER} BIN_BEFORE=${BIN_BEFORE}`);
for (const f of ['packages/skill-calorie/src/diet/receipt.ts', 'packages/skill-calorie/src/cli/write.ts',
  'packages/skill-calorie/test/profile-doc-179.test.mjs', 'packages/skill-calorie/test/delivery-83.test.mjs',
  'packages/skill-calorie/test/calorie-c43.test.mjs']) {
  const p = resolve(f);
  console.log(`SRC sha256=${existsSync(p) ? sha(readFileSync(p)) : 'ABSENT'} file=${f}`);
}
// 产出备查
mkdirSync(join(ROOT, 'w'), { recursive: true });
if (groups.has('a')) groupA();
if (groups.has('b')) await groupB();
if (groups.has('c') && mode === 'both') groupC();
if (groups.has('inj')) groupInj();
console.log('RESULT: PROBE-DONE');
