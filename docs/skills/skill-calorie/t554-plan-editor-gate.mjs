/** T554 · 「定训练计划页」（可写页）**契约门**——常驻判据，可复跑。
 *
 * 出处：本件由 T351-v15 独立复核席的脚本收进仓（原在 `.scratch/t351-v15-review/t351-v15-review.mjs`，
 * 与 `fixtures.mjs`／`inpage-probe.js` 同族）。票面要求「同一个门只在仓里一份」，故落点＝本目录，
 * 夹具与页内探针改为**同目录**、路径一律相对本件（换工作目录也能跑）。
 *
 * 用法（会改动工作区／生成物 ⇒ **一律经加锁包装器**）：
 *   node tooling/run-locked.mjs --ticket 554 --run-id t554-gate \
 *     -- node docs/skills/skill-calorie/t554-plan-editor-gate.mjs --phase=gate
 *   node tooling/run-locked.mjs --ticket 554 --run-id t554-collect \
 *     -- node docs/skills/skill-calorie/t554-plan-editor-gate.mjs --phase=collect
 *
 * 两个相位（口径写清楚，免得拿 green 冒充结论）：
 *   --phase=collect = **取证链**：真出口重出样张 ＋ headless Chrome 实测取回读数。exit 0 只表示
 *                     「取证链完整、可复跑」，**不表示交付合格**。
 *   --phase=gate    = **契约门**：按需求正件 `t351-v14-plan-editor-design.md` §1 四条逐条判。
 *                     `RESULT: p/t` 与 exit code 都是它的。
 *
 * 真出口＝`packages/skill-calorie/dist/render/planEditorDocs.js` 的 `buildPlanEditorDoc`（编译产物，
 * 与 `src/render/planEditor*.ts` 同版，见 E6 自证）。这一页当前**没有任何读命令调它**（接线条归 #553），
 * 所以「真出口」就是这个导出函数，样张按它渲染。
 *
 * 与复核席原件的两处**改点**（T554 修完两处 S1 之后必须改，改点都写在下面）：
 *   · `C3.5` 原来自证的是**缺陷机制**（期望「锁周参数开＝假」）；现在改成自证**需求本身**
 *     ——locked:true 态「结构禁真 ＋ 参数开真」、locked:false 态「结构禁假 ＋ 参数开真」。
 *     判据没有被放松：把锁周参数改回纯文本，这条照样变红（见变异件 M4）。
 *   · `C3.4` 补两条更强的要求（原来只数四个 `data-act`）：锁周参数格**一格纯文本都不许有**，
 *     且**每一格都必须带齐 data-d／data-s／data-m**（S1-② 那条数据风险的 DOM 面判据）。
 *   · `X1` 的读数里点名「被静默改脏的那一行」改前改后，把「只有那一行变」写成机器读数。
 *
 * 与 T554 相比的 T557 三处加固（票 #557，判据只增不减，红集只大不小）：
 *   · `X1` 哨兵改当周行：原 `originStill` 指「第 1 周 周一 凌晨 爬楼机」，真缺陷回落 (0,0,0) 取的是
 *     当前周（锁周＝第 3 周），故恒真无分辨力；现改读探针 `beforeSentinel／afterSentinel`（当周周一凌晨那行），
 *     第 1 周那行只留作对照读数。摘坐标必红（见 T557 证据）。
 *   · `C3.4` 补「能填」与「对位」：原只验坐标齐（非 null）与无纯文本；现再要求每格 `disabled === false`
 *    （全 disabled 也全绿的盲区），且每格坐标与页内实际位置一致（`d＝posD 且 s＝posS 且 m＝posM`，
 *     形似但错位如 data-d 恒 "1" 的盲区）；并把备注④升为计分条 `X3`（计数 18→19）。
 *   · `C3.5` 口径对齐：`structLocked` 纳入时段面（含 `slotDis` 全禁用），与「结构禁＝增删训练段／增删动作／换时段」
 *     的注释口径一致（选边＝纳入时段面；若摘时段 disabled 则本条变红，原来全绿）。读数里留选边说明。
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { states } from './t554-plan-editor-fixtures.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..', '..');
const OUT = process.env.PE_OUT ? resolve(ROOT, process.env.PE_OUT) : join(ROOT, '.scratch/t554/gate');
const PROBE_SRC = join(HERE, 't554-plan-editor-probe.js');
const DIST = process.env.PE_DIST ? resolve(ROOT, process.env.PE_DIST) : join(ROOT, 'packages/skill-calorie/dist');
const CHROME = process.env.PE_CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PHASE = (process.argv.find((a) => a.startsWith('--phase=')) || '--phase=all').split('=')[1];
const SRC_FILES = [
  'packages/skill-calorie/src/render/planEditorCss.ts',
  'packages/skill-calorie/src/render/planEditorDocs.ts',
  'packages/skill-calorie/src/render/planEditorRuntime.ts',
];
const DIST_FILES = SRC_FILES.map((p) => join(DIST, 'render', p.split('/').pop().replace(/\.ts$/, '.js')));

mkdirSync(join(OUT, 'samples'), { recursive: true });
mkdirSync(join(OUT, 'probe'), { recursive: true });
mkdirSync(join(OUT, 'logs'), { recursive: true });

const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const collect = [];   // 取证链
const gate = [];      // 契约门
const ck = (bucket, id, title, ok, reading) => bucket.push({ id, title, ok: ok === true, reading });
const log = (s) => process.stdout.write(s + '\n');

/* ── 0. 真出口 ─────────────────────────────────────────────────────────── */
const docs = await import(pathToFileURL(join(DIST, 'render', 'planEditorDocs.js')).href);
const runtimeJs = readFileSync(join(DIST, 'render', 'planEditorRuntime.js'), 'utf8');
const cssJs = readFileSync(join(DIST, 'render', 'planEditorCss.js'), 'utf8');
const distHashes = DIST_FILES.map((p) => `${p.replace(/\\/g, '/')} ${sha(p)}`);
ck(collect, 'E1', '真出口 buildPlanEditorDoc 可从编译产物载入', typeof docs.buildPlanEditorDoc === 'function',
  `${DIST.replace(/\\/g, '/')}/render/planEditorDocs.js；dist 三件 sha256＝${distHashes.map((s) => s.split(' ')[1].slice(0, 12)).join(' / ')}`);

