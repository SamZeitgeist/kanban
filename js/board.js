/* ==========================================================
   board.js — страница #/board/:id: колонки, карточки, участники,
   фильтры и drag-and-drop (нативный HTML5 DnD API).
   Все изменения идут через Store; страница перерисовывается
   по событию Store.onChange.
   ========================================================== */

// Общая утилита (используется и в profile.js): файл-картинка → квадратный JPEG 128×128 (data:URL).
// Уменьшаем, чтобы не переполнить localStorage.
function fileToAvatar(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Это не изображение'));
      img.onload = () => {
        const s = 128, c = document.createElement('canvas');
        c.width = c.height = s;
        const k = Math.max(s / img.width, s / img.height);
        c.getContext('2d').drawImage(img, (s - img.width * k) / 2, (s - img.height * k) / 2, img.width * k, img.height * k);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

const BoardPage = (() => {
  let root = null, boardId = null, unsub = null;
  let head, columnsEl, scrollEl;               // DOM-узлы текущей отрисовки
  let filters = { q: '', assignee: '', label: '', deadline: '' };
  let composingIn = null;                      // id колонки, где открыт ввод новой карточки
  let landed = null;                           // id только что перенесённой карточки (для анимации)
  let drag = null, placeholder = null;         // состояние drag-and-drop

  const esc = (s) => UI.escapeHTML(s); // UI определяется в app.js (грузится последним), поэтому вызываем лениво
  const board = () => Store.getBoard(boardId);
  const visibleCards = (col) => col.cards.filter((k) => !k.archived);

  /* ---------- Фильтры ---------- */
  const filtersActive = () => Object.values(filters).some(Boolean);

  function matches(card) {
    const f = filters;
    if (f.q && !card.title.toLowerCase().includes(f.q.toLowerCase())) return false;
    if (f.assignee === 'none' && card.assigneeId) return false;
    if (f.assignee && f.assignee !== 'none' && card.assigneeId !== f.assignee) return false;
    if (f.label && !card.labels.some((l) => l.text === f.label)) return false;
    if (f.deadline === 'none') return !card.deadline;
    if (f.deadline && UI.deadlineStatus(card.deadline) !== f.deadline) return false;
    return true;
  }

  /* ---------- Разметка ---------- */
  function cardHTML(card, b) {
    const member = b.members.find((m) => m.id === card.assigneeId);
    const status = UI.deadlineStatus(card.deadline);
    const done = card.checklist.filter((i) => i.done).length;
    const labels = card.labels.map((l) => `<span class="chip" style="--c:${esc(l.color)}">${esc(l.text)}</span>`).join('');
    const deadline = card.deadline
      ? `<span class="deadline-badge ${status ? 'is-' + status : ''}">${UI.icons.clock}${UI.formatDate(card.deadline)}</span>` : '';
    const stats = [
      card.checklist.length ? `<span class="card__stat ${done === card.checklist.length ? 'is-done' : ''}">${UI.icons.check}${done}/${card.checklist.length}</span>` : '',
      card.comments.length ? `<span class="card__stat">${UI.icons.comment}${card.comments.length}</span>` : ''
    ].join('');
    return `
      <article class="card${landed === card.id ? ' card--landed' : ''}" draggable="true" data-id="${esc(card.id)}" tabindex="0">
        ${labels || deadline ? `<div class="card__top"><div class="card__labels">${labels}</div>${deadline}</div>` : ''}
        <a class="card__title" draggable="false" href="#/board/${encodeURIComponent(b.id)}/card/${encodeURIComponent(card.id)}">${esc(card.title)}</a>
        ${card.description ? `<p class="card__desc">${esc(card.description)}</p>` : ''}
        ${stats || member ? `<div class="card__meta">${stats}${member ? `<span class="card__assignee">${UI.avatar(member, 24)}</span>` : ''}</div>` : ''}
      </article>`;
  }

  function columnHTML(col, b) {
    const all = visibleCards(col);
    const wip = col.wipLimit;
    const cls = wip && all.length > wip ? ' is-over-limit' : '';
    const full = wip && all.length >= wip ? 'true' : 'false';
    const composer = composingIn === col.id
      ? `<form class="composer"><textarea class="textarea" rows="2" placeholder="Название карточки" aria-label="Название новой карточки"></textarea>
           <div class="row"><button type="submit" class="btn btn--primary btn--sm">Добавить</button>
           <button type="button" class="btn btn--ghost btn--sm" data-cancel-compose>Отмена</button></div></form>`
      : `<button type="button" class="column__add" data-add-card="${esc(col.id)}">${UI.icons.plus}<span>Карточка</span></button>`;
    return `
      <section class="column${cls}" data-id="${esc(col.id)}" data-full="${full}">
        <header class="column__header" draggable="true">
          <h3 class="column__name truncate">${esc(col.name)}</h3>
          <span class="column__count" title="${wip ? 'Лимит карточек: ' + wip : ''}">${all.length}${wip ? '/' + wip : ''}</span>
          <button type="button" class="btn btn--ghost btn--icon" data-add-card="${esc(col.id)}" aria-label="Добавить карточку">${UI.icons.plus}</button>
          <button type="button" class="btn btn--ghost btn--icon" data-col-menu="${esc(col.id)}" aria-label="Меню колонки «${esc(col.name)}»" aria-haspopup="menu">${UI.icons.dots}</button>
        </header>
        <div class="column__cards">${all.filter(matches).map((k) => cardHTML(k, b)).join('')}</div>
        <div class="column__footer">${composer}</div>
      </section>`;
  }

  function renderColumns() {
    const b = board();
    if (!b) return;
    const left = scrollEl.scrollLeft;
    const tops = {};
    columnsEl.querySelectorAll('.column').forEach((c) => { tops[c.dataset.id] = c.querySelector('.column__cards').scrollTop; });
    columnsEl.innerHTML = b.columns.map((c) => columnHTML(c, b)).join('') +
      `<button type="button" class="board-add-column" data-add-column>${UI.icons.plus}<span>Колонка</span></button>`;
    scrollEl.scrollLeft = left;
    columnsEl.querySelectorAll('.column').forEach((c) => { c.querySelector('.column__cards').scrollTop = tops[c.dataset.id] || 0; });
    const ta = columnsEl.querySelector('.composer textarea');
    if (ta) ta.focus();
    landed = null;
  }

  /* ---------- Шапка ---------- */
  function setOptions(select, options, value) {
    select.innerHTML = options.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('');
    select.value = options.some(([v]) => v === value) ? value : '';
  }

  function updateHeader() {
    const b = board();
    head.querySelector('[data-rename]').textContent = b.name;

    const shown = b.members.slice(0, 5).map((m) => UI.avatar(m, 28)).join('');
    head.querySelector('[data-members]').innerHTML =
      `<span class="avatar-stack">${shown}${b.members.length > 5 ? `<span class="avatar" style="--size:28px">+${b.members.length - 5}</span>` : ''}</span>
       <span class="board-members__label">${b.members.length ? 'Участники' : 'Добавить участников'}</span>`;

    const labels = new Map();
    b.columns.forEach((c) => c.cards.forEach((k) => k.labels.forEach((l) => labels.set(l.text, l))));
    const f = (name) => head.querySelector(`[data-f="${name}"]`);
    setOptions(f('assignee'), [['', 'Все исполнители'], ['none', 'Без исполнителя'], ...b.members.map((m) => [m.id, m.name])], filters.assignee);
    setOptions(f('label'), [['', 'Все метки'], ...[...labels.keys()].map((t) => [t, t])], filters.label);
    setOptions(f('deadline'), [['', 'Любой срок'], ['overdue', 'Просрочены'], ['today', 'Сегодня'], ['soon', 'Скоро'], ['none', 'Без срока']], filters.deadline);
    filters.assignee = f('assignee').value; filters.label = f('label').value; filters.deadline = f('deadline').value;
    head.querySelector('[data-reset]').hidden = !filtersActive();
  }

  /* ---------- Участники ---------- */
  function openMembersModal() {
    const el = document.createElement('div');
    el.className = 'modal';
    el.innerHTML = `
      <div class="modal__header"><h3>Участники доски</h3><button type="button" class="btn btn--ghost btn--icon" data-close aria-label="Закрыть">${UI.icons.close}</button></div>
      <div class="modal__body">
        <div class="member-list" data-list></div>
        <form class="member-form" data-form>
          <div class="field"><label>Имя<input class="input" name="name" maxlength="40" required autocomplete="off"></label></div>
          <div class="row row--wrap">
            <div class="field"><label>Эмодзи<input class="input member-form__emoji" name="emoji" maxlength="8" placeholder="🙂"></label></div>
            <div class="field"><label>или картинка<input class="input" type="file" name="file" accept="image/*"></label></div>
          </div>
          <button type="submit" class="btn btn--primary">Добавить участника</button>
        </form>
      </div>`;
    const modal = UI.openModal(el);
    const list = el.querySelector('[data-list]');

    const draw = () => {
      const b = board();
      list.innerHTML = b.members.length
        ? b.members.map((m) => `<div class="member-row">${UI.avatar(m, 32)}<span class="truncate">${esc(m.name)}</span>
            <button type="button" class="btn btn--ghost btn--sm btn--danger" data-remove="${esc(m.id)}">Удалить</button></div>`).join('')
        : '<p class="text-muted text-sm">Пока никого нет. Добавьте первого участника ниже.</p>';
    };
    draw();

    el.querySelector('[data-close]').onclick = () => modal.close();
    list.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-remove]');
      if (!btn) return;
      Store.removeMember(boardId, btn.dataset.remove);
      UI.toast('Участник удалён');
      draw();
    });
    el.querySelector('[data-form]').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      let avatar = form.emoji.value.trim() || null;
      try {
        if (form.file.files[0]) avatar = await fileToAvatar(form.file.files[0]);
      } catch (err) { UI.toast(err.message, 'error'); return; }
      Store.addMember(boardId, { name: form.name.value, avatar });
      UI.toast('Участник добавлен', 'success');
      form.reset();
      form.name.focus();
      draw();
    });
  }

  /* ---------- Действия с колонками ---------- */
  async function addColumn() {
    const name = await UI.promptDialog({ title: 'Новая колонка', label: 'Название', confirmText: 'Создать' });
    if (name !== null) { Store.createColumn(boardId, name); UI.toast('Колонка создана', 'success'); }
  }

  function openColumnMenu(btn) {
    const col = board().columns.find((c) => c.id === btn.dataset.colMenu);
    if (!col) return;
    UI.openMenu(btn, [
      { label: 'Переименовать', onClick: async () => {
          const name = await UI.promptDialog({ title: 'Переименовать колонку', label: 'Название', value: col.name });
          if (name !== null) Store.updateColumn(boardId, col.id, { name });
      } },
      { label: 'Лимит карточек (WIP)', onClick: async () => {
          const v = await UI.promptDialog({ title: 'Лимит карточек', label: 'Максимум карточек (пусто или 0 — без лимита)', value: col.wipLimit || '1', confirmText: 'Сохранить', allowEmpty: true });
          if (v !== null) Store.updateColumn(boardId, col.id, { wipLimit: parseInt(v, 10) || null });
      } },
      'sep',
      { label: 'Удалить колонку', danger: true, onClick: async () => {
          const n = visibleCards(col).length;
          const ok = await UI.confirmDialog({
            title: 'Удалить колонку?', confirmText: 'Удалить', danger: true,
            text: n ? `Колонка «${col.name}» и её карточки (${n}) будут удалены.` : `Колонка «${col.name}» будет удалена.`
          });
          if (ok) { Store.deleteColumn(boardId, col.id); UI.toast('Колонка удалена'); }
      } }
    ]);
  }

  /* ---------- Drag-and-drop ---------- */
  const getPlaceholder = () => placeholder || (placeholder = Object.assign(document.createElement('div'), { className: 'card-placeholder' }));

  function endDrag() {
    if (drag) drag.el.classList.remove('is-dragging');
    columnsEl.querySelectorAll('.is-over').forEach((c) => c.classList.remove('is-over'));
    if (placeholder) placeholder.remove();
    drag = null;
  }

  function autoScroll(e) {
    const r = scrollEl.getBoundingClientRect();
    if (e.clientX < r.left + 60) scrollEl.scrollLeft -= 16;
    else if (e.clientX > r.right - 60) scrollEl.scrollLeft += 16;
  }

  function bindDnD() {
    columnsEl.addEventListener('dragstart', (e) => {
      const card = e.target.closest('.card');
      const header = e.target.closest('.column__header');
      if (card) drag = { type: 'card', id: card.dataset.id, el: card };
      else if (header) { const col = header.closest('.column'); drag = { type: 'column', id: col.dataset.id, el: col }; }
      else return;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', drag.id); // нужно для Firefox
      if (card) getPlaceholder().style.setProperty('--h', card.offsetHeight + 'px');
      const el = drag.el;
      requestAnimationFrame(() => { if (drag) el.classList.add('is-dragging'); }); // после снимка «призрака»
    });

    columnsEl.addEventListener('dragover', (e) => {
      if (!drag) return;
      autoScroll(e);
      if (drag.type === 'column') {
        e.preventDefault();
        const after = [...columnsEl.querySelectorAll('.column:not(.is-dragging)')].find((c) => {
          const r = c.getBoundingClientRect();
          return e.clientX < r.left + r.width / 2;
        });
        columnsEl.insertBefore(drag.el, after || columnsEl.querySelector('.board-add-column'));
        return;
      }
      const col = e.target.closest('.column');
      if (!col) return;
      const list = col.querySelector('.column__cards');
      if (col.dataset.full === 'true' && !list.contains(drag.el)) return; // лимит WIP: бросить нельзя
      e.preventDefault();
      columnsEl.querySelectorAll('.column.is-over').forEach((c) => { if (c !== col) c.classList.remove('is-over'); });
      col.classList.add('is-over');
      const after = [...list.querySelectorAll('.card:not(.is-dragging)')].find((c) => {
        const r = c.getBoundingClientRect();
        return e.clientY < r.top + r.height / 2;
      });
      const p = getPlaceholder();
      if (after) { if (p.nextElementSibling !== after) list.insertBefore(p, after); }
      else if (list.lastElementChild !== p) list.appendChild(p);
    });

    columnsEl.addEventListener('dragleave', (e) => {
      if (drag && drag.type === 'card' && !columnsEl.contains(e.relatedTarget)) {
        if (placeholder) placeholder.remove();
        columnsEl.querySelectorAll('.is-over').forEach((c) => c.classList.remove('is-over'));
      }
    });

    columnsEl.addEventListener('drop', (e) => {
      if (!drag) return;
      e.preventDefault();
      const d = drag;
      if (d.type === 'column') {
        const next = d.el.nextElementSibling;
        endDrag();
        Store.moveColumn(boardId, d.id, next && next.classList.contains('column') ? next.dataset.id : null);
        return;
      }
      const col = e.target.closest('.column');
      if (!col || !placeholder || !placeholder.parentNode) { endDrag(); return; }
      let next = placeholder.nextElementSibling;
      while (next && next.classList.contains('is-dragging')) next = next.nextElementSibling;
      const beforeId = next && next.classList.contains('card') ? next.dataset.id : null;
      landed = d.id;
      endDrag();
      Store.moveCard(boardId, d.id, col.dataset.id, beforeId); // сохраняется сразу → onChange → перерисовка
    });

    // Если перетаскивание отменили (Esc / бросили мимо) — возвращаем исходное состояние
    columnsEl.addEventListener('dragend', () => {
      const wasColumn = drag && drag.type === 'column';
      endDrag();
      if (wasColumn) renderColumns();
    });
  }

  /* ---------- Остальные события ---------- */
  function bindEvents() {
    columnsEl.addEventListener('click', (e) => {
      const add = e.target.closest('[data-add-card]');
      if (add) { composingIn = add.dataset.addCard; renderColumns(); return; }
      if (e.target.closest('[data-cancel-compose]')) { composingIn = null; renderColumns(); return; }
      if (e.target.closest('[data-add-column]')) { addColumn(); return; }
      const menu = e.target.closest('[data-col-menu]');
      if (menu) { openColumnMenu(menu); return; }
      const card = e.target.closest('.card');
      if (card) { e.preventDefault(); App.navigate(`/board/${boardId}/card/${card.dataset.id}`); }
    });

    columnsEl.addEventListener('keydown', (e) => {
      if (e.target.matches('.composer textarea')) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.target.form.requestSubmit(); }
        if (e.key === 'Escape') { e.stopPropagation(); composingIn = null; renderColumns(); }
      } else if (e.key === 'Enter' && e.target.matches('.card')) {
        App.navigate(`/board/${boardId}/card/${e.target.dataset.id}`);
      }
    });

    columnsEl.addEventListener('submit', (e) => {
      e.preventDefault();
      const ta = e.target.querySelector('textarea');
      if (!ta.value.trim()) { ta.focus(); return; }
      const colId = e.target.closest('.column').dataset.id;
      composingIn = colId; // оставляем поле открытым — можно сразу вводить следующую карточку
      Store.createCard(boardId, colId, ta.value);
    });

    head.addEventListener('click', async (e) => {
      if (e.target.closest('[data-members]')) { openMembersModal(); return; }
      if (e.target.closest('[data-reset]')) {
        filters = { q: '', assignee: '', label: '', deadline: '' };
        head.querySelector('[data-f="q"]').value = '';
        updateHeader(); renderColumns();
        return;
      }
      if (e.target.closest('[data-rename]')) {
        const name = await UI.promptDialog({ title: 'Переименовать доску', label: 'Название', value: board().name });
        if (name !== null) Store.renameBoard(boardId, name);
      }
    });

    head.addEventListener('input', (e) => {
      const key = e.target.dataset.f;
      if (!key) return;
      filters[key] = e.target.value;
      head.querySelector('[data-reset]').hidden = !filtersActive();
      renderColumns();
    });
  }

  /* ---------- Публичный метод ---------- */
  function render(el, id) {
    root = el; boardId = id;
    filters = { q: '', assignee: '', label: '', deadline: '' };
    composingIn = null; drag = null; placeholder = null;
    el.innerHTML = `
      <div class="board-head">
        <div class="board-head__top">
          <a class="btn btn--ghost btn--icon" href="#/boards" aria-label="К списку досок">${UI.icons.back}</a>
          <button type="button" class="board-title" data-rename title="Переименовать доску"></button>
          <button type="button" class="board-members" data-members></button>
        </div>
        <div class="board-filters">
          <input type="search" class="input" data-f="q" placeholder="Поиск по карточкам" aria-label="Поиск по названию карточки">
          <select class="select" data-f="assignee" aria-label="Фильтр по исполнителю"></select>
          <select class="select" data-f="label" aria-label="Фильтр по метке"></select>
          <select class="select" data-f="deadline" aria-label="Фильтр по дедлайну"></select>
          <button type="button" class="btn btn--ghost btn--sm" data-reset hidden>Сбросить</button>
        </div>
      </div>
      <div class="board-scroll" data-scroll><div class="board-columns" data-columns></div></div>`;
    head = el.querySelector('.board-head');
    scrollEl = el.querySelector('[data-scroll]');
    columnsEl = el.querySelector('[data-columns]');
    bindEvents();
    bindDnD();
    updateHeader();
    renderColumns();

    if (unsub) unsub();
    unsub = Store.onChange(() => {
      if (!root || root.hidden || !board()) return; // страница скрыта или доску удалили
      updateHeader();
      renderColumns();
    });
  }

  return { render };
})();
