// #1270 · 生成期候选（条目 10：查标签详情页从已有标签里选一个）
// 判据：① 词表口径（`#词` 切分、全数字编号丢掉、次数降序）②只读开库 fail-open ③声明里写了
// `source: 'tags'` 的槽位在有候选时升级成下拉、没候选时保持自由文本。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import {
  buildHelpFileData, renderHelpFileHtml, rankTagCandidates, readTagCandidates, TAG_CANDIDATE_LIMIT,
} from '../dist/render/index.js';
import { tagMatch, tagsInNote } from '../dist/fetch/db.js';

const NOW = new Date(2026, 9, 13, 1, 30, 0);

function sceneFieldOf(data, name) {
  for (const g of data.groups) {
    for (const s of g.subgroups) {
      for (const scene of s.scenes) {
        for (const f of scene.editable_fields ?? []) {
          if (f.name === name) return f;
        }
      }
    }
  }
  return null;
}

test('#1270 · 词形切分与 tagMatch 同源：切出来的词，match 必然为真', () => {
  const note = '午饭 #待报销 与 #旅行计划 以及 #借给小明，#分期；编号 #10385';
  const words = tagsInNote(note);
  assert.deepEqual(words, ['待报销', '旅行计划', '借给小明', '分期', '10385']);
  for (const w of words) assert.equal(tagMatch(note, w), true, '切出的词必须能整词命中：' + w);
  // 整词口径：`#旅行计划` 里不含 `#旅行`
  assert.equal(tagMatch(note, '旅行'), false);
  // 同行重复只出一次
  assert.deepEqual(tagsInNote('#a #a'), ['a']);
  assert.deepEqual(tagsInNote(''), []);
});

test('#1270 · 候选词表：全数字编号丢掉，次数降序、同次数按首次出现序，遵守上限', () => {
  const notes = ['#待报销 #10385', '#待报销 #分期', '#分期 #未还', '#MHL'];
  const got = rankTagCandidates(notes);
  assert.deepEqual(got, ['待报销', '分期', '未还', 'MHL']);
  assert.equal(got.includes('10385'), false, '全数字＝记录编号，不是标签');
  assert.deepEqual(rankTagCandidates(notes, 2), ['待报销', '分期']);
  assert.deepEqual(rankTagCandidates([], 5), []);
  assert.equal(rankTagCandidates(['#a'], 0).length, 0);
  assert.equal(TAG_CANDIDATE_LIMIT > 0, true);
});

test('#1270 · 只读读库：真结构、老结构（无 deleted_at）、文件不在、不是库——四种都不抛', () => {
  const dir = mkdtempSync(join(tmpdir(), 't1270-'));

  // ① 真结构（有 deleted_at，删掉的行不参与）
  const full = join(dir, 'full.db');
  const a = new DatabaseSync(full);
  a.exec('CREATE TABLE bills (id INTEGER PRIMARY KEY AUTOINCREMENT, note TEXT DEFAULT \'\', deleted_at TEXT DEFAULT NULL)');
  a.exec("INSERT INTO bills (note) VALUES ('#旅行 #10385'), ('#旅行 #待报销')");
  a.exec("INSERT INTO bills (note, deleted_at) VALUES ('#已删除', '2026-01-01')");
  a.close();
  assert.deepEqual(readTagCandidates(full), ['旅行', '待报销']);

  // ② 老结构：没有 deleted_at 列 ⇒ 退回不带过滤的读，不抛
  const old = join(dir, 'old.db');
  const b = new DatabaseSync(old);
  b.exec('CREATE TABLE bills (id INTEGER PRIMARY KEY, note TEXT)');
  b.exec("INSERT INTO bills (note) VALUES ('#借入')");
  b.close();
  assert.deepEqual(readTagCandidates(old), ['借入']);

  // ③ 文件不在 / ④ 不是 sqlite 库 ⇒ 空表，不抛（fail-open：候选缺席退化成自由文本）
  assert.deepEqual(readTagCandidates(join(dir, 'none.db')), []);
  const junk = join(dir, 'junk.db');
  writeFileSync(junk, 'not a sqlite file');
  assert.deepEqual(readTagCandidates(junk), []);
  assert.deepEqual(readTagCandidates(''), []);
});

test('#1270 · 声明里的 source: tags ——有候选就升级成下拉，没候选就保持自由文本', () => {
  const candidates = ['待报销', '分期', '未还'];

  const withOut = sceneFieldOf(buildHelpFileData(NOW, {}), 'tag');
  assert.ok(withOut, '查标签那条字段必须在载荷里');
  assert.equal(withOut.source, 'tags');
  assert.equal(withOut.kind, 'text');
  assert.equal(withOut.options, undefined, '没候选时不许出现空下拉');

  const withC = sceneFieldOf(buildHelpFileData(NOW, { tagCandidates: candidates }), 'tag');
  assert.equal(withC.kind, 'select');
  assert.deepEqual(withC.options, candidates);
  assert.equal(withC.required, true, '必填与提示语都照旧');
  assert.equal(withC.hint, '如 #旅行、#待报销');

  // 载荷里真的带上了候选；整页 HTML 里也读得到
  const html = renderHelpFileHtml(buildHelpFileData(NOW, { tagCandidates: candidates }));
  assert.match(html, /"options":\["待报销","分期","未还"\]/);

  // 别把资产改坏：无候选那次与有候选那次，非目标字段仍是同一批（引用相等＝没被 clone 走样）
  const plain = buildHelpFileData(NOW, {});
  const filled = buildHelpFileData(NOW, { tagCandidates: candidates });
  assert.equal(plain.groups.length, filled.groups.length);
  assert.equal(plain.groups[0], filled.groups[0], '没被改到的分组仍只读引用资产（不 clone）');

  // 次数降序口径进载荷：候选顺序原样透传，不在渲染层重排
  const two = sceneFieldOf(buildHelpFileData(NOW, { tagCandidates: ['b', 'a'] }), 'tag');
  assert.deepEqual(two.options, ['b', 'a']);
});
