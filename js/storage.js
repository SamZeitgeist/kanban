/* ==========================================================
   storage.js — слой данных. Единственное место, где трогаем localStorage.
   Состояние живёт в памяти (кэш), saveState() сохраняет его целиком.
   Переход на API: оставьте кэш, а в saveState() и loadState() замените
   localStorage на fetch (см. комментарии TODO и README).
   Позиции карточек/колонок задаются через beforeId: «вставить перед
   элементом beforeId, а если null — в конец».
   ========================================================== */
const Store = (() => {
  const KEY = 'kanban_state';
  const VERSION = 1;
  const DEFAULT_COLUMNS = ['To Do', 'In Progress', 'Review', 'Done'];
  const COLORS = ['#4f5bd5', '#16a085', '#e67e22', '#d6336c', '#2f9bd8', '#8e5bd5'];
  const listeners = new Set();
  let state = null;
  let errorHandler = () => {};

  /* ---------- Утилиты ---------- */
  const uid = () => (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID()
    : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  const now = () => Date.now();
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const systemTheme = () => (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';

  function defaultState() {
    return {
      version: VERSION,
      profile: { name: 'Пользователь', email: '', bio: '', avatar: null,
                 settings: { theme: systemTheme(), fontSize: 'medium', language: 'ru' } },
      boards: []
    };
  }

  // Приводим данные к актуальной структуре (миграции версий — здесь)
  function normalize(raw) {
    const base = defaultState();
    if (!raw || typeof raw !== 'object') return base;
    const p = raw.profile || {};
    const s = {
      version: VERSION,
      profile: { ...base.profile, ...p, settings: { ...base.profile.settings, ...(p.settings || {}) } },
      boards: Array.isArray(raw.boards) ? raw.boards : []
    };
    s.boards.forEach((b) => {
      b.members = b.members || [];
      b.columns = b.columns || [];
      b.columns.forEach((c) => {
        c.cards = c.cards || [];
        c.cards.forEach((k) => {
          k.labels = k.labels || [];
          k.checklist = k.checklist || [];
          k.comments = k.comments || [];
          k.archived = !!k.archived;
        });
      });
    });
    return s;
  }

  /* ---------- Загрузка / сохранение ---------- */
  function loadState() {
    try {
      // TODO: заменить на fetch('/api/state') (или отдельные GET /api/boards, /api/profile)
      state = normalize(JSON.parse(localStorage.getItem(KEY) || 'null'));
    } catch (e) {
      errorHandler('Не удалось прочитать сохранённые данные — создано пустое состояние');
      state = defaultState();
    }
    return state;
  }

  function saveState() {
    try {
      // TODO: заменить на fetch('/api/state', { method: 'PUT', body: JSON.stringify(state) })
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      errorHandler('Не удалось сохранить данные: хранилище браузера переполнено');
      return false;
    }
    listeners.forEach((fn) => fn(state));
    return true;
  }

  function resetState() {
    // TODO: заменить на fetch('/api/state', { method: 'DELETE' })
    state = defaultState();
    saveState();
  }

  /* ---------- Экспорт / импорт ---------- */
  function exportJSON() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'kanban-export-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // Заменяет все данные содержимым файла. Возвращает Promise.
  function importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
      reader.onload = () => {
        try {
          const raw = JSON.parse(reader.result);
          if (!raw || !Array.isArray(raw.boards)) throw new Error('В файле нет списка досок (boards)');
          // TODO: заменить на fetch('/api/import', { method: 'POST', body: reader.result })
          state = normalize(raw);
          saveState();
          resolve(state);
        } catch (e) {
          reject(new Error('Неверный файл: ' + e.message));
        }
      };
      reader.readAsText(file);
    });
  }

  /* ---------- Поиск внутри состояния ---------- */
  const findBoard = (id) => state.boards.find((b) => b.id === id) || null;
  const findColumn = (b, id) => b.columns.find((c) => c.id === id) || null;
  function locate(b, cardId) {
    for (const column of b.columns) {
      const index = column.cards.findIndex((c) => c.id === cardId);
      if (index > -1) return { column, index, card: column.cards[index] };
    }
    return null;
  }
  // Вставляет item в массив перед элементом beforeId (или в конец)
  function insertBefore(arr, item, beforeId) {
    const i = beforeId ? arr.findIndex((x) => x.id === beforeId) : -1;
    if (i === -1) arr.push(item); else arr.splice(i, 0, item);
  }

  /* ---------- Профиль ---------- */
  const getProfile = () => state.profile;
  function updateProfile(patch) {
    // TODO: заменить на fetch('/api/profile', { method: 'PATCH', ... })
    const { settings, ...rest } = patch;
    Object.assign(state.profile, rest);
    if (settings) Object.assign(state.profile.settings, settings);
    saveState();
    return state.profile;
  }

  /* ---------- Доски ---------- */
  const getBoards = () => state.boards;
  const getBoard = (id) => findBoard(id);

  function createBoard(name) {
    // TODO: заменить на fetch('/api/boards', { method: 'POST', ... })
    const board = {
      id: uid(), name: (name || '').trim() || I18n.t('Новая доска'), createdAt: now(), members: [],
      columns: DEFAULT_COLUMNS.map((n) => ({ id: uid(), name: n, wipLimit: null, cards: [] }))
    };
    state.boards.push(board);
    saveState();
    return board;
  }

  function renameBoard(id, name) {
    // TODO: заменить на fetch('/api/boards/' + id, { method: 'PATCH', ... })
    const b = findBoard(id);
    if (!b || !name.trim()) return null;
    b.name = name.trim();
    saveState();
    return b;
  }

  function deleteBoard(id) {
    // TODO: заменить на fetch('/api/boards/' + id, { method: 'DELETE' })
    const i = state.boards.findIndex((b) => b.id === id);
    if (i === -1) return false;
    state.boards.splice(i, 1);
    saveState();
    return true;
  }

  function duplicateBoard(id) {
    // TODO: заменить на fetch('/api/boards/' + id + '/duplicate', { method: 'POST' })
    const src = findBoard(id);
    if (!src) return null;
    const copy = clone(src);
    const memberMap = {};
    copy.id = uid();
    copy.name = src.name + ' ' + I18n.t('(копия)');
    copy.createdAt = now();
    copy.members.forEach((m) => { const nid = uid(); memberMap[m.id] = nid; m.id = nid; });
    copy.columns.forEach((c) => {
      c.id = uid();
      c.cards.forEach((k) => { k.id = uid(); k.assigneeId = memberMap[k.assigneeId] || null; });
    });
    state.boards.push(copy);
    saveState();
    return copy;
  }

  /* ---------- Участники доски ---------- */
  function addMember(boardId, { name, avatar }) {
    // TODO: заменить на fetch('/api/boards/' + boardId + '/members', { method: 'POST', ... })
    const b = findBoard(boardId);
    if (!b || !name.trim()) return null;
    const member = { id: uid(), name: name.trim(), avatar: avatar || null, color: COLORS[b.members.length % COLORS.length] };
    b.members.push(member);
    saveState();
    return member;
  }

  function updateMember(boardId, memberId, patch) {
    const b = findBoard(boardId);
    const m = b && b.members.find((x) => x.id === memberId);
    if (!m) return null;
    ['name', 'avatar', 'color'].forEach((k) => { if (k in patch) m[k] = patch[k]; });
    saveState();
    return m;
  }

  function removeMember(boardId, memberId) {
    const b = findBoard(boardId);
    if (!b) return false;
    b.members = b.members.filter((m) => m.id !== memberId);
    b.columns.forEach((c) => c.cards.forEach((k) => { if (k.assigneeId === memberId) k.assigneeId = null; }));
    saveState();
    return true;
  }

  /* ---------- Колонки ---------- */
  function createColumn(boardId, name) {
    // TODO: заменить на fetch('/api/boards/' + boardId + '/columns', { method: 'POST', ... })
    const b = findBoard(boardId);
    if (!b) return null;
    const column = { id: uid(), name: (name || '').trim() || I18n.t('Новая колонка'), wipLimit: null, cards: [] };
    b.columns.push(column);
    saveState();
    return column;
  }

  function updateColumn(boardId, columnId, patch) {
    // patch: { name?, wipLimit? } — wipLimit: число или null (без лимита)
    const b = findBoard(boardId);
    const c = b && findColumn(b, columnId);
    if (!c) return null;
    if (typeof patch.name === 'string' && patch.name.trim()) c.name = patch.name.trim();
    if ('wipLimit' in patch) c.wipLimit = patch.wipLimit > 0 ? Math.floor(patch.wipLimit) : null;
    saveState();
    return c;
  }

  function deleteColumn(boardId, columnId) {
    const b = findBoard(boardId);
    if (!b) return false;
    b.columns = b.columns.filter((c) => c.id !== columnId);
    saveState();
    return true;
  }

  function moveColumn(boardId, columnId, beforeColumnId) {
    // TODO: заменить на fetch('/api/columns/' + columnId + '/move', { method: 'POST', ... })
    const b = findBoard(boardId);
    const c = b && findColumn(b, columnId);
    if (!c || columnId === beforeColumnId) return false;
    b.columns = b.columns.filter((x) => x.id !== columnId);
    insertBefore(b.columns, c, beforeColumnId);
    saveState();
    return true;
  }

  /* ---------- Карточки ---------- */
  function createCard(boardId, columnId, title) {
    // TODO: заменить на fetch('/api/columns/' + columnId + '/cards', { method: 'POST', ... })
    const b = findBoard(boardId);
    const col = b && findColumn(b, columnId);
    if (!col) return null;
    const t = now();
    const card = {
      id: uid(), title: (title || '').trim() || I18n.t('Новая карточка'), description: '', assigneeId: null,
      deadline: null, labels: [], checklist: [], comments: [], createdAt: t, updatedAt: t, archived: false
    };
    col.cards.push(card);
    saveState();
    return card;
  }

  // Возвращает { card, column } или null
  function getCard(boardId, cardId) {
    const b = findBoard(boardId);
    const loc = b && locate(b, cardId);
    return loc ? { card: loc.card, column: loc.column } : null;
  }

  const CARD_FIELDS = ['title', 'description', 'assigneeId', 'deadline', 'labels', 'checklist', 'archived'];
  function updateCard(boardId, cardId, patch) {
    // TODO: заменить на fetch('/api/cards/' + cardId, { method: 'PATCH', body: JSON.stringify(patch) })
    const b = findBoard(boardId);
    const loc = b && locate(b, cardId);
    if (!loc) return null;
    CARD_FIELDS.forEach((k) => { if (k in patch) loc.card[k] = patch[k]; });
    loc.card.updatedAt = now();
    saveState();
    return loc.card;
  }

  function archiveCard(boardId, cardId, archived = true) {
    return updateCard(boardId, cardId, { archived });
  }

  function deleteCard(boardId, cardId) {
    // TODO: заменить на fetch('/api/cards/' + cardId, { method: 'DELETE' })
    const b = findBoard(boardId);
    const loc = b && locate(b, cardId);
    if (!loc) return false;
    loc.column.cards.splice(loc.index, 1);
    saveState();
    return true;
  }

  // Перенос карточки в колонку toColumnId перед карточкой beforeCardId (null — в конец)
  function moveCard(boardId, cardId, toColumnId, beforeCardId) {
    // TODO: заменить на fetch('/api/cards/' + cardId + '/move', { method: 'POST', body: JSON.stringify({ toColumnId, beforeCardId }) })
    const b = findBoard(boardId);
    const loc = b && locate(b, cardId);
    const target = b && findColumn(b, toColumnId);
    if (!loc || !target || cardId === beforeCardId) return false;
    loc.column.cards.splice(loc.index, 1);
    insertBefore(target.cards, loc.card, beforeCardId);
    loc.card.updatedAt = now();
    saveState();
    return true;
  }

  function addComment(boardId, cardId, text) {
    // TODO: заменить на fetch('/api/cards/' + cardId + '/comments', { method: 'POST', ... })
    const b = findBoard(boardId);
    const loc = b && locate(b, cardId);
    if (!loc || !text.trim()) return null;
    const comment = { author: state.profile.name, text: text.trim(), date: now() };
    loc.card.comments.push(comment);
    loc.card.updatedAt = now();
    saveState();
    return comment;
  }

  /* ---------- Статистика для профиля ---------- */
  // «Выполнено» = карточки в последней колонке доски (по умолчанию Done)
  function getStats() {
    const s = { boards: state.boards.length, cards: 0, done: 0, archived: 0 };
    state.boards.forEach((b) => b.columns.forEach((c, i) => c.cards.forEach((k) => {
      if (k.archived) { s.archived++; return; }
      s.cards++;
      if (i === b.columns.length - 1) s.done++;
    })));
    return s;
  }

  /* ---------- Подписка на изменения ---------- */
  function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  function setErrorHandler(fn) { errorHandler = fn; }

  return {
    loadState, saveState, resetState, exportJSON, importJSON, onChange, setErrorHandler,
    getProfile, updateProfile,
    getBoards, getBoard, createBoard, renameBoard, deleteBoard, duplicateBoard,
    addMember, updateMember, removeMember,
    createColumn, updateColumn, deleteColumn, moveColumn,
    createCard, getCard, updateCard, archiveCard, deleteCard, moveCard, addComment,
    getStats
  };
})();
