import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  openMemoDb,
  closeMemoDb,
  listNotes,
  getNote,
  searchNotes,
  findLarkCli,
  larkVersion,
  authOpenId,
  checkScope,
  larkReady,
  MemoFetchError,
} from '../dist/index.js';
import { saveMemoConfig } from '../dist/config.js';
import { mkMemoDb, seedNote } from './helpers/memo-sqlite.mjs';
import { mkConfigDir, useHome } from './helpers/config-base.mjs';

let db = null;
let n1 = 0;
let n2 = 0;
let n3 = 0;
/** 家目录两格的原值（本件在进程内接管家目录，收尾时原样还原；原本 `undefined` 的还原成删除）。 */
const OLD_HOME = { USERPROFILE: process.env.USERPROFILE, HOME: process.env.HOME };

// #695／#763：本件在**进程内**调取数层，配置也读在同一进程里 ⇒ 家目录必须在任何一次读配置**之前**接管
// （跑在 node 测试运行器里却要落到真实家目录的 `.ilife` 时，公共层直接抛 `CONFIG_TEST_ISOLATION_MISSING`）。
useHome(mkConfigDir('memo-fetch-home-'));

// fake lark-cli：posix 用 shebang 脚本，win 用 .cmd 转调同目录 mjs（均走 PATH 之 node）。
function makeFakeCli(dir) {
  const logic = [
    'const a = process.argv.slice(2);',
    "if (a[0] === '--version') { console.log('lark-cli 9.9.9-fake'); }",
    "else if (a[0] === 'auth' && a[1] === 'status') { console.log(JSON.stringify({ identities: { user: { openId: 'ou_fake' } } })); }",
    "else if (a[0] === 'auth' && a[1] === 'check') { process.exit(a[3] === 'task' ? 0 : 1); }",
    'else { console.error(\'unknown\'); process.exit(2); }',
    '',
  ].join('\n');
  if (process.platform === 'win32') {
    const mjs = join(dir, 'fakelark.mjs');
    writeFileSync(mjs, logic);
    const cmd = join(dir, 'fakelark.cmd');
    writeFileSync(cmd, '@node "' + mjs + '" %*\r\n');
    return cmd;
  }
  const sh = join(dir, 'fakelark');
  writeFileSync(sh, '#!/usr/bin/env node\n' + logic);
  chmodSync(sh, 0o755);
  return sh;
}

before(() => {
  const dir = mkMemoDb('memo-fetch-');
  n1 = seedNote(dir, { content: '今天去医院复查', category: '备忘' });
  n2 = seedNote(dir, { content: '今天跑步5公里', category: '打卡', sub: '跑步' });
  n3 = seedNote(dir, { content: '心愿：学会一首歌', category: '心愿' });
  db = openMemoDb(dir);
  // `lark.cliPath` 走**配置文件**（#695：环境变量 `LARK_CLI_PATH` 读取已删）。写盘用 `saveMemoConfig`
  // ——它落盘后清掉进程内的配置记忆，故紧随其后的 `findLarkCli()` 现读现取，改一项即生效。
  saveMemoConfig({ lark: { cliPath: makeFakeCli(mkdtempSync(join(tmpdir(), 'memo-fake-'))) } });
});

after(() => {
  if (db) closeMemoDb(db);
  for (const [k, v] of Object.entries(OLD_HOME)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe('memo 取数层', () => {
  it('列/取/搜（CJK 子串+分类过滤）', () => {
    assert.equal(listNotes(db).length, 3);
    assert.equal(getNote(db, n2).sub_category, '跑步');
    assert.deepEqual(searchNotes(db, '跑步').map((n) => n.id), [n2]);
    assert.deepEqual(searchNotes(db, '医院', { category: '备忘' }).map((n) => n.id), [n1]);
  });
  it('坏输入 throw 不返空', () => {
    assert.throws(() => getNote(db, 999999), (e) => e instanceof MemoFetchError && e.code === 'MEMO_NOTE_NOT_FOUND');
    assert.throws(() => getNote(db, 'nope'), (e) => e.code === 'MEMO_NOTE_NOT_FOUND');
    assert.throws(() => searchNotes(db, '  '), (e) => e.code === 'MEMO_BAD_QUERY');
    assert.throws(() => openMemoDb(join(tmpdir(), 'memo-nope-xyz')), (e) => e.code === 'MEMO_DB_MISSING');
  });
  it('lark 四门（fake CLI）：存在+版本+登录+scope', () => {
    assert.ok((findLarkCli() || '').length > 0);
    assert.match(larkVersion(findLarkCli()), /fake/);
    assert.equal(authOpenId(findLarkCli()), 'ou_fake');
    assert.equal(checkScope(findLarkCli(), 'task'), true);
    assert.equal(checkScope(findLarkCli(), 'nope'), false);
    const ready = larkReady();
    assert.equal(ready.openId, 'ou_fake');
  });
  it('lark.cliPath 坏路径 throw（报错点名配置项，不再点名环境变量 LARK_CLI_PATH）', () => {
    saveMemoConfig({ lark: { cliPath: join(tmpdir(), 'memo-nope-xyz') } });
    const caught = [];
    assert.throws(() => findLarkCli(), (e) => { caught.push(e); return e.code === 'LARK_UNAVAILABLE'; });
    assert.throws(() => larkReady(), (e) => e.code === 'LARK_UNAVAILABLE', '四门入口同样大声失败，不静默降级');
    assert.match(caught[0].message, /lark\.cliPath/, '报错文案要点名配置项 lark.cliPath');
    assert.doesNotMatch(caught[0].message, /LARK_CLI_PATH/, '环境变量读取已删（#695）：报错不许再点名它');
  });
});
