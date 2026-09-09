// #89 返修席 R-9 · B1 H-06／H-10 回归断言（node:test；随 root `pnpm test` 跑）。
//
// 背景：`docs/research/t89-visual-lock.md` verdict **H-06 未达**（正文栈缺失，computed 回落
// `Noto Sans SC`）＋ **H-10 FAIL**（`.ilife-help-shell-card-mark` 声明 `4px` 圆角，越出允许集合）。
// 编排者裁决 D-22：两条按规格修（不记偏离）。本文件钉死修后态：
//   - H-06：`.ilife-help-shell` 基座规则含正文栈（局部 CSS 常量 `BODY_FONT_STACK`），首位
//     `"SF Pro Display"`（后接系统兜底＋`"Noto Sans SC"`）；壳内后代继承 → 浏览器 computed
//     `font-family` 首位即 `"SF Pro Display"`（computed 实测见 `docs/research/t89-recheck-h06-h10.md`）。
//     约束同步钉死：不新增 token 名（栈值内无 `--` 引用；`:root` 仍 11 个由 T4 钉死）＋
//     等宽栈不动（全表 `font-family` 含 `SF Mono` 者逐字 `"SF Mono", monospace` 且恰 4 处）。
//   - H-10：HELP 自身 CSS 区（charts 区按 D-10 除外）全部 `border-radius` ∈
//     {8px,14px,20px,999px,50%}；`card-mark` 逐字 `8px`（`4px`→集合内最近值，最小改动，D-5 不新增 token 名）。
//
// 纪律：只读 `buildStyleSheet()` 文本与冻结常量；不写死任何 token 逐值；不放宽既有断言。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildStyleSheet } from '../dist/index.js';

/** HELP 自身 CSS 区（charts 区按 D-10／L-17 除外；口径与 `t89-probe-help-static.mjs` H-04/H-10 同源）。 */
function helpZoneCss(css) {
  const chartsStart = css.indexOf('/* charts */');
  const helpStart = css.indexOf('/* help-shell */');
  assert.ok(chartsStart >= 0 && helpStart > chartsStart, '缺 charts／help-shell 区注释头');
  return css.slice(0, chartsStart) + css.slice(helpStart);
}

/** 取基座规则块 `.ilife-help-shell { … }` 的声明体（选择器逐字相等，非子串）。 */
function shellBaseBody(css) {
  const m = /\.ilife-help-shell \{([^{}]*)\}/.exec(css);
  assert.ok(m, '缺 `.ilife-help-shell` 基座规则块');
  return m[1];
}

describe('#89 R-9 回归：B1 H-06 正文栈', () => {
  it('H-06 `.ilife-help-shell` 基座含正文栈且首位 "SF Pro Display"（computed 首位即此）', () => {
    const css = buildStyleSheet().css;
    const body = shellBaseBody(css);
    const m = /font-family:\s*([^;]+);/.exec(body);
    assert.ok(m, '基座缺 `font-family` 声明（H-06 未达会复发）');
    const stack = m[1].trim();
    // 首位：computed `font-family` 序列化首项即此串首项。
    assert.ok(
      stack.startsWith('"SF Pro Display"'),
      '正文栈首位必须是 "SF Pro Display"，实测：' + stack,
    );
    // 方案形状：后接系统兜底＋"Noto Sans SC"（修前 CJK 回落实测，渲染不变）。
    assert.ok(stack.includes('-apple-system'), '正文栈须含系统兜底 -apple-system，实测：' + stack);
    assert.ok(stack.includes('"Noto Sans SC"'), '正文栈须含 "Noto Sans SC" 兜底，实测：' + stack);
    assert.ok(stack.endsWith('sans-serif'), '正文栈须以 sans-serif 收尾，实测：' + stack);
    // 不新增 token 名：栈值内不得出现 `--` 自定义属性引用。
    assert.ok(!stack.includes('--'), '正文栈不得引用 token（D-5：局部 CSS 常量），实测：' + stack);
  });

  it('H-06 等宽栈不动：全表逐字 "SF Mono", monospace 且恰 4 处、无 Consolas', () => {
    const css = buildStyleSheet().css;
    const monoDecls = [...css.matchAll(/font-family:\s*([^;]+);/g)]
      .map((m) => m[1].trim())
      .filter((v) => v.includes('SF Mono'));
    assert.equal(monoDecls.length, 4, '等宽声明数漂移（toast-code／init-prompt／cli／prompt）：' + JSON.stringify(monoDecls));
    for (const v of monoDecls) {
      assert.equal(v, '"SF Mono", monospace', '等宽栈必须逐字（D-13，不留 Consolas）：' + v);
    }
    assert.equal((css.match(/Consolas/g) ?? []).length, 0, 'Consolas 必须 0 命中');
    assert.ok((css.match(/SF Pro Display/g) ?? []).length > 0, 'SF Pro Display 必须 >0 命中');
  });
});

describe('#89 R-9 回归：B1 H-10 形状集合', () => {
  it('H-10 HELP 区 border-radius 全集 ⊆ {8px,14px,20px,999px,50%}（charts 区除外）', () => {
    const css = buildStyleSheet().css;
    const allowed = new Set(['8px', '14px', '20px', '999px', '50%']);
    const bad = [];
    for (const m of helpZoneCss(css).matchAll(/border-radius:\s*([^;}]+)/g)) {
      for (const part of m[1].trim().split(/\s+/)) {
        if (!allowed.has(part)) bad.push(part);
      }
    }
    assert.deepEqual([...new Set(bad)], [], 'HELP 区圆角越出允许集合（H-10 FAIL 会复发）');
  });

  it('H-10 `.ilife-help-shell-card-mark` 逐字 8px（4px 已消除）', () => {
    const css = buildStyleSheet().css;
    const m = /\.ilife-help-shell-card-mark \{([^{}]*)\}/.exec(helpZoneCss(css));
    assert.ok(m, '缺 `.ilife-help-shell-card-mark` 规则块');
    assert.ok(
      m[1].split(';').map((s) => s.trim()).includes('border-radius: 8px'),
      'card-mark 圆角必须逐字 8px（集合内最近值），实测：' + m[1].replace(/\s+/g, ' '),
    );
    assert.ok(!/border-radius:\s*4px/.test(helpZoneCss(css)), 'HELP 区不得残留 `border-radius: 4px`');
  });
});
