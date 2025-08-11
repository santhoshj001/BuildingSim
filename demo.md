# 🎮 AIoT Simulator Demo

## 🚀 Getting Started

Your AIoT Building Simulator is now running! Here's how to test it:

### 1. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api/health

### 2. Quick Demo Steps

#### Step 1: View the Dashboard
1. Open http://localhost:3000
2. You'll see the main dashboard with 4 key metrics cards
3. The sample building "University Hostel Block A" is already loaded

#### Step 2: Start the Simulation
1. Click the **"Start Simulation"** button in the header
2. Watch as devices come online (Online Devices counter increases)
3. Power consumption will start appearing in real-time charts

#### Step 3: Explore Building View
1. Click **"Building View"** in the sidebar
2. Select "University Hostel Block A" from the dropdown
3. Choose any floor (Ground Floor, Second Floor, Third Floor)
4. See interactive room layout with device controls
5. Click device **"ON/OFF"** buttons to control individual rooms

#### Step 4: Control Devices
1. Go to **"Device Control"** tab
2. Select multiple devices using checkboxes
3. Use **"Turn On Selected"** or **"Turn Off Selected"** for batch control
4. Watch real-time power changes in the dashboard

#### Step 5: Configuration
1. Visit **"Settings"** tab
2. Create additional buildings if needed
3. Adjust power consumption patterns
4. Configure MQTT settings

## 🔧 Testing Features

### MQTT Testing (Optional)
If you have an MQTT client (like MQTT Explorer):
```
Host: localhost
Port: 1883
Topics to subscribe:
- shellies/+/status
- shellies/+/telemetry
```

### API Testing
Test the REST API:
```bash
# Get all buildings
curl http://localhost:3001/api/buildings

# Get all devices  
curl http://localhost:3001/api/devices

# Control a device (replace {id} with actual device ID)
curl -X POST http://localhost:3001/api/devices/{id}/control \
  -H "Content-Type: application/json" \
  -d '{"command": "on"}'
```

## 📊 What You'll See

### Real-time Features:
- ⚡ **Live power consumption** graphs updating every 5 seconds
- 🏠 **Device status** changes in real-time across all views
- 🌡️ **Temperature simulation** based on power load
- 📈 **Energy accumulation** tracking over time

### Room Types & Power Patterns:
- **Bedrooms**: 10-150W (typical usage)
- **Bathrooms**: 0-2000W (heating elements)
- **Kitchen**: 50-3500W (high-power appliances) 
- **Common Areas**: 20-500W (lighting, TVs)
- **Hallways**: 5-60W (minimal lighting)

### Interactive Elements:
- 🔄 **Toggle individual devices** from building view
- ✅ **Batch control** multiple devices
- 📋 **Filter and search** devices
- 📊 **Real-time charts** and statistics

## 🐛 Troubleshooting

**If something doesn't work:**

1. **Check browser console** for errors
2. **Refresh the page** - sometimes WebSocket connections need reset  
3. **Restart simulation** - click Stop → Start Simulation
4. **Check ports** - make sure 3000, 3001, 1883, 8083 are free

**Common issues:**
- If devices don't appear: Wait 10-15 seconds for database sync
- If graphs don't update: Check browser WebSocket support
- If MQTT doesn't work: Try different ports in .env file

## 🎯 Key Features Demonstrated

✅ **MQTT Protocol Integration** - Real Shelly 1PM Gen 4 message format
✅ **Real-time Updates** - WebSocket + MQTT pub/sub architecture  
✅ **Interactive Building Visualization** - React Flow floor plans
✅ **Comprehensive Device Control** - Individual and batch operations
✅ **Power Analytics** - Live consumption tracking with patterns
✅ **Modern UI/UX** - Responsive Ant Design interface
✅ **Scalable Architecture** - SQLite → PostgreSQL ready
✅ **Developer Friendly** - Complete API, documentation, extensible

---

**Enjoy exploring your IoT building simulator!** 🏠⚡️

For questions or issues, check the README.md or create an issue in the repository.