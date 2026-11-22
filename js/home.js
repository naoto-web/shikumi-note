// home.js — 🏠今日＝まだ印を付けていないノート（新しい順）＋🔁前に読んだ1本＋進み具合
var Home = (function () {
  function card(n, review) {
    var lead = UI.plain((n.body && n.body.lead) || '');
    return '<button class="card' + (review ? ' review' : '') + '" data-id="' + UI.esc(n.id) + '">' +
      '<div class="meta"><span class="bunya">' + (review ? '🔁 前に読んだ1本・' : '') + UI.esc(n.bunya) + '</span><span class="time">' + UI.dateShort(n.date) + '</span></div>' +
      '<div class="title">' + UI.esc(n.title) + '</div>' +
      '<div class="lead">' + UI.esc(lead) + '</div></button>';
  }

  function render() {
    var c = Store.count(Store.topics);
    var pct = c.total ? Math.round(c.read / c.total * 1000) / 10 : 0;
    document.getElementById('progress').innerHTML =
      '<div class="nums"><span>読んだ <b>' + c.read.toLocaleString() + '</b> ／ ' + c.total.toLocaleString() + '</span><span>届いている ' + c.has.toLocaleString() + '本</span></div>' +
      '<div class="bar"><i style="width:' + pct + '%"></i></div>';

    var html = '';
    if (Store.home.length) {
      html += Store.home.map(function (n) { return card(n, false); }).join('');
    } else if (c.total) {
      html += '<div class="empty"><b>' + (c.has ? '全部読みました' : 'まだノートがありません') + '</b>毎朝5:30ごろに ' + Store.settings.honsu + '本届きます</div>';
    }
    if (Store.review && Store.review.mark) html += '<div class="subhead">忘れたころにもう一度</div>' + card(Store.review, true);
    document.getElementById('homeList').innerHTML = html;

    var badge = document.getElementById('homeBadge');
    badge.hidden = !Store.home.length;
    badge.textContent = Store.home.length;
  }

  document.getElementById('homeList').addEventListener('click', function (e) {
    var el = e.target.closest('[data-id]');
    if (el) Note.open(el.dataset.id);
  });

  return { render: render };
})();
