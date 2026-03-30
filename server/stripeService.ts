import { getUncachableStripeClient } from './stripeClient';
import { db } from './db';
import { users, promoCodes } from '@shared/schema';
import { eq } from 'drizzle-orm';

export type TierKey =
  | 'my_home'
  | 'property_owner'
  | 'agency'
  | 'portfolio'
  | 'enterprise';

// Maps tier → { setup fee metadata type, monthly metadata type, perProperty }
const TIER_CONFIG: Record<TierKey, { setup: string; monthly: string; perProperty: boolean }> = {
  my_home:        { setup: 'my_home_setup',        monthly: 'my_home_monthly',        perProperty: false },
  property_owner: { setup: 'property_owner_setup',  monthly: 'property_owner_monthly',  perProperty: true  },
  agency:         { setup: 'agency_setup',           monthly: 'agency_monthly',           perProperty: true  },
  portfolio:      { setup: 'portfolio_setup',        monthly: 'portfolio_monthly',        perProperty: true  },
  enterprise:     { setup: 'enterprise_setup',       monthly: 'enterprise_monthly',       perProperty: true  },
};

export class StripeService {
  async createOrGetCustomer(userId: number, email: string, name: string) {
    const stripe = await getUncachableStripeClient();
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (user.stripeCustomerId) return user.stripeCustomerId;
    const customer = await stripe.customers.create({ email, name, metadata: { userId: String(userId) } });
    await db.update(users).set({ stripeCustomerId: customer.id }).where(eq(users.id, userId));
    return customer.id;
  }

  /** Returns a map of product metadata.type → active price_id */
  async getPriceMap(): Promise<Record<string, string>> {
    const stripe = await getUncachableStripeClient();
    const products = await stripe.products.list({ active: true, limit: 50 });
    const map: Record<string, string> = {};
    for (const product of products.data) {
      if (!product.metadata?.type) continue;
      const prices = await stripe.prices.list({ product: product.id, active: true, limit: 1 });
      if (prices.data[0]) map[product.metadata.type] = prices.data[0].id;
    }
    return map;
  }

  async createTierCheckoutSession(opts: {
    customerId: string;
    tier: TierKey;
    propertyCount: number;
    planType: 'monthly' | 'report_only';
    channel: 'residential' | 'commercial';
    userId: number;
    successUrl: string;
    cancelUrl: string;
  }) {
    const stripe = await getUncachableStripeClient();
    const { customerId, tier, propertyCount, planType, channel, userId, successUrl, cancelUrl } = opts;
    const priceMap = await this.getPriceMap();

    // One-off report
    if (planType === 'report_only') {
      const priceId = channel === 'commercial' ? priceMap['commercial_one_off'] : priceMap['residential_one_off'];
      if (!priceId) throw new Error('One-off report product not configured in Stripe.');
      const qty = channel === 'commercial' ? propertyCount : 1;
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: qty }],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { userId: String(userId), planType: 'report_only', tier, propertyCount: String(propertyCount) },
      });
      return session;
    }

    // Enterprise: sales-led, no self-serve checkout
    if (tier === 'enterprise') throw new Error('Enterprise plans require direct contact. Please use the "Talk to us" option.');

    const config = TIER_CONFIG[tier];
    const setupPriceId = priceMap[config.setup];
    const monthlyPriceId = priceMap[config.monthly];

    if (!setupPriceId || !monthlyPriceId) {
      throw new Error(`Stripe products for tier "${tier}" are not yet configured. Please contact support.`);
    }

    // For per-property tiers, quantity = property count. For flat tiers, quantity = 1.
    const monthlyQty = config.perProperty ? propertyCount : 1;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        { price: setupPriceId, quantity: 1 },
        { price: monthlyPriceId, quantity: monthlyQty },
      ],
      mode: 'subscription',
      subscription_data: {
        metadata: { tier, propertyCount: String(propertyCount), userId: String(userId) },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId: String(userId), planType: 'monthly', tier, propertyCount: String(propertyCount) },
    });

    return session;
  }

  async createPortalSession(customerId: string, returnUrl: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });
  }

  async validatePromoCode(code: string): Promise<{ valid: boolean; promoCode?: any; error?: string }> {
    const [promo] = await db.select().from(promoCodes).where(eq(promoCodes.code, code.toUpperCase()));
    if (!promo) return { valid: false, error: 'Invalid promo code' };
    if (!promo.isActive) return { valid: false, error: 'This promo code is no longer active' };
    if (promo.expiresAt && new Date() > promo.expiresAt) return { valid: false, error: 'This promo code has expired' };
    if (promo.maxUses && (promo.usedCount ?? 0) >= promo.maxUses) return { valid: false, error: 'This promo code has reached its limit' };
    return { valid: true, promoCode: promo };
  }

  async redeemPromoCode(code: string, userId: number) {
    const { valid, promoCode, error } = await this.validatePromoCode(code);
    if (!valid) throw new Error(error);

    await db.update(promoCodes)
      .set({ usedCount: (promoCode.usedCount || 0) + 1 })
      .where(eq(promoCodes.id, promoCode.id));

    await db.update(users).set({
      subscriptionStatus: 'promo',
      subscriptionPlan: 'promo',
      promoCodeUsed: code.toUpperCase(),
      setupFeePaid: true,
    }).where(eq(users.id, userId));

    return { success: true, grantType: promoCode.grantType };
  }

  async handleCheckoutComplete(sessionId: string) {
    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const userId = Number(session.metadata?.userId);
    const planType = session.metadata?.planType;
    const tier = session.metadata?.tier;

    if (!userId) return;

    const updates: any = { setupFeePaid: true };

    if (planType === 'report_only') {
      updates.subscriptionStatus = 'report_only';
      updates.subscriptionPlan = 'report_only';
    } else {
      updates.subscriptionStatus = 'active';
      updates.subscriptionPlan = 'monthly';
      if (tier) updates.subscriptionTier = tier;
      if (session.subscription) updates.stripeSubscriptionId = session.subscription as string;
    }

    await db.update(users).set(updates).where(eq(users.id, userId));
  }
}

export const stripeService = new StripeService();
