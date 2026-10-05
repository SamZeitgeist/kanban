/* ==========================================================
   profile.js — страница #/profile: аватар, данные профиля, настройки,
   статистика, экспорт / импорт / очистка данных.
   Тема, язык и размер шрифта применяются сразу: Store.updateProfile →
   Store.onChange → App.applySettings (см. app.js).
   Загрузка аватара использует fileToAvatar() из board.js (FileReader →
   base64, уменьшение до 128 px, чтобы не переполнить localStorage).
   ========================================================== */
const ProfilePage = (() => {
  const esc = (s) => UI.escapeHTML(s); // UI определяется в app.js (грузится последним), поэтому вызываем лениво

  const radios = (name, current, options) =>
    `<div class="segmented" role="radiogroup">${options.map(([value, text]) =>
      `<label><input type="radio" name="${name}" value="${value}"${value === current ? ' checked' : ''}><span>${text}</span></label>`).join('')}</div>`;

  function render(el) {
    const p = Store.getProfile();
    const s = p.settings;
    const st = Store.getStats();

    el.innerHTML = `
      <div class="profile">
        <h1>Профиль</h1>

        <section class="profile-section">
          <h2>Личные данные</h2>
          <div class="profile-avatar">
            ${UI.avatar({ name: p.name, avatar: p.avatar }, 96)}
            <div class="profile-avatar__actions">
              <input type="file" accept="image/*" data-avatar-file hidden>
              <div class="row row--wrap">
                <button type="button" class="btn" data-avatar-pick>Загрузить фото</button>
                <button type="button" class="btn btn--ghost" data-avatar-remove${p.avatar ? '' : ' hidden'}>Удалить фото</button>
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

        <section class="profile-section">
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

        <section class="profile-section">
          <h2>Статистика</h2>
          <div class="stats">
            <div class="stat"><span class="stat__num">${st.boards}</span><span class="stat__label">${UI.plural(st.boards, ['доска', 'доски', 'досок'])}</span></div>
            <div class="stat"><span class="stat__num">${st.cards}</span><span class="stat__label">${UI.plural(st.cards, ['карточка', 'карточки', 'карточек'])}</span></div>
            <div class="stat"><span class="stat__num">${st.done}</span><span class="stat__label">выполнено</span></div>
            <div class="stat"><span class="stat__num">${st.archived}</span><span class="stat__label">в архиве</span></div>
          </div>
          <p class="text-muted text-sm">Выполненными считаются карточки в последней колонке доски.</p>
        </section>

        <section class="profile-section">
          <h2>Данные</h2>
          <p class="text-muted text-sm">Экспорт сохраняет доски, профиль и настройки в JSON-файл. Импорт полностью заменяет текущие данные.</p>
          <div class="row row--wrap">
            <button type="button" class="btn" data-export>Экспорт данных</button>
            <button type="button" class="btn" data-import-pick>Импорт данных</button>
            <input type="file" accept="application/json,.json" data-import-file hidden>
            <button type="button" class="btn btn--danger" data-reset>Очистить всё</button>
          </div>
        </section>
      </div>`;

    const wrap = el.querySelector('.profile');

    /* ---------- Клики ---------- */
    wrap.addEventListener('click', async (e) => {
      const t = e.target;
      if (t.closest('[data-avatar-pick]')) { wrap.querySelector('[data-avatar-file]').click(); return; }

      if (t.closest('[data-avatar-remove]')) {
        Store.updateProfile({ avatar: null });
        UI.toast('Фото удалено');
        render(el);
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
        render(el);
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
          render(el);
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
          render(el);
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
    wrap.querySelector('[data-profile-form]').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target;
      Store.updateProfile({ name: f.name.value.trim() || I18n.t('Пользователь'), email: f.email.value.trim(), bio: f.bio.value.trim() });
      UI.toast('Профиль сохранён', 'success');
      render(el);
    });
  }

  return { render };
})();
