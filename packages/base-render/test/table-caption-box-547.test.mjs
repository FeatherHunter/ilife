// #547（公共层：窄屏表注 `content-box` 撑出 20px 横滑）· 机检用例。
//
// 出处：场景 01 用户复核「按日汇总表手机端轻微横滑」——390 档真渲实测表格容器
// `scrollWidth 376 ＞ clientWidth 356`，撑开的是 `<caption>`（窄屏段
// `display:block;width:100%`＋内距左右各 10px，结果页无全局 `border-box`）。
// 本票只加**一条声明**（`box-sizing:border-box`），不新增规则、不新增断点、桌面档不动。
// 几何读数（390／512 档容器 `scrollWidth＝clientWidth`）需无头 Chrome，不做成断言；
// 读数脚本与改前改后值见 `docs/base/base-render/t547-证据.md`。
// 纪律（同 `table-mobile-t541.test.mjs`）：只读产出的 `blocksCss()`，不写死行号。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { STYLE_PREFIX } from '../dist/index.js';
import { blocksCss } from '../dist/blocks.js';

const P = STYLE_PREFIX;
const CSS = blocksCss();
const TABLE = '.' + P + 'block-data-table';

function ruleBlocks(css) {
  const out = [];
  for (const m of css.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    const selector = m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim().replace(/\s+/g, ' ');
    if (selector === '') continue;
    out.push({ selector, decls: m[2].split(';').map((s) => s.trim()).filter((s) => s.includes(':')) });
  }
  return out;
}

function declsOf(css, selector) {
  const hits = ruleBlocks(css).filter((b) => b.selector === selector);
  assert.equal(hits.length, 1, selector + ' 必须恰 1 条，实为 ' + String(hits.length));
  return hits[0].decls;
}

function declValue(decls, prop) {
  const hit = decls.find((d) => d.startsWith(prop + ':'));
  assert.ok(hit, '缺声明 ' + prop + '：' + JSON.stringify(decls));
  return hit.slice(prop.length + 1).trim();
}

function atRuleSpan(css, head) {
  const at = css.indexOf(head);
  assert.ok(at >= 0, '缺 at-rule：' + head);
  const open = css.indexOf('{', at);
  assert.ok(open > at, head + ' 段缺规则体');
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) return { start: open + 1, end: i, body: css.slice(open + 1, i) };
    }
  }
  throw new Error('花括号不配对：' + head);
}

function narrowDataTable() {
  const hits = [];
  for (let i = 0; i < CSS.length; i += 1) {
    if (CSS.startsWith('@media (max-width: 640px)', i)) {
      hits.push(atRuleSpan(CSS.slice(i), '@media (max-width: 640px)'));
    }
  }
  const hit = hits.find((h) => h.body.includes(P + 'block-data-table-table'));
  assert.ok(hit !== undefined, '缺 ≤640px 的数据表媒体查询段');
  return hit.body;
}

describe('#547 窄屏表注不撑宽（box-sizing 进窄屏段）', () => {
  const cap = () => declsOf(narrowDataTable(), TABLE + '-caption');

  it('表注带 `box-sizing:border-box`（`width:100%`＋内距不再撑出横滑）', () => {
    assert.equal(declValue(cap(), 'box-sizing'), 'border-box', '表注缺 box-sizing（390 档会溢出 20px）');
  });

  it('#541 的三条不断（display／width／不断行禁令仍在）', () => {
    assert.equal(declValue(cap(), 'display'), 'block', '表注必须占满整卡');
    assert.equal(declValue(cap(), 'width'), '100%', '表注宽度必须钉在满卡上');
  });

  it('桌面档没有 `box-sizing` 兜底（本票只动窄屏段，桌面列宽读数不受影响）', () => {
    const hits = ruleBlocks(CSS).filter((b) => b.selector === TABLE + '-caption');
    assert.equal(hits.length, 2, 'caption 规则应恰 2 条（基座＋窄屏），实为 ' + String(hits.length));
    const base = hits.find((b) => !b.decls.some((d) => d.startsWith('display:')));
    assert.ok(base !== undefined, '找不到基座 caption 规则');
    assert.ok(!base.decls.some((d) => d.startsWith('box-sizing:')), '基座 caption 不许顺手加声明：' + JSON.stringify(base.decls));
  });
});
