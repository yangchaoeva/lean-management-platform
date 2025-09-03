# Vercel 部署指南

## 概述

本项目已配置为支持 Vercel 部署，包含前端静态文件和后端 API 路由。部署后将提供完整的飞书数据仪表盘功能。

## 部署步骤

### 1. 准备工作

确保你有以下信息：
- 飞书应用的 APP_ID
- 飞书应用的 APP_SECRET  
- 飞书多维表格的 APP_TOKEN
- 飞书表格的 TABLE_ID

### 2. 部署到 Vercel

#### 方法一：通过 Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录 Vercel
vercel login

# 在项目目录中部署
vercel
```

#### 方法二：通过 GitHub 集成

1. 将代码推送到 GitHub 仓库
2. 在 Vercel 控制台中连接 GitHub 仓库
3. 选择项目并点击部署

### 3. 配置环境变量

在 Vercel 项目设置中添加以下环境变量：

| 变量名 | 描述 | 示例值 |
|--------|------|--------|
| `FEISHU_APP_ID` | 飞书应用ID | `cli_a83d1e5dde2f900c` |
| `FEISHU_APP_SECRET` | 飞书应用密钥 | `PaWtVQYUTKUpan6tXpBMfgr3b2b788aa` |
| `FEISHU_APP_TOKEN` | 飞书多维表格令牌 | `D6JdbXh1DaemR0sDemMc4JwnnUd` |
| `FEISHU_TABLE_ID` | 飞书表格ID | `tblEHCeAsHQWiEEj` |

#### 设置环境变量的步骤：

1. 登录 [Vercel 控制台](https://vercel.com/dashboard)
2. 选择你的项目
3. 进入 "Settings" 标签页
4. 点击 "Environment Variables"
5. 添加上述四个环境变量
6. 重新部署项目

### 4. 验证部署

部署完成后，访问以下端点验证功能：

- **主页**: `https://your-project.vercel.app/`
- **API测试**: `https://your-project.vercel.app/api/feishu/test`
- **项目数据**: `https://your-project.vercel.app/api/feishu/projects`
- **字段信息**: `https://your-project.vercel.app/api/feishu/fields`

## 项目结构

```
.
├── api/                    # Vercel API 路由
│   └── feishu/
│       ├── test.js         # API连接测试
│       ├── projects.js     # 项目数据获取
│       └── fields.js       # 字段信息获取
├── vercel.json             # Vercel配置文件
├── config.js               # 前端配置（自动检测环境）
├── feishu-dashboard.html   # 主仪表盘页面
└── test-api.html          # API测试页面
```

## 功能特性

### 前端功能
- 📊 实时数据仪表盘
- 📱 响应式设计
- 🔄 自动刷新数据
- 📈 项目进度可视化
- 🎨 现代化UI界面

### 后端API
- 🔐 飞书API集成
- ⚡ 访问令牌自动管理
- 🌐 CORS支持
- 📝 完整的错误处理
- 🚀 Serverless架构

## 环境配置

### 开发环境
- API地址：`http://localhost:3000/api`
- 前端服务：`http://localhost:8000`

### 生产环境（Vercel）
- API地址：`https://your-project.vercel.app/api`
- 前端页面：`https://your-project.vercel.app`

## 故障排除

### 常见问题

1. **API返回401错误**
   - 检查飞书应用凭证是否正确
   - 确认环境变量已正确设置

2. **API返回400错误**
   - 检查飞书表格ID和应用令牌
   - 确认应用有访问表格的权限

3. **前端无法加载数据**
   - 检查浏览器控制台错误
   - 确认API地址配置正确

### 调试方法

1. 访问 `/api/feishu/test` 检查API连接
2. 查看 Vercel 函数日志
3. 使用浏览器开发者工具检查网络请求

## 安全注意事项

- ✅ 所有敏感信息通过环境变量配置
- ✅ API密钥不会暴露在前端代码中
- ✅ 支持CORS但限制了请求方法
- ✅ 访问令牌自动缓存和刷新

## 更新部署

当代码有更新时：

1. **自动部署**：推送到连接的GitHub分支会自动触发部署
2. **手动部署**：在项目目录运行 `vercel --prod`

## 支持

如果遇到问题，请检查：
1. Vercel部署日志
2. 浏览器控制台错误
3. 飞书应用权限设置
4. 环境变量配置