# Appliance Circle Marketplace

A full-stack repair marketplace with live booking requests, operations, booking plans, and a technician directory. The website contains no assignment sample customers, simulated funnel results, sample cohorts, synthetic event stream, or embedded analytics dashboard.

## Run locally

Requires Node.js 20 or newer. Run `npm start`, then open `http://localhost:3000`.

## Real event tracking

Visitors can consent to anonymous usage tracking. The browser uses one random, persistent anonymous ID per browser. It does not send names, phone numbers, email addresses, street addresses, or issue descriptions to analytics. If someone declines consent, the site sends no events for that browser.

The server sends real events to any configured provider. Configure these in Render → service → Environment:

- Mixpanel: `MIXPANEL_PROJECT_TOKEN`
- PostHog: `POSTHOG_PROJECT_TOKEN`; optionally `POSTHOG_HOST` (default `https://us.i.posthog.com`, or `https://eu.i.posthog.com` for EU projects)
- Amplitude: `AMPLITUDE_API_KEY`; optionally `AMPLITUDE_REGION=eu` for EU projects (default is US)

Use project ingestion tokens/keys only. Do not use personal or secret management API keys. Keep providers in separate projects if comparing their dashboards. Events are emitted from real visitor actions; this project does not backfill the assignment PDF's simulated values.

## Event names

- `page_viewed` — `page`
- `service_category_selected` — `service`, `entry_point`
- `booking_form_started` — `entry_point`
- `booking_submitted` — `service`
- `plans_viewed` — `page`
- `plan_selected` — `plan_id`
- `plan_request_submitted` — `plan_id`
- `technician_list_viewed` — `page`
- `booking_status_changed` — `booking_id`, `status`, `previous_status`
- `service_completed` — `booking_id`, `service`

The project has no customer login. Cohorts therefore represent anonymous browsers, not verified people across multiple devices. New repair requests are held in memory and reset when the service restarts; configure a database before using this site for production bookings. No payment is processed.

## Deploy

The repository includes `render.yaml` for a free Render web service. It runs on Node's built-in HTTP server and has no third-party runtime dependencies.
