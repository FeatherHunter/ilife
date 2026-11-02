#!/usr/bin/env node
/**
 * #1199 S8 · 「未声明的差异为零」的**改造前锚**（可复现，且能证明不是自录的）。
 *
 * 要证的那句话：不启用多语言时，产物与**改造前**逐字节一致（ADR-0004 §7）。
 * 原来的做法是拿另一 worktree 里的旧文件当锚——本仓复跑只能证明「当前实现 vs 自录快照」，
 * 自录快照被改一字节也没人知道。本件把锚钉到 **git 对象**上：
 *
 *   锚的每一件记三样东西（tooling/i18n-anchor.json，由 --write 生成）：
 *     · path     —— 被锚定的文件
 *     · commit ＋ blob —— 该文件在历史里的**已提交对象**（commit:path 解析出的 blob sha1）
 *     · sha256 ＋ bytes —— 该 blob **内容**的摘要与字节数
 *   --check 三步（缺一步锚就退化成自录）：
 *     ① git rev-parse <commit>:<path> 必须等于锚里的 blob —— 锚指向的那个历史对象真的存在且没变；
 *     ② git cat-file blob <blob> 算出的 sha256／bytes 必须等于锚里的值 —— 锚的摘要确实是这个历史对象的内容；
 *     ③ 工作树文件的 blob sha 必须等于锚里的 blob —— 这一件此刻与改造前逐字节一致（差异为零）。
 *   改坏必红：
 *     · 改锚里的 sha256（一个十六进制位）→ ② 红（ANCHOR-SHA-MISMATCH）；
 *     · 改工作树文件一个字节 → ③ 红（ANCHOR-WORKTREE-DRIFT）；
 *     · 把锚的 commit/blob 指到别处 → ① 红（ANCHOR-BLOB-MOVED）。
 *
 * 用法：
 *   node tooling/i18n-anchor.mjs            # = --check（门禁口径）
 *   node tooling/i18n-anchor.mjs --check    # 同上
 *   node tooling/i18n-anchor.mjs --list     # 只列锚，不验
 *   node tooling/i18n-anchor.mjs --write    # 重新生成锚（人显式改锚时才用；改完要说明票号）
 *   node tooling/i18n-anchor.mjs --selftest # 篡改自证：改摘要／改工作树／改 blob 各必红、还原必绿
 *   node tooling/i18n-anchor.mjs --check --data <path>  # 换一份锚数据（测试篡改用）
 * 末行固定：RESULT: anchors=<n> verified=<n> drift=<n>
 * 依赖：零第三方；只读 git 对象与工作树，不写任何文件（--write 除外）。
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const argv = process.argv.slice(2);
const CHECK = argv.includes('--check') || argv.length === 0;
const LIST = argv.includes('--list');
const WRITE = argv.includes('--write');
const SELFTEST = argv.includes('--selftest');
const DATA_FLAG = argv.indexOf('--data');
/** --data <path>：换一份锚数据（测试篡改用；缺省 tooling/i18n-anchor.json）。 */
const DATA = DATA_FLAG >= 0 && argv[DATA_FLAG + 1] ? resolve(argv[DATA_FLAG + 1]) : join(HERE, 'i18n-anchor.json');

/** 被锚定的三件：中文列账本两件 ＋ 记账 44 页指纹。加件就加一行，然后 --write。 */
export const ANCHOR_PATHS = [
  'tooling/skill-html.snapshot.json',
  'tooling/calorie-html.snapshot.json',
  'packages/skill-bill/test/t689-页面指纹.json',
];

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

function git(args, { text = true } = {}) {
  try {
    const out = execFileSync('git', args, { cwd: ROOT, encoding: text ? 'utf8' : 'buffer', stdio: ['ignore', 'pipe', 'pipe'] });
    return text ? out.trim() : out;
  } catch {
    return null;
  }
}

/** 真实依赖：git 对象与工作树。selftest 注入假的。 */
export const realDeps = {
  revParse: (spec) => git(['rev-parse', spec]),
  catFile: (blob) => git(['cat-file', 'blob', blob], { text: false }),
  worktreeBlob: (p) => (existsSync(join(ROOT, p)) ? git(['hash-object', p]) : null),
};

/** 单条锚的违规（空＝一致）。deps 可在自证里注入篡改。 */
export function anchorProblems(entry, deps = realDeps) {
  const out = [];
  const blob = deps.revParse(entry.commit + ':' + entry.path);
  if (blob !== entry.blob) {
    out.push({ code: 'ANCHOR-BLOB-MOVED', msg: entry.path + '：commit:path 解析出 ' + (blob || '（读不到）') + '，锚里写的是 ' + entry.blob });
  }
  const content = deps.catFile(entry.blob);
  if (!content) {
    out.push({ code: 'ANCHOR-BLOB-MISSING', msg: entry.path + '：git 对象 ' + entry.blob + ' 读不到（锚指向不存在的提交对象）' });
  } else {
    const got = sha256(content);
    if (got !== entry.sha256) out.push({ code: 'ANCHOR-SHA-MISMATCH', msg: entry.path + '：blob 内容 sha256=' + got + '，锚里写的是 ' + entry.sha256 });
    if (content.length !== entry.bytes) out.push({ code: 'ANCHOR-BYTES-MISMATCH', msg: entry.path + '：blob 内容 bytes=' + content.length + '，锚里写的是 ' + entry.bytes });
  }
  const wt = deps.worktreeBlob(entry.path);
  if (wt !== entry.blob) {
    out.push({ code: 'ANCHOR-WORKTREE-DRIFT', msg: entry.path + '：工作树这一件 blob=' + (wt || '（文件不在）') + '，改造前锚=' + entry.blob + '（差异未声明）' });
  }
  return out;
}

