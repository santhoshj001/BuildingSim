const mqtt = require('mqtt')
const { v4: uuidv4 } = require('uuid')

class Shelly1PMSimulator {
  constructor(deviceId, roomName, mqttUrl = 'mqtt://localhost:1883') {
    this.deviceId = deviceId || `shelly1pmg4-${uuidv4().slice(0, 8)}`
    this.roomName = roomName
    this.mqttUrl = mqttUrl
    this.client = null
    
    // Device state following actual Shelly 1PM Gen 4 specs
    this.state = {
      switch: {
        id: 0,
        source: 'init',
        output: false,
        voltage: 230.0,
        current: 0.0,
        power: 0.0,
        energy: {
          total: 0.0,
          minute_ts: Date.now(),
          counters: [0, 0, 0]
        },
        temperature: {
          tC: 25.0,
          tF: 77.0
        }
      },
      wifi: {
        sta_ip: '192.168.1.100',
        status: 'connected',
        ssid: 'SimulatedNetwork',
        rssi: -65
      },
      sys: {
        mac: this.generateMac(),
        restart_required: false,
        time: new Date().toISOString(),
        uptime: 0,
        ram_total: 253824,
        ram_free: 151296,
        fs_size: 458752,
        fs_free: 172032
      }
    }

    // Simulation parameters
    this.simulationInterval = null
    this.uptimeInterval = null
    this.baseConsumption = 0
    this.consumptionPatterns = {
      bedroom: { min: 10, max: 150, variation: 20 },
      bathroom: { min: 0, max: 2000, variation: 500 },
      kitchen: { min: 50, max: 3500, variation: 800 },
      common: { min: 20, max: 500, variation: 100 },
      hallway: { min: 5, max: 60, variation: 10 }
    }
  }

