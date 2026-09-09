/**
 * FloodSense - Main Frontend Application Orchestrator
 * Connects GIS Map (OpenStreetMap), Prediction Engine, Drainage Hydraulics, Routing, Alerts, & Simulation Controls
 */

window.FloodSenseApp = {
    // App State
    state: {
        activeRole: "citizen", // "citizen" | "admin"
        activeTab: "dashboard", // "dashboard" | "map" | "routes" | "reports" | "alerts" | "admin_command" | "admin_analytics"
        globalRainfallMultiplier: 1.0,
        rainfallTrend: "RISING", // "RISING" | "CLOUDBURST" | "SUBSIDING"
        blockedEdgeIds: [],
        adminBlockedRoadIds: [],
        pumpOverrides: {},
        citizenReports: [
            {
                id: "rep-101",
                zoneId: "zone-wakad",
                waterDepthCm: 25,
                description: "Water accumulation near Wakad Flyover underpass. Vehicles struggling.",
                severity: "HIGH",
                coords: [18.5960, 73.7620],
                timestamp: new Date(Date.now() - 15 * 60000).toISOString()
            }
        ],
        userLocation: window.FLOODSENSE_DATA.defaultUserLocation,
        selectedDestination: "zone-shivajinagar",
        activeSimulationScenarioStep: 0,
        simulationTimer: null
    },

    // Processed Results Cache
    computed: {
        graphState: null,
        zoneRiskMap: {},
        userZoneResult: null,
        routeResult: null,
        nearestZone: null
    },

    /**
     * App Initialization
     */
    init: function() {
        console.log("Initializing FloodSense Urban Flood Nowcasting System (OpenStreetMap)...");

        // Setup Notification permission
        window.NotificationEngine.requestPermission();

        // Attempt Browser Geolocation API
        this.detectUserLocation();

        // Bind DOM Event Listeners
        this.bindEvents();

        // Initial Data Processing & Render
        this.recalculateState();
        this.renderAllViews();

        // Start Periodic Real-Time Simulation Loop (Tick every 3 seconds)
        setInterval(() => {
            this.recalculateState();
            this.updateRealtimeUI();
        }, 3000);

        // Connect to Backend SSE Event Stream if available
        this.initSSEConnection();
    },

    /**
     * Browser Geolocation API Integration
     */
    detectUserLocation: function() {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    // Find nearest zone from demo dataset
                    const nearestZone = this.findNearestZone([lat, lng]);
                    
                    this.state.userLocation = {
                        name: "Your Location (Live GPS)",
                        coords: [lat, lng],
                        zoneId: nearestZone ? nearestZone.id : "zone-wakad",
                        alertRadiusKm: 2.0
                    };
                    
                    this.computed.nearestZone = nearestZone;
                    this.showBannerToast(`📍 Live GPS Location detected: [${lat.toFixed(4)}, ${lng.toFixed(4)}]. Nearest zone: ${nearestZone.name}`);
                    this.recalculateState();
                    this.renderAllViews();
                },
                (err) => {
                    console.warn("Geolocation API fallback to demo coordinates:", err.message);
                    this.computed.nearestZone = window.FLOODSENSE_DATA.zones[0];
                },
                { timeout: 8000, enableHighAccuracy: true }
            );
        } else {
            this.computed.nearestZone = window.FLOODSENSE_DATA.zones[0];
        }
    },

    /**
     * Calculate Nearest Flood Zone from Coordinates
     */
    findNearestZone: function(coords) {
        const zones = window.FLOODSENSE_DATA.zones;
        let minDistance = Infinity;
        let nearest = zones[0];

        zones.forEach(zone => {
            const dist = Math.hypot(zone.center[0] - coords[0], zone.center[1] - coords[1]);
            if (dist < minDistance) {
                minDistance = dist;
                nearest = zone;
            }
        });

        return nearest;
    },

    /**
     * Recalculate Hydrological & Graph Hydraulics State
     */
    recalculateState: function() {
        const data = window.FLOODSENSE_DATA;

        // 1. Process Drainage Directed Graph
        this.computed.graphState = window.DrainageGraphEngine.processGraphState(
            data.drainageEdges,
            data.drainageNodes,
            this.state.globalRainfallMultiplier,
            this.state.blockedEdgeIds,
            this.state.pumpOverrides
        );

        // 2. Process Zone Flood Risk Scores (Prediction Engine)
        this.computed.zoneRiskMap = {};
        data.zones.forEach(zone => {
            const util = this.computed.graphState.zoneUtilization[zone.id] || 40;
            this.computed.zoneRiskMap[zone.id] = window.PredictionEngine.calculateZoneRisk(
                zone,
                util,
                this.state.citizenReports,
                this.state.globalRainfallMultiplier
            );
        });

        // 3. Find Nearest Zone if not already calculated
        if (!this.computed.nearestZone) {
            this.computed.nearestZone = this.findNearestZone(this.state.userLocation.coords);
        }

        // 4. User Geofenced Zone Result
        const userZoneId = this.state.userLocation.zoneId || this.computed.nearestZone.id;
        this.computed.userZoneResult = this.computed.zoneRiskMap[userZoneId] || this.computed.zoneRiskMap["zone-wakad"];

        // 5. Recalculate Safe Navigation Route
        this.computed.routeResult = window.RoutingEngine.findSafeRoute(
            this.state.userLocation.coords,
            [18.5308, 73.8474], // Shivajinagar Destination
            data.roads,
            this.computed.zoneRiskMap,
            this.state.adminBlockedRoadIds
        );

        // 6. Evaluate Multi-Channel Alert Engine
        if (this.computed.userZoneResult) {
            window.NotificationEngine.evaluateAndDispatch(
                this.computed.userZoneResult,
                this.state.userLocation.name,
                (toastData) => this.showNotificationToast(toastData)
            );
        }
    },

    /**
     * Bind UI Event Handlers
     */
    bindEvents: function() {
        // Role Switcher Buttons
        document.querySelectorAll("[data-role-switch]").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const role = e.currentTarget.getAttribute("data-role-switch");
                this.switchRole(role);
            });
        });

        // Navigation Tabs
        document.querySelectorAll("[data-nav-tab]").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const tab = e.currentTarget.getAttribute("data-nav-tab");
                this.switchTab(tab);
            });
        });

        // Simulation Controller Buttons
        document.getElementById("btn-sim-heavy-rain")?.addEventListener("click", () => this.triggerSimulationMode("HEAVY_RAINFALL"));
        document.getElementById("btn-sim-drain-block")?.addEventListener("click", () => this.triggerSimulationMode("DRAIN_BLOCKAGE"));
        document.getElementById("btn-sim-cloudburst")?.addEventListener("click", () => this.triggerSimulationMode("CLOUDBURST"));
        document.getElementById("btn-sim-reset")?.addEventListener("click", () => this.triggerSimulationMode("RESET"));
        document.getElementById("btn-sim-tour")?.addEventListener("click", () => this.startScenarioTour());
        
        // GPS Detect Button
        document.getElementById("btn-detect-gps")?.addEventListener("click", () => this.detectUserLocation());

        // Report Flooding Form Submit
        document.getElementById("form-report-flood")?.addEventListener("submit", (e) => {
            e.preventDefault();
            this.submitFloodReport();
        });

        // Route Destination Selector
        document.getElementById("select-destination")?.addEventListener("change", (e) => {
            this.state.selectedDestination = e.target.value;
            this.recalculateState();
            this.renderRouteView();
        });
    },

    /**
     * Role Switcher Handler (Citizen vs Emergency Authority Admin)
     */
    switchRole: function(role) {
        this.state.activeRole = role;
        document.body.setAttribute("data-role", role);

        document.querySelectorAll("[data-role-switch]").forEach(btn => {
            btn.classList.toggle("active", btn.getAttribute("data-role-switch") === role);
        });

        if (role === "admin") {
            this.switchTab("admin_command");
        } else {
            this.switchTab("dashboard");
        }
    },

    /**
     * Navigation Tab Switcher
     */
    switchTab: function(tab) {
        this.state.activeTab = tab;

        document.querySelectorAll("[data-nav-tab]").forEach(btn => {
            btn.classList.toggle("active", btn.getAttribute("data-nav-tab") === tab);
        });

        document.querySelectorAll(".view-section").forEach(sec => {
            sec.style.display = sec.id === `view-${tab}` ? "block" : "none";
        });

        // Re-render GIS Map if switching to Map view
        if (tab === "map" || tab === "admin_command") {
            setTimeout(() => {
                const mapElementId = tab === "admin_command" ? "admin-gis-map" : "citizen-gis-map";
                window.MapManager.initMap(mapElementId, this.state.userLocation.coords, 13);
                this.renderMapLayers();
            }, 100);
        }

        this.renderTabContent(tab);
    },

    /**
     * Trigger Simulation Modes (Simulate Heavy Rainfall, Drain Blockage, Cloudburst, Reset)
     */
    triggerSimulationMode: function(mode) {
        console.log(`Triggering Simulation Mode: ${mode}`);

        if (mode === "HEAVY_RAINFALL") {
            this.state.globalRainfallMultiplier = 5.2; // Surges rainfall to ~78 mm/hr
            this.state.rainfallTrend = "RISING";
            this.showBannerToast("🌧️ Heavy Rainfall Simulation Activated! Rainfall increased to 78 mm/hr. Flood risk updating...");
        } else if (mode === "DRAIN_BLOCKAGE") {
            this.state.blockedEdgeIds = ["edge-w1-w2", "edge-b1-b2"];
            this.showBannerToast("🚫 Drain Blockage Simulation Activated. Trunk channels restricted.");
        } else if (mode === "CLOUDBURST") {
            this.state.globalRainfallMultiplier = 7.5; // Surges rainfall to ~112 mm/hr
            this.state.blockedEdgeIds = ["edge-w1-w2"];
            this.state.rainfallTrend = "CLOUDBURST";
            this.showBannerToast("⚡ CLOUDBURST SIMULATION: Emergency CRITICAL alert triggered!");
        } else if (mode === "RESET") {
            this.state.globalRainfallMultiplier = 1.0;
            this.state.blockedEdgeIds = [];
            this.state.adminBlockedRoadIds = [];
            this.state.pumpOverrides = {};
            this.state.rainfallTrend = "SUBSIDING";
            this.showBannerToast("🔄 System Reset to Baseline Normal Conditions.");
        }

        this.recalculateState();
        this.renderAllViews();
        this.syncWithBackend();
    },

    /**
     * Automated Scenario Presentation Tour
     */
    startScenarioTour: function() {
        this.showBannerToast("⏯️ Starting Demonstration Scenario...");
        this.triggerSimulationMode("RESET");

        let step = 0;
        const steps = [
            { mode: "RESET", desc: "Step 1: Normal Conditions (Rainfall 15 mm/hr, Risk LOW)" },
            { mode: "HEAVY_RAINFALL", desc: "Step 2: Heavy Rainfall Surge (Rainfall 78 mm/hr, Flood Risk HIGH)" },
            { mode: "DRAIN_BLOCKAGE", desc: "Step 3: Trunk Channel Clog (Drainage Overload 135%, Water Depth 28 cm)" },
            { mode: "CLOUDBURST", desc: "Step 4: Cloudburst Event (CRITICAL Alert, Siren & Evacuation Prompt)" },
            { mode: "RESET", desc: "Step 5: Pump Overrides Activated & Drainage Recovery" }
        ];

        if (this.state.simulationTimer) clearInterval(this.state.simulationTimer);

        this.state.simulationTimer = setInterval(() => {
            step++;
            if (step < steps.length) {
                this.showBannerToast(`⏯️ ${steps[step].desc}`);
                this.triggerSimulationMode(steps[step].mode);
            } else {
                clearInterval(this.state.simulationTimer);
                this.showBannerToast("✅ Demonstration Scenario Complete.");
            }
        }, 5000);
    },

    /**
     * Submit Citizen Geotagged Flood Report
     */
    submitFloodReport: function() {
        const depth = parseInt(document.getElementById("report-water-depth")?.value || "20");
        const desc = document.getElementById("report-description")?.value || "Water accumulation on road.";
        const zoneId = document.getElementById("report-zone-select")?.value || "zone-wakad";
        const zone = window.FLOODSENSE_DATA.zones.find(z => z.id === zoneId) || window.FLOODSENSE_DATA.zones[0];

        const newReport = {
            id: `rep-${Date.now()}`,
            zoneId: zoneId,
            waterDepthCm: depth,
            description: desc,
            severity: depth > 30 ? "CRITICAL" : (depth > 15 ? "HIGH" : "MODERATE"),
            coords: [zone.center[0] + (Math.random() - 0.5) * 0.005, zone.center[1] + (Math.random() - 0.5) * 0.005],
            timestamp: new Date().toISOString()
        };

        this.state.citizenReports.unshift(newReport);
        this.showBannerToast(`✅ Flood Report submitted for ${zone.name}. Risk engine recalculated!`);

        document.getElementById("form-report-flood")?.reset();

        this.recalculateState();
        this.renderAllViews();
        this.syncWithBackend();
    },

    /**
     * Render All Active Views
     */
    renderAllViews: function() {
        this.renderUserSafetyHeader();
        this.renderTabContent(this.state.activeTab);
    },

    /**
     * Update Real-Time UI Ticks
     */
    updateRealtimeUI: function() {
        this.renderUserSafetyHeader();
        if (this.state.activeTab === "map" || this.state.activeTab === "admin_command") {
            this.renderMapLayers();
        }
        this.renderNowcastTimeline();
    },

    /**
     * Render Top Safety Status Card
     */
    renderUserSafetyHeader: function() {
        const uRes = this.computed.userZoneResult;
        if (!uRes) return;

        const badgeEl = document.getElementById("user-safety-badge");
        const depthEl = document.getElementById("user-water-depth");
        const rainEl = document.getElementById("user-rainfall-val");
        const probEl = document.getElementById("user-flood-prob");
        const zoneNameEl = document.getElementById("user-zone-name");

        if (badgeEl) {
            badgeEl.className = `status-pill status-${uRes.category.toLowerCase()}`;
            badgeEl.innerHTML = `<span class="pulse-dot"></span> Current Flood Status: <strong>${uRes.category} RISK</strong> (${uRes.riskScore}/100)`;
        }
        if (depthEl) depthEl.textContent = `${uRes.estimatedWaterDepthCm} cm`;
        if (rainEl) rainEl.textContent = `${uRes.rainfallIntensityMmHr} mm/hr`;
        if (probEl) probEl.textContent = `${uRes.floodProbabilityPercent}%`;
        if (zoneNameEl) zoneNameEl.textContent = uRes.zoneName;
    },

    /**
     * Render Specific Tab Content
     */
    renderTabContent: function(tab) {
        if (tab === "dashboard") {
            this.renderCitizenDashboard();
        } else if (tab === "map") {
            this.renderMapLayers();
        } else if (tab === "routes") {
            this.renderRouteView();
        } else if (tab === "reports") {
            this.renderReportsList();
        } else if (tab === "alerts") {
            this.renderAlertsHistory();
        } else if (tab === "admin_command") {
            this.renderAdminCommandCenter();
        } else if (tab === "admin_analytics") {
            this.renderAdminAnalytics();
        }
    },

    /**
     * Render Citizen Main Dashboard View
     */
    renderCitizenDashboard: function() {
        this.renderNowcastTimeline();
        this.renderNearbyAffectedRoads();
    },

    /**
     * Render 0-3 Hour Nowcast Timeline Component
     */
    renderNowcastTimeline: function() {
        const container = document.getElementById("nowcast-timeline-container");
        if (!container || !this.computed.userZoneResult) return;

        const nowcast = window.PredictionEngine.generate0to3HourNowcast(
            this.computed.userZoneResult,
            this.state.rainfallTrend
        );

        let html = `<div class="timeline-slider-grid">`;

        nowcast.forEach(item => {
            let catColor = "#10b981";
            if (item.category === "CRITICAL") catColor = "#ef4444";
            else if (item.category === "HIGH") catColor = "#f97316";
            else if (item.category === "MODERATE") catColor = "#eab308";

            html += `
                <div class="timeline-step-card" style="border-top:3px solid ${catColor};">
                    <div class="timeline-time">${item.label}</div>
                    <div class="timeline-risk-badge" style="color:${catColor};">${item.category} (${item.riskScore}%)</div>
                    <div class="timeline-depth">${item.waterDepthCm} cm water</div>
                    <div class="timeline-rain">${item.predictedRainfallMmHr} mm/hr rain</div>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;

        window.ChartManager.renderNowcastChart("nowcast-chart-canvas", nowcast);
    },

    /**
     * Render Nearby Affected Roads Widget
     */
    renderNearbyAffectedRoads: function() {
        const container = document.getElementById("nearby-roads-list");
        if (!container) return;

        const roads = window.FLOODSENSE_DATA.roads;
        let html = `<div style="display:flex; flex-direction:column; gap:8px;">`;

        roads.forEach(road => {
            const zRisk = this.computed.zoneRiskMap[road.zoneId];
            const isBlocked = this.state.adminBlockedRoadIds.includes(road.id);
            const waterDepth = zRisk ? zRisk.estimatedWaterDepthCm : 0;

            let badge = `<span class="badge badge-low">SAFE / OPEN</span>`;
            if (isBlocked) badge = `<span class="badge badge-critical">BLOCKED BY ADMIN</span>`;
            else if (waterDepth > 15) badge = `<span class="badge badge-critical">FLOODED (${waterDepth} cm)</span>`;
            else if (waterDepth > 5) badge = `<span class="badge badge-high">WATERLOGGED (${waterDepth} cm)</span>`;

            html += `
                <div class="card-item-row" style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong style="color:#f8fafc; font-size:13px;">${road.name}</strong>
                        <div style="font-size:11px; color:#94a3b8;">Zone: ${road.zoneId} | Elevation: ${road.elevation}m</div>
                    </div>
                    <div>${badge}</div>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
    },

    /**
     * Render GIS Map Layers
     */
    renderMapLayers: function() {
        const data = window.FLOODSENSE_DATA;
        
        // 1. User Location Marker
        window.MapManager.renderUserLocation(this.state.userLocation, this.computed.nearestZone);

        // 2. Flood Risk Zone Polygons (LOW -> green, MODERATE -> yellow, HIGH -> orange, CRITICAL -> red)
        window.MapManager.renderZones(data.zones, this.computed.zoneRiskMap, (zone, risk) => {
            this.showBannerToast(`Selected Zone: ${zone.name} | Risk: ${risk.category} (${risk.riskScore}/100)`);
        });

        // 3. Rainfall Intensity Layer
        window.MapManager.renderRainfallLayer(data.zones, this.computed.zoneRiskMap);

        // 4. Drainage Network Layer
        window.MapManager.renderDrainageGraph(this.computed.graphState);

        // 5. Flooded Roads Overlays
        window.MapManager.renderRoads(data.roads, this.computed.zoneRiskMap, this.state.adminBlockedRoadIds);

        // 6. Emergency Facilities (Shelters, Hospitals, Fire Stations)
        window.MapManager.renderFacilities(data.emergencyServices);

        // 7. Citizen Flood Reports
        window.MapManager.renderReports(this.state.citizenReports);

        // 8. Navigation Route
        if (this.computed.routeResult) {
            window.MapManager.renderNavigationRoute(this.computed.routeResult);
        }
    },

    /**
     * Render Safe Navigation Route Comparison View
     */
    renderRouteView: function() {
        const container = document.getElementById("route-comparison-container");
        if (!container || !this.computed.routeResult) return;

        const res = this.computed.routeResult;

        container.innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                <!-- Direct Route Card -->
                <div class="card-box" style="border-left:4px solid #ef4444;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h4 style="margin:0; color:#ef4444;">❌ ${res.directRoute.title}</h4>
                        <span class="badge badge-critical">${res.directRoute.riskCategory}</span>
                    </div>
                    <div style="margin:12px 0; font-size:13px; color:#cbd5e1;">
                        <div>Distance: <strong>${res.directRoute.distanceKm} km</strong></div>
                        <div>Est. Travel Time: <strong>${res.directRoute.travelTimeMin} mins</strong> (Delayed)</div>
                        <div>Max Water Depth: <strong style="color:#ef4444;">${res.directRoute.maxWaterDepthCm} cm</strong></div>
                    </div>
                    <div style="font-size:12px; color:#fca5a5; background:rgba(239, 68, 68, 0.15); padding:8px; border-radius:6px;">
                        ${res.directRoute.hazardWarning}
                    </div>
                </div>

                <!-- Recommended Safe Route Card -->
                <div class="card-box" style="border-left:4px solid #10b981;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h4 style="margin:0; color:#10b981;">✅ ${res.safeRoute.title}</h4>
                        <span class="badge badge-low">${res.safeRoute.riskCategory}</span>
                    </div>
                    <div style="margin:12px 0; font-size:13px; color:#cbd5e1;">
                        <div>Distance: <strong>${res.safeRoute.distanceKm} km</strong></div>
                        <div>Est. Travel Time: <strong style="color:#10b981;">${res.safeRoute.travelTimeMin} mins</strong> (Safe Speed)</div>
                        <div>Max Water Depth: <strong>${res.safeRoute.maxWaterDepthCm} cm</strong></div>
                    </div>
                    <div style="font-size:12px; color:#6ee7b7; background:rgba(16, 185, 129, 0.15); padding:8px; border-radius:6px;">
                        ${res.safeRoute.safetyAdvantage}
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Render Reports List View
     */
    renderReportsList: function() {
        const container = document.getElementById("reports-list-container");
        if (!container) return;

        let html = `<div style="display:flex; flex-direction:column; gap:10px;">`;
        this.state.citizenReports.forEach(rep => {
            const zName = window.FLOODSENSE_DATA.zones.find(z => z.id === rep.zoneId)?.name || rep.zoneId;
            html += `
                <div class="card-box">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong style="color:#f8fafc;">⚠️ ${zName}</strong>
                        <span class="badge badge-${rep.severity.toLowerCase()}">${rep.severity} (${rep.waterDepthCm} cm)</span>
                    </div>
                    <p style="margin:6px 0; font-size:13px; color:#cbd5e1;">"${rep.description}"</p>
                    <div style="font-size:11px; color:#94a3b8; display:flex; justify-content:space-between;">
                        <span>Geotag: [${rep.coords[0].toFixed(4)}, ${rep.coords[1].toFixed(4)}]</span>
                        <span>Reported: ${new Date(rep.timestamp).toLocaleTimeString()}</span>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
        container.innerHTML = html;
    },

    /**
     * Render Alerts History & Outbound Logs View
     */
    renderAlertsHistory: function() {
        const container = document.getElementById("alerts-history-container");
        if (!container) return;

        const logs = window.NotificationEngine.outboundLogs;
        let html = `<div style="display:flex; flex-direction:column; gap:10px;">`;

        if (logs.length === 0) {
            html += `<div style="color:#94a3b8; font-size:13px;">No outbound SMS/Email alerts triggered yet. System monitoring live weather...</div>`;
        } else {
            logs.forEach(log => {
                html += `
                    <div class="card-box" style="border-left:3px solid #38bdf8;">
                        <div style="display:flex; justify-content:space-between; font-size:12px; color:#94a3b8;">
                            <span><strong>${log.channel}</strong> | ${log.recipient}</span>
                            <span style="color:#10b981; font-weight:bold;">${log.status}</span>
                        </div>
                        <div style="font-size:12px; color:#f8fafc; margin-top:4px;">${log.message || log.body}</div>
                        <div style="font-size:10px; color:#64748b; margin-top:4px;">Timestamp: ${log.timestamp}</div>
                    </div>
                `;
            });
        }

        html += `</div>`;
        container.innerHTML = html;
    },

    /**
     * Render Emergency Authority / Admin Command Center
     */
    renderAdminCommandCenter: function() {
        const activeAlertsCount = Object.values(this.computed.zoneRiskMap).filter(z => z.category === "HIGH" || z.category === "CRITICAL").length;
        const criticalZonesCount = Object.values(this.computed.zoneRiskMap).filter(z => z.category === "CRITICAL").length;
        const avgRainfall = Math.round(Object.values(this.computed.zoneRiskMap).reduce((s, z) => s + z.rainfallIntensityMmHr, 0) / Math.max(1, Object.keys(this.computed.zoneRiskMap).length));

        document.getElementById("kpi-active-alerts") && (document.getElementById("kpi-active-alerts").textContent = activeAlertsCount);
        document.getElementById("kpi-critical-zones") && (document.getElementById("kpi-critical-zones").textContent = criticalZonesCount);
        document.getElementById("kpi-drainage-util") && (document.getElementById("kpi-drainage-util").textContent = `${this.computed.graphState.cityAverageUtilizationPercent}%`);
        document.getElementById("kpi-avg-rain") && (document.getElementById("kpi-avg-rain").textContent = `${avgRainfall} mm/hr`);

        this.renderAdminPumpControls();
        this.renderAdminRoadControls();
    },

    /**
     * Render Admin Pump Controls
     */
    renderAdminPumpControls: function() {
        const container = document.getElementById("admin-pump-controls");
        if (!container) return;

        const pumps = window.FLOODSENSE_DATA.drainageNodes.filter(n => n.type === "pump");
        let html = `<div style="display:flex; flex-direction:column; gap:8px;">`;

        pumps.forEach(pump => {
            const isOn = this.state.pumpOverrides[pump.id] !== undefined ? this.state.pumpOverrides[pump.id] : pump.pumpActive;
            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; background:#1e293b; padding:8px 12px; border-radius:6px;">
                    <div>
                        <strong style="color:#f8fafc; font-size:12px;">⚡ ${pump.name}</strong>
                        <div style="font-size:10px; color:#94a3b8;">Capacity: ${pump.capacityLps} L/s</div>
                    </div>
                    <button class="btn btn-sm ${isOn ? 'btn-danger' : 'btn-success'}" onclick="window.FloodSenseApp.togglePumpOverride('${pump.id}')">
                        ${isOn ? '🔴 DEACTIVATE' : '🟢 ACTIVATE AUX PUMP'}
                    </button>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
    },

    /**
     * Toggle Pump Override
     */
    togglePumpOverride: function(pumpId) {
        const current = this.state.pumpOverrides[pumpId] !== undefined ? this.state.pumpOverrides[pumpId] : true;
        this.state.pumpOverrides[pumpId] = !current;
        this.showBannerToast(`⚡ Pump Station ${pumpId} state updated.`);
        this.recalculateState();
        this.renderAllViews();
    },

    /**
     * Render Admin Road Controls
     */
    renderAdminRoadControls: function() {
        const container = document.getElementById("admin-road-controls");
        if (!container) return;

        const roads = window.FLOODSENSE_DATA.roads;
        let html = `<div style="display:flex; flex-direction:column; gap:8px;">`;

        roads.forEach(road => {
            const isBlocked = this.state.adminBlockedRoadIds.includes(road.id);
            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; background:#1e293b; padding:8px 12px; border-radius:6px;">
                    <div>
                        <strong style="color:#f8fafc; font-size:12px;">🛣️ ${road.name}</strong>
                    </div>
                    <button class="btn btn-sm ${isBlocked ? 'btn-success' : 'btn-warning'}" onclick="window.FloodSenseApp.toggleRoadBlockage('${road.id}')">
                        ${isBlocked ? '🟢 UNBLOCK ROAD' : '🚫 MARK BLOCKED'}
                    </button>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
    },

    /**
     * Toggle Road Blockage
     */
    toggleRoadBlockage: function(roadId) {
        if (this.state.adminBlockedRoadIds.includes(roadId)) {
            this.state.adminBlockedRoadIds = this.state.adminBlockedRoadIds.filter(id => id !== roadId);
        } else {
            this.state.adminBlockedRoadIds.push(roadId);
        }
        this.showBannerToast(`🛣️ Road ${roadId} blockage status updated.`);
        this.recalculateState();
        this.renderAllViews();
    },

    /**
     * Render Admin Analytics View
     */
    renderAdminAnalytics: function() {
        window.ChartManager.renderDrainageBarChart("admin-drainage-barchart", this.computed.graphState.edges);
    },

    /**
     * Toast Notifications Helper
     */
    showBannerToast: function(message) {
        const banner = document.getElementById("app-banner-toast");
        if (banner) {
            banner.textContent = message;
            banner.classList.add("show");
            setTimeout(() => banner.classList.remove("show"), 4000);
        }
    },

    /**
     * In-App Emergency Notification Toast Modal
     */
    showNotificationToast: function(toastData) {
        const container = document.getElementById("emergency-toast-container");
        if (!container) return;

        const toastEl = document.createElement("div");
        toastEl.className = `emergency-toast-card toast-${toastData.level.toLowerCase()}`;
        toastEl.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong style="font-size:14px;">${toastData.title}</strong>
                <button style="background:none; border:none; color:#fff; cursor:pointer; font-size:16px;" onclick="this.parentElement.parentElement.remove()">✕</button>
            </div>
            <div style="font-size:12px; margin:6px 0; color:#f8fafc;">${toastData.message}</div>
            <div style="display:flex; justify-content:space-between; font-size:11px; margin-top:8px;">
                <span>Zone: <strong>${toastData.zoneName}</strong></span>
                <button class="btn btn-sm btn-light" onclick="window.FloodSenseApp.switchTab('routes')">🗺️ SAFE ROUTE</button>
            </div>
        `;

        container.appendChild(toastEl);
        setTimeout(() => toastEl.remove(), 8000);
    },

    /**
     * Sync State with Backend API
     */
    syncWithBackend: function() {
        fetch("/api/state", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                globalRainfallMultiplier: this.state.globalRainfallMultiplier,
                blockedEdgeIds: this.state.blockedEdgeIds,
                adminBlockedRoadIds: this.state.adminBlockedRoadIds,
                pumpOverrides: this.state.pumpOverrides
            })
        }).catch(err => console.warn("Backend sync notice:", err));
    },

    /**
     * Connect to Server-Sent Events (SSE) stream for real-time sync across multi-user browser windows
     */
    initSSEConnection: function() {
        if ("EventSource" in window) {
            const evtSource = new EventSource("/api/events");
            evtSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === "STATE_UPDATE") {
                        this.state.globalRainfallMultiplier = data.globalRainfallMultiplier || this.state.globalRainfallMultiplier;
                        this.recalculateState();
                        this.updateRealtimeUI();
                    }
                } catch (e) {}
            };
        }
    }
};

// Auto-initialize when DOM ready
document.addEventListener("DOMContentLoaded", () => {
    window.FloodSenseApp.init();
});
