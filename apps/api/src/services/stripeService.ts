import Stripe from "stripe";
import { User } from "../models/User";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16" as any,
});

export const createCheckoutSession = async (
  userId: string,
  priceId: string
): Promise<string> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    customer_email: user.email,
    client_reference_id: userId,
    success_url: `${clientUrl}/billing?success=true`,
    cancel_url: `${clientUrl}/billing?canceled=true`,
    metadata: {
      userId,
    },
  });

  return session.url!;
};

export const createPortalSession = async (
  customerId: string
): Promise<string> => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${clientUrl}/billing`,
  });

  return session.url;
};

export const handleWebhook = async (
  signature: string,
  rawBody: Buffer
): Promise<void> => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    throw new Error(`Webhook Error: ${err.message}`);
  }

  console.log(`[Stripe Webhook] Received event type: ${event.type}`);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;

      if (!userId) break;

      // Retrieve subscription to get price ID and expiry
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = subscription.items.data[0].price.id;
      const expiresAt = new Date(subscription.current_period_end * 1000);

      await User.findByIdAndUpdate(userId, {
        plan: "pro",
        stripeCustomerId: customerId,
        stripePriceId: priceId,
        planExpiresAt: expiresAt,
      });

      console.log(`[Stripe Webhook] User ${userId} upgraded to PRO plan.`);
      break;
    }
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      const subscriptionId = invoice.subscription as string;

      if (!subscriptionId) break;

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const expiresAt = new Date(subscription.current_period_end * 1000);

      await User.findOneAndUpdate(
        { stripeCustomerId: customerId },
        {
          plan: "pro",
          planExpiresAt: expiresAt,
        }
      );
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      await User.findOneAndUpdate(
        { stripeCustomerId: customerId },
        {
          plan: "free",
          stripePriceId: undefined,
          planExpiresAt: undefined,
        }
      );

      console.log(`[Stripe Webhook] Subscription deleted for customer: ${customerId}. Reset user to free.`);
      break;
    }
    default:
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
  }
};
