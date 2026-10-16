/* ==========================================================
   boards.js — страница #/boards: сетка досок, поиск, создание,
   меню (переименовать / дублировать / удалить).
   Данные берём только из Store (storage.js).
   ========================================================== */
const BoardsPage = (() => {
  let query = '';

  const countCards = (board) =>
    board.columns.reduce((sum, c) => sum + c.cards.filter((k) => !k.archived).length, 0);

  // Оттенок превью зависит от id доски — у каждой доски свой цвет
  const hueOf = (id) => [...id].reduce((s, ch) => s + ch.charCodeAt(0), 0) % 360;

  // Мини-схема колонок: до 5 колонок, в каждой до 4 «карточек»
  function previewHTML(board) {
    const cols = board.columns.slice(0, 5).map((c) => {
      const n = Math.min(c.cards.filter((k) => !k.archived).length, 4);
      return `<div class="mini-col"><i class="mini-col__title"></i>${'<i class="mini-card"></i>'.repeat(n)}</div>`;
    }).join('');
    return `<div class="board-preview" style="--hue:${hueOf(board.id)}" aria-hidden="true">${cols}</div>`;
  }

  function cardHTML(board) {
    const n = countCards(board);
    const name = UI.escapeHTML(board.name);
    return `
      <article class="board-card" style="--hue:${hueOf(board.id)}">
        ${board.favorite ? `<span class="board-card__star" title="В избранном">${UI.icons.starFill}</span>` : ''}
        ${previewHTML(board)}
        <div class="board-card__body">
          <h3 class="board-card__name truncate"><a class="board-card__link" href="#/board/${encodeURIComponent(board.id)}">${name}</a></h3>
          <p class="text-muted text-sm">${n} ${UI.plural(n, ['задача', 'задачи', 'задач'])}, создана ${UI.formatDate(board.createdAt)}</p>
        </div>
        <button type="button" class="btn btn--icon board-card__menu" data-menu="${UI.escapeHTML(board.id)}"
                aria-label="Меню доски «${name}»" aria-haspopup="menu">${UI.icons.dots}</button>
      </article>`;
  }

  function newTileHTML() {
    return `<button type="button" class="board-new" data-create>${UI.icons.plus}<span>Создать доску</span></button>`;
  }

  /* ---------- Отрисовка ---------- */
  function render(el) {
    query = '';
    el.innerHTML = `
      <div class="boards">
        <section class="boards-hero" aria-label="Как работает канбан">
          <div class="boards-hero__copy">
            <span class="eyebrow">ПЛАНИРУЙТЕ · ДЕЛАЙТЕ · ЗАВЕРШАЙТЕ</span>
            <h1>Все задачи — на своих местах</h1>
            <p>Создайте доску для проекта, добавляйте задачи в карточки и перемещайте их по этапам. Так вы всегда видите, что уже сделано и что делать дальше.</p>
            <div class="boards-hero__steps"><span><b>01</b> Создайте доску</span><span><b>02</b> Добавьте карточки</span><span><b>03</b> Двигайте по этапам</span></div>
          </div>
          <img class="boards-hero__art" src="assets/kanban-illustration.svg" alt="Иллюстрация канбан-доски с карточками задач">
        </section>
        ${UI.ticker(['✦ Разбейте большую цель на маленькие задачи', '↗ Ограничивайте задачи в работе', '✓ Отмечайте завершённое', '◷ Следите за сроками'], 'Принципы канбан')}
        <div class="boards-head">
          <div>
            <h2>Мои доски</h2>
            <p class="text-muted" data-summary></p>
          </div>
          <div class="boards-tools">
            <input type="search" class="input boards-search" placeholder="Поиск по названию" aria-label="Поиск досок по названию" title="Введите часть названия, чтобы быстро найти нужную доску">
            <button type="button" class="btn btn--primary" data-create>${UI.icons.plus}<span>Создать доску</span></button>
          </div>
        </div>
        <div class="boards-grid" data-grid></div>
      </div>`;

    const wrap = el.querySelector('.boards');
    const grid = wrap.querySelector('[data-grid]');
    const summary = wrap.querySelector('[data-summary]');

    function renderGrid() {
      const all = Store.getBoards({ archived: false, workspace: true });
      const q = query.trim().toLowerCase();
      const list = q ? all.filter((b) => b.name.toLowerCase().includes(q)) : all;

      const cards = all.reduce((s, b) => s + countCards(b), 0);
      summary.textContent = all.length
        ? `${all.length} ${UI.plural(all.length, ['доска', 'доски', 'досок'])}, ${cards} ${UI.plural(cards, ['задача', 'задачи', 'задач'])}`
        : 'Пока нет ни одной доски';

      if (!all.length) {
        grid.innerHTML = `
          <div class="empty-state boards-empty">
            <div class="empty-state__icon">🗂️</div>
            <h2>Создайте первую доску</h2>
            <p>Доска — это набор колонок и карточек. Начните с пустой: колонки To Do, In Progress, Review и Done появятся сразу.</p>
            <button type="button" class="btn btn--primary" data-create>${UI.icons.plus}<span>Создать доску</span></button>
          </div>`;
        return;
      }
      if (!list.length) {
        grid.innerHTML = `<div class="empty-state boards-empty"><div class="empty-state__icon">🔍</div><h2>Ничего не найдено</h2><p>Нет досок с названием «${UI.escapeHTML(query.trim())}». Попробуйте другое слово.</p></div>`;
        return;
      }
      grid.innerHTML = list.map(cardHTML).join('') + (q ? '' : newTileHTML());
    }

    /* ---------- Действия ---------- */
    async function createBoard() {
      const name = await UI.promptDialog({ title: 'Новая доска', label: 'Название', placeholder: 'Например, Запуск сайта', confirmText: 'Создать' });
      if (name === null) return;
      const board = Store.createBoard(name);
      UI.toast('Доска создана', 'success');
      App.navigate('/board/' + board.id);
    }

    async function renameBoard(board) {
      const name = await UI.promptDialog({ title: 'Переименовать доску', label: 'Название', value: board.name });
      if (name === null || name === board.name) return;
      Store.renameBoard(board.id, name);
      UI.toast('Доска переименована', 'success');
      renderGrid();
    }

    function duplicateBoard(board) {
      Store.duplicateBoard(board.id);
      UI.toast('Доска продублирована', 'success');
      renderGrid();
    }

    async function deleteBoard(board) {
      const n = countCards(board);
      const ok = await UI.confirmDialog({
        title: 'Удалить доску?',
        text: `Доска «${board.name}» и все её задачи (${n}) будут удалены. Это действие нельзя отменить.`,
        confirmText: 'Удалить', danger: true
      });
      if (!ok) return;
      Store.deleteBoard(board.id);
      UI.toast('Доска удалена');
      renderGrid();
    }

    /* ---------- События (делегирование) ---------- */
    wrap.addEventListener('click', (e) => {
      if (e.target.closest('[data-create]')) { createBoard(); return; }
      const menuBtn = e.target.closest('[data-menu]');
      if (!menuBtn) return;
      const board = Store.getBoard(menuBtn.dataset.menu);
      if (!board) return;
      UI.openMenu(menuBtn, [
        { label: 'Переименовать', onClick: () => renameBoard(board) },
        { label: 'Дублировать', onClick: () => duplicateBoard(board) },
        { label: board.favorite ? 'Убрать из избранного' : 'В избранное', onClick: () => { Store.toggleFavorite(board.id); renderGrid(); } },
        ...Store.WORKSPACES.filter((w) => w.id !== board.workspace).map((w) => ({
          label: 'Переместить в «' + w.name + '»',
          onClick: () => { Store.moveBoardToWorkspace(board.id, w.id); UI.toast('Доска перемещена: ' + w.name, 'success'); renderGrid(); }
        })),
        { label: 'В архив', onClick: () => { Store.archiveBoard(board.id); UI.toast('Доска отправлена в архив'); renderGrid(); } },
        'sep',
        { label: 'Удалить', danger: true, onClick: () => deleteBoard(board) }
      ]);
    });

    wrap.querySelector('.boards-search').addEventListener('input', (e) => {
      query = e.target.value;
      renderGrid();
    });

    renderGrid();
  }

  return { render, hueOf, previewHTML };
})();
