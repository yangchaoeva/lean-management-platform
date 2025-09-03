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
 * 获取表格记录
 */
async function getTableRecords(options = {}) {
  try {
    const accessToken = await getTenantAccessToken();
    const { pageSize = 100, pageToken, viewId } = options;
    
    let url = `${FEISHU_CONFIG.BASE_URL}/bitable/v1/apps/${FEISHU_CONFIG.APP_TOKEN}/tables/${FEISHU_CONFIG.TABLE_ID}/records`;
    const params = new URLSearchParams();
    
    if (pageSize) params.append('page_size', pageSize.toString());
    if (pageToken) params.append('page_token', pageToken);
    if (viewId) params.append('view_id', viewId);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.code === 0) {
      return response.data.data;
    } else {
      throw new Error(`获取表格记录失败: ${response.data.msg}`);
    }
  } catch (error) {
    console.error('获取飞书表格记录失败:', error.message);
    throw error;
  }
}

/**
 * 转换飞书记录为项目数据
 */
function convertFeishuToProject(feishuRecord) {
  const fields = feishuRecord.fields || {};
  
  return {
    id: feishuRecord.record_id,
    name: fields['项目名称']?.[0]?.text || '',
    description: fields['项目描述']?.[0]?.text || '',
    status: fields['项目状态']?.[0]?.text || '未开始',
    priority: fields['优先级']?.[0]?.text || '中',
    startDate: fields['开始日期'] || null,
    endDate: fields['结束日期'] || null,
    progress: fields['完成进度'] || 0,
    owner: fields['负责人']?.[0]?.name || '',
    team: fields['团队成员']?.map(member => member.name).join(', ') || '',
    budget: fields['预算'] || 0,
    actualCost: fields['实际成本'] || 0,
    tags: fields['标签']?.map(tag => tag.text).join(', ') || '',
    createdTime: feishuRecord.created_time,
    lastModifiedTime: feishuRecord.last_modified_time
  };
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
    const { page_size, page_token, view_id } = req.query;
    
    const tableData = await getTableRecords({
      pageSize: page_size ? parseInt(page_size) : 100,
      pageToken: page_token,
      viewId: view_id
    });

    const projects = tableData.items?.map(convertFeishuToProject) || [];

    res.status(200).json({
      success: true,
      data: {
        projects,
        total: tableData.total || 0,
        hasMore: !!tableData.has_more,
        pageToken: tableData.page_token
      }
    });
  } catch (error) {
    console.error('获取项目数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取项目数据失败',
      message: error.message
    });
  }
}

module.exports = handler;
module.exports.default = handler;