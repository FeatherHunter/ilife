#!/usr/bin/env node
/**
 * #659 · 合成写判据的接缝件（断言模板的机器部分）
 *
 * 判据（规格 #657 · 裁定件 `docs/skills/skill-calorie/t593-A-跨技能调用-裁定.md` 第五节）只打**一个接缝**：
 * 技能的统一出口（命令行边界）。两个注入点：
 *   ① 临时数据目录 —— `SKILLS_DB_PATH`（老实现与新实现都认这一个环境变量）
 *   ② 可替换的远端平台挡板 —— `tooling/contract-lark-stub.mjs` 冒充 `lark-cli`
 *
 * 老实现（仓外 Python）与新实现（仓内 TS）都经本件跑起来，因此同一份输入可以在两代实现上对拍，
 * 比三个边界上的痕迹：**命令行回执**、**本地库行**、**远端平台收到的调用**。
 *
 * 挡板的注入方式两代不同（这是两代实现的既有差异，不是本件造的）：
 *   - 新实现：`LARK_CLI_PATH` 直接指出挡板路径（`packages/skill-schedule/src/fetch/feishu.ts:16`）。
 *   - 老实现：没有这个覆盖点，只能喂它自己的查找链 —— `PATH` 首位放挡板 ＋ `APPDATA` 指向挡板根的
 *     `npm/lark-cli.cmd`。正因为是「喂查找链」，`assertStubIsTheOne()` 这道前置门不可省：
 *     它让老进程**自己报出**解析到的路径，证明这一跑没碰真飞书。
 */
import { spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, '..');
export const STUB_SRC = join(HERE, 'contract-lark-stub.mjs');
/** 仓外老技能根：只读对照，可经环境变量换机（本机在 D 盘）。 */
export const OLD_SKILLS = process.env.OLD_SKILLS_ROOT || 'D:\\2Study\\StudyNotes\\SKILLS';

export const KINDS = {
  schedule: {
    skill: 'schedule',
    pkg: 'skill-schedule',
    oldScript: join(OLD_SKILLS, '作息管家', 'scripts', 'schedule_cli.py'),
    db: 'schedule_data.db',
  },
  memo: {
    skill: 'memo',
    pkg: 'skill-memo-ilife',
    oldScript: join(OLD_SKILLS, '备忘录', 'script', 'memo_cli.py'),
    db: 'memo.db',
  },
};

/** 备忘录测试库 DDL：逐字 mirror 老 `script/init.sql` 的两张业务表（`notes`＋`reminders`＋索引）。
 *  FTS 虚表与触发器不 mirror——老家 #180 已停用 FTS 查询路径，且触发器写 `notes_fts`，
 *  测试库不需要全文副表。这是仓内**唯一一份**测试 DDL 定义（备忘包 helper 与本件接缝共用）。 */
export const MEMO_TEST_SCHEMA_DDL = `
CREATE TABLE IF NOT EXISTS notes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    content     TEXT NOT NULL,
    summary     TEXT,
    category    TEXT DEFAULT '备忘',
    sub_category TEXT,
    media_path  TEXT,
    reminder_id INTEGER,
    feishu_task_guid TEXT,
    due TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS reminders (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    note_id     INTEGER NOT NULL,
    remind_at   TEXT,
    repeat_type TEXT DEFAULT 'none',
    repeat_rule TEXT,
    status      TEXT DEFAULT 'active',
    notified_at TEXT,
    content     TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE NO ACTION
);
CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(category);
CREATE INDEX IF NOT EXISTS idx_reminders_status_remind ON reminders(status, remind_at);
`;

/** 测试布景：在 `file` 建一份空备忘库（只建表，不写行）。这是**布景**，不是被测行为。 */
export function initMemoTestDb(file) {
  const db = new DatabaseSync(file);
  try { db.exec(MEMO_TEST_SCHEMA_DDL); } finally { db.close(); }
  return file;
}

export function nodeBin() { return process.execPath; }
export function pythonBin() {
  if (process.env.PYTHON_BIN) return process.env.PYTHON_BIN;
  const r = spawnSync('python', ['-c', 'import sys;print(sys.executable)'], { encoding: 'utf8' });
  if (r.status === 0) return String(r.stdout).trim();
  return 'python';
}

