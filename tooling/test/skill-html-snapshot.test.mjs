import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  SKILLS, SHAPES, BASE_PAINT_MARKERS, MARKER_ALLOW,
  normalize, sha256, byteLen, collectArtifacts, collectArtifactsLang, buildEnColumn, loadLangColumn,
  englishGaps, buildSnapshot, compare, firstDiff, baseFingerprint, snapPathOf, writeSnapshotChecked, writeEnColumn,
} from '../skill-html-snapshot.mjs';

/**
 * #96 · 门禁工具自证（**不在** canonical `pnpm test` 的 glob 内，按协议 §2.4.6 单独触发）：
 *   pnpm gate:selftest:html   （内部经持锁包装器）
 * 覆盖两类盲区：① 工具自身的判据（归一化／比较／自洽／标记）；② 「脚本自我满足」——
 * 门覆盖的产物集合是否真的等于它声称覆盖的集合；③ 英文列（#1324）：英文上下文采集、
 *  records 只记偏离件、漏记／错记／同哈希记录必红。
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

  it('影响面断言：产物含 base-paint 命名空间标记即红，白名单只登记已审查迁移', async () => {
    assert.deepEqual(BASE_PAINT_MARKERS, ['ilife-base', 'data-ilife', 'ilife-']);
    // 未登记件命中即红（迁移须逐件登记并走审查）
    const injected = new Map([['a', { text: '<div class="ilife-toast">x</div>', src: 's' }]]);
    const c = compare(buildSnapshot(injected), injected);
    assert.equal(c.markers.length, 1);
    assert.equal(c.markers[0].marker, 'ilife-');
    // 白名单形态：只登记 #1197 迁到 base-paint 的 home／memo 31 件，且逐条与真实产物一致。
    const allowIds = Object.keys(MARKER_ALLOW).sort();
    assert.equal(allowIds.length, 31, '白名单必须恰好 31 件（home 23 ＋ memo 8）：' + allowIds.join(','));
    assert.ok(allowIds.every((id) => id.startsWith('home/') || id.startsWith('memo/')), '白名单只许 home／memo：' + allowIds.join(','));
    const arts = await collectArtifacts();
    for (const id of allowIds) assert.ok(arts.has(id), '白名单登记了不存在的产物：' + id);
    for (const [id, a] of arts) {
      for (const mk of BASE_PAINT_MARKERS) {
        assert.equal(a.text.includes(mk), (MARKER_ALLOW[id] || []).includes(mk),
          `${id} 的 ${mk} 是否放行必须与白名单逐条一致`);
      }
    }
    // bill／chef／schedule 三技能仍须零标记
    for (const s of ['bill', 'chef', 'schedule']) {
      for (const [id, a] of arts) {
        if (!id.startsWith(s + '/')) continue;
        for (const mk of BASE_PAINT_MARKERS) assert.ok(!a.text.includes(mk), `${id} 含 ${mk}（该技能未登记迁移）`);
      }
    }
  });

  it('--write 先校验后落盘：标记命中时快照文件 sha256 不变（R-S3-1）', () => {
    const dir = mkdtempSync(join(tmpdir(), 't96-snap-'));
    const target = join(dir, 'skill-html.snapshot.json');
    const raw = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
    try {
      const clean = new Map([['a', { text: '<p>ok</p>', src: 's' }]]);
      assert.equal(writeSnapshotChecked(clean, { snapPath: target }).written, true, '干净产物应落盘');
      const before = raw(target);

      const dirty = new Map([['a', { text: '<div class="ilife-toast">x</div>', src: 's' }]]);
      const r = writeSnapshotChecked(dirty, { snapPath: target });
      assert.equal(r.written, false, '影响面标记命中必须拒绝落盘');
      assert.deepEqual(r.markers, [{ id: 'a', marker: 'ilife-' }]);
      assert.equal(raw(target), before, '校验失败不得把受跟踪快照写脏（sha256 必须逐字节不变）');

      const missing = join(dir, 'not-created.json');
      assert.equal(writeSnapshotChecked(dirty, { snapPath: missing }).written, false);
      assert.equal(existsSync(missing), false, '校验失败不得创建快照文件');
    } finally {
      if (!dir.startsWith(tmpdir())) throw new Error('路径守卫：临时目录必须在 os.tmpdir() 下');
      rmSync(dir, { recursive: true, force: true });
    }
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

    // 复算口径（不看时间戳、不看人手抄）：断言的是**当刻产物**的形状与数量，不是某个历史账本。
    //   2026-11-04 实测（#1324 重录中文列时确认）：frag 数 bill 17／chef 12／home 21／schedule 8／memo 13
    //   （chef 12／bill 17 含 #952 resultset 分配到的 key；memo 13 含 #220 的 memo.wish），
    //   tpl 数 bill 16／chef 8／home 21／schedule 8／memo 7；总数 194 = 5*(4+6+1) + 71 + 60 + 4*2 自洽。
    const EXPECT_KEYS = { bill: 17, chef: 12, home: 21, schedule: 8, memo: 13 };
    const EXPECT_TPL = { bill: 16, chef: 8, home: 21, schedule: 8, memo: 7 };
    for (const s of SKILLS) {
      const mine = ids.filter((id) => id.startsWith(s.id + '/'));
      // 结构件：keys／templates／escape／shape-throw ＋ 6 形状
      const structural = mine.filter((id) => /^\w+\/(keys|templates|escape|shape-throw|shape\/)/.test(id));
      assert.equal(structural.length, 4 + SHAPES.length + 1, `${s.id} 结构件数量（含空列表探针）`);
      assert.equal(mine.filter((id) => id.startsWith(`${s.id}/frag/`)).length, EXPECT_KEYS[s.id], `${s.id} key 片段数`);
      assert.equal(mine.filter((id) => id.startsWith(`${s.id}/tpl/`)).length, EXPECT_TPL[s.id], `${s.id} 模板页数`);
      for (const sh of SHAPES) assert.ok(arts.has(`${s.id}/shape/${sh}`), `${s.id} 缺形状探针 ${sh}`);
      // 空态分支：bill/chef/home/schedule 走自家 hm-empty；memo 在 #1197 迁到 base-paint 的 ilife-empty
      //   （该件已登记进 MARKER_ALLOW），两种类名都要真的打到空态分支。
      const emptyClass = s.id === 'memo' ? 'ilife-empty' : 'hm-empty';
      assert.ok(arts.get(`${s.id}/shape/list-empty`).text.includes(emptyClass), `${s.id} 空列表探针须打到空态分支（${emptyClass}）`);
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

  it('真实产物：写读闭环零差异 ＋ 标记只在白名单件上放行', async () => {
    const arts = await collectArtifacts();
    const snap = buildSnapshot(arts);
    const c = compare(snap, arts);
    assert.deepEqual({ changed: c.changed, added: c.added, removed: c.removed, stale: c.staleText, markers: c.markers },
      { changed: [], added: [], removed: [], stale: [], markers: [] }, '自建快照必须与实际零差异（白名单内标记已放行）');
    assert.equal(snap.artifactCount, arts.size);
    // 标记确实存在，但每一处都被白名单覆盖；白名单外零命中。
    let hit = 0;
    for (const [id, a] of arts) {
      for (const mk of BASE_PAINT_MARKERS) {
        if (!a.text.includes(mk)) continue;
        hit++;
        assert.ok((MARKER_ALLOW[id] || []).includes(mk), `${id} 含 ${mk} 却不在白名单`);
      }
    }
    assert.equal(hit, 89, '实测 31 件共 89 处 base-paint 标记（白名单外的必须为零）');
  });

  it('base-* 指纹可复算（证据用）', () => {
    const fp = baseFingerprint();
    assert.match(fp.sha256, /^[0-9a-f]{32}$/);
    assert.ok(fp.files > 10, 'base-* 源码文件数异常：' + fp.files);
    assert.equal(fp.sha256, baseFingerprint().sha256, '同树两次指纹必须相同');
  });

  it('英文列：英文上下文采集与中文列同集合，records 只记偏离件（#1324）', async () => {
    const zh = await collectArtifacts();
    const en = await collectArtifactsLang('en');
    assert.equal(en.size, zh.size, '两列产物集合必须同大小（语言只影响取词，不改采集面）');
    assert.deepEqual([...en.keys()].sort(), [...zh.keys()].sort(), '两列 id 集合必须逐字相同');

    const diff = [...zh.keys()].filter((id) => sha256(en.get(id).text) !== sha256(zh.get(id).text));
    assert.deepEqual(diff, [
      'bill/shape/list-empty', 'chef/shape/list-empty', 'home/shape/list-empty',
      'memo/shape/list-empty', 'memo/tpl/change_category', 'memo/tpl/init_report',
      'memo/tpl/memo_query', 'memo/tpl/receipt', 'memo/tpl/sync_report',
      'memo/tpl/wish_complete', 'memo/tpl/wish_plan', 'schedule/shape/list-empty',
    ], '实测只有这 12 件产物随语言变化；变化集合动了说明迁移面变了，须同步账本');

    const col = buildEnColumn(en, zh);
    assert.equal(col.lang, 'en');
    assert.equal(col.basedOn, 'tooling/skill-html.snapshot.json');
    assert.equal(col.artifactCount, diff.length);
    assert.deepEqual(Object.keys(col.records).sort(), [...diff].sort(), 'records 的键集必须恰好是偏离件');
    for (const id of diff) assert.notEqual(col.records[id].sha256, sha256(zh.get(id).text), `${id}：英文记录不得与中文同哈希`);

    // 入仓英文账本必须与当刻英文列一致（漏记＝假绿）
    const loaded = loadLangColumn('en', { snapPath: snapPathOf('en') });
    assert.deepEqual(Object.keys(loaded.records).sort(), [...diff].sort(), '入仓英文列账本的键集必须等于当刻偏离件');
    for (const id of diff) assert.equal(loaded.records[id].sha256, col.records[id].sha256, `${id}：账本 sha 必须等于当刻英文产物`);
    const gaps = englishGaps(loaded, en);
    assert.deepEqual([gaps.pending, gaps.unrecorded, gaps.extra, gaps.mismatched, gaps.missing], [false, [], [], [], []],
      '入仓英文列必须零 gap');

    // 变异 ①：删一条记录 → 漏记必红
    const dropped = { ...loaded, records: { ...loaded.records } };
    delete dropped.records[diff[0]];
    assert.deepEqual(englishGaps(dropped, en).unrecorded, [diff[0]], '删记录后必须报漏记');
    // 变异 ②：改坏一条 sha → 错记必红
    const wrong = { ...loaded, records: { ...loaded.records, [diff[0]]: { ...loaded.records[diff[0]], sha256: 'deadbeefdeadbeefdeadbeefdeadbeef' } } };
    assert.ok(englishGaps(wrong, en).mismatched.some((x) => x.startsWith(diff[0] + ' ')), '改坏 sha 后必须报错记');
    // 变异 ③：记录回退成中文同哈希 → 记录应删除（同哈希不许入 records）
    const reverted = { ...loaded, records: { ...loaded.records, [diff[0]]: { ...loaded.records[diff[0]], sha256: zh.get(diff[0]).sha256 } } };
    assert.ok(englishGaps(reverted, en).mismatched.some((x) => x.startsWith(diff[0] + ' ')), '记录回退成中文同哈希必须红');
    // 漏掉一件（多出来的英文偏离件）→ 漏记必红
    const extra = { ...loaded, records: { ...loaded.records } };
    delete extra.records[diff[1]];
    assert.deepEqual(englishGaps(extra, en).unrecorded, [diff[1]]);

    // 写读闭环：writeEnColumn 出的文件能被 loadLangColumn 读回同一条记录
    const dir = mkdtempSync(join(tmpdir(), 't1324-en-'));
    try {
      const target = join(dir, 'skill-html.snapshot.en.json');
      writeEnColumn(col, { snapPath: target });
      const back = loadLangColumn('en', { snapPath: target });
      assert.deepEqual(Object.keys(back.records).sort(), [...diff].sort());
      for (const id of diff) assert.equal(back.records[id].sha256, col.records[id].sha256);
    } finally {
      if (!dir.startsWith(tmpdir())) throw new Error('路径守卫：临时目录必须在 os.tmpdir() 下');
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('快照文件本身与树一致（收尾前不得留下过期快照）', async () => {
    const snap = JSON.parse(readFileSync(join(root, 'tooling/skill-html.snapshot.json'), 'utf8'));
    const arts = await collectArtifacts();
    const c = compare(snap, arts);
    assert.deepEqual([c.changed, c.added, c.removed, c.staleText, c.markers], [[], [], [], [], []],
      'tooling/skill-html.snapshot.json 过期 → 跑 pnpm snapshot:html');
  });
});
