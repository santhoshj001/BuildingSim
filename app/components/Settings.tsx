'use client'

import { useState } from 'react'
import { Card, Form, Input, Button, Space, Modal, Table, message, Tabs, Row, Col, Switch, InputNumber } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { useStore } from '../store/useStore'

const { TextArea } = Input
const { TabPane } = Tabs

export default function Settings() {
  const { buildings, createBuilding, deleteBuilding, fetchBuildings } = useStore()
  const [form] = Form.useForm()
  const [showBuildingModal, setShowBuildingModal] = useState(false)
  const [editingBuilding, setEditingBuilding] = useState<any>(null)

  const handleCreateBuilding = async (values: any) => {
    try {
      await createBuilding(values)
      message.success('Building created successfully')
      form.resetFields()
      setShowBuildingModal(false)
      setEditingBuilding(null)
    } catch (error) {
      message.error('Failed to create building')
    }
  }

  const handleDeleteBuilding = (buildingId: string) => {
    Modal.confirm({
      title: 'Delete Building',
      content: 'Are you sure you want to delete this building? This will remove all associated floors, rooms, and devices.',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await deleteBuilding(buildingId)
          message.success('Building deleted successfully')
        } catch (error) {
          message.error('Failed to delete building')
        }
      }
    })
  }

  const buildingColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'Floors',
      dataIndex: 'floors',
      key: 'floors',
      render: (floors: any[]) => floors.length
    },
    {
      title: 'Total Rooms',
      dataIndex: 'floors',
      key: 'rooms',
      render: (floors: any[]) => floors.reduce((sum, floor) => sum + floor.rooms.length, 0)
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: any) => (
        <Space>
          <Button 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => {
              setEditingBuilding(record)
              setShowBuildingModal(true)
              form.setFieldsValue(record)
            }}
          >
            Edit
          </Button>
          <Button 
            size="small" 
            danger 
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteBuilding(record.id)}
          >
            Delete
          </Button>
        </Space>
      )
    }
  ]

  const defaultBuildingTemplate = {
    name: "Sample Hostel Building",
    description: "3-floor hostel with mixed room types",
    address: "123 University Ave",
    floors: [
      {
        floorNumber: 1,
        name: "Ground Floor",
        rooms: [
          { roomNumber: "101", name: "Reception", type: "common" },
          { roomNumber: "102", name: "Common Room", type: "common" },
          { roomNumber: "103", name: "Kitchen", type: "kitchen" },
          { roomNumber: "104", name: "Laundry", type: "common" }
        ]
      },
      {
        floorNumber: 2,
        name: "Second Floor",
        rooms: [
          { roomNumber: "201", name: "Room 201", type: "bedroom" },
          { roomNumber: "202", name: "Room 202", type: "bedroom" },
          { roomNumber: "203", name: "Room 203", type: "bedroom" },
          { roomNumber: "204", name: "Bathroom 2A", type: "bathroom" },
          { roomNumber: "205", name: "Room 205", type: "bedroom" },
          { roomNumber: "206", name: "Room 206", type: "bedroom" }
        ]
      },
      {
        floorNumber: 3,
        name: "Third Floor",
        rooms: [
          { roomNumber: "301", name: "Room 301", type: "bedroom" },
          { roomNumber: "302", name: "Room 302", type: "bedroom" },
          { roomNumber: "303", name: "Room 303", type: "bedroom" },
          { roomNumber: "304", name: "Bathroom 3A", type: "bathroom" },
          { roomNumber: "305", name: "Room 305", type: "bedroom" },
          { roomNumber: "306", name: "Study Room", type: "common" }
        ]
      }
    ]
  }

  const createSampleBuilding = async () => {
    try {
      await createBuilding(defaultBuildingTemplate)
      message.success('Sample building created successfully')
    } catch (error) {
      message.error('Failed to create sample building')
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultActiveKey="buildings">
        <TabPane tab="Buildings" key="buildings">
          <Card 
            title="Building Management" 
            extra={
              <Space>
                <Button 
                  type="dashed" 
                  onClick={createSampleBuilding}
                >
                  Create Sample Building
                </Button>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditingBuilding(null)
                    form.resetFields()
                    setShowBuildingModal(true)
                  }}
                >
                  Add Building
                </Button>
              </Space>
            }
          >
            <Table
              columns={buildingColumns}
              dataSource={buildings}
              rowKey="id"
              pagination={false}
            />
          </Card>
        </TabPane>

        <TabPane tab="Simulation" key="simulation">
          <Card title="Simulation Settings">
            <Row gutter={24}>
              <Col xs={24} md={12}>
                <Card title="Power Consumption Patterns" size="small">
                  <Form layout="vertical">
                    <Form.Item label="Bedroom (W)">
                      <Space>
                        <InputNumber placeholder="Min" defaultValue={10} />
                        <span>to</span>
                        <InputNumber placeholder="Max" defaultValue={150} />
                      </Space>
                    </Form.Item>
                    <Form.Item label="Bathroom (W)">
                      <Space>
                        <InputNumber placeholder="Min" defaultValue={0} />
                        <span>to</span>
                        <InputNumber placeholder="Max" defaultValue={2000} />
                      </Space>
                    </Form.Item>
                    <Form.Item label="Kitchen (W)">
                      <Space>
                        <InputNumber placeholder="Min" defaultValue={50} />
                        <span>to</span>
                        <InputNumber placeholder="Max" defaultValue={3500} />
                      </Space>
                    </Form.Item>
                    <Form.Item label="Common Room (W)">
                      <Space>
                        <InputNumber placeholder="Min" defaultValue={20} />
                        <span>to</span>
                        <InputNumber placeholder="Max" defaultValue={500} />
                      </Space>
                    </Form.Item>
                  </Form>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card title="Update Intervals" size="small">
                  <Form layout="vertical">
                    <Form.Item label="Telemetry Update (seconds)">
                      <InputNumber defaultValue={5} min={1} max={60} />
                    </Form.Item>
                    <Form.Item label="Status Update (seconds)">
                      <InputNumber defaultValue={10} min={1} max={120} />
                    </Form.Item>
                    <Form.Item label="Energy Calculation Interval (minutes)">
                      <InputNumber defaultValue={1} min={1} max={10} />
                    </Form.Item>
                    <Form.Item label="Enable Temperature Simulation">
                      <Switch defaultChecked />
                    </Form.Item>
                    <Form.Item label="Enable Random Power Variations">
                      <Switch defaultChecked />
                    </Form.Item>
                  </Form>
                </Card>
              </Col>
            </Row>
          </Card>
        </TabPane>

        <TabPane tab="MQTT" key="mqtt">
          <Card title="MQTT Configuration">
            <Row gutter={24}>
              <Col xs={24} md={12}>
                <Form layout="vertical">
                  <Form.Item label="Broker Host">
                    <Input defaultValue="localhost" />
                  </Form.Item>
                  <Form.Item label="Broker Port">
                    <InputNumber defaultValue={1883} />
                  </Form.Item>
                  <Form.Item label="WebSocket Port">
                    <InputNumber defaultValue={8083} />
                  </Form.Item>
                  <Form.Item label="Username">
                    <Input placeholder="Optional" />
                  </Form.Item>
                  <Form.Item label="Password">
                    <Input.Password placeholder="Optional" />
                  </Form.Item>
                  <Button type="primary">Update MQTT Settings</Button>
                </Form>
              </Col>
              <Col xs={24} md={12}>
                <Card title="Topic Patterns" size="small">
                  <div className="space-y-2 text-sm">
                    <div><strong>Status:</strong> shellies/[device_id]/status</div>
                    <div><strong>Command:</strong> shellies/[device_id]/command</div>
                    <div><strong>Telemetry:</strong> shellies/[device_id]/telemetry</div>
                    <div><strong>Config:</strong> shellies/[device_id]/config</div>
                    <div><strong>RPC:</strong> [device_id]/rpc</div>
                  </div>
                </Card>
              </Col>
            </Row>
          </Card>
        </TabPane>
      </Tabs>

      <Modal
        title={editingBuilding ? "Edit Building" : "Create New Building"}
        open={showBuildingModal}
        onCancel={() => {
          setShowBuildingModal(false)
          setEditingBuilding(null)
          form.resetFields()
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateBuilding}
        >
          <Form.Item
            name="name"
            label="Building Name"
            rules={[{ required: true, message: 'Please enter building name' }]}
          >
            <Input placeholder="Enter building name" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea placeholder="Enter building description" rows={3} />
          </Form.Item>
          
          <Form.Item
            name="address"
            label="Address"
          >
            <Input placeholder="Enter building address" />
          </Form.Item>

          <div className="bg-gray-50 p-4 rounded mb-4">
            <p className="text-sm text-gray-600 mb-2">
              Note: Floors and rooms will be created based on the sample template. 
              You can customize them after creation.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button onClick={() => {
              setShowBuildingModal(false)
              setEditingBuilding(null)
              form.resetFields()
            }}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit">
              {editingBuilding ? 'Update' : 'Create'} Building
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  )
}