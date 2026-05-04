const http = require('http');
const crypto = require('crypto');

const ZHIPU_API_KEY = "376ca943a95b47e6a4d4330df16a6170.0u07rgDrxGi8S2je";

const ALL_HEROES = ["小小","死亡骑士","圣灵骑士","血魔","天照","剑圣","冰女","暗影萨满","潮汐猎人","光之守卫","恶魔巫师","斧王","魅惑魔女","神谕者","暗夜刺客","龙骑士","全能骑士","沉默术士","凤凰","大地之灵"];

const COUNTER_DB = {
  "死亡骑士,圣灵骑士,血魔,天照,小小": { counter: "1队推荐上证：剑圣,冰女,暗影萨满,潮汐猎人,光之守卫", reason: "冰女控制克制血魔" },
  "剑圣,冰女,暗影萨满,潮汐猎人,光之守卫": { counter: "1队推荐上证：小小,死亡骑士,圣灵骑士,血魔,天照", reason: "死亡骑士抗剑圣" }
};

const uploadedHashes = new Set();

function sendJSON(res, code, data) {
  res.writeHead(code, {"Content-Type":"application/json","Access-Control-Allow-Origin":"*"});
  res.end(JSON.stringify(data));
}

async function callAI(imageUrl) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    
    const r = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
      method:"POST",
      headers:{"Authorization":"Bearer "+ZHIPU_API_KEY,"Content-Type":"application/json"},
      body: JSON.stringify({
        model:"glm-4v",
        messages:[{role:"user",content:[{type:"text",text:"识别图中敌方英雄，已知英雄："+ALL_HEROES.join("、")+"。直接返回英雄名，逗号分隔。"},{type:"image_url",image_url:{url:imageUrl}}]}]
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    const d = await r.json();
    if (d.choices && d.choices[0]) {
      return d.choices[0].message.content;
    }
    return null;
  } catch(e) { 
    return null; 
  }
}

function getHeroes(text) {
  if(!text) return [];
  return ALL_HEROES.filter(h => text.includes(h));
}

function getCounter(heroes) {
  if(!heroes.length) return null;
  const key = [...heroes].sort().join(",");
  if(COUNTER_DB[key]) return COUNTER_DB[key];
  return { counter: "推荐上证：剑圣,冰女,暗影萨满,潮汐猎人,光之守卫", reason: "通用阵容" };
}

async function parseFile(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const str = Buffer.concat(chunks).toString('binary');
  const b = req.headers['content-type'].match(/boundary=(.+)/);
  if(!b) return null;
  const boundary = b[1];
  const s = str.split('--'+boundary);
  for(const p of s) {
    const i = p.indexOf('\r\n\r\n');
    if(i===-1) continue;
    const h = p.substring(0,i);
    if(h.includes('name="image"')) {
      return Buffer.from(p.substring(i+4),'binary');
    }
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  if(req.method==='OPTIONS') {
    res.writeHead(204,{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST","Access-Control-Allow-Headers":"Content-Type"});
    return res.end();
  }
  
  const p = new URL(req.url,'http://x').pathname;

  if(p==='/api/health') return sendJSON(res,200,{status:"ok"});
  if(p==='/api/profile') return sendJSON(res,200,{success:true,data:{username:"战术大师·影",avatar:"🐉"}});

  if(p==='/api/get-counter' && req.method==='POST') {
    const file = await parseFile(req);
    if(!file) return sendJSON(res,400,{success:false,error:"请上传图片"});
    const b64 = file.toString('base64');
    const text = await callAI("data:image/jpeg;base64,"+b64);
    if(!text) return sendJSON(res,500,{success:false,error:"AI识别失败"});
    const heroes = getHeroes(text);
    const result = getCounter(heroes);
    return sendJSON(res,200,{success:true,recognized:heroes,counter:result.counter,reason:result.reason});
  }

  if(p==='/api/upload-battle' && req.method==='POST') {
    const file = await parseFile(req);
    if(!file) return sendJSON(res,400,{success:false,error:"请上传图片"});
    const hash = crypto.createHash('md5').update(file).digest('hex');
    if(uploadedHashes.has(hash)) return sendJSON(res,200,{success:false,error:"请勿重复上传"});
    uploadedHashes.add(hash);
    return sendJSON(res,200,{success:true,message:"上传成功"});
  }

  sendJSON(res,404,{error:"Not Found"});
});

module.exports = server;
