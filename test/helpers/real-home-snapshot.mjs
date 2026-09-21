/**
 * #763 · 真实 `~/.ilife` 的树快照 —— 测试隔离的新护栏。
 *
 * 背景（票 #763 的裁决，理由住 #756）：`ILIFE_CONFIG_DIR` 已删（#754，口径「读我们自己定义的环境变量归零」），
 * 测试隔离改走**操作系统的事实**——把子进程的**家目录**指到临时目录（Windows 认 `USERPROFILE`、
 * POSIX 认 `HOME`），生产代码里不留任何「配置根可被外部覆盖」的开关。
 *
 * 于是「不写真实数据」不只由生产期守卫证明（那道守卫已随 #763 换判据、位置覆盖变量已随 #754 删除），
 * 改由本件的读数证明：**跑全量测试前后，真实 `~/.ilife` 的树逐字不变**。
 * 判据验的是**目的**（真实数据没被动过），不是手段（某个开关被设了）——比「开关被设了」硬。
 *
 * 口径（写死在件里，改它就是改判据）：
 *   · 根＝真实家目录下的 `.ilife`；真实家目录**不从 `os.homedir()` 取**——家目录注入一生效，
 *     `os.homedir()` 指的就是临时目录，那份快照验不到真实那一棵树（见 `realHomeDir()`）。
 *   · 逐件记 `kind`（file／dir／link／other）＋ `rel`（正斜杠相对路径）＋ `size`（字节）＋
 *     `mtimeMs`（毫秒浮点，**原样**，不做秒级近似）。
 *   · 目录也进快照：目录 mtime 变了即说明有件被增删（哪怕最终树又一致，也要看见）。
 *   · 排序后逐行序列化，整棵树取 sha256 ⇒ 一行指纹代表这一次读数。
 *   · 根不存在＝空快照（合法读数：那时「没写真实数据」＝根仍然不存在）。
 *
 * 本件不是测试件（不匹配 `test/*.test.mjs`）：它是算法件，门禁在 `tooling/check-real-home-untouched.mjs`。
 */
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { homedir, userInfo } from 'node:os';
import { join } from 'node:path';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

/** 配置目录在真实家目录下的名字（与 `base-link-core` 的 `~/.ilife` 同字）。 */
export const CONFIG_DIR_NAME = '.ilife';

/**
 * 真实家目录 —— **从「账号」取，不从环境变量取**。
 *
 * 为什么不能读环境变量：家目录注入（本票的隔离通道）改的正是 `USERPROFILE`／`HOME`，
 * 而这两格一旦被谁（本进程、父进程、`pnpm test` 的入口）改过，`os.homedir()` 与读环境变量
 * 都会指向**临时目录**——拿它去快照等于量错了树，门禁会对着一个没人关心的目录发 PASS。
 *
 * 取值顺序（都跟环境变量无关）：
 *   ① `os.userInfo().homedir`：win32 走账号资料目录、POSIX 走 getpwuid —— **实测 win32 上
 *      注入 `USERPROFILE=C:\__fake_up2` 之后它仍返回 `C:\Users\辰辰洋洋`**（`os.homedir()` 则跟着注入走）；
 *   ② win32 兜底 `HOMEDRIVE`＋`HOMEPATH`（Windows 自己写的两格，我们从不碰；实测注入后仍在）；
 *   ③ 真拿不到就回落 `os.homedir()`（那时读数要写明「用了可能被注入的值」）。
 *
 * @returns {{dir: string, source: string}} 目录 ＋ 取值来源（来源进读数，便于事后核账）
 */
export function realHomeDir() {
  try {
    const info = userInfo();
    if (typeof info?.homedir === 'string' && info.homedir.trim() !== '') {
      return { dir: info.homedir, source: 'userInfo' };
    }
  } catch { /* 没有 passwd 条目一类的环境：往下兜 */ }
  if (process.platform === 'win32') {
    const drive = process.env.HOMEDRIVE ?? '';
    const path = process.env.HOMEPATH ?? '';
    if (drive !== '' && path !== '') return { dir: drive + path, source: 'HOMEDRIVE+HOMEPATH' };
  }
  return { dir: homedir(), source: 'os.homedir()（可能已被注入，读数请核）' };
}

/** 真实配置目录（`<真实家目录>/.ilife`）＋它的取值来源（进读数）。 */
export function realConfigDir() {
  const home = realHomeDir();
  return { dir: join(home.dir, CONFIG_DIR_NAME), homeDir: home.dir, source: home.source };
}

