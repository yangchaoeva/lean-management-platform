const axios = require('axios');

// 从环境变量获取飞书配置
const FEISHU_CONFIG = {
  APP_ID: process.env.FEISHU_APP_ID || 'cli_a83d1e5dde2f900c',
  APP_SECRET: process.env.FEISHU_APP_SECRET || 'PaWtVQYUTKUpan6tXpBMfgr3b2b788aa',
  APP_TOKEN: process.env.FEISHU_APP_TOKEN || 'D6JdbXh1DaemR0sDemMc4JwnnUd',
  TABLE_ID: process.env.FEISHU_TABLE_ID || 'tblEHCeAsHQWiEEj',
  BASE_URL: 'https://open.feishu.cn/open-apis'
};

// 缓存访问令牌
let cachedAccessToken = null;
let tokenExpireTime = 0;

/**
 * 获取租户访问令牌
 */
async function getTenantAccessToken() {
  if (cachedAccessToken && Date.now() < tokenExpireTime) {
    return cachedAccessToken;
  }

  try {
    const response = await axios.post(`${FEISHU_CONFIG.BASE_URL}/auth/v3/tenant_access_token/internal`, {
      app_id: FEISHU_CONFIG.APP_ID,
      app_secret: FEISHU_CONFIG.APP_SECRET
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.code === 0) {
      cachedAccessToken = response.data.tenant_access_token;
      tokenExpireTime = Date.now() + (response.data.expire - 300) * 1000;
      return cachedAccessToken;
    } else {
      throw new Error(`获取访问令牌失败: ${response.data.msg}`);
    }
  } catch (error) {
    console.error('获取飞书访问令牌失败:', error.message);
    throw error;
  }
}

/**
 * Vercel API 处理函数
 */
async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const accessToken = await getTenantAccessToken();
    
    res.status(200).json({
      success: true,
      message: '飞书API连接成功',
      data: {
        hasToken: !!accessToken,
        config: {
          appId: FEISHU_CONFIG.APP_ID ? FEISHU_CONFIG.APP_ID.substring(0, 8) + '...' : 'Not set',
          appToken: FEISHU_CONFIG.APP_TOKEN ? FEISHU_CONFIG.APP_TOKEN.substring(0, 8) + '...' : 'Not set',
          tableId: FEISHU_CONFIG.TABLE_ID ? FEISHU_CONFIG.TABLE_ID.substring(0, 8) + '...' : 'Not set'
        }
      }
    });
  } catch (error) {
    console.error('飞书API测试失败:', error);
    res.status(500).json({
      success: false,
      error: '飞书API连接失败',
      message: error.message
    });
  }
}

module.exports = handler;
module.exports.default = handler;