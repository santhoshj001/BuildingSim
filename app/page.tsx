'use client'

import { useState, useEffect } from 'react'
import { ConfigProvider, Layout, Menu, Button, Space, Badge, Statistic, Row, Col } from 'antd'
import {
  DashboardOutlined,
  BuildOutlined,
  ControlOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ThunderboltOutlined
} from '@ant-design/icons'
import Dashboard from './components/Dashboard'
import BuildingView from './components/BuildingView'
import DeviceControl from './components/DeviceControl'
import Settings from './components/Settings'
import { useStore } from './store/useStore'

const { Header, Sider, Content } = Layout

export default function Home() {
  const [collapsed, setCollapsed] = useState(false)
  const [selectedMenu, setSelectedMenu] = useState('dashboard')
  const [simulationRunning, setSimulationRunning] = useState(false)
  const { buildings, devices, fetchBuildings, fetchDevices, startSimulation, stopSimulation } = useStore()

  useEffect(() => {
    fetchBuildings()
    fetchDevices()
  }, [fetchBuildings, fetchDevices])

  const handleSimulationToggle = async () => {
    if (simulationRunning) {
      await stopSimulation()
      setSimulationRunning(false)
    } else {
      if (buildings.length > 0) {
        await startSimulation(buildings[0].id)
        setSimulationRunning(true)
      }
    }
  }

  const renderContent = () => {
    switch (selectedMenu) {
      case 'dashboard':
        return <Dashboard />
      case 'building':
        return <BuildingView />
      case 'control':
        return <DeviceControl />
      case 'settings':
        return <Settings />
      default:
        return <Dashboard />
    }
  }

  const onlineDevices = devices.filter(d => d.status === 'ONLINE').length
  const totalPower = devices.reduce((sum, d) => sum + (d.currentPower || 0), 0)

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
        },
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        <Sider 
          collapsible 
          collapsed={collapsed} 
          onCollapse={setCollapsed}
          theme="dark"
        >
          <div className="p-4 text-white text-center font-bold text-lg">
            {!collapsed && 'AIoT Simulator'}
          </div>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[selectedMenu]}
            onClick={(e) => setSelectedMenu(e.key)}
            items={[
              {
                key: 'dashboard',
                icon: <DashboardOutlined />,
                label: 'Dashboard',
              },
              {
                key: 'building',
                icon: <BuildOutlined />,
                label: 'Building View',
              },
              {
                key: 'control',
                icon: <ControlOutlined />,
                label: 'Device Control',
              },
              {
                key: 'settings',
                icon: <SettingOutlined />,
                label: 'Settings',
              },
            ]}
          />
        </Sider>
        <Layout>
          <Header className="bg-white px-6 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-6">
              <h1 className="text-xl font-semibold">AIoT Building Simulator</h1>
              <Space size="large">
                <Badge status={simulationRunning ? "processing" : "default"} text={simulationRunning ? "Simulation Running" : "Simulation Stopped"} />
                <Button
                  type={simulationRunning ? "default" : "primary"}
                  icon={simulationRunning ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                  onClick={handleSimulationToggle}
                >
                  {simulationRunning ? 'Stop Simulation' : 'Start Simulation'}
                </Button>
              </Space>
            </div>
            <Row gutter={24}>
              <Col>
                <Statistic 
                  title="Online Devices" 
                  value={onlineDevices} 
                  suffix={`/ ${devices.length}`}
                  valueStyle={{ fontSize: '18px' }}
                />
              </Col>
              <Col>
                <Statistic 
                  title="Total Power" 
                  value={totalPower.toFixed(1)} 
                  suffix="W"
                  prefix={<ThunderboltOutlined />}
                  valueStyle={{ fontSize: '18px', color: '#faad14' }}
                />
              </Col>
            </Row>
          </Header>
          <Content className="m-6">
            {renderContent()}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  )
}