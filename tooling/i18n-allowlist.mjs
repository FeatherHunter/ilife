#!/usr/bin/env node
/**
 * #1320 · allowlist 的唯一实现：从「纯字符串清单」改成「文件路径 ＋ 字面量」登记。
 *
 * 为什么改（票面来源）：#1205 引入的 allowlist 是逐串全等豁免，两道门（key 残留门／缺词条门）
 * 共用同一份字符串集合——同一个短词只要在任意一个**数据位**登记过，它在**界面位**再出现时也被一起放行
 * （例：'日期' 在体重记录表里是机器键，在对比页表头却是用户可见文案）。residue=0 因此证明不了
 * 「源码里没有残留的用户可见文案」。
 *
 * 现在的判据：一条豁免＝**在哪件文件里**（`files`）＋**哪个字面量**（`texts`）＋**为什么不必迁**（`why`）。
 * 匹配＝路径命中且字面量全等；同一串登记在 a.ts，在 b.ts 出现时照样被门抓住。
 * `files` 支持精确相对路径（`packages/x/src/a.ts`）或以 `/` 结尾的目录前缀（`packages/x/src/`），
 * 后者只给「整目录都是派生件」一类用；能写精确路径就别写前缀。
 *
 * 形状（tooling/i18n-scope.json 的 allowlist 数组，一条一个对象）：
 *   { "files": ["packages/skill-calorie/src/weight/compare.ts"], "texts": ["本期"], "why": "数据位：..." }
 *
 * 校验 fail-closed：旧纯字符串数组、未知字段、空 files／texts／why、绝对路径、反斜杠、`..`、
 * 同一件文件里同一串被登记两次，一律抛错（调用方 exit 2，不静默放行）。
 */

/** 一条 allowlist 记录的字段闭集。 */
const FIELDS = ['files', 'texts', 'why'];

