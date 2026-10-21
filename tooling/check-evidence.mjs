#!/usr/bin/env node
/**
 * tooling/check-evidence.mjs —— 证据自检（#1299 其二）。
 *
 * 只查**机器可判**的项；查不了的项记 `WARN`，不猜、不替人补。
 * 提交／关票前跑一遍，把「四步闸门缺格」「指针抄错」「危险代码落不下 SHA」这类返工挡在提交前。
 *
 * 检查项（每项一条 `CHECK <名>=PASS|FAIL|WARN <说明>`）：
 *   format   复用 tooling/make-evidence.mjs 的 checkFormat：文本卫生（BOM／CRLF／控制符／字面换行／残留占位符）不合格判 FAIL；
 *            引用不可落地只判 WARN（行号后缀 `:59`、包内相对路径等受 --root 影响，格式门以 make-evidence --check 在正确 root 下复核）
 *   pointer  用户原话带可复算指针 `（会话 <id> seq <n>，<时刻>，转录）`，并在 DSH 会话存储里命中（seq／类型／时刻逐字核）
 *   danger   有「危险代码」标记；引用的提交存在、作者＝提交者＝FeatherHunter、提交信息带本票票号
 *   readings 至少两类机器读数（退出码／测试计数／RESULT 行／HIT-MISS）
 *   changeset `.changeset/<票号>-*.md` 或 `.changeset/t<票号>-*.md` 在场（`--no-changeset` 可关）
 *   assets   从正文按 `t<票号>-` 前缀收引用（覆盖同目录裸名／中文路径／任意目录写法），资产须存在、与证据 md 同目录
 *   confirm  ④ 格在场，且不含「无用户确认」这类自相矛盾字样
 *
 * 用法：
 *   node tooling/check-evidence.mjs --ticket 1296
 *   node tooling/check-evidence.mjs --file docs/plugins/plugin-manager/t1296-证据.md --ticket 1296
 *   node tooling/check-evidence.mjs --help
 * 选项：--root <目录>（引用与资产的存在性根，缺省 cwd）｜--git-root <目录>（查提交用，缺省同 --root）
 *       --sessions <目录>（DSH 会话根）｜--no-changeset｜--json｜--help
 * 退出码：0 全过；1 有 FAIL；2 用法错／读不到证据文件。
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkFormat } from './make-evidence.mjs';
import { defaultSessionsRoot, loadSession, verifyPointer, localTime } from './session-pointers.mjs';

const SAFE_BOT_NAME = 'FeatherHunter';
const SAFE_BOT_EMAIL = '975559549@qq.com';
const POINTER_RE = /（会话\s*`?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})`?\s*seq\s*(\d+)[^）\n]*?(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/g;
const SHA_RE = /\b[0-9a-f]{40}\b/g;
// 资产引用：从正文收「以 t<票号>- 开头的文件名」，覆盖 markdown 图片目标（含同目录裸名）、
// 中文目录／文件名与任意目录前缀；不按 docs/ 限定，也不把 tests/*.test.mjs、package.json 这类通用路径误当资产。
const ASSET_REF_RE = /[A-Za-z0-9_.\\/\-\u4e00-\u9fff]+\.(?:png|mjs|py|log|json|txt)/g;

/** 收集本票资产引用（按 t<票号>- 前缀过滤；去反斜杠、去重）。 */
export function collectAssetRefs(text, ticketText) {
  const refs = new Set();
  for (const match of text.matchAll(ASSET_REF_RE)) {
    const ref = match[0].replace(/\\/g, '/');
    if (ticketText === '' || !path.basename(ref).startsWith('t' + ticketText + '-')) continue;
    refs.add(ref);
  }
  return [...refs];
}

/** 解析资产引用：先按证据 md 同目录（真实写法：同目录裸名），再按 --root（仓库相对写法）。 */
function resolveAssetRef(ref, root, evidenceDir) {
  const candidates = [];
  if (path.isAbsolute(ref)) {
    candidates.push(path.resolve(ref));
  } else {
    if (evidenceDir !== '') candidates.push(path.resolve(evidenceDir, ref));
    candidates.push(path.resolve(root, ref));
  }
  const existing = candidates.filter((abs) => fs.existsSync(abs));
  if (existing.length === 0) return { abs: candidates[0] ?? path.resolve(root, ref), exists: false };
  const sameDir = existing.find((abs) => evidenceDir !== '' && path.dirname(abs) === evidenceDir);
  return { abs: sameDir ?? existing[0], exists: true };
}

