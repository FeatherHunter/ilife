/** #1197 US7／#1235 文件名裁决 · 共用落点按渲染语言加后缀（`stem` 路）。
 *
 *  锁四件事：
 *   ① 基准语言（zh／未进入语言上下文）**不加后缀**——存量中文产物名与今日逐字一致；
 *   ② 非基准语言按 BCP 47 主标签小写加 `_<lang>`（英文 `_en`，`en-US` 也归并成 `_en`）；
 *   ③ `file`（用户逐字指定的落点）**不加工**，英文上下文里仍是给什么落什么；
 *   ④ `reuse` 按本件自己产出的名字扫目录 ⇒ 中英文各自分窗，互不把对方那份当复用命中。
 *
 *  运行：先 `node node_modules/typescript/bin/tsc --build packages/base-render/tsconfig.json`，
 *  再 `node --test packages/base-render/test/output-save-html-language-1197.test.mjs`。
 */
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { describe, it } from 'node:test';

import { runWithLanguage } from 'base-entries';
import { saveHtmlFile } from '../dist/output/saveHtml.js';

const STEM = '卡路里_HELP';
const NAME_RE = /^(.+)_(\d{8}_\d{6})(?:_(\d+))?\.html$/;

const mkTmp = (tag) => mkdtempSync(join(tmpdir(), 't1197-lang-' + tag + '-'));

describe('#1197 落点文件名 · 语言后缀', () => {
  it('① 未进入语言上下文（＝基准语言 zh）：主体不加后缀', () => {
    const dir = mkTmp('zh');
    const out = saveHtmlFile({ dir, stem: STEM, html: '<p>中文</p>' });
    assert.match(basename(out.path), /^卡路里_HELP_\d{8}_\d{6}\.html$/);
    assert.equal(basename(out.path).includes('_en_'), false);
  });

  it('② 英文：主体后加 _en，时间戳仍在最后一段', () => {
    const dir = mkTmp('en');
    const out = runWithLanguage('en', () => saveHtmlFile({ dir, stem: STEM, html: '<p>english</p>' }));
    const m = NAME_RE.exec(basename(out.path));
    assert.ok(m, '名字须为通式：' + basename(out.path));
    assert.equal(m[1], STEM + '_en', '英文主体＝<stem>_en');
  });

  it('② 地区标签按主标签归并：en-US 也得 _en（不是 _en-us）', () => {
    const dir = mkTmp('en-us');
    const out = runWithLanguage('en-US', () => saveHtmlFile({ dir, stem: STEM, html: '<p>x</p>' }));
    assert.equal(NAME_RE.exec(basename(out.path))[1], STEM + '_en');
  });

  it('③ file（逐字落点）不加工：英文上下文仍落给定文件名', () => {
    const dir = mkTmp('file');
    const out = runWithLanguage('en', () => saveHtmlFile({ dir, file: '用户指定.html', html: '<p>x</p>', onExists: 'overwrite' }));
    assert.equal(basename(out.path), '用户指定.html');
    assert.deepEqual(readdirSync(dir), ['用户指定.html']);
  });

  it('④ reuse 按语言分窗：英文命中英文那份，中文命中中文那份', () => {
    const dir = mkTmp('reuse');
    const en = runWithLanguage('en', () => saveHtmlFile({ dir, stem: STEM, html: '<p>en-1</p>' }));
    const enAgain = runWithLanguage('en', () => saveHtmlFile({ dir, stem: STEM, html: '<p>en-2</p>', onExists: { reuse: 'byDay' } }));
    const zh = saveHtmlFile({ dir, stem: STEM, html: '<p>zh-1</p>' });
    const zhAgain = saveHtmlFile({ dir, stem: STEM, html: '<p>zh-2</p>', onExists: { reuse: 'byDay' } });
    assert.equal(enAgain.path, en.path, '英文窗口内复用英文那份');
    assert.equal(zhAgain.path, zh.path, '中文窗口内复用中文那份');
    assert.notEqual(en.path, zh.path, '中英文产物必须是两份');
    assert.equal(readdirSync(dir).length, 2, '目录里恰好两份（中英各一）');
  });
});
