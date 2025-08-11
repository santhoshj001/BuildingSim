'use client'

import { useState, useCallback, useEffect } from 'react'
import { Card, Select, Row, Col, Button, Badge, Tooltip } from 'antd'
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  NodeTypes
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useStore } from '../store/useStore'
import DeviceNode from './DeviceNode'

const { Option } = Select

const nodeTypes: NodeTypes = {
  device: DeviceNode,
}

export default function BuildingView() {
  const { buildings, devices, selectedBuilding, selectBuilding } = useStore()
  const [selectedFloor, setSelectedFloor] = useState<string>('')
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges])

  useEffect(() => {
    if (selectedBuilding && selectedFloor) {
      generateFloorLayout()
    }
  }, [selectedBuilding, selectedFloor, devices])

  const generateFloorLayout = () => {
    if (!selectedBuilding || !selectedFloor) return

    const floor = selectedBuilding.floors.find(f => f.id === selectedFloor)
    if (!floor) return

    const newNodes: Node[] = []
    const newEdges: Edge[] = []
    
    // Create a grid layout for rooms
    const roomsPerRow = Math.ceil(Math.sqrt(floor.rooms.length))
    const roomWidth = 200
    const roomHeight = 150
    const spacing = 50

    floor.rooms.forEach((room, index) => {
      const row = Math.floor(index / roomsPerRow)
      const col = index % roomsPerRow
      const x = col * (roomWidth + spacing) + 100
      const y = row * (roomHeight + spacing) + 100

      // Find device for this room
      const device = devices.find(d => d.roomId === room.id)

      newNodes.push({
        id: room.id,
        type: 'device',
        position: { x, y },
        data: {
          room,
          device,
          label: room.name,
          type: room.type
        }
      })
    })

    setNodes(newNodes)
    setEdges(newEdges)
  }

  const handleBuildingSelect = (buildingId: string) => {
    const building = buildings.find(b => b.id === buildingId)
    selectBuilding(building || null)
    setSelectedFloor('')
  }

  const handleFloorSelect = (floorId: string) => {
    setSelectedFloor(floorId)
  }

  const getFloorStats = () => {
    if (!selectedBuilding || !selectedFloor) return null

    const floor = selectedBuilding.floors.find(f => f.id === selectedFloor)
    if (!floor) return null

    const roomDevices = devices.filter(d => 
      floor.rooms.some(r => r.id === d.roomId)
    )

    return {
      totalRooms: floor.rooms.length,
      onlineDevices: roomDevices.filter(d => d.status === 'ONLINE').length,
      activeDevices: roomDevices.filter(d => d.isOn).length,
      totalPower: roomDevices.reduce((sum, d) => sum + (d.currentPower || 0), 0)
    }
  }

  const stats = getFloorStats()

  return (
    <div className="space-y-4">
      <Card>
        <Row gutter={16} align="middle">
          <Col>
            <span className="font-medium">Building:</span>
            <Select
              style={{ width: 200, marginLeft: 8 }}
              placeholder="Select Building"
              value={selectedBuilding?.id}
              onChange={handleBuildingSelect}
            >
              {buildings.map(building => (
                <Option key={building.id} value={building.id}>
                  {building.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col>
            <span className="font-medium">Floor:</span>
            <Select
              style={{ width: 150, marginLeft: 8 }}
              placeholder="Select Floor"
              value={selectedFloor}
              onChange={handleFloorSelect}
              disabled={!selectedBuilding}
            >
              {selectedBuilding?.floors.map(floor => (
                <Option key={floor.id} value={floor.id}>
                  {floor.name}
                </Option>
              ))}
            </Select>
          </Col>
          {stats && (
            <>
              <Col>
                <Badge count={stats.onlineDevices} showZero>
                  <Button size="small">Online Devices</Button>
                </Badge>
              </Col>
              <Col>
                <Badge count={stats.activeDevices} showZero color="green">
                  <Button size="small">Active Devices</Button>
                </Badge>
              </Col>
              <Col>
                <Tooltip title={`${stats.totalPower.toFixed(1)}W`}>
                  <Button size="small">Total Power</Button>
                </Tooltip>
              </Col>
            </>
          )}
        </Row>
      </Card>

      <Card title={selectedBuilding ? `${selectedBuilding.name} - Floor Layout` : 'Building Layout'}>
        <div style={{ height: '600px', border: '1px solid #d9d9d9', borderRadius: '6px' }}>
          {selectedBuilding && selectedFloor ? (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              fitView
              attributionPosition="bottom-left"
            >
              <Controls />
              <MiniMap />
              <Background variant="dots" gap={12} size={1} />
            </ReactFlow>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select a building and floor to view the layout
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}