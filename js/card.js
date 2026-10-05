/* ==========================================================
   card.js — модальное окно карточки (#/board/:id/card/:cardId).
   Поля редактируются в черновике (draft) и сохраняются в Store через
   commit(): по кнопке «Сохранить» и при любом закрытии окна (Esc, клик
   по фону, ×). Комментарии сохраняются сразу.
   ========================================================== */
const CardModal = (() => {
  const esc = (s) => UI.escapeHTML(s); // UI определяется в app.js (грузится последним), поэтому вызываем лениво
  const LABEL_COLORS = ['#e5484d', '#f08c00', '#2f9e44', '#1c7ed6', '#7048e8', '#868e96'];
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const DEADLINE_TEXT = { overdue: 'Просрочено', today: 'Срок сегодня', soon: 'Скоро срок' };

  function open(boardId, cardId) {
    const board = Store.getBoard(boardId);
    const found = Store.getCard(boardId, cardId);
    if (!board || !found) return;
    const { card, column } = found;
    const draft = { labels: clone(card.labels), checklist: clone(card.checklist) };
    let color = LABEL_COLORS[0];
    let skipCommit = false;

    const el = document.createElement('div');
    el.className = 'modal modal--card';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Карточка: ' + card.title);
    el.innerHTML = `
      <div class="card-modal__head">
        <div class="card-modal__titlewrap">
          <input class="card-modal__title" data-title maxlength="200" value="${esc(card.title)}" aria-label="Название карточки">
          <p class="text-muted text-sm">В колонке «${esc(column.name)}»${card.archived ? ', карточка в архиве' : ''}</p>
        </div>
        <button type="button" class="btn btn--ghost btn--icon" data-close aria-label="Закрыть" autofocus>${UI.icons.close}</button>
      </div>

      <div class="card-modal__body">
        <div class="card-modal__main">
          <section class="cm-section">
            <h4>Описание</h4>
            <textarea class="textarea" data-desc rows="4" placeholder="Добавьте описание">${esc(card.description)}</textarea>
          </section>

          <section class="cm-section">
            <div class="row row--between"><h4>Чек-лист</h4><span class="text-muted text-sm" data-progress-text></span></div>
            <div class="progress"><span data-progress-bar></span></div>
            <div class="checklist" data-checklist></div>
            <form class="row" data-add-item>
              <input class="input" placeholder="Новый пункт" aria-label="Новый пункт чек-листа" maxlength="200">
              <button type="submit" class="btn btn--sm">Добавить</button>
            </form>
          </section>

          <section class="cm-section">
            <h4>Комментарии</h4>
            <div class="comments" data-comments></div>
            <form class="comment-form" data-comment-form>
              <textarea class="textarea" rows="2" placeholder="Напишите комментарий (Ctrl+Enter — отправить)" aria-label="Новый комментарий"></textarea>
              <button type="submit" class="btn btn--primary btn--sm">Отправить</button>
            </form>
          </section>
        </div>

        <aside class="card-modal__side">
          <div class="field">
            <label for="cm-assignee">Исполнитель</label>
            <select class="select" id="cm-assignee" data-assignee>
              <option value="">Не назначен</option>
              ${board.members.map((m) => `<option value="${esc(m.id)}"${m.id === card.assigneeId ? ' selected' : ''}>${esc(m.name)}</option>`).join('')}
            </select>
            ${board.members.length ? '' : '<p class="text-muted text-sm">Добавьте участников в шапке доски.</p>'}
          </div>

          <div class="field">
            <label for="cm-deadline">Дедлайн</label>
            <input class="input" type="date" id="cm-deadline" data-deadline value="${esc(card.deadline || '')}">
            <div class="deadline-hint" data-deadline-hint></div>
          </div>

          <div class="field">
            <span class="field__label">Метки</span>
            <div class="card-labels" data-labels></div>
            <form class="label-form" data-add-label>
              <input class="input" placeholder="Название метки" aria-label="Название метки" maxlength="24">
              <div class="swatches" role="group" aria-label="Цвет метки">
                ${LABEL_COLORS.map((c, i) => `<button type="button" class="swatch" data-color="${c}" style="background:${c}" aria-label="Цвет ${i + 1}" aria-pressed="${i === 0}"></button>`).join('')}
              </div>
              <button type="submit" class="btn btn--sm">Добавить метку</button>
            </form>
          </div>

          <div class="card-modal__actions">
            <button type="button" class="btn btn--primary" data-save>Сохранить</button>
            <button type="button" class="btn" data-archive>${card.archived ? 'Вернуть из архива' : 'Архивировать'}</button>
            <button type="button" class="btn btn--danger" data-delete>Удалить</button>
          </div>
        </aside>
      </div>`;

    const $ = (sel) => el.querySelector(sel);

    /* ---------- Отрисовка частей ---------- */
    function drawProgress() {
      const total = draft.checklist.length;
      const done = draft.checklist.filter((i) => i.done).length;
      $('[data-progress-text]').textContent = total ? `${done} из ${total}` : '';
      $('.progress').hidden = !total;
      $('[data-progress-bar]').style.width = total ? (done / total * 100) + '%' : '0';
    }

    function drawChecklist() {
      $('[data-checklist]').innerHTML = draft.checklist.map((it, i) => `
        <div class="check-row${it.done ? ' is-done' : ''}">
          <input type="checkbox" data-i="${i}" ${it.done ? 'checked' : ''} aria-label="Выполнено">
          <input class="check-row__text" data-text="${i}" value="${esc(it.text)}" aria-label="Текст пункта" maxlength="200">
          <button type="button" class="btn btn--ghost btn--icon btn--sm" data-del="${i}" aria-label="Удалить пункт">${UI.icons.close}</button>
        </div>`).join('');
      drawProgress();
    }

    function drawLabels() {
      $('[data-labels]').innerHTML = draft.labels.map((l, i) =>
        `<span class="chip" style="--c:${esc(l.color)}">${esc(l.text)}
           <button type="button" class="chip__remove" data-remove-label="${i}" aria-label="Убрать метку ${esc(l.text)}">${UI.icons.close}</button></span>`).join('');
    }

    function drawDeadline() {
      const input = $('[data-deadline]');
      const status = UI.deadlineStatus(input.value);
      input.classList.remove('is-today', 'is-soon', 'is-overdue');
      if (status) input.classList.add('is-' + status);
      $('[data-deadline-hint]').innerHTML = input.value
        ? `${status ? `<span class="deadline-badge is-${status}">${DEADLINE_TEXT[status]}</span>` : ''}
           <button type="button" class="btn btn--ghost btn--sm" data-clear-deadline>Очистить</button>`
        : '';
    }

    function drawComments() {
      $('[data-comments]').innerHTML = card.comments.length
        ? card.comments.map((c) => `
            <div class="comment">
              ${UI.avatar({ name: c.author }, 28)}
              <div class="comment__main">
                <div><strong>${esc(c.author)}</strong> <span class="text-muted text-sm">${UI.formatDateTime(c.date)}</span></div>
                <p class="comment__text">${esc(c.text)}</p>
              </div>
            </div>`).join('')
        : '<p class="text-muted text-sm">Комментариев пока нет.</p>';
    }

    /* ---------- Сохранение ---------- */
    function commit() {
      const patch = {
        title: $('[data-title]').value.trim() || card.title,
        description: $('[data-desc]').value,
        assigneeId: $('[data-assignee]').value || null,
        deadline: $('[data-deadline]').value || null,
        labels: draft.labels,
        checklist: draft.checklist.filter((i) => i.text.trim()).map((i) => ({ text: i.text.trim(), done: i.done }))
      };
      const same = Object.keys(patch).every((k) => JSON.stringify(patch[k]) === JSON.stringify(card[k]));
      if (!same) Store.updateCard(boardId, cardId, patch); // меняется только если что-то правили
    }

    /* ---------- События ---------- */
    el.addEventListener('click', async (e) => {
      const t = e.target;
      if (t.closest('[data-close]')) { modal.close(); return; }

      let b = t.closest('[data-del]');
      if (b) { draft.checklist.splice(+b.dataset.del, 1); drawChecklist(); return; }

      b = t.closest('[data-remove-label]');
      if (b) { draft.labels.splice(+b.dataset.removeLabel, 1); drawLabels(); return; }

      b = t.closest('.swatch');
      if (b) {
        color = b.dataset.color;
        el.querySelectorAll('.swatch').forEach((s) => s.setAttribute('aria-pressed', s === b));
        return;
      }
      if (t.closest('[data-clear-deadline]')) { $('[data-deadline]').value = ''; drawDeadline(); return; }

      if (t.closest('[data-save]')) {
        commit(); skipCommit = true;
        UI.toast('Карточка сохранена', 'success');
        modal.close();
      } else if (t.closest('[data-archive]')) {
        commit(); skipCommit = true;
        const archive = !card.archived;
        Store.archiveCard(boardId, cardId, archive);
        UI.toast(archive ? 'Карточка архивирована' : 'Карточка возвращена из архива');
        modal.close();
      } else if (t.closest('[data-delete]')) {
        const ok = await UI.confirmDialog({ title: 'Удалить карточку?', text: `Карточка «${card.title}» будет удалена без возможности восстановления.`, confirmText: 'Удалить', danger: true });
        if (!ok) return;
        skipCommit = true;
        Store.deleteCard(boardId, cardId);
        UI.toast('Карточка удалена');
        modal.close();
      }
    });

    // Чек-лист: отметка и правка текста (без перерисовки, чтобы не терять фокус)
    $('[data-checklist]').addEventListener('change', (e) => {
      if (!e.target.matches('[data-i]')) return;
      draft.checklist[+e.target.dataset.i].done = e.target.checked;
      e.target.closest('.check-row').classList.toggle('is-done', e.target.checked);
      drawProgress();
    });
    $('[data-checklist]').addEventListener('input', (e) => {
      if (e.target.matches('[data-text]')) draft.checklist[+e.target.dataset.text].text = e.target.value;
    });
    $('[data-add-item]').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = e.target.querySelector('input');
      if (!input.value.trim()) return;
      draft.checklist.push({ text: input.value.trim(), done: false });
      input.value = '';
      drawChecklist();
      input.focus();
    });

    // Метки
    $('[data-add-label]').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = e.target.querySelector('input');
      const text = input.value.trim();
      if (!text) { input.focus(); return; }
      if (draft.labels.some((l) => l.text.toLowerCase() === text.toLowerCase())) { UI.toast('Такая метка уже есть'); return; }
      draft.labels.push({ text, color });
      input.value = '';
      drawLabels();
    });

    $('[data-deadline]').addEventListener('input', drawDeadline);

    // Комментарии сохраняются сразу
    const form = $('[data-comment-form]');
    const sendComment = () => {
      const ta = form.querySelector('textarea');
      if (!ta.value.trim()) return;
      Store.addComment(boardId, cardId, ta.value);
      ta.value = '';
      drawComments();
    };
    form.addEventListener('submit', (e) => { e.preventDefault(); sendComment(); });
    form.querySelector('textarea').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); sendComment(); }
    });

    $('[data-title]').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.blur(); });

    /* ---------- Открытие ---------- */
    const modal = UI.openModal(el, {
      className: 'modal-overlay--card',
      onClose: () => {
        if (!skipCommit) commit();       // любое закрытие сохраняет правки
        App.leaveCard(boardId);          // возвращаемся на #/board/:id
      }
    });
    drawChecklist(); drawLabels(); drawDeadline(); drawComments();
  }

  return { open };
})();
