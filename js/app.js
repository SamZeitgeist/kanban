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
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
  };

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

  return { icons, escapeHTML, avatar, parseDate, formatDate, formatDateTime, deadlineStatus,
           plural, toast, openModal, closeAllModals, hasModal, confirmDialog, promptDialog, openMenu };
})();

/* ---------- App: роутер и инициализация ---------- */
const App = (() => {
  const ROUTES = [
    { name: 'boards',  re: /^\/boards$/ },
    { name: 'board',   re: /^\/board\/([^/]+)$/ },
    { name: 'card',    re: /^\/board\/([^/]+)\/card\/([^/]+)$/ },
    { name: 'profile', re: /^\/profile$/ }
  ];
  const PAGES = ['page-boards', 'page-board', 'page-profile', 'page-not-found'];
  let renderedBoardId = null; // какая доска сейчас отрисована в #page-board
  let openCardId = null;      // какая карточка сейчас открыта в модалке

  const currentPath = () => location.hash.slice(1) || '/boards';
  const navigate = (path) => { location.hash = '#' + path; };

  function match(path) {
    for (const r of ROUTES) {
      const m = path.match(r.re);
      if (m) return { name: r.name, params: m.slice(1).map(decodeURIComponent) };
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
      case 'profile': {
        showPage('page-profile');
        const el = document.getElementById('page-profile');
        typeof ProfilePage !== 'undefined' ? ProfilePage.render(el) : renderStub(el, 'Профиль');
        break;
      }
      default:
        showPage('page-not-found');
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
    Store.onChange(() => { applySettings(); refreshHeader(); });
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
  }

  return { init, navigate, leaveCard, applySettings, refreshHeader };
})();

document.addEventListener('DOMContentLoaded', App.init);
