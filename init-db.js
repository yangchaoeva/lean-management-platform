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

    // 创建提案表
    db.run(`CREATE TABLE IF NOT EXISTS proposals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        department TEXT NOT NULL,
        proposer TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        priority TEXT NOT NULL DEFAULT 'normal',
        expected_value REAL DEFAULT 0,
        implementation_period TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER,
        FOREIGN KEY (created_by) REFERENCES users (id)
    )`, (err) => {
        if (err) {
            console.error('创建提案表失败:', err);
        } else {
            console.log('提案表创建成功');
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

    // 插入示例提案数据
    const sampleProposals = [
        {
            title: '生产线自动化改造提案',
            description: '通过引入自动化设备，提高生产效率，降低人工成本',
            department: '生产部',
            proposer: '张三',
            status: 'completed',
            priority: 'high',
            expected_value: 5000000,
            implementation_period: '6个月',
            created_at: '2024-01-15 10:30:00'
        },
        {
            title: '质量检测流程优化',
            description: '优化质量检测流程，减少检测时间，提高检测准确性',
            department: '质量部',
            proposer: '李四',
            status: 'ongoing',
            priority: 'urgent',
            expected_value: 1200000,
            implementation_period: '3个月',
            created_at: '2024-02-10 14:20:00'
        },
        {
            title: '设备维护智能化管理',
            description: '建立设备维护智能化管理系统，预防性维护',
            department: '技术部',
            proposer: '王五',
            status: 'ongoing',
            priority: 'high',
            expected_value: 2000000,
            implementation_period: '4个月',
            created_at: '2024-02-20 09:15:00'
        },
        {
            title: '员工培训体系完善',
            description: '建立完善的员工培训体系，提升员工技能水平',
            department: '管理部',
            proposer: '赵六',
            status: 'pending',
            priority: 'normal',
            expected_value: 500000,
            implementation_period: '3个月',
            created_at: '2024-03-05 16:45:00'
        },
        {
            title: '能源消耗优化方案',
            description: '通过技术改造和管理优化，降低能源消耗',
            department: '生产部',
            proposer: '孙七',
            status: 'completed',
            priority: 'normal',
            expected_value: 800000,
            implementation_period: '2个月',
            created_at: '2024-01-25 11:30:00'
        }
    ];

    // 插入示例提案数据
    sampleProposals.forEach((proposal, index) => {
        db.run(`INSERT OR IGNORE INTO proposals (
            title, description, department, proposer, status, priority, 
            expected_value, implementation_period, created_at, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
        [
            proposal.title, proposal.description, proposal.department, 
            proposal.proposer, proposal.status, proposal.priority,
            proposal.expected_value, proposal.implementation_period, 
            proposal.created_at, 1
        ], (err) => {
            if (err) {
                console.error(`插入示例提案 ${index + 1} 失败:`, err);
            } else {
                console.log(`示例提案 "${proposal.title}" 创建成功`);
            }
        });
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