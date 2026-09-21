/** #551 · 饮食页副题与按日汇总 caption 去文字串改形状（Part of #162）。
 *
 * 范围（本票写集）：`src/render/dietDocs.ts` 的副题与 caption 一带。
 * 副题原来一句长串（窗口 ~ 共N天，有记录M天、K条，合计X卡，日均Y卡）＋ caption 原来一句括号串
 * （按日汇总（起 ~ 止，无记录日写 —，不断 0））——事实挤在分隔符串里，窄屏难读。
 * 改后：副题只留一句结论（本窗合计 X 卡）；窗口与五事实（共N天／有记录／条数／合计／日均）
 * 落窗口条＋事实条形状；caption 只留「按日汇总」，口径注另起口径行。
 *
 * 判据（探针 `scripts/audit-separators.mjs` R1/R2/R3，L6 `<title>` 误报除外）：
 *   R1 含 `·`；R2 含 `；`；R3 同一并列分隔符切出连续 ≥3 段非空且每段 ≤40 字
 *   （并列集 `· ； ; ｜ | ／ / 、 ＋`，与判据工具逐字同源，此处只复述判定）。
 * 本件只判**副题节点与 caption 节点**（眉标／口径行的债归别票，不管）。
 *
 * 运行：先 `pnpm build`（本件读 `dist/`），再 `node --test packages/skill-calorie/test/551-diet-subtitle.test.mjs`。
 */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { configTestBase } from './helpers/config-test.mjs';

// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const BUILD_VIEW = (await import(pathToFileURL(join(PKG, 'dist', 'render', 'dietDocs.js')).href)).buildViewDietDoc;

