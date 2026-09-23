// HELP 二级分组的**默认态**（用户 2026-09-24 裁定）：每个分组页只展开**第一个**二级分组，
// 其余折叠——首屏看得见一组内容，又不被十几个分组撑成长卷。
//
// 同一裁定的两条渲染路都要锁（两条路各出各的 HTML，只锁一条会留下另一个面漂回去）：
//   · A 路（HELP 文件）：源 `assets/help-template.html` 的渲染循环 ＋ `doSearch` 的复位支。
//     「默认态」只在浏览器里成立（渲染循环跑在页面侧），故用 headless 浏览器读 DOM 判定。
//   · B 路（速查台）：源 `src/help.ts:renderSubgroup` 的静态 HTML，直接判产物字符串。
//
// 另锁**搜索复位**：搜索期命中的组会被自动打开（`sg.open = true`），清空搜索必须回到
// 「只第一个展开」；不复位就等于把这条裁定悄悄改回去了（首屏看着对、搜一次就不对）。
//
// 浏览器口径同 `help-center-js-88.test.mjs`／`controls.test.mjs`：找不到浏览器即**显式失败**
// （可执行证据缺失，不静默跳过）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { buildSharedHelpersJs, buildStyleSheet, renderHelpShell } from '../dist/index.js';
import { renderHelpShellHtml } from '../dist/helpShell.js';

const execFileAsync = promisify(execFile);
const LF = String.fromCharCode(10);

/** 命中词：只在**第二个**子功能组里出现 → 搜索后必然出现「多于一个组被打开」的可观测差异。 */
const HIT = '关键词';

/** 夹具：2 个分组页（3 ＋ 2 个二级分组），每组建 2 张场景卡。 */
function groups() {
  const make = (gid, idx) => {
    const id = gid + '_' + idx;
    const scenes = [0, 1].map((k) => ({
      id: id + '_s' + k,
      title: (idx === 1 ? HIT : '场景') + ' ' + gid + '-' + idx + '-' + k,
      wake_word: '唤醒 ' + id + '-' + k,
      status: '',
      prompt_template: '请你执行第 ' + id + '-' + k + ' 项。',
      types: ['结果'],
    }));
    return { id, label: '子功能 ' + gid + '-' + idx, scenes };
  };
  return [
    { id: 'g0', icon: '📁', label: '分组 0', subgroups: [make('g0', 0), make('g0', 1), make('g0', 2)] },
    { id: 'g1', icon: '📁', label: '分组 1', subgroups: [make('g1', 0), make('g1', 1)] },
  ];
}

const PAGE_GROUPS = groups();
const EXPECT_IDS = ['g0_0', 'g0_1', 'g0_2', 'g1_0', 'g1_1'];
const EXPECT_OPEN = [true, false, false, true, false];

/** 从产物 HTML 里逐条抽出 `<details ...subgroup data-subgroup-id="…"[ open]>` 的展开位。 */
function openFlags(html) {
  const out = [];
  const re = /<details class="[^"]*subgroup" data-subgroup-id="([^"]+)"( open)?>/g;
  let m = re.exec(html);
  while (m !== null) {
    out.push({ id: m[1], open: m[2] === ' open' });
    m = re.exec(html);
  }
  return out;
}

/* ── B 路（速查台 · 静态 HTML） ───────────────────────────────────────────── */

describe('B 路 · 速查台：每个分组页只首个二级分组 open', () => {
  const { html } = renderHelpShell({
    sceneData: { skill_name: '夹具技能', title: '速查台夹具', subtitle: '默认态用例', groups: PAGE_GROUPS },
    assets: { sharedHelpersJs: buildSharedHelpersJs(), sharedCssText: buildStyleSheet().css },
  });

  it('二级分组逐条都在场（不因折叠而少渲染）', () => {
    const flags = openFlags(html);
    assert.deepEqual(flags.map((f) => f.id), EXPECT_IDS, '二级分组须逐条渲染（折叠只改 open 位）');
  });

  it('open 位逐条对位：每组页第一个 open、其余不 open', () => {
    const flags = openFlags(html);
    assert.deepEqual(flags.map((f) => f.open), EXPECT_OPEN, 'open 位错位（应只每组页首个）');
    assert.equal(flags.filter((f) => f.open).length, PAGE_GROUPS.length, '每个分组页恰一个展开');
  });
});

/* ── A 路（HELP 文件 · headless 浏览器读 DOM） ───────────────────────────── */

function browserCandidates() {
  const explicit = process.env.DSH_BROWSER_CANDIDATES;
  const defaults = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ];
  const list = typeof explicit === 'string' && explicit !== ''
    ? explicit.split(',').map((s) => s.trim()).filter((s) => s !== '')
    : defaults;
  return [process.env.DSH_BROWSER, ...list];
}

