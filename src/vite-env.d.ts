/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly REACT_APP_ENVIRONMENT?: string;
  readonly REACT_APP_DOCKER?: string;
  readonly REACT_APP_BACKEND_URL?: string;
  readonly REACT_APP_COB_API_URL?: string;
  readonly REACT_APP_NIGHTSCOUT_URL?: string;
  readonly REACT_APP_NIGHTSCOUT_SECRET?: string;
  readonly REACT_APP_NIGHTSCOUT_TOKEN?: string;
  readonly REACT_APP_ENABLE_DEMO_MODE?: string;
  readonly REACT_APP_ENABLE_ERROR_REPORTING?: string;
  readonly REACT_APP_BUILD_NUMBER?: string;
  readonly REACT_APP_GIT_COMMIT?: string;
  readonly REACT_APP_GIT_SHORT_COMMIT?: string;
  readonly REACT_APP_BUILD_TIME?: string;
  readonly REACT_APP_GIT_BRANCH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
