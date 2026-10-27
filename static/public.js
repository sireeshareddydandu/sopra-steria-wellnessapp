(() => {
  const $ = (id) => document.getElementById(id);
  let currentForm;
  const escapeId = (id) => `field-${id}`;
  function show(el) { el.classList.remove('hidden'); }
  function hide(el) { el.classList.add('hidden'); }
  function createField(field) {
    const wrapper = document.createElement('div'); wrapper.className = 'form-field'; wrapper.dataset.fieldId = field.id;
    const label = document.createElement('label'); label.className = 'form-field-label'; label.htmlFor = escapeId(field.id); label.textContent = field.label;
    if (field.required) { const star = document.createElement('span'); star.className = 'required-star'; star.textContent = ' *'; label.appendChild(star); }
    wrapper.appendChild(label);
    let input;
    if (field.type === 'paragraph') { input = document.createElement('textarea'); input.rows = 4; }
    else if (field.type === 'select') { input = document.createElement('select'); const placeholder = document.createElement('option'); placeholder.value = ''; placeholder.textContent = 'Select an option'; input.appendChild(placeholder); (field.options || []).forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = v; input.appendChild(o); }); }
    else if (field.type === 'radio') {
      input = document.createElement('div'); input.className = 'choice-list'; input.id = escapeId(field.id);
      (field.options || []).forEach((v, i) => { const line = document.createElement('label'); line.className = 'choice-option'; const radio = document.createElement('input'); radio.type = 'radio'; radio.name = field.id; radio.value = v; radio.id = `${field.id}-${i}`; line.append(radio, document.createTextNode(v)); input.appendChild(line); });
    } else if (field.type === 'checkbox') {
      input = document.createElement('label'); input.className = 'single-check'; const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.id = escapeId(field.id); input.append(checkbox, document.createTextNode(field.help_text || 'Yes, I confirm')); wrapper.append(label, input); return wrapper;
    } else { input = document.createElement('input'); input.type = ({ short_text: 'text', email: 'email', number: 'number', date: 'date' })[field.type] || 'text'; if (field.type === 'number') input.step = 'any'; }
    if (field.type !== 'radio') { input.id = escapeId(field.id); input.name = field.id; if (field.required) input.required = true; input.classList.add('control'); wrapper.appendChild(input); }
    else { wrapper.appendChild(input); if (field.required) input.dataset.required = 'true'; }
    if (field.help_text && field.type !== 'checkbox') { const help = document.createElement('p'); help.className = 'field-help'; help.textContent = field.help_text; wrapper.appendChild(help); }
    const error = document.createElement('p'); error.className = 'field-error hidden'; error.dataset.errorFor = field.id; wrapper.appendChild(error);
    return wrapper;
  }
  async function load() {
    try {
      const res = await fetch('/api/form'); currentForm = await res.json(); hide($('form-loading'));
      if (!res.ok || !currentForm.fields || !currentForm.fields.length) { show($('form-empty')); return; }
      $('form-title').textContent = currentForm.title; $('form-description').textContent = currentForm.description || '';
      document.title = `${currentForm.title} · Forms Studio`;
      currentForm.fields.forEach(field => $('fields-container').appendChild(createField(field)));
      const reportedField = currentForm.fields.find(field => field.id === 'reported_before');
      const outcomeField = currentForm.fields.find(field => field.id === 'previous_report_outcome');
      if (reportedField && outcomeField) {
        const syncOutcome = () => {
          const selected = document.querySelector('input[name="reported_before"]:checked')?.value || '';
          const outcomeWrap = document.querySelector(`[data-field-id="${CSS.escape(outcomeField.id)}"]`);
          if (outcomeWrap) { outcomeWrap.classList.toggle('hidden', selected !== 'Yes'); if (selected !== 'Yes') { const control = outcomeWrap.querySelector('.control'); if (control) control.value = ''; } }
        };
        document.querySelectorAll('input[name="reported_before"]').forEach(input => input.addEventListener('change', syncOutcome));
        syncOutcome();
      }
      $('submit-button').firstChild.textContent = `${currentForm.submit_label || 'Submit response'} `;
      show($('response-form'));
    } catch (_) { hide($('form-loading')); $('form-empty').querySelector('h1').textContent = 'Unable to load the form'; $('form-empty').querySelector('p').textContent = 'Refresh the page and try again.'; show($('form-empty')); }
  }
  function readValues() {
    const values = {}, errors = {};
    currentForm.fields.forEach(field => {
      const wrap = document.querySelector(`[data-field-id="${CSS.escape(field.id)}"]`);
      let value;
      if (field.type === 'radio') value = wrap.querySelector('input[type="radio"]:checked')?.value || '';
      else if (field.type === 'checkbox') value = wrap.querySelector('input[type="checkbox"]').checked;
      else value = wrap.querySelector('.control').value.trim();
      values[field.id] = value;
      let error = '';
      if (field.required && (field.type === 'checkbox' ? !value : !value)) error = field.type === 'checkbox' ? 'Please check this box.' : 'This field is required.';
      else if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'Enter a valid email address.';
      const errorEl = wrap.querySelector(`[data-error-for="${CSS.escape(field.id)}"]`);
      if (errorEl) { errorEl.textContent = error; errorEl.classList.toggle('hidden', !error); }
      if (error) errors[field.id] = error;
    });
    return { values, errors };
  }
  $('response-form').addEventListener('submit', async (e) => {
    e.preventDefault(); hide($('form-error'));
    const { values, errors } = readValues();
    if (Object.keys(errors).length) { $('form-error').textContent = 'Please check the highlighted fields.'; show($('form-error')); document.querySelector('.field-error:not(.hidden)')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    const button = $('submit-button'); button.disabled = true; button.textContent = 'Submitting…';
    try {
      const res = await fetch('/api/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
      const result = await res.json();
      if (!res.ok) { if (result.field_errors) Object.entries(result.field_errors).forEach(([id, message]) => { const el = document.querySelector(`[data-error-for="${CSS.escape(id)}"]`); if (el) { el.textContent = message; show(el); } }); throw new Error(result.error || 'Your response could not be submitted.'); }
      $('success-message').textContent = (result.message || currentForm.success_message || 'Thank you.') + (result.ticket_id ? ' Your ticket ID is ' + result.ticket_id + '. Save it to track your concern.' : ''); const receipt = $('download-receipt'); if (result.receipt_url) { receipt.href = result.receipt_url; show(receipt); } if (result.submitted_at) { const date = new Date(result.submitted_at); $('submitted-at').textContent = 'Submitted: ' + date.toLocaleString() + ' (your local time)'; } hide($('response-form')); show($('success-state')); window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { $('form-error').textContent = err.message || 'Network error. Please try again.'; show($('form-error')); button.disabled = false; button.innerHTML = `${currentForm.submit_label || 'Submit response'} <span aria-hidden="true">→</span>`; }
  });
  $('another-response').addEventListener('click', () => { $('response-form').reset(); document.querySelectorAll('.field-error').forEach(el => hide(el)); hide($('success-state')); hide($('download-receipt')); $('submitted-at').textContent = ''; show($('response-form')); const btn = $('submit-button'); btn.disabled = false; btn.innerHTML = `${currentForm.submit_label || 'Submit response'} <span aria-hidden="true">→</span>`; window.scrollTo({ top: 0, behavior: 'smooth' }); });
  load();
})();
