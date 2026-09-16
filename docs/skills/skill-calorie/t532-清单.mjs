#!/usr/bin/env node
/** #532 · 卡路里场景10（31 页）**序号清单生成器** —— 仓规 `docs/agents/视觉验收墙.md` §6.1 第 1 条。

 * ── 这一件解决什么 ────────────────────────────────────────────────────────────
 * §6.1：「**清单**：机器可读的『哪份是哪个产物的哪一类页』；没有清单就别让墙猜文件名。」
 * §6.1 第 2 条：「**同一个名字只在一处算出来**」。
 *
 * 本图的名字**只有一处**：`results.json`（由 `t532-run-all.mjs` 真跑 31 条命令时写出，
 * 每条的 `collectedPath` 就是盘上那份的名字）。本件把它**派生**成 `t532-清单.json`：
 * **两张墙与总索引都只读这一份**（各自算文件名＝全墙集体死链，§6.1 的警告）。
 *
 * ── 用法 ──────────────────────────────────────────────────────────────────────
 *   node docs/skills/skill-calorie/t532-清单.mjs <产物目录>
 * 读：<产物目录>/results.json        出：<产物目录>/t532-清单.json（**不带签名**的 UTF-8）
 * 打印：`清单 <N> 行；缺 <D> 件 -> 可发|逐件点名`，exit 0／1（缺件即红）。
 *
 * ── 也被 import ───────────────────────────────────────────────────────────────
 * `t532-wall.mjs` 与 `t532-gen-索引.mjs` 都 `import { readManifest, split }` 本件 ——
 * **同一份读法与同一份判据**，两份生成器不可能对「哪件在、哪件不在」有不同看法。
 */
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** 清单文件名：墙、索引、本件三处逐字相同。 */
export const MANIFEST = 't532-清单.json';

/** 页族：分组用。组序＝本数组序（预测族 → 报告族 → 缺口与别名族 是票面冻结的族名）。 */
export const FAMILIES = ['预测模拟族', '报告族', '缺口与别名族'];

/** 序号 → 页族。1–20 预测模拟（order393–412）；24–31 报告（order331–338）；21–23 缺口与两条别名。 */
export function familyOf(n) {
  const i = Number(n);
  if (i >= 1 && i <= 20) return '预测模拟族';
  if (i >= 24 && i <= 31) return '报告族';
  return '缺口与别名族';
}