// ── 注入点②：远端平台挡板 ────────────────────────────────────────────────────
/** 在 `dir` 里造一份替身 lark-cli（`lark-cli.cmd`／无扩展名 shim ＋ 状态与留痕文件），返回它的把手。 */
export function makeLarkStub(dir, state = {}) {
  mkdirSync(dir, { recursive: true });
  const stub = join(dir, 'lark-stub.mjs');
  copyFileSync(STUB_SRC, stub);
  const stateFile = join(dir, 'state.json');
  const logFile = join(dir, 'calls.jsonl');
  writeFileSync(stateFile, JSON.stringify({ mode: 'normal', events: [], tasks: [], scopes: ['task', 'calendar'], seq: 0, ...state }, null, 2), 'utf8');
  writeFileSync(logFile, '', 'utf8');
  // Windows：真 lark-cli 本体就是 .cmd（`packages/skill-schedule/src/fetch/feishu.ts:50`），照它的形状造。
  const cmd = join(dir, 'lark-cli.cmd');
  writeFileSync(cmd, '@node "%~dp0lark-stub.mjs" %*\r\n', 'utf8');
  const sh = join(dir, 'lark-cli');
  writeFileSync(sh, '#!/usr/bin/env node\nimport "./lark-stub.mjs";\n', 'utf8');
  try { chmodSync(sh, 0o755); } catch { /* win 无 exec 位 */ }
  // 老实现认 `%APPDATA%\npm\lark-cli.cmd`：同一份挡板在那儿再放一份门面。
  const npmDir = join(dirname(dir), 'appdata', 'npm');
  mkdirSync(npmDir, { recursive: true });
  writeFileSync(join(npmDir, 'lark-cli.cmd'), '@node "' + stub + '" %*\r\n', 'utf8');
  const file = process.platform === 'win32' ? cmd : sh;
  return {
    dir, file, stub, stateFile, logFile,
    calls: () => (existsSync(logFile) ? readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []),
    state: () => JSON.parse(readFileSync(stateFile, 'utf8')),
    setState: (patch) => { const s = JSON.parse(readFileSync(stateFile, 'utf8')); writeFileSync(stateFile, JSON.stringify({ ...s, ...patch }, null, 2), 'utf8'); },
    clearCalls: () => writeFileSync(logFile, '', 'utf8'),
    note: (o) => writeFileSync(logFile, JSON.stringify(o) + '\n', 'utf8'),
  };
}

// ── 接缝本体 ─────────────────────────────────────────────────────────────────
/** 造一条接缝：临时数据目录 ＋ 挡板 ＋ 两代出口的调用器。 */
export function makeSeam(kind, { prefix = 'seam-', state = {}, withDb = true, timeoutMs = 120000 } = {}) {
  const K = KINDS[kind];
  if (!K) throw new Error('未知技能：' + kind);
  const dir = mkdtempSync(join(tmpdir(), prefix));
  const dbPath = join(dir, 'db');
  if (withDb) {
    mkdirSync(dbPath, { recursive: true });
    // 新备忘直连老库文件（#665 DB 对齐）：接缝库也是 `memo.db`，表与老 `init.sql` 同形；
    // 旧 JSON 笔记目录（`<SKILLS_DB_PATH>/memo/`）已退役，此处不再建它。
    if (K.skill === 'memo') initMemoTestDb(join(dbPath, 'memo.db'));
  }
  const stub = makeLarkStub(join(dir, 'stub'), state);
  const appdata = join(dir, 'appdata');
  const windows = process.platform === 'win32';
  const base = process.env;
  const winDir = base.SystemRoot || 'C:\\Windows';
  const oldPath = [stub.dir, dirname(nodeBin()), windows ? join(winDir, 'System32') : '/usr/bin', windows ? winDir : '/bin'].join(windows ? ';' : ':');
  // 老实现那一侧：PATH 里**只有**挡板，没有任何真 lark-cli 的落点；APPDATA 也指向挡板根。
  const oldEnv = {
    SystemRoot: base.SystemRoot, windir: base.windir, COMSPEC: base.COMSPEC, PATHEXT: base.PATHEXT,
    TEMP: base.TEMP, TMP: base.TMP, HOME: base.HOME, USERPROFILE: base.USERPROFILE,
    NUMBER_OF_PROCESSORS: base.NUMBER_OF_PROCESSORS,
    PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1', PYTHONDONTWRITEBYTECODE: '1',
    APPDATA: appdata, PATH: oldPath,
    ...(withDb ? { SKILLS_DB_PATH: dbPath } : {}),
  };
  // 新实现那一侧：两个注入点都显式给（`LARK_CLI_PATH` 是它的正式覆盖点）。
  // `SKILLS_DB_PATH` 一律**显式**设或不设：`{...base}` 会把环境里那份真实库路径带进来，
  // 而「未设即拒」正是预检的一部分——探针跑的环境必须自己说了算，不吃外头的。
  const newEnv = { ...base, LARK_CLI_PATH: stub.file };
  if (withDb) newEnv.SKILLS_DB_PATH = dbPath; else delete newEnv.SKILLS_DB_PATH;
  const bin = join(ROOT, 'packages', K.pkg, 'dist', 'cli', 'cmd_read.js');
  return {
    kind, K, dir, dbPath, stub, bin, oldEnv, newEnv,
    runOld: (args, opts) => spawnSync(pythonBin(), [K.oldScript, ...args], { cwd: stub.dir, env: oldEnv, encoding: 'utf8', timeout: (opts && opts.timeoutMs) || timeoutMs }),
    runNew: (key, params, opts) => spawnSync(nodeBin(), [bin, key, '--params', JSON.stringify(params ?? {})], { env: newEnv, encoding: 'utf8', timeout: (opts && opts.timeoutMs) || timeoutMs }),
    calls: stub.calls,
    remote: stub.state,
    setRemote: stub.setState,
    localOld: () => localRows(K, dbPath, 'old'),
    localNew: () => localRows(K, dbPath, 'new'),
  };
}

