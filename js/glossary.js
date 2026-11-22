// glossary.js — 🔤用語集（11/22〜）
// ① ノートの文の中の用語（点線の下線）を押すと、その場に小さな説明が出る（ページは移らない）
// ② 用語集のページ＝ノート帳の一番上から開く。読みの順・検索つき・その言葉が出てくるノートへ行ける
var Glossary = (function () {
  var open_ = false;
  var q = '';
  var picked = null;
  var uses = {};
  var ROWS = [['あ', 'あいうえお'], ['か', 'かきくけこがぎぐげご'], ['さ', 'さしすせそざじずぜぞ'], ['た', 'たちつてとだぢづでど'], ['な', 'なにぬねの'],
    ['は', 'はひふへほばびぶべぼぱぴぷぺぽ'], ['ま', 'まみむめも'], ['や', 'やゆよ'], ['ら', 'らりるれろ'], ['わ', 'わをん']];

  function isOpen() { return open_; }

  function setView(on) {
    document.getElementById('glossBody').hidden = !on;
    document.getElementById('fieldBody').hidden = true;
    document.getElementById('listBody').hidden = on;
    document.querySelector('#view-list .search-row').hidden = on;
  }

  function rowOf(t) {
    var c = (t.y || t.w).charAt(0);
    // カタカナの読みは、ひらがなに直して行を決める
    if (c >= 'ァ' && c <= 'ヶ') c = String.fromCharCode(c.charCodeAt(0) - 0x60);
    for (var i = 0; i < ROWS.length; i++) if (ROWS[i][1].indexOf(c) >= 0) return ROWS[i][0];
    return '英数・その他';
  }

  function open(word) {
    // 分野のページを開いていたら、先に閉じる（戻ったときにノート帳の一覧が出るように）
    if (Field.isOpen()) Field.close();
    open_ = true;
    q = '';
    picked = word || null;
    setView(true);
    render();
    if (picked) { loadUses(picked); scrollToPicked(); } else window.scrollTo(0, 0);
  }

  function close() {
    open_ = false;
    setView(false);
    List.render();
  }

  function scrollToPicked() {
    setTimeout(function () {
      var el = document.querySelector('#glossList .gl.open');
      if (el) el.scrollIntoView({ block: 'center' });
    }, 30);
  }

  function loadUses(w) {
    if (uses[w]) return;
    API.call('term', { w: w }).then(function (res) { uses[w] = res.ids || []; if (open_ && picked === w) renderList(); }).catch(function () {});
  }

  function render() {
    document.getElementById('glossBody').innerHTML =
      '<button class="btn sub small" data-back>← ノート帳へ</button>' +
      '<h2 class="f-title">🔤 用語集</h2>' +
      '<p class="info">ノートに出てくる言葉の説明を集めています（' + Store.terms.length + '語）。ノートの中で点線の付いた言葉を押すと、その場で説明が出ます。</p>' +
      '<div class="search-row"><input id="glossQ" type="search" placeholder="言葉を探す" enterkeyhint="search"></div>' +
      '<div id="glossList"></div>';
    renderList();
  }

  function renderList() {
    var box = document.getElementById('glossList');
    if (!box) return;
    var low = q.toLowerCase();
    var list = Store.terms.filter(function (t) {
      return !low || t.w.toLowerCase().indexOf(low) >= 0 || (t.y || '').indexOf(low) >= 0 || t.d.toLowerCase().indexOf(low) >= 0;
    });
    if (!list.length) { box.innerHTML = '<div class="empty"><b>' + (Store.terms.length ? '見つかりません' : 'まだ言葉がありません') + '</b></div>'; return; }
    var html = '';
    var cur = null;
    list.forEach(function (t) {
      var r = rowOf(t);
      if (r !== cur) { html += (cur === null ? '' : '</div>') + '<div class="subhead">' + UI.esc(r) + '</div><div class="group">'; cur = r; }
      var isOpen = picked === t.w;
      html += '<div class="gl' + (isOpen ? ' open' : '') + '"><button class="gl-head" data-w="' + UI.esc(t.w) + '"><span class="w">' + UI.esc(t.w) + '</span>' + (t.y ? '<span class="y">' + UI.esc(t.y) + '</span>' : '') + '</button>' +
        '<div class="gl-d">' + UI.esc(t.d) + '</div>';
      if (isOpen) {
        var ids = uses[t.w];
        html += '<div class="gl-use">' + (t.f ? '<p class="info">分野：' + UI.esc(t.f) + '</p>' : '');
        if (!ids) html += '<p class="info">出てくるノートを探しています…</p>';
        else if (!ids.length) html += '<p class="info">この言葉が出てくるノートは、まだ届いていません。</p>';
        else html += '<p class="info">出てくるノート</p><div class="links">' + ids.map(function (id) {
          var tp = Store.byId[id];
          return tp ? '<button data-note="' + UI.esc(id) + '">' + UI.topicIcon(tp) + ' ' + UI.esc(tp.title) + '</button>' : '';
        }).join('') + '</div>';
        html += '</div>';
      }
      html += '</div>';
    });
    box.innerHTML = html + '</div>';
  }

  document.getElementById('glossBody').addEventListener('click', function (e) {
    var el = e.target.closest('button');
    if (!el) return;
    if (el.hasAttribute('data-back')) close();
    else if (el.dataset.w) { picked = picked === el.dataset.w ? null : el.dataset.w; if (picked) loadUses(picked); renderList(); }
    else if (el.dataset.note) Note.open(el.dataset.note);
  });
  document.getElementById('glossBody').addEventListener('input', function (e) {
    if (e.target.id !== 'glossQ') return;
    q = e.target.value.trim();
    renderList();
  });

  // ── 文の中の用語を押したときの小さな説明 ──
  function hidePop() { document.getElementById('termPop').hidden = true; }
  function showPop(w) {
    var t = Store.termMap[w];
    if (!t) return;
    var pop = document.getElementById('termPop');
    pop.innerHTML = '<div class="tp-head"><b>' + UI.esc(t.w) + '</b>' + (t.y ? '<span>' + UI.esc(t.y) + '</span>' : '') + '<button data-pop-close aria-label="閉じる">×</button></div>' +
      '<p>' + UI.esc(t.d) + '</p><button class="btn sub small" data-pop-go="' + UI.esc(t.w) + '">用語集で見る</button>';
    pop.hidden = false;
  }
  document.addEventListener('click', function (e) {
    var term = e.target.closest('.term');
    if (term) { showPop(term.getAttribute('data-term')); return; }
    var go = e.target.closest('[data-pop-go]');
    if (go) {
      var w = go.getAttribute('data-pop-go');
      hidePop();
      UI.closeSheet();
      Main.show('list');
      open(w);
      return;
    }
    if (e.target.closest('[data-pop-close]') || !e.target.closest('#termPop')) hidePop();
  });

  return { open: open, close: close, isOpen: isOpen, render: render };
})();
