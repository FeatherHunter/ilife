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
import { mkConfigDir, useHome } from './helpers/config-base.mjs';

let db = null;
let n1 = 0;
let n2 = 0;
let n3 = 0;
/** 家目录两格的原值（本件在进程内接管家目录，收尾时原样还原；原本 `undefined` 的还原成删除）。 */
const OLD_HOME = { USERPROFILE: process.env.USERPROFILE, HOME: process.env.HOME };
/** PATH 原值（#760 起本件在进程内把挡板目录放首位，收尾还原）。 */
let OLD_PATH;

// #695／#763：本件在**进程内**调取数层，配置也读在同一进程里 ⇒ 家目录必须在任何一次读配置**之前**接管
// （跑在 node 测试运行器里却要落到真实家目录的 `.ilife` 时，公共层直接抛 `CONFIG_TEST_ISOLATION_MISSING`）。
useHome(mkConfigDir('memo-fetch-home-'));

// fake lark-cli：posix 用 shebang 脚本，win 用 .cmd 转调同目录 mjs（均走 PATH 之 node）。
// #760 起它走 **PATH 首位**注入（`lark.cliPath` 删键）：目录里放一份 `lark-cli` 名的挡板，
// 子进程的 `where`／`which` 首中它（win32 优先 `.cmd` 行）。
function makeFakeCliBin(dir) {
  const logic = [
    'const a = process.argv.slice(2);',
    "if (a[0] === '--version') { console.log('lark-cli 9.9.9-fake'); }",
    "else if (a[0] === 'auth' && a[1] === 'status') { console.log(JSON.stringify({ identities: { user: { openId: 'ou_fake' } } })); }",
    "else if (a[0] === 'auth' && a[1] === 'check') { process.exit(a[3] === 'task' ? 0 : 1); }",
    'else { console.error(\'unknown\'); process.exit(2); }',
    '',
  ].join('\n');
  const mjs = join(dir, 'fakelark.mjs');
  writeFileSync(mjs, logic);
  if (process.platform === 'win32') {
    writeFileSync(join(dir, 'lark-cli.cmd'), '@node "' + mjs + '" %*\r\n');
    return dir;
  }
  const sh = join(dir, 'lark-cli');
  writeFileSync(sh, '#!/usr/bin/env node\n' + logic);
  chmodSync(sh, 0o755);
  return dir;
}

before(() => {
  const dir = mkMemoDb('memo-fetch-');
  n1 = seedNote(dir, { content: '今天去医院复查', category: '备忘' });
  n2 = seedNote(dir, { content: '今天跑步5公里', category: '打卡', sub: '跑步' });
  n3 = seedNote(dir, { content: '心愿：学会一首歌', category: '心愿' });
  db = openMemoDb(dir);
  // #760 起挡板走 **PATH 首位**（`lark.cliPath` 删键，无显式覆盖）：当刻进程的 PATH 首位即挡板目录，
  // 故本件（进程内调取数层）的 `findLarkCli()` 现找现中。收尾原样还原 PATH。
  OLD_PATH = process.env.PATH;
  const sep = process.platform === 'win32' ? ';' : ':';
  process.env.PATH = makeFakeCliBin(mkdtempSync(join(tmpdir(), 'memo-fake-'))) + sep + (OLD_PATH ?? '');
});

after(() => {
  if (db) closeMemoDb(db);
  for (const [k, v] of Object.entries(OLD_HOME)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  if (OLD_PATH === undefined) delete process.env.PATH;
  else process.env.PATH = OLD_PATH;
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
  it('无显式覆盖：删键后 findLarkCli 只走探测链（#760）', async () => {
    // `lark.cliPath` 键已删：探测链只认 PATH／固定路径，不认任何配置覆盖。
    // 本件 PATH 首位即挡板 ⇒ 命中的必是挡板那一份（`larkTierInfo` 同链）。
    const { larkTierInfo } = await import('../dist/sync/feishu.js');
    const found = findLarkCli();
    assert.ok(String(found).length > 0);
    const tier = larkTierInfo();
    assert.equal(tier.tier, 'full');
    assert.equal(tier.cliPath, found);
    assert.match(String(tier.version), /fake/);
  });
});
