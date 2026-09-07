import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openMemoDb, listNotes, getNote, searchNotes, findLarkCli, larkVersion, authOpenId, checkScope, larkReady, MemoFetchError } from '../dist/index.js';

const here = dirname(fileURLToPath(import.meta.url));
let db = null;
const OLD_ENV = process.env.LARK_CLI_PATH;

function note(id, title, body, category, sub) {
  return { id, title, body, category, sub: sub || null, createdAt: '2026-09-01', updatedAt: '2026-09-02' };
}

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
  const tmp = mkdtempSync(join(tmpdir(), 'memo-'));
  const dir = join(tmp, 'memo');
  mkdirSync(dir);
  writeFileSync(join(dir, 'n1.json'), JSON.stringify(note('n1', '去医院', '今天去医院复查', '备忘', null)));
  writeFileSync(join(dir, 'n2.json'), JSON.stringify(note('n2', '跑步', '今天跑了 5 公里', '打卡', '跑步')));
  writeFileSync(join(dir, 'n3.json'), JSON.stringify(note('n3', '学吉他', '心愿：学会一首歌', '心愿', null)));
  db = openMemoDb(dir);
  process.env.LARK_CLI_PATH = makeFakeCli(tmp);
});

describe('memo 取数层', () => {
  it('列/取/搜（CJK 子串+分类过滤）', () => {
    assert.equal(listNotes(db).length, 3);
    assert.equal(getNote(db, 'n2').sub, '跑步');
    assert.deepEqual(searchNotes(db, '跑步').map((n) => n.id), ['n2']);
    assert.deepEqual(searchNotes(db, '医院', { category: '备忘' }).map((n) => n.id), ['n1']);
  });
  it('坏输入 throw 不返空', () => {
    assert.throws(() => getNote(db, 'nope'), (e) => e instanceof MemoFetchError && e.code === 'MEMO_NOTE_NOT_FOUND');
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
