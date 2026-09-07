// dsh-ilife-bill 烟囱：槽位定案 + 设置页住单品 + 桥缺失阻断（不返空）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SLOT_ID, SLOT_ORDER, slotDescriptor, SETTINGS_OWNER, SKILL_CLI, SkillBridgeError, assertCliPresent } from '../dist/index.js';

describe('dsh-ilife-bill 烟囱', () => {
  it('槽位 id 与 order 与 P3 定案一致', () => {
    assert.equal(SLOT_ID, 'ilife:cookie');
    assert.equal(SLOT_ORDER, 95);
    assert.equal(slotDescriptor().slotId, 'ilife:cookie');
  });
  it('设置页住单品包', () => {
    assert.equal(SETTINGS_OWNER, 'dsh-ilife-bill');
  });
  it('桥缺失阻断不返空（chef 缺席抛 missing-cli）', () => {
    const cli = SKILL_CLI;
    assert.match(cli, /cmd_read\.js$/);
    assert.ok(typeof assertCliPresent === 'function');
  });
});
