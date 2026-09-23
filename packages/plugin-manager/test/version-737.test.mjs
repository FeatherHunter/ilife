// 票 #737 自证回路：面板那行的版本号**不手写**，由宿主读自己这份已安装包的 `package.json`。
//
// 现象（2026-09-20 实测）：包已是 0.2.7，面板印 0.2.6 —— 手写常量 `MANAGER_VERSION` 漏了跟定版走，
// 而它是「屏上那行」的唯一来源。第一版修法把常量改对 ＋ 立一条「常量 ≡ 包版本」的门；
// 维护者 2026-09-20 裁定改走**自动读取**（常量这条源就不要了）：读完盘，「屏上那行 ≡ 装机包版本」
// 由构造保证，定版也只剩改 `package.json` 一处。
//
// 本回路咬三条，都不咬写法：
//   ① 宿主读值：`readManagerVersion()` 读的就是本包 `package.json`；给哨兵件就读哨兵的 version；
//      读不到（缺文件／非 JSON／字段缺失／空串）一律回 `unknown` 且**不抛**。
//   ② 不手写回潮：产物 `dist/client.js` 里不许再出现带版本号的屏幕字面量（`总管 dsh-life-pack · <数字>`），
//      且必须带着那条电话名（版本是问宿主要的）。
//   ③ 屏幕那行真跟着宿主跑：拿真产物渲一次组件 —— 宿主回哨兵版本，屏上就是哨兵；
//      宿主回 unknown，屏上就是 unknown（写死常量、或面板自己编一个值，都过不了这两条）。
//
// 渲染替身（③用）原先写在本文件里，票 #738 也要在同一条路上读页签条的字，
// 故提到仓根共用：`test/helpers/panel-render.mjs`（两份拷贝就是两处腐化）。
//
// 前提：①②③ 都读产物，所以要先出产物（CI 的顺序正是先 `pnpm build` 再 `pnpm test`）：
//   node node_modules/typescript/bin/tsc -b packages/plugin-manager
//   cmd /c "cd /d <仓根>\packages\plugin-manager && node node_modules\tsdown\dist\run.mjs"
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { renderManagerPanel } from '../../../test/helpers/panel-render.mjs';
import { installedVersionOf, managerPackageJsonPath, readManagerVersion } from '../dist/manager-version.js';
import { MANAGER_ACTIONS, VERSION_UNKNOWN } from '../dist/update-contract.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_DIR = join(HERE, '..');
const PKG = JSON.parse(readFileSync(join(PKG_DIR, 'package.json'), 'utf8'));
const CLIENT = readFileSync(join(PKG_DIR, 'dist', 'client.js'), 'utf8');
/** 哨兵：一个绝不可能出现在真包里的版本号（面板要是自己编值，就对不上它）。 */
const SENTINEL = '9.9.9-哨兵';

