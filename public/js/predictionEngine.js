/**
 * FloodSense - Transparent Hydrological Prediction Engine (0-3h Nowcasting)
 * Couples Rainfall Intensity, Drainage Network Graph Hydraulics, DEM Terrain, & Citizen Crowdsourced Reports
 */

window.PredictionEngine = {
    // Weights for transparent decision-support model
    weights: {
        rainfall: 0.35,      // Real-time & forecast precipitation
        drainage: 0.30,      // Graph hydraulic capacity utilization %
        terrain: 0.15,       // DEM elevation valley factor & slope %
        historical: 0.10,    // Historical flood frequency index
        citizenReports: 0.10 // Geotagged crowdsourced reports factor
    },

    /**
     * Calculate instant flood risk score & hydrologic metrics for a given zone
     */
    calculateZoneRisk: function(zone, drainageUtilizationPercent, citizenReports = [], globalRainfallMultiplier = 1.0) {
        // 1. Rainfall Contribution (0 - 100)
        const activeRainfall = (zone.baselineRainfall || 15) * globalRainfallMultiplier;
        const rainfallScore = Math.min(100, (activeRainfall / 90) * 100);

        // 2. Drainage Overload Contribution (0 - 100)
        const drainageScore = Math.min(100, drainageUtilizationPercent);

        // 3. Terrain DEM Contribution (0 - 100)
        // Lower elevation (e.g. 548m vs 580m) + low slope (0.8% vs 4.0%) accumulation penalty
        const elevationFactor = Math.max(0, Math.min(100, (585 - zone.elevationMeters) * 2.5));
        const slopeFactor = Math.max(0, Math.min(100, (4.5 - zone.slopePercent) * 20));
        const imperviousFactor = (zone.imperviousPercent || 75) * 0.3;
        const terrainScore = Math.min(100, (elevationFactor * 0.4) + (slopeFactor * 0.4) + imperviousFactor);

        // 4. Historical Risk Contribution (0 - 100)
        const historicalScore = zone.historicalRiskScore || 50;

        // 5. Citizen Live Reports Contribution (0 - 100)
        const zoneReports = citizenReports.filter(r => r.zoneId === zone.id);
        let liveReportScore = 0;
        if (zoneReports.length > 0) {
            const avgReportDepth = zoneReports.reduce((sum, r) => sum + (r.waterDepthCm || 10), 0) / zoneReports.length;
            liveReportScore = Math.min(100, zoneReports.length * 20 + avgReportDepth * 2);
        }

        // Calculate Weighted Sum
        const totalRiskScore = Math.round(
            (rainfallScore * this.weights.rainfall) +
            (drainageScore * this.weights.drainage) +
            (terrainScore * this.weights.terrain) +
            (historicalScore * this.weights.historical) +
            (liveReportScore * this.weights.citizenReports)
        );

        const boundedScore = Math.max(0, Math.min(100, totalRiskScore));

        // Determine Risk Category & Hazard Attributes
        let category = "LOW";
        let colorHex = "#10b981"; // Emerald green
        let actionRecommendation = "Conditions normal. Drainage operating safely within parameters.";

        if (boundedScore > 80) {
            category = "CRITICAL";
            colorHex = "#ef4444"; // Red pulse
            actionRecommendation = "CRITICAL WARNING: Move to elevated ground immediately. Avoid underpasses and low-lying roads.";
        } else if (boundedScore > 60) {
            category = "HIGH";
            colorHex = "#f97316"; // Orange
            actionRecommendation = "HIGH ALERT: Prepare for localized street flooding. Bypassing low-elevation routes recommended.";
        } else if (boundedScore > 30) {
            category = "MODERATE";
            colorHex = "#eab308"; // Yellow
            actionRecommendation = "WATCH: Drainage network nearing capacity. Exercise caution on riverside roads.";
        }

        // Estimate Water Accumulation Depth (cm)
        let estimatedWaterDepthCm = 0;
        if (boundedScore > 30) {
            estimatedWaterDepthCm = Math.round(((boundedScore - 30) / 70) * 45 + (drainageUtilizationPercent > 100 ? (drainageUtilizationPercent - 100) * 0.3 : 0));
        }

        // Estimate Time to Flooding (minutes)
        let expectedFloodingTimeMin = null;
        if (category === "CRITICAL") {
            expectedFloodingTimeMin = Math.max(10, Math.round(45 - (boundedScore - 80) * 1.2));
        } else if (category === "HIGH") {
            expectedFloodingTimeMin = Math.round(75 - (boundedScore - 60) * 1.5);
        } else if (category === "MODERATE") {
            expectedFloodingTimeMin = 120;
        }

        // Flood Probability %
        const floodProbability = Math.min(98, Math.round(boundedScore * 0.92 + 5));

        // Model Prediction Confidence %
        const confidencePercent = Math.round(88 + (zoneReports.length > 0 ? 6 : 0) + (drainageUtilizationPercent > 110 ? 4 : 0));

        return {
            zoneId: zone.id,
            zoneName: zone.name,
            riskScore: boundedScore,
            category: category,
            colorHex: colorHex,
            rainfallIntensityMmHr: Math.round(activeRainfall),
            drainageUtilizationPercent: Math.round(drainageUtilizationPercent),
            estimatedWaterDepthCm: estimatedWaterDepthCm,
            expectedFloodingTimeMin: expectedFloodingTimeMin,
            floodProbabilityPercent: floodProbability,
            confidencePercent: Math.min(99, confidencePercent),
            actionRecommendation: actionRecommendation,
            breakdown: {
                rainfallScore: Math.round(rainfallScore),
                drainageScore: Math.round(drainageScore),
                terrainScore: Math.round(terrainScore),
                historicalScore: Math.round(historicalScore),
                liveReportScore: Math.round(liveReportScore)
            }
        };
    },

    /**
     * Generate 0–3 Hour Interval Nowcast Timeline
     * Intervals: NOW (+0m), +30m, +60m, +90m, +120m, +180m
     */
    generate0to3HourNowcast: function(currentRiskResult, rainfallTrend = "RISING") {
        const intervals = [
            { minutes: 0, label: "NOW" },
            { minutes: 30, label: "+30 Min" },
            { minutes: 60, label: "+60 Min" },
            { minutes: 90, label: "+90 Min" },
            { minutes: 120, label: "+120 Min" },
            { minutes: 180, label: "+180 Min" }
        ];

        let baseScore = currentRiskResult.riskScore;

        return intervals.map(intv => {
            let intervalScore = baseScore;
            let factor = 1.0;

            if (rainfallTrend === "RISING") {
                // Growth curve for surging rainfall
                factor = 1.0 + (intv.minutes / 180) * 0.45;
            } else if (rainfallTrend === "CLOUDBURST") {
                // Rapid exponential surge
                factor = 1.0 + Math.pow(intv.minutes / 90, 1.2) * 0.7;
            } else if (rainfallTrend === "SUBSIDING") {
                // Decay curve
                factor = Math.max(0.3, 1.0 - (intv.minutes / 180) * 0.6);
            }

            intervalScore = Math.min(100, Math.round(baseScore * factor));

            let cat = "LOW";
            if (intervalScore > 80) cat = "CRITICAL";
            else if (intervalScore > 60) cat = "HIGH";
            else if (intervalScore > 30) cat = "MODERATE";

            const depthCm = intervalScore > 30 ? Math.round(((intervalScore - 30) / 70) * 50) : 0;
            const probability = Math.min(99, Math.round(intervalScore * 0.94 + 4));

            return {
                minutes: intv.minutes,
                label: intv.label,
                riskScore: intervalScore,
                category: cat,
                waterDepthCm: depthCm,
                floodProbabilityPercent: probability,
                predictedRainfallMmHr: Math.round(currentRiskResult.rainfallIntensityMmHr * factor)
            };
        });
    }
};
