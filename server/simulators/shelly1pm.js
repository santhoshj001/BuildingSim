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
    
    // Realistic hostel room power consumption patterns (in Watts)
    this.consumptionPatterns = {
      // Single/Double occupancy bedroom
      bedroom: { 
        min: 35, max: 280, variation: 45,
        typical: 120, // LED lights (15W) + fan (75W) + phone charging (15W) + laptop (15W)
        peak: 350,    // All above + small heater/cooler
        appliances: ['LED lights', 'ceiling fan', 'mobile chargers', 'laptop', 'small TV']
      },
      // Shared bathroom facilities  
      bathroom: { 
        min: 5, max: 1800, variation: 200,
        typical: 450, // Exhaust fan (25W) + LED lights (10W) + water heater (400W)
        peak: 2200,   // Geyser + exhaust + lights + hair dryer
        appliances: ['water heater/geyser', 'exhaust fan', 'LED lights', 'hair dryer']
      },
      // Common kitchen/pantry
      kitchen: { 
        min: 80, max: 4500, variation: 600,
        typical: 1200, // Refrigerator (200W) + microwave (800W) + lights (25W) + exhaust (75W)
        peak: 5500,    // All appliances + induction cooktop (2000W) + kettle (1500W)
        appliances: ['refrigerator', 'microwave', 'induction cooktop', 'electric kettle', 'exhaust fan']
      },
      // Common lounge/study areas
      common: { 
        min: 45, max: 650, variation: 85,
        typical: 180, // LED lights (30W) + ceiling fans (150W)
        peak: 800,   // Lights + fans + TV + charging stations
        appliances: ['LED strip lights', 'ceiling fans', 'TV', 'charging stations', 'WiFi router']
      },
      // Corridors and stairways
      hallway: { 
        min: 8, max: 120, variation: 15,
        typical: 35,  // LED tube lights (25W) + emergency lighting (10W)
        peak: 150,    // All lights + motion sensors
        appliances: ['LED tube lights', 'emergency lighting', 'motion sensors']
      },
      // Reception/office area
      reception: {
        min: 60, max: 800, variation: 120,
        typical: 320, // Computer (150W) + printer (50W) + lights (40W) + AC unit (80W)
        peak: 1200,   // All equipment + higher AC load
        appliances: ['desktop computer', 'printer', 'LED lights', 'small AC unit', 'CCTV']
      }
    }
    
    // Time-based usage patterns for more realism
    this.timePatterns = {
      // Peak hours: 6-9 AM, 6-11 PM
      // Low hours: 11 PM - 6 AM  
      // Medium hours: 9 AM - 6 PM
      getCurrentTimeMultiplier() {
        const hour = new Date().getHours()
        if ((hour >= 6 && hour <= 9) || (hour >= 18 && hour <= 23)) {
          return 1.0 // Peak usage
        } else if (hour >= 23 || hour <= 6) {
          return 0.3 // Low usage - mostly sleeping
        } else {
          return 0.6 // Medium usage - some students in rooms
        }
      }
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
    const roomType = this.getRoomType()
    const pattern = this.consumptionPatterns[roomType] || this.consumptionPatterns.common

    // Apply time-based multiplier for realistic usage patterns
    const timeMultiplier = this.timePatterns.getCurrentTimeMultiplier()
    
    // Simulate realistic power consumption with multiple factors
    let power = 0
    
    if (Math.random() < 0.7) {
      // 70% chance of typical usage
      power = pattern.typical + (Math.random() - 0.5) * pattern.variation * 0.5
    } else if (Math.random() < 0.9) {
      // 20% chance of higher usage
      const highUsage = pattern.min + Math.random() * (pattern.max - pattern.min)
      power = highUsage + (Math.random() - 0.5) * pattern.variation
    } else {
      // 10% chance of peak usage (multiple appliances)
      power = pattern.peak + (Math.random() - 0.5) * pattern.variation * 0.3
    }
    
    // Apply time-based multiplier
    power *= timeMultiplier
    
    // Add small random variations to simulate real-world fluctuations
    const microVariation = 1 + (Math.random() - 0.5) * 0.1 // ±5%
    power *= microVariation
    
    // Ensure minimum consumption when on (standby power)
    power = Math.max(pattern.min * 0.8, power)
    power = Math.min(pattern.peak * 1.1, power) // Cap at 110% of peak

    this.state.switch.power = parseFloat(power.toFixed(2))
    
    // Update voltage with realistic variations (220V-240V in most countries)
    const voltageBase = 230 + (Math.random() - 0.5) * 10 // ±5V variation
    this.state.switch.voltage = parseFloat(voltageBase.toFixed(1))
    
    // Calculate current using P = V * I * cos(φ), assuming power factor ~0.9
    const powerFactor = 0.85 + Math.random() * 0.1 // 0.85-0.95
    this.state.switch.current = parseFloat((power / (this.state.switch.voltage * powerFactor)).toFixed(3))
    
    // Update energy consumption (Wh) - more accurate calculation
    const energyIncrement = (power / 3600) * 5 // 5 second intervals
    this.state.switch.energy.total += energyIncrement / 1000 // Convert to kWh
    this.state.switch.energy.total = parseFloat(this.state.switch.energy.total.toFixed(4))

    // Simulate temperature rise based on power load and ambient conditions
    const ambientTemp = 22 + Math.sin(Date.now() / 86400000 * 2 * Math.PI) * 8 // Daily temp cycle 14-30°C
    const tempRise = Math.min(25, power / 80) // More realistic temp rise
    const ventilationCooling = roomType === 'bathroom' ? 3 : 1 // Better ventilation in bathrooms
    
    this.state.switch.temperature.tC = parseFloat((ambientTemp + tempRise - ventilationCooling + (Math.random() - 0.5) * 2).toFixed(1))
    this.state.switch.temperature.tF = parseFloat((this.state.switch.temperature.tC * 9/5 + 32).toFixed(1))
  }
  
  getRoomType() {
    const roomName = this.roomName.toLowerCase()
    if (roomName.includes('bedroom') || roomName.includes('room') || /\d/.test(roomName)) {
      return 'bedroom'
    } else if (roomName.includes('bathroom') || roomName.includes('toilet') || roomName.includes('washroom')) {
      return 'bathroom'
    } else if (roomName.includes('kitchen') || roomName.includes('pantry')) {
      return 'kitchen'
    } else if (roomName.includes('hallway') || roomName.includes('corridor') || roomName.includes('stair')) {
      return 'hallway'
    } else if (roomName.includes('reception') || roomName.includes('office')) {
      return 'reception'
    } else {
      return 'common'
    }
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