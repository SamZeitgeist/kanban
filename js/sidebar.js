/* ==========================================================
   sidebar.js — боковая панель: профиль + workspace, навигация,
   «Мои доски» (избранные, все, архив), команда, подвал.
   Режимы: развёрнутая (264px) / узкая полоска с иконками (64px) /
   выезжающее меню на телефоне (≤760px, кнопка #sb-open в шапке).
   Каждая вкладка — отдельный hash-маршрут (см. ROUTES в app.js),
   страницы рисует pages.js.
   ========================================================== */
const Sidebar = (() => {
  let root = null;
  const MQ = window.matchMedia('(max-width: 760px)');
  const esc = (s) => UI.escapeHTML(s);
  const path = () => location.hash.slice(1) || '/boards';
  const is = (re) => re.test(path());

  /* ---------- Разметка ---------- */
  const item = (href, icon, label, { active, count, badge, cls = '' } = {}) => `
    <a class="sb-item ${cls}${active ? ' is-active' : ''}" href="${href}" title="${esc(label)}"${active ? ' aria-current="page"' : ''}>
      <span class="sb-item__icon">${icon}</span><span class="sb-label">${esc(label)}</span>
      ${badge ? `<span class="sb-badge">${badge}</span>` : count !== undefined ? `<span class="sb-count">${count}</span>` : ''}
    </a>`;

  const action = (act, icon, label, cls = '') => `
    <button type="button" class="sb-item ${cls}" data-act="${act}" title="${esc(label)}">
      <span class="sb-item__icon">${icon}</span><span class="sb-label">${esc(label)}</span>
    </button>`;

  function boardItem(b) {
    const active = is(new RegExp('^/board/' + encodeURIComponent(b.id).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(/|$)'));
    const fav = b.favorite;
    return `
      <div class="sb-board${active ? ' is-active' : ''}">
        <a class="sb-board__link" href="#/board/${encodeURIComponent(b.id)}" title="${esc(b.name)}"${active ? ' aria-current="page"' : ''}>
          <i class="sb-dot" style="--hue:${BoardsPage.hueOf(b.id)}"></i><span class="sb-label truncate" data-no-i18n>${esc(b.name)}</span>
        </a>
        <button type="button" class="sb-ico${fav ? ' is-on' : ''}" data-act="fav" data-id="${esc(b.id)}" aria-label="${fav ? 'Убрать из избранного' : 'В избранное'}" title="${fav ? 'Убрать из избранного' : 'В избранное'}">${fav ? UI.icons.starFill : UI.icons.star}</button>
        <button type="button" class="sb-ico" data-act="archive" data-id="${esc(b.id)}" aria-label="В архив" title="В архив">${UI.icons.archive}</button>
      </div>`;
  }

  function render() {
    if (!root) return;
    const ui = Store.getUi();
    const mobile = MQ.matches;
    const collapsed = !!ui.sidebarCollapsed && !mobile;
    root.classList.toggle('is-collapsed', collapsed);

    const sc = root.querySelector('.sb-scroll');
    const scrollTop = sc ? sc.scrollTop : 0;
    const f = document.activeElement;
    const key = (el) => el.getAttribute('href') || (el.dataset.act ? el.dataset.act + '|' + (el.dataset.id || '') : '');
    const focusKey = f && root.contains(f) ? key(f) : null;

    const p = Store.getProfile();
    const ws = Store.getWorkspace();
    const wsName = Store.WORKSPACES.find((w) => w.id === ws).name;
    const boards = Store.getBoards({ archived: false, workspace: true });
    const favs = boards.filter((b) => b.favorite);
    const archivedN = Store.getBoards({ archived: true, workspace: true }).length;
    const openTasks = Store.getTasks().filter((t) => !t.done).length;
    const alerts = typeof Pages !== 'undefined' ? Pages.alerts().length : 0;
    const unread = Store.unreadCount() + alerts;
    const team = Store.getTeam();
    const depts = Store.getDepartments();

    root.innerHTML = `
      <div class="sb-top">
        <a class="sb-profile${is(/^\/profile$/) ? ' is-active' : ''}" href="#/profile" title="Профиль">
          ${UI.avatar({ name: p.name, avatar: p.avatar }, 36)}
          <span class="sb-profile__text"><b class="truncate" data-no-i18n>${esc(p.name)}</b><small class="truncate">${p.email ? esc(p.email) : 'Мой профиль'}</small></span>
        </a>
        <a class="sb-ico sb-gear${is(/^\/settings$/) ? ' is-on' : ''}" href="#/settings" aria-label="Настройки" title="Настройки">${UI.icons.gear}</a>
        <button type="button" class="sb-ico sb-close" data-act="close" aria-label="Закрыть меню" title="Закрыть меню">${UI.icons.close}</button>
      </div>

      ${collapsed
        ? `<button type="button" class="sb-ws-mini" data-act="ws-next" title="Пространство: ${esc(wsName)} (нажмите, чтобы переключить)" aria-label="Пространство: ${esc(wsName)}"><span data-no-i18n>${esc(wsName.charAt(0))}</span></button>`
        : `<div class="sb-ws" role="group" aria-label="Пространство">${Store.WORKSPACES.map((w) =>
            `<button type="button" class="sb-ws__btn${w.id === ws ? ' is-active' : ''}" data-act="ws" data-id="${w.id}" aria-pressed="${w.id === ws}">${w.name}</button>`).join('')}</div>`}

      <div class="sb-scroll">
        <nav class="sb-group" aria-label="Разделы">
          ${item('#/dashboard', UI.icons.dashboard, 'Дашборд', { active: is(/^\/dashboard$/) })}
          ${item('#/tasks', UI.icons.tasks, 'Мои задачи', { active: is(/^\/tasks$/), count: openTasks })}
          ${item('#/notifications', UI.icons.bell, 'Уведомления', { active: is(/^\/notifications$/), badge: unread || '' })}
        </nav>

        <div class="sb-group">
          <div class="sb-title"><span class="sb-label">Мои доски</span></div>
          ${item('#/favorites', UI.icons.star, 'Избранные', { active: is(/^\/favorites$/), count: favs.length })}
          ${favs.length ? `<div class="sb-sub">${favs.map(boardItem).join('')}</div>` : ''}
          ${item('#/boards', UI.icons.boards, 'Все доски', { active: is(/^\/boards$/), count: boards.length })}
          <div class="sb-sub">${boards.length ? boards.map(boardItem).join('') : '<p class="sb-empty sb-label">В этом пространстве пока нет досок</p>'}</div>
          ${action('create', UI.icons.plus, 'Создать доску', 'sb-item--accent')}
          ${item('#/archive', UI.icons.archive, 'Архив', { active: is(/^\/archive$/), count: archivedN })}
        </div>

        <div class="sb-group">
          <div class="sb-title"><span class="sb-label">Команда</span></div>
          <a class="sb-item${is(/^\/team$/) ? ' is-active' : ''}" href="#/team" title="Участники"${is(/^\/team$/) ? ' aria-current="page"' : ''}>
            <span class="sb-item__icon">${UI.icons.users}</span><span class="sb-label">Участники</span>
            <span class="sb-stack">${team.slice(0, 3).map((m) => UI.avatar(m, 20)).join('')}</span><span class="sb-count">${team.length}</span>
          </a>
          ${action('invite', UI.icons.userPlus, 'Пригласить', 'sb-item--accent')}
          ${item('#/departments', UI.icons.depts, 'Отделы', { active: is(/^\/departments$/), count: depts.length })}
          ${depts.length ? `<div class="sb-sub">${depts.map((d) => {
            const n = team.filter((m) => m.deptId === d.id).length;
            const act = is(new RegExp('^/team/' + d.id + '$'));
            return `<a class="sb-board${act ? ' is-active' : ''}" href="#/team/${d.id}" title="${esc(d.name)}"><span class="sb-board__link"><i class="sb-dot sb-dot--sq"></i><span class="sb-label truncate" data-no-i18n>${esc(d.name)}</span><span class="sb-count">${n}</span></span></a>`;
          }).join('')}</div>` : ''}
        </div>
      </div>

      <div class="sb-foot">
        ${item('#/settings', UI.icons.gear, 'Настройки', { active: is(/^\/settings$/) })}
        ${item('#/support', UI.icons.help, 'Поддержка', { active: is(/^\/support$/) })}
        <button type="button" class="sb-item sb-collapse" data-act="collapse" title="${collapsed ? 'Развернуть' : 'Свернуть'}" aria-label="${collapsed ? 'Развернуть меню' : 'Свернуть меню'}" aria-expanded="${!collapsed}">
          <span class="sb-item__icon">${collapsed ? UI.icons.chevR : UI.icons.chevL}</span><span class="sb-label">Свернуть</span>
        </button>
      </div>`;

    const newSc = root.querySelector('.sb-scroll');
    if (newSc) newSc.scrollTop = scrollTop;
    if (focusKey) {
      const n = [...root.querySelectorAll('a, button')].find((x) => key(x) === focusKey);
      if (n) n.focus({ preventScroll: true });
    }
  }

  /* ---------- Действия ---------- */
  async function createBoard() {
    const name = await UI.promptDialog({ title: 'Новая доска', label: 'Название', placeholder: 'Например, Запуск сайта', confirmText: 'Создать' });
    if (name === null) return;
    const board = Store.createBoard(name);
    UI.toast('Доска создана', 'success');
    App.navigate('/board/' + board.id);
  }

  function closeDrawer() { document.body.classList.remove('sb-open'); }

  function onClick(e) {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const id = b.dataset.id;
    switch (b.dataset.act) {
      case 'ws': case 'ws-next': {
        const list = Store.WORKSPACES;
        const next = b.dataset.act === 'ws' ? id : list[(list.findIndex((w) => w.id === Store.getWorkspace()) + 1) % list.length].id;
        Store.setWorkspace(next);
        is(/^\/board\//) ? App.navigate('/boards') : App.refresh();
        break;
      }
      case 'fav': {
        const board = Store.toggleFavorite(id);
        UI.toast(board && board.favorite ? 'Добавлено в избранное' : 'Убрано из избранного');
        App.refresh();
        break;
      }
      case 'archive': {
        Store.archiveBoard(id);
        UI.toast('Доска отправлена в архив — восстановить можно в разделе «Архив»');
        is(new RegExp('^/board/' + encodeURIComponent(id))) ? App.navigate('/boards') : App.refresh();
        break;
      }
      case 'create': closeDrawer(); createBoard(); break;
      case 'invite': closeDrawer(); Pages.invite(); break;
      case 'collapse': Store.setUi({ sidebarCollapsed: !Store.getUi().sidebarCollapsed }); break;
      case 'close': closeDrawer(); break;
    }
  }

  function init() {
    root = document.getElementById('sidebar');
    root.addEventListener('click', onClick);
    document.getElementById('sb-open').addEventListener('click', () => document.body.classList.add('sb-open'));
    document.getElementById('sb-backdrop').addEventListener('click', closeDrawer);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
    window.addEventListener('hashchange', closeDrawer);
    MQ.addEventListener('change', () => { closeDrawer(); render(); });
    render();
  }

  return { init, render, createBoard };
})();