/* ── 1. 重出样张（真出口） ─────────────────────────────────────────────── */
const ST = states();
const probeSrc = readFileSync(PROBE_SRC, 'utf8');
const html = {};
for (const [name, state] of Object.entries(ST)) {
  const doc = docs.buildPlanEditorDoc(state, { key: 'calorie.view.plan-wizard', command: 'calorie-cmd-read calorie.view.plan-wizard' });
  html[name] = doc;
  writeFileSync(join(OUT, 'samples', name + '.html'), doc, 'utf8');
  writeFileSync(join(OUT, 'probe', name + '.html'),
    doc + '<script>window.__RV=' + JSON.stringify({ name }) + ';</script><script>\n' + probeSrc + '\n</script>', 'utf8');
}
const sizes = Object.entries(html).map(([n, s]) => `${n}=${s.length}B`);
ck(collect, 'E2', '五个状态各重出一份样张（本件产物目录）',
  Object.values(html).length === 5 && Object.values(html).every((s) => s.length > 50000),
  `samples/{${sizes.join(', ')}}`);

/* ── 2. 浏览器实测 ─────────────────────────────────────────────────────── */
/** 690／390 这类窄视口：headless 的 `--window-size` 有最小窗口宽（实测 390 会被抬到 526），
 *  所以按仓里视觉验收墙的同一手法用**固定宽 iframe**造真 390 视口，再把 iframe 里的读数搬出来。 */
