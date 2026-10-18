// js/cloud.js
firebase.initializeApp({            // значения из Project settings → Your apps → Web
  apiKey: '...', authDomain: 'ПРОЕКТ.firebaseapp.com', projectId: 'ПРОЕКТ', appId: '...'
});
const auth = firebase.auth(), db = firebase.firestore();

const Cloud = (() => {
  let uid = null, timer = null;
  const ref = () => db.collection('users').doc(uid);

  // Вход (вместо handleGoogleLogin/handleGithubLogin из profile.js)
  const loginGoogle = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
  const loginGithub = () => auth.signInWithPopup(new firebase.auth.GithubAuthProvider());
  const logout = () => auth.signOut();

  // Сохранить (вызывается из Store.saveState, с задержкой 1 c, чтобы не слать каждый клик)
  function push() {
    if (!uid) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      const state = Store.getRaw();
      ref().set({ state: JSON.stringify(state), updatedAt: Date.now() })
        .catch((e) => UI.toast('Не удалось синхронизировать: ' + e.message, 'error'));
    }, 1000);
  }

  // Загрузить после входа: побеждает более свежая версия
  async function pull() {
    const snap = await ref().get();
    const local = Store.getRaw();
    const localAt = local.updatedAt || 0;
    if (snap.exists && snap.data().updatedAt > localAt) {
      Store.setRaw(JSON.parse(snap.data().state));   // облако новее → заменяем локальные
      App.refresh();
    } else {
      push();                                         // локальные новее (или в облаке пусто) → отправляем
    }
  }

  auth.onAuthStateChanged((user) => {
    uid = user ? user.uid : null;
    if (user) pull();
  });

  return { loginGoogle, loginGithub, logout, push, pull };
})();
