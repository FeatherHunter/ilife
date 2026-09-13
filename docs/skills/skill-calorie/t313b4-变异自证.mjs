#!/usr/bin/env node
/**
 * #313b4 · 变异自证 —— t293 探针的「路由归类」判据**真能被打红**（`#313` 收口席）。
 *
 * 要证的事：`docs/skills/skill-calorie/t293-验收-命令自治.mjs` 里「路由归派生侧」不是硬写一句话，
 * 而是五条机械判据（生成 banner／在 gen-cli 的 targets 数组里／gen-routes 靠声明源清单出声／
 * 声明源齐／记录面真落在这里）钉住的——**改动对应事实，判据必须变红**。
 *
 * 跑法（持锁；本件自己会 spawn 探针，故**不要**在探针外面再套一层 run-locked）：
 *   node tooling/run-locked.mjs --ticket 313b4 -- node docs/skills/skill-calorie/t313b4-变异自证.mjs
 *
 * 判红口径：看 P1 的**判据行**（不是只看状态）——因为变异同时会让沙箱基线变脏（那也判红，
 * 但那是另一条判据），所以每个变异都断言「该判据自己的话」出现在 P1 输出里。
 *
 * 纪律：只在仓内**临时**改一处 → 跑探针 → **无条件还原**（`finally`）→ 核对 sha256 与原字节一致
 * ＋ `git status --short -- <那件>` 为空；备份同时落 `.scratch/t313b4/mut-backup/`，本件启动时先做
 * 崩溃恢复（有残留备份就先还原），不留半个变异在仓里。
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..', '..');
const PROBE = join(HERE, 't293-验收-命令自治.mjs');
const BACKUP_DIR = join(REPO, '.scratch', 't313b4', 'mut-backup');

const GEN_CLI = 'packages/skill-calorie/scripts/gen-cli.mjs';
const ROUTES_GEN = 'packages/skill-calorie/src/triggers/routes.generated.ts';

/** 变异表：每条的「改什么→原字节→新字节→必须出现的判据行」。 */
const MUTATIONS = [
  {
    id: 'M1',
    what: '把 routes.generated.ts 从 gen-cli 的 targets 数组里摘掉',
    file: GEN_CLI,
    from: "    { path: join(SRC_DIR, 'triggers', 'routes.generated.ts'), text: await renderRoutesGenerated() },\n",
    to: '',
    mustSee: '不在 gen-cli 的 `targets` 数组里',
    why: '判据 b（`pnpm gen:check` 真覆盖它）会不成立 ⇒ 路由整面落 ③ UNACCOUNTED ⇒ P1=FAIL',
  },
  {
    id: 'M2',
    what: '改掉生成物的生成 banner（生成 → 产出）',
    file: ROUTES_GEN,
    from: '本文件由 `scripts/gen-routes.mjs` 生成，勿手改',
    to: '本文件由 `scripts/gen-routes.mjs` 产出，勿手改',
    mustSee: '生成物没有生成 banner',
    why: '判据 a（生成物自证是派生件）会不成立 ⇒ P1=FAIL',
  },
];

const abs = (p) => join(REPO, p);
const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const backupPath = (p) => join(BACKUP_DIR, p.replace(/[\\/]/g, '__') + '.bak');
const gitStatus = (p) => {
  const r = spawnSync('git', ['-C', REPO, 'status', '--short', '--', p], { encoding: 'utf8' });
  return (r.stdout || '').trim();
};

/** 崩溃恢复：启动时若见残留备份 ⇒ 先还原（不解释、不合并，逐字节写回）。 */
function recoverLeftovers() {
  const recovered = [];
  for (const m of MUTATIONS) {
    const b = backupPath(m.file);
    if (!existsSync(b)) continue;
    const saved = readFileSync(b);
    if (sha(readFileSync(abs(m.file))) !== sha(saved)) {
      writeFileSync(abs(m.file), saved);
      recovered.push(m.file);
    }
    rmSync(b, { force: true });
  }
  return recovered;
}

