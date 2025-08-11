const { Router } = require('express')
const Shelly1PMSimulator = require('../simulators/shelly1pm.js')

function simulationRoutes(prisma, mqttBroker, io) {
  const router = Router()
  const simulators = new Map()

  // Start simulation for a building
  router.post('/start', async (req, res) => {
    try {
      const { buildingId } = req.body

      const building = await prisma.building.findUnique({
        where: { id: buildingId },
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

      if (!building) {
        return res.status(404).json({ error: 'Building not found' })
      }

      const startedDevices = []

      for (const floor of building.floors) {
        for (const room of floor.rooms) {
          // Create a device if room doesn't have one
          let device = room.devices[0]
          
          if (!device) {
            const deviceId = `shelly1pmg4-${room.id.slice(0, 8)}`
            device = await prisma.device.create({
              data: {
                roomId: room.id,
                deviceId,
                name: `${room.name} Switch`,
                type: 'shelly1pmgen4',
                mqttTopic: `shellies/${deviceId}`,
                status: 'ONLINE'
              }
            })
          }

          // Start simulator
          const simulator = new Shelly1PMSimulator(
            device.deviceId,
            room.name,
            `mqtt://localhost:${process.env.MQTT_BROKER_PORT || 1883}`
          )

          await simulator.connect()
          simulators.set(device.id, simulator)

          // Update device status
          await prisma.device.update({
            where: { id: device.id },
            data: { status: 'ONLINE' }
          })

          startedDevices.push({
            deviceId: device.id,
            roomName: room.name,
            status: 'ONLINE'
          })
        }
      }

      io.emit('simulation_started', { buildingId, devices: startedDevices })
      res.json({ 
        success: true, 
        message: `Started simulation for ${startedDevices.length} devices`,
        devices: startedDevices
      })
    } catch (error) {
      console.error('Simulation start error:', error)
      res.status(500).json({ error: error.message })
    }
  })

  // Stop simulation
  router.post('/stop', async (req, res) => {
    try {
      const { buildingId, deviceId } = req.body

      if (deviceId) {
        // Stop specific device
        const simulator = simulators.get(deviceId)
        if (simulator) {
          simulator.disconnect()
          simulators.delete(deviceId)
          
          await prisma.device.update({
            where: { id: deviceId },
            data: { 
              status: 'OFFLINE',
              isOn: false,
              currentPower: 0,
              current: 0
            }
          })

          io.emit('simulation_stopped', { deviceId })
          res.json({ success: true, message: 'Device simulation stopped' })
        } else {
          res.status(404).json({ error: 'Simulator not found' })
        }
      } else if (buildingId) {
        // Stop all devices in building
        const devices = await prisma.device.findMany({
          where: {
            room: {
              floor: {
                buildingId
              }
            }
          }
        })

        let stoppedCount = 0
        for (const device of devices) {
          const simulator = simulators.get(device.id)
          if (simulator) {
            simulator.disconnect()
            simulators.delete(device.id)
            stoppedCount++
          }
        }

        await prisma.device.updateMany({
          where: {
            room: {
              floor: {
                buildingId
              }
            }
          },
          data: { 
            status: 'OFFLINE',
            isOn: false,
            currentPower: 0,
            current: 0
          }
        })

        io.emit('simulation_stopped', { buildingId })
        res.json({ 
          success: true, 
          message: `Stopped ${stoppedCount} device simulations`
        })
      } else {
        // Stop all simulations
        for (const [id, simulator] of simulators) {
          simulator.disconnect()
        }
        simulators.clear()

        await prisma.device.updateMany({
          data: { 
            status: 'OFFLINE',
            isOn: false,
            currentPower: 0,
            current: 0
          }
        })

        io.emit('simulation_stopped', { all: true })
        res.json({ success: true, message: 'All simulations stopped' })
      }
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Get simulation status
  router.get('/status', async (req, res) => {
    try {
      const activeSimulators = Array.from(simulators.keys())
      const devices = await prisma.device.findMany({
        where: { id: { in: activeSimulators } },
        include: {
          room: {
            include: {
              floor: {
                include: {
                  building: true
                }
              }
            }
          }
        }
      })

      res.json({
        active: simulators.size,
        devices: devices.map(d => ({
          id: d.id,
          name: d.name,
          room: d.room.name,
          floor: d.room.floor.name,
          building: d.room.floor.building.name,
          status: d.status,
          power: d.currentPower,
          isOn: d.isOn
        }))
      })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Configure simulation patterns
  router.post('/patterns', async (req, res) => {
    try {
      const { deviceId, patterns } = req.body
      const simulator = simulators.get(deviceId)
      
      if (!simulator) {
        return res.status(404).json({ error: 'Simulator not found' })
      }

      if (patterns) {
        Object.assign(simulator.consumptionPatterns, patterns)
      }

      res.json({ success: true, message: 'Patterns updated' })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Trigger events
  router.post('/event', async (req, res) => {
    try {
      const { type, deviceIds, params } = req.body

      for (const deviceId of deviceIds) {
        const simulator = simulators.get(deviceId)
        if (simulator) {
          switch (type) {
            case 'power_surge':
              simulator.state.switch.power *= 1.5
              simulator.publishStatus()
              break
            case 'power_outage':
              simulator.turnOff()
              break
            case 'schedule_on':
              setTimeout(() => simulator.turnOn(), params.delay || 0)
              break
            case 'schedule_off':
              setTimeout(() => simulator.turnOff(), params.delay || 0)
              break
          }
        }
      }

      io.emit('simulation_event', { type, deviceIds, params })
      res.json({ success: true, message: `Event ${type} triggered` })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  return router
}

module.exports = simulationRoutes