/** 临时目录只为本回路造哨兵件；用完即删（路径守卫：只删自己这个前缀的临时根）。 */
function withTmpDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), 't737-reader-'));
  try {
    return fn(dir);
  } finally {
    if (!dir.split(/[\\/]/).pop().startsWith('t737-reader-')) throw new Error('清理守卫拒绝：' + dir);
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('票 #737 ① 宿主读值：读的是自己这份包描述文件', () => {
  it('默认路径就是本包 package.json（dist/manager-version.js → ../package.json）', () => {
    assert.equal(managerPackageJsonPath(), join(PKG_DIR, 'package.json'));
  });

  it('读出来的就是那份文件的 version（装机态读装机包，开发单仓读本包，同一段代码）', () => {
    assert.equal(readManagerVersion(), PKG.version);
  });

  it('哨兵件：给哪份就读哪份的 version（证明它是真读文件，不是源码里抄来的值）', () => {
    withTmpDir((dir) => {
      const file = join(dir, 'package.json');
      writeFileSync(file, JSON.stringify({ name: 'dsh-life-pack', version: SENTINEL }), 'utf8');
      assert.equal(readManagerVersion(file), SENTINEL);
    });
  });

  it('读不到一律 unknown 且不抛：缺文件／非 JSON／没这个字段／空串', () => {
    withTmpDir((dir) => {
      assert.equal(readManagerVersion(join(dir, 'nope.json')), VERSION_UNKNOWN, '缺文件该回 unknown');
      const bad = join(dir, 'bad.json');
      writeFileSync(bad, '{ 这不是 JSON', 'utf8');
      assert.equal(readManagerVersion(bad), VERSION_UNKNOWN, '非 JSON 该回 unknown');
      const none = join(dir, 'none.json');
      writeFileSync(none, JSON.stringify({ name: 'dsh-life-pack' }), 'utf8');
      assert.equal(readManagerVersion(none), VERSION_UNKNOWN, '没有 version 字段该回 unknown');
      const blank = join(dir, 'blank.json');
      writeFileSync(blank, JSON.stringify({ version: '   ' }), 'utf8');
      assert.equal(readManagerVersion(blank), VERSION_UNKNOWN, '空串该回 unknown');
    });
  });
});

describe('票 #737 ② 不手写回潮：版本号不是面板写死的', () => {
  it('产物里不许再出现带版本号的屏幕字面量（写死即红）', () => {
    const frozen = /总管 dsh-life-pack · \d/.exec(CLIENT);
    assert.equal(frozen, null, '产物里又写死了版本号：' + (frozen ? frozen[0] : ''));
  });

  it('产物里带着那条电话名（版本是问宿主要的）', () => {
    assert.ok(CLIENT.includes(MANAGER_ACTIONS.version), 'client 束里没有电话名 ' + MANAGER_ACTIONS.version);
  });
});

describe('票 #737 ③ 屏幕那行跟着宿主跑（真产物渲一次）', () => {
  it('宿主回哨兵版本 → 屏上就是哨兵（写死常量、面板自己编值，都过不了）', async () => {
    const { text } = await renderManagerPanel({ reply: { version: SENTINEL } });
    assert.ok(text.includes('总管 dsh-life-pack · ' + SENTINEL), '屏上那行不是哨兵，取到的是：' + text.slice(0, 160));
  });

  it('宿主回 unknown（读不到）→ 屏上就是 unknown，不抛也不编值', async () => {
    const { text } = await renderManagerPanel({ reply: { fail: true } });
    assert.ok(text.includes('总管 dsh-life-pack · ' + VERSION_UNKNOWN), '读不到时屏上该是 unknown，取到的是：' + text.slice(0, 160));
  });
});

describe('票 #918 ② 按包名读装机版本（六家与技能侧共用的那一处）', () => {
  it('读自己这个包：值＝本包 package.json 的 version', () => {
    assert.equal(installedVersionOf('dsh-life-pack'), PKG.version);
  });

  it('哨兵件：从 from 那份模块出发按包名解析——给哪份就读哪份（证明它是真按名找到那份再读）', () => {
    withTmpDir((dir) => {
      mkdirSync(join(dir, 'node_modules', 'dsh-哨兵-918'), { recursive: true });
      writeFileSync(join(dir, 'node_modules', 'dsh-哨兵-918', 'package.json'), JSON.stringify({ name: 'dsh-哨兵-918', version: SENTINEL }), 'utf8');
      const anchor = join(dir, 'anchor.mjs');
      writeFileSync(anchor, '', 'utf8');
      assert.equal(installedVersionOf('dsh-哨兵-918', pathToFileURL(anchor).href), SENTINEL);
    });
  });

  it('读不到一律 unknown 且不抛：包名不存在／那份包描述文件坏掉', () => {
    assert.equal(installedVersionOf('dsh-这个包不存在-918'), VERSION_UNKNOWN, '包名不存在该回 unknown 且不抛');
    withTmpDir((dir) => {
      mkdirSync(join(dir, 'node_modules', 'dsh-坏件-918'), { recursive: true });
      writeFileSync(join(dir, 'node_modules', 'dsh-坏件-918', 'package.json'), '{ 这不是 JSON', 'utf8');
      const anchor = join(dir, 'anchor.mjs');
      writeFileSync(anchor, '', 'utf8');
      assert.equal(installedVersionOf('dsh-坏件-918', pathToFileURL(anchor).href), VERSION_UNKNOWN);
    });
  });
});
