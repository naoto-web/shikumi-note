// kaisha.js — 🏢会社一覧＝業界マップの「大手の会社」の表を全業界ぶん集めて、売上・利益で並べ替える（要件定義§5.3）
// 新しく書くものは無い。GASの init が返す kaisha（業界ごとの表の中身）を、ここで数字に直して並べる
var Kaisha = (function () {
  var CHO = 1e12;
  var SORTS = [['uri', '売上'], ['rieki', '利益'], ['ritsu', '利益の割合']];
  var sort = 'uri';
  var filter = '';
  var list = [];
  var byKey = {};

  // 「5.2兆円」「1兆2,345億円」「▲158億円」→ 円。読めないもの（未確認など）は null
  function yen(s) {
    var t = UI.plain(s).replace(/[,，\s約]/g, '');
    var neg = /^[▲△\-−]/.test(t);
    var v = 0;
    var hit = false;
    [['兆', 1e12], ['億', 1e8], ['万', 1e4]].forEach(function (u) {
      var m = t.match(new RegExp('(\\d+(?:\\.\\d+)?)' + u[0]));
      if (m) { v += Number(m[1]) * u[1]; hit = true; }
    });
    return hit ? (neg ? -v : v) : null;
  }

  // 「20.5％」「▲2.3％」→ 数字
  function pct(s) {
    var m = UI.plain(s).replace(/[,，\s約]/g, '').match(/^([▲△\-−]?)(\d+(?:\.\d+)?)[％%]/);
    return m ? (m[1] ? -1 : 1) * Number(m[2]) : null;
  }

  // 同じ会社を1社にまとめるための名前＝カッコ書き（部門の名前など）と「株式会社」を外す
  function baseName(name) {
    return String(name).replace(/[（(][^）)]*[）)]/g, '').replace(/株式会社|\s/g, '');
  }

  // 年度の注記から、その会社の決算期を拾う（「楽天は2025年12月期」）。会社ごとに書いていなければ、注記の最初の年度
  function nendo(note, name) {
    var re = /\d{4}年\d{1,2}月期|\d{4}年度/;
    var parts = String(note || '').split('。');
    var key = baseName(name);
    for (var len = key.length; len >= 2; len--) {
      var head = key.substring(0, len);
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].indexOf(head) < 0) continue;
        var m = parts[i].match(re);
        if (m) return m[0];
      }
    }
    var first = String(note || '').match(re);
    return first ? first[0] : '';
  }

  function num(v) { return v == null ? -Infinity : v; }

  function build() {
    list = [];
    byKey = {};
    (Store.kaisha || []).forEach(function (g) {
      (g.rows || []).forEach(function (r) {
        var name = UI.plain(r[0]).trim();
        if (!name) return;
        var e = {
          name: name, id: g.id, gyokai: g.gyokai, note: g.note, nendo: nendo(g.note, name),
          uriText: UI.plain(r[1]), riekiText: UI.plain(r[2]), ritsuText: UI.plain(r[3]), hito: UI.plain(r[4]),
          uri: yen(r[1]), rieki: yen(r[2]), ritsu: pct(r[3])
        };
        var k = baseName(name);
        var c = byKey[k];
        if (!c) { c = byKey[k] = { key: k, entries: [] }; list.push(c); }
        c.entries.push(e);
      });
    });
    // 同じ会社が2つの業界に出てきたら、売上が大きいほう（＝会社全体に近いほう）を表に出す
    list.forEach(function (c) {
      c.entries.sort(function (a, b) { return num(b.uri) < num(a.uri) ? -1 : num(b.uri) > num(a.uri) ? 1 : 0; });
    });
  }

  // 一覧に出す数字＝業界で絞っているときは、その業界の数字
  function shown(c) {
    if (filter) {
      for (var i = 0; i < c.entries.length; i++) { if (c.entries[i].gyokai === filter) return c.entries[i]; }
    }
    return c.entries[0];
  }

  // 「1兆円の0.98倍」「1兆円の48倍」
  function bai(v) {
    if (v == null || v <= 0) return '';
    var x = v / CHO;
    if (x < 0.01) return '1兆円の100分の1より小さい';
    var t = x >= 10 ? String(Math.round(x)) : x >= 1 ? x.toFixed(1) : x.toFixed(2);
    return '1兆円の' + t + '倍';
  }

  function figHtml(e) {
    var big, small, v;
    if (sort === 'rieki') { big = e.riekiText; small = '売上 ' + e.uriText; v = e.rieki; }
    else if (sort === 'ritsu') { big = e.ritsuText; small = '利益 ' + e.riekiText; v = e.ritsu; }
    else { big = e.uriText; small = bai(e.uri); v = e.uri; }
    return '<span class="fig' + (v != null && v < 0 ? ' neg' : '') + (v == null ? ' na' : '') + '"><b>' + UI.esc(big || '未確認') + '</b>' +
      (small ? '<small>' + UI.esc(small) + '</small>' : '') + '</span>';
  }

  function html() {
    build();
    if (!list.length) {
      return '<div class="empty"><b>まだありません</b>業界マップが届くと、その表の会社がここに集まります</div>';
    }
    var gyokai = [];
    (Store.kaisha || []).forEach(function (g) { if (gyokai.indexOf(g.gyokai) < 0) gyokai.push(g.gyokai); });
    if (filter && gyokai.indexOf(filter) < 0) filter = '';

    var rows = list.filter(function (c) {
      return !filter || c.entries.some(function (e) { return e.gyokai === filter; });
    }).map(function (c) { return { c: c, e: shown(c) }; });
    rows.sort(function (a, b) { return num(b.e[sort]) < num(a.e[sort]) ? -1 : num(b.e[sort]) > num(a.e[sort]) ? 1 : 0; });

    var over = list.filter(function (c) { return num(c.entries[0].uri) >= CHO; }).length;
    var h = '<p class="info">業界マップの「大手の会社」を集めた一覧。マップが届くたびに増えます（いま ' + list.length + '社・' + gyokai.length + '業界）。売上1兆円以上は ' + over + '社。</p>';
    h += '<div class="seg co-sort">' + SORTS.map(function (s) {
      return '<button data-sort="' + s[0] + '"' + (sort === s[0] ? ' class="on"' : '') + '>' + s[1] + '</button>';
    }).join('') + '</div>';
    h += '<select id="coFilter" class="co-filter"><option value="">すべての業界</option>' + gyokai.map(function (g) {
      return '<option value="' + UI.esc(g) + '"' + (filter === g ? ' selected' : '') + '>' + UI.esc(g) + '</option>';
    }).join('') + '</select>';
    h += '<div class="group">' + rows.map(function (x, i) {
      var e = x.e;
      var sub = x.c.entries.map(function (y) { return y.gyokai; }).filter(function (g, j, a) { return a.indexOf(g) === j; }).join('・');
      return '<button class="row co" data-co="' + UI.esc(x.c.key) + '">' +
        '<span class="no">' + (i + 1) + '</span>' +
        '<span class="name"><b>' + UI.esc(e.name) + '</b><small>' + UI.esc(sub) + (e.nendo ? '・' + UI.esc(e.nendo) : '') + '</small></span>' +
        figHtml(e) + '</button>';
    }).join('') + '</div>';
    return h;
  }

  function figRows(e) {
    var b = bai(e.uri);
    return '<div class="tbl-wrap"><table><tbody>' +
      '<tr><td>売上</td><td>' + UI.esc(e.uriText || '未確認') + (b ? '（' + UI.esc(b) + '）' : '') + '</td></tr>' +
      '<tr><td>利益</td><td>' + UI.esc(e.riekiText || '未確認') + '</td></tr>' +
      '<tr><td>利益の割合</td><td>' + UI.esc(e.ritsuText || '未確認') + '</td></tr>' +
      '</tbody></table></div>';
  }

  // 会社を押したとき＝数字・一言・年度の注記・出てくる業界マップへのボタン
  function open(key) {
    var c = byKey[key];
    if (!c) return;
    var main = shown(c);
    var h = '<div class="kind-line">🏢 会社一覧 › ' + UI.esc(main.gyokai) + '</div><h2>' + UI.esc(main.name) + '</h2>' + figRows(main);
    if (main.hito) h += '<p>' + UI.esc(main.hito) + '</p>';
    if (main.note) h += '<p class="src">' + UI.esc(main.note) + '</p>';
    c.entries.forEach(function (e) {
      if (e === main) return;
      h += '<h3>' + UI.esc(e.gyokai) + ' のマップでの数字</h3>' + (e.name !== main.name ? '<p class="src">' + UI.esc(e.name) + '</p>' : '') + figRows(e) +
        (e.hito ? '<p>' + UI.esc(e.hito) + '</p>' : '') + (e.note ? '<p class="src">' + UI.esc(e.note) + '</p>' : '');
    });
    var ids = [];
    c.entries.forEach(function (e) { if (ids.indexOf(e.id) < 0) ids.push(e.id); });
    h += '<h3>🗺 出てくる業界マップ</h3><div class="links">' + ids.map(function (id) {
      var t = Store.byId[id];
      return t ? '<button data-link="' + UI.esc(id) + '">' + UI.topicIcon(t) + ' ' + UI.esc(t.title) + '</button>' : '';
    }).join('') + '</div>';
    // 「有名企業の研究」に同じ会社のお題があれば、そこへも行ける（まだ書かれていなければ「先に読みたい」を押せる）
    var ken = Store.topics.filter(function (t) { return t.kata === '企業' && c.key.toLowerCase().indexOf(String(t.title).toLowerCase()) >= 0; });
    if (ken.length) {
      h += '<h3>🏢 会社の研究ノート</h3><div class="links">' + ken.map(function (t) {
        return '<button data-link="' + UI.esc(t.id) + '">' + UI.topicIcon(t) + ' ' + UI.esc(t.title) + (t.has ? '' : '<small>まだ</small>') + '</button>';
      }).join('') + '</div>';
    }
    UI.openSheet(h);
  }

  // 業界タブの中の押しもの。自分の持ち分を処理したら true
  function click(e) {
    var s = e.target.closest('[data-sort]');
    if (s) { sort = s.dataset.sort; MapTab.render(); return true; }
    var co = e.target.closest('[data-co]');
    if (co) { open(co.dataset.co); return true; }
    return false;
  }

  function change(e) {
    if (e.target.id !== 'coFilter') return;
    filter = e.target.value;
    MapTab.render();
  }

  return { html: html, click: click, change: change };
})();
