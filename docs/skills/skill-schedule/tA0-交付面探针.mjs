#!/usr/bin/env node
/**
 * `docs/skills/skill-schedule/tA0-交付面探针.mjs` —— 票 #843 的**验收命令**（真出口读数）。
 *
 *   node docs/skills/skill-schedule/tA0-交付面探针.mjs
 *
 * 它跑什么（逐条对票面「怎么算绿」）：
 *  ① 8 键逐条**真跑** `dist/cli/cmd_read.js`（缺省不带 `--html`）：`delivery.path` 是**绝对路径**、
 *     文件真在盘上、**盘上字节＝`delivery.bytes`**（回读，不看期望值）、内容是**整页**（`<!DOCTYPE html>` 起）；
 *  ② **落点分家**：7 个唤醒词命令落 `schedule_html/` **根**，`schedule.help.lookup` 落 `schedule_html/help/`；
 *  ③ 既有口径不破：HELP 的**老名字** `作息管家_HELP_<时间戳>.html` 逐字不变（#203／#204 那两条）；
 *  ④ 命名对账（#843「一处定义」）：真落盘名 ＝ `src/delivery/naming.ts` 的 `pageStemFor(声明)` ＋ 通式；
 *  ⑤ 安静窗口：本包 `src` 无别人的写者（`git status --short -- packages/skill-schedule/src` 为空，
 *     本票自己的改动**已提交**才算空）＋ 锁目录里有活持锁者即作废；
 *  ⑥ 编译指纹（协议 §2.6）：自己调 `docs/agents/t540-指纹绑定.mjs --scope packages/skill-schedule`
 *     取那一行 `FINGERPRINT:`（src／dist 逐件 sha256 ＋ 窗口内 src 漂移判定），本探针的结论**只对那一行有效**。
 *
 * 退出码：0＝全绿；1＝有红（逐条打印红在哪里）；2＝用法／前置（`dist` 没编译、窗口不安静、指纹取不到）。
 *
 * 变异自证（票面「改坏一处必须变红」）：
 *   `--bin <某份 dist/cli/cmd_read.js>` 指向**变异副本**真出口——同一份探针脚本、同一批判据，
 *   改坏落点／名字的那份必须红（读数见证据件 `tA0-交付面-证据.md`）。
 * 用法：
 *   node docs/skills/skill-schedule/tA0-交付面探针.mjs [--bin <出口 js>] [--pkg <包目录>] [--json]
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const NODE_BIN = process.execPath;

function parseArgs(argv) {
  const o = { bin: '', pkg: join(REPO, 'packages', 'skill-schedule'), json: false, ownerTicket: '843' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--bin') o.bin = argv[++i];
    else if (a === '--pkg') o.pkg = resolve(argv[++i]);
    else if (a === '--json') o.json = true;
    else if (a === '--owner-ticket') o.ownerTicket = argv[++i];
    else { console.error('未知参数：' + a); process.exit(2); }
  }
  if (!o.bin) o.bin = join(o.pkg, 'dist', 'cli', 'cmd_read.js');
  return o;
}

const OPTS = parseArgs(process.argv.slice(2));
const REL_PKG = relative(REPO, OPTS.pkg).replace(/\\/g, '/');

/** 8 键 ＋ 照抄即跑入参（HELP 空参＝「缺省落盘」那一支）。 */
const SEEDS = [
  { op: 'add', date: '2026-09-06', time_start: '09:00', time_end: '10:00', activity: '探针-调优', category: '工作.AI调优' },
  { op: 'add', date: '2026-09-07', time_start: '07:00', time_end: '08:00', activity: '探针-跑步', category: '健康.运动' },
  { op: 'add', date: '2026-08-06', time_start: '09:00', time_end: '10:00', activity: '探针-调优', category: '工作.AI调优' },
];
const CASE_ARGS = [
  { key: 'schedule.record.today', args: [], kind: 'page' },
  { key: 'schedule.record.range', args: ['--params', '{"start":"2026-09-01","end":"2026-09-30"}'], kind: 'page' },
  { key: 'schedule.record.detail', args: ['--params', '{"id":1}'], kind: 'page' },
  { key: 'schedule.record.compare', args: ['--params', '{"kind":"category","start":"2026-09-01","end":"2026-09-30","category":"工作"}'], kind: 'page' },
  { key: 'schedule.plan.today', args: [], kind: 'page' },
  { key: 'schedule.plan.write', args: ['--params', '{"op":"preview","date":"2026-09-21","events":[{"date":"2026-09-21","time_start":"00:00","time_end":"09:00","title":"睡觉","category":"维持.睡眠"},{"date":"2026-09-21","time_start":"09:00","time_end":"24:00","title":"工作","category":"工作.会议"}]}'], kind: 'page' },
  { key: 'schedule.record.write', args: ['--params', '{"op":"add","date":"2026-09-08","time_start":"09:00","time_end":"10:00","activity":"探针-记一笔","category":"工作.AI调优"}'], kind: 'page' },
  { key: 'schedule.help.lookup', args: [], kind: 'help' },
];

