const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs-extra');

// 确保数据库目录存在
const dbDir = path.join(__dirname, '..', 'database');
fs.ensureDirSync(dbDir);

const dbPath = path.join(dbDir, 'lean_management.db');
const db = new sqlite3.Database(dbPath);

console.log('正在初始化数据库...');

// 创建用户表
db.serialize(() => {
  // 用户表
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('创建用户表失败:', err.message);
    } else {
      console.log('用户表创建成功');
    }
  });

  // 文件表
  db.run(`
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_name TEXT NOT NULL,
      filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      description TEXT,
      uploader_id INTEGER NOT NULL,
      upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (uploader_id) REFERENCES users (id)
    )
  `, (err) => {
    if (err) {
      console.error('创建文件表失败:', err.message);
    } else {
      console.log('文件表创建成功');
    }
  });

  // 创建默认管理员账户
  const adminPassword = 'admin123';
  const userPassword = 'user123';
  
  bcrypt.hash(adminPassword, 10, (err, hashedAdminPassword) => {
    if (err) {
      console.error('密码加密失败:', err.message);
      return;
    }
    
    bcrypt.hash(userPassword, 10, (err, hashedUserPassword) => {
      if (err) {
        console.error('密码加密失败:', err.message);
        return;
      }
      
      // 插入管理员账户
      db.run(
        'INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)',
        ['admin', hashedAdminPassword, 'admin'],
        function(err) {
          if (err) {
            console.error('创建管理员账户失败:', err.message);
          } else if (this.changes > 0) {
            console.log('默认管理员账户创建成功');
            console.log('用户名: admin');
            console.log('密码: admin123');
          } else {
            console.log('管理员账户已存在');
          }
        }
      );
      
      // 插入普通用户账户
      db.run(
        'INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)',
        ['user', hashedUserPassword, 'user'],
        function(err) {
          if (err) {
            console.error('创建普通用户账户失败:', err.message);
          } else if (this.changes > 0) {
            console.log('默认普通用户账户创建成功');
            console.log('用户名: user');
            console.log('密码: user123');
          } else {
            console.log('普通用户账户已存在');
          }
          
          // 关闭数据库连接
          db.close((err) => {
            if (err) {
              console.error('关闭数据库连接失败:', err.message);
            } else {
              console.log('数据库初始化完成！');
              console.log('\n=== 登录信息 ===');
              console.log('管理员 - 用户名: admin, 密码: admin123');
              console.log('普通用户 - 用户名: user, 密码: user123');
              console.log('================');
            }
          });
        }
      );
    });
  });
});