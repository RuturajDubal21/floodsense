/**
 * FloodSense - Main Frontend Application Orchestrator (Navigation Map Enhanced)
 * Connects GIS Map, OpenStreetMap Navigation, Prediction Engine, Hydraulics, Alerts, & Simulation Controls
 */

window.FloodSenseApp = {
    // App State
    state: {
        activeRole: "citizen",
        activeTab: "dashboard",
        globalRainfallMultiplier: 1.0,
        rainfallTrend: "RISING",
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
        console.log("Initializing FloodSense Urban Flood Nowcasting System...");

        window.NotificationEngine.requestPermission();
        this.detectUserLocation();
        this.bindEvents();

        this.recalculateState();
        this.renderAllViews();

        setInterval(() => {
            this.recalculateState();
            this.updateRealtimeUI();
        }, 3000);

        this.initSSEConnection();
    },

    /**
     * Fixed Station Location Handler (Browser Geolocation Disabled)
     */
    detectUserLocation: function() {
        this.state.userLocation = window.FLOODSENSE_DATA.defaultUserLocation;
        this.computed.nearestZone = window.FLOODSENSE_DATA.zones[0];
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

        this.computed.graphState = window.DrainageGraphEngine.processGraphState(
            data.drainageEdges,
            data.drainageNodes,
            this.state.globalRainfallMultiplier,
            this.state.blockedEdgeIds,
            this.state.pumpOverrides
        );

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

        if (!this.computed.nearestZone) {
            this.computed.nearestZone = this.findNearestZone(this.state.userLocation.coords);
        }

        const userZoneId = this.state.userLocation.zoneId || this.computed.nearestZone.id;
        this.computed.userZoneResult = this.computed.zoneRiskMap[userZoneId] || this.computed.zoneRiskMap["zone-wakad"];

        // Recalculate Dijkstra Safe Navigation Route
        this.computed.routeResult = window.RoutingEngine.findSafeRoute(
            this.state.userLocation.coords,
            this.state.selectedDestination,
            data.roads,
            this.computed.zoneRiskMap,
            this.state.adminBlockedRoadIds
        );

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
        document.querySelectorAll("[data-role-switch]").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const role = e.currentTarget.getAttribute("data-role-switch");
                this.switchRole(role);
            });
        });

        document.querySelectorAll("[data-nav-tab]").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const tab = e.currentTarget.getAttribute("data-nav-tab");
                this.switchTab(tab);
            });
        });

        document.getElementById("btn-sim-heavy-rain")?.addEventListener("click", () => this.triggerSimulationMode("HEAVY_RAINFALL"));
        document.getElementById("btn-sim-drain-block")?.addEventListener("click", () => this.triggerSimulationMode("DRAIN_BLOCKAGE"));
        document.getElementById("btn-sim-cloudburst")?.addEventListener("click", () => this.triggerSimulationMode("CLOUDBURST"));
        document.getElementById("btn-sim-reset")?.addEventListener("click", () => this.triggerSimulationMode("RESET"));
        document.getElementById("btn-sim-tour")?.addEventListener("click", () => this.startScenarioTour());

        document.getElementById("form-report-flood")?.addEventListener("submit", (e) => {
            e.preventDefault();
            this.submitFloodReport();
        });

        document.getElementById("select-destination")?.addEventListener("change", (e) => {
            this.state.selectedDestination = e.target.value;
            this.recalculateState();
            this.renderRouteView();
        });

        document.getElementById("btn-recalculate-route")?.addEventListener("click", () => {
            this.recalculateState();
            this.renderRouteView();
            this.showBannerToast("🗺️ Dijkstra Safe Navigation Route recalculated!");
        });
    },

    /**
     * Role Switcher Handler
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

        if (tab === "map" || tab === "admin_command") {
            setTimeout(() => {
                const mapElementId = tab === "admin_command" ? "admin-gis-map" : "citizen-gis-map";
                window.MapManager.initMap(mapElementId, this.state.userLocation.coords, 13);
                this.renderMapLayers();
            }, 100);
        } else if (tab === "routes") {
            setTimeout(() => {
                this.renderRouteView();
            }, 100);
        }

        this.renderTabContent(tab);
    },

    /**
     * Trigger Simulation Modes
     */
    triggerSimulationMode: function(mode) {
        if (mode === "HEAVY_RAINFALL") {
            this.state.globalRainfallMultiplier = 5.2;
            this.state.rainfallTrend = "RISING";
            this.showBannerToast("🌧️ Heavy Rainfall Simulation Activated! Rainfall increased to 78 mm/hr.");
        } else if (mode === "DRAIN_BLOCKAGE") {
            this.state.blockedEdgeIds = ["edge-w1-w2", "edge-b1-b2"];
            this.showBannerToast("🚫 Drain Blockage Simulation Activated. Trunk channels restricted.");
        } else if (mode === "CLOUDBURST") {
            this.state.globalRainfallMultiplier = 7.5;
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
     * Submit Flood Report
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

    renderAllViews: function() {
        this.renderUserSafetyHeader();
        this.renderTabContent(this.state.activeTab);
    },

    updateRealtimeUI: function() {
        this.renderUserSafetyHeader();
        if (this.state.activeTab === "map" || this.state.activeTab === "admin_command") {
            this.renderMapLayers();
        } else if (this.state.activeTab === "routes") {
            this.renderRouteView();
        }
        this.renderNowcastTimeline();
    },

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

    renderCitizenDashboard: function() {
        this.renderNowcastTimeline();
        this.renderNearbyAffectedRoads();
    },

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

    renderMapLayers: function() {
        const data = window.FLOODSENSE_DATA;
        
        window.MapManager.renderUserLocation(this.state.userLocation, this.computed.nearestZone);
        window.MapManager.renderZones(data.zones, this.computed.zoneRiskMap, (zone, risk) => {
            this.showBannerToast(`Selected Zone: ${zone.name} | Risk: ${risk.category} (${risk.riskScore}/100)`);
        });
        window.MapManager.renderRainfallLayer(data.zones, this.computed.zoneRiskMap);
        window.MapManager.renderDrainageGraph(this.computed.graphState);
        window.MapManager.renderRoads(data.roads, this.computed.zoneRiskMap, this.state.adminBlockedRoadIds);
        window.MapManager.renderFacilities(data.emergencyServices);
        window.MapManager.renderReports(this.state.citizenReports);

        if (this.computed.routeResult) {
            window.MapManager.renderNavigationRoute(this.computed.routeResult);
        }
    },

    /**
     * Render Safe Navigation Route Comparison & Interactive Map View
     */
    renderRouteView: function() {
        const container = document.getElementById("route-comparison-container");
        const stepsContainer = document.getElementById("turn-by-turn-container");
        if (!container || !this.computed.routeResult) return;

        const res = this.computed.routeResult;

        // 1. Render Side-by-Side Comparative Cards
        container.innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                <!-- Direct Route Card -->
                <div class="card-box" style="border-left:4px solid #ef4444;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h4 style="margin:0; color:#ef4444; font-size:14px;">❌ ${res.directRoute.title}</h4>
                        <span class="badge badge-critical">${res.directRoute.riskCategory}</span>
                    </div>
                    <div style="margin:10px 0; font-size:12px; color:#cbd5e1;">
                        <div>Distance: <strong>${res.directRoute.distanceKm} km</strong></div>
                        <div>Est. Travel Time: <strong>${res.directRoute.travelTimeMin} mins</strong> (Delayed)</div>
                        <div>Max Water Depth: <strong style="color:#ef4444;">${res.directRoute.maxWaterDepthCm} cm</strong></div>
                    </div>
                    <div style="font-size:11px; color:#fca5a5; background:rgba(239, 68, 68, 0.15); padding:8px; border-radius:6px;">
                        ${res.directRoute.hazardWarning}
                    </div>
                </div>

                <!-- Recommended Safe Route Card -->
                <div class="card-box" style="border-left:4px solid #10b981;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h4 style="margin:0; color:#10b981; font-size:14px;">✅ ${res.safeRoute.title}</h4>
                        <span class="badge badge-low">${res.safeRoute.riskCategory}</span>
                    </div>
                    <div style="margin:10px 0; font-size:12px; color:#cbd5e1;">
                        <div>Distance: <strong>${res.safeRoute.distanceKm} km</strong></div>
                        <div>Est. Travel Time: <strong style="color:#10b981;">${res.safeRoute.travelTimeMin} mins</strong> (Safe Speed)</div>
                        <div>Max Water Depth: <strong>${res.safeRoute.maxWaterDepthCm} cm</strong></div>
                    </div>
                    <div style="font-size:11px; color:#6ee7b7; background:rgba(16, 185, 129, 0.15); padding:8px; border-radius:6px;">
                        ${res.safeRoute.safetyAdvantage}
                    </div>
                </div>
            </div>
        `;

        // 2. Render Turn-by-Turn Steps
        if (stepsContainer && res.turnByTurnSteps) {
            let stepsHtml = `<div style="display:flex; flex-direction:column; gap:10px;">`;
            res.turnByTurnSteps.forEach((step, idx) => {
                stepsHtml += `
                    <div style="display:flex; align-items:flex-start; gap:12px; background:rgba(15,23,42,0.6); padding:10px 14px; border-radius:8px; border-left:3px solid #38bdf8;">
                        <div style="font-size:18px;">${step.icon}</div>
                        <div style="flex:1;">
                            <strong style="color:#f8fafc; font-size:13px;">${step.instruction}</strong>
                            <div style="font-size:11px; color:#cbd5e1; margin-top:2px;">${step.detail}</div>
                        </div>
                        <div style="text-align:right; font-size:11px; color:#38bdf8; font-weight:bold;">
                            ${step.distance}<br/>
                            <span style="color:#94a3b8; font-size:10px;">${step.elevation}</span>
                        </div>
                    </div>
                `;
            });
            stepsHtml += `</div>`;
            stepsContainer.innerHTML = stepsHtml;
        }

        // 3. Render Embedded Navigation OpenStreetMap Canvas
        setTimeout(() => {
            window.MapManager.renderDedicatedNavigationMap(
                "navigation-gis-map",
                res,
                this.state.userLocation.coords
            );
        }, 100);
    },

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

    togglePumpOverride: function(pumpId) {
        const current = this.state.pumpOverrides[pumpId] !== undefined ? this.state.pumpOverrides[pumpId] : true;
        this.state.pumpOverrides[pumpId] = !current;
        this.showBannerToast(`⚡ Pump Station ${pumpId} state updated.`);
        this.recalculateState();
        this.renderAllViews();
    },

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

    renderAdminAnalytics: function() {
        window.ChartManager.renderDrainageBarChart("admin-drainage-barchart", this.computed.graphState.edges);
    },

    showBannerToast: function(message) {
        const banner = document.getElementById("app-banner-toast");
        if (banner) {
            banner.textContent = message;
            banner.classList.add("show");
            setTimeout(() => banner.classList.remove("show"), 4000);
        }
    },

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

document.addEventListener("DOMContentLoaded", () => {
    window.FloodSenseApp.init();
});
