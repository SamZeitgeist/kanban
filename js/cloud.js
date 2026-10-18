/* ==========================================================
   cloud.js — вход через Firebase (Google / GitHub) и синхронизация
   данных между устройствами (Firestore: users/{uid}).
   Подключается в index.html ПОСЛЕ скриптов Firebase и storage.js.
   ========================================================== */

// ↓↓↓ Вставьте СВОИ значения из Firebase: Project settings → Your apps → SDK setup and configuration ↓↓↓
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyD7Ju9HzHuWZuWQ2555Nl8BrJMtrd_sEd0',
  authDomain: 'kanban-fec96.firebaseapp.com',
  projectId: 'kanban-fec96',
  appId: '1:364361969024:web:bb1470df454c91338b6565'
};
// ↑↑↑ Менять нужно только значения в кавычках. Запятые и скобки оставьте как есть ↑↑↑

firebase.initializeApp(FIREBASE_CONFIG);
const fbAuth = firebase.auth();
const fbDb = firebase.firestore();

const Cloud = (() => {
  let uid = null, timer = null, ready = false;   // ready = первая загрузка из облака завершена
  const ref = () => fbDb.collection('users').doc(uid);
  const hasData = (st) => st && Array.isArray(st.boards) && st.boards.length > 0;

  // Отправка в облако (с задержкой 1 с). Пока не завершена первая загрузка — не отправляем,
  // иначе пустые данные нового устройства затрут облако.
  function push() {
    if (!uid || !ready) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      const state = Store.getRaw();
      ref().set({ state: JSON.stringify(state), updatedAt: state.updatedAt || Date.now() })
        .catch((e) => UI.toast('Не удалось синхронизировать: ' + e.message, 'error', 6000));
    }, 1000);
  }

  // Загрузка из облака: берём облако, если оно новее ИЛИ если здесь доски пустые, а в облаке есть
  async function pull() {
    ready = false;
    try {
      const snap = await ref().get();
      const local = Store.getRaw();
      if (snap.exists) {
        const cloud = JSON.parse(snap.data().state);
        if (snap.data().updatedAt > (local.updatedAt || 0) || (!hasData(local) && hasData(cloud))) {
          Store.setRaw(cloud);
          App.refresh();
          UI.toast('Данные загружены из облака', 'success');
        }
      }
      ready = true;
      push();                                    // отправим локальные, если они новее/облако пустое
    } catch (e) {
      UI.toast('Не удалось загрузить данные из облака: ' + e.message, 'error', 8000);
    }
  }

  // Вход: сначала загружаем облако, и только потом профиль (connect) сохраняет изменения
  const afterLogin = async (r) => { uid = r.user.uid; await pull(); return r; };
  const loginGoogle = () => fbAuth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).then(afterLogin);
  const loginGithub = () => fbAuth.signInWithPopup(new firebase.auth.GithubAuthProvider()).then(afterLogin);
  const logout = () => { uid = null; ready = false; return fbAuth.signOut(); };

  // Уже вошли ранее (обновили страницу / открыли с другого устройства)
  fbAuth.onAuthStateChanged((user) => {
    if (user && user.uid !== uid) { uid = user.uid; pull(); }
  });

  return { loginGoogle, loginGithub, logout, push, pull };
})();
