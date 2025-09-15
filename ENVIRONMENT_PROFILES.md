# Environment Profiles

This project supports multiple environment configurations to easily switch between different backend endpoints and settings.

## Available Environments

### 1. Local Development (`local`)
- **Backend**: `http://localhost:8080`
- **Use case**: Local development with local backend
- **Command**: `npm run start:local`

### 2. Development (`development`)
- **Backend**: `https://libre-glucose-monitor-be-dev.onrender.com`
- **Use case**: Development server testing
- **Command**: `npm run start:dev`

### 3. Staging (`staging`)
- **Backend**: `https://libre-glucose-monitor-be-staging.onrender.com`
- **Use case**: Pre-production testing
- **Command**: `npm run start:staging`

### 4. Production (`production`)
- **Backend**: `https://libre-glucose-monitor-be.onrender.com`
- **Use case**: Production deployment
- **Command**: `npm run start:prod`

### 5. Docker (`docker`)
- **Backend**: `/api` (via reverse proxy)
- **Use case**: Docker containerized deployment
- **Command**: `npm run start:docker`

## Usage

### Starting the App

```bash
# Local development (default)
npm start
# or explicitly
npm run start:local

# Development server
npm run start:dev

# Staging environment
npm run start:staging

# Production environment
npm run start:prod

# Docker environment
npm run start:docker
```

### Building for Different Environments

```bash
# Build for local
npm run build:local

# Build for development
npm run build:dev

# Build for staging
npm run build:staging

# Build for production
npm run build:prod

# Build for Docker
npm run build:docker
```

## Configuration

Environment configurations are defined in `src/config/environments.ts`. Each environment includes:

- `backendUrl`: Backend API endpoint
- `cobApiUrl`: Carbs on Board API endpoint
- `libreApiUrl`: Libre LinkUp API endpoint
- `nightscoutUrl`: Nightscout API endpoint
- `isDocker`: Whether running in Docker mode
- `environment`: Environment name

## Environment Variables

You can override specific settings using environment variables:

```bash
# Override backend URL
REACT_APP_BACKEND_URL=http://custom-backend:8080 npm start

# Override Nightscout URL
REACT_APP_NIGHTSCOUT_URL=https://custom.nightscout.com npm start

# Force Docker mode
REACT_APP_DOCKER=true npm start
```

## Configuration Utilities

Use the configuration utilities for runtime environment checks:

```typescript
import { configUtils } from './config/configUtils';

// Check current environment
if (configUtils.isLocal()) {
  console.log('Running in local mode');
}

// Get backend URL
const backendUrl = configUtils.getBackendUrl();

// Log current configuration
configUtils.logConfig();
```

## Default Behavior

- If no environment is specified, defaults to `local`
- If `REACT_APP_DOCKER=true`, uses Docker configuration regardless of other settings
- Environment variables take precedence over default configurations

## Adding New Environments

To add a new environment:

1. Add the configuration to `src/config/environments.ts`
2. Add corresponding npm scripts to `package.json`
3. Update this documentation

Example:
```typescript
// In environments.ts
test: {
  backendUrl: 'http://test-backend:8080',
  // ... other config
}
```

```json
// In package.json
"start:test": "REACT_APP_ENVIRONMENT=test react-scripts start"
```
