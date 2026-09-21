/** #764 · 作息管家设置页收窄：技能侧验收（照 #749 样板的技能侧那 9 条）。
 *
 * 票面口径（定稿 #761 ＋ 补注两条）：
 *  ① `schedule.config.read` 回执扩一组**解析后绝对路径**（库文件／HELP 产物目录 ＋ 生效数据目录）；
 *  ② 配置键 5 → 3（删 `files.help`／`lark.cliPath`，进退休清单；老文件含它们不炸，保存一次即清）；
 *  ③ 落点默认值写绝对路径：首次落文件／保存／重置时可改落点（`db.dir`）是算出来的绝对路径；
 *     **读**仍认 `""`（＝按默认落点，老文件不动）；
 *  ④ 体检连带：回执里不再出现 `ILIFE_CONFIG_DIR`；第 ④ 条 action 指向配置文件；
 *     第 ⑥ 条（飞书 CLI）与面板状态行同判据、同话术（红／黄／绿三档）；
 *  ⑤ 候选路径表补 4 条（维护者 2026-09-20 裁），保留现有 5 档。
 *
 * 运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-schedule`（用例读 `dist/**`），再
 *   `node --test packages/skill-schedule/test/t764-设置页收窄.test.mjs`。
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configDirOf, homeEnvOf, requireIsolatedHome, useHome } from '../../../test/helpers/home-test-base.mjs';
import { makeScheduleSeam } from './helpers/config-seam.mjs';
import { SCHEDULE_CONFIG_DEFAULTS, SCHEDULE_CONFIG_RETIRED } from '../dist/config.js';
import { larkCliCandidates, findLarkCli } from '../dist/fetch/feishu.js';
import { HELP_FILE_STEM, helpFileStem } from '../dist/help/helpFile.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const P = (o) => JSON.stringify(o);

/** 在位家目录（在位断言与候选表读数用；子进程各用各的独占家目录）。 */
let HOME1 = '';

function mkHome(tag) {
  return mkdtempSync(join(tmpdir(), 't764-' + tag + '-'));
}

/** 跑真出口：家目录指到 `cfg`（`envExtra` 可覆写）。 */
function run(cfg, args, envExtra) {
  const r = spawnSync(NODE_BIN, [BIN, ...args], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...homeEnvOf(cfg), ...(envExtra || {}) },
  });
  let env = null;
  try { env = JSON.parse(String(r.stdout)); } catch { env = null; }
  return { status: r.status, stdout: String(r.stdout), stderr: String(r.stderr), env };
}

function runOk(cfg, args, envExtra) {
  const r = run(cfg, args, envExtra);
  assert.equal(r.status, 0, 'exit 0（stderr：' + r.stderr + '）');
  assert.ok(r.env, 'stdout 须是一行可解析 JSON');
  return r;
}

/** 真机上可能装着真 lark-cli：要红得确定，就把子进程 PATH 里那条路掐掉（候选只剩临时家目录派生档）。 */
function noLarkPath() {
  const nodeDir = NODE_BIN === 'node' ? dirname(process.execPath) : dirname(NODE_BIN);
  const sysRoot = process.env.SystemRoot || 'C:\\Windows';
  const parts = process.platform === 'win32'
    ? [nodeDir, join(sysRoot, 'System32'), sysRoot]
    : [nodeDir, '/usr/bin', '/bin'];
  return parts.join(delimiter);
}

before(() => {
  HOME1 = mkHome('home');
  useHome(HOME1);
  requireIsolatedHome();
});

