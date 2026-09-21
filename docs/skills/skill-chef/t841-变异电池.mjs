#!/usr/bin/env node
/** #841 · 登记面对账的变异电池：逐个登记面注入一处假状态，看对账件是否都红并点名。
 *
 * 跑法：`node tooling/run-locked.mjs --ticket 841 -- node docs/skills/skill-chef/t841-变异电池.mjs`
 * **不碰真件**：先把 `packages/skill-chef` 的登记面三件复制到 `.scratch/t841/repo/`，
 * 变异只落在副本上，再让对账件用 `--repo` 指那份副本；跑完逐字节核对真件未动。
 * 每个用例都必须 exit 1 且报文含期望的关键词；有一条没红或没点名即本件 exit 1。
 *
 * 六格（三处登记面各两格）：
 *   M1 快照删一条词          → 「快照缺词：体检」
 *   M2 快照多一条词          → 「快照多词（不在 WAKE_TABLE）」
 *   M3 快照 key 改错         → 「快照 key 与表不符」
 *   M4 description 少一条词  → 「description 缺词」
 *   M5 HELP 卡徽章没翻       → 「HELP 卡仍带徽章」
 *   M6 路由 order 错位       → 「路由 order 与表行号不符」
 */
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..', '..');
const PKG = join(ROOT, 'packages', 'skill-chef');
const TMP = join(ROOT, '.scratch', 't841');
const REPO = join(TMP, 'repo');
const CHECK = join(HERE, 't841-登记面对账.mjs');

const FILES = [
  join('SKILL.md'),
  join('src', 'help', 'sceneData.ts'),
  join('src', 'history', 'routes.ts'),
];
/** 真件的字节（跑完必须一字未动）。 */
const pristine = new Map(FILES.map((f) => [f, readFileSync(join(PKG, f), 'utf8')]));

/** 造一份 skill-chef 副本：整棵 `src/` ＋ `SKILL.md`（登记面之间靠 `WAKE_TABLE` 对齐，只拷三件就对不到一起）。 */
function freshRepo() {
  rmSync(REPO, { recursive: true, force: true });
  mkdirSync(REPO, { recursive: true });
  cpSync(join(PKG, 'src'), join(REPO, 'src'), { recursive: true });
  cpSync(join(PKG, 'SKILL.md'), join(REPO, 'SKILL.md'));
}
const mutate = (rel, fn) => {
  const p = join(REPO, rel);
  writeFileSync(p, fn(readFileSync(p, 'utf8')), 'utf8');
};

mkdirSync(TMP, { recursive: true });

/** 六格：[名, 变异函数, 期望报文碎片]。 */
const CASES = [
  ['M1 快照删一条词', () => mutate(FILES[0], (t) => t.split('\n').filter((l) => !l.startsWith('| 体检 |')).join('\n')), '快照缺词：体检'],
  ['M2 快照多一条词', () => mutate(FILES[0], (t) => t.replace('| 体检 |', '| 编造词 |')), '快照多词'],
  ['M3 快照 key 改错', () => mutate(FILES[0], (t) => t.replace('| 体检 | chef.history.query |', '| 体检 | chef.recipe.view |')), '快照 key 与表不符：体检'],
  // 删的是列表**中间**那句的「体检、」（末句后面没有顿号，删它等于没删——M4 首版就是这么假绿的）
  ['M4 description 少一条词', () => mutate(FILES[0], (t) => t.replace('体检、', '')), 'description 缺词'],
  ['M5 HELP 卡徽章没翻', () => mutate(FILES[1], (t) => t.replace("status: ''", "status: '【待开发】'")), 'HELP 卡仍带徽章'],
  ['M6 路由 order 错位', () => mutate(FILES[2], (t) => t.replace('order: 35,', 'order: 135,')), '路由 order 与表行号不符：查看历史'],
];

let bad = 0;
for (const [name, mutate_fn, want] of CASES) {
  freshRepo();
  mutate_fn();
  const r = spawnSync(process.execPath, [CHECK, '--repo', REPO], { cwd: ROOT, encoding: 'utf8' });
  const out = String(r.stdout || '') + String(r.stderr || '');
  const red = r.status === 1;
  const named = out.includes(want);
  if (!red || !named) bad += 1;
  console.log((red && named ? 'PASS ' : 'FAIL ') + name + ' → exit ' + r.status + '／点名「' + want + '」' + (named ? ' ✓' : ' ✗'));
  if (!red || !named) console.log('   实测报文：' + out.trim().split('\n').slice(0, 4).join(' ｜ '));
}

// 真件必须一字未动
let untouched = true;
for (const [f, want] of pristine) {
  if (readFileSync(join(PKG, f), 'utf8') !== want) { untouched = false; console.log('FAIL 真件被动过：' + f); }
}
rmSync(REPO, { recursive: true, force: true });
console.log('变异电池：' + (CASES.length - bad) + '／' + CASES.length + ' 格红并点名；真件未动＝' + untouched);
process.exit(bad === 0 && untouched ? 0 : 1);