  generateMac() {
    const hex = '0123456789ABCDEF'
    let mac = 'E8:68:E7:' // Shelly MAC prefix
    for (let i = 0; i < 3; i++) {
      mac += hex[Math.floor(Math.random() * 16)]
      mac += hex[Math.floor(Math.random() * 16)]
      if (i < 2) mac += ':'
    }
    return mac
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.client = mqtt.connect(this.mqttUrl, {
        clientId: this.deviceId,
        clean: true,
        connectTimeout: 4000,
        reconnectPeriod: 1000,
      })

      this.client.on('connect', () => {
        console.log(`Shelly ${this.deviceId} connected to MQTT broker`)
        this.setupMqttHandlers()
        this.startSimulation()
        resolve()
      })

      this.client.on('error', (err) => {
        console.error(`Shelly ${this.deviceId} MQTT error:`, err)
        reject(err)
      })
    })
  }

  setupMqttHandlers() {
    // Subscribe to command topics
    const commandTopic = `shellies/${this.deviceId}/command`
    const rpcTopic = `${this.deviceId}/rpc`
    
    this.client.subscribe([commandTopic, rpcTopic], (err) => {
      if (err) {
        console.error(`Failed to subscribe to topics:`, err)
      }
    })

    // Handle incoming messages
    this.client.on('message', (topic, message) => {
      const payload = message.toString()
      console.log(`${this.deviceId} received:`, topic, payload)
      
      if (topic.includes('/command')) {
        this.handleCommand(payload)
      } else if (topic.includes('/rpc')) {
        this.handleRPC(JSON.parse(payload))
      }
    })

    // Publish device announcement
    this.publishStatus()
    this.publishConfig()
  }

  handleCommand(command) {
    switch (command.toLowerCase()) {
      case 'on':
        this.turnOn()
        break
      case 'off':
        this.turnOff()
        break
      case 'toggle':
        this.toggle()
        break
      case 'status':
        this.publishStatus()
        break
    }
  }

  handleRPC(rpc) {
    const { method, params, id } = rpc
    let result = null

    switch (method) {
      case 'Switch.Set':
        result = this.setSwitchState(params)
        break
      case 'Switch.GetStatus':
        result = this.getSwitchStatus()
        break
      case 'Sys.GetStatus':
        result = this.getSystemStatus()
        break
      case 'WiFi.GetStatus':
        result = this.getWiFiStatus()
        break
    }

    // Send RPC response
    if (id !== undefined) {
      this.publish(`${this.deviceId}/rpc/response`, {
        id,
        src: this.deviceId,
        result
      })
    }
  }

  turnOn() {
    this.state.switch.output = true
    this.state.switch.source = 'mqtt'
    this.updatePowerConsumption()
    this.publishStatus()
  }

  turnOff() {
    this.state.switch.output = false
    this.state.switch.source = 'mqtt'
    this.state.switch.current = 0
    this.state.switch.power = 0
    this.publishStatus()
  }

  toggle() {
    if (this.state.switch.output) {
      this.turnOff()
    } else {
      this.turnOn()
    }
  }

  setSwitchState(params) {
    if (params.on !== undefined) {
      if (params.on) {
        this.turnOn()
      } else {
        this.turnOff()
      }
    }
    return { was_on: !this.state.switch.output }
  }

  getSwitchStatus() {
    return this.state.switch
  }

  getSystemStatus() {
    return this.state.sys
  }

  getWiFiStatus() {
    return this.state.wifi
  }

  updatePowerConsumption() {
    if (!this.state.switch.output) {
      this.state.switch.current = 0
      this.state.switch.power = 0
      return
    }

    // Get room type pattern or use default
    const roomType = this.roomName.toLowerCase().split(' ')[0]
    const pattern = this.consumptionPatterns[roomType] || this.consumptionPatterns.common

    // Simulate realistic power consumption with variations
    const baseLoad = pattern.min + Math.random() * (pattern.max - pattern.min)
    const variation = (Math.random() - 0.5) * pattern.variation
    const power = Math.max(0, baseLoad + variation)

    this.state.switch.power = parseFloat(power.toFixed(2))
    this.state.switch.current = parseFloat((power / this.state.switch.voltage).toFixed(3))
    
    // Update energy consumption (Wh)
    const energyIncrement = (power / 3600) * 5 // 5 second intervals
    this.state.switch.energy.total += energyIncrement / 1000 // Convert to kWh
    this.state.switch.energy.total = parseFloat(this.state.switch.energy.total.toFixed(3))

    // Simulate temperature rise with load
    const tempBase = 25
    const tempRise = Math.min(15, power / 100) // Max 15°C rise
    this.state.switch.temperature.tC = parseFloat((tempBase + tempRise).toFixed(1))
    this.state.switch.temperature.tF = parseFloat((this.state.switch.temperature.tC * 9/5 + 32).toFixed(1))
  }

  startSimulation() {
    // Update power consumption every 5 seconds
    this.simulationInterval = setInterval(() => {
      if (this.state.switch.output) {
        this.updatePowerConsumption()
      }
      this.publishStatus()
      this.publishTelemetry()
    }, 5000)

    // Update uptime
    this.uptimeInterval = setInterval(() => {
      this.state.sys.uptime += 1
      this.state.sys.time = new Date().toISOString()
    }, 1000)
  }

  publishStatus() {
    const status = {
      id: this.deviceId,
      model: 'SHELLY1PMG4',
      mac: this.state.sys.mac,
      ip: this.state.wifi.sta_ip,
      new_fw: false,
      fw_ver: '1.0.0',
      relay: this.state.switch.output,
      power: this.state.switch.power,
      current: this.state.switch.current,
      voltage: this.state.switch.voltage,
      energy: this.state.switch.energy.total,
      temperature: this.state.switch.temperature.tC,
      overtemperature: this.state.switch.temperature.tC > 90,
      online: true
    }

    this.publish(`shellies/${this.deviceId}/status`, status)
    this.publish(`${this.deviceId}/status/switch:0`, this.state.switch)
  }

  publishTelemetry() {
    const telemetry = {
      timestamp: Date.now(),
      power: this.state.switch.power,
      current: this.state.switch.current,
      voltage: this.state.switch.voltage,
      energy: this.state.switch.energy.total,
      temperature: this.state.switch.temperature.tC,
      output: this.state.switch.output
    }

    this.publish(`shellies/${this.deviceId}/telemetry`, telemetry)
  }

  publishConfig() {
    const config = {
      device: {
        type: 'SHELLY1PMG4',
        mac: this.state.sys.mac,
        hostname: this.deviceId,
        room: this.roomName
      },
      wifi: this.state.wifi,
      mqtt: {
        enable: true,
        server: this.mqttUrl,
        client_id: this.deviceId
      }
    }

    this.publish(`shellies/${this.deviceId}/config`, config)
  }

  publish(topic, payload) {
    if (this.client && this.client.connected) {
      this.client.publish(topic, JSON.stringify(payload), { qos: 0, retain: false })
    }
  }

  disconnect() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval)
    }
    if (this.uptimeInterval) {
      clearInterval(this.uptimeInterval)
    }
    if (this.client) {
      this.client.end()
    }
  }
}

module.exports = Shelly1PMSimulator