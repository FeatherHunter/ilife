// 九枚印章组件（`src/seal-stamp.ts`）的渲染回路：九档材质、印文、铆钉、糙边、按钮语义。
//
// 读法沿 `seal-scroll.test.mjs`：源码转 CJS 载入＋树展开器读屏（纯函数、无 hook）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import * as React from 'react';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCROLL_TS = join(HERE, '..', 'src', 'seal-scroll.ts');
const STAMP_TS = join(HERE, '..', 'src', 'seal-stamp.ts');
const SCROLL_JS = join(HERE, '..', 'src', 'seal-scroll.js');
const STAMP_JS = join(HERE, '..', 'src', 'seal-stamp.js');

/** 源码转 CJS 载入（与 `seal-scroll.test.mjs` 同形）：卷轴与印渲染期互引，编译前先占缓存位，循环不断链。 */
function compileAs(tsPath, jsKey) {
  const hit = Module._cache[jsKey];
  if (hit) return hit.exports;
  const code = ts.transpileModule(readFileSync(tsPath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: tsPath,
  }).outputText;
  const instance = new Module(jsKey, null);
  instance.filename = jsKey;
  instance.paths = Module._nodeModulePaths(dirname(tsPath));
  Module._cache[jsKey] = instance;
  instance._compile(code, jsKey);
  return instance.exports;
}

const ORIG_LOAD = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === './seal-stamp.js') return compileAs(STAMP_TS, STAMP_JS);
  if (request === './seal-scroll.js') return compileAs(SCROLL_TS, SCROLL_JS);
  return ORIG_LOAD.call(this, request, parent, isMain);
};

const { SealStamp } = compileAs(STAMP_TS, STAMP_JS);

function expand(node) {
  if (node === null || node === undefined || node === false || node === true) return null;
  if (typeof node === 'string' || typeof node === 'number') return { type: '#text', text: String(node) };
  if (Array.isArray(node)) return node.map(expand).filter((c) => c !== null);
  if (typeof node.type === 'function') return expand(node.type(node.props));
  if (node.type === React.Fragment) return expand(node.props.children);
  return { type: node.type, props: node.props, children: expand(node.props?.children) };
}

function textsOf(node, out = []) {
  if (!node) return out;
  if (node.type === '#text') { out.push(node.text); return out; }
  if (Array.isArray(node)) { for (const c of node) textsOf(c, out); return out; }
  textsOf(node.children, out);
  return out;
}

function nodesOf(node, pred, out = []) {
  if (!node || node.type === '#text') return out;
  if (Array.isArray(node)) { for (const c of node) nodesOf(c, pred, out); return out; }
  if (pred(node)) out.push(node);
  nodesOf(node.children, pred, out);
  return out;
}

const ROLES = ['skill', 'help', 'plugin'];
const TIERS = ['copper', 'silver', 'gold'];
const LABEL = { skill: '技能', help: '饼干记账 HELP', plugin: '插件' };

describe('seal-stamp 九档', () => {
  it('九档都印出印文', () => {
    for (const role of ROLES) for (const tier of TIERS) {
      const tree = expand(React.createElement(SealStamp, { role, tier, label: LABEL[role] }));
      assert.ok(textsOf(tree).includes(LABEL[role]), role + '/' + tier + ' 印文缺席');
    }
  });
  it('九档底色两两不同', () => {
    const bgs = new Set();
    for (const role of ROLES) for (const tier of TIERS) {
      const tree = expand(React.createElement(SealStamp, { role, tier, label: LABEL[role] }));
      const btn = nodesOf(tree, (n) => n.type === 'button')[0];
      bgs.add(btn.props.style.background);
    }
    assert.equal(bgs.size, 9);
  });
  it('只有插件三档有两颗铆钉', () => {
    for (const role of ROLES) for (const tier of TIERS) {
      const tree = expand(React.createElement(SealStamp, { role, tier, label: LABEL[role] }));
      const rivets = nodesOf(tree, (n) => n.props?.['data-seal-rivet'] !== undefined);
      assert.equal(rivets.length, role === 'plugin' ? 2 : 0, role + '/' + tier);
    }
  });
  it('按钮语义：可点＋弹卷＋印文标签', () => {
    const tree = expand(React.createElement(SealStamp, { role: 'help', tier: 'gold', label: '饼干记账 HELP' }));
    const btn = nodesOf(tree, (n) => n.type === 'button')[0];
    assert.equal(btn.props['aria-haspopup'], 'dialog');
    assert.equal(btn.props['aria-label'], '饼干记账 HELP');
  });
  it('糙边走印那条滤镜', () => {
    const tree = expand(React.createElement(SealStamp, { role: 'skill', tier: 'copper', label: '技能' }));
    const btn = nodesOf(tree, (n) => n.type === 'button')[0];
    assert.ok(String(btn.props.style.filter).includes('dshLifeSealRoughEdge'));
  });
  it('三章等高（字号与上下垫同值）', () => {
    const specs = [];
    for (const role of ['skill', 'help', 'plugin']) {
      const tree = expand(React.createElement(SealStamp, { role, tier: 'gold', label: 'x' }));
      specs.push(nodesOf(tree, (n) => n.type === 'button')[0].props.style);
    }
    assert.equal(new Set(specs.map((s) => s.fontSize)).size, 1, '字号必须一致');
    assert.equal(new Set(specs.map((s) => String(s.padding).split(' ')[0])).size, 1, '上下垫必须一致');
  });
  it('HELP 横向收窄（左右垫小于技能）', () => {
    const inlineOf = (role) => {
      const tree = expand(React.createElement(SealStamp, { role, tier: 'gold', label: 'x' }));
      return parseFloat(String(nodesOf(tree, (n) => n.type === 'button')[0].props.style.padding).split(' ')[1]);
    };
    assert.ok(inlineOf('help') < inlineOf('skill'));
  });
  it('未知组合抛错', () => {
    assert.throws(() => expand(React.createElement(SealStamp, { role: 'skill', tier: 'diamond', label: '技能' })));
  });
});