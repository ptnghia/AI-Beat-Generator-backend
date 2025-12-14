# 🎯 Port Management Strategy - AI Beat Generator

## ✅ Đã chọn: Project ID 40

### 📋 Quy tắc phân bổ Port VPS

```
Format: [Project_ID][Service_Type][Instance]
Example: 4000 = Project 40 + Service 00 + Instance 0
```

### 🔢 Project ID Ranges (Chiến lược VPS)

| Range | Purpose | Example |
|-------|---------|---------|
| 10-19 | System & Infrastructure | Monitoring, Backups |
| 20-29 | Web Applications | Websites, Portals |
| 30-39 | API Services | REST APIs, Microservices |
| **40-49** | **Database Services** | **← AI Beat Generator HERE** |
| 50-59 | Development Tools | pgAdmin, Testing |
| 60-69 | Client Projects | Customer apps |
| 70-79 | Internal Tools | Dashboards |
| 80-89 | VPS Monitor Pro | Current system |
| 90-99 | Experimental | POCs, Staging |

### 🎵 AI Beat Generator (ID: 40)

**Lý do chọn ID 40**:
- ✅ Dự án liên quan đến **AI/Data processing**
- ✅ Range 40-49 dành cho **Database Services**
- ✅ Phù hợp với tính chất xử lý dữ liệu âm nhạc
- ✅ Không conflict với các dự án khác

### 📊 Port Allocation

| Service | Port | Service Type | Usage |
|---------|------|--------------|-------|
| **Main API** | **4000** | 00 - Main Application | REST API endpoints |
| Admin Panel | 4060 | 06 - Admin Panel | Admin interface |
| Monitoring | 4070 | 07 - Monitoring | Health checks, metrics |
| Testing | 4080 | 08 - Testing | Test environment |

### 🌐 Current VPS Port Usage

**Occupied Ports**:
- Port 443: node (HTTPS)
- Port 5135: node
- Port 5432: PostgreSQL
- Port 6379: Redis
- Port 6380: Redis (lifetech-website)
- Port 7000: PM2

**Project Ports**:
- 5000-5099: ai-seo-content (Project 50)
- 7000-7099: mechamap_realtime (Project 70)
- **4000-4099**: AI-Beat-Generator (Project 40) ← **NEW**

### ✅ Port 4000 Status

```bash
# Check if port 4000 is available
sudo lsof -i :4000
# Result: FREE ✅

# Check listening services
sudo netstat -tulpn | grep :4000
# Result: Not in use ✅
```

### 🔐 Firewall Configuration

```bash
# Allow port 4000 for API (if needed for external access)
sudo ufw allow 4000/tcp

# Check firewall status
sudo ufw status

# Expected:
# 4000/tcp    ALLOW    Anywhere
```

### 📈 Service Type Codes Reference

| Code | Service Type | Port Range | AI Beat Generator |
|------|-------------|------------|-------------------|
| 00 | Main Application | 4000-4009 | ✅ 4000 API Server |
| 01 | API Backend | 4010-4019 | - |
| 02 | Frontend/UI | 4020-4029 | - |
| 03 | Database | 4030-4039 | - |
| 04 | Cache/Redis | 4040-4049 | - |
| 05 | Web Server | 4050-4059 | - |
| 06 | Admin Panel | 4060-4069 | ✅ 4060 Admin |
| 07 | Monitoring | 4070-4079 | ✅ 4070 Health |
| 08 | Testing/Debug | 4080-4089 | ✅ 4080 Test |
| 09 | Development | 4090-4099 | - |

### 🎯 Future Expansion

**Available ports in range 4000-4099**:
- 4001-4009: Additional API instances
- 4010-4019: Backend services
- 4020-4029: Frontend (if needed)
- 4030-4039: Additional databases
- 4040-4049: Cache layers
- 4090-4099: Development instances

### 📊 All Projects Overview

```bash
# Use Project Manager to view all projects
cd /home/lifetechadmin/opt/project-manager
./scripts/project-manager.sh list

# Output:
[40] AI-Beat-Generator-backend  ● v1.0.0  Port: 4000
[50] ai-seo-content             ● v1.0.0  Port: 5xxx
[70] mechamap_realtime          ● v1.0.0  Port: 7xxx
```

### 🔍 Port Conflict Prevention

```bash
# Check all ports in project manager
./scripts/port-manager.sh list

# Scan for conflicts
./scripts/port-manager.sh check 40

# View port allocation
./scripts/port-manager.sh show-range 4000 4099
```

### 📝 Configuration Files

**project-info.json**:
```json
{
  "project": {
    "id": 40,
    "name": "AI Beat Generator"
  },
  "ports": {
    "main_api": 4000,
    "admin_panel": 4060,
    "monitoring": 4070,
    "testing": 4080,
    "range": "4000-4099"
  }
}
```

**.env.production**:
```env
PORT=4000
PROJECT_ID=40
```

**ecosystem.config.js**:
```javascript
{
  name: 'ai-beat-generator-api',
  env: {
    PORT: 4000
  }
}
```

### ✅ Validation Checklist

- [x] Port 4000 available (not in use)
- [x] Project ID 40 không conflict
- [x] Range 4000-4099 dành riêng cho dự án
- [x] Đã cập nhật project-info.json
- [x] Đã cập nhật .env.production
- [x] Đã cập nhật ecosystem.config.js
- [x] Đã đăng ký với Project Manager

### 🚀 Testing Port

```bash
# Start API on port 4000
cd /home/lifetechadmin/opt/AI-Beat-Generator-backend
npm run start:api

# Test locally
curl http://localhost:4000/health

# Test externally (if firewall configured)
curl http://36.50.27.10:4000/health

# Check process using port
sudo lsof -i :4000
```

---

**Kết luận**: Port 4000 (Project ID 40) đã được phân bổ thành công cho **AI Beat Generator** theo đúng chiến lược VPS Port Management! ✅

**Documentation**: `/home/lifetechadmin/opt/project-manager/docs/VPS_PORT_STRATEGY.md`
