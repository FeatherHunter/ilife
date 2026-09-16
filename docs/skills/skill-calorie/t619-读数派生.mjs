#!/usr/bin/env node
/** #619 · 场景02验收墙**读数派生件**（本票入仓的可复跑读数器；只读工作区、不落盘）。
 *
 *  为什么要有这一件：票 #619 的机器判据来自三份原始读数（门禁 JSON／自适应 JSON／锁运行记录），
 *  判读口径必须可独立复核 ⇒ 把「怎么把原始读数分成 83 产物页 vs 墙 4 件、怎么把命中拆成脚注 vs 非脚注」
 *  落成一件脚本，读数由此派生（不是手抄）。
 *
 *  子命令（在仓库根跑）：
 *    gate <audit.json>       门禁读数：83 产物页节点命中按 owner 拆「来源脚注（`ilife-block-caliber`）／非脚注」，
 *                            并给 R1–R7 分布、墙 4 件单列读数。票面硬判据＝**非脚注命中 0**。
 *    responsive <measure.json>  四档自适应读数：83 产物页逐档 `scrollWidth − innerWidth`（应为 0）
 *                            ＋命令行 `--exclude` 点名的墙 4 件单列（非零逐格点名页码与像素）。
 *    dsig                    上一席点名的 D2／D3／D4／D5 四条：陈旧墙快照（`.scratch/t619/before2/`）
 *                            与当刻墙逐条对读（题名／`-N 克`／`卡/餐`／来源行取值）。
 *    window                  协议 §2.4 对账：本席窗口内 `ticket=619` 的运行条目逐条列出，并标出未声明条目。
 *
 *  用法示例：
 *    node docs/skills/skill-calorie/t619-读数派生.mjs gate .scratch/t619/s2-gate-83.json
 *    node docs/skills/skill-calorie/t619-读数派生.mjs responsive .scratch/t619/s2-responsive.json
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const WALL = 'docs/skills/skill-calorie/scene02-验收墙';
const OLD = '.scratch/t619/before2';
const FOOTNOTE = 'ilife-block-caliber';
const WALL_FILES = new Set(['总索引.html', '桌面墙-1280.html', '手机墙-390.html', '链路总表.html']);
const RULES = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7'];
const vis = (h) => h.replace(/<(style|script)[\s\S]*?<\/\1>/g, '').replace(/<[^>]*>/g, ' ')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

function gate(path) {
  const j = JSON.parse(readFileSync(path, 'utf8'));
  const pages = j.rows.filter((r) => !WALL_FILES.has(r.name));
  const walls = j.rows.filter((r) => WALL_FILES.has(r.name));
  const byOwner = new Map();
  let footnote = 0; let other = 0;
  const offenders = [];
  for (const r of pages) {
    for (const h of r.node.hits) {
      byOwner.set(h.owner, (byOwner.get(h.owner) ?? 0) + 1);
      if (h.owner === FOOTNOTE) footnote += 1;
      else { other += 1; offenders.push(r.name + ' owner=' + h.owner + ' ' + JSON.stringify(h.text.slice(0, 60))); }
    }
  }
  console.log('GATE-SUMMARY ' + path);
  console.log('  产物页 = ' + pages.length + ' 件｜节点级命中 = ' + (footnote + other)
    + '（来源脚注 ' + footnote + ' ＋ 非脚注 ' + other + '）｜零命中页 = ' + pages.filter((r) => r.node.hits.length === 0).length
    + ' 件｜目录摘要 = ' + j.green + '/' + j.files);
  console.log('  产物页规则分布 = ' + RULES.map((k) => k + '=' + pages.reduce((a, r) => a + r.node[k], 0)).join('／'));
  console.log('  产物页命中归属 owner 去重 = ' + JSON.stringify([...byOwner.keys()]));
  console.log('  墙 4 件 = ' + walls.length + ' 件｜命中 = ' + walls.reduce((a, r) => a + r.node.hits.length, 0) + '（豁免件，设计使然）');
  console.log(offenders.length > 0 ? '  RED 非脚注命中：\n    ' + offenders.join('\n    ') : '  ⇒ 非脚注命中 = 0 ✓');
}

function responsive(path) {
  const j = JSON.parse(readFileSync(path, 'utf8'));
  const pages = j.rows.filter((r) => !WALL_FILES.has(r.name));
  const walls = j.rows.filter((r) => WALL_FILES.has(r.name));
  const widthList = j.widths.map(String);
  for (const [label, set] of [['83 产物页', pages], ['墙 4 件（命令行 --exclude 点名）', walls]]) {
    const bad = []; let cells = 0;
    const perWidthZero = Object.fromEntries(widthList.map((w) => [w, 0]));
    for (const r of set) {
      for (const w of widthList) {
        cells += 1;
        const c = r.widths[w];
        if (c === undefined) { bad.push(r.name + '@' + w + ' 无读数'); continue; }
        const over = c.docScrollWidth - c.innerWidth;
        if (over === 0) perWidthZero[w] += 1;
        else bad.push(r.name + '@' + w + ' overflow=+' + over + ' why=' + (c.why || '—'));
      }
    }
    const notOk = set.flatMap((r) => widthList.filter((w) => r.widths[w]?.ok === false)
      .map((w) => r.name + '@' + w + ' why=' + r.widths[w].why));
    console.log('RESPONSIVE ' + label + '：' + cells + ' 格｜溢出非零 ' + bad.length + ' 格｜ok=false（含视口守卫）'
      + notOk.length + ' 格｜逐档全零件数 ' + widthList.map((w) => w + '=' + perWidthZero[w]).join('/'));
    console.log(bad.length === 0 ? '  ⇒ 溢出全 0 ✓' : '  ' + bad.join('\n  '));
    if (notOk.length > 0) console.log('  ok=false 逐格：\n    ' + notOk.join('\n    '));
  }
  console.log('RESPONSIVE-EXCLUDE 原文 = --exclude ' + [...WALL_FILES].join(','));
}

function dsig() {
  const h1Of = (x) => ((/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(x) ?? ['', ''])[1]).replace(/<[^>]*>/g, '');
  const cnt = (h, re) => (h.match(re) ?? []).length;
  for (const [f, label] of [['看今日营养.html', 'D2 题名'], ['饮食复盘（本周）.html', 'D3 距范围'], ['看高热量榜.html', 'D4 餐均']]) {
    const a = readFileSync(join(OLD, f), 'utf8'); const b = readFileSync(join(WALL, f), 'utf8');
    console.log('[' + label + '] ' + f);
    console.log('  陈旧墙(14:51)  H1=「' + h1Of(a) + '」｜-N 克=' + cnt(a, /-[\d.]+ 克/g) + '｜卡/餐=' + cnt(a, /卡\/餐/g));
    console.log('  当刻产物      H1=「' + h1Of(b) + '」｜-N 克=' + cnt(b, /-[\d.]+ 克/g) + '｜卡/餐=' + cnt(b, /卡\/餐/g));
  }
  for (const [dir, tag] of [[OLD, '陈旧墙'], [WALL, '当刻墙']]) {
    let negk = 0; let card = 0;
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.html'))) {
      const h = readFileSync(join(dir, f), 'utf8');
      negk += cnt(h, /-[\d.]+ 克/g); card += cnt(h, /卡\/餐/g);
    }
    console.log('全目录 ' + tag + '：-N 克 合计=' + negk + '｜卡/餐 合计=' + card);
  }
  for (const f of ['查食品.html', '查食品库.html']) {
    const t = vis(readFileSync(join(WALL, f), 'utf8'));
    const m = [...t.matchAll(/来源[:：]\s*([^\s，。]{1,12})/g)].map((x) => x[1]);
    console.log('[D5 来源行] ' + f + '：取值=' + JSON.stringify([...new Set(m)]) + '｜含「测试」=' + /来源[:：]\s*测试/.test(t));
  }
  const rows = [...readFileSync(join(WALL, '饮食复盘（本周）.html'), 'utf8')
    .matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((m) => [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)]
    .map((c) => vis(c[1]))).filter((r) => r.length >= 6);
  console.log('[D3 距范围列值] 饮食复盘（本周）= ' + JSON.stringify(rows.slice(1).map((r) => r[r.length - 2])));
}

function runlogWindow() {
  /** 本席窗口内的运行**按命令形状归类**（不是按 runId 白名单——提交运行会随每次提交新增，
   *  按形状判能把「不属于本席声明的命令」一条不漏地标出来）。 */
  const SHAPES = [
    [/typescript\/bin\/tsc/, '① 编译'],
    [/scene02-.*restage\.mjs/, '② 重出墙'],
    [/audit-separators\.mjs/, '③④⑦ 门禁'],
    [/responsive-run\.mjs/, '⑤ 四档自适应'],
    [/t619-变异\.mjs/, '⑥ 变异自证'],
    [/t619\/mutation\.mjs/, '⑥b 变异自证（草稿版，读数与 ⑥ 逐字相同）'],
    [/t619\/commit\.mjs/, '⑪ 提交'],
  ];
  const SINCE = '2026-09-16T12:14';
  const mine = readFileSync('.scratch/locks/gate-runs.log', 'utf8').split('\n')
    .filter((l) => l.startsWith('RUN ') && l.includes('ticket=619') && l.includes('at='))
    .filter((l) => /at=(\S+)/.exec(l)[1] >= SINCE);
  let unknown = 0;
  const tally = new Map();
  for (const l of mine) {
    const cmd = /cmd=("?)([\s\S]*?)\1(?= waitedMs=)/.exec(l)?.[2] ?? '';
    const hit = SHAPES.find(([re]) => re.test(cmd));
    if (hit === undefined) unknown += 1;
    else tally.set(hit[1], (tally.get(hit[1]) ?? 0) + 1);
    console.log((hit === undefined ? '未声明 ✗ ' : '声明 ✓ ') + (hit === undefined ? '(不属于声明命令形状) ' : hit[1] + ' ')
      + /runId=(\S+)/.exec(l)[1] + ' exit=' + /exit=(\S+)/.exec(l)[1] + ' at=' + /at=(\S+)/.exec(l)[1]);
  }
  console.log('WINDOW ticket=619 条目=' + mine.length + '｜未声明=' + unknown + '｜分类=' + JSON.stringify([...tally.entries()]));
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === 'gate') gate(arg);
else if (cmd === 'responsive') responsive(arg);
else if (cmd === 'dsig') dsig();
else if (cmd === 'window') runlogWindow();
else { console.error('用法：node t619-读数派生.mjs gate <audit.json> | responsive <measure.json> | dsig | window'); process.exit(2); }
