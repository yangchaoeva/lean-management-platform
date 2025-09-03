const axios = require('axios');

// 飞书API配置
const FEISHU_CONFIG = {
  APP_ID: 'cli_a83d1e5dde2f900c',
  APP_SECRET: 'PaWtVQYUTKUpan6tXpBMfgr3b2b788aa',
  APP_TOKEN: 'D6JdbXh1DaemR0sDemMc4JwnnUd',
  TABLE_ID: 'tblEHCeAsHQWiEEj',
  BASE_URL: 'https://open.feishu.cn/open-apis'
};

// 缓存访问令牌
let cachedAccessToken = null;
let tokenExpireTime = 0;

/**
 * 获取租户访问令牌
 * @returns {Promise<string>} 访问令牌
 */
async function getTenantAccessToken() {
  // 检查缓存的令牌是否有效
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
      // 设置过期时间（提前5分钟过期以确保安全）
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
 * 获取多维表格记录
 * @param {Object} options 查询选项
 * @returns {Promise<Array>} 记录列表
 */
async function getTableRecords(options = {}) {
  try {
    const accessToken = await getTenantAccessToken();
    const { page_size = 100, page_token = '', view_id = '' } = options;
    
    const params = {
      page_size,
      ...(page_token && { page_token }),
      ...(view_id && { view_id })
    };

    const response = await axios.get(
      `${FEISHU_CONFIG.BASE_URL}/bitable/v1/apps/${FEISHU_CONFIG.APP_TOKEN}/tables/${FEISHU_CONFIG.TABLE_ID}/records`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        params
      }
    );

    if (response.data.code === 0) {
      return {
        records: response.data.data.items || [],
        has_more: response.data.data.has_more || false,
        page_token: response.data.data.page_token || '',
        total: response.data.data.total || 0
      };
    } else {
      throw new Error(`获取表格记录失败: ${response.data.msg}`);
    }
  } catch (error) {
    console.error('获取飞书表格记录失败:', error.message);
    throw error;
  }
}

/**
 * 创建多维表格记录
 * @param {Object} recordData 记录数据
 * @returns {Promise<Object>} 创建的记录
 */
