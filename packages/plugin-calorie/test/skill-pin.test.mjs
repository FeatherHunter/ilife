// ticket 63（插件发版前置修复）：dsh-calorie 对 skill-calorie 必须精确 pin，
// 且 pin 值逐字等于 packages/skill-calorie/package.json 的 version。
// 理由：caret（^）＋ 存量 lockfile 会让旧 skill 残留（^0.2.0 已被 0.2.0 满足就不动它）；
// exact 使旧锁不再满足、强制重解，新装必得新 SKILL 正文。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pluginPkg = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8'));
const skillPkg = JSON.parse(
  readFileSync(join(here, '..', '..', 'skill-calorie', 'package.json'), 'utf8'),
);

describe('ticket63 skill-calorie 精确 pin（发版前置）', () => {
  it('插件 skill-calorie 依赖值逐字等于 skill 包 version', () => {
    assert.equal(pluginPkg.dependencies?.['skill-calorie'], skillPkg.version);
  });
});
