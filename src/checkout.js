const params = new URLSearchParams(window.location.search);
const sessionId = params.get("session_id");
const title = document.querySelector("#checkoutTitle");
const message = document.querySelector("#checkoutMessage");

if (!sessionId) {
  message.textContent = "Missing Stripe session ID. Return to the dashboard and try again.";
} else {
  try {
    const response = await fetch(`/api/checkout-session?session_id=${encodeURIComponent(sessionId)}`);
    const result = await response.json();
    if (result.ok) {
      const purchaseLabel = result.report ? `Your report (${result.report})` : "Your Premium subscription";
      title.textContent = result.report ? "Your report is confirmed." : "Your Premium access is active.";
      message.textContent = `${purchaseLabel} is confirmed${result.customerEmail ? ` for ${result.customerEmail}` : ""}.`;
      if (!result.report) {
        localStorage.setItem("trendSpotterPremium", "true");
      }
    } else {
      message.textContent = result.message || "We could not confirm the payment yet.";
    }
  } catch {
    message.textContent = "The payment succeeded, but the local confirmation endpoint is unavailable.";
  }
}
