import axios from 'axios';
import { getEnvironmentConfig } from '../config/environments';
import { getVersionInfo, VersionInfo } from '../config/version';

export interface BackendVersionResponse {
  version: string;
  apiVersion: string;
  buildNumber?: string;
  gitCommit?: string;
  buildTime?: string;
  minFrontendVersion: string;
  compatibleFrontendVersions: string[];
  featureVersions: { [key: string]: string };
  environment: string;
  serverTime: string;
  javaVersion: string;
  springBootVersion: string;
  status: string;
  deprecationWarnings: { [key: string]: string };
}

export interface CompatibilityCheckResult {
  compatible: boolean;
  meetsMinimumVersion: boolean;
  frontendVersion: string;
  backendVersion: string;
  deprecationWarning: string;
  recommendation: string;
}

class VersionService {
  private api;
  
  constructor() {
    const config = getEnvironmentConfig();
    this.api = axios.create({
      baseURL: `${config.backendUrl}/api/version`,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }
  
  /**
   * Get frontend version information
   */
  getFrontendVersion(): VersionInfo {
    return getVersionInfo();
  }
  
  /**
   * Get backend version information
   */
  async getBackendVersion(): Promise<BackendVersionResponse> {
    try {
      const response = await this.api.get('/');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch backend version:', error);
      throw new Error('Unable to connect to backend for version check');
    }
  }
  
  /**
   * Check compatibility between frontend and backend
   */
  async checkCompatibility(): Promise<CompatibilityCheckResult> {
    try {
      const frontendVersion = this.getFrontendVersion();
      const response = await this.api.post('/check-compatibility', {
        frontendVersion: frontendVersion.version
      });
      return response.data;
    } catch (error) {
      console.error('Failed to check version compatibility:', error);
      throw new Error('Unable to verify version compatibility');
    }
  }
  
  /**
   * Get compatibility matrix
   */
  async getCompatibilityMatrix(): Promise<any> {
    try {
      const response = await this.api.get('/compatibility-matrix');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch compatibility matrix:', error);
      throw new Error('Unable to fetch compatibility information');
    }
  }
  
  /**
   * Compare two semantic versions (major.minor.patch)
   */
  compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    const maxLength = Math.max(v1Parts.length, v2Parts.length);
    
    for (let i = 0; i < maxLength; i++) {
      const v1Part = i < v1Parts.length ? v1Parts[i] : 0;
      const v2Part = i < v2Parts.length ? v2Parts[i] : 0;
      
      if (v1Part !== v2Part) {
        return v1Part - v2Part;
      }
    }
    
    return 0; // Versions are equal
  }
  
  /**
   * Check if frontend meets minimum backend requirements
   */
  async validateCompatibility(): Promise<{
    isCompatible: boolean;
    warnings: string[];
    errors: string[];
    backendVersion?: string;
  }> {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    try {
      const compatibility = await this.checkCompatibility();
      const backendVersion = await this.getBackendVersion();
      
      if (!compatibility.compatible) {
        errors.push(`Frontend version ${compatibility.frontendVersion} is not compatible with backend version ${compatibility.backendVersion}`);
      }
      
      if (!compatibility.meetsMinimumVersion) {
        errors.push(`Frontend version ${compatibility.frontendVersion} does not meet minimum requirement ${backendVersion.minFrontendVersion}`);
      }
      
      if (compatibility.deprecationWarning) {
        warnings.push(compatibility.deprecationWarning);
      }
      
      return {
        isCompatible: compatibility.compatible && compatibility.meetsMinimumVersion,
        warnings,
        errors,
        backendVersion: compatibility.backendVersion
      };
      
    } catch (error) {
      errors.push('Unable to verify version compatibility with backend');
      return {
        isCompatible: false,
        warnings,
        errors
      };
    }
  }
  
  /**
   * Log version information for debugging
   */
  async logVersionInfo(): Promise<void> {
    try {
      const frontend = this.getFrontendVersion();
      const backend = await this.getBackendVersion();
      const compatibility = await this.checkCompatibility();
      
      console.log('🔧 Version Information:', {
        frontend: {
          version: frontend.version,
          environment: frontend.environment,
          buildNumber: frontend.buildNumber
        },
        backend: {
          version: backend.version,
          apiVersion: backend.apiVersion,
          environment: backend.environment
        },
        compatibility: {
          compatible: compatibility.compatible,
          recommendation: compatibility.recommendation
        }
      });
    } catch (error) {
      console.error('Failed to log version information:', error);
    }
  }
}

export const versionService = new VersionService();
export default versionService;
