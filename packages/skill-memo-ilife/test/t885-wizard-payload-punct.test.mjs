// #885 · 两预检确认页条件分支与指令载荷的回归锁
//
// 为什么单列一件（不并进 t880）：t880 锁的是主屏 5 处；这 6 处住在运行时字符串里
//（`init` 错误分支的 `retryPrompt`、`warnIfAny` 拼装、`buildPrompt` 模板字符串），
// 静态判据（t869 六列／分隔符探针）整段剥掉 `<script>`，天然读不到。判据全绿时屏上
// 仍可有半角，只有逐字断言才看得见。t880 明确把这几处留给 #885，口径未定前故意不锁。
//
// 口径（#885 决策节，维护者已拍板）：混合口径——
// 句子标点全角化（`:`→`：`，`,`→`，`，`;`→`；`，`()`→`（）`，含 `②` 行），
// 结构符保留（`·`、`→`、`#数字`、`""`、`①②③④`不动）；
// 预览区加一句说明小字“预览即复制原文，符号为 AI 解析保留。”。
//
// 反向证据（改坏必红）：任意一处换回半角，或误删结构符／说明小字，本件即红并点出那一串。

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadTemplate } from '../dist/render/index.js';

const cc = loadTemplate('change_category');
const wc = loadTemplate('wish_complete');
const HINT = '预览即复制原文，符号为 AI 解析保留。';

describe('#885 条件分支与指令载荷半角清零（混合口径）', () => {
  it('错误分支重试指引两页全角', () => {
    assert.ok(!cc.includes('批量改分类(唤醒词:'), '旧半角仍在：批量改分类(唤醒词:');
    assert.ok(cc.includes('批量改分类（唤醒词：备忘改分类）'), '新全角不在');
    assert.ok(!wc.includes('心愿完成(唤醒词:'), '旧半角仍在：心愿完成(唤醒词:');
    assert.ok(wc.includes('心愿完成（唤醒词：心愿完成）'), '新全角不在');
  });

  it('重名警告两页全角', () => {
    assert.ok(!cc.includes('条目标分类('), '旧半角括号仍在：条目标分类(');
    assert.ok(cc.includes('条目标分类（'), '新全角括号不在');
    assert.ok(!wc.includes('未同步飞书,'), '旧半角逗号仍在');
    assert.ok(wc.includes('未同步飞书，完成时'), '新全角逗号不在');
  });

  it('buildPrompt ①②③④行句子标点全角', () => {
    for (const [name, tpl] of [['change_category', cc], ['wish_complete', wc]]) {
      assert.ok(!tpl.includes('① 场景: '), `${name} 旧半角冒号仍在：① 场景: `);
      assert.ok(tpl.includes('① 场景： '), `${name} 新全角冒号不在：① 场景： `);
      assert.ok(!tpl.includes('② 数据('), `${name} 旧半角括号仍在：② 数据(`);
      assert.ok(tpl.includes('② 数据（'), `${name} 新全角括号不在：② 数据（`);
      assert.ok(!tpl.includes('③ 期望: '), `${name} 旧半角冒号仍在：③ 期望: `);
      assert.ok(tpl.includes('③ 期望： '), `${name} 新全角冒号不在：③ 期望： `);
      assert.ok(!tpl.includes('④ 来源: '), `${name} 旧半角冒号仍在：④ 来源: `);
      assert.ok(tpl.includes('④ 来源： '), `${name} 新全角冒号不在：④ 来源： `);
    }
    assert.ok(!cc.includes('」,子分类'), '旧半角逗号仍在：」,子分类');
    assert.ok(cc.includes('」，子分类'), '新全角逗号不在');
    assert.ok(!cc.includes('不变;改完'), '旧半角分号仍在');
    assert.ok(cc.includes('不变；改完'), '新全角分号不在');
    assert.ok(!wc.includes('完成(每个心愿'), '旧半角括号仍在：完成(每个心愿');
    assert.ok(wc.includes('完成（每个心愿'), '新全角括号不在');
    assert.ok(!wc.includes(';完成后'), '旧半角分号仍在');
    assert.ok(wc.includes('；完成后'), '新全角分号不在');
  });

  it('结构符保留（不被全角化误伤）', () => {
    assert.ok(cc.includes('· 笔记 #'), '批量页条目符＋记录号不在：· 笔记 #');
    assert.ok(cc.includes('批量改分类向导 · '), '批量页来源行间隔号不在');
    assert.ok(wc.includes('· 心愿 #'), '心愿页条目符＋记录号不在：· 心愿 #');
    assert.ok(wc.includes('→ 打卡内容'), '心愿页箭头算子不在：→ 打卡内容');
    assert.ok(wc.includes('打卡内容： "'), '心愿页内容边界引号不在：打卡内容： "');
  });

  it('说明小字两页都在', () => {
    assert.ok(cc.includes(HINT), '批量页说明小字不在');
    assert.ok(wc.includes(HINT), '心愿页说明小字不在');
  });
});
