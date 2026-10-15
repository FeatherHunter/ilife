// 票 1282 · 缺席面板 v4 样式（步骤序号＋复制按钮/Toast＋交互态）。
//
// 先构建再跑：node node_modules/typescript/bin/tsc -b packages/plugin-manager
// DOM 渲染在宿主里，node 侧只断言构建产物的静态形状（与像素测试同口径：断言产物，不启动宿主）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const dialog = readFileSync(join(DIST, 'update-dialog.js'), 'utf8');
const client = readFileSync(join(DIST, 'client.js'), 'utf8');

describe('1282 缺席面板 v4（构建产物形状）', () => {
  it('安装控件不传 themeTokens（0.18.0 包内实测：只校验不生效，传了等于没传）', () => {
    assert.ok(!dialog.includes('themeTokens:'), 'update-dialog 传了死选项（注释提及不算，属性传参才算）');
  });
  it('三步序号与标题齐（容器与顺序不动，只加序号）', () => {
    for (const step of ['data-step', '一键安装', '备选：手动安装']) {
      assert.ok(client.includes(step), '缺席面板缺 ' + step);
    }
    assert.ok(client.includes('未安装'), '缺席状态标题缺失');
  });
  it('复制按钮文案恒为「复制」，Toast 是唯一带 ✓ 的「已复制」', () => {
    assert.ok(client.includes('ilife-copycmd'), '复制按钮类缺失');
    const hits = client.split('✓ 已复制').length - 1;
    assert.equal(hits, 1, '「✓ 已复制」出现 ' + hits + ' 次（只许 Toast 一处，按钮不许改字）');
  });
  it('上游主按钮覆盖 mounting（hover 换色＋按下＋禁用＋聚焦，容器级选择器）', () => {
    assert.ok(client.includes('button[data-primary'), '主按钮覆盖选择器缺失');
    assert.ok(client.includes('#cf6f1f'), '悬停深橙缺失（用户 verdict：8% 提亮看不见）');
  });
});
