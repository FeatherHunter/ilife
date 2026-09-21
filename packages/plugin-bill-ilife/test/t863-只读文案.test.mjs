/**
 * #863 · 只读提示文案下线（记账）——行表 hint 不再出现那句提示，
 * 只读行为仍由行表只读标记承担（控件 disabled，见 t749 收窄测试）。
 * 运行：`node --test packages/plugin-bill-ilife/test/t863-只读文案.test.mjs`。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG_ITEMS } from '../dist/index.js';

describe('#863 只读提示文案下线（记账）', () => {
  it('全部 hint 不含那句提示', () => {
    for (const item of CONFIG_ITEMS) {
      assert.doesNotMatch(item.hint, /只读，要改请编辑配置文件/, item.key + ' 的 hint 须删掉那句提示');
      assert.doesNotMatch(item.hint, /改请编辑配置文件/, item.key + ' 的 hint 须删掉同类提示');
    }
  });

  it('只读行仍标只读（外观与保存行为不变，由标记承担）', () => {
    const readonly = CONFIG_ITEMS.filter((i) => i.readonly === true);
    assert.deepEqual(readonly.map((i) => i.key).sort(),
      ['backup.dir', 'backup.stem', 'db.goals', 'db.name', 'html.dir']);
    for (const item of readonly) assert.notEqual(item.resolveFrom, undefined, item.key + ' 应保留生效值来源');
  });

  it('可改行仍只有数据目录一行', () => {
    assert.deepEqual(CONFIG_ITEMS.filter((i) => i.readonly !== true).map((i) => i.key), ['db.dir']);
  });
});