function mobileWrap(name, w, h) {
  return '<!doctype html><html><head><meta charset="UTF-8"></head><body style="margin:0">'
    + '<iframe id="f" src="' + name + '.html" width="' + w + '" height="' + h + '" style="border:0"></iframe>'
    + '<script>\nvar f=document.getElementById("f");\nfunction pull(){\n'
    + '  try{ var d=f.contentDocument; var pre=d&&d.getElementById("review-json");\n'
    + '    if(pre){ document.body.innerHTML=\'<pre id="review-json">\'+pre.textContent+"</pre>"; return; } }\n'
    + '  catch(e){ document.body.innerHTML=\'<pre id="review-json">\'+JSON.stringify({ok:false,errors:[String(e)]})+"</pre>"; return; }\n'
    + '  setTimeout(pull,60);\n}\nf.addEventListener("load",function(){ pull(); });\n</script></body></html>';
}
writeFileSync(join(OUT, 'probe', '04-12周@390.html'), mobileWrap('04-12周', 390, 844), 'utf8');
const RUNS = [
  { name: '01-空态', w: 1280, h: 900 },
  { name: '02-母版周', w: 1280, h: 900 },
  { name: '03-锁住的周', w: 1280, h: 900 },
  { name: '04-12周', w: 1280, h: 900 },
  { name: '04-12周@390', w: 1280, h: 900, tag: '04-12周@390' },
  { name: '05-尾周全解锁', w: 1280, h: 900 },
];
const readings = {};
for (const run of RUNS) {
  const tag = run.tag || run.name;
  const page = join(OUT, 'probe', run.name + '.html');
  const args = ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--allow-file-access-from-files', '--user-data-dir=' + join(OUT, 'logs', 'chrome-profile'),
    '--window-size=' + run.w + ',' + run.h, '--virtual-time-budget=6000', '--dump-dom', pathToFileURL(page).href];
  let out = '', err = '';
  try {
    out = execFileSync(CHROME, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    err = String((e && e.stderr) || e);
    out = String((e && e.stdout) || '');
  }
  const m = /<pre id="review-json">([\s\S]*?)<\/pre>/.exec(out);
  writeFileSync(join(OUT, 'logs', `dump-${tag.replace(/[^\w-]/g, '_')}.txt`), out.slice(0, 400000) + '\n--- stderr ---\n' + err.slice(0, 40000), 'utf8');
  if (!m) { readings[tag] = { ok: false, errors: ['dump-dom 里没有 review-json；stderr=' + err.slice(0, 300)] }; continue; }
  try { readings[tag] = JSON.parse(m[1].replace(/\\u003c/g, '<')); }
  catch (e) { readings[tag] = { ok: false, errors: ['review-json 解析失败: ' + e.message] }; }
  const rr = readings[tag];
  if (rr && rr.facts) Object.assign(rr, rr.facts);   // 页内读数摊平，便于逐条引
}
writeFileSync(join(OUT, 'logs', 'readings.json'), JSON.stringify(readings, null, 2), 'utf8');
const badRuns = Object.entries(readings).filter(([, r]) => r.ok !== true || (r.errors || []).length > 0);
ck(collect, 'E3', 'headless Chrome 六个视口全部取回读数且无页内异常', badRuns.length === 0,
  `取回 ${Object.keys(readings).length}/6；异常 ${badRuns.length} 个${badRuns.length ? '：' + badRuns.map(([k, v]) => k + '(' + (v.errors || []).join(';').slice(0, 120) + ')').join(' / ') : ''}`);

/* ── 3. 静态面（HTML 字符串）读数 ──────────────────────────────────────── */
const visibleText = (h) => h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/\s+/g, ' ');
function caliberOf(h) {
  const m = /<p class="[^"]*caliber[^"]*">([\s\S]*?)<\/p>/.exec(h);
  return m ? m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : null;
}
function scrollbarHidingRules(h) {
  const css = [...h.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((x) => x[1]).join('\n');
  const hits = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    const sel = m[1].trim().replace(/\s+/g, ' ');
    const body = m[2];
    const hides = /scrollbar-width\s*:\s*none/i.test(body) || (/scrollbar/i.test(sel) && /display\s*:\s*none/i.test(body));
    if (!hides) continue;
    for (const one of sel.split(',')) {
      const s = one.trim();
      const subj = s.replace(/::?[a-z-]+(\([^)]*\))?/g, '').split(/[\s>+~]/).filter(Boolean).pop() || '';
      const universal = subj === '*' || subj === '' || subj === 'html' || subj === 'body' || subj === ':root';
      if (/\.pe-tabs|\.pe-daytabs/.test(s) || universal) hits.push(`${s} { ${body.trim().replace(/\s+/g, ' ')} }`);
    }
  }
  return hits;
}
const caliber02 = caliberOf(html['02-母版周']);
const caliber03 = caliberOf(html['03-锁住的周']);
const hiding = scrollbarHidingRules(html['02-母版周']);
/* 判据自证：把「把滚动条藏掉」的几种写法做成合成反例，验证扫描器认得出来；再放一个**无关选择器**
 * 验证它不误报（判据自己也是被测对象）。注：扫描面只覆盖「主体选择器是两条页签条或通配／根」的规则。 */
