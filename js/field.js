// field.js — 分野のページ＝その分野の「まとめ」＋ノートを章として上から通して読む（11/22〜）
// ノート帳（list.js）で分野を押すと開く。届いているノートは、その場で開いて続けて読める
var Field = (function () {
  var cur = null;
  var data = null;
  var opened = {};

  function isOpen() { return !!cur; }

  function setView(on) {
    document.getElementById('fieldBody').hidden = !on;
    document.getElementById('listBody').hidden = on;
    document.querySelector('#view-list .search-row').hidden = on;
  }

  function open(name) {
    cur = name;
    data = null;
    opened = {};
    setView(true);
    window.scrollTo(0, 0);
    render();
    API.call('field', { bunya: name }).then(function (res) {
      if (cur !== name) return;
      data = res;
      res.notes.forEach(function (n) { Store.notes[n.id] = n; });
      render();
    }).catch(function (err) { UI.toast('読めませんでした：' + err.message); });
  }

  function close() {
    cur = null;
    setView(false);
    List.render();
  }

  function topicsInOrder() {
    var list = Store.topics.filter(function (t) { return t.f === cur; });
    var order = (data && data.matome && data.matome.body && data.matome.body.order) || (data && data.order) || [];
    var pos = {};
    order.forEach(function (id, i) { pos[id] = i; });
    return list.slice().sort(function (a, b) {
      var pa = (a.id in pos) ? pos[a.id] : 9999;
      var pb = (b.id in pos) ? pos[b.id] : 9999;
      return pa - pb;
    });
  }

  function matomeHtml() {
    var m = data && data.matome;
    if (!m) return '<div class="matome empty-m">この分野のまとめは、ノートが2本以上たまると、クロコが書きます。</div>';
    var b = m.body || {};
    var h = '<div class="matome"><div class="m-head">🧭 この分野のまとめ<span>' + UI.dateShort(m.updated) + ' 更新</span></div>';
    if (b.points && b.points.length) h += '<ul>' + b.points.map(function (x) { return '<li>' + UI.esc(x) + '</li>'; }).join('') + '</ul>';
    // まとめの中のグラフ（その分野の全体像が一目で分かるものを1〜2個）
    (b.charts || []).slice(0, 2).forEach(function (c) {
      var g = Chart.html(c.chart);
      if (!g) return;
      h += '<h4>' + UI.esc(c.h || '🥧 内訳') + '</h4><div class="m-chart">' + g + (c.note ? '<p class="src">' + UI.esc(c.note) + '</p>' : '') + '</div>';
    });
    if (b.numbers && b.numbers.length) {
      h += '<h4>📏 基準になる数字</h4><dl>' + b.numbers.map(function (x) { return '<dt>' + UI.esc(x.l) + '</dt><dd>' + UI.esc(x.v) + '</dd>'; }).join('') + '</dl>';
    }
    if (b.terms && b.terms.length) {
      h += '<h4>🔤 出てくる言葉</h4><dl>' + b.terms.map(function (x) { return '<dt>' + UI.esc(x.w) + '</dt><dd>' + UI.esc(x.d) + '</dd>'; }).join('') + '</dl>';
    }
    return h + '</div>';
  }

  function render() {
    if (!cur) return;
    var topics = topicsInOrder();
    var c = Store.count(topics);
    var allOpen = topics.filter(function (t) { return t.has; }).every(function (t) { return opened[t.id]; });
    var h = '<button class="btn sub small" data-back>← ノート帳へ</button>' +
      '<h2 class="f-title">' + UI.esc(cur) + '</h2>' +
      '<p class="info">届いている ' + c.has + '本／全 ' + c.total + '本・読んだ ' + c.read + '本</p>' +
      (data ? matomeHtml() : '<p class="info">読み込んでいます…</p>');
    if (c.has) h += '<button class="btn sub small" data-all>' + (allOpen ? '全部とじる' : '全部ひらいて通して読む') + '</button>';
    h += '<div class="chapter">' + topics.map(function (t, i) {
      var n = Store.notes[t.id];
      if (!t.has) {
        return '<button class="art none" data-empty="' + UI.esc(t.id) + '"><span class="no">' + (i + 1) + '</span><span class="name">' + UI.esc(t.title) + '</span>' + (t.saki ? '<span class="saki">⏫先に</span>' : '<span class="saki dim">まだ</span>') + '</button>';
      }
      var isOpen = opened[t.id] && n;
      return '<div class="art' + (isOpen ? ' open' : '') + '"><button class="art-head" data-toggle="' + UI.esc(t.id) + '"><span class="no">' + (i + 1) + '</span><span class="name">' + UI.esc(t.title) + '</span><span class="ic">' + UI.topicIcon(t) + '</span></button>' +
        (isOpen ? '<div class="art-body">' + Note.bodyHtml(n) + '<button class="btn sub small" data-sheet="' + UI.esc(t.id) + '">印を付ける・メモを書く</button></div>' : '') + '</div>';
    }).join('') + '</div>';
    h += '<div class="addrow2"><button class="btn sub small" data-add="' + UI.esc(cur) + '">＋ この分野にお題を足す</button></div>';
    document.getElementById('fieldBody').innerHTML = h;
  }

  document.getElementById('fieldBody').addEventListener('click', function (e) {
    var el = e.target.closest('button');
    if (!el) return;
    if (el.hasAttribute('data-back')) close();
    else if (el.hasAttribute('data-all')) {
      var topics = topicsInOrder().filter(function (t) { return t.has; });
      var allOpen = topics.every(function (t) { return opened[t.id]; });
      topics.forEach(function (t) { opened[t.id] = !allOpen; });
      render();
    }
    else if (el.dataset.toggle) { opened[el.dataset.toggle] = !opened[el.dataset.toggle]; render(); }
    else if (el.dataset.sheet) Note.open(el.dataset.sheet);
    else if (el.dataset.empty) Note.open(el.dataset.empty);
    else if (el.dataset.link) Note.open(el.dataset.link);
    else if (el.dataset.add) List.askAdd(el.dataset.add);
  });

  return { open: open, close: close, render: render, isOpen: isOpen };
})();
