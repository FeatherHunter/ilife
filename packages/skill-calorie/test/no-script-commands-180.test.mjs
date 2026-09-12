/** #180 · 防回退断言：场景数据里不得再出现脚本命令。
 *
 * 口径：判定串与 `docs/skills/skill-calorie/py-hardcode-scan.md:4` 同一串，**只在本文件写一处**。
 * 范围：三个字段——`main_prompt.cli`／`data_source`／`variants[].cli`；数据源是 10 个场景文件的
 * 逐行 JSON 原文（`src/triggers/scene-01-home.ts` … `scene-10-analysis.ts`，每条一行），
 * **不经 dist**——构建过期不该让这条断言失去鉴别力。
 *
 * 本文件今天是**先红**的账目：清数据那一步做完之前它必须红（红的条数＝待清条数）。
 * 运行：node --test packages/skill-calorie/test/no-script-commands-180.test.mjs
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const HERE = dirname(fileURLToPath(import.meta.url));
const TRIGGER_DIR = join(HERE, '..', 'src', 'triggers');

/** 判定串（与 `py-hardcode-scan.md:4` 同一串）：python ／ .py ／ scripts/ ／ mavis ／ mmx。 */
const SCRIPT_CMD = /python3?\s|\.py\b|scripts\/|mavis\s|mmx\s/;

/** 10 个场景数据文件（每条一行 JSON，顺序 01→10）。 */
const SCENE_FILES = [
  'scene-01-home.ts',
  'scene-02-diet.ts',
  'scene-03-weight.ts',
  'scene-04-exercise.ts',
  'scene-05-workout.ts',
  'scene-06-goal.ts',
  'scene-07-profile.ts',
  'scene-08-body.ts',
  'scene-09-photo.ts',
  'scene-10-analysis.ts',
];

/** 场景号（`scene-01-home.ts` → `01-home`）。 */
const sceneNo = (file) => file.replace(/^scene-/, '').replace(/\.ts$/, '');

/** 逐行读一个场景文件的条目：只认以 `{"category"` 起头的整行 JSON。 */
function recordsOf(file) {
  return readFileSync(join(TRIGGER_DIR, file), 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('{"category"'))
    .map((l) => JSON.parse(l.endsWith(',') ? l.slice(0, -1) : l));
}

/** 受管的三个字段（缺字段／非字符串一律跳过）。 */
function watchedFields(record) {
  const out = [['main_prompt.cli', record.main_prompt?.cli], ['data_source', record.data_source]];
  (record.variants ?? []).forEach((v, i) => out.push([`variants[${i}].cli`, v.cli]));
  return out.filter(([, v]) => typeof v === 'string');
}

test('#180 判定串有鉴别力（旧脚本命中、新命令形态不命中）', () => {
  assert.ok(SCRIPT_CMD.test('python scripts/render_home.py --chain "1.识别→2.读DB聚合→3.渲染"'), 'python 串应命中');
  assert.ok(SCRIPT_CMD.test('mmx calorie_query --mode today'), 'mmx 串应命中');
  assert.ok(SCRIPT_CMD.test('mavis diet add'), 'mavis 串应命中');
  assert.equal(SCRIPT_CMD.test('calorie-cmd-read calorie.view.home'), false, '本仓命令形态不该命中');
});

test('#180 场景数据的三个字段里不得再出现脚本命令（今天必红：待清账目）', () => {
  const hits = [];
  const perScene = new Map();
  let records = 0;
  for (const file of SCENE_FILES) {
    const scene = sceneNo(file);
    for (const record of recordsOf(file)) {
      records += 1;
      for (const [field, value] of watchedFields(record)) {
        if (!SCRIPT_CMD.test(value)) continue;
        hits.push({ scene, wake: record.wake_word, field, value });
        perScene.set(scene, (perScene.get(scene) ?? 0) + 1);
      }
    }
  }
  // 解析到的条目数先钉住：格式走样导致空转时，上面那份账就成了假账。
  assert.equal(records, 436, '场景数据条目数（10 文件逐行解析所得）');
  if (hits.length === 0) return;
  const byField = (field) => hits.filter((h) => h.field === field).length;
  const sceneLines = [...perScene].map(([scene, n]) => `${scene} ${n}`).join('、');
  const headLines = [...perScene].flatMap(([scene]) => hits
    .filter((h) => h.scene === scene)
    .slice(0, 2)
    .map((h) => `  ${h.scene}｜${h.wake}｜${h.field}｜${h.value}`));
  assert.equal(
    hits.length,
    0,
    `场景数据里仍有脚本命令：命中 ${hits.length} 条`
      + `（main_prompt.cli ${byField('main_prompt.cli')}`
      + ` ／ data_source ${byField('data_source')}`
      + ` ／ variants[].cli ${hits.length - byField('main_prompt.cli') - byField('data_source')}）\n`
      + `按场景计数：${sceneLines}\n`
      + `前几条：\n${headLines.join('\n')}`,
  );
});
