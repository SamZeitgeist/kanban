/* ==========================================================
   app.js — общие UI-помощники (UI), роутер и инициализация (App).
   Контракт страниц (реализуются в следующих шагах):
     BoardsPage.render(el)            — страница #/boards
     BoardPage.render(el, boardId)    — страница #/board/:id
     CardModal.open(boardId, cardId)  — модалка карточки
     ProfilePage.render(el)           — страница #/profile
   ========================================================== */

/* ---------- UI: общие помощники ---------- */
const UI = (() => {
  const modals = []; // стек открытых модалок

  const icons = {
    plus:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    dots:  '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    back:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    comment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a7.5 7.5 0 0 1-10.9 6.7L4 20l1.4-4.3A7.5 7.5 0 1 1 20 12z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    /* --- иконки сайдбара и новых страниц (контур, 24×24) --- */
    dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3.5" y="3.5" width="7" height="8" rx="1.8"/><rect x="13.5" y="3.5" width="7" height="5" rx="1.8"/><rect x="13.5" y="11.5" width="7" height="9" rx="1.8"/><rect x="3.5" y="14.5" width="7" height="6" rx="1.8"/></svg>',
    tasks:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3.5" width="16" height="17" rx="2.5"/><path d="M8.5 9.5l1.7 1.7 3-3.2M8.5 15.5h7"/></svg>',
    bell:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 1.5h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/></svg>',
    star:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3.6l2.5 5.3 5.7.7-4.2 4 1.1 5.7-5.1-2.8-5.1 2.8 1.1-5.7-4.2-4 5.7-.7z"/></svg>',
    starFill: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3.6l2.5 5.3 5.7.7-4.2 4 1.1 5.7-5.1-2.8-5.1 2.8 1.1-5.7-4.2-4 5.7-.7z"/></svg>',
    boards: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3.5" y="4" width="17" height="16" rx="2.5"/><path d="M9 4v16M15 4v16"/></svg>',
    archive:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4" width="17" height="4.5" rx="1.5"/><path d="M5 8.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5M10 12.5h4"/></svg>',
    restore:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.6-5.9M4 4v4.5h4.5"/></svg>',
    users:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8.5" r="3.3"/><path d="M2.8 19.5c.7-3.2 3.1-4.8 6.2-4.8s5.5 1.6 6.2 4.8M16 5.6a3.2 3.2 0 0 1 0 5.8M18 14.9c1.9.6 3.1 2.2 3.5 4.6"/></svg>',
    userPlus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="8.5" r="3.5"/><path d="M3.5 19.5c.8-3.3 3.3-5 6.5-5s5.7 1.7 6.5 5M19 8v6M16 11h6"/></svg>',
    depts:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3.5" width="6" height="5" rx="1.3"/><rect x="3" y="15.5" width="6" height="5" rx="1.3"/><rect x="15" y="15.5" width="6" height="5" rx="1.3"/><path d="M12 8.5v3.5M6 15.5V12h12v3.5"/></svg>',
    gear:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/></svg>',
    help:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.8"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.2 1-1.2 1.8M12 16.8v.1"/></svg>',
    chevL:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 6l-6 6 6 6"/></svg>',
    chevR:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 6l6 6-6 6"/></svg>',
    menu:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    google: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.68-.06-1.34-.17-1.97H12v3.73h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.89-1.74 2.99-4.3 2.99-7.28z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.61-2.43l-3.23-2.5c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.58A10 10 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.41 13.91a6 6 0 0 1 0-3.82V7.51H3.07a10 10 0 0 0 0 8.98z"/><path fill="#EA4335" d="M12 5.97c1.47 0 2.79.5 3.83 1.5l2.86-2.86C16.95 2.99 14.7 2 12 2A10 10 0 0 0 3.07 7.51l3.34 2.58C7.2 7.73 9.4 5.97 12 5.97z"/></svg>',
    github: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z"/></svg>'
  };

  // Бегущая строка: два одинаковых блока → keyframes сдвигает трек ровно на -50% (бесшовный цикл).
  // Пункты повторяются внутри блока, чтобы блок всегда был шире экрана.
  function ticker(items, label, extraClass = '') {
    const group = (hidden) => `<div class="kanban-ticker__group"${hidden ? ' aria-hidden="true"' : ''}>${[...items, ...items].map((t) => `<span>${escapeHTML(t)}</span>`).join('')}</div>`;
    return `<div class="kanban-ticker ${extraClass}" aria-label="${escapeHTML(label)}"><div class="kanban-ticker__track">${group(false)}${group(true)}</div></div>`;
  }

  const escapeHTML = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Аватар: person = { name, avatar, color }; avatar — data:URL, эмодзи или пусто (тогда первая буква)
  function avatar(person, size = 32, extraClass = '') {
    const p = person || {};
    let inner;
    if (p.avatar && String(p.avatar).startsWith('data:')) inner = `<img src="${escapeHTML(p.avatar)}" alt="">`;
    else if (p.avatar) inner = escapeHTML(p.avatar);
    else inner = escapeHTML((p.name || '?').trim().charAt(0).toUpperCase());
    const bg = p.color && !p.avatar ? `;background:${escapeHTML(p.color)};color:#fff` : '';
    return `<span class="avatar ${extraClass}" style="--size:${size}px${bg}" title="${escapeHTML(p.name || '')}">${inner}</span>`;
  }

  /* --- Даты --- */
  function parseDate(str) { // 'YYYY-MM-DD' → локальная дата (без сдвига часовых поясов)
    const [y, m, d] = String(str).split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  function formatDate(value) {
    const d = typeof value === 'number' ? new Date(value) : parseDate(value);
    return d.toLocaleDateString(I18n.locale(), { day: 'numeric', month: 'short' });
  }
  function formatDateTime(ts) {
    return new Date(ts).toLocaleString(I18n.locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
  // 'overdue' | 'today' | 'soon' (1–2 дня) | null
  function deadlineStatus(deadline) {
    if (!deadline) return null;
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const diff = Math.round((parseDate(deadline) - t) / 86400000);
    if (diff < 0) return 'overdue';
    if (diff === 0) return 'today';
    if (diff <= 2) return 'soon';
    return null;
  }

  // Склонение: plural(5, ['задача', 'задачи', 'задач']) → 'задач'
  function plural(n, forms) {
    const a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return forms[2];
    if (b > 1 && b < 5) return forms[1];
    return b === 1 ? forms[0] : forms[2];
  }

  /* --- Toast --- */
  function toast(message, type = '', ms = 2800) {
    const el = document.createElement('div');
    el.className = 'toast' + (type ? ' toast--' + type : '');
    el.textContent = message;
    document.getElementById('toasts').appendChild(el);
    setTimeout(() => {
      el.classList.add('is-leaving');
      setTimeout(() => el.remove(), 220);
    }, ms);
  }

  /* --- Модальные окна --- */
  // content — DOM-элемент (.modal). Закрытие: Esc, клик по затемнению, close().
  function openModal(content, { onClose, className = '' } = {}) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay ' + className;
    overlay.appendChild(content);
    const prevFocus = document.activeElement;
    const entry = { overlay, onClose, prevFocus };
    let downOnOverlay = false; // чтобы выделение текста с выходом за окно не закрывало модалку
    overlay.addEventListener('mousedown', (e) => { downOnOverlay = e.target === overlay; });
    overlay.addEventListener('click', (e) => { if (downOnOverlay && e.target === overlay) close(); });
    modals.push(entry);
    document.getElementById('modal-root').appendChild(overlay);
    const focusable = content.querySelector('[autofocus]') || content.querySelector('input, textarea, select, button');
    if (focusable) focusable.focus();

    function close(silent = false) {
      const i = modals.indexOf(entry);
      if (i === -1) return;
      modals.splice(i, 1);
      overlay.remove();
      if (prevFocus && prevFocus.focus) prevFocus.focus();
      if (!silent && onClose) onClose();
    }
    entry.close = close;
    return { el: overlay, close };
  }

  function closeAllModals(silent = false) {
    [...modals].reverse().forEach((m) => m.close(silent));
  }
  const hasModal = () => modals.length > 0;

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modals.length) modals[modals.length - 1].close();
  });

  // Базовая «рамка» диалога: заголовок, тело, кнопки
  function dialog({ title, bodyHTML, confirmText, danger }) {
    const el = document.createElement('div');
    el.className = 'modal';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.innerHTML = `
      <div class="modal__header"><h3>${escapeHTML(title)}</h3></div>
      <form class="modal__form">
        <div class="modal__body">${bodyHTML}</div>
        <div class="modal__footer">
          <button type="button" class="btn" data-cancel>Отмена</button>
          <button type="submit" class="btn ${danger ? 'btn--danger-solid' : 'btn--primary'}">${escapeHTML(confirmText)}</button>
        </div>
      </form>`;
    return el;
  }

  // Подтверждение → Promise<boolean>
  function confirmDialog({ title = 'Подтвердите действие', text = '', confirmText = 'Подтвердить', danger = false } = {}) {
    return new Promise((resolve) => {
      const el = dialog({ title, bodyHTML: `<p class="text-muted">${escapeHTML(text)}</p>`, confirmText, danger });
      let result = false;
      const m = openModal(el, { onClose: () => resolve(result) });
      el.querySelector('[data-cancel]').onclick = () => m.close();
      el.querySelector('form').onsubmit = (e) => { e.preventDefault(); result = true; m.close(); };
      el.querySelector('button[type=submit]').focus();
    });
  }

  // Ввод текста → Promise<string|null> (null — отмена)
  function promptDialog({ title = '', label = '', value = '', confirmText = 'Сохранить', placeholder = '', allowEmpty = false } = {}) {
    return new Promise((resolve) => {
      const bodyHTML = `<div class="field"><label>${escapeHTML(label)}<input class="input" name="v" maxlength="120" autocomplete="off" placeholder="${escapeHTML(placeholder)}" value="${escapeHTML(value)}" autofocus></label></div>`;
      const el = dialog({ title, bodyHTML, confirmText });
      let result = null;
      const m = openModal(el, { onClose: () => resolve(result) });
      const input = el.querySelector('input');
      input.select();
      el.querySelector('[data-cancel]').onclick = () => m.close();
      el.querySelector('form').onsubmit = (e) => {
        e.preventDefault();
        if (!allowEmpty && !input.value.trim()) { input.focus(); return; }
        result = input.value.trim();
        m.close();
      };
    });
  }

  /* --- Выпадающее меню у элемента ---
     items: [{ label, onClick, danger }, 'sep'] */
  let closeMenu = null;
  function openMenu(anchor, items) {
    if (closeMenu) closeMenu();
    const menu = document.createElement('div');
    menu.className = 'menu';
    menu.setAttribute('role', 'menu');
    items.forEach((it) => {
      if (it === 'sep') { menu.insertAdjacentHTML('beforeend', '<div class="menu__sep"></div>'); return; }
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'menuitem');
      b.className = 'menu__item' + (it.danger ? ' menu__item--danger' : '');
      b.textContent = it.label;
      b.onclick = () => { closeMenu(); it.onClick(); };
      menu.appendChild(b);
    });
    document.body.appendChild(menu);

    const r = anchor.getBoundingClientRect();
    const left = Math.min(r.left, window.innerWidth - menu.offsetWidth - 8);
    menu.style.left = Math.max(8, left) + window.scrollX + 'px';
    menu.style.top = r.bottom + 4 + window.scrollY + 'px';

    const onDown = (e) => { if (!menu.contains(e.target)) closeMenu(); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeMenu(); } };
    closeMenu = () => {
      menu.remove();
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', closeMenu);
      closeMenu = null;
    };
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', closeMenu);
  }

  return { icons, ticker, escapeHTML, avatar, parseDate, formatDate, formatDateTime, deadlineStatus,
           plural, toast, openModal, closeAllModals, hasModal, confirmDialog, promptDialog, openMenu };
})();

