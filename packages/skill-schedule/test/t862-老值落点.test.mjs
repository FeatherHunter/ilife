/** #862 · 老配置文件里的两级 `html.dir`（#843 之前的老形状）不许被新算式多算一级。
 *
 * 病（用户 2026-09-21 报告「作息管家的配置面板不正常，其他五个都正常」）：#843（「产物落点分家」）把
 * `html.dir` 从「产物根 ＋ HELP 子目录」两级改成「产物根」一级、HELP 那一级另由 `html.helpDir` 补；
 * 老配置文件里的两级值（本机 `~/.ilife/schedule.yaml` 是 `dir: schedule_html/help`）照新算式算就多出一级
 * ——`<库>/schedule_html/help/help`，产物根也被塞进 HELP 目录里。用户没做错事（#762 的同一口径）。
 *
 * 本文件锁四条读数：
 *  ① 老值 ⇒ HELP 落点 `<库>/schedule_html/help`、产物根 `<库>/schedule_html`（与升级前逐字相同），
 *    且**真出口**（`schedule.config.read` 的 `resolved.htmlDir`，＝设置页那一行显示的值）也是它；
 *  ② 反向对照：**不用**认账那一步时（拿两个算式原样拼）会拼出 `…/help/help`——这条证明本用例有识别力，
 *    不是恒真的摆设；
 *  ③ 新形状（`dir: schedule_html` ＋ `helpDir: help`）逐字给出同一组落点，不受影响；
 *  ④ 别的值（`dir: pages` ＋ `helpDir: docs`）照新算式算：根 `<库>/pages`、HELP `<库>/pages/docs`。
 *
 * 运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-schedule`（用例读 `dist/**`），再
 *   `node --test packages/skill-schedule/test/t862-老值落点.test.mjs`。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { configDirOf, homeEnvOf, requireIsolatedHome, useHome } from '../../../test/helpers/home-test-base.mjs';
import { helpDirOf, htmlDirOf, resolveHelpDirOf, resolveHtmlDir, resolvedSchedulePaths } from '../dist/fetch/paths.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';

/** 一份临时家目录 ＋ 写好的 `schedule.yaml`（受限 YAML 子集的形状，逐字照真实文件）。 */
function mkHome(tag, htmlBlock) {
  const home = mkdtempSync(join(tmpdir(), 't862-' + tag + '-'));
  mkdirSync(configDirOf(home), { recursive: true });
  writeFileSync(
    join(configDirOf(home), 'schedule.yaml'),
    'db:\n  dir: ""\n  name: schedule_data.db\nhtml:\n' + htmlBlock,
    'utf8',
  );
  return home;
}

/** 数据目录：`db.dir` 空串 ⇒ 配置给出的 `<家目录>/.ilife/data`。 */
const dataDirOf = (home) => join(configDirOf(home), 'data');

/** 跑真出口：家目录指到 `home` 的那一份。 */
function readViaCli(home) {
  return spawnSync(NODE_BIN, [BIN, 'schedule.config.read', '--params', '{}'], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: homeEnvOf(home),
  });
}

test('#862 ① 老值（两级 html.dir）⇒ 落点与升级前逐字相同；真出口显示的就是它', () => {
  const home = mkHome('legacy', '  dir: schedule_html/help\n');
  const data = dataDirOf(home);
  useHome(home);

  // 进程内：两个算式
  assert.equal(resolveHtmlDir(), join(data, 'schedule_html'), '产物根＝<库>/schedule_html（不再含 help 一级）');
  assert.equal(resolveHelpDirOf(), join(data, 'schedule_html', 'help'), 'HELP 落点＝<库>/schedule_html/help');
  assert.equal(resolvedSchedulePaths().htmlDir, join(data, 'schedule_html', 'help'), '面板那一格＝HELP 落点');

  // 真出口：设置页那行显示的正是 resolved.htmlDir
  const r = readViaCli(home);
  assert.equal(r.status, 0, 'exit 0（stderr：' + r.stderr + '）');
  const env = JSON.parse(String(r.stdout));
  assert.equal(env.data.resolved.htmlDir, join(data, 'schedule_html', 'help'), '真出口的 resolved.htmlDir');
  assert.equal(env.data.values.html.dir, 'schedule_html/help', '配置文件里的值一个字不改（认账发生在解析处）');
});

test('#862 ② 反向对照：不认这个形状就会多算一级（用例有识别力，不是恒真）', () => {
  const home = mkHome('control', '  dir: schedule_html/help\n');
  const data = dataDirOf(home);
  useHome(home);
  // 新算式原样拼（不认老形状）＝修复前的结果：多一级 help
  assert.equal(
    helpDirOf(htmlDirOf(data, 'schedule_html/help'), 'help'),
    join(data, 'schedule_html', 'help', 'help'),
    '这是修复前那条算式的结果',
  );
  assert.notEqual(resolvedSchedulePaths().htmlDir, join(data, 'schedule_html', 'help', 'help'), '修好之后不许再是它');
});

test('#862 ③ 新形状（产物根 ＋ helpDir）给出同一组落点，不受影响', () => {
  const home = mkHome('fresh', '  dir: schedule_html\n  helpDir: help\n');
  const data = dataDirOf(home);
  useHome(home);
  assert.equal(resolveHtmlDir(), join(data, 'schedule_html'));
  assert.equal(resolveHelpDirOf(), join(data, 'schedule_html', 'help'));
  const r = readViaCli(home);
  assert.equal(r.status, 0, 'exit 0（stderr：' + r.stderr + '）');
  assert.equal(JSON.parse(String(r.stdout)).data.resolved.htmlDir, join(data, 'schedule_html', 'help'));
});

test('#862 ④ 别的值照新算式算：末段不与 helpDir 同名就不动它', () => {
  const home = mkHome('custom', '  dir: pages\n  helpDir: docs\n');
  const data = dataDirOf(home);
  useHome(home);
  requireIsolatedHome();
  assert.equal(resolveHtmlDir(), join(data, 'pages'), '产物根＝<库>/pages');
  assert.equal(resolveHelpDirOf(), join(data, 'pages', 'docs'), 'HELP 落点＝<库>/pages/docs');
});
