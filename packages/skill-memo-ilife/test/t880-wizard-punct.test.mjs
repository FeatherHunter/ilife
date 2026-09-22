// #880 · 预检确认页两页 5 处半角标点的回归锁
//
// 为什么单列一件（不并进 wish-pages-829）：那件守的是分隔符门与共用件归属，
// 而这 5 处住在运行时字符串与 `placeholder` 属性里——静态判据（t869 ⑥列／分隔符探针）
// 整段剥掉 `<script>`，天然读不到。判据全绿时屏上仍有半角，只有逐字断言才看得见。
//
// 病（#880 根因 R2）：模板硬编码半角括号／逗号／冒号／斜杠；同一页两套括号
//（`默认打卡内容（可选）` 全角 vs `打卡内容(覆盖)` 半角并存）。
//
// 反向证据（改坏必红）：任意一处换回半角，本件即红并点出那一串。
// 本件只锁 #880 决策节的 5 处；错误态文案／重名警告／buildPrompt 指令载荷归 #885，
// 口径未定前故意不锁（锁了等于替 #885 定口径）。

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadTemplate } from '../dist/render/index.js';

const cc = loadTemplate('change_category');
const wc = loadTemplate('wish_complete');

describe('#880 预检确认页半角标点清零', () => {
  it('31 页头行：半角括号换成全角', () => {
    assert.ok(!cc.includes('」(生成时间 '), '旧半角括号仍在：」(生成时间 ');
    assert.ok(cc.includes('」（生成时间 '), '新全角括号不在：」（生成时间 ');
  });

  it('32 统计卡说明：半角逗号换成全角', () => {
    assert.ok(!wc.includes('没有飞书任务,'), '旧半角逗号仍在');
    assert.ok(wc.includes('没有飞书任务，只在本机完成'), '新全角逗号不在');
  });

  it('32 卡标签：半角括号换成全角（同一页不再两套括号）', () => {
    assert.ok(!wc.includes('打卡内容(覆盖)'), '旧半角括号仍在');
    assert.ok(wc.includes('打卡内容（覆盖）'), '新全角括号不在');
  });

  it('32 占位两处：半角冒号与半角斜杠换成全角', () => {
    assert.ok(!wc.includes('默认使用:'), '旧半角冒号仍在：默认使用:');
    assert.ok(wc.includes('默认使用：'), '新全角冒号不在：默认使用：');
    assert.ok(!wc.includes('如:今天完成了 / 2026'), '旧半角冒号＋斜杠仍在');
    assert.ok(wc.includes('如：今天完成了 ／ 2026'), '新全角冒号＋斜杠不在');
  });
});
