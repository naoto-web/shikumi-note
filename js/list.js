// list.js — 📚一覧＝まとまり → 分野 → お題。上の枠で検索（お題はその場で・ノートの本文はGASで探す）
var List = (function () {
  var openGroup = null;
  var openField = null;
  var q = '';
  var bodyHits = [];
  var timer = null;

  function topicRow(t, snippet) {
    return '<button class="row topic' + (t.has ? '' : ' none') + (snippet !== undefined ? ' hit' : '') + '" data-id="' + UI.esc(t.id) + '">' +
      '<span class="ic">' + UI.topicIcon(t) + '</span>' +
      '<span class="name">' + UI.esc(t.title) + (snippet !== undefined ? '<span class="snip">' + UI.esc(t.f) + (snippet ? '｜…' + UI.esc(snippet) + '…' : '') + '</span>' : '') + '</span>' +
      (t.saki && !t.has ? '<span class="saki">⏫先に</span>' : '') + '</button>';
  }

  function renderTree() {
    return Store.groups.map(function (g) {
      var all = [];
      g.fields.forEach(function (f) { all = all.concat(f.topics); });
      var c = Store.count(all);
      var isOpen = openGroup === g.name;
      var h = '<div class="group"><button class="row" data-group="' + UI.esc(g.name) + '"><span class="arrow">' + (isOpen ? '▼' : '▶') + '</span><span class="name">' + UI.esc(g.name) + '</span><span class="cnt">' + c.read + '／' + c.total + '</span></button>';
      if (isOpen) {
        h += g.fields.map(function (f) {
          var fc = Store.count(f.topics);
          var fo = openField === f.name;
          var off = Store.settings.off.indexOf(f.name) >= 0;
          var fh = '<div class="field"><button class="row" data-field="' + UI.esc(f.name) + '"><span class="arrow">›</span><span class="name">' + UI.esc(f.name) + (off ? '（オフ）' : '') + '</span><span class="cnt">' + fc.read + '／' + fc.total + '</span></button>';
          if (fo) {
            fh += f.topics.map(function (t) { return topicRow(t); }).join('');
            fh += '<div class="addrow"><button class="btn sub small" data-add="' + UI.esc(f.name) + '">＋ この分野にお題を足す</button></div>';
          }
          return fh + '</div>';
        }).join('');
      }
      return h + '</div>';
    }).join('');
  }

  function renderSearch() {
    var low = q.toLowerCase();
    var seen = {};
    var rows = [];
    Store.topics.forEach(function (t) {
      if (rows.length >= 60) return;
      if (t.title.toLowerCase().indexOf(low) >= 0 || t.f.toLowerCase().indexOf(low) >= 0) { seen[t.id] = true; rows.push(topicRow(t, '')); }
    });
    bodyHits.forEach(function (h) {
      var t = Store.byId[h.id];
      if (!t || seen[h.id] || h.where !== 'ノート') return;
      rows.push(topicRow(t, h.snippet || ''));
    });
    if (!rows.length) return '<div class="empty"><b>見つかりません</b>「' + UI.esc(q) + '」</div>';
    return '<div class="info">' + rows.length + '件</div><div class="group">' + rows.join('') + '</div>';
  }

  function render() {
    if (Field.isOpen()) { Field.render(); return; }
    document.getElementById('listBody').innerHTML = q ? renderSearch() : renderTree();
  }

  function askAdd(field) {
    UI.openSheet(
      '<div class="kind-line">' + UI.esc(field) + '</div><h2>お題を足す</h2>' +
      '<textarea id="addTitle" placeholder="例：◯◯はどうやって決まるのか"></textarea>' +
      '<label class="check"><input type="checkbox" id="addSaki" checked>次の回で先に読みたい</label>' +
      '<button class="btn wide" id="addSend" data-field-name="' + UI.esc(field) + '">足す</button>'
    );
  }

  function sendAdd(field) {
    var title = document.getElementById('addTitle').value.trim();
    if (!title) { UI.toast('お題を書いてください'); return; }
    var saki = document.getElementById('addSaki').checked;
    API.call('addOdai', { bunya: field, title: title, saki: saki }).then(function (res) {
      Store.addTopic(res.topic);
      UI.closeSheet();
      Main.render();
      UI.toast('足しました');
    }).catch(function (err) { UI.toast('足せませんでした：' + err.message); });
  }

  document.getElementById('listBody').addEventListener('click', function (e) {
    var el = e.target.closest('button');
    if (!el) return;
    if (el.dataset.group) { openGroup = openGroup === el.dataset.group ? null : el.dataset.group; openField = null; render(); }
    else if (el.dataset.field) Field.open(el.dataset.field);
    else if (el.dataset.add) askAdd(el.dataset.add);
    else if (el.dataset.id) Note.open(el.dataset.id);
  });

  document.getElementById('sheet').addEventListener('click', function (e) {
    if (e.target.id === 'addSend') sendAdd(e.target.dataset.fieldName);
  });

  document.getElementById('listQ').addEventListener('input', function (e) {
    q = e.target.value.trim();
    bodyHits = [];
    render();
    clearTimeout(timer);
    if (!q) return;
    var asked = q;
    timer = setTimeout(function () {
      API.call('search', { q: asked }).then(function (res) {
        if (asked !== q) return;
        bodyHits = res.hits || [];
        render();
      }).catch(function () {});
    }, 600);
  });

  return { render: render, askAdd: askAdd };
})();
