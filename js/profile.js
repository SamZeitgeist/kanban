/* ==========================================================
   profile.js — страница #/profile: аватар, данные профиля, настройки,
   статистика, экспорт / импорт / очистка данных.
   Тема, язык и размер шрифта применяются сразу: Store.updateProfile →
   Store.onChange → App.applySettings (см. app.js).
   Загрузка аватара использует fileToAvatar() из board.js (FileReader →
   base64, уменьшение до 128 px, чтобы не переполнить localStorage).
   ========================================================== */
/* ==========================================================
   OAuth-вход: хуки handleGoogleLogin / handleGithubLogin.
   Заполните clientId в AUTH_CONFIG (создаются в Google Cloud Console / GitHub → Developer settings).
   redirectUri должен быть добавлен в разрешённые адреса приложения; с file:// OAuth не работает.
   Google: implicit flow (токен возвращается в #hash, профиль берём из userinfo).
   GitHub: нужен ваш бэкенд (tokenProxy): POST {code} → JSON { login, name, email }.
   ========================================================== */
const AUTH_CONFIG = {
  redirectUri: location.origin + location.pathname,
  google: { clientId: '61136605238-51vf8b7bkr9qhmhbguimkk2omeji21ec.apps.googleusercontent.com' },
  github: { clientId: 'Ov23li0D4ThQNTVwcXBk', tokenProxy: 'https://kanban-oauth.vs1565733.workers.dev' }
};
const AUTH_NAMES = { google: 'Google', github: 'GitHub' };

const Auth = (() => {
  const KEY = 'kanban_oauth_state';

  function begin(provider) {
    const cfg = AUTH_CONFIG[provider];
    if (!cfg.clientId) { UI.toast(`Укажите AUTH_CONFIG.${provider}.clientId в js/profile.js`, 'error', 6000); return; }
    if (location.protocol === 'file:') { UI.toast('OAuth не работает с file:// — запустите сайт через http (например, Live Server)', 'error', 6000); return; }
    const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(KEY, provider + ':' + state);
    const google = provider === 'google';
    const params = google
      ? { client_id: cfg.clientId, redirect_uri: AUTH_CONFIG.redirectUri, response_type: 'token', scope: 'openid email profile', state, prompt: 'select_account' }
      : { client_id: cfg.clientId, redirect_uri: AUTH_CONFIG.redirectUri, scope: 'read:user user:email', state };
    location.href = (google ? 'https://accounts.google.com/o/oauth2/v2/auth?' : 'https://github.com/login/oauth/authorize?') + new URLSearchParams(params);
  }

  function connect(provider, info) {
    const p = Store.getProfile();
    Store.updateProfile({
      name: p.name === 'Пользователь' && info.name ? info.name : p.name,
      email: p.email || info.email || '',
      auth: { provider, login: info.email || info.login || info.name || '', at: Date.now() }
    });
    Store.notify('Вход через ' + AUTH_NAMES[provider] + ': ' + (info.email || info.login || ''), 'auth');
    UI.toast('Вы вошли через ' + AUTH_NAMES[provider], 'success');
  }

  function logout() {
    if (typeof Cloud !== 'undefined') Cloud.logout();
    Store.updateProfile({ auth: null });
    UI.toast('Вы вышли из аккаунта');
  }

  // Вызывается при старте ДО роутера: забираем параметры из URL и сразу чистим адрес
  function finishFromUrl() {
    const hash = new URLSearchParams(location.hash.replace(/^#\/?/, ''));
    const query = new URLSearchParams(location.search);
    const token = hash.get('access_token'), code = query.get('code');
    if (!token && !code) return;
    const state = hash.get('state') || query.get('state');
    const [provider, saved] = (sessionStorage.getItem(KEY) || ':').split(':');
    sessionStorage.removeItem(KEY);
    history.replaceState(null, '', location.pathname + '#/profile');
    if (!provider || state !== saved) { UI.toast('Не удалось подтвердить вход: неверный state', 'error'); return; }

    if (provider === 'google' && token) {
      fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: 'Bearer ' + token } })
        .then((r) => r.ok ? r.json() : Promise.reject())
        .then((u) => connect('google', { name: u.name, email: u.email }))
        .catch(() => UI.toast('Google не вернул профиль', 'error'));
    } else if (provider === 'github' && code) {
      const proxy = AUTH_CONFIG.github.tokenProxy;
      if (!proxy) { UI.toast('Для GitHub укажите AUTH_CONFIG.github.tokenProxy (бэкенд обмена code на профиль)', 'error', 6000); return; }
      fetch(proxy, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) })
        .then((r) => r.ok ? r.json() : Promise.reject())
        .then((u) => connect('github', { name: u.name || u.login, login: u.login, email: u.email }))
        .catch(() => UI.toast('Не удалось войти через GitHub', 'error'));
    }
  }

  return { begin, connect, logout, finishFromUrl };
})();

