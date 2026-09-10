// #79（79b；R-8 扩面）· CI 断言：base-* 三包版本一致（lockstep）＋ 包内依赖同版本线 ＋ 技能面 range 同版本线。
//
// 口径（与 `tooling/check-publish.mjs` 的 #123 返修同源：**版本无关化**）：
//   - 断言的是「三包 `version` 彼此逐字相等」，**不写死任何具体版本号**——发版改号不该打红这条门；
//   - 断言 `.changeset/config.json` 的 `fixed` 组**恰好**覆盖这三包（B8 的机制面）；
//   - 断言包内 caret 范围的 `major.minor` 等于被依赖包的工作区版本（同版本线）。
// 破界/偏斜即红，`pnpm test`（CI build-test 与 win-detail 两处）都会跑到。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const pkg = (dir) => JSON.parse(readFileSync(join(root, 'packages', dir, 'package.json'), 'utf8'));

/** 目录名 → 包名（base-paint 的目录是 base-render，历史命名，勿混）。 */
const BASE_PKGS = [
  { dir: 'base-link-core', name: 'base-link-core' },
  { dir: 'base-render', name: 'base-paint' },
  { dir: 'base-combos', name: 'base-combos' },
];

const manifests = BASE_PKGS.map((p) => ({ ...p, json: pkg(p.dir) }));
const versions = manifests.map((m) => m.json.version);

describe('#79 base-* 三包版本 lockstep', () => {
  it('三包 name 与目录映射不变（防包名漂移）', () => {
    for (const m of manifests) assert.equal(m.json.name, m.name, `${m.dir}/package.json 的 name 应为 ${m.name}`);
  });

  it('三包 version 逐字相等（版本偏斜即红）', () => {
    const uniq = [...new Set(versions)];
    assert.equal(
      uniq.length,
      1,
      'base-* 三包版本必须一致，实得：' + manifests.map((m) => `${m.name}@${m.json.version}`).join(' / '),
    );
    assert.match(uniq[0], /^\d+\.\d+\.\d+$/, 'version 必须是 x.y.z 形态：' + uniq[0]);
  });

  it('.changeset/config.json 的 fixed 组恰好覆盖三包（B8 机制面）', () => {
    const cfg = JSON.parse(readFileSync(join(root, '.changeset', 'config.json'), 'utf8'));
    const want = [...BASE_PKGS.map((p) => p.name)].sort();
    assert.ok(Array.isArray(cfg.fixed), 'changeset config 的 fixed 必须是数组');
    const groups = cfg.fixed.map((g) => [...g].sort());
    const hit = groups.find((g) => g.length === want.length && g.every((n, i) => n === want[i]));
    assert.ok(
      hit,
      'fixed 组必须恰含 base-link-core／base-paint／base-combos，实得：' + JSON.stringify(cfg.fixed),
    );
  });

  it('包内 caret 范围与工作区版本同 major.minor（同版本线）＋ 发布面零 workspace:（G-3 改判 #140）', () => {
    const versionOf = (name) => manifests.find((m) => m.name === name)?.json.version;
    const lineOf = (v) => v.split('.').slice(0, 2).join('.');
    const cases = [
      {
        from: 'base-combos',
        dep: 'base-link-core',
        range: pkg('base-combos').dependencies?.['base-link-core'],
      },
      {
        from: 'base-paint',
        dep: 'base-link-core',
        range: pkg('base-render').devDependencies?.['base-link-core'],
      },
    ];
    for (const c of cases) {
      assert.ok(c.range, `${c.from} 必须声明 ${c.dep}`);
      // G-3 改判（#140）：原断言要求 base-combos 带 `workspace:` 前缀（理由写「发布期防外泄 registry」），
      // 但与发布门 `tooling/check-publish.mjs:110`（package.json 整文件零 `workspace:` 命中）**直接矛盾**；
      // 此前 base-combos 从未进过发布范围，矛盾没被执行到。本次它首次上架 → 前缀必须去掉：
      // 发布走 `npm publish`（不改写 `workspace:`），前缀本身就是外泄源——先例见 `docs/public-installer-47.md:67`
      // （registry `base-combos@0.1.0` 新装 `EUNSUPPORTEDPROTOCOL`）与 `docs/skill-landing-r2.md:68`（已定「去 workspace:」）。
      // 本地一律链 workspace 由 `pnpm-workspace.yaml` 的 `linkWorkspacePackages`／`preferWorkspacePackages: true` 保证，不依赖前缀。
      assert.ok(
        !c.range.startsWith('workspace:'),
        `${c.from} 的 ${c.dep} 范围「${c.range}」不得带 workspace: 前缀（发布面外泄；G-3 改判见 #140）`,
      );
      const m = /^\^(\d+)\.(\d+)\.\d+$/.exec(c.range);
      assert.ok(m, `${c.from} 的 ${c.dep} 范围「${c.range}」必须是 ^x.y.z 形态`);
      assert.equal(
        `${m[1]}.${m[2]}`,
        lineOf(versionOf(c.dep)),
        `${c.from} 的 ${c.dep} 范围「${c.range}」与工作区版本 ${versionOf(c.dep)} 不同版本线`,
      );
    }
  });

  it('技能面 base-link-core runtime range 与工作区版本同 major.minor（D-1；skill-calorie 例外单列）', () => {
    const coreVersion = manifests.find((m) => m.name === 'base-link-core')?.json.version;
    const lineOf = (v) => v.split('.').slice(0, 2).join('.');
    // 5 个 runtime 消费技能：dependencies 必须同版本线（任一退回 ^0.1.0 即红，MUT-4）。
    const runtimeSkills = ['skill-bill', 'skill-chef', 'skill-home', 'skill-memo-ilife', 'skill-schedule'];
    for (const dir of runtimeSkills) {
      const range = pkg(dir).dependencies?.['base-link-core'];
      assert.ok(range, `${dir} 必须在 dependencies 声明 base-link-core`);
      const m = /^\^(\d+)\.(\d+)\.\d+$/.exec(range);
      assert.ok(m, `${dir} 的 base-link-core 范围「${range}」必须是 ^x.y.z`);
      assert.equal(
        `${m[1]}.${m[2]}`,
        lineOf(coreVersion),
        `${dir} 的 base-link-core 范围「${range}」与工作区版本 ${coreVersion} 不同版本线`,
      );
    }
    // skill-calorie 例外单列（G-2）：本票禁改该包，devDep 钉死当前值 ^0.1.0；任何漂移即红。
    // 解冻对齐 ^0.2.0 时把本断言并入同版本线（届时改此一行）。
    const calRange = pkg('skill-calorie').devDependencies?.['base-link-core'];
    assert.equal(calRange, '^0.1.0', `skill-calorie 的 base-link-core 例外值漂移（实得「${calRange}」，G-2）`);
  });

  it('版本常量仍是契约版本 0.1.0，不随包版本漂移（口径分离）', async () => {
    const render = await import('../dist/index.js');
    const core = await import('base-link-core');
    for (const [label, value] of [
      ['ENVELOPE_VERSION', core.ENVELOPE_VERSION],
      ['RENDER_CONTRACT_VERSION', render.RENDER_CONTRACT_VERSION],
      ['RENDER_ENVELOPE_VERSION', render.RENDER_ENVELOPE_VERSION],
      ['STYLE_VERSION', render.STYLE_VERSION],
      ['BASE_PAINT_CONTRACT_VERSION', render.BASE_PAINT_CONTRACT_VERSION],
    ]) {
      assert.equal(value, '0.1.0', `${label} 是契约版本常量（冻结值 0.1.0），不得随包版本升号`);
    }
  });
});
