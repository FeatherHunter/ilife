#!/usr/bin/env node
/**
 * t-help-parity-extract.mjs · 两侧结构化解析（#83 · 地图 #63 主线②）
 *
 * 作用：把「旧侧（F3 根镜像 ＋ 两个冻结实例）」与「新侧（最终代码三态产物）」都**用脚本**解析成
 *       机器可读 JSON（`.scratch/t-parity/old-parse.json` / `fixtures-parse.json` / `new-parse.json`），
 *       供 `t-help-parity-compare.mjs` 出七维度台账。**不人眼看大文件、不改任何产物**。
 *
 * 用法（工作目录＝仓库根；先跑 `t-help-parity-gen.mjs` 生成 manifest）：
 *   node docs/research/t-help-parity-extract.mjs
 *   node docs/research/t-help-parity-extract.mjs --old "D:\\2Study\\StudyNotes\\SKILLS\\卡路里\\卡路里.html"
 *   node docs/research/t-help-parity-extract.mjs --manifest .scratch/t-parity/gen-manifest.json
 *
 * 只读纪律：旧侧路径**只读**；`fixtures/help-instances/**` **只读**（哈希与 SHA256SUMS.txt 对账）。
 * 输出：`RESULT: n/m …` 摘要行（最后一行恒为总判定）。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const argv = process.argv.slice(2);
const argOf = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : dflt;
};
const ROOT = process.cwd();
const OUT = path.resolve(ROOT, argOf('--out', '.scratch/t-parity'));
const MANIFEST = path.resolve(ROOT, argOf('--manifest', path.join(OUT, 'gen-manifest.json')));
const OLD = argOf('--old', 'D:\\2Study\\StudyNotes\\SKILLS\\卡路里\\卡路里.html');
const FIXTURE_DIR = path.resolve(ROOT, argOf('--fixtures', 'fixtures/help-instances'));

fs.mkdirSync(OUT, { recursive: true });

let checks = 0;
let pass = 0;
const ok = (cond, label, detail) => {
  checks++;
  if (cond) pass++;
  console.log((cond ? 'PASS ' : 'FAIL ') + label + (detail ? ' · ' + detail : ''));
  return !!cond;
};
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

// ── 解析器 ────────────────────────────────────────────────────────────────────
function parseHtml(file, label) {
  const buf = fs.readFileSync(file);
  const s = buf.toString('utf8');
  const payloadM = s.match(/<script\s+id="([^"]+)"\s+type="application\/json">([\s\S]*?)<\/script>/);
  let data = null;
  if (payloadM) {
    try {
      data = JSON.parse(payloadM[2]);
    } catch (err) {
      data = null;
    }
  }
  const cssBlocks = [...s.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
  const css = cssBlocks.join('\n');
  let js = '';
  const jsBlocks = [];
  for (const m of s.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/type="application\/json"/.test(m[1])) continue;
    js += m[2];
    jsBlocks.push({ attrs: m[1].trim(), bytes: Buffer.byteLength(m[2], 'utf8') });
  }
  const count = (re) => (s.match(re) || []).length;
  const countJs = (re) => (js.match(re) || []).length;
  // DOM 计数只在**标记**上做：剥掉 <script>／<style> 的内容，避免 JS 模板串与 CSS 选择器污染计数。
  const markup = s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '');
  const countMarkup = (re) => (markup.match(re) || []).length;
  const scenes = [];
  const groups = data?.groups ?? data?.categories ?? [];
  for (const g of groups) {
    for (const sg of g.subgroups ?? []) {
      (sg.scenes ?? []).forEach((sc, idx) => {
        const cliField = (sc.editable_fields ?? []).find((f) => f.name === 'cli') ?? null;
        scenes.push({
          gid: g.id,
          glabel: g.label,
          gicon: g.icon ?? null,
          sgid: sg.id,
          sglabel: sg.label,
          idx,
          id: sc.id,
          title: sc.title ?? null,
          wake_word: sc.wake_word ?? null,
          status: sc.status ?? null,
          prompt_template: sc.prompt_template ?? null,
          types_raw: sc.types ?? null,
          types_text: (sc.types ?? []).map((t) => (t && typeof t === 'object' ? t.text : t)),
          types_shaped: (sc.types ?? []).some((t) => t && typeof t === 'object'),
          cli: cliField ? cliField.value : null,
          cli_label: cliField ? cliField.label : null,
          editable_field_names: (sc.editable_fields ?? []).map((f) => f.name),
        });
      });
    }
  }
  const subgroupCount = groups.reduce((a, g) => a + (g.subgroups ?? []).length, 0);
  const groupDigest = groups.map((g) => ({
    id: g.id,
    label: g.label,
    icon: g.icon ?? null,
    subgroups: (g.subgroups ?? []).length,
    scenes: (g.subgroups ?? []).reduce((a, sg) => a + (sg.scenes ?? []).length, 0),
  }));
  const subgroupDigest = groups.flatMap((g) => (g.subgroups ?? []).map((sg) => ({ gid: g.id, id: sg.id, label: sg.label, scenes: (sg.scenes ?? []).length })));

  return {
    label,
    file,
    bytes: buf.length,
    lines: s.split('\n').length,
    sha256: sha256(buf),
    utf8NoBom: !(buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf),
    payload: payloadM ? { scriptId: payloadM[1], bytes: Buffer.byteLength(payloadM[2], 'utf8'), topKeys: Object.keys(data ?? {}) } : null,
    meta: data
      ? { skill_name: data.skill_name ?? null, title: data.title ?? null, subtitle: data.subtitle ?? null, contactKeys: Object.keys(data.contact ?? {}), meta_blocks: data.meta_blocks ?? null }
      : null,
    counts: { groups: groups.length, subgroups: subgroupCount, scenes: scenes.length },
    groupDigest,
    subgroupDigest,
    scenes,
    sceneKeyHist: scenes.reduce((acc, x) => {
      const keys = ['id', 'title', 'wake_word', 'status', 'prompt_template', 'types'];
      for (const k of keys) acc[k] = (acc[k] ?? 0) + (x[k] !== null && x[k] !== undefined ? 1 : 0);
      if (x.editable_field_names.length) acc.editable_fields = (acc.editable_fields ?? 0) + 1;
      if (x.cli !== null) acc.cli_field = (acc.cli_field ?? 0) + 1;
      return acc;
    }, {}),
    dom: {
      bytesHtml: Buffer.byteLength(s, 'utf8'),
      markupBytes: Buffer.byteLength(markup, 'utf8'),
      cardsOld: countMarkup(/class="mini"/g),
      cardsNew: countMarkup(/class="ilife-help-shell-card"/g),
      subgroupEls: countMarkup(/class="ilife-help-shell-subgroup"/g),
      subgroupElsOld: countMarkup(/class="subgroup"/g),
      buttons: countMarkup(/<button/g),
      pre: countMarkup(/<pre/g),
      details: countMarkup(/<details/g),
      codeCli: countMarkup(/class="ilife-help-shell-cli"/g),
      fieldRows: countMarkup(/class="ilife-help-shell-field"/g),
      tabRadios: countMarkup(/class="ilife-help-shell-tab-input"/g),
      staticSearchInput: countMarkup(/type="search"/g),
      staticBackTop: countMarkup(/id="backTop"/g),
      staticCopied: countMarkup(/copied/g),
      viewEntries: countMarkup(/data-view-entry=/g),
      staticCardsJson: null,
      jsTemplateCards: count(/class="mini"/g),
    },
    css: {
      bytes: Buffer.byteLength(css, 'utf8'),
      blocks: cssBlocks.length,
      focusVisible: (css.match(/:focus-visible/g) || []).length,
      prefersReducedMotion: (css.match(/prefers-reduced-motion/g) || []).length,
      linearGradients: [...new Set([...css.matchAll(/linear-gradient\([^)]*\)/g)].map((m) => m[0]))],
      mediaQueries: [...new Set([...css.matchAll(/@media[^{]*\{/g)].map((m) => m[0].replace(/\s+/g, ' ').trim()))],
      tnum: /tnum/.test(css),
      fontStack: /-apple-system/.test(css) && /PingFang SC/.test(css),
      markRule: /(^|[},])\s*mark\b/.test(css),
    },
    js: {
      bytes: Buffer.byteLength(js, 'utf8'),
      blocks: jsBlocks,
      functions: [...new Set([...js.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map((m) => m[1]))],
      consts: [...new Set([...js.matchAll(/(?:var|let|const)\s+([A-Z_][A-Z0-9_]{2,})\s*=/g)].map((m) => m[1]))],
      markers: {
        searchInputCreated: /createElement\("input"\)|createElement\('input'\)/.test(js),
        searchPlaceholder: /搜索全部场景/.test(js),
        hitCountText: /匹配 /.test(js),
        emptyText: /没有找到相关场景/.test(js),
        clearButton: /清空搜索|sClear/.test(js),
        highlightMark: /createElement\("mark"\)|createElement\('mark'\)|<mark>/.test(js),
        highlightScopeName: /m-name/.test(js),
        highlightScopeCard: /wrapTerm/.test(js),
        jumpPage: /jumpTo|scrollTo\(\{left|scrollTo\(\{ left/.test(js),
        cardCopyButton: /injectCardCopy|copy-btn/.test(js),
        copyLabel: /复制指令/.test(js) ? '复制指令' : (/'>复制</.test(js) || /复制 prompt/.test(js) ? '复制' : null),
        sheetPreview: /refreshPreview|renderPreview|data-prev/.test(js),
        sheetPreviewBuild: /buildPrompt/.test(js),
        sheetValidate: /getMissing/.test(js),
        backTop: /backTop|回到顶部/.test(js),
        copiedState: /markCopied|copied/.test(js),
        toast: /toast/i.test(js),
        toastOkMsg: /已复制/.test(js),
        keyboardEnter: /keydown/.test(js) && /Enter/.test(js),
        clipboardApi: /navigator\.clipboard/.test(js),
        execCommandFallback: /execCommand\('copy'\)|execCommand\("copy"\)/.test(js),
        sheetRealtimeOnInput: /addEventListener\("input"|addEventListener\('input'\)/.test(js),
      },
      counts: {
        markCreate: countJs(/createElement\("mark"\)|createElement\('mark'\)/g),
        buttonCreate: countJs(/createElement\("button"\)|createElement\('button'\)/g),
        inputCreate: countJs(/createElement\("input"\)|createElement\('input'\)/g),
      },
    },
  };
}

// ── 旧侧：F3 根镜像 ────────────────────────────────────────────────────────────
ok(fs.existsSync(OLD), 'F3 根镜像可读（只读）', OLD);
const old = fs.existsSync(OLD) ? parseHtml(OLD, 'old-f3-root-mirror') : null;
if (old) {
  console.log('OLD bytes=' + old.bytes + ' lines=' + old.lines + ' sha256=' + old.sha256 + ' groups=' + old.counts.groups + ' subgroups=' + old.counts.subgroups + ' scenes=' + old.counts.scenes);
  ok(old.counts.groups === 10 && old.counts.subgroups === 54 && old.counts.scenes === 436, '旧侧 10/54/436', old.counts.groups + '/' + old.counts.subgroups + '/' + old.counts.scenes);
  ok(old.payload !== null, '旧侧内嵌 payload 可解析', String(old.payload?.scriptId));
  ok(old.dom.cardsOld === 0, '旧侧静态 DOM 无卡（运行时生成，L-16 归因前置）', 'cardsOld=' + old.dom.cardsOld);
  ok(old.scenes.every((x) => x.cli === null), '旧侧 436 场景**无** cli 字段（F3 不展示 CLI，L-09）', 'cliField=' + (old.sceneKeyHist.cli_field ?? 0));
}
fs.writeFileSync(path.join(OUT, 'old-parse.json'), JSON.stringify(old, null, 2), 'utf8');

// ── 旧侧参考：两个冻结实例（只读 ＋ 哈希对账）────────────────────────────────
const sumsPath = path.join(FIXTURE_DIR, 'SHA256SUMS.txt');
const sums = fs.existsSync(sumsPath) ? fs.readFileSync(sumsPath, 'utf8').split('\n').filter((l) => /^[0-9a-f]{64}\s\s/.test(l)).map((l) => ({ sha256: l.slice(0, 64), name: l.slice(66).trim() })) : [];
const fixtures = [];
for (const f of fs.existsSync(FIXTURE_DIR) ? fs.readdirSync(FIXTURE_DIR).filter((n) => n.endsWith('.html')).sort() : []) {
  const p = path.join(FIXTURE_DIR, f);
  const parsed = parseHtml(p, 'fixture');
  const buf = fs.readFileSync(p);
  const expected = sums.find((s) => s.name === f || s.name.includes(f))?.sha256 ?? null;
  const inner = (buf.toString('utf8').match(/window\.__DATA__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/) ?? [])[1];
  let summary = null;
  let summaryKeys = null;
  try {
    const parsedData = inner ? JSON.parse(inner) : null;
    summary = parsedData?.data?.summary ?? null;
    summaryKeys = summary ? Object.keys(summary) : parsedData ? Object.keys(parsedData?.data ?? parsedData) : null;
  } catch (err) {
    summary = null;
  }
  fixtures.push({
    file: f,
    path: p,
    bytes: parsed.bytes,
    lines: parsed.lines,
    sha256: parsed.sha256,
    expectedSha256: expected,
    shaMatches: expected === null ? null : expected === parsed.sha256,
    payload: parsed.payload,
    summary,
    summaryKeys,
    dom: parsed.dom,
    css: parsed.css,
    js: parsed.js.markers,
  });
  ok(expected !== null && expected === parsed.sha256, '冻结实例哈希与 SHA256SUMS.txt 一致（只读）', f + ' ' + parsed.sha256.slice(0, 16) + '…');
}
fs.writeFileSync(path.join(OUT, 'fixtures-parse.json'), JSON.stringify(fixtures, null, 2), 'utf8');
console.log('FIXTURES ' + fixtures.map((x) => x.file + '=' + x.bytes + 'B/' + (x.summary ? x.summary.total_wake_words + 'wake/' + x.summary.total_categories + 'cat' : 'no-summary')).join(' | '));

// ── 新侧：三态产物（路径／sha256 取自 manifest）───────────────────────────────
ok(fs.existsSync(MANIFEST), 'gen-manifest.json 存在（先跑 t-help-parity-gen.mjs）', MANIFEST);
const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : null;
const newParses = {};
if (manifest) {
  for (const [mode, m] of Object.entries(manifest.modes)) {
    const p = m.artifact?.path;
    if (!p || !fs.existsSync(p)) {
      ok(false, 'mode=' + mode + ' 产物可读', String(p));
      continue;
    }
    const parsed = parseHtml(p, 'new-' + mode);
    parsed.mode = mode;
    parsed.envelope = {
      exit: m.exit,
      stdoutLines: m.stdoutLines,
      stdoutBytes: m.stdoutBytes,
      delivery: m.delivery,
      dataKeys: m.dataKeys,
      dataMode: m.dataMode,
      dataBytes: m.dataBytes,
      dataTextBytes: m.dataTextBytes,
    };
    newParses[mode] = parsed;
    ok(parsed.sha256 === m.artifact.sha256, 'mode=' + mode + ' 解析文件与 manifest sha256 一致', parsed.sha256.slice(0, 16) + '…');
  }
  // 三态字节稳定性（同源 ＋ 去时间戳）
  const fileMode = newParses.file;
  if (fileMode) {
    ok(fileMode.counts.groups === 10 && fileMode.counts.subgroups === 54 && fileMode.counts.scenes === 436, '新侧 file 态 10/54/436', fileMode.counts.groups + '/' + fileMode.counts.subgroups + '/' + fileMode.counts.scenes);
    ok(fileMode.dom.cardsNew === 436, '新侧静态卡 436/436（#88 交付形态）', 'cardsNew=' + fileMode.dom.cardsNew);
    ok(fileMode.dom.codeCli === 436, '新侧卡级 <code class=cli> 436/436（L-09 显示 Scene.id）', 'codeCli=' + fileMode.dom.codeCli);
    ok((fileMode.sceneKeyHist.cli_field ?? 0) === 341, '新侧 sheet「可执行命令」341/436（#106）', 'cliField=' + (fileMode.sceneKeyHist.cli_field ?? 0));
  }
  const inlineMode = newParses.inline;
  if (inlineMode) ok(inlineMode.payload === null, 'inline 态无 payload JSON（片段交付）', String(inlineMode.payload));
  const textMode = newParses.text;
  if (textMode) {
    ok(textMode.payload === null && textMode.dom.buttons === 0, 'text 态无 DOM／无 payload（纯文本索引）', 'buttons=' + textMode.dom.buttons);
    ok(textMode.lines > 400, 'text 态行数 > 400', 'lines=' + textMode.lines);
  }
}
fs.writeFileSync(path.join(OUT, 'new-parse.json'), JSON.stringify(newParses, null, 2), 'utf8');

console.log('WROTE ' + ['old-parse.json', 'fixtures-parse.json', 'new-parse.json'].map((f) => path.join(OUT, f)).join(' '));
console.log('RESULT: ' + pass + '/' + checks + ' extract-checks');
process.exit(pass === checks ? 0 : 1);
