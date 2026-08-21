import React from 'react'
import { Layout, Menu } from 'antd'
import {
  DashboardOutlined,
  ProfileOutlined,
  ExperimentOutlined,
  ThunderboltOutlined,
  RobotOutlined,
  DatabaseOutlined,
  BellOutlined,
  AppstoreOutlined,
  SlidersOutlined,
  PieChartOutlined,
} from '@ant-design/icons'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'

import DashboardPage from './pages/DashboardPage'
import StrategiesPage from './pages/StrategiesPage'
import StrategyBuilderPage from './pages/StrategyBuilderPage'
import BacktestsPage from './pages/BacktestsPage'
import LiveTradingPage from './pages/LiveTradingPage'
import AiStrategyPage from './pages/AiStrategyPage'
import DataManagementPage from './pages/DataManagementPage'
import NotificationsPage from './pages/NotificationsPage'
import StrategyTemplatesPage from './pages/StrategyTemplatesPage'
import OptimizerPage from './pages/OptimizerPage'
import PortfolioPage from './pages/PortfolioPage'

const { Header, Sider, Content } = Layout

const AppLayout: React.FC = () => {
  const location = useLocation()
  const selectedKey = React.useMemo(() => {
    if (location.pathname.startsWith('/strategies')) return 'strategies'
    if (location.pathname.startsWith('/templates')) return 'templates'
    if (location.pathname.startsWith('/optimizer')) return 'optimizer'
    if (location.pathname.startsWith('/portfolio')) return 'portfolio'
    if (location.pathname.startsWith('/backtests')) return 'backtests'
    if (location.pathname.startsWith('/live')) return 'live'
    if (location.pathname.startsWith('/ai')) return 'ai'
    if (location.pathname.startsWith('/data')) return 'data'
    if (location.pathname.startsWith('/notifications')) return 'notifications'
    return 'dashboard'
  }, [location.pathname])

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="0">
        <div className="logo">OKX Quant</div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={[
            {
              key: 'dashboard',
              icon: <DashboardOutlined />,
              label: <Link to="/dashboard">仪表盘</Link>,
            },
            {
              key: 'strategies',
              icon: <ProfileOutlined />,
              label: <Link to="/strategies">策略管理</Link>,
            },
            {
              key: 'templates',
              icon: <AppstoreOutlined />,
              label: <Link to="/templates">策略模版库</Link>,
            },
            {
              key: 'backtests',
              icon: <ExperimentOutlined />,
              label: <Link to="/backtests">策略回测</Link>,
            },
            {
              key: 'optimizer',
              icon: <SlidersOutlined />,
              label: <Link to="/optimizer">参数网格寻优</Link>,
            },
            {
              key: 'portfolio',
              icon: <PieChartOutlined />,
              label: <Link to="/portfolio">投资组合回测</Link>,
            },
            {
              key: 'live',
              icon: <ThunderboltOutlined />,
              label: <Link to="/live">实盘执行</Link>,
            },
            {
              key: 'ai',
              icon: <RobotOutlined />,
              label: <Link to="/ai">AI 策略</Link>,
            },
            {
              key: 'data',
              icon: <DatabaseOutlined />,
              label: <Link to="/data">数据管理</Link>,
            },
            {
              key: 'notifications',
              icon: <BellOutlined />,
              label: <Link to="/notifications">消息通知</Link>,
            },
          ]}
        />
      </Sider>
      <Layout>
        <Header className="header">
          <div className="header-title">OKX 量化交易终端</div>
        </Header>
        <Content className="content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/strategies" element={<StrategiesPage />} />
            <Route path="/strategies/builder" element={<StrategyBuilderPage />} />
            <Route path="/templates" element={<StrategyTemplatesPage />} />
            <Route path="/backtests" element={<BacktestsPage />} />
            <Route path="/optimizer" element={<OptimizerPage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/live" element={<LiveTradingPage />} />
            <Route path="/ai" element={<AiStrategyPage />} />
            <Route path="/data" element={<DataManagementPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}

const App: React.FC = () => {
  return <AppLayout />
}

export default App

