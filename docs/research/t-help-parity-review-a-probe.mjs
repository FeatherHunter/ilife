#!/usr/bin/env node
/**
 * t-help-parity-review-a-probe.mjs · 对抗式审查席 A（数据面/红队）独立探针
 *
 * 目的：**不复用**被审席的 `.scratch/t-parity/*.json` 与产物，独立重算：
 *   1) `--regen`：用最终代码 + 自己的 `SKILLS_DB_PATH` 在持锁下重生成三态，记录 exit/字节/sha256/stdout；
 *   2) `--inspect`：只看结构样本，用于设计独立解析器（不写产物）；
 *   3) `--parse`：独立解析旧侧（F3 根镜像）与**自己**的新侧产物，重算七维度。
 *
 * 只读旧侧与既有产物；只写 `.scratch/review-a-*`；不写 packages/**、tooling/**、既有 docs/**。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const OUT = path.resolve(ROOT, '.scratch/review-a-probe');
const DB = path.resolve(ROOT, '.scratch/review-a-db');
const OLD = 'D:\\2Study\\StudyNotes\\SKILLS\\卡路里\\卡路里.html';
const TICKET = '63';
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(DB, { recursive: true });

const argv = process.argv.slice(2);
const has = (n) => argv.includes(n);
const argOf = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const bOf = (s) => Buffer.byteLength(s, 'utf8');
const nb = (s) => (s === '' ? 0 : s.split('\n').filter((l, i, a) => !(i === a.length - 1 && l === '')).length);
const j = (p, v) => fs.writeFileSync(path.resolve(ROOT, p), JSON.stringify(v, null, 2), 'utf8');

// ── 独立解析器（与 extract.mjs 不同实现：单遍切片 + 结构化取键）────────────────
function payloadOf(s) {
  const m = s.match(/<script\b[^>]*\bid="([^"]+)"[^>]*\btype="application\/json"[^>]*>([\s\S]*?)<\/script>/)
    ?? s.match(/<script\b[^>]*\btype="application\/json"[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  let data = null; let parseErr = null;
  try { data = JSON.parse(m[2]); } catch (e) { parseErr = String(e.message); }
  return { scriptId: m[1], raw: m[2], bytes: bOf(m[2]), data, parseErr };
}
function strips(s) {
  const cssBlocks = [];
  const jsBlocks = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(s))) {
    if (/type="application\/json"/.test(m[1])) continue;
    jsBlocks.push({ attrs: m[1].trim(), body: m[2] });
  }
  const re2 = /<style\b([^>]*)>([\s\S]*?)<\/style>/g;
  while ((m = re2.exec(s))) cssBlocks.push({ attrs: m[1].trim(), body: m[2] });
  const markup = s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '');
  return { cssBlocks, jsBlocks, markup };
}
function parseSide(file, tag) {
  const buf = fs.readFileSync(file);
  const s = buf.toString('utf8');
  const p = payloadOf(s);
  const { cssBlocks, jsBlocks, markup } = strips(s);
  const css = cssBlocks.map((x) => x.body).join('\n');
  const js = jsBlocks.map((x) => x.body).join('\n');
  const groups = p?.data?.groups ?? p?.data?.categories ?? [];
  const scenes = [];
  for (const g of groups) {
    for (const sg of g.subgroups ?? []) {
      (sg.scenes ?? []).forEach((sc, idx) => {
        const ef = Array.isArray(sc.editable_fields) ? sc.editable_fields : [];
        const cliF = ef.find((f) => f && f.name === 'cli') ?? null;
        scenes.push({
          gid: g.id, sgid: sg.id, idx,
          id: sc.id ?? null,
          title: sc.title ?? null,
          wake_word: sc.wake_word ?? null,
          status: sc.status ?? null,
          prompt_template: sc.prompt_template ?? null,
          types: sc.types ?? null,
          fieldNames: ef.map((f) => f && f.name),
          cli: cliF ? cliF.value ?? null : null,
          rawKeys: Object.keys(sc),
        });
      });
    }
  }
  const cnt = (re, txt = markup) => [...txt.matchAll(re)].length;
  const cardsRe = /<article class="ilife-help-shell-card"[\s\S]*?<\/article>/g;
  const cards = [...markup.matchAll(cardsRe)].map((m) => m[0]);
  const cardCode = cards.map((c) => {
    const codeM = c.match(/<code class="ilife-help-shell-cli"[^>]*>([\s\S]*?)<\/code>/);
    const idM = c.match(/data-scene-id="([^"]*)"/) ?? c.match(/data-id="([^"]*)"/) ?? c.match(/id="card-([^"]*)"/);
    return { sceneIdAttr: idM ? idM[1] : null, code: codeM ? codeM[1] : null };
  });
  return {
    tag, file, bytes: buf.length, chars: s.length, sha256: sha256(buf), lines: s.split('\n').length,
    payload: p ? { scriptId: p.scriptId, bytes: p.bytes, parseErr: p.parseErr, topKeys: p.data ? Object.keys(p.data) : null } : null,
    counts: { groups: groups.length, subgroups: groups.reduce((a, g) => a + (g.subgroups ?? []).length, 0), scenes: scenes.length },
    groupDigest: groups.map((g) => ({ id: g.id, label: g.label, icon: g.icon ?? null, subgroups: (g.subgroups ?? []).length, scenes: (g.subgroups ?? []).reduce((a, sg) => a + (sg.scenes ?? []).length, 0) })),
    subgroupDigest: groups.flatMap((g) => (g.subgroups ?? []).map((sg) => ({ gid: g.id, id: sg.id, label: sg.label, scenes: (sg.scenes ?? []).length }))),
    scenes,
    chunks: {
      total: buf.length,
      markup: bOf(markup),
      payload: p ? p.bytes : 0,
      css: bOf(css),
      js: bOf(js),
    },
    dom: {
      cards: cnt(cardsRe),
      cardsMini: cnt(/class="mini"/g),
      buttons: cnt(/<button\b/g),
      details: cnt(/<details\b/g),
      pre: cnt(/<pre\b/g),
      codeCli: cnt(/<code class="ilife-help-shell-cli"/g),
      fieldRows: cnt(/<li class="ilife-help-shell-field"/g),
      tabRadios: cnt(/class="ilife-help-shell-tab-input"/g),
      searchInput: cnt(/type="search"/g),
      backTop: cnt(/id="backTop"/g),
      dataSceneId: cnt(/data-scene-id=/g),
      viewEntry: cnt(/data-view-entry=/g),
      subgroupEls: cnt(/class="ilife-help-shell-subgroup"/g),
      cardMark: cnt(/card-mark/g),
    },
    cardCode,
    cssInfo: {
      bytes: bOf(css), blocks: cssBlocks.length,
      focusVisible: (css.match(/:focus-visible/g) || []).length,
      prefersReducedMotion: (css.match(/prefers-reduced-motion/g) || []).length,
      linearGradients: [...new Set([...css.matchAll(/linear-gradient\([^)]*\)/g)].map((m) => m[0]))],
      mediaQueries: [...new Set([...css.matchAll(/@media[^{]*\{/g)].map((m) => m[0].replace(/\s+/g, ' ').trim()))],
    },
    jsInfo: {
      bytes: bOf(js), blocks: jsBlocks.length,
      markers: {
        backTop: /backTop|回到顶部/.test(js),
        getMissing: /getMissing/.test(js),
        toastMissing: /请先填写/.test(js),
        searchPlaceholder: /搜索全部场景/.test(js),
        hitCount: /匹配 /.test(js),
        emptyText: /没有找到相关场景/.test(js),
        wrapTerm: /wrapTerm/.test(js),
        mName: /m-name/.test(js),
        jumpTo: /jumpTo/.test(js),
        scrollToLeft: /scrollTo\(\s*\{\s*left/.test(js),
        sheetPreview: /refreshPreview|renderPreview|data-prev/.test(js),
        buildPrompt: /buildPrompt/.test(js),
        copied: /copied/.test(js),
        toastCopied: /已复制/.test(js),
        clipboardApi: /navigator\.clipboard/.test(js),
        execCommand: /execCommand\(['"]copy['"]\)/.test(js),
        keydownEnter: /keydown/.test(js) && /Enter/.test(js),
        injectCardCopy: /injectCardCopy|copy-btn|复制指令/.test(js),
        copyLabelCmd: /复制指令/.test(js),
        copyLabelWake: /复制唤醒词/.test(js),
        copyLabelParams: /复制参数/.test(js),
        perCardCopy: /复制/.test(js),
      },
    },
  };
}

// ── 持锁跑一条 CLI ────────────────────────────────────────────────────────────
function locked(innerArgv) {
  const cmd = ['node', 'tooling/run-locked.mjs', '--ticket', TICKET, '--', ...innerArgv];
  const r = spawnSync(cmd[0], cmd.slice(1), { cwd: ROOT, env: { ...process.env, SKILLS_DB_PATH: DB }, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const stderr = String(r.stderr ?? '');
  const resultLine = [...stderr.matchAll(/^RESULT: .*$/gm)].pop()?.[0] ?? '';
  const runId = (resultLine.match(/runId=([0-9a-f-]{36})/) ?? [])[1] ?? null;
  const stdout = String(r.stdout ?? '');
  return { cmd: cmd.join(' '), inner: innerArgv.join(' '), runId, resultLine, exit: r.status, stdout, stdoutBytes: bOf(stdout), stdoutLines: nb(stdout) };
}

const MODES = [
  { mode: 'file', params: null, claimed: { bytes: 1264822, sha: 'f380ef685065a1e9279961952cc9ef76bd235d6ee65c157f9114f4e60b2b79c2', stdoutBytes: 1276, stdoutLines: 1, deliveryMode: 'file', dataMode: 'file' } },
  { mode: 'inline', params: '{"mode":"inline"}', claimed: { bytes: 994295, sha: '8c1683daacf8af9a98cc62e3a33c044efcece0d5b2e813299ebaeefedabc14f0', stdoutBytes: 1280, stdoutLines: 1, deliveryMode: 'file', dataMode: 'inline' } },
  { mode: 'text', params: '{"mode":"text"}', claimed: { bytes: 24989, sha: '92425e0abb47e6268dbb19ecc7f66272f375b75259cf3ab768737f508934d8bb', stdoutBytes: 26827, stdoutLines: 1, deliveryMode: 'text', dataMode: 'text' } },
];

if (has('--inspect')) {
  const f = argOf('--file', 'D:\\ilife\\.scratch\\final-db\\calorie_html\\身材照HELP_20260909_234219.html');
  const s = fs.readFileSync(f, 'utf8');
  const p = payloadOf(s);
  console.log('payloadScriptId=' + p?.scriptId + ' payloadBytes=' + p?.bytes + ' parseErr=' + p?.parseErr);
  console.log('payloadTopKeys=' + JSON.stringify(p?.data ? Object.keys(p.data) : null));
  const g0 = (p?.data?.groups ?? p?.data?.categories ?? [])[0];
  console.log('group0keys=' + JSON.stringify(g0 ? Object.keys(g0) : null));
  const sg0 = g0?.subgroups?.[0];
  console.log('subgroup0keys=' + JSON.stringify(sg0 ? Object.keys(sg0) : null));
  const sc0 = sg0?.scenes?.[0];
  console.log('scene0keys=' + JSON.stringify(sc0 ? Object.keys(sc0) : null));
  console.log('scene0=' + JSON.stringify(sc0).slice(0, 900));
  const cardM = s.match(/<article class="ilife-help-shell-card"[\s\S]{0,700}/);
  console.log('--- card block head ---\n' + (cardM ? cardM[0] : 'NONE'));
  const codeM = [...s.matchAll(/.{160}<code class="ilife-help-shell-cli"[\s\S]{0,200}/g)].slice(0, 2).map((m) => m[0]);
  console.log('--- code context ---\n' + codeM.join('\n@@@\n'));
  const fr = s.match(/<li class="ilife-help-shell-field"[\s\S]{0,500}/);
  console.log('--- field row head ---\n' + (fr ? fr[0] : 'NONE'));
  process.exit(0);
}

if (has('--regen')) {
  const rounds = Number(argOf('--rounds', '3'));
  const out = { generatedBy: 't-help-parity-review-a-probe.mjs --regen', at: new Date().toISOString(), db: DB, rounds: [], perMode: {} };
  for (let r = 1; r <= rounds; r++) {
    const round = { round: r, modes: {} };
    for (const spec of MODES) {
      const inner = ['node', 'packages/skill-calorie/dist/cli/cmd_read.js', 'calorie.help.center'];
      if (spec.params) inner.push('--params', spec.params);
      const res = locked(inner);
      let env = null; try { env = JSON.parse(res.stdout.trim()); } catch { env = null; }
      const outPath = env?.data?.output ?? null;
      const art = outPath && fs.existsSync(outPath) ? (() => { const b = fs.readFileSync(outPath); return { path: outPath, bytes: b.length, sha256: sha256(b), lines: b.toString('utf8').split('\n').length }; })() : null;
      const rec = {
        mode: spec.mode, cmd: res.cmd, runId: res.runId, resultLine: res.resultLine, exit: res.exit,
        stdoutBytes: res.stdoutBytes, stdoutLines: res.stdoutLines,
        envelopeKeys: env ? Object.keys(env) : null,
        dataKeys: env?.data ? Object.keys(env.data) : null,
        dataMode: env?.data?.mode ?? null, dataBytes: env?.data?.bytes ?? null,
        dataTextBytes: typeof env?.data?.text === 'string' ? bOf(env.data.text) : null,
        delivery: env?.delivery ?? null, artifact: art,
        claimed: spec.claimed,
        match: {
          exit: res.exit === 0,
          bytes: art ? art.bytes === spec.claimed.bytes : false,
          sha: art ? art.sha256 === spec.claimed.sha : false,
          stdoutBytes: res.stdoutBytes === spec.claimed.stdoutBytes,
          stdoutLines: res.stdoutLines === spec.claimed.stdoutLines,
          deliveryMode: (env?.delivery?.mode ?? null) === spec.claimed.deliveryMode,
          dataMode: (env?.data?.mode ?? null) === spec.claimed.dataMode,
        },
      };
      round.modes[spec.mode] = rec;
      (out.perMode[spec.mode] ??= []).push({ round: r, bytes: art?.bytes ?? null, sha: art?.sha256 ?? null, exit: res.exit, stdoutBytes: res.stdoutBytes, runId: res.runId });
      console.log(`R${r} ${spec.mode} exit=${res.exit} stdoutB=${res.stdoutBytes} stdoutL=${res.stdoutLines} art=${art ? art.bytes + 'B' : '-'} sha=${art ? art.sha256.slice(0, 16) : '-'} match=${JSON.stringify(rec.match)} runId=${res.runId}`);
    }
    out.rounds.push(round);
  }
  out.determinism = Object.fromEntries(Object.entries(out.perMode).map(([m, rs]) => [m, { runs: rs.length, shaUnique: new Set(rs.map((x) => x.sha)).size, byteUnique: new Set(rs.map((x) => x.bytes)).size }]));
  j('.scratch/review-a-probe/regen.json', out);
  console.log('DETERMINISM ' + JSON.stringify(out.determinism));
  process.exit(0);
}

if (has('--parse')) {
  const regen = JSON.parse(fs.readFileSync(path.resolve(ROOT, '.scratch/review-a-probe/regen.json'), 'utf8'));
  const newFile = regen.rounds[0].modes.file.artifact.path;
  const newInline = regen.rounds[0].modes.inline.artifact.path;
  const newText = regen.rounds[0].modes.text.artifact.path;
  const oldS = parseSide(OLD, 'old');
  const newS = parseSide(newFile, 'new-file');
  const inlineS = parseSide(newInline, 'new-inline');
  const textS = parseSide(newText, 'new-text');
  const rep = { generatedBy: 't-help-parity-review-a-probe.mjs --parse', at: new Date().toISOString(), old: oldS, newFile: newS, newInline: inlineS, newText: textS, dims: {}, samples: {}, notes: [] };
  j('.scratch/review-a-probe/parse-a.json', rep);
  console.log('OLD  bytes=' + oldS.bytes + ' groups=' + oldS.counts.groups + ' sg=' + oldS.counts.subgroups + ' sc=' + oldS.counts.scenes + ' sha=' + oldS.sha256.slice(0, 16));
  console.log('NEW  bytes=' + newS.bytes + ' groups=' + newS.counts.groups + ' sg=' + newS.counts.subgroups + ' sc=' + newS.counts.scenes + ' sha=' + newS.sha256.slice(0, 16));
  console.log('chunks old=' + JSON.stringify(oldS.chunks));
  console.log('chunks new=' + JSON.stringify(newS.chunks));
  console.log('dom new=' + JSON.stringify(newS.dom));
  console.log('dom old=' + JSON.stringify(oldS.dom));
  console.log('cardCode sample=' + JSON.stringify(newS.cardCode.slice(0, 2)) + ' total=' + newS.cardCode.length);
  console.log('scene0 keys old=' + JSON.stringify(oldS.scenes[0]?.rawKeys) + ' new=' + JSON.stringify(newS.scenes[0]?.rawKeys));
  process.exit(0);
}

if (has('--same')) {
  // 三态同源：跑一次三态并把 stdout 落盘，比较 data.text ↔ 产物、inline 片段 ↔ file
  const rec = { at: new Date().toISOString(), modes: {} };
  for (const spec of MODES) {
    const inner = ['node', 'packages/skill-calorie/dist/cli/cmd_read.js', 'calorie.help.center'];
    if (spec.params) inner.push('--params', spec.params);
    const r = locked(inner);
    const env = JSON.parse(r.stdout.trim());
    const p = env.data.output;
    const art = fs.readFileSync(p, 'utf8');
    rec.modes[spec.mode] = { runId: r.runId, exit: r.exit, stdoutBytes: r.stdoutBytes, stdoutLines: r.stdoutLines, path: p, artifactBytes: bOf(art), dataKeys: Object.keys(env.data), dataBytes: env.data.bytes, dataTextBytes: typeof env.data.text === 'string' ? bOf(env.data.text) : null, delivery: env.delivery };
    if (spec.mode === 'text') {
      rec.textEqualsArtifact = env.data.text === art;
      rec.textArtifactTrailingNewline = /\n$/.test(art);
      rec.textDataTrailingNewline = /\n$/.test(env.data.text);
      rec.textArtifactHead = art.slice(0, 80);
    }
  }
  const fPath = rec.modes.file.path; const iPath = rec.modes.inline.path; const tPath = rec.modes.text.path;
  const fHtml = fs.readFileSync(fPath, 'utf8'); const iHtml = fs.readFileSync(iPath, 'utf8'); const tHtml = fs.readFileSync(tPath, 'utf8');
  rec.fileHasDoctype = /^<!DOCTYPE html>/i.test(fHtml);
  rec.inlineHasDoctype = /^<!DOCTYPE html>/i.test(iHtml);
  rec.inlineHasStyle = /<style/.test(iHtml);
  rec.inlineHasPayload = /type="application\/json"/.test(iHtml);
  rec.textHasTags = /<[a-z!/]/i.test(tHtml);
  rec.filePayloadBytes = payloadOf(fHtml)?.bytes ?? null;
  rec.fileMinusInline = rec.modes.file.artifactBytes - rec.modes.inline.artifactBytes;
  rec.fileMinusInlineMinusPayload = rec.fileMinusInline - (rec.filePayloadBytes ?? 0);
  rec.inlineFragmentInFile = fHtml.includes(iHtml.trim().slice(0, 400));
  rec.inlineTrimHeadInFile = fHtml.includes(iHtml.trim().slice(0, 120));
  rec.textHeadInFile = fHtml.includes(tHtml.trim().slice(0, 200));
  j('.scratch/review-a-probe/same-source.json', rec);
  console.log(JSON.stringify(rec, null, 1));
  process.exit(0);
}

if (has('--analyze')) {
  const rep = JSON.parse(fs.readFileSync(path.resolve(ROOT, '.scratch/review-a-probe/parse-a.json'), 'utf8'));
  const O = rep.old, N = rep.newFile;
  const A = { at: new Date().toISOString(), dims: {}, samples: [], vol: {}, cli: {}, code: {}, d6: {} };
  const key = (x) => x.sgid + '#' + x.idx;
  const keyW = (x) => x.sgid + '#' + x.wake_word;
  const oBy = new Map(O.scenes.map((x) => [key(x), x]));
  const nBy = new Map(N.scenes.map((x) => [key(x), x]));
  const aligned = [...oBy.keys()].filter((k) => nBy.has(k));
  const eqF = (f) => aligned.filter((k) => oBy.get(k)[f] === nBy.get(k)[f]);
  const eq = (f) => eqF(f).length;
  const oByW = new Map(O.scenes.map((x) => [keyW(x), x]));
  const nByW = new Map(N.scenes.map((x) => [keyW(x), x]));
  const alignedW = [...oByW.keys()].filter((k) => nByW.has(k));
  const eqW = (f) => alignedW.filter((k) => oByW.get(k)[f] === nByW.get(k)[f]).length;

  A.dims.D1 = { oldGroups: O.counts.groups, newGroups: N.counts.groups, idsEq: JSON.stringify(O.groupDigest.map((g) => g.id)) === JSON.stringify(N.groupDigest.map((g) => g.id)), labelIconEq: JSON.stringify(O.groupDigest.map((g) => [g.label, g.icon])) === JSON.stringify(N.groupDigest.map((g) => [g.label, g.icon])), distEq: JSON.stringify(O.groupDigest.map((g) => [g.subgroups, g.scenes])) === JSON.stringify(N.groupDigest.map((g) => [g.subgroups, g.scenes])), oldDist: O.groupDigest.map((g) => g.subgroups + '/' + g.scenes).join(' '), newDist: N.groupDigest.map((g) => g.subgroups + '/' + g.scenes).join(' ') };
  A.dims.D2 = { oldSg: O.counts.subgroups, newSg: N.counts.subgroups, idsEq: JSON.stringify(O.subgroupDigest.map((s) => s.id)) === JSON.stringify(N.subgroupDigest.map((s) => s.id)), labelsEq: JSON.stringify(O.subgroupDigest.map((s) => s.label)) === JSON.stringify(N.subgroupDigest.map((s) => s.label)), labelDiffs: O.subgroupDigest.map((s, i) => [s.id, s.label, N.subgroupDigest[i]?.label]).filter((x) => x[1] !== x[2]) };
  const idChanged = aligned.filter((k) => oBy.get(k).id !== nBy.get(k).id).map((k) => ({ sgid: oBy.get(k).sgid, wake: oBy.get(k).wake_word, oldId: oBy.get(k).id, newId: nBy.get(k).id, oldLegacy: /^legacy_/.test(oBy.get(k).id ?? ''), newCli: nBy.get(k).cli }));
  A.dims.D3 = { oldSc: O.counts.scenes, newSc: N.counts.scenes, alignedIdx: aligned.length, alignedWake: alignedW.length, wakeEqIdx: eq('wake_word'), wakeEqByWake: eqW('wake_word'), titleEq: eq('title'), statusEq: eq('status'), idEq: eq('id'), idChangedCount: idChanged.length, idChangedAllLegacyOld: idChanged.every((x) => x.oldLegacy), idUniqueOld: new Set(O.scenes.map((x) => x.id)).size, idUniqueNew: new Set(N.scenes.map((x) => x.id)).size, idChanged };
  const pDiff = aligned.filter((k) => oBy.get(k).prompt_template !== nBy.get(k).prompt_template);
  A.dims.D4 = { aligned: aligned.length, promptEqIdx: eq('prompt_template'), promptEqByWake: eqW('prompt_template'), promptNullOld: O.scenes.filter((x) => x.prompt_template === null).length, promptNullNew: N.scenes.filter((x) => x.prompt_template === null).length, promptDiffs: pDiff.slice(0, 10).map((k) => ({ sgid: oBy.get(k).sgid, wake: oBy.get(k).wake_word })), typesCountOld: O.scenes.filter((x) => Array.isArray(x.types) && x.types.length).length, typesCountNew: N.scenes.filter((x) => Array.isArray(x.types) && x.types.length).length, typesShapeOldObj: O.scenes.filter((x) => (x.types ?? []).some((t) => t && typeof t === 'object')).length, typesShapeNewObj: N.scenes.filter((x) => (x.types ?? []).some((t) => t && typeof t === 'object')).length, typesTextEq: aligned.filter((k) => JSON.stringify((oBy.get(k).types ?? []).map((t) => (t && typeof t === 'object' ? t.text : t))) === JSON.stringify((nBy.get(k).types ?? []).map((t) => (t && typeof t === 'object' ? t.text : t)))).length };

  // ── D5 CLI ──
  const oCli = O.scenes.filter((x) => x.cli !== null).length;
  const nCli = N.scenes.filter((x) => x.cli !== null).length;
  const noCli = N.scenes.filter((x) => x.cli === null);
  const byG = {};
  for (const s of noCli) byG[s.gid] = (byG[s.gid] ?? 0) + 1;
  const legacyWakes = new Set(idChanged.map((x) => x.wake));
  const noCliLegacy = noCli.filter((s) => legacyWakes.has(s.wake_word));
  const changedWithCli = idChanged.filter((x) => x.newCli !== null);
  const changedDiffSource = changedWithCli.filter((x) => x.newId !== x.newCli);
  A.cli = { oldCli: oCli, newCli: nCli, staticFieldRows: N.dom.fieldRows, oldFieldRows: O.dom.fieldRows, noCli: noCli.length, noCliByGroup: byG, noCliLegacy: noCliLegacy.map((s) => s.wake_word), changedCount: idChanged.length, changedWithCli: changedWithCli.length, changedSameSource: changedWithCli.filter((x) => x.newId === x.newCli).length, changedDiffSource: changedDiffSource.map((x) => ({ wake: x.wake, cardCode: x.newId, sheetCli: x.newCli })), changedNoCli: idChanged.filter((x) => x.newCli === null).map((x) => x.wake) };
  // 卡级 code ＝ Scene.id？
  const pairs = N.cardCode;
  A.code = { cards: pairs.length, codeEqIdByOrder: pairs.filter((c, i) => c.code === N.scenes[i]?.id).length, attrEqId: pairs.filter((c, i) => c.sceneIdAttr === N.scenes[i]?.id).length, attrEqCode: pairs.filter((c) => c.sceneIdAttr === c.code).length, mismatches: pairs.map((c, i) => ({ i, attr: c.sceneIdAttr, code: c.code, id: N.scenes[i]?.id })).filter((x) => x.code !== x.id || x.attr !== x.id).slice(0, 5), codeLooksLikeCommand: pairs.filter((c) => /^(calorie-|python |mavis )/.test(c.code ?? '')).length, codeHasSpace: pairs.filter((c) => /\s/.test(c.code ?? '')).length };

  // ── D7 体积 ──
  const d = (a, b) => b - a;
  const oldTagShell = O.bytes - (O.chunks.markup + O.chunks.payload + O.chunks.css + O.chunks.js);
  const newTagShell = N.bytes - (N.chunks.markup + N.chunks.payload + N.chunks.css + N.chunks.js);
  A.vol = {
    old: O.chunks, new: N.chunks, totalDelta: d(O.bytes, N.bytes),
    deltas: { markup: d(O.chunks.markup, N.chunks.markup), payload: d(O.chunks.payload, N.chunks.payload), css: d(O.chunks.css, N.chunks.css), js: d(O.chunks.js, N.chunks.js) },
    deltaSum: d(O.chunks.markup, N.chunks.markup) + d(O.chunks.payload, N.chunks.payload) + d(O.chunks.css, N.chunks.css) + d(O.chunks.js, N.chunks.js),
    oldTagShell, newTagShell, tagShellDelta: d(oldTagShell, newTagShell),
    inline: rep.newInline.bytes, text: rep.newText.bytes,
    inlineMinusFile: d(N.bytes, rep.newInline.bytes), textLines: rep.newText.lines,
  };
  // 归因子项（自己重算 markup 内构成）
  const fHtml = fs.readFileSync(N.file, 'utf8');
  const mk = strips(fHtml).markup;
  const sum = (re) => [...mk.matchAll(re)].reduce((a, x) => a + bOf(x[0]), 0);
  A.vol.attr = {
    cardBytes: sum(/<article class="ilife-help-shell-card"[\s\S]*?<\/article>/g),
    buttonBytes: sum(/<button[^>]*>[\s\S]*?<\/button>/g),
    detailsBytes: sum(/<details class="ilife-help-shell-sheet"[\s\S]*?<\/details>/g),
    fieldRowBytes: sum(/<li class="ilife-help-shell-field"[\s\S]*?<\/li>/g),
    buttons: N.dom.buttons, detailsAll: N.dom.details, fieldRows: N.dom.fieldRows,
    payloadCliBytes: (() => { let t = 0, c = 0; for (const s of N.scenes) if (s.fieldNames.includes('cli')) { t += bOf(JSON.stringify(s.fieldNames)); c++; } return { c }; })(),
    metaBlocksBytes: (() => { const p = payloadOf(fHtml); return p?.data?.meta_blocks ? bOf(JSON.stringify(p.data.meta_blocks)) : 0; })(),
    metaEntries: (() => { const p = payloadOf(fHtml); return [...String(JSON.stringify(p?.data?.meta_blocks ?? [])).matchAll(/data-view-entry=\\?\\?"([^"\\]+)/g)].map((m) => m[1]); })(),
  };
  A.vol.attrAvgCard = Math.round(A.vol.attr.cardBytes / 436);

  // ── D6 交互 ──
  A.d6 = { old: { css: O.cssInfo, js: O.jsInfo, dom: O.dom }, new: { css: N.cssInfo, js: N.jsInfo, dom: N.dom }, claims: { focusVisible: 10, prefersReducedMotion: 1, tabRadios: 11, buttons: 1308, details: 490, fieldRows: 341, cards: 436, codeCli: 436 } };

  // ── prompt 抽样逐字 ──
  const idxs = new Set([0, 1, 2, 217, 218, 300, 400, 433, 434, 435]);
  let seed = 20260909;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  while (idxs.size < 22) idxs.add(Math.floor(rnd() * 436));
  for (const x of idChanged.slice(0, 4)) { const i = N.scenes.findIndex((s) => s.wake_word === x.wake && s.sgid === x.sgid); if (i >= 0) idxs.add(i); }
  for (const i of [...idxs].sort((a, b) => a - b)) {
    const o = O.scenes[i], n = N.scenes[i];
    A.samples.push({ i, sgid: o.sgid, wake: o.wake_word, oldId: o.id, newId: n.id, promptEq: o.prompt_template === n.prompt_template, oldLen: bOf(o.prompt_template ?? ''), newLen: bOf(n.prompt_template ?? ''), oldPrompt: o.prompt_template, newPrompt: n.prompt_template });
  }
  A.sampleCount = A.samples.length;
  A.sampleEq = A.samples.filter((s) => s.promptEq).length;
  j('.scratch/review-a-probe/analyze-a.json', A);
  const L = (k, v) => console.log(k + ' ' + (typeof v === 'string' ? v : JSON.stringify(v)));
  L('D1', A.dims.D1);
  L('D2', { oldSg: A.dims.D2.oldSg, newSg: A.dims.D2.newSg, idsEq: A.dims.D2.idsEq, labelsEq: A.dims.D2.labelsEq, labelDiffs: A.dims.D2.labelDiffs });
  L('D3', { ...A.dims.D3, idChanged: A.dims.D3.idChanged.length });
  L('D4', { ...A.dims.D4, promptDiffs: A.dims.D4.promptDiffs.length });
  L('D5', A.cli);
  L('D5code', A.code);
  L('D7vol', A.vol);
  L('D6old', { css: A.d6.old.css, js: A.d6.old.js, dom: A.d6.old.dom });
  L('D6new', { css: A.d6.new.css, js: A.d6.new.js, dom: A.d6.new.dom });
  L('SAMPLES', 'n=' + A.sampleCount + ' eq=' + A.sampleEq);
  for (const s of A.samples) console.log('SAMPLE i=' + s.i + ' sgid=' + s.sgid + ' wake=' + s.wake + ' eq=' + s.promptEq + ' len=' + s.oldLen + '/' + s.newLen + (s.promptEq ? '' : ' OLD=' + JSON.stringify((s.oldPrompt ?? '').slice(0, 120)) + ' NEW=' + JSON.stringify((s.newPrompt ?? '').slice(0, 120))));
  process.exit(0);
}

if (has('--extra')) {
  const rep = JSON.parse(fs.readFileSync(path.resolve(ROOT, '.scratch/review-a-probe/parse-a.json'), 'utf8'));
  const O = rep.old, N = rep.newFile;
  const oHtml = fs.readFileSync(O.file, 'utf8');
  const nHtml = fs.readFileSync(N.file, 'utf8');
  const oJs = strips(oHtml).jsBlocks.map((b) => b.body).join('\n');
  const nJs = strips(nHtml).jsBlocks.map((b) => b.body).join('\n');
  const E = {};
  // (a) 旧侧 keydown/Enter 语境
  E.oldKeydown = [...oJs.matchAll(/.{0,120}keydown.{0,160}/g)].map((m) => m[0].replace(/\s+/g, ' ')).slice(0, 4);
  E.oldEnter = [...oJs.matchAll(/.{0,100}Enter.{0,120}/g)].map((m) => m[0].replace(/\s+/g, ' ')).slice(0, 4);
  E.newKeydown = [...nJs.matchAll(/.{0,120}keydown.{0,160}/g)].map((m) => m[0].replace(/\s+/g, ' ')).slice(0, 3);
  // (b) 按钮：data-action-id 分布 + 文案计数（新侧 markup）
  const mk = strips(nHtml).markup;
  const act = {};
  for (const m of mk.matchAll(/data-action-id="([^"]+)"/g)) act[m[1]] = (act[m[1]] ?? 0) + 1;
  E.actionIds = act;
  E.labelCounts = { 复制指令: (mk.match(/复制指令/g) || []).length, 复制唤醒词: (mk.match(/复制唤醒词/g) || []).length, 复制参数: (mk.match(/复制参数/g) || []).length, 查看指令: (mk.match(/查看指令/g) || []).length, 可执行命令: (mk.match(/可执行命令/g) || []).length };
  E.oldLabelCounts = { 复制: (strips(oHtml).markup.match(/复制/g) || []).length, 复制指令: (oJs.match(/复制指令/g) || []).length, 复制js: (oJs.match(/复制/g) || []).length };
  E.oldJsButtonCreate = (oJs.match(/createElement\("button"\)|createElement\('button'\)/g) || []).length;
  E.newJsButtonCreate = (nJs.match(/createElement\("button"\)|createElement\('button'\)/g) || []).length;
  // (c) payload 内 cli 字段字节
  const p = payloadOf(nHtml);
  let cliBytes = 0, cliN = 0, efBytes = 0, efN = 0;
  for (const g of p.data.groups) for (const sg of g.subgroups) for (const sc of sg.scenes) {
    if (Array.isArray(sc.editable_fields)) { efBytes += bOf(JSON.stringify(sc.editable_fields)); efN++; if (sc.editable_fields.some((f) => f.name === 'cli')) { cliBytes += bOf(JSON.stringify(sc.editable_fields.filter((f) => f.name === 'cli'))); cliN++; } }
  }
  E.payloadCli = { cliBytes, cliN, efBytes, efN, metaBlocksBytes: bOf(JSON.stringify(p.data.meta_blocks)), metaEntries: (JSON.stringify(p.data.meta_blocks).match(/data-view-entry=\\?\\?"([^"\\]+)/g) || []).length };
  // (d) 卡级 code vs Scene.id：转义差异全表
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const escPairs = N.cardCode.map((c, i) => ({ i, code: c.code, id: N.scenes[i]?.id, exact: c.code === N.scenes[i]?.id, escMatch: c.code === esc(N.scenes[i]?.id ?? '') }));
  E.codeEsc = { exact: escPairs.filter((x) => x.exact).length, escMatch: escPairs.filter((x) => x.escMatch).length, neither: escPairs.filter((x) => !x.exact && !x.escMatch).map((x) => ({ i: x.i, id: (x.id ?? '').slice(0, 80), code: (x.code ?? '').slice(0, 80) })), escDiff: escPairs.filter((x) => !x.exact).map((x) => ({ i: x.i, id: x.id, code: x.code, escOk: x.escMatch })) };
  // (e) 裸尖括号
  const hasAngle = (s) => /<[^<>]*>/.test(s ?? '');
  E.angles = { oldPromptsWithAngle: O.scenes.filter((s) => hasAngle(s.prompt_template)).length, newPromptsWithAngle: N.scenes.filter((s) => hasAngle(s.prompt_template)).length, oldAngleOcc: O.scenes.reduce((a, s) => a + ((s.prompt_template ?? '').match(/<[^<>]*>/g) || []).length, 0), newAngleOcc: N.scenes.reduce((a, s) => a + ((s.prompt_template ?? '').match(/<[^<>]*>/g) || []).length, 0), sample: O.scenes.filter((s) => hasAngle(s.prompt_template)).slice(0, 3).map((s) => [s.wake_word, (s.prompt_template.match(/<[^<>]*>/g) || []).slice(0, 3)]) };
  // (f) envelope items ↔ payload 分组
  const regen = JSON.parse(fs.readFileSync(path.resolve(ROOT, '.scratch/review-a-probe/regen.json'), 'utf8'));
  E.oldPayloadKeys = O.payload.topKeys;
  E.newPayloadKeys = N.payload.topKeys;
  // (g) 旧侧 params/req
  E.oldParams = { withParams: O.scenes.filter((s) => s.rawKeys.includes('params')).length, withEditable: O.scenes.filter((s) => s.rawKeys.includes('editable_fields')).length, withCliField: O.scenes.filter((s) => s.fieldNames.includes('cli')).length };
  E.newWithParams = N.scenes.filter((s) => s.rawKeys.includes('params')).length;
  E.statusEmpty = { old: O.scenes.filter((s) => s.status === '').length, new: N.scenes.filter((s) => s.status === '').length };
  // (h) 卡内 pre ↔ prompt_template 逐字（HTML 反转义）
  const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const cards = [...mk.matchAll(/<article class="ilife-help-shell-card"[\s\S]*?<\/article>/g)].map((m) => m[0]);
  const preEq = cards.map((c, i) => { const m = c.match(/<pre class="ilife-help-shell-prompt">([\s\S]*?)<\/pre>/); return { i, eq: m ? unesc(m[1]) === N.scenes[i]?.prompt_template : false, got: m ? unesc(m[1]).slice(0, 60) : null }; });
  E.preVsPrompt = { cards: cards.length, eq: preEq.filter((x) => x.eq).length, bad: preEq.filter((x) => !x.eq).slice(0, 3) };
  j('.scratch/review-a-probe/extra-a.json', E);
  console.log(JSON.stringify(E, null, 1));
  process.exit(0);
}

if (has('--deep')) {
  const rep = JSON.parse(fs.readFileSync(path.resolve(ROOT, '.scratch/review-a-probe/parse-a.json'), 'utf8'));
  const O = rep.old, N = rep.newFile;
  const oHtml = fs.readFileSync(O.file, 'utf8');
  const nHtml = fs.readFileSync(N.file, 'utf8');
  const oP = payloadOf(oHtml), nP = payloadOf(nHtml);
  const D = {};
  // 尖括号 / <N> 计数（payload 全域 vs prompt 内）
  const countRe = (s, re) => (s.match(re) || []).length;
  D.angle = {
    oldPayload_N: countRe(oP.raw, /<N>/g), newPayload_N: countRe(nP.raw, /<N>/g),
    oldPrompt_N: O.scenes.reduce((a, s) => a + countRe(s.prompt_template ?? '', /<N>/g), 0),
    newPrompt_N: N.scenes.reduce((a, s) => a + countRe(s.prompt_template ?? '', /<N>/g), 0),
    oldId_N: O.scenes.reduce((a, s) => a + countRe(s.id ?? '', /<N>/g), 0),
    newId_N: N.scenes.reduce((a, s) => a + countRe(s.id ?? '', /<N>/g), 0),
    oldAnyAngleInPayload: countRe(oP.raw, /<[A-Za-z0-9_]+>/g), newAnyAngleInPayload: countRe(nP.raw, /<[A-Za-z0-9_]+>/g),
    oldAnyAngleInPrompts: O.scenes.reduce((a, s) => a + countRe(s.prompt_template ?? '', /<[^<>]{1,20}>/g), 0),
    newAnyAngleInPrompts: N.scenes.reduce((a, s) => a + countRe(s.prompt_template ?? '', /<[^<>]{1,20}>/g), 0),
    oldWakeAngle: O.scenes.filter((s) => /[<>]/.test(s.wake_word ?? '')).length, newWakeAngle: N.scenes.filter((s) => /[<>]/.test(s.wake_word ?? '')).length,
    oldTitleAngle: O.scenes.filter((s) => /[<>]/.test(s.title ?? '')).length, newTitleAngle: N.scenes.filter((s) => /[<>]/.test(s.title ?? '')).length,
    whereN: [...nP.raw.matchAll(/.{0,60}<N>.{0,60}/g)].map((m) => m[0]).slice(0, 20),
  };
  // 旧侧 sheet 参数来源
  const oJs = strips(oHtml).jsBlocks.map((b) => b.body).join('\n');
  const grab = (re, n = 3, pad = 200) => [...oJs.matchAll(new RegExp(`.{0,${pad}}${re}.{0,${pad}}`, 'gs'))].slice(0, n).map((m) => m[0].replace(/\s+/g, ' '));
  D.oldJs = {
    scriptIds: [...oHtml.matchAll(/<script\b([^>]*)>/g)].map((m) => m[1].trim()),
    getMissing: grab('getMissing', 2),
    buildPrompt: grab('buildPrompt', 2),
    dataPrev: grab('data-prev', 2, 120),
    paramsKey: grab('params', 4, 120),
    placeholderParse: grab('placeholder|占位|slot|占位符', 3, 150),
    createInput: grab('createElement\\("input"\\)|createElement\\(\'input\'\\)', 3, 150),
    formBuild: grab('data-p\\b|dataset\\.p\\b', 3, 150),
    windowData: [...oHtml.matchAll(/window\.__[A-Za-z_]+__\s*=/g)].map((m) => m[0]),
  };
  const nJs = strips(nHtml).jsBlocks.map((b) => b.body).join('\n');
  D.newJs = {
    scriptIds: [...nHtml.matchAll(/<script\b([^>]*)>/g)].map((m) => m[1].trim()),
    fields: grab0(nJs, /ilife-help-shell-field|data-field/g, 3, 150),
    missing: grab0(nJs, /getMissing|请先填写/g, 3, 150),
    preview: grab0(nJs, /refreshPreview|renderPreview/g, 3, 150),
  };
  function grab0(js, re, n, pad) { return [...js.matchAll(new RegExp(`.{0,${pad}}${re.source}.{0,${pad}}`, 'gs'))].slice(0, n).map((m) => m[0].replace(/\s+/g, ' ')); }
  j('.scratch/review-a-probe/deep-a.json', D);
  console.log(JSON.stringify(D, null, 1));
  process.exit(0);
}

console.log('usage: node docs/research/t-help-parity-review-a-probe.mjs --inspect|--regen|--parse|--analyze|--same|--extra|--deep');
