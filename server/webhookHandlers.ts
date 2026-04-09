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

    const stripe = await getUncachableStripeClient();
    let event: any;

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (webhookSecret) {
      try {
        event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      } catch (err: any) {
        throw new Error(`Webhook signature verification failed: ${err.message}`);
      }
    } else {
      // No secret configured — parse without verification.
      // Set STRIPE_WEBHOOK_SECRET in production to enable signature checks.
      console.warn('STRIPE_WEBHOOK_SECRET not set — processing webhook without signature verification');
      try {
        event = JSON.parse(payload.toString('utf8'));
      } catch (err: any) {
        throw new Error(`Failed to parse webhook payload: ${err.message}`);
      }
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
        if (!user) {
          console.warn(`No user found for subscription ${sub.id}`);
          break;
        }

        let status: string;
        if (sub.status === 'canceled') {
          status = 'canceled';
        } else if (sub.status === 'past_due' || sub.status === 'unpaid') {
          status = sub.status;
        } else if (sub.cancel_at_period_end) {
          // User has requested cancellation; active until the period ends
          status = 'cancel_at_period_end';
        } else {
          status = sub.status; // active, trialing, etc.
        }

        await db.update(users).set({ subscriptionStatus: status }).where(eq(users.id, user.id));
        console.log(`Updated subscription status for user ${user.id}: ${status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        // Subscription has fully expired / been cancelled
        const sub = event.data.object;
        const [user] = await db.select().from(users).where(eq(users.stripeSubscriptionId, sub.id));
        if (!user) {
          console.warn(`No user found for subscription ${sub.id}`);
          break;
        }
        await db.update(users).set({
          subscriptionStatus: 'canceled',
          subscriptionPlan: null,
          subscriptionTier: null,
          stripeSubscriptionId: null,
        }).where(eq(users.id, user.id));
        console.log(`Subscription fully cancelled for user ${user.id}`);
        break;
      }

      case 'invoice.payment_failed': {
        // Payment failed — mark past_due so the UI can prompt the user to update billing
        const invoice = event.data.object;
        if (!invoice.subscription) break;
        const [user] = await db.select().from(users).where(eq(users.stripeSubscriptionId, invoice.subscription));
        if (!user) break;
        await db.update(users).set({ subscriptionStatus: 'past_due' }).where(eq(users.id, user.id));
        console.log(`Marked user ${user.id} as past_due after payment failure`);
        break;
      }

      case 'invoice.payment_succeeded': {
        // Payment recovered — re-activate if it was past_due
        const invoice = event.data.object;
        if (!invoice.subscription) break;
        const [user] = await db.select().from(users).where(eq(users.stripeSubscriptionId, invoice.subscription));
        if (!user) break;
        if (user.subscriptionStatus === 'past_due') {
          await db.update(users).set({ subscriptionStatus: 'active' }).where(eq(users.id, user.id));
          console.log(`Re-activated user ${user.id} after successful payment`);
        }
        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }
  }
}