const USAGE = [
  '证据自检（#1299）：关票前核对四步闸门与证据可解析性。',
  '',
  '用法：',
  '  node tooling/check-evidence.mjs --ticket <票号>',
  '  node tooling/check-evidence.mjs --file <证据 md> --ticket <票号>',
  '选项：--root <存在性根>｜--git-root <仓库根>｜--sessions <会话根>｜--no-changeset｜--json｜--help',
  '',
  '退出码：0 全过；1 有 FAIL；2 用法错／读不到证据文件。',
  '查不了的项记 WARN（例如本机没有 DSH 会话存储），不猜、不静默通过。',
].join('\n');

function defaultGit(root) {
  return (args) => {
    const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
    return { status: result.status ?? 2, stdout: (result.stdout ?? '').trim(), stderr: (result.stderr ?? '').trim() };
  };
}

/** 在 docs/ 下按票号找证据 md（`t<票号>-*.md`，见 doc-homes 同目录同前缀）。 */
export function findEvidenceFiles(root, ticket) {
  const prefix = 't' + ticket + '-';
  const found = [];
  const walk = (dir) => {
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        walk(abs);
      } else if (entry.name.startsWith(prefix) && entry.name.endsWith('.md')) {
        found.push(abs);
      }
    }
  };
  walk(path.join(root, 'docs'));
  return found.sort();
}