/** 每格底下那句「**这一格该确认什么**」（§6.3 第 1 条）：先族内通例，再逐页点名。 */
const CHECK_ROW = {
  '01': '主角数字是否突出；日均缺口口径（#463）；页内导航承诺的小节是否真有可见标题（#520 R-60）',
  '02': '同上；30 天档轨迹一行是否只有周点、会不会被读成逐日',
  '03': '同上；90 天档数字位数变长后卡与数值列是否还对齐',
  '04': '同上；180 天档主角数字是否仍收得住',
  '05': '同上；「自定义时间」与 01–04 的页名差异是否看得出',
  '06': '目标值 65 kg 是否在主位；达成天数与轨迹是否对得上；日均缺口口径（#463）',
  '07': '轨迹表 caption 声明的天数与表内行数是否同步（#455）；日均缺口口径（#463）',
  '08': '同上；与 07 除参数外是否真不一样（否则是同页复用）',
  '09': '同上；-700 档的告警话有没有（激进档是否有提示）',
  '10': '同上；「30 天减 2 kg」的目标值与轨迹末值是否对得上',
  '11': '同上；60 天档表行数是否与 caption 同步（#455）',
  '12': '同上；90 天档（本页 #455 影响面最大，末行日期与声明天数差一行是主症）',
  '13': '同上；45 天档（非整周档）末行日期口径是否与 caption 一致（#455）',
  '14': '三列表（日期／预测摄入／预计区间）在 390 宽下是否读得开；caption 天数与行数是否同步',
  '15': '同上；30 天档区间列是否换行压字',
  '16': '同上；90 天档行数最多（44 格）时的表高与折行',
  '17': '同上；「自定义」与 14–16 的页名差异是否看得出',
  '18': '本页无可见小节标题（01–17 有「参数、概览、数据与日志」三节）——同族是否同档（#520 R-60）',
  '19': '同 18；另「缺口＝(TDEE＋运动消耗)−摄入」这一行的 TDEE 是否真体重口径（#463）',
  '20': '同 18；稳定性读数的表/图是否互相对不上',
  '21': '与 22 同字节（同一产物两个别名，见索引页）；缺口构成行口径（#463）；7 天表在 390 宽下是否卡片化',
  '22': '与 21 同字节；页内 h1 不含「看」字，入口身份靠本格标签与索引页「入口」列承担（#573 的 S3 落点）',
  '23': '与 01 同字节；页内 h1 不含「看」字，入口身份靠本格标签与索引页「入口」列承担（#573 的 S3 落点）',
  '24': '数值标签是否互相压字（#520 R-57）；分级表缺值是否统一写 —（R-53）；表与卡左缘是否共线（R-61）',
  '25': '口径表的单位写法是否与同族一致（R-56）；数值列是否等宽右对齐；图右端标签是否与末点相接（R-48）',
  '26': '危险信号表的图标是否已被换成可读文字标签；口径表单位写法（R-56）',
  '27': '「是否达标」列在 390 宽下是否还读得开；缺值是否写 —（R-53）',
  '28': '同上；日均总消耗与日均缺口两行的口径是否一致（#463 命中页）',
  '29': '仪表与读数卡是否重复承载同一读数（#520 R-49）；分项表数值列对齐',
  '30': '柱状图逐柱数值标签是否互相压字（R-57，本族最重的一条）；评分序列表',
  '31': '5 张 KPI 里有多少张其实是窗口元信息（#520 R-50）；方向列与 Δ 是否同义重复（R-51）；日均小数位是否统一（R-52）',
};
const CHECK_FAMILY = {
  '预测模拟族': '主角数字是否突出；轨迹 caption 声明的天数与表内行数是否同步（#455）；日均缺口口径（#463）',
  '报告族': '图/表的数值标签是否压字；缺值是否统一写 —；单位写法是否与同族一致；表与卡左缘是否共线',
  '缺口与别名族': '别名页与本体是否同字节；缺口构成口径；窄屏表格是否卡片化',
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const die = (code, msg) => { console.error(msg); process.exit(code); };

/**
 * 读清单（墙与索引共用这一处）。**带签名（BOM）即报错** —— §7：「清单读出来 `Unexpected token` 就是它」。
 * 返回 `{ path, rows }`；rows 逐条补上 seq／family／check。
 */
export function readManifest(dir) {
  const p = join(dir, MANIFEST);
  if (!existsSync(p)) die(2, `没有清单：${p}（先跑 node docs/skills/skill-calorie/t532-清单.mjs <产物目录>）`);
  const text = readFileSync(p, 'utf8');
  if (text.charCodeAt(0) === 0xfeff) die(2, `清单带了签名（BOM）：${p} —— 请存不带签名的 UTF-8（§7）`);
  let json;
  try { json = JSON.parse(text); } catch (err) { die(2, `清单解析失败：${p} —— ${err.message}`); }
  const raw = Array.isArray(json) ? json : json.rows;
  if (!Array.isArray(raw) || raw.length === 0) die(2, `清单没有 rows：${p}`);
  return { path: p, rows: raw.map(decorate) };
}

/** 逐条补上派生字段（族／该确认什么）。清单里已写死的值优先，派生只做兜底。 */
function decorate(r) {
  const seq = String(r.seq ?? r.n ?? '').padStart(2, '0');
  return {
    ...r, seq,
    file: r.file,
    wake: r.wake,
    family: r.family ?? familyOf(seq),
    check: r.check ?? CHECK_ROW[seq] ?? CHECK_FAMILY[familyOf(seq)],
  };
}

/**
 * 判据一 `dropped` —— 清单点名的每一份都得在盘上，**不许静默剔**（§6.2：先按「盘上有没有」
 * 过滤再只查页面引用，就是 t154 那个假绿灯；缺件必须报出来）。
 * 顺带按盘上长度核一遍字节（对不上也算 dropped：文件被换过）。
 */
export function split(dir, rows) {
  const kept = [];
  const dropped = [];
  for (const r of rows) {
    if (!r.file) { dropped.push({ ...r, why: '这一行没有 file 字段' }); continue; }
    const p = join(dir, r.file);
    if (!existsSync(p)) { dropped.push({ ...r, why: '盘上没有这个文件' }); continue; }
    const size = statSync(p).size;
    if (r.bytes !== undefined && size !== r.bytes) {
      dropped.push({ ...r, why: `盘上字节 ${size} 与清单 ${r.bytes} 不符（被换过？）` });
      continue;
    }
    kept.push({ ...r, bytes: size });
  }
  kept.sort((a, b) => Number(a.seq) - Number(b.seq));
  return { kept, dropped };
}

/* ── 直接跑（不 import）时：派生清单 ─────────────────────────────────────────── */
const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const dir = resolve(process.argv[2] ?? '.scratch/t532');
  if (!existsSync(dir)) die(2, `没有产物目录：${dir}`);
  const rp = join(dir, 'results.json');
  if (!existsSync(rp)) die(2, `没有真跑读数：${rp}（清单的唯一出处是 t532-run-all.mjs 写出的 results.json）`);
  const res = JSON.parse(readFileSync(rp, 'utf8').replace(/^\uFEFF/, ''));
  if (!Array.isArray(res.runs) || res.runs.length === 0) die(2, `${rp} 没有 runs`);

  const rows = res.runs.map((r) => {
    const seq = String(r.n).padStart(2, '0');
    const file = basename(r.collectedPath);
    return {
      seq, n: seq, file,
      wake: r.wake, key: r.key, order: r.order, list: r.list,
      cli: r.cliRegistered, params: r.params,
      family: familyOf(seq),
      kind: familyOf(seq),                       // 墙按 kind 分组（与索引同族名）
      check: CHECK_ROW[seq] ?? CHECK_FAMILY[familyOf(seq)],
      bytes: r.bytes, sha256_12: r.sha256_12,
      title: r.probe?.title ?? null,
    };
  });

  const out = {
    ticket: '532',
    purpose: '卡路里场景10（31 页）视觉验收墙的序号清单：墙与索引共用这一份，不许各自算文件名',
    source: { results: rp, runAt: res.runAt, bin: res.bin, routesSource: res.routesSource, numbering: res.numbering },
    rows,
  };
  writeFileSync(join(dir, MANIFEST), JSON.stringify(out, null, 2) + '\n', 'utf8');

  const text = readFileSync(join(dir, MANIFEST), 'utf8');
  if (text.charCodeAt(0) === 0xfeff) die(2, `写出来的清单带了签名：${MANIFEST}`);
  const { kept, dropped } = split(dir, readManifest(dir).rows);
  const bad = dropped.map((r) => `${r.file ?? '(无 file 字段)'}（第 ${r.seq} 行：${r.why}）`);
  console.log(`清单 ${MANIFEST}：${rows.length} 行；盘上对得上 ${kept.length} 件；`
    + (bad.length === 0 ? '缺 0 件 -> 可发' : `缺 ${bad.length} 件 -> ${bad.join('、')}`));
  if (bad.length) { for (const b of bad) console.error('缺失 ' + b); process.exit(1); }
}