async function createTableRecord(recordData) {
  try {
    const accessToken = await getTenantAccessToken();
    
    const response = await axios.post(
      `${FEISHU_CONFIG.BASE_URL}/bitable/v1/apps/${FEISHU_CONFIG.APP_TOKEN}/tables/${FEISHU_CONFIG.TABLE_ID}/records`,
      {
        fields: recordData
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.code === 0) {
      return response.data.data.record;
    } else {
      throw new Error(`创建表格记录失败: ${response.data.msg}`);
    }
  } catch (error) {
    console.error('创建飞书表格记录失败:', error.message);
    throw error;
  }
}

/**
 * 更新多维表格记录
 * @param {string} recordId 记录ID
 * @param {Object} recordData 更新的记录数据
 * @returns {Promise<Object>} 更新后的记录
 */
async function updateTableRecord(recordId, recordData) {
  try {
    const accessToken = await getTenantAccessToken();
    
    const response = await axios.put(
      `${FEISHU_CONFIG.BASE_URL}/bitable/v1/apps/${FEISHU_CONFIG.APP_TOKEN}/tables/${FEISHU_CONFIG.TABLE_ID}/records/${recordId}`,
      {
        fields: recordData
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.code === 0) {
      return response.data.data.record;
    } else {
      throw new Error(`更新表格记录失败: ${response.data.msg}`);
    }
  } catch (error) {
    console.error('更新飞书表格记录失败:', error.message);
    throw error;
  }
}

/**
 * 删除多维表格记录
 * @param {string} recordId 记录ID
 * @returns {Promise<boolean>} 删除是否成功
 */
async function deleteTableRecord(recordId) {
  try {
    const accessToken = await getTenantAccessToken();
    
    const response = await axios.delete(
      `${FEISHU_CONFIG.BASE_URL}/bitable/v1/apps/${FEISHU_CONFIG.APP_TOKEN}/tables/${FEISHU_CONFIG.TABLE_ID}/records/${recordId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.code === 0) {
      return true;
    } else {
      throw new Error(`删除表格记录失败: ${response.data.msg}`);
    }
  } catch (error) {
    console.error('删除飞书表格记录失败:', error.message);
    throw error;
  }
}

/**
 * 获取表格字段信息
 * @returns {Promise<Array>} 字段列表
 */
async function getTableFields() {
  try {
    const accessToken = await getTenantAccessToken();
    
    const response = await axios.get(
      `${FEISHU_CONFIG.BASE_URL}/bitable/v1/apps/${FEISHU_CONFIG.APP_TOKEN}/tables/${FEISHU_CONFIG.TABLE_ID}/fields`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.code === 0) {
      return response.data.data.items || [];
    } else {
      throw new Error(`获取表格字段失败: ${response.data.msg}`);
    }
  } catch (error) {
    console.error('获取飞书表格字段失败:', error.message);
    throw error;
  }
}

/**
 * 转换项目数据格式（从飞书格式转换为前端格式）
 * @param {Object} feishuRecord 飞书记录
 * @returns {Object} 前端项目数据格式
 */
function convertFeishuToProject(feishuRecord) {
  const fields = feishuRecord.fields || {};
  
  return {
    id: feishuRecord.record_id,
    name: fields['项目'] || '',
    description: fields['提案核心内容'] || '',
    status: '进行中', // 根据实际业务逻辑设置
    priority: '中', // 默认优先级
    assignee: fields['个人提案/团队提案'] || '',
    startDate: '',
    endDate: '',
    progress: fields['进行中提案'] || 0,
    type: fields['个人提案/团队提案'] || '',
    department: fields['提案部门'] || '',
    budget: 0,
    actualCost: 0,
    milestones: '',
    riskLevel: '低',
    notes: '',
    totalProposals: fields['提案总数'] || 0,
    completedProposals: fields['已完成提案'] || 0,
    excellentProposals: fields['优秀提案'] || 0,
    createdAt: feishuRecord.created_time,
    updatedAt: feishuRecord.last_modified_time
  };
}

/**
 * 转换项目数据格式（从前端格式转换为飞书格式）
 * @param {Object} projectData 前端项目数据
 * @returns {Object} 飞书记录格式
 */
function convertProjectToFeishu(projectData) {
  const fields = {};
  
  if (projectData.name) fields['项目名称'] = projectData.name;
  if (projectData.description) fields['项目描述'] = projectData.description;
  if (projectData.status) fields['项目状态'] = projectData.status;
  if (projectData.priority) fields['优先级'] = projectData.priority;
  if (projectData.assignee) fields['负责人'] = [{ name: projectData.assignee }];
  if (projectData.startDate) fields['开始日期'] = projectData.startDate;
  if (projectData.endDate) fields['截止日期'] = projectData.endDate;
  if (projectData.progress !== undefined) fields['完成进度'] = projectData.progress;
  if (projectData.type) fields['项目类型'] = projectData.type;
  if (projectData.department) fields['所属部门'] = projectData.department;
  if (projectData.budget !== undefined) fields['预算'] = projectData.budget;
  if (projectData.actualCost !== undefined) fields['实际成本'] = projectData.actualCost;
  if (projectData.milestones) fields['关键里程碑'] = projectData.milestones;
  if (projectData.riskLevel) fields['风险评估'] = projectData.riskLevel;
  if (projectData.notes) fields['备注'] = projectData.notes;
  
  return fields;
}

module.exports = {
  getTenantAccessToken,
  getTableRecords,
  createTableRecord,
  updateTableRecord,
  deleteTableRecord,
  getTableFields,
  convertFeishuToProject,
  convertProjectToFeishu,
  FEISHU_CONFIG
};