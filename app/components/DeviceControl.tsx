'use client'

import { useState } from 'react'
import { Card, Table, Button, Space, Select, Checkbox, Tag, Input, Row, Col, Statistic, Progress } from 'antd'
import {
  PoweroffOutlined,
  ThunderboltOutlined,
  SearchOutlined,
  ReloadOutlined,
  SettingOutlined
} from '@ant-design/icons'
import { useStore } from '../store/useStore'

const { Option } = Select
const { Search } = Input

export default function DeviceControl() {
  const { devices, buildings, controlDevice, batchControlDevices, fetchDevices } = useStore()
  const [selectedDevices, setSelectedDevices] = useState<string[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterBuilding, setFilterBuilding] = useState<string>('all')
  const [searchText, setSearchText] = useState('')

  const handleSingleControl = async (deviceId: string, command: string) => {
    await controlDevice(deviceId, command)
  }

  const handleBatchControl = async (command: string) => {
    if (selectedDevices.length > 0) {
      await batchControlDevices(selectedDevices, command)
      setSelectedDevices([])
    }
  }

  const filteredDevices = devices.filter(device => {
    const matchesStatus = filterStatus === 'all' || device.status === filterStatus
    const matchesBuilding = filterBuilding === 'all' || 
      device.room?.floor?.building?.id === filterBuilding
    const matchesSearch = !searchText || 
      device.name.toLowerCase().includes(searchText.toLowerCase()) ||
      device.room?.name.toLowerCase().includes(searchText.toLowerCase())

    return matchesStatus && matchesBuilding && matchesSearch
  })

  const columns = [
    {
      title: 'Device',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: any, b: any) => a.name.localeCompare(b.name)
    },
    {
      title: 'Location',
      key: 'location',
      render: (record: any) => (
        <div className="text-sm">
          <div>{record.room?.floor?.building?.name}</div>
          <div className="text-gray-500">
            {record.room?.floor?.name} - {record.room?.name}
          </div>
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={
          status === 'ONLINE' ? 'green' : 
          status === 'ERROR' ? 'red' : 
          'default'
        }>
          {status}
        </Tag>
      ),
      filters: [
        { text: 'Online', value: 'ONLINE' },
        { text: 'Offline', value: 'OFFLINE' },
        { text: 'Error', value: 'ERROR' }
      ],
      onFilter: (value: any, record: any) => record.status === value
    },
    {
      title: 'Power State',
      key: 'powerState',
      render: (record: any) => (
        <Tag color={record.isOn ? 'green' : 'default'}>
          {record.isOn ? 'ON' : 'OFF'}
        </Tag>
      )
    },
    {
      title: 'Current Power',
      dataIndex: 'currentPower',
      key: 'power',
      render: (power: number, record: any) => (
        <div className="flex items-center gap-1">
          <ThunderboltOutlined style={{ color: record.isOn ? '#faad14' : '#ccc' }} />
          {power?.toFixed(1) || 0} W
        </div>
      ),
      sorter: (a: any, b: any) => (a.currentPower || 0) - (b.currentPower || 0)
    },
    {
      title: 'Temperature',
      dataIndex: 'temperature',
      key: 'temperature',
      render: (temp: number) => (
        <span style={{ color: temp > 60 ? '#ff4d4f' : '#000' }}>
          {temp?.toFixed(1) || 0}°C
        </span>
      )
    },
    {
      title: 'Energy Total',
      dataIndex: 'energyTotal',
      key: 'energy',
      render: (energy: number) => `${energy?.toFixed(2) || 0} kWh`
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: any) => (
        <Space size="small">
          <Button 
            size="small"
            type={record.isOn ? "default" : "primary"}
            icon={<PoweroffOutlined />}
            onClick={() => handleSingleControl(record.id, record.isOn ? 'off' : 'on')}
            disabled={record.status !== 'ONLINE'}
          >
            {record.isOn ? 'OFF' : 'ON'}
          </Button>
          <Button 
            size="small"
            icon={<SettingOutlined />}
            onClick={() => handleSingleControl(record.id, 'toggle')}
            disabled={record.status !== 'ONLINE'}
          >
            Toggle
          </Button>
        </Space>
      )
    }
  ]

  const rowSelection = {
    selectedRowKeys: selectedDevices,
    onChange: (selectedRowKeys: any[]) => {
      setSelectedDevices(selectedRowKeys)
    },
    getCheckboxProps: (record: any) => ({
      disabled: record.status !== 'ONLINE'
    })
  }

  const onlineDevices = filteredDevices.filter(d => d.status === 'ONLINE')
  const activeDevices = filteredDevices.filter(d => d.isOn)
  const totalPower = filteredDevices.reduce((sum, d) => sum + (d.currentPower || 0), 0)

  return (
    <div className="space-y-4">
      {/* Statistics */}
      <Row gutter={16}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Online Devices"
              value={onlineDevices.length}
              suffix={`/ ${filteredDevices.length}`}
              valueStyle={{ color: '#52c41a' }}
            />
            <Progress 
              percent={Math.round((onlineDevices.length / filteredDevices.length) * 100)} 
              strokeColor="#52c41a"
              showInfo={false}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Active Devices"
              value={activeDevices.length}
              suffix={`/ ${onlineDevices.length}`}
              valueStyle={{ color: '#1890ff' }}
            />
            <Progress 
              percent={Math.round((activeDevices.length / onlineDevices.length) * 100)} 
              strokeColor="#1890ff"
              showInfo={false}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Power Consumption"
              value={totalPower.toFixed(1)}
              suffix="W"
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Controls */}
      <Card>
        <Row gutter={16} align="middle" className="mb-4">
          <Col xs={24} sm={12} md={6}>
            <Search
              placeholder="Search devices..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              value={filterStatus}
              onChange={setFilterStatus}
              style={{ width: '100%' }}
            >
              <Option value="all">All Status</Option>
              <Option value="ONLINE">Online</Option>
              <Option value="OFFLINE">Offline</Option>
              <Option value="ERROR">Error</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              value={filterBuilding}
              onChange={setFilterBuilding}
              style={{ width: '100%' }}
            >
              <Option value="all">All Buildings</Option>
              {buildings.map(building => (
                <Option key={building.id} value={building.id}>
                  {building.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space>
              <Button 
                type="primary" 
                icon={<PoweroffOutlined />}
                onClick={() => handleBatchControl('on')}
                disabled={selectedDevices.length === 0}
              >
                Turn On Selected
              </Button>
              <Button 
                icon={<PoweroffOutlined />}
                onClick={() => handleBatchControl('off')}
                disabled={selectedDevices.length === 0}
              >
                Turn Off Selected
              </Button>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchDevices}
            >
              Refresh
            </Button>
          </Col>
        </Row>

        <div className="mb-4">
          {selectedDevices.length > 0 && (
            <div className="bg-blue-50 p-2 rounded text-sm">
              Selected {selectedDevices.length} device(s)
            </div>
          )}
        </div>

        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={filteredDevices}
          rowKey="id"
          pagination={{ 
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`
          }}
          scroll={{ x: 1200 }}
          size="small"
        />
      </Card>
    </div>
  )
}