// Tipolis Press Monitor — Feedback widget (bug / suggestion capture).
// Injects a fixed trigger button and a modal form on every authenticated
// page. Posts to POST /feedback through js/api.js, which lands a row in the
// `feedback` sheet in the bound spreadsheet.
//
// Spec: §10 of FRONTEND_SPEC.md. Reuses PM.el, PM.toast, PM.escapeHtml,
// PM.apiPost from js/api.js. No new visual style: pulls from design tokens
// already in main.css (.pm-btn, .t-input, etc.).

(function (global) {
  'use strict';

  if (!global.PM) {
    // api.js must be loaded first. Failing loudly is correct.
    console.error('PM not found — load js/api.js before js/feedback.js');
    return;
  }

  // Map URL → human page name (falls back to General for hub/gate).
  function detectPage() {
    const p = (global.location.pathname || '').toLowerCase();
    if (p.endsWith('triage.html')) return 'Triage';
    if (p.endsWith('summary.html')) return 'Summaries';
    if (p.endsWith('report.html')) return 'Report';
    if (p.endsWith('config.html')) return 'Config';
    if (p.endsWith('history.html')) return 'History';
    return 'General';
  }

  const PAGES = ['Triage', 'Summaries', 'Report', 'Config', 'History', 'General'];
  let mounted = false;
  let trigger, modal, form, pageSelect, titleInput, descInput, errorEl, submitBtn, typeInputs;

  function buildModal() {
    pageSelect = PM.el('select', {
      class: 't-input pm-feedback__field',
      name: 'page',
      'data-feedback-page': ''
    }, PAGES.map(p => PM.el('option', { value: p }, [p])));

    titleInput = PM.el('input', {
      class: 't-input pm-feedback__field',
      type: 'text',
      name: 'title',
      maxlength: '180',
      required: 'required',
      placeholder: 'Short title (required)',
      'data-feedback-title': ''
    });

    descInput = PM.el('textarea', {
      class: 't-input pm-feedback__field pm-feedback__textarea',
      name: 'description',
      rows: '5',
      placeholder: 'What happened? What would you change? (optional)',
      'data-feedback-desc': ''
    });

    function typeOption(value, label) {
      const id = 'pm-feedback-type-' + value;
      return PM.el('label', { class: 'pm-feedback__type', for: id }, [
        PM.el('input', {
          type: 'radio',
          name: 'type',
          id: id,
          value: value,
          'data-feedback-type': ''
        }),
        PM.el('span', null, [label])
      ]);
    }

    const typeRow = PM.el('div', { class: 'pm-feedback__types' }, [
      typeOption('bug', 'Bug'),
      typeOption('suggestion', 'Suggestion')
    ]);

    errorEl = PM.el('div', { class: 'pm-feedback__error', 'data-feedback-error': '' });

    submitBtn = PM.el('button', {
      class: 'pm-btn pm-btn--primary',
      type: 'submit'
    }, ['Send']);

    const cancelBtn = PM.el('button', {
      class: 'pm-btn pm-btn--ghost',
      type: 'button'
    }, ['Cancel']);
    cancelBtn.addEventListener('click', closeModal);

    form = PM.el('form', { class: 'pm-feedback__form', novalidate: 'novalidate' }, [
      PM.el('div', { class: 'pm-feedback__row' }, [
        PM.el('label', { class: 'pm-feedback__label' }, ['Page']),
        pageSelect
      ]),
      PM.el('div', { class: 'pm-feedback__row' }, [
        PM.el('label', { class: 'pm-feedback__label' }, ['Type']),
        typeRow
      ]),
      PM.el('div', { class: 'pm-feedback__row' }, [
        PM.el('label', { class: 'pm-feedback__label' }, ['Title']),
        titleInput
      ]),
      PM.el('div', { class: 'pm-feedback__row' }, [
        PM.el('label', { class: 'pm-feedback__label' }, ['Description']),
        descInput
      ]),
      errorEl,
      PM.el('div', { class: 'pm-feedback__actions' }, [cancelBtn, submitBtn])
    ]);
    form.addEventListener('submit', onSubmit);

    typeInputs = form.querySelectorAll('[data-feedback-type]');

    const closeX = PM.el('button', {
      class: 'pm-feedback__close',
      type: 'button',
      'aria-label': 'Close'
    }, ['×']);
    closeX.addEventListener('click', closeModal);

    const card = PM.el('div', {
      class: 'pm-feedback__card',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'pm-feedback-title'
    }, [
      closeX,
      PM.el('div', { class: 'pm-feedback__eyebrow' }, ['Feedback']),
      PM.el('h2', { class: 'pm-feedback__title', id: 'pm-feedback-title' }, ['Report a bug or suggestion']),
      PM.el('p', { class: 'pm-feedback__hint' }, ['Lands in the feedback sheet attached to the spreadsheet.']),
      form
    ]);

    modal = PM.el('div', {
      class: 'pm-feedback__overlay',
      hidden: 'hidden',
      'data-feedback-overlay': ''
    }, [card]);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  function buildTrigger() {
    trigger = PM.el('button', {
      class: 'pm-btn pm-feedback__trigger',
      type: 'button',
      'aria-haspopup': 'dialog',
      title: 'Send feedback'
    }, ['Feedback']);
    trigger.addEventListener('click', openModal);
  }

  function resetForm() {
    pageSelect.value = detectPage();
    titleInput.value = '';
    descInput.value = '';
    errorEl.textContent = '';
    typeInputs.forEach(r => { r.checked = false; });
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send';
  }

  function openModal() {
    resetForm();
    modal.hidden = false;
    setTimeout(() => titleInput.focus(), 0);
    document.addEventListener('keydown', onEscape);
  }

  function closeModal() {
    modal.hidden = true;
    document.removeEventListener('keydown', onEscape);
  }

  function onEscape(e) {
    if (e.key === 'Escape') closeModal();
  }

  function selectedType() {
    for (let i = 0; i < typeInputs.length; i++) {
      if (typeInputs[i].checked) return typeInputs[i].value;
    }
    return '';
  }

  async function onSubmit(e) {
    e.preventDefault();
    const title = titleInput.value.trim();
    const type = selectedType();
    errorEl.textContent = '';
    if (!title) { errorEl.textContent = 'Title is required.'; titleInput.focus(); return; }
    if (!type)  { errorEl.textContent = 'Pick Bug or Suggestion.'; return; }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    try {
      await PM.apiPost('/feedback', {
        page: pageSelect.value || 'General',
        type: type,
        title: title,
        description: descInput.value
      });
      closeModal();
      PM.toast('Thanks — logged.', 'success');
    } catch (err) {
      if (err && err.name === 'Unauthorized') return;          // api.js handles redirect
      errorEl.textContent = err.message || 'Could not send feedback.';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send';
    }
  }

  function mount() {
    if (mounted) return;
    if (!PM.hasToken()) return;                                 // gate, don't show
    buildModal();
    buildTrigger();
    document.body.appendChild(trigger);
    document.body.appendChild(modal);
    mounted = true;
  }

  // Auto-mount on DOMContentLoaded for screens that requireToken() up-front.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  // Exposed so the hub (index.html) can mount after the login gate closes.
  PM.mountFeedback = mount;
})(window);
