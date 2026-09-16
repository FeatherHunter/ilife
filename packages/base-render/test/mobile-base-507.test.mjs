// #507 移动端底座余量：五处最小增量的判据（只读产出物与母版文本，不自造数值表）。
//
// 覆盖：③减动效归零（母版＋区块）／④phone 高 dvh（vh 兜底在前）／⑤等宽栈同文件统一／
//   ⑥表格斑马纹（数值等宽已落地，本件只断斑马纹＋不断数值栈）／⑦KPI 桌面列数上限。
// 未覆盖（另有归属）：viewport（#525 按需启用口径）、触摸目标分级（等用户裁定档位）、
//   数值列等宽栈（table-width-512.test.mjs 已钉）、blocks 等宽第三栈（H-06 已钉 4 处）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { blocksCss } from '../dist/blocks.js';

const TEMPLATE = readFileSync(
  fileURLToPath(new URL('../assets/help-template.html', import.meta.url)),
  'utf8',
);
const CSS = blocksCss();

function occurrences(haystack, needle) {
  let count = 0;
  let from = 0;
  for (;;) {
    const hit = haystack.indexOf(needle, from);
    if (hit < 0) return count;
    count += 1;
    from = hit + needle.length;
  }
}

describe('#507 ③ 减动效归零档', () => {
  it('母版含 prefers-reduced-motion 归零段（transition 与 animation 双归零）', () => {
    assert.ok(
      TEMPLATE.includes('@media (prefers-reduced-motion: reduce)'),
      '母版缺 reduced-motion 归零段',
    );
    const tail = TEMPLATE.slice(TEMPLATE.indexOf('@media (prefers-reduced-motion: reduce)'));
    assert.ok(tail.includes('transition:none'), '归零段须含 transition:none');
    assert.ok(tail.includes('animation:none'), '归零段须含 animation:none（hmFade／hmPop）');
  });

  it('母版归零段覆盖 toast 入场（JS 注入样式后出现，须高权重才盖得住）', () => {
    const tail = TEMPLATE.slice(TEMPLATE.indexOf('@media (prefers-reduced-motion: reduce)'));
    assert.ok(tail.includes('.hm-toast-stack .hm-toast'), 'toast 归零须挂祖先类提权重');
  });

  it('区块折叠头小三角过渡进归零段（blocks 唯一 transition）', () => {
    assert.ok(CSS.includes('@media (prefers-reduced-motion: reduce)'), '区块缺归零段');
  });
});

describe('#507 ④ phone 高用 dvh（vh 兜底在前）', () => {
  it('≤500px 档 .phone 先 100vh 再 100dvh', () => {
    assert.ok(
      TEMPLATE.includes('.phone{width:100%;height:100vh;height:100dvh;'),
      'phone 高须双声明且 vh 在前（老浏览器整行丢弃 dvh 即回落）',
    );
  });
});

describe('#507 ⑤ 等宽栈同文件统一', () => {
  it('短栈清零、长栈恰 5 处（141／152／toast-code／1273／1442）', () => {
    assert.equal(
      occurrences(TEMPLATE, 'font-family:ui-monospace,Menlo,monospace'),
      0,
      '短栈 `ui-monospace,Menlo,monospace` 须清零',
    );
    assert.equal(
      occurrences(TEMPLATE, 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace'),
      5,
      '长栈须恰 5 处（注：1273／1442 两处冒号后带空格，只数栈体本身）',
    );
  });
});

describe('#507 ⑥ 表格斑马纹', () => {
  it('偶数数据行 td 吃既有 --bg（不新增语义 token，不新类名）', () => {
    assert.ok(
      CSS.includes('block-data-table tbody tr:nth-child(even) td'),
      '缺偶行斑马纹规则',
    );
    assert.ok(
      CSS.includes('background-color: var(--bg);'),
      '斑马纹须引用既有 token var(--bg)',
    );
  });
});

describe('#507 ⑦ KPI 桌面列数上限', () => {
  it('≥1024 一档 repeat(3,…)，基座 auto-fit 一字不动', () => {
    assert.ok(CSS.includes('@media (min-width: 1024px)'), '缺 1024 桌面档');
    assert.ok(
      CSS.includes('block-page-shell .ilife-block-kpi-card-grid'),
      '桌面帽须挂祖先类（与窄屏档同法，不碰基座计数）',
    );
    assert.ok(
      CSS.includes('grid-template-columns: repeat(3, minmax(0, 1fr));'),
      '桌面帽须为 repeat(3, minmax(0, 1fr))',
    );
    assert.ok(
      CSS.includes('grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));'),
      '基座 auto-fit 须保留（只加帽，不改基座）',
    );
  });
});
