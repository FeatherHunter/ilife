// #743 六家设置页四处整改的跨包锁（跨包面照 test/panel-type-739.test.mjs 的写法：读源码 ＋ 读各家 dist）。
//
// 锁四件事，一件一条：
//   ① 头部两行（配置文件／数据目录）间距六家一致——`info` 条目一律不写 `margin`
//      （改前 {记账／卡路里／备忘录} 写了 `margin: '6px 0 0'`，{大厨／居家／作息} 没写，六家同形面破了）；
//   ② 行文案有界：每条 hint 最多两句、不超过 40 字、不出现开发期口径词（「改造前」「落点」）；
//   ③ `db.dir` 那行标了 `prefillFrom: 'dataDir'`（页面上把解析好的绝对路径预填出来），且只有它标；
//   ④ 目录选择的回执只经 `readPickAnswer` 解——不许再直接吃 `picker.pick()` 的裸值
//      （平台回的是信封 `{ok,value|error}`；照裸值解会把「选中」与「被拒」都判成用户取消）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

/** 各家 dist 的行表（hint 与 prefillFrom 的权威读数）。 */
const ITEMS = new Map();
for (const pkg of PACKAGES) {
  const mod = await import(new URL(`../packages/${pkg}/dist/index.js`, import.meta.url));
  ITEMS.set(pkg, mod.CONFIG_ITEMS);
}

describe('#743 六家设置页：间距一致 · 文案有界 · 数据目录预填 · 回执按信封解', () => {
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
      assert.match(src, /export function readPickAnswer\(/, pkg + ' 少了 readPickAnswer');
      assert.match(src, /return readPickAnswer\(await picker\.pick\(\)\);/, pkg + ' 没把 pick() 的返回值交给 readPickAnswer');
      assert.doesNotMatch(src, /const picked = await picker\.pick\(\);/, pkg + ' 仍直接吃 pick() 的裸值（#743 的缺陷样子）');
      assert.match(readSrc(pkg, 'dsh-ctx.ts'), /pick\(\): Promise<DirectoryPickerAnswer>/,
        pkg + ' 的 DirectoryPickerFace.pick 没声明成信封回执');
    }
  });
});
