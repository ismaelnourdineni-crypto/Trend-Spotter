const params = new URLSearchParams(window.location.search);
const sessionId = params.get("session_id");
const token = params.get("token");

const title = document.querySelector("#reportTitle");
const summary = document.querySelector("#reportSummary");
const content = document.querySelector("#reportContent");
const audience = document.querySelector("#reportAudience");
const sections = document.querySelector("#reportSections");
const marketMap = document.querySelector("#reportMarketMap");
const launchAngles = document.querySelector("#reportLaunchAngles");
const validationPlan = document.querySelector("#reportValidationPlan");
const nextStep = document.querySelector("#reportNextStep");
const printButton = document.querySelector("#printReport");

function fillList(element, items = []) {
  element.replaceChildren(
    ...items.map((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      return li;
    })
  );
}

function showError(message) {
  title.textContent = "We could not open this report.";
  summary.textContent = message || "Please use the private link from your TrendSpotter purchase email.";
  content.hidden = true;
}

async function loadReport() {
  if (!sessionId || !token) {
    showError("This report link is missing its access details.");
    return;
  }

  try {
    const response = await fetch(
      `/api/report?session_id=${encodeURIComponent(sessionId)}&token=${encodeURIComponent(token)}`
    );
    const data = await response.json();
    if (!data.ok) {
      showError(data.message);
      return;
    }

    const report = data.report;
    title.textContent = report.title;
    summary.textContent = report.summary;
    audience.textContent = report.audience;
    nextStep.textContent = report.nextStep;
    fillList(sections, report.sections);
    fillList(marketMap, report.marketMap);
    fillList(launchAngles, report.launchAngles);
    fillList(validationPlan, report.validationPlan);
    content.hidden = false;
  } catch {
    showError("The report service did not respond. Please refresh the page or try again in a minute.");
  }
}

printButton.addEventListener("click", () => window.print());
loadReport();
