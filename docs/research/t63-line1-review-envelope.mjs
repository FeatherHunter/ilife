// #63 对抗式审查席 · 探针④：envelope 逐字抽查（2 条）。
// 复现被审脚本的种子库与 spawn 口径，把**完整 stdout envelope** 原样打出，供逐字核对 ②③⑤⑥ 断言。
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb, DB_FILENAME } from '../../packages/skill-calorie/dist/index.js';
import { addPhotos } from '../../packages/skill-calorie/dist/fetch/photos.js';
import { WAKE_ROUTES } from '../../packages/skill-calorie/dist/triggers/routing.js';
import { PLACEHOLDER_SUBSTITUTIONS, seedFull } from './t81-seed.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
const workDir = mkdtempSync(join(tmpdir(), 't63-review-env-'));
const photosDir = join(workDir, 'photos'); const srcDir = join(workDir, 'src'); const tplDir = join(workDir, 'tpl');
for (const d of [photosDir, srcDir, tplDir]) mkdirSync(d, { recursive: true });
const srcFile = (n) => { const p = join(srcDir, n); writeFileSync(p, 'seed-' + n); return p; };
{
  const db = openDb(join(tplDir, DB_FILENAME));
  seedFull(db);
  addPhotos(db, photosDir, { srcPaths: [srcFile('a.jpg'), srcFile('b.jpg')], tag: '正面', today: '2026-09-06', nowTime: '08:00:00' });
  db.close();
}
const templateDb = join(tplDir, DB_FILENAME);
PLACEHOLDER_SUBSTITUTIONS.set('<照片路径>', srcFile('placeholder.jpg'));
const tokenize = (cli) => { const out = []; let cur = ''; let q = null;
  for (const ch of String(cli)) { if (q) { if (ch === q) q = null; else cur += ch; } else if (ch === "'" || ch === '"') q = ch; else if (ch === ' ') { if (cur) { out.push(cur); cur = ''; } } else cur += ch; }
  if (cur) out.push(cur); return out; };
const WORDS = ['看今日主页', '记一餐'];
for (const w of WORDS) {
  const r = WAKE_ROUTES.find((x) => x.wakeWord === w);
  const dir = join(workDir, 'run-' + w); mkdirSync(dir, { recursive: true });
  copyFileSync(templateDb, join(dir, DB_FILENAME));
  const res = spawnSync(process.execPath, [CLI, ...tokenize(r.cli).slice(1)], {
    encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_PHOTOS_DIR: photosDir },
  });
  const env = JSON.parse(String(res.stdout || '').trim());
  const p = env.delivery?.path;
  const bytes = p && existsSync(p) ? statSync(p).size : -1;
  console.log(`\n## 逐字抽查：${w}（exit=${res.status}）`);
  console.log('```json');
  console.log(JSON.stringify(env, null, 2));
  console.log('```');
  console.log(`核对：② key 一致=${env.key === r.key} ③ mode='file'=${env.delivery?.mode === 'file'} `
    + `④ path 绝对且落盘非空=${!!p && p === env.delivery.path && bytes > 0} `
    + `⑤ delivery.bytes=落盘字节=${env.delivery?.bytes === bytes}(${env.delivery?.bytes}/${bytes}) `
    + `⑥ data.output=delivery.path=${env.data?.output === p} `
    + `⑨ 五字段齐备=${['version', 'skill', 'shape', 'key', 'data'].every((k) => k in env)}`);
}
console.log(`\nSUMMARY spawn=${WORDS.length * 2} 次（含每词 1 次 CLI；无 smoke）`);
