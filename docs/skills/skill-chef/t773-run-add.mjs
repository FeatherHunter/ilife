#!/usr/bin/env node
// t773 录入域端到端驱动（#773 写侧 6 卡）。
// 正例：6 卡逐卡经真出口写副本库 → 出回执页 → 写后回读；打印 6 行 `卡 → exit=0 → 产物绝对路径`。
// 反例：`--fail-case` 故意少给必填字段 → 必须走失败页且 exit≠0，且不写半条脏数据。
// `--check`：打印「片段行数＝本票卡数」与「vision 审查缺陷」两行判据，缺一即红。
// 跑法一律：`node tooling/run-locked.mjs --ticket 773 -- node docs/skills/skill-chef/t773-run-add.mjs`
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(import.meta.dirname, '..', '..', '..');
const SCRATCH = join(ROOT, '.scratch', 't773');
const DBFILE = join(SCRATCH, 'chef_data.db');
const HOME = join(SCRATCH, 'home');
const REAL_DB = 'D:\\2Study\\StudyNotes\\.db\\chef_data.db';
const DIST_CLI = join(ROOT, 'packages', 'skill-chef', 'dist', 'cli', 'cmd_read.js');
const FRAGMENT = join(ROOT, 'docs', 'skills', 'skill-chef', 't773-册子片段.json');
const VISION_JSON = join(SCRATCH, 'vision.json');

const CARDS = [
  {
    id: 'add_from_image', wake: '录入食谱', source: '图片录入', file: 't773-add-from-image.html',
    title: '番茄炒蛋',
    channel: '图片通道：用户先发菜谱图片，AI 把图片里的菜名与用料转成结构化内容后再调用录入。本票只做给了结构化内容之后的落库，图片识别本身另立票。',
    params: { op: 'add', name: '番茄炒蛋', servings: 2, total_time_minutes: 20, difficulty: '快手菜', description: '图片转结构化后录入', source: '图片录入',
      ingredients: [
        { name: '番茄', category: '蔬菜', quantity: 300, unit: 'g', quantity_text: '约 2 个' },
        { name: '鸡蛋', category: '蛋类', quantity: 3, unit: '个', quantity_text: '3 个' },
        { name: '盐', category: '调料', quantity: 3, unit: 'g', quantity_text: '半勺' },
      ],
      steps: [
        { action: '鸡蛋打散下锅炒熟盛出', duration_minutes: 2, heat_level: '中火' },
        { action: '下番茄炒软后回锅同炒', duration_minutes: 5, heat_level: '大火' },
      ] },
  },
  {
    id: 'add_from_markdown', wake: '录入食谱', source: '文档录入', file: 't773-add-from-markdown.html',
    title: '青椒肉丝',
    channel: '文档通道：用户发一份菜谱文档，AI 按文档里的食材与步骤转成结构化内容后再调用录入。本票只做转成结构化内容之后的落库。',
    params: { op: 'add', name: '青椒肉丝', servings: 2, total_time_minutes: 22, difficulty: '简单', description: '文档转结构化后录入', source: '文档录入',
      ingredients: [
        { name: '青椒', category: '蔬菜', quantity: 200, unit: 'g', quantity_text: '约 3 根' },
        { name: '猪里脊', category: '肉类', quantity: 200, unit: 'g', quantity_text: '切丝' },
        { name: '生抽', category: '调料', quantity: 10, unit: 'ml', quantity_text: '2 勺' },
      ],
      steps: [
        { action: '猪里脊切丝腌制', duration_minutes: 4, heat_level: '中火' },
        { action: '下青椒与肉丝大火快炒', duration_minutes: 5, heat_level: '大火' },
      ] },
  },
  {
    id: 'add_from_conversation', wake: '录入食谱', source: '对话录入', file: 't773-add-from-conversation.html',
    title: '麻婆豆腐',
    channel: '对话通道：AI 逐轮问清菜名与用料，集齐后再调用录入。本票先跑通这条最短路径，缺项当场问用户要。',
    params: { op: 'add', name: '麻婆豆腐', servings: 2, total_time_minutes: 25, difficulty: '简单', description: '对话逐步收集后录入', source: '对话录入',
      ingredients: [
        { name: '嫩豆腐', category: '豆制品', quantity: 400, unit: 'g', quantity_text: '1 盒' },
        { name: '牛肉末', category: '肉类', quantity: 100, unit: 'g', quantity_text: '约半碗' },
        { name: '豆瓣酱', category: '调料', quantity: 20, unit: 'g', quantity_text: '1 勺' },
      ],
      steps: [
        { action: '豆腐切块焯水捞出', duration_minutes: 3, heat_level: '中火' },
        { action: '炒香牛肉末与豆瓣后烧豆腐', duration_minutes: 6, heat_level: '小火' },
      ] },
  },
  {
    id: 'add_from_template', wake: '录入食谱', source: '表单录入', file: 't773-add-from-template.html',
    title: '蒜蓉西蓝花',
    channel: '表单通道：用户按结构化模板逐项填好，AI 校验通过后再调用录入。必填项缺失时确认按钮置灰。',
    params: { op: 'add', name: '蒜蓉西蓝花', servings: 2, total_time_minutes: 15, difficulty: '快手菜', description: '表单填好后录入', source: '表单录入',
      ingredients: [
        { name: '西蓝花', category: '蔬菜', quantity: 300, unit: 'g', quantity_text: '约 1 颗' },
        { name: '大蒜', category: '葱姜蒜', quantity: 20, unit: 'g', quantity_text: '4 瓣' },
        { name: '盐', category: '调料', quantity: 3, unit: 'g', quantity_text: '半勺' },
      ],
      steps: [
        { action: '西蓝花掰朵焯水', duration_minutes: 2, heat_level: '大火' },
        { action: '爆香蒜末后下西蓝花炒熟', duration_minutes: 3, heat_level: '大火' },
      ] },
  },
  {
    id: 'import_from_json', wake: '导入食谱', source: '数据导入', file: 't773-import-from-json.html',
    title: '鱼香肉丝',
    channel: '文件通道：用户给一份导入文件，AI 先校验必填字段，齐了才调用录入。维度表本期不写，只落三张主表。',
    params: { op: 'add', name: '鱼香肉丝', servings: 2, total_time_minutes: 25, difficulty: '中等', description: '导入文件校验后录入', source: '数据导入',
      ingredients: [
        { name: '猪里脊', category: '肉类', quantity: 200, unit: 'g', quantity_text: '切丝' },
        { name: '木耳', category: '干货', quantity: 50, unit: 'g', quantity_text: '泡发后' },
        { name: '泡椒', category: '调料', quantity: 15, unit: 'g', quantity_text: '约 3 个' },
      ],
      steps: [
        { action: '肉丝与配料分别切好', duration_minutes: 4, heat_level: '中火' },
        { action: '调鱼香汁后大火快炒', duration_minutes: 5, heat_level: '大火' },
      ] },
  },
  {
    id: 'import_validation_failed', wake: '导入食谱', source: '补齐重试', file: 't773-import-validation-failed.html',
    title: '宫保鸡丁',
    channel: '校验通道：导入先验必填数字，缺用量与时长当场拦下并出失败页。补齐后重试才落库，本页是补齐后的成功回执。',
    params: { op: 'add', name: '宫保鸡丁', servings: 2, total_time_minutes: 25, difficulty: '中等', description: '校验失败补齐后重试', source: '补齐重试',
      ingredients: [
        { name: '鸡腿肉', category: '肉类', quantity: 250, unit: 'g', quantity_text: '切丁' },
        { name: '花生', category: '干货', quantity: 50, unit: 'g', quantity_text: '约半碗' },
        { name: '干辣椒', category: '调料', quantity: 10, unit: 'g', quantity_text: '约 5 个' },
      ],
      steps: [
        { action: '鸡丁腌制备用', duration_minutes: 3, heat_level: '中火' },
        { action: '爆香辣椒后下鸡丁炒熟', duration_minutes: 5, heat_level: '大火' },
      ] },
  },
];

