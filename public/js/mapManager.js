/**
 * FloodSense - Interactive Leaflet GIS Map Controller (OpenStreetMap + Safe Navigation)
 * Renders Base Map, User Location, Flood Polygons, Rainfall Layers, Drainage Graph, Facilities, Reports & Dedicated Navigation Maps
 */

window.MapManager = {
    map: null,
    navMap: null,
    layers: {
        baseOsm: null,
        userLocation: null,
        zones: null,
        rainfallHeat: null,
        roads: null,
        drainageGraph: null,
        shelters: null,
        hospitals: null,
        fireStations: null,
        reports: null,
        route: null
    },
    navLayers: {
        origin: null,
        dest: null,
        directRoute: null,
        safeRoute: null,
        hazards: null
    },
    layerControl: null,

    /**
     * Initialize Primary Leaflet GIS Map with pure OpenStreetMap tiles
     */
    initMap: function(elementId, centerCoords, zoomLevel) {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }

        this.map = L.map(elementId, {
            center: centerCoords || [18.5204, 73.8567],
            zoom: zoomLevel || 13,
            zoomControl: false
        });

        L.control.zoom({ position: "bottomright" }).addTo(this.map);

        const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        const osmAttrib = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | <strong>FloodSense GIS</strong>';
        
        this.layers.baseOsm = L.tileLayer(osmUrl, {
            maxZoom: 19,
            attribution: osmAttrib
        }).addTo(this.map);

        // Initialize Layer Groups
        this.layers.userLocation = L.layerGroup().addTo(this.map);
        this.layers.zones = L.layerGroup().addTo(this.map);
        this.layers.rainfallHeat = L.layerGroup().addTo(this.map);
        this.layers.roads = L.layerGroup().addTo(this.map);
        this.layers.drainageGraph = L.layerGroup().addTo(this.map);
        this.layers.shelters = L.layerGroup().addTo(this.map);
        this.layers.hospitals = L.layerGroup().addTo(this.map);
        this.layers.fireStations = L.layerGroup().addTo(this.map);
        this.layers.reports = L.layerGroup().addTo(this.map);
        this.layers.route = L.layerGroup().addTo(this.map);

        const overlayMaps = {
            "📍 Station Origin Pin": this.layers.userLocation,
            "🌊 Flood Risk Zones": this.layers.zones,
            "🌧️ Rainfall Radar": this.layers.rainfallHeat,
            "🛣️ Road Network": this.layers.roads,
            "💧 Drainage Network Graph": this.layers.drainageGraph,
            "⛺ Relief Shelters": this.layers.shelters,
            "🏥 Hospitals": this.layers.hospitals,
            "🚒 Police & Fire Stations": this.layers.fireStations,
            "⚠️ Citizen Flood Reports": this.layers.reports,
            "🗺️ Safe Navigation Path": this.layers.route
        };

        this.layerControl = L.control.layers(null, overlayMaps, { position: 'topright', collapsed: true }).addTo(this.map);
    },

    /**
     * Render Dedicated Interactive Navigation Map inside Safe Navigation View
     */
    renderDedicatedNavigationMap: function(elementId, routeResult, originCoords) {
        const container = document.getElementById(elementId);
        if (!container) return;

        // Initialize navMap instance if not yet created
        if (!this.navMap) {
            this.navMap = L.map(elementId, {
                center: originCoords || [18.5600, 73.7800],
                zoom: 13,
                zoomControl: false
            });

            L.control.zoom({ position: "bottomright" }).addTo(this.navMap);

            const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
            L.tileLayer(osmUrl, {
                maxZoom: 19,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | FloodSense Safe Router'
            }).addTo(this.navMap);

            this.navLayers.origin = L.layerGroup().addTo(this.navMap);
            this.navLayers.dest = L.layerGroup().addTo(this.navMap);
            this.navLayers.directRoute = L.layerGroup().addTo(this.navMap);
            this.navLayers.safeRoute = L.layerGroup().addTo(this.navMap);
            this.navLayers.hazards = L.layerGroup().addTo(this.navMap);
        }

        // Clear previous navigation layers
        this.navLayers.origin.clearLayers();
        this.navLayers.dest.clearLayers();
        this.navLayers.directRoute.clearLayers();
        this.navLayers.safeRoute.clearLayers();
        this.navLayers.hazards.clearLayers();

        const destObj = routeResult.destination;
        const destCoords = destObj.coords;

        // 1. Render Origin Pin (Green Pulsing GPS Marker - Re-added as requested)
        const originIcon = L.divIcon({
            html: `<div style="background:#10b981; color:#fff; font-size:11px; font-weight:bold; padding:4px 8px; border-radius:14px; border:2px solid #fff; box-shadow:0 0 10px #10b981; white-space:nowrap;">📍 START (ORIGIN)</div>`,
            className: "nav-pin-origin",
            iconSize: [110, 24],
            iconAnchor: [55, 12]
        });
        const originMarker = L.marker(originCoords, { icon: originIcon });
        originMarker.bindPopup(`<strong>📍 Start Location (Origin)</strong><br/>Coordinates: [${originCoords[0].toFixed(4)}, ${originCoords[1].toFixed(4)}]`);
        this.navLayers.origin.addLayer(originMarker);

        // 2. Render Destination Pin (Red Target Checkered Marker)
        const destIcon = L.divIcon({
            html: `<div style="background:#ef4444; color:#fff; font-size:11px; font-weight:bold; padding:4px 8px; border-radius:14px; border:2px solid #fff; box-shadow:0 0 10px #ef4444; white-space:nowrap;">🏁 DESTINATION</div>`,
            className: "nav-pin-dest",
            iconSize: [110, 24],
            iconAnchor: [55, 12]
        });
        const destMarker = L.marker(destCoords, { icon: destIcon });
        destMarker.bindPopup(`<strong>🏁 ${destObj.name}</strong><br/>Safe Destination`);
        this.navLayers.dest.addLayer(destMarker);

        // 3. Render Direct Route (Red Dashed Line with Hazard Callout)
        if (routeResult.directRoute && routeResult.directRoute.pathCoordinates) {
            const directPoly = L.polyline(routeResult.directRoute.pathCoordinates, {
                color: "#ef4444",
                weight: 5,
                dashArray: "8, 8",
                opacity: 0.75
            }).bindTooltip(`❌ Direct Route (${routeResult.directRoute.maxWaterDepthCm}cm Flooded Underpass Hazard!)`);
            this.navLayers.directRoute.addLayer(directPoly);

            // Add Hazard Callout Pin at Wakad Underpass
            const hazardIcon = L.divIcon({
                html: `<div style="background:#dc2626; color:#fff; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:4px; border:1px solid #fff; box-shadow:0 0 8px #dc2626;">⚠️ 28cm HAZARD</div>`,
                className: "nav-pin-hazard",
                iconSize: [80, 20]
            });
            const hazardMarker = L.marker([18.5960, 73.7620], { icon: hazardIcon });
            hazardMarker.bindPopup(`<strong style="color:#ef4444;">⚠️ FLOODED UNDERPASS HAZARD</strong><br/>Water Depth: 28 cm<br/>Risk: CRITICAL — Detour Enforced by Dijkstra Router!`);
            this.navLayers.hazards.addLayer(hazardMarker);
        }

        // 4. Render Recommended Safe Path (Glowing Green Polyline)
        if (routeResult.safeRoute && routeResult.safeRoute.pathCoordinates) {
            const safePoly = L.polyline(routeResult.safeRoute.pathCoordinates, {
                color: "#10b981",
                weight: 7,
                opacity: 0.95
            }).bindTooltip("✅ Recommended Flood-Safe Path (Elevation 574m)");
            this.navLayers.safeRoute.addLayer(safePoly);

            // Fit map bounds to encompass both Origin & Destination Pins cleanly
            const bounds = L.latLngBounds([originCoords, destCoords]);
            safePoly.getLatLngs().forEach(latlng => bounds.extend(latlng));
            this.navMap.fitBounds(bounds, { padding: [55, 55] });
        }

        // Invalidate map size so Leaflet recalculates canvas dimensions
        setTimeout(() => {
            if (this.navMap) {
                this.navMap.invalidateSize();
            }
        }, 150);
    },

    /**
     * Render User Location Marker (Browser Geolocation API)
     */
    renderUserLocation: function(userLocationObj, nearestZone) {
        if (!this.layers.userLocation) return;
        this.layers.userLocation.clearLayers();

        const coords = userLocationObj.coords || [18.5960, 73.7620];

        const customUserIcon = L.divIcon({
            html: `
                <div style="position:relative; width:28px; height:28px;">
                    <div style="position:absolute; width:28px; height:28px; border-radius:50%; background:rgba(56, 189, 248, 0.45); animation:ping 1.6s infinite;"></div>
                    <div style="position:absolute; top:5px; left:5px; width:18px; height:18px; border-radius:50%; background:#0284c7; border:3px solid #ffffff; box-shadow:0 0 14px #0284c7;"></div>
                </div>
            `,
            className: 'custom-user-gps-icon',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });

        const marker = L.marker(coords, { icon: customUserIcon });
        marker.bindPopup(`
            <div style="font-size:13px; color:#f8fafc; font-family:Inter, sans-serif; padding:4px;">
                <div style="display:flex; align-items:center; gap:6px; color:#38bdf8; font-weight:bold; font-size:14px;">
                    📍 Station Origin (Wakad Point)
                </div>
                <div style="font-size:11px; color:#94a3b8; margin:4px 0;">[${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}]</div>
                <div style="font-size:12px; margin-top:6px;">
                    Sub-basin Area: <strong>${nearestZone ? nearestZone.name : 'Wakad'}</strong>
                </div>
                <div style="font-size:11px; color:#10b981; margin-top:4px; font-weight:bold;">
                    📍 Station Coordinates Active
                </div>
            </div>
        `, { maxWidth: 280 });

        this.layers.userLocation.addLayer(marker);
    },

    /**
     * Render Flood-Risk Zones with Polygons
     */
    renderZones: function(zones, zoneRiskMap, onZoneClick) {
        if (!this.layers.zones) return;
        this.layers.zones.clearLayers();

        zones.forEach(zone => {
            const risk = zoneRiskMap[zone.id] || { colorHex: "#10b981", category: "LOW", riskScore: 10 };

            let fillColorHex = "#10b981";
            if (risk.category === "CRITICAL") fillColorHex = "#ef4444";
            else if (risk.category === "HIGH") fillColorHex = "#f97316";
            else if (risk.category === "MODERATE") fillColorHex = "#eab308";

            const polygon = L.polygon(zone.coordinates, {
                color: fillColorHex,
                weight: 3,
                fillColor: fillColorHex,
                fillOpacity: risk.category === "CRITICAL" ? 0.6 : (risk.category === "HIGH" ? 0.5 : 0.28)
            });

            const popupContent = `
                <div class="gis-popup-content" style="font-family:Inter, sans-serif; min-width:260px; padding:4px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:8px; margin-bottom:10px;">
                        <h3 style="margin:0; font-size:15px; font-weight:800; color:#f8fafc;">${zone.name}</h3>
                        <span class="badge badge-${risk.category.toLowerCase()}">${risk.category}</span>
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:12px; margin-bottom:12px; color:#cbd5e1;">
                        <div style="background:rgba(255,255,255,0.05); padding:6px; border-radius:6px;">
                            <div style="font-size:10px; color:#94a3b8;">FLOOD RISK</div>
                            <strong style="color:${fillColorHex}; font-size:14px;">${risk.riskScore}/100</strong>
                        </div>
                        <div style="background:rgba(255,255,255,0.05); padding:6px; border-radius:6px;">
                            <div style="font-size:10px; color:#94a3b8;">EST. DEPTH</div>
                            <strong style="color:${risk.estimatedWaterDepthCm > 15 ? '#ef4444' : '#38bdf8'}; font-size:14px;">${risk.estimatedWaterDepthCm} cm</strong>
                        </div>
                        <div style="background:rgba(255,255,255,0.05); padding:6px; border-radius:6px;">
                            <div style="font-size:10px; color:#94a3b8;">RAINFALL</div>
                            <strong style="color:#f8fafc; font-size:13px;">${risk.rainfallIntensityMmHr} mm/hr</strong>
                        </div>
                        <div style="background:rgba(255,255,255,0.05); padding:6px; border-radius:6px;">
                            <div style="font-size:10px; color:#94a3b8;">FLOOD PROB.</div>
                            <strong style="color:#f8fafc; font-size:13px;">${risk.floodProbabilityPercent}%</strong>
                        </div>
                    </div>
                    <div style="font-size:11px; color:#94a3b8; line-height:1.4; background:rgba(15,23,42,0.8); padding:8px; border-radius:6px; border-left:3px solid ${fillColorHex}; margin-bottom:10px;">
                        ${risk.actionRecommendation}
                    </div>
                    <button class="btn btn-sm btn-primary" style="width:100%; font-size:11px;" onclick="window.FloodSenseApp.switchTab('routes')">
                        🗺️ Navigate Safe Route Out
                    </button>
                </div>
            `;

            polygon.bindPopup(popupContent, { maxWidth: 320 });

            polygon.on("click", () => {
                if (typeof onZoneClick === "function") {
                    onZoneClick(zone, risk);
                }
            });

            this.layers.zones.addLayer(polygon);
        });
    },

    /**
     * Render Rainfall Intensity Radar Layer
     */
    renderRainfallLayer: function(zones, zoneRiskMap) {
        if (!this.layers.rainfallHeat) return;
        this.layers.rainfallHeat.clearLayers();

        zones.forEach(zone => {
            const risk = zoneRiskMap[zone.id];
            const rainfall = risk ? risk.rainfallIntensityMmHr : zone.baselineRainfall;

            if (rainfall > 20) {
                const circle = L.circle(zone.center, {
                    radius: 900 + rainfall * 12,
                    color: '#38bdf8',
                    stroke: false,
                    fillColor: '#0284c7',
                    fillOpacity: Math.min(0.42, rainfall / 180)
                });
                circle.bindTooltip(`Precipitation Radar: ${rainfall} mm/hr`);
                this.layers.rainfallHeat.addLayer(circle);
            }
        });
    },

    /**
     * Render Drainage Graph Layer
     */
    renderDrainageGraph: function(graphState) {
        if (!this.layers.drainageGraph) return;
        this.layers.drainageGraph.clearLayers();

        graphState.edges.forEach(edge => {
            const sourceNode = graphState.nodes.find(n => n.id === edge.source);
            const targetNode = graphState.nodes.find(n => n.id === edge.target);

            if (sourceNode && targetNode) {
                let lineColor = "#38bdf8";
                if (edge.status === "SEVERE_OVERLOAD" || edge.isBlocked) lineColor = "#ef4444";
                else if (edge.status === "OVERLOAD") lineColor = "#f97316";

                const polyline = L.polyline([sourceNode.coords, targetNode.coords], {
                    color: lineColor,
                    weight: edge.utilizationPercent > 100 ? 5 : 3,
                    dashArray: edge.isBlocked ? "6, 6" : null,
                    opacity: 0.88
                });

                polyline.bindTooltip(`
                    <div style="font-size:12px;">
                        <strong>Drain Pipe: ${edge.id}</strong><br/>
                        Flow Rate: ${edge.currentFlowLps} / ${edge.effectiveCapacityLps} L/s<br/>
                        Utilization: <strong style="color:${lineColor};">${edge.utilizationPercent}%</strong>
                    </div>
                `);

                this.layers.drainageGraph.addLayer(polyline);
            }
        });

        graphState.nodes.forEach(node => {
            let iconHtml = `<div style="background:#0284c7; width:10px; height:10px; border-radius:50%; border:2px solid #fff;"></div>`;
            if (node.type === "pump") {
                iconHtml = `<div style="background:${node.pumpActive ? '#10b981' : '#f97316'}; color:#fff; font-size:9px; font-weight:bold; padding:2px 5px; border-radius:4px; border:1px solid #fff; box-shadow:0 0 6px rgba(0,0,0,0.5);">⚡ PUMP</div>`;
            }

            const customIcon = L.divIcon({ html: iconHtml, className: "custom-gis-node-icon", iconSize: [16, 16] });
            const marker = L.marker(node.coords, { icon: customIcon });
            marker.bindPopup(`
                <div style="font-size:12px; color:#f8fafc;">
                    <strong>${node.name}</strong> (${node.type.toUpperCase()})<br/>
                    Elevation: ${node.elevation}m<br/>
                    ${node.type === 'pump' ? `Status: <strong>${node.pumpActive ? 'ONLINE' : 'OFFLINE'}</strong>` : ''}
                </div>
            `);
            this.layers.drainageGraph.addLayer(marker);
        });
    },

    /**
     * Render Flooded/High-Risk Roads Overlays
     */
    renderRoads: function(roads, zoneRiskMap, adminBlockedRoadIds) {
        if (!this.layers.roads) return;
        this.layers.roads.clearLayers();

        roads.forEach(road => {
            const isBlocked = adminBlockedRoadIds.includes(road.id) || road.isBlocked;
            const zRisk = zoneRiskMap[road.zoneId];
            const waterDepth = zRisk ? zRisk.estimatedWaterDepthCm : 0;

            let roadColor = "#64748b";
            if (isBlocked) roadColor = "#ef4444";
            else if (waterDepth > 15) roadColor = "#dc2626";
            else if (waterDepth > 5) roadColor = "#f59e0b";

            const polyline = L.polyline(road.path, {
                color: roadColor,
                weight: waterDepth > 15 ? 6 : 4,
                opacity: 0.88
            });

            polyline.bindTooltip(`
                <div style="font-size:12px;">
                    <strong>${road.name}</strong><br/>
                    Status: ${isBlocked ? '<span style="color:#ef4444; font-weight:bold;">BLOCKED</span>' : 'OPEN'}<br/>
                    Flood Depth: <strong>${waterDepth} cm</strong>
                </div>
            `);

            this.layers.roads.addLayer(polyline);
        });
    },

    /**
     * Render Emergency Facilities
     */
    renderFacilities: function(facilities) {
        if (!this.layers.shelters || !this.layers.hospitals || !this.layers.fireStations) return;
        this.layers.shelters.clearLayers();
        this.layers.hospitals.clearLayers();
        this.layers.fireStations.clearLayers();

        facilities.forEach(fac => {
            let symbol = "🏥";
            let targetLayer = this.layers.hospitals;

            if (fac.type === "shelter") {
                symbol = "⛺";
                targetLayer = this.layers.shelters;
            } else if (fac.type === "fire_station") {
                symbol = "🚒";
                targetLayer = this.layers.fireStations;
            }

            const customIcon = L.divIcon({
                html: `<div style="font-size:20px; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.8));">${symbol}</div>`,
                className: "custom-fac-icon",
                iconSize: [26, 26]
            });

            const marker = L.marker(fac.coords, { icon: customIcon });
            marker.bindPopup(`
                <div style="font-size:12px; color:#f8fafc; font-family:Inter, sans-serif;">
                    <strong>${symbol} ${fac.name}</strong><br/>
                    Category: ${fac.type.toUpperCase()}<br/>
                    ${fac.phone ? `Contact: <strong style="color:#38bdf8;">${fac.phone}</strong><br/>` : ''}
                    ${fac.capacity ? `Capacity: <strong>${fac.currentOccupancy} / ${fac.capacity}</strong> evacuees<br/>` : ''}
                </div>
            `);
            targetLayer.addLayer(marker);
        });
    },

    /**
     * Render Geotagged Flood Reports
     */
    renderReports: function(reports) {
        if (!this.layers.reports) return;
        this.layers.reports.clearLayers();

        reports.forEach(rep => {
            const customIcon = L.divIcon({
                html: `<div style="background:#ef4444; width:18px; height:18px; border-radius:50%; border:2px solid #fff; box-shadow:0 0 10px #ef4444;"></div>`,
                className: "custom-report-icon",
                iconSize: [22, 22]
            });

            const marker = L.marker(rep.coords, { icon: customIcon });
            marker.bindPopup(`
                <div style="font-size:12px; color:#f8fafc; max-width:240px; font-family:Inter, sans-serif;">
                    <div style="color:#ef4444; font-weight:bold; font-size:13px; margin-bottom:4px;">⚠️ CITIZEN FLOOD REPORT</div>
                    <div>Water Depth: <strong>${rep.waterDepthCm} cm</strong></div>
                    <div style="margin:4px 0; color:#cbd5e1;">"${rep.description}"</div>
                    <div style="font-size:10px; color:#94a3b8;">Reported: ${new Date(rep.timestamp).toLocaleTimeString()}</div>
                </div>
            `);
            this.layers.reports.addLayer(marker);
        });
    },

    /**
     * Render Navigation Route Polyline on Main Map
     */
    renderNavigationRoute: function(routeResult) {
        if (!this.layers.route) return;
        this.layers.route.clearLayers();

        if (routeResult.directRoute && routeResult.directRoute.pathCoordinates) {
            const directPoly = L.polyline(routeResult.directRoute.pathCoordinates, {
                color: "#ef4444",
                weight: 5,
                dashArray: "8, 8",
                opacity: 0.75
            }).bindTooltip("Direct Route (Flooded Underpass Hazard)");
            this.layers.route.addLayer(directPoly);
        }

        if (routeResult.safeRoute && routeResult.safeRoute.pathCoordinates) {
            const safePoly = L.polyline(routeResult.safeRoute.pathCoordinates, {
                color: "#10b981",
                weight: 6,
                opacity: 0.95
            }).bindTooltip("Recommended Safe Route (Elevated Bypass)");
            this.layers.route.addLayer(safePoly);
        }
    }
};
