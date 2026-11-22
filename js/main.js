// main.js — 起動・タブ切り替え・読み直し（前回の中身をすぐ出してから最新を取りに行く）
var Main = (function () {
  var CACHE = 'sn_init';
  var TITLES = { home: '仕組みノート', list: '📚 ノート帳', map: '🗺 業界マップ', more: '🔍 もっと知りたい', settings: '⚙️ 設定' };
  var tab = 'home';
  var lastLoad = 0;

  function render() {
    Home.render();
    More.render();
    if (tab === 'list') List.render();
    if (tab === 'map') MapTab.render();
    if (tab === 'settings') Settings.render();
  }

  function reload() {
    var btn = document.getElementById('reloadBtn');
    btn.classList.add('spin');
    lastLoad = Date.now();
    return API.call('init').then(function (res) {
      Store.set(res);
      API.store(CACHE, JSON.stringify(res));
      render();
    }).catch(function (err) { UI.toast('読めませんでした：' + err.message); })
      .then(function () { btn.classList.remove('spin'); });
  }

  function show(name) {
    tab = name;
    document.querySelectorAll('.tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === name); });
    document.querySelectorAll('.view').forEach(function (v) { v.hidden = v.id !== 'view-' + name; });
    document.getElementById('pageTitle').textContent = TITLES[name];
    window.scrollTo(0, 0);
    render();
  }

  function start() {
    if (!API.hasKey()) {
      document.getElementById('homeList').innerHTML = '<div class="empty"><b>鍵がありません</b>クロコから届いた「?k=」付きのURLで1回開いてください</div>';
      return;
    }
    var cached = API.store(CACHE);
    if (cached) { try { Store.set(JSON.parse(cached)); render(); } catch (e) {} }
    reload();
  }

  document.querySelector('.tabs').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-tab]');
    if (!b) return;
    // 分野のページを開いているときにノート帳のタブを押したら、まとまりの一覧へ戻る
    if (b.dataset.tab === tab && tab === 'list' && Glossary.isOpen()) { Glossary.close(); return; }
    if (b.dataset.tab === tab && tab === 'list' && Field.isOpen()) { Field.close(); return; }
    if (b.dataset.tab === tab) { reload(); return; }
    show(b.dataset.tab);
  });
  document.getElementById('reloadBtn').addEventListener('click', reload);

  // 別のアプリから戻ってきたとき、10分以上たっていたら読み直す
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && Date.now() - lastLoad > 10 * 60000) reload();
  });

  // アプリとしてインストール（まとめ通信と同じ対処）
  // 🪤Pixel の Chrome は「︙→ホーム画面に追加」で naoto-web.github.io の新しいアプリを「すでにインストールされています」と誤判定する
  //   ⇒ ページ側からインストール画面を直接呼ぶボタン（beforeinstallprompt）。合図が来たときだけ出す
  var installEvt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    installEvt = e;
    if (document.getElementById('installBtn')) return;
    var b = document.createElement('button');
    b.id = 'installBtn';
    b.className = 'install-btn';
    b.textContent = 'アプリとしてインストール';
    b.addEventListener('click', function () {
      if (!installEvt) return;
      installEvt.prompt();
      installEvt.userChoice.then(function (r) {
        if (r && r.outcome === 'accepted') { installEvt = null; b.textContent = 'インストール中…'; }
      }).catch(function () {});
    });
    document.querySelector('.top').insertBefore(b, document.getElementById('reloadBtn'));
  });
  window.addEventListener('appinstalled', function () {
    var b = document.getElementById('installBtn');
    if (b) b.remove();
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('./sw.js').catch(function () {}); });
  }

  start();
  return { reload: reload, show: show, render: render };
})();
