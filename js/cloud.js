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
  let uid = null, timer = null;
  const ref = () => fbDb.collection('users').doc(uid);

  // Вход: возвращают Promise с результатом (user, additionalUserInfo)
  const loginGoogle = () => fbAuth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
  const loginGithub = () => fbAuth.signInWithPopup(new firebase.auth.GithubAuthProvider());
  const logout = () => fbAuth.signOut();

  // Отправка в облако (с задержкой 1 с, чтобы не слать каждый клик)
  function push() {
    if (!uid) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      const state = Store.getRaw();
      ref().set({ state: JSON.stringify(state), updatedAt: state.updatedAt || Date.now() })
        .catch((e) => UI.toast('Не удалось синхронизировать: ' + e.message, 'error'));
    }, 1000);
  }

  // Загрузка из облака: побеждает более свежая версия
  async function pull() {
    try {
      const snap = await ref().get();
      const localAt = Store.getRaw().updatedAt || 0;
      if (snap.exists && snap.data().updatedAt > localAt) {
        Store.setRaw(JSON.parse(snap.data().state));   // облако новее → заменяем локальные данные
        App.refresh();
      } else {
        push();                                         // локальные новее или в облаке пусто → отправляем
      }
    } catch (e) {
      UI.toast('Не удалось загрузить данные из облака: ' + e.message, 'error');
    }
  }

  fbAuth.onAuthStateChanged((user) => {
    uid = user ? user.uid : null;
    if (user) pull();
  });

  return { loginGoogle, loginGithub, logout, push, pull };
})();
