#!/usr/bin/env node
/**
 * docs/agents/t540-指纹绑定.mjs —— 把「编译态」与「产物读数」绑成一个原子读数（票 #540）。
 *
 * 缺口：共享 `dist` 会被并发写者重编，而锁**不覆盖源文件写入** ⇒ 以 `dist` 为前提的门禁读数
 * （真出口跑 CLI、变异两态、产物字节）可能读到**混合态**，出假红假绿。
 *
 * 本脚本给出的判据：**编译窗口内 `src` 一动，本次读数即作废**。
 *   窗口前快照 src 逐件 sha256 → 直调底层编译命令（协议 §2.4.5，**不抢锁**）→ 窗口后重算
 *   ⇒ src 有漂移（改字节／新增／删除）即 exit 1 并**点名那份件**；无漂移且编译过 ⇒ exit 0。
 *   产物侧读数（dist 逐件指纹）与 src 指纹、结论**写在同一行**（`RESULT:`）——
 *   任何人拿这一行就能核对「这份产物读数是哪棵 src 树编出来的」。
 *
 * 用法：
 *   node docs/agents/t540-指纹绑定.mjs --scope packages/skill-calorie
 *   node docs/agents/t540-指纹绑定.mjs --scope packages/skill-calorie --dist-dir packages/skill-calorie/dist
 *   # 反例（可复跑，用来证明这条判据会红）：编译子进程起来后、结束前改动探针件
 *   node docs/agents/t540-指纹绑定.mjs --scope packages/skill-calorie \
 *        --mutate-during-window packages/skill-calorie/src/.t540-窗口探针.txt
 *
 * 选项：
 *   --scope <相对路径>            包作用域（必填）；编译命令＝`node node_modules/typescript/bin/tsc -b <scope>`
 *   --dist-dir <相对路径>         产物目录，缺省 `<scope>/dist`
 *   --mutate-during-window <路径> 反例开关：编译窗口内改写该件（必须落在 `<scope>/src` 之内，
 *                                 且文件名带 `.t540`）。结束时还原并核 sha256（见 `RESTORE:` 行）。
 *   --lock-dir <相对路径>         外层锁目录（读 `owner.json` 取本次窗口的运行标识），缺省 `.scratch/locks`
 *   --log <相对路径>              编译原始输出落盘处，缺省 `.scratch/t540/t540-tsc.log`
 *   --mutate-delay-ms <n>         变异触发延时（毫秒，缺省 250）；编译子进程先吐输出则以输出为准
 *
 * 退出码：0＝指纹一致；1＝窗口内 src 漂移／编译未过／产物为空／还原不一致；2＝用法或守卫失败。
 *
 * 纪律：本脚本**在外层锁窗内被调用**，一律直调底层命令，自己**不抢锁**、不写锁留痕（§2.4.5）。
 * 末行 `GATE-RUN runId=<外层窗口运行标识> cmd=<本脚本命令>` 供 §2.4.2 对账（标识抄自 `<lock-dir>/owner.json`）。
 */
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT_REL = 'docs/agents/t540-指纹绑定.mjs';
const TSC_REL = 'node_modules/typescript/bin/tsc';
const PROBE_MARK = 'T540-PROBE';

const OPTION_SPECS = new Set(['--scope', '--dist-dir', '--mutate-during-window', '--lock-dir', '--log', '--mutate-delay-ms']);

