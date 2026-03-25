import { getUncachableStripeClient } from './stripeClient';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn('STRIPE_WEBHOOK_SECRET is not set — skipping signature verification');
      return;
    }

    const stripe = await getUncachableStripeClient();
    let event: any;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    console.log(`Stripe webhook received: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = Number(session.metadata?.userId);
        const tier = session.metadata?.tier;
        if (!userId) break;
        const updates: any = { setupFeePaid: true };
        if (session.mode === 'subscription') {
          updates.subscriptionStatus = 'active';
          updates.subscriptionPlan = 'monthly';
          if (tier) updates.subscriptionTier = tier;
          if (session.subscription) updates.stripeSubscriptionId = session.subscription;
        } else {
          updates.subscriptionStatus = 'report_only';
          updates.subscriptionPlan = 'report_only';
        }
        await db.update(users).set(updates).where(eq(users.id, userId));
        console.log(`Updated user ${userId} after checkout`);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const [user] = await db.select().from(users).where(eq(users.stripeSubscriptionId, sub.id));
        if (!user) break;
        const status = sub.status === 'active' ? 'active' : sub.status === 'canceled' ? 'canceled' : sub.status;
        await db.update(users).set({ subscriptionStatus: status }).where(eq(users.id, user.id));
        console.log(`Updated subscription status for user ${user.id}: ${status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const [user] = await db.select().from(users).where(eq(users.stripeSubscriptionId, sub.id));
        if (!user) break;
        await db.update(users).set({ subscriptionStatus: 'canceled' }).where(eq(users.id, user.id));
        console.log(`Marked subscription canceled for user ${user.id}`);
        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }
  }
}
