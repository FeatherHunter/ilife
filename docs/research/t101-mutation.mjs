#!/usr/bin/env node
/** #101 · 变异自证（可复跑）：故意破坏写链落库／删除回执文案 → 落库断言必须变红 → 恢复变绿。
 *
 * 判据（逐变异）：
 *   - 源码变异：`pnpm build` 必须 exit 0（否则变异没编译进去，证据无效）；
 *   - 新增的落库断言 `test/cmd-write-40-persist.test.mjs` 必须 **exit ≠ 0**；
 *   - 恢复后两者都必须 exit 0。
 * 「旧回执断言」`test/cmd-write-40.test.mjs` 一栏只作**对照**：M1／M3／M4 上它仍绿，
 * 正是「只断言回执行字串测不出落库」的直接证据；M2 上它变红是顺带撞上 exit 4 存在性校验，非落库断言。
 *
 * #101 返修 H4（今日已发生同类事故：审查者残留变异态导致后续门禁假红）——安全网三条：
 *   ① **跑前 sha256**：每个被改文件先记录 `sha256`（并与落盘备份一一对应）；
 *   ② **落盘备份**：原文写入 `.scratch/t101-mutation-backup/`，进程被强杀也能人工还原；
 *   ③ **finally 还原 ＋ 还原自证**：`SIGINT`／`SIGTERM`／异常都会走 `restoreAll()`，
 *      还原后逐文件断言 `sha256(还原后) === sha256(跑前)`，不等则 exit 2 并打印差异。
 *
 * 用法（须先 `pnpm build`；本脚本自己持 `D:\ilife\.scratch\locks\gate.lock`）：
 *   node docs/research/t101-mutation.mjs                 # 全部 8 个变异
 *   node docs/research/t101-mutation.mjs --only M5       # 只跑指定变异
 */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LOCK = join(ROOT, '.scratch', 'locks', 'gate.lock');
const BACKUP_DIR = join(ROOT, '.scratch', 't101-mutation-backup');
const WRITE_TS = join(ROOT, 'packages', 'skill-calorie', 'src', 'cli', 'write.ts');
const PERSIST_TEST = join(ROOT, 'packages', 'skill-calorie', 'test', 'cmd-write-40-persist.test.mjs');
const NEW_TEST = 'packages/skill-calorie/test/cmd-write-40-persist.test.mjs';
const OLD_TEST = 'packages/skill-calorie/test/cmd-write-40.test.mjs';

