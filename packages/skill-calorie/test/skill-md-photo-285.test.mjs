/** #285 · SKILL.md 常驻规则＋包内工作流披露验收（纯文档断言，不碰 DB）。
 *
 * 票面四条（判真假）：
 * ① SKILL.md 含指向披露文件的指针行；
 * ② 披露文件 packages/skill-calorie/workflows/09-身材照片.md 存在且 10 个场景逐条在册；
 * ③ 常驻规则含 D7 那一条（「交给用户，不只给路径」）；
 * ④ 指针行与文件名一致（改一处不改另一处即红）。
 *
 * 另带本票手写区两条（准备席 7 点中的手写部分）：⑤ verify 映射含第三键 photo-picker；
 * ⑥ 照片键数已 10→11。AUTO 块（HELP-AUTO-START/END 之间）本票不手改，由生成器刷新。
 *
 * #159／#450 守卫补强两条（本件全件即场景 09 面，无 describe 分段，按既有编号风格续挂）：
 * ⑦ 词表对账：9 个自造入口词在 `SKILL.md` 与 `workflows/09-身材照片.md` 全文各 0 次（逐词报件名与次数）；
 * ⑧ 老词口径正向：`卡路里HELP` 在 `SKILL.md` ≥2 次、工作流 ≥1 次。把任一处改回自造词即 ⑦ 红，
 * 自证读数见 ⑦ 末行 `MUTATION-WORDLIST`（对账读数见 `docs/skills/skill-calorie/t450-词表订正.md` §3.3）。
 *
 * 运行：node --test packages/skill-calorie/test/skill-md-photo-285.test.mjs
 */
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { configTestBase } from './helpers/config-test.mjs';

// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const PKG_DIR = join(import.meta.dirname, '..');
const SKILL_MD = join(PKG_DIR, 'SKILL.md');
const WORKFLOW_REL = 'workflows/09-身材照片.md';
const WORKFLOW_ABS = join(PKG_DIR, WORKFLOW_REL);
const WORKFLOW_BASE = '09-身材照片.md';

/** t170 四列对照表 10 个场景（本披露文件逐条在册的判据，与 workflows 文件 §索引同序同字）。 */
const SCENES_10 = [
  '存一张照片',
  '存照片（含备注）',
  '批量存照片',
  '看身材照',
  '对比两张照片',
  '生成身材照GIF',
  '删身材照',
  '改照片标签',
  '加照片标签',
  '删照片标签',
];

const D7_PHRASE = '交给用户，不只给路径';
const PICKER_KEY = 'calorie.view.photo-picker';

function readSkill() {
  assert.ok(existsSync(SKILL_MD), 'SKILL.md 缺失：' + SKILL_MD);
  return readFileSync(SKILL_MD, 'utf8');
}

function pointerLines(skill) {
  return skill.split('\n').filter((l) => l.includes('workflows/') && l.includes('09-身材照片'));
}

test('① SKILL.md 含指向披露文件的指针行', () => {
  const skill = readSkill();
  const hits = pointerLines(skill);
  assert.ok(hits.length >= 1, '指针行缺失：SKILL.md 须含 `' + WORKFLOW_REL + '`');
  assert.ok(hits.some((l) => l.includes(WORKFLOW_REL)), '指针行须含完整相对路径 `' + WORKFLOW_REL + '`，实测：' + JSON.stringify(hits[0] ?? ''));
});

test('② 披露文件存在且 10 个场景逐条在册', () => {
  assert.ok(existsSync(WORKFLOW_ABS), '披露文件缺失：' + WORKFLOW_ABS);
  const doc = readFileSync(WORKFLOW_ABS, 'utf8');
  const missing = SCENES_10.filter((s) => !doc.includes(s));
  assert.deepEqual(missing, [], '披露文件缺场景：' + JSON.stringify(missing));
  // 每条须带从哪一步走的命令形（至少出现对应 key），防“只列名字不给路”：
  for (const key of ['calorie.photo.add', 'calorie.photo.list', 'calorie.photo.compare', 'calorie.photo.gif', 'calorie.photo.remove', 'calorie.photo.tag']) {
    assert.ok(doc.includes(key), '披露文件缺命令 ' + key);
  }
  assert.ok(doc.includes(PICKER_KEY), '披露文件须点名 #283 冻结键 ' + PICKER_KEY);
});

test('③ 常驻规则含 D7 那一条', () => {
  const skill = readSkill();
  assert.ok(skill.includes(D7_PHRASE), 'SKILL.md 常驻规则缺 D7 短语「' + D7_PHRASE + '」');
  const doc = readFileSync(WORKFLOW_ABS, 'utf8');
  assert.ok(doc.includes(D7_PHRASE), '披露文件亦须含 D7 短语「' + D7_PHRASE + '」');
});