/** 规整一个相对路径（只用 `/` 分隔，去掉开头的 `./`）。 */
export function normalizeRelPath(value) {
  return String(value).replace(/^\.\//, '').replace(/\\/g, '/');
}

function bad(label, msg) {
  throw new Error('allowlist 形状不对：' + label + ' → ' + msg);
}

/** 校验并返回规整后的记录数组（不改原对象；失败抛错，调用方按 exit 2 处理）。 */
export function parseAllowlist(records, label = 'allowlist') {
  if (!Array.isArray(records)) {
    bad(label, '必须是数组（元素形如 { files: [...], texts: [...], why: "..." }；#1320 起不接受纯字符串数组）');
  }
  const out = [];
  const pairs = new Map(); // rel + '\u0000' + text -> 记录下标（只查精确路径，目录前缀的重叠留给逐条复核）
  records.forEach((rec, i) => {
    const where = label + '[' + i + ']';
    if (rec === null || typeof rec !== 'object' || Array.isArray(rec)) bad(where, '必须是对象 { files, texts, why }');
    for (const key of Object.keys(rec)) {
      if (!FIELDS.includes(key)) bad(where, '有未知字段 ' + JSON.stringify(key) + '（只认 files／texts／why）');
    }
    if (!Array.isArray(rec.files) || rec.files.length === 0) bad(where, 'files 必须是非空数组');
    if (!Array.isArray(rec.texts) || rec.texts.length === 0) bad(where, 'texts 必须是非空数组');
    if (typeof rec.why !== 'string' || rec.why.trim() === '') bad(where, 'why 必须是非空字符串（说清为什么不迁）');
    const files = rec.files.map((raw) => {
      if (typeof raw !== 'string' || raw === '') bad(where, 'files 的每一项必须是非空字符串');
      const rel = normalizeRelPath(raw);
      if (rel === '' || rel.startsWith('/') || /^[A-Za-z]:/.test(rel)) bad(where, 'files 只收仓库内相对路径：' + JSON.stringify(raw));
      if (rel.split('/').some((seg) => seg === '..')) bad(where, 'files 不许含 ..：' + JSON.stringify(raw));
      if (rel.includes('\\')) bad(where, 'files 不许含反斜杠：' + JSON.stringify(raw));
      if (rel.endsWith('/') && rel === '/') bad(where, 'files 的目录前缀不能是根：' + JSON.stringify(raw));
      return rel;
    });
    const texts = rec.texts.map((raw) => {
      if (typeof raw !== 'string' || raw === '') bad(where, 'texts 的每一项必须是非空字符串');
      return raw;
    });
    const seenText = new Set();
    for (const text of texts) {
      if (seenText.has(text)) bad(where, 'texts 里同一个串写了两遍：' + JSON.stringify(text));
      seenText.add(text);
      for (const rel of files) {
        if (rel.endsWith('/')) continue; // 目录前缀无法在这里枚举，交给评测时逐对去重
        const pair = rel + '\u0000' + text;
        if (pairs.has(pair)) {
          bad(where, '同一件文件里同一串被登记了两次（' + rel + ' ← ' + JSON.stringify(text) + '；另见 ' + label + '[' + pairs.get(pair) + ']）');
        }
        pairs.set(pair, i);
      }
    }
    out.push({ files, texts, why: rec.why });
  });
  return out;
}

/** 编译成查询器：`allows(rel, text)` 判这一件里的这一个字面量是否登记过；`textsFor(rel)` 取该件的整套豁免。 */
export function compileAllowlist(records) {
  const exact = new Map(); // rel -> Set<text>
  const dirs = []; // [{ prefix, texts:Set }]
  let pairs = 0;
  for (const rec of records) {
    const texts = new Set(rec.texts);
    pairs += texts.size * rec.files.length; // 每个（文件,串）对计一
    for (const rel of rec.files) {
      if (rel.endsWith('/')) { dirs.push({ prefix: rel, texts }); continue; }
      let set = exact.get(rel);
      if (set === undefined) { set = new Set(); exact.set(rel, set); }
      for (const text of texts) set.add(text);
    }
  }
  return {
    records,
    pairs,
    allows(rel, text) {
      const set = exact.get(rel);
      if (set !== undefined && set.has(text)) return true;
      return dirs.some((dir) => rel.startsWith(dir.prefix) && dir.texts.has(text));
    },
    textsFor(rel) {
      const out = new Set();
      const set = exact.get(rel);
      if (set !== undefined) for (const text of set) out.add(text);
      for (const dir of dirs) if (rel.startsWith(dir.prefix)) for (const text of dir.texts) out.add(text);
      return out;
    },
  };
}

/** 校验 allowlist 的路径落点：精确路径必须真在范围清单里（或盘上存在）；目录前缀必须至少盖住一件。
 *  返回 [{ why }]；空数组＝落点全可复核。这道检查让「登记了一个不存在的文件」当场红，而不是静默失效。 */
export function allowlistPathProblems(records, scopeFiles, rootFiles) {
  const scope = new Set(scopeFiles);
  const onDisk = new Set(rootFiles === undefined ? [] : rootFiles);
  const problems = [];
  for (const rec of records) {
    for (const rel of rec.files) {
      if (rel.endsWith('/')) {
        const hit = scopeFiles.some((f) => f.startsWith(rel)) || rootFiles !== undefined && rootFiles.some((f) => f.startsWith(rel));
        if (!hit) problems.push({ why: 'allowlist 的目录前缀没盖住任何范围件：' + rel + '（' + rec.why + '）' });
        continue;
      }
      if (!scope.has(rel) && !onDisk.has(rel)) problems.push({ why: 'allowlist 登记的文件不在范围清单里也不在盘上：' + rel + '（' + rec.why + '）' });
    }
  }
  return problems;
}

export default { parseAllowlist, compileAllowlist, allowlistPathProblems, normalizeRelPath };
