/* ==========================================================
   i18n.js — переводы интерфейса (русский — язык исходного кода).
   Ключ словаря — русский текст, значение — английский. Если перевода нет,
   показывается русский текст. Фразы с переменными пишутся с {плейсхолдерами}:
   {n…} — число, {w…} — слово (переводится рекурсивно, например «задачи»),
   остальные — любой текст (названия, имена).
   Как это работает: при языке «en» MutationObserver переводит тексты и
   атрибуты placeholder / aria-label / title всего, что появляется на странице.
   Пользовательские данные (названия карточек, досок, комментарии) не
   переводятся — их перечень в SKIP. Чтобы добавить язык, скопируйте
   словарь EN и поменяйте lang в setLang().
   Исходные русские тексты запоминаются, поэтому переключение
   en → ru возвращает всё обратно без перезагрузки.
   ========================================================== */
const I18n = (() => {
  const EN = {
    /* --- Шапка и общее --- */
    'Канбан-доска': 'Kanban board', 'Канбан': 'Kanban', 'Доски': 'Boards', 'Профиль': 'Profile',
    'К списку досок': 'Back to boards', 'Основная навигация': 'Main navigation',
    'Страница не найдена': 'Page not found', 'К доскам': 'To boards',
    'Такого адреса нет. Вернитесь к списку досок.': 'There is no such address. Go back to the boards list.',
    'Для работы приложения нужен включённый JavaScript.': 'JavaScript must be enabled to run this app.',
    'Отмена': 'Cancel', 'Подтвердите действие': 'Confirm action', 'Подтвердить': 'Confirm', 'Сохранить': 'Save',
    'Закрыть': 'Close', 'Создать': 'Create', 'Добавить': 'Add', 'Удалить': 'Delete', 'Очистить': 'Clear',
    'Переименовать': 'Rename', 'Название': 'Title', 'Имя': 'Name', 'Сбросить': 'Reset',
    'Доска не найдена': 'Board not found', 'Карточка не найдена': 'Card not found',

    /* --- Ошибки хранилища --- */
    'Не удалось прочитать сохранённые данные — создано пустое состояние': 'Could not read saved data — an empty state was created',
    'Не удалось сохранить данные: хранилище браузера переполнено': 'Could not save data: browser storage is full',
    'Не удалось прочитать файл': 'Could not read the file', 'Это не изображение': 'This is not an image',
    'В файле нет списка досок (boards)': 'The file has no list of boards (boards)',
    'Неверный файл: {w}': 'Invalid file: {w}',

    /* --- Значения по умолчанию при создании --- */
    'Новая доска': 'New board', 'Новая колонка': 'New column', 'Новая карточка': 'New card', '(копия)': '(copy)',
    'Пользователь': 'User',

    /* --- Склонения --- */
    'доска': 'board', 'доски': 'boards', 'досок': 'boards',
    'задача': 'task', 'задачи': 'tasks', 'задач': 'tasks',
    'карточка': 'card', 'карточки': 'cards', 'карточек': 'cards',

    /* --- Страница досок --- */
    'Мои доски': 'My boards', 'Создать доску': 'Create board', 'Поиск по названию': 'Search by name',
    'Поиск досок по названию': 'Search boards by name', 'Пока нет ни одной доски': 'No boards yet',
    '{n1} {w1}, {n2} {w2}': '{n1} {w1}, {n2} {w2}',
    '{n} {w}, создана {d}': '{n} {w}, created {d}',
    'Создайте первую доску': 'Create your first board',
    'Доска — это набор колонок и карточек. Начните с пустой: колонки To Do, In Progress, Review и Done появятся сразу.':
      'A board is a set of columns and cards. Start with an empty one: the To Do, In Progress, Review and Done columns appear right away.',
    'Ничего не найдено': 'Nothing found',
    'Нет досок с названием «{q}». Попробуйте другое слово.': 'No boards named “{q}”. Try another word.',
    'Меню доски «{q}»': 'Menu for board “{q}”',
    'Например, Запуск сайта': 'For example, Website launch',
    'Доска создана': 'Board created', 'Доска переименована': 'Board renamed', 'Доска продублирована': 'Board duplicated',
    'Доска удалена': 'Board deleted', 'Дублировать': 'Duplicate', 'Удалить доску?': 'Delete board?',
    'Доска «{q}» и все её задачи ({n}) будут удалены. Это действие нельзя отменить.':
      'The board “{q}” and all its tasks ({n}) will be deleted. This cannot be undone.',

    /* --- Страница доски --- */
    'Переименовать доску': 'Rename board', 'Поиск по карточкам': 'Search cards',
    'Поиск по названию карточки': 'Search by card title', 'Фильтр по исполнителю': 'Filter by assignee',
    'Фильтр по метке': 'Filter by label', 'Фильтр по дедлайну': 'Filter by deadline',
    'Все исполнители': 'All assignees', 'Без исполнителя': 'Unassigned', 'Все метки': 'All labels',
    'Любой срок': 'Any deadline', 'Просрочены': 'Overdue', 'Сегодня': 'Today', 'Скоро': 'Soon', 'Без срока': 'No deadline',
    'Участники': 'Members', 'Добавить участников': 'Add members', 'Участники доски': 'Board members',
    'Эмодзи': 'Emoji', 'или картинка': 'or image', 'Добавить участника': 'Add member',
    'Пока никого нет. Добавьте первого участника ниже.': 'No one here yet. Add the first member below.',
    'Участник удалён': 'Member removed', 'Участник добавлен': 'Member added',
    'Название карточки': 'Card title', 'Название новой карточки': 'New card title',
    'Карточка': 'Card', 'Колонка': 'Column',
    'Лимит карточек: {n}': 'Card limit: {n}', 'Меню колонки «{q}»': 'Menu for column “{q}”',
    'Колонка создана': 'Column created', 'Переименовать колонку': 'Rename column', 'Добавить карточку': 'Add card',
    'Лимит карточек (WIP)': 'Card limit (WIP)', 'Лимит карточек': 'Card limit',
    'Максимум карточек (пусто или 0 — без лимита)': 'Maximum cards (empty or 0 for no limit)',
    'Удалить колонку': 'Delete column', 'Удалить колонку?': 'Delete column?', 'Колонка удалена': 'Column deleted',
    'Колонка «{q}» и её карточки ({n}) будут удалены.': 'The column “{q}” and its cards ({n}) will be deleted.',
    'Колонка «{q}» будет удалена.': 'The column “{q}” will be deleted.',

    /* --- Карточка --- */
    'Карточка: {q}': 'Card: {q}', 'В колонке «{q}»': 'In column “{q}”',
    'В колонке «{q}», карточка в архиве': 'In column “{q}”, card is archived',
    'Просрочено': 'Overdue', 'Срок сегодня': 'Due today', 'Скоро срок': 'Due soon',
    'Описание': 'Description', 'Добавьте описание': 'Add a description',
    'Чек-лист': 'Checklist', 'Новый пункт': 'New item', 'Новый пункт чек-листа': 'New checklist item',
    '{n1} из {n2}': '{n1} of {n2}', 'Выполнено': 'Done', 'Текст пункта': 'Item text', 'Удалить пункт': 'Delete item',
    'Комментарии': 'Comments', 'Напишите комментарий (Ctrl+Enter — отправить)': 'Write a comment (Ctrl+Enter to send)',
    'Новый комментарий': 'New comment', 'Отправить': 'Send', 'Комментариев пока нет.': 'No comments yet.',
    'Исполнитель': 'Assignee', 'Не назначен': 'Not assigned', 'Добавьте участников в шапке доски.': 'Add members in the board header.',
    'Дедлайн': 'Deadline', 'Метки': 'Labels', 'Название метки': 'Label name', 'Цвет метки': 'Label color',
    'Цвет {n}': 'Color {n}', 'Убрать метку {q}': 'Remove label {q}', 'Добавить метку': 'Add label',
    'Такая метка уже есть': 'This label already exists',
    'Вернуть из архива': 'Restore from archive', 'Архивировать': 'Archive',
    'Карточка сохранена': 'Card saved', 'Карточка архивирована': 'Card archived',
    'Карточка возвращена из архива': 'Card restored from archive', 'Карточка удалена': 'Card deleted',
    'Удалить карточку?': 'Delete card?',
    'Карточка «{q}» будет удалена без возможности восстановления.': 'The card “{q}” will be permanently deleted.',

    /* --- Профиль --- */
    'Личные данные': 'Personal info', 'Загрузить фото': 'Upload photo', 'Удалить фото': 'Remove photo',
    'Фото хранится в браузере и уменьшается до 128 px.': 'The photo is stored in your browser and downscaled to 128 px.',
    'О себе': 'About me', 'Коротко о себе': 'A few words about you',
    'Настройки': 'Settings', 'Тема': 'Theme', 'Сохраняется в браузере': 'Saved in your browser',
    'Светлая': 'Light', 'Тёмная': 'Dark', 'Размер шрифта': 'Font size',
    'Меняет размер текста во всём приложении': 'Changes text size across the app',
    'Мелкий': 'Small', 'Средний': 'Medium', 'Крупный': 'Large', 'Язык': 'Language',
    'Применяется сразу': 'Applied immediately',
    'Статистика': 'Statistics', 'выполнено': 'completed', 'в архиве': 'archived',
    'Выполненными считаются карточки в последней колонке доски.': 'Cards in the last column of a board count as completed.',
    'Данные': 'Data',
    'Экспорт сохраняет доски, профиль и настройки в JSON-файл. Импорт полностью заменяет текущие данные.':
      'Export saves boards, profile and settings to a JSON file. Import fully replaces current data.',
    'Экспорт данных': 'Export data', 'Импорт данных': 'Import data', 'Очистить всё': 'Clear everything',
    'Фото удалено': 'Photo removed', 'Фото обновлено': 'Photo updated', 'Файл с данными сохранён': 'Data file saved',
    'Очистить все данные?': 'Clear all data?',
    'Все доски, карточки, профиль и настройки будут удалены без возможности восстановления. Сначала можно сделать экспорт.':
      'All boards, cards, profile and settings will be permanently deleted. You can export first.',
    'Все данные удалены': 'All data deleted', 'Импортировать данные?': 'Import data?', 'Импортировать': 'Import',
    'Текущие данные будут заменены содержимым файла «{q}».': 'Current data will be replaced with the contents of “{q}”.',
    'Данные импортированы': 'Data imported', 'Настройки сохранены': 'Settings saved', 'Профиль сохранён': 'Profile saved'
  };

  // Не переводим пользовательский контент
  const SKIP = '[data-no-i18n], textarea, input, .avatar, .card__title, .column__name, .board-card__link, .board-title, .chip, .comment__text, .comment strong, .member-row .truncate, .card-modal__title';
  const ATTRS = ['placeholder', 'aria-label', 'title'];
  const CYR = /[А-Яа-яЁё]/;

  let lang = 'ru';
  const exact = new Map();
  const patterns = [];
  const textStore = new WeakMap();  // текстовый узел → { ru, en }
  const attrStore = new WeakMap();  // элемент → { атрибут: { ru, en } }

  // Компиляция словаря: фразы с {…} превращаем в регулярные выражения
  Object.entries(EN).forEach(([ru, en]) => {
    if (!/\{\w+\}/.test(ru)) { exact.set(ru, en); return; }
    const names = [];
    const src = ru.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{(\w+)\}/g, (m, name) => {
      names.push(name);
      return name[0] === 'n' ? '(\\d+)' : '([\\s\\S]+?)';
    });
    patterns.push({ re: new RegExp('^' + src + '$'), names, tpl: en });
  });
  patterns.sort((a, b) => b.re.source.length - a.re.source.length);

  // Возвращает перевод строки или null
  function tr(text) {
    const key = text.trim();
    if (!key || !CYR.test(key)) return null;
    if (exact.has(key)) return exact.get(key);
    for (const p of patterns) {
      const m = key.match(p.re);
      if (!m) continue;
      return p.tpl.replace(/\{(\w+)\}/g, (_, name) => {
        const v = m[p.names.indexOf(name) + 1];
        return name[0] === 'w' ? (tr(v) ?? v) : v; // слова («задачи») переводим, имена — нет
      });
    }
    return null;
  }

  const skip = (el) => !el || !!el.closest(SKIP);
  // У атрибутов (placeholder, aria-label, title) пропускаем только имена на аватарах
  const skipAttr = (el) => !!el.closest('[data-no-i18n], .avatar');

  function translateText(node) {
    if (skip(node.parentElement)) return;
    const rec = textStore.get(node);
    if (rec && node.nodeValue === rec.en) return;           // уже переведён
    const en = tr(node.nodeValue);
    if (en === null) return;
    const ru = node.nodeValue;
    const value = ru.replace(ru.trim(), () => en);           // сохраняем пробелы по краям
    textStore.set(node, { ru, en: value });
    node.nodeValue = value;
  }

  function translateAttrs(el) {
    if (skipAttr(el)) return;
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (v === null) continue;
      const store = attrStore.get(el) || {};
      if (store[a] && v === store[a].en) continue;
      const en = tr(v);
      if (en === null) continue;
      store[a] = { ru: v, en };
      attrStore.set(el, store);
      el.setAttribute(a, en);
    }
  }

  // Обходит поддерево и применяет fn к текстовым узлам и элементам
  function walk(root, onText, onEl) {
    if (root.nodeType === 3) { onText(root); return; }
    if (root.nodeType !== 1) return;
    onEl(root);
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) (n.nodeType === 3 ? onText : onEl)(n);
  }

  function restoreText(node) {
    const rec = textStore.get(node);
    if (rec && node.nodeValue === rec.en) node.nodeValue = rec.ru;
  }
  function restoreAttrs(el) {
    const store = attrStore.get(el);
    if (!store) return;
    for (const a in store) if (el.getAttribute(a) === store[a].en) el.setAttribute(a, store[a].ru);
  }

  // Следим за новыми узлами и изменениями текста
  const observer = new MutationObserver((mutations) => {
    if (lang === 'ru') return;
    for (const m of mutations) {
      if (m.type === 'childList') m.addedNodes.forEach((n) => walk(n, translateText, translateAttrs));
      else if (m.type === 'characterData') translateText(m.target);
      else if (m.type === 'attributes') translateAttrs(m.target);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });

  function setLang(next) {
    next = next === 'en' ? 'en' : 'ru';
    if (next === lang) return;
    lang = next;
    document.documentElement.lang = lang;
    document.title = lang === 'en' ? EN['Канбан-доска'] : 'Канбан-доска';
    if (lang === 'en') walk(document.body, translateText, translateAttrs);
    else walk(document.body, restoreText, restoreAttrs);
  }

  // Перевод строки из JS-кода (значения по умолчанию, сообщения)
  const t = (key) => (lang === 'en' ? (tr(key) ?? key) : key);
  const locale = () => (lang === 'en' ? 'en-US' : 'ru-RU');

  return { setLang, t, locale, get lang() { return lang; } };
})();
