(() => {
  const $ = id => document.getElementById(id);
  const csrf = window.ADMIN_CSRF || document.querySelector('meta[name="csrf-token"]')?.content || '';
  let submissionCache = [];

  function toast(message, isError = false) {
    const el = $('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.remove('hidden');
    el.style.borderColor = isError ? '#dc2626' : '';
  }

  async function api(url, options = {}) {
    const headers = { ...(options.headers || {}), 'X-CSRF-Token': csrf };
    if (options.body) headers['Content-Type'] = 'application/json';
    const res = await fetch(url, { ...options, headers });
    const data = res.headers.get('content-type')?.includes('application/json') ? await res.json() : {};
    if (res.status === 401) {
      window.location.href = '/admin/login';
      throw new Error('Please sign in again.');
    }
    if (!res.ok) throw new Error(data.error || 'Request failed.');
    return data;
  }

  function renderTickets() {
    const filter = $('response-search').value.trim().toLowerCase();
    const rows = submissionCache.filter(s =>
      `${s.id} ${s.ticket_id} ${s.submitted_at} ${s.search_text || ''} ${s.status} ${s.department || ''}`
        .toLowerCase().includes(filter)
    );
    const host = $('responses-container');
    host.replaceChildren();
    $('response-summary').textContent = `${rows.length} shown · ${submissionCache.length} total`;

    if (!rows.length) {
      const empty = document.createElement('div');
      empty.className = 'no-responses';
      empty.textContent = filter ? 'No matching tickets found.' : 'No tickets have been submitted yet.';
      host.appendChild(empty);
      return;
    }

    rows.forEach(item => {
      const card = document.createElement('article');
      card.className = 'response-card';

      const head = document.createElement('div');
      head.className = 'response-card-head';
      const title = document.createElement('strong');
      title.textContent = `${item.ticket_id || ('Ticket #' + item.id)} · ${item.status || 'Open'}`;
      const time = document.createElement('time');
      const date = new Date(item.submitted_at);
      time.textContent = Number.isNaN(date.getTime()) ? (item.submitted_at || '') : date.toLocaleString();
      head.append(title, time);
      card.appendChild(head);

      const body = document.createElement('div');
      body.className = 'answer-grid';
      (item.answers || []).forEach(answer => {
        const cell = document.createElement('div');
        cell.className = 'answer-cell';
        const label = document.createElement('span');
        label.className = 'answer-label';
        label.textContent = answer.label || '';
        const value = document.createElement('span');
        value.className = 'answer-value';
        value.textContent = typeof answer.value === 'boolean'
          ? (answer.value ? 'Yes' : 'No')
          : (String(answer.value ?? '—'));
        cell.append(label, value);
        body.appendChild(cell);
      });
      card.appendChild(body);

      const controls = document.createElement('div');
      controls.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin-top:18px';

      function field(labelText, tag, value, placeholder) {
        const wrap = document.createElement('label');
        wrap.className = 'field-label';
        wrap.append(document.createTextNode(labelText));
        const el = document.createElement(tag);
        if (tag === 'select') {
          ['Open', 'In Progress', 'Pending', 'Closed'].forEach(v => {
            const opt = document.createElement('option');
            opt.value = v;
            opt.textContent = v;
            el.appendChild(opt);
          });
          el.value = value || 'Open';
        } else {
          el.value = value || '';
          el.placeholder = placeholder || '';
          el.rows = 2;
          el.maxLength = 3000;
        }
        el.style.width = '100%';
        wrap.appendChild(el);
        controls.appendChild(wrap);
        return el;
      }

      const status = field('Ticket status', 'select', item.status);
      const progress = field('Progress update', 'textarea', item.progress_update, 'Add an update for the employee');
      const pending = field('Pending reason (required for Pending)', 'textarea', item.pending_reason, 'Explain what is pending');
      const closure = field('Closure notes (required for Closed)', 'textarea', item.closure_notes, 'Describe the resolution');
      card.appendChild(controls);

      const commentWrap = document.createElement('label');
      commentWrap.className = 'field-label';
      commentWrap.style.cssText = 'display:block;margin-top:16px';
      commentWrap.append(document.createTextNode('Add comment for employee'));
      const commentInput = document.createElement('textarea');
      commentInput.placeholder = 'Write a comment visible to the employee';
      commentInput.maxLength = 3000;
      commentInput.rows = 3;
      commentInput.style.cssText = 'display:block;width:100%;box-sizing:border-box;margin-top:8px';
      commentWrap.appendChild(commentInput);
      card.appendChild(commentWrap);

      const postComment = document.createElement('button');
      postComment.type = 'button';
      postComment.className = 'button button-primary';
      postComment.style.marginTop = '10px';
      postComment.textContent = 'Post comment';
      postComment.addEventListener('click', async () => {
        const comment = commentInput.value.trim();
        if (!comment) {
          toast('Enter a comment before posting.', true);
          return;
        }
        postComment.disabled = true;
        try {
          await api(`/admin/api/tickets/${item.id}/comments`, {
            method: 'POST',
            body: JSON.stringify({ comment })
          });
          toast(`Comment added to ${item.ticket_id}.`);
          await loadTickets();
        } catch (e) {
          toast(e.message, true);
        } finally {
          postComment.disabled = false;
          postComment.textContent = 'Post comment';
        }
      });
      card.appendChild(postComment);
      const save = document.createElement('button');
      save.type = 'button';
      save.className = 'button button-primary';
      save.style.marginTop = '14px';
      save.textContent = 'Save ticket update';
      save.addEventListener('click', async () => {
        if (status.value === 'Pending' && !pending.value.trim()) {
          toast('Enter a pending reason before saving.', true);
          return;
        }
        if (status.value === 'Closed' && !closure.value.trim()) {
          toast('Enter closure notes before closing the ticket.', true);
          return;
        }
        save.disabled = true;
        try {
          await api(`/admin/api/tickets/${item.id}`, {
            method: 'POST',
            body: JSON.stringify({
              status: status.value,
              progress_update: progress.value,
              pending_reason: pending.value,
              closure_notes: closure.value
            })
          });
          toast(`Ticket ${item.ticket_id} updated.`);
          await loadTickets();
        } catch (e) {
          toast(e.message, true);
        } finally {
          save.disabled = false;
          save.textContent = 'Save ticket update';
        }
      });
      card.appendChild(save);
      host.appendChild(card);
    });
  }

  async function loadTickets() {
    $('responses-container').textContent = 'Loading tickets...';
    try {
      const result = await api('/admin/api/submissions');
      submissionCache = result.submissions || [];
      renderTickets();
      $('responses-caption').textContent = `${result.count} ticket${result.count === 1 ? '' : 's'} received`;
    } catch (e) {
      $('responses-container').textContent = e.message;
    }
  }

  $('refresh-responses').addEventListener('click', loadTickets);
  $('response-search').addEventListener('input', renderTickets);
  $('logout-form').addEventListener('submit', e => {
    e.preventDefault();
    fetch('/admin/logout', { method: 'POST', headers: { 'X-CSRF-Token': csrf } })
      .then(() => { window.location.href = '/admin/login'; })
      .catch(() => { window.location.href = '/admin/login'; });
  });

  loadTickets();
})();

