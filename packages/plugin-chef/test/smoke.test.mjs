// dsh-chef 烟囱：槽位定案 + 设置页住单品 + 桥缺失阻断（不返空）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SLOT_ID, SLOT_ORDER, slotDescriptor, SETTINGS_OWNER, SKILL_CLI, SkillBridgeError, assertCliPresent } from '../dist/index.js';

describe('dsh-chef 烟囱', () => {
  it('槽位 id 与 order 与 P3 定案一致', () => {
    assert.equal(SLOT_ID, 'ilife:chef');
    assert.equal(SLOT_ORDER, 90);
    assert.equal(slotDescriptor().slotId, 'ilife:chef');
  });
  it('设置页住单品包', () => {
    assert.equal(SETTINGS_OWNER, 'dsh-chef');
  });
  it('桥缺失阻断不返空（chef 缺席抛 missing-cli）', () => {
    const cli = SKILL_CLI;
    assert.match(cli, /cmd_read\.js$/);
    assert.throws(() => assertCliPresent('/nonexistent/skill-chef-cmd_read.js'), (e) => e instanceof SkillBridgeError && e.code === 'missing-cli');
  });
});
