# Appliance Circle Marketplace

Full-stack home-repair booking website for the CAT 2 / Assignment 2 demonstration. Includes repair requests, an operations view, booking plans, technician profiles, the assignment customer rows, funnel and cohort analysis, event collection, and optional Mixpanel, PostHog and Amplitude integrations.

Run with Node.js 20+: `npm start`, then open `http://localhost:3000`.

The customer rows, funnel counts (30 → 18 → 11 → 4 → 3 → 2 → 2 → 1 → 0), and 349-user cohort table are synthetic report examples and stay separate. New repair requests are tracked separately. No payment is processed. Use only public client project tokens with the analytics integrations; never enter secret/server keys. Customer names and phone numbers are not sent in analytics events.

Deploy on Render by connecting this GitHub repository and applying its `render.yaml` Blueprint.