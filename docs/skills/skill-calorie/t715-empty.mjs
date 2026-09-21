/**
 * #715 空窗那一态：**CLI 到不了，只能走件直调**。
 *
 * 为什么另立一条路：票面判据说「每键按路由的唤醒词与参数（含窗口档位、**空窗那一态**）出全」。
 * 实测：五键的取数层在窗内零记录时一律**抛阻断**（`render/exercisePort.ts:77`／`:416` 与
 * `analysis/exerciseReview.ts:28` 的 `无运动记录：…`，CLI 报 `ERR 4 取数失败（缺失阻断）`），
 * **够不到**下面这段空窗装配代码（`buildCardioDoc`／`buildDistributionDoc`／`buildStrengthDoc`／
 * `buildTrendDoc`／`buildRecapDoc` 各自的 `hasRows === false` 那一支）。
 * ⇒ 空窗这一态用 CLI 出不出来，只能把五件直接调一遍，把它们的返回值当页产物逐字节比
 * （全文档，与 CLI 落盘的那份同构：都是 `assembleDocPage` 的整页串）。
 *
 * 两面都要：
 *   ① **反证**——空窗参数在 CLI 上必须仍是 `ERR 4`（不因为本窗搬迁而变成能出页或换失败码）；
 *   ② **直调**——上面那五个空视图各自装配一遍，逐字节比对。
 *
 * 本件同时打两个地址（`dist/render/` 与 `dist/exercise/`，存在哪个用哪个）：搬迁前只有一个存在，
 * 搬迁后仍是同一个 ⇒ 同一份脚本搬前搬后都能跑，比出来的字节才可比。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PKG = join(ROOT, 'packages/skill-calorie');
const require = createRequire(import.meta.url);

/** 本窗搬迁的那一件：搬迁前住 `dist/render/`，搬迁后住 `dist/exercise/`。两址都试。 */
const DOC_SITES = ['dist/exercise/sportPortDocs.js', 'dist/render/sportPortDocs.js'];
export const docSite = () => DOC_SITES.map((p) => join(PKG, p)).find((p) => existsSync(p)) ?? '';

/** 五页的空视图（形状照 `t576-n1n8.test.mjs` 的夹具，只留装配真的会读到的字段）。 */
export const EMPTY_VIEWS = {
  cardio: { start: '2024-03-01', end: '2024-03-07', rows: [], sessions: 0, totalMinutes: 0, totalDistanceKm: 0, avgPaceMinPerKm: null, byType: [] },
  distribution: { start: '2024-03-01', end: '2024-03-07', days: 7, activeDays: 0, sessions: 0, totalBurned: 0, buckets: [], intakeCal: null, tdeeTotal: null, deficit: null },
  strength: { start: '2024-03-01', end: '2024-03-07', rows: [], movementCount: 0, totalSets: 0, totalVolumeKg: 0, totalReps: 0, byMovement: [], trail: [] },
  trend: { start: '2024-03-01', end: '2024-03-07', days: [], activeDays: 0, totalMinutes: 0, totalBurned: 0, peak: null, weekly: [] },
  recap: {
    start: '2024-03-01', end: '2024-03-07', days: 7, sessions: 0, activeDays: 0,
    totalBurned: 0, totalMinutes: 0, avgBurnedPerSession: null, avgBurnedPerDay: null,
    byCategory: {}, byType: [], series: [], review: null,
  },
};

/**
 * 直调五件装配空窗页，返回逐条读数（`{ n, file, bytes, sha256, sha256_12 }`）。
 * 调用面只走 `pkg` 的 `dist`，不碰源码目录 —— 判据要的正是「编出来的产物」。
 */
export function renderEmptyViews(outDir) {
  const site = docSite();
  if (!site) return { rows: [], site: '', fails: DOC_SITES.map((p) => '缺产物：' + p) };
  const m = require(site);
  const mk = [
    ['E1-分布(空窗)', m.buildDistributionDoc, EMPTY_VIEWS.distribution],
    ['E2-力量(空窗)', m.buildStrengthDoc, EMPTY_VIEWS.strength],
    ['E3-有氧(空窗)', m.buildCardioDoc, EMPTY_VIEWS.cardio],
    ['E4-趋势(空窗)', m.buildTrendDoc, EMPTY_VIEWS.trend],
    ['E5-复盘(空窗)', m.buildRecapDoc, EMPTY_VIEWS.recap],
  ];
  mkdirSync(outDir, { recursive: true });
  const rows = [];
  const fails = [];
  for (const [n, fn, view] of mk) {
    let html;
    try {
      html = fn(view);
    } catch (err) {
      fails.push(`${n} 抛错：${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    if (typeof html !== 'string' || html.length === 0) { fails.push(`${n} 返回非字符串或空串`); continue; }
    const bytes = Buffer.byteLength(html, 'utf8');
    const sha256 = createHash('sha256').update(html, 'utf8').digest('hex');
    const probe = {
      doctype: /^\s*<!doctype html>/i.test(html.replace(/^\uFEFF/, '').slice(0, 300)),
      charset: /<meta[^>]+charset=["']?utf-8["']?/i.test(html),
      closed: /<\/html>\s*$/.test(html.replace(/^\uFEFF/, '')),
      noSlotResidue: !/\{\{[^}]*\}\}/.test(html),
    };
    if (!Object.values(probe).every(Boolean)) fails.push(`${n} 文档完整性断言不过：${JSON.stringify(probe)}`);
    writeFileSync(join(outDir, n + '.html'), html, 'utf8');
    rows.push({ n, file: n + '.html', bytes, sha256, sha256_12: sha256.slice(0, 12), probe });
  }
  return { rows, site, fails };
}

/** 反证：空窗参数在 CLI 上必须仍是 `ERR 4`（搬迁不许把「取数阻断」变成「出页」或换失败码）。 */
export function emptyWindowCliProbe(bin, dbDir, cases) {
  const fails = [];
  for (const [label, key, params] of cases) {
    const r = spawnSync(process.execPath, [bin, key, '--params', JSON.stringify(params)], {
      encoding: 'utf8', env: { ...process.env, USERPROFILE: dbDir, HOME: dbDir}, timeout: 60000,
    });
    const err = String(r.stderr || '');
    if (r.status !== 4 || !/ERR 4:/.test(err) || !/缺失阻断/.test(err)) {
      fails.push(`${label} 期望 exit=4 ＋ ERR 4 缺失阻断，实测 exit=${r.status} stderr=${err.slice(0, 160)}`);
    } else {
      console.log(`EMPTY-GUARD ${label} exit=4 ERR4=1 缺失阻断=1`);
    }
  }
  return fails;
}
