import Stripe from 'stripe';

function getSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set. Add it to your environment secrets.');
  }
  return key;
}

export function getStripePublishableKey(): string {
  const key = process.env.STRIPE_PUBLISHABLE_KEY || process.env.VITE_STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error('STRIPE_PUBLISHABLE_KEY is not set.');
  }
  return key;
}

// WARNING: Never cache this client. Always call this to get a fresh client.
export async function getUncachableStripeClient(): Promise<Stripe> {
  const secretKey = getSecretKey();
  return new Stripe(secretKey, { apiVersion: '2025-08-27.basil' as any });
}

export async function getStripeSecretKey(): Promise<string> {
  return getSecretKey();
}

// StripeSync is no longer used — kept as a stub so existing imports don't break
export async function getStripeSync(): Promise<any> {
  return null;
}
