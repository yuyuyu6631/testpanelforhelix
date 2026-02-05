import React from 'react';
import { Result, Button } from 'antd';

interface ErrorResultProps {
    title?: string;
    subTitle?: string;
    onRetry?: () => void;
    error?: any;
}

const ErrorResult: React.FC<ErrorResultProps> = ({
    title = "加载失败",
    subTitle = "无法连接到服务器或数据加载异常",
    onRetry,
    error
}) => {
    return (
        <div style={{ padding: '40px 0', background: '#fff', borderRadius: 8 }}>
            <Result
                status="error"
                title={title}
                subTitle={
                    <div>
                        {subTitle}
                        {error && <div style={{ fontSize: 12, color: '#ff4d4f', marginTop: 8 }}>{String(error)}</div>}
                    </div>
                }
                extra={
                    onRetry && (
                        <Button type="primary" onClick={onRetry}>
                            重试
                        </Button>
                    )
                }
            />
        </div>
    );
};

export default ErrorResult;