/** 检查项实现（供 CLI 与测试共用）：返回 [{ name, verdict, detail }]。 */
export async function runChecks({
  text,
  filePath,
  ticket,
  root = process.cwd(),
  gitRoot = root,
  git = defaultGit(gitRoot),
  sessionsRoot = defaultSessionsRoot(),
  loadSessionFn = loadSession,
  noChangeset = false,
} = {}) {
  const checks = [];
  const add = (name, verdict, detail) => checks.push({ name, verdict, detail: String(detail) });
  const evidenceDir = filePath ? path.dirname(path.resolve(filePath)) : '';
  const ticketText = String(ticket ?? '');

  // 1) 格式门：复用既有实现，不另造一份。文本卫生判死；引用存在性只警告——它取决于 --root，
  //    且 `:59` 行号后缀、包内相对路径并不是路径错误，格式门以 make-evidence --check 在正确 root 下复核。
  try {
    const errs = checkFormat(text, root);
    const hygiene = errs.filter((err) => !err.startsWith('引用不可落地'));
    const refErrs = errs.filter((err) => err.startsWith('引用不可落地'));
    if (hygiene.length > 0) {
      add('format', 'FAIL', hygiene.slice(0, 5).join('；'));
    } else if (refErrs.length > 0) {
      add('format', 'WARN', refErrs.length + ' 条引用在当前 --root 下不可落地（行号后缀／包内相对路径等）：'
        + refErrs.slice(0, 3).join('；'));
    } else {
      add('format', 'PASS', '格式 6 条全过');
    }
  } catch (err) {
    add('format', 'WARN', '格式门跑不起来：' + (err?.message ?? err));
  }

  // 2) 用户原话指针：语法 + 在 DSH 会话存储里复算命中
  const pointers = [...text.matchAll(new RegExp(POINTER_RE.source, 'g'))]
    .map((match) => ({ sessionId: match[1], seq: Number(match[2]), time: match[3] + ' ' + match[4] }));
  if (pointers.length === 0) {
    add('pointer', 'FAIL', '找不到 `（会话 <会话 id> seq <序号>，<时刻>，转录）` 形状的指针；转录须带可复算指针（编排纪律 L79）');
  } else {
    const verifyProblems = [];
    const loadProblems = [];
    let verified = 0;
    for (const pointer of pointers) {
      try {
        const session = await loadSessionFn({ sessionsRoot, sessionId: pointer.sessionId, waitMs: 1000 });
        const hit = verifyPointer(session, pointer.seq, pointer.time);
        if (hit.hit) verified += 1;
        else verifyProblems.push('`' + pointer.sessionId + '` seq ' + pointer.seq + '：' + hit.reason);
      } catch (err) {
        loadProblems.push('`' + pointer.sessionId + '` seq ' + pointer.seq + ' 取不到会话：' + (err?.message ?? err));
      }
    }
    if (verifyProblems.length === 0 && loadProblems.length === 0) {
      add('pointer', 'PASS', '指针 ' + pointers.length + ' 条全部复算命中');
    } else if (verifyProblems.length > 0) {
      add('pointer', 'FAIL', '指针复算命中不了：' + verifyProblems.slice(0, 3).join('；'));
    } else {
      add('pointer', 'WARN', '本机取不到会话存储，指针只过了语法未复算：' + loadProblems.slice(0, 2).join('；'));
    }
  }

  // 3) 危险代码：标记 + 提交存在 + 身份 + 票号
  const hasDangerMark = /危险代码/.test(text);
  const shas = [...new Set([...text.matchAll(SHA_RE)].map((match) => match[0]))];
  if (!hasDangerMark) {
    add('danger', 'FAIL', '没有「危险代码」标记（编排纪律 ③ 要求改动就在票面标）');
  } else if (shas.length === 0) {
    add('danger', 'FAIL', '有「危险代码」标记但没落完整提交 SHA（40 位）');
  } else {
    const problems = [];
    const warnings = [];
    const infos = [];
    for (const sha of shas) {
      const exists = git(['cat-file', '-e', sha + '^{commit}']);
      if (exists.status !== 0) {
        problems.push(sha.slice(0, 8) + ' 在仓库里不存在');
        continue;
      }
      const identity = git(['log', '-1', '--format=%an|%ae|%cn|%ce', sha]);
      const [an, ae, cn, ce] = identity.stdout.split('|');
      if (an !== SAFE_BOT_NAME || ae !== SAFE_BOT_EMAIL || cn !== SAFE_BOT_NAME || ce !== SAFE_BOT_EMAIL) {
        problems.push(sha.slice(0, 8) + ' 身份不是 ' + SAFE_BOT_NAME + '：' + identity.stdout);
        continue;
      }
      const subject = git(['log', '-1', '--format=%s', sha]).stdout;
      const hasCanonicalTicket = ticketText !== '' && subject.includes('#' + ticketText);
      const hasTicketNumber = ticketText !== '' && new RegExp('(?:^|[^0-9])' + ticketText + '(?:[^0-9]|$)').test(subject);
      if (!hasTicketNumber) problems.push(sha.slice(0, 8) + ' 提交信息没有本票票号：' + subject);
      else if (!hasCanonicalTicket) warnings.push(sha.slice(0, 8) + ' 票号不是 `#' + ticketText + '` 规范写法：' + subject);
      const changed = git(['show', '--name-only', '--format=', sha]).stdout.split('\n').filter(Boolean);
      if (changed.length > 0) infos.push(sha.slice(0, 8) + ' 改动 ' + changed.length + ' 件：' + changed.slice(0, 4).join('、'));
    }
    if (problems.length > 0) add('danger', 'FAIL', problems.slice(0, 4).join('；'));
    else if (warnings.length > 0) add('danger', 'WARN', warnings.join('；') + (infos.length > 0 ? '；' + infos.join('；') : ''));
    else add('danger', 'PASS', shas.length + ' 个提交身份／票号全核过' + (infos.length > 0 ? '；' + infos.join('；') : ''));
  }

  // 4) 机器读数：至少两类，缺一类就说明证据是自述不是读数
  const readingKinds = [
    ['退出码', /exit(?: code)?[=:： ]+0\b/i],
    ['测试计数', /\btests?[=: ]+\d+|\b\d+\s*\/\s*\d+\b/i],
    ['RESULT 行', /\bRESULT:\s*(?:PASS|FAIL)\b/i],
    ['HIT-MISS 针', /\b(?:HIT|MISS)\b/],
  ].filter(([, re]) => re.test(text)).map(([name]) => name);
  add('readings', readingKinds.length >= 2 ? 'PASS' : 'FAIL',
    readingKinds.length >= 2 ? '读数类别：' + readingKinds.join('、') : '只有 ' + (readingKinds.join('、') || '0') + ' 类机器读数（至少 2 类）');

  // 5) 变更说明
  if (noChangeset) {
    add('changeset', 'WARN', '--no-changeset：本票显式不要求变更说明（须在票面写明理由）');
  } else if (ticketText === '') {
    add('changeset', 'WARN', '没给 --ticket，无法核 `.changeset/<票号>-*.md`');
  } else {
    const changesetDir = path.join(root, '.changeset');
    const prefixes = [ticketText + '-', 't' + ticketText + '-'];
    const files = fs.existsSync(changesetDir)
      ? fs.readdirSync(changesetDir).filter((name) => prefixes.some((prefix) => name.startsWith(prefix)) && name.endsWith('.md'))
      : [];
    add('changeset', files.length > 0 ? 'PASS' : 'FAIL',
      files.length > 0 ? '.changeset/' + files[0] : '缺 .changeset/' + ticketText + '-*.md 或 t' + ticketText + '-*.md（每票一件）');
  }

  // 6) 证据资产：按 t<票号>- 前缀收引用，核存在与同目录（doc-homes L24）
  const assetRefs = collectAssetRefs(text, ticketText);
  if (ticketText === '') {
    add('assets', 'WARN', '没给 --ticket，无法按 t<票号>- 前缀核资产');
  } else if (assetRefs.length === 0) {
    add('assets', 'WARN', '证据里没有引用 t' + ticketText + '- 前缀的图片／脚本资产（本票可能只有文字读数）');
  } else {
    const problems = [];
    for (const ref of assetRefs) {
      const resolved = resolveAssetRef(ref, root, evidenceDir);
      if (!resolved.exists) {
        problems.push(ref + ' 不存在（按证据同目录与 --root 两处都找不到）');
        continue;
      }
      if (evidenceDir !== '' && path.dirname(resolved.abs) !== evidenceDir) {
        problems.push(ref + ' 与证据 md 不同目录（doc-homes：同目录同前缀）');
      }
    }
    add('assets', problems.length === 0 ? 'PASS' : 'FAIL',
      problems.length === 0 ? assetRefs.length + ' 件资产同目录同前缀' : problems.slice(0, 3).join('；'));
  }

  // 7) ④ 格：确认不能被自述替代，也不能自相矛盾
  if (/关闭前无用户|未经用户确认|无用户逐字确认/.test(text)) {
    add('confirm', 'FAIL', '④ 格写着「无用户确认」却要关票（自查即关作废）');
  } else if (/④/.test(text)) {
    add('confirm', 'PASS', '④ 格在场且没有「无用户确认」字样');
  } else {
    add('confirm', 'WARN', '找不到 ④ 格（只对带四步闸门的实施票判 FAIL 更合适，本件先记 WARN）');
  }

  return checks;
}

