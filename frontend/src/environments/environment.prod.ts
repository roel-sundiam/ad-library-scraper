export const environment = {
  production: true,
  apiUrl: '/api', // Can be overridden at build time
  websocketUrl: window.location.protocol + '//' + window.location.host,
  enableDebugTools: false,
  logLevel: 'error'
};