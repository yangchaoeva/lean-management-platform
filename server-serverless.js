const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');
const feishuApi = require('./feishu-api');

const app = express();

// 中间件配置
app.use(cors({
  origin: '*', // 允许所有来源访问，生产环境应该限制为特定域名
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 飞书API路由

// 获取项目列表
app.get('/api/feishu/projects', async (req, res) => {
  try {
    const { page_size = 100, page_token = '', view_id = '' } = req.query;
    
    const result = await feishuApi.getTableRecords({
      page_size: parseInt(page_size),
      page_token,
      view_id
    });
    
    // 转换数据格式
    const projects = result.records.map(record => feishuApi.convertFeishuToProject(record));
    
    res.json({
      success: true,
      data: {
        projects,
        has_more: result.has_more,
        page_token: result.page_token,
        total: result.total
      }
    });
  } catch (error) {
    console.error('获取飞书项目列表失败:', error.message);
    res.status(500).json({ 
      success: false, 
      error: '获取项目列表失败',
      message: error.message 
    });
  }
});

// 获取表格字段
app.get('/api/feishu/fields', async (req, res) => {
  try {
    const fields = await feishuApi.getTableFields();
    
    res.json({
      success: true,
      data: {
        fields
      }
    });
  } catch (error) {
    console.error('获取飞书表格字段失败:', error.message);
    res.status(500).json({ 
      success: false, 
      error: '获取表格字段失败',
      message: error.message 
    });
  }
});

// 测试飞书连接
app.get('/api/feishu/test', async (req, res) => {
  try {
    const token = await feishuApi.getTenantAccessToken();
    
    res.json({
      success: true,
      message: '飞书API连接正常',
      data: {
        hasToken: !!token,
        tokenLength: token ? token.length : 0
      }
    });
  } catch (error) {
    console.error('飞书API连接测试失败:', error.message);
    res.status(500).json({ 
      success: false, 
      error: '飞书API连接失败',
      message: error.message 
    });
  }
});

// 将Express应用包装为Serverless函数
module.exports.handler = serverless(app);