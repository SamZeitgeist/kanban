/* ==========================================================
   pages.js — страницы вкладок сайдбара (рисуются в #page-view):
   #/dashboard, #/tasks, #/notifications, #/favorites, #/archive,
   #/team[/:отдел], #/departments, #/support.
   Данные — только через Store. Настройки/профиль — в profile.js.
   ========================================================== */
const Pages = (() => {
  const esc = (s) => UI.escapeHTML(s);
  // Ссылка на форму (Google Формы или Яндекс Формы) берётся из js/config.js (APP_CONFIG.SUPPORT_FORM_URL)
  const formUrl = () => (window.APP_CONFIG && window.APP_CONFIG.SUPPORT_FORM_URL) || '';
  const isGoogle = (u) => /^https:\/\/docs\.google\.com\/forms\/.+\/viewform/.test(u);
  const isYandex = (u) => /^https:\/\/forms\.yandex\.(ru|com)\//.test(u);
  const formOk = (u) => isGoogle(u) || isYandex(u);
  // «Родная» форма в стиле сайта → отправка в Google Форму (нужны entry-номера полей в config.js)
  const gFields = () => (window.APP_CONFIG && window.APP_CONFIG.SUPPORT_FORM_FIELDS) || {};
  const realEntry = (v) => /^entry\.\d+$/.test(v || '') && !/^entry\.0{6}/.test(v);   // заглушки entry.0000000001 не считаются
  const gNative = () => isGoogle(formUrl()) && realEntry(gFields().subject) && realEntry(gFields().message);
  const gAction = () => formUrl().replace(/\/viewform.*$/, '/formResponse');
  const embedUrl = (u) => u + (u.includes('?') ? '&' : '?') + (isGoogle(u) ? 'embedded=true' : 'iframe=1');
  const wsName = () => Store.WORKSPACES.find((w) => w.id === Store.getWorkspace()).name;
  const head = (title, sub = '', actions = '') => `
    <div class="view-head"><div><h1>${title}</h1>${sub ? `<p class="text-muted">${sub}</p>` : ''}</div>${actions ? `<div class="row row--wrap">${actions}</div>` : ''}</div>`;
  const empty = (icon, title, text, btn = '') => `
    <div class="empty-state"><div class="empty-state__icon">${icon}</div><h2>${title}</h2><p>${text}</p>${btn}</div>`;
  // Копирование: clipboard недоступен на file:// и без https — тогда сообщаем об этом
  const copyText = (text, ok) => (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
    .then(() => UI.toast(ok, 'success'), () => UI.toast('Не удалось скопировать — скопируйте вручную: ' + text, 'error', 6000));
  const wsBadge = () => `<span class="ws-pill" data-no-i18n>${esc(wsName())}</span>`;

  // Незавершённые задачи с просроченным или сегодняшним сроком (для бейджа и уведомлений)
  function alerts() {
    return Store.getTasks()
      .filter((t) => !t.done && ['overdue', 'today'].includes(UI.deadlineStatus(t.card.deadline)))
      .sort((a, b) => a.card.deadline.localeCompare(b.card.deadline));
  }

  const taskRow = (t) => {
    const st = UI.deadlineStatus(t.card.deadline);
    return `
      <a class="task-row" href="#/board/${encodeURIComponent(t.board.id)}/card/${encodeURIComponent(t.card.id)}">
        <i class="sb-dot" style="--hue:${BoardsPage.hueOf(t.board.id)}"></i>
        <span class="task-row__main"><b class="truncate" data-no-i18n>${esc(t.card.title)}</b>
          <small class="text-muted truncate" data-no-i18n>${esc(t.board.name)} · ${esc(t.column.name)}</small></span>
        ${t.card.deadline ? `<span class="deadline-badge ${st ? 'is-' + st : ''}">${UI.icons.clock}${UI.formatDate(t.card.deadline)}</span>` : ''}
      </a>`;
  };

  /* ---------- Дашборд ---------- */
  function dashboard(el) {
    const boards = Store.getBoards({ archived: false, workspace: true });
    const tasks = Store.getTasks();
    const done = tasks.filter((t) => t.done).length;
    const overdue = tasks.filter((t) => !t.done && UI.deadlineStatus(t.card.deadline) === 'overdue').length;
    const upcoming = tasks.filter((t) => !t.done && t.card.deadline).sort((a, b) => a.card.deadline.localeCompare(b.card.deadline)).slice(0, 6);
    const stat = (n, l, cls = '') => `<div class="stat ${cls}"><span class="stat__num">${n}</span><span class="stat__label">${l}</span></div>`;

    el.innerHTML = `<div class="view">
      ${head('Дашборд ' + wsBadge(), 'Сводка по пространству')}
      <div class="stats stats--4">
        ${stat(boards.length, UI.plural(boards.length, ['доска', 'доски', 'досок']))}
        ${stat(tasks.length - done, 'в работе')}
        ${stat(done, 'выполнено')}
        ${stat(overdue, 'просрочено', overdue ? 'stat--danger' : '')}
      </div>
      <div class="view-cols">
        <section class="view-card"><h2>Прогресс по доскам</h2>
          ${boards.length ? boards.map((b) => {
            const all = b.columns.reduce((s, c) => s + c.cards.filter((k) => !k.archived).length, 0);
            const d = b.columns.length ? b.columns[b.columns.length - 1].cards.filter((k) => !k.archived).length : 0;
            const pct = all ? Math.round(d / all * 100) : 0;
            return `<a class="progress-row" href="#/board/${encodeURIComponent(b.id)}"><span class="progress-row__top"><b class="truncate" data-no-i18n>${esc(b.name)}</b><small>${d}/${all} · ${pct}%</small></span>
              <span class="progress"><span style="width:${pct}%;background:hsl(${BoardsPage.hueOf(b.id)} 62% 56%)"></span></span></a>`;
          }).join('') : empty('🗂️', 'Нет досок', 'Создайте первую доску в этом пространстве.', '<button type="button" class="btn btn--primary" data-act="create">Создать доску</button>')}
        </section>
        <section class="view-card"><h2>Ближайшие сроки</h2>
          ${upcoming.length ? `<div class="task-list">${upcoming.map(taskRow).join('')}</div>` : '<p class="text-muted">Задач со сроком пока нет.</p>'}
        </section>
      </div>
      <section class="view-card"><h2>Последние события</h2>
        ${Store.getNotifications().slice(0, 5).map(notifRow).join('') || '<p class="text-muted">Событий пока нет.</p>'}
      </section>
    </div>`;
  }

  /* ---------- Мои задачи ---------- */
  let taskFilter = 'all', hideDone = true;
  const FILTERS = [['all', 'Все'], ['overdue', 'Просрочено'], ['today', 'Сегодня'], ['soon', 'Скоро'], ['none', 'Без срока']];

  function tasksPage(el) {
    const all = Store.getTasks().filter((t) => !hideDone || !t.done);
    const list = all.filter((t) => taskFilter === 'all' ? true
      : taskFilter === 'none' ? !t.card.deadline : UI.deadlineStatus(t.card.deadline) === taskFilter)
      .sort((a, b) => (a.card.deadline || '9999').localeCompare(b.card.deadline || '9999'));
    el.innerHTML = `<div class="view">
      ${head('Мои задачи ' + wsBadge(), `${list.length} ${UI.plural(list.length, ['задача', 'задачи', 'задач'])}`,
        `<label class="check-inline"><input type="checkbox" data-hide-done${hideDone ? ' checked' : ''}> Скрыть выполненные</label>`)}
      <div class="segmented segmented--wrap" role="group">${FILTERS.map(([v, t]) =>
        `<button type="button" class="seg-btn${taskFilter === v ? ' is-active' : ''}" data-filter="${v}">${t}</button>`).join('')}</div>
      <div class="view-card">${list.length ? `<div class="task-list">${list.map(taskRow).join('')}</div>`
        : empty('✅', 'Задач нет', 'Под выбранный фильтр ничего не подошло.')}</div>
    </div>`;
    el.querySelector('[data-hide-done]').onchange = (e) => { hideDone = e.target.checked; tasksPage(el); };
    el.querySelectorAll('[data-filter]').forEach((b) => { b.onclick = () => { taskFilter = b.dataset.filter; tasksPage(el); }; });
  }

  /* ---------- Уведомления ---------- */
  // UI грузится позже pages.js, поэтому иконки берём лениво
  const notifIcon = (type) => ({ board: UI.icons.boards, invite: UI.icons.userPlus, auth: UI.icons.users }[type] || UI.icons.bell);
  function notifRow(n) {
    return `<div class="notif${n.read ? '' : ' is-unread'}" data-notif="${esc(n.id)}">
      <span class="notif__icon">${notifIcon(n.type)}</span>
      <span class="notif__text" data-no-i18n>${esc(n.text)}</span><small class="text-muted">${UI.formatDateTime(n.date)}</small></div>`;
  }
  function notifications(el) {
    const a = alerts();
    const list = Store.getNotifications();
    el.innerHTML = `<div class="view">
      ${head('Уведомления', `${Store.unreadCount()} непрочитанных`,
        `<button type="button" class="btn" data-read-all>Прочитать все</button><button type="button" class="btn btn--danger" data-clear>Очистить</button>`)}
      ${a.length ? `<section class="view-card"><h2>Сроки</h2><div class="task-list">${a.map(taskRow).join('')}</div></section>` : ''}
      <section class="view-card"><h2>События</h2>${list.length ? list.map(notifRow).join('') : '<p class="text-muted">Событий пока нет.</p>'}</section>
    </div>`;
    el.querySelector('[data-read-all]').onclick = () => { Store.markNotifications(); notifications(el); };
    el.querySelector('[data-clear]').onclick = () => { Store.clearNotifications(); notifications(el); };
    el.querySelectorAll('[data-notif]').forEach((n) => { n.onclick = () => { Store.markNotifications(n.dataset.notif); notifications(el); }; });
  }

  /* ---------- Избранные и Архив ---------- */
  function boardTile(b, extra = '') {
    const n = b.columns.reduce((s, c) => s + c.cards.filter((k) => !k.archived).length, 0);
    return `<article class="board-card" style="--hue:${BoardsPage.hueOf(b.id)}">
      ${BoardsPage.previewHTML(b)}
      <div class="board-card__body">
        <h3 class="board-card__name truncate"><a class="board-card__link" href="#/board/${encodeURIComponent(b.id)}">${esc(b.name)}</a></h3>
        <p class="text-muted text-sm">${n} ${UI.plural(n, ['задача', 'задачи', 'задач'])}</p>
      </div>${extra}</article>`;
  }

  function favorites(el) {
    const list = Store.getBoards({ archived: false, workspace: true, favorite: true });
    el.innerHTML = `<div class="view">${head('Избранные доски ' + wsBadge(), 'Отмечайте доски звёздочкой в списке или меню доски')}
      ${list.length ? `<div class="boards-grid">${list.map((b) => boardTile(b,
        `<button type="button" class="btn btn--icon board-card__menu" data-unfav="${esc(b.id)}" aria-label="Убрать из избранного" title="Убрать из избранного">${UI.icons.starFill}</button>`)).join('')}</div>`
        : empty('⭐', 'Пока пусто', 'Нажмите звёздочку рядом с доской в боковом меню, чтобы закрепить её здесь.', '<a class="btn btn--primary" href="#/boards">К доскам</a>')}</div>`;
    el.querySelectorAll('[data-unfav]').forEach((b) => { b.onclick = () => { Store.toggleFavorite(b.dataset.unfav); App.refresh(); }; });
  }

  function archive(el) {
    const list = Store.getBoards({ archived: true, workspace: true });
    el.innerHTML = `<div class="view">${head('Архив ' + wsBadge(), 'Архивные доски скрыты из списков, но ничего не удалено')}
      ${list.length ? `<div class="boards-grid">${list.map((b) => boardTile(b,
        `<div class="archive-actions"><button type="button" class="btn btn--sm btn--primary" data-restore="${esc(b.id)}">${UI.icons.restore}Восстановить</button>
         <button type="button" class="btn btn--sm btn--danger" data-del="${esc(b.id)}">Удалить</button></div>`)).join('')}</div>`
        : empty('📦', 'Архив пуст', 'Архивируйте доску кнопкой в боковом меню или через меню доски.')}</div>`;
    el.querySelectorAll('[data-restore]').forEach((b) => { b.onclick = () => { Store.archiveBoard(b.dataset.restore, false); UI.toast('Доска восстановлена', 'success'); App.refresh(); }; });
    el.querySelectorAll('[data-del]').forEach((b) => {
      b.onclick = async () => {
        const board = Store.getBoard(b.dataset.del);
        const ok = await UI.confirmDialog({ title: 'Удалить доску навсегда?', text: `Доска «${board.name}» будет удалена без возможности восстановления.`, confirmText: 'Удалить', danger: true });
        if (ok) { Store.deleteBoard(board.id); UI.toast('Доска удалена'); App.refresh(); }
      };
    });
  }

  /* ---------- Команда ---------- */
  async function invite() {
    const depts = Store.getDepartments();
    const el = document.createElement('div');
    el.className = 'modal';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.innerHTML = `
      <div class="modal__header"><h3>Пригласить в «${esc(wsName())}»</h3></div>
      <form class="modal__form"><div class="modal__body">
        <div class="field"><label>Email<input class="input" name="email" type="email" required placeholder="name@example.com" autofocus></label></div>
        <div class="field"><label>Имя (необязательно)<input class="input" name="name" maxlength="60" placeholder="Анна"></label></div>
        ${depts.length ? `<div class="field"><label>Отдел<select class="select" name="dept"><option value="">Без отдела</option>${depts.map((d) => `<option value="${d.id}">${esc(d.name)}</option>`).join('')}</select></label></div>` : ''}
      </div><div class="modal__footer"><button type="button" class="btn" data-cancel>Отмена</button><button type="submit" class="btn btn--primary">Пригласить</button></div></form>`;
    const m = UI.openModal(el);
    el.querySelector('[data-cancel]').onclick = () => m.close();
    el.querySelector('form').onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target;
      const member = Store.inviteMember({ name: f.name.value, email: f.email.value, deptId: f.dept ? f.dept.value : null });
      m.close();
      if (!member) return;
      const link = location.origin + location.pathname + '#/invite/' + member.id;
      App.refresh();
      await copyText(link, 'Приглашение создано, ссылка скопирована');
    };
  }

  function team(el, [deptId]) {
    const depts = Store.getDepartments();
    const dept = depts.find((d) => d.id === deptId);
    const members = Store.getTeam().filter((m) => !deptId || m.deptId === deptId);
    el.innerHTML = `<div class="view">
      ${head((dept ? esc(dept.name) : 'Участники') + ' ' + wsBadge(), `${members.length} ${UI.plural(members.length, ['участник', 'участника', 'участников'])}`,
        '<button type="button" class="btn btn--primary" data-invite>' + UI.icons.userPlus + '<span>Пригласить</span></button>')}
      ${deptId && !dept ? empty('🧭', 'Отдел не найден', 'Возможно, он удалён.', '<a class="btn" href="#/departments">К отделам</a>') : `
      <div class="segmented segmented--wrap"><a class="seg-btn${!deptId ? ' is-active' : ''}" href="#/team">Все</a>${depts.map((d) =>
        `<a class="seg-btn${d.id === deptId ? ' is-active' : ''}" href="#/team/${d.id}" data-no-i18n>${esc(d.name)}</a>`).join('')}</div>
      <div class="view-card">${members.length ? members.map((m) => `
        <div class="member-line">
          ${UI.avatar(m, 36)}
          <span class="member-line__main"><b class="truncate" data-no-i18n>${esc(m.name)}${m.id === 'me' ? ' (вы)' : ''}</b><small class="text-muted truncate" data-no-i18n>${esc(m.email || m.role)}</small></span>
          <span class="status-pill status-pill--${m.status}">${m.status === 'invited' ? 'Приглашён' : 'Активен'}</span>
          ${m.id === 'me' ? '' : `
          <select class="select select--sm" data-dept="${m.id}" aria-label="Отдел"><option value="">Без отдела</option>${depts.map((d) => `<option value="${d.id}"${d.id === m.deptId ? ' selected' : ''}>${esc(d.name)}</option>`).join('')}</select>
          <button type="button" class="btn btn--icon btn--ghost" data-menu="${m.id}" aria-label="Действия" aria-haspopup="menu">${UI.icons.dots}</button>`}
        </div>`).join('') : '<p class="text-muted">В этом отделе пока никого нет.</p>'}</div>`}
    </div>`;
    el.querySelector('[data-invite]').onclick = invite;
    el.querySelectorAll('[data-dept]').forEach((s) => { s.onchange = () => { Store.updateMemberTeam(s.dataset.dept, { deptId: s.value || null }); team(el, [deptId]); }; });
    el.querySelectorAll('[data-menu]').forEach((b) => {
      b.onclick = () => {
        const m = Store.getTeam().find((x) => x.id === b.dataset.menu);
        UI.openMenu(b, [
          m.status === 'invited' ? { label: 'Отметить как присоединившегося', onClick: () => { Store.updateMemberTeam(m.id, { status: 'active' }); team(el, [deptId]); } } : null,
          { label: 'Копировать ссылку-приглашение', onClick: () => copyText(location.origin + location.pathname + '#/invite/' + m.id, 'Ссылка скопирована') },
          'sep',
          { label: m.status === 'invited' ? 'Отозвать приглашение' : 'Удалить из команды', danger: true, onClick: () => { Store.removeTeamMember(m.id); UI.toast('Участник удалён'); team(el, [deptId]); } }
        ].filter(Boolean));
      };
    });
  }

  /* ---------- Отделы ---------- */
  function departments(el) {
    const depts = Store.getDepartments();
    const members = Store.getTeam();
    el.innerHTML = `<div class="view">
      ${head('Отделы ' + wsBadge(), 'Группируйте участников по направлениям', '<button type="button" class="btn btn--primary" data-add>' + UI.icons.plus + '<span>Добавить отдел</span></button>')}
      ${depts.length ? `<div class="dept-grid">${depts.map((d) => {
        const list = members.filter((m) => m.deptId === d.id);
        return `<article class="view-card dept-card">
          <div class="row row--between"><h2 class="truncate" data-no-i18n>${esc(d.name)}</h2>
            <button type="button" class="btn btn--icon btn--ghost" data-dmenu="${d.id}" aria-label="Меню отдела" aria-haspopup="menu">${UI.icons.dots}</button></div>
          <div class="avatar-stack">${list.slice(0, 5).map((m) => UI.avatar(m, 28)).join('') || '<span class="text-muted text-sm">Нет участников</span>'}</div>
          <a class="btn btn--sm" href="#/team/${d.id}">${list.length} ${UI.plural(list.length, ['участник', 'участника', 'участников'])}</a>
        </article>`;
      }).join('')}</div>` : empty('🏢', 'Отделов пока нет', 'Добавьте первый отдел и распределите по нему участников.')}
    </div>`;
    el.querySelector('[data-add]').onclick = async () => {
      const name = await UI.promptDialog({ title: 'Новый отдел', label: 'Название', placeholder: 'Например, Поддержка', confirmText: 'Добавить' });
      if (name !== null) { Store.addDepartment(name); departments(el); }
    };
    el.querySelectorAll('[data-dmenu]').forEach((b) => {
      b.onclick = () => {
        const d = depts.find((x) => x.id === b.dataset.dmenu);
        UI.openMenu(b, [
          { label: 'Переименовать', onClick: async () => { const n = await UI.promptDialog({ title: 'Переименовать отдел', label: 'Название', value: d.name }); if (n !== null) { Store.renameDepartment(d.id, n); departments(el); } } },
          { label: 'Удалить', danger: true, onClick: async () => {
            const ok = await UI.confirmDialog({ title: 'Удалить отдел?', text: `Участники отдела «${d.name}» останутся в команде без отдела.`, confirmText: 'Удалить', danger: true });
            if (ok) { Store.deleteDepartment(d.id); departments(el); }
          } }
        ]);
      };
    });
  }

  /* ---------- Поддержка ---------- */
  const FAQ = [
    ['Как создать доску?', 'Нажмите «Создать доску» в боковом меню или на странице «Все доски», введите название — колонки To Do, In Progress, Review и Done появятся сразу.'],
    ['Как переключаться между пространствами?', 'В верхней части бокового меню выберите «Личное», «Работа» или «Фриланс». Доски, задачи, команда и отделы показываются для выбранного пространства; доску можно переместить через её меню.'],
    ['Как архивировать и восстановить доску?', 'Наведите курсор на доску в боковом меню и нажмите значок архива (или выберите «В архив» в меню доски). Восстановить её можно на странице «Архив».'],
    ['Где хранятся мои данные?', 'В браузере (localStorage). Сделайте экспорт в «Настройки → Данные», чтобы сохранить резервную копию или перенести данные на другое устройство.'],
    ['Как свернуть боковое меню?', 'Кнопка «‹» внизу меню сворачивает его в узкую полоску с иконками, «›» разворачивает обратно. Выбор запоминается.']
  ];
  function support(el) {
    el.innerHTML = `<div class="view">${head('Поддержка', 'Ответы на частые вопросы и связь с нами')}
      <section class="view-card"><h2>Частые вопросы</h2>
        ${FAQ.map(([q, a]) => `<details class="faq"><summary>${q}</summary><p class="text-muted">${a}</p></details>`).join('')}</section>
      <section class="view-card"><h2>Написать в поддержку</h2>
        ${gNative() ? `
          <form class="support-form" data-support>
            <div class="field"><label for="sp-subj">Тема</label><input class="input" id="sp-subj" maxlength="150" required placeholder="Коротко о проблеме"></div>
            <div class="field"><label for="sp-msg">Сообщение</label><textarea class="textarea" id="sp-msg" rows="5" maxlength="3000" required placeholder="Что произошло и что вы ожидали увидеть"></textarea></div>
            <div class="field"><label for="sp-mail">Email для ответа</label><input class="input" id="sp-mail" type="email" maxlength="150" required value="${esc(Store.getProfile().email)}" placeholder="name@example.com"></div>
            <div><button type="submit" class="btn btn--primary">Отправить</button></div>
          </form>`
        : formOk(formUrl())
          ? `<iframe class="support-frame" src="${esc(embedUrl(formUrl()))}" title="Форма обращения в поддержку" loading="lazy"></iframe>
             <p class="text-muted text-sm">Не открывается? <a href="${esc(formUrl())}" target="_blank" rel="noopener">Откройте форму в новой вкладке</a>.</p>`
          : formUrl() && !formUrl().includes('ВСТАВЬТЕ')
            ? `<p class="text-muted">Ссылка на форму не распознана: <code data-no-i18n>${esc(formUrl())}</code>. Для Google Формы нужна ссылка вида https://docs.google.com/forms/d/e/…/viewform, для Яндекс Формы — https://forms.yandex.ru/…</p>`
            : '<p class="text-muted">Форма обратной связи пока не подключена. Загляните в «Частые вопросы» выше.</p>'}
      </section>
    </div>`;

    const form = el.querySelector('[data-support]');
    if (form) form.onsubmit = async (e) => {
      e.preventDefault();
      const fld = gFields(), btn = form.querySelector('[type="submit"]');
      const body = new URLSearchParams();
      body.set(fld.subject, form.querySelector('#sp-subj').value);
      body.set(fld.message, form.querySelector('#sp-msg').value);
      if (realEntry(fld.email)) body.set(fld.email, form.querySelector('#sp-mail').value);
      body.set('fvv', '1'); body.set('pageHistory', '0');
      btn.disabled = true;
      try {
        // no-cors: ответ Google недоступен — об ошибке узнаём только при отсутствии сети
        await fetch(gAction(), { method: 'POST', mode: 'no-cors', body });
        form.reset();
        UI.toast('Сообщение отправлено, спасибо!', 'success');
      } catch (err) {
        UI.toast('Не удалось отправить, проверьте соединение', 'error');
      }
      btn.disabled = false;
    };
  }

  /* ---------- Маршрутизатор страниц ---------- */
  const VIEWS = { dashboard, tasks: tasksPage, notifications, favorites, archive, team, departments, support };
  function render(name, el, params = []) {
    VIEWS[name](el, params);
    // кнопки «Создать доску» внутри страниц
    el.querySelectorAll('[data-act="create"]').forEach((b) => { b.onclick = Sidebar.createBoard; });
  }

  return { render, alerts, invite };
})();
