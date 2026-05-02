const authContainer = document.querySelector(".auth-container");
const signInCard = document.querySelector(".sign-in-card");
const signUpCard = document.querySelector(".sign-up-card");
const chat = document.querySelector(".chat");
const signUpForm = document.querySelector("#signUpForm");
const signInForm = document.querySelector("#signInForm");
const errorEl = signInCard.querySelector(".error-message");
const signUpErrorEl = signUpCard.querySelector(".error-message");
const signUpSuccessEl = signUpCard.querySelector("#signUpSuccess");
const successEl = signInCard.querySelector("#signInSuccess");

const oAuthData = {};

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function toggleVisibility(is=null, toBe=null, classname) {
    is?.querySelectorAll("input").forEach(input => {
        input.value = "";
    })
    toBe?.querySelectorAll("input").forEach(input => {
        input.value = "";
    })

    is?.classList.add(classname);
    toBe?.classList.remove(classname);
}

function showError(el, message) {
    el.classList.remove("non-visible");
    el.textContent = message;
    setTimeout(() => {
        el.classList.add("non-visible");
        el.textContent = "";
    }, 15 * 1000);
}

function showSuccess(el, message) {
    el.classList.remove("non-visible");
    el.textContent = message;
    setTimeout(() => {
        el.classList.add("non-visible");
        el.textContent = "";
    }, 15 * 1000);
}

function clearAllInputs(container) {
    container.querySelectorAll("input").forEach(input => {
        input.value = "";
    })
}

document.querySelectorAll(".toggle-password").forEach(toggle => {
  toggle.addEventListener("click", () => {
    const passwordEl = toggle.previousElementSibling;

    if (passwordEl.type === "password") {
      passwordEl.type = "text";
      toggle.textContent = "Hide";
    } else {
      passwordEl.type = "password";
      toggle.textContent = "Show";
    }
  });
});

signInForm.addEventListener("submit", async(e) => {
    e.preventDefault();
    const emailEl = signInForm.querySelector("#email");
    const passwordEl = signInForm.querySelector("#password");
    const submitBtn = signInForm.querySelector(".sign-up-button");
    
    errorEl.textContent = "";

    if (submitBtn.disabled) return;

    const email = emailEl.value.trim();
    const password = passwordEl.value.trim();

    if (!email || !password) {
        showError(errorEl, "Please fill all fields");
        return;
    }

    if (!validateEmail(email)) {
        showError(errorEl, "Enter a valid email address");
        return;
    }

    if (password.length < 6) {
        showError(errorEl, "Password must be at least 6 characters");
        return;
    }

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = "Signing in...";

        const res = await fetch("/o/authenticate/sign-in", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password, ...oAuthData })
        });

        const result = await res.json();

        if (!res.ok) {
            let userRelated = false;
            const message = result.message;
            if (message === "MISSING_USER_CREDENTIALS") {
                showError(errorEl, "Missing email or password");
                userRelated = true;
            }
            else if (message === "INVALID_USER_CREDENTIALS") {
                showError(errorEl, "Invalid email or password. Maybe try signing up.");
                userRelated = true;
            }
            else if (message === "UNVERIFIED_USER") {
                showError(errorEl, "Your email is not verified. We've sent a verification link to your inbox.");
                userRelated = true;
            }
            else if (message === "INVALID_CLIENT_CREDENTIALS" || message === "MISSING_CLIENT_CREDENTIALS") {

            }
            else {
                showError(errorEl, "Something went wrong. Please try again.")
                userRelated = true;
            }

            if (userRelated) {
                emailEl.value = "";
                passwordEl.value = "";

                submitBtn.textContent = "Sign In";
                submitBtn.disabled = false;
            }
            return; 
        }

        if (result.redirect) {
            window.location.href = result.redirect;
        } else {
            window.location.href = "/"; // fallback
        }
    } catch (err) {
        console.error(err);
        showError(errorEl, "Network error. Please try again.");
    } 
})

signUpCard.querySelector("#signInLink").addEventListener("click", (e) => {
    e.preventDefault();
    toggleVisibility(signUpCard, signInCard, "non-visible");
})

signInCard.querySelector("#signUpLink").addEventListener("click", (e) => {
    e.preventDefault();
    toggleVisibility(signInCard, signUpCard, "non-visible");
})