const reds = [];
const lines = [];
function ok(msg) { lines.push('OK   ' + msg); }
function red(msg) { reds.push(msg); lines.push('RED  ' + msg); }
function die2(msg) { console.error('ERR2 ' + msg); process.exit(2); }

/* ─────────── 前置一：安静窗口（本包 src 无别人的写者 ＋ 锁目录无活持锁者） ─────────── */

function checkQuietWindow() {
  const g = spawnSync('git', ['-C', REPO, 'status', '--short', '--', REL_PKG + '/src'], { encoding: 'utf8' });
  if (g.status !== 0) die2('取不到 git 状态：' + String(g.stderr).trim());
  const dirty = String(g.stdout).trim();
  if (dirty !== '') {
    die2('窗口不安静：本包 src 有未提交改动（可能是别人正在写），读数作废：\n' + dirty
      + '\n（本票的改动要先提交，再在安静窗口里跑本探针）');
  }
  const owner = join(REPO, '.scratch', 'locks', 'owner.json');
  if (existsSync(owner)) {
    let live = false;
    let info = '';
    try {
      const raw = readFileSync(owner, 'utf8');
      info = raw.trim();
      const o = JSON.parse(raw);
      const pid = Number(o.pid);
      if (Number.isFinite(pid) && pid > 0) {
        try { process.kill(pid, 0); live = true; } catch { live = false; }
      }
      // 「安静」＝没有**别人**在写包：本探针按票面口径经 `run-locked --ticket <本票号>` 在窗口内跑，
      // 那把锁的属主就是本票自己（owner ticket 相同即放行）；别人持锁即作废。
      if (live && String(o.ticket) === OPTS.ownerTicket) live = false;
    } catch { live = false; }
    if (live) die2('窗口不安静：锁目录里有别人在持锁（' + info + '），读数作废');
  }
  return true;
}

/* ─────────── 前置二：编译指纹（协议 §2.6，调 t540 工具，不自己重做一遍） ─────────── */

function compileFingerprint() {
  const logPath = join(REPO, '.scratch', 't843', 'probe-t540.log');
  const r = spawnSync(NODE_BIN, [join(REPO, 'docs', 'agents', 't540-指纹绑定.mjs'),
    '--scope', REL_PKG, '--log', logPath], { encoding: 'utf8', cwd: REPO });
  const out = String(r.stdout);
  const fp = out.split('\n').find((l) => l.startsWith('FINGERPRINT:'));
  if (r.status !== 0 || !fp) {
    die2('编译指纹取不到或窗口内 src 漂移（协议 §2.6，读数作废）：exit=' + String(r.status)
      + '\n' + out.trim() + '\n' + String(r.stderr).trim());
  }
  return fp.trim();
}

/* ─────────── 读数 ─────────── */

const pkgs = {
  registry: pathToFileURL(join(OPTS.pkg, 'dist', 'cli', 'registry.js')).href,
  wake: pathToFileURL(join(OPTS.pkg, 'dist', 'policy', 'wakewords.js')).href,
  naming: pathToFileURL(join(OPTS.pkg, 'dist', 'delivery', 'index.js')).href,
};

checkQuietWindow();
const fingerprint = compileFingerprint();

const { REGISTRY } = await import(pkgs.registry);
const { WAKE_TABLE } = await import(pkgs.wake);
const { pageStemFor, SCHEDULE_SKILL_NAME } = await import(pkgs.naming);

const home = mkdtempSync(join(tmpdir(), 'tA0-probe-'));
const dataDir = join(home, '.ilife', 'data');
const pagesRoot = join(dataDir, 'schedule_html');
const helpRoot = join(pagesRoot, 'help');
const childEnv = { ...process.env, USERPROFILE: home, HOME: home };

function runCli(args) {
  const r = spawnSync(NODE_BIN, [OPTS.bin, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: childEnv });
  let env = null;
  try { env = JSON.parse(String(r.stdout)); } catch { env = null; }
  return { status: r.status, stdout: String(r.stdout), stderr: String(r.stderr), env };
}

ok('安静窗口：本包 src 无未提交改动、锁目录无活持锁者');
ok('编译指纹：' + fingerprint);
ok('真出口：' + relative(REPO, OPTS.bin).replace(/\\/g, '/') + '（临时家目录 ' + home + '）');

for (const seed of SEEDS) {
  const r = runCli(['schedule.record.write', '--params', JSON.stringify(seed)]);
  if (r.status !== 0) red('种子写 ' + seed.date + ' exit=' + r.status + '（' + r.stderr.trim().split('\n')[0] + '）');
}