/* ---------- App: роутер и инициализация ---------- */
const App = (() => {
  const ROUTES = [
    { name: 'boards',  re: /^\/boards$/ },
    { name: 'board',   re: /^\/board\/([^/]+)$/ },
    { name: 'card',    re: /^\/board\/([^/]+)\/card\/([^/]+)$/ },
    { name: 'profile', re: /^\/profile$/ },
    { name: 'settings', re: /^\/settings$/ },
    // Страницы вкладок сайдбара (рисует pages.js в #page-view)
    { name: 'dashboard',     re: /^\/dashboard$/ },
    { name: 'tasks',         re: /^\/tasks$/ },
    { name: 'notifications', re: /^\/notifications$/ },
    { name: 'favorites',     re: /^\/favorites$/ },
    { name: 'archive',       re: /^\/archive$/ },
    { name: 'team',          re: /^\/team(?:\/([^/]+))?$/ },
    { name: 'departments',   re: /^\/departments$/ },
    { name: 'support',       re: /^\/support$/ },
    { name: 'invite',        re: /^\/invite\/([^/]+)$/ }   // ссылка-приглашение: принимает приглашение
  ];
  const VIEW_PAGES = new Set(['dashboard', 'tasks', 'notifications', 'favorites', 'archive', 'team', 'departments', 'support']);
  const PAGES = ['page-boards', 'page-board', 'page-profile', 'page-view', 'page-not-found'];
  let renderedBoardId = null; // какая доска сейчас отрисована в #page-board
  let openCardId = null;      // какая карточка сейчас открыта в модалке

  const currentPath = () => location.hash.slice(1) || '/boards';
  const navigate = (path) => { location.hash = '#' + path; };

  function match(path) {
    for (const r of ROUTES) {
      const m = path.match(r.re);
      if (m) return { name: r.name, params: m.slice(1).filter((x) => x !== undefined).map(decodeURIComponent) };
    }
    return { name: 'not-found', params: [] };
  }

  function showPage(id) {
    PAGES.forEach((p) => { document.getElementById(p).hidden = p !== id; });
    window.scrollTo(0, 0);
    document.getElementById('app').scrollTop = 0; // страницы скроллятся внутри окна приложения
  }

  // Пока модуль страницы ещё не написан — показываем заглушку
  function renderStub(el, text) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state__icon">🛠️</div><h2>${UI.escapeHTML(text)}</h2><p>Этот модуль будет добавлен на одном из следующих шагов.</p></div>`;
  }

  function handleRoute() {
    const { name, params } = match(currentPath());
    if (typeof Sidebar !== 'undefined') Sidebar.render(); // активный пункт + закрытие мобильного меню

    // Подсветка пункта меню
    document.querySelectorAll('[data-nav]').forEach((a) => {
      a.classList.toggle('is-active', a.dataset.nav === (name === 'card' ? 'boards' : name === 'board' ? 'boards' : name));
    });

    if (name !== 'card') { UI.closeAllModals(true); openCardId = null; }
    if (name !== 'board' && name !== 'card') renderedBoardId = null;

    switch (name) {
      case 'boards': {
        showPage('page-boards');
        const el = document.getElementById('page-boards');
        typeof BoardsPage !== 'undefined' ? BoardsPage.render(el) : renderStub(el, 'Страница досок');
        break;
      }
      case 'board':
      case 'card': {
        const boardId = params[0];
        if (!Store.getBoard(boardId)) { UI.toast('Доска не найдена', 'error'); navigate('/boards'); return; }
        showPage('page-board');
        const el = document.getElementById('page-board');
        // Не перерисовываем доску, если она уже открыта (например, при закрытии модалки карточки)
        if (renderedBoardId !== boardId || !el.childElementCount) {
          typeof BoardPage !== 'undefined' ? BoardPage.render(el, boardId) : renderStub(el, 'Страница доски');
          renderedBoardId = boardId;
        }
        if (name === 'card') openCard(boardId, params[1]);
        break;
      }
      case 'profile':
      case 'settings': {
        showPage('page-profile');
        const el = document.getElementById('page-profile');
        typeof ProfilePage !== 'undefined' ? ProfilePage.render(el, name) : renderStub(el, 'Профиль');
        break;
      }
      case 'invite': {
        const m = Store.getTeam().find((x) => x.id === params[0] && x.id !== 'me');
        if (m) { Store.updateMemberTeam(m.id, { status: 'active' }); UI.toast('Приглашение принято: ' + m.name, 'success'); }
        else UI.toast('Приглашение не найдено', 'error');
        navigate('/team');
        return;
      }
      default:
        if (VIEW_PAGES.has(name)) {
          showPage('page-view');
          Pages.render(name, document.getElementById('page-view'), params);
        } else showPage('page-not-found');
    }
  }

  function openCard(boardId, cardId) {
    if (openCardId === cardId && UI.hasModal()) return;
    if (!Store.getCard(boardId, cardId)) { UI.toast('Карточка не найдена', 'error'); navigate('/board/' + boardId); return; }
    openCardId = cardId;
    if (typeof CardModal !== 'undefined') CardModal.open(boardId, cardId);
    else { UI.toast('Модалка карточки появится на шаге 5'); navigate('/board/' + boardId); }
  }

  // Вызывается модалкой карточки при закрытии: возвращаемся на страницу доски
  function leaveCard(boardId) {
    openCardId = null;
    if (match(currentPath()).name === 'card') navigate('/board/' + boardId);
  }

  /* --- Настройки профиля → оформление --- */
  function applySettings() {
    const s = Store.getProfile().settings;
    const root = document.documentElement;
    root.dataset.theme = s.theme === 'dark' ? 'dark' : 'light';
    root.dataset.font = ['small', 'medium', 'large'].includes(s.fontSize) ? s.fontSize : 'medium';
    I18n.setLang(s.language); // перевод интерфейса (i18n.js)
  }

  function refreshHeader() {
    const p = Store.getProfile();
    document.getElementById('header-profile').innerHTML = UI.avatar({ name: p.name, avatar: p.avatar }, 32);
  }

  function init() {
    Store.setErrorHandler((msg) => UI.toast(msg, 'error', 5000));
    Store.loadState();
    applySettings();
    refreshHeader();
    Store.onChange(() => { applySettings(); refreshHeader(); Sidebar.render(); });
    Sidebar.init();
    Auth.finishFromUrl(); // возврат из OAuth (Google / GitHub), если он был
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
  }

  // Перерисовать текущую страницу (после смены workspace, архивации и т.п.); доску не трогаем
  function refresh() {
    const n = match(currentPath()).name;
    if (n !== 'board' && n !== 'card') handleRoute();
  }

  return { init, navigate, refresh, leaveCard, applySettings, refreshHeader };
})();

document.addEventListener('DOMContentLoaded', App.init);
