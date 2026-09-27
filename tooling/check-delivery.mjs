#!/usr/bin/env node
/**
 * tooling/check-delivery.mjs —— 六家技能「非 HELP 命令缺省落页 ＋ 回执」的常驻判据（票 #904）。
 *
 * 它守的是**目的**：用户说任意唤醒词（非 HELP 命令原样调用），技能都该
 *   ① 缺省就落一份**能直接打开的整页**（不靠谁去传 `--html`）；
 *   ② 回执里给 `delivery{mode,path,bytes}`——`path` 是绝对路径、`bytes` 等于磁盘真实字节。
 * 判据按**结果**断言（看 stdout 与盘上那份文件），不按机制（不查源码里有没有调交付件）。
 *
 * 隔离：逐家在**一次性临时家目录**里跑（`USERPROFILE`／`HOME` 指到 tmp，六家算配置目录的那一行
 * `os.homedir()/.ilife` 一个字不动）。跑之前先子进程读回一次 `os.homedir()`，对不上即拒跑——
 * 「不碰真实数据目录」是本件的硬前提，不是事后报表。
 *
 * 探针怎么选（每家那一条命令）：必须是**空库上也退出 0** 的非 HELP 命令——空家目录里跑得起来，
 * 才不会把「缺数据」的阻断误读成「缺交付」。三家是票面现成的（饼干 `bill.record.today`／居家
 * `home.item.search`／作息 `schedule.record.today`），另三家的选例与理由：
 *   · 卡路里 `calorie.view.goal-wizard`（目标预检）——空库退 0 且落页。该家多数读命令按「缺失阻断」
 *     退 4（实测 `calorie.today`／`calorie.view.home`／`calorie.view.library` 都退 4），故不选它们；
 *     `calorie.data.schema` 虽退 0，但回执是 `mode:"text"`（**没有 path**），量不到落页面。
 *   · 大厨 `chef.history.query`（查看历史）——空库退 0（`chef.setup.init` 亦退 0，可选）；要参数的那几条
 *     （`chef.recipe.search`／`chef.shopping.query`）与「缺失阻断」的那条都不选。
 *   · 备忘 `memo.init`（首次使用）——备忘的库层**禁 DDL**、库文件不在即抛（`MEMO_DB_MISSING`），
 *     连 `memo.create` 这种写命令在空家目录上都退 4 ⇒ 该家**没有**空库可跑的库内命令。替代判据＝
 *     库前分派的那条 `memo.init`（只渲染、不建库，空库也跑，落页与回执走同一条 `deliverMemoHtml`）。
 *     要判读键（`memo.search` 一类）得先预置最小样本库，本件不做——那会把探针绑死在库结构上。
 *
 * 用法：
 *   node tooling/check-delivery.mjs                 # 六家逐家跑探针，逐家一行读数；任一家不合 exit 1
 *   node tooling/check-delivery.mjs --selftest      # 自证：假例必红、真例必绿（外加五条变异各咬一口）
 *   node tooling/check-delivery.mjs --judge <文件> [--home <家目录>] [--exit <n>]
 *       只判一份落盘的 stdout（不跑技能）；`--exit` 给这份 stdout 对应的退出码（缺省 0）。
 *       `--home` 给了才做「落点须在隔离家目录内」那道守卫。
 *       **只给自证与变异用**：真实判据一律无参运行。
 *
 * 读数（逐行，机读；含空白或引号的值以 JSON 双引号包裹）：
 *   ISOLATION 家=<临时家目录> homedir=<子进程读回> 真实家目录=<账号那份> 一致=是
 *   DELIVERY 家=<中文家名> 键=<命令键> 出口=<命令名> exit=<n> delivery=<有|无> 绝对=<是|否|->
 *            文件=<在|缺|-> 字节=<盘上>/<回执> 整页=<是|否|-> 隔离=<是|否|-> 落点=<路径>- 判=<绿|红|废> [因=<…>]
 *   FINGERPRINT 包=<包名> src=<件数>件/<16位> dist=<件数>件/<16位> → src=… dist=… 漂移=<无|src|dist|src／dist>
 *            —— 产物读数与编译指纹同证（协议 §2.6）：读数窗口内 src／dist 一动，这一家的读数即**作废**（判=废）。
 *   SELFTEST PASS|FAIL 情形=<名> 期望exit=<n> 实测exit=<n> 命中=<…>
 *   RESULT: PASS|FAIL 绿=<n>/6 [作废=<家>] …
 * 退出码：0＝六家全绿；1＝至少一家不合或有读数作废；2＝用法／守卫失败（家目录注入没生效、包入口找不到）。
 *
 * 纪律：本件**只写临时家目录与自己的 stdout**，不动工作区（故不经 `tooling/run-locked.mjs` 排队）；
 * 删临时家目录前做路径守卫（必须在自己建的那个 tmp 根之下、且不是真实家目录）。
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { homeEnvOf } from '../test/helpers/home-test-base.mjs';
import { realHomeDir } from '../test/helpers/real-home-snapshot.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT_REL = 'tooling/check-delivery.mjs';
const TIMEOUT_MS = 120000;
const CMD_SUFFIX = '-cmd-read';

/** 判「落页」那条判据的正文标记：整页必有 `<html`（票面第 5 条逐字）。 */
const FULL_PAGE_MARK = '<html';

/**
 * 六家的探针表（顺序＝票面顺序）。`params` 是那次调用给 `--params` 的 JSON 对象。
 * 备忘那条要吃「检查清单＋待办＋验证清单」三段（缺了退 2，那是参数错、不是交付错），故给最小载荷。
 */
export const PROBES = [
  { family: '卡路里', pkg: 'skill-calorie', key: 'calorie.view.goal-wizard', title: '目标预检', params: {} },
  { family: '作息', pkg: 'skill-schedule', key: 'schedule.record.today', title: '今天总结', params: {} },
  { family: '居家', pkg: 'skill-home', key: 'home.item.search', title: '查物品', params: {} },
  {
    family: '备忘', pkg: 'skill-memo-ilife', key: 'memo.init', title: '首次使用',
    params: { data: { items: [{ name: '探针：空库自检', status: 'ok', desc: '隔离家目录、库文件不在', action: '' }], todos: [], verify: [] } },
  },
  { family: '饼干', pkg: 'skill-bill', key: 'bill.record.today', title: '查今天', params: {} },
  { family: '大厨', pkg: 'skill-chef', key: 'chef.history.query', title: '查看历史', params: {} },
];

/** 机读字段值：含空白或引号时用 JSON 双引号包裹（与 `tooling/run-locked.mjs` 同形）。 */
const fieldValue = (value) => (/[\s"\\]/.test(String(value ?? '')) ? JSON.stringify(String(value ?? '')) : String(value ?? ''));

/** 路径相等（win32 大小写不敏感）。 */
function normPath(p) {
  const abs = path.resolve(String(p));
  return process.platform === 'win32' ? abs.toLowerCase() : abs;
}

/** `child` 是不是落在 `parent` 之下（自己也算；只做路径判断，不碰盘）。 */
export function isUnder(parent, child) {
  if (typeof parent !== 'string' || parent === '') return false;
  const rel = path.relative(path.resolve(parent), path.resolve(child));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/** stdout 的最后一行非空内容（信封就是那一行；诊断一律走 stderr）。 */
function lastLine(stdout) {
  const lines = String(stdout ?? '').replace(/\r\n/g, '\n').split('\n').filter((l) => l.trim() !== '');
  return lines.length === 0 ? '' : lines[lines.length - 1];
}

/**
 * **纯判据**：一份 stdout ＋ 它的退出码 ⇒ 五条断言（＋落地越界）的结论。
 * 自证与真实跑走的是同一个函数——门有没有鉴别力，由 `--selftest` 的变异逐条证明。
 *
 * @param {string} stdout 子进程 stdout 原文
 * @param {number|null} exitCode 子进程退出码（`--judge` 那支按 0 算：喂进来的是「跑过的那份 stdout」）
 * @param {string} home 本次隔离家目录（空串＝不做越界那道守卫）
 * @returns {{ok: boolean, reasons: string[], observed: object}}
 */
export function judgeDelivery(stdout, exitCode, home) {
  const reasons = [];
  const observed = { delivery: false, absolute: null, exists: null, bytes: null, declaredBytes: null, fullPage: null, inside: null, filePath: '' };

  if (exitCode !== 0) reasons.push('命令未过 exit=' + String(exitCode));

  let parsed = null;
  try {
    parsed = JSON.parse(lastLine(stdout));
  } catch {
    reasons.push('stdout 非 JSON（末行取不出信封）');
  }
  if (parsed !== null && (typeof parsed !== 'object' || Array.isArray(parsed))) {
    reasons.push('stdout 顶层不是对象');
    parsed = null;
  }

  const delivery = parsed === null ? undefined : parsed.delivery;
  if (delivery === undefined || delivery === null || typeof delivery !== 'object' || Array.isArray(delivery)) {
    reasons.push(parsed === null ? '无 delivery（信封读不出，无从判）' : '无 delivery（顶层只有 ' + Object.keys(parsed).join('/') + '）');
    return { ok: false, reasons, observed };
  }
  observed.delivery = true;

  // ② `delivery.path` 是绝对路径（缺 path 的家会在这里现形，例如 `mode:"text"` 的那类回执）。
  const filePath = typeof delivery.path === 'string' ? delivery.path : '';
  observed.filePath = filePath;
  if (filePath === '') {
    reasons.push('delivery.path 缺失（mode=' + String(delivery.mode ?? '未给') + '）');
  } else if (!path.isAbsolute(filePath)) {
    observed.absolute = false;
    reasons.push('delivery.path 不是绝对路径');
  } else {
    observed.absolute = true;
  }

  if (observed.absolute === true) {
    // ③ 该路径的文件存在。
    let size = null;
    try {
      const st = fs.statSync(filePath);
      if (st.isFile()) size = st.size;
    } catch { /* 不存在即 size 仍为 null */ }
    observed.exists = size !== null;
    if (size === null) {
      reasons.push('盘上没有这个文件');
    } else {
      observed.bytes = size;
      // ④ 文件字节数 ＝ `delivery.bytes`。
      const declared = typeof delivery.bytes === 'number' ? delivery.bytes : null;
      observed.declaredBytes = declared;
      if (declared === null) reasons.push('delivery.bytes 缺失或不是数字');
      else if (declared !== size) reasons.push('字节不等：盘上 ' + size + ' ≠ 回执 ' + declared);
      // ⑤ 内容是整页（含 `<html`）。
      let text = null;
      try { text = fs.readFileSync(filePath, 'utf8'); } catch { /* 读不出即按不是整页判 */ }
      observed.fullPage = text !== null && text.includes(FULL_PAGE_MARK);
      if (!observed.fullPage) reasons.push('不是整页（正文不含 ' + FULL_PAGE_MARK + '）');
      // 隔离守卫（本件多的一道）：落点必须在本家的隔离家目录内，否则这一跑可能动过真实数据目录。
      if (home !== '' && home !== undefined) {
        observed.inside = isUnder(home, filePath);
        if (!observed.inside) reasons.push('落点越出隔离家目录：' + filePath);
      }
    }
  }

  return { ok: reasons.length === 0, reasons, observed };
}

/** 一行读数（逐家一条；`judgeDelivery` 的结论只在这一处上屏）。 */
export function lineOf(row) {
  const o = row.observed ?? {};
  const yes = (v) => (v === null || v === undefined ? '-' : (v ? '是' : '否'));
  const parts = [
    'DELIVERY',
    '家=' + fieldValue(row.family),
    '键=' + fieldValue(row.key),
    '出口=' + fieldValue(row.cmd ?? '-'),
    'exit=' + String(row.exit),
    'delivery=' + (o.delivery ? '有' : '无'),
    '绝对=' + yes(o.absolute),
    '文件=' + (o.exists === null || o.exists === undefined ? '-' : (o.exists ? '在' : '缺')),
    '字节=' + (o.bytes === null || o.bytes === undefined ? '-' : o.bytes) + '/' + (o.declaredBytes === null || o.declaredBytes === undefined ? '-' : o.declaredBytes),
    '整页=' + yes(o.fullPage),
    '隔离=' + yes(o.inside),
  ];
  if (o.filePath) parts.push('落点=' + fieldValue(o.filePath));
  parts.push('判=' + (row.void ? '废' : (row.ok ? '绿' : '红')));
  if (!row.ok) parts.push('因=' + fieldValue(row.reasons.join('；')));
  return parts.join(' ');
}

/** 一棵树的指纹：相对路径排序后连内容一起哈希（件数 ＋ 16 位 sha）。 */
export function treeFingerprint(dir) {
  const files = [];
  const walk = (d) => {
    let entries = [];
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile()) files.push(full);
    }
  };
  walk(dir);
  files.sort();
  const h = createHash('sha256');
  for (const f of files) {
    h.update(path.relative(dir, f).replace(/\\/g, '/'));
    h.update('\0');
    h.update(fs.readFileSync(f));
    h.update('\0');
  }
  return { n: files.length, sha: h.digest('hex').slice(0, 16) };
}

/** 一个技能包两面（`src`／`dist`）的指纹（协议 §2.6：产物读数必须与编译指纹同证）。 */
export function packageFingerprint(pkg) {
  const base = path.join(ROOT, 'packages', pkg);
  return { src: treeFingerprint(path.join(base, 'src')), dist: treeFingerprint(path.join(base, 'dist')) };
}

const fpText = (fp) => fp.src.n + '件/' + fp.src.sha + ' dist=' + fp.dist.n + '件/' + fp.dist.sha;

/** 两面里哪一面在读数窗口内漂了（空数组＝没漂，这一家的读数作数）。 */
export function driftOf(before, after) {
  const out = [];
  if (before.src.sha !== after.src.sha) out.push('src');
  if (before.dist.sha !== after.dist.sha) out.push('dist');
  return out;
}

/** 按包 `package.json` 的 `bin` 声明找唯一出口（入口布局可变，谁都不许复制字面路径）。 */
export function cliOf(pkg) {
  const pjPath = path.join(ROOT, 'packages', pkg, 'package.json');
  if (!fs.existsSync(pjPath)) throw new Error('找不到技能包：' + path.join('packages', pkg, 'package.json'));
  const pj = JSON.parse(fs.readFileSync(pjPath, 'utf8'));
  const bin = pj.bin ?? {};
  const cmd = Object.keys(bin).find((k) => k.endsWith(CMD_SUFFIX));
  if (cmd === undefined) throw new Error('包 ' + pkg + ' 的 package.json 里没有 *' + CMD_SUFFIX + ' 声明');
  const entry = path.resolve(ROOT, 'packages', pkg, String(bin[cmd]).replace(/^\.\//, ''));
  if (!fs.existsSync(entry)) throw new Error('包 ' + pkg + ' 的唯一出口不存在（先编译）：' + entry);
  return { cmd, entry };
}

/** 临时家目录：`mkdtemp` 落在系统 tmp 之下，删之前再做一次路径守卫。 */
function makeHome(tag) {
  return fs.mkdtempSync(path.join(tmpdir(), 't904-' + tag + '-'));
}

/** 删临时家目录（守卫：必须在系统 tmp 之下、且不是真实家目录）。 */
function dropHome(home) {
  const tmpRoot = path.resolve(tmpdir());
  if (!isUnder(tmpRoot, home)) throw new Error('拒绝删除：' + home + ' 不在 ' + tmpRoot + ' 之下');
  if (normPath(home) === normPath(realHomeDir().dir)) throw new Error('拒绝删除：' + home + ' 就是真实家目录');
  fs.rmSync(home, { recursive: true, force: true });
}

/** 子进程读回 `os.homedir()`：证明注入真的生效（win32 认 USERPROFILE、POSIX 认 HOME）。 */
function readbackHome(home) {
  const r = spawnSync(process.execPath, ['-e', "process.stdout.write(require('node:os').homedir())"], {
    cwd: ROOT, env: homeEnvOf(home), encoding: 'utf8', timeout: 30000,
  });
  return { exit: r.status, homedir: String(r.stdout ?? '').trim() };
}

function parseArgs(argv) {
  const opts = { selftest: false, judge: '', home: '', exit: 0, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') { opts.help = true; continue; }
    if (arg === '--selftest') { opts.selftest = true; continue; }
    if (arg === '--judge' || arg === '--home' || arg === '--exit') {
      const value = argv[++i];
      if (value === undefined) throw new Error(arg + ' 缺少取值');
      if (arg === '--judge') opts.judge = value;
      else if (arg === '--home') opts.home = value;
      else {
        opts.exit = Number(value);
        if (!Number.isInteger(opts.exit)) throw new Error('--exit 须是整数');
      }
      continue;
    }
    throw new Error('未知选项：' + arg);
  }
  if (opts.judge !== '' && opts.selftest) throw new Error('--judge 与 --selftest 互斥');
  return opts;
}

function usage() {
  const text = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
  const block = text.match(/\/\*\*([\s\S]*?)\*\//);
  return block ? block[1].replace(/^\s*\*?/gm, '').trim() : SCRIPT_REL;
}

/** `--judge`：只判一份落盘的 stdout（自证与变异用；不跑技能）。 */
function runJudge(opts) {
  const text = fs.readFileSync(opts.judge, 'utf8');
  const verdict = judgeDelivery(text, opts.exit, opts.home);
  console.log(lineOf({ family: '（judge）', key: opts.judge, cmd: '-', exit: opts.exit, ok: verdict.ok, reasons: verdict.reasons, observed: verdict.observed }));
  console.log('RESULT: ' + (verdict.ok ? 'PASS' : 'FAIL') + ' judge ' + fieldValue(opts.judge) + (verdict.ok ? '' : ' 因=' + fieldValue(verdict.reasons.join('；'))));
  return verdict.ok ? 0 : 1;
}

/** 自证：真例必绿、假例与五条变异各必红（证明这道门不是摆设）。 */
function selftest() {
  const sandbox = makeHome('selftest');
  const home = path.join(sandbox, 'home');
  fs.mkdirSync(home, { recursive: true });
  const pageFile = path.join(home, 'page.html');
  const fragmentFile = path.join(home, 'fragment.html');
  const outsideFile = path.join(tmpdir(), 't904-outside-' + process.pid + '.html');
  const fullPage = '<!doctype html>\n<html lang="zh"><body>合格整页</body></html>\n';
  fs.writeFileSync(pageFile, fullPage, 'utf8');
  fs.writeFileSync(fragmentFile, '<section data-skill="probe">片段</section>\n', 'utf8');
  fs.writeFileSync(outsideFile, fullPage, 'utf8');
  const bytes = fs.statSync(pageFile).size;
  const envelope = (delivery) => JSON.stringify({ version: '0.1.0', skill: 'probe', shape: 'list', key: 'probe.key', data: {}, ...(delivery === undefined ? {} : { delivery }) }) + '\n';
  const cases = [
    { name: '假例（无 delivery）', text: envelope(undefined), expectExit: 1, expectIn: '无 delivery' },
    { name: '真例（合格整页）', text: envelope({ mode: 'file', path: pageFile, bytes }), expectExit: 0, expectIn: '判=绿' },
    { name: '变异1（path 相对）', text: envelope({ mode: 'file', path: 'page.html', bytes }), expectExit: 1, expectIn: '不是绝对路径' },
    { name: '变异2（盘上无文件）', text: envelope({ mode: 'file', path: path.join(home, 'nope.html'), bytes }), expectExit: 1, expectIn: '盘上没有这个文件' },
    { name: '变异3（bytes 不等）', text: envelope({ mode: 'file', path: pageFile, bytes: bytes + 1 }), expectExit: 1, expectIn: '字节不等' },
    { name: '变异4（片段不是整页）', text: envelope({ mode: 'file', path: fragmentFile, bytes: fs.statSync(fragmentFile).size }), expectExit: 1, expectIn: '不是整页' },
    { name: '变异5（落点越出隔离家目录）', text: envelope({ mode: 'file', path: outsideFile, bytes: fs.statSync(outsideFile).size }), expectExit: 1, expectIn: '越出隔离家目录' },
    { name: '变异6（命令没过）', text: envelope({ mode: 'file', path: pageFile, bytes }), exit: 1, expectExit: 1, expectIn: '命令未过' },
  ];
  let failed = 0;
  try {
    for (const [i, c] of cases.entries()) {
      const file = path.join(sandbox, 'stdout-' + i + '.txt');
      fs.writeFileSync(file, c.text, 'utf8');
      const argv = [fileURLToPath(import.meta.url), '--judge', file, '--home', home];
      if (c.exit !== undefined) argv.push('--exit', String(c.exit));
      const r = spawnSync(process.execPath, argv, { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
      const out = String(r.stdout ?? '');
      const ok = r.status === c.expectExit && out.includes(c.expectIn);
      if (!ok) failed += 1;
      console.log('SELFTEST ' + (ok ? 'PASS' : 'FAIL') + ' 情形=' + fieldValue(c.name)
        + ' 期望exit=' + c.expectExit + ' 实测exit=' + r.status + ' 命中=' + fieldValue(c.expectIn)
        + (ok ? '' : ' 输出尾=' + JSON.stringify(out.slice(-300))));
    }
  } finally {
    fs.rmSync(outsideFile, { force: true });
    dropHome(sandbox);
  }
  const total = cases.length + 4;
  // 变异7：产物漂移判据（协议 §2.6）——真跑里靠同一函数判「这一家的读数还算不算数」，
  // 这里用合成指纹就地咬一口（不去动别的席位的包树）。
  const fp = (s, d) => ({ src: { n: 1, sha: s }, dist: { n: 1, sha: d } });
  const driftCases = [
    { name: '变异7a（双面一致 ⇒ 不作废）', got: driftOf(fp('a', 'b'), fp('a', 'b')).join('／'), want: '' },
    { name: '变异7b（dist 漂 ⇒ 作废）', got: driftOf(fp('a', 'b'), fp('a', 'c')).join('／'), want: 'dist' },
    { name: '变异7c（src 漂 ⇒ 作废）', got: driftOf(fp('a', 'b'), fp('c', 'b')).join('／'), want: 'src' },
    { name: '变异7d（双面都漂 ⇒ 都点名）', got: driftOf(fp('a', 'b'), fp('c', 'd')).join('／'), want: 'src／dist' },
  ];
  for (const c of driftCases) {
    const ok = c.got === c.want;
    if (!ok) failed += 1;
    console.log('SELFTEST ' + (ok ? 'PASS' : 'FAIL') + ' 情形=' + fieldValue(c.name)
      + ' 期望=' + fieldValue(c.want) + ' 实测=' + fieldValue(c.got));
  }
  if (failed === 0) {
    console.log('RESULT: PASS 自证 ' + total + '/' + total + '（真例必绿／假例必红／五条判据各咬一口／漂移判据四态）');
    return 0;
  }
  console.log('RESULT: FAIL 自证 ' + (total - failed) + '/' + total);
  return 1;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) { console.log(usage()); return 0; }
  if (opts.selftest) return selftest();
  if (opts.judge !== '') return runJudge(opts);

  // 守卫：家目录注入必须真的生效（子进程读回一次），对不上即拒跑——绝不拿真实家目录当试验场。
  const guardHome = makeHome('guard');
  const real = realHomeDir();
  const back = readbackHome(guardHome);
  const same = back.exit === 0 && normPath(back.homedir) === normPath(guardHome);
  console.log('ISOLATION 家=' + fieldValue(guardHome) + ' homedir=' + fieldValue(back.homedir)
    + ' 真实家目录=' + fieldValue(real.dir) + ' 一致=' + (same ? '是' : '否'));
  dropHome(guardHome);
  if (!same) {
    console.error('FAIL: 家目录注入没生效（子进程读回 ' + back.homedir + ' ≠ ' + guardHome + '）⇒ 拒跑，免得落到真实数据目录');
    return 2;
  }

  // 守卫：六家的唯一出口先按包 `bin` 声明全部解析出来（缺包／缺编译产物＝这一跑不成立，exit 2）。
  const probes = PROBES.map((probe) => ({ ...probe, cli: cliOf(probe.pkg) }));

  const rows = [];
  for (const probe of probes) {
    const cli = probe.cli;
    const home = makeHome(probe.pkg.replace(/^skill-/, ''));
    const fpBefore = packageFingerprint(probe.pkg);
    let exit = null;
    let row = null;
    try {
      const r = spawnSync(process.execPath, [cli.entry, probe.key, '--params', JSON.stringify(probe.params)], {
        cwd: ROOT, env: homeEnvOf(home), encoding: 'utf8', timeout: TIMEOUT_MS,
      });
      exit = r.status === null ? (r.error ? 124 : 1) : r.status;
      const stdout = String(r.stdout ?? '');
      const verdict = judgeDelivery(stdout, exit, home);
      row = { family: probe.family, key: probe.key, cmd: cli.cmd, exit, ok: verdict.ok, reasons: verdict.reasons, observed: verdict.observed };
      if (!verdict.ok) row.stderrTail = String(r.stderr ?? '').trim().split('\n').slice(-1)[0] ?? '';
    } catch (err) {
      row = { family: probe.family, key: probe.key, cmd: cli.cmd, exit, ok: false, reasons: [String(err?.message ?? err)], observed: {} };
    } finally {
      dropHome(home);
    }
    // 协议 §2.6：读数窗口内 `src`／`dist` 一动，这一家的读数即作废（不许拿混合态当结论）。
    const fpAfter = packageFingerprint(probe.pkg);
    const drifted = driftOf(fpBefore, fpAfter);
    if (drifted.length > 0) {
      row.ok = false;
      row.void = true;
      row.reasons = ['读数作废：读数窗口内 ' + drifted.join('／') + ' 漂移，重跑'];
    }
    rows.push(row);
    console.log(lineOf(row));
    console.log('FINGERPRINT 包=' + probe.pkg + ' src=' + fpText(fpBefore) + ' → src=' + fpText(fpAfter) + ' 漂移=' + (drifted.length === 0 ? '无' : drifted.join('／')));
    if (!row.ok) console.error('  ← ' + probe.family + ' ' + (row.void ? '读数作废' : '的探针不合') + '：' + row.reasons.join('；')
      + (row.stderrTail ? '；stderr 尾=' + JSON.stringify(row.stderrTail) : ''));
  }

  const green = rows.filter((r) => r.ok).length;
  const red = rows.filter((r) => !r.ok && !r.void).map((r) => r.family);
  const voided = rows.filter((r) => r.void).map((r) => r.family);
  if (red.length === 0 && voided.length === 0) {
    console.log('RESULT: PASS 绿=' + green + '/' + rows.length + '（六家非 HELP 命令缺省落页 ＋ 回执五条判据全过）');
    return 0;
  }
  console.log('RESULT: FAIL 绿=' + green + '/' + rows.length
    + (red.length === 0 ? '' : ' 红=' + fieldValue(red.join('、')))
    + (voided.length === 0 ? '' : ' 作废=' + fieldValue(voided.join('、')))
    + '（逐家读数见上面的 DELIVERY 行；本件只判交付面，修法归各家的票）');
  return 1;
}

try {
  process.exitCode = await main();
} catch (err) {
  console.error('FAIL: ' + (err?.message ?? err));
  process.exitCode = 2;
}
