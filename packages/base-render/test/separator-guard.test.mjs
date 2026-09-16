// t508 双守卫（base-render 席）· 节点级 exit1 ＋ 变异电池。
//
// 只读 `packages/base-render/test/separator-probe.mjs` 的口径（`visibleText`／`judge`／
// `parallelRun` 一字未动）与 `../dist/blocks.js` 的产出物（`renderCaliberLine`），不写死行号，
// 不碰任何技能路径与他票文件。本票不改落点件源码：变异对象是“送进探针的可见文本”，
// 用于自证守卫的识别力（改回分隔符串 → 必红；改回 → 必绿）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { auditHtml, exitCodeFor } from './separator-probe.mjs';
import { renderCaliberLine } from '../dist/blocks.js';

const shell = (inner) => `<html><head><style>.x{color:red}</style></head><body>${inner}</body></html>`;
const nodeHits = (r) => r.node.hits.length;
const lineHits = (r) => r.line.hits.length;

describe('t508 守卫一 · 节点级 exit1（R1/R2/R3 只判可见文本）', () => {
  it('干净文本 → 零命中 → exit 0', () => {
    const r = auditHtml(shell('<p class="a">今日摄入 1189 卡</p>'));
    assert.equal(nodeHits(r), 0);
    assert.equal(lineHits(r), 0);
    assert.equal(exitCodeFor(r), 0);
  });

  it('R1：可见文本含 · → 节点级命中 → exit 1，且附归属元素 class', () => {
    const r = auditHtml(shell('<div class="ilife-block-kpi-card-detail"><p>目标 1800 卡 · 完成度 66%</p></div>'));
    assert.ok(r.node.hits.length >= 1);
    assert.ok(r.node.hits.some((h) => h.tags.includes('R1')));
    assert.equal(exitCodeFor(r), 1);
    assert.ok(r.node.hits[0].owner.includes('ilife-block-kpi-card-detail'));
  });

  it('R2：可见文本含 ； → 命中 → exit 1', () => {
    const r = auditHtml(shell('<p>缺数一律写 —；有记录才有数。</p>'));
    assert.ok(r.node.hits.some((h) => h.tags.includes('R2')));
    assert.equal(exitCodeFor(r), 1);
  });

  it('R3：同一分隔符切出连续 ≥3 段且每段 ≤40 字 → 命中；，。：~ → ＝ 不算并列分隔符', () => {
    const hit = auditHtml(shell('<p>苹果、香蕉、橙子、葡萄</p>'));
    assert.ok(hit.node.hits.some((h) => h.tags.includes('R3')));
    assert.equal(exitCodeFor(hit), 1);
    const clean = auditHtml(shell('<p>你好，世界。今天很好：继续努力，范围 ~ 指向 → 等号 ＝ 结束。</p>'));
    assert.equal(nodeHits(clean), 0);
    assert.equal(exitCodeFor(clean), 0);
  });

  it('CLI 门禁：有命中 exit 1，无命中 exit 0，用法错 exit 2', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 't508-sep-'));
    const cleanFile = path.join(dir, 'clean.html');
    const dirtyFile = path.join(dir, 'dirty.html');
    writeFileSync(cleanFile, shell('<p>今日摄入 1189 卡</p>'), 'utf8');
    writeFileSync(dirtyFile, shell('<p>目标 1800 卡 · 完成度 66%</p>'), 'utf8');
    const probe = path.resolve('packages/base-render/test/separator-probe.mjs');
    const cleanRun = spawnSync(process.execPath, [probe, cleanFile], { encoding: 'utf8' });
    const dirtyRun = spawnSync(process.execPath, [probe, dirtyFile], { encoding: 'utf8' });
    const usageRun = spawnSync(process.execPath, [probe], { encoding: 'utf8' });
    assert.equal(cleanRun.status, 0);
    assert.equal(dirtyRun.status, 1);
    assert.equal(usageRun.status, 2);
  });
});

describe('t508 豁免自证三条（~ ／ 口径行 ｜ ／ 机器面，各一条构造 → 必须不算命中）', () => {
  it('~（日期区间）不算并列分隔符 → 零命中', () => {
    const r = auditHtml(shell('<p>2026-09-01 ~ 2026-09-07</p>'));
    assert.equal(nodeHits(r), 0);
    assert.equal(exitCodeFor(r), 0);
  });

  it('口径行 ｜：新形状产出文本里不再出现 ｜ → 零命中；裸 ｜ 串仍被抓（豁免靠版式，不靠允许清单）', () => {
    const shaped = renderCaliberLine('数据来源 ｜ 窗口 ｜ 共 5 条');
    assert.ok(!shaped.includes('｜'));
    const shapedAudit = auditHtml(shell(shaped));
    assert.equal(nodeHits(shapedAudit), 0);
    const rawAudit = auditHtml(shell('<p>数据来源 ｜ 窗口 ｜ 共 5 条</p>'));
    assert.ok(rawAudit.node.hits.some((h) => h.tags.includes('R3')));
  });

  it('机器面（复制载荷 data-t ／ 命令原文属性）不进可见文本 → 零命中；同字符进正文则命中', () => {
    const masked = auditHtml(shell('<div data-t="A·B；C" title="X·Y"><p>今日摄入 1189 卡</p></div>'));
    assert.equal(nodeHits(masked), 0);
    const shown = auditHtml(shell('<div data-t="clean"><p>目标 1800 卡 · 完成度 66%</p></div>'));
    assert.ok(shown.node.hits.some((h) => h.tags.includes('R1')));
  });
});

describe('t508 守卫二 · 变异电池（分隔符串 ↔ 形状，两行红绿）', () => {
  const CLEAN = shell('<p>今日摄入 1189 卡</p>');
  const MUTATED = shell('<p>今日摄入 1189 卡 · 缺口 511 卡 · 完成度 66%</p>');

  it('变异红：干净形状改回分隔符串 → 必红（节点级 ≥1 且 exit 1）', () => {
    const r = auditHtml(MUTATED);
    assert.ok(nodeHits(r) >= 1);
    assert.equal(exitCodeFor(r), 1);
  });

  it('还原绿：改回干净形状 → 必绿（零命中且 exit 0，逐字节与改前相同）', () => {
    const before = auditHtml(CLEAN);
    const after = auditHtml(CLEAN);
    assert.equal(nodeHits(after), 0);
    assert.equal(exitCodeFor(after), 0);
    assert.equal(nodeHits(before), nodeHits(after));
  });
});
