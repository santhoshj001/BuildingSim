# AIoT Building Simulator

A comprehensive simulation system for Shelly 1PM Gen 4 smart switches in a hostel building environment. Features real-time MQTT communication, realistic power consumption patterns, and a simple web interface for device management.

## 🏗️ Architecture

This system uses **MQTT as a single source of truth** for real-time device data, with a simple HTML frontend and Express.js backend. See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed technical documentation.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation
```bash
# Clone and install dependencies
npm install

# Setup database
npm run db:push
npm run db:seed

# Start development server
npm run server:dev
```

### Access the Application
- **Web Interface**: http://localhost:3001
- **MQTT Broker**: localhost:1883 (TCP) / localhost:8083 (WebSocket)
- **API**: http://localhost:3001/api

## 🎮 Using the System

### Web Interface Controls

#### Simulation Control
- **▶️ Start Simulation**: Connects all 23 device simulators to MQTT broker
- **⏹️ Stop Simulation**: Disconnects all simulators and sets devices offline
- **🔄 Refresh**: Updates the UI with current device states

#### Device Control
- **💡 All On**: Turns on all online devices
- **💡 All Off**: Turns off all online devices
- **Individual Controls**: Each device card has On/Off/Toggle buttons

#### Real-time Monitoring
- **Power Consumption**: Live watts display per device
- **Voltage/Current**: Real-time electrical measurements
- **Temperature**: Device temperature simulation
- **Energy Totals**: Accumulated kWh consumption

### API Usage

#### Device Management
```bash
# Get all devices
curl http://localhost:3001/api/devices

# Get specific device
curl http://localhost:3001/api/devices/{device-id}

# Control device
curl -X POST http://localhost:3001/api/devices/{device-id}/control \
  -H "Content-Type: application/json" \
  -d '{"command": "on"}'

# Batch control
curl -X POST http://localhost:3001/api/devices/batch/control \
  -H "Content-Type: application/json" \
  -d '{"deviceIds": ["id1", "id2"], "command": "off"}'
```

#### Simulation Control
```bash
# Start simulation
curl -X POST http://localhost:3001/api/simulation/start \
  -H "Content-Type: application/json" \
  -d '{"buildingId": "building-uuid"}'

# Stop simulation
curl -X POST http://localhost:3001/api/simulation/stop \
  -H "Content-Type: application/json" \
  -d '{}'

# Get simulation status
curl http://localhost:3001/api/simulation/status
```

## 🏠 Building Structure

### Demo Building: University Hostel Block A

#### Ground Floor (6 rooms)
- Reception - Office equipment (~180-400W)
- Common Lounge - Lighting + fans (~100-400W)  
- Kitchen - Appliances (~600-4500W)
- Laundry Room - Washing machines (~100-600W)
- Study Room - Lighting + computers (~100-650W)
- Ground Floor Bathroom - Water heater (~200-1800W)

#### Second Floor (8 rooms)
- Room 201-205 - Student bedrooms (~60-280W each)
- Bathroom 2A, 2B - Water heaters (~200-1800W each)
- Hallway - Emergency lighting (~20-120W)

#### Third Floor (9 rooms)
- Room 301-306 - Student bedrooms (~60-280W each)
- Bathroom 3A, 3B - Water heaters (~200-1800W each)
- Hallway - Emergency lighting (~20-120W)

**Total**: 23 devices across 3 floors

## ⚡ Power Simulation Features

### Realistic Consumption Patterns
Each device simulates authentic power usage based on room type:

- **Bedrooms**: LED lights, fans, chargers, laptops (35-350W)
- **Bathrooms**: Water heaters, exhaust fans, lighting (5-2200W)
- **Kitchen**: Refrigerator, microwave, induction cooktop (80-5500W)
- **Common Areas**: Lighting, fans, TV, charging stations (45-800W)
- **Hallways**: Emergency lighting, motion sensors (8-150W)