function summarize(checks) {
  const failed = checks.filter((check) => check.verdict === 'FAIL').length;
  const warn = checks.filter((check) => check.verdict === 'WARN').length;
  return { failed, warn, verdict: failed > 0 ? 'FAIL' : 'PASS' };
}

function parseArgs(argv) {
  const opts = {
    ticket: '',
    file: '',
    root: process.cwd(),
    gitRoot: '',
    sessionsRoot: defaultSessionsRoot(),
    noChangeset: false,
    json: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const need = () => {
      const value = argv[++i];
      if (value === undefined) throw new Error(arg + ' 缺少值');
      return value;
    };
    switch (arg) {
      case '--ticket': opts.ticket = need(); break;
      case '--file': opts.file = need(); break;
      case '--root': opts.root = need(); break;
      case '--git-root': opts.gitRoot = need(); break;
      case '--sessions': opts.sessionsRoot = need(); break;
      case '--no-changeset': opts.noChangeset = true; break;
      case '--json': opts.json = true; break;
      case '--help': case '-h': opts.help = true; break;
      default: throw new Error('未知参数：' + arg);
    }
  }
  if (!opts.help && opts.file === '' && opts.ticket === '') throw new Error('必须给 --file <证据 md> 或 --ticket <票号>');
  return opts;
}

function inferTicketFromFile(filePath) {
  const match = /(?:^|\/)t(\d+)-/.exec(filePath.replace(/\\/g, '/'));
  return match ? match[1] : '';
}

async function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (opts.help) {
    console.log(USAGE);
    return 0;
  }
  let filePath = opts.file;
  if (filePath === '') {
    const candidates = findEvidenceFiles(opts.root, opts.ticket);
    if (candidates.length === 0) throw new Error('在 ' + path.join(opts.root, 'docs') + ' 下找不到 t' + opts.ticket + '-*.md');
    if (candidates.length > 1) console.error('WARN: 找到 ' + candidates.length + ' 份证据，取第一份：' + candidates[0]);
    filePath = candidates[0];
  }
  if (!fs.existsSync(filePath)) throw new Error('证据文件不存在：' + filePath);
  const text = fs.readFileSync(filePath, 'utf8');
  const ticket = opts.ticket !== '' ? opts.ticket : inferTicketFromFile(filePath);
  const gitRoot = opts.gitRoot !== '' ? path.resolve(opts.gitRoot) : path.resolve(opts.root);
  const checks = await runChecks({
    text,
    filePath,
    ticket,
    root: path.resolve(opts.root),
    gitRoot,
    git: defaultGit(gitRoot),
    sessionsRoot: opts.sessionsRoot,
    noChangeset: opts.noChangeset,
  });
  if (opts.json) {
    const summary = summarize(checks);
    console.log(JSON.stringify({ ticket, file: filePath, ...summary, checks }));
  } else {
    for (const check of checks) console.log('CHECK ' + check.name + '=' + check.verdict + ' ' + check.detail);
    const summary = summarize(checks);
    console.log('RESULT: ' + summary.verdict + ' ticket=' + (ticket || '-') + ' checked=' + checks.length
      + ' failed=' + summary.failed + ' warn=' + summary.warn);
  }
  return summarize(checks).verdict === 'PASS' ? 0 : 1;
}

const invokedDirectly = process.argv[1] !== undefined
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  try {
    process.exitCode = await main();
  } catch (err) {
    console.error('FAIL: ' + (err?.message ?? err));
    process.exitCode = 2;
  }
}