signUpForm.addEventListener("submit", async(e) => {
    e.preventDefault();
    const firstNameEl = signUpForm.querySelector("#firstName");
    const lastNameEl = signUpForm.querySelector("#lastName");
    const emailEl = signUpForm.querySelector("#email");
    const passwordEl = signUpForm.querySelector("#password");
    const submitBtn = signUpForm.querySelector(".sign-up-button");

    const firstName = firstNameEl.value.trim();
    const lastName = lastNameEl.value.trim();
    const email = emailEl.value.trim();
    const password = passwordEl.value.trim();
    signUpErrorEl.textContent = "";

    function nameValidation(name, fieldName, required=false) {
        if (required && !name) {
            return showError(signUpErrorEl, `${fieldName} is required`)
        }
        if (name.length < 2 || name.length > 50) {
            return showError(signUpErrorEl, `${fieldName} must range from 2 to 50 characters long.`)
        }
        const nameRegex = /^[A-Za-z]+$/;

        if (!nameRegex.test(name)) {
            return showError(signUpErrorEl, `Please enter valid ${fieldName}`)
        }
    }

    if (submitBtn.disabled) return;

    nameValidation(firstName, "First ame", true);

    if (lastName) {
        nameValidation(lastName, "Last name");
    }

    if (!email || !password) {
        return showError(signUpErrorEl, "Please fill all fields");
    }

    if (!validateEmail(email)) {
        return showError(signUpErrorEl, "Enter a valid email address");
    }

    if (password.length < 6) {
        return showError(signUpErrorEl, "Password must be at least 6 characters");
    }

    if (/[\s\\/]/.test(password)) {
        return showError(signUpErrorEl, "Password should not contain spaces, / or \\");
    }

     try {
        submitBtn.disabled = true;
        submitBtn.textContent = "Creating account...";

        const params = new URLSearchParams(window.location.search);

        const res = await fetch("/o/authenticate/sign-up", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
            firstName, 
            lastName, 
            email, 
            password,
            ...oAuthData
        })
        });

        const result = await res.json();

        if (!res.ok) {
            const message = result.message;
            if (message === "EXISTING_USER") {
                showError(signUpErrorEl, "Your account already exists. Try signing in");
            }
            else if (message === "MISSING_USER_CREDENTIALS") {
                showError(signUpErrorEl, "Missing email or password");
            }
            else {
                showError("Could not create account. Try again");
            }
            emailEl.value = "";
            passwordEl.value = "";
            
            submitBtn.disabled = false;
            submitBtn.textContent = "Sign Up";
            return;
        }
        showSuccess(signUpSuccessEl, result.message);
        submitBtn.disabled = true;
        submitBtn.textContent = "Sign Up";
        return;
    } catch (err) {
        console.error(err);
        showError(signUpErrorEl, "Network error. Please try again.");
        submitBtn.disabled = false;
        submitBtn.textContent = "Sign Up";
        return;
    }
});

document.addEventListener('DOMContentLoaded', () => {
    toggleVisibility(signUpCard, signInCard, "non-visible");
    const params = new URLSearchParams(window.location.search);
    const verify = params.get("verify");

    if (verify) {
        if (verify === "error") {
            showError(errorEl, "Invalid or expired verification link. Please try signing in")
        }
        else if (verify === "success") {
            oAuthData.clientID = params.get("client_id");
            oAuthData.redirectURL= params.get("redirect_url");
            oAuthData.state = params.get("state");
            oAuthData.scope = params.get("scope");
            showSuccess(successEl, "Account successfully verified. Now, sign in to continue")
        }
        else {
            showError(errorEl, "Something seems wrong. Try sigining in.")
        }
    }
    else {
        oAuthData.clientID = params.get("client_id");
        oAuthData.redirectURL= params.get("redirect_url");
        oAuthData.state = params.get("state");
        oAuthData.scope = params.get("scope");
    }

    window.history.replaceState({}, document.title, window.location.pathname);
});

// document.addEventListener('DOMContentLoaded', () => {
//     toggleVisibility(signUpCard, signInCard, "non-visible");

//     const params = new URLSearchParams(window.location.search);
//     const verify = params.get("verify");

//     // 🔥 STEP 1: If OAuth params exist → store them
//     const clientID = params.get("client_id");
//     const redirectURL = params.get("redirect_url");
//     const state = params.get("state");
//     const scope = params.get("scope");

//     if (clientID && redirectURL && state) {
//         const oauthData = { clientID, redirectURL, state, scope };
//         sessionStorage.setItem("oauthData", JSON.stringify(oauthData));
//     }

//     // 🔥 STEP 2: Always restore from storage
//     const stored = sessionStorage.getItem("oauthData");
//     if (stored) {
//         Object.assign(oAuthData, JSON.parse(stored));
//     }

//     // 🔥 STEP 3: Handle verification UI
//     if (verify) {
//         if (verify === "error") {
//             showError(errorEl, "Invalid or expired verification link. Please try signing in");
//         } else if (verify === "success") {
//             showSuccess(successEl, "Account successfully verified. Now, sign in to continue");
//         } else {
//             showError(errorEl, "Something seems wrong. Try signing in.");
//         }
//     }

//     // 🔥 STEP 4: Clean URL (optional)
//     window.history.replaceState({}, document.title, window.location.pathname);
// });