const HIDE_PROBES = [
  ['*::-webkit-scrollbar{display:none}', true],
  ['*{scrollbar-width:none}', true],
  ['.pe-tabs{scrollbar-width:none}', true],
  ['.pe-tabs::-webkit-scrollbar{display:none}', true],
  ['.pe-daytabs::-webkit-scrollbar{display:none}', true],
  ['.pe-tabs{scrollbar-width:thin}', false],
  ['.ilife-block-toc::-webkit-scrollbar{display:none}', false],
];
const hideProbes = HIDE_PROBES.map(([css, want]) => ({ css, want, hit: scrollbarHidingRules('<style>' + css + '</style>').length > 0 }));
ck(collect, 'E7', '判据自证：5 种「藏滚动条」写法全被点名、2 个反例不误报',
  hideProbes.every((p) => p.hit === p.want),
  hideProbes.map((p) => `${p.hit === p.want ? '✓' : '✗'} ${p.css}=${p.hit ? '点名' : '放行'}`).join('  '));
const sep02 = ['|', '·'].filter((c) => visibleText(html['02-母版周']).includes(c));
const hyphen02 = (visibleText(html['02-母版周']).match(/[\u002d]/g) || []).length;

/* ── 4. 取证链自证：运行时真跑了、夹具坐标真对 ─────────────────────────── */
const r02 = readings['02-母版周'], r03 = readings['03-锁住的周'], r04w = readings['04-12周'], r04n = readings['04-12周@390'];
const r01 = readings['01-空态'], r05 = readings['05-尾周全解锁'];
ck(collect, 'E4', '运行时确实在页面里跑起来（母版周：周页签 5 格／日页签 7 格／只渲 1 天）',
  r02?.tabLabels?.length === 5 && r02?.daytabs?.length === 7 && r02?.weekDayEls === 1,
  `周页签＝${JSON.stringify(r02?.tabLabels)} 日页签＝${r02?.daytabs?.length} 天元素＝${r02?.weekDayEls}`);
ck(collect, 'E5', '夹具坐标自证：周一凌晨第 1 个动作＝爬楼机(30 分钟)、周四晚上第 1 个动作＝椭圆机(20 分钟)',
  r03?.cardioEdit?.beforeOrigin?.name === '爬楼机' && r03?.cardioEdit?.beforeOrigin?.amount === '30 分钟'
  && r03?.cardioEdit?.beforeTarget?.name === '椭圆机' && r03?.cardioEdit?.beforeTarget?.amount === '20 分钟',
  `起点行=${JSON.stringify(r03?.cardioEdit?.beforeOrigin)} 目标行=${JSON.stringify(r03?.cardioEdit?.beforeTarget)}`);
const docsJs = readFileSync(join(DIST, 'render', 'planEditorDocs.js'), 'utf8');
const V15 = ['daySel', 'go-day', 'pe-daytabs', '这份计划是按我们刚才讨论的结果填好的', '训练安排由第 1 周决定'];
const missingMarker = V15.filter((k) => !(runtimeJs + cssJs + docsJs).includes(k));
ck(collect, 'E6', '编译产物与源码同版（dist 里找得到 V15 的五个标记）', missingMarker.length === 0,
  `缺=${missingMarker.length ? missingMarker.join('、') : '无'}`);

/* ── 5. 契约门：需求正件 §1 四条 ───────────────────────────────────────── */
const dts = r02?.daytabs || [];
ck(gate, 'C1.1', '§1① 日页签条存在：7 个日页签、各带 data-act=go-day', r02?.hasDaytabs === true && dts.length === 7 && dts.every((d) => d.act === 'go-day' && d.d !== null),
  `hasDaytabs=${r02?.hasDaytabs} 格数=${dts.length} 文本=${JSON.stringify(dts.map((d) => d.t))}`);
ck(gate, 'C1.2', '§1① 一次只渲染选中的那一天（初始：.pe-week 内 .pe-day 恰 1 个）',
  r02?.weekDayEls === 1 && (r02?.daytabs || []).filter((d) => d.on).length === 1 && dts[0]?.on === true,
  `.pe-day 个数=${r02?.weekDayEls} 选中=${JSON.stringify((r02?.daytabs || []).filter((d) => d.on).map((d) => d.t))}`);
