/**
 * #863 · 只读提示文案下线（卡路里）——行表 hint 不再出现那句提示，
 * 只读行为仍由行表只读标记承担（控件 disabled，见 t757 收窄测试）。
 * 运行：`node --test packages/plugin-calorie/test/t863-只读文案.test.mjs`。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG_ITEMS } from '../dist/index.js';

describe('#863 只读提示文案下线（卡路里）', () => {
  it('全部 hint 不含那句提示', () => {
    for (const item of CONFIG_ITEMS) {
      assert.doesNotMatch(item.hint, /只读，要改请编辑配置文件/, item.key + ' 的 hint 须删掉那句提示');
      assert.doesNotMatch(item.hint, /改请编辑配置文件/, item.key + ' 的 hint 须删掉同类提示');
    }
  });

  it('只读 8 行仍标只读（外观与保存行为不变，由标记承担）', () => {
    const readonly = CONFIG_ITEMS.filter((i) => i.readonly === true);
    assert.equal(readonly.length, 8);
    for (const item of readonly) assert.notEqual(item.resolveFrom ?? item.key, undefined);
  });

  it('可改行仍是数据目录／照片目录／训记凭据三行', () => {
    assert.deepEqual(CONFIG_ITEMS.filter((i) => i.readonly !== true).map((i) => i.key),
      ['db.dir', 'photos.dir', 'xunji.key']);
  });
});