/** 老备忘的建表在仓外是另一条路（`script/init.sql`，由它的首次使用流程铺），本函数照那条既有用法先把表铺好。
 *  这是**布景**，不是被测行为：被测的是「一条命令做不做得成两侧对齐」。 */
export function initOldMemoDb(dbPath, oldSkills = OLD_SKILLS) {
  const sql = readFileSync(join(oldSkills, '备忘录', 'script', 'init.sql'), 'utf8');
  const file = join(dbPath, KINDS.memo.db);
  const db = new DatabaseSync(file);
  try { db.exec(sql); } finally { db.close(); }
  return file;
}

/** 读本地库行（三代四种形状）。sqlite 一律只读打开，不改老库／新库。 */
export function localRows(K, dbPath, branch) {
  if (K.skill === 'schedule') {
    return sqliteRows(join(dbPath, K.db), 'SELECT id, date, time_start, time_end, title, notes, feishu_event_id, is_active FROM schedule_plans ORDER BY id');
  }
  if (branch === 'old') {
    return sqliteRows(join(dbPath, K.db), 'SELECT id, content, category, due, feishu_task_guid FROM notes ORDER BY id');
  }
  // 新备忘（#665 DB 对齐后）：与老侧同一只 `memo.db`、同一张表读行；JSON 目录已退役。
  return sqliteRows(join(dbPath, K.db), 'SELECT id, content, category, due, feishu_task_guid FROM notes ORDER BY id');
}

function sqliteRows(file, sql) {
  if (!existsSync(file)) return [];
  const db = new DatabaseSync(file, { readOnly: true });
  try { return db.prepare(sql).all().map((r) => ({ ...r })); } finally { db.close(); }
}

// ── 前置门：老进程解析到的 lark-cli 必须是挡板 ────────────────────────────────
/** 让老实现**自己报出**它找到的 lark-cli 路径；不是挡板即抛（这一跑绝不碰真飞书）。 */
export function assertStubIsTheOne(seam) {
  const probe = seam.K.skill === 'schedule'
    ? 'import sys; sys.path.insert(0, r"' + dirname(seam.K.oldScript) + '"); import feishu_sync; print(feishu_sync.find_lark_cli())'
    : 'import sys; sys.path.insert(0, r"' + dirname(seam.K.oldScript) + '"); import feishu_sync; print(feishu_sync._find_lark_cli())';
  const r = spawnSync(pythonBin(), ['-c', probe], { cwd: seam.stub.dir, env: seam.oldEnv, encoding: 'utf8', timeout: 60000 });
  const got = String(r.stdout || '').trim();
  // `shutil.which` 命中「当前目录」时回的是相对写法（`.\lark-cli.CMD`），而这一跑的 cwd 就是挡板目录。
  const abs = got.startsWith('.') ? join(seam.stub.dir, got.replace(/^\.[\\/]/, '')) : got;
  // 老备忘认 `%APPDATA%\npm\lark-cli.cmd`（同一份挡板在那儿另放的门面），故按**整条接缝目录**判归属。
  const realAppdata = join(process.env.APPDATA || '\u0000', 'npm', 'lark-cli.cmd');
  if (!abs.toLowerCase().startsWith(seam.dir.toLowerCase()) || normalize(abs) === normalize(realAppdata)) {
    throw new Error('前置门未过：老实现解析到的 lark-cli 不在挡板目录内 → ' + JSON.stringify(got) + '（stderr=' + String(r.stderr).slice(0, 300) + '）');
  }
  return got;
}