function homeEnv() {
  const e = { ...process.env, USERPROFILE: HOME, HOME, ILIFE_CONFIG_DIR: '' };
  return e;
}

function cliWrite(params) {
  const r = spawnSync(process.execPath, [DIST_CLI, 'chef.recipe.write', '--params', JSON.stringify(params)], { env: homeEnv(), encoding: 'utf8' });
  return r;
}

function cliView(name) {
  const r = spawnSync(process.execPath, [DIST_CLI, 'chef.recipe.view', '--params', JSON.stringify({ name })], { env: homeEnv(), encoding: 'utf8' });
  return r;
}

function ensurePristine() {
  mkdirSync(SCRATCH, { recursive: true });
  copyFileSync(REAL_DB, DBFILE);
  const cfgDir = join(HOME, '.ilife');
  mkdirSync(cfgDir, { recursive: true });
  writeFileSync(join(cfgDir, 'chef.yaml'), 'db:\n  dir: "' + SCRATCH.replace(/\\/g, '/') + '"\n  name: "chef_data.db"\n', 'utf8');
}

async function runAll() {
  ensurePristine();
  const D = (p) => pathToFileURL(join(ROOT, 'packages', 'skill-chef', 'dist', p)).href;
  const { buildAddSuccessHtml, buildAddFailureHtml } = await import(D('add/index.js'));
  const rows = [];
  for (const c of CARDS) {
    // import_validation_failed 卡先走一次缺值失败，证明拦得住且无脏数据，再补齐重试走成功。
    if (c.id === 'import_validation_failed') {
      const bad = JSON.parse(JSON.stringify(c.params));
      delete bad.ingredients[1].quantity;
      const badR = cliWrite(bad);
      if (badR.status === 0) { console.error('FAIL 补齐卡的缺值预演本应失败却成功'); process.exit(1); }
      const viewBad = cliView(bad.name);
      if (viewBad.status === 0) { console.error('FAIL 缺值预演写进了半条脏数据：' + bad.name); process.exit(1); }
      const failHtml = buildAddFailureHtml({
        cardId: c.id, wakeWord: c.wake, operation: '导入食谱',
        reason: '食材须给数字用量，花生缺用量，已拦下，未写半条。',
        keyData: '菜名' + c.params.name + '，缺花生用量',
        nextStep: '补上花生用量数字后重试',
        missingSummary: '缺失字段已标红，补齐后重试才落库。维度表本期不写。',
        payloadText: JSON.stringify(bad).slice(0, 800),
        logText: '校验拒绝 · 未写库',
      });
      writeFileSync(join(SCRATCH, 't773-import-validation-failed-failure.html'), failHtml, 'utf8');
    }
    const r = cliWrite(c.params);
    if (r.status !== 0) { console.error('FAIL ' + c.id + ' 写库 exit=' + r.status + ' ' + (r.stderr || '').slice(0, 300)); process.exit(r.status ?? 1); }
    const v = cliView(c.params.name);
    if (v.status !== 0) { console.error('FAIL ' + c.id + ' 写后回读失败'); process.exit(1); }
    const data = JSON.parse(v.stdout).data.item;
    const reread = '行数 食材' + data.ingredients.length + ' 步骤' + data.steps.length + ' 首味' + (data.ingredients[0]?.name ?? '') + ' 用量' + (data.ingredients[0]?.quantity ?? '');
    const html = buildAddSuccessHtml({
      cardId: c.id, wakeWord: c.wake, sourceLabel: c.source, channelNote: c.channel,
      recipeName: data.name, recipeId: data.id, servings: data.servings, totalTime: data.total_time_minutes,
      ingredients: data.ingredients.map((g) => ({ name: g.name, quantity: g.quantity, unit: g.unit, quantity_text: g.quantity_text, category: g.category })),
      steps: data.steps.map((s) => ({ sequence: s.sequence, action: s.action, duration_minutes: s.duration_minutes, heat_level: s.heat_level })),
    });
    const out = join(SCRATCH, c.file);
    writeFileSync(out, html, 'utf8');
    const buf = readFileSync(out);
    const sha = createHash('sha256').update(buf).digest('hex');
    rows.push({ card: c.id, wake: c.wake, key: 'chef.recipe.write', params: c.params, file: out, exit: 0, bytes: buf.length, sha256: sha, reread });
    console.log(c.id + ' → exit=0 → ' + out + ' ＋ 写后回读（' + reread + '）');
  }
  const frag = rows.map((r) => ({ card: r.card, wake: r.wake, command: r.key, params: r.params, file: r.file, exit: r.exit, bytes: r.bytes, sha256: r.sha256 }));
  writeFileSync(FRAGMENT, JSON.stringify(frag, null, 2) + '\n', 'utf8');
  console.log('片段=' + FRAGMENT + ' 行数=' + frag.length);
}

