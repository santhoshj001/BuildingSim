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

// Forward MQTT messages to WebSocket clients
mqttBroker.aedes.on('publish', (packet) => {
  if (packet.topic.startsWith('shellies/')) {
    io.emit('mqtt_message', {
      topic: packet.topic,
      payload: packet.payload.toString()
    })
  }
})

// API Routes
app.use('/api/buildings', buildingRoutes(prisma, mqttBroker, io))
app.use('/api/devices', deviceRoutes(prisma, mqttBroker, io))
app.use('/api/simulation', simulationRoutes(prisma, mqttBroker, io))

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