/**
 * FloodSense - Core Geospatial & Hydrological Dataset
 * Geographic Focus: Pune Metropolitan Area (Urban Flood Hotspot Model)
 */

window.FLOODSENSE_DATA = {
    // City Metadata
    city: {
        name: "Pune Metropolitan Area",
        center: [18.5204, 73.8567],
        defaultZoom: 13,
        elevationAvgMeters: 560
    },

    // Flood Zones with DEM, Soil, and Hydrological Attributes
    zones: [
        {
            id: "zone-wakad",
            name: "Wakad Sub-basin",
            areaSqKm: 4.2,
            center: [18.5987, 73.7634],
            elevationMeters: 554, // Low lying valley
            slopePercent: 1.2, // Very low slope -> water accumulates
            imperviousPercent: 78, // High urbanization / asphalt
            historicalRiskScore: 75,
            baselineRainfall: 15, // mm/hr
            drainageCapacityLps: 4500, // Liters per second capacity
            coordinates: [
                [18.6100, 73.7500],
                [18.6120, 73.7750],
                [18.5900, 73.7800],
                [18.5850, 73.7550]
            ],
            sheltersNearby: ["Wakad Municipal School", "Ginger Hotel Relief Camp"],
            criticalInfrastructure: ["Wakad Flyover Underpass", "Bhujbal Chowk"]
        },
        {
            id: "zone-baner",
            name: "Baner Highway Corridor",
            areaSqKm: 3.8,
            center: [18.5590, 73.7868],
            elevationMeters: 562,
            slopePercent: 2.1,
            imperviousPercent: 82,
            historicalRiskScore: 60,
            baselineRainfall: 15,
            drainageCapacityLps: 5200,
            coordinates: [
                [18.5750, 73.7750],
                [18.5780, 73.7980],
                [18.5450, 73.8000],
                [18.5480, 73.7780]
            ],
            sheltersNearby: ["Baner Community Hall"],
            criticalInfrastructure: ["Baner Pashan Link Road Bridge"]
        },
        {
            id: "zone-aundh",
            name: "Aundh - Mula River Bank",
            areaSqKm: 3.1,
            center: [18.5626, 73.8087],
            elevationMeters: 548, // River basin elevation (Low)
            slopePercent: 0.8,
            imperviousPercent: 75,
            historicalRiskScore: 85, // River spillover risk
            baselineRainfall: 15,
            drainageCapacityLps: 3800,
            coordinates: [
                [18.5750, 73.8000],
                [18.5720, 73.8220],
                [18.5500, 73.8200],
                [18.5520, 73.7980]
            ],
            sheltersNearby: ["Aundh Sports Complex"],
            criticalInfrastructure: ["Spicer College Bridge", "DP Road Outlet"]
        },
        {
            id: "zone-hinjewadi",
            name: "Hinjewadi IT Phase 1",
            areaSqKm: 5.5,
            center: [18.5912, 73.7389],
            elevationMeters: 575,
            slopePercent: 3.5,
            imperviousPercent: 88,
            historicalRiskScore: 40,
            baselineRainfall: 15,
            drainageCapacityLps: 6000,
            coordinates: [
                [18.6050, 73.7200],
                [18.6080, 73.7500],
                [18.5780, 73.7550],
                [18.5750, 73.7250]
            ],
            sheltersNearby: ["Wipro Circle Shelter"],
            criticalInfrastructure: ["Rajiv Gandhi Infotech Park Gate 1"]
        },
        {
            id: "zone-shivajinagar",
            name: "Shivajinagar Central Basin",
            areaSqKm: 4.0,
            center: [18.5308, 73.8474],
            elevationMeters: 550,
            slopePercent: 1.0,
            imperviousPercent: 90,
            historicalRiskScore: 80,
            baselineRainfall: 15,
            drainageCapacityLps: 4100,
            coordinates: [
                [18.5420, 73.8350],
                [18.5450, 73.8600],
                [18.5200, 73.8620],
                [18.5180, 73.8380]
            ],
            sheltersNearby: ["Shivajinagar Railway Colony Shelter"],
            criticalInfrastructure: ["COEP Underpass", "Kamgar Putla"]
        },
        {
            id: "zone-kothrud",
            name: "Kothrud - Paud Road",
            areaSqKm: 4.8,
            center: [18.5074, 73.8077],
            elevationMeters: 582, // Higher ground
            slopePercent: 4.2,
            imperviousPercent: 70,
            historicalRiskScore: 25,
            baselineRainfall: 15,
            drainageCapacityLps: 5800,
            coordinates: [
                [18.5200, 73.7900],
                [18.5220, 73.8200],
                [18.4950, 73.8220],
                [18.4920, 73.7920]
            ],
            sheltersNearby: ["Kothrud Yashwantrao Chavan Auditorium"],
            criticalInfrastructure: ["Chandani Chowk Junction"]
        },
        {
            id: "zone-pashan",
            name: "Pashan Lake Catchment",
            areaSqKm: 3.5,
            center: [18.5400, 73.7900],
            elevationMeters: 568,
            slopePercent: 2.5,
            imperviousPercent: 62,
            historicalRiskScore: 50,
            baselineRainfall: 15,
            drainageCapacityLps: 4900,
            coordinates: [
                [18.5520, 73.7780],
                [18.5500, 73.8000],
                [18.5300, 73.8020],
                [18.5320, 73.7800]
            ],
            sheltersNearby: ["Pashan Gram Panchayat Hall"],
            criticalInfrastructure: ["Pashan Spillway Outlet"]
        },
        {
            id: "zone-vimannagar",
            name: "Viman Nagar Airport Basin",
            areaSqKm: 4.1,
            center: [18.5679, 73.9143],
            elevationMeters: 565,
            slopePercent: 1.8,
            imperviousPercent: 85,
            historicalRiskScore: 55,
            baselineRainfall: 15,
            drainageCapacityLps: 5100,
            coordinates: [
                [18.5800, 73.9000],
                [18.5820, 73.9280],
                [18.5550, 73.9300],
                [18.5530, 73.9020]
            ],
            sheltersNearby: ["Viman Nagar Symbiosis Hall"],
            criticalInfrastructure: ["Airport Road Culvert"]
        }
    ],

    // Directed Drainage Network Graph
    drainageNodes: [
        { id: "node-inlet-wakad-1", name: "Wakad Main Inlet", type: "inlet", coords: [18.6010, 73.7580], elevation: 556 },
        { id: "node-mh-wakad-2", name: "Wakad Junction Manhole #4", type: "manhole", coords: [18.5950, 73.7640], elevation: 554 },
        { id: "node-pump-wakad", name: "Wakad Underpass Pump Station #1", type: "pump", coords: [18.5920, 73.7660], elevation: 552, status: "ONLINE", capacityLps: 1500, pumpActive: false },
        
        { id: "node-inlet-baner-1", name: "Baner Highstreet Drain Inlet", type: "inlet", coords: [18.5650, 73.7820], elevation: 564 },
        { id: "node-mh-baner-2", name: "Baner Trunk Line Manhole #8", type: "manhole", coords: [18.5590, 73.7880], elevation: 560 },
        { id: "node-pump-baner", name: "Baner Expressway Storm Pump #2", type: "pump", coords: [18.5560, 73.7910], elevation: 558, status: "ONLINE", capacityLps: 1200, pumpActive: false },

        { id: "node-inlet-aundh-1", name: "Aundh DP Road Storm Inlet", type: "inlet", coords: [18.5680, 73.8050], elevation: 550 },
        { id: "node-mh-aundh-2", name: "Spicer College Manhole #12", type: "manhole", coords: [18.5630, 73.8100], elevation: 548 },
        
        { id: "node-inlet-shiva-1", name: "COEP Underpass Drain Sump", type: "inlet", coords: [18.5320, 73.8450], elevation: 549 },
        { id: "node-pump-shiva", name: "Shivajinagar Metro Pump #3", type: "pump", coords: [18.5300, 73.8490], elevation: 547, status: "ONLINE", capacityLps: 2000, pumpActive: true },

        { id: "node-outlet-mula-1", name: "Mula River Outlet #1 (Wakad-Baner)", type: "outlet", coords: [18.5690, 73.8120], elevation: 544 },
        { id: "node-outlet-mula-2", name: "Mula-Mutha Confluence Outlet #2", type: "outlet", coords: [18.5280, 73.8560], elevation: 542 }
    ],

    drainageEdges: [
        {
            id: "edge-w1-w2",
            source: "node-inlet-wakad-1",
            target: "node-mh-wakad-2",
            diameterMm: 1200,
            lengthMeters: 850,
            maxCapacityLps: 2200,
            currentFlowLps: 800,
            status: "NORMAL", // NORMAL, BLOCKED, OVERLOAD
            zoneId: "zone-wakad"
        },
        {
            id: "edge-w2-pw",
            source: "node-mh-wakad-2",
            target: "node-pump-wakad",
            diameterMm: 1500,
            lengthMeters: 620,
            maxCapacityLps: 3000,
            currentFlowLps: 1100,
            status: "NORMAL",
            zoneId: "zone-wakad"
        },
        {
            id: "edge-pw-b1",
            source: "node-pump-wakad",
            target: "node-inlet-baner-1",
            diameterMm: 1400,
            lengthMeters: 1800,
            maxCapacityLps: 2800,
            currentFlowLps: 950,
            status: "NORMAL",
            zoneId: "zone-baner"
        },
        {
            id: "edge-b1-b2",
            source: "node-inlet-baner-1",
            target: "node-mh-baner-2",
            diameterMm: 1600,
            lengthMeters: 900,
            maxCapacityLps: 3400,
            currentFlowLps: 1200,
            status: "NORMAL",
            zoneId: "zone-baner"
        },
        {
            id: "edge-b2-a1",
            source: "node-mh-baner-2",
            target: "node-inlet-aundh-1",
            diameterMm: 1800,
            lengthMeters: 1400,
            maxCapacityLps: 4000,
            currentFlowLps: 1500,
            status: "NORMAL",
            zoneId: "zone-aundh"
        },
        {
            id: "edge-a1-out1",
            source: "node-inlet-aundh-1",
            target: "node-outlet-mula-1",
            diameterMm: 2000,
            lengthMeters: 750,
            maxCapacityLps: 5000,
            currentFlowLps: 1800,
            status: "NORMAL",
            zoneId: "zone-aundh"
        },
        {
            id: "edge-s1-ps",
            source: "node-inlet-shiva-1",
            target: "node-pump-shiva",
            diameterMm: 1500,
            lengthMeters: 500,
            maxCapacityLps: 3200,
            currentFlowLps: 1600,
            status: "NORMAL",
            zoneId: "zone-shivajinagar"
        },
        {
            id: "edge-ps-out2",
            source: "node-pump-shiva",
            target: "node-outlet-mula-2",
            diameterMm: 2200,
            lengthMeters: 600,
            maxCapacityLps: 5500,
            currentFlowLps: 2100,
            status: "NORMAL",
            zoneId: "zone-shivajinagar"
        }
    ],

    // Road Segments for Safety-First Navigation Routing
    roads: [
        {
            id: "road-wakad-underpass",
            name: "Wakad Flyover Underpass Road",
            fromCoords: [18.6010, 73.7580],
            toCoords: [18.5920, 73.7660],
            zoneId: "zone-wakad",
            lengthKm: 1.2,
            baseTravelTimeMin: 3,
            isBlocked: false,
            elevation: 553, // Low point - prone to flooding
            path: [
                [18.6010, 73.7580],
                [18.5960, 73.7620],
                [18.5920, 73.7660]
            ]
        },
        {
            id: "road-wakad-ring",
            name: "Wakad Elevated Bypass Road (Safe Alternate)",
            fromCoords: [18.6010, 73.7580],
            toCoords: [18.5780, 73.7750],
            zoneId: "zone-wakad",
            lengthKm: 3.1,
            baseTravelTimeMin: 6,
            isBlocked: false,
            elevation: 568, // High elevated ridge
            path: [
                [18.6010, 73.7580],
                [18.6050, 73.7700],
                [18.5880, 73.7740],
                [18.5780, 73.7750]
            ]
        },
        {
            id: "road-baner-highway",
            name: "Baner Main Arterial Road",
            fromCoords: [18.5780, 73.7750],
            toCoords: [18.5560, 73.7910],
            zoneId: "zone-baner",
            lengthKm: 2.8,
            baseTravelTimeMin: 5,
            isBlocked: false,
            elevation: 561,
            path: [
                [18.5780, 73.7750],
                [18.5680, 73.7840],
                [18.5560, 73.7910]
            ]
        },
        {
            id: "road-pashan-hill-route",
            name: "Pashan Hill Ridge Road (Elevated Safe Highway)",
            fromCoords: [18.5780, 73.7750],
            toCoords: [18.5420, 73.8350],
            zoneId: "zone-pashan",
            lengthKm: 6.5,
            baseTravelTimeMin: 11,
            isBlocked: false,
            elevation: 574,
            path: [
                [18.5780, 73.7750],
                [18.5520, 73.7800],
                [18.5400, 73.8050],
                [18.5420, 73.8350]
            ]
        },
        {
            id: "road-aundh-dp-road",
            name: "Aundh DP Low River Road",
            fromCoords: [18.5560, 73.7910],
            toCoords: [18.5420, 73.8350],
            zoneId: "zone-aundh",
            lengthKm: 4.2,
            baseTravelTimeMin: 8,
            isBlocked: false,
            elevation: 549, // Flood-prone riverside road
            path: [
                [18.5560, 73.7910],
                [18.5630, 73.8100],
                [18.5480, 73.8250],
                [18.5420, 73.8350]
            ]
        }
    ],

    // Emergency Facilities Data
    emergencyServices: [
        { id: "hosp-1", name: "Surya Mother & Child Super Specialty Hospital", type: "hospital", coords: [18.5975, 73.7645], phone: "108 / +91-20-67911111", zoneId: "zone-wakad" },
        { id: "hosp-2", name: "Jupiter Hospital Baner", type: "hospital", coords: [18.5620, 73.7890], phone: "+91-20-27992799", zoneId: "zone-baner" },
        { id: "hosp-3", name: "Sashwat Hospital Aundh", type: "hospital", coords: [18.5600, 73.8060], phone: "+91-20-25880020", zoneId: "zone-aundh" },
        
        { id: "shelter-1", name: "Wakad Municipal Primary School Relief Camp", type: "shelter", coords: [18.5990, 73.7610], capacity: 500, currentOccupancy: 42, zoneId: "zone-wakad" },
        { id: "shelter-2", name: "Baner Community Disaster Shelter", type: "shelter", coords: [18.5670, 73.7850], capacity: 750, currentOccupancy: 15, zoneId: "zone-baner" },
        { id: "shelter-3", name: "Shivajinagar COEP Indoor Stadium Camp", type: "shelter", coords: [18.5300, 73.8520], capacity: 1200, currentOccupancy: 88, zoneId: "zone-shivajinagar" },

        { id: "fire-1", name: "Pimpri Chinchwad Main Fire Station", type: "fire_station", coords: [18.6250, 73.8100], phone: "101", boatsAvailable: 6, zoneId: "zone-wakad" },
        { id: "fire-2", name: "Shivajinagar Disaster Management Fire HQ", type: "fire_station", coords: [18.5310, 73.8440], phone: "101", boatsAvailable: 12, zoneId: "zone-shivajinagar" }
    ],

    // Default Citizen User Coordinates
    defaultUserLocation: {
        name: "Wakad Chowk (Current GPS)",
        coords: [18.5960, 73.7620],
        zoneId: "zone-wakad",
        homeLocation: [18.5990, 73.7610],
        workLocation: [18.5308, 73.8474],
        alertRadiusKm: 2.0
    }
};
