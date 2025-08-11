const { Router } = require('express')

function buildingRoutes(prisma, mqttBroker, io) {
  const router = Router()

  // Get all buildings
  router.get('/', async (req, res) => {
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
      res.json(buildings)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Get single building
  router.get('/:id', async (req, res) => {
    try {
      const building = await prisma.building.findUnique({
        where: { id: req.params.id },
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
      
      res.json(building)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Create building with floors and rooms
  router.post('/', async (req, res) => {
    try {
      const { name, description, address, floors } = req.body

      const building = await prisma.building.create({
        data: {
          name,
          description,
          address,
          floors: {
            create: floors.map(floor => ({
              floorNumber: floor.floorNumber,
              name: floor.name,
              rooms: {
                create: floor.rooms.map(room => ({
                  roomNumber: room.roomNumber,
                  name: room.name,
                  type: room.type
                }))
              }
            }))
          }
        },
        include: {
          floors: {
            include: {
              rooms: true
            }
          }
        }
      })

      io.emit('building_created', building)
      res.status(201).json(building)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Update building
  router.put('/:id', async (req, res) => {
    try {
      const { name, description, address } = req.body

      const building = await prisma.building.update({
        where: { id: req.params.id },
        data: { name, description, address },
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

      io.emit('building_updated', building)
      res.json(building)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Delete building
  router.delete('/:id', async (req, res) => {
    try {
      await prisma.building.delete({
        where: { id: req.params.id }
      })
      
      io.emit('building_deleted', req.params.id)
      res.status(204).send()
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Add floor to building
  router.post('/:id/floors', async (req, res) => {
    try {
      const { floorNumber, name, rooms } = req.body

      const floor = await prisma.floor.create({
        data: {
          buildingId: req.params.id,
          floorNumber,
          name,
          rooms: {
            create: rooms.map(room => ({
              roomNumber: room.roomNumber,
              name: room.name,
              type: room.type
            }))
          }
        },
        include: {
          rooms: true
        }
      })

      io.emit('floor_created', floor)
      res.status(201).json(floor)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  return router
}

module.exports = buildingRoutes