import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  SKILLS, SHAPES, BASE_PAINT_MARKERS, MARKER_ALLOW,
  normalize, sha256, byteLen, collectArtifacts, buildSnapshot, compare, firstDiff, baseFingerprint,
} from '../skill-html-snapshot.mjs';

/**
 * #96 · 门禁工具自证（**不在** canonical `pnpm test` 的 glob 内，按协议 §2.4.6 单独触发）：
 *   pnpm gate:selftest:html   （内部经持锁包装器）
 * 覆盖两类盲区：① 工具自身的判据（归一化／比较／自洽／标记）；② 「脚本自我满足」——
 * 门覆盖的产物集合是否真的等于它声称覆盖的集合。
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('#96 per-skill HTML 回归门工具自证', () => {
  it('归一化：去 BOM ＋ CRLF→LF（跨 OS 同值）', () => {
    assert.equal(normalize('\uFEFFa\r\nb\rc'), 'a\nb\rc');
    assert.equal(sha256('a\r\nb'), sha256('a\nb'));
    assert.equal(sha256('\uFEFFx'), sha256('x'));
    assert.equal(sha256('a'), sha256('a'));
    assert.match(sha256('a'), /^[0-9a-f]{32}$/);
    assert.equal(byteLen('中文'), 6);
  });

  it('比较：变化／新增／消失 三类都能检出', () => {
    const base = new Map([['a', { text: 'A', src: 's' }], ['b', { text: 'B', src: 's' }]]);
    const snap = buildSnapshot(base);
    assert.equal(compare(snap, base).changed.length, 0, '同输入必须零差异');

    const mutated = new Map([['a', { text: 'A!', src: 's' }], ['b', { text: 'B', src: 's' }]]);
    const c1 = compare(snap, mutated);
    assert.deepEqual(c1.changed, ['a']);
    assert.equal(c1.added.length + c1.removed.length, 0);

    const plus = new Map([...base, ['c', { text: 'C', src: 's' }]]);
    assert.deepEqual(compare(snap, plus).added, ['c']);
    const minus = new Map([['a', { text: 'A', src: 's' }]]);
    assert.deepEqual(compare(snap, minus).removed, ['b']);
  });

  it('比较：手改快照（text 与 sha256 不符）必须红', () => {
    const base = new Map([['a', { text: 'A', src: 's' }]]);
    const snap = buildSnapshot(base);
    snap.artifacts.a.text = 'HAND-EDITED';
    assert.deepEqual(compare(snap, base).staleText, ['a']);
  });

  it('影响面断言：产物含 base-paint 命名空间标记即红，且白名单为空', () => {
    assert.deepEqual(MARKER_ALLOW, {}, '白名单必须为空（迁移须显式改工具并走审查）');
    assert.deepEqual(BASE_PAINT_MARKERS, ['ilife-base', 'data-ilife', 'ilife-']);
    const injected = new Map([['a', { text: '<div class="ilife-toast">x</div>', src: 's' }]]);
    const snap = buildSnapshot(injected);
    const c = compare(snap, injected);
    assert.equal(c.markers.length, 1);
    assert.equal(c.markers[0].marker, 'ilife-');
  });

  it('定位：firstDiff 指出首个不同行', () => {
    const lines = firstDiff('a\nb\nc', 'a\nX\nc');
    assert.ok(lines.some((l) => l.includes('L2 快照: b')), lines.join('\n'));
    assert.ok(lines.some((l) => l.includes('L2 实际: X')), lines.join('\n'));
    assert.ok(firstDiff('a', 'a\nb').some((l) => l.includes('行数')));
  });

  it('真实产物：覆盖集合 == 声称的集合（防脚本自我满足）', async () => {
    const arts = await collectArtifacts();
    const ids = [...arts.keys()];
    assert.deepEqual(ids, [...ids].sort(), '产物 id 必须有序');
    assert.equal(new Set(ids).size, ids.length, '产物 id 必须唯一');

    const EXPECT_KEYS = { bill: 16, chef: 8, home: 21, schedule: 8, memo: 10 };
    const EXPECT_TPL = { bill: 16, chef: 8, home: 21, schedule: 8, memo: 6 };
    for (const s of SKILLS) {
      const mine = ids.filter((id) => id.startsWith(s.id + '/'));
      // 结构件：keys／templates／escape／shape-throw ＋ 6 形状
      const structural = mine.filter((id) => /^\w+\/(keys|templates|escape|shape-throw|shape\/)/.test(id));
      assert.equal(structural.length, 4 + SHAPES.length + 1, `${s.id} 结构件数量（含空列表探针）`);
      assert.equal(mine.filter((id) => id.startsWith(`${s.id}/frag/`)).length, EXPECT_KEYS[s.id], `${s.id} key 片段数`);
      assert.equal(mine.filter((id) => id.startsWith(`${s.id}/tpl/`)).length, EXPECT_TPL[s.id], `${s.id} 模板页数`);
      for (const sh of SHAPES) assert.ok(arts.has(`${s.id}/shape/${sh}`), `${s.id} 缺形状探针 ${sh}`);
      assert.ok(arts.get(`${s.id}/shape/list-empty`).text.includes('hm-empty'), `${s.id} 空列表探针须打到空态分支`);
      assert.match(arts.get(`${s.id}/shape-throw`).text, /^[A-Za-z]+RenderError\/[A-Z_]+_SHAPE_MISMATCH$/,
        `${s.id} 未知形状必须抛本技能 RenderError/CODE`);
      assert.ok(arts.get(`${s.id}/escape`).text.includes('&amp;&lt;&gt;&quot;&#39;'), `${s.id} 转义探针须真转义`);
    }
    // 精确总数：结构件 ＋ frag ＋ tpl ＋ shared-css/helpers（bill/chef/home/schedule 各 2，memo 0）
    const want = SKILLS.length * (4 + SHAPES.length + 1)
      + Object.values(EXPECT_KEYS).reduce((a, b) => a + b, 0)
      + Object.values(EXPECT_TPL).reduce((a, b) => a + b, 0)
      + 4 * 2;
    assert.equal(ids.length, want, `产物总数应为 ${want}`);
  });

  it('真实产物：写读闭环零差异 ＋ 无 base-paint 标记', async () => {
    const arts = await collectArtifacts();
    const snap = buildSnapshot(arts);
    const c = compare(snap, arts);
    assert.deepEqual({ changed: c.changed, added: c.added, removed: c.removed, stale: c.staleText, markers: c.markers },
      { changed: [], added: [], removed: [], stale: [], markers: [] }, '自建快照必须与实际零差异');
    assert.equal(snap.artifactCount, arts.size);
    for (const [id, a] of arts) {
      for (const mk of BASE_PAINT_MARKERS) assert.ok(!a.text.includes(mk), `${id} 含 ${mk}`);
    }
  });

  it('base-* 指纹可复算（证据用）', () => {
    const fp = baseFingerprint();
    assert.match(fp.sha256, /^[0-9a-f]{32}$/);
    assert.ok(fp.files > 10, 'base-* 源码文件数异常：' + fp.files);
    assert.equal(fp.sha256, baseFingerprint().sha256, '同树两次指纹必须相同');
  });

  it('快照文件本身与树一致（收尾前不得留下过期快照）', async () => {
    const snap = JSON.parse(readFileSync(join(root, 'tooling/skill-html.snapshot.json'), 'utf8'));
    const arts = await collectArtifacts();
    const c = compare(snap, arts);
    assert.deepEqual([c.changed, c.added, c.removed, c.staleText, c.markers], [[], [], [], [], []],
      'tooling/skill-html.snapshot.json 过期 → 跑 pnpm snapshot:html');
  });
});
