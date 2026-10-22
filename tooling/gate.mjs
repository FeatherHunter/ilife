#!/usr/bin/env node
/**
 * tooling/gate.mjs —— 一条命令跑门禁（#1299 其三）。
 *
 * 把「构建 → 包测试 → 汇总行」收成一条命令：失败时点名卡在哪一步（STAGE），
 * 日志落盘、终端只打 STAGE／GATE／失败尾巴（按 `docs/subagent-concurrency-protocol.md` §2.2 输出节流）。
 *
 * 阶段（按序，前一步失败即停，不带着红产物往下跑）：
 *   tsc      node node_modules/typescript/bin/tsc -b [--force] <scope 或 .>
 *   client   --client 且 scope 的 package.json 有 build:client 时：npm run build:client（补 dist，不装依赖）
 *   tests    scope：node --test <scope>/test/*.test.mjs（显式文件表，不靠 shell 展开）
 *            --full：node tooling/check-real-home-untouched.mjs --run
 *                    （全量套件清单只有它一份事实源，本件不复制 SUITE_GLOBS）
 *
 * 用法：
 *   node tooling/gate.mjs --scope packages/plugin-manager [--force] [--client] [--ticket 1296]
 *   node tooling/gate.mjs --full [--force] [--ticket 1296]
 *   node tooling/gate.mjs --help
 * 选项：--scope <包目录>｜--full｜--force（tsc -b --force）｜--client｜--ticket <票号>（日志落 .scratch/t<票号>/）
 *       --log <文件>｜--timeout-ms <毫秒>｜--help
 * 摘要行：GATE scope=<包> tsc=0 tests=407/407 exit=0 ms=<总毫秒> log=<日志>
 *         GATE mode=full tsc=0 tests=delegated exit=0 ms=<总毫秒> log=<日志>
 * 退出码：0 全过；1 有阶段 FAIL；2 用法错／前置缺件。
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const USAGE = [
  '一条命令跑门禁（#1299）：构建＋测试＋汇总行，日志落盘。',
  '',
  '用法：',
  '  node tooling/gate.mjs --scope packages/plugin-manager [--force] [--client] [--ticket 1296]',
  '  node tooling/gate.mjs --full [--force] [--ticket 1296]',
  '选项：--scope <包目录>｜--full｜--force｜--client｜--ticket <票号>｜--log <文件>｜--timeout-ms <毫秒>｜--help',
  '',
  '阶段：tsc →（client）→ tests；失败即停并点名 STAGE。',
  '--full 的全量套件清单委托 tooling/check-real-home-untouched.mjs --run（单一事实源）。',
].join('\n');

/** 读 package.json 的 scripts（读不到返回 null）。 */
export function readPackageScripts(dir) {
  const file = path.join(dir, 'package.json');
  if (!fs.existsSync(file)) return null;
  try {
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
    return pkg.scripts ?? {};
  } catch {
    return null;
  }
}

/** 收集 scope 包的测试文件（相对仓库根，显式列表）。没有 test/ 目录返回 []。 */
export function collectTestFiles(root, scope) {
  const testDir = path.join(root, scope, 'test');
  if (!fs.existsSync(testDir)) return [];
  return fs.readdirSync(testDir)
    .filter((name) => name.endsWith('.test.mjs'))
    .sort()
    .map((name) => scope.replace(/\\/g, '/').replace(/\/$/, '') + '/test/' + name);
}

/** 从 node --test 输出里取 tests／pass／fail 计数；取不到返回 null。 */
export function parseTestCounts(stdout) {
  const grab = (label) => {
    const match = new RegExp('(?:^|\\n)[^\\n]*?\\b' + label + '\\s+(\\d+)').exec(stdout);
    return match ? Number(match[1]) : null;
  };
  const tests = grab('tests');
  const pass = grab('pass');
  const fail = grab('fail');
  if (tests === null && pass === null) return null;
  return { tests: tests ?? ((pass ?? 0) + (fail ?? 0)), pass: pass ?? 0, fail: fail ?? 0 };
}

/** 汇总行（纯函数，测试可直接断言）。 */
export function formatGateLine({ scope, full, stages, tests, durationMs, logFile }) {
  const tsc = stages.find((stage) => stage.name === 'tsc');
  const testStage = stages.find((stage) => stage.name === 'tests');
  const exit = stages.every((stage) => stage.exit === 0) ? 0 : 1;
  const target = full ? 'mode=full' : 'scope=' + scope;
  const testsText = tests
    ? tests.tests + '/' + (tests.pass ?? 0)
    : (full ? 'delegated' : '-');
  return 'GATE ' + target + ' tsc=' + (tsc ? tsc.exit : '-') + ' tests=' + testsText
    + ' exit=' + exit + ' ms=' + durationMs + ' log=' + logFile
    + (testStage && testStage.exit !== 0 ? ' failed_stage=tests' : '');
}

/** 日志尾巴（终端只打最后 5 行）。 */
export function tailLines(text, count = 5) {
  return String(text).trimEnd().split('\n').slice(-count).join('\n');
}

function parseArgs(argv) {
  const opts = {
    scope: '',
    full: false,
    force: false,
    client: false,
    ticket: '',
    log: '',
    timeoutMs: 600000,
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
      case '--scope': opts.scope = need(); break;
      case '--full': opts.full = true; break;
      case '--force': opts.force = true; break;
      case '--client': opts.client = true; break;
      case '--ticket': opts.ticket = need(); break;
      case '--log': opts.log = need(); break;
      case '--timeout-ms': opts.timeoutMs = Number(need()); break;
      case '--help': case '-h': opts.help = true; break;
      default: throw new Error('未知参数：' + arg);
    }
  }
  if (opts.help) return opts;
  if (opts.scope === '' && !opts.full) throw new Error('必须给 --scope <包目录> 或 --full');
  if (opts.scope !== '' && opts.full) throw new Error('--scope 与 --full 二选一');
  return opts;
}