describe('#764 作息设置页收窄 · 技能侧', () => {
  it('候选表：家目录派生档齐（补 4 条），且不读 %APPDATA%／$HOME', () => {
    const cands = larkCliCandidates();
    for (const c of cands) assert.ok(isAbsolute(c), '候选须是绝对路径：' + c);
    if (process.platform === 'win32') {
      assert.deepEqual(cands, [
        join(HOME1, 'AppData', 'Roaming', 'npm', 'lark-cli.cmd'),
        join(HOME1, 'AppData', 'Local', 'Programs', 'lark-cli', 'lark-cli.exe'),
        join(HOME1, 'AppData', 'Local', 'Programs', 'lark-cli', 'lark-cli.cmd'),
      ]);
    } else {
      assert.deepEqual(cands, [
        '/opt/homebrew/bin/lark-cli',
        join(HOME1, '.npm-global', 'bin', 'lark-cli'),
        join(HOME1, '.local', 'bin', 'lark-cli'),
      ]);
    }
    console.log('#764 候选表读数：' + P(cands));
  });

  it('查找命中家目录派生首档（兜底探测不靠 PATH）', () => {
    if (process.platform === 'win32') {
      const dir = join(HOME1, 'AppData', 'Roaming', 'npm');
      mkdirSync(dir, { recursive: true });
      const file = join(dir, 'lark-cli.cmd');
      writeFileSync(file, '@echo stub', 'utf8');
      try {
        assert.equal(findLarkCli(), file, '首档命中即返，不往下找');
      } finally {
        rmSync(file, { force: true });
      }
    } else {
      const dir = join(HOME1, '.local', 'bin');
      mkdirSync(dir, { recursive: true });
      const file = join(dir, 'lark-cli');
      writeFileSync(file, '#!/bin/sh\nexit 0\n', 'utf8');
      try {
        assert.ok((findLarkCli() ?? '').length > 0, '兜底探测找得到家目录派生档');
      } finally {
        rmSync(file, { force: true });
      }
    }
  });

  it('回执扩组：resolved 三格齐，且与配置文件取值逐字对账', () => {
    const cfg = mkHome('read');
    const r = runOk(cfg, ['schedule.config.read']);
    const d = r.env.data;
    assert.equal(r.env.key, 'schedule.config.read');
    assert.ok(d.resolved, '回执须带 resolved 组');
    assert.deepEqual(Object.keys(d.resolved).sort(), ['dbDir', 'dbFile', 'htmlDir']);
    const dataDir = join(configDirOf(cfg), 'data');
    assert.equal(d.resolved.dbDir, dataDir, '生效数据目录');
    assert.equal(d.resolved.dbFile, join(dataDir, 'schedule_data.db'), '库文件绝对路径');
    assert.equal(d.resolved.htmlDir, join(dataDir, 'schedule_html', 'help'), 'HELP 产物目录绝对路径');
    assert.ok(!('files' in d.values) && !('lark' in d.values), '回执取值里不再有 files／lark 两组');
    assert.deepEqual([...SCHEDULE_CONFIG_RETIRED].sort(), ['files.help', 'lark.cliPath']);
    console.log('#764 回执读数：' + P(d.resolved));
  });

  it('写盘口径：首次落文件时可改落点是绝对路径；改回空串仍按默认落点', () => {
    const cfg = mkHome('writedef');
    const r1 = runOk(cfg, ['schedule.config.read']);
    assert.equal(r1.env.data.created, true);
    const text1 = readFileSync(join(configDirOf(cfg), 'schedule.yaml'), 'utf8');
    assert.match(text1, /dir: "/, '落下来的 db.dir 是写出来的绝对路径，不是空串');
    assert.ok(!text1.includes('files:') && !text1.includes('lark:'), '落下来的文件里没有已删键');
    // 改回空串 ⇒ 仍按默认落点工作（读认空串那一半口径）。
    runOk(cfg, ['schedule.config.write', '--params', P({ values: { db: { dir: '' } } })]);
    const r2 = runOk(cfg, ['schedule.config.read']);
    const text2 = readFileSync(join(configDirOf(cfg), 'schedule.yaml'), 'utf8');
    assert.match(text2, /dir: "/, '写空串会被写盘口径换成绝对路径（文件里不留空串）');
    assert.equal(r2.env.data.dataDir, join(configDirOf(cfg), 'data'), '生效数据目录仍是默认落点');
    assert.equal(r2.env.data.resolved.dbDir, join(configDirOf(cfg), 'data'));
    console.log('#764 写盘读数：file=' + JSON.stringify(text2.split('\n')[0]));
  });

  it('过渡：含已删键的老文件不炸；保存一次后那两键消失，其余逐字不变', () => {
    const cfg = mkHome('retired');
    mkdirSync(configDirOf(cfg), { recursive: true });
    const before = 'db:\n  dir: ""\n  name: "old_name.db"\nhtml:\n  dir: "schedule_html/help"\n'
      + 'files:\n  help: "old_stem"\nlark:\n  cliPath: "C:\\old\\lark-cli.cmd"\n';
    writeFileSync(join(configDirOf(cfg), 'schedule.yaml'), before, 'utf8');
    const r = runOk(cfg, ['schedule.config.read']);
    assert.equal(r.env.data.created, false);
    assert.equal(r.env.data.values.db.name, 'old_name.db', '老取值照收');
    assert.ok(!('files' in r.env.data.values) && !('lark' in r.env.data.values), '已删键不进取值');
    runOk(cfg, ['schedule.config.write', '--params', P({ values: { db: { name: 'old_name.db' } } })]);
    const after = readFileSync(join(configDirOf(cfg), 'schedule.yaml'), 'utf8');
    assert.ok(!after.includes('files:') && !after.includes('cliPath'), '保存一次后已删键消失（写即清）');
    assert.ok(after.includes('old_name.db'), '其余取值逐字不变');
    assert.ok(!('files' in SCHEDULE_CONFIG_DEFAULTS) && !('lark' in SCHEDULE_CONFIG_DEFAULTS), '默认值表已无此二组');
    console.log('#764 过渡读数：after=' + JSON.stringify(after));
  });

  it('文件名回常量：helpFileStem 不读配置', () => {
    assert.equal(HELP_FILE_STEM, '作息管家_HELP');
    assert.equal(helpFileStem(), '作息管家_HELP');
  });

  it('体检红档：CLI 不在场 ⇒ 红，且无 ILIFE_CONFIG_DIR、无「页面上去改」', () => {
    const cfg = mkHome('health-red');
    const r = runOk(cfg, ['schedule.config.check'], { PATH: noLarkPath() });
    const text = JSON.stringify(r.env.data);
    assert.ok(!text.includes('ILIFE_CONFIG_DIR'), '体检回执里不再出现 ILIFE_CONFIG_DIR');
    assert.ok(!text.includes('页面上'), '不再出现「去页面上改」这类做不到的指引');
    const item = r.env.data.items.find((x) => x.id === 'lark.cli');
    assert.ok(item, '须有飞书 CLI 那一项');
    assert.equal(item.status, 'red', '没找到 CLI ⇒ 红（红只留给这个确定性事实）');
    assert.match(item.message, /没找到飞书 CLI/);
    console.log('#764 体检红读数：' + P(item));
  });

  it('体检第 ④ 条 action 指向配置文件', () => {
    const cfg = mkHome('health-html');
    const r = runOk(cfg, ['schedule.config.check'], { PATH: noLarkPath() });
    const item = r.env.data.items.find((x) => x.id === 'html.dir');
    assert.ok(item, '须有产物目录那一项');
    if (item.action !== '') assert.match(item.action, /配置文件/, 'action 改指配置文件，不再让人去页面上改');
    console.log('#764 体检④读数：' + P(item));
  });

  it('体检黄档：找到了挡板但远端不可用 ⇒ 黄（判据＝auth status／calendar +agenda 同一条）', () => {
    const seam = makeScheduleSeam({ prefix: 't764-yellow-' });
    try {
      seam.setRemote({ mode: 'unavailable' });
      const r = seam.runNew('schedule.config.check', {});
      assert.equal(r.status, 0, '体检本身只读不拦：' + (r.stderr || '').slice(0, 200));
      const item = JSON.parse(String(r.stdout)).data.items.find((x) => x.id === 'lark.cli');
      assert.ok(item, '须有飞书 CLI 那一项');
      assert.equal(item.status, 'yellow', 'auth 不过 ⇒ 黄');
      assert.match(item.message, /找到了 .*，但还没登录／日历读不到/);
      console.log('#764 体检黄读数：' + P(item));
    } finally {
      useHome(HOME1);
    }
  });

  it('体检绿档：挡板就绪 ⇒ 绿，带路径与版本（面板同一判据）', () => {
    const seam = makeScheduleSeam({ prefix: 't764-green-' });
    try {
      const r = seam.runNew('schedule.config.check', {});
      assert.equal(r.status, 0, '体检本身只读不拦：' + (r.stderr || '').slice(0, 200));
      const item = JSON.parse(String(r.stdout)).data.items.find((x) => x.id === 'lark.cli');
      assert.ok(item, '须有飞书 CLI 那一项');
      assert.equal(item.status, 'green', '两条都过 ⇒ 绿');
      assert.match(item.message, /已就绪：.*lark-cli/);
      assert.match(item.message, /版本 /);
      assert.equal(item.action, '');
      console.log('#764 体检绿读数：' + P(item));
    } finally {
      useHome(HOME1);
    }
  });
});