test('④ 指针行与文件名一致（改一处不改另一处即红）', () => {
  const skill = readSkill();
  const hits = pointerLines(skill);
  assert.ok(hits.length >= 1, '无指针行可对');
  for (const line of hits) {
    assert.ok(line.includes(WORKFLOW_BASE), '指针行与文件名不一致：行内缺 `' + WORKFLOW_BASE + '`：' + line);
  }
  // 指针须能解到真实文件（相对 SKILL.md 所在目录）：
  const resolved = resolve(dirname(SKILL_MD), WORKFLOW_REL);
  assert.ok(existsSync(resolved), '指针解不到文件：' + resolved);
  assert.equal(basename(resolved), WORKFLOW_BASE, '解得的文件名与指针不一致');
  // 变异自证：指针改名必红（改一处不改另一处即红的机械证明）：
  const mutated = skill.split(WORKFLOW_BASE).join('09-身材照片-改名.md');
  assert.doesNotMatch(mutated, new RegExp(WORKFLOW_BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '变异未红：改名后仍命中原文件名');
  console.log('MUTATION-POINTER ok（改名必红）');
});

test('⑤ verify 映射含第三键 photo-picker（手写区 #283 冻结键）', () => {
  const skill = readSkill();
  assert.ok(skill.includes(PICKER_KEY), 'SKILL.md 缺第三键 ' + PICKER_KEY + '（:72 verify 映射须追加）');
  // #159 词表订正：候选页是老技能场景 09 的**流程内页**，老技能没有唤醒词（对账读数见
  // `docs/skills/skill-calorie/t450-词表订正.md`）→ 命令声明去掉代表唤醒词后，速查表该列退回
  // 命令名（生成器 `scripts/build-help.mjs` 的 `const wake = REPR[k] || k;`）。改回自造词即红。
  assert.ok(skill.includes('| ' + PICKER_KEY + ' | ' + PICKER_KEY + ' |'),
    'SKILL.md 速查表里候选页的代表唤醒词列应已退回命令名（仍是自造词即红）');
});

test('⑥ 照片键数 10→11（手写区）', () => {
  const skill = readSkill();
  assert.ok(skill.includes('照片 11 键'), 'SKILL.md 须为「照片 11 键」（#283 加一键后 10→11），仍为 10 即红');
  assert.doesNotMatch(skill, /照片 10 键走 `q`/, '仍残留旧「照片 10 键走 `q`」');
});

/* ---- #159／#450 守卫补强：词表对账（自造入口词清零 ＋ 老词口径正向） ---- */

/** #159 词表订正去掉的 9 个自造入口词（老技能 0 命中，逐词读数见 `t450-词表订正.md` §一／§3.3）。 */
const SELF_MADE_WORDS = [
  '移除身材照',
  '设置照片标签',
  '查身材照详情',
  '对比身材照',
  '做身材照GIF',
  '看身材照HELP',
  '看身材照向导',
  '看GIF规划器',
  '选身材照',
];

/** 老技能正文注册的 HELP 唤醒词（订正后场景 09 的 HELP 门面词，须在册）。 */
const OLD_ENTRY_WORD = '卡路里HELP';

/** 件路径写死（对账面就是这两件；件改名即红，不给「扫到别的文件」留口）。 */
const SKILL_REL = 'packages/skill-calorie/SKILL.md';

/** 子串计数：中文没有词边界，用整串命中数（计数单位＝出现次数）。 */
function countAll(text, needle) {
  return text.split(needle).length - 1;
}

/** 两个文档面的当刻全文（只读，不碰 DB）。 */
function docFaces() {
  assert.ok(existsSync(WORKFLOW_ABS), '披露文件缺失：' + WORKFLOW_ABS);
  return [
    { rel: SKILL_REL, text: readSkill() },
    { rel: 'packages/skill-calorie/' + WORKFLOW_REL, text: readFileSync(WORKFLOW_ABS, 'utf8') },
  ];
}

test('⑦ 词表对账：自造入口词清零（9 词 × 2 件，逐词报出件名与次数）', () => {
  const faces = docFaces();
  for (const face of faces) {
    for (const word of SELF_MADE_WORDS) {
      const n = countAll(face.text, word);
      assert.equal(n, 0, '词表对账未过：自造入口词「' + word + '」在 ' + face.rel + ' 出现 ' + n + ' 次（期望 0）');
    }
  }
  // 变异自证：把 9 词逐词注入副本，计数器须逐词报出 1（证明每个词都能被单独定位，不是恒 0 的假绿）：
  const probeText = faces[0].text + '\n' + SELF_MADE_WORDS.join('／') + '\n';
  const probeHits = SELF_MADE_WORDS.map((w) => [w, countAll(probeText, w)]);
  const missed = probeHits.filter(([, n]) => n !== 1).map(([w, n]) => w + '×' + n);
  assert.deepEqual(missed, [], '变异自证失败：注入后这些词未被计数到（须各 1）：' + JSON.stringify(missed));
  console.log('MUTATION-WORDLIST ok（逐词注入后实测：' + probeHits.map(([w, n]) => w + '×' + n).join('／') + '）');
});

test('⑧ 老词口径：`卡路里HELP` 在册（正向断言）', () => {
  const [skillFace, docFace] = docFaces();
  const skillN = countAll(skillFace.text, OLD_ENTRY_WORD);
  const docN = countAll(docFace.text, OLD_ENTRY_WORD);
  assert.ok(skillN >= 2, '老词口径未过：' + skillFace.rel + ' 含「' + OLD_ENTRY_WORD + '」' + skillN + ' 次（期望 ≥2：入口行与常驻说明各一处）');
  assert.ok(docN >= 1, '老词口径未过：' + docFace.rel + ' 含「' + OLD_ENTRY_WORD + '」' + docN + ' 次（期望 ≥1：词表对账节须点名 HELP 入口）');
  console.log('WORDLIST-OLD-ENTRY ok（' + skillFace.rel + '=' + skillN + '，' + docFace.rel + '=' + docN + '）');
});
