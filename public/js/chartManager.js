/**
 * FloodSense - Refined Canvas/SVG Analytics Chart Engine
 * Renders Smooth Bezier Curve Forecasts, Gradient Risk Fills, & Hydraulics Visualizations
 */

window.ChartManager = {
    /**
     * Render SVG/Canvas Bezier Curve Chart for 0-3h Nowcast Trajectory
     */
    renderNowcastChart: function(canvasId, nowcastIntervals) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        const width = canvas.width = canvas.parentElement.clientWidth || 600;
        const height = canvas.height = 220;

        ctx.clearRect(0, 0, width, height);

        const padding = { top: 25, right: 35, bottom: 40, left: 45 };
        const graphWidth = width - padding.left - padding.right;
        const graphHeight = height - padding.top - padding.bottom;

        // Draw Grid Lines & Axis Labels
        ctx.strokeStyle = "rgba(51, 65, 85, 0.4)";
        ctx.lineWidth = 1;
        ctx.font = "10px Inter, sans-serif";
        ctx.fillStyle = "#94a3b8";

        for (let i = 0; i <= 4; i++) {
            const y = padding.top + (graphHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();

            const scoreVal = 100 - i * 25;
            ctx.fillText(`${scoreVal}%`, 12, y + 4);
        }

        if (!nowcastIntervals || nowcastIntervals.length === 0) return;

        // Calculate Data Points
        const points = nowcastIntervals.map((intv, idx) => {
            const x = padding.left + (graphWidth / (nowcastIntervals.length - 1)) * idx;
            const y = padding.top + graphHeight - (intv.riskScore / 100) * graphHeight;
            return { x, y, val: intv.riskScore, label: intv.label, depth: intv.waterDepthCm, cat: intv.category };
        });

        // Fill Area Under Bezier Curve
        const fillGradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
        const maxScore = Math.max(...nowcastIntervals.map(i => i.riskScore));
        
        if (maxScore > 80) {
            fillGradient.addColorStop(0, "rgba(239, 68, 68, 0.45)");
            fillGradient.addColorStop(0.6, "rgba(249, 115, 22, 0.2)");
        } else if (maxScore > 60) {
            fillGradient.addColorStop(0, "rgba(249, 115, 22, 0.4)");
            fillGradient.addColorStop(0.6, "rgba(234, 179, 8, 0.2)");
        } else {
            fillGradient.addColorStop(0, "rgba(16, 185, 129, 0.35)");
            fillGradient.addColorStop(0.6, "rgba(16, 185, 129, 0.05)");
        }
        fillGradient.addColorStop(1, "rgba(15, 23, 42, 0.0)");

        ctx.fillStyle = fillGradient;
        ctx.beginPath();
        ctx.moveTo(points[0].x, height - padding.bottom);

        // Smooth Bezier Curve Path
        for (let i = 0; i < points.length - 1; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2;
            const yc = (points[i].y + points[i + 1].y) / 2;
            ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
        ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
        ctx.closePath();
        ctx.fill();

        // Stroke Main Curve
        let strokeColor = "#10b981";
        if (maxScore > 80) strokeColor = "#ef4444";
        else if (maxScore > 60) strokeColor = "#f97316";
        else if (maxScore > 30) strokeColor = "#eab308";

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 3;
        ctx.shadowColor = strokeColor;
        ctx.shadowBlur = 8;

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 0; i < points.length - 1; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2;
            const yc = (points[i].y + points[i + 1].y) / 2;
            ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
        ctx.stroke();

        ctx.shadowBlur = 0; // Reset glow for markers

        // Render Interactive Data Nodes & Text Badges
        points.forEach(p => {
            let pointColor = "#10b981";
            if (p.val > 80) pointColor = "#ef4444";
            else if (p.val > 60) pointColor = "#f97316";
            else if (p.val > 30) pointColor = "#eab308";

            // Outer Pulse Ring
            ctx.fillStyle = pointColor;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;
            ctx.stroke();

            // Value Tag
            ctx.fillStyle = "#f8fafc";
            ctx.font = "bold 11px Inter, sans-serif";
            ctx.fillText(`${p.val}% (${p.depth}cm)`, p.x - 22, p.y - 12);

            // X-Axis Interval Label
            ctx.fillStyle = "#94a3b8";
            ctx.font = "11px Inter, sans-serif";
            ctx.fillText(p.label, p.x - 16, height - 12);
        });
    },

    /**
     * Render Bar Chart for Drainage Channel Capacity Utilization %
     */
    renderDrainageBarChart: function(containerId, edgeList) {
        const container = document.getElementById(containerId);
        if (!container) return;

        let html = `<div style="display:flex; flex-direction:column; gap:12px;">`;
        edgeList.slice(0, 6).forEach(edge => {
            const util = edge.utilizationPercent;
            let barColor = "#10b981";
            if (util > 120) barColor = "#ef4444";
            else if (util > 100) barColor = "#f97316";
            else if (util > 75) barColor = "#eab308";

            html += `
                <div class="card-box" style="padding:12px;">
                    <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:6px; color:#cbd5e1;">
                        <span><strong>💧 Drain Pipe: ${edge.id}</strong> (Zone: ${edge.zoneId})</span>
                        <span>Flow: <strong>${edge.currentFlowLps}</strong> / ${edge.effectiveCapacityLps} L/s (<strong style="color:${barColor};">${util}%</strong>)</span>
                    </div>
                    <div style="background:#0f172a; height:12px; border-radius:6px; overflow:hidden; border:1px solid rgba(255,255,255,0.08);">
                        <div style="width:${Math.min(100, util)}%; background:${barColor}; height:100%; transition:width 0.6s cubic-bezier(0.16, 1, 0.3, 1); box-shadow:0 0 10px ${barColor};"></div>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
        container.innerHTML = html;
    }
};
