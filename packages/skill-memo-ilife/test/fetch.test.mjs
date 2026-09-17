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
import { mkMemoDb, seedNote } from './helpers/memo-sqlite.mjs';

let db = null;
let n1 = 0;
let n2 = 0;
let n3 = 0;
const OLD_ENV = process.env.LARK_CLI_PATH;

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
  process.env.LARK_CLI_PATH = makeFakeCli(mkdtempSync(join(tmpdir(), 'memo-fake-')));
});

after(() => {
  if (db) closeMemoDb(db);
  process.env.LARK_CLI_PATH = OLD_ENV;
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
  it('LARK_CLI_PATH 坏路径 throw', () => {
    process.env.LARK_CLI_PATH = join(tmpdir(), 'memo-nope-xyz');
    assert.throws(() => findLarkCli(), (e) => e.code === 'LARK_UNAVAILABLE');
  });
});
