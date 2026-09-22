#!/usr/bin/env node
/** #883 渲染面文字门的静态面测试（无浏览器可跑）。
 *
 * 为什么测静态面：位置四分、单串判据、CSS content 解码、差集比对都是纯函数，
 * 不开浏览器；用法错退出码在浏览器发现之前返回，也不依赖浏览器。
 * 判据恒绿是最坏的失效，所以每个反例都是**正控** —— 判据必须真能红，红必须点名。
 * 浏览器真跑（正例批／三变异／回归）见 `docs/base/base-render/t883-渲染面文字门.md`，不入单元测试。
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyHits, auditStaticFile, classifyPos, decodeCssContent, diffHits, judgeString, staticStrings,
} from '../scripts/check-rendered-text.mjs';

const GATE = join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'check-rendered-text.mjs');
function run(args) {
  const r = spawnSync(process.execPath, [GATE, ...args], { encoding: 'utf8', timeout: 60000 });
  return { exit: r.status, out: String(r.stdout ?? '') + String(r.stderr ?? '') };
}

describe('#883 位置四分', () => {
  it('装饰位优先于正文：status-icon 的 · 是图形', () => {
    assert.equal(classifyPos('status-icon', 'span'), '装饰位');
  });
  it('版式位：small／hint／status-meta 落版式', () => {
    assert.equal(classifyPos('small', 'p'), '版式位');
    assert.equal(classifyPos('hint', 'p'), '版式位');
    assert.equal(classifyPos('status-meta', 'div'), '版式位');
  });
  it('数据位与载荷位：kv／rows／copy-btn 豁免', () => {
    assert.equal(classifyPos('kv', 'div'), '数据位');
    assert.equal(classifyPos('rows', 'div'), '数据位');
    assert.equal(classifyPos('copy-btn', 'button'), '载荷位');
  });
  it('标题写法位：hero／h1 只照打', () => {
    assert.equal(classifyPos('hero', 'div'), '标题写法位');
    assert.equal(classifyPos('', 'h1'), '标题写法位');
  });
  it('无名正文：裸 span 落正文位', () => {
    assert.equal(classifyPos('', 'span'), '正文位');
  });
});

describe('#883 单串判据（与静态面相同的两条）', () => {
  it('⑤：·／|／｜ 命中，纯中文不行', () => {
    assert.equal(judgeString('左 · 右').sep, 1);
    assert.equal(judgeString('a|b').sep, 1);
    assert.equal(judgeString('a｜b').sep, 1);
    assert.equal(judgeString('纯中文，无符号').sep, 0);
  });
  it('⑥英文：裸词命中，日期／时间／记录号／AI 放过', () => {
    assert.equal(judgeString('hello 世界').ascii, true);
    assert.equal(judgeString('2026-09-21 生成').ascii, false);
    assert.equal(judgeString('12:30 同步').ascii, false);
    assert.equal(judgeString('#12 备忘').ascii, false);
    assert.equal(judgeString('粘贴给 AI').ascii, false);
  });
  it('⑥半角：半角括号命中，全角括号与小数不命中', () => {
    assert.equal(judgeString('显示全部 (50 条)').half, true);
    assert.equal(judgeString('显示全部（50 条）').half, false);
    assert.equal(judgeString('比率 3.14 倍').half, false);
  });
});

describe('#883 CSS content 解码', () => {
  it('引号脱壳与转义', () => {
    assert.equal(decodeCssContent('"·"'), '·');
    assert.equal(decodeCssContent("'·'"), '·');
    assert.equal(decodeCssContent('"\\B7 "'), '·');
  });
  it('none／normal／空 → 空', () => {
    assert.equal(decodeCssContent('none'), '');
    assert.equal(decodeCssContent('normal'), '');
    assert.equal(decodeCssContent(''), '');
  });
});

describe('#883 取串与命中装配', () => {
  const HTML = '<!doctype html><html><head><style>.a{color:red}</style></head><body>'
    + '<!-- 注释 · 不进串 -->'
    + '<p class="small">左 · 右</p>'
    + '<p class="kv">a · b</p>'
    + '<span class="status-icon">·</span>'
    + '<h1>题 · 目</h1>'
    + '<script>var s = "左 · 右";</script>'
    + '</body></html>';
  it('样式／脚本／注释剥离，归属取到类名', () => {
    const strings = staticStrings(HTML);
    assert.deepEqual(strings.map((s) => s.text), ['左 · 右', 'a · b', '·', '题 · 目']);
    assert.equal(strings[0].cls, 'small');
  });
  it('版式位红、数据位跳过、装饰位放过、标题位照打', () => {
    const { red, title, deco } = applyHits(staticStrings(HTML));
    assert.equal(red.length, 1);
    assert.equal(red[0].kind, '⑤');
    assert.match(red[0].where, /版式位/);
    assert.equal(title.length, 1);
    assert.equal(deco.length, 1);
  });
});

describe('#883 差集（只对差项判红）', () => {  const mk = (text) => ({ where: '正文位', line: '#1', text, sep: 1, ascii: false, half: false, kind: '⑤' });
  it('两面同文同列 → 无差；渲染独有 → 差 1；静态独有 → 只计数', () => {
    const { diff, staticOnlyCount } = diffHits([mk('同 · 文')], [{ ...mk('同 · 文') }, { ...mk('新 · 债') }]);
    assert.equal(diff.length, 1);
    assert.equal(diff[0].text, '新 · 债');
    assert.equal(staticOnlyCount, 0);
  });
  it('静态独有不判红，只计数', () => {
    const { diff, staticOnlyCount } = diffHits([mk('旧 · 债')], []);
    assert.equal(diff.length, 0);
    assert.equal(staticOnlyCount, 1);
  });
  it('同文不同列不互相吞（键含列）', () => {
    const a = { where: '正文位', line: '#1', text: 'X (1)', sep: 0, ascii: false, half: true, kind: '⑥半角' };
    const b = { where: '正文位', line: '#1', text: 'X (1)', sep: 0, ascii: true, half: false, kind: '⑥英文' };
    assert.equal(diffHits([a], [b]).diff.length, 1);
    assert.equal(diffHits([a], [{ ...a }]).diff.length, 0);
  });
});

describe('#883 静态读盘入口（main 与测试共用，防 import 漏件）', () => {
  it('落盘文件 → 读出红／照打／放过', () => {
    const dir = mkdtempSync(join(tmpdir(), 't883-'));
    const fp = join(dir, '页.html');
    writeFileSync(fp, '<!doctype html><html><body><p class="small">左 · 右</p><h1>题 · 目</h1></body></html>', 'utf8');
    const { red, title, deco } = auditStaticFile(fp);
    assert.equal(red.length, 1);
    assert.equal(title.length, 1);
    assert.equal(deco.length, 0);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('#883 用法错（无浏览器也可跑）', () => {
  it('零输入 → exit 2', () => {
    const r = run([]);
    assert.equal(r.exit, 2, r.out);
    assert.match(r.out, /RESULT: ABORT/, r.out);
  });
  it('目录不存在 → exit 2', () => {
    const r = run(['--dir', '不存在的目录-883']);
    assert.equal(r.exit, 2, r.out);
  });
});
