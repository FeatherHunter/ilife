/** 配置体检 · **八条体检项**（票 #706 的检查表落地，票 #855 从这里分件出来）。
 *
 * 检查项与检查表 `docs/research/check-table-671-life-panel-20260917.html` 逐条对应：
 * 六家通用 5 条（配置文件本身／数据目录／库文件表数／产物目录／这个值从哪来）
 * ＋ 备忘特有 3 条（附件目录／飞书 CLI／包内模板目录）。
 * 「场景资产」那条已删（维护者裁定）：包 `files` 只发 `dist`／`SKILL.md`／`templates`，
 * 装机态按设计没有 `src/` ⇒ 那条恒红，且真缺 dist 产物时 CLI 的静态 import 先崩、报告本身出不来。
 * 「附件」那一项的形状跟着 #712 走：附件从「字符串前缀」改成**真目录 ＋ 真包含判定**。
 *
 * 口径（票面「开工前的形状裁定」）：
 *   · **判据住技能侧**——每条的有效值（库在哪、产物落哪个目录、包内预置件在不在）只有本包算得出来；
 *     插件包与总管只透传与渲染，不重写这里的任何一个字。
 *   · **只报不改**——不建目录、不写文件、不落那份默认配置；因此**不许**调 `loadMemoConfig()`（文件不在即落默认件）。
 *   · 判据查的路径一律是**新仓的**：检查表里那些老仓文件名只作注释里的出处，不进用户看到的报文。
 *
 * 搬迁状态（#855）：八条今天同住本件；按域归位（`src/<域>/health.ts`）随各域目录建立时落，届时本件只留聚合。
 */
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { configPaths } from 'base-link-core';
import { MEMO_CONFIG_DEFAULTS, MEMO_CONFIG_STEM } from '../../config.js';
import { mediaDirOf } from '../../shared/paths.js';
import { projectOnDefaults, readMemoConfigReadOnly, readValue, sourceOf, textOf } from './configRead.js';
import {
  DB_TABLE_THRESHOLD,
  dbDirMessage,
  dirVerdict,
  findLarkCli,
  larkTier,
  p,
  packageRoot,
  splitDirSegments,
  tableCount,
  templateFileCount,
} from './probe.js';
import { larkSetupInfo, LARK_WEBSITE_URL } from '../../sync/index.js';
import { m } from '../../entries/index.js';

/** 报告里的三档判据（与面板侧镜像同值）。 */
export type HealthStatus = 'red' | 'yellow' | 'green';

export interface HealthItem {
  readonly id: string;
  readonly title: string;
  readonly status: HealthStatus;
  readonly message: string;
  readonly action: string;
  readonly source?: string;
}

export interface MemoHealthReport {
  readonly skill: string;
  readonly configPath: string;
  readonly dataDir: string;
  readonly items: readonly HealthItem[];
  /** 复制安装指引全文（#1142：read 不再带 lark 格，面板改从这份体检报告取；定稿 #759，唯一真相在 `src/sync/feishu.ts`）。 */
  readonly prompt: string;
  /** 官网行与跳转目标（与 prompt 同源，不另拼）。 */
  readonly websiteLine: string;
  readonly websiteUrl: string;
}

const SKILL = 'memo' as const;

