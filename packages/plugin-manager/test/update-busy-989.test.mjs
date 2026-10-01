// 票 #989 自证回路：忙时拒收必须留可视回响，裸奔 promise 不许卡死行（全用源码断言＋纯函数，不碰真机）。
//
// 咬三件事：
//   ① 三处入口（act／checkAll／updateAll）不再有裸 `if (batchBlocked()) return;`——
//      拒收必留痕（行级 busy 失败或题头忙注），"点了没反应"即红；
//   ② `busyNote` 进 face、行一动即清、两处容器（结果区与缺席卡）都渲染；
//   ③ act 的异步体有 try/catch 兜底，异常落 failed 行，不许永远停在 installing。
//
// 先构建再跑：`node node_modules/typescript/bin/tsc -b packages/plugin-manager`
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { updateBusyFailure } from '../dist/update-queue.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PANEL = readFileSync(join(HERE, '..', 'src', 'update-panel.ts'), 'utf8');

describe('#989 忙时拒收留痕（源码断言）', () => {
  it('三处入口不再裸返回：拒收必写 busyNote 或行级失败', () => {
    assert.equal(
      (PANEL.match(/if \(batchBlocked\(\)\) return;/g) ?? []).length,
      0,
      '裸 `if (batchBlocked()) return;` 必须清零（静默吞点击即红）',
    );
  });

  it('题头两入口（checkAll／updateAll）被拦写 busyNote，放行即清', () => {
    const blocked = (PANEL.match(/setBusyNote\(reasonText\('update-busy'\)\)/g) ?? []).length;
    assert.ok(blocked >= 3, 'checkAll／updateAll（含空表）被拦都要写忙注，现 ' + blocked + ' 处');
    assert.match(PANEL, /setBusyNote\(null\);/, '放行即清忙注');
  });

  it('act 被拦写行级 busy 失败（outcome 不动），异步体有 try/catch 兜底', () => {
    assert.match(
      PANEL,
      /patch\(target\.key, \{ \.\.\.current, failure: updateBusyFailure\(target\.key\) \}\);/,
      'act 被拦只写 failure，不动 outcome',
    );
    assert.match(PANEL, /void \(async \(\) => \{\s+try \{/, 'act 异步体必须 try 包住');
    assert.match(PANEL, /裸奔 promise 不许再卡死行/, '兜底分支注记原因');
  });

  it('busyNote 进 face、行一动即清、两处容器都渲染', () => {
    assert.match(PANEL, /readonly busyNote: string \| null;/, 'face 带上忙注字段');
    assert.match(PANEL, /^\s+busyNote,$/m, 'face 字面给出忙注');
    assert.match(
      PANEL,
      /行一动，忙注即过期[\s\S]{0,120}setBusyNote\(null\);\s+setRows/,
      'patch 写行即清忙注',
    );
    assert.match(PANEL, /busyNoteLine\(props\.face\.busyNote\)/, '结果区渲染忙注');
    assert.equal(
      (PANEL.match(/busyNoteLine\(props\.face\.busyNote\)/g) ?? []).length,
      2,
      '结果区与缺席卡两处都要渲染忙注',
    );
  });
});

describe('#989 updateBusyFailure 纯函数', () => {
  it('码与人话取 update-busy 原句，目标键进 details，不带手工命令', () => {
    const failure = updateBusyFailure('calorie');
    assert.equal(failure.ok, false);
    assert.equal(failure.code, 'update-busy');
    assert.equal(failure.details.target, 'calorie');
    assert.equal(failure.manual, null);
    assert.ok(typeof failure.message === 'string' && failure.message.length > 0);
  });
});