function usage() {
  const text = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
  const block = text.match(/\/\*\*([\s\S]*?)\*\//);
  return block ? block[1].replace(/^\s*\*?/gm, '').trim() : SCRIPT_REL;
}

function parseArgs(argv) {
  const opts = {
    scope: '', distDir: '', mutate: '', lockDir: '.scratch/locks',
    log: '.scratch/t540/t540-tsc.log', mutateDelayMs: 250, help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') { opts.help = true; return opts; }
    if (!OPTION_SPECS.has(arg)) throw new Error(`未知选项：${arg}`);
    const value = argv[++i];
    if (value === undefined) throw new Error(`${arg} 缺少取值`);
    if (arg === '--scope') opts.scope = value;
    else if (arg === '--dist-dir') opts.distDir = value;
    else if (arg === '--mutate-during-window') opts.mutate = value;
    else if (arg === '--lock-dir') opts.lockDir = value;
    else if (arg === '--log') opts.log = value;
    else if (arg === '--mutate-delay-ms') opts.mutateDelayMs = Number(value);
  }
  if (!Number.isFinite(opts.mutateDelayMs) || opts.mutateDelayMs < 0) throw new Error('--mutate-delay-ms 必须是非负数字');
  return opts;
}

/** 机读字段值：含空白或引号时用 JSON 双引号包裹（与 tooling/run-locked.mjs 同形）。 */
const fieldValue = (value) => (/[\s"]/.test(String(value ?? '')) ? JSON.stringify(String(value)) : String(value ?? ''));

const short = (sha) => (sha ? sha.slice(0, 16) : '无');
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

/** 归一化成仓库内相对路径（正斜杠），越界抛错。 */
function toRepoRel(target) {
  const rel = path.relative(REPO_ROOT, path.resolve(REPO_ROOT, target)).split(path.sep).join('/');
  if (rel === '' || rel.startsWith('..')) throw new Error(`路径不在仓库内：${target}`);
  return rel;
}

/** 逐件指纹：递归收集 `dir` 下全部文件（跳过 node_modules／.git），键为 `label/相对路径`。 */
function fingerprint(dir, label) {
  const files = new Map();
  const walk = (absDir) => {
    for (const ent of fs.readdirSync(absDir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      if (ent.name === 'node_modules' || ent.name === '.git') continue;
      const abs = path.join(absDir, ent.name);
      if (ent.isDirectory()) walk(abs);
      else if (ent.isFile()) {
        const rel = path.relative(dir, abs).split(path.sep).join('/');
        files.set(label ? `${label}/${rel}` : rel, sha256(fs.readFileSync(abs)));
      }
    }
  };
  if (fs.existsSync(dir)) walk(dir);
  const sorted = [...files.entries()];
  return { n: sorted.length, files, combined: sha256(sorted.map(([rel, sha]) => `${rel}\u0000${sha}`).join('\n')) };
}

/** 两棵指纹的差异：改字节／新增／删除，逐件点名（按路径排序）。 */
function diffFingerprints(before, after) {
  const drift = [];
  for (const [rel, sha] of before) {
    if (!after.has(rel)) drift.push({ rel, kind: '删除', before: sha, after: '' });
    else if (after.get(rel) !== sha) drift.push({ rel, kind: '改字节', before: sha, after: after.get(rel) });
  }
  for (const [rel, sha] of after) if (!before.has(rel)) drift.push({ rel, kind: '新增', before: '', after: sha });
  return drift.sort((a, b) => (a.rel < b.rel ? -1 : 1));
}

/**
 * 读外层锁窗口（§2.4.5：本脚本已被包装器持锁调用）。
 * 只认「owner.json 存在 ＋ pid 活着 ＋ 记录未过期」的窗口；否则运行标识记自身并告警。
 */
function readOuterWindow(lockDir) {
  const ownerPath = path.resolve(REPO_ROOT, lockDir, 'owner.json');
  const fallback = { runId: `self:${randomUUID()}`, source: '自身' };
  let stat;
  try { stat = fs.statSync(ownerPath); } catch { return fallback; }
  let owner;
  try { owner = JSON.parse(fs.readFileSync(ownerPath, 'utf8')); } catch { return fallback; }
  if (!owner || typeof owner !== 'object' || typeof owner.runId !== 'string') return fallback;
  if (Date.now() - stat.mtimeMs > 30 * 60 * 1000) return { ...fallback, owner };
  try { process.kill(Number(owner.pid), 0); } catch { return { ...fallback, owner }; }
  return { runId: owner.runId, source: '外层锁窗口', owner };
}

/**
 * 探针件守卫（§2.1.3 路径守卫的定点版）：
 * ① 必须落在 `<scope>/src` 之内（否则不在指纹域，判据看不见它）；
 * ② 文件名必须带 `.t540`（只许动本票自己的探针件）；
 * ③ 已存在时其内容必须以 `T540-PROBE` 开头，否则拒绝改动（绝不覆盖别人的件）。
 */
function resolveProbe(scopeRel, mutateRel) {
  const rel = toRepoRel(mutateRel);
  const srcRel = `${scopeRel}/src`;
  if (!rel.startsWith(`${srcRel}/`)) throw new Error(`--mutate-during-window 必须落在指纹域内（${srcRel}/…），收到 ${rel}`);
  if (!/\.t540[-.]/.test(path.basename(rel))) throw new Error(`变异件必须是本票探针件（文件名含 \`.t540\`），收到 ${rel}`);
  const abs = path.join(REPO_ROOT, rel);
  if (fs.existsSync(abs) && !fs.readFileSync(abs, 'utf8').startsWith(PROBE_MARK)) {
    throw new Error(`${rel} 已存在且不是本票探针（首行非 ${PROBE_MARK}），拒绝改动`);
  }
  return { rel, abs };
}

/** 探针件的定点删除：只删「路径逐字相等 ＋ 内容是本票探针」的那一件（不递归、不通配）。 */
function removeProbe(probe) {
  const expected = path.resolve(REPO_ROOT, probe.rel);
  if (path.resolve(probe.abs) !== expected) throw new Error(`拒绝删除非声明路径：${probe.abs}`);
  if (!fs.existsSync(expected)) return true;
  const text = fs.readFileSync(expected, 'utf8');
  if (!text.startsWith(PROBE_MARK)) throw new Error(`拒绝删除非本票探针件：${probe.rel}`);
  fs.rmSync(expected);
  return !fs.existsSync(expected);
}

/** 跑编译子进程；返回 `{ exit, mutate }`，`mutate` 记录反例开关的实际触发情况。 */
async function runCompileWindow({ scopeRel, probe, probeOriginal, mutateDelayMs, logAbs }) {
  const out = fs.openSync(logAbs, 'w');
  const child = spawn(process.execPath, [TSC_REL, '-b', scopeRel], { cwd: REPO_ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  let tail = '';
  let onData = null;
  const collect = (buf) => { tail = (tail + buf.toString()).slice(-4000); if (onData) onData(); };
  child.stdout.on('data', collect);
  child.stderr.on('data', collect);

  let mutate = null;
  let timer = null;
  if (probe) {
    const fire = (why) => {
      if (mutate) return;
      clearTimeout(timer);
      const baseline = probeOriginal ?? Buffer.from(`${PROBE_MARK} 基线\n`);
      const mutant = Buffer.from(`${PROBE_MARK} 变异 ${new Date().toISOString()}\n`);
      fs.writeFileSync(probe.abs, mutant);
      mutate = {
        why, aliveAtMutate: child.exitCode === null && child.signalCode === null,
        baselineSha: sha256(baseline), mutantSha: sha256(mutant),
      };
    };
    onData = () => fire('子进程首条输出');
    // 主触发＝子进程 spawn 事件（字面意义的「子进程起来后」）；输出／延时只作兜底。
    child.once('spawn', () => fire('子进程已起'));
    timer = setTimeout(() => fire('延时兜底'), mutateDelayMs);
  }

  const res = await new Promise((resolve) => {
    child.on('error', (err) => resolve({ code: 127, error: err }));
    child.on('close', (code, signal) => resolve({ code, signal }));
  });
  if (timer) clearTimeout(timer);
  if (child.pid) { try { child.stdout.destroy(); child.stderr.destroy(); } catch { /* 已关 */ } }
  fs.writeFileSync(out, tail);
  fs.closeSync(out);
  return { exit: res.error ? 127 : (res.code === null ? 1 : res.code), mutate, tail, error: res.error };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) { console.log(usage()); return 0; }
  if (!opts.scope) { console.error(`FAIL: 未给 --scope。用法：node ${SCRIPT_REL} --scope packages/skill-calorie`); return 2; }

  const scopeRel = toRepoRel(opts.scope);
  const distRel = toRepoRel(opts.distDir || `${scopeRel}/dist`);
  const srcAbs = path.join(REPO_ROOT, scopeRel, 'src');
  const distAbs = path.join(REPO_ROOT, distRel);
  if (!fs.existsSync(srcAbs)) { console.error(`FAIL: 作用域内没有 src 目录：${scopeRel}/src`); return 2; }
  const logRel = toRepoRel(opts.log);
  const logAbs = path.join(REPO_ROOT, logRel);
  fs.mkdirSync(path.dirname(logAbs), { recursive: true });

  const win = readOuterWindow(opts.lockDir);
  const cmdText = `node ${SCRIPT_REL} ${process.argv.slice(2).join(' ')}`;

  let probe = null;
  let probeOriginal = null;
  let probeBaselineSha = '';
  let exitCode = 1;
  let resultLine = '';
  let restoreLine = '';
  try {
    console.log(`T540: scope=${scopeRel} dist=${distRel} 编译="node ${TSC_REL} -b ${scopeRel}"`);
    console.log(`LOCK-WINDOW: 运行标识=${win.runId} 源=${win.source}`
      + (win.owner ? ` ticket=${fieldValue(win.owner.ticket ?? '')} pid=${win.owner.pid ?? ''}` : '')
      + (win.source === '自身' ? `（未发现外层锁窗口：${opts.lockDir}/owner.json 缺失／过期／owner 已死 ⇒ 本读数不得当作门禁证据，协议 §2.4.1）` : ''));

    if (opts.mutate) {
      probe = resolveProbe(scopeRel, opts.mutate);
      probeOriginal = fs.existsSync(probe.abs) ? fs.readFileSync(probe.abs) : null;
      const baseline = probeOriginal ?? Buffer.from(`${PROBE_MARK} 基线\n`);
      probeBaselineSha = sha256(baseline);
      // 基线先落盘 ⇒ 它进窗口前快照；窗口内被改写即被 DRIFT 抓住。
      if (!probeOriginal) fs.writeFileSync(probe.abs, baseline);
    }

    const before = fingerprint(srcAbs, `${scopeRel}/src`);
    const distBefore = fingerprint(distAbs, distRel);
    const startedAt = new Date().toISOString();
    const t0 = Date.now();
    const compile = await runCompileWindow({
      scopeRel, probe, probeOriginal, mutateDelayMs: opts.mutateDelayMs, logAbs,
    });
    const elapsedMs = Date.now() - t0;
    const after = fingerprint(srcAbs, `${scopeRel}/src`);
    const distAfter = fingerprint(distAbs, distRel);
    const drift = diffFingerprints(before.files, after.files);
    const distDrift = diffFingerprints(distBefore.files, distAfter.files);

    for (const d of drift) {
      console.log(`DRIFT: 件=${d.rel} 类别=${d.kind} 窗口前sha=${short(d.before)} 窗口后sha=${short(d.after)}`);
    }
    console.log(`FINGERPRINT: src-n=${before.n} src-sha-前=${short(before.combined)} src-sha-后=${short(after.combined)}`
      + ` dist-n=${distAfter.n} dist-sha-前=${short(distBefore.combined)} dist-sha-后=${short(distAfter.combined)}`
      + ` selftest-dist-变动件=${distDrift.length} tsc-exit=${compile.exit} 时长ms=${elapsedMs}`
      + ` 开始=${startedAt} 结束=${new Date().toISOString()}`);
    if (compile.error) console.log(`TSC-ERROR: ${compile.error.message}`);

    if (drift.length > 0) {
      resultLine = `RESULT: FAIL 窗口内 src 变动 ${drift.map((d) => `${d.rel}(${d.kind})`).join(' ')}`
        + ` src-n=${before.n} dist-n=${distAfter.n} src-sha=${short(before.combined)} dist-sha=${short(distAfter.combined)}`;
    } else if (compile.exit !== 0) {
      console.error(compile.tail.split('\n').slice(-20).join('\n'));
      resultLine = `RESULT: FAIL 编译未过 tsc-exit=${compile.exit} src-n=${before.n} dist-n=${distAfter.n}`
        + ` src-sha=${short(before.combined)} dist-sha=${short(distAfter.combined)}`;
    } else if (distAfter.n === 0) {
      resultLine = `RESULT: FAIL 产物为空 ${distRel} src-n=${before.n} dist-n=0`
        + ` src-sha=${short(before.combined)} dist-sha=${short(distAfter.combined)}`;
    } else {
      resultLine = `RESULT: src-n=${before.n} dist-n=${distAfter.n} src-sha=${short(before.combined)}`
        + ` dist-sha=${short(distAfter.combined)} 一致（dist 与 src 指纹一致）`;
      exitCode = 0;
    }

    if (compile.mutate) {
      const m = compile.mutate;
      console.log(`MUTATE: 件=${probe.rel} 触发=${m.why} 子进程存活=${m.aliveAtMutate ? 1 : 0}`
        + ` 窗口基线sha=${short(m.baselineSha)} 变异sha=${short(m.mutantSha)}`);
      if (!m.aliveAtMutate) console.log(`WARN: 变异发生在子进程退出之后 ⇒ 本反例未落在编译中途，读数不作数`);
    }
    if (probe) {
      // 还原：原本存在 → 写回原字节；原本不存在 → 回写基线核 sha 后删除（回到脚本启动前状态）。
      try { fs.writeFileSync(probe.abs, probeOriginal ?? Buffer.from(`${PROBE_MARK} 基线\n`)); } catch { /* 按 sha 判定 */ }
      const restoredSha = fs.existsSync(probe.abs) ? sha256(fs.readFileSync(probe.abs)) : '';
      const ok = restoredSha === probeBaselineSha;
      let cleaned = true;
      if (probeOriginal === null) {
        try { cleaned = removeProbe(probe); } catch (err) { cleaned = false; console.log(`FAIL: 探针件删除失败：${err.message}`); }
      }
      restoreLine = `RESTORE: 件=${probe.rel} 窗口基线sha=${short(probeBaselineSha)} 还原后sha=${short(restoredSha)}`
        + ` 一致=${ok ? 1 : 0} 处置=${probeOriginal === null ? '删除' : '回写'} 树内=${fs.existsSync(probe.abs) ? '有' : '无'}`;
      console.log(restoreLine);
      if (!ok || !cleaned) { console.log(`RESULT: FAIL 探针件还原不一致 ${probe.rel}`); exitCode = 1; }
    }
  } catch (err) {
    console.error(`FAIL: ${err.message}`);
    console.log(`GATE-RUN runId=${win.runId} cmd=${fieldValue(cmdText)} exit=2`);
    return 2;
  }

  console.log(resultLine);
  console.log(`GATE-RUN runId=${win.runId} cmd=${fieldValue(cmdText)} exit=${exitCode}`);
  return exitCode;
}

try {
  process.exitCode = await main();
} catch (err) {
  console.error(`FAIL: ${err?.message ?? err}`);
  process.exitCode = 2;
}
