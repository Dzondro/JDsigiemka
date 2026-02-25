document.addEventListener('DOMContentLoaded', function () {
  const nav = document.querySelector('header nav');
  const loginBtn = nav && nav.querySelector('button[data-action="login"]');
  const registerBtn = nav && nav.querySelector('button[data-action="register"]');

  const loginModal = document.getElementById('login-modal');
  const registerModal = document.getElementById('register-modal');

  function openModal(modal) {
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'false');
    const first = modal.querySelector('input');
    if (first) first.focus();
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true');
  }

  if (loginBtn) loginBtn.addEventListener('click', e => { e.preventDefault(); openModal(loginModal); });
  if (registerBtn) registerBtn.addEventListener('click', e => { e.preventDefault(); openModal(registerModal); });

  [loginModal, registerModal].forEach(modal => {
    if (!modal) return;
    const closeBtn = modal.querySelector('.modal-close');
    const cancelBtn = modal.querySelector('.modal-cancel');
    const form = modal.querySelector('form');

    if (closeBtn) closeBtn.addEventListener('click', () => closeModal(modal));
    if (cancelBtn) cancelBtn.addEventListener('click', () => closeModal(modal));

    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal(modal);
    });

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        closeModal(modal);
      });
    }
  });
});