function runProbe() {
  const r = spawnSync(process.execPath, [PROBE, '--json'], { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28 });
  const line = (r.stdout || '').split('\n').filter((l) => l.trim().startsWith('{')).pop();
  let report = null;
  try { report = JSON.parse(line); } catch { /* 下面按 failed 报 */ }
  return { exit: r.status, report, raw: (r.stdout || '') + (r.stderr || '') };
}

function applyMutation(m) {
  const before = readFileSync(abs(m.file));
  const text = before.toString('utf8');
  const nth = text.split(m.from).length - 1;
  if (nth !== 1) throw new Error(`${m.id}：锚串在 ${m.file} 里出现 ${nth} 次（要求恰 1 次），不敢改`);
  writeFileSync(abs(m.file), text.replace(m.from, m.to), 'utf8');
  return before;
}

const results = [];
mkdirSync(BACKUP_DIR, { recursive: true });
const recovered = recoverLeftovers();
if (recovered.length) console.log('启动恢复（上一轮残留）：' + recovered.join('、'));

for (const m of MUTATIONS) {
  const before = applyMutation(m);
  writeFileSync(backupPath(m.file), before);   // 落盘备份：进程被杀也能恢复
  let status = 'ERROR';
  let p1 = null;
  let seen = false;
  let baselineDirtySeen = false;
  try {
    const got = runProbe();
    p1 = got.report?.results?.P1 ?? null;
    const lines = p1?.lines ?? [];
    seen = lines.some((l) => l.includes(m.mustSee));
    // 附带观测：这个变异是否**同时**把沙箱基线弄脏（那条今天也判红——见 B-3 §⑥1）。
    // M1 期望 false（靶心只是归类判据）；M2 期望 true（改坏了生成物 ⇒ gen:check 也不一致）。
    baselineDirtySeen = lines.some((l) => l.includes('基线不为 0'));
    const unacct = lines.find((l) => l.includes('路由归类判据不成立')) ?? '';
    status = p1?.status === 'FAIL' && seen ? 'RED-AS-EXPECTED' : 'NOT-RED!!!';
    results.push({ id: m.id, what: m.what, file: m.file, probeExit: got.exit, p1Status: p1?.status ?? '(无)', criterionSeen: seen, baselineDirtySeen, unacctLine: unacct.slice(0, 200), status });
  } finally {
    writeFileSync(abs(m.file), before);                       // 无条件还原（逐字节）
    const same = sha(readFileSync(abs(m.file))) === sha(before);
    rmSync(backupPath(m.file), { force: true });
    const st = gitStatus(m.file);
    results[results.length - 1] = { ...results[results.length - 1], restoredByteIdentical: same, gitStatusClean: st === '', gitStatus: st };
    console.log(`  [${m.id}] 还原：逐字节一致=${same}；git status 干净=${st === ''}${st ? '（' + st + '）' : ''}`);
  }
  if (!p1) { console.log(`  [${m.id}] 探针没吐出可解析的 JSON ⇒ 见上日志`); }
}

console.log('');
console.log('=== #313b4 变异自证：t293 路由归类判据 ===');
let allOk = true;
for (const r of results) {
  const ok = r.status === 'RED-AS-EXPECTED' && r.restoredByteIdentical && r.gitStatusClean;
  allOk = allOk && ok;
  console.log(`${r.id}: ${r.status} | 探针 P1=${r.p1Status}（exit=${r.probeExit}） | 判据行出现=${r.criterionSeen} | 沙箱基线同时变脏=${r.baselineDirtySeen}`);
  console.log(`  变异：${r.what}（${r.file}）`);
  console.log(`  判据行：${r.unacctLine || '—'}`);
  console.log(`  还原：逐字节一致=${r.restoredByteIdentical} git 干净=${r.gitStatusClean}`);
}
console.log(`VERDICT: ${allOk ? 'OK 两个变异都把归类判据打红且已还原' : 'NOT OK（见上）'}`);
process.exitCode = allOk ? 0 : 1;
