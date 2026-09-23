/** charts · dispatch
 *
 *  自 `src/charts.ts` 第 2035–2068 行原样切出。
 *
 *  **住址**：目录化批次④把 `src/charts.ts` 按段切成「族内一件一文件」，正文原样搬来；
 *  搬迁判据＝产物逐字节相同（八种图表产物 ＋ `chartsCss` ＋ helpers JS），
 *  见 `docs/base/base-render/组件目录架构.md`。
 */

import { badKind } from './shared.js';
import { renderLine } from './line.js';
import { renderBar } from './bar.js';
import { renderDonut } from './donut.js';
import { renderProgress } from './progress.js';
import { renderCombo } from './combo.js';
import { renderSparkline } from './sparkline.js';
import { renderGauge } from './gauge.js';
import { renderScatter } from './scatter.js';
import { ChartKind, ChartOutput, ChartsApi } from '../../spec/index.js';

/* ── 派发表（R15：未命中 → `kind-unknown`） ───────────────────────────── */

/** 派发表逐键绑定 `ChartsApi` 的**方法签名**（入参取 `Parameters<ChartsApi[K]>[0]`）：
 *  各渲染函数按冻结输入类型标注，键与函数错配／入参或返回类型写错都是**编译期**红，
 *  不再用 `as ChartsApi` 断言掩盖 8 方法各自的入参类型（R1-B3／FX-78-A1b-15）。 */
type ChartDispatch = { readonly [K in ChartKind]: (input: Parameters<ChartsApi[K]>[0]) => ChartOutput };

const CHART_DISPATCH = {
  bar: renderBar,
  line: renderLine,
  donut: renderDonut,
  progress: renderProgress,
  combo: renderCombo,
  sparkline: renderSparkline,
  gauge: renderGauge,
  scatter: renderScatter,
} satisfies ChartDispatch;

const PROXY_SAFE_KEYS = ['then', 'toJSON', 'inspect', 'constructor', 'toString', 'valueOf', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString'];

/** 冻结签名：`ChartsApi`（8 方法，去掉旧 `el` 参数，DOM 由调用方挂载）。
 *  派表按 `ChartKind` 键入（`satisfies ChartDispatch` 已在编译期校验 8 个键与签名）；
 *  **JS 调用方**访问表外 key（如 `charts['pie']`）→ 调用即抛 `ChartError` code `kind-unknown`
 *  （类型层不可达，R15）。导出类型 = 冻结 `ChartsApi`，**不用 `as` 断言**（FX-78-A1b-15）。 */
export const charts: ChartsApi = new Proxy(CHART_DISPATCH, {
  get(target, prop, receiver) {
    if (typeof prop === 'string' && !Object.prototype.hasOwnProperty.call(target, prop)
      && !PROXY_SAFE_KEYS.includes(prop)) {
      return (): never => badKind(prop);
    }
    return Reflect.get(target, prop, receiver);
  },
});

