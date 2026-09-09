// 只读探针 5（审查席 B · R-3 复核）：md↔ledger.json 一致性 / 判定↔evidenceRef 绑定 / 体积恒等式鉴别力
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const L = JSON.parse(fs.readFileSync(path.join(ROOT, '.scratch/t-parity/ledger.json'), 'utf8'));
const MD = fs.readFileSync(path.join(ROOT, 'docs/research/t-help-parity-ledger.md'), 'utf8');
const out = (...a) => console.log(...a);

// ── 1. md 表格行 ↔ ledger.json 行：item 名与判定是否一致 ────────────────────────
const mdLines = MD.split(/\r?\n/).filter((l) => l.startsWith('| '));
const mdByItem = new Map();
for (const l of mdLines) {
  const cells = l.split('|').map((c) => c.trim());
  if (cells.length < 6) continue;
  const item = cells[1].replace(/\*\*/g, '');
  mdByItem.set(item, { verdict: cells[4].replace(/\*\*/g, ''), line: l });
}
let mdMissing = 0, mdVerdictMismatch = [];
for (const r of L.rows) {
  const key = r.item.replace(/\*\*/g, '');
  let hit = mdByItem.get(key);
  if (!hit) {
    // 宽松匹配（md 里可能带反引号/括号差异）
    const cand = [...mdByItem.keys()].find((k) => k.includes(key.slice(0, 12)) || key.includes(k.slice(0, 12)));
    if (cand) hit = mdByItem.get(cand);
  }
  if (!hit) { mdMissing++; out('MD-MISSING', r.dim, '|', r.item); continue; }
  const mv = hit.verdict;
  if (mv !== r.verdict && !mv.includes(r.verdict) && !r.verdict.includes(mv)) mdVerdictMismatch.push([r.item, r.verdict, mv]);
}
out('MD rows', mdByItem.size, '| ledger rows', L.rows.length, '| md-missing', mdMissing, '| verdict mismatch', mdVerdictMismatch.length, JSON.stringify(mdVerdictMismatch.slice(0, 6)));

// ── 2. 判定 ↔ evidenceRef 绑定：verdict=一致 但 ref 指向的键两侧不同 ─────────────
const D = L.dimensions;
const get = (o, k) => (o === undefined || o === null ? undefined : o[k]);
const refValues = (ref) => {
  const m = /^D6\.(oldMarkers|newMarkers|oldCss|newCss|oldDom|newDom)\.(.+)$/.exec(ref);
  if (m) {
    const [, , k] = m;
    return { old: get(D.D6.oldMarkers, k) ?? get(D.D6.oldCss, k) ?? get(D.D6.oldDom, k), new: get(D.D6.newMarkers, k) ?? get(D.D6.newCss, k) ?? get(D.D6.newDom, k) };
  }
  return null;
};
out('\n-- verdict=一致 的行 × 其 evidenceRef 指向值 --');
for (const r of L.rows) {
  if (r.verdict !== '一致') continue;
  const v = refValues(r.evidenceRef);
  const diff = v && JSON.stringify(v.old) !== JSON.stringify(v.new);
  out(`${diff ? 'BIND-MISMATCH' : 'ok'} | ${r.item} | ref=${r.evidenceRef} | old=${JSON.stringify(v?.old)} new=${JSON.stringify(v?.new)}`);
}

// ── 3. 体积恒等式鉴别力（真恒等式 vs 定义式） ──────────────────────────────────
const so = L.sides.new.file.size, soOld = L.sides.old.size;
out('\n-- D7 体积恒等式 --');
out('blockSum=markup+blocks 且 markup 定义为 total−blocks ⇒ blockResidual 恒 0（鉴别力 0）：',
  so.blockSum === so.total, '| old', soOld.blockSum === soOld.total);
const tagNew = (so.payloadBlock - so.payloadInner) + (so.styleBlock - so.styleInner) + (so.jsBlock - so.jsInner);
const tagOld = (soOld.payloadBlock - soOld.payloadInner) + (soOld.styleBlock - soOld.styleInner) + (soOld.jsBlock - soOld.jsInner);
out('标签壳真恒等式（非平凡）：new tagBytes', tagNew, '== innerResidual', so.innerResidual, '?', tagNew === so.innerResidual,
  '| old', tagOld, '==', soOld.innerResidual, '?', tagOld === soOld.innerResidual);
out('增减真恒等式（非平凡）：Δtags', tagNew - tagOld, '== shellDelta', so.innerResidual - soOld.innerResidual, '?', (tagNew - tagOld) === (so.innerResidual - soOld.innerResidual));
out('台账断言用的 Δinner+Δshell==Δtotal 为代数恒等式（鉴别力 0）：',
  (so.markup - soOld.markup) + (so.payloadInner - soOld.payloadInner) + (so.styleInner - soOld.styleInner) + (so.jsInner - soOld.jsInner) + (so.innerResidual - soOld.innerResidual) === (so.total - soOld.total));

// ── 4. 穷举对账：enumPairs 是否由数据产生 ──────────────────────────────────────
const CMP = fs.readFileSync(path.join(ROOT, 'docs/research/t-help-parity-compare.mjs'), 'utf8');
const hardcoded = /'scene\.fieldKeys':\s*\[\s*\[/.test(CMP) && /'group\.fieldKeys':\s*\[\s*\[/.test(CMP);
out('\nenumPairs 是否含硬编码键集（非由解析 JSON 产生）：', hardcoded);
out('enumDiffs 实际差异键数', L.enumDiffs.length, '| 覆盖缺口', L.summary.uncoveredEnumDiffs);
out('enumDiffs 中由 verdict=一致 的行“覆盖”的键：');
const itemVerdict = new Map(L.rows.map((r) => [r.item, r.verdict]));
const COVER = {};
for (const m of CMP.matchAll(/'([\w.]+)':\s*'([^']+)',?\n/g)) COVER[m[1]] = m[2];
for (const d of L.enumDiffs) {
  const it = COVER[d.key];
  if (it && itemVerdict.get(it) === '一致') out('  ', d.key, '→', it, '(一致)');
}