for (const c of CASE_ARGS) {
  const label = c.key;
  const r = runCli([c.key, ...c.args]);
  if (r.status !== 0) { red(label + '：exit=' + r.status + '（' + r.stderr.trim().split('\n')[0] + '）'); continue; }
  if (!r.env) { red(label + '：stdout 不是一行可解析 JSON'); continue; }
  const dl = r.env.delivery;
  if (!dl) { red(label + '：顶层缺 delivery（缺省调用不落盘）'); continue; }
  const out = dl.path;
  if (!isAbsolute(out)) { red(label + '：delivery.path 不是绝对路径：' + out); continue; }
  if (!existsSync(out)) { red(label + '：回执路径不在盘上：' + out); continue; }
  const bytes = statSync(out).size;
  if (bytes !== dl.bytes) { red(label + '：盘上字节 ' + bytes + ' ≠ delivery.bytes ' + dl.bytes); continue; }
  const html = readFileSync(out, 'utf8');
  if (!html.startsWith('<!DOCTYPE html>') || !html.includes('</html>')) { red(label + '：不是整页（' + out + '）'); continue; }
  const wantDir = c.kind === 'help' ? helpRoot : pagesRoot;
  if (dirname(out) !== wantDir) { red(label + '：落点 ' + dirname(out) + ' ≠ ' + wantDir); continue; }
  const stem = c.kind === 'help' ? SCHEDULE_SKILL_NAME + '_HELP' : pageStemFor(REGISTRY[c.key]);
  if (!new RegExp('^' + stem + '_\\d{8}_\\d{6}(_\\d+)?\\.html$').test(basename(out))) {
    red(label + '：落盘名 ' + basename(out) + ' 不符「' + stem + '_<时间戳>.html」'); continue;
  }
  ok(label + ' → ' + basename(out) + '（' + bytes + ' B）');
}

/* ─────────── 结构性读数：分家 ＋ 不互相混 ─────────── */

if (!existsSync(helpRoot)) red('HELP 支目录不存在：' + helpRoot);
else {
  const helpNames = readdirSync(helpRoot);
  if (helpNames.length !== 1) red('HELP 支里不该有 ' + helpNames.length + ' 件：' + helpNames.join(' / '));
  if (!helpNames.every((n) => /^作息管家_HELP_\d{8}_\d{6}(_\d+)?\.html$/.test(n))) {
    red('HELP 支里有不符老名字的件：' + helpNames.join(' / '));
  }
}
if (existsSync(pagesRoot)) {
  const rootHtml = readdirSync(pagesRoot).filter((n) => n.endsWith('.html'));
  const stray = rootHtml.filter((n) => n.startsWith('作息管家_HELP_'));
  if (stray.length > 0) red('HELP 混进了产物根：' + stray.join(' / '));
  for (const c of CASE_ARGS) {
    if (c.kind !== 'page') continue;
    const stem = pageStemFor(REGISTRY[c.key]);
    if (!rootHtml.some((n) => n.startsWith(stem + '_'))) red('产物根里没有「' + stem + '_…html」');
  }
  ok('落点分家：产物根里 ' + rootHtml.length + ' 件页面、HELP 支里 ' + (existsSync(helpRoot) ? readdirSync(helpRoot).length : 0) + ' 件 HELP');
}

/* ─────────── 命名出处：页面名里的词都能在 HELP 里找到 ─────────── */

for (const c of CASE_ARGS) {
  if (c.kind !== 'page') continue;
  const spec = REGISTRY[c.key];
  const wakes = WAKE_TABLE.filter((e) => e.key === c.key).map((e) => e.phrase);
  const pool = wakes.join('') + SCHEDULE_SKILL_NAME + '写入查询日程分析辅助';
  const missing = [...new Set([...spec.title].filter((ch) => !pool.includes(ch)))];
  if (missing.length > 0) red(c.key + ' 的标题「' + spec.title + '」里有 HELP 找不到出处的字：' + missing.join(''));
}

/* ─────────── 结论 ─────────── */

const summary = 'RESULT: ' + (reds.length === 0 ? 'PASS' : 'FAIL') + ' cases=' + CASE_ARGS.length
  + ' red=' + reds.length + ' | ' + fingerprint.replace(/^FINGERPRINT:\s*/, '');
if (OPTS.json) {
  console.log(JSON.stringify({ ok: reds.length === 0, reds, fingerprint, lines }, null, 2));
} else {
  for (const l of lines) console.log(l);
  if (reds.length > 0) { console.log('--- 红条 ---'); for (const r of reds) console.log('RED  ' + r); }
  console.log(summary);
}
process.exit(reds.length === 0 ? 0 : 1);
