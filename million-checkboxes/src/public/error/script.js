const notFoundCard = document.querySelector(".notfound-card");
const errorCard = document.querySelector(".error-card");
const errorTitle = errorCard.querySelector(".notfound-title");
const errorDescription = errorCard.querySelector(".notfound-description");

function toggleCard(is, toBe) {
  errorTitle.textContent = "";
  errorDescription.textContent = "";
  is.classlist.add("non-visible");
  toBe.classlist.remove("non-visible");
}

window.addEventListener("DOMContentLoaded",  () => {
  const params = new URLSearchParams(window.location.search);
  const error = params.get("type");
  if (error) {
    toggleCard(notFoundCard, errorCard);
    errorTitle.textContent = "Error"
    errorDescription.textContent = "Something went wrong. Please try again."
  }
  else {
    toggleCard(errorCard, notFoundCard)
  }
  
  window.history.replaceState({}, document.title, window.location.pathname);
})