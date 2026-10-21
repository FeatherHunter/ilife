// 票 #1294 ①：首开只挂当前页签。旧版在 section 一挂载时「预热」——错峰把六家全挂上，
// 每次挂载都触发一次技能 CLI 取数，六次排队占满宿主（旧实现还是同步 spawn），先画出来的反而是空骨架。
//
// 判据（读**真产物** `packages/plugin-manager/dist/client.js`，所以要先构建再跑）：
//   · 页签槽的每次取数都带 `only`：首开那一遍只许出现当前页签那一家。
//     旧版预热在 effect 里批量 setVisitedIds，紧接的那一遍就六家全挂，这里的读数会是六家。
//   · 屏上 `role="tabpanel"` 只有一格（未访问的页签不画，页签条上的按钮照旧六格）。
//   · 已访问过的页签保持挂载这条回路不在本文件里量（要模拟点击＋重渲）；
//     它的写法由 `packages/plugin-manager/src/client.ts` 的 `visitedIds` 过滤保证。
//
// 变异自证（2026-10-21 实测）：把产物里那个过滤
// `tab.plugin === active || visitedIds.has(tab.plugin)` 改成 `true`（＝六家全挂）→ ①② 红；
// `node node_modules/typescript/bin/tsc -b packages/plugin-manager --force` 重建产物 → 绿。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderManagerPanel } from '../../../test/helpers/panel-render.mjs';
import { MANAGER_TABS } from '../dist/nav.js';
import { CONFIG_TAB_SLOT } from '../dist/update-contract.js';

/** 账本那一排：六家都在场（缺席态由 `absent-steps-1282` 那一族咬，不在这里混）。 */
const ROWS = MANAGER_TABS.map((tab, index) => ({ id: tab.plugin, order: index, label: tab.title, channel: '' }));
/** 首开落在导航表第一格（`activeId` 初值是 undefined，`active` 兜底取 `MANAGER_TABS[0].plugin`）。 */
const ACTIVE = MANAGER_TABS[0].plugin;

/** 元素树里所有 `role="tabpanel"` 的格子（替身 createElement 的形状：`{type, props}`）。 */
function panelsOf(node, out = []) {
  if (node === null || node === undefined || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const child of node) panelsOf(child, out);
    return out;
  }
  if (node.props?.role === 'tabpanel') out.push(node);
  panelsOf(node.props?.children, out);
  return out;
}

describe('票 #1294 ① 首开只挂当前页签（真产物渲一次，数页签槽取数）', () => {
  it('页签槽只被取一次，且 `only` 是当前那一家', async () => {
    const { slotCalls } = await renderManagerPanel({ tabs: ROWS });
    // 每个渲染遍都会重取一次槽（替身渲染器会为 effect 收敛再跑一遍），所以按家去重后再数。
    const mounted = [...new Set(slotCalls.filter((call) => call.slot === CONFIG_TAB_SLOT).map((call) => call.only))];
    assert.deepEqual(mounted, [ACTIVE], '首开挂载的家数不对（旧版预热会在这里露出六家）');
  });

  it('屏上 tabpanel 只有一格，就是当前那一家', async () => {
    const { tree } = await renderManagerPanel({ tabs: ROWS });
    const panels = panelsOf(tree);
    assert.equal(panels.length, 1, '未访问的页签也被画出来了');
    assert.ok(String(panels[0].props.id).endsWith('-panel-' + ACTIVE), '那一格不是当前那一家：' + panels[0].props.id);
  });

  it('页签条仍是六格（懒挂载不是删页签）', async () => {
    const { tabLabels } = await renderManagerPanel({ tabs: ROWS });
    assert.deepEqual(tabLabels, MANAGER_TABS.map((tab) => tab.title), '页签条少了格子');
  });
});
