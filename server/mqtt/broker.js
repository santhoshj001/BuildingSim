const Aedes = require('aedes')
const { createServer } = require('net')
const ws = require('websocket-stream')
const http = require('http')

class MQTTBroker {
  constructor() {
    this.aedes = new Aedes()
    this.tcpServer = null
    this.wsServer = null
    this.clients = new Map()
    this.setupEventHandlers()
  }

  setupEventHandlers() {
    this.aedes.on('client', (client) => {
      console.log(`Client Connected: ${client.id}`)
      this.clients.set(client.id, {
        id: client.id,
        connectedAt: new Date()
      })
    })

    this.aedes.on('clientDisconnect', (client) => {
      console.log(`Client Disconnected: ${client.id}`)
      this.clients.delete(client.id)
    })

    this.aedes.on('subscribe', (subscriptions, client) => {
      console.log(`Client ${client.id} subscribed to:`, subscriptions.map(s => s.topic))
    })

    this.aedes.on('unsubscribe', (subscriptions, client) => {
      console.log(`Client ${client.id} unsubscribed from:`, subscriptions)
    })

    this.aedes.on('publish', (packet, client) => {
      if (client) {
        console.log(`Message from ${client.id} on ${packet.topic}:`, packet.payload.toString())
      }
    })
  }

  start(tcpPort = 1883, wsPort = 8083) {
    // TCP Server
    this.tcpServer = createServer(this.aedes.handle)
    this.tcpServer.listen(tcpPort, () => {
      console.log(`MQTT broker listening on port ${tcpPort}`)
    })

    // WebSocket Server for browser clients
    const httpServer = http.createServer()
    ws.createServer({ server: httpServer }, this.aedes.handle)
    httpServer.listen(wsPort, () => {
      console.log(`MQTT WebSocket broker listening on port ${wsPort}`)
    })

    this.wsServer = httpServer
  }

  publish(topic, message, options = {}) {
    this.aedes.publish({
      topic,
      payload: typeof message === 'string' ? message : JSON.stringify(message),
      qos: options.qos || 0,
      retain: options.retain || false
    })
  }

  getClients() {
    return Array.from(this.clients.values())
  }

  stop() {
    if (this.tcpServer) {
      this.tcpServer.close()
    }
    if (this.wsServer) {
      this.wsServer.close()
    }
    this.aedes.close()
  }
}

module.exports = MQTTBroker