// ── 读数原料 ─────────────────────────────────────────────────────────────────
/** 解析远端调用留痕里「建对象」的那几条（判重读数的原料）。 */
export function createdCalls(seam, what) {
  const all = seam.calls().map((c) => c.argv);
  if (what === 'event') return all.filter((a) => a[0] === 'calendar' && a[1] === '+create');
  if (what === 'task') return all.filter((a) => a[0] === 'task' && a[1] === '+create');
  throw new Error('未知对象类型：' + what);
}
/** 取 `--flag value` 形式里的值。 */
export function argOf(argv, flag) {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
}
// ── 断言模板：每条能力至少四条读数 ───────────────────────────────────────────
/**
 * 四条读数（规格 #657「Testing Decisions」）——每条能力逐条读，**逐条点名**，不合并成一句「通过了」：
 *   ① 幂等：重复调用不重复写（本地不增行、远端不重复建对象）
 *   ② 回执分字段：本地侧做了什么／远端侧做了什么／远端标识是什么，三样各能单独读到
 *   ③ 降级：远端不可用时本地照样成，且回执如实标明远端侧没成
 *   ④ 归属标记：远端对象上带的锚写对，且能从远端反查回本地
 *
 * 调用方只给三个小钩子（都对着统一出口，不碰内部件）：
 *   `act(seam, n)`      第 n 次调用合成写（n=0 首次、n=1 重复那次）
 *   `remoteOff(seam)`   把挡板切成「远端不可用」，供第 ③ 条
 *   `receipt(env)`      从回执里挑出「本地侧／远端侧／远端标识」三格
 *   `marker(createArgv)` 从远端「建对象」那次调用里读出归属锚（没有就返 null）
 * 返回值：逐条 `{id, name, verdict: 'pass'|'fail'|'n/a', reading}`，`reading` 是当场读到的原样值。
 */
export const READING_NAMES = {
  idempotent: '重复调用不重复写',
  receipt: '回执分字段',
  degrade: '远端不可用时降级',
  ownership: '归属标记写对且可反查',
};

export function fourReadings(spec) {
  const { seam, act, remoteOff, receipt, marker, whatObject, reportedOff } = spec;
  const out = [];
  const first = runOnce(seam, act, 0);
  const dup = runOnce(seam, act, 1);
  const localGrew = dup.local.length - first.local.length;
  const remoteDup = dup.creates.length;
  out.push({
    id: 'idempotent', name: READING_NAMES.idempotent,
    verdict: localGrew === 0 && remoteDup === 0 ? 'pass' : 'fail',
    reading: { 本地位数: first.local.length + '→' + dup.local.length, 远端重复建: remoteDup },
  });

  const fields = receipt(first.env);
  const filled = Object.entries(fields).filter(([, v]) => v !== undefined && v !== null && v !== '');
  out.push({
    id: 'receipt', name: READING_NAMES.receipt,
    verdict: filled.length >= 2 ? 'pass' : 'fail',
    reading: { 三格: fields, 填了几格: filled.length },
  });

  const before = seam.stub.state();
  if (remoteOff) remoteOff(seam);
  const off = runOnce(seam, act, 2);
  seam.stub.setState(before);
  const localWroteWhenRemoteDown = off.local.length >= first.local.length;
  const saidSo = reportedOff ? reportedOff(off) === true : false;
  out.push({
    id: 'degrade', name: READING_NAMES.degrade,
    verdict: localWroteWhenRemoteDown ? (saidSo ? 'pass' : 'fail') : 'fail',
    reading: { 本地照样写: localWroteWhenRemoteDown, 回执标明远端没成: saidSo, 退出码: off.exit },
  });

  const created = first.creates;
  const mark = created.length ? marker(created[0]) : null;
  out.push({
    id: 'ownership', name: READING_NAMES.ownership,
    verdict: mark ? 'pass' : 'fail',
    reading: { 远端建了几个: created.length, 锚: mark, 对象: whatObject || '' },
  });
  return out;
}

function runOnce(seam, act, n) {
  seam.stub.clearCalls();
  const before = seam.localNew();
  const r = act(seam, n);
  let env = null; let fieldsOff = false;
  try { env = envelope(r); } catch { fieldsOff = true; }
  const calls = seam.calls().map((c) => c.argv);
  return {
    exit: r.status, env, fieldsOff,
    local: seam.localNew(),
    before,
    creates: calls.filter((a) => (a[1] === '+create')),
  };
}

/** 解析出口回执（stdout 一行 JSON）；非 JSON 即抛，不静默返空。 */
export function envelope(r) {
  const text = String(r.stdout || '').trim();
  if (!text) throw new Error('出口 stdout 为空（exit=' + r.status + '，stderr=' + String(r.stderr).slice(0, 300) + '）');
  try { return JSON.parse(text.split('\n').pop()); } catch { throw new Error('出口回执非 JSON：' + text.slice(0, 300)); }
}

function normalize(p) { return String(p).replace(/\//g, '\\').toLowerCase(); }
