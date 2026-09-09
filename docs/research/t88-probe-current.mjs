/** t88 鐜扮姸鎺㈤拡锛堝彧璇伙紱涓嶅啓浠讳綍鍏变韩璺緞锛夈€傝窇娉曪細node .scratch/t88/probe-current.mjs */
const out = [];
function say(s) { out.push(s); }

const help = await import('../../packages/skill-calorie/dist/render/help.js');
const html = await import('../../packages/skill-calorie/dist/render/html.js');
const trig = await import('../../packages/skill-calorie/dist/triggers/index.js');
const routing = await import('../../packages/skill-calorie/dist/triggers/routing.js');
const keys = await import('../../packages/skill-calorie/dist/cli/keys.js');

const hits = help.buildPhotoHelp();
const page = html.renderPhotoHelpHtml(hits);
say('RESULT-KEYS ' + Object.keys(keys.CALORIE_COMBOS).length);
say('RESULT-PHOTO-HELP-HITS ' + hits.length);
say('RESULT-HELP-HTML-BYTES ' + Buffer.byteLength(page, 'utf8'));
say('RESULT-HELP-HTML-LINES ' + page.split('\n').length);
say('RESULT-HELP-HTML-STARTS ' + JSON.stringify(page.slice(0, 60)));
say('RESULT-HELP-HTML-ENDS ' + JSON.stringify(page.slice(-40)));
say('RESULT-HELP-DOCTYPE ' + /<!DOCTYPE/i.test(page));
say('RESULT-HELP-CHARTS-MARK ' + page.includes('<!--CHARTS-HELPERS-->'));
say('RESULT-HELP-HEADERS ' + JSON.stringify(hits.slice(0, 3).map((h) => [h.wakeWord, h.key])));
say('RESULT-TRIGGERS ' + trig.TRIGGERS.length);
say('RESULT-CATEGORIES ' + trig.CATEGORIES.length);
say('RESULT-HELP-CARDS ' + trig.getHelpCards().length);
say('RESULT-WAKE-ROUTES ' + routing.WAKE_ROUTES.length);
say('RESULT-NEW-KEY-ROUTES ' + routing.NEW_KEY_ROUTES.length);
say('RESULT-COVERAGE-REPAIR ' + routing.COVERAGE_REPAIR_ROUTES.length);
say('RESULT-ALL-ROUTES ' + routing.ALL_ROUTES.length);
say('RESULT-EXEC-ROUTES ' + routing.EXEC_ROUTES.length);
say('RESULT-NONEXEC ' + routing.HIT_NOT_EXEC_ROUTES.length);
say('RESULT-COVERED-KEYS ' + Object.keys(routing.EXEC_ROUTE_BY_KEY).length);
say('RESULT-SUMMARY ' + JSON.stringify(routing.routingSummary()));
const scenes = {};
for (const r of routing.WAKE_ROUTES) scenes[r.scene] = (scenes[r.scene] ?? 0) + 1;
say('RESULT-SCENE-HISTO ' + JSON.stringify(scenes));
const keySet = new Set();
for (const r of routing.ALL_ROUTES) if (r.kind === 'exec') keySet.add(r.key);
say('RESULT-DISTINCT-ROUTE-KEYS ' + keySet.size);
say('RESULT-KEYS-NOT-ROUTED ' + JSON.stringify(Object.keys(keys.CALORIE_COMBOS).filter((k) => !keySet.has(k))));
console.log(out.join('\n'));

