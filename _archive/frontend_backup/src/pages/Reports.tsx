import React from 'react';
import { Card, Result, Button } from 'antd';
import { PieChartOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

const Reports: React.FC = () => {
    return (
        <Card title="测试报告">
            <Result
                icon={<PieChartOutlined />}
                title="可视化报告即将上线"
                subTitle="高级图表统计与 SQL Diff 对比视图将在下一版本中发布。"
                extra={
                    <Link to="/runner">
                        <Button type="primary">前往执行控制台</Button>
                    </Link>
                }
            />
        </Card>
    );
};

export default Reports;
