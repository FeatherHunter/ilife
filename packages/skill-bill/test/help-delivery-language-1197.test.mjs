// #1197 / US7 · 英文产物命名：<主体>_en_<TS>.html（中文列无后缀，逐字节不变）。
//
// 口径来自 docs/agents/多语言-文件名裁决.md（#1235）：HELP 与业务页主体冻结不译，英文只在主体后加
// `_en`；语言后缀由共用件 base-paint/save-html 统一执行（见 base-render/src/output/artifactLanguage.ts），
// 本文件从技能自己的交付入口 deliverHtml 走一遍，证明「落盘名字」而非只证共用件内部函数。
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';

import { runWithLanguage } from 'base-entries';
import { HELP_HTML_DIR_NAME, LOOKUP_FILE_STEM, HELP_FILE_STEM } from '../dist/render/index.js';
import { deliverHtml } from '../dist/output.js';

let TMP = '';
before(() => { TMP = mkdtempSync(join(tmpdir(), 'bill-1197-lang-')); });

const NAME_RE = /^(.+)_(\d{8}_\d{6})(?:_(\d+))?\.html$/;

describe('#1197 英文产物命名（_en 后缀）', () => {
  it('中文（缺省语言）无后缀：HELP 与速查表主体逐字不变', () => {
    const dir = join(TMP, 'zh', HELP_HTML_DIR_NAME);
    const h = deliverHtml({ target: { dir, stem: HELP_FILE_STEM }, html: 'H' });
    const l = deliverHtml({ target: { dir, stem: LOOKUP_FILE_STEM }, html: 'L' });
    const mh = NAME_RE.exec(basename(h.path));
    const ml = NAME_RE.exec(basename(l.path));
    assert.ok(mh, '中文 HELP 名须为通式：' + basename(h.path));
    assert.ok(ml, '中文速查表名须为通式：' + basename(l.path));
    assert.equal(mh[1], HELP_FILE_STEM);
    assert.equal(ml[1], LOOKUP_FILE_STEM);
  });

  it('英文：主体后加 _en（HELP 与业务页同一口径）', () => {
    const dir = join(TMP, 'en', HELP_HTML_DIR_NAME);
    const h = runWithLanguage('en', () => deliverHtml({ target: { dir, stem: HELP_FILE_STEM }, html: 'H' }));
    const l = runWithLanguage('en', () => deliverHtml({ target: { dir, stem: LOOKUP_FILE_STEM }, html: 'L' }));
    assert.equal(NAME_RE.exec(basename(h.path))?.[1], HELP_FILE_STEM + '_en');
    assert.equal(NAME_RE.exec(basename(l.path))?.[1], LOOKUP_FILE_STEM + '_en');
  });

  it('BCP 47 区域变体归并到主标签（en-US 也得 _en，不产生 _en-US）', () => {
    const dir = join(TMP, 'en-us', HELP_HTML_DIR_NAME);
    const h = runWithLanguage('en-US', () => deliverHtml({ target: { dir, stem: HELP_FILE_STEM }, html: 'H' }));
    assert.equal(NAME_RE.exec(basename(h.path))?.[1], HELP_FILE_STEM + '_en');
  });

  it('显式 --html 路径逐字照用，不加语言后缀', () => {
    const file = join(TMP, 'explicit', '用户指定.html');
    const written = runWithLanguage('en', () => deliverHtml({ explicit: file, html: 'X' }));
    assert.equal(basename(written.path), '用户指定.html');
  });
});
