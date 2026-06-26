const http = require("node:http");
const crypto = require("node:crypto");
const fsSync = require("node:fs");
const fs = require("node:fs/promises");
const path = require("node:path");
const { URLSearchParams } = require("node:url");

const root = __dirname;

function loadEnv() {
  try {
    const envFile = fsSync.readFileSync(path.join(root, ".env"), "utf8");
    envFile.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return;
      const [key, ...valueParts] = trimmed.split("=");
      if (!process.env[key]) {
        process.env[key] = valueParts.join("=").trim();
      }
    });
  } catch {
    // .env is optional for local demo mode.
  }
}

loadEnv();

const port = Number(process.env.PORT || 4185);
const host = process.env.HOST || (process.env.RENDER ? "0.0.0.0" : "127.0.0.1");
const publicUrl = process.env.PUBLIC_URL || `http://${host}:${port}`;
const stripeApiVersion = process.env.STRIPE_API_VERSION || "2026-02-25.clover";
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const resendApiKey = process.env.RESEND_API_KEY || "";
const emailFrom = process.env.EMAIL_FROM || "Trend-Spotter <onboarding@resend.dev>";
const reportAccessSecret =
  process.env.REPORT_ACCESS_SECRET || stripeWebhookSecret || process.env.STRIPE_SECRET_KEY || "trendspotter-local-report-secret";

const reportDeliverables = {
  "AI Agent Business Ideas": {
    title: "AI Agent Business Ideas",
    summary: "A focused opportunity pack for builders looking for practical AI automation businesses.",
    audience: "Solo founders, consultants, and small B2B teams looking for automation niches with clear buyer pain.",
    sections: [
      "20 B2B workflow niches with buyer pain points",
      "Target users, pricing angles, and urgency triggers",
      "Validation prompts you can use with prospects this week"
    ],
    marketMap: [
      "Back-office automation for agencies: reporting, billing checks, proposal drafts, and client follow-ups.",
      "Operations assistants for local service businesses: quote creation, appointment reminders, inventory alerts, and review replies.",
      "Compliance-lite workflows for regulated small teams: document intake, audit trails, risk flags, and weekly summaries."
    ],
    launchAngles: [
      "Lead with a narrow outcome: save five hours per week on one repetitive workflow.",
      "Sell a done-with-you setup package first, then convert recurring users into a monthly monitoring plan.",
      "Use before/after workflow demos instead of broad AI messaging; buyers should see the task disappear."
    ],
    validationPlan: [
      "Day 1: Choose one workflow and write the painful manual steps.",
      "Day 2: Interview three operators who run that workflow weekly.",
      "Day 3: Build a no-code or scripted demo using sample inputs.",
      "Day 4: Ask prospects to rank time saved, error reduction, and revenue impact.",
      "Day 5: Price the first offer as setup plus monthly support.",
      "Day 6: Send a short demo video to ten target buyers.",
      "Day 7: Keep only the angle that gets replies, objections, or booked calls."
    ],
    nextStep: "Pick one workflow niche, interview three target users, and validate whether the workflow saves time, reduces errors, or creates revenue."
  },
  "Pet Wellness Market Map": {
    title: "Pet Wellness Market Map",
    summary: "A market map for pet wellness offers, subscriptions, bundles, and acquisition angles.",
    audience: "E-commerce operators, subscription brands, and pet-care founders exploring higher-margin wellness offers.",
    sections: [
      "Subscription and product bundle concepts",
      "Channel angles for pet parents and specialist communities",
      "Margin notes and validation questions for early offers"
    ],
    marketMap: [
      "Gut, skin, and anxiety bundles for dogs with simple education and repeat-purchase cadence.",
      "Senior pet support: mobility, pain comfort, nutrition reminders, and vet-visit preparation kits.",
      "Breed or lifestyle-specific packs for owners who want more tailored advice than generic pet aisles."
    ],
    launchAngles: [
      "Package the offer around a visible owner worry: scratching, stress, aging, digestion, or energy.",
      "Partner with groomers, trainers, and small vets for trust-driven acquisition.",
      "Use a starter kit plus subscription refill model to avoid selling single low-margin products."
    ],
    validationPlan: [
      "Day 1: Pick one pet-owner pain and define the measurable before/after.",
      "Day 2: Scan forums, reviews, and communities for repeated complaints.",
      "Day 3: Create a landing page with one bundle and three proof points.",
      "Day 4: Ask 10 owners what they already tried and why it failed.",
      "Day 5: Test two price anchors: starter kit and monthly refill.",
      "Day 6: Collect email signups with pet age, breed, and main concern.",
      "Day 7: Pre-sell a small batch or run a concierge pilot."
    ],
    nextStep: "Choose one pet wellness bundle, define the owner pain point, and test demand with a simple waitlist or pre-order page."
  },
  "Silver Economy Opportunities": {
    title: "Silver Economy Opportunities",
    summary: "A concise opportunity pack for senior care, longevity, and support services.",
    audience: "Founders targeting older adults, caregivers, senior living operators, and family decision-makers.",
    sections: [
      "Underserved senior care niches",
      "Service models for families, operators, and B2B partners",
      "Partnership routes and validation questions"
    ],
    marketMap: [
      "Care coordination for families managing appointments, documents, medication notes, and check-ins.",
      "Independence services: home safety audits, mobility support, simplified tech setup, and local assistance.",
      "Longevity education and habit programs for active retirees who want prevention, not only care."
    ],
    launchAngles: [
      "Sell reassurance to families, not just convenience to seniors.",
      "Start with a human-assisted service before building software around repeated tasks.",
      "Use local trust channels: pharmacies, clinics, community centers, and senior residences."
    ],
    validationPlan: [
      "Day 1: Pick one stressful family-care scenario.",
      "Day 2: Interview caregivers about what breaks down each week.",
      "Day 3: Map the current workaround and the person who pays.",
      "Day 4: Offer a manual concierge version to three families.",
      "Day 5: Test whether operators or families value the service more.",
      "Day 6: Draft a referral partnership pitch for one local channel.",
      "Day 7: Keep the offer only if it reduces stress, saves time, or prevents missed care."
    ],
    nextStep: "Start with one narrow care or support scenario, then validate it with caregivers, senior living operators, or family decision-makers."
  }
};

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".json": "application/json; charset=utf-8"
};

