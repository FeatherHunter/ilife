// #1078 步5 · verdict 核对脚本（入仓）
//
// 用法：node docs/skills/skill-bill/1078-verdict-check.mjs <verdict.json>
// 绿：24 条逐格对上、无重复无遗漏、每条 file 在盘上、每条 satisfied 的 proto_sha
//     与冻结清单登记值一致、unsatisfied 必有 reason
//     → 打印「24 条；satisfied N；unsatisfied M；未判 0」并 exit 0
// 红：exit 1，每条违规点名 seq。
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..'));
const [verdictArg] = process.argv.slice(2).filter((x) => !x.startsWith('--'));
if (!verdictArg) { console.error('用法：node 1078-verdict-check.mjs <verdict.json>'); process.exit(2); }

const fail = [];
const V = JSON.parse(readFileSync(resolve(verdictArg), 'utf8'));
const items = V.items ?? [];
const EXPECT = [...Array(24)].map((_, i) => i + 1);

// 数量与 seq 对齐
if (items.length !== 24) fail.push(`条数 ${items.length}（应 24）`);
const seqs = items.map((i) => i.seq);
for (const s of EXPECT) if (!seqs.includes(s)) fail.push(`缺 seq${s}`);
for (const s of seqs) if (seqs.filter((x) => x === s).length > 1) fail.push(`seq${s} 重复`);

// sha 权威：1073 冻结清单
const MANIFEST = join(ROOT, 'docs/skills/skill-bill/proto/manifest.json');
if (!existsSync(MANIFEST)) fail.push('冻结清单缺失 docs/skills/skill-bill/proto/manifest.json');
const M = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : { items: [] };

let sat = 0, unsat = 0, undecided = 0;
for (const it of items) {
  const tag = `seq${it.seq}`;
  if (it.verdict === 'satisfied') sat++;
  else if (it.verdict === 'unsatisfied') {
    unsat++;
    if (!it.reason || !String(it.reason).trim()) fail.push(`${tag} unsatisfied 但 reason 为空`);
  }
  else undecided++;
  if (!it.file) { fail.push(`${tag} 无 file`); continue; }
  const p = join(ROOT, it.file);
  if (!existsSync(p)) { fail.push(`${tag} file 不在盘上：${it.file}`); continue; }
  if (it.verdict === 'satisfied') {
    if (!it.proto_sha?.sha256 || typeof it.proto_sha?.bytes !== 'number') {
      fail.push(`${tag} satisfied 但无 proto_sha`); continue;
    }
    const rel = it.file.replace(/^docs\/skills\/skill-bill\/proto\//, '');
    const m = M.items.find((x) => x.rel === rel);
    if (!m) fail.push(`${tag} 冻结清单无此件：${rel}`);
    else if (m.bytes !== it.proto_sha.bytes || m.sha256 !== it.proto_sha.sha256) {
      fail.push(`${tag} proto_sha 与冻结清单登记值不符`);
    }
  }
}

console.log(`${items.length} 条；satisfied ${sat}；unsatisfied ${unsat}；未判 ${undecided}`);
if (fail.length) {
  for (const f of [...new Set(fail)]) console.log(`  RED: ${f}`);
  console.log(`RESULT: FAIL`);
  process.exit(1);
}
console.log(`RESULT: PASS items=${items.length}/24 satisfied=${sat} unsatisfied=${unsat} undecided=${undecided}`);
