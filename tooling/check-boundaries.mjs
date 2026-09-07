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
if (bad) { console.error(`boundaries: ${bad} 处破界`); process.exit(1); }
console.log('boundaries: PASS');
