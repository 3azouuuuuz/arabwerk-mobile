/**
 * Environment Configuration
 * Centralized place for all environment variables
 */
export const ENV = {
  // API URLs
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
  FRONTEND_URL: process.env.EXPO_PUBLIC_FRONTEND_URL || 'https://arabwerk.de',
  ADMIN_PANEL_URL: process.env.EXPO_PUBLIC_ADMIN_PANEL_URL || 'https://ctrl.arabwerk.de',
  
  // External APIs
  GEOAPIFY_API_KEY: process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY || '33b785f2a6214a52a2c808d45b16cd99',
  GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  
  // PayPal
  PAYPAL_CLIENT_ID: process.env.EXPO_PUBLIC_PAYPAL_CLIENT_ID || '',
  PAYPAL_MODE: (process.env.EXPO_PUBLIC_PAYPAL_MODE as 'sandbox' | 'live') || 'sandbox',
  
  // Stripe
  STRIPE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_51RPrrTAWT8bPM9HQPQSqodWGBxUFCcRYm3mnz5QM4x5WWWh5Cv0ZuqOT1Igc36PoaZ8sEWQ3B4Y26Z4XQLliAgSh00dSz0ngUj',
  STRIPE_MONTHLY_PRICE_ID: process.env.EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID || '',
};

// Validation - check if required keys are present
export const validateEnv = () => {
  const required = [
    'API_BASE_URL',
    'GEOAPIFY_API_KEY',
  ];
  
  const missing = required.filter(key => !ENV[key as keyof typeof ENV]);
  
  if (missing.length > 0) {
    console.warn('⚠️ Missing environment variables:', missing.join(', '));
  }
  
  return missing.length === 0;
};

// Log environment on app start (only in development)
if (__DEV__) {
  console.log('📦 Environment Configuration:');
  console.log('- API URL:', ENV.API_BASE_URL);
  console.log('- Geoapify Key:', ENV.GEOAPIFY_API_KEY ? '✓ Set' : '✗ Missing');
  console.log('- Google Maps Key:', ENV.GOOGLE_MAPS_API_KEY ? '✓ Set' : '✗ Missing');
  console.log('- PayPal Mode:', ENV.PAYPAL_MODE);
  console.log('- Stripe Publishable Key:', ENV.STRIPE_PUBLISHABLE_KEY ? '✓ Set' : '✗ Missing');
  validateEnv();
}