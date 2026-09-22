// 票 #744 · 解耦守卫（常驻机器判据，不是一次性检查）。
//
// 咬两条票面要求：
//   ② 六家零互引：任何一家的源码里不出现另一家的包名／路径；
//   ④ 六家只经能力门：不 deep-import 共用件的 dist 具体文件（只许走那两条子路径）。
//
// 只读源码与 package.json，不构建、不联网。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGES = join(HERE, '..', '..');

/** 六家的目录名 → 包名（票 #744 的实施面）。 */
const SIX = {
  'plugin-bill-ilife': 'dsh-bill-ilife',
  'plugin-calorie': 'dsh-calorie',
  'plugin-chef': 'dsh-chef',
  'plugin-home-ilife': 'dsh-home-ilife',
  'plugin-memo-ilife': 'dsh-memo-ilife',
  'plugin-schedule-ilife': 'dsh-schedule-ilife',
};

/** 摊平一个包 `src/` 下的全部 .ts 文件（只一层到两层，六家都是扁平）。 */
function sourceFiles(pkg) {
  const root = join(PACKAGES, pkg, 'src');
  const out = [];
  for (const name of readdirSync(root)) {
    const full = join(root, name);
    if (statSync(full).isFile() && full.endsWith('.ts')) out.push(full);
  }
  return out;
}

describe('#744 解耦守卫：六家零互引', () => {
  it('任何一家的源码里不出现另一家的包名（两两 36 组）', () => {
    const offenders = [];
    for (const [pkg, name] of Object.entries(SIX)) {
      for (const [otherPkg, otherName] of Object.entries(SIX)) {
        if (otherPkg === pkg) continue;
        for (const file of sourceFiles(pkg)) {
          const text = readFileSync(file, 'utf8');
          if (text.includes(otherName)) offenders.push(`${pkg}/${file.split(/[\\/]/).pop()} → ${otherName}`);
        }
      }
    }
    assert.deepEqual(offenders, [], '六家源码里出现了别家包名：' + offenders.join('；'));
  });

  it('六家不 deep-import 共用件（只许 dsh-life-pack 与它的三条子路径）', () => {
    // #908 加了第三条子路径 `./config-panel`（共用配置面板）：先把字面放行，六家改接它由下一张票落。
    const ALLOWED = new Set([
      'dsh-life-pack',
      'dsh-life-pack/directory-browser',
      'dsh-life-pack/directory-browser-ui',
      'dsh-life-pack/config-panel',
    ]);
    const offenders = [];
    for (const pkg of Object.keys(SIX)) {
      for (const file of sourceFiles(pkg)) {
        const text = readFileSync(file, 'utf8');
        for (const match of text.matchAll(/from '(dsh-life-pack[^']*)'/g)) {
          const spec = match[1];
          if (ALLOWED.has(spec)) continue;
          offenders.push(`${pkg}/${file.split(/[\\/]/).pop()} → ${spec}`);
        }
      }
    }
    assert.deepEqual(offenders, [], '六家用了计划外的取用路径：' + offenders.join('；'));
  });

  it('六家确实都经子路径取共用件（每家用到的至少一条）', () => {
    const TAKEN = [
      "from 'dsh-life-pack/directory-browser'",
      "from 'dsh-life-pack/directory-browser-ui'",
      "from 'dsh-life-pack/config-panel'",
    ];
    for (const pkg of Object.keys(SIX)) {
      const joined = sourceFiles(pkg).map((f) => readFileSync(f, 'utf8')).join('\n');
      assert.ok(
        TAKEN.some((spec) => joined.includes(spec)),
        `${pkg} 没有从共用件取任何东西（接线可能没落地）`,
      );
    }
  });
});