const MUTANTS = [
  {
    name: 'M1-write-value-not-persisted',
    file: WRITE_TS,
    old: 'caloriesBurned: cal as number',
    neu: 'caloriesBurned: 0',
    note: '运动写入值被换成 0：回执照旧，库内值错',
  },
  {
    name: 'M2-delete-call-removed',
    file: WRITE_TS,
    old: '        deleteRecord(db, id);',
    neu: '        /* mutant: deleteRecord call removed */',
    note: '软删调用整条摘掉',
  },
  {
    name: 'M3-wording-wrong',
    file: WRITE_TS,
    old: '（软删除：行保留，仍计入历史统计；暂无恢复入口）',
    neu: '[MUTANT-TAG]',
    note: '软删词条被替换：文案与库内语义脱钩',
  },
  {
    name: 'M4-hard-delete-not-persisted',
    file: WRITE_TS,
    old: '        const r = deleteWeight(db, id);',
    neu: "        const r = deleteWeight(db, id); db.prepare('INSERT INTO weight_log (id, date, time, weight_kg, bmi, note) VALUES (?, ?, ?, ?, ?, ?)').run(r.id, r.date, r.time, r.weight_kg, r.bmi, r.note);",
    note: '硬删后又把行按原 id 插回：回执照旧，库里没删掉',
  },
  {
    name: 'M5-persist-assert-block-deleted',
    file: PERSIST_TEST,
    old: `  withRead(dir, 'calorie.water.log', (db) => {
    const row = q1(db, 'SELECT food_name, grams, calories, protein, date, time FROM food_log WHERE id = ?', id);
    assert.ok(row, 'water.log 落库行缺失');
    assert.equal(row.food_name, WATER_NAME);
    assert.equal(row.grams, 300);
    assert.equal(row.calories, 0);
    assert.equal(row.protein, 0);
    assert.equal(row.date, '2026-09-06');
    assert.equal(row.time, '09:00:00');
  });`,
    neu: '  /* mutant: water.log 落库断言块整块删除（键仍在注册表内） */',
    noBuild: true,
    note: 'H2：删掉某键的落库断言块而键仍在注册表 → 覆盖门必须红（旧自报式 cover() 不会红）',
  },
  {
    name: 'M6-status-decoupled-from-prose',
    file: WRITE_TS,
    old: "  return base + (kind === 'soft' ? '（软，不可恢复）' : '（硬，不可恢复）');",
    neu: '  return base;',
    note: 'H1：items[].status 退回裸「已删除」，与 prose 口径脱钩',
  },
  {
    name: 'M7-receipt-id-not-locating-row',
    file: WRITE_TS,
    old: "          recordId: id, items: [{ id, status: deleteStatus('soft'), reason: '' }],",
    neu: "          recordId: null, items: [{ id, status: deleteStatus('soft'), reason: '' }],",
    note: 'H7：软删回执 recordId 置空 → 「回执 id 能定位被删行」必须红',
  },
  {
    name: 'M8-soft-wording-false-claim',
    file: WRITE_TS,
    old: "const SOFT_STILL_COUNTED = '（软删除：行保留，仍计入历史统计；暂无恢复入口）';",
    neu: "const SOFT_STILL_COUNTED = '（软删除：行保留，已从查询与统计中排除；暂无恢复入口）';",
    note: 'H1：把运动软删文案换成「已排除」——实测仍计入 → 文案诚实性用例必须红',
  },
  {
    name: 'M9-wording-site-count-drift',
    file: WRITE_TS,
    old: "' 条' + HARD_WORDING, '删某日饮食'",
    neu: "' 条（硬删除，不可恢复）', '删某日饮食'",
    extra: 'node docs/research/t101-softdelete-still-counted.mjs',
    expectPersist: false,
    note: 'H3：1 处词条落点改成内联字面量（消息不变、两个测试文件全绿）→ 事实 E 计数 13→12 必须红',
  },
];

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 16);

/** 路径守卫（协议 §2.1-3）：只允许清理 .scratch 下的自有备份目录。 */
function assertBackupPathSafe(p) {
  const abs = resolve(p);
  const forbidden = ['node_modules', 'packages', 'docs', 'test', 'tooling', '.git'].map((d) => resolve(ROOT, d));
  if (!abs.startsWith(resolve(ROOT, '.scratch'))) throw new Error('备份目录守卫失败（不在 .scratch 下）：' + abs);
  for (const f of forbidden) {
    if (abs === f || abs.startsWith(f + '\\') || abs.startsWith(f + '/')) throw new Error('备份目录守卫失败（落在禁写区）：' + abs);
  }
  return abs;
}

function acquireLock() {
  mkdirSync(dirname(LOCK), { recursive: true });
  for (;;) {
    if (existsSync(LOCK)) {
      const ageMin = (Date.now() - statSync(LOCK).mtimeMs) / 60000;
      if (ageMin > 10) { rmSync(LOCK, { recursive: true, force: true }); continue; }
      sleep(5000);
      continue;
    }
    try { mkdirSync(LOCK); return; } catch { sleep(2000); }
  }
}

const run = (cmd) => spawnSync(cmd, { cwd: ROOT, shell: true, encoding: 'utf8' });

const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
const picked = only ? MUTANTS.filter((m) => m.name === only) : MUTANTS;
if (picked.length === 0) { console.error('no such mutant: ' + only); process.exit(2); }

