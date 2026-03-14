import { StripeProvider as StripeProviderNative } from '@stripe/stripe-react-native';
import React, { createContext, ReactNode, useContext } from 'react';
import { ENV } from '../config/environment';

interface StripeContextType {
  // Add any additional Stripe-related methods or state here
  isStripeReady: boolean;
}

const StripeContext = createContext<StripeContextType | undefined>(undefined);

export function StripeProvider({ children }: { children: ReactNode }) {
  const [isStripeReady, setIsStripeReady] = React.useState(false);

  React.useEffect(() => {
    // Validate that the Stripe key is configured
    if (ENV.STRIPE_PUBLISHABLE_KEY) {
      setIsStripeReady(true);
      if (__DEV__) {
        console.log('✓ Stripe initialized successfully');
      }
    } else {
      console.warn('⚠️ Stripe publishable key is not configured. Please set EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY in your .env file.');
    }
  }, []);

  return (
    <StripeProviderNative 
      publishableKey={ENV.STRIPE_PUBLISHABLE_KEY}
      urlScheme="arabwerkmobile" // This should match your app.json scheme
      merchantIdentifier="merchant.com.arabwerk" // iOS Apple Pay (optional)
    >
      <StripeContext.Provider value={{ isStripeReady }}>
        {children}
      </StripeContext.Provider>
    </StripeProviderNative>
  );
}

export function useStripe() {
  const context = useContext(StripeContext);
  if (context === undefined) {
    throw new Error('useStripe must be used within a StripeProvider');
  }
  return context;
}