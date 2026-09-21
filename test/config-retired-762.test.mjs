/**
 * #762 · 「已退休键」过渡件的公共层验收（`packages/base-link-core/src/config/store.ts`）。
 *
 * 背景（#751 裁决＝戊：白名单容忍 ＋ 写即清 ＋ 一行说明）：新版本删掉了若干配置键，老用户的
 * `<技能>.yaml` 里必然还留着它们；今天校验对「不认识的键」是硬失败 ⇒ 升级后技能第一条命令就哑掉。
 * 本件验五件事：
 *   ① 名单上的键（叶子）**读得过去**，且**不进取值**；
 *   ② 整组的子项全退休 ⇒ 那一层组名本身也读得过去，且**整组不出现在取值里**（`assertConfigRecord`
 *      拒绝空组，故整组退休时默认值表那一层必须整组删掉——本条正是那个形状的回归锁）；
 *   ③ 名单**外**的未知键照旧硬失败、带行号（护栏不动）；
 *   ④ 写入路径同理：名单上的键**收下但不写回**（设置页在键删掉之后仍带着那几行提交，不能因此报错）；
 *   ⑤ 清单自身非法 ⇒ **构造即拒**（写到叶子下面／键还在默认值表里／不是「组.子项」形状／键名不合形状）。
 *
 * 隔离口径（#763 起的家目录通道）：每个用例把**家目录**（win32 `USERPROFILE`／POSIX `HOME`）指到独占
 * 临时目录，配置因此落在 `<临时家目录>/.ilife/`——不存在任何一条会碰到真实 `~/.ilife/` 的路径
 * （基座自证见 `test/helpers/home-test-base.mjs`）。
 *
 * 运行：`node --test test/config-retired-762.test.mjs`（需先 `tsc -b packages/base-link-core`）。
 */
import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigError, loadConfig, saveConfig } from '../packages/base-link-core/dist/index.js';
import { configDirOf, requireIsolatedHome, useHome } from './helpers/home-test-base.mjs';

/** 叶子退休的样本：`html.helpStem`／`html.quickRefStem` 已从默认值表删掉（键名与取值照记账那份真表单）。 */
const LEAF_DEFAULTS = {
  db: { dir: '', name: 'biscuit_accountant.db', goals: 'goals.json' },
  backup: { dir: '', stem: 'biscuit_' },
  html: { dir: 'biscuit_accountant_html' },
};
const LEAF_RETIRED = ['html.helpStem', 'html.quickRefStem'];

/** 整组退休的样本：`lark.cliPath`／`lark.qrDir` 是 `lark` 组的全部子项（备忘录那份表的形状）。 */
const GROUP_DEFAULTS = {
  db: { dir: '', name: 'memo.db' },
  html: { dir: 'memo_html' },
  media: { dir: 'media' },
};
const GROUP_RETIRED = ['lark.cliPath', 'lark.qrDir'];

let home = null;
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'ilife-762-home-'));
  useHome(home);
  requireIsolatedHome(home); // 基座自证：当刻家目录必须是临时那一份
  mkdirSync(configDirOf(home), { recursive: true });
});
afterEach(() => { if (home !== null) rmSync(home, { recursive: true, force: true }); });

/** 用例里那份配置文件的绝对路径（`<家目录>/.ilife/<技能>.yaml`）。 */
function fileOf(stem) {
  return join(configDirOf(home), stem + '.yaml');
}

/** 往沙盒里落一份手写 yaml（照用户手上那份老文件的写法）。 */
function seed(stem, text) {
  writeFileSync(fileOf(stem), text, 'utf8');
}

