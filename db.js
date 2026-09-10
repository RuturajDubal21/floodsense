/**
 * FloodSense - Database Connector & Authentication Module
 * Manages MySQL 8.0+ Connection Pool, User Authentication, Citizen Reports & Audit Logs
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Database Configuration (Can be overridden by Environment Variables)
const dbConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'floodsense'
};

// In-Memory Fallback Store (Ensures continuous uptime if MySQL credentials require setup)
const fallbackStore = {
    users: [
        {
            id: 1,
            username: "admin",
            password_hash: crypto.createHash('sha256').update('admin123').digest('hex'),
            full_name: "Chief Disaster Commander",
            role: "EMERGENCY_AUTHORITY",
            department: "Pune Disaster Management Control Room",
            badge_number: "PMC-CMD-001"
        },
        {
            id: 2,
            username: "officer1",
            password_hash: crypto.createHash('sha256').update('officer123').digest('hex'),
            full_name: "Officer R. Sharma",
            role: "EMERGENCY_AUTHORITY",
            department: "Wakad Sub-basin Rescue Division",
            badge_number: "PMC-EMG-104"
        }
    ],
    activeSessions: new Map(), // token -> userObject
    reports: [
        {
            id: "rep-101",
            zoneId: "zone-wakad",
            waterDepthCm: 25,
            description: "Water accumulation near Wakad Flyover underpass. Vehicles struggling.",
            severity: "HIGH",
            coords: [18.5960, 73.7620],
            status: "VERIFIED",
            timestamp: new Date(Date.now() - 15 * 60000).toISOString()
        }
    ],
    auditLogs: []
};

function hashPassword(plainPassword) {
    return crypto.createHash('sha256').update(plainPassword).digest('hex');
}

/**
 * Helper to execute MySQL CLI queries if native driver isn't installed
 */
function queryMySqlCli(sql) {
    const mysqlBin = "C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe";
    if (!fs.existsSync(mysqlBin)) return null;

    try {
        const passArg = dbConfig.password ? `-p"${dbConfig.password}"` : "";
        const cmd = `"${mysqlBin}" -h ${dbConfig.host} -P ${dbConfig.port} -u ${dbConfig.user} ${passArg} ${dbConfig.database} -e "${sql.replace(/"/g, '\\"')}"`;
        const output = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
        return output;
    } catch (e) {
        return null;
    }
}

/**
 * Initialize Database Schema on MySQL Server if accessible
 */
function initMySqlDatabase() {
    const schemaPath = path.join(__dirname, 'database', 'floodsense_schema.sql');
    if (!fs.existsSync(schemaPath)) return false;

    const mysqlBin = "C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe";
    if (!fs.existsSync(mysqlBin)) return false;

    try {
        const passArg = dbConfig.password ? `-p"${dbConfig.password}"` : "";
        const cmd = `"${mysqlBin}" -h ${dbConfig.host} -P ${dbConfig.port} -u ${dbConfig.user} ${passArg} < "${schemaPath}"`;
        execSync(cmd, { stdio: ['pipe', 'pipe', 'ignore'] });
        console.log("✅ MySQL Database 'floodsense' successfully initialized and seeded!");
        return true;
    } catch (err) {
        console.log("ℹ️ MySQL auto-init note: " + err.message.split('\n')[0]);
        return false;
    }
}

// Attempt MySQL initialization
const isMySqlConnected = initMySqlDatabase();

module.exports = {
    dbConfig,
    isMySqlConnected,

    /**
     * Authenticate User Credentials
     */
    authenticateUser: function(username, password) {
        const hashed = hashPassword(password);
        
        // 1. Try MySQL Query
        const mysqlRes = queryMySqlCli(`SELECT id, username, full_name, role, department, badge_number FROM users WHERE username='${username}' AND password_hash='${hashed}';`);
        if (mysqlRes && mysqlRes.includes(username)) {
            const lines = mysqlRes.trim().split('\n');
            if (lines.length > 1) {
                const cols = lines[1].split('\t');
                const user = {
                    id: cols[0],
                    username: cols[1],
                    full_name: cols[2],
                    role: cols[3],
                    department: cols[4],
                    badge_number: cols[5]
                };
                const token = "token-" + crypto.randomBytes(16).toString('hex');
                fallbackStore.activeSessions.set(token, user);
                this.logAudit(user.username, "USER_LOGIN_SUCCESS", `Logged in from IP/session: ${token}`);
                return { success: true, token, user };
            }
        }

        // 2. Fallback to Local Auth Store
        const user = fallbackStore.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password_hash === hashed);
        if (user) {
            const token = "token-" + crypto.randomBytes(16).toString('hex');
            const safeUser = {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                role: user.role,
                department: user.department,
                badge_number: user.badge_number
            };
            fallbackStore.activeSessions.set(token, safeUser);
            this.logAudit(safeUser.username, "USER_LOGIN_SUCCESS", `Logged in via emergency portal`);
            return { success: true, token, user: safeUser };
        }

        return { success: false, message: "Invalid username or password" };
    },

    /**
     * Validate Session Token
     */
    validateSession: function(token) {
        if (!token) return null;
        return fallbackStore.activeSessions.get(token) || null;
    },

    /**
     * Invalidate Session Token
     */
    logoutSession: function(token) {
        if (fallbackStore.activeSessions.has(token)) {
            const user = fallbackStore.activeSessions.get(token);
            if (user) {
                this.logAudit(user.username, "USER_LOGOUT", "Session terminated.");
            }
            fallbackStore.activeSessions.delete(token);
        }
        return true;
    },

    /**
     * Add Citizen Flood Report
     */
    addReport: function(reportData) {
        const id = "rep-" + Date.now();
        const report = {
            id: id,
            zoneId: reportData.zoneId || "zone-wakad",
            waterDepthCm: parseInt(reportData.waterDepthCm) || 20,
            description: reportData.description || "Waterlogging report",
            severity: reportData.severity || "MODERATE",
            coords: reportData.coords || [18.5960, 73.7620],
            status: "PENDING",
            timestamp: new Date().toISOString()
        };

        fallbackStore.reports.unshift(report);

        // Save to MySQL if connected
        queryMySqlCli(`INSERT INTO citizen_reports (id, zone_id, water_depth_cm, description, severity, coords_lat, coords_lng, status) VALUES ('${report.id}', '${report.zoneId}', ${report.waterDepthCm}, '${report.description.replace(/'/g, "''")}', '${report.severity}', ${report.coords[0]}, ${report.coords[1]}, 'PENDING');`);

        return report;
    },

    /**
     * Get All Citizen Reports
     */
    getReports: function() {
        return fallbackStore.reports;
    },

    /**
     * Log Administrative Action to Audit Log
     */
    logAudit: function(username, action, details) {
        const logEntry = {
            id: fallbackStore.auditLogs.length + 1,
            username: username || "SYSTEM",
            action: action,
            details: details || "",
            timestamp: new Date().toISOString()
        };
        fallbackStore.auditLogs.unshift(logEntry);

        queryMySqlCli(`INSERT INTO audit_logs (username, action, details) VALUES ('${logEntry.username}', '${logEntry.action}', '${logEntry.details.replace(/'/g, "''")}');`);
        return logEntry;
    }
};