function findBrowser() {
  const candidates = browserCandidates();
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.length > 0 && existsSync(candidate)) return candidate;
  }
  throw new assert.AssertionError({
    message: '未找到 Chrome／Chromium／Edge：A 路的默认态是**页面运行时**跑出来的，静态串查不到 → '
      + '可执行证据缺失（不静默跳过）。已探测：' + JSON.stringify(candidates.filter((c) => typeof c === 'string'))
      + '；请安装浏览器或用 DSH_BROWSER=<路径> 指定。',
  });
}

/** 页面探针：查每页的 open 位 ＋ 走一遍「搜索命中 → 清空」看复位。 */
const PROBE = [
  '(function () {',
  '  try {',
  '    var out = {};',
  '    function qa(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }',
  '    var pages = qa(".page[data-page]").filter(function (p) { return qa(".subgroup", p).length > 0; });',
  '    out.pages = pages.map(function (p) {',
  '      var subs = qa(".subgroup", p);',
  '      return {',
  '        total: subs.length,',
  '        open: subs.filter(function (x) { return x.open; }).length,',
  '        firstOpen: subs[0].open === true,',
  '        restClosed: subs.slice(1).every(function (x) { return x.open !== true; }),',
  '      };',
  '    });',
  '    var sB = document.getElementById("sB");',
  '    function search(v) { sB.value = v; sB.dispatchEvent(new Event("input")); }',
  '    search(' + JSON.stringify(HIT) + ');',
  '    out.afterSearch = qa(".subgroup[open]").length;',
  '    search("");',
  '    out.afterClear = pages.map(function (p) { return qa(".subgroup[open]", p).length; });',
  '    document.body.insertAdjacentHTML("beforeend", \'<div id="result">RESULT:\' + JSON.stringify(out) + "</div>");',
  '  } catch (e) {',
  '    document.body.insertAdjacentHTML("beforeend", \'<div>PROBE_ERROR:\' + String(e) + "</div>");',
  '  }',
  '}());',
].join(LF);

async function dumpDom(browser, pageFile) {
  const profile = mkdtempSync(join(tmpdir(), 'help-open-chrome-'));
  try {
    const { stdout } = await execFileAsync(browser, [
      '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--disable-extensions',
      '--disable-background-networking', '--disable-component-update', '--disable-breakpad',
      '--disable-dev-shm-usage', '--allow-file-access-from-files',
      '--user-data-dir=' + profile, '--virtual-time-budget=4000', '--window-size=1280,900',
      '--dump-dom', pageFile,
    ], { encoding: 'utf8', timeout: 120000, maxBuffer: 128 * 1024 * 1024 });
    return stdout;
  } finally {
    rmSync(profile, { recursive: true, force: true });
  }
}

describe('A 路 · HELP 文件：默认只首个展开；搜索清空后复位', () => {
  it('每页恰一个 open（＝首个），搜索命中期多开、清空后回落', async () => {
    const html = renderHelpShellHtml({
      skill_name: '夹具技能',
      title: '唤醒词速查台',
      subtitle: '默认态用例',
      contact: { items: [{ label: '作者', value: 'ilife' }] },
      groups: PAGE_GROUPS,
    }).replace('</body>', '<script>' + PROBE + '</scr' + 'ipt></body>');

    const dir = mkdtempSync(join(tmpdir(), 'help-open-'));
    const pageFile = join(dir, 'page.html');
    writeFileSync(pageFile, html, 'utf8');
    let dom = '';
    try {
      dom = await dumpDom(findBrowser(), pageFile);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }

    const match = dom.match(/RESULT:(\{[\s\S]*?\})<\/div>/);
    assert.ok(match !== null, '页面未产出结果（探针没跑完）：'
      + ((dom.match(/PROBE_ERROR:([\s\S]*?)<\/div>/) ?? ['', dom.slice(0, 400)])[1]).slice(0, 600));
    const out = JSON.parse(match[1]);

    assert.deepEqual(out.pages.map((p) => p.total), [3, 2], '夹具每页的二级分组条数');
    assert.deepEqual(out.pages.map((p) => p.open), [1, 1], '默认态：每页恰一个展开');
    assert.ok(out.pages.every((p) => p.firstOpen), '展开的必须是**第一个**二级分组');
    assert.ok(out.pages.every((p) => p.restClosed), '除第一个外都必须折叠');
    assert.ok(out.afterSearch > out.pages.length, '搜索命中应把命中组打开（本夹具跨两组命中）');
    assert.deepEqual(out.afterClear, [1, 1], '清空搜索后必须复位成「只第一个展开」');
  });
});
