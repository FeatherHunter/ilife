// 只读探针 4（审查席 B）：不依赖 t-help-parity-compare.mjs 的独立复算（41 行台账抽查用）
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const P = (x) => path.join(ROOT, '.scratch/t-parity', x);
const old = JSON.parse(fs.readFileSync(P('old-parse.json'), 'utf8'));
const newAll = JSON.parse(fs.readFileSync(P('new-parse.json'), 'utf8'));
const nf = newAll.file;
const L = JSON.parse(fs.readFileSync(P('ledger.json'), 'utf8'));
const out = (...a) => console.log(...a);

const keyOf = (x) => x.sgid + '#' + x.idx;
const om = new Map(old.scenes.map((s) => [keyOf(s), s]));
const nm = new Map(nf.scenes.map((s) => [keyOf(s), s]));
const keys = [...om.keys()].filter((k) => nm.has(k));
const eq = (f) => keys.filter((k) => f(om.get(k)) === f(nm.get(k))).length;

out('R1 分组 id 序相同:', JSON.stringify(old.groupDigest.map((g) => g.id)) === JSON.stringify(nf.groupDigest.map((g) => g.id)));
out('R2 每组(子功能:场景)相同:', JSON.stringify(old.groupDigest.map((g) => g.subgroups + ':' + g.scenes)) === JSON.stringify(nf.groupDigest.map((g) => g.subgroups + ':' + g.scenes)));
out('R3 子功能 id 54/54 同序:', JSON.stringify(old.subgroupDigest.map((s) => s.id)) === JSON.stringify(nf.subgroupDigest.map((s) => s.id)));
out('R4 子功能 label 逐条:', old.subgroupDigest.filter((s, i) => s.label === nf.subgroupDigest[i]?.label).length + '/' + old.subgroupDigest.length);
out('R5 对齐键', keys.length, '| wake 相同', eq((s) => s.wake_word), '| title 相同', eq((s) => s.title), '| status 相同', eq((s) => s.status), '| prompt 相同', eq((s) => s.prompt_template));
out('R6 id 不同条数:', keys.filter((k) => om.get(k).id !== nm.get(k).id).length);
out('R7 旧 CLI 非空:', old.scenes.filter((s) => s.cli !== null).length, '| 新 CLI 非空:', nf.scenes.filter((s) => s.cli !== null).length, '| 新无 CLI:', nf.scenes.filter((s) => s.cli === null).length);
const noCli = nf.scenes.filter((s) => s.cli === null);
const byGid = {};
for (const s of noCli) byGid[s.gid] = (byGid[s.gid] ?? 0) + 1;
out('R8 无 CLI 分布:', JSON.stringify(byGid), '| 合计', Object.values(byGid).reduce((a, b) => a + b, 0));
const changed = keys.filter((k) => om.get(k).id !== nm.get(k).id).map((k) => om.get(k));
out('R9 22 条 legacy 中：Sheet 有 CLI', changed.filter((s) => nf.scenes.some((x) => x.wake_word === s.wake_word && x.cli !== null)).length,
  '／Sheet 无 CLI', changed.filter((s) => nf.scenes.some((x) => x.wake_word === s.wake_word && x.cli === null)).length);
out('R10 types 文本序列相同', keys.filter((k) => JSON.stringify(om.get(k).types_text) === JSON.stringify(nm.get(k).types_text)).length,
  '| 新 types 形状化', nf.scenes.filter((s) => s.types_shaped).length, '| 旧', old.scenes.filter((s) => s.types_shaped).length);
out('R11 payload 顶层键 旧', JSON.stringify(old.payload.topKeys), '→ 新', JSON.stringify(nf.payload.topKeys));
out('R12 dom 新 codeCli/fieldRows/details/buttons/tabRadios', nf.dom.codeCli, nf.dom.fieldRows, nf.dom.details, nf.dom.buttons, nf.dom.tabRadios);
out('R13 卡级 code = Scene.id 的条数（用 payload 逐条比对）:', (() => {
  const H = fs.readFileSync(nf.file, 'utf8');
  const codes = [...H.matchAll(/<code class="ilife-help-shell-cli">([\s\S]*?)<\/code>/g)].map((m) => m[1]);
  const ids = new Set(nf.scenes.map((s) => s.id));
  return codes.length + ' 条 / 其中与某 Scene.id 逐字相等 ' + codes.filter((c) => ids.has(c.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'))).length;
})());
// 体积闭合
const d = L.dimensions.D7;
out('R14 体积：新侧分块和', d.fileMarkup + d.filePayload + d.fileCss + d.fileJs, 'vs 文件', d.fileTotal, '残差', d.fileTotal - (d.fileMarkup + d.filePayload + d.fileCss + d.fileJs));
out('R15 体积：增减分块和', (d.fileMarkup - d.oldMarkup) + (d.filePayload - d.oldPayload) + (d.fileCss - d.oldCss) + (d.fileJs - d.oldJs), 'vs 总增减', d.delta);
out('R16 旧侧分块和', d.oldMarkup + d.oldPayload + d.oldCss + d.oldJs, 'vs 文件', d.oldTotal, '残差', d.oldTotal - (d.oldMarkup + d.oldPayload + d.oldCss + d.oldJs));