### Time-Based Usage
- **Peak Hours** (6-9 AM, 6-11 PM): Full consumption
- **Off-Peak** (11 PM - 6 AM): 30% reduced usage
- **Day Hours** (9 AM - 6 PM): 60% usage (some students out)

### Electrical Properties
- **Voltage**: 225-235V with realistic variations
- **Current**: Calculated using P=VI with power factor simulation
- **Temperature**: Correlated with power load + ambient cycles
- **Energy**: Accurate kWh accumulation over time

## 🛠️ Development

### Project Structure
```
├── server/
│   ├── index.js              # Main Express server
│   ├── api/                  # REST API routes
│   │   ├── buildings.js      # Building management
│   │   ├── devices.js        # Device control (MQTT-based)
│   │   └── simulation.js     # Simulation control
│   ├── mqtt/
│   │   └── broker.js         # Aedes MQTT broker
│   ├── simulators/
│   │   └── shelly1pm.js      # Shelly device simulator
│   └── seed.js               # Database seeder
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── dev.db                # SQLite database
├── public/
│   └── index.html            # Simple web interface
└── ARCHITECTURE.md           # Technical documentation
```

### Scripts
- `npm run server:dev` - Development server with auto-reload
- `npm start` - Production server
- `npm run db:push` - Apply database schema changes
- `npm run db:seed` - Seed database with demo data

### Database Schema
- **Buildings**: Hostel blocks
- **Floors**: Building floors
- **Rooms**: Individual rooms with types
- **Devices**: Shelly devices assigned to rooms

## 🔧 Configuration

### Environment Variables
```bash
# MQTT Configuration
MQTT_BROKER_PORT=1883        # MQTT TCP port
MQTT_WS_PORT=8083            # MQTT WebSocket port

# Server Configuration
API_PORT=3001                # Express server port
NODE_ENV=development         # Environment mode
```

### Customization

#### Add New Room Types
Edit `server/simulators/shelly1pm.js`:
```javascript
consumptionPatterns: {
  newRoomType: {
    min: 50, max: 500, typical: 200, peak: 600
  }
}
```

#### Modify Time Patterns
Adjust `timePatterns.getCurrentTimeMultiplier()` in the simulator.

#### Change Building Structure
Update `server/seed.js` and run `npm run db:seed`.

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:3001/api/health
# Returns: {"status":"ok","mqtt":{"clients":24}}
```

### Real-time MQTT Messages
Monitor the console output for live MQTT message logging:
```
Message from shelly1pmg4-abc123 on shellies/shelly1pmg4-abc123/status:
{"power":185.4,"current":0.8,"voltage":231.2,"temperature":26.1}
```

### Device State Inspection
```bash
# Check device cache status
curl http://localhost:3001/api/devices | jq '.[0]'

# Monitor specific device
curl http://localhost:3001/api/devices/{device-id} | jq '{name, isOn, currentPower, status}'
```

## 🚨 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Kill processes on MQTT/API ports
lsof -ti:1883 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

#### Devices Not Connecting
1. Check MQTT broker is running (should see "MQTT broker listening" in logs)
2. Verify no firewall blocking ports 1883/8083
3. Restart simulation: Stop → Start

#### UI Not Updating
1. Check browser console for errors
2. Verify WebSocket connection to port 3001
3. Try hard refresh (Ctrl+F5)

#### Database Issues
```bash
# Reset database
rm prisma/dev.db
npm run db:push
npm run db:seed
```

### Debug Mode
For detailed MQTT message logging:
```bash
DEBUG=aedes* npm run server:dev
```

## 🤝 Contributing

1. Follow the existing code style
2. Test changes with the demo building setup
3. Update documentation for new features
4. Ensure MQTT message compatibility

## 📄 License

MIT License - see LICENSE file for details.

## 🙋‍♂️ Support

For issues or questions:
1. Check the [ARCHITECTURE.md](./ARCHITECTURE.md) documentation
2. Review the troubleshooting section above
3. Check console logs for error messages
4. Create an issue with reproduction steps