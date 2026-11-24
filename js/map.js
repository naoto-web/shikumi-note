// map.js — 🗺業界＝業界マップ（形が「マップ」のお題）だけの一覧。調べものとしてすぐ引けるように別タブにしてある
// 上の切り替えで「🏢 会社一覧」（kaisha.js・マップの表の会社を全業界ぶん集めたもの）も出せる
var MapTab = (function () {
  var sub = 'map';

  function mapHtml() {
    var list = Store.topics.filter(function (t) { return t.kata === 'マップ'; });
    if (!list.length) return '<div class="empty"><b>まだありません</b></div>';
    var has = list.filter(function (t) { return t.has; }).length;
    var html = '<p class="info">業界ごとの大きさ・お金の流れ・大手の会社。毎朝1本ずつ届きます（届いている ' + has + '／' + list.length + '）。まだの業界は、押すと「先に読みたい」に入れられます。</p>';
    html += '<div class="group">' + list.map(function (t) {
      return '<button class="row topic maprow' + (t.has ? '' : ' none') + '" data-id="' + UI.esc(t.id) + '">' +
        '<span class="ic">' + UI.topicIcon(t) + '</span><span class="name">' + UI.esc(t.title.replace(/^業界マップ：/, '')) + '</span>' +
        (t.saki && !t.has ? '<span class="saki">⏫先に</span>' : '') + '</button>';
    }).join('') + '</div>';
    return html;
  }

  function render() {
    var head = '<div class="seg subtabs">' +
      '<button data-sub="map"' + (sub === 'map' ? ' class="on"' : '') + '>🗺 業界マップ</button>' +
      '<button data-sub="kaisha"' + (sub === 'kaisha' ? ' class="on"' : '') + '>🏢 会社一覧</button></div>';
    document.getElementById('mapBody').innerHTML = head + (sub === 'kaisha' ? Kaisha.html() : mapHtml());
  }

  document.getElementById('mapBody').addEventListener('click', function (e) {
    var s = e.target.closest('[data-sub]');
    if (s) { sub = s.dataset.sub; render(); return; }
    if (sub === 'kaisha' && Kaisha.click(e)) return;
    var el = e.target.closest('[data-id]');
    if (el) Note.open(el.dataset.id);
  });
  document.getElementById('mapBody').addEventListener('change', function (e) { Kaisha.change(e); });

  return { render: render };
})();
