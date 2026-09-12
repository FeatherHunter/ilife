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
assert(!/from\s+['"](?:@[A-Za-z_]+\/|base-|skill-|plugin-|dsh-)/.test(coreSrc), 'link-core 源码不引用任何 workspace 包');
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
// #214 起 skill-chef **正式移出**该名单（承接上面那次代摘）：地图 #208 已裁「私家大厨 HELP 走共享
// help 模板 base-paint/help-shell ＋ 落盘走 base-paint/save-html」，结构裁定正本 docs/skills/skill-chef/
// t236-structure-design.md §1.2 B4／B7（维护者 2026-09-12 逐项裁决 8 问，用户点头＝该票关票条件），
// 同批给 skill-chef 补上 `"base-paint": "^0.3.0"` 依赖——解冻与加依赖是**同一动作的两半**。
// chef 自此同样是有意的消费方。断言口径、判定实现与 skill-home 的覆盖面一律未动
// （仍查依赖闭包＋源码／模板扫描），只是这一份「尚未迁移」名单少最后一个名字。
// #189 起 skill-home **移出**该名单（上面那句「少最后一个名字」由本行兑现）：地图 #183 已裁
// 「居家管家 HELP 走共享 help 模板 base-paint/help-shell」（路由与状态见 docs/skills/skill-home/
// t187-decision.md；渲染接线＝packages/skill-home/src/help/helpFile.ts），同批给 skill-home 补上
// `"base-paint": "^0.3.0"` 依赖——解冻与加依赖是**同一动作的两半**。居家自此同样是有意的消费方。
//
// ⚠️ 名单清空＝上面那两条 for／scan 断言会**空转**（0 命中照样打印 PASS）：本行以下的
// MIGRATED_HELP_CONSUMERS 就是补的等效断言——**六家**「已迁移」技能（含被摘名的 skill-home）的依赖闭包
// 必须真的含 base-paint、源码必须**真的** import 它（名单不再变化时，这两条同样不能空转）。
// 行为面兜底另见 `pnpm snapshot:html:check`（tooling/skill-html-snapshot.mjs）。
const SKILLS_BASE_FROZEN = [];
const BASE_RUNTIME = new Set(['base-paint', 'base-render']); // 目录名／包名两种写法都算
for (const name of SKILLS_BASE_FROZEN) {
  const p = pkg(name);
  const deps = { ...(p.dependencies ?? {}), ...(p.devDependencies ?? {}), ...(p.peerDependencies ?? {}) };
  const hit = Object.keys(deps).filter((d) => BASE_RUNTIME.has(d));
  assert(hit.length === 0, `${name} 依赖闭包不含 base-*（实得：${hit.join(',') || '无'}）`);
}
// ⚠️ #189 就地修掉这条扫描的**假命中**（不是「多报」问题，而是**少报**：真 import 从 source 里摘掉后，
// 假命中仍让扫描保持「实得 N 文件」⇒ 下面那条「已迁移消费方」断言变成永真的空转。#189 的负例实测暴露）。
// 原式 `/(?:from|import|require\s*\()\s*['"](?:base-paint|base-render)/` 有两类假命中：
//   ① 无词边界：注释里的 `pnpm --filter base-paint gen:help-shell` 被当成 `import 'base-paint…'`；
//   ② 可跨行：`import … from` 与 `from '<pkg>…'` 之间没有 `;` 时，匹配会越过换行拼到别处的 `from`。
// 改法：不再用一条大正则，改为**逐行取引号里的模块标识符再逐字比较**——`base-paint-x` 这种前缀相似的
// 名字也不会被当成 `base-paint`（大正则里的 `[^'"]*` 会回溯出假阳性）。
const BASE_RUNTIME_MODULES = new Set(['base-paint', 'base-render']);
const IMPORT_LINE_RE = /(?:^|[\s;{(=,])import\s+(?:type\s+)?(?:[^'"\r\n]*?\sfrom\s*)?(['"])([^'"\r\n]+)\1/;
const REQUIRE_CALL_RE = /require\s*\(\s*(['"])([^'"\r\n]+)\1\s*\)/;
/** 模块标识符是否指向 base-* 运行时（`base-paint/help-shell` 这种子路径出口也算）。 */
const isBaseModule = (spec) => BASE_RUNTIME_MODULES.has(spec.split('/')[0]);
/** 该源文件是否**真的** import／require 了 base-*（逐行判，不跨行、不比子串）。 */
function importsBaseRuntime(text) {
  for (const line of text.split('\n')) {
    const m = IMPORT_LINE_RE.exec(line) ?? REQUIRE_CALL_RE.exec(line);
    if (m !== null && isBaseModule(m[2])) return true;
  }
  return false;
}
const baseImportHits = (dir) => walkSrc(dir).filter((f) => importsBaseRuntime(readFileSync(f, 'utf8')));
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
const srcHit = SRC_SCAN.filter((f) => importsBaseRuntime(readFileSync(f, 'utf8')));
assert(srcHit.length === 0, `未迁移技能源码／模板不 import base-*（命中：${srcHit.map((f) => f.slice(root.length + 1)).join(',') || '无'}）`);

// ── 已迁移消费方的**正向**断言（#189 补，承接名单清空）──────────────────────────────
// 上面两条只证明「名单内没人碰 base-*」；名单空了它们就什么都不证明。这一条反过来钉死：
// 这几家必须**真的是**消费方（依赖闭包有 base-paint ＋ 源码里真的有 import）——
// 谁把依赖或 import 摘了，这里就红（照 P4「边界冻结」的原意：既拦误入、也拦悄悄退出）。
// 名单**含被摘名的 skill-home**（#189 加入）：摘名那一家若不同批纳入这里，「摘名不降级」就是假的。
const MIGRATED_HELP_CONSUMERS = ['skill-home', 'skill-bill', 'skill-calorie', 'skill-chef', 'skill-memo-ilife', 'skill-schedule'];
for (const name of MIGRATED_HELP_CONSUMERS) {
  const deps = { ...(pkg(name).dependencies ?? {}) };
  assert(deps['base-paint'] !== undefined, `${name} 已迁移消费方：依赖闭包含 base-paint`);
  const hits = baseImportHits(join(root, 'packages', name, 'src'));
  assert(hits.length > 0, `${name} 已迁移消费方：源码真的 import base-*（实得 ${hits.length} 文件）`);
}
// 兜底：上面那条只看「>0」，若哪天 helpFile 被改名／挪走，断言会在没人 import 时照样绿。
// 这里钉死它至少得是**真消费 base-paint 的那一件**（居家＝src/help/helpFile.ts）。
{
  const hits = baseImportHits(join(root, 'packages', 'skill-home', 'src'))
    .filter((f) => /[\\/]src[\\/]help[\\/]helpFile\.ts$/.test(f));
  assert(hits.length === 1, `skill-home 的 HELP 渲染接线（src/help/helpFile.ts）真的 import base-*（实得 ${hits.length}）`);
}

if (bad) { console.error(`boundaries: ${bad} 处破界`); process.exit(1); }
console.log('boundaries: PASS');
