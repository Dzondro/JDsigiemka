document.addEventListener("DOMContentLoaded", function () {
  const nav = document.querySelector("header nav");
  const loginBtn = nav && nav.querySelector('button[data-action="login"]');
  const registerBtn = nav && nav.querySelector('button[data-action="register"]');
  const logoutBtn = nav && nav.querySelector('button[data-action="logout"]');

  const loginModal = document.getElementById("login-modal");
  const registerModal = document.getElementById("register-modal");

  function setError(modal, message) {
    if (!modal) return;
    const el = modal.querySelector(".form-error");
    if (!el) return;
    el.textContent = message || "";
  }

  function openModal(modal) {
    if (!modal) return;
    setError(modal, "");
    modal.setAttribute("aria-hidden", "false");
    const first = modal.querySelector("input");
    if (first) first.focus();
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.setAttribute("aria-hidden", "true");
  }

  function validateEmail(value) {
    const email = String(value || "").trim().toLowerCase();
    if (!email) return { ok: false, error: "Podaj email." };
    if (email.length > 254) return { ok: false, error: "Email jest za długi." };
    if (/\s/.test(email)) return { ok: false, error: "Email nie może zawierać spacji." };
    const parts = email.split("@");
    if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, error: "Email jest nieprawidłowy." };
    return { ok: true, value: email };
  }

  function validatePassword(value, { requireStrength } = { requireStrength: false }) {
    const password = String(value || "");
    if (!password) return { ok: false, error: "Podaj hasło." };
    if (password.length > 72) return { ok: false, error: "Hasło jest za długie." };
    if (requireStrength) {
      if (password.length < 8) return { ok: false, error: "Hasło musi mieć co najmniej 8 znaków." };
      if (!/[\p{L}]/u.test(password) || !/[0-9]/.test(password)) {
        return { ok: false, error: "Hasło musi zawierać literę oraz cyfrę." };
      }
    }
    return { ok: true, value: password };
  }

  function validateRegisterForm(form) {
    const firstName = String(form.querySelector('input[name="firstName"]')?.value || "").trim();
    const lastName = String(form.querySelector('input[name="lastName"]')?.value || "").trim();
    const ageRaw = String(form.querySelector('input[name="age"]')?.value || "").trim();

    if (!firstName || !lastName) return { ok: false, error: "Podaj imię i nazwisko." };
    if (firstName.length > 50 || lastName.length > 50) return { ok: false, error: "Imię i nazwisko są za długie." };

    const age = Number(ageRaw);
    if (!Number.isInteger(age) || age < 18 || age > 150) return { ok: false, error: "Musisz mieć co najmniej 18 lat." };

    const emailCheck = validateEmail(form.querySelector('input[name="email"]')?.value);
    if (!emailCheck.ok) return emailCheck;

    const passCheck = validatePassword(form.querySelector('input[name="password"]')?.value, { requireStrength: true });
    if (!passCheck.ok) return passCheck;

    return { ok: true };
  }

  function validateLoginForm(form) {
    const emailCheck = validateEmail(form.querySelector('input[name="email"]')?.value);
    if (!emailCheck.ok) return emailCheck;

    const passCheck = validatePassword(form.querySelector('input[name="password"]')?.value, { requireStrength: false });
    if (!passCheck.ok) return passCheck;

    return { ok: true };
  }

  async function postForm(url, form) {
    const body = new URLSearchParams(new FormData(form));
    const resp = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    let data = null;
    try {
      data = await resp.json();
    } catch {
      data = null;
    }

    if (!resp.ok || !data?.ok) {
      throw new Error(data?.error || "Coś poszło nie tak.");
    }
    return data;
  }

  if (loginBtn) loginBtn.addEventListener("click", (e) => {
    e.preventDefault();
    openModal(loginModal);
  });
  if (registerBtn) registerBtn.addEventListener("click", (e) => {
    e.preventDefault();
    openModal(registerModal);
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await fetch("/auth/logout", { method: "POST", credentials: "same-origin" });
      } finally {
        window.location.reload();
      }
    });
  }

  [loginModal, registerModal].forEach((modal) => {
    if (!modal) return;
    const closeBtn = modal.querySelector(".modal-close");
    const cancelBtn = modal.querySelector(".modal-cancel");
    const form = modal.querySelector("form");

    if (closeBtn) closeBtn.addEventListener("click", () => closeModal(modal));
    if (cancelBtn) cancelBtn.addEventListener("click", () => closeModal(modal));

    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeModal(modal);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeModal(modal);
    });

    if (form) {
      form.addEventListener("submit", async function (e) {
        e.preventDefault();
        setError(modal, "");

        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

        const endpoint = form.id === "register-form" ? "/auth/register" : "/auth/login";

        try {
          const validation =
            form.id === "register-form" ? validateRegisterForm(form) : validateLoginForm(form);
          if (!validation.ok) {
            setError(modal, validation.error || "Popraw dane w formularzu.");
            return;
          }

          await postForm(endpoint, form);
          window.location.reload();
        } catch (err) {
          setError(modal, err?.message || "Coś poszło nie tak.");
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
      });
    }
  });
});
