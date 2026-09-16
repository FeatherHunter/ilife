// #129 · CI lockstep：全部 skill/plugin 对精确 pin（单文件全对门）。
//
// 口径（版本无关化，照 base-version-lockstep 同形）：
//   - 插件声明的 SKILL 版本必须与该 SKILL 包当前 `version` **逐字相等**，不写死任何具体版本号——
//     发版改号不该打红这条门；偏斜（旧 skill 残留）即红；
//   - 声明必须是精确 `x.y.z`（禁 caret/tilde/range/`workspace:`），#129 根因即 caret ＋ 存量 lockfile 残留旧 skill；
//   - `pnpm test`（CI build-test 与 win-detail 两处）都会跑到（根 `test/*.test.mjs` glob）。
// 突变自证：任一声明回退一版即红，逐字还原即绿（见 #129 票）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const pkg = (dir) => JSON.parse(readFileSync(join(root, '..', 'packages', dir, 'package.json'), 'utf8'));

/** 插件目录 → 插件包名 → skill 依赖键 → skill 目录（六对，缺一即漏网）。 */
const PAIRS = [
  { pluginDir: 'plugin-bill-ilife', pluginName: 'dsh-bill-ilife', skillDep: 'skill-bill', skillDir: 'skill-bill' },
  { pluginDir: 'plugin-calorie', pluginName: 'dsh-calorie', skillDep: 'skill-calorie', skillDir: 'skill-calorie' },
  { pluginDir: 'plugin-chef', pluginName: 'dsh-chef', skillDep: 'skill-chef', skillDir: 'skill-chef' },
  { pluginDir: 'plugin-home-ilife', pluginName: 'dsh-home-ilife', skillDep: 'skill-home', skillDir: 'skill-home' },
  { pluginDir: 'plugin-memo-ilife', pluginName: 'dsh-memo-ilife', skillDep: 'skill-memo-ilife', skillDir: 'skill-memo-ilife' },
  {
    pluginDir: 'plugin-schedule-ilife',
    pluginName: 'dsh-schedule-ilife',
    skillDep: 'skill-schedule',
    skillDir: 'skill-schedule',
  },
];

const rows = PAIRS.map((p) => {
  const pluginJson = pkg(p.pluginDir);
  const skillJson = pkg(p.skillDir);
  return { ...p, declared: pluginJson.dependencies?.[p.skillDep], current: skillJson.version };
});

describe('#129 skill/plugin 精确 pin lockstep（六对全对）', () => {
  it('六对插件包名与目录映射不变（防包名漂移）', () => {
    assert.equal(rows.length, 6, '必须恰好六对，实际 ' + rows.length);
    for (const r of rows) {
      assert.equal(pkg(r.pluginDir).name, r.pluginName, `${r.pluginDir}/package.json 的 name 应为 ${r.pluginName}`);
      assert.equal(pkg(r.skillDir).name, r.skillDep, `${r.skillDir}/package.json 的 name 应为 ${r.skillDep}`);
    }
  });

  it('六对声明与 SKILL 当前版逐字相等（偏斜即红）', () => {
    for (const r of rows) {
      assert.ok(r.declared, `${r.pluginName} 必须声明 ${r.skillDep}`);
      assert.equal(
        r.declared,
        r.current,
        `${r.pluginName} 声明的 ${r.skillDep}「${r.declared}」与 SKILL 当前版「${r.current}」不一致`,
      );
    }
  });

  it('六对声明必须精确 x.y.z（禁 caret/tilde/range/workspace:）', () => {
    for (const r of rows) {
      assert.match(r.declared, /^\d+\.\d+\.\d+$/, `${r.pluginName} 的 ${r.skillDep}「${r.declared}」必须是精确版`);
      assert.ok(!r.declared.includes('workspace:'), `${r.pluginName} 的依赖不得外泄 workspace:`);
    }
  });
});
