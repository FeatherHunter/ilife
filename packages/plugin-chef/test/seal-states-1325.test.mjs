// 章状态生成件（#1325）：同一份 `seals.yaml` 生成的中／英两套章文案，默认中文、language: 'en' 英文。
// 读法：直接调生成件的 `sealStates`，不渲染（渲染回路由 `plugin-manager` 的 seal-stamp／seal-scroll 用例覆盖）。
// 中文快照钉住「#1325 前逐字节不变」；英文列只比结构与非中文（label 的产品名是冻结例外）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SEAL_SEED, sealStates } from '../dist/seal-states.generated.js';

describe('私家大厨的章状态按语言取（#1325）', () => {
  it('缺省中文与 #1325 前逐字同', () => {
    assert.equal(SEAL_SEED, 2, '家下标不变');
    assert.deepEqual(sealStates("私家大厨"), [
      { role: 'help', tier: 'silver', label: "私家大厨 HELP", progress: "完成度 50%", status: "全打通", plan: "将所有功能和场景全部打通" },
      { role: 'skill', tier: 'copper', label: "技能", progress: "完成度 60%", status: "基本可用", plan: "修复明显bug并将未打通场景打通" },
      { role: 'plugin', tier: 'copper', label: "插件", progress: "完成度 60%", status: "基本可用", plan: "修复明显bug并将未打通场景打通" },
    ]);
  });
  it('language: en 三枚章文案英文、档位与角色不变', () => {
    const en = sealStates("私家大厨", 'en');
    assert.deepEqual(en.map((s) => [s.role, s.tier]), [['help', 'silver'], ['skill', 'copper'], ['plugin', 'copper']]);
    assert.equal(en[0].label, "私家大厨 HELP", 'HELP 印文的产品名是冻结例外（不译）');
    assert.deepEqual(en.map((s) => s.progress), ["50% complete", "60% complete", "60% complete"]);
    assert.deepEqual(en.map((s) => s.status), ["All connected", "Usable", "Usable"]);
    for (const s of en) {
      assert.ok(!/[\u4e00-\u9fff]/.test(s.progress + s.status + s.plan), s.role + ' 英文列不许混中文');
    }
    assert.equal(en[1].label, 'Skill');
    assert.equal(en[2].label, 'Plugin');
  });
});
