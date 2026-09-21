// #743 六家设置页四处整改的跨包锁（跨包面照 test/panel-type-739.test.mjs 的写法：读源码 ＋ 读各家 dist）。
//
// #758 起锁八件事，前五件是 #743 立的，后三件是六家收窄的同形面：
//   ① 头部两行（配置文件／数据目录）间距六家一致——`info` 条目一律不写 `margin`
//      （改前 {记账／卡路里／备忘录} 写了 `margin: '6px 0 0'`，{大厨／居家／作息} 没写，六家同形面破了）；
//   ② 行文案有界：每条 hint 最多两句、不超过 40 字、不出现开发期口径词（「改造前」「落点」）；
//   ③ `db.dir` 那行标了 `prefillFrom: 'dataDir'`（页面上把解析好的绝对路径预填出来），且只有它标；
//   ④ 目录选择的回执只经 `readPickAnswer` 解——不许再直接吃 `picker.pick()` 的裸值
//      （平台回的是信封 `{ok,value|error}`；照裸值解会把「选中」与「被拒」都判成用户取消）；
//   ⑤ 六家样式表逐项同形：同一个样式项在六份 `client.ts` 里逐字相同
//      （改前 {备忘／卡路里／记账} 与 {作息／居家／大厨} 分成两支：`row` 一边 `marginTop: 10`
//      一边 `marginBottom: 10`，首行字段标题离上方那条分隔线便一边 18px、一边 8px）。
//   ⑥（#758）每家可改的行只有定稿允许的那几行：记账 1（数据目录）／卡路里 3
//      （数据目录／照片目录／训记 KEY）／备忘 2（数据目录／附件目录）／作息 1／居家 1／大厨 1；
//      行数同步钉死：6／11／4／3／5／4。
//   ⑦（#758）只读目录行的浏览按钮存在且不可点击：有只读目录行的家（记账 `backup.dir`／
//      卡路里 `xunji.stateDir`／居家 `backup.dir`）各画一枚 disabled 按钮；无只读目录行的家
//     （备忘／作息／大厨）断言名单为空——加一行只读目录不补按钮即红。
//   ⑧（#758）控件文案不含省略号：六份 `client.ts` 无 `…`；六家行标题与 hint 无 `…` 与 `...`；
//      目录行两档按钮文案逐字是「选择文件夹」／「浏览」且无省略号。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadClientBundle, nodesOfType, textOf } from './helpers/client-bundle.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');

/** 六家单品插件包目录名（与总管那张图的六个页签一一对应）。 */
const PACKAGES = [
  'plugin-bill-ilife',
  'plugin-calorie',
  'plugin-chef',
  'plugin-home-ilife',
  'plugin-memo-ilife',
  'plugin-schedule-ilife',
];

const readSrc = (pkg, file) => readFileSync(join(REPO, 'packages', pkg, 'src', file), 'utf8');

/** 取出某个样式项的条目正文（`name: { … }` 里的 `…`；条目是平铺对象，无嵌套花括号）。 */
function entryBody(source, name) {
  const m = new RegExp('(?:^|\\n)\\s*' + name + ':\\s*\\{([\\s\\S]*?)\\}', 'm').exec(source);
  return m === null ? null : m[1];
}

/** 取出整张样式表（`const S = { … }`）里的全部 `name: { … }` 条目，键＝样式项名。 */
function styleEntries(source) {
  const start = source.indexOf('const S = {');
  assert.ok(start >= 0, '源码里找不到样式表 const S = {');
  const end = source.indexOf('\n};', start);
  assert.ok(end > start, '样式表没有收尾的 };');
  const entries = new Map();
  for (const m of source.slice(start, end).matchAll(/^\s*([A-Za-z]+):\s*\{([^}]*)\}/gm)) entries.set(m[1], m[2]);
  assert.ok(entries.size > 0, '样式表里一个条目都没取到');
  return entries;
}

