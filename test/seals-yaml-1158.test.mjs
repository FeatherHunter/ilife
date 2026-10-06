// seals.yaml 两道门：① 生成件与 yaml 逐字节一致；② 设计语言只住总管那一份，不许抄进六家的生成件。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
const { renderAll } = await import('../tooling/gen-seals.mjs');

const VOCAB_FILE = 'seal-vocabulary.generated.ts';
describe('seals.yaml → 生成件（1 份设计语言 ＋ 6 份章状态）', () => {
  it('七份生成件都在，且与 yaml 逐字节一致', () => {
    const all = renderAll();
    assert.equal(all.size, 7, '1 份设计语言 + 6 份章状态');
    for (const [file, want] of all) {
      assert.ok(existsSync(file), '缺生成件：' + file + '（跑 node tooling/gen-seals.mjs）');
      assert.equal(readFileSync(file, 'utf8'), want, file + ' 与 seals.yaml 不一致：跑 node tooling/gen-seals.mjs');
    }
  });
  it('设计语言只住总管那份：六家的生成件里不许出现档位话／段标签／关闭钮字', () => {
    const all = renderAll();
    const phrases = [
      '精雕细琢中', '全场景打通中', '基础建设中', // 档位话（卷轴那行＝气泡）
      '进展', '状态', '计划', // 三段小标题
      '收卷', // 关闭钮字
    ];
    for (const [file, body] of all) {
      if (file.includes(VOCAB_FILE)) continue;
      for (const p of phrases) {
        assert.ok(!body.includes(p), file + ' 里出现了设计语言「' + p + '」：它只该住 seals.yaml 的 vocabulary 段（六家各自抄一份＝改一句要改六处）');
      }
    }
  });
  it('每家三枚齐、档位只能是铜／银／金', () => {
    const all = renderAll();
    let plugins = 0;
    for (const [file, body] of all) {
      if (file.includes(VOCAB_FILE)) continue;
      plugins += 1;
      const roles = [...body.matchAll(/role: '([a-z]+)'/g)].map((m) => m[1]);
      assert.deepEqual(roles, ['help', 'skill', 'plugin'], file + ' 要按 HELP／技能／插件三枚');
      for (const m of body.matchAll(/tier: '([a-z]+)'/g)) assert.ok(['copper', 'silver', 'gold'].includes(m[1]), file + ' 档位只能是铜／银／金，现为 ' + m[1]);
    }
    assert.equal(plugins, 6, '六家');
  });
});
