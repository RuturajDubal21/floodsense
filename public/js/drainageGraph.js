/**
 * FloodSense - Directed Drainage Network Hydraulics Graph Engine
 * Tracks pipe capacities, stormwater runoff flow, pump activations, & backwater overflow surcharges
 */

window.DrainageGraphEngine = {
    /**
     * Compute current flow & utilization % across directed graph edges
     */
    processGraphState: function(edges, nodes, globalRainfallMultiplier = 1.0, blockedEdgeIds = [], activePumpOverrides = {}) {
        const processedEdges = edges.map(edge => {
            let flowMultiplier = globalRainfallMultiplier;
            const isBlocked = blockedEdgeIds.includes(edge.id);

            if (isBlocked) {
                // Blockage restricts capacity to 20%, causing upstream backwater surcharge
                flowMultiplier *= 0.2;
            }

            // Check if downstream node is an active pump
            const targetNode = nodes.find(n => n.id === edge.target);
            let pumpBoostLps = 0;

            if (targetNode && targetNode.type === "pump") {
                const isPumpOn = activePumpOverrides[targetNode.id] !== undefined ? activePumpOverrides[targetNode.id] : targetNode.pumpActive;
                if (isPumpOn) {
                    pumpBoostLps = targetNode.capacityLps * 0.4; // Pump evacuates 40% additional flow downstream
                }
            }

            const currentFlowLps = Math.round((edge.currentFlowLps * flowMultiplier) + pumpBoostLps);
            const capacityLps = isBlocked ? Math.round(edge.maxCapacityLps * 0.25) : edge.maxCapacityLps;
            const utilizationPercent = Math.round((currentFlowLps / capacityLps) * 100);

            let status = "NORMAL";
            if (utilizationPercent > 120 || isBlocked) {
                status = "SEVERE_OVERLOAD"; // Surface overflow condition
            } else if (utilizationPercent > 100) {
                status = "OVERLOAD";
            } else if (utilizationPercent > 75) {
                status = "WARNING";
            }

            return {
                ...edge,
                currentFlowLps: currentFlowLps,
                effectiveCapacityLps: capacityLps,
                utilizationPercent: utilizationPercent,
                status: status,
                isBlocked: isBlocked
            };
        });

        // Compute aggregate zone drainage utilization percentages
        const zoneUtilization = {};
        processedEdges.forEach(edge => {
            if (!zoneUtilization[edge.zoneId]) {
                zoneUtilization[edge.zoneId] = {
                    totalFlow: 0,
                    totalCapacity: 0,
                    edgeCount: 0
                };
            }
            zoneUtilization[edge.zoneId].totalFlow += edge.currentFlowLps;
            zoneUtilization[edge.zoneId].totalCapacity += edge.effectiveCapacityLps;
            zoneUtilization[edge.zoneId].edgeCount += 1;
        });

        const zoneResults = {};
        Object.keys(zoneUtilization).forEach(zoneId => {
            const z = zoneUtilization[zoneId];
            zoneResults[zoneId] = Math.round((z.totalFlow / Math.max(1, z.totalCapacity)) * 100);
        });

        // City-wide average utilization
        const totalCityFlow = processedEdges.reduce((sum, e) => sum + e.currentFlowLps, 0);
        const totalCityCapacity = processedEdges.reduce((sum, e) => sum + e.effectiveCapacityLps, 0);
        const cityAverageUtilizationPercent = Math.round((totalCityFlow / Math.max(1, totalCityCapacity)) * 100);

        return {
            edges: processedEdges,
            nodes: nodes,
            zoneUtilization: zoneResults,
            cityAverageUtilizationPercent: cityAverageUtilizationPercent
        };
    }
};
