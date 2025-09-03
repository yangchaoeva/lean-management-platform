const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const feishuApi = require('./feishu-api');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'lean-management-secret-key';

// 确保必要的目录存在
const uploadsDir = path.join(__dirname, 'uploads');
const dbDir = path.join(__dirname, 'database');
fs.ensureDirSync(uploadsDir);
fs.ensureDirSync(dbDir);

// 数据库连接
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'));

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.'));
app.use('/uploads', express.static(uploadsDir));

// 路由配置
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/feishu-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'feishu-dashboard.html'));
});

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB 限制
  },
  fileFilter: (req, file, cb) => {
    // 允许的文件类型
    const allowedTypes = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|md|zip|rar)$/i;
    if (allowedTypes.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  }
});

// JWT 验证中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '访问令牌缺失' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: '无效的访问令牌' });
    }
    req.user = user;
    next();
  });
};

// 管理员权限验证中间件
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
};

// 路由

// 用户登录
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: '数据库错误' });
    }
    
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  });
});

// 获取文件列表（所有用户都可以查看）
app.get('/api/files', (req, res) => {
  db.all('SELECT * FROM files ORDER BY upload_time DESC', (err, files) => {
    if (err) {
      return res.status(500).json({ error: '数据库错误' });
    }
    res.json(files);
  });
});

// 文件上传（仅管理员）
app.post('/api/files/upload', authenticateToken, requireAdmin, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '没有文件被上传' });
  }
  
  const { originalname, filename, size } = req.file;
  const { description } = req.body;
  
  db.run(
    'INSERT INTO files (original_name, filename, size, mimetype, description, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)',
    [originalname, filename, size, req.file.mimetype, description || '', req.user.id],
    function(err) {
      if (err) {
        console.error('文件上传数据库错误:', err.message);
        console.error('SQL错误详情:', err);
        return res.status(500).json({ error: '数据库错误: ' + err.message });
      }
      
      res.json({
        id: this.lastID,
        original_name: originalname,
        filename: filename,
        size: size,
        mimetype: req.file.mimetype,
        description: description || '',
        upload_time: new Date().toISOString()
      });
    }
  );
});

