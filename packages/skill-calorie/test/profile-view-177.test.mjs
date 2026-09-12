/** #177 · 场景 07 基础信息 · 结果页（`查档案`）：六项指标齐全的完整文档。
 *
 * 票面要求的六项：BMI／BMR／TDEE／活动系数／创建时间／更新时间；另加「活动系数说明」。
 * 钉四件事：
 *  ① 结果页是**完整文档**（doctype／charset／样式／helpers／无残留标记），六项逐项在页上；
 *  ② 空库＝**既有缺失阻断口径**（exit 4、不落盘、stderr 写「未设档案」），本页不新造空库态；
 *  ③ 档案不全（缺体重）时**不编数字**：BMR／TDEE 写「—（缺体重，不算）」，页上不出现任何
 *     凭默认值算出的数（老件 `render_crud_view.py:60-70` 回落 30 岁／175 cm／70 kg 的算法不许回来）；
 *  ④ HELP 查找条目回**真实命令** `calorie-cmd-read calorie.view.profile`，不再是老 python 死命令。
 *
 * 运行：先 `pnpm build`，再 `node --test packages/skill-calorie/test/profile-view-177.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';

/** 已设档案那一份的种子：身高 175／年龄 30／性别 male／活动量 moderate；创建与更新时间写成定值，
 *  免得断言落在「今天」。 */
const PROFILE_SQL = "INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level, note, created_at, updated_at) "
  + "VALUES (1, 30, 'male', 175, 'moderate', '减脂期', '2026-08-01 09:00:00', '2026-08-20 10:30:00')";
/** 一条体重记录（`记体重` 那条命令写的形状：bmi 由它按当时身高考算后入库）。 */
const WEIGHT_SQL = "INSERT INTO weight_log (date, time, weight_kg, height_cm, bmi, note) "
  + "VALUES ('2026-09-10', '07:10:00', 70.2, 175, 22.9, '晨起空腹')";

/** 造库：`seeded` 有档案，`withWeight` 另加一条体重记录。 */
function mkDb(seeded, withWeight) {
  const dir = mkdtempSync(join(tmpdir(), 't177-view-'));
  const db = openDb(join(dir, DB_FILENAME));
  if (seeded) db.prepare(PROFILE_SQL).run();
  if (withWeight) db.prepare(WEIGHT_SQL).run();
  db.close();
  return dir;
}

/** 真 CLI 跑一条命令并落盘（文件态＝默认的三态交付）。 */
function runCli(dir, key, params) {
  const out = join(dir, key.replace(/\./g, '_') + '.html');
  const r = spawnSync(NODE_BIN, [BIN, key, '--params', JSON.stringify(params ?? {}), '--html', out], {
    encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, env: { ...process.env, SKILLS_DB_PATH: dir },
  });
  return {
    status: r.status,
    out,
    stderr: String(r.stderr || '').trim(),
    stdout: String(r.stdout || '').trim(),
    file: existsSync(out) ? readFileSync(out, 'utf8') : null,
  };
}

/** 完整文档五断言（沿 `wizard-86.test.mjs:53-59` 的判据 ＋ charset）。 */
function assertDocPage(html, what) {
  assert.ok(html !== null, what + ' 未落盘');
  assert.ok(html.startsWith('<!doctype html>'), what + ' 缺 doctype');
  assert.ok(html.includes('charset="utf-8"'), what + ' 缺 charset');
  assert.ok(html.includes('<style>'), what + ' 缺 style');
  assert.ok(html.includes('<script>'), what + ' 缺 helpers');
  assert.ok(html.includes('ilife-page'), what + ' 缺 page');
  assert.ok(!html.includes('<!--'), what + ' 有残留标记');
}

