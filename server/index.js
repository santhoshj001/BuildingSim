const express = require('express')
const cors = require('cors')
const { createServer } = require('http')
const { Server } = require('socket.io')
const dotenv = require('dotenv')
const MQTTBroker = require('./mqtt/broker.js')
const { PrismaClient } = require('@prisma/client')
const buildingRoutes = require('./api/buildings.js')
const deviceRoutes = require('./api/devices.js')
const simulationRoutes = require('./api/simulation.js')

dotenv.config()

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
})

const prisma = new PrismaClient()
const mqttBroker = new MQTTBroker()

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.static('public'))

// Start MQTT Broker
mqttBroker.start(
  parseInt(process.env.MQTT_BROKER_PORT || '1883'),
  parseInt(process.env.MQTT_WS_PORT || '8083')
)

// WebSocket connections
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  socket.on('subscribe', (topics) => {
    topics.forEach(topic => {
      socket.join(topic)
    })
  })

  socket.on('publish', (data) => {
    const { topic, message } = data
    mqttBroker.publish(topic, message)
    io.to(topic).emit('message', { topic, message })
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

// Device state cache - single source of truth (cleared on restart)
const deviceStates = new Map()
deviceStates.clear() // Ensure clean start

// Forward MQTT messages to WebSocket clients and update device state cache
mqttBroker.aedes.on('publish', (packet) => {
  if (packet.topic.startsWith('shellies/')) {
    const payload = packet.payload.toString()
    
    // Update device state cache from MQTT telemetry
    if (packet.topic.includes('/status') || packet.topic.includes('/telemetry')) {
      try {
        const data = JSON.parse(payload)
        if (data.id) {
          const mqttDeviceId = data.id
          // Find the matching device from the pre-populated cache by deviceId
          let deviceRecord = null
          for (const [key, value] of deviceStates.entries()) {
            if (value.deviceId === mqttDeviceId) {
              deviceRecord = value
              break
            }
          }
          
          if (deviceRecord) {
            // Update the existing device record with MQTT data
            deviceStates.set(deviceRecord.id, {
              ...deviceRecord,
              isOn: data.relay || data.output || false,
              currentPower: data.power || 0,
              current: data.current || 0,
              voltage: data.voltage || 230,
              temperature: data.temperature || 25,
              energyTotal: data.energy || 0,
              status: data.online ? 'ONLINE' : 'OFFLINE',
              lastUpdate: new Date()
            })
          }
        }
      } catch (error) {
        // Ignore JSON parse errors
      }
    }
    
    io.emit('mqtt_message', {
      topic: packet.topic,
      payload: payload
    })
  }
})

// Initialize device states from simulation
async function initializeDeviceStates() {
  try {
    const buildings = await prisma.building.findMany({
      include: {
        floors: {
          include: {
            rooms: {
              include: {
                devices: true
              }
            }
          }
        }
      }
    })
    
    // Pre-populate device states with room information
    buildings.forEach(building => {
      building.floors.forEach(floor => {
        floor.rooms.forEach(room => {
          room.devices.forEach(device => {
            deviceStates.set(device.id, {
              id: device.id,
              deviceId: device.deviceId,
              name: device.name,
              isOn: false,
              currentPower: 0,
              current: 0,
              voltage: 230,
              temperature: 25,
              energyTotal: 0,
              status: 'OFFLINE',
              room: {
                id: room.id,
                name: room.name,
                type: room.type,
                floor: {
                  id: floor.id,
                  name: floor.name,
                  building: {
                    id: building.id,
                    name: building.name
                  }
                }
              }
            })
          })
        })
      })
    })
    
    console.log(`Initialized ${deviceStates.size} device states from database`)
  } catch (error) {
    console.error('Failed to initialize device states:', error)
  }
}

// Call initialization
initializeDeviceStates()

// API Routes
app.use('/api/buildings', buildingRoutes(prisma, mqttBroker, io))
app.use('/api/devices', deviceRoutes(prisma, mqttBroker, io, deviceStates))
app.use('/api/simulation', simulationRoutes(prisma, mqttBroker, io, deviceStates))

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mqtt: {
      clients: mqttBroker.getClients().length
    }
  })
})

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Something went wrong!' })
})

const PORT = process.env.API_PORT || 3001

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`MQTT Broker on port ${process.env.MQTT_BROKER_PORT || 1883}`)
  console.log(`MQTT WebSocket on port ${process.env.MQTT_WS_PORT || 8083}`)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully')
  mqttBroker.stop()
  await prisma.$disconnect()
  httpServer.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

module.exports = { prisma, mqttBroker, io }