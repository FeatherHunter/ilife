/** charts · helpers
 *
 *  自 `src/charts.ts` 第 2181–2230 行原样切出。
 *
 *  **住址**：目录化批次④把 `src/charts.ts` 按段切成「族内一件一文件」，正文原样搬来；
 *  搬迁判据＝产物逐字节相同（八种图表产物 ＋ `chartsCss` ＋ helpers JS），
 *  见 `docs/base/base-render/组件目录架构.md`。
 */

import { LF, jsStr } from './shared.js';
import { chartsCss } from './style.js';
import { STYLE_PREFIX } from '../../style.js';
import { BuildChartsHelpersJs, CHARTS_STYLE_ID, ChartsHelpersInput } from '../../spec/index.js';

/* ── 图表 helpers JS（唯一产出者，FX-22；首步幂等自注入 `<style>`） ────── */

function helpersPrefix(input?: ChartsHelpersInput): string {
  const prefix = input === undefined || input === null ? undefined : input.prefix;
  return typeof prefix === 'string' && prefix !== '' ? prefix : STYLE_PREFIX;
}

function helpersStyleId(input?: ChartsHelpersInput): string {
  const styleId = input === undefined || input === null ? undefined : input.styleId;
  return typeof styleId === 'string' && styleId !== '' ? styleId : CHARTS_STYLE_ID;
}

/** 冻结签名：`buildChartsHelpersJs(input?: ChartsHelpersInput): string`。
 *
 *  产出恒为**非空**、**经典 script** 作用域可跑的 IIFE（无 `import`／`export`／顶层 `await`），
 *  逐项满足 `SHARED_HELPERS_JS_RULE`：自包含（不依赖其它脚本或既有全局）／幂等（判据**只落 DOM**：
 *  `getElementById(styleId)` 早退，**不**用全局哨兵）／允许页面侧 DOM（`document.*`）／
 *  不向 `window.<id>`／`globalThis.<id>` 赋值／不引 `node:`。
 *
 *  首步即幂等自注入 `<style id="{styleId ?? CHARTS_STYLE_ID}">`（R3／R12）；图表 CSS 文本
 *  **只此一处产出**（`chartsCss`），#75 实施时复用同一份文本，不得重述。 */
export const buildChartsHelpersJs: BuildChartsHelpersJs = (input) => {
  const prefix = helpersPrefix(input);
  const styleId = helpersStyleId(input);
  const css = chartsCss(prefix);
  const lines: string[] = [
    '(function () {',
    "  'use strict';",
    '  var STYLE_ID = ' + jsStr(styleId) + ';',
    '  var CSS = ' + jsStr(css) + ';',
    '',
    '  function boot() {',
    '    if (document.getElementById(STYLE_ID)) return;',
    '    var host = document.head || document.body;',
    '    if (!host) return;',
    '    var style = document.createElement("style");',
    '    style.id = STYLE_ID;',
    '    style.textContent = CSS;',
    '    host.appendChild(style);',
    '  }',
    '',
    '  if (document.head || document.body) boot();',
    '  else document.addEventListener("DOMContentLoaded", boot);',
    '}());',
  ];
  return lines.join(LF);
};

/* 记账：本文件产出的 HTML 恒用 `STYLE_PREFIX` 命名空间（`prefix` 覆盖只作用于 CSS 文本）；
 *  `CHART_STRUCTURE_RULE`／`CHART_EMPTY_RULE`／`CHART_COORD_RULE` 逐值由 `test/charts.test.mjs` 钉死。 */