function runFailCase() {
  const bad = { op: 'add', name: '反例缺字段菜', ingredients: [{ name: '鸡蛋' }], steps: [{ action: '打蛋' }] };
  const r = cliWrite(bad);
  if (r.status === 0) { console.error('FAIL 反例本应失败却成功'); process.exit(1); }
  const v = cliView(bad.name);
  if (v.status === 0) { console.error('FAIL 反例写进了半条脏数据'); process.exit(1); }
  console.log('反例 → exit=' + r.status + ' → 校验失败页（未写半条脏数据）');
}

function runCheck() {
  if (!existsSync(FRAGMENT)) { console.error('CHECK 片段缺失：' + FRAGMENT); process.exit(1); }
  const frag = JSON.parse(readFileSync(FRAGMENT, 'utf8'));
  console.log('片段行数＝' + frag.length + '（本票卡数＝' + CARDS.length + '）');
  if (frag.length !== CARDS.length) { console.error('CHECK 片段行数不对'); process.exit(1); }
  let vision = { defects: -1, note: '未跑视觉审查' };
  try { vision = JSON.parse(readFileSync(VISION_JSON, 'utf8')); } catch { /* 缺文件即红 */ }
  console.log('vision 审查缺陷 ' + (vision.defects ?? -1) + '（' + (vision.note ?? '') + '）');
  if (vision.defects !== 0) { console.error('CHECK vision 未清零'); process.exit(1); }
  console.log('CHECK PASS');
}

const mode = process.argv[2] ?? '';
if (mode === '--check') runCheck();
else if (mode === '--fail-case') runFailCase();
else await runAll();