ck(gate, 'C1.3', '§1① 日页签真能切：点「周四」后仍只渲一天且选中态移到周四',
  r02?.afterGoDay3?.on === '周四' && r02?.afterGoDay3?.weekDayEls === 1 && (r02?.afterGoDay3?.moves || []).includes('史密斯机深蹲'),
  `选中=${r02?.afterGoDay3?.on} 天元素=${r02?.afterGoDay3?.weekDayEls} 该天动作=${JSON.stringify(r02?.afterGoDay3?.moves)}`);
ck(gate, 'C1.4', '§1① `.pe-day` 不再带左侧星期列（无 `.pe-dow`，且不再是 64px 两列网格）',
  r02?.dowEls === 0 && r02?.peDay?.grid !== '64px 1fr' && r02?.afterGoDay3?.dowCol === false,
  `.pe-dow=${r02?.dowEls} 个；.pe-day display=${r02?.peDay?.display} grid-template-columns=${r02?.peDay?.grid}`);

ck(gate, 'C2.1', '§1② `.pe-tabs` 计算样式 flex-wrap=nowrap', r02?.tabsBar?.flexWrap === 'nowrap', `computed flex-wrap=${r02?.tabsBar?.flexWrap}`);
ck(gate, 'C2.2', '§1② `.pe-tabs` 计算样式 overflow-x=auto（可横滑）', r02?.tabsBar?.overflowX === 'auto', `computed overflow-x=${r02?.tabsBar?.overflowX}；scrollbar-width=${r02?.tabsBar?.scrollbarWidth}`);
ck(gate, 'C2.3', '§1② 滚动条没被藏掉（无隐藏写法命中页签条；computed scrollbar-width 不为 none）',
  hiding.length === 0 && r02?.tabsBar?.scrollbarWidth !== 'none' && r02?.daytabsBar?.scrollbarWidth !== 'none',
  `命中隐藏规则=${hiding.length}${hiding.length ? '：' + hiding.join(' | ') : ''}；周条 scrollbar-width=${r02?.tabsBar?.scrollbarWidth}／日条=${r02?.daytabsBar?.scrollbarWidth}`);
ck(gate, 'C2.4', '§1② 日页签同形（nowrap ＋ overflow-x:auto ＋ 滚动条不藏）',
  r02?.daytabsBar?.flexWrap === 'nowrap' && r02?.daytabsBar?.overflowX === 'auto' && r02?.daytabsBar?.scrollbarWidth !== 'none',
  `日条 flex-wrap=${r02?.daytabsBar?.flexWrap} overflow-x=${r02?.daytabsBar?.overflowX} scrollbar-width=${r02?.daytabsBar?.scrollbarWidth}`);
ck(gate, 'C2.5', '§1② 周多了真能横滑（12 周窄屏：滚动宽 > 可见宽）',
  r04n?.tabsBar?.scrollW > r04n?.tabsBar?.clientW + 4 && r04n?.viewport < 820,
  `390 视口(实测 ${r04n?.viewport})：scrollW=${r04n?.tabsBar?.scrollW} clientW=${r04n?.tabsBar?.clientW} 滚动条占位=${r04n?.tabsBar?.barLane}px；1280 视口：scrollW=${r04w?.tabsBar?.scrollW} clientW=${r04w?.tabsBar?.clientW}`);

ck(gate, 'C3.1', '§1③ 第 2 周起「加一次训练」禁用（disabled 属性）', r03?.addTrain?.disabled === true && r03?.addTrain?.attr === true,
  `disabled=${r03?.addTrain?.disabled} 有属性=${r03?.addTrain?.attr} 文案=「${r03?.addTrain?.text}」`);
ck(gate, 'C3.2', '§1③ 第 2 周起「加动作」禁用', r03?.addMove?.disabled === true && r03?.addMove?.attr === true,
  `disabled=${r03?.addMove?.disabled} 文案=「${r03?.addMove?.text}」`);
ck(gate, 'C3.3', '§1③ 第 2 周起删训练／删动作控件不出现（0 个）', r03?.delTrain === 0 && r03?.delMove === 0,
  `del-train=${r03?.delTrain} 个、del-move=${r03?.delMove} 个、锁图标=${r03?.lockIco} 个；时段胶囊禁用 ${r03?.slotDis}`);
