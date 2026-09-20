/** 加载单品插件 client 真产物 `dist/client.js`，取 factory 物化后的 exports（#736 收归一处）。
 *
 * 原先是 `packages/plugin-calorie/test/version-dynamic-130.test.mjs` 里的本地函数；#736 六家
 * 设置页都要在**组件级**验目录选择入口，故提到仓根共用（六份拷贝＝六处腐化）。
 *
 * 语义与那份本地版逐条相同：按 DSH classic script loader 语义在**宿主 realm** 里求值
 * （client 取数期要用宿主全局，且宿主 realm 的原型才与断言库一致）；react 给最小替身
 * （本仓 client 组件只用 `createElement`）；**其余未声明外部一律抛**——client 束只许要 react*。
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * @param {string} pkgDir 插件包根（含 `dist/client.js`）
 * @returns {{ code: string, exports: Record<string, any> }}
 */
export function loadClientBundle(pkgDir) {
  const path = join(pkgDir, 'dist', 'client.js');
  assert.ok(existsSync(path), '缺 dist/client.js：先重建产物（该包 `npm run build:client`，即 tsdown）');
  const code = readFileSync(path, 'utf8');
  const registrations = [];
  const windowStub = { __ModuleLoader__: { load: (reg) => { registrations.push(reg); } } };
  // classic script：顶格 import/export 在函数体里是 SyntaxError（与 loader 语义同向）
  new Function('window', code)(windowStub);
  assert.equal(registrations.length, 1, 'client 束须恰好注册一次');
  const reactStub = { createElement: (type, props, ...children) => ({ type, props, children }) };
  const exportsObj = registrations[0].factory((spec) => {
    const s = String(spec);
    if (s === 'react' || s.startsWith('react')) return reactStub;
    throw new Error('client 束物化期请求了未声明外部：' + s);
  });
  return { code, exports: exportsObj };
}

/** 深度遍历替身 `createElement` 造出的元素树（`{type, props, children}`）。 */
export function walk(node, visit) {
  if (node === null || node === undefined) return;
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit);
    return;
  }
  if (typeof node !== 'object' || !('type' in node)) return;
  visit(node);
  for (const child of node.children ?? []) walk(child, visit);
}

/** 按 tag 收集节点。 */
export function nodesOfType(node, type) {
  const out = [];
  walk(node, (n) => { if (n.type === type) out.push(n); });
  return out;
}

/** 把一棵元素树里所有文本节点拼起来（断言按钮文案用）。 */
export function textOf(node) {
  let text = '';
  walk(node, (n) => {
    for (const child of n.children ?? []) {
      if (typeof child === 'string') text += child;
    }
  });
  return text;
}
