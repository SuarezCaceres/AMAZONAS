export const environment = {
  production: true,
  apiUrl: import.meta.env.NG_APP_API_URL || 'http://localhost:8080/api',
  clerkPublishableKey: import.meta.env['NG_APP_CLERK_PUBLISHABLE_KEY'] || ''
};