const lockedInputs = r03?.day3Inputs || [];
const lockedByAct = lockedInputs.map((i) => i.act);
/* T554 改点（判据加强，不放松）：① 锁周里**一个纯文本参数行都不许有**（原 S1-① 就长那样）；
 * ② 每一格都必须带齐坐标 data-d／data-s／data-m（原 S1-② 那一格就是缺坐标，写值落到别的行）。
 * T557 加固（只增不减）：③ 每一格都必须能填（disabled === false，全 disabled 也全绿的盲区）；
 * ④ 每一格坐标必须与页内实际位置一致（d＝posD 且 s＝posS 且 m＝posM，形似但错位如 data-d 恒 "1" 的盲区）。 */
const lockedNoAt = lockedInputs.filter((i) => i.d === null || i.s === null || i.m === null);
const lockedPlainRows = (r03?.day3Plain || []).length;
const lockedDisabled = lockedInputs.filter((i) => i.disabled !== false);
const lockedMisplaced = lockedInputs.filter((i) => i.d === null || i.s === null || i.m === null
  || i.posD === null || i.posD === undefined || i.posS === null || i.posS === undefined || i.posM === null || i.posM === undefined
  || String(i.d) !== String(i.posD) || String(i.s) !== String(i.posS) || String(i.m) !== String(i.posM));
ck(gate, 'C3.4', '§1③ 第 2 周起「参数全放开」（组数／次数／重量／时长都有可填的格）＋ 无纯文本参数行 ＋ 每格坐标齐全 ＋ 每格能填 ＋ 每格坐标对位（T557 加固）',
  lockedByAct.includes('set-sets') && lockedByAct.includes('set-reps') && lockedByAct.includes('set-load') && lockedByAct.includes('set-min')
  && lockedPlainRows === 0 && lockedNoAt.length === 0 && lockedDisabled.length === 0 && lockedMisplaced.length === 0,
  `锁周周四动作=${JSON.stringify(r03?.day3MoveNames)} 可填格=${JSON.stringify(lockedByAct)} 纯文本参数行=${JSON.stringify(r03?.day3Plain)}`
  + ` RM/kg 切换钮=${r03?.day3ModeBtns} 个 缺坐标的格=${JSON.stringify(lockedNoAt.map((i) => i.act))}`
  + ` 不可填的格=${JSON.stringify(lockedDisabled.map((i) => i.act))} 错位的格=${JSON.stringify(lockedMisplaced.map((i) => i.act + ':' + i.d + ',' + i.s + ',' + i.m + '≠' + i.posD + ',' + i.posS + ',' + i.posM))}`);
const actsOf = (r) => (r?.day3Inputs || []).map((i) => i.act);
const STR = ['set-sets', 'set-reps', 'set-load'];
const hasAll = (r, list) => list.every((a) => actsOf(r).includes(a));
/* T557 选边：结构禁纳入时段面。口径＝增删训练段／增删动作／换时段三者全禁才算结构禁真；
 * 时段面读数 slotDis（如 8/8 全禁用）已在 C3.3 打印，本条把它并进断言（原来摘时段 disabled 全绿）。 */
const slotLocked = (r) => {
  const m = /^(\d+)\/(\d+)$/.exec(String(r?.slotDis || ''));
  return m !== null && Number(m[2]) > 0 && m[1] === m[2];
};
const structLocked = (r) => r?.addTrain?.disabled === true && r?.addMove?.disabled === true && r?.delMove === 0 && r?.delTrain === 0 && slotLocked(r) === true;
const lockWkParams = hasAll(r03, STR) && actsOf(r03).includes('set-min');   // 锁周参数全开？
const openWkParams = hasAll(r05, STR) && actsOf(r05).includes('set-min');   // 解锁周参数全开？
ck(gate, 'C3.5', '§1③ 机制自证（T554 改点＋T557 选边纳入时段面）：「结构禁」与「参数开」是两套开关——locked:true 态＝结构禁真（含时段全禁）且参数开真；locked:false 态＝结构禁假且参数开真',
  structLocked(r03) === true && lockWkParams === true && structLocked(r05) === false && openWkParams === true,
  `选边＝结构禁纳入时段面（slotDis 全禁用才算禁真）；locked:true 态＝结构禁 ${structLocked(r03)}（时段 ${r03?.slotDis}）／参数开 ${lockWkParams}（可填格 ${JSON.stringify(actsOf(r03))}）；`
  + ` locked:false 态＝结构禁 ${structLocked(r05)}（时段 ${r05?.slotDis}）／参数开 ${openWkParams}（尾周可填格 ${JSON.stringify(actsOf(r05))}、加训练 disabled=${r05?.addTrain?.disabled}、删动作 ${r05?.delMove} 个）`);

