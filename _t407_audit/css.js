const fs=require('fs');
const DIR='D:\\ilife\\docs\\skills\\skill-bill\\';
const RE=/^t407-(代表-记支出|页-.+)-(采集页|回执页)\.html$/;
const files=fs.readdirSync(DIR).filter(f=>RE.test(f)).sort();
const rules=new Map();
for(const f of files){
  const raw=fs.readFileSync(DIR+f,'utf8');
  const re=/\.(ilife-block-pre-block[a-z-]*|ilife-block-copy-block[a-z-]*|ilife-copy-btn[a-z-]*|ilife-copy-menu[a-z-]*)\s*\{([^}]*)\}/g;
  let m;
  while((m=re.exec(raw))!==null){
    const k=m[1], v=m[2].replace(/\s+/g,' ').trim();
    if(!rules.has(k)) rules.set(k,new Map());
    rules.get(k).set(v,(rules.get(k).get(v)||0)+1);
  }
}
for(const [k,map] of rules){
  console.log('.'+k+'   ('+map.size+' variant(s))');
  for(const [v,c] of map) console.log('    x'+c+'  '+v);
}
