/** 组件层**件清单**· 判据件（清单与磁盘对账）。
 *
 *  它守什么：`src/components/清单.ts` 是 `src/components/` 的**派生**（唯一事实在磁盘）。
 *  **口径（并行落地期的关键）**：树在长（多席同时往 `src/components/` 加件），快照天生滞后 ⇒
 *  判据测的是「**派生器与磁盘的一致性**」，**不是「盘上那份快照有多新」**：
 *   · 盘上快照的**每一行事实**都要与磁盘对得上（写错就红，点名哪件哪个字段）；
 *   · 磁盘上已有、快照还没跟上的件 ⇒ **读数**（刷新时机归收口的人：每批提交前重生一次）；
 *   · 快照里的幽灵行（磁盘上已没有的件）⇒ 红。
 *
 *  五组读数：
 *   ① **重生 → 对账**（写进临时目录再读回来）：派生器的序列化往返无损，且落盘再读回与内存里那份逐字段相同；
 *   ② 盘上快照逐行对账（上面那条口径）；
 *   ③ **第二条读数**：件目录集合**独立重扫一遍**再与派生结果对上——判据不抄派生器的中间结果；
 *   ④ 每行的名字（渲染入口／样式函数／出口名／闭集常量／运行时）在**编译产物里真的存在**；
 *   ⑤ 缺项照实报：写「抽不出」的字段，磁盘上必须真的抽不出。
 *
 *  件数写进测试输出，不因「件太少」跳过：清单里每一件都过一遍。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { derive, diffRows, parseManifest, pendingRows, renderManifest } from '../scripts/gen-components.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const LAYER = join(PKG, 'src', 'components');
const MANIFEST = join(LAYER, '清单.ts');
const OUT_REL = 'packages/base-render/src/components/清单.ts';
const RERUN = '重跑：node packages/base-render/scripts/gen-components.mjs';
const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

/** 现算一遍（唯一事实在磁盘）：整份判据都以它为准，不以盘上那份快照的「新」为准。 */
const DISK = derive(PKG);
const PIECES = DISK.pieces;
/** 盘上那份快照（滞后是正常的；**写错**才红）。 */
const SNAPSHOT_TEXT = existsSync(MANIFEST) ? read(MANIFEST) : '';

console.log('件清单：磁盘上件数=' + PIECES.length + '（' + PIECES.map((p) => p.name).join('、') + '）'
  + '；跳过目录 ' + DISK.skipped.length);

