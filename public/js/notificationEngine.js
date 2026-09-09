/**
 * FloodSense - Disaster Notification & Multi-Channel Alert Engine
 * Handles Browser Push Notifications, Audio Sirens, In-App Toasts, Alert Cooldowns, & SMS/Email Mock Architecture
 */

window.NotificationEngine = {
    currentEscalationLevel: "NORMAL",
    lastNotificationTime: 0,
    cooldownMs: 15000, // 15 seconds cooldown for demo reactivity
    audioContext: null,
    outboundLogs: [],

    /**
     * Request Browser Notification Permission
     */
    requestPermission: function() {
        if ("Notification" in window && Notification.permission !== "granted") {
            Notification.requestPermission();
        }
    },

    /**
     * Synthesize audio warning siren using Web Audio API
     */
    playAudioAlarm: function(level) {
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            if (this.audioContext.state === "suspended") {
                this.audioContext.resume();
            }

            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = level === "CRITICAL" ? "sawtooth" : "sine";
            osc.frequency.setValueAtTime(level === "CRITICAL" ? 880 : 440, this.audioContext.currentTime);
            osc.frequency.exponentialRampToValueAtTime(level === "CRITICAL" ? 440 : 660, this.audioContext.currentTime + 0.6);

            gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.7);

            osc.connect(gain);
            gain.connect(this.audioContext.destination);

            osc.start();
            osc.stop(this.audioContext.currentTime + 0.7);
        } catch (err) {
            console.warn("Audio Context playback prevented by browser policy:", err);
        }
    },

    /**
     * Evaluate risk level and dispatch multi-channel alert
     */
    evaluateAndDispatch: function(zoneRiskResult, userLocationName, onTriggerToast) {
        const now = Date.now();
        const level = zoneRiskResult.category;

        // Update escalation level
        this.currentEscalationLevel = level;

        // Only trigger push & sound if HIGH or CRITICAL and past cooldown
        if ((level === "HIGH" || level === "CRITICAL") && (now - this.lastNotificationTime > this.cooldownMs)) {
            this.lastNotificationTime = now;

            // 1. Audio siren play
            this.playAudioAlarm(level);

            const alertTitle = level === "CRITICAL" ? "🔴 CRITICAL URBAN FLOOD ALERT" : "🟠 HIGH FLOOD WARNING";
            const alertBody = `Heavy rainfall may cause flooding near ${zoneRiskResult.zoneName} in the next ${zoneRiskResult.expectedFloodingTimeMin || 30} minutes. Water Depth: ${zoneRiskResult.estimatedWaterDepthCm} cm. Evacuate low roads!`;

            // 2. Native Browser Push Notification
            if ("Notification" in window && Notification.permission === "granted") {
                new Notification(alertTitle, {
                    body: alertBody,
                    icon: "/assets/flood_icon.png",
                    tag: "floodsense-alert"
                });
            }

            // 3. Dispatch In-App Toast callback
            if (typeof onTriggerToast === "function") {
                onTriggerToast({
                    title: alertTitle,
                    message: alertBody,
                    level: level,
                    waterDepthCm: zoneRiskResult.estimatedWaterDepthCm,
                    expectedMin: zoneRiskResult.expectedFloodingTimeMin,
                    zoneName: zoneRiskResult.zoneName,
                    action: zoneRiskResult.actionRecommendation
                });
            }

            // 4. Log SMS & Email Architecture Payloads
            this.logMultiChannelDispatch(zoneRiskResult, userLocationName);
        }
    },

    /**
     * Log SMS (Twilio JSON format) and Email (SMTP JSON format) architecture payloads
     */
    logMultiChannelDispatch: function(zoneRisk, userLocationName) {
        const timestamp = new Date().toISOString();

        const smsPayload = {
            id: `sms-${Date.now()}`,
            channel: "SMS (Twilio Gateway)",
            recipient: "+91-9876543210",
            sender: "FLDSNS-ALERT",
            status: "DELIVERED",
            timestamp: timestamp,
            message: `[EMERGENCY] FloodSense: ${zoneRisk.category} Flood Risk detected at ${zoneRisk.zoneName}. Expected Depth: ${zoneRisk.estimatedWaterDepthCm}cm within ${zoneRisk.expectedFloodingTimeMin} mins. Safe route: https://floodsense.gov.in/route`
        };

        const emailPayload = {
            id: `email-${Date.now()}`,
            channel: "Email (SMTP Service)",
            recipient: "citizen.user@punecorporation.gov.in",
            subject: `[FLOODSENSE NOTICE] ${zoneRisk.category} Risk Alert for ${zoneRisk.zoneName}`,
            status: "SENT",
            timestamp: timestamp,
            body: `Dear Citizen,\n\nOur hydrological sensor network and coupled DEM engine detected ${zoneRisk.category} flood risk for ${zoneRisk.zoneName} (${userLocationName}).\n\nRainfall Intensity: ${zoneRisk.rainfallIntensityMmHr} mm/hr\nPredicted Water Depth: ${zoneRisk.estimatedWaterDepthCm} cm\nExpected Time: ${zoneRisk.expectedFloodingTimeMin} mins\nConfidence: ${zoneRisk.confidencePercent}%\n\nPlease follow emergency authority instructions.\n\nFloodSense Disaster Management Team`
        };

        this.outboundLogs.unshift(smsPayload, emailPayload);
        if (this.outboundLogs.length > 30) this.outboundLogs.pop();
    }
};