function load() {
  if (!existsSync(DATA)) return { ok: false, why: '锚数据不在：tooling/i18n-anchor.json（先跑 --write 生成并提交）' };
  try {
    const j = JSON.parse(readFileSync(DATA, 'utf8'));
    if (!Array.isArray(j.anchors) || j.anchors.length === 0) return { ok: false, why: '锚数据里 anchors 是空的' };
    return { ok: true, data: j };
  } catch (e) {
    return { ok: false, why: '锚数据读不动：' + ((e && e.message) || String(e)) };
  }
}

function build() {
  const anchors = ANCHOR_PATHS.map((path) => {
    const commit = git(['log', '-1', '--format=%H', '--', path]);
    if (!commit) throw new Error('取不到 ' + path + ' 的最近提交');
    const blob = git(['rev-parse', commit + ':' + path]);
    const content = git(['cat-file', 'blob', blob], { text: false });
    if (!content) throw new Error('读不到 ' + path + ' 在 ' + commit + ' 的 blob');
    return { path, commit, blob, sha256: sha256(content), bytes: content.length };
  });
  return { note: '由 node tooling/i18n-anchor.mjs --write 生成；锚指向已提交的 git 对象，--check 用 git 复核，不是自录快照。', anchors };
}

function selftest() {
  const bad = [];
  const want = (cond, msg) => { if (!cond) bad.push(msg); };
  const content = Buffer.from('{"zh":"改造前"}\n');
  const entry = { path: 'demo.json', commit: 'c0ffee', blob: 'b10b', sha256: sha256(content), bytes: content.length };
  const clean = {
    revParse: () => 'b10b',
    catFile: () => content,
    worktreeBlob: () => 'b10b',
  };
  want(anchorProblems(entry, clean).length === 0, '原样必须零违规');
  console.log('SELFTEST 还原读数：problems=0');
  const flip = entry.sha256.slice(0, -1) + (entry.sha256.endsWith('0') ? '1' : '0');
  const p1 = anchorProblems({ ...entry, sha256: flip }, clean);
  want(p1.some((v) => v.code === 'ANCHOR-SHA-MISMATCH'), '改锚里的 sha256 必红');
  const p2 = anchorProblems(entry, { ...clean, worktreeBlob: () => 'deadbeef' });
  want(p2.some((v) => v.code === 'ANCHOR-WORKTREE-DRIFT'), '改工作树一字节必红');
  const p3 = anchorProblems(entry, { ...clean, revParse: () => '0ther' });
  want(p3.some((v) => v.code === 'ANCHOR-BLOB-MOVED'), '把锚指到别的 blob 必红');
  console.log('SELFTEST 改坏读数：sha256→' + p1.map((v) => v.code).join(',') + '／工作树→' + p2.map((v) => v.code).join(',') + '／blob→' + p3.map((v) => v.code).join(','));
  if (bad.length) { for (const b of bad) console.error('SELFTEST FAIL ' + b); process.exit(1); }
  console.log('SELFTEST: 锚摘要篡改必红／工作树改一字节必红／锚指错对象必红／还原必绿 四条自证 OK');
}

function main() {
  if (SELFTEST) return selftest();
  if (WRITE) {
    const data = build();
    writeFileSync(DATA, JSON.stringify(data, null, 2) + '\n');
    console.log('WROTE: tooling/i18n-anchor.json anchors=' + data.anchors.length);
    for (const a of data.anchors) console.log('ANCHOR ' + a.path + ' commit=' + a.commit.slice(0, 8) + ' blob=' + a.blob + ' sha256=' + a.sha256 + ' bytes=' + a.bytes);
    return;
  }
  const loaded = load();
  if (!loaded.ok) {
    console.error('RED [ANCHOR-UNREADABLE] ' + loaded.why);
    console.log('RESULT: anchors=0 verified=0 drift=1');
    console.log('FAIL: 锚不可读（「未声明的差异为零」没有可复核的改造前锚）');
    process.exit(1);
  }
  const { anchors } = loaded.data;
  for (const a of anchors) {
    const problems = anchorProblems(a);
    const head = 'ANCHOR ' + a.path + ' commit=' + a.commit.slice(0, 8) + ' blob=' + a.blob + ' sha256=' + a.sha256.slice(0, 16) + '… bytes=' + a.bytes + ' worktree=' + (problems.some((p) => p.code === 'ANCHOR-WORKTREE-DRIFT') ? 'DRIFT' : 'clean');
    console.log(head);
    for (const p of problems) console.error('RED [' + p.code + '] ' + p.msg);
  }
  const drift = anchors.filter((a) => anchorProblems(a).length > 0).length;
  const verified = anchors.length - drift;
  console.log('RESULT: anchors=' + anchors.length + ' verified=' + verified + ' drift=' + drift);
  if (drift > 0) {
    console.error('FAIL: 改造前锚对不上（' + drift + ' 件有差异／锚被改过；「未声明的差异为零」不成立）');
    process.exit(1);
  }
  if (LIST) return;
  console.log('PASS: ' + verified + ' 件改造前锚与已提交 git 对象逐字节一致（锚不是自录的：commit:path→blob 由 git 复核，摘要由 blob 内容复核）');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
