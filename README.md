# FloodSense - Urban Flood Nowcasting System (Drainage and Rainfall Coupling)

FloodSense is a real-time disaster management and decision-support web application that predicts urban flooding **0–3 hours in advance**. By coupling real-time precipitation radar trends, directed graph hydraulics of drainage pipe networks, Digital Elevation Models (DEM), and geotagged citizen reports, FloodSense triggers location-based emergency notifications before flooding occurs and provides flood-safe navigation routes.

---

## Key Features

1. **0–3 Hour Nowcasting Engine**: Calculates instant flood probability (%), estimated water depth (cm), and expected time to flooding across prediction intervals (`NOW`, `+30m`, `+60m`, `+90m`, `+120m`, `+180m`).
2. **Coupled Hydrological & Graph Hydraulics Engine**:
   - Models the urban drainage system as a directed graph (Inlet, Manhole, Pump Station, and Outlet nodes connected by pipes/channels).
   - Computes pipe flow volume vs maximum capacity ($Utilization \% = \frac{\text{Current Flow}}{\text{Capacity}} \times 100$).
   - Detects pipe overloads ($>100\%$) and surface overflow surcharges ($>120\%$).
3. **Transparent Weighted Risk Model**:
   $$RiskScore = w_r \cdot Rainfall + w_d \cdot DrainageOverload + w_t \cdot Terrain + w_h \cdot HistRisk + w_c \cdot LiveReports$$
4. **Interactive GIS Map**: Visualizes multi-layer geospatial data:
   - Flood Risk Zone Polygons (Green $\rightarrow$ Yellow $\rightarrow$ Orange $\rightarrow$ Red)
   - Drainage Directed Network (Pipes color-coded by capacity utilization)
   - Roads (Open vs Blocked vs Flooded)
   - Emergency Facilities (Hospitals, Relief Shelters, Fire Stations)
   - Citizen Geotagged Flood Reports
5. **Safety-First Navigation Router**: Dijkstra pathfinding algorithm prioritizing safety over shortest distance. Automatically bypasses flooded underpasses ($>15\text{ cm}$ water depth) and emergency road closures.
6. **Multi-Channel Alerting System**:
   - Native HTML5 Browser Push Notifications
   - Web Audio Siren & Priority In-App Banner Toasts
   - Geofenced alerts ($<2\text{ km}$ radius for Critical Evacuation, $<5\text{ km}$ radius for Warning)
   - SMS (Twilio JSON gateway) & Email (SMTP payload) log queue
7. **Emergency Authority Command Center**:
   - Live City Command Map & Pump Station Manual Overrides (Auxiliary Pump activation)
   - Road Blockage Management (Toggle road closures dynamically)
   - Canvas/SVG Analytics (Rainfall vs Time, Risk Curves, Drainage Flow vs Pipe Capacity)
8. **Flood Simulator**: Native interactive simulation bar allowing evaluators to simulate **Heavy Rainfall**, **Drainage Blockages**, **Cloudburst Events**, or run an automated 5-step demonstration scenario.

---

## Role-Based Access

- **Citizen View**: View safety status, 0-3h nowcast timeline, nearby affected roads, request safe navigation routes, submit geotagged flood reports, and view alert history.
- **Emergency Authority (Admin)**: View city-wide command KPIs, override pump stations, block/unblock roads, broadcast emergency notices, and review hydrological capacity analytics.

---

## System Architecture

```
Rainfall/Radar Data  ──►  Data Processing Layer  ◄──  DEM & Slope Terrain
                                  │
                                  ▼
                          Drainage Graph Model
                     (Pipe Flow & Overflow Surcharge)
                                  │
                                  ▼
                     Hydrological Prediction Engine
                  (0-3h Nowcast & Weighted Risk Model)
                                  │
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
  Interactive GIS Map   Notification Dispatcher   Safe Route Navigation
         │                        │                        │
         └────────────────────────┴────────────────────────┘
                                  │
                                  ▼
                         User & Admin Dashboards
```

---

## Technology Stack

- **Frontend**: HTML5, CSS3 (Glassmorphism Dark Theme), JavaScript (ES6+), Leaflet GIS, Google Fonts (Inter, Outfit), Canvas Analytics.
- **Backend**: Node.js HTTP Server, REST APIs, Server-Sent Events (SSE) for multi-window real-time synchronization.
- **Data & Hydraulics**: Graph algorithms, Dijkstra safety pathfinder, synthetic DEM dataset for Pune Metropolitan Area (Wakad, Baner, Aundh, Hinjewadi, Shivajinagar, Kothrud, Pashan, Viman Nagar).

---

## Getting Started & Running Locally

### Prerequisites
- Node.js v16+ installed.

### Quick Start Commands

```bash
# 1. Navigate to the project folder
cd C:\Users\Lenovo\.gemini\antigravity\scratch\floodsense

# 2. Run the Node.js server
node server.js
```

Open your browser and navigate to:
**`http://localhost:3000`**

---

## API Endpoints

- `GET /api/state`: Retrieve current city hydrological state and prediction scores.
- `POST /api/state`: Trigger simulation state updates (rainfall multiplier, channel blockages, pump overrides).
- `GET /api/events`: Server-Sent Events (SSE) endpoint for real-time live data streaming.

---

## Demo Walkthrough

1. Open `http://localhost:3000`. Observe baseline **SAFE** status (Rainfall 15 mm/hr).
2. Click **"🌧️ Heavy Rainfall"** in the top Flood Simulator bar.
   - Rainfall surges to 78 mm/hr.
   - Wakad zone turns **HIGH** risk (Orange) on the GIS map.
   - 0-3h nowcast timeline predicts 18cm water depth in +60 mins.
3. Click **"🚫 Drain Blockage"**.
   - Wakad-Baner trunk channel utilization exceeds 135%.
   - Wakad risk score jumps to **CRITICAL** (Red) with 28cm water depth.
   - Audio siren & browser push notification trigger immediately.
4. Click **"🛣️ Safe Navigation"** tab.
   - Select destination **Shivajinagar Station**.
   - Observe red crossed-out path for flooded Wakad Underpass (28cm depth) and green safe path via Pashan Hill Ridge (Elevation 574m).
5. Switch to **"🛡️ Emergency Authority"** role.
   - View command center KPIs.
   - Click **"🟢 ACTIVATE AUX PUMP"** on Wakad Underpass Pump Station #1 to relieve surface surcharge.

---

## Safety & Decision Support Notice

> **IMPORTANT**: FloodSense provides decision-support predictions based on coupled hydrological graph modeling, radar rainfall trends, and DEM terrain analysis. It is intended for early warning and operational planning, not a replacement for official district collectorate disaster response orders.
