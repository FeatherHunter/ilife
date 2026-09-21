/**
 * #861 · 依赖下界门（`tooling/check-base-floor.mjs`）的判据与自证。
 *
 * 病：六技能的配置表删了一批键、改由「已退休键清单」交给公共层，而 `package.json` 里仍写
 * `"base-link-core": "^0.3.0"`——装机沿用锁里那份 0.3.6（满足 `^0.3.0`，却不懂退休清单），
 * 六个配置面板全读不出配置。本文件咬住三件事：
 *   ① 真仓当刻是绿的（下界逐字等于仓内 base 版本）；
 *   ② **门有识别力**：夹具里把下界写回 `^0.3.0` 必红、写回 `^0.3.7` 必绿（变异自证，红→还原→绿）；
 *   ③ 判据的边界不许糊：下界更高也红、认不出的写法也红、扫描面为空也红、
 *      `devDependencies` 不算数、目录名与包名不同也认得出。
 *
 * 夹具一律建在 `os.tmpdir()` 下的独占目录（不写仓内任何路径）。
 */
import { strict as assert } from 'node:assert';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { audit, minAdmitted } from '../tooling/check-base-floor.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GATE = join(REPO_ROOT, 'tooling', 'check-base-floor.mjs');

/** 造一份最小仓：`{ '<目录>/package.json': <对象> }`。返回值含 `root` 与 `clean()`。 */
function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), 't861-floor-'));
  for (const [rel, manifest] of Object.entries(files)) {
    const file = join(root, rel);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  }
  return { root, clean: () => rmSync(root, { recursive: true, force: true }) };
}

/** 夹具：base-link-core 0.3.7 ＋ 一个消费方（下界由调用方给）。 */
function consumerFixture(range, section = 'dependencies') {
  return {
    'packages/base-link-core/package.json': { name: 'base-link-core', version: '0.3.7' },
    'packages/skill-x/package.json': {
      name: 'skill-x', version: '1.0.0', [section]: { 'base-link-core': range },
    },
  };
}

test('下界写法解析：^／~／>=／精确／区间／|| 都取「允许的最低版」，认不出回 null', () => {
  assert.deepEqual(minAdmitted('^0.3.7'), [0, 3, 7]);
  assert.deepEqual(minAdmitted('~0.3.7'), [0, 3, 7]);
  assert.deepEqual(minAdmitted('>=0.3.7'), [0, 3, 7]);
  assert.deepEqual(minAdmitted('0.3.7'), [0, 3, 7]);
  assert.deepEqual(minAdmitted('0.3.7 - 0.3.9'), [0, 3, 7]);
  assert.deepEqual(minAdmitted('^0.3.7 || ^0.4.0'), [0, 3, 7]);
  assert.deepEqual(minAdmitted('^0.3.0 || ^0.3.7'), [0, 3, 0], '|| 里有一条放行旧版 ⇒ 下界仍是旧版');
  assert.equal(minAdmitted('latest'), null);
  assert.equal(minAdmitted('*'), null);
});

test('真仓当刻是绿的：每条消费方 → base-* 的下界都逐字等于仓内那一版', () => {
  const { edges, findings } = audit(REPO_ROOT);
  assert.equal(findings.length, 0, '有红：' + JSON.stringify(findings));
  assert.ok(edges.length >= 13, '扫描面至少含 6 技能 × 2 ＋ base-combos × 1 ＝ 13 条边，实得 ' + edges.length);
});

test('变异自证：夹具下界写回 ^0.3.0 必红，还原成 ^0.3.7 必绿（红 → 还原 → 绿）', () => {
  const fx = fixture(consumerFixture('^0.3.7'));
  try {
    const manifest = join(fx.root, 'packages', 'skill-x', 'package.json');

    // 还原态（绿）
    assert.equal(audit(fx.root).findings.length, 0, '还原态本该绿');
    // 破坏态（红）——就是 #861 的原形
    writeFileSync(manifest, JSON.stringify({
      name: 'skill-x', version: '1.0.0', dependencies: { 'base-link-core': '^0.3.0' },
    }, null, 2) + '\n', 'utf8');
    const broken = audit(fx.root);
    assert.equal(broken.findings.length, 1, '破坏态本该恰有一条红');
    assert.equal(broken.findings[0].kind, 'floor-mismatch');
    assert.equal(broken.findings[0].consumer, 'skill-x');
    // 还原态（绿）
    writeFileSync(manifest, JSON.stringify({
      name: 'skill-x', version: '1.0.0', dependencies: { 'base-link-core': '^0.3.7' },
    }, null, 2) + '\n', 'utf8');
    assert.equal(audit(fx.root).findings.length, 0, '还原后本该绿');
  } finally { fx.clean(); }
});

