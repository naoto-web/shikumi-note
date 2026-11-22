// more.js — 🔍もっと知りたい＝印を付けたお題の一覧（深掘りの順番待ち）。深掘り済みには📝
var More = (function () {
  function render() {
    var list = Store.topics.filter(function (t) { return t.mark === 'もっと知りたい'; });
    var badge = document.getElementById('moreBadge');
    var waiting = list.filter(function (t) { return !t.memo; }).length;
    badge.hidden = !waiting;
    badge.textContent = waiting;

    if (!list.length) {
      document.getElementById('moreBody').innerHTML = '<div class="empty"><b>まだありません</b>ノートの下の「🔍 もっと知りたい」を押すと、ここにたまります</div>';
      return;
    }
    document.getElementById('moreBody').innerHTML =
      '<p class="info">クロコに「仕組みの深掘り」と言うと、ここの一覧から1つずつ話します。話した内容はノートに📝で書き足されます。</p>' +
      '<div class="list">' + list.map(function (t) {
        return '<button class="card" data-id="' + UI.esc(t.id) + '">' +
          '<div class="meta"><span class="bunya">' + UI.esc(t.f) + '</span>' + (t.memo ? '<span class="time">📝 深掘り済み</span>' : '') + '</div>' +
          '<div class="title">' + UI.esc(t.title) + '</div>' +
          (t.hito ? '<div class="lead">知りたいこと：' + UI.esc(t.hito) + '</div>' : '') + '</button>';
      }).join('') + '</div>';
  }

  document.getElementById('moreBody').addEventListener('click', function (e) {
    var el = e.target.closest('[data-id]');
    if (el) Note.open(el.dataset.id);
  });

  return { render: render };
})();
