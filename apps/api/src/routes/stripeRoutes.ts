import { Router, Request, Response, NextFunction } from "express";
import express from "express";
import { auth, AuthenticatedRequest } from "../middlewares/auth";
import { createCheckoutSession, createPortalSession, handleWebhook } from "../services/stripeService";

const router = Router();

/**
 * @route   POST /api/billing/checkout
 * @desc    Create Stripe Checkout Session for subscription
 * @access  Protected (User)
 */
router.post("/checkout", auth, async (req: AuthenticatedRequest, res: Response) => {
  const { priceId } = req.body;
  const user = req.user!;

  if (!priceId) {
    return res.status(400).json({ error: "priceId is required" });
  }

  try {
    const sessionUrl = await createCheckoutSession(String(user._id), priceId);
    return res.status(200).json({ url: sessionUrl });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * @route   POST /api/billing/portal
 * @desc    Create Stripe Customer Portal Session
 * @access  Protected (User)
 */
router.post("/portal", auth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;

  if (!user.stripeCustomerId) {
    return res.status(400).json({ error: "No billing profile found. Please subscribe first." });
  }

  try {
    const portalUrl = await createPortalSession(user.stripeCustomerId);
    return res.status(200).json({ url: portalUrl });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * @route   POST /api/billing/webhook
 * @desc    Stripe Webhook Listener
 * @access  Public
 */
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"] as string;

    if (!sig) {
      return res.status(400).send("Webhook Error: Missing stripe-signature");
    }

    try {
      await handleWebhook(sig, req.body);
      return res.status(200).json({ received: true });
    } catch (err: any) {
      console.error("Webhook processing failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
);

export default router;
