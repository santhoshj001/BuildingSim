'use client'

import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { Button, Badge, Tooltip, Space } from 'antd'
import {
  PoweroffOutlined,
  ThunderboltOutlined,
  HomeOutlined,
  FireOutlined
} from '@ant-design/icons'
import { useStore } from '../store/useStore'

interface DeviceNodeProps {
  data: {
    room: any
    device: any
    label: string
    type: string
  }
}

function DeviceNode({ data }: DeviceNodeProps) {
  const { controlDevice } = useStore()
  const { room, device } = data

  const handleToggle = async () => {
    if (device) {
      await controlDevice(device.id, device.isOn ? 'off' : 'on')
    }
  }

  const getStatusColor = () => {
    if (!device) return '#ccc'
    if (device.status === 'ERROR') return '#ff4d4f'
    if (device.status === 'OFFLINE') return '#999'
    if (device.isOn) return '#52c41a'
    return '#1890ff'
  }

  const getRoomIcon = () => {
    switch (room.type.toLowerCase()) {
      case 'bedroom':
        return '🛏️'
      case 'bathroom':
        return '🚿'
      case 'kitchen':
        return '🍳'
      case 'living':
      case 'common':
        return '🛋️'
      default:
        return '🏠'
    }
  }

  return (
    <div 
      className={`p-3 border-2 rounded-lg bg-white shadow-sm min-w-[180px] ${
        device?.isOn ? 'border-green-400 bg-green-50' : 'border-gray-300'
      }`}
      style={{ borderColor: getStatusColor() }}
    >
      <Handle type="target" position={Position.Top} />
      
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <span className="text-lg">{getRoomIcon()}</span>
          <span className="font-semibold text-sm">{room.name}</span>
        </div>
        
        <div className="text-xs text-gray-500 capitalize">{room.type}</div>
        
        {device ? (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Badge 
                status={device.status === 'ONLINE' ? 'processing' : 'default'} 
                size="small" 
              />
              <span className="text-xs">{device.status}</span>
            </div>
            
            {device.isOn && (
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1 text-xs">
                  <ThunderboltOutlined />
                  {device.currentPower?.toFixed(1) || 0}W
                </div>
                {device.temperature > 60 && (
                  <div className="flex items-center justify-center gap-1 text-xs text-red-500">
                    <FireOutlined />
                    {device.temperature.toFixed(1)}°C
                  </div>
                )}
              </div>
            )}
            
            <Tooltip title={device.isOn ? 'Turn Off' : 'Turn On'}>
              <Button 
                size="small" 
                type={device.isOn ? "default" : "primary"}
                icon={<PoweroffOutlined />}
                onClick={handleToggle}
                className={device.isOn ? 'power-indicator' : ''}
              >
                {device.isOn ? 'ON' : 'OFF'}
              </Button>
            </Tooltip>
          </div>
        ) : (
          <div className="text-xs text-gray-400">No Device</div>
        )}
      </div>
      
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

export default memo(DeviceNode)