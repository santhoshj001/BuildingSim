const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create a sample building
  const building = await prisma.building.create({
    data: {
      name: 'University Hostel Block A',
      description: 'Modern 3-floor hostel building with 20 rooms',
      address: '123 Campus Drive, University City',
      floors: {
        create: [
          {
            floorNumber: 1,
            name: 'Ground Floor',
            rooms: {
              create: [
                { roomNumber: '101', name: 'Reception', type: 'common' },
                { roomNumber: '102', name: 'Common Lounge', type: 'common' },
                { roomNumber: '103', name: 'Kitchen', type: 'kitchen' },
                { roomNumber: '104', name: 'Laundry Room', type: 'common' },
                { roomNumber: '105', name: 'Study Room', type: 'common' },
                { roomNumber: '106', name: 'Ground Floor Bathroom', type: 'bathroom' }
              ]
            }
          },
          {
            floorNumber: 2,
            name: 'Second Floor',
            rooms: {
              create: [
                { roomNumber: '201', name: 'Room 201', type: 'bedroom' },
                { roomNumber: '202', name: 'Room 202', type: 'bedroom' },
                { roomNumber: '203', name: 'Room 203', type: 'bedroom' },
                { roomNumber: '204', name: 'Room 204', type: 'bedroom' },
                { roomNumber: '205', name: 'Room 205', type: 'bedroom' },
                { roomNumber: '206', name: 'Bathroom 2A', type: 'bathroom' },
                { roomNumber: '207', name: 'Bathroom 2B', type: 'bathroom' },
                { roomNumber: '208', name: 'Hallway', type: 'hallway' }
              ]
            }
          },
          {
            floorNumber: 3,
            name: 'Third Floor',
            rooms: {
              create: [
                { roomNumber: '301', name: 'Room 301', type: 'bedroom' },
                { roomNumber: '302', name: 'Room 302', type: 'bedroom' },
                { roomNumber: '303', name: 'Room 303', type: 'bedroom' },
                { roomNumber: '304', name: 'Room 304', type: 'bedroom' },
                { roomNumber: '305', name: 'Room 305', type: 'bedroom' },
                { roomNumber: '306', name: 'Room 306', type: 'bedroom' },
                { roomNumber: '307', name: 'Bathroom 3A', type: 'bathroom' },
                { roomNumber: '308', name: 'Bathroom 3B', type: 'bathroom' },
                { roomNumber: '309', name: 'Hallway', type: 'hallway' }
              ]
            }
          }
        ]
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

  console.log('✅ Created building:', building.name)

  // Create devices for each room
  const allRooms = building.floors.flatMap(floor => floor.rooms)
  
  for (const room of allRooms) {
    const deviceId = `shelly1pmg4-${room.id.slice(0, 8)}`
    
    await prisma.device.create({
      data: {
        roomId: room.id,
        deviceId,
        name: `${room.name} Switch`,
        type: 'shelly1pmgen4',
        mqttTopic: `shellies/${deviceId}`,
        status: 'OFFLINE',
        isOn: false,
        currentPower: 0,
        voltage: 230,
        current: 0,
        temperature: 25,
        energyTotal: 0
      }
    })
  }

  console.log('✅ Created devices for all rooms')

  // Generate some sample usage data
  const devices = await prisma.device.findMany()
  const now = new Date()
  
  for (const device of devices.slice(0, 5)) { // Only for first 5 devices to keep it reasonable
    for (let i = 0; i < 24; i++) {
      const timestamp = new Date(now.getTime() - (i * 60 * 60 * 1000)) // Last 24 hours
      const power = Math.random() * 100 + 10 // Random power between 10-110W
      
      await prisma.usageData.create({
        data: {
          deviceId: device.id,
          timestamp,
          power,
          energy: power / 60, // Convert to Wh
          voltage: 230 + (Math.random() - 0.5) * 10,
          current: power / 230,
          temperature: 25 + Math.random() * 15
        }
      })
    }
  }

  console.log('✅ Generated sample usage data')
  console.log('🎉 Database seeded successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })