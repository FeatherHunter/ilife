// 面板版本胶囊那行字的自证回路。**本文件的判据对象在票 #986 改了指向**（文件名保留：它一直是
// 「版本号真值」这道门的家，改的是真值从哪儿来）。
//
// 沿革：#737 实测过手写常量与包版本无声漂开一整版（包 0.2.7、常量停在 0.2.6，面板照错值印），
// 当时的修法是「宿主读自己那份已装包的 `package.json`，经电话 `ilife-manager.version` 交给面板」。
// #986 现场（2026-09-28 用户报障）：打开面板要等很久那行才出版本 —— 那条电话排在宿主电话表的
// 懒建（`buildUpdatePhoneTable` 的 `table ??= buildTable(ctx)`）之后，面板侧还要按退避表重试；
// **标签的延迟不该依赖宿主可用性**。维护者裁定改走**构建期注入**：打包时把本包 `package.json`
// 的 `version` 烙进产物，面板首帧即显示；「不许手写」这条目的由构建门继续守着。
//
// 本回路咬三条，都不咬写法：
//   ① 构建门：产物里带着包版本那一串；源码只许引用注入标记，不许出现版本号字面量。
//   ② 屏上真值：拿真产物渲一次组件 —— 胶囊里就是包版本那一串。
//   ③ 删掉的机制不许回来：客户端三态／退避表、宿主那条版本电话、面板侧取版本函数、
//      宿主读自己版本那函数（它们正是「慢」的来源与它的配套）。
// 另：#918「按包名读装机版本」的判据仍在本文件（同一处的唯一定义，别处不许再写一份）。
//
// 前提：①②③ 都读产物，所以要先出产物（CI 的顺序正是先 `pnpm build` 再 `pnpm test`）：
//   node node_modules/typescript/bin/tsc -b packages/plugin-manager
//   pnpm --filter dsh-life-pack run build:client
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { renderManagerPanel } from '../../../test/helpers/panel-render.mjs';
import { installedVersionOf } from '../dist/manager-version.js';
import { MANAGER_ACTIONS, VERSION_UNKNOWN } from '../dist/update-contract.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_DIR = join(HERE, '..');
const PKG = JSON.parse(readFileSync(join(PKG_DIR, 'package.json'), 'utf8'));
const CLIENT = readFileSync(join(PKG_DIR, 'dist', 'client.js'), 'utf8');
const CLIENT_SRC = readFileSync(join(PKG_DIR, 'src', 'client.ts'), 'utf8');
const BUILDCONF_SRC = readFileSync(join(PKG_DIR, 'tsdown.config.ts'), 'utf8');
const CONTRACT_SRC = readFileSync(join(PKG_DIR, 'src', 'update-contract.ts'), 'utf8');
const UPDATE_CLIENT_SRC = readFileSync(join(PKG_DIR, 'src', 'update-client.ts'), 'utf8');
const HOST_SRC = readFileSync(join(PKG_DIR, 'src', 'update-host.ts'), 'utf8');
const HOST_VERSION_SRC = readFileSync(join(PKG_DIR, 'src', 'manager-version.ts'), 'utf8');
/** 宿主产物（电话名的定义地）：删掉的那条电话不许在产物里留下名字。 */
const CONTRACT_DIST = readFileSync(join(PKG_DIR, 'dist', 'update-contract.js'), 'utf8');
/** 哨兵：一个绝不可能出现在真包里的版本号（拿它验按包名读的那条路真读文件）。 */
const SENTINEL = '9.9.9-哨兵';

/** 临时目录只为本回路造哨兵件；用完即删（路径守卫：只删自己这个前缀的临时根）。 */
function withTmpDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), 't986-reader-'));
  try {
    return fn(dir);
  } finally {
    if (!dir.split(/[\\/]/).pop().startsWith('t986-reader-')) throw new Error('清理守卫拒绝：' + dir);
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('票 #986 ① 构建门：注入值 ≡ 包版本，源码不许写死版本号', () => {
  it('产物里带着本包 package.json 的 version', () => {
    assert.ok(CLIENT.includes(PKG.version), 'client 产物里没有包版本那一串：' + PKG.version);
  });

  it('构建配置从 package.json 取 version 并注入标记', () => {
    assert.match(BUILDCONF_SRC, /__LIFE_PACK_VERSION__/, '构建配置里没有注入标记');
    assert.match(BUILDCONF_SRC, /package\.json/, '注入值不是从包描述文件读的');
  });

  it('面板源码只引用注入标记，不出现版本号字面量（手写回潮即红）', () => {
    assert.match(CLIENT_SRC, /__LIFE_PACK_VERSION__/, '面板源码没引用注入标记');
    const handwritten = /['"]\d+\.\d+\.\d+['"]/.exec(CLIENT_SRC);
    assert.equal(handwritten, null, '面板源码里又写死了版本号：' + (handwritten ? handwritten[0] : ''));
  });
});

describe('票 #986 ② 屏上真值：胶囊里就是包版本那一串（真产物渲一次）', () => {
  it('渲出来的文本带着 `dsh-life-pack · <包版本>`', async () => {
    const { text } = await renderManagerPanel();
    assert.ok(text.includes('dsh-life-pack · ' + PKG.version), '胶囊里不是包版本，取到的是：' + text.slice(0, 160));
    assert.ok(!text.includes('总管 dsh-life-pack'), '「总管」又回到版本胶囊里了');
  });

  it('没有「读中」「读不到」两态：屏上不许再出现「版本未知」', async () => {
    const { text } = await renderManagerPanel();
    assert.equal(text.includes('版本未知'), false, '读不到那一态又回来了：' + text.slice(0, 160));
  });
});

describe('票 #986 ③ 删掉的机制不许回来（它们是「慢」的来源与配套）', () => {
  it('面板半：三态状态机、退避表、取版本函数都不在', () => {
    for (const [name, src] of [['client.ts', CLIENT_SRC], ['update-client.ts', UPDATE_CLIENT_SRC]]) {
      assert.doesNotMatch(src, /useManagerVersion|VERSION_RETRY_MS|VERSION_MISSING_TEXT|VERSION_PENDING_TEXT|loadManagerVersion/, name + ' 里又出现了问宿主要版本的那套机制');
    }
  });

  it('契约半：MANAGER_ACTIONS 里没有 version 键，电话名也没留在源码与产物里', () => {
    assert.equal(Object.hasOwn(MANAGER_ACTIONS, 'version'), false, 'MANAGER_ACTIONS.version 又回来了');
    assert.doesNotMatch(CONTRACT_SRC, /ilife-manager\.version/, '契约源码里还有那条电话名');
    assert.doesNotMatch(CONTRACT_DIST, /ilife-manager\.version/, '契约产物里还有那条电话名');
  });

  it('宿主半：派发处不再挂这条电话，读自己版本那函数也删了', () => {
    assert.doesNotMatch(HOST_SRC, /readManagerVersion|MANAGER_ACTIONS\.version/, '宿主派发处还挂着版本电话');
    assert.doesNotMatch(HOST_VERSION_SRC, /readManagerVersion|managerPackageJsonPath/, '读自己版本那函数又回来了');
  });
});

describe('票 #918 ② 按包名读装机版本（六家与技能侧共用的那一处，本票不动它）', () => {
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
