# AIoT Building Simulator

A comprehensive IoT simulator for hostel/building management with Shelly 1PM Gen 4 device simulation using MQTT protocol.

## 🚀 Features

- **Real-time Device Simulation**: Accurate Shelly 1PM Gen 4 behavior with MQTT
- **Building Management**: Configure multi-floor buildings with customizable rooms
- **Interactive Dashboard**: Monitor power consumption, device status, and analytics
- **Visual Building Layout**: React Flow-based floor plans with device controls
- **Batch Device Control**: Control multiple devices simultaneously
- **Real-time Updates**: WebSocket and MQTT integration for live data
- **Energy Analytics**: Track power consumption patterns and usage history
- **Responsive UI**: Modern Ant Design interface

## 🛠 Tech Stack

### Backend
- **Node.js** with Express.js
- **Aedes** - Embedded MQTT broker
- **MQTT.js** - MQTT client library
- **Prisma** - Database ORM with SQLite
- **Socket.io** - Real-time communication

### Frontend
- **Next.js 14** with TypeScript
- **Ant Design** - UI components
- **React Flow** - Interactive building layouts
- **Apache ECharts** - Data visualization
- **Zustand** - State management
- **Tailwind CSS** - Styling

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn

## 🚀 Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Setup Database**
   ```bash
   npm run db:push
   npm run db:seed
   ```

3. **Start Development**
   ```bash
   npm run dev
   ```

4. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - MQTT Broker: mqtt://localhost:1883
   - MQTT WebSocket: ws://localhost:8083

## 🏗 Architecture

### MQTT Topics Structure
- `shellies/[device_id]/status` - Device status updates
- `shellies/[device_id]/command` - Device commands (on/off/toggle)
- `shellies/[device_id]/telemetry` - Real-time telemetry data
- `shellies/[device_id]/config` - Device configuration
- `[device_id]/rpc` - RPC commands (Gen4 format)

### Database Schema
- **Buildings** → **Floors** → **Rooms** → **Devices**
- **UsageData** - Historical power consumption data

### API Endpoints
- `GET/POST /api/buildings` - Building management
- `GET/POST /api/devices` - Device operations
- `POST /api/devices/:id/control` - Device control
- `POST /api/simulation/start` - Start simulation
- `POST /api/simulation/stop` - Stop simulation

## 🎮 Usage

### 1. Create a Building
- Go to Settings → Buildings
- Click "Create Sample Building" for a pre-configured hostel
- Or create custom buildings with floors and rooms

### 2. Start Simulation
- Click "Start Simulation" in the header
- Devices will come online and start generating realistic power data
- Monitor real-time updates in Dashboard

### 3. Control Devices
- **Dashboard**: Overview of all devices and power consumption
- **Building View**: Visual floor plans with device controls
- **Device Control**: Batch operations and detailed device management

### 4. Monitor Analytics
- Real-time power consumption charts
- Energy usage patterns by room type
- Device status and temperature monitoring

## 🔧 Configuration

### Environment Variables
```bash
DATABASE_URL="file:./dev.db"
MQTT_BROKER_PORT=1883
MQTT_WS_PORT=8083
API_PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_MQTT_WS_URL=ws://localhost:8083
```

### Power Consumption Patterns
Customize in Settings → Simulation:
- **Bedroom**: 10-150W
- **Bathroom**: 0-2000W (heating elements)
- **Kitchen**: 50-3500W (appliances)
- **Common Room**: 20-500W
- **Hallway**: 5-60W

## 🌟 Key Features Detail

### Shelly 1PM Gen 4 Simulation
- Accurate MQTT message format
- Realistic power consumption patterns
- Temperature simulation with load correlation
- Energy accumulation tracking
- Status reporting (online/offline/error)

### Real-time Updates
- Live power consumption graphs
- Instant device status changes
- WebSocket integration for browser clients
- MQTT pub/sub for device communication

### Building Visualization
- Interactive floor plans
- Drag-and-drop room layout
- Visual device status indicators
- Room type-specific icons

### Analytics Dashboard
- Power consumption trends
- Device utilization statistics
- Room type distribution
- Energy cost calculations

## 🚦 Development

### Available Scripts
- `npm run dev` - Start development servers
- `npm run server:dev` - Backend only
- `npm run client:dev` - Frontend only
- `npm run build` - Production build
- `npm run start` - Production server
- `npm run db:push` - Update database schema
- `npm run db:seed` - Populate with sample data

### Project Structure
```
├── app/                    # Next.js frontend
│   ├── components/         # React components
│   ├── store/             # Zustand store
│   └── globals.css        # Global styles
├── server/                # Backend
│   ├── api/               # API routes
│   ├── mqtt/              # MQTT broker
│   ├── simulators/        # Device simulators
│   └── index.js           # Main server
├── prisma/                # Database schema
└── public/                # Static assets
```

## 🐛 Troubleshooting

**MQTT Connection Issues**
- Check if ports 1883 and 8083 are available
- Verify firewall settings
- Check browser WebSocket support

**Database Issues**
- Run `npm run db:push` to update schema
- Delete `prisma/dev.db` and re-seed for fresh start

**Performance Issues**
- Limit number of simultaneous devices (< 50 for development)
- Adjust telemetry intervals in simulation settings

## 📈 Future Enhancements

- [ ] Historical data export (CSV/Excel)
- [ ] Email/SMS alerts for device failures
- [ ] Integration with real Shelly devices
- [ ] Multi-tenant support
- [ ] Advanced scheduling and automation
- [ ] Energy cost calculations with tariff support

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Shelly API Documentation](https://shelly-api-docs.shelly.cloud/)
- [Aedes MQTT Broker](https://github.com/moscajs/aedes)
- [Ant Design](https://ant.design/)
- [React Flow](https://reactflow.dev/)

---

**Happy Simulating!** 🏠⚡️