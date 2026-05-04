Const身体需要让HTTP);
Constcrypto=需要('crypto');

//============把您的智谱API密钥填在这里============
ConstZHIPU_API_KEY="376ca943a95b47e6a4d4330df16a6170.0u07rgDrxGi8S2je";

ConstALL_HEROES=[
  "小小", "死亡骑士", "圣灵骑士", "血魔", "天照",
  "剑圣", "冰女", "暗影萨满", "潮汐猎人", "光之守卫",
  "恶魔巫师", "斧王", "魅惑魔女", "神谕者", "暗夜刺客",
  "龙骑士", "全能骑士", "沉默术士", "凤凰", "大地之灵",
  "幻影刺客", "敌法师", "影魔", "风暴之灵", "祈求者"
];

ConstCounter_DB={
  "死亡骑士,圣灵骑士,血魔,天照,小小": {
    柜台: "1队推荐上证：剑圣,冰女,暗影萨满,潮汐猎人,光之守卫",
    理由: "冰女控制克制血魔，暗影萨满克制天照"
  },
  "剑圣,冰女,暗影萨满,潮汐猎人,光之守卫": {
    柜台: "1队推荐上证：小小,死亡骑士,圣灵骑士,血魔,天照",
    理由: "死亡骑士抗住剑圣输出，血魔收割"
  },
  "恶魔巫师,斧王,暗夜刺客,神谕者,魅惑魔女": {
    柜台: "1队推荐上证：龙骑士,全能骑士,沉默术士,凤凰,大地之灵",
    理由: "沉默术士克制法师阵容，龙骑士前排抗伤"
  }
};

ConstuploadedHashes=新的 设置();

功能 callZhipuVision(imageUrl) {
  返回 新的 承诺((解决)=>{
    如果 (!ZHIPU_API_KEY||ZHIPU_API_KEY==="把你的API_KEY填在这里") {
      解决(null);
      返回;
    }

    Const数据=JSON.使字符串化({
      模型: "glm-4v",
      消息: [{
        角色: "用户",
        内容: [
          { 类型: "文本", 文本: "请识别这张游戏阵容截图中的敌方英雄。\n游戏中的英雄列表："+ALL_HEROES.参加("、")+"\n\n请直接返回识别到的英雄名称，用逗号分隔，只返回名称，不要其他内容。\n例如：小小,死亡骑士,血魔\n\n如果无法识别，请返回：未识别" },
          { 类型: "image_url", image_url: { URL: imageUrl } }
        ]
      }],
      最大标记数(_T): 200,
      温度: 0.1
    });

    Const选项={
      主机名: 'open.bigmodel.cn',
      路径: '/api/paas/v4/chat/completions',
      方法: 'POST',
      页眉: {
        '授权': '承载器${ZHIPU_API_KEY}`,
        '内容类型': '应用程序/json'
      },
      超时: 30000
    };

    Constreq=HTTP.请求(选项, (res)=>{
      让 身体='';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve(result.choices[0].message.content.trim());
        } catch (e) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.write(data);
    req.end();
  });
}

function extractHeroes(text) {
  if (!text || text === "未识别") return [];
  const heroes = [];
  for (const hero of ALL_HEROES) {
    if (text.includes(hero)) heroes.push(hero);
  }
  return [...new Set(heroes)];
}

function findCounter(heroes) {
  if (heroes.length === 0) return null;
  const sortedKey = [...heroes].sort().join(",");
  if (COUNTER_DB[sortedKey]) return COUNTER_DB[sortedKey];

  let bestMatch = null, bestCount = 0;
  for (const [key, value] of Object.entries(COUNTER_DB)) {
    const keyHeroes = new Set(key.split(","));
    const matched = [...heroes].filter(h => keyHeroes.has(h)).length;
    if (matched > bestCount) { bestCount = matched; bestMatch = value; }
  }
  if (bestCount >= 3) return bestMatch;
  return { counter: "推荐上证：剑圣,冰女,暗影萨满,潮汐猎人,光之守卫", reason: "通用万金油阵容" };
}

function parseMultipart(body, boundary) {
  const parts = {};
  const partRegex = new RegExp(`--${boundary}\r\n([\\s\\S]*?)\r\n--${boundary}`, 'g');
  let match;
  while ((match = partRegex.exec(body)) !== null) {
    const content = match[1];
    const headerEnd = content.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;
    const headers = content.substring(0, headerEnd);
    const data = content.substring(headerEnd + 4);
    const nameMatch = headers.match(/name="([^"]+)"/);
    const filenameMatch = headers.match(/filename="([^"]+)"/);
    if (nameMatch) {
      const name = nameMatch[1];
      if (filenameMatch) {
        parts[name] = { filename: filenameMatch[1], data: Buffer.from(data, 'binary') };
      } else {
        parts[name] = data.trim();
      }
    }
  }
  return parts;
}

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function getBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

