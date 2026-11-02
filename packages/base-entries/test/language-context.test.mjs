// 渲染语言上下文（#1197 迁移期接线件）：默认基准语言、进入／退出、嵌套、异步延续。
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { BASE_LANGUAGE, currentRenderLanguage, runWithLanguage } from '../dist/index.js';

describe('currentRenderLanguage：未进入上下文＝基准语言（未启用多语言时逐字节不变）', () => {
  test('顶层调用返回 zh', () => {
    assert.equal(currentRenderLanguage(), BASE_LANGUAGE);
    assert.equal(currentRenderLanguage(), 'zh');
  });

  test('run 返回原值与异常透出', () => {
    assert.equal(runWithLanguage('en', () => 42), 42);
    assert.throws(() => runWithLanguage('en', () => { throw new Error('boom'); }), /boom/);
  });

  test('进入／退出：run 内是给定值，run 后回到 zh', () => {
    runWithLanguage('en', () => {
      assert.equal(currentRenderLanguage(), 'en');
      runWithLanguage('ja', () => {
        assert.equal(currentRenderLanguage(), 'ja');
      });
      assert.equal(currentRenderLanguage(), 'en');
    });
    assert.equal(currentRenderLanguage(), 'zh');
  });

  test('异步延续：await 之后仍在同一语言上下文', async () => {
    await runWithLanguage('en', async () => {
      assert.equal(currentRenderLanguage(), 'en');
      await new Promise((resolve) => setTimeout(resolve, 5));
      assert.equal(currentRenderLanguage(), 'en');
    });
    assert.equal(currentRenderLanguage(), 'zh');
  });
});