/** 磁盘上「是一件」的目录（**独立重写一遍**扫描规则：件＝三份文件齐）。 */
function piecesOnDisk() {
  return readdirSync(LAYER, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .filter((e) => ['index.ts', 'render.ts', 'style.ts'].every((f) => existsSync(join(LAYER, e.name, f))))
    .map((e) => e.name)
    .sort();
}

describe('件清单 ① 重生 → 对账（派生器与磁盘一致，与快照新旧无关）', () => {
  it('同一份磁盘派生两次逐字节相同（派生器是纯函数：同输入同输出）', () => {
    const a = renderManifest(derive(PKG));
    const b = renderManifest(derive(PKG));
    assert.equal(a, b, '两次派生不一致 ⇒ 派生器里有不稳定顺序或时间戳');
  });

  it('重生（写进临时目录）再读回来，与内存里那份逐字段相同（序列化往返无损）', () => {
    const dir = mkdtempSync(join(tmpdir(), 't-roster-'));
    try {
      const file = join(dir, '清单.ts');
      writeFileSync(file, renderManifest(DISK), 'utf8');
      const back = parseManifest(read(file));
      assert.deepEqual(diffRows(DISK.pieces, back.rows), [], '落盘再读回来的行与磁盘现算的不一致');
      assert.deepEqual(back.rows.map((r) => r.name), DISK.pieces.map((r) => r.name), '件名序列走散了');
      assert.deepEqual(back.skipped, DISK.skipped, '跳过目录表走散了');
      assert.equal(back.table.length, DISK.pieces.length + 1, '人读表应是「表头 ＋ 每件一行」');
      assert.ok(back.table[0].startsWith('件名 | 中文名 | 族 | '), '人读表的第一列名变了：' + back.table[0]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('件清单 ② 盘上快照逐行对账（幽灵行红；事实过时报读数）', () => {
  it('盘上快照里不许有幽灵行（磁盘上已没有的件）', () => {
    assert.ok(SNAPSHOT_TEXT !== '', OUT_REL + ' 不存在——' + RERUN);
    const snap = parseManifest(SNAPSHOT_TEXT);
    const ghosts = diffRows(PIECES, snap.rows).filter((r) => r.includes('幽灵行'));
    assert.deepEqual(ghosts, [], OUT_REL + ' 里有幽灵行：\n' + ghosts.join('\n') + '\n' + RERUN);
  });

  it('快照里的事实过时多少处（读数，不红：刷新时机归收口的人）', () => {
    const snap = SNAPSHOT_TEXT === '' ? { rows: [] } : parseManifest(SNAPSHOT_TEXT);
    const stale = diffRows(PIECES, snap.rows).filter((r) => !r.includes('幽灵行'));
    const pending = pendingRows(PIECES, snap.rows);
    if (stale.length === 0 && pending.length === 0) {
      console.log('读数：盘上快照与磁盘逐字段一致（' + snap.rows.length + ' 件）');
    } else {
      console.log('读数：盘上快照过时 ' + stale.length + ' 处字段 ＋ 滞后 ' + pending.length + ' 件（'
        + pending.join('、') + '）——每批提交前重生一次即可：' + RERUN);
      for (const line of stale.slice(0, 6)) console.log('  · ' + line);
    }
    assert.ok(snap.rows.length + pending.length === PIECES.length,
      '快照里的件 ＋ 滞后的件 应恰好等于磁盘上的件（快照里有重复行？）');
  });

  it('跳过表里的目录在磁盘上还在，且 skin／shared 照实记着', () => {
    const snap = parseManifest(SNAPSHOT_TEXT);
    for (const s of snap.skipped) {
      assert.ok(existsSync(join(LAYER, s.name)),
        '跳过表里的 ' + s.name + ' 在磁盘上已不存在（幽灵行）——' + RERUN);
    }
    const names = snap.skipped.map((s) => s.name);
    for (const must of ['skin', 'shared']) {
      assert.ok(names.includes(must), must + ' 不是件，清单必须照实记进 COMPONENT_SKIPPED');
    }
    for (const s of snap.skipped) assert.ok(s.why !== '', s.name + ' 的跳过原因不许留空');
  });

  it('件数写进测试输出，且不为零（不因件少而跳过）', () => {
    console.log('件清单：磁盘上件数=' + PIECES.length + '／' + PIECES.map((p) => r0(p)).join('、'));
    assert.ok(PIECES.length > 0, '一件都没有 ⇒ 判据空转，不许绿');
  });
});

const r0 = (p) => p.name;

describe('件清单 ③ 第二条读数：派生的件 == 磁盘上的件目录', () => {
  it('两边各扫一遍，件名逐名对上（不漏不多）', () => {
    const disk = piecesOnDisk();
    const derived = PIECES.map((r) => r.name).sort();
    assert.deepEqual(derived, disk,
      '派生的件集合与磁盘不一致——派生＝[' + derived.join('、') + '] 磁盘＝[' + disk.join('、') + ']；' + RERUN);
  });

  it('层出口那一行：与 `src/components/index.ts` 现扫出来的对得上', () => {
    const inLayer = new Set([...read(join(LAYER, 'index.ts'))
      .matchAll(/(?:^|\n)\s*export\s*\*\s*from\s*'\.\/([^/]+)\/index\.js'/g)].map((m) => m[1]));
    for (const row of PIECES) {
      assert.equal(row.layerLine === '有', inLayer.has(row.name),
        row.name + ' 的「层出口」读数与 index.ts 对不上：派生＝' + row.layerLine
        + ' index.ts＝' + (inLayer.has(row.name) ? '有' : '无'));
    }
    const pending = PIECES.filter((r) => r.layerLine !== '有').map((r) => r.name);
    if (pending.length > 0) {
      console.log('读数：' + pending.length + ' 件还没在层出口（src/components/index.ts）加行：' + pending.join('、')
        + ' ⇒ 消费方从 base-paint/blocks 还取不到它们（并行落地期间的正常中间态）');
    }
  });
});

describe('件清单 ④ 每行的名字在磁盘与编译产物里真的存在', () => {
  for (const row of PIECES) {
    it(row.name + '：渲染入口／样式函数／出口名／闭集常量都能取到', async () => {
      let mod;
      try {
        mod = await import(pathToFileURL(join(PKG, 'dist', 'components', row.name, 'index.js')).href);
      } catch (e) {
        assert.fail(row.name + ' 的编译产物缺：dist/components/' + row.name + '/index.js'
          + '（先跑 node node_modules/typescript/bin/tsc -b packages/base-render/tsconfig.json）｜'
          + String(e && e.message ? e.message : e));
      }
      assert.ok(row.render !== '' && typeof mod[row.render] === 'function',
        row.name + ' 的渲染入口 `' + row.render + '` 取不到（抽不出／名字漂了）');
      assert.ok(row.style !== '' && typeof mod[row.style] === 'function',
        row.name + ' 的样式函数 `' + row.style + '` 取不到');
      for (const name of row.exports) {
        if (name.startsWith('*=')) continue;
        assert.ok(name in mod, row.name + ' 的出口名 `' + name + '` 在编译产物里不存在');
      }
      for (const v of row.variants) {
        const konst = v.split('=')[0];
        // 形态闭集是从 attrs.ts／render.ts 里抽的 ⇒ 只要求「该件自己的产物里存在」，
        // 不要求都从 index.js 再出口（闭集常量要不要出口，由各件自己的名字面决定）。
        const mods = [];
        for (const f of ['index', 'attrs', 'render', 'style']) {
          const p = join(PKG, 'dist', 'components', row.name, f + '.js');
          if (existsSync(p)) mods.push(await import(pathToFileURL(p).href));
        }
        assert.ok(mods.some((m) => konst in m),
          row.name + ' 的形态闭集常量 `' + konst + '` 在该件的编译产物里不存在（index／attrs／render／style 都查过了）');
      }
      if (row.runtime.startsWith('有')) {
        assert.ok(existsSync(join(LAYER, row.name, 'runtime.ts')), row.name + ' 说有运行时段，磁盘上却没有 runtime.ts');
        for (const m of row.runtime.matchAll(/build[A-Za-z]*Js/g)) {
          assert.equal(typeof mod[m[0]], 'function', row.name + ' 的运行时出口 `' + m[0] + '` 取不到');
        }
      } else {
        assert.equal(existsSync(join(LAYER, row.name, 'runtime.ts')), false, row.name + ' 有 runtime.ts，派生却写「无」');
      }
      const readme = join(LAYER, row.name, 'README.md');
      assert.equal(row.readme === '有', existsSync(readme), row.name + ' 的说明书有无与磁盘不一致');
      if (existsSync(readme)) assert.ok(read(readme).includes(row.cn), row.name + ' 的中文名「' + row.cn + '」在 README 里找不到');
      assert.equal(row.family !== '—', row.familyCss !== '',
        row.name + ' 的族注记与族汇总入口对不上：族＝' + row.family + ' 汇总＝' + row.familyCss);
    });
  }
});

describe('件清单 ⑥ 名册对账（层出口点名的目录 == 件 ＋ 非件 ＋ 缺目录）', () => {
  const layerNames = [...read(join(LAYER, 'index.ts'))
    .matchAll(/(?:^|\n)\s*export\s*\*\s*from\s*'\.\/([^/]+)\/index\.js'/g)].map((m) => m[1]);

  it('名册里每个点名目录都落在「件／非件／缺目录」三者之一，缺目录表照实记', () => {
    const dirs = new Set([...PIECES.map((p) => p.name), ...DISK.skipped.map((s) => s.name)]);
    const missing = layerNames.filter((n) => !dirs.has(n));
    assert.deepEqual(DISK.missingDirs.map((m) => m.name), missing,
      '缺目录表（COMPONENT_MISSING_DIRS）与名册对不上：名册点名但没有目录的＝[' + missing.join('、') + ']；' + RERUN);
    for (const n of layerNames) {
      assert.ok(dirs.has(n) || DISK.missingDirs.some((m) => m.name === n),
        n + ' 名册（层出口）里有、盘上没有，缺目录表里也没记——不许静默跳过');
    }
  });

  it('名册与盘上的账目一眼可见（读数，不红）', () => {
    const dirs = new Set([...PIECES.map((p) => p.name), ...DISK.skipped.map((s) => s.name)]);
    const missing = layerNames.filter((n) => !dirs.has(n));
    const notNamed = [...dirs].filter((n) => !layerNames.includes(n));
    console.log('读数：名册（层出口）点名 ' + layerNames.length + ' 个目录 ＝ 盘上目录 ' + dirs.size
      + ' ＋ 缺目录 ' + missing.length + '（' + (missing.join('、') || '—') + '）'
      + '；盘上有、名册没点名的 ' + notNamed.length + '（' + (notNamed.join('、') || '—') + '）');
    assert.ok(dirs.size > 0, '盘上一个目录都没有 ⇒ 判据空转');
  });
});

describe('件清单 ⑦ 跨件公开名（层出口 `export *` 的撞名面）', () => {
  it('重名表与现算一致；要硬红时开 `ILIFE_COMPONENT_EXPORTS_UNIQUE=1`', () => {
    const byName = new Map();
    for (const p of PIECES) {
      for (const n of p.exports) {
        if (n.startsWith('*=')) continue;
        if (!byName.has(n)) byName.set(n, []);
        const list = byName.get(n);
        if (!list.includes(p.name)) list.push(p.name);
      }
    }
    const shared = [...byName.entries()].filter(([, list]) => list.length > 1)
      .map(([name, list]) => ({ name, pieces: list.slice().sort() }))
      .sort((a, b) => (a.name < b.name ? -1 : 1));
    assert.deepEqual(shared, DISK.sharedExports, '跨件重名表（COMPONENT_SHARED_EXPORTS）与现算不一致：' + RERUN);
    if (shared.length > 0) {
      console.log('读数：' + shared.length + ' 个公开名被 ≥2 件共用（层出口 `export *` 下会撞）：'
        + shared.map((s) => s.name + '（' + s.pieces.join('／') + '）').join('、'));
    }
    if (process.env.ILIFE_COMPONENT_EXPORTS_UNIQUE === '1') {
      assert.deepEqual(shared, [], '要求零重名（ILIFE_COMPONENT_EXPORTS_UNIQUE=1），实有：' + JSON.stringify(shared));
    }
  });
});

describe('件清单 ⑤ 缺项照实报（抽不出的字段照实写，不静默填默认值）', () => {
  it('每行的「抽不出」都说明得通：磁盘上确实抽不出，不是抽法漏了', () => {
    for (const row of PIECES) {
      if (row.variants.length === 0) {
        const hasConst = ['attrs.ts', 'render.ts']
          .filter((f) => existsSync(join(LAYER, row.name, f)))
          .some((f) => /export const [A-Za-z_$][\w$]*\s*=\s*\[[^\]]*['"][^\]]*\]\s*as const\s*;/.test(read(join(LAYER, row.name, f))));
        assert.equal(hasConst, false,
          row.name + ' 的 attrs.ts／render.ts 里有带字符串的 `as const` 数组，派生却写「抽不出形态闭集」——抽法漏了');
      }
      if (row.sample === null) {
        const t = existsSync(join(LAYER, row.name, 'README.md')) ? read(join(LAYER, row.name, 'README.md')) : '';
        assert.ok(!(t.includes('类型') && (t.includes('缺省') || t.includes('必填'))),
          row.name + ' 的 README 里有入参表，派生却写「抽不出示例入参」——抽法漏了');
      }
    }
    const gaps = PIECES.filter((p) => p.variants.length === 0).map((p) => p.name);
    if (gaps.length > 0) console.log('读数：形态闭集抽不出的件 ' + gaps.length + '：' + gaps.join('、'));
  });
});