test('门的四种边界：更高也红／写法认不出也红／空扫描面也红／devDependencies 不算数', () => {
  const higher = fixture(consumerFixture('^0.3.8'));
  try { assert.equal(audit(higher.root).findings[0].kind, 'floor-mismatch', '下界高于仓内 ⇒ 要求还没发的版本，也是红'); }
  finally { higher.clean(); }

  const odd = fixture(consumerFixture('latest'));
  try { assert.equal(audit(odd.root).findings[0].kind, 'unreadable-range', '认不出的写法不许当绿放行'); }
  finally { odd.clean(); }

  const empty = fixture({ 'packages/base-link-core/package.json': { name: 'base-link-core', version: '0.3.7' } });
  try { assert.equal(audit(empty.root).findings[0].kind, 'empty-scan', '扫描面为空＝放宽，必须红'); }
  finally { empty.clean(); }

  // devDependencies 不算数：同一份 ^0.3.0 写在 devDependencies 里绿、写在 dependencies 里红。
  //   夹具里另有一个下界正确的消费方，免得「扫不到边」那条红混进来。
  const dev = fixture({
    'packages/base-link-core/package.json': { name: 'base-link-core', version: '0.3.7' },
    'packages/skill-ok/package.json': { name: 'skill-ok', version: '1.0.0', dependencies: { 'base-link-core': '^0.3.7' } },
    'packages/skill-dev/package.json': { name: 'skill-dev', version: '1.0.0', devDependencies: { 'base-link-core': '^0.3.0' } },
  });
  try { assert.equal(audit(dev.root).findings.length, 0, 'devDependencies 只在本仓链工作区，不在判据内'); }
  finally { dev.clean(); }

  const runtime = fixture({
    'packages/base-link-core/package.json': { name: 'base-link-core', version: '0.3.7' },
    'packages/skill-ok/package.json': { name: 'skill-ok', version: '1.0.0', dependencies: { 'base-link-core': '^0.3.7' } },
    'packages/skill-dev/package.json': { name: 'skill-dev', version: '1.0.0', dependencies: { 'base-link-core': '^0.3.0' } },
  });
  try {
    const findings = audit(runtime.root).findings;
    assert.equal(findings.length, 1, '换到 dependencies 就该红：' + JSON.stringify(findings));
    assert.equal(findings[0].consumer, 'skill-dev');
  } finally { runtime.clean(); }
});

test('目录名与包名不同也认得出：packages/base-render 发出去叫 base-paint', () => {
  const fx = fixture({
    'packages/base-render/package.json': { name: 'base-paint', version: '0.3.6' },
    'packages/skill-x/package.json': { name: 'skill-x', version: '1.0.0', dependencies: { 'base-paint': '^0.3.6' } },
  });
  try {
    const report = audit(fx.root);
    assert.equal(report.findings.length, 0);
    assert.equal(report.bases[0].name, 'base-paint');
    assert.equal(report.bases[0].dir, 'base-render');
  } finally { fx.clean(); }
});

test('出口就是判据：夹具红时 exit 1、绿时 exit 0（跑的是真脚本，不是内部函数）', () => {
  const red = fixture(consumerFixture('^0.3.0'));
  const green = fixture(consumerFixture('^0.3.7'));
  try {
    const redRun = spawnSync(process.execPath, [GATE, '--root', red.root], { encoding: 'utf8' });
    assert.equal(redRun.status, 1, '红夹具该 exit 1，实得 ' + String(redRun.status));
    assert.match(redRun.stdout, /RESULT: 0\/1/);
    assert.match(redRun.stdout, /base-floor: FAIL/);

    const greenRun = spawnSync(process.execPath, [GATE, '--root', green.root], { encoding: 'utf8' });
    assert.equal(greenRun.status, 0, '绿夹具该 exit 0，实得 ' + String(greenRun.status));
    assert.match(greenRun.stdout, /RESULT: 1\/1/);
    assert.match(greenRun.stdout, /base-floor: PASS/);
  } finally { red.clean(); green.clean(); }
});
