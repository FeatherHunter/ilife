// 命名纪律门（#859 规格 §一）：把独立审计件接进包内 test 门。
//
// 审计件是唯一实现（R1 事实源豁免／R2 零越界／R3 命令中文名唯一），本件只负责「每次跑套件都跑它」，
// 不复制判据逻辑——两份判据会走散，这一条与仓里「一处定义」同源。
// 反例证明：在 `src/**` 任一运行期位置塞回一个场景 id 字面量即红（审计件逐条点名）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG = join(dirname(fileURLToPath(import.meta.url)), '..');
const AUDIT = join(PKG, 'scripts', 'audit-naming.mjs');

describe('#859 命名纪律（字母码只住事实源与机器附录）', () => {
  it('audit-naming：零越界 ＋ 命令中文名 70/70 唯一（exit 0）', () => {
    const r = spawnSync(process.execPath, [AUDIT], { encoding: 'utf8' });
    const out = (r.stdout || '') + (r.stderr || '');
    assert.equal(r.status, 0, '命名纪律审计未过：\n' + out);
    assert.match(out, /PASS：命名纪律 0 处越界/);
    assert.match(out, /命令中文名 70\/70 唯一/);
  });
});