// 文件下载（所有用户都可以下载）
app.get('/api/files/download/:id', (req, res) => {
  const fileId = req.params.id;
  
  db.get('SELECT * FROM files WHERE id = ?', [fileId], (err, file) => {
    if (err) {
      return res.status(500).json({ error: '数据库错误' });
    }
    
    if (!file) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    const filePath = path.join(__dirname, 'uploads', file.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    res.download(filePath, file.original_name);
  });
});

// 文件删除（仅管理员）
app.delete('/api/files/:id', authenticateToken, requireAdmin, (req, res) => {
  const fileId = req.params.id;
  
  db.get('SELECT * FROM files WHERE id = ?', [fileId], (err, file) => {
    if (err) {
      return res.status(500).json({ error: '数据库错误' });
    }
    
    if (!file) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    // 删除物理文件
    const filePath = path.join(__dirname, 'uploads', file.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // 删除数据库记录
    db.run('DELETE FROM files WHERE id = ?', [fileId], (err) => {
      if (err) {
        return res.status(500).json({ error: '数据库错误' });
      }
      
      res.json({ message: '文件删除成功' });
    });
  });
});

// 获取用户信息
app.get('/api/user', authenticateToken, (req, res) => {
  res.json({
    id: req.user.id,
    username: req.user.username,
    role: req.user.role
  });
});

// 提案相关API
// 获取提案统计数据
app.get('/api/proposals/stats', (req, res) => {
  const statsQuery = `
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'ongoing' THEN 1 ELSE 0 END) as ongoing,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
    FROM proposals
  `;
  
  db.get(statsQuery, (err, row) => {
    if (err) {
      console.error('获取提案统计失败:', err);
      res.status(500).json({ error: '获取统计数据失败' });
    } else {
      res.json({
        total: row.total || 0,
        completed: row.completed || 0,
        ongoing: row.ongoing || 0,
        pending: row.pending || 0
      });
    }
  });
});

// 获取按部门分类的提案数据
app.get('/api/proposals/by-department', (req, res) => {
  const departmentQuery = `
    SELECT department, COUNT(*) as count
    FROM proposals
    GROUP BY department
    ORDER BY count DESC
  `;
  
  db.all(departmentQuery, (err, rows) => {
    if (err) {
      console.error('获取部门分类失败:', err);
      res.status(500).json({ error: '获取部门分类数据失败' });
    } else {
      res.json(rows);
    }
  });
});

// 获取按月份分类的提案数据
app.get('/api/proposals/by-month', (req, res) => {
  const monthQuery = `
    SELECT 
      strftime('%Y-%m', created_at) as month,
      COUNT(*) as count
    FROM proposals
    GROUP BY strftime('%Y-%m', created_at)
    ORDER BY month DESC
    LIMIT 12
  `;
  
  db.all(monthQuery, (err, rows) => {
    if (err) {
      console.error('获取月份分类失败:', err);
      res.status(500).json({ error: '获取月份分类数据失败' });
    } else {
      res.json(rows);
    }
  });
});

// 获取重点提案
app.get('/api/proposals/featured', (req, res) => {
  const featuredQuery = `
    SELECT *
    FROM proposals
    WHERE priority IN ('high', 'urgent') OR expected_value > 1000000
    ORDER BY 
      CASE priority 
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        ELSE 3
      END,
      expected_value DESC
    LIMIT 10
  `;
  
  db.all(featuredQuery, (err, rows) => {
    if (err) {
      console.error('获取重点提案失败:', err);
      res.status(500).json({ error: '获取重点提案数据失败' });
    } else {
      res.json(rows);
    }
  });
});

// 飞书多维表格API路由

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

// 创建新项目
app.post('/api/feishu/projects', authenticateToken, async (req, res) => {
  try {
    const projectData = req.body;
    
    // 转换数据格式
    const feishuFields = feishuApi.convertProjectToFeishu(projectData);
    
    const result = await feishuApi.createTableRecord(feishuFields);
    
    // 转换回前端格式
    const project = feishuApi.convertFeishuToProject(result);
    
    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('创建飞书项目失败:', error.message);
    res.status(500).json({ 
      success: false, 
      error: '创建项目失败',
      message: error.message 
    });
  }
});

// 更新项目
app.put('/api/feishu/projects/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const projectData = req.body;
    
    // 转换数据格式
    const feishuFields = feishuApi.convertProjectToFeishu(projectData);
    
    const result = await feishuApi.updateTableRecord(id, feishuFields);
    
    // 转换回前端格式
    const project = feishuApi.convertFeishuToProject(result);
    
    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('更新飞书项目失败:', error.message);
    res.status(500).json({ 
      success: false, 
      error: '更新项目失败',
      message: error.message 
    });
  }
});

// 删除项目
app.delete('/api/feishu/projects/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await feishuApi.deleteTableRecord(id);
    
    res.json({
      success: true,
      message: '项目删除成功'
    });
  } catch (error) {
    console.error('删除飞书项目失败:', error.message);
    res.status(500).json({ 
      success: false, 
      error: '删除项目失败',
      message: error.message 
    });
  }
});

// 获取表格字段信息
app.get('/api/feishu/fields', async (req, res) => {
  try {
    const fields = await feishuApi.getTableFields();
    
    res.json({
      success: true,
      data: fields
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

// 错误处理中间件
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '文件大小超过限制（最大10MB）' });
    }
  }
  
  res.status(500).json({ error: error.message || '服务器内部错误' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log('精益管理平台文件管理系统已启动');
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n正在关闭服务器...');
  db.close((err) => {
    if (err) {
      console.error('关闭数据库连接时出错:', err.message);
    } else {
      console.log('数据库连接已关闭');
    }
    process.exit(0);
  });
});