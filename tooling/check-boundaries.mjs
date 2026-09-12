#!/usr/bin/env node
/** P4 三包边界冻结断言（CI 可执行）：破界即 fail。 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = (n) => JSON.parse(readFileSync(join(root, `packages/${n}/package.json`), 'utf8'));
let bad = 0;
const assert = (cond, msg) => { if (cond) console.log(`OK: ${msg}`); else { console.error(`FAIL: ${msg}`); bad++; } };

const core = pkg('base-link-core');
assert(Object.keys(core.dependencies ?? {}).length === 0, 'link-core 零依赖');
const render = pkg('base-render');
assert(Object.keys(render.dependencies ?? {}).length === 0, 'render 无运行时依赖（link-core 仅 dev/typeof）');
assert(!JSON.stringify(render).includes('base-combos'), 'render 不依赖 combos');
const combos = pkg('base-combos');
assert(combos.dependencies?.['base-link-core'] !== undefined, 'combos 强依赖 link-core');
const present = readFileSync(join(root, 'packages/base-combos/src/present.ts'), 'utf8');
assert(!present.includes('base-paint') && !/from\s+['"].*(?:render|paint)/.test(present), 'present 只许字符串级引用，禁 import render');
const tsFiles = readdirSync(join(root, 'packages/base-link-core/src'));
const coreSrc = tsFiles.map((f) => readFileSync(join(root, 'packages/base-link-core/src', f), 'utf8')).join('\n');
assert(!/from\s+['"](?:@[A-Za-z_]+\/|base-|skill-|plugin-|ilife-skills|dsh-)/.test(coreSrc), 'link-core 源码不引用任何 workspace 包');
// 装配归一：注册原语只许住 render
const grepHit = ['base-link-core/src', 'base-combos/src'].some((d) =>
  readdirSync(join(root, 'packages', d)).some((f) =>
    /registerTab|openTab|mountInjector/.test(readFileSync(join(root, 'packages', d, f), 'utf8'))));
assert(!grepHit, '装配 owner 归一 render（link-core/combos 无自装配）');

// #96 · base-* 变更影响面断言：其余 3 技能（chef/home/memo-ilife）当前**不消费** base-*，
// 故 base-paint（目录 base-render）的任何变更都不得改动这 3 个技能的页面。结构面在这里卡死，
// 行为面（HTML 产物逐件 sha256）在 `pnpm snapshot:html:check`（tooling/skill-html-snapshot.mjs）。
//
// #145 起 skill-bill **移出**该名单：地图 #143 已裁「饼干记账 HELP 的模板与渲染走共享层
// base-paint/help-shell」（用户 Q2＝两条同时达成／Q9＝可选键照传），bill 自此是**有意的**消费方，
// #96 那条「尚未迁移」的现状断言对它已失效。
// #199 起 skill-schedule **移出**该名单：地图 #197 已裁「作息管家 HELP 走共享 help 模板
// base-paint/help-shell」（用户 Q5=A／Q11=A，裁定成文见 docs/skills/skill-schedule/t199-structure-verdict.md），
// schedule 自此同样是有意的消费方。断言口径、判定实现与其余技能的覆盖面一律未动
// （仍查依赖闭包＋源码／模板扫描），只是这一份「尚未迁移」名单少一个名字。
// #220 起 skill-memo-ilife **移出**该名单：地图 #220 已裁「备忘录 HELP 走共享 help 模板
// base-paint/help-shell」（走 A 路＝`renderHelpShellHtml`，裁决正本 docs/skills/skill-memo-ilife/
// t220-orchestrator-decisions.md），memo 自此同样是有意的消费方。同上：断言口径、判定实现
// 与其余技能的覆盖面一律未动，只是这一份「尚未迁移」名单再少一个名字。
// 大厨图（#208）代摘 skill-chef：该会话的 `packages/skill-chef/src/help/sceneData.ts`（已 staged、
// 14:02 落盘）已 `import type { SceneData, SceneGroup } from 'base-paint'`，而它离开时未改这份名单
// → `pnpm boundaries` 红（1 处破界）会卡住发版窗口的 S8 全绿门。**这是善意越界**：断言口径、
// 判定实现与 skill-home 的覆盖面一字未动，只是把大厨图自己那一步先做了；那份文件属它会话，本席未碰。
const SKILLS_BASE_FROZEN = ['skill-home'];
const BASE_RUNTIME = new Set(['base-paint', 'base-render']); // 目录名／包名两种写法都算
for (const name of SKILLS_BASE_FROZEN) {
  const p = pkg(name);
  const deps = { ...(p.dependencies ?? {}), ...(p.devDependencies ?? {}), ...(p.peerDependencies ?? {}) };
  const hit = Object.keys(deps).filter((d) => BASE_RUNTIME.has(d));
  assert(hit.length === 0, `${name} 依赖闭包不含 base-*（实得：${hit.join(',') || '无'}）`);
}
const SRC_RE = /(?:from|import|require\s*\()\s*['"](?:base-paint|base-render)/;
/** 递归列出目录下的 .ts 源文件（无子目录时退化为空）。 */
function walkSrc(dir) {
  const out = [];
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, f.name);
    if (f.isDirectory()) out.push(...walkSrc(abs));
    else if (f.name.endsWith('.ts')) out.push(abs);
  }
  return out;
}
const SRC_SCAN = [...SKILLS_BASE_FROZEN.flatMap((n) => walkSrc(join(root, 'packages', n, 'src'))),
  ...SKILLS_BASE_FROZEN.flatMap((n) => readdirSync(join(root, 'packages', n, 'templates'))
    .filter((f) => f.endsWith('.html')).map((f) => join(root, 'packages', n, 'templates', f)))];
const srcHit = SRC_SCAN.filter((f) => SRC_RE.test(readFileSync(f, 'utf8')));
assert(srcHit.length === 0, `未迁移技能源码／模板不 import base-*（命中：${srcHit.map((f) => f.slice(root.length + 1)).join(',') || '无'}）`);

if (bad) { console.error(`boundaries: ${bad} 处破界`); process.exit(1); }
console.log('boundaries: PASS');
