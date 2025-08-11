const { Router } = require('express')
const { v4: uuidv4 } = require('uuid')

function deviceRoutes(prisma, mqttBroker, io) {
  const router = Router()

  // Batch control devices - MUST be before /:id routes
  router.post('/batch/control', async (req, res) => {
    try {
      const { deviceIds, command } = req.body

      if (!deviceIds || !Array.isArray(deviceIds) || deviceIds.length === 0) {
        return res.status(400).json({ error: 'deviceIds array is required' })
      }

      const devices = await prisma.device.findMany({
        where: { id: { in: deviceIds } }
      })

      if (devices.length === 0) {
        return res.status(404).json({ error: 'No devices found' })
      }

      for (const device of devices) {
        const commandTopic = `shellies/${device.deviceId}/command`
        mqttBroker.publish(commandTopic, command)
      }

      let updates = {}
      if (command === 'on') {
        updates.isOn = true
      } else if (command === 'off') {
        updates.isOn = false
        updates.currentPower = 0
        updates.current = 0
      }

      if (Object.keys(updates).length > 0) {
        await prisma.device.updateMany({
          where: { id: { in: deviceIds } },
          data: updates
        })
      }

      io.emit('batch_command', { deviceIds, command })
      res.json({ success: true, affected: devices.length })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Get all devices
  router.get('/', async (req, res) => {
    try {
      const devices = await prisma.device.findMany({
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
      res.json(devices)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Get device by ID
  router.get('/:id', async (req, res) => {
    try {
      const device = await prisma.device.findUnique({
        where: { id: req.params.id },
        include: {
          room: {
            include: {
              floor: {
                include: {
                  building: true
                }
              }
            }
          },
          usageData: {
            orderBy: { timestamp: 'desc' },
            take: 100
          }
        }
      })

      if (!device) {
        return res.status(404).json({ error: 'Device not found' })
      }

      res.json(device)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Create device
  router.post('/', async (req, res) => {
    try {
      const { roomId, name, type = 'shelly1pmgen4' } = req.body
      const deviceId = `shelly1pmg4-${uuidv4().slice(0, 8)}`
      const mqttTopic = `shellies/${deviceId}`

      const device = await prisma.device.create({
        data: {
          roomId,
          deviceId,
          name,
          type,
          mqttTopic,
          status: 'OFFLINE'
        },
        include: {
          room: true
        }
      })

      io.emit('device_created', device)
      res.status(201).json(device)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Update device
  router.put('/:id', async (req, res) => {
    try {
      const updates = req.body
      
      const device = await prisma.device.update({
        where: { id: req.params.id },
        data: updates,
        include: {
          room: true
        }
      })

      io.emit('device_updated', device)
      res.json(device)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Control device
  router.post('/:id/control', async (req, res) => {
    try {
      const { command } = req.body
      const device = await prisma.device.findUnique({
        where: { id: req.params.id }
      })

      if (!device) {
        return res.status(404).json({ error: 'Device not found' })
      }

      // Send MQTT command
      const commandTopic = `shellies/${device.deviceId}/command`
      mqttBroker.publish(commandTopic, command)

      // Update device state
      let updates = {}
      if (command === 'on') {
        updates.isOn = true
      } else if (command === 'off') {
        updates.isOn = false
        updates.currentPower = 0
        updates.current = 0
      } else if (command === 'toggle') {
        updates.isOn = !device.isOn
      }

      if (Object.keys(updates).length > 0) {
        await prisma.device.update({
          where: { id: req.params.id },
          data: updates
        })
      }

      io.emit('device_command', { deviceId: device.id, command })
      res.json({ success: true, command })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Get device usage data
  router.get('/:id/usage', async (req, res) => {
    try {
      const { from, to, limit = 100 } = req.query
      
      const where = { deviceId: req.params.id }
      if (from || to) {
        where.timestamp = {}
        if (from) where.timestamp.gte = new Date(from)
        if (to) where.timestamp.lte = new Date(to)
      }

      const usageData = await prisma.usageData.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: parseInt(limit)
      })

      res.json(usageData)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Delete device
  router.delete('/:id', async (req, res) => {
    try {
      await prisma.device.delete({
        where: { id: req.params.id }
      })

      io.emit('device_deleted', req.params.id)
      res.status(204).send()
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })


  return router
}

module.exports = deviceRoutes