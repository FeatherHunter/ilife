// 票 #986 第二半 · 宿主侧独立 I/O 并行化 ＋ 自足动作不排队（全用假读数，不碰真机）。
//
// 咬三件事，都不咬写法：
//   ① 七目标回包总耗时不随读次数线性增长（并发而非累加）：以可注入的读替身（每次读耗时 T）驱动；
//   ② 单个目标的三次读之间并发（不是三次相加）；
//   ③ 自足动作（本机根清单）不排在表构建之后：表构建失败／缓慢时根清单仍能回答。
//
// 先构建再跑：`node node_modules/typescript/bin/tsc -b packages/plugin-manager`
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const HOST_SRC = readFileSync(join(HERE, '..', 'src', 'update-host.ts'), 'utf8');

const host = await import('../dist/update-host.js');
const { assembleTargetRows, buildUpdatePhoneTable } = host;
const { UPDATE_TARGETS } = await import('../dist/update-targets.js');
const { MANAGER_ACTIONS } = await import('../dist/update-contract.js');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** 每次读耗时 T 的替身：记下最大并发数，用于断言“真的并发了”。 */
function trackingReaders(delayMs, tracker) {
  const wrap = (name) => async () => {
    tracker.active += 1;
    tracker.peak = Math.max(tracker.peak, tracker.active);
    try {
      await sleep(delayMs);
      if (name === 'capture') return '0.0.1';
      if (name === 'panel') return true;
      return { packageName: 'skill-x', version: '0.0.1' };
    } finally {
      tracker.active -= 1;
    }
  };
  return { capture: wrap('capture'), panel: wrap('panel'), skill: wrap('skill') };
}

describe('#986 宿主并行：七目标回包不随读次数线性增长', () => {
  it('assembleTargetRows 存在且为函数（可注入读替身的接缝）', () => {
    assert.equal(typeof assembleTargetRows, 'function', '缺可注入的组装接缝：测不了并发');
  });

  it('七目标 × 每次读 30ms：总耗时远小于串行累加（21×30=630ms），且峰值并发≥14（两级并发）', async () => {
    const tracker = { active: 0, peak: 0 };
    const readers = trackingReaders(30, tracker);
    const started = Date.now();
    const rows = await assembleTargetRows(UPDATE_TARGETS, '/假/使用范围', readers);
    const elapsed = Date.now() - started;
    assert.equal(rows.length, 7, '七个目标一行都不能少');
    assert.ok(tracker.peak >= 14, '两级并发的峰值应接近21（七目标×三次读全并发）：peak=' + tracker.peak + '（仅一层并发时峰值≤7）');
    // 串行下限 630ms；并发上限取 400ms（7 目标 × 3 读全并发时约 30ms，留足 CI 抖动）。
    assert.ok(elapsed < 400, `总耗时 ${elapsed}ms 未体现并发（串行约 630ms）`);
  });

  it('读不到的仍按原语义回 null／false，不抛', async () => {
    const readers = {
      capture: async () => null,
      panel: async () => false,
      skill: async () => null,
    };
    const rows = await assembleTargetRows(UPDATE_TARGETS, '/假/使用范围', readers);
    assert.equal(rows.length, 7);
    for (const row of rows) {
      assert.equal(row.installedVersion, null);
      assert.equal(row.panelRegistered, false);
      assert.equal(row.skill, null);
    }
  });
});

describe('#986 自足动作不排队：根清单不经表构建', () => {
  it('源码接线：根清单在表构建之前分流（自足动作不排队）', () => {
    const marker = 'export function buildUpdatePhoneTable';
    const at = HOST_SRC.indexOf(marker);
    assert.ok(at >= 0, '找不到电话表入口');
    const body = HOST_SRC.slice(at);
    assert.match(body, /MANAGER_ACTIONS\.roots/, '电话表入口未点名根清单：自足动作仍排队');
    // 入口内的根分流必须出现在懒建表之前
    const rootsInBody = body.indexOf('MANAGER_ACTIONS.roots');
    const lazyInBody = body.indexOf('table ??=');
    // 实现后懒建只对需要表的方法生效：入口内要么无 `table ??=`（按需建），要么根分流在其之前。
    if (lazyInBody >= 0) {
      assert.ok(rootsInBody >= 0 && rootsInBody < lazyInBody, '根清单仍排在表构建之后：自足动作未解绑');
    }
  });

  it('表构建缓慢／失败时，根清单仍能立即回答', async () => {
    let built = false;
    const slowBuild = async () => {
      built = true;
      await sleep(5000);
      throw new Error('表构建不该被根清单触发');
    };
    const table = buildUpdatePhoneTable({}, { buildTable: slowBuild });
    const started = Date.now();
    const reply = await table.call(MANAGER_ACTIONS.roots, {});
    const elapsed = Date.now() - started;
    assert.equal(reply.ok, true, '根清单恒成功');
    assert.ok(Array.isArray(reply.value.roots), '根清单回包形状');
    assert.equal(built, false, '根清单不许触发表构建');
    assert.ok(elapsed < 1000, `根清单被表构建挡住了：${elapsed}ms`);
  });
});
