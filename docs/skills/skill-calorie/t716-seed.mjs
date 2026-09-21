/**
 * #716 重出器的种子库（本票独占草稿目录）。
 *
 * 口径：**确定性**——同一份源码任何时候重建这份库，读出的行与字节都一样。
 * 日期靠时钟钉子（`freeze.mjs` 钉 2026-09-18T12:00:00Z）而不是 `new Date()`；
 * 文件内容由固定字节派生，不用随机数。
 *
 * 为什么要有值：本票判据面里 `calorie.view.gif-planner` 与 `calorie.photo.list` 两支**只在库里有照片时**
 * 才走得到「有候选／有选中／有缺失／有裁剪」那些分支；空库只跑得到空态那一支，覆盖不到被搬的那件
 * 真正在产出的分支。
 *
 * 为什么走写出口而不是直接 INSERT：照片行的字段口径（标签规范化、同日序号编名、拷进照片目录、
 * 软删位）住在写处理函数里，直接 INSERT 等于把那些口径在重出器里再抄一遍——抄的这份迟早与正本走散，
 * 而本重出器要判的恰恰是「搬迁前后逐字节相同」，种子口径漂移会把判据搅成假红。
 *
 * **缺失位也要造**：`toCard()` 的 `fileExists` 是页面上的一格，只在「库里有一行、照片目录里没有那个文件」
 * 时才出得来 ⇒ 种完删掉其中一张，逼出那一支。
 *
 * 用法：node .scratch/t716/seed.mjs [--dir <配置目录>]
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const require = createRequire(import.meta.url);
const { calorieConfigDir, freezeClock } = require(join(ROOT, 'packages/skill-calorie/test/helpers/config-test.mjs'));

const argOf = (name, dflt) => { const i = process.argv.indexOf(name); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt; };
const DIR = join(ROOT, argOf('--dir', '.scratch/t716/db'));
const PHOTOS = join(DIR, 'photos');
const SRCPHOTOS = join(DIR, 'src-photos');
const TODAY = '2026-09-18';
const BIN = join(ROOT, 'packages/skill-calorie/dist/cli/cmd_read.js');

/** 一张 1×1 的合法 PNG（固定字节，不用随机数）。 */
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

export function seed(dir = DIR) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, 'photos'), { recursive: true });
  mkdirSync(join(dir, 'src-photos'), { recursive: true });

  const photos = join(dir, 'photos');
  const srcPhotos = join(dir, 'src-photos');
  const files = [];
  for (const name of ['p1.png', 'p2.png', 'p3.png', 'p4.png']) {
    const p = join(srcPhotos, name);
    writeFileSync(p, PNG_1X1);
    files.push(p);
  }

  // #754：隔离＝家目录注入——`calorieConfigDir(dir, {…})` 把 `dir` 当家目录并落 `<dir>/.ilife/calorie.yaml`，
  // 两格环境都指过去（win32 认 USERPROFILE、POSIX 认 HOME）。
  const cfgHome = calorieConfigDir(dir, { photos: { dir: photos } });
  const env = { ...process.env, ...freezeClock(TODAY), USERPROFILE: cfgHome, HOME: cfgHome };
  const out = join(HERE, 'tmp-out', 'seed.html');
  mkdirSync(dirname(out), { recursive: true });
  const run = (key, params, tag) => {
    const r = spawnSync(process.execPath, [BIN, key, '--params', JSON.stringify(params), '--html', out], {
      encoding: 'utf8', env, timeout: 120000,
    });
    if (r.status !== 0) {
      console.log(`SEED-FAIL ${tag} ${key} exit=${r.status} stderr=${String(r.stderr || '').slice(-400)}`);
      process.exitCode = 1;
    }
    return r.status === 0;
  };

  run('calorie.photo.add', { srcPaths: [files[0], files[1]], tag: '正面' }, '正面×2');
  run('calorie.photo.add', { srcPaths: [files[2]], tag: '背面' }, '背面×1');
  run('calorie.photo.add', { srcPaths: [files[3]], tag: '正面' }, '正面×1');

  // 缺失位：库里有第 2 张那一行，照片目录里把文件删掉 ⇒ `toCard` 的 fileExists=false 那一支有页可看。
  rmSync(join(photos, '2026-09-18_002.png'), { force: true });

  console.log(`SEED 照片 4 行（正面 3／背面 1，其中 1 张从照片目录删除以逼出缺失位）→ ${dir}`);
  return dir;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) seed();
