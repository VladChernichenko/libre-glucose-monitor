import { getEnvironmentConfig, getCurrentEnvironment } from './environments';

/**
 * Configuration utilities for environment management
 */
export class ConfigUtils {
  /**
   * Get the current environment configuration
   */
  static getConfig() {
    return getEnvironmentConfig();
  }

  /**
   * Get the current environment name
   */
  static getEnvironment() {
    return getCurrentEnvironment();
  }

  /**
   * Check if running in local development
   */
  static isLocal() {
    return getCurrentEnvironment() === 'local';
  }

  /**
   * Check if running in Docker
   */
  static isDocker() {
    return getCurrentEnvironment() === 'docker';
  }

  /**
   * Check if running in production
   */
  static isProduction() {
    return getCurrentEnvironment() === 'production';
  }

  /**
   * Get backend URL for the current environment
   */
  static getBackendUrl() {
    return getEnvironmentConfig().backendUrl;
  }

  /**
   * Get COB API URL for the current environment
   */
  static getCobApiUrl() {
    return getEnvironmentConfig().cobApiUrl;
  }

  /**
   * Get Nightscout URL for the current environment
   */
  static getNightscoutUrl() {
    return getEnvironmentConfig().nightscoutUrl;
  }

  /**
   * Log current configuration (useful for debugging)
   */
  static logConfig() {
    const config = getEnvironmentConfig();
    console.log('🔧 Environment Configuration:', {
      environment: config.environment,
      backendUrl: config.backendUrl,
      cobApiUrl: config.cobApiUrl,
      nightscoutUrl: config.nightscoutUrl,
      isDocker: config.isDocker
    });
  }
}

// Export for convenience
export const configUtils = ConfigUtils;
