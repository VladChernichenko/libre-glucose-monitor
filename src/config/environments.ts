export interface EnvironmentConfig {
  backendUrl: string;
  cobApiUrl: string;
  libreApiUrl: string;
  nightscoutUrl: string;
  nightscoutSecret?: string;
  nightscoutToken?: string;
  corsProxyUrl: string;
  isDocker: boolean;
  environment: string;
}

export const environments = {
  local: {
    backendUrl: 'http://localhost:8080',
    cobApiUrl: 'http://localhost:8080',
    libreApiUrl: 'https://api.libreview.com',
    nightscoutUrl: 'https://vladchernichenko.eu.nightscoutpro.com',
    nightscoutSecret: process.env.REACT_APP_NIGHTSCOUT_SECRET,
    nightscoutToken: process.env.REACT_APP_NIGHTSCOUT_TOKEN,
    corsProxyUrl: 'https://cors-anywhere.herokuapp.com',
    isDocker: false,
    environment: 'local'
  },
  
  development: {
    backendUrl: 'https://libre-glucose-monitor-be-dev.onrender.com',
    cobApiUrl: 'https://libre-glucose-monitor-be-dev.onrender.com',
    libreApiUrl: 'https://api.libreview.com',
    nightscoutUrl: 'https://vladchernichenko.eu.nightscoutpro.com',
    nightscoutSecret: process.env.REACT_APP_NIGHTSCOUT_SECRET,
    nightscoutToken: process.env.REACT_APP_NIGHTSCOUT_TOKEN,
    corsProxyUrl: 'https://cors-anywhere.herokuapp.com',
    isDocker: false,
    environment: 'development'
  },
  
  staging: {
    backendUrl: 'https://libre-glucose-monitor-be-staging.onrender.com',
    cobApiUrl: 'https://libre-glucose-monitor-be-staging.onrender.com',
    libreApiUrl: 'https://api.libreview.com',
    nightscoutUrl: 'https://vladchernichenko.eu.nightscoutpro.com',
    nightscoutSecret: process.env.REACT_APP_NIGHTSCOUT_SECRET,
    nightscoutToken: process.env.REACT_APP_NIGHTSCOUT_TOKEN,
    corsProxyUrl: 'https://cors-anywhere.herokuapp.com',
    isDocker: false,
    environment: 'staging'
  },
  
  production: {
    backendUrl: 'https://libre-glucose-monitor-be.onrender.com',
    cobApiUrl: 'https://libre-glucose-monitor-be.onrender.com',
    libreApiUrl: 'https://api.libreview.com',
    nightscoutUrl: 'https://vladchernichenko.eu.nightscoutpro.com',
    nightscoutSecret: process.env.REACT_APP_NIGHTSCOUT_SECRET,
    nightscoutToken: process.env.REACT_APP_NIGHTSCOUT_TOKEN,
    corsProxyUrl: 'https://cors-anywhere.herokuapp.com',
    isDocker: false,
    environment: 'production'
  },
  
  docker: {
    backendUrl: '/api',
    cobApiUrl: '/api',
    libreApiUrl: 'https://api.libreview.com',
    nightscoutUrl: 'https://vladchernichenko.eu.nightscoutpro.com',
    nightscoutSecret: process.env.REACT_APP_NIGHTSCOUT_SECRET,
    nightscoutToken: process.env.REACT_APP_NIGHTSCOUT_TOKEN,
    corsProxyUrl: 'https://cors-anywhere.herokuapp.com',
    isDocker: true,
    environment: 'docker'
  }
};

export function getEnvironmentConfig(): EnvironmentConfig {
  const env = process.env.REACT_APP_ENVIRONMENT || 'local';
  const dockerMode = process.env.REACT_APP_DOCKER === 'true';
  
  // Override with Docker config if in Docker mode
  if (dockerMode) {
    return environments.docker;
  }
  
  // Return environment-specific config or fallback to local
  return environments[env as keyof typeof environments] || environments.local;
}

export function getCurrentEnvironment(): string {
  return getEnvironmentConfig().environment;
}