async function readJsonBody(request) {
  const body = await readTextBody(request);
  return body ? JSON.parse(body) : {};
}

async function readTextBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1_000_000) throw new Error("Request too large");
  }
  return body;
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function supabaseReady() {
  return Boolean(supabaseUrl && supabaseServiceKey);
}

async function supabaseRequest(pathname, options = {}) {
  if (!supabaseReady()) {
    throw new Error("Supabase is not configured.");
  }

  const supabaseResponse = await fetch(`${supabaseUrl}/rest/v1/${pathname}`, {
    ...options,
    headers: {
      apikey: supabaseServiceKey,
      authorization: `Bearer ${supabaseServiceKey}`,
      "content-type": "application/json",
      ...options.headers
    }
  });

  if (!supabaseResponse.ok) {
    const details = await supabaseResponse.text();
    throw new Error(details || `Supabase request failed with status ${supabaseResponse.status}.`);
  }

  return supabaseResponse;
}

async function saveLeadToSupabase(payload, email) {
  const now = new Date().toISOString();
  await supabaseRequest("leads?on_conflict=email", {
    method: "POST",
    headers: {
      prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify({
      email,
      report: payload.report || null,
      source: payload.source || "early-access",
      updated_at: now
    })
  });
}

async function savePurchaseToSupabase(payload) {
  if (!payload.sessionId) return;

  await supabaseRequest("purchases?on_conflict=stripe_session_id", {
    method: "POST",
    headers: {
      prefer: "resolution=ignore-duplicates,return=minimal"
    },
    body: JSON.stringify({
      stripe_session_id: payload.sessionId,
      customer_email: payload.customerEmail || null,
      mode: payload.mode || null,
      report: payload.report || null,
      status: payload.status || "paid"
    })
  });
}

async function saveLead(payload) {
  const email = String(payload.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }

  if (supabaseReady()) {
    try {
      await saveLeadToSupabase(payload, email);
      return { ok: true, message: "Saved. You are on the early access list." };
    } catch (error) {
      console.warn(`Supabase lead save failed; using local fallback. ${error.message}`);
    }
  }

  const dataDir = path.join(root, "data");
  const filePath = path.join(dataDir, "leads.json");
  await fs.mkdir(dataDir, { recursive: true });

  let leads = [];
  try {
    leads = JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    leads = [];
  }

  const existing = leads.find((lead) => lead.email === email);
  if (existing) {
    existing.updatedAt = new Date().toISOString();
    existing.report = payload.report || existing.report || null;
  } else {
    leads.push({
      email,
      report: payload.report || null,
      source: payload.source || "early-access",
      createdAt: new Date().toISOString()
    });
  }

  await fs.writeFile(filePath, JSON.stringify(leads, null, 2));
  return { ok: true, message: "Saved. You are on the early access list." };
}

async function savePurchase(payload) {
  if (supabaseReady()) {
    try {
      await savePurchaseToSupabase(payload);
      return;
    } catch (error) {
      console.warn(`Supabase purchase save failed; using local fallback. ${error.message}`);
    }
  }

  const dataDir = path.join(root, "data");
  const filePath = path.join(dataDir, "purchases.json");
  await fs.mkdir(dataDir, { recursive: true });

  let purchases = [];
  try {
    purchases = JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    purchases = [];
  }

  if (!purchases.some((purchase) => purchase.sessionId === payload.sessionId)) {
    purchases.push({
      sessionId: payload.sessionId,
      customerEmail: payload.customerEmail || null,
      mode: payload.mode || null,
      report: payload.report || null,
      status: payload.status || "paid",
      createdAt: new Date().toISOString()
    });
  }

  await fs.writeFile(filePath, JSON.stringify(purchases, null, 2));
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function hasSentPurchaseEmail(sessionId) {
  if (!sessionId) return false;

  try {
    const filePath = path.join(root, "data", "sent-emails.json");
    const sentEmails = JSON.parse(await fs.readFile(filePath, "utf8"));
    return sentEmails.includes(sessionId);
  } catch {
    return false;
  }
}

async function markPurchaseEmailSent(sessionId) {
  if (!sessionId) return;

  const dataDir = path.join(root, "data");
  const filePath = path.join(dataDir, "sent-emails.json");
  await fs.mkdir(dataDir, { recursive: true });

  let sentEmails = [];
  try {
    sentEmails = JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    sentEmails = [];
  }

  if (!sentEmails.includes(sessionId)) {
    sentEmails.push(sessionId);
    await fs.writeFile(filePath, JSON.stringify(sentEmails, null, 2));
  }
}

function buildPurchaseEmail(payload) {
  const isSubscription = payload.mode === "subscription";
  const report = reportDeliverables[payload.report] || null;
  const product = report?.title || payload.report || (isSubscription ? "Premium subscription" : "Trend-Spotter report");
  const safeProduct = escapeHtml(product);
  const reportUrl = report && payload.sessionId ? buildReportAccessUrl(payload.sessionId) : "";
  const subject = isSubscription
    ? "Your TrendSpotter Premium access is active"
    : `Your TrendSpotter report is ready: ${product}`;

  const reportHtml = report
    ? `
      <div style="background:#eef8f5;border:1px solid #cfe2df;border-radius:12px;padding:18px;margin:22px 0;">
        <p style="margin:0 0 10px;color:#6a7680;font-size:12px;font-weight:800;letter-spacing:0;text-transform:uppercase;">Report delivery</p>
        <h2 style="font-size:22px;margin:0 0 10px;">${escapeHtml(report.title)}</h2>
        <p style="margin:0 0 14px;">${escapeHtml(report.summary)}</p>
        <ul style="margin:0 0 14px;padding-left:20px;">
          ${report.sections.map((section) => `<li>${escapeHtml(section)}</li>`).join("")}
        </ul>
        <p style="margin:0 0 16px;"><strong>Next step:</strong> ${escapeHtml(report.nextStep)}</p>
        ${
          reportUrl
            ? `<p style="margin:0;"><a href="${reportUrl}" style="display:inline-block;background:#15212b;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;">Open your full report</a></p>`
            : ""
        }
      </div>
    `
    : "";

  const headline = isSubscription ? "Your Premium access is active." : "Your report is ready.";
  const intro = isSubscription
    ? "Your payment is confirmed and your TrendSpotter Premium access is active."
    : "Your payment is confirmed. Your report summary is below, and your private report link is ready.";

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#14212b;max-width:620px;margin:0 auto;padding:28px;">
      <h1 style="font-size:28px;margin:0 0 16px;">${headline}</h1>
      <p>${intro}</p>
      <p><strong>Purchase:</strong> ${safeProduct}</p>
      ${reportHtml}
      <p>You can return to your dashboard here:</p>
      <p><a href="${publicUrl}" style="display:inline-block;background:#15212b;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;">Open Trend-Spotter</a></p>
      <p style="color:#5b6975;font-size:14px;">If you did not expect this email, reply to this message and we will help.</p>
    </div>
  `;

  return { subject, html };
}

async function sendPurchaseEmail(payload) {
  if (!resendApiKey || !payload.customerEmail || !payload.sessionId) return;
  if (await hasSentPurchaseEmail(payload.sessionId)) return;

  const email = buildPurchaseEmail(payload);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${resendApiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from: emailFrom,
      to: payload.customerEmail,
      subject: email.subject,
      html: email.html
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `Resend email failed with status ${response.status}.`);
  }

  await markPurchaseEmailSent(payload.sessionId);
}

async function recordPaidPurchase(payload) {
  await savePurchase(payload);

  try {
    await sendPurchaseEmail(payload);
  } catch (error) {
    console.warn(`Purchase confirmation email failed. ${error.message}`);
  }
}

async function createStripeCheckout(payload) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      ok: false,
      setupRequired: true,
      message: "Stripe is not configured yet. Add STRIPE_SECRET_KEY and price settings to enable checkout."
    };
  }

  const mode = payload.kind === "premium" ? "subscription" : "payment";
  const reportName = payload.report || "Trend-Spotter Premium Report";
  const params = new URLSearchParams({
    mode,
    success_url: `${publicUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${publicUrl}/cancelled.html`
  });
  params.append("metadata[kind]", payload.kind || "report");
  if (payload.report) params.append("metadata[report]", payload.report);

  if (mode === "subscription") {
    if (!process.env.STRIPE_PRICE_ID_PREMIUM) {
      return {
        ok: false,
        setupRequired: true,
        message: "Add STRIPE_PRICE_ID_PREMIUM to enable the Premium subscription checkout."
      };
    }
    params.append("line_items[0][price]", process.env.STRIPE_PRICE_ID_PREMIUM);
    params.append("line_items[0][quantity]", "1");
  } else {
    params.append("line_items[0][price_data][currency]", "usd");
    params.append("line_items[0][price_data][unit_amount]", "4900");
    params.append("line_items[0][price_data][product_data][name]", reportName);
    params.append("line_items[0][quantity]", "1");
  }

  const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "content-type": "application/x-www-form-urlencoded",
      "stripe-version": stripeApiVersion
    },
    body: params
  });

  const session = await stripeResponse.json();
  if (!stripeResponse.ok) {
    return { ok: false, message: session.error?.message || "Stripe checkout failed." };
  }

  return { ok: true, url: session.url };
}

async function retrieveCheckoutSession(sessionId) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { ok: false, message: "Stripe is not configured." };
  }

  const stripeResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
    headers: {
      authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "stripe-version": stripeApiVersion
    }
  });
  const session = await stripeResponse.json();
  if (!stripeResponse.ok) {
    return { ok: false, message: session.error?.message || "Unable to retrieve checkout session." };
  }

  if (session.payment_status === "paid" || session.status === "complete") {
    await recordPaidPurchase({
      sessionId: session.id,
      customerEmail: session.customer_details?.email,
      mode: session.mode,
      report: session.metadata?.report,
      status: session.payment_status || session.status
    });
  }

  return {
    ok: true,
    customerEmail: session.customer_details?.email || null,
    mode: session.mode,
    report: session.metadata?.report || null,
    status: session.payment_status || session.status
  };
}

function reportTokenForSession(sessionId) {
  return crypto.createHmac("sha256", reportAccessSecret).update(String(sessionId || "")).digest("hex").slice(0, 32);
}

function buildReportAccessUrl(sessionId) {
  const token = reportTokenForSession(sessionId);
  return `${publicUrl}/report.html?session_id=${encodeURIComponent(sessionId)}&token=${encodeURIComponent(token)}`;
}

function serializeReport(report) {
  return {
    title: report.title,
    summary: report.summary,
    audience: report.audience,
    sections: report.sections,
    marketMap: report.marketMap,
    launchAngles: report.launchAngles,
    validationPlan: report.validationPlan,
    nextStep: report.nextStep
  };
}

async function retrieveReport(sessionId, token) {
  if (!sessionId || !token) {
    return { ok: false, message: "Missing report access details." };
  }

  const expectedToken = reportTokenForSession(sessionId);
  if (!timingSafeEqual(expectedToken, token)) {
    return { ok: false, message: "This report link is invalid." };
  }

  const checkout = await retrieveCheckoutSession(sessionId);
  if (!checkout.ok) return checkout;
  if (checkout.mode !== "payment") {
    return { ok: false, message: "This purchase is not a report order." };
  }

  const report = reportDeliverables[checkout.report];
  if (!report) {
    return { ok: false, message: "We could not find the report for this purchase." };
  }

  return {
    ok: true,
    customerEmail: checkout.customerEmail,
    report: serializeReport(report)
  };
}

function timingSafeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function verifyStripeWebhookSignature(payload, signatureHeader) {
  if (!stripeWebhookSecret) return;
  if (!signatureHeader) throw new Error("Missing Stripe signature header.");

  const parts = Object.fromEntries(signatureHeader.split(",").map((part) => part.split("=", 2)));
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) throw new Error("Invalid Stripe signature header.");

  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto.createHmac("sha256", stripeWebhookSecret).update(signedPayload).digest("hex");
  if (!timingSafeEqual(expected, signature)) {
    throw new Error("Invalid Stripe webhook signature.");
  }
}

async function handleStripeWebhook(request) {
  const payload = await readTextBody(request);
  verifyStripeWebhookSignature(payload, request.headers["stripe-signature"]);

  const event = payload ? JSON.parse(payload) : {};
  if (event.type === "checkout.session.completed") {
    const session = event.data?.object || {};
    await recordPaidPurchase({
      sessionId: session.id,
      customerEmail: session.customer_details?.email || session.customer_email,
      mode: session.mode,
      report: session.metadata?.report,
      status: session.payment_status || session.status || "paid"
    });
  }
  return { received: true };
}

async function serveStatic(request, response) {
  const url = new URL(request.url, publicUrl);
  const requestedPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(root, requestedPath));

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const content = await fs.readFile(filePath);
    response.writeHead(200, {
      "content-type": mimeTypes[path.extname(filePath)] || "application/octet-stream"
    });
    response.end(request.method === "HEAD" ? undefined : content);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === "POST" && request.url === "/api/leads") {
      sendJson(response, 200, await saveLead(await readJsonBody(request)));
      return;
    }

    if (request.method === "POST" && request.url === "/api/checkout") {
      sendJson(response, 200, await createStripeCheckout(await readJsonBody(request)));
      return;
    }

    if (request.method === "POST" && request.url === "/api/webhooks/stripe") {
      sendJson(response, 200, await handleStripeWebhook(request));
      return;
    }

    if (request.method === "GET" && request.url.startsWith("/api/checkout-session")) {
      const url = new URL(request.url, publicUrl);
      sendJson(response, 200, await retrieveCheckoutSession(url.searchParams.get("session_id")));
      return;
    }

    if (request.method === "GET" && request.url.startsWith("/api/report")) {
      const url = new URL(request.url, publicUrl);
      sendJson(response, 200, await retrieveReport(url.searchParams.get("session_id"), url.searchParams.get("token")));
      return;
    }

    if (request.method === "GET" || request.method === "HEAD") {
      await serveStatic(request, response);
      return;
    }

    response.writeHead(405);
    response.end("Method not allowed");
  } catch (error) {
    sendJson(response, 500, { ok: false, message: error.message || "Server error" });
  }
});

server.listen(port, host, () => {
  console.log(`Trend-Spotter running at ${publicUrl}`);
});
