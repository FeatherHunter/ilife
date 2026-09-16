/** 预置训记官方动作库（`data/训记官方动作.json`）：完整性 ＋ 编辑器库面三档接线。
 *  读数只钉「量级＋锚点」，不钉精确件数——未来更新动作库只换 JSON，本件不该跟着红。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadPresetCatalogNames, PRESET_CATALOG_PATH } from '../dist/fetch/index.js';
import { editorStateFromPlan } from '../dist/render/planEditorPort.js';

describe('预置训记官方动作库', () => {
  it('预置文件可读：量级千件、无空名、无重名', () => {
    assert.ok(PRESET_CATALOG_PATH.endsWith('训记官方动作.json'));
    const names = loadPresetCatalogNames();
    assert.ok(names.length >= 1000, '件数=' + names.length);
    assert.equal(new Set(names).size, names.length);
    assert.ok(names.every((n) => n.trim() !== ''));
  });
  it('锚点动作在库：俯卧撑／硬拉／史密斯机深蹲／杠铃划船', () => {
    const names = loadPresetCatalogNames();
    for (const w of ['俯卧撑', '硬拉', '史密斯机深蹲', '杠铃划船']) assert.ok(names.includes(w), '缺=' + w);
  });
  it('缺文件兜底：返回空数组，不断链', () => {
    assert.deepEqual(loadPresetCatalogNames('/不存在/训记官方动作.json'), []);
  });
  it('编辑器默认吃预置库：来源行点名＋库里有俯卧撑', () => {
    const st = editorStateFromPlan({});
    assert.ok(st.libSource.startsWith('动作库：预置训记官方库（'), st.libSource);
    assert.ok(st.lib.some((m) => m.name === '俯卧撑'));
  });
  it('用户显式传 catalog 优先：来源行仍是命令参数', () => {
    const st = editorStateFromPlan({}, { catalog: ['俯卧撑'] });
    assert.ok(st.libSource.startsWith('动作库：命令参数 catalog（'), st.libSource);
  });
  it('选择层仅库：计划自带但库外的动作不进选择层', () => {
    const names = loadPresetCatalogNames();
    assert.ok(!names.includes('爬楼机'));
    const st = editorStateFromPlan({ weeks: [{ week_number: 1, days: [{ day_of_week: 1, sessions: [{ session_label: '凌晨', movements: [{ name: '爬楼机' }] }] }] }] });
    assert.equal(st.lib.length, names.length);
    assert.ok(!st.lib.some((m) => m.name === '爬楼机'));
  });
});