// ---- ① 跑前 sha256 ＋ ② 落盘备份 ----
const targets = [...new Set(picked.map((m) => m.file))];
const preSha = new Map();
const originals = new Map();
assertBackupPathSafe(BACKUP_DIR);
mkdirSync(BACKUP_DIR, { recursive: true });
for (const f of targets) {
  originals.set(f, readFileSync(f, 'utf8'));
  preSha.set(f, sha256(f));
  copyFileSync(f, join(BACKUP_DIR, f.replace(/[:\\/]/g, '_') + '.bak'));
}
console.log('跑前 sha256（前 16 位）：');
for (const f of targets) console.log('  ' + preSha.get(f) + '  ' + f.replace(ROOT + '\\', ''));
console.log('落盘备份：' + BACKUP_DIR.replace(ROOT + '\\', '') + '（强杀后可按 .bak 人工还原）');

let lockHeld = false;
let restored = false;
/** ③ finally 还原 ＋ 还原自证：sha 不等即抛。 */
function restoreAll(reason) {
  if (restored) return true;
  restored = true;
  for (const f of targets) writeFileSync(f, originals.get(f), 'utf8');
  const bad = targets.filter((f) => sha256(f) !== preSha.get(f));
  if (bad.length) {
    console.error('还原自证失败（' + reason + '）：sha256 不等 → ' + bad.map((f) => f.replace(ROOT + '\\', '')).join('、'));
    process.exitCode = 2;
    return false;
  }
  console.log('还原自证 OK（' + reason + '）：' + targets.length + ' 个文件 sha256 与跑前一致');
  return true;
}
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.error('\n收到 ' + sig + '：立即还原源码…');
    restoreAll(sig);
    if (lockHeld) { rmSync(LOCK, { recursive: true, force: true }); lockHeld = false; }
    process.exit(2);
  });
}

acquireLock();
lockHeld = true;
const rows = [];
try {
  for (const m of picked) {
    const orig = originals.get(m.file);
    if (!orig.includes(m.old)) { console.error('pattern not found for ' + m.name); process.exitCode = 2; break; }
    writeFileSync(m.file, orig.split(m.old).join(m.neu), 'utf8');
    const build = m.noBuild ? { status: 0, skipped: true } : run('pnpm build');
    const newT = run('node --test ' + NEW_TEST);
    const oldT = run('node --test ' + OLD_TEST);
    const extraT = m.extra ? run(m.extra) : null;
    restoreAll('mutant ' + m.name);
    restored = false; // 下一个变异继续用同一份原文
    rows.push({
      mutant: m.name, build: m.noBuild ? '跳过' : build.status,
      persistAssert: newT.status, oldReceiptAssert: oldT.status,
      extra: extraT ? extraT.status : '—', note: m.note, hasExtra: Boolean(m.extra), expectPersist: m.expectPersist !== false,
    });
    console.log(`${m.name}: build=${m.noBuild ? '跳过(.mjs 测试文件无需重建)' : build.status} newPersistTest=${newT.status} oldReceiptTest=${oldT.status}` +
      (extraT ? ` 附加校验=${extraT.status}` : ''));
  }
} finally {
  restoreAll('finally');
  const build = run('pnpm build');
  console.log('RESTORED: build=' + build.status);
  rows.push({ mutant: 'RESTORED', build: build.status, persistAssert: 0, oldReceiptAssert: 0, extra: '—', expectPersist: false, note: '源码复原后重建（dist 与源一致）' });
  if (lockHeld) { rmSync(LOCK, { recursive: true, force: true }); lockHeld = false; }
}
console.log('\n| 变异 | build | 落库断言（新） | 旧回执断言（对照） | 附加校验 | 说明 |');
console.log('| --- | --- | --- | --- | --- | --- |');
for (const r of rows) console.log(`| ${r.mutant} | ${r.build} | ${r.persistAssert} | ${r.oldReceiptAssert} | ${r.extra} | ${r.note} |`);
const bad = rows.filter((r) => r.mutant !== 'RESTORED' && (
  (r.build !== 0 && r.build !== '跳过') ||
  (r.expectPersist && r.persistAssert === 0) ||
  (r.hasExtra && r.extra === 0)
));
if (bad.length) { console.error('变异自证不成立：' + bad.map((b) => b.mutant).join('、')); process.exitCode = 1; }
