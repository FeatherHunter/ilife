/** flow-ribbon · **两条构成轨那一段的形状**（同目录第三份样式来源；由 `style.ts` 的 `flowRibbonCss()` 汇总）。
 *
 *  为什么独立成件：`style-forms.ts` 里桑基与矩阵两段已经够长，再叠这一段就过本包的行数告警线
 *  （350 行／LF 口径，见 `packages/base-render/AGENTS.md`）。**取值一个字节都不许改**——搬的只是「住哪个文件」。
 *
 *  纪律同 `style.ts`：只经 `skinVar()` 读皮肤／全部规则 scope 在 `.<prefix>page-ui` 之下且**每条里作用域恰一次**
 *  （拼后代选择器时只用不带 scope 的裸槽类 `c()`）／零 `:root`／零 `!important`／零颜色字面量
 *  （两层深浅都走 `color-mix()` 从 `accent` 与 `surface` 算，**不拿 `ink` 系当面**）。
 */
import { skinVar } from '../skin/contract.js';
import { FLOW_RIBBON_NARROW_PX, flowRibbonSlot, type FlowRibbonSlot } from './attrs.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 构成轨里两层的深浅（同一条 `accent`，只换掺进去的权重）：来源那一层比用途那一层深一档。 */
const RAIL_WASH_SRC = 26;
const RAIL_WASH_USE = 13;

/** 一条轨的高度（px）：够放一个百分数，又不至于在窄档把版面顶长。 */
const RAIL_PX = 34;

/** 一个百分比档：强调色往卡面掺 `weight`%（淡洗＝合法的面；不是"拿墨色当面"）。 */
const wash = (weight: number): string => 'color-mix(in srgb, ' + skinVar('accent') + ' ' + String(weight)
  + '%, ' + skinVar('surface') + ')';

/** 构成轨那一段的样式（由 `flowRibbonCss()` 插在矩阵之后、共用名单与脚注之前）。恒返回非空 CSS 文本。 */
export function flowRibbonRailsCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const s = (slot: FlowRibbonSlot): string => root + ' .' + flowRibbonSlot(slot, p);
  /* 槽类名（**不带 scope**）：只用在**已经落进本件某条选择器内部**的位置（前缀由外层那条选择器给）。 */
  const c = (slot: FlowRibbonSlot): string => '.' + flowRibbonSlot(slot, p);

  return [
    `/* ── 两条构成轨 ＋ 中间汇合读数 ──────────────────────────────────
   每格宽度＝这一格占总额的比例：**同一个总额、两条轨各自拉满 100%**，故上下两轨可以横着比。
   宽度写在 width 上（不是靠内容撑），这正是原型阶段踩过的那个坑（flex: 0 0 auto 按文字宽度排）。 */`,
    s('rails') + ' {',
    '  display: grid;',
    '  gap: 5px;',
    '  min-width: 0;',
    '}',
    s('rails-hd') + ' {',
    '  margin: 0;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  overflow-wrap: anywhere;',
    '}',
    s('rail') + ' {',
    '  display: flex;',
    '  height: ' + String(RAIL_PX) + 'px;',
    '  min-width: 0;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  overflow: hidden;',
    '}',
    /* 一格：宽＝占比；段与段之间留 1px 纸缝（`border-right` 走卡面色，**不占额外宽度**）。 */
    s('seg') + ' {',
    '  flex: 0 0 auto;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  min-width: 0;',
    '  width: var(' + '--flow-ribbon-w, 0%);',
    '  border-right: 1px solid ' + skinVar('surface') + ';',
    '  overflow: hidden;',
    '}',
    s('rail') + '.is-src ' + c('seg') + ' {',
    '  background: ' + wash(RAIL_WASH_SRC) + ';',
    '}',
    s('rail') + '.is-use ' + c('seg') + ' {',
    '  background: ' + wash(RAIL_WASH_USE) + ';',
    '}',
    s('rail') + ' ' + c('seg') + ':last-child {',
    '  border-right: 0;',
    '}',
    s('seg-pct') + ' {',
    '  color: ' + skinVar('ink') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  white-space: nowrap;',
    '}',
    s('hub') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 2px 10px;',
    '  min-width: 0;',
    '  padding: 6px 0;',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '  border-bottom: 1px solid ' + skinVar('line') + ';',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '}',
    s('hub-eq') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    s('hub-net') + ' {',
    '  margin-left: auto;',
    '  min-width: 0;',
    '  font-variant-numeric: tabular-nums;',
    '  white-space: nowrap;',
    '}',
    s('rails-list') + ' {',
    '  display: grid;',
    '  grid-template-columns: repeat(2, minmax(0, 1fr));',
    '  gap: 6px 18px;',
    '  min-width: 0;',
    '  padding-top: 8px;',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '}',
    s('rails-col') + ' {',
    '  display: grid;',
    '  gap: 4px;',
    '  min-width: 0;',
    '}',
    /* 窄容器：名单由两栏改一栏（一栏里名字与金额都放得下，两栏会挤到折行折得难看）。 */
    '@container (max-width: ' + String(FLOW_RIBBON_NARROW_PX) + 'px) {',
    '  ' + s('rails-list') + ' {',
    '    grid-template-columns: minmax(0, 1fr);',
    '  }',
    '}',
  ].join(LF);
}