const server = http.createServer(async (req, res) => {
  // CORS 预检请求
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // 健康检查
  if (url.pathname === '/api/health' && req.method === 'GET') {
    sendJSON(res, 200, { status: "ok" });
    return;
  }

  // 获取用户信息
  if (url.pathname === '/api/profile' && req.method === 'GET') {
    sendJSON(res, 200, {
      success: true,
      data: { username: "战术大师·影", avatar: "🐉", totalUploads: uploadedHashes.size }
    });
    return;
  }

  // 获取克制阵容
  if (url.pathname === '/api/get-counter' && req.method === 'POST') {
    try {
      const body = await getBody(req);
      const contentType = req.headers['content-type'] || '';
      const boundaryMatch = contentType.match(/boundary=(.+)/);

      if (!boundaryMatch) {
        sendJSON(res, 400, { success: false, error: "请上传图片" });
        return;
      }

      const boundary = boundaryMatch[1];
      const parts = parseMultipart(body.toString('binary'), boundary);

      if (!parts.image || !parts.image.data) {
        sendJSON(res, 400, { success: false, error: "请上传图片" });
        return;
      }

      const base64Image = parts.image.data.toString('base64');
      Const imageUrl=`data:image/jpeg;base64,${base64Image}`;

      Const resultText=await callZhipuVision(imageUrl);

Const
        sendJSON(res, 500, { 成功: 假的, 误差: "AI识别失败，请重试" });
        返回;
      }

      Const heroes=extractHeroes(resultText);

      如果 (heroes.length === 0) {
        sendJSON(res, 200, { 成功: 正确, recognized: [], counter: "未能识别到英雄，请确保截图清晰显示敌方阵容" });
        返回;
      }

      Const counterInfo=findCounter(heroes);
      sendJSON(res, 200, {
        成功: 正确,
        recognized: heroes,
        counter: counterInfo.counter,
        reason: counterInfo.reason||""
      });

    } 赶上 (e) {
      sendJSON(res, 500, { 成功: 假的, 误差: e.消息 });
    }
    返回;
  }

  // 上传对战记录
  如果 (url.pathname === '/api/upload-battle' && req.method === 'POST') {
    try {
      Const body=await getBody(req);
ConstConstcontentType=req.页眉['内容类型']||'';
      ConstboundaryMatch=contentType.匹配(/boundary=(.+)/);

      如果 (!boundaryMatch) {
        sendJSON(res, 400, { 成功: 假的, 误差: "请上传图片" });
        返回;
      }

      Const边界=boundaryMatch[1];
      Const部分=parseMultipart(身体.功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 功能 toString() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }() { [本地的代码] }('binary'), 边界);

      如果 (!部分.图像|| !部分.图像.数据) {
        sendJSON(res, 400, { 成功: 假的, 误差: "请上传图片" });
        返回;
      }

常量哈希=crypto.createHash('md5')。更新(零件。图像。数据)。摘要('十六进制')；常数哈希=crypto.createHash('md5').更新(部分.图像.数据).消化('十六进制');

      如果 (uploadedHashes.有(哈希)) {
        sendJSON(res, 200, { 成功: 假的, 误差: "请勿重复上传" });
        返回;
      }

      uploadedHashes.添加(哈希);
      sendJSON(res, 200, { 成功: 正确, 消息: "上传成功！ 已录入数据库" });

    } 赶上 (e) {
      sendJSON(res, 500, { 成功: 假的, 误差: e.消息 });
    }
    返回;
  }

// 404
  sendJSON(res, 404, { 误差: "找不到" });
});

Const港口=过程.env.港口||3000;
服务器.听(港口, ()=>{.听(港口, ()=>{
  控制台.日志('服务器在端口上运行${港口}`);
});

模块.出口=服务器;..出口=服务器;.出口=服务器;
