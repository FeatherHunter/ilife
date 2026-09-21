#!/usr/bin/env node
/**
 * #757 · 跨技能出口删键后的**测试缝替代通道**（t612／t613／t614／cmd-write-40-persist 共用）。
 *
 * 背景：`land.scheduleCli`／`land.memoCli` 从默认值表出表（#748 定稿，#757 落地），出口退回
 * 「按包布局推断」——生产代码（`src/workout/landRunner.ts`）不再读配置，直接 spawn 兄弟包编译产物。
 * 测试里跨技能两步绝不能真调（会写真实作息／备忘数据、要飞书登录），原先靠配置指到
 * `land-fixture.mjs`；删键后配置里的残留被退休清单容忍（读跳过、不进取值），故改成**文件缝**：
 * 把同一份 fixture 脚本暂放到推断出的那两个位置，跑完原样还原。
 *
 * 为什么是文件缝而不是别的：
 * - 0 环境变量（#746 处置）：不许再加 `CALORIE_*` 开关；
 * - 子进程测试（`execFileSync` 走真 CLI）没法接函数参数，函数注入口子只覆盖直调，覆盖不了真出口；
 * - 推断位置由生产代码自己报（装完后调 `scheduleCliPath()`／`memoCliPath()` 回认），本件不手写断言路径——
 *   两边若走散，回认那一步当场红（见下 `install` 末段）。
 *
 * 用法（每件测试文件各两行）：
 *   import { installInferredLandStub, uninstallInferredLandStub } from './helpers/land-inferred-stub.mjs';
 *   before(installInferredLandStub);
 *   after(uninstallInferredLandStub);
 * 配置里不再写 `land: { scheduleCli, memoCli }`（写了也被退休清单忽略）；`xunji: { cli: fixture }`
 * 照旧（页外键，还在）；`T676_LAND_FIXTURE`／`T676_LAND_FIXTURE_LOG` 照旧（同一份脚本读同一套环境）。
 *
 * 并发与崩溃：
 * - 本仓测试一律经 `node tooling/run-locked.mjs` 排队（并发纪律），同一时刻只有一个测试进程在跑，
 *   故暂放期间没有别的测试会读到这两份文件；
 * - `after` 保证还原（断言失败也走）；若进程崩溃没走到还原，兄弟包那两份 `dist` 会残留 fixture——
 *   下次跑兄弟包测试前重编一次即可（`tsc -b packages/skill-schedule packages/skill-memo-ilife`）。
 *   `dist/**` 在 `.gitignore` 里，残留打不到主干。
 *
 * 本件不是测试件（不匹配 `test/*.test.mjs`），与同目录 `land-fixture.mjs` 同列。
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const HERE = dirname(fileURLToPath(import.meta.url));
/** 仓内包根：本件上三级（helpers → test → skill-calorie → packages）。 */
const PACKAGES = join(HERE, '..', '..', '..');
/** 同一份 fixture 脚本（响应与调用留痕都由它出，与配置缝时期同一份）。 */
const FIXTURE = join(HERE, 'land-fixture.mjs');

/** 推断位置的镜像公式（与 `src/workout/landRunner.ts` 的 `['..','..','..','skill-*',...]` 同形；
 *  装完后用生产函数回认，漂移当场红，不靠注释保证）。 */
function inferredTargets() {
  return [
    join(PACKAGES, 'skill-schedule', 'dist', 'cli', 'cmd_read.js'),
    join(PACKAGES, 'skill-memo-ilife', 'dist', 'cli', 'cmd_read.js'),
  ];
}

/** 备份：路径 → 原字节（文件不在记 null，还原时删掉）。 */
let backups = null;

/** 装上文件缝（`before` 用；幂等：装过即直接回）。 */
export async function installInferredLandStub() {
  if (backups !== null) return;
  assert.ok(existsSync(FIXTURE), '缺跨技能出口 fixture：' + FIXTURE);
  const targets = inferredTargets();
  for (const t of targets) {
    assert.ok(existsSync(t), '缺兄弟包编译产物：' + t + '（先跑 tsc -b packages/skill-schedule packages/skill-memo-ilife）');
  }
  backups = new Map();
  for (const t of targets) {
    backups.set(t, readFileSync(t));
    copyFileSync(FIXTURE, t);
  }
  // 回认：生产函数算出来的位置必须就是刚装的那两个（两边走散当场红）。
  const { scheduleCliPath, memoCliPath } = await import('../../dist/workout/landRunner.js');
  assert.deepEqual([scheduleCliPath(), memoCliPath()].sort(), [...targets].sort(), '推断位置与生产代码走散：先对齐 landRunner.ts 的相对段再跑');
}

/** 还原文件缝（`after` 用；没装过即直接回）。 */
export function uninstallInferredLandStub() {
  if (backups === null) return;
  for (const [path, bytes] of backups) {
    try {
      if (bytes === null) rmSync(path, { force: true });
      else writeFileSync(path, bytes);
    } catch {
      /* 还原失败不掩盖测试结论；残留按件头「崩溃」一段处理 */
    }
  }
  backups = null;
}