/** 各家 dist 的行表（hint 与 prefillFrom 的权威读数）。 */
const ITEMS = new Map();
for (const pkg of PACKAGES) {
  const mod = await import(new URL(`../packages/${pkg}/dist/index.js`, import.meta.url));
  ITEMS.set(pkg, mod.CONFIG_ITEMS);
}

describe('#743 六家设置页：间距一致 · 文案有界 · 数据目录预填 · 回执按信封解 · 样式表逐项同形', () => {
  it('① 头部两行的间距六家一致：`info` 条目一律不写 margin（间距由标题与下方块决定，不一家一个数）', () => {
    for (const pkg of PACKAGES) {
      const body = entryBody(readSrc(pkg, 'client.ts'), 'info');
      assert.ok(body !== null, pkg + ' 少了样式项 info');
      assert.doesNotMatch(body, /margin/, pkg + ' 的 info 写了 margin：' + body.trim());
    }
  });

  it('② 行文案有界：每条 hint ≤2 句、≤40 字、零开发期口径词', () => {
    const BANNED = ['改造前', '落点', '施工', '重构'];
    for (const pkg of PACKAGES) {
      for (const item of ITEMS.get(pkg)) {
        const hint = item.hint;
        assert.equal(typeof hint, 'string');
        assert.ok(hint.trim().length > 0, `${pkg} ${item.key} 缺 hint`);
        const sentences = (hint.match(/[。！？]/g) ?? []).length;
        assert.ok(sentences <= 2, `${pkg} ${item.key} 的 hint 超过两句（${sentences}）：${hint}`);
        assert.ok(hint.length <= 40, `${pkg} ${item.key} 的 hint 超过 40 字（${hint.length}）：${hint}`);
        for (const word of BANNED) {
          assert.ok(!hint.includes(word), `${pkg} ${item.key} 的 hint 带了开发期口径词「${word}」：${hint}`);
        }
      }
    }
  });

  it('③ `db.dir` 那行标了 prefillFrom: dataDir，其余行不标（预填只给技能算好的那一个落点）', () => {
    for (const pkg of PACKAGES) {
      const items = ITEMS.get(pkg);
      const dir = items.find((i) => i.key === 'db.dir');
      assert.ok(dir !== undefined, pkg + ' 少了 db.dir 行');
      assert.equal(dir.prefillFrom, 'dataDir', pkg + ' 的 db.dir 没标 prefillFrom= dataDir');
      assert.equal(dir.control, 'directory', pkg + ' 的 db.dir 应是目录档');
      const others = items.filter((i) => i.key !== 'db.dir').filter((i) => i.prefillFrom !== undefined);
      assert.deepEqual(others.map((i) => i.key), [], pkg + ' 只有 db.dir 该标 prefillFrom');
    }
  });

  it('④ 目录选择回执只经 readPickAnswer 解（不许再直接吃 pick() 的裸值）', () => {
    for (const pkg of PACKAGES) {
      const src = readSrc(pkg, 'client.ts');
      // 形态两种都算数：#744 把归一函数搬进共用件 `dsh-life-pack/directory-browser`，六家改成
      // 「同名转出共用件」（`export const readPickAnswer = sharedReadPickAnswer;`）；
      // 这条锁要的是**回执只经它解**，不是要求每家各写一份函数体。
      assert.match(src, /export (function readPickAnswer\(|const readPickAnswer = )/,
        pkg + ' 少了 readPickAnswer（本地函数或共用件同名转出，二者其一）');
      assert.match(src, /return readPickAnswer\(await picker\.pick\(\)\);/, pkg + ' 没把 pick() 的返回值交给 readPickAnswer');
      assert.doesNotMatch(src, /const picked = await picker\.pick\(\);/, pkg + ' 仍直接吃 pick() 的裸值（#743 的缺陷样子）');
      assert.match(readSrc(pkg, 'dsh-ctx.ts'), /pick\(\): Promise<DirectoryPickerAnswer>/,
        pkg + ' 的 DirectoryPickerFace.pick 没声明成信封回执');
    }
  });

  it('⑤ 六家样式表逐项同形：同一个样式项在六份 client.ts 里逐字相同', () => {
    const styles = new Map(PACKAGES.map((pkg) => [pkg, styleEntries(readSrc(pkg, 'client.ts'))]));
    /** 只该出现在某几家里的样式项（逐个登记；没登记的「某家独有」与「两边不同」一律红）。 */
    const PER_PACKAGE_EXTRA = {
      // 备忘与卡路里另有功能页与版本行，这两条是它们自家在用的。
      total: ['plugin-calorie', 'plugin-memo-ilife'],
      version: ['plugin-calorie', 'plugin-memo-ilife'],
    };

    // ① 归属：六家都有，或者登记在例外表里且归属逐家对上。
    const keys = new Set();
    for (const entries of styles.values()) for (const key of entries.keys()) keys.add(key);
    for (const key of keys) {
      const owners = PACKAGES.filter((pkg) => styles.get(pkg).has(key));
      if (owners.length === PACKAGES.length) continue;
      const declared = PER_PACKAGE_EXTRA[key];
      assert.ok(declared !== undefined,
        `样式项 ${key} 只出现在 ${owners.join('／')}：要嘛六家都有，要嘛登记进 PER_PACKAGE_EXTRA`);
      assert.deepEqual(owners, [...declared].sort(),
        `样式项 ${key} 的归属与 PER_PACKAGE_EXTRA 的登记不符`);
    }

    // ② 正文：有的家里，条目正文逐字相同（空白归一，免得只为换行方式报红）。
    for (const key of keys) {
      const bodies = new Set();
      for (const pkg of PACKAGES) {
        const body = styles.get(pkg).get(key);
        if (body !== undefined) bodies.add(body.replace(/\s+/g, ' ').trim());
      }
      assert.equal(bodies.size, 1, `样式项 ${key} 六家不一致：${[...bodies].join('  ／  ')}`);
    }
  });

  it('⑥（#758）每家可改的行只有定稿允许的那几行（行数同步钉死）', () => {
    /** 定稿出处：记账 #747／卡路里 #748／备忘 #759／作息 #761／居家 #793／大厨 #795。 */
    const EXPECTED_EDITABLE = new Map([
      ['plugin-bill-ilife', ['db.dir']],
      ['plugin-calorie', ['db.dir', 'photos.dir', 'xunji.key']],
      ['plugin-memo-ilife', ['db.dir', 'media.dir']],
      ['plugin-schedule-ilife', ['db.dir']],
      ['plugin-home-ilife', ['db.dir']],
      ['plugin-chef', ['db.dir']],
    ]);
    const EXPECTED_TOTAL = new Map([
      ['plugin-bill-ilife', 6],
      ['plugin-calorie', 11],
      ['plugin-memo-ilife', 4],
      ['plugin-schedule-ilife', 3],
      ['plugin-home-ilife', 5],
      ['plugin-chef', 4],
    ]);
    for (const pkg of PACKAGES) {
      const items = ITEMS.get(pkg);
      const editable = items.filter((i) => i.readonly !== true).map((i) => i.key);
      assert.deepEqual(editable, EXPECTED_EDITABLE.get(pkg), pkg + ' 可改行与定稿不符');
      assert.equal(items.length, EXPECTED_TOTAL.get(pkg), pkg + ' 行数与定稿不符');
      // 可改行之外的每一行都必须是只读（没有第三态）。
      for (const item of items) {
        if ((EXPECTED_EDITABLE.get(pkg) ?? []).includes(item.key)) {
          assert.notEqual(item.readonly, true, pkg + ' ' + item.key + ' 应可改');
        } else {
          assert.equal(item.readonly, true, pkg + ' ' + item.key + ' 应只读');
        }
      }
    }
  });

  it('⑦（#758）只读目录行的浏览按钮存在且不可点击', () => {
    /** 有只读目录行的家才列键；无的家列空数组——加一行只读目录不补按钮即红。 */
    const EXPECTED_READONLY_DIR = new Map([
      ['plugin-bill-ilife', ['backup.dir']],
      ['plugin-calorie', ['xunji.stateDir']],
      ['plugin-memo-ilife', []],
      ['plugin-schedule-ilife', []],
      ['plugin-home-ilife', ['backup.dir']],
      ['plugin-chef', []],
    ]);
    for (const pkg of PACKAGES) {
      const items = ITEMS.get(pkg);
      const readonlyDir = items.filter((i) => i.readonly === true && i.control === 'directory');
      assert.deepEqual(readonlyDir.map((i) => i.key), EXPECTED_READONLY_DIR.get(pkg),
        pkg + ' 只读目录行名单与定稿不符');
      if (readonlyDir.length === 0) continue;
      const { Row } = loadClientBundle(join(REPO, 'packages', pkg)).exports;
      assert.equal(typeof Row, 'function', pkg + ' 的 client 束缺 Row（组件级断言无从下手）');
      for (const item of readonlyDir) {
        const node = Row({
          item, value: 'C:\\探针\\只读目录', disabled: false, onChange: () => {},
          browser: { mode: 'browse', onOpen: () => {} },
        });
        const buttons = nodesOfType(node, 'button');
        assert.equal(buttons.length, 1, pkg + ' ' + item.key + ' 应画一枚浏览按钮（保留但不可点）');
        assert.equal(buttons[0].props.disabled, true, pkg + ' ' + item.key + ' 的浏览按钮须不可点击');
        const inputs = nodesOfType(node, 'input');
        assert.equal(inputs.length, 1, pkg + ' ' + item.key + ' 应有一格输入框');
        assert.equal(inputs[0].props.disabled, true, pkg + ' ' + item.key + ' 的输入框须 disabled');
        assert.equal(inputs[0].props.onChange, undefined, pkg + ' ' + item.key + ' 不接 onChange');
      }
    }
  });

  it('⑧（#758）控件文案不含省略号（`…` 与 `...`）', () => {
    for (const pkg of PACKAGES) {
      // ① 源码面：client.ts 一个 `…` 都没有（`...` 是展开语法，不在此查，只查按钮字面）。
      assert.doesNotMatch(readSrc(pkg, 'client.ts'), /…/, pkg + ' 的控件文案不得出现省略号');
      // ② 行表面：标题与 hint 两个字面都不带省略号。
      for (const item of ITEMS.get(pkg)) {
        assert.doesNotMatch(item.title, /…|\.\.\./, pkg + ' ' + item.key + ' 的标题带省略号');
        assert.doesNotMatch(item.hint, /…|\.\.\./, pkg + ' ' + item.key + ' 的 hint 带省略号');
      }
      // ③ 按钮面：两档文案逐字是「选择文件夹」／「浏览」且无省略号。
      const { Row } = loadClientBundle(join(REPO, 'packages', pkg)).exports;
      const dirItem = ITEMS.get(pkg).find((i) => i.key === 'db.dir');
      assert.ok(dirItem !== undefined, pkg + ' 少了 db.dir 行');
      for (const [mode, want] of [['native', '选择文件夹'], ['browse', '浏览']]) {
        const node = Row({
          item: dirItem, value: 'D:\\探针', disabled: false, onChange: () => {},
          browser: { mode, onOpen: () => {} },
        });
        const buttons = nodesOfType(node, 'button');
        assert.equal(buttons.length, 1, pkg + ' ' + mode + ' 档应有一枚目录按钮');
        const label = textOf(buttons[0]);
        assert.equal(label, want, pkg + ' ' + mode + ' 档按钮文案应是「' + want + '」');
        assert.doesNotMatch(label, /…|\.\.\./, pkg + ' ' + mode + ' 档按钮文案带省略号');
      }
    }
  });
});
