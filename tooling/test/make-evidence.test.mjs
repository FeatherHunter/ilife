import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseSummary, fillTemplate, checkFormat } from '../make-evidence.mjs';

/**
 * tooling/make-evidence.mjs 的靶向测试（#327 其三）。
 * 跑法（持锁单写者）：
 *   node tooling/run-locked.mjs --ticket 327 --lock-dir .scratch/locks-land --stale-minutes 30 -- node --test tooling/test/make-evidence.test.mjs
 * 覆盖：好模板＋好日志填数（绿）；缺数点名（红→补数绿）；格式门 6 项逐条点名（红）。
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const read = (n) => fs.readFileSync(path.join(here, n), 'utf8');

describe('make-evidence：填数＋格式门', () => {
  it('好模板＋好日志填数且格式全过（绿）', () => {
    const { text, missing } = fillTemplate(read('make-evidence-good.tpl'), parseSummary(read('make-evidence-good.log')));
    assert.deepEqual(missing, []);
    assert.ok(!text.includes('EVIDENCE') && !text.includes('{{'), '残留摘要行或占位符');
    assert.ok(text.includes('tests=1492') && text.includes('exit 0'), text);
    assert.deepEqual(checkFormat(text, repoRoot), []);
  });

  it('日志缺数点名占位符（红→补数绿）', () => {
    const red = fillTemplate(read('make-evidence-good.tpl'), new Map());
    assert.ok(red.missing.includes('tests'), red.missing.join(','));
    const green = fillTemplate(read('make-evidence-good.tpl'), new Map([['tests', '1'], ['pass', '1'], ['fail', '0'], ['exit', '0']]));
    assert.deepEqual(green.missing, []);
  });

  const bad = (file, re, label) => {
    const errs = checkFormat(read(file), repoRoot);
    assert.ok(errs.some((e) => re.test(e)), `${label} 未点名报错：${errs.join(' | ')}`);
  };

  it('格式门① BOM 点名（红）', () => bad('make-evidence-bad-bom.md', /BOM/, 'BOM'));
  it('格式门② CRLF 点名行号（红）', () => bad('make-evidence-bad-crlf.md', /CRLF.*第 1 行/, 'CRLF'));
  it('格式门③ 控制符点名（红）', () => bad('make-evidence-bad-control.md', /控制符 U\+0001.*第 2 行/, '控制符'));
  it('格式门④ 字面换行点名（红）', () => bad('make-evidence-bad-newline.md', /字面换行.*第 2 行/, '字面换行'));
  it('格式门⑤ 残留占位符点名（红）', () => bad('make-evidence-bad-placeholder.md', /占位符.*\{\{tests\}\}.*第 2 行/, '占位符'));
  it('格式门⑥ 引用不可落地名（红）', () => bad('make-evidence-bad-ref.md', /不可落地.*__nope-missing__/, '引用'));
});
