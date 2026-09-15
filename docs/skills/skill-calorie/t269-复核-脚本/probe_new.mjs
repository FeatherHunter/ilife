/** #269 收口复核（本席）· 新探针（专打「作者脚本自我满足」的盲区）。
 *  用法（持锁窗口内）：node .scratch/t269r/probe_new.mjs <组>  组∈ set|empty|stub|all
 *  不引用作者任何脚本。
 *
 *  SET    ：当刻命令册里的**写命令全表**（从 dist/cli/keys.js 现取，不用任何手抄名单）
 *           ＋ 14 条饮食键的现取对照（从 dist/diet/receipt.js 的闭包行为反推，不用源码字面量）。
 *  EMPTY  ：**空库**下逐条跑饮食写命令——断言「非 0 退出 ＋ 不留任何产物文件 ＋ stdout 给出 ERR 行」。
 *           这是作者的脚本完全没走的一条路（它只跑通顺路径）。
 *  BADOUT ：`--html` 落点非法（父路径是普通文件）——断言非 0 退出且不落半成品。作者也没走。
 *  STUB   ：把**编译产物**里那一跳（dietReceiptDoc）换成打标记的桩，再逐条跑写命令：
 *           ① 非饮食命令的产物里出现标记 ⇒ 那一跳在非饮食侧被摸到了（真泄漏）；
 *           ② 饮食命令的产物里出现标记 ⇒ 桩确实生效（反向自证，防「桩没生效却说没泄漏」）。
 *           跑完由 windowE.ps1 逐字节取回并断言 sha 相等。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve('.scratch/t269r');
const BIN = process.env.PROBE_BIN ? resolve(process.env.PROBE_BIN) : resolve('packages/skill-calorie/dist/cli/cmd_read.js');
const MARK = 'ZZT269R-HOP-REACHED-ZZ';
const FOOD = { foodName: '鸡胸', calories: 200, protein: 35, date: '2026-09-08', time: '08:00:00' };
const PROD = { productName: '燕麦片', calories: 389, protein: 13, fat: 7, carbohydrates: 66, sodium: 5 };

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
const strictFails = (h) => Object.entries(STRICT).filter(([, f]) => !f(h)).map(([k]) => k);

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
/* 第 14 条：作者把它排除在「13 条」之外，但 #496 之后它已经接进整页装配。
   本席单独取它的读数，口径照实写，不把它算进 13 条判据。 */
const IMPORT14 = { key: 'calorie.product.import', params: { items: [{ productName: '牛奶', calories: 54, protein: 3, fat: 3, carbohydrates: 5, sodium: 60 }] } };

/* 非饮食侧抽样 12 条：覆盖**全部 9 个非饮食域**，且刻意分落在装配链的不同位置。
   选它的理由：本票只改装配链上那一跳，最该证明「那一跳摘掉，这些键一个字节都不变」。 */
const SAMPLE = [
  { key: 'calorie.profile.set', params: { heightCm: 175, age: 30, gender: '男', activityLevel: '中度' }, why: '档案域·链首口' },
  { key: 'calorie.profile.update', params: { fields: { heightCm: 174, note: '改过一次' } }, why: '档案域·链首第二口' },
  { key: 'calorie.profile.activity', params: { activityLevel: '高度' }, why: '档案域·活跃度口' },
  { key: 'calorie.weight.log', params: { kg: 70.2, date: '2026-09-06', time: '07:00:00' }, why: '体重域·链后段（另有整页口）' },
  { key: 'calorie.weight.batch', params: { items: [{ kg: 70.1, date: '2026-09-07' }] }, why: '体重域·批量口' },
  { key: 'calorie.body.measure-add', params: { waistCm: 85, date: '2026-09-06' }, why: '身体域·链末段（另有整页口）' },
  { key: 'calorie.body.composition-add', params: { bodyFatPct: 21.5, date: '2026-09-06' }, why: '身体域·成分口' },
  { key: 'calorie.goal.set', params: { calorie: 1800, protein: 150, carbs: 200, fat: 50 }, why: '目标域·落旧片段回退面' },
  { key: 'calorie.goal.water', params: { water: 2000 }, why: '目标域·落旧片段回退面' },
  { key: 'calorie.exercise.add', params: { type: '慢跑', calories: 320, minutes: 30, date: '2026-09-06' }, why: '运动域·中段' },
  { key: 'calorie.photo.add', params: { date: '2026-09-06', angle: '正脸' }, why: '照片域·链上另一段' },
  { key: 'calorie.workout.plan-set', params: { day: '周一', movement: '卧推', sets: 4, reps: 8 }, why: '训练计划域·链上另一段' },
];