function appendLog(logFile, text) {
  fs.appendFileSync(logFile, text.endsWith('\n') ? text : text + '\n', 'utf8');
}

function runStage(name, command, args, { cwd, timeoutMs, logFile, shell = false }) {
  const started = Date.now();
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024, shell });
  const ms = Date.now() - started;
  const stage = {
    name,
    exit: result.status === null ? 124 : result.status,
    ms,
    timedOut: result.error?.code === 'ETIMEDOUT' || result.status === null,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
  appendLog(logFile, ['# STAGE ' + name + ' cmd=' + [command, ...args].join(' ') + ' exit=' + stage.exit + ' ms=' + ms, stage.stdout, stage.stderr].join('\n'));
  return stage;
}

async function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (opts.help) {
    console.log(USAGE);
    return 0;
  }
  const root = process.cwd();
  const scope = opts.scope.replace(/\\/g, '/').replace(/\/$/, '');

  // 前置检查：缺件先点名，别让 tsc 报一堆看不出根因的错
  const tscBin = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc');
  const problems = [];
  if (!fs.existsSync(tscBin)) problems.push('缺 ' + tscBin);
  if (!opts.full) {
    if (!fs.existsSync(path.join(root, scope, 'package.json'))) problems.push('scope 下没有 package.json：' + scope);
    if (collectTestFiles(root, scope).length === 0) problems.push('scope 下没有 test/*.test.mjs：' + scope);
  } else if (!fs.existsSync(path.join(root, 'tooling', 'check-real-home-untouched.mjs'))) {
    problems.push('缺 tooling/check-real-home-untouched.mjs（--full 的事实源）');
  }
  if (problems.length > 0) {
    console.error('PRECHECK FAIL ' + problems.join('；'));
    return 2;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = path.resolve(root, opts.log !== ''
    ? opts.log
    : (opts.ticket !== '' ? path.join('.scratch', 't' + opts.ticket, 'gate.log') : path.join('.scratch', 'gate', 'gate-' + stamp + '.log')));
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  fs.writeFileSync(logFile, [
    '# gate.mjs ' + new Date().toISOString(),
    '# cwd=' + root,
    '# argv=' + JSON.stringify(process.argv.slice(2)),
    '# node=' + process.version,
    '',
  ].join('\n'), 'utf8');
  console.log('LOG ' + logFile);

  const stages = [];
  const startedAt = Date.now();
  const tscTarget = opts.full ? '.' : scope;
  const tscArgs = ['-b', ...(opts.force ? ['--force'] : []), tscTarget];
  stages.push(runStage('tsc', process.execPath, [path.join('node_modules', 'typescript', 'bin', 'tsc'), ...tscArgs], {
    cwd: root, timeoutMs: opts.timeoutMs, logFile,
  }));
  console.log('STAGE tsc exit=' + stages[0].exit + ' ms=' + stages[0].ms);
  if (stages[0].exit !== 0) {
    console.log('TAIL\n' + tailLines(stages[0].stderr || stages[0].stdout));
    console.log(formatGateLine({ scope, full: opts.full, stages, tests: null, durationMs: Date.now() - startedAt, logFile }));
    return 1;
  }

  if (opts.client && !opts.full) {
    const scripts = readPackageScripts(path.join(root, scope));
    if (!scripts || !scripts['build:client']) {
      console.error('PRECHECK FAIL scope 的 package.json 没有 build:client：' + scope);
      return 2;
    }
    const client = runStage('client', 'npm', ['run', 'build:client'], {
      cwd: path.join(root, scope), timeoutMs: opts.timeoutMs, logFile, shell: process.platform === 'win32',
    });
    stages.push(client);
    console.log('STAGE client exit=' + client.exit + ' ms=' + client.ms);
    if (client.exit !== 0) {
      console.log('TAIL\n' + tailLines(client.stderr || client.stdout));
      console.log(formatGateLine({ scope, full: opts.full, stages, tests: null, durationMs: Date.now() - startedAt, logFile }));
      return 1;
    }
  }

  let tests = null;
  let testStage;
  if (opts.full) {
    testStage = runStage('tests', process.execPath, [path.join('tooling', 'check-real-home-untouched.mjs'), '--run'], {
      cwd: root, timeoutMs: opts.timeoutMs, logFile,
    });
  } else {
    testStage = runStage('tests', process.execPath, ['--test', ...collectTestFiles(root, scope)], {
      cwd: root, timeoutMs: opts.timeoutMs, logFile,
    });
    tests = parseTestCounts(testStage.stdout);
  }
  stages.push(testStage);
  console.log('STAGE tests exit=' + testStage.exit + ' ms=' + testStage.ms
    + (tests ? ' tests=' + tests.tests + ' pass=' + tests.pass + ' fail=' + tests.fail : ''));
  if (testStage.exit !== 0) {
    const failedLines = String(testStage.stdout + '\n' + testStage.stderr).split('\n')
      .filter((line) => /FAIL|✖|not ok|AssertionError|Error/i.test(line));
    console.log('TAIL\n' + tailLines(failedLines.length > 0 ? failedLines.join('\n') : (testStage.stdout + testStage.stderr)));
  }
  const gateLine = formatGateLine({ scope, full: opts.full, stages, tests, durationMs: Date.now() - startedAt, logFile });
  console.log(gateLine);
  return gateLine.includes(' exit=0 ') ? 0 : 1;
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
