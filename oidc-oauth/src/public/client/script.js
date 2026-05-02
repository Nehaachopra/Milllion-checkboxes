const card = document.querySelector(".card");
const detailsCard = document.querySelector(".details-card");
const form = document.getElementById("clientForm");
const submitBtn = document.getElementById("submitBtn");
const spinner = document.getElementById("spinner");
const btnText = document.getElementById("btnText");
const errorMsg = document.getElementById("errorMsg");
const clientId = document.getElementById("clientId");
const clientSecret = document.getElementById("clientSecret");
const closeBtn = document.querySelector(".close-btn");

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.style.display = "block";
}

function hideError() {
  errorMsg.textContent = '';
  errorMsg.style.display = "none";
}

function setLoading(loading) {
  submitBtn.disabled = loading;
  spinner.style.display = loading ? "block" : "none";
  btnText.textContent = loading ? "Submitting…" : "Submit";
}

function cardVisible() {
  clientId.value = "";
  clientSecret.value = "";
  detailsCard.classList.add("non-visible");
  card.querySelectorAll("input").forEach(input => input.value = "");
  card.classList.remove("non-visible");
}

function cardNotVisible() {
  detailsCard.classList.remove("non-visible");
  card.classList.add("non-visible");
}

window.addEventListener("DOMContentLoaded", () => {
  cardVisible();
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();

  let appName = document.getElementById("applicationDisplayName").value.trim();
  let applicationURL = document.getElementById("applicationURL").value;
  let redirectURL = document.getElementById("redirectURL").value;

  if (!appName || !applicationURL || !redirectURL) {
    showError("Please fill in all fields.");
    return;
  }

  if (applicationURL === redirectURL) {
    showError("Application URL must be different from redirect URI!");
    return;
  }

  if (!/^[a-zA-Z0-9 ]+$/.test(appName)) {
    showError("Enter valid app name");
    return;
  }

  appName = appName
    .trim()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  applicationURL = applicationURL.trim().toLowerCase();
  redirectURL = redirectURL.trim().toLowerCase();

  setLoading(true);

  try {
    const res = await fetch("/client-details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appName,
        applicationURL,
        redirectURL,
      }),
    });

    let result = await res.json();

    if (!res.ok) {
      showError(result.message || "Something went wrong. Please try again.");
      return;
    } 
    else {
      let data = result.data;
      clientId.value = data.clientID;
      clientSecret.value = data.clientSecret;
      data = "";
      cardNotVisible();
      setTimeout(() => {
        cardVisible();
      }, 5 * 60 * 1000);
    }
  } catch(err) {
    console.log(err)
    showError("Something went wrong. Please try again.");
  } finally {
    setLoading(false);
  }
});

closeBtn.addEventListener("click", () => {
  cardVisible();
});

document.querySelectorAll(".copy-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const input = btn.parentElement.querySelector("input");

    try {
      await navigator.clipboard.writeText(input.value);

      // visual feedback
      btn.classList.add("copied");

      setTimeout(() => {
        btn.classList.remove("copied");
      }, 1000);

    } catch (err) {
      showError("Copy failed", err);
    }
  });
});