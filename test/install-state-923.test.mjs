/**
 * 装机不变量自检（`tooling/check-install-state.mjs`）的判据与自证。
 *
 * 病：2026-09-23 现场——使用范围自己声明了一条 `"base-link-core": "0.3.7"`（#861 现场修复留下的直依赖），
 * 顶层因此常驻 0.3.7、六个技能各带一份自备 0.3.13；技能跑得动，但机器上同时有两套公共层，
 * 而没有任何一处读数会说出来。
 *
 * 本文件咬住四件事（对**真脚本**跑，断的是出口码与末行结论）：
 *   ① 全量到位 ⇒ `PASS`（exit 0）；
 *   ② #861 现场那种（直依赖钉住 + 自备副本）⇒ `BROKEN`（exit 1），且点名那条直依赖；
 *   ③ 「只更新了一家」的两种真实中间态 ⇒ `PARTIAL`（exit 2）——**不许误报 BROKEN**：
 *      · transition：老技能声明还是 `^`（0.3.13 那一代发出去的形态），caret 放行到新公共层；
 *      · partial：两边都精确（0.3.14 起），落伍那几家各带自备副本。
 *   ④ 判据缺席也红：使用范围目录读不到 ⇒ 非 0。
 *
 * 夹具一律建在 `os.tmpdir()` 下（不写仓内任何路径），跑完即删。
 */
import { strict as assert } from 'node:assert';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GATE = join(REPO_ROOT, 'tooling', 'check-install-state.mjs');

const PLUGINS = ['dsh-life-pack', 'dsh-memo-ilife', 'dsh-calorie', 'dsh-schedule-ilife', 'dsh-home-ilife', 'dsh-chef', 'dsh-bill-ilife'];
const SKILL_OF = {
  'dsh-memo-ilife': 'skill-memo-ilife', 'dsh-calorie': 'skill-calorie', 'dsh-schedule-ilife': 'skill-schedule',
  'dsh-home-ilife': 'skill-home', 'dsh-chef': 'skill-chef', 'dsh-bill-ilife': 'skill-bill',
};
const OLD = '0.3.13';
const NEW = '0.3.14';
const UPDATED = 'dsh-bill-ilife';

/** 一间夹具：写文件的小工具 ＋ 清理。 */
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 't923-install-state-'));
  const put = (rel, obj) => {
    mkdirSync(join(root, rel), { recursive: true });
    writeFileSync(join(root, rel, 'package.json'), JSON.stringify(obj, null, 2) + '\n', 'utf8');
  };
  const profile = (deps) => writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'fx', private: true, dependencies: deps }, null, 2) + '\n', 'utf8');
  return { root, put, profile, clean: () => rmSync(root, { recursive: true, force: true }) };
}

