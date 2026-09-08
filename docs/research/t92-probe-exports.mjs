// T92 只读取证：逐个 import 三包 dist，枚举出口面。不写任何文件，只打印。
import { pathToFileURL } from 'node:url';

const TARGETS = [
  { label: 'base-link-core', spec: 'base-link-core', dist: 'D:/ilife/packages/base-link-core/dist/index.js' },
  { label: 'base-paint (packages/base-render)', spec: 'base-paint', dist: 'D:/ilife/packages/base-render/dist/index.js' },
  { label: 'base-combos', spec: 'base-combos', dist: 'D:/ilife/packages/base-combos/dist/index.js' },
];

function describe(fn) {
  const src = Function.prototype.toString.call(fn);
  const isClass = /^class[\s{]/.test(src.trim());
  return { kind: isClass ? 'class' : 'function', name: fn.name, length: fn.length };
}

function summarize(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return { array: v.length, head: v.slice(0, 3) };
  const t = typeof v;
  if (t === 'object') return { objectKeys: Object.keys(v) };
  return { [t]: v };
}

for (const t of TARGETS) {
  let mod, how;
  try {
    mod = await import(t.spec);
    how = `bare specifier "${t.spec}"`;
  } catch {
    mod = await import(pathToFileURL(t.dist).href);
    how = `dist path ${t.dist}`;
  }
  const names = Object.keys(mod).sort();
  console.log(`\n=== ${t.label} ===`);
  console.log(`load: ${how}`);
  console.log(`export count: ${names.length}`);
  console.log(`names: ${names.join(', ')}`);
  for (const n of names) {
    const v = mod[n];
    let d;
    if (typeof v === 'function') d = describe(v);
    else d = summarize(v);
    console.log(`  - ${n} | typeof=${typeof v} | ${JSON.stringify(d)}`);
  }
}
