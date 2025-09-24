export interface VersionInfo {
  version: string;
  buildNumber?: string;
  gitCommit?: string;
  buildTime?: string;
  environment: string;
  
  // Backend compatibility
  minBackendVersion: string;
  compatibleBackendVersions: string[];
  
  // Feature versions
  featureVersions: {
    [key: string]: string;
  };
}

export const VERSION_CONFIG: VersionInfo = {
  version: "1.0.0",
  buildNumber: process.env.REACT_APP_BUILD_NUMBER || "dev-build",
  gitCommit: process.env.REACT_APP_GIT_COMMIT || "unknown",
  buildTime: process.env.REACT_APP_BUILD_TIME || new Date().toISOString(),
  environment: process.env.REACT_APP_ENVIRONMENT || "production",
  
  // Backend compatibility requirements
  minBackendVersion: "1.0.0",
  compatibleBackendVersions: ["1.0.0", "1.0.1", "1.1.0"],
  
  // Feature version requirements
  featureVersions: {
    "glucose-calculations": "1.0.0",
    "insulin-calculator": "1.0.0",
    "carbs-on-board": "1.0.0", 
    "notes-api": "1.0.0",
    "auth-system": "1.0.0",
    "nightscout-proxy": "1.0.0"
  }
};

export function getVersionInfo(): VersionInfo {
  return {
    ...VERSION_CONFIG,
    environment: getCurrentEnvironment()
  };
}

function getCurrentEnvironment(): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.includes('render.com') || hostname.includes('onrender.com')) {
      return 'production';
    } else if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      return 'local';
    }
  }
  return process.env.REACT_APP_ENVIRONMENT || 'production';
}
