# Docker Setup Guide - No CORS Issues!

## 🐳 **Overview**

This Docker setup eliminates CORS issues entirely by running both frontend and backend in containers with a reverse proxy. All requests go through the same origin, making CORS unnecessary.

## 🚀 **Quick Start**

### **Option 1: Development Setup (Recommended for Development)**

```bash
# Start all services in development mode
docker-compose -f docker-compose.dev.yml up --build

# Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:8080
# Database: localhost:5432
```

### **Option 2: Production Setup (With Nginx Reverse Proxy)**

```bash
# Start all services with Nginx reverse proxy
docker-compose up --build

# Access the application
# Main app: http://localhost (port 80)
# Backend API: http://localhost/api
# Health check: http://localhost/health
```

## 📁 **File Structure**

```
├── docker-compose.yml          # Production setup with Nginx
├── docker-compose.dev.yml      # Development setup
├── Dockerfile                  # Production frontend build
├── Dockerfile.dev              # Development frontend
├── nginx/
│   └── nginx.conf             # Nginx reverse proxy config
└── ../IdeaProjects/glucose-monitor-be/
    └── Dockerfile             # Backend Spring Boot
```

## 🔧 **Configuration**

### **Environment Variables**

#### **Frontend (.env)**
```env
# Development (outside Docker)
REACT_APP_BACKEND_URL=http://localhost:8080
REACT_APP_NIGHTSCOUT_URL=https://vladchernichenko.eu.nightscoutpro.com/
REACT_APP_ENABLE_DEMO_MODE=false

# Docker (no CORS needed)
REACT_APP_DOCKER=true
REACT_APP_BACKEND_URL=/api
```

#### **Backend (application.yml)**
```yaml
spring:
  profiles:
    active: docker
  
  datasource:
    url: jdbc:postgresql://postgres:5432/glucose_monitor
    username: glucose_monitor_user
    password: ${DB_PASSWORD}
```

## 🏗️ **Architecture**

### **Development Setup**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   PostgreSQL    │
│   (Port 3000)   │    │   (Port 8080)   │    │   (Port 5432)   │
│                 │    │                 │    │                 │
│ React Dev Server│    │ Spring Boot     │    │ Database        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Production Setup**
```
┌─────────────────┐
│   Nginx         │
│   (Port 80)     │
│                 │
│ Reverse Proxy   │
└─────────┬───────┘
          │
    ┌─────┴─────┐
    │           │
┌───▼───┐   ┌───▼───┐
│Frontend│   │Backend│
│(Built) │   │(JAR)  │
└───────┘   └───────┘
```

## 🚀 **Usage Commands**

### **Development Commands**

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up --build

# Start in background
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down

# Rebuild and restart
docker-compose -f docker-compose.dev.yml up --build --force-recreate
```

### **Production Commands**

```bash
# Start production environment
docker-compose up --build

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Clean up volumes
docker-compose down -v
```

## 🔍 **Benefits of Docker Setup**

### **✅ No CORS Issues**
- All requests go through the same origin
- No cross-origin requests needed
- Simplified authentication flow

### **✅ Consistent Environment**
- Same setup across all machines
- No "works on my machine" issues
- Easy onboarding for new developers

### **✅ Production Ready**
- Nginx reverse proxy with caching
- Rate limiting and security headers
- Health checks and monitoring

### **✅ Easy Deployment**
- Single command to start everything
- Scalable architecture
- Easy to deploy to cloud platforms

## 🧪 **Testing the Setup**

### **1. Health Checks**
```bash
# Backend health
curl http://localhost:8080/actuator/health

# Frontend (development)
curl http://localhost:3000

# Production (via Nginx)
curl http://localhost/health
```

### **2. API Endpoints**
```bash
# Test auth endpoint
curl http://localhost:8080/api/auth/test

# Test with Nginx (production)
curl http://localhost/api/auth/test
```

### **3. Frontend Access**
- **Development:** http://localhost:3000
- **Production:** http://localhost

## 🔧 **Troubleshooting**

### **Common Issues**

#### **1. Port Already in Use**
```bash
# Check what's using the port
lsof -i :3000
lsof -i :8080

# Kill the process
kill -9 <PID>
```

#### **2. Database Connection Issues**
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View database logs
docker-compose logs postgres

# Connect to database
docker-compose exec postgres psql -U glucose_monitor_user -d glucose_monitor
```

#### **3. Frontend Build Issues**
```bash
# Rebuild frontend
docker-compose build frontend

# Clear node_modules cache
docker-compose exec frontend rm -rf node_modules package-lock.json
docker-compose exec frontend npm install
```

#### **4. Backend Build Issues**
```bash
# Rebuild backend
docker-compose build backend

# Check Gradle cache
docker-compose exec backend ./gradlew clean
```

### **Debug Commands**

```bash
# View all container logs
docker-compose logs

# View specific service logs
docker-compose logs frontend
docker-compose logs backend
docker-compose logs nginx

# Access container shell
docker-compose exec frontend sh
docker-compose exec backend sh

# Check container status
docker-compose ps
```

## 📊 **Performance Optimization**

### **Development Optimizations**
- Volume mounts for hot reloading
- Shared node_modules volume
- Development-specific environment variables

### **Production Optimizations**
- Multi-stage builds for smaller images
- Nginx caching for static assets
- Gzip compression
- Rate limiting

## 🔒 **Security Considerations**

### **Container Security**
- Non-root users in containers
- Minimal base images (Alpine)
- Health checks for monitoring
- Resource limits

### **Network Security**
- Internal Docker network
- Exposed ports only when necessary
- Reverse proxy for external access

## 🚀 **Deployment Options**

### **Local Development**
```bash
docker-compose -f docker-compose.dev.yml up
```

### **Production Server**
```bash
docker-compose up -d
```

### **Cloud Platforms**
- **AWS ECS:** Use docker-compose.yml
- **Google Cloud Run:** Use individual Dockerfiles
- **Azure Container Instances:** Use docker-compose.yml
- **Kubernetes:** Convert docker-compose to k8s manifests

## 📝 **Summary**

The Docker setup provides:

1. **✅ No CORS Issues** - All requests through same origin
2. **✅ Easy Development** - Single command to start everything
3. **✅ Production Ready** - Nginx reverse proxy with optimizations
4. **✅ Consistent Environment** - Same setup everywhere
5. **✅ Easy Deployment** - Ready for cloud platforms

**Next Steps:**
1. Choose development or production setup
2. Run the appropriate docker-compose command
3. Access the application at the provided URL
4. Enjoy CORS-free development! 🎉
