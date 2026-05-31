document.addEventListener("DOMContentLoaded", function () {
  function formatUtcPostTimes() {
    const timeNodes = document.querySelectorAll("time.post-time");
    const formatter = new Intl.DateTimeFormat("pl-PL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    timeNodes.forEach((node) => {
      const datetime = node.getAttribute("datetime");
      if (!datetime) return;
      const date = new Date(datetime);
      if (Number.isNaN(date.valueOf())) return;
      node.textContent = formatter.format(date);
    });
  }

  formatUtcPostTimes();

  const forms = document.querySelectorAll("form.post-delete-form");

  forms.forEach((form) => {
    form.addEventListener("submit", (e) => {
      const confirmedAt = Number(form.dataset.confirmedAt || "0");
      const now = Date.now();

      const messageEl = form.querySelector(".inline-error");
      const setMessage = (msg) => {
        if (messageEl) messageEl.textContent = msg || "";
      };

      if (!confirmedAt || now - confirmedAt > 7000) {
        e.preventDefault();
        form.dataset.confirmedAt = String(now);
        setMessage("Kliknij jeszcze raz, aby potwierdzić usunięcie.");

        const btn = form.querySelector("button.post-delete");
        if (btn) btn.focus();

        window.setTimeout(() => {
          const current = Number(form.dataset.confirmedAt || "0");
          if (current === now) {
            delete form.dataset.confirmedAt;
            setMessage("");
          }
        }, 7000);
      } else {
        delete form.dataset.confirmedAt;
        setMessage("");
      }
    });
  });
});

