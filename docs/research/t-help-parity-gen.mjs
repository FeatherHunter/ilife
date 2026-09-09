#!/usr/bin/env node
/**
 * t-help-parity-gen.mjs · 「HELP 最终产物生成」可复跑脚本（#83 · 地图 #63 主线②）
 *
 * 作用：用**最终代码**在**持锁**前提下构建并生成 `calorie.help.center` 的三态产物，
 *       把「逐字命令／runId／exit／stdout 行数／envelope 字段／产物字节／sha256」落成
 *       `.scratch/t-parity/gen-manifest.json`，供 `t-help-parity-extract.mjs` 与台账消费。
 *
 * 纪律（协议 §2.4）：
 *   - 每条 build／CLI 都经 `node tooling/run-locked.mjs --ticket <ticket> -- …` 持锁；runId 记入 manifest。
 *   - 产物与中间 JSON 一律落 `.scratch/`（`.gitignore` 已忽略），**不入库**。
 *   - 本脚本**只观测**：不写 `packages/**`／`tooling/**`／既有 `docs/**`，不改产物。
 *
 * 用法（工作目录＝仓库根）：
 *   node docs/research/t-help-parity-gen.mjs
 *   node docs/research/t-help-parity-gen.mjs --skip-build          # 复用已构建 dist
 *   node docs/research/t-help-parity-gen.mjs --db .scratch/final-db --out .scratch/t-parity
 *
 * 输出：`RESULT: n/m …` 摘要行（最后一行恒为总判定）。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const argv = process.argv.slice(2);
const argOf = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : dflt;
};
const has = (name) => argv.includes(name);

const ROOT = process.cwd();
const TICKET = argOf('--ticket', '83');
const DB = path.resolve(ROOT, argOf('--db', '.scratch/final-db'));
const OUT = path.resolve(ROOT, argOf('--out', '.scratch/t-parity'));
const CLI = path.join(ROOT, 'packages/skill-calorie/dist/cli/cmd_read.js');
const LOCK = path.join(ROOT, 'tooling/run-locked.mjs');

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(DB, { recursive: true });

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const readSha = (file) => sha256(fs.readFileSync(file));
const bytes = (file) => fs.statSync(file).size;
const lines = (file) => fs.readFileSync(file, 'utf8').split('\n').length;

let checks = 0;
let pass = 0;
const ok = (cond, label, detail) => {
  checks++;
  if (cond) pass++;
  console.log((cond ? 'PASS ' : 'FAIL ') + label + (detail ? ' · ' + detail : ''));
  return !!cond;
};

/** 持锁执行；返回 {cmd, exit, stdout, stderr, runId, stdoutLines, stdoutBytes} */
function locked(innerArgv) {
  const cmd = ['node', 'tooling/run-locked.mjs', '--ticket', TICKET, '--', ...innerArgv];
  const verbatim = cmd.map((a) => (/[\s{}"'\\]/.test(a) ? "'" + a.replace(/'/g, "'\\''") + "'" : a)).join(' ');
  const r = spawnSync(cmd[0], cmd.slice(1), {
    cwd: ROOT,
    env: { ...process.env, SKILLS_DB_PATH: DB },
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  const stderr = String(r.stderr ?? '');
  const allRunIds = [...new Set([...stderr.matchAll(/runId=([0-9a-f-]{36})/g)].map((m) => m[1]))];
  // 权威 runId ＝ **RESULT 行**（进程收尾行，唯一一次一条）；LOCK-ACQUIRED 行在同进程内同值，
  // 但并发 session 的等待/窃锁日志可能混入，故一律取 RESULT 行并保留全部出现过的 runId 供审计。
  const resultLine = [...stderr.matchAll(/^RESULT: .*$/gm)].pop()?.[0] ?? '';
  const runId = (resultLine.match(/runId=([0-9a-f-]{36})/) ?? [])[1] ?? allRunIds[allRunIds.length - 1] ?? null;
  return {
    cmd: verbatim,
    inner: innerArgv.join(' '),
    runId,
    allRunIds,
    resultLine,
    exit: r.status,
    stdout: r.stdout ?? '',
    stderr,
    stdoutLines: (r.stdout ?? '') === '' ? 0 : (r.stdout ?? '').split('\n').filter((l, i, a) => !(i === a.length - 1 && l === '')).length,
    stdoutBytes: Buffer.byteLength(r.stdout ?? '', 'utf8'),
  };
}

const manifest = {
  generatedBy: 'docs/research/t-help-parity-gen.mjs',
  ticket: TICKET,
  generatedAt: new Date().toISOString(),
  repo: { head: null, headSubject: null },
  db: DB,
  build: null,
  modes: {},
  artifacts: {},
};

const head = spawnSync('git', ['log', '-1', '--oneline'], { cwd: ROOT, encoding: 'utf8' });
manifest.repo.head = (head.stdout ?? '').trim().split(' ')[0] ?? null;
manifest.repo.headSubject = (head.stdout ?? '').trim();
manifest.repo.statusShort = (spawnSync('git', ['status', '--short'], { cwd: ROOT, encoding: 'utf8' }).stdout ?? '').trim().split('\n');

// ── ① 构建（持锁）─────────────────────────────────────────────────────────────
if (has('--skip-build')) {
  console.log('SKIP build (--skip-build)');
  manifest.build = { skipped: true };
} else {
  const b = locked(['pnpm', 'build']);
  manifest.build = { cmd: b.cmd, runId: b.runId, allRunIds: b.allRunIds, resultLine: b.resultLine, exit: b.exit, stdoutLines: b.stdoutLines, stderrTail: b.stderr.split('\n').slice(-3) };
  console.log('GATE-RUN runId=' + b.runId + ' cmd="' + b.cmd + '"');
  ok(b.exit === 0, 'build exit=0', 'exit=' + b.exit + ' runId=' + b.runId);
}
ok(fs.existsSync(CLI), 'CLI 产物存在', CLI);

// ── ② 三态产物 ────────────────────────────────────────────────────────────────
const specs = [
  { mode: 'file', label: 'file（缺省）', params: null, expectDeliveryMode: 'file' },
  { mode: 'inline', label: 'inline', params: '{"mode":"inline"}', expectDeliveryMode: 'file' },
  { mode: 'text', label: 'text', params: '{"mode":"text"}', expectDeliveryMode: 'text' },
];

for (const spec of specs) {
  const inner = ['node', 'packages/skill-calorie/dist/cli/cmd_read.js', 'calorie.help.center'];
  if (spec.params) inner.push('--params', spec.params);
  const r = locked(inner);
  console.log('GATE-RUN runId=' + r.runId + ' cmd="' + r.cmd + '"');
  let env = null;
  try {
    env = JSON.parse(r.stdout.trim());
  } catch (err) {
    env = null;
  }
  const delivery = env?.delivery ?? null;
  const outPath = env?.data?.output ?? null;
  const artifact = outPath && fs.existsSync(outPath)
    ? { path: outPath, bytes: bytes(outPath), lines: lines(outPath), sha256: readSha(outPath) }
    : null;
  const entry = {
    mode: spec.mode,
    label: spec.label,
    cmd: r.cmd,
    runId: r.runId,
    allRunIds: r.allRunIds,
    resultLine: r.resultLine,
    exit: r.exit,
    stdoutLines: r.stdoutLines,
    stdoutBytes: r.stdoutBytes,
    envelopeKeys: env ? Object.keys(env) : [],
    dataKeys: env?.data ? Object.keys(env.data) : [],
    dataMode: env?.data?.mode ?? null,
    dataBytes: env?.data?.bytes ?? null,
    dataOutput: outPath,
    dataTextBytes: typeof env?.data?.text === 'string' ? Buffer.byteLength(env.data.text, 'utf8') : null,
    delivery,
    artifact,
    rawStdout: path.join(OUT, 'raw-' + spec.mode + '.out.json'),
    rawStderr: path.join(OUT, 'raw-' + spec.mode + '.err.log'),
    stderrTail: r.stderr.split('\n').filter((l) => l.trim() !== '').slice(-2),
  };
  fs.writeFileSync(entry.rawStdout, r.stdout, 'utf8');
  fs.writeFileSync(entry.rawStderr, r.stderr, 'utf8');
  manifest.modes[spec.mode] = entry;

  ok(r.exit === 0, 'mode=' + spec.mode + ' exit=0', 'exit=' + r.exit + ' runId=' + r.runId);
  ok(r.stdoutLines === 1, 'mode=' + spec.mode + ' stdout 恰 1 行 envelope', 'lines=' + r.stdoutLines);
  ok(!!env && ['version', 'skill', 'shape', 'key', 'data'].every((k) => k in env), 'mode=' + spec.mode + ' envelope 五字段齐', entry.envelopeKeys.join(','));
  ok(env?.key === 'calorie.help.center', 'mode=' + spec.mode + ' key 逐字', String(env?.key));
  ok(env?.shape === 'list', 'mode=' + spec.mode + ' shape=list', String(env?.shape));
  ok(delivery?.mode === spec.expectDeliveryMode, 'mode=' + spec.mode + ' delivery.mode=' + spec.expectDeliveryMode, String(delivery?.mode));
  ok(!!artifact, 'mode=' + spec.mode + ' 产物落盘', artifact ? artifact.path + ' ' + artifact.bytes + 'B' : 'no file');
  if (artifact) {
    ok(artifact.bytes === delivery?.bytes, 'mode=' + spec.mode + ' 产物字节＝delivery.bytes', artifact.bytes + ' vs ' + delivery?.bytes);
    ok(artifact.bytes === env?.data?.bytes, 'mode=' + spec.mode + ' 产物字节＝data.bytes', artifact.bytes + ' vs ' + env?.data?.bytes);
  }
}

// ── ③ 三态同源核对（file vs inline vs text 的关系，只记录不断言相等）──────────────
const f = manifest.modes.file.artifact;
const i2 = manifest.modes.inline.artifact;
const t = manifest.modes.text.artifact;
if (f && i2 && t) {
  const fileHtml = fs.readFileSync(f.path, 'utf8');
  const inlineHtml = fs.readFileSync(i2.path, 'utf8');
  const textHtml = fs.readFileSync(t.path, 'utf8');
  const payloadOf = (s) => {
    const m = s.match(/<script id="[^"]+" type="application\/json">([\s\S]*?)<\/script>/);
    return m ? m[1] : null;
  };
  manifest.sameSource = {
    fileHasDoctype: /^<!DOCTYPE html>/i.test(fileHtml),
    inlineHasDoctype: /^<!DOCTYPE html>/i.test(inlineHtml),
    inlineHasStyle: /<style/.test(inlineHtml),
    inlineHasPayload: /type="application\/json"/.test(inlineHtml),
    filePayloadSha256: payloadOf(fileHtml) ? sha256(payloadOf(fileHtml)) : null,
    inlinePayloadSha256: payloadOf(inlineHtml) ? sha256(payloadOf(inlineHtml)) : null,
    inlineFragmentInFile: fileHtml.includes(inlineHtml.trim().slice(0, 200)),
    textBytes: Buffer.byteLength(textHtml, 'utf8'),
    textLines: textHtml.split('\n').length,
    textHead: textHtml.split('\n').slice(0, 6),
    fileBytes: Buffer.byteLength(fileHtml, 'utf8'),
    inlineBytes: Buffer.byteLength(inlineHtml, 'utf8'),
  };
  ok(!!manifest.sameSource.filePayloadSha256 && manifest.sameSource.inlineHasPayload === false,
    'file 有内嵌 payload／inline 无 payload（三态同源：同一 SceneData，inline 不带 JSON 备份）',
    'filePayload=' + manifest.sameSource.filePayloadSha256 + ' inlineHasPayload=' + manifest.sameSource.inlineHasPayload);
  ok(manifest.sameSource.inlineFragmentInFile === true, 'inline 片段逐字出现在 file 产物内（同源实证）', String(manifest.sameSource.inlineFragmentInFile));
  ok(!manifest.sameSource.inlineHasDoctype, 'inline 态无 <!DOCTYPE html>', 'inlineHasDoctype=' + manifest.sameSource.inlineHasDoctype);
}

const manifestPath = path.join(OUT, 'gen-manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
console.log('MANIFEST ' + manifestPath);
for (const m of Object.values(manifest.modes)) {
  console.log('ARTIFACT mode=' + m.mode + ' exit=' + m.exit + ' bytes=' + (m.artifact?.bytes ?? '-') + ' sha256=' + (m.artifact?.sha256 ?? '-') + ' path=' + (m.artifact?.path ?? '-'));
}
console.log('RESULT: ' + pass + '/' + checks + ' gen-checks');
process.exit(pass === checks ? 0 : 1);