/* ── 探针（与 audit-separators.mjs 同源复述，只取 R1/R2/R3）── */
const MAXSEG = 40;
const PARALLEL = ['·', '；', ';', '｜', '|', '／', '/', '、', '＋'];
function parallelRun(text) {
  for (const sep of PARALLEL) {
    if (!text.includes(sep)) continue;
    const parts = text.split(sep);
    let i = 0;
    while (i < parts.length) {
      if (parts[i].trim() === '' || parts[i].trim().length > MAXSEG) { i += 1; continue; }
      let end = i;
      while (end + 1 < parts.length
        && parts[end + 1].trim() !== '' && parts[end + 1].trim().length <= MAXSEG) end += 1;
      if (end - i + 1 >= 3) return { sep, n: end - i + 1 };
      i = end + 1;
    }
  }
  return null;
}
function judgeR123(text) {
  const tags = [];
  if (text.includes('·')) tags.push('R1');
  if (text.includes('；')) tags.push('R2');
  if (parallelRun(text) !== null) tags.push('R3');
  return tags;
}
const dec = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
/** 副题节点文本（`<p class="…subtitle">`，转义文本无内层标签）。 */
function subtitleOf(html) {
  const m = /<p class="ilife-block-page-shell-subtitle">([\s\S]*?)<\/p>/.exec(html);
  assert.ok(m, '产物里找不到副题节点');
  return dec(m[1]).replace(/\s+/g, ' ').trim();
}
/** 全部 caption 节点文本。 */
function captionsOf(html) {
  return [...html.matchAll(/<caption class="[^"]*">([\s\S]*?)<\/caption>/g)]
    .map((m) => dec(m[1]).replace(/\s+/g, ' ').trim());
}
/** 可见文本（剥 head/style/script/注释/标签；与 visible-text-probe 同口径）。 */
function visibleText(html) {
  return html.replace(/<head[\s\S]*?<\/head\s*>/gi, ' ')
    .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/* ── 夹具（照 diet-list-t271.test.mjs 的 sampleInput：3 天窗／2 天有数／2 条）── */
function sampleInput(extra = {}) {
  const days = [
    { date: '2026-09-05', calories: 1500, protein: 90, carbs: 180, fat: 50, calorieGoal: 1800 },
    { date: '2026-09-06', calories: null, protein: null, carbs: null, fat: null, calorieGoal: 1800 },
    { date: '2026-09-07', calories: 1700, protein: 100, carbs: 200, fat: 55, calorieGoal: 1800 },
  ];
  const meals = [
    { date: '2026-09-05', time: '08:10:45', food_name: '燕麦粥', grams: 60, calories: 320, protein: 12, carbs: 52, fat: 6, note: '少糖' },
    { date: '2026-09-07', time: null, food_name: '鸡胸饭', grams: 300, calories: 560, protein: 42, carbs: 65, fat: 12, note: null },
  ];
  return {
    overview: {
      start: '2026-09-05', end: '2026-09-07', days: 3, loggedDays: 2, totalCalories: 3200,
      avgCalories: 1600, calorieGoal: 1800, trend: { summary: { trend: '平稳', avg: 1600 } },
    },
    dist: {
      totalCalories: 880, slices: [
        { meal: '早餐', count: 1, calories: 320, pct: 36 },
        { meal: '午餐', count: 1, calories: 560, pct: 64 },
      ],
    },
    distDate: '2026-09-07', days, meals, mealTotal: meals.length, mealsTruncated: false,
    ...extra,
  };
}
function emptyInput() {
  return sampleInput({
    days: [{ date: '2026-09-07', calories: null, protein: null, carbs: null, fat: null, calorieGoal: 1800 }],
    meals: [], mealTotal: 0,
    overview: {
      start: '2026-09-07', end: '2026-09-07', days: 1, loggedDays: 0, totalCalories: 0,
      avgCalories: null, calorieGoal: 1800, trend: { summary: { trend: '平稳', avg: 0 } },
    },
    dist: { totalCalories: 0, slices: [{ meal: '早餐', count: 0, calories: 0, pct: 0 }] },
  });
}

test('#551 ① 副题节点 R1/R2/R3 零命中（有数＋空窗；L6 title 除外，title 住 head 不进本判）', () => {
  for (const [name, html] of [['有数', BUILD_VIEW(sampleInput())], ['空窗', BUILD_VIEW(emptyInput())]]) {
    const sub = subtitleOf(html);
    const tags = judgeR123(sub);
    console.log('T551 SUB ' + name + ' 副题=' + sub + ' 命中=' + (tags.join('+') || '0'));
    assert.deepEqual(tags, [], name + '窗副题节点仍有分隔符债：' + tags.join('+') + '：' + sub);
  }
});

test('#551 ② caption 节点 R1/R2/R3 零命中且只留「按日汇总」，口径注另起形状行', () => {
  const html = BUILD_VIEW(sampleInput());
  const caps = captionsOf(html);
  assert.ok(caps.includes('按日汇总'), '按日汇总 caption 丢了，实况：' + JSON.stringify(caps));
  for (const c of caps) {
    const tags = judgeR123(c);
    console.log('T551 CAP caption=' + c + ' 命中=' + (tags.join('+') || '0'));
    assert.deepEqual(tags, [], 'caption 节点仍有分隔符债：' + tags.join('+') + '：' + c);
  }
  assert.ok(!caps.some((c) => /[~～]/.test(c)), 'caption 里还有 ~ 顶替文字：' + JSON.stringify(caps));
  const vis = visibleText(html);
  assert.ok(vis.includes('无记录日写 — 不断 0'), '口径事实丢了（无记录日写 — 不断 0 必须另起形状行保留）');
});

test('#551 ③ 五事实屏上可读：窗口＋共N天／有记录／条数／合计／日均都在，且落形状不在串里', () => {
  const html = BUILD_VIEW(sampleInput());
  const vis = visibleText(html);
  for (const fact of ['2026-09-05', '2026-09-07', '共 3 天', '有记录', '2 天', '2 条', '合计', '3200 卡', '日均', '1600 卡']) {
    assert.ok(vis.includes(fact), '五事实缺：' + fact);
  }
  for (const cls of ['diet-window', 'diet-facts', 'diet-fact-v']) {
    assert.ok(html.includes(cls), '形状缺（事实还挤在文字串里）：' + cls);
  }
  console.log('T551 FACTS 五事实齐＋形状在');
});

test('#551 ④ 390 无横滑（静态形状守卫：flex 折行＋820 纵列＋无定宽；真浏览器量尺见证据件）', () => {
  const html = BUILD_VIEW(sampleInput());
  assert.ok(html.includes('flex-wrap:wrap'), '形状 CSS 缺 flex-wrap（窄屏会把一行顶出 390）');
  assert.ok(html.includes('max-width:820px'), '形状 CSS 缺 820 纵列（窄屏塌列无落点）');
  const dietCss = (html.match(/<style>[\s\S]*?<\/style>/g) ?? []).join(' ');
  assert.ok(!/\.diet-[^{]*\{[^}]*\bwidth\s*:\s*\d+px/.test(dietCss), '形状里出现定宽 px（390 横滑之源）');
  assert.ok(html.includes('data-label="日期"'), '按日汇总表缺 data-label（390 卡片化无落点，公共层既有件）');
});

test('#551 变异电池（字串级）：塞回 ·／；／三段并列 ⇒ 守卫必红；还原 ⇒ 必绿', () => {
  const sub = subtitleOf(BUILD_VIEW(sampleInput()));
  assert.deepEqual(judgeR123(sub), [], '原样副题应当零命中');
  const mut1 = sub.slice(0, 4) + ' · ' + sub.slice(4);
  assert.ok(judgeR123(mut1).includes('R1'), '变异①：塞回 · 串后守卫没红');
  const mut2 = sub + '；共 3 天';
  assert.ok(judgeR123(mut2).includes('R2'), '变异②：塞回 ； 串后守卫没红');
  const mut3 = '窗口共 3 天、有记录 2 天、共 2 条';
  assert.ok(judgeR123(mut3).includes('R3'), '变异③：塞回三段 、 并列后守卫没红');
  assert.deepEqual(judgeR123(sub), [], '还原后守卫没绿');
  console.log('T551-MUT 塞·=' + judgeR123(mut1).join('+') + ' 塞；=' + judgeR123(mut2).join('+')
    + ' 塞三段=' + judgeR123(mut3).join('+') + ' 还原=0');
});
