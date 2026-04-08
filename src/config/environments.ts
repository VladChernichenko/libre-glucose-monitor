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
    backendUrl: '', // Use relative URLs to leverage proxy in development
    cobApiUrl: '',
    libreApiUrl: 'https://api.libreview.com',
    nightscoutUrl: '',
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
    nightscoutUrl: '',
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
    nightscoutUrl: '',
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
    nightscoutUrl: '',
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
    nightscoutUrl: '',
    nightscoutSecret: process.env.REACT_APP_NIGHTSCOUT_SECRET,
    nightscoutToken: process.env.REACT_APP_NIGHTSCOUT_TOKEN,
    corsProxyUrl: 'https://cors-anywhere.herokuapp.com',
    isDocker: true,
    environment: 'docker'
  }
};

export function getEnvironmentConfig(): EnvironmentConfig {
  const env = process.env.REACT_APP_ENVIRONMENT;
  const dockerMode = process.env.REACT_APP_DOCKER === 'true';
  
  // Override with Docker config if in Docker mode
  if (dockerMode) {
    return environments.docker;
  }
  
  // If no environment is set, try to detect based on hostname
  let detectedEnv = env;
  if (!detectedEnv) {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      console.log('Environment detection:', { hostname, env });

      if (hostname.includes('render.com') || hostname.includes('onrender.com')) {
        detectedEnv = 'production';
        console.log('Detected production from hostname (Render)');
      } else if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
        detectedEnv = 'local';
        console.log('Detected local from hostname');
      } else {
        detectedEnv = 'production';
        console.log('Unknown hostname; defaulting to production');
      }
    } else {
      detectedEnv = 'local';
      console.log('No window; SSR fallback to local');
    }
  } else {
    console.log('Using explicit REACT_APP_ENVIRONMENT:', env);
  }
  
  const base = environments[detectedEnv as keyof typeof environments] || environments.production;
  const backendOverride = process.env.REACT_APP_BACKEND_URL?.trim();
  const cobOverride = process.env.REACT_APP_COB_API_URL?.trim();
  const finalConfig: EnvironmentConfig = {
    ...base,
    backendUrl: backendOverride || base.backendUrl,
    cobApiUrl: cobOverride || base.cobApiUrl,
  };

  console.log('Environment config:', {
    environment: detectedEnv,
    backendUrl: finalConfig.backendUrl || '(empty - local proxy)',
    cobApiUrl: finalConfig.cobApiUrl || '(empty - local proxy)',
  });
  return finalConfig;
}

export function getCurrentEnvironment(): string {
  return getEnvironmentConfig().environment;
}
