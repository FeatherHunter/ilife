#!/usr/bin/env node
/** #777 · 收口 A 链路总表：50 行 prompt → 唤醒词 → 命令 → HTML 绝对路径（一页可点）。
 *
 * 跑法（仓根）：
 *   node tooling/run-locked.mjs --ticket 777 -- node docs/skills/skill-chef/t777-链路总表.mjs
 *     → 打印 `词 50／卡 48／链接 50 条／缺失 0` 且 exit 0
 *   node tooling/run-locked.mjs --ticket 777 -- node docs/skills/skill-chef/t777-链路总表.mjs --open-check
 *     → 真浏览器逐行打开链接，打印 `可打开 50／死链 0` 且 exit 0
 *
 * 只读三处真源：唤醒词与卡表取权威资产 `packages/skill-chef/src/triggers/chef-scenes.ts`
 * （50 词／48 卡，t767 口径）；prompt 取 `src/help/sceneData.ts` 的 prompt_template
 * （新表多出词 3 条新写样本取 t767-对账表 §三）；产物取 `.scratch/t777/manifest.json`
 * （48 格，t777-run-all.mjs 产出）。出 `.scratch/t777/t777-链路总表.html`。
 *
 * 约束（票面不许动的东西）：链接一律**绝对路径**（file:// URL，不跨目录相对引用）；
 * 不加 `loading="lazy"`；不改命令面、不碰真库（本脚本零 DB、全程只读文件）。
 *
 * 反例（必跑，见 t777-收口A.md）：
 *   改坏 manifest 里一个文件名（--manifest 指副本）→ exit 1 并点名那一份；
 *   从唤醒词表删一条（--asset 指删后副本）→ 覆盖对账报缺并 exit 1；
 *   把一行路径指向不存在的文件 → --open-check exit 1 并点名那一行。
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(import.meta.dirname, '..', '..', '..');
const DEFDOC = join(ROOT, 'docs', 'skills', 'skill-chef');
const DEFASSET = join(ROOT, 'packages', 'skill-chef', 'src', 'triggers', 'chef-scenes.ts');
const DEFSCENE = join(ROOT, 'packages', 'skill-chef', 'src', 'help', 'sceneData.ts');
const DEFOUT = join(ROOT, '.scratch', 't777');
const DEFMF = join(DEFOUT, 'manifest.json');
const DEFPAGE = join(DEFOUT, 't777-链路总表.html');
const LF = String.fromCharCode(10);

const argOf = (n) => {
  const i = process.argv.indexOf(n);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : '';
};
const MF = argOf('--manifest') || DEFMF;
const ASSET = argOf('--asset') || DEFASSET;
const OUT = argOf('--out') || DEFOUT;
const PAGE = argOf('--page') || join(OUT, 't777-链路总表.html');
const OPEN_CHECK = process.argv.includes('--open-check');
const EXPECT_WORDS = 50;
const EXPECT_CARDS = 48;

function fail(msg) {
  console.error(msg);
  process.exit(1);
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ── 权威资产（实际集）＋ 缺省资产（参照集：--asset 指向删后副本时用来点名） ──
function parseAsset(text) {
  const domains = [...text.matchAll(/\{\s*id:\s*'([^']+)'\s*,\s*label:\s*'([^']+)'\s*,\s*icon:\s*'[^']*'\s*,\s*dir:\s*'([^']+)'\s*\}/g)]
    .map((m) => ({ id: m[1], label: m[2], dir: m[3] }));
  const cards = [...text.matchAll(/\{\s*id:\s*'([^']+)'\s*,\s*group:\s*'([^']+)'\s*,\s*domain:\s*'([^']+)'\s*,\s*slug:\s*'([^']+)'\s*\}/g)]
    .map((m) => ({ id: m[1], group: m[2], domain: m[3], slug: m[4] }));
  const wakes = [...text.matchAll(/\{\s*phrase:\s*'([^']+)'\s*,\s*source:\s*'([^']+)'\s*,\s*routable:\s*(true|false)\s*,\s*key:\s*'([^']+)'\s*,\s*group:\s*'([^']*)'\s*,\s*cards:\s*\[([^\]]*)\]/g)]
    .map((m) => ({ phrase: m[1], source: m[2], routable: m[3] === 'true', key: m[4], group: m[5], cards: [...m[6].matchAll(/'([^']+)'/g)].map((x) => x[1]) }));
  return { domains, cards, wakes };
}
if (!existsSync(ASSET)) fail('资产缺失：' + ASSET);
const A = parseAsset(readFileSync(ASSET, 'utf8'));
const refPhrases = parseAsset(readFileSync(DEFASSET, 'utf8')).wakes.map((w) => w.phrase);

// ── prompt：sceneData 的 prompt_template（源码转义 \n 还原为真实换行）＋ 3 条新写样本 ──
const sceneText = readFileSync(DEFSCENE, 'utf8');
const promptOf = new Map();
for (const m of sceneText.matchAll(/\{\s*id:\s*'([^']+)'[\s\S]*?prompt_template:\s*'((?:[^'\\]|\\.)*)'/g)) {
  promptOf.set(m[1], m[2].replace(/\\n/g, LF).replace(/\\'/g, "'").replace(/\\\\/g, '\\'));
}
const NEW_PROMPT = {
  完成做菜: '{{菜名}}做好了,帮我收尾。（新写样本，t767-对账表 §三；命令分支待实现，产物复用宿主卡内容）',
  查清单: '请加载私家大厨技能,帮我查看现有采购清单(唤醒词:查清单)。（新写样本；产物复用宿主卡内容）',
  清空清单: '请加载私家大厨技能,帮我清空采购清单(唤醒词:清空清单)。（新写样本；产物复用宿主卡内容）',
};
const HELP_PROMPT = 'HELP 能力速查（复用验收副本 HELP 文件，不另出业务页，t767-命名 §三.1）';

// ── manifest（48 格）＋ 文件级校验（存在＋bytes/sha256 重算） ──
if (!existsSync(MF)) fail('册子缺失：' + MF + '（先跑 t777-run-all.mjs）');
const mfRows = JSON.parse(readFileSync(MF, 'utf8'));
const mfByCard = new Map(mfRows.map((r) => [r['卡id'], r]));
const mfProblems = [];
for (const r of mfRows) {
  const p = r['产物绝对路径'];
  if (!p || !existsSync(p)) {
    mfProblems.push('册子落点缺失（' + r['卡id'] + '）：' + p);
    continue;
  }
  const html = readFileSync(p, 'utf8');
  const bytes = Buffer.byteLength(html, 'utf8');
  const sha = createHash('sha256').update(html, 'utf8').digest('hex');
  if (bytes !== r.bytes || sha !== r.sha256) mfProblems.push('册子与文件对不上（' + r['卡id'] + '）：' + p);
}

// ── 50 行装配 ──
const VARIANT_WORDS = ['完成做菜', '查清单', '清空清单', '排除可选'];
const VARIANT_HOST = { 完成做菜: 'cooking_start_fresh', 查清单: 'shopping_generate', 清空清单: 'shopping_generate', 排除可选: 'shopping_generate' };
const cardOf = new Map(A.cards.map((c) => [c.id, c]));
const dirOf = (domainId) => (A.domains.find((x) => x.id === domainId) || {}).dir || domainId;
const rows = [];
const rowProblems = [];
for (const w of A.wakes) {
  let file = '';
  let command = w.key;
  let params = {};
  let prompt = '';
  let note = '';
  if (w.source === 'help') {
    file = join(OUT, 'HELP', '私家大厨_HELP_验收副本.html');
    params = {};
    prompt = HELP_PROMPT;
  } else if (VARIANT_WORDS.includes(w.phrase)) {
    const host = VARIANT_HOST[w.phrase];
    const hc = cardOf.get(host);
    file = join(OUT, dirOf(hc.domain), host + '--' + w.phrase + '.html');
    const h = mfByCard.get(host);
    command = h ? h['命令'] : w.key;
    params = h ? h['参数'] : {};
    if (w.phrase === '排除可选') params = { ...(params && typeof params === 'object' ? params : {}), excludeOptional: true };
    prompt = NEW_PROMPT[w.phrase] || ((promptOf.get(host) || '') + '（参数不同另出路径，产物复用宿主卡内容）');
  } else {
    const host = w.cards[0];
    const h = host ? mfByCard.get(host) : undefined;
    if (!host || !h) {
      rowProblems.push('词无落点（' + w.phrase + '）：宿主卡 ' + (host || '空') + ' 不在册子里');
      continue;
    }
    file = h['产物绝对路径'];
    command = h['命令'];
    params = h['参数'];
    prompt = promptOf.get(host) || '';
    if (w.cards.length > 1) note = '本行代表首卡，组内共 ' + w.cards.length + ' 卡（见卡归属列）';
  }
  if (!existsSync(file)) rowProblems.push('行产物缺失（' + w.phrase + '）：' + file);
  rows.push({ wake: w.phrase, source: w.source, command, params, prompt, note, cards: w.cards, file });
}

// ── 覆盖对账 ──
const coveredCards = new Set();
for (const r of rows) for (const c of r.cards) coveredCards.add(c);
const missingCards = A.cards.map((c) => c.id).filter((id) => !coveredCards.has(id));
const missingWords = refPhrases.filter((p) => !A.wakes.some((w) => w.phrase === p));
const dead = rows.filter((r) => !existsSync(r.file));
const missing = missingCards.length + missingWords.length + dead.length + mfProblems.length + rowProblems.length;

for (const p of mfProblems) console.error('册子：' + p);
for (const p of rowProblems) console.error('行：' + p);
for (const c of missingCards) console.error('缺卡：' + c);
for (const p of missingWords) console.error('缺词：' + p);
for (const r of dead) console.error('死链：' + r.wake + ' → ' + r.file);
console.log('词 ' + A.wakes.length + '／卡 ' + coveredCards.size + '／链接 ' + rows.length + ' 条／缺失 ' + missing);

// ── 落页（绝对路径 file:// URL，不跨目录相对引用；不加 loading="lazy"） ──
mkdirSync(OUT, { recursive: true });
const trs = rows.map((r, i) => {
  const url = pathToFileURL(r.file).href;
  const cardCell = r.cards.length ? r.cards.join('、') : '—（HELP 词，复用 HELP 文件）';
  const promptCell = esc(r.prompt) + (r.note ? '<br><span class="dim">' + esc(r.note) + '</span>' : '');
  let mfLine = '';
  const h = r.cards.length ? mfByCard.get(r.cards[0]) : undefined;
  if (h) mfLine = '<br><span class="dim">exit=' + h.exit + ' · ' + Math.round(h.bytes / 1024) + 'KB</span>';
  return '<tr><td>' + (i + 1) + '</td><td><b>' + esc(r.wake) + '</b><br><span class="dim">' +
    esc(r.source === 'help' ? 'HELP 词' : r.source === 'old-group' ? '老组名' : '新表多出词') + '</span></td><td><code>' +
    esc(r.command) + '</code></td><td><code>' + esc(JSON.stringify(r.params)) + '</code></td><td>' + promptCell +
    '</td><td>' + esc(cardCell) + '</td><td><a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(url) +
    '</a>' + mfLine + '</td></tr>';
});
const page = '<!doctype html>' + LF +
  '<html lang="zh-CN"><head><meta charset="UTF-8">' + LF +
  '<meta name="viewport" content="width=device-width,initial-scale=1">' + LF +
  '<title>私家大厨链路总表：prompt → 唤醒词 → 命令 → HTML 绝对路径（50 行）</title>' + LF +
  '<style>' + LF +
  '*{margin:0;padding:0;box-sizing:border-box}' + LF +
  'body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;background:#f5f5f7;color:#1d1d1f;padding:24px 20px 60px}' + LF +
  'h1{font-size:22px;margin-bottom:6px}' + LF +
  '.sub{color:#6e6e73;font-size:13.5px;margin-bottom:16px;line-height:1.7}' + LF +
  'table{border-collapse:collapse;width:100%;background:#fff;font-size:13px}' + LF +
  'th,td{border:1px solid #d2d2d7;padding:8px 10px;vertical-align:top;text-align:left}' + LF +
  'th{background:#f5f5f7}' + LF +
  'td code{font-size:12px;word-break:break-all}' + LF +
  'td a{color:#007aff;word-break:break-all}' + LF +
  '.dim{color:#86868b;font-size:12px}' + LF +
  '</style></head><body>' + LF +
  '<h1>私家大厨链路总表：prompt → 唤醒词 → 命令 → HTML 绝对路径</h1>' + LF +
  '<div class="sub">本页链接指向<strong>验收副本</strong>（与本页同目录）：<code>' + esc(OUT) +
  '</code><br>50 条唤醒词条条有产物，48 张卡逐卡有落点；HELP 4 词复用同一份 HELP 文件（t767-命名 §三.1），' +
  '参数不同的新表多出词 4 条各走独立路径（§三.2）。点<strong>产物绝对路径</strong>即在新标签打开那份产物。</div>' + LF +
  '<table><thead><tr><th>序</th><th>唤醒词</th><th>命令</th><th>参数</th><th>prompt</th><th>卡归属</th><th>产物绝对路径</th></tr></thead>' + LF +
  '<tbody>' + LF + trs.join(LF) + LF + '</tbody></table>' + LF + '</body></html>' + LF;
writeFileSync(PAGE, page, 'utf8');
if (page.includes('loading="lazy"')) fail('链路页禁 loading="lazy"');

// ── 点击实测（真浏览器逐行打开；不用文件存在冒充） ──
if (OPEN_CHECK) {
  const { withBrowser } = await import('./t768-质量门.mjs');
  const hrefs = [...page.matchAll(/href="(file:[^"]+\.html)"/g)].map((m) => m[1]);
  const opened = [];
  const deadLinks = [];
  const r = await withBrowser(async ({ s, sleep }) => {
    const val = async (expression) => {
      const st = await s('Runtime.evaluate', { expression, returnByValue: true });
      return st && st.result ? st.result.value : undefined;
    };
    const gotoUrl = async (url) => {
      await s('Page.navigate', { url });
      for (let i = 0; i < 40; i += 1) {
        if ((await val('document.readyState')) === 'complete') break;
        await sleep(100);
      }
    };
    await gotoUrl(pathToFileURL(PAGE).href);
    for (const url of hrefs) {
      try {
        await gotoUrl(url);
        // 死文件在 Chrome 里落到 chrome-error:// 错误页，location 不再是 file: —— 这就是死链判据；
        // 活页三信号：地址仍是 file: ＋ readyState complete ＋ body 有字。
        const loc = await val('location.href');
        const ok = await val('document.readyState');
        const len = await val('document.body ? document.body.innerText.length : 0');
        const hasHtml = await val('document.querySelector("html") ? 1 : 0');
        if (typeof loc === 'string' && loc.startsWith('file:') && ok === 'complete' && hasHtml === 1 && len > 0) {
          opened.push(url);
        } else {
          deadLinks.push(url + '（loc=' + String(loc).slice(0, 40) + '）');
        }
      } catch (e) {
        deadLinks.push(url + '（' + String(e.message ?? e).slice(0, 60) + '）');
      }
    }
  });
  if (r && r.error !== undefined) fail('浏览器起不来，真机点击实测做不了：' + r.error);
  for (const u of deadLinks) console.error('点不开：' + u);
  console.log('可打开 ' + opened.length + '／死链 ' + deadLinks.length);
  process.exit(deadLinks.length === 0 && opened.length === rows.length ? 0 : 1);
}

if (missing !== 0 || A.wakes.length !== EXPECT_WORDS || coveredCards.size !== EXPECT_CARDS) process.exit(1);
console.log('OK：50 词条条有产物，48 卡逐卡有落点，链接无死链');
