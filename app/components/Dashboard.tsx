'use client'

import { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, Progress, Table, Tag, Space } from 'antd'
import {
  ThunderboltOutlined,
  HomeOutlined,
  AlertOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FireOutlined
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { useStore } from '../store/useStore'

export default function Dashboard() {
  const { buildings, devices, connectSocket, disconnectSocket } = useStore()
  const [powerHistory, setPowerHistory] = useState<any[]>([])

  useEffect(() => {
    connectSocket()
    
    // Simulate power history data
    const interval = setInterval(() => {
      const totalPower = devices.reduce((sum, d) => sum + (d.isOn ? d.currentPower : 0), 0)
      setPowerHistory(prev => [...prev.slice(-59), {
        time: new Date().toLocaleTimeString(),
        value: totalPower
      }])
    }, 1000)

    return () => {
      clearInterval(interval)
      disconnectSocket()
    }
  }, [devices, connectSocket, disconnectSocket])

  const onlineDevices = devices.filter(d => d.status === 'ONLINE')
  const activeDevices = devices.filter(d => d.isOn)
  const totalPower = devices.reduce((sum, d) => sum + (d.currentPower || 0), 0)
  const totalEnergy = devices.reduce((sum, d) => sum + (d.energyTotal || 0), 0)

  const chartOption = {
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: powerHistory.map(h => h.time),
      boundaryGap: false
    },
    yAxis: {
      type: 'value',
      name: 'Power (W)'
    },
    series: [{
      data: powerHistory.map(h => h.value),
      type: 'line',
      smooth: true,
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [{
            offset: 0, color: 'rgba(24, 144, 255, 0.8)'
          }, {
            offset: 1, color: 'rgba(24, 144, 255, 0.1)'
          }]
        }
      },
      lineStyle: {
        color: '#1890ff',
        width: 2
      }
    }]
  }

  const roomTypeDistribution = {
    tooltip: {
      trigger: 'item'
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 10,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: {
        show: true,
        position: 'outside'
      },
      data: [
        { value: devices.filter(d => d.room?.type === 'bedroom').length, name: 'Bedroom' },
        { value: devices.filter(d => d.room?.type === 'bathroom').length, name: 'Bathroom' },
        { value: devices.filter(d => d.room?.type === 'kitchen').length, name: 'Kitchen' },
        { value: devices.filter(d => d.room?.type === 'common').length, name: 'Common' },
        { value: devices.filter(d => d.room?.type === 'hallway').length, name: 'Hallway' }
      ]
    }]
  }

  const columns = [
    {
      title: 'Device',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: any) => (
        <Space>
          {record.isOn ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#999' }} />}
          {text}
        </Space>
      )
    },
    {
      title: 'Room',
      dataIndex: ['room', 'name'],
      key: 'room',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'ONLINE' ? 'green' : status === 'ERROR' ? 'red' : 'default'}>
          {status}
        </Tag>
      )
    },
    {
      title: 'Power (W)',
      dataIndex: 'currentPower',
      key: 'power',
      render: (power: number) => `${power.toFixed(1)} W`,
      sorter: (a: any, b: any) => a.currentPower - b.currentPower
    },
    {
      title: 'Temperature (°C)',
      dataIndex: 'temperature',
      key: 'temperature',
      render: (temp: number) => (
        <span style={{ color: temp > 60 ? '#ff4d4f' : '#000' }}>
          {temp > 60 && <FireOutlined />} {temp.toFixed(1)}°C
        </span>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Buildings"
              value={buildings.length}
              prefix={<HomeOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Devices"
              value={activeDevices.length}
              suffix={`/ ${devices.length}`}
              valueStyle={{ color: '#52c41a' }}
            />
            <Progress 
              percent={Math.round((activeDevices.length / devices.length) * 100)} 
              strokeColor="#52c41a"
              showInfo={false}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Current Power"
              value={totalPower.toFixed(1)}
              suffix="W"
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Energy"
              value={totalEnergy.toFixed(2)}
              suffix="kWh"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="Real-time Power Consumption">
            <ReactECharts option={chartOption} style={{ height: '300px' }} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Room Type Distribution">
            <ReactECharts option={roomTypeDistribution} style={{ height: '300px' }} />
          </Card>
        </Col>
      </Row>

      <Card title="Device Status">
        <Table
          columns={columns}
          dataSource={devices}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Card>
    </div>
  )
}