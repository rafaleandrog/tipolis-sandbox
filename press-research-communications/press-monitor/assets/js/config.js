// Tipolis Press Monitor — frontend configuration.
// Both values are required for the screens to call the Apps Script Web App.
// They are intentionally committed: the bearer token is a soft gate (per the
// project spec), not a hard secret. Rotate by changing the value in the
// `report_settings` sheet AND in this file.
window.CONFIG = {
  WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbzmgzIONpheRejnEWztwCxTjNFlw3W_ZeusK85LeGzKU8CoAt7rA0rmqD2P3xBktuS1/exec',
  BEARER_TOKEN: 'a9FvK7xP2mQ8rN4tZ1wL6cY3hJ9sD5eB7uR2kM8pX4nQ1vT6z'
};