describe('#762 A 读：老文件里的已退休键不再让人哑掉', () => {
  it('A1 叶子退休：含两个退休键的老文件读得过去，且取值里没有它们、其余逐项不变', () => {
    seed('bill', 'db:\n  dir: ""\n  name: biscuit_accountant.db\nhtml:\n  dir: biscuit_accountant_html\n'
      + '  helpStem: 饼干记账_HELP\n  quickRefStem: 饼干记账_速查表\n');
    const loaded = loadConfig('bill', LEAF_DEFAULTS, LEAF_RETIRED);
    assert.equal(loaded.created, false);
    assert.deepEqual(loaded.values, LEAF_DEFAULTS, '退休键不进取值，其余项逐项等于文件里的值');
    assert.equal(Object.prototype.hasOwnProperty.call(loaded.values.html, 'helpStem'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(loaded.values.html, 'quickRefStem'), false);
    // 读不写回：盘上仍是用户那份（死键还在，等一次保存／重置才清）。
    assert.match(readFileSync(fileOf('bill'), 'utf8'), /helpStem: 饼干记账_HELP/);
  });

  it('A2 整组退休：老文件里那一层组名还在（默认值表已整组删掉）也读得过去，取值里整组不见', () => {
    seed('memo', 'db:\n  dir: ""\n  name: memo.db\nhtml:\n  dir: memo_html\n'
      + 'media:\n  dir: media\nlark:\n  cliPath: ""\n  qrDir: ""\n');
    const loaded = loadConfig('memo', GROUP_DEFAULTS, GROUP_RETIRED);
    assert.deepEqual(loaded.values, GROUP_DEFAULTS, '整组退休 ⇒ 那一层组名与它的子项都不取值');
    assert.equal(Object.prototype.hasOwnProperty.call(loaded.values, 'lark'), false, '空组写出去解析不回来，故整组不留在取值里');
    // 反向对照：同一层组里混进一个**不是**退休键的子项 ⇒ 这一层不再算「整组退休」，照旧硬失败。
    seed('memo', 'lark:\n  cliPath: ""\n  qrDir: ""\n  newThing: ""\n');
    assert.throws(() => loadConfig('memo', GROUP_DEFAULTS, GROUP_RETIRED),
      (err) => err instanceof ConfigError && err.code === 'CONFIG_UNKNOWN_KEY' && /lark/.test(err.message));
  });

  it('A3 护栏不动：名单外的未知键照旧硬失败，且点名行号与文件名', () => {
    seed('bill', 'db:\n  dir: ""\n  name: biscuit_accountant.db\nhtml:\n  dirr: ""\n');
    let caught = null;
    try { loadConfig('bill', LEAF_DEFAULTS, LEAF_RETIRED); } catch (err) { caught = err; }
    assert.ok(caught instanceof ConfigError, '须抛 ConfigError');
    assert.equal(caught.code, 'CONFIG_UNKNOWN_KEY');
    assert.equal(caught.line, 5, '行号指向那一行');
    assert.match(caught.message, /html\.dirr/, '报文点名那个键');
    assert.match(caught.message, /bill\.yaml/, '报文带文件名');
  });
});

describe('#762 B 写：收下但不写回（写即清）', () => {
  it('B1 写入路径容忍退休键：不报错、不写回，其余项照写（没给的项按默认值补齐）', () => {
    loadConfig('bill', LEAF_DEFAULTS, LEAF_RETIRED);
    saveConfig('bill', LEAF_DEFAULTS, {
      db: { dir: '', name: 'only-name.db', goals: 'goals.json' },
      backup: { dir: '', stem: 'biscuit_' },
      html: { dir: 'biscuit_accountant_html', helpStem: 'X', quickRefStem: 'Y' },
    }, LEAF_RETIRED);
    const text = readFileSync(fileOf('bill'), 'utf8');
    assert.equal(/helpStem|quickRefStem/.test(text), false, '盘上不许留下退休键');
    const again = loadConfig('bill', LEAF_DEFAULTS, LEAF_RETIRED).values;
    assert.equal(again.db.name, 'only-name.db', '写进去的值照旧读得回来');
    assert.deepEqual(again.html, { dir: 'biscuit_accountant_html' });
  });

  it('B2 写入路径同样只看白名单：名单外的陌生键仍当场拒、盘上不产生半份', () => {
    saveConfig('bill', LEAF_DEFAULTS, { db: { dir: '', name: 'a.db', goals: 'goals.json' } }, LEAF_RETIRED);
    const before = readFileSync(fileOf('bill'), 'utf8');
    assert.throws(() => saveConfig('bill', LEAF_DEFAULTS, { db: { dirr: 'typo' } }, LEAF_RETIRED),
      (err) => err instanceof ConfigError && err.code === 'CONFIG_UNKNOWN_KEY');
    assert.equal(readFileSync(fileOf('bill'), 'utf8'), before, '拒了就不写盘');
  });
});

describe('#762 C 清单自身非法 ⇒ 构造即拒（不许在护栏上开洞）', () => {
  it('C1 键名不合形状（空段／怪字符）⇒ 收下清单的那一刻就抛', () => {
    assert.throws(() => loadConfig('bill', LEAF_DEFAULTS, ['html.']),
      (err) => err instanceof ConfigError && err.code === 'CONFIG_RETIRED_INVALID');
    assert.throws(() => loadConfig('bill', LEAF_DEFAULTS, ['html!.helpStem']),
      (err) => err instanceof ConfigError && err.code === 'CONFIG_RETIRED_INVALID' && /html!/.test(err.message));
  });

  it('C2 父路径存在但不是组（写到叶子的下面）⇒ 抛', () => {
    assert.throws(() => loadConfig('bill', LEAF_DEFAULTS, ['db.name.x']),
      (err) => err instanceof ConfigError && err.code === 'CONFIG_RETIRED_INVALID');
  });

  it('C3 键还在默认值表里 ⇒ 抛（退休键是已经删掉的键）', () => {
    assert.throws(() => loadConfig('bill', LEAF_DEFAULTS, ['db.name']),
      (err) => err instanceof ConfigError && err.code === 'CONFIG_RETIRED_INVALID' && /db\.name/.test(err.message));
  });

  it('C4 形状不是「组.子项」，或项不是字符串 ⇒ 抛', () => {
    assert.throws(() => loadConfig('bill', LEAF_DEFAULTS, ['html']),
      (err) => err instanceof ConfigError && err.code === 'CONFIG_RETIRED_INVALID');
    assert.throws(() => loadConfig('bill', LEAF_DEFAULTS, [42]),
      (err) => err instanceof ConfigError && err.code === 'CONFIG_RETIRED_INVALID');
    // 写路径与读路径同一处判定（清单是同一份，两边都不许放行坏清单）。
    assert.throws(() => saveConfig('bill', LEAF_DEFAULTS, { db: { name: 'a.db' } }, ['db.name']),
      (err) => err instanceof ConfigError && err.code === 'CONFIG_RETIRED_INVALID');
  });

  it('C5 自证：同一条用例打掉白名单那一格即红、补回即绿（证明上面几条红是真由清单造成的）', () => {
    seed('bill', 'db:\n  dir: ""\n  name: biscuit_accountant.db\nhtml:\n  dir: biscuit_accountant_html\n  helpStem: X\n');
    const read = (retired) => {
      try { loadConfig('bill', LEAF_DEFAULTS, retired); return 'OK'; } catch (err) { return err.code; }
    };
    assert.equal(read(undefined), 'CONFIG_UNKNOWN_KEY', '不给清单＝今天的老行为（升级即哑）');
    assert.equal(read([]), 'CONFIG_UNKNOWN_KEY', '空清单也一样：白名单是清单逐个说的话，不给就不放行');
    assert.equal(read(['html.helpStem']), 'OK', '补回清单即绿');
  });
});
