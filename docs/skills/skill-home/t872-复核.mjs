// #872 独立复核器：四条票面判据里的 ② 真链抽查 与 ④ 负向证据（一次跑完，只读生产库）。
//
// 跑法（仓根）：node docs/skills/skill-home/t872-复核.mjs
// 退出码：0＝判据 ②④ 成立；1＝判据不成立（逐条点名）；2＝用法／环境错。
//
// 判据②：在**隔离家目录**（空库）里按契约附录的 70 条场景（key＋preset 从附录读，不手抄）逐条跑真命令链，
//        凡 exit 0 的，回执 `delivery.path` 那份文件必须含 `data-block=`（＝族页）、壳标记已填充、
//        且盘上字节 ＝ 回执 `delivery.bytes`。非 0 的逐类记原因（要多前置实体 id／主密钥／必填参数，
//        属抽查范围外——那 31 条由收口票 #817 的种子库跑批覆盖）。
// 判据④：把某族模板临时改名重跑 → 落回 21 模板分节页（无 `data-block=`）、stderr 有降级 note、
//        退出码仍 0；改回后重跑恢复族页。
//
// 与 `t817-run-70-scenes.mjs` 的分工：那一件是**带种子库**的收口跑批（产物落 `.scratch/817/`）；
// 本件是**空库抽查＋降级探针**，两次都不写生产库与生产产物目录，也不碰 `.scratch/817/`。
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..', '..');
const pkgDir = join(repoRoot, 'packages', 'skill-home');
const bin = join(pkgDir, 'dist', 'cli', 'cmd_read.js');
const appendix = JSON.parse(readFileSync(
  join(here, 'scene-pages-contract.appendix.json'), 'utf8'));

const die = (code, msg) => { console.error(msg); process.exit(code); };
if (!existsSync(bin)) die(2, 'dist 未建：先跑 node node_modules/typescript/bin/tsc -b packages/skill-home');
if (appendix.scenarios.length !== 70) die(2, '附录场景数不是 70：' + appendix.scenarios.length);

const HOME = mkdtempSync(join(tmpdir(), 't872-recheck-'));
const env = homeEnvOf(HOME);
const run = (args) => spawnSync(process.execPath, [bin, ...args], { encoding: 'utf8', env });
const lastJson = (r) => JSON.parse(String(r.stdout).trim().split('\n').pop());

console.log('隔离家目录：' + HOME);
let exit0 = 0;
const notFamily = [];
const nonZero = new Map();
for (const s of appendix.scenarios) {
  const r = run([s.key, '--params', JSON.stringify(s.preset ?? {})]);
  if (r.status !== 0) {
    const why = (String(r.stderr).trim().split('\n')[0] || '(空)').replace(/^ERR \d+: /, '');
    nonZero.set(r.status + ' ' + why, (nonZero.get(r.status + ' ' + why) ?? 0) + 1);
    continue;
  }
  exit0++;
  const e = lastJson(r);
  const p = e.delivery?.path;
  const reasons = [];
  if (typeof p !== 'string' || !existsSync(p)) reasons.push('回执路径不在盘上：' + p);
  else {
    const html = readFileSync(p, 'utf8');
    if (!html.includes('data-block=')) reasons.push('落的是分节页（无 data-block=）');
    if (html.includes('<!--CONTENT-->') || html.includes('<!--SHARED-CSS-->')) reasons.push('壳标记未填充');
    if (statSync(p).size !== e.delivery.bytes) {
      reasons.push('盘上字节 ' + statSync(p).size + ' ≠ 回执 delivery.bytes ' + e.delivery.bytes);
    }
  }
  if (reasons.length) notFamily.push(s.id + ' ' + s.wakeWord + ' ' + s.key + ' → ' + reasons.join('；'));
}
console.log('判据② exit 0 场景：' + exit0 + '/' + appendix.scenarios.length
  + '；其中落盘即族页：' + (exit0 - notFamily.length) + '/' + exit0);
for (const f of notFamily) console.log('  FAIL ' + f);
console.log('判据② 非 0 场景逐类：');
for (const [k, n] of [...nonZero].sort((a, b) => b[1] - a[1])) console.log('  ' + n + ' 条  exit ' + k);

// ── 判据④ 负向证据：族模板改名 → 降级；改回 → 恢复 ──
const tpl = join(pkgDir, 'templates', 'items', 'search_list.html');
const bak = tpl + '.t872bak';
if (existsSync(bak)) die(2, '上一次探针没收拾干净，先人工确认：' + bak);
const probe = () => {
  const r = run(['home.item.search', '--params', '{}']);
  const html = r.status === 0 && r.stdout.trim() ? readFileSync(lastJson(r).delivery.path, 'utf8') : '';
  return { status: r.status, stderr: String(r.stderr ?? ''), isFamily: html.includes('data-block=') };
};
let before = null;
let degraded = null;
let after = null;
try {
  before = probe();
  renameSync(tpl, bak);
  degraded = probe();
} finally {
  if (existsSync(bak)) renameSync(bak, tpl);
  after = probe();
}
const noteOf = (s) => /未命中页族[^\n]*/.exec(s)?.[0] ?? '(无)';
console.log('判据④ 负向证据（族模板改名 → 降级 → 改回 → 恢复）');
console.log('  改名前： exit=' + before.status + ' 族页=' + before.isFamily);
console.log('  改名后： exit=' + degraded.status + ' 族页=' + degraded.isFamily + ' note=' + noteOf(degraded.stderr));
console.log('  改回后： exit=' + after.status + ' 族页=' + after.isFamily);
const negOk = before.isFamily && degraded.status === 0 && !degraded.isFamily
  && /未命中页族/.test(degraded.stderr) && after.isFamily;

const ok = exit0 > 0 && notFamily.length === 0 && negOk;
console.log('RESULT: ' + (ok ? 'PASS（判据 ②④ 成立）' : 'FAIL'));
rmSync(HOME, { recursive: true, force: true });
process.exitCode = ok ? 0 : 1;
