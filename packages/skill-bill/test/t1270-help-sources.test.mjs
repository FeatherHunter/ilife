// #1270 · 生成期来源读取（条目 10）：出口渲染 HELP 前读的就是这一件（`src/help/helpSources.ts`）。
// 判据三条，都是「读不出不是故障」这条口径的现场读数：
//   ① 库不在（没初始化）⇒ initialized:false ＋ 候选空表——页面照出、横幅照显；
//   ② 库在 ⇒ initialized:true ＋ 候选＝库里的真标签（全数字词是记录编号，不算标签）；
//   ③ 库件坏了（不是 sqlite）⇒ 文件在就算已初始化，候选读不出即空表，不抛错。
// 隔离：家目录指到临时目录（`test/helpers/home-test-base.mjs` 的 `useHome`），配置与库都落沙盒里。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { useHome, requireIsolatedHome } from '../../../test/helpers/home-test-base.mjs';

const home = useHome(mkdtempSync(join(tmpdir(), 'bill-1270-home-')));
requireIsolatedHome(home);

const { readHelpSources } = await import('../dist/help/index.js');
const { resolveDbPath } = await import('../dist/fetch/index.js');

test('#1270 · 库不在 ⇒ 未初始化 ＋ 候选空表（页面照出、横幅照显）', () => {
  const sources = readHelpSources();
  assert.equal(sources.initialized, false, '库文件不在即未初始化');
  assert.deepEqual(sources.tagCandidates, [], '读不出候选即空表，不是故障');
});

test('#1270 · 库在 ⇒ 已初始化 ＋ 候选＝真标签（全数字编号不算标签）', () => {
  const dbFile = resolveDbPath();
  const db = new DatabaseSync(dbFile);
  db.exec('CREATE TABLE bills (id INTEGER PRIMARY KEY, note TEXT, deleted_at TEXT)');
  const insert = db.prepare('INSERT INTO bills (note, deleted_at) VALUES (?, ?)');
  insert.run('午饭 #待报销', null);
  insert.run('#待报销 #分期', null);
  insert.run('编号单 #10385', null);
  insert.run('删掉的那条 #退款', '2026-10-13 00:00:00');
  db.close();

  const sources = readHelpSources();
  assert.equal(sources.initialized, true, '库文件在即已初始化');
  assert.deepEqual(sources.tagCandidates, ['待报销', '分期'],
    '次数降序（待报销 ×2 → 分期 ×1）、全数字词丢掉、已删记录不进候选');
});

test('#1270 · 库件坏了 ⇒ 仍算已初始化，候选退回空表（不抛错）', () => {
  const dbFile = resolveDbPath();
  writeFileSync(dbFile, '这不是一个 sqlite 库件', 'utf8');
  const sources = readHelpSources();
  assert.equal(sources.initialized, true, '文件在就是已初始化——初始化判据是文件存在，不是能不能读');
  assert.deepEqual(sources.tagCandidates, [], '打不开即空表，槽位退回自由文本');
});
