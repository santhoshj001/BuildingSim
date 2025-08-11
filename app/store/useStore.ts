import { create } from 'zustand'
import axios from 'axios'
import { io, Socket } from 'socket.io-client'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface Building {
  id: string
  name: string
  description?: string
  address?: string
  floors: Floor[]
}

interface Floor {
  id: string
  buildingId: string
  floorNumber: number
  name: string
  rooms: Room[]
}

interface Room {
  id: string
  floorId: string
  roomNumber: string
  name: string
  type: string
  devices: Device[]
}

interface Device {
  id: string
  roomId: string
  deviceId: string
  name: string
  type: string
  mqttTopic: string
  status: 'ONLINE' | 'OFFLINE' | 'ERROR'
  isOn: boolean
  currentPower: number
  voltage: number
  current: number
  temperature: number
  energyTotal: number
  room?: Room
}

interface StoreState {
  buildings: Building[]
  devices: Device[]
  selectedBuilding: Building | null
  selectedDevice: Device | null
  socket: Socket | null
  mqttMessages: any[]
  
  fetchBuildings: () => Promise<void>
  fetchDevices: () => Promise<void>
  createBuilding: (data: any) => Promise<void>
  deleteBuilding: (id: string) => Promise<void>
  selectBuilding: (building: Building | null) => void
  selectDevice: (device: Device | null) => void
  
  controlDevice: (deviceId: string, command: string) => Promise<void>
  batchControlDevices: (deviceIds: string[], command: string) => Promise<void>
  
  startSimulation: (buildingId: string) => Promise<void>
  stopSimulation: (buildingId?: string) => Promise<void>
  
  connectSocket: () => void
  disconnectSocket: () => void
  addMqttMessage: (message: any) => void
}

export const useStore = create<StoreState>((set, get) => ({
  buildings: [],
  devices: [],
  selectedBuilding: null,
  selectedDevice: null,
  socket: null,
  mqttMessages: [],

  fetchBuildings: async () => {
    try {
      const response = await axios.get(`${API_URL}/api/buildings`)
      set({ buildings: response.data })
    } catch (error) {
      console.error('Failed to fetch buildings:', error)
    }
  },

  fetchDevices: async () => {
    try {
      const response = await axios.get(`${API_URL}/api/devices`)
      set({ devices: response.data })
    } catch (error) {
      console.error('Failed to fetch devices:', error)
    }
  },

  createBuilding: async (data) => {
    try {
      const response = await axios.post(`${API_URL}/api/buildings`, data)
      const { buildings } = get()
      set({ buildings: [...buildings, response.data] })
    } catch (error) {
      console.error('Failed to create building:', error)
    }
  },

  deleteBuilding: async (id) => {
    try {
      await axios.delete(`${API_URL}/api/buildings/${id}`)
      const { buildings } = get()
      set({ buildings: buildings.filter(b => b.id !== id) })
    } catch (error) {
      console.error('Failed to delete building:', error)
    }
  },

  selectBuilding: (building) => set({ selectedBuilding: building }),
  selectDevice: (device) => set({ selectedDevice: device }),

  controlDevice: async (deviceId, command) => {
    try {
      await axios.post(`${API_URL}/api/devices/${deviceId}/control`, { command })
      await get().fetchDevices()
    } catch (error) {
      console.error('Failed to control device:', error)
    }
  },

  batchControlDevices: async (deviceIds, command) => {
    try {
      await axios.post(`${API_URL}/api/devices/batch/control`, { deviceIds, command })
      await get().fetchDevices()
    } catch (error) {
      console.error('Failed to batch control devices:', error)
    }
  },

  startSimulation: async (buildingId) => {
    try {
      await axios.post(`${API_URL}/api/simulation/start`, { buildingId })
      await get().fetchDevices()
    } catch (error) {
      console.error('Failed to start simulation:', error)
    }
  },

  stopSimulation: async (buildingId?) => {
    try {
      await axios.post(`${API_URL}/api/simulation/stop`, { buildingId })
      await get().fetchDevices()
    } catch (error) {
      console.error('Failed to stop simulation:', error)
    }
  },

  connectSocket: () => {
    const socket = io(API_URL)
    
    socket.on('connect', () => {
      console.log('Connected to server')
    })

    socket.on('mqtt_message', (message) => {
      get().addMqttMessage(message)
      
      // Update device state based on MQTT messages
      if (message.topic.includes('/status')) {
        get().fetchDevices()
      }
    })

    socket.on('device_updated', () => {
      get().fetchDevices()
    })

    socket.on('building_created', () => {
      get().fetchBuildings()
    })

    set({ socket })
  },

  disconnectSocket: () => {
    const { socket } = get()
    if (socket) {
      socket.disconnect()
      set({ socket: null })
    }
  },

  addMqttMessage: (message) => {
    const { mqttMessages } = get()
    set({ mqttMessages: [...mqttMessages.slice(-99), message] })
  }
}))