const norm = (s, dir) => String(s)
  .split(dir).join('<DIR>')
  .split(dir.replace(/\\/g, '/')).join('<DIR>')
  .split(MARK).join('<MARK>')
  .replace(/\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/g, '<TS>')
  .replace(/\d{2}:\d{2}:\d{2}/g, '<TS>')
  .replace(/_\d{8}_\d{6}/g, '_<TS>');

function run(key, params, dir, htmlOut) {
  const args = [BIN, key, '--params', JSON.stringify(params ?? {})];
  if (htmlOut) args.push('--html', htmlOut);
  const r = spawnSync(process.execPath, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, SKILLS_DB_PATH: dir } });
  let env = null; try { env = JSON.parse(String(r.stdout)); } catch { env = null; }
  const errLine = (String(r.stdout).match(/^ERR \d+:[^\n]*/m) ?? String(r.stderr).match(/^ERR \d+:[^\n]*/m) ?? [null])[0];
  return { status: r.status, env, errLine };
}
function fresh(tag) {
  const dir = join(ROOT, 'wn', tag);
  rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
  mkdirSync(dir, { recursive: true });
  return dir;
}
/* ── SET：命令面现取 + 饮食键对照 ───────────────────────────────────────── */
async function groupSet() {
  const keysMod = await import('file://' + resolve('packages/skill-calorie/dist/cli/keys.js').replace(/\\/g, '/'));
  const recMod = await import('file://' + resolve('packages/skill-calorie/dist/diet/receipt.js').replace(/\\/g, '/'));
  const all = Object.keys(keysMod.CALORIE_WRITE_COMBOS ?? {});
  const diet = [];
  const others = [];
  for (const k of all) {
    let early;
    try { early = recMod.dietReceiptDoc(k, {}, null, null) === null ? 'null' : 'value'; } catch { early = 'throw'; }
    (early === 'throw' ? diet : others).push(k);
    if (early === 'value') console.log(`SET key=${k} earlyReturn=value  ← 异常：既没早退也没抛`);
  }
  console.log(`SET writeKeys=${all.length}`);
  console.log(`SET dietMembers=${diet.length} :: ${diet.join(' ')}`);
  console.log(`SET othersEarlyNull=${others.length} :: ${others.join(' ')}`);
  console.log(`RESULT: SET total=${all.length} dietMembers=${diet.length} othersEarlyNull=${others.length} valueReturned=${all.length - diet.length - others.length}`);
}

/* ── EMPTY / BADOUT ────────────────────────────────────────────────────── */
function listArtifacts(dir) {
  const p = join(dir, 'calorie_html');
  if (!existsSync(p)) return [];
  const out = [];
  for (const f of readdirSync(p)) out.push(f);
  return out;
}
function groupEmpty() {
  const list = [...DIET13, IMPORT14];
  let blocked = 0; let clean = 0; let errShaped = 0;
  for (const c of list) {
    const dir = fresh('e-' + c.key);
    const out = join(dir, 'receipt.html');
    const r = run(c.key, c.params, dir, out);
    const wrote = existsSync(out);
    const arts = listArtifacts(dir);
    const blockedOk = r.status !== 0;
    const cleanOk = !wrote && arts.length === 0;
    const errOk = typeof r.errLine === 'string' && /^ERR \d+:/.test(r.errLine);
    if (blockedOk) blocked++;
    if (cleanOk) clean++;
    if (errOk) errShaped++;
    console.log(`EMPTY key=${c.key} exit=${r.status} artifactWritten=${wrote ? 1 : 0} artifacts=${arts.length} errOk=${errOk ? 1 : 0} err=${r.errLine ?? '-'}`);
  }
  console.log(`RESULT: EMPTY n=${list.length} blocked=${blocked}/${list.length} noArtifact=${clean}/${list.length} errShaped=${errShaped}/${list.length}`);
}
function groupBadOut() {
  const dir = fresh('badout');
  writeFileSync(join(dir, 'blocker'), 'x');
  const bad = join(dir, 'blocker', 'receipt.html');
  const r = run('calorie.diet.add', FOOD, dir, bad);
  const arts = listArtifacts(dir);
  console.log(`BADOUT exit=${r.status} fileWritten=${existsSync(bad) ? 1 : 0} artifacts=${arts.length} err=${r.errLine ?? '-'} stdoutHead=${JSON.stringify(String(r.status))}`);
  console.log(`RESULT: BADOUT exit=${r.status} blocked=${r.status !== 0 ? 1 : 0} noArtifact=${arts.length === 0 ? 1 : 0}`);
}

