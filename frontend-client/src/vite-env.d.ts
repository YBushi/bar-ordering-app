interface ImportMetaEnv {
    readonly VITE_API_URL?: string;
    readonly VITE_WS_URL?: string
    // add more env vars here if needed
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }