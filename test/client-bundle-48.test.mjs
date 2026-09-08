/** P10 #48 回归回路： served client.js 必须满足 DSH 真实 loader 契约。
 *
 * 契约来源（只读消费，不 import）：
 * - @deepseek-ai/dsh-client-modules：classic script 执行只做 REGISTERS
 *   （window.__ModuleLoader__.load({id, factory})），副作用全在 factory 内；
 *   batch 到达后无对应 id 注册即报 "loaded without registering"（#48 用户原报错）。
 * - 已知正常插件 dsh-im-companion：lib/client.js 为 CJS 工厂包
 *   （banner __ModuleLoader__.load + intro module/exports + footer），
 *   browser 平台，react/cordis/@deepseek-ai/* 走外部 require，导出 apply + inject。
 *
 * 本回路即该契约的最小镜像：红 = 会重演 #48 整批 crash；绿 = 可上线。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { readdirSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
/** 自动发现：凡声明 dsh.client(web) 的包自动被看门——新单品零追加即可被回归。 */
const PLUGINS = readdirSync(join(REPO, 'packages'), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => join(REPO, 'packages', e.name, 'package.json'))
  .filter((p) => existsSync(p))
  .map((p) => ({ manifest: p, json: JSON.parse(readFileSync(p, 'utf8')) }))
  .filter((e) => e.json?.dsh?.client?.platform === 'web')
  .map((e) => ({ pkg: e.json.name, dir: dirname(e.manifest).split(/[\\/]/).pop() }));
assert.ok(
  PLUGINS.length >= 2 && PLUGINS.some((e) => e.pkg === 'dsh-calorie'),
  '自动发现异常：期望至少含 dsh-calorie 的 web client 包，实际 ' + JSON.stringify(PLUGINS.map((e) => e.pkg)),
);
/** 浏览器侧允许的外部 require（与已知正常插件的 externals 对齐）。 */
const ALLOWED_EXTERNALS = new Set([
  'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client',
  'cordis',
  '@deepseek-ai/dsh-client-runtime',
  '@deepseek-ai/dsh-client-runtime/client',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-connection',
  '@deepseek-ai/dsh-client-ui-workspace',
]);

function loadClient(pkg, dir) {
  const p = join(REPO, 'packages', dir, 'dist', 'client.js');
  assert.ok(existsSync(p), `${pkg} 缺 dist/client.js（先构建对应包）`);
  return { path: p, code: readFileSync(p, 'utf8') };
}

/** 在 classic-script 语义下执行（复刻 loader 的 script  transport：非 module）。 */
function executeClassic(code, path) {
  const registrations = [];
  const sandbox = {
    window: { __ModuleLoader__: { load: (reg) => { registrations.push(reg); } } },
  };
  vm.createContext(sandbox);
  const script = new vm.Script(code, { filename: path }); // ESM import/export 在此直接 SyntaxError
  script.runInContext(sandbox, { timeout: 5000 });
  return registrations;
}

for (const { pkg, dir } of PLUGINS) {
  test(`${pkg} client：classic 执行并注册自身 id（#48 整批 crash 回归）`, () => {
    const { path, code } = loadClient(pkg, dir);
    const regs = executeClassic(code, path);
    assert.equal(regs.length, 1, `${pkg} 必须恰好注册一次，实际 ${regs.length} 次`);
    const id = String(regs[0]?.id ?? '').replace(/\/client$/, '');
    assert.equal(id, pkg, `${pkg} 注册 id 不符：${String(regs[0]?.id)}`);
    assert.equal(typeof regs[0]?.factory, 'function', `${pkg} 注册必须带 factory`);
  });

  test(`${pkg} client：factory 可物化，导出 apply/inject，无 node 依赖`, () => {
    const { path, code } = loadClient(pkg, dir);
    const regs = executeClassic(code, path);
    assert.equal(regs.length, 1);
    const requested = [];
    const stubRequire = (spec) => {
      requested.push(String(spec));
      if (ALLOWED_EXTERNALS.has(String(spec))) return {};
      throw new Error(`client purity：不允许的外部 require("${spec}")`);
    };
    const exp = regs[0].factory(stubRequire);
    assert.equal(typeof exp?.apply, 'function', `${pkg} client 必须导出 apply`);
    assert.ok(Array.isArray(exp?.inject), `${pkg} client 必须导出 inject 数组`);
    for (const spec of requested) {
      assert.ok(
        ALLOWED_EXTERNALS.has(spec) || spec.startsWith('react'),
        `${pkg} 物化期请求了未声明外部：${spec}`,
      );
    }
  });

  test(`${pkg} client：产物无 ESM 语法、无 node: 导入（build 期纯度门镜像）`, () => {
    const { code } = loadClient(pkg, dir);
    assert.ok(code.includes('__ModuleLoader__'), `${pkg} 产物缺 loader 注册头`);
    assert.doesNotMatch(code, /(^|\n)\s*import\s[^'"]*from\s['"]/m, `${pkg} 产物含 ESM import（classic script 必 SyntaxError）`);
    assert.doesNotMatch(code, /(^|\n)\s*export\s+(default|const|function|class|\{|\*)/m, `${pkg} 产物含 ESM export`);
    assert.doesNotMatch(code, /from\s+['"]node:[^'"]+['"]/, `${pkg} 产物含 node: 导入（浏览器无此模块）`);
    assert.doesNotMatch(code, /require\(\s*['"]node:[^'"]+['"]\s*\)/, `${pkg} 产物含 node: require（浏览器无此模块）`);
  });
}
