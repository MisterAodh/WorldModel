import { Router, raw } from 'express';
import Stripe from 'stripe';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { getUsageHistory, getUsageStats, addCredits, getCreditBalance } from '../lib/billing.js';

export const billingRoutes = Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const PRODUCT_ID = process.env.PRODUCT_ID || '';
const CREDIT_AMOUNT_CENTS = 1000; // $10 = 1000 cents of credits

// GET /api/billing/balance - Get current credit balance
billingRoutes.get('/balance', requireAuth, async (req, res) => {
  try {
    const balance = await getCreditBalance(req.userId!);
    res.json({ 
      creditBalance: balance,
      displayBalance: `$${(balance / 100).toFixed(2)}`,
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

// GET /api/billing/usage - Get usage history
billingRoutes.get('/usage', requireAuth, async (req, res) => {
  try {
    const { limit = '50' } = req.query;
    const history = await getUsageHistory(req.userId!, parseInt(limit as string));
    const stats = await getUsageStats(req.userId!);
    
    res.json({
      history,
      stats: {
        ...stats,
        totalCostDisplay: `$${(stats.totalCostCents / 100).toFixed(2)}`,
      },
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    res.status(500).json({ error: 'Failed to fetch usage history' });
  }
});

// POST /api/billing/checkout - Create a Stripe Checkout session
billingRoutes.post('/checkout', requireAuth, async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    const { successUrl, cancelUrl } = req.body;

    if (!successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'successUrl and cancelUrl are required' });
    }

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'World Tracker Credits',
              description: '$10.00 in API credits',
            },
            unit_amount: 1000, // $10.00 in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: req.userId!,
        creditAmount: CREDIT_AMOUNT_CENTS.toString(),
      },
      client_reference_id: req.userId,
    });

    // Record the pending purchase
    await prisma.creditPurchase.create({
      data: {
        userId: req.userId!,
        amountCents: CREDIT_AMOUNT_CENTS,
        stripeSessionId: session.id,
        status: 'pending',
      },
    });

    res.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// POST /api/billing/webhook - Handle Stripe webhooks
// Note: This route needs raw body parsing, handled separately
billingRoutes.post('/webhook', raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Find and update the purchase record
      const purchase = await prisma.creditPurchase.findUnique({
        where: { stripeSessionId: session.id },
      });

      if (purchase && purchase.status === 'pending') {
        // Update purchase status
        await prisma.creditPurchase.update({
          where: { id: purchase.id },
          data: { status: 'completed' },
        });

        // Add credits to user's balance
        await addCredits(purchase.userId, purchase.amountCents);

        console.log(`Added ${purchase.amountCents} cents to user ${purchase.userId}`);
      }
      break;
    }

    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Mark the purchase as failed
      await prisma.creditPurchase.updateMany({
        where: { 
          stripeSessionId: session.id,
          status: 'pending',
        },
        data: { status: 'failed' },
      });
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

// GET /api/billing/purchases - Get purchase history
billingRoutes.get('/purchases', requireAuth, async (req, res) => {
  try {
    const { limit = '20' } = req.query;
    
    const purchases = await prisma.creditPurchase.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit as string), 100),
    });

    res.json({
      purchases: purchases.map(p => ({
        ...p,
        displayAmount: `$${(p.amountCents / 100).toFixed(2)}`,
      })),
    });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    res.status(500).json({ error: 'Failed to fetch purchase history' });
  }
});

// POST /api/billing/verify-session - Verify a checkout session was successful
billingRoutes.post('/verify-session', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const purchase = await prisma.creditPurchase.findUnique({
      where: { stripeSessionId: sessionId },
    });

    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    if (purchase.userId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get updated balance
    const balance = await getCreditBalance(req.userId!);

    res.json({
      purchase: {
        ...purchase,
        displayAmount: `$${(purchase.amountCents / 100).toFixed(2)}`,
      },
      creditBalance: balance,
      displayBalance: `$${(balance / 100).toFixed(2)}`,
    });
  } catch (error) {
    console.error('Error verifying session:', error);
    res.status(500).json({ error: 'Failed to verify session' });
  }
});
