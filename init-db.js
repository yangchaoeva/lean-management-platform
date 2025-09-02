const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// 确保uploads目录存在
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('创建uploads目录');
}

// 创建数据库连接
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('开始初始化数据库...');

// 创建用户表
db.serialize(() => {
    // 创建用户表
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('创建用户表失败:', err);
        } else {
            console.log('用户表创建成功');
        }
    });

    // 创建文件表
    db.run(`CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        original_name TEXT NOT NULL,
        filename TEXT NOT NULL,
        size INTEGER NOT NULL,
        mimetype TEXT NOT NULL,
        description TEXT,
        upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        uploaded_by INTEGER,
        FOREIGN KEY (uploaded_by) REFERENCES users (id)
    )`, (err) => {
        if (err) {
            console.error('创建文件表失败:', err);
        } else {
            console.log('文件表创建成功');
        }
    });

    // 创建默认管理员账户
    const adminPassword = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)`, 
        ['admin', adminPassword, 'admin'], (err) => {
        if (err) {
            console.error('创建管理员账户失败:', err);
        } else {
            console.log('管理员账户创建成功 (用户名: admin, 密码: admin123)');
        }
    });

    // 创建默认普通用户账户
    const userPassword = bcrypt.hashSync('user123', 10);
    db.run(`INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)`, 
        ['user', userPassword, 'user'], (err) => {
        if (err) {
            console.error('创建普通用户账户失败:', err);
        } else {
            console.log('普通用户账户创建成功 (用户名: user, 密码: user123)');
        }
    });
});

// 关闭数据库连接
db.close((err) => {
    if (err) {
        console.error('关闭数据库连接失败:', err);
    } else {
        console.log('数据库初始化完成！');
        console.log('\n默认账户信息:');
        console.log('管理员 - 用户名: admin, 密码: admin123');
        console.log('普通用户 - 用户名: user, 密码: user123');
    }
});