const cal = caliber02 || '';
ck(gate, 'C4.1', '§1④ 口径行是「按讨论结果填好、你看着改」的口吻，不是从零填',
  /按我们刚才讨论的结果填好的/.test(cal) && /你看着改/.test(cal) && !/从零|从 0|空白起/.test(cal),
  `口径行＝「${cal}」；空态口径行同源=${(caliber03 || '') === cal}`);
ck(gate, 'C4.2', '§1④ 空态兜底仍可用：点「定一份计划」后出周页签＋日页签＋单日渲染',
  r01?.empty?.box === true && r01?.afterStart?.emptyGone === true && (r01?.afterStart?.tabs || []).length === 5
  && r01?.afterStart?.daytabs === 7 && r01?.afterStart?.weekDayEls === 1,
  `空态盒=${r01?.empty?.box} 主按钮=「${r01?.empty?.cta}」→ 点后周页签=${JSON.stringify(r01?.afterStart?.tabs)} 日页签=${r01?.afterStart?.daytabs} 天元素=${r01?.afterStart?.weekDayEls}`);

/* ── 6. 自设探针（作者脚本覆盖不到的盲区） ─────────────────────────────── */
/** 整张计划表逐行对账：改一格之后，究竟哪一行动了。 */
function tableDiff(before, after) {
  const k = (r) => r.slice(0, 6).join(' | ');
  const map = new Map((before || []).map((r) => [k(r), r]));
  const out = [];
  for (const r of after || []) {
    const old = map.get(k(r));
    if (!old) out.push({ row: k(r), from: '（无）', to: `${r[6]} ${r[7]}`.trim() });
    else if (old[6] !== r[6] || old[7] !== r[7]) out.push({ row: k(r), from: `${old[6]} ${old[7]}`.trim(), to: `${r[6]} ${r[7]}`.trim() });
  }
  return out;
}
const ce = r03?.cardioEdit;
const ceDiff = tableDiff(ce?.tableBefore, ce?.tableAfter);
/* T557：哨兵改当周行。回落 (0,0,0) 取的是当前周（锁周＝第 3 周），故被静默改脏的是当周周一凌晨那行；
 * 原断言指成第 1 周那行恒真无分辨力。现计分看 sentinel（当周），第 1 周那行只留作对照读数。 */
const sentinelAfter = ce?.afterSentinel;
const sentinelStill = sentinelAfter && sentinelAfter.name === '爬楼机' && sentinelAfter.amount === '30 分钟';
ck(gate, 'X1', '自设探针（S1-② 的反面，T557 哨兵改当周行）：锁周改「周四 椭圆机」的时长，计划表里必须只有那一行跟着变、且变成 77 分钟；当周哨兵行逐字不动',
  ceDiff.length === 1 && ceDiff[0].row.startsWith('第 3 周 | 周四 | 晚上 | 椭圆机') && ceDiff[0].to === '77 分钟' && sentinelStill === true,
  `输入框=${ce?.html}；写 77 分钟后表里变动的行=${JSON.stringify(ceDiff)}；输入框自己仍显示 ${ce?.inputStillShows}；`
  + `目标行=${JSON.stringify(ce?.afterTarget)}；哨兵行（${ce?.sentinelWeek || '第 3 周'} 周一 凌晨 爬楼机）改前=${JSON.stringify(ce?.beforeSentinel)} 改后=${JSON.stringify(sentinelAfter)}；`
  + `对照行（第 1 周 周一 凌晨 爬楼机）改前=${JSON.stringify(ce?.beforeOrigin)} 改后=${JSON.stringify(ce?.afterOrigin)}；`
  + `整表行数 ${ce?.tableBefore?.length} → ${ce?.tableAfter?.length}`);
