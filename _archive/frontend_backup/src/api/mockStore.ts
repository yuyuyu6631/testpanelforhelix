
// Mock data store for the test system (Localized)

export interface TestCase {
    id: string;
    name: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    endpoint: string;
    status: 'passed' | 'failed' | 'running' | 'pending';
    lastRun: string;
}

export interface DashboardStats {
    totalCases: number;
    passRate: number;
    dailyExecutions: number;
    activeIssues: number;
}

export const mockStats: DashboardStats = {
    totalCases: 142,
    passRate: 98.5,
    dailyExecutions: 356,
    activeIssues: 3,
};

export const mockTestCases: TestCase[] = [
    { id: '1', name: '用户登录流程验证', method: 'POST', endpoint: '/api/v1/auth/login', status: 'passed', lastRun: '2 分钟前' },
    { id: '2', name: '获取个人资料', method: 'GET', endpoint: '/api/v1/users/me', status: 'passed', lastRun: '2 分钟前' },
    { id: '3', name: '更新支付方式', method: 'PUT', endpoint: '/api/v1/billing/payment', status: 'failed', lastRun: '1 小时前' },
    { id: '4', name: '注销账户测试', method: 'DELETE', endpoint: '/api/v1/users/123', status: 'pending', lastRun: '从未运行' },
    { id: '5', name: '商品搜索功能', method: 'GET', endpoint: '/api/v1/products/search', status: 'passed', lastRun: '5 分钟前' },
    { id: '6', name: '创建新订单', method: 'POST', endpoint: '/api/v1/orders', status: 'passed', lastRun: '10 分钟前' },
    { id: '7', name: '后台接口鉴权', method: 'GET', endpoint: '/api/admin/stats', status: 'failed', lastRun: '30 分钟前' },
];

export const getMockData = (url: string) => {
    if (url.includes('/stats')) return Promise.resolve(mockStats);
    if (url.includes('/cases')) return Promise.resolve(mockTestCases);
    return Promise.resolve({});
};
