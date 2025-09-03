/**
 * 应用配置文件
 * 用于管理不同环境下的API地址和其他配置
 */

// 全局配置
window.APP_CONFIG = {
    // API基础地址 - 自动检测环境
    API_BASE_URL: (() => {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3000/api';
        } else if (hostname.includes('vercel.app')) {
            // Vercel部署环境
            return `https://${hostname}/api`;
        } else {
            // 其他生产环境
            return `https://${hostname}/api`;
        }
    })(),
    
    // 飞书API地址
    FEISHU_API_URL: (() => {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3000/api/feishu';
        } else if (hostname.includes('vercel.app')) {
            // Vercel部署环境
            return `https://${hostname}/api/feishu`;
        } else {
            // 其他生产环境
            return `https://${hostname}/api/feishu`;
        }
    })(),
    
    // 其他配置
    APP_NAME: '精益管理平台',
    VERSION: '1.0.0',
    ENVIRONMENT: window.location.hostname === 'localhost' ? 'development' : 'production'
};