ck(gate, 'X2', '自设探针（正向对照）：母版周力量参数真能写（证明探针这条写路是通的，免得假红）',
  /组乘/.test(String(r02?.strengthEdit?.before?.amount)) && String(r02?.strengthEdit?.after?.amount || '').startsWith('9 组乘'),
  `${r02?.strengthEdit?.name}（${r02?.strengthEdit?.dayTab}）改前=${r02?.strengthEdit?.before?.amount} 改后=${r02?.strengthEdit?.after?.amount}`);
/* T557：备注④升为计分条 X3（S1-① 的另一半，与 X1 同一个 tableDiff 算法）。 */
const se3 = r03?.strengthEdit;
const se3Diff = tableDiff(se3?.tableBefore, se3?.tableAfter);
const se3MasterSame = JSON.stringify(se3?.before) === JSON.stringify(se3?.after);
ck(gate, 'X3', '自设探针（S1-① 的另一半，T557 由备注④升计分）：锁周改「周四 史密斯机深蹲」的组数，计划表里必须只有那一行跟着变、且变成 9 组；母版周同名行逐字不动',
  se3Diff.length === 1 && se3Diff[0].row.startsWith('第 3 周 | 周四 | 上午 | 史密斯机深蹲') && String(se3Diff[0].to || '').startsWith('9 组乘') && se3MasterSame === true,
  `第 3 周 周四 的「${se3?.name}」把组数 5 改 9 —— 整表变动行＝${JSON.stringify(se3Diff)}；`
  + `被点那格坐标＝${se3?.html}；同名动作在母版周的读数（改前／改后，应原样不动）＝${JSON.stringify(se3?.before)} → ${JSON.stringify(se3?.after)}；`
  + `整表行数 ${se3?.tableBefore?.length} → ${se3?.tableAfter?.length}`);
const notes = [
  `备注①：锁周「加一次训练」只靠 disabled 挡住；往这颗 disabled 钮上合成派发一次 click，训练段数 ${r03?.syntheticAddTrain?.before} → ${r03?.syntheticAddTrain?.after}（委派处理器里没有 lock 守卫）。真实指针／键盘都点不到 disabled 钮，故只作 S3 记账。`,
  `备注②：锁周时段胶囊 ${r03?.slotDis} 全禁用（结构面收紧，与 §1③「不能加训练段」一致）；T557 已把此时段面并进 C3.5 的结构禁（选边＝纳入时段面）。`,
  `备注③：全部 disabled 控件的 data-act＝${JSON.stringify(r03?.disabledActs)}。`,
  `备注④（T557 已升为计分条 X3，本条只留指针不计分）：锁周力量写回的「只有那一行变」见 X3 读数；原不计分附件内容与 X3 同源。`,
];

/* ── 7. 打印 ───────────────────────────────────────────────────────────── */
function block(title, arr) {
  log(`\n== ${title} ==`);
  for (const c of arr) log(`  ${c.ok ? 'PASS' : 'RED '} ${c.id.padEnd(5)} ${c.title}\n        读数：${c.reading}`);
}
const passed = (arr) => arr.filter((c) => c.ok).length;
writeFileSync(join(OUT, 'logs', 'checks.json'), JSON.stringify({ collect, gate, readings: undefined }, null, 2), 'utf8');
log(`\n附件读数：可见文本里的竖线／中间点＝${sep02.length ? sep02.join('、') : '无'}；ASCII 连字符 ${hyphen02} 个；静态面读数见 logs/checks.json`);
if (PHASE === 'collect' || PHASE === 'all') {
  block('取证链（exit 只表示取证完整，不表示交付合格）', collect);
  log(`RESULT: ${passed(collect)}/${collect.length}`);
}
if (PHASE === 'gate' || PHASE === 'all') {
  block('契约门（需求正件 §1 四条 ＋ 自设探针）', gate);
  log('\n== 备注（不计分） ==\n  ' + notes.join('\n  '));
  log(`RESULT: ${passed(gate)}/${gate.length}`);
}
writeFileSync(join(OUT, 'logs', 'last-run.txt'),
  `phase=${PHASE} collect=${passed(collect)}/${collect.length} gate=${passed(gate)}/${gate.length}\n`
  + collect.concat(gate).map((c) => `${c.ok ? 'PASS' : 'RED '} ${c.id} ${c.title} :: ${c.reading}`).join('\n') + '\n', 'utf8');
const arr = PHASE === 'collect' ? collect : gate;
process.exit(passed(arr) === arr.length ? 0 : 1);
