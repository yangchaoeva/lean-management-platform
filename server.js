const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();

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
    fileSize: 10 * 1024 * 1024 // 10MB 限制
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