import { useState } from 'react';
import { Layout, Menu } from 'antd';
import { DashboardOutlined, DatabaseOutlined, PlayCircleOutlined, SettingOutlined } from '@ant-design/icons';
import CaseManager from './pages/CaseManager';
import Runner from './pages/Runner';
import ConfigPanel from './pages/ConfigPanel';
import './index.css';

const { Header, Content, Sider } = Layout;

function App() {
  const [key, setKey] = useState('runner');
  const [triggerCaseIds, setTriggerCaseIds] = useState<number[]>([]);

  const handleTriggerRun = (ids: number[]) => {
    setTriggerCaseIds(ids);
    setKey('runner');
  };

  const renderContent = () => {
    switch (key) {
      case 'cases': return <CaseManager onTriggerRun={handleTriggerRun} />;
      case 'runner': return (
        <Runner
          initialTriggerIds={triggerCaseIds}
          onTriggerConsumed={() => setTriggerCaseIds([])}
        />
      );
      case 'config': return <ConfigPanel />;
      default: return <Runner />;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible>
        <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)', textAlign: 'center', color: '#fff', lineHeight: '32px', fontWeight: 'bold' }}>
          Helix Test
        </div>
        <Menu
          theme="dark"
          selectedKeys={[key]}
          mode="inline"
          onClick={(e) => setKey(e.key)}
          items={[
            { key: 'runner', icon: <PlayCircleOutlined />, label: '执行控制台 (Runner)' },
            { key: 'cases', icon: <DatabaseOutlined />, label: '用例管理 (Cases)' },
            { key: 'config', icon: <SettingOutlined />, label: '系统设置 (Config)' },
          ]}
        />
      </Sider>
      <Layout className="site-layout">
        <Header style={{ padding: 0, background: '#fff' }} />
        <Content style={{ margin: '16px 16px' }}>
          <div style={{ padding: 24, minHeight: 360, background: '#fff' }}>
            {renderContent()}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