/** 跑真脚本，回 {code, out}。 */
function run(dir) {
  const r = spawnSync(process.execPath, [GATE, '--profile-dir', dir], { encoding: 'utf8' });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

/** 装一家插件：era='old' 照 0.3.13 那一代的声明形态（总管 caret），era='new' 三条边全精确。 */
function putPlugin(fx, plug, era, version) {
  const skill = SKILL_OF[plug];
  const manager = era === 'old' ? `^${OLD}` : version;
  fx.put(join('node_modules', plug), { name: plug, version, dependencies: { 'dsh-life-pack': manager, [skill]: version } });
}
function putSkill(fx, skill, era, version) {
  const base = era === 'old' ? `^${OLD}` : version;
  fx.put(join('node_modules', skill), { name: skill, version, dependencies: { 'base-link-core': base, 'base-paint': base } });
}
function putNested(fx, owner, dep, version) {
  fx.put(join('node_modules', owner, 'node_modules', dep), { name: dep, version, dependencies: dep === 'dsh-life-pack' ? { 'dsh-plugin-update': '0.1.1' } : {} });
}
function putManager(fx, version) {
  fx.put(join('node_modules', 'dsh-life-pack'), { name: 'dsh-life-pack', version, dependencies: { 'dsh-plugin-update': '0.1.1' } });
}
function putBases(fx, version) {
  fx.put(join('node_modules', 'base-paint'), { name: 'base-paint', version });
  fx.put(join('node_modules', 'base-link-core'), { name: 'base-link-core', version });
}

test('全量到位 ⇒ PASS（exit 0）', () => {
  const fx = fixture();
  try {
    const deps = {};
    for (const p of PLUGINS) deps[p] = NEW;
    fx.profile(deps);
    putManager(fx, NEW);
    for (const plug of Object.keys(SKILL_OF)) putPlugin(fx, plug, 'new', NEW);
    for (const skill of Object.values(SKILL_OF)) putSkill(fx, skill, 'new', NEW);
    putBases(fx, NEW);
    const r = run(fx.root);
    assert.equal(r.code, 0, '该 PASS，实得 exit ' + r.code + '\n' + r.out);
    assert.match(r.out, /INSTALL-STATE: PASS/);
  } finally { fx.clean(); }
});

test('#861 现场（直依赖钉住顶层 + 技能各带自备副本）⇒ BROKEN（exit 1），点名那条直依赖', () => {
  const fx = fixture();
  try {
    const deps = { 'base-link-core': '0.3.7' };
    for (const p of PLUGINS) deps[p] = OLD;
    fx.profile(deps);
    putManager(fx, OLD);
    for (const plug of Object.keys(SKILL_OF)) putPlugin(fx, plug, 'old', OLD);
    for (const skill of Object.values(SKILL_OF)) { putSkill(fx, skill, 'old', OLD); putNested(fx, skill, 'base-link-core', OLD); putNested(fx, skill, 'base-paint', OLD); }
    putBases(fx, OLD);
    const r = run(fx.root);
    assert.equal(r.code, 1, '该 BROKEN，实得 exit ' + r.code + '\n' + r.out);
    assert.match(r.out, /INSTALL-STATE: BROKEN/);
    assert.match(r.out, /base-link-core 声明成了直接依赖/, '必须点名那条直依赖');
  } finally { fx.clean(); }
});

test('中间态一（老技能声明还是 caret，放行到新公共层）⇒ PARTIAL（exit 2），不许误报 BROKEN', () => {
  const fx = fixture();
  try {
    const deps = {};
    for (const p of PLUGINS) deps[p] = p === UPDATED ? NEW : OLD;
    deps['dsh-life-pack'] = NEW;
    fx.profile(deps);
    putManager(fx, NEW);
    for (const plug of Object.keys(SKILL_OF)) putPlugin(fx, plug, plug === UPDATED ? 'new' : 'old', plug === UPDATED ? NEW : OLD);
    for (const skill of Object.values(SKILL_OF)) putSkill(fx, skill, skill === SKILL_OF[UPDATED] ? 'new' : 'old', skill === SKILL_OF[UPDATED] ? NEW : OLD);
    putBases(fx, NEW);
    const r = run(fx.root);
    assert.equal(r.code, 2, '该 PARTIAL，实得 exit ' + r.code + '\n' + r.out);
    assert.match(r.out, /INSTALL-STATE: PARTIAL/);
    assert.doesNotMatch(r.out, /^RED /m, '合法中间态不许有 RED 行：\n' + r.out);
  } finally { fx.clean(); }
});

test('中间态二（两边都精确，落伍那几家各带自备副本）⇒ PARTIAL（exit 2）', () => {
  const fx = fixture();
  try {
    const P = '0.3.14';
    const N = '0.3.15';
    const deps = {};
    for (const p of PLUGINS) deps[p] = p === UPDATED ? N : P;
    deps['dsh-life-pack'] = N;
    fx.profile(deps);
    putManager(fx, N);
    for (const plug of Object.keys(SKILL_OF)) {
      const v = plug === UPDATED ? N : P;
      putPlugin(fx, plug, 'new', v);
      if (v === P) putNested(fx, plug, 'dsh-life-pack', P);
    }
    for (const skill of Object.values(SKILL_OF)) {
      const v = skill === SKILL_OF[UPDATED] ? N : P;
      putSkill(fx, skill, 'new', v);
      if (v === P) { putNested(fx, skill, 'base-link-core', P); putNested(fx, skill, 'base-paint', P); }
    }
    putBases(fx, N);
    const r = run(fx.root);
    assert.equal(r.code, 2, '该 PARTIAL，实得 exit ' + r.code + '\n' + r.out);
    assert.doesNotMatch(r.out, /^RED /m, '合法中间态不许有 RED 行：\n' + r.out);
  } finally { fx.clean(); }
});

test('判据缺席也红：使用范围目录读不到 ⇒ 非 0', () => {
  const r = run(join(tmpdir(), 't923-这个目录不存在-' + Date.now()));
  assert.notEqual(r.code, 0, '读不到就不许给肯定结论');
  assert.match(r.out, /BROKEN|读不到使用范围/);
});