test('#177 查档案结果页：六项指标齐全的完整文档（BMI／BMR／TDEE／活动系数／创建时间／更新时间）', () => {
  const r = runCli(mkDb(true, true), 'calorie.view.profile', {});
  assert.equal(r.status, 0, 'exit ' + r.status + ' stderr=' + r.stderr.slice(-300));
  assertDocPage(r.file, 'calorie.view.profile');
  assert.ok(r.file.includes('基础信息 · 看档案'), '缺场景 07 眉标');
  assert.ok(r.file.length > 20000, '产物只有 ' + r.file.length + ' 字符，看着不像完整文档');

  // 六项：逐项在页上，且值对得上（BMR＝10×70.2＋6.25×175−5×30＋5＝1650.75→1651；
  // TDEE＝1650.75×1.55＝2558.66→2559；BMI 取记录里那条 22.9；创建／更新在档案现值表末两行）。
  for (const [what, needle] of [
    ['BMI', '22.9（正常）'],
    ['BMR', '1651 卡/天'],
    ['TDEE', '2559 卡/天'],
    ['活动系数', '×1.55'],
    ['创建时间', '2026-08-01 09:00:00'],
    ['更新时间', '2026-08-20 10:30:00'],
  ]) {
    assert.ok(r.file.includes(needle), '六项里的 ' + what + ' 没在页上（找不到「' + needle + '」）');
  }
  assert.ok(r.file.includes('档案度量（BMI／BMR／TDEE／活动系数）'), '缺度量那一节');
  assert.ok(r.file.includes('末两行＝创建时间／更新时间'), '档案现值表没写明末两行就是创建／更新时间');
  assert.ok(r.file.includes('活动系数说明（五档）'), '缺系数说明');
  assert.ok(r.file.includes('本档＝中度活动 ×1.55'), '系数说明没标出本档');
  for (const level of ['sedentary', 'light', 'moderate', 'active', 'very_active']) {
    assert.ok(r.file.includes(level), '系数说明缺档位 ' + level);
  }
  // 口径写在页上：BMR 那条列了口径，创建／更新写明是库内 UTC 原值。
  assert.ok(r.file.includes('Mifflin-St Jeor'), 'BMR 行缺口径');
  assert.ok(r.file.includes('库内原值（SQLite CURRENT_TIMESTAMP，UTC）'), '创建/更新缺口径');
  // 复制数据（#247 三格式）里也带上六项里的四个数，AI 复制即拿到。
  for (const pair of ['bmi: 22.9', 'bmr: 1651', 'tdee: 2559', 'activityFactor: 1.55']) {
    assert.ok(r.file.includes(pair), '复制数据缺 ' + pair);
  }
});

test('#177 空库沿用既有缺失阻断口径：exit 4、不落盘、说法写明「未设档案」', () => {
  const r = runCli(mkDb(false, false), 'calorie.view.profile', {});
  assert.equal(r.status, 4, '空库查档案应缺失阻断（exit 4），实测 ' + r.status);
  assert.ok(/未设档案/.test(r.stderr), 'stderr 没写清是「未设档案」：' + r.stderr.slice(-200));
  assert.ok(/缺失阻断/.test(r.stderr), 'stderr 没写明是缺失阻断：' + r.stderr.slice(-200));
  assert.equal(existsSync(r.out), false, '空库查档案不该落盘（本页不新造空库态）');
});

test('#177 档案不全（缺体重）时不许编数字：BMR／TDEE 写「缺体重，不算」', () => {
  const r = runCli(mkDb(true, false), 'calorie.view.profile', {});
  assert.equal(r.status, 0, 'exit ' + r.status + ' stderr=' + r.stderr.slice(-300));
  assertDocPage(r.file, '缺体重那份');
  assert.ok(r.file.includes('缺体重，不算'), '缺体重时 BMR／TDEE 没有明说「缺体重，不算」');
  assert.ok(r.file.includes('本次缺体重，缺项一律不编默认值'), '度量那一节的表说没写明缺项与口径');
  // 不许回落老件的默认体型（30 岁／175 cm／70 kg／male）算出数字：页上不该出现按 70 kg 算的 BMR 1755。
  assert.equal(r.file.includes('1755'), false, '出现了凭默认体重算出的 BMR（老件回落算法不该回来）');
  // 最近体重／BMI 两格如实写缺，不编。
  assert.ok(r.file.includes('无体重记录'), 'BMI 那格没写清为什么是空的');
});

test('#177 HELP 查找条目回真实命令（不再是老 python 死命令）', () => {
  const r = runCli(mkDb(true, true), 'calorie.help.lookup', { q: '查档案' });
  assert.equal(r.status, 0, 'exit ' + r.status + ' stderr=' + r.stderr.slice(-300));
  const env = JSON.parse(r.stdout);
  assert.ok(env.data.items.length >= 1, '查档案 应有命中');
  const hit = env.data.items.find((it) => it.wake_word === '查档案');
  assert.ok(hit, '命中里没有「查档案」：' + JSON.stringify(env.data.items.map((i) => i.wake_word)));
  assert.equal(hit.key, 'profile_view');
  assert.equal(hit.cli, 'calorie-cmd-read calorie.view.profile', 'HELP 查找回的不是真实命令');
  assert.equal(/python/i.test(hit.cli), false, 'HELP 查找仍回老 python 死命令');
});