// Хуки для кнопок: вход через Firebase (js/cloud.js)
function handleGoogleLogin() {
  Cloud.loginGoogle()
    .then((r) => { Auth.connect('google', { name: r.user.displayName, email: r.user.email }); App.refresh(); })
    .catch((e) => UI.toast('Не удалось войти через Google: ' + e.code, 'error', 6000));
}
function handleGithubLogin() {
  Cloud.loginGithub()
    .then((r) => {
      const login = r.additionalUserInfo && r.additionalUserInfo.username;
      Auth.connect('github', { name: r.user.displayName || login, login, email: r.user.email });
      App.refresh();
    })
    .catch((e) => UI.toast('Не удалось войти через GitHub: ' + e.code, 'error', 6000));
}

const ProfilePage = (() => {
  const esc = (s) => UI.escapeHTML(s); // UI определяется в app.js (грузится последним), поэтому вызываем лениво

  const radios = (name, current, options) =>
    `<div class="segmented" role="radiogroup">${options.map(([value, text]) =>
      `<label><input type="radio" name="${name}" value="${value}"${value === current ? ' checked' : ''}><span>${text}</span></label>`).join('')}</div>`;

  // mode: 'profile' — личные данные, вход, статистика; 'settings' — настройки и данные
  function render(el, mode = 'profile') {
    const p = Store.getProfile();
    const s = p.settings;
    const st = Store.getStats();

    el.innerHTML = `
      <div class="profile">
        <h1>${mode === 'settings' ? 'Настройки' : 'Профиль'}</h1>

        <section class="profile-section" data-section="personal">
          <h2>Личные данные</h2>
          <div class="profile-avatar">
            ${UI.avatar({ name: p.name, avatar: p.avatar }, 96)}
            <div class="profile-avatar__actions">
              <input type="file" accept="image/*" data-avatar-file hidden>
              <div class="row row--wrap">
                <button type="button" class="btn" data-avatar-pick title="Выберите изображение с устройства для аватара">Загрузить фото</button>
                <button type="button" class="btn btn--ghost" data-avatar-remove${p.avatar ? '' : ' hidden'} title="Убрать текущее изображение профиля">Удалить фото</button>
              </div>
              <p class="text-muted text-sm">Фото хранится в браузере и уменьшается до 128 px.</p>
            </div>
          </div>
          <form class="profile-form" data-profile-form>
            <div class="field"><label for="pf-name">Имя</label>
              <input class="input" id="pf-name" name="name" maxlength="60" value="${esc(p.name)}" autocomplete="name" required></div>
            <div class="field"><label for="pf-email">Email</label>
              <input class="input" id="pf-email" name="email" type="email" maxlength="120" value="${esc(p.email)}" autocomplete="email" placeholder="name@example.com"></div>
            <div class="field"><label for="pf-bio">О себе</label>
              <textarea class="textarea" id="pf-bio" name="bio" rows="3" maxlength="300" placeholder="Коротко о себе">${esc(p.bio)}</textarea></div>
            <div><button type="submit" class="btn btn--primary">Сохранить</button></div>
          </form>
        </section>

        <section class="profile-section" data-section="auth">
          <h2>Вход и аккаунты</h2>
          ${p.auth
            ? `<div class="auth-status"><span>✓ Вы вошли через <b>${AUTH_NAMES[p.auth.provider] || ''}</b>${p.auth.login ? ' · ' + esc(p.auth.login) : ''}</span><button type="button" class="btn btn--sm" data-logout>Выйти</button></div>`
            : '<p class="text-muted text-sm">Войдите через внешний аккаунт, чтобы привязать его к профилю.</p>'}
          <div class="auth-buttons">
            <button type="button" class="btn-oauth btn-oauth--google" data-login="google">${UI.icons.google}<span>Войти через Google</span></button>
            <button type="button" class="btn-oauth btn-oauth--github" data-login="github">${UI.icons.github}<span>Войти через GitHub</span></button>
          </div>
        </section>

        <section class="profile-section" data-section="settings">
          <h2>Настройки</h2>
          <div class="setting">
            <div><strong>Тема</strong><p class="text-muted text-sm">Сохраняется в браузере</p></div>
            ${radios('theme', s.theme, [['light', 'Светлая'], ['dark', 'Тёмная']])}
          </div>
          <div class="setting">
            <div><strong>Размер шрифта</strong><p class="text-muted text-sm">Меняет размер текста во всём приложении</p></div>
            ${radios('fontSize', s.fontSize, [['small', 'Мелкий'], ['medium', 'Средний'], ['large', 'Крупный']])}
          </div>
          <div class="setting">
            <div><strong>Язык</strong><p class="text-muted text-sm">Применяется сразу</p></div>
            <select class="select setting__select" name="language" aria-label="Язык">
              <option value="ru"${s.language === 'ru' ? ' selected' : ''}>Русский</option>
              <option value="en"${s.language === 'en' ? ' selected' : ''}>English</option>
            </select>
          </div>
        </section>

        <section class="profile-section" data-section="stats">
          <h2>Статистика</h2>
          <div class="stats">
            <div class="stat"><span class="stat__num">${st.boards}</span><span class="stat__label">${UI.plural(st.boards, ['доска', 'доски', 'досок'])}</span></div>
            <div class="stat"><span class="stat__num">${st.cards}</span><span class="stat__label">${UI.plural(st.cards, ['карточка', 'карточки', 'карточек'])}</span></div>
            <div class="stat"><span class="stat__num">${st.done}</span><span class="stat__label">выполнено</span></div>
            <div class="stat"><span class="stat__num">${st.archived}</span><span class="stat__label">в архиве</span></div>
          </div>
          <p class="text-muted text-sm">Выполненными считаются карточки в последней колонке доски.</p>
        </section>

        <section class="profile-section" data-section="data">
          <h2>Данные</h2>
          <p class="text-muted text-sm">Экспорт сохраняет доски, профиль и настройки в JSON-файл. Импорт полностью заменяет текущие данные.</p>
          <div class="row row--wrap">
            <button type="button" class="btn" data-export title="Скачать резервную копию досок и карточек">Экспорт данных</button>
            <button type="button" class="btn" data-import-pick title="Загрузить ранее сохранённую резервную копию">Импорт данных</button>
            <input type="file" accept="application/json,.json" data-import-file hidden>
            <button type="button" class="btn btn--danger" data-reset title="Удалить локальные данные приложения; сначала экспортируйте резервную копию">Очистить всё</button>
          </div>
        </section>
      </div>`;

    // Оставляем только секции нужной страницы
    const keep = mode === 'settings' ? ['settings', 'data'] : ['personal', 'auth', 'stats'];
    el.querySelectorAll('[data-section]').forEach((sec) => { if (!keep.includes(sec.dataset.section)) sec.remove(); });

    const wrap = el.querySelector('.profile');

    /* ---------- Клики ---------- */
    wrap.addEventListener('click', async (e) => {
      const t = e.target;
      const login = t.closest('[data-login]');
      if (login) { login.dataset.login === 'google' ? handleGoogleLogin() : handleGithubLogin(); return; }
      if (t.closest('[data-logout]')) { Auth.logout(); render(el, mode); return; }
      if (t.closest('[data-avatar-pick]')) { wrap.querySelector('[data-avatar-file]').click(); return; }

      if (t.closest('[data-avatar-remove]')) {
        Store.updateProfile({ avatar: null });
        UI.toast('Фото удалено');
        render(el, mode);
        return;
      }
      if (t.closest('[data-export]')) { Store.exportJSON(); UI.toast('Файл с данными сохранён', 'success'); return; }
      if (t.closest('[data-import-pick]')) { wrap.querySelector('[data-import-file]').click(); return; }

      if (t.closest('[data-reset]')) {
        const ok = await UI.confirmDialog({
          title: 'Очистить все данные?',
          text: 'Все доски, карточки, профиль и настройки будут удалены без возможности восстановления. Сначала можно сделать экспорт.',
          confirmText: 'Очистить всё', danger: true
        });
        if (!ok) return;
        Store.resetState();
        UI.toast('Все данные удалены');
        render(el, mode);
      }
    });

    /* ---------- Изменения: файлы и настройки ---------- */
    wrap.addEventListener('change', async (e) => {
      const t = e.target;

      if (t.matches('[data-avatar-file]')) {
        const file = t.files[0];
        t.value = '';
        if (!file) return;
        try {
          Store.updateProfile({ avatar: await fileToAvatar(file) });
          UI.toast('Фото обновлено', 'success');
          render(el, mode);
        } catch (err) { UI.toast(err.message, 'error'); }
        return;
      }

      if (t.matches('[data-import-file]')) {
        const file = t.files[0];
        t.value = '';
        if (!file) return;
        const ok = await UI.confirmDialog({
          title: 'Импортировать данные?',
          text: `Текущие данные будут заменены содержимым файла «${file.name}».`,
          confirmText: 'Импортировать', danger: true
        });
        if (!ok) return;
        try {
          await Store.importJSON(file);
          UI.toast('Данные импортированы', 'success');
          render(el, mode);
        } catch (err) { UI.toast(err.message, 'error', 5000); }
        return;
      }

      // Настройки применяются сразу
      if (t.name === 'theme' || t.name === 'fontSize' || t.name === 'language') {
        Store.updateProfile({ settings: { [t.name]: t.value } });
        UI.toast('Настройки сохранены');
      }
    });

    /* ---------- Форма профиля ---------- */
    wrap.querySelector('[data-profile-form]')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target;
      Store.updateProfile({ name: f.name.value.trim() || I18n.t('Пользователь'), email: f.email.value.trim(), bio: f.bio.value.trim() });
      UI.toast('Профиль сохранён', 'success');
      render(el, mode);
    });
  }

  return { render };
})();