/** 跑一次体检，返回整份报告。**只读**：任何一处都不落盘（只有写探针那一个文件，且当场删掉）。 */
export function buildMemoHealthReport(): MemoHealthReport {
  const paths = configPaths(MEMO_CONFIG_STEM);
  const items: HealthItem[] = [];
  const read = readMemoConfigReadOnly();
  const values = read.kind === 'ok' ? read.values : projectOnDefaults({});
  const present: ReadonlySet<string> = read.kind === 'ok' ? read.present : new Set<string>();

  // ① 配置文件本身：能不能解析；它落在默认位置还是别处（只陈述，不评价）。
  const defaultConfigFile = join(homedir(), '.ilife', MEMO_CONFIG_STEM + '.yaml');
  const relocated = paths.configFile !== defaultConfigFile;
  const where = relocated ? m('skill-memo-ilife.cli-health-items.c001') : m('skill-memo-ilife.cli-health-items.c002');
  if (read.kind === 'bad') {
    items.push({
      id: 'config.file', title: m('skill-memo-ilife.cli-health-items.c003'), status: 'red',
      message: read.message,
      action: m('skill-memo-ilife.cli-health-items.c004'),
      source: m('skill-memo-ilife.cli-health-items.c005'),
    });
  } else if (read.kind === 'missing') {
    items.push({
      id: 'config.file', title: m('skill-memo-ilife.cli-health-items.c006'), status: 'yellow',
      message: m('skill-memo-ilife.cli-health-items.c007', { p0: String(p(paths.configFile)) }),
      action: m('skill-memo-ilife.cli-health-items.c008'),
      source: m('skill-memo-ilife.cli-health-items.c009'),
    });
  } else {
    items.push({
      id: 'config.file', title: m('skill-memo-ilife.cli-health-items.c010'), status: 'green',
      message: m('skill-memo-ilife.cli-health-items.c011', { p0: String(p(paths.configFile)), p1: String(where) }),
      action: '',
      source: m('skill-memo-ilife.cli-health-items.c012'),
    });
  }

  // ② 数据目录：在不在、能不能写。
  const dbDirConfigured = textOf(readValue(values, 'db', 'dir'));
  const dataDir = dbDirConfigured !== '' ? dbDirConfigured : paths.dataDir;
  const dataDirSource = sourceOf(present, 'db.dir');
  const dataDirVerdict = dirVerdict(dataDir);
  items.push({
    id: 'db.dir', title: m('skill-memo-ilife.cli-health-items.c013'),
    status: !dataDirVerdict.exists || !dataDirVerdict.writable ? 'red' : 'green',
    message: dbDirMessage(dataDir, dataDirVerdict),
    action: !dataDirVerdict.exists
      ? m('skill-memo-ilife.cli-health-items.c014')
      : dataDirVerdict.writable ? '' : m('skill-memo-ilife.cli-health-items.c015'),
    source: dataDirSource,
  });

  // ③ 库文件：在不在 ＋ 表数够不够。
  const dbNameConfigured = textOf(readValue(values, 'db', 'name'));
  const dbName = dbNameConfigured !== '' ? dbNameConfigured : String(MEMO_CONFIG_DEFAULTS.db.name);
  const dbFile = join(dataDir, dbName);
  const dbSource = sourceOf(present, 'db.name');
  if (!existsSync(dbFile)) {
    items.push({
      id: 'db.file', title: m('skill-memo-ilife.cli-health-items.c016'), status: 'red',
      message: m('skill-memo-ilife.cli-health-items.c017', { p0: String(p(dbFile)) }),
      action: m('skill-memo-ilife.cli-health-items.c018'),
      source: dbSource,
    });
  } else {
    const tables = tableCount(dbFile);
    if (!tables.ok) {
      items.push({
        id: 'db.file', title: m('skill-memo-ilife.cli-health-items.c019'), status: 'red',
        message: m('skill-memo-ilife.cli-health-items.c020', { p0: String(p(dbFile)), p1: String(tables.reason) }),
        action: m('skill-memo-ilife.cli-health-items.c021'),
        source: dbSource,
      });
    } else if (tables.count < DB_TABLE_THRESHOLD) {
      items.push({
        id: 'db.file', title: m('skill-memo-ilife.cli-health-items.c022'), status: 'yellow',
        message: m('skill-memo-ilife.cli-health-items.c023', {
          p0: String(p(dbFile)),
          p1: String(String(tables.count)),
          p2: String(String(DB_TABLE_THRESHOLD)),
        }),
        action: m('skill-memo-ilife.cli-health-items.c024'),
        source: dbSource,
      });
    } else {
      items.push({
        id: 'db.file', title: m('skill-memo-ilife.cli-health-items.c025'), status: 'green',
        message: m('skill-memo-ilife.cli-health-items.c026', {
          p0: String(String(tables.count)),
          p1: String(p(dbFile)),
        }),
        action: '',
        source: dbSource,
      });
    }
  }

  // ④ 产物目录：在不在、能不能写（还没建＝绿：交付页面时才落这里，那时自动建）。
  const htmlDirValue = textOf(readValue(values, 'html', 'dir'));
  const htmlDir = join(dataDir, ...splitDirSegments(htmlDirValue !== '' ? htmlDirValue : String(MEMO_CONFIG_DEFAULTS.html.dir)));
  const htmlVerdict = dirVerdict(htmlDir);
  const htmlSource = sourceOf(present, 'html.dir');
  items.push({
    id: 'html.dir', title: m('skill-memo-ilife.cli-health-items.c027'),
    status: !htmlVerdict.exists ? 'green' : htmlVerdict.writable ? 'green' : 'yellow',
    message: !htmlVerdict.exists
      ? m('skill-memo-ilife.cli-health-items.c028', { p0: String(p(htmlDir)) })
      : htmlVerdict.writable
        ? m('skill-memo-ilife.cli-health-items.c029', { p0: String(p(htmlDir)) })
        : m('skill-memo-ilife.cli-health-items.c030', { p0: String(p(htmlDir)) }),
    action: !htmlVerdict.exists || htmlVerdict.writable ? '' : m('skill-memo-ilife.cli-health-items.c031'),
    source: htmlSource,
  });

  // ⑤ 这个值从哪来：只陈述数据目录与库文件名的来源，不判好坏（六家通用最后一条）。
  // #1225：条件表达式抽成整句局部变量（迁移器不切链内分支；两句各自成词条，不留孤立句号词条）。
  const sourceLine = read.kind === 'missing'
    ? m('skill-memo-ilife.cli-health-items.c032', { p0: String(dataDirSource), p1: String(dbSource) })
    : m('skill-memo-ilife.cli-health-items.c033', { p0: String(dataDirSource), p1: String(dbSource) });
  items.push({
    id: 'value.source', title: m('skill-memo-ilife.cli-health-items.c034'), status: 'green',
    message: sourceLine,
    action: '', source: dataDirSource,
  });

  // ⑥ 附件目录（备忘特有，#712 起的形状；#760 起默认＝`<数据目录>/media`）：没配≠未配——
  // 空串即默认落点，判那个目录在不在；配了但目录不在＝黄；在且能写＝绿。显式相对值按进程工作目录解
  // （与 `resolveMediaDir()` 同一算式 `mediaDirOf`，本件只调纯函数，不触发配置落盘）。
  const mediaConfigured = textOf(readValue(values, 'media', 'dir'));
  const mediaDir = mediaDirOf(dataDir, mediaConfigured);
  const mediaVerdict = dirVerdict(mediaDir);
  const mediaMissing = mediaConfigured === '' ? m('skill-memo-ilife.cli-health-items.c035') : m('skill-memo-ilife.cli-health-items.c036');
  items.push({
    id: 'media.dir', title: m('skill-memo-ilife.cli-health-items.c037'),
    status: mediaVerdict.exists && mediaVerdict.writable ? 'green' : 'yellow',
    message: !mediaVerdict.exists
      ? mediaMissing + p(mediaDir) + '。'
      : mediaVerdict.writable
        ? m('skill-memo-ilife.cli-health-items.c038', { p0: String(p(mediaDir)) })
        : m('skill-memo-ilife.cli-health-items.c039', {
          p0: String(p(mediaDir)),
          p1: String(mediaVerdict.reason),
        }),
    action: mediaVerdict.exists && mediaVerdict.writable ? '' : m('skill-memo-ilife.cli-health-items.c040'),
    source: sourceOf(present, 'media.dir'),
  });

  // ⑦ 飞书 CLI（备忘特有）：三档——找不到＝黄；找得到但没登录／没授权＝黄；登录且 task 域可写＝绿。
  // #760 起 `lark:` 整组出配置表：来源固定按默认值，指引改指复制安装指引（授权三支已退役）。
  const larkCli = findLarkCli('');
  const tier = larkTier(larkCli);
  const larkWhere = larkCli === null ? '' : p(larkCli);
  items.push({
    id: 'lark.cli', title: m('skill-memo-ilife.cli-health-items.c041'),
    status: tier === 'full' ? 'green' : 'yellow',
    message: tier === 'missing'
      ? m('skill-memo-ilife.cli-health-items.c042')
      : tier === 'partial'
        ? m('skill-memo-ilife.cli-health-items.c043')
        : m('skill-memo-ilife.cli-health-items.c044', { p0: String(larkWhere) }),
    action: tier === 'missing'
      ? m('skill-memo-ilife.cli-health-items.c045')
      : tier === 'partial' ? m('skill-memo-ilife.cli-health-items.c046') : '',
    source: m('skill-memo-ilife.cli-health-items.c047'),
  });

  // ⑧ 包内模板目录（备忘特有）：整页交付模板是包内固定件，缺了页面就渲染不出来 ⇒ 红。报文给件数。
  const templatesDir = join(packageRoot(), 'templates');
  const templatesOk = existsSync(templatesDir);
  const templateCount = templatesOk ? templateFileCount(templatesDir) : 0;
  items.push({
    id: 'templates.dir', title: m('skill-memo-ilife.cli-health-items.c048'),
    status: templatesOk ? 'green' : 'red',
    message: templatesOk
      ? m('skill-memo-ilife.cli-health-items.c049', {
        p0: String(String(templateCount)),
        p1: String(p(templatesDir)),
      })
      : m('skill-memo-ilife.cli-health-items.c050', { p0: String(p(templatesDir)) }),
    action: templatesOk ? '' : m('skill-memo-ilife.cli-health-items.c051'),
  });

  const setup = larkSetupInfo();
  return { skill: SKILL, configPath: p(paths.configFile), dataDir: p(dataDir), items, prompt: setup.prompt, websiteLine: setup.websiteLine, websiteUrl: LARK_WEBSITE_URL };
}
