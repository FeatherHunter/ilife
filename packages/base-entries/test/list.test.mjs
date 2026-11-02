// 列表连接符的读数（票 #1311）：node --test。
//
// 读的是编译产物 `../dist/index.js`（与兄弟包同形：先 `tsc -b`，再跑测试）。
// 断言只锁**连接符与语言分支**这一件事：zh 逐字节等于 `items.join('、')`（旧写法），
// en 走英文惯用（含牛津逗号）；英文期望值直接写死字面，不调被测函数自己算（否则门是空转）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { listJoin, plusJoin, plusSign } from '../dist/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ENTRY = join(HERE, '..', 'dist', 'index.js');

describe('listJoin：zh 逐字节等于旧写法 items.join(\'、\')', () => {
  it('两项／三项／空／单元素', () => {
    assert.strictEqual(listJoin('zh', ['A', 'B']), 'A、B');
    assert.strictEqual(listJoin('zh', ['A', 'B', 'C']), 'A、B、C');
    assert.strictEqual(listJoin('zh', []), '');
    assert.strictEqual(listJoin('zh', ['A']), 'A');
    // 与旧写法逐字节相同（这就是「不启用多语言时产物不变」的判据）
    for (const items of [[], ['A'], ['A', 'B'], ['A', 'B', 'C'], ['', ''], ['金额', '分类']]) {
      assert.strictEqual(listJoin('zh', items), items.join('、'));
    }
  });

  it('未设语言／未知语言（zz）→ 落在 zh 那一支，不出英文连接词', () => {
    assert.strictEqual(listJoin('', ['A', 'B', 'C']), 'A、B、C');
    assert.strictEqual(listJoin('zz', ['A', 'B', 'C']), 'A、B、C');
    assert.strictEqual(listJoin('ja', ['A', 'B']), 'A、B');
  });
});

describe('listJoin：en 走英文惯用（,  与 and）', () => {
  it('两项 → A and B；三项 → A, B, and C（牛津逗号）', () => {
    assert.strictEqual(listJoin('en', ['A', 'B']), 'A and B');
    assert.strictEqual(listJoin('en', ['A', 'B', 'C']), 'A, B, and C');
    assert.strictEqual(listJoin('en', ['A', 'B', 'C', 'D']), 'A, B, C, and D');
  });

  it('空 → 空串；单元素 → 原样', () => {
    assert.strictEqual(listJoin('en', []), '');
    assert.strictEqual(listJoin('en', ['A']), 'A');
  });

  it('语言标识大小写不敏感，且按主标签判（en-US／EN-gb 都算 en）', () => {
    assert.strictEqual(listJoin('EN', ['A', 'B']), 'A and B');
    assert.strictEqual(listJoin('en-US', ['A', 'B']), 'A and B');
    assert.strictEqual(listJoin(' EN-gb ', ['A', 'B', 'C']), 'A, B, and C');
    // 反过来：zh-CN 仍是 zh（主标签不是 en）
    assert.strictEqual(listJoin('zh-CN', ['A', 'B']), 'A、B');
  });

  it('结果里绝不出现顿号（本票的判据）', () => {
    for (const items of [['A', 'B'], ['A', 'B', 'C'], ['A', 'B', 'C', 'D', 'E']]) {
      assert.ok(!listJoin('en', items).includes('、'));
    }
  });
});

describe('listJoin：运行时没有 Intl.ListFormat 时的退化分支', () => {
  it('退化成 items.join(\', \')，仍不出顿号', () => {
    const script = 'delete Intl.ListFormat;'
      + ' const { listJoin } = await import(' + JSON.stringify(pathToFileURL(ENTRY).href) + ');'
      + ' process.stdout.write(JSON.stringify(['
      + ' listJoin("en", ["A", "B", "C"]),'
      + ' listJoin("en", ["A", "B"]),'
      + ' listJoin("en", []),'
      + ' listJoin("zh", ["A", "B"])'
      + ' ]));';
    const out = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' });
    assert.strictEqual(out.status, 0, out.stderr);
    assert.deepStrictEqual(JSON.parse(out.stdout), ['A, B, C', 'A, B', '', 'A、B']);
  });
});

describe('plusJoin：zh「＋」逐字节，en「 + 」半角', () => {
  it('zh 等于旧写法 items.join(\'＋\')', () => {
    assert.strictEqual(plusJoin('zh', ['1', '2', '3']), '1＋2＋3');
    assert.strictEqual(plusJoin('zh', ['1', '2', '3']), ['1', '2', '3'].join('＋'));
    assert.strictEqual(plusJoin('', ['1', '2']), '1＋2');
    assert.strictEqual(plusJoin('zz', []), '');
  });

  it('en 用半角加号（结果里不出全角 ＋）', () => {
    assert.strictEqual(plusJoin('en', ['1', '2', '3']), '1 + 2 + 3');
    assert.strictEqual(plusJoin('en-US', ['1', '2']), '1 + 2');
    assert.ok(!plusJoin('en', ['1', '2']).includes('＋'));
  });
});

describe('plusSign：加号符号本身（页面按钮上的那一个）', () => {
  it('zh／未设语言／未知语言 → 全角 ＋（现状逐字节）', () => {
    assert.strictEqual(plusSign('zh'), '＋');
    assert.strictEqual(plusSign(''), '＋');
    assert.strictEqual(plusSign('zz'), '＋');
  });

  it('en → 半角 +（含 en-US／EN-gb 这类带地区的标识）', () => {
    assert.strictEqual(plusSign('en'), '+');
    assert.strictEqual(plusSign('EN-gb'), '+');
    assert.ok(!plusSign('en').includes('＋'));
  });
});
