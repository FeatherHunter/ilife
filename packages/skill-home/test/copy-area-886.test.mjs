import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildHomeEnvelope, buildSearchList, buildReceipt,
  homeCopyArea, homeCopyLog, homeNowStamp,
} from '../dist/index.js';

const CARD = { id: 1, name: '牛奶', location: '客厅/冰箱×2[在家]', quantity: 2, status: '在家', category: '食物与饮品', tags: '早餐' };
const listEnv = () => buildHomeEnvelope('home.item.search', buildSearchList([CARD]));
const cmd = "home-cmd-read home.item.search --params '{}'";
const stamp = '2026-09-22 12:00:00';

describe('#886 复制区共用件（卡路里同款）', () => {
  it('homeNowStamp 与卡路里同形', () => {
    assert.match(homeNowStamp(new Date(2026, 8, 22, 12, 0, 0)), /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });
  it('数据位恒出三格式菜单（无开关）', () => {
    const html = homeCopyArea({ data: { envelope: listEnv() } });
    assert.match(html, /复制数据/);
    assert.match(html, /data-fmt="text"/);
    assert.match(html, /data-fmt="json"/);
    assert.match(html, /data-fmt="csv"/);
  });
  it('数据＋日志双位同出，不留死按钮', () => {
    const html = homeCopyArea({
      data: { envelope: listEnv() },
      log: { envelope: listEnv(), copyLog: homeCopyLog({ command: cmd, actionAt: stamp }) },
    });
    assert.match(html, /复制数据/);
    assert.match(html, /复制日志/);
    assert.doesNotMatch(html, /data-t="请加载居家管家技能，帮我复制本次/);
  });
  it('两样都不给＝空态、无按钮', () => {
    const html = homeCopyArea({});
    assert.match(html, /本页没有可复制的数据/);
    assert.doesNotMatch(html, /<button/);
  });
  it('与按钮同名的标题只留按钮', () => {
    const html = homeCopyArea({ title: '复制数据', data: { envelope: listEnv() } });
    assert.doesNotMatch(html, /<h2/);
  });
  it('日志六段齐备（命令原文照抄能重跑）', () => {
    const fields = homeCopyLog({ command: cmd, source: '物品与位置聚合只读', actionAt: stamp });
    assert.equal(fields.thinking, '本页由本地 CLI 渲染，无 AI 链');
    assert.match(fields.dataStructure, /^home\.db/);
    assert.match(fields.callChain, /home-cmd-read home\.item\.search/);
    assert.match(fields.timestamp, /2026-09-22/);
    assert.equal(fields.exception, '无');
  });
  it('receipt 形同样可投影', () => {
    const env = buildHomeEnvelope('home.item.add', buildReceipt('已录物品：1'));
    const html = homeCopyArea({ data: { envelope: env } });
    assert.match(html, /data-fmt="text"/);
  });
});
