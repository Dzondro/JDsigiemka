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