/* ── STUB：把那一跳换成打标记的桩，看谁被摸到 ─────────────────────────── */
function groupStub() {
  const list = [...DIET13, IMPORT14, ...SAMPLE];
  let dietMarked = 0; let otherMarked = 0; let otherRuns = 0; let dietRuns = 0;
  for (const c of list) {
    const isDiet = c.key.startsWith('calorie.diet.') || c.key === 'calorie.product.add'
      || c.key === 'calorie.product.update' || c.key === 'calorie.product.deprecate'
      || c.key === 'calorie.product.import' || c.key === 'calorie.water.log';
    const dir = fresh('s-' + c.key);
    const out = join(dir, 'receipt.html');
    let params = c.params; let pre = null;
    if (c.pre) {
      pre = run(c.pre[0], c.pre[1], dir, null);
      if (pre.status !== 0 || pre.env === null) { console.log(`STUB key=${c.key} exit=pre-${pre.status} marked=-`); continue; }
      if (c.idOf) params = c.mk(pre.env.data.receipt.recordId);
    }
    const r = run(c.key, params, dir, out);
    const html = existsSync(out) ? readFileSync(out, 'utf8') : '';
    const marked = html.includes(MARK);
    if (isDiet) { dietRuns++; if (marked) dietMarked++; } else { otherRuns++; if (marked) otherMarked++; }
    console.log(`STUB key=${c.key} side=${isDiet ? 'diet' : 'other'} exit=${r.status} bytes=${Buffer.byteLength(html, 'utf8')} marked=${marked ? 1 : 0}`);
  }
  console.log(`RESULT: STUB dietRuns=${dietRuns} dietMarked=${dietMarked} otherRuns=${otherRuns} otherMarked=${otherMarked}`);
}

/* ── 采样集（SAMPLE ＋ 13 条饮食）供前后逐字节比对 ─────────────────────── */
function groupSample(mode) {
  const list = [...DIET13.map((c) => ({ ...c, side: 'diet13' })), ...SAMPLE.map((c) => ({ ...c, side: 'other' }))];
  const res = {};
  for (const c of list) {
    const dir = fresh(`sm${mode}-` + c.key);
    const out = join(dir, 'receipt.html');
    let params = c.params; let preExit = null;
    if (c.pre) {
      const pre = run(c.pre[0], c.pre[1], dir, null);
      preExit = pre.status;
      if (pre.status !== 0 || pre.env === null) { res[c.key] = { side: c.side, exit: 'pre-' + pre.status, bytes: 0, norm: null }; console.log(`SMP key=${c.key} exit=pre-${pre.status}`); continue; }
      if (c.idOf) params = c.mk(pre.env.data.receipt.recordId);
    }
    const r = run(c.key, params, dir, out);
    const html = existsSync(out) ? readFileSync(out, 'utf8') : '';
    const strict = html === '' ? null : strictFails(html);
    res[c.key] = { side: c.side, exit: r.status, preExit, bytes: Buffer.byteLength(html, 'utf8'), norm: html === '' ? null : norm(html, dir), marked: html.includes(MARK), template: r.env && r.env.delivery ? r.env.delivery.template : null, strictFails: strict };
    console.log(`SMP key=${c.key} side=${c.side} exit=${r.status} bytes=${res[c.key].bytes} template=${res[c.key].template} strictFails=${strict === null ? '-' : (strict.length === 0 ? 0 : strict.join('|'))}`);
  }
  writeFileSync(join(ROOT, `wn/sample-${mode}.json`), JSON.stringify(res, null, 1), 'utf8');
  const bad = Object.values(res).filter((v) => v.exit !== 0).length;
  console.log(`RESULT: SMP mode=${mode} n=${list.length} nonzero=${bad} json=.scratch/t269r/wn/sample-${mode}.json`);
}

const which = process.argv[2] ?? 'set';
if (which === 'set' || which === 'all') await groupSet();
if (which === 'empty' || which === 'all') groupEmpty();
if (which === 'badout' || which === 'all') groupBadOut();
if (which === 'stub') groupStub();
if (which === 'sample') groupSample(process.argv[3] ?? 'after');
console.log('RESULT: PROBE-NEW-DONE');