/** 一个件的读数（不跟随符号链接：链本身也是一条事实）；文件另取内容 sha256 ——
 *  「逐字不变」按字节算，不只按大小与时间算（大小与 mtime 都相同、字节不同，只有哈希看得见）。 */
function statOf(abs) {
  try {
    const st = lstatSync(abs);
    const kind = st.isDirectory() ? 'dir' : st.isFile() ? 'file' : st.isSymbolicLink() ? 'link' : 'other';
    const sha = kind === 'file' ? sha256(readFileSync(abs)) : '';
    return { kind, size: st.size, mtimeMs: st.mtimeMs, sha };
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

/**
 * 递归快照一棵树（根不存在＝空快照）。
 *
 * @param {string} root 根目录绝对路径
 * @returns {{root: string, entries: Array<{kind: string, rel: string, size: number, mtimeMs: number, sha: string}>}}
 */
export function snapshotTree(root) {
  const entries = [];
  const walk = (absDir, relDir) => {
    let dirents;
    try {
      dirents = readdirSync(absDir, { withFileTypes: true });
    } catch (err) {
      if (err.code === 'ENOENT') return; // 根不存在，或目录在快照途中被删——两类都由别的行承载
      throw err;
    }
    for (const ent of [...dirents].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
      const abs = join(absDir, ent.name);
      const rel = relDir === '' ? ent.name : relDir + '/' + ent.name;
      const st = statOf(abs);
      if (st === null) continue; // 刚被删掉的件：不记（下一次读数为准）
      entries.push({ kind: st.kind, rel, size: st.size, mtimeMs: st.mtimeMs, sha: st.sha });
      if (st.kind === 'dir') walk(abs, rel);
    }
  };
  walk(root, '');
  entries.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));
  return { root, entries };
}

/** 归一化正文：首行是根，其后逐件一行（`kind \t rel \t size \t mtimeMs \t sha`）。比较一律走这一份文本。 */
export function serializeSnapshot(snap) {
  const lines = ['root\t' + snap.root];
  for (const e of snap.entries) lines.push(e.kind + '\t' + e.rel + '\t' + e.size + '\t' + e.mtimeMs + '\t' + (e.sha ?? ''));
  return lines.join('\n') + '\n';
}

/** 整棵树的一行指纹（sha256 前 16 位）＋件数汇总，供读数贴进证据。 */
export function snapshotFingerprint(snap) {
  const files = snap.entries.filter((e) => e.kind === 'file');
  return {
    n: snap.entries.length,
    files: files.length,
    dirs: snap.entries.filter((e) => e.kind === 'dir').length,
    bytes: files.reduce((sum, e) => sum + e.size, 0),
    sha: createHash('sha256').update(serializeSnapshot(snap), 'utf8').digest('hex').slice(0, 16),
  };
}

/**
 * 两棵树的差异：新增／删除／改了（size、mtime 或内容 sha，三者任一不等即算改了）。
 * 返回的每一条都是**可读的人话行**，直接进证据与门禁输出。
 *
 * @returns {{added: string[], removed: string[], changed: string[], same: boolean}}
 */
export function diffSnapshots(before, after) {
  const key = (e) => e.kind + '\t' + e.rel;
  const beforeMap = new Map(before.entries.map((e) => [key(e), e]));
  const afterMap = new Map(after.entries.map((e) => [key(e), e]));
  const added = [];
  const removed = [];
  const changed = [];
  const short = (s) => (s ? String(s).slice(0, 8) : '无');
  for (const [k, e] of afterMap) if (!beforeMap.has(k)) added.push(e.rel + '（' + e.kind + ' ' + e.size + 'B）');
  for (const [k, e] of beforeMap) if (!afterMap.has(k)) removed.push(e.rel + '（' + e.kind + ' ' + e.size + 'B）');
  for (const [k, b] of beforeMap) {
    const a = afterMap.get(k);
    if (!a) continue;
    const why = [];
    if (a.size !== b.size) why.push('大小 ' + b.size + 'B→' + a.size + 'B');
    if (a.mtimeMs !== b.mtimeMs) why.push('mtime ' + b.mtimeMs + '→' + a.mtimeMs);
    if ((a.sha ?? '') !== (b.sha ?? '')) why.push('内容 ' + short(b.sha) + '→' + short(a.sha));
    if (why.length > 0) changed.push(b.rel + '（' + why.join('；') + '）');
  }
  added.sort(); removed.sort(); changed.sort();
  return { added, removed, changed, same: added.length === 0 && removed.length === 0 && changed.length === 0 };
}
