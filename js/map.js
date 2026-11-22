// map.js — 🗺業界＝業界マップ（形が「マップ」のお題）だけの一覧。調べものとしてすぐ引けるように別タブにしてある
var MapTab = (function () {
  function render() {
    var list = Store.topics.filter(function (t) { return t.kata === 'マップ'; });
    if (!list.length) {
      document.getElementById('mapBody').innerHTML = '<div class="empty"><b>まだありません</b></div>';
      return;
    }
    var has = list.filter(function (t) { return t.has; }).length;
    var html = '<p class="info">業界ごとの大きさ・お金の流れ・大手の会社。毎朝1本ずつ届きます（届いている ' + has + '／' + list.length + '）。まだの業界は、押すと「先に読みたい」に入れられます。</p>';
    html += '<div class="group">' + list.map(function (t) {
      return '<button class="row topic maprow' + (t.has ? '' : ' none') + '" data-id="' + UI.esc(t.id) + '">' +
        '<span class="ic">' + UI.topicIcon(t) + '</span><span class="name">' + UI.esc(t.title.replace(/^業界マップ：/, '')) + '</span>' +
        (t.saki && !t.has ? '<span class="saki">⏫先に</span>' : '') + '</button>';
    }).join('') + '</div>';
    document.getElementById('mapBody').innerHTML = html;
  }

  document.getElementById('mapBody').addEventListener('click', function (e) {
    var el = e.target.closest('[data-id]');
    if (el) Note.open(el.dataset.id);
  });

  return { render: render };
})();
