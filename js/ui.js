// ui.js — 画面の共通部品（文字の無害化・トースト・シート）と、画面全体で持つデータ（Store）
var UI = (function () {
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // "2026-11-23 05:31:00" → 「11/23」
  function dateShort(s) {
    var m = String(s || '').match(/^\d{4}-(\d{2})-(\d{2})/);
    return m ? Number(m[1]) + '/' + Number(m[2]) : '';
  }

  var toastTimer;
  function toast(msg) {
    var el = document.getElementById('toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 2400);
  }

  function openSheet(html) {
    var sh = document.getElementById('sheet');
    sh.innerHTML = '<button class="close" data-close aria-label="閉じる">×</button>' + html;
    sh.hidden = false;
    document.getElementById('sheetBack').hidden = false;
    sh.scrollTop = 0;
    return sh;
  }
  function closeSheet() {
    document.getElementById('sheet').hidden = true;
    document.getElementById('sheetBack').hidden = true;
  }
  document.addEventListener('click', function (e) {
    if (e.target.id === 'sheetBack' || e.target.hasAttribute('data-close')) closeSheet();
  });

  var MARK_ICON = { 'わかった': '✅', 'もっと知りたい': '🔍', '興味なし': '🙅' };
  function topicIcon(t) {
    if (t.mark) return MARK_ICON[t.mark] || '';
    return t.has ? '📄' : '・';
  }

  return { esc: esc, dateShort: dateShort, toast: toast, openSheet: openSheet, closeSheet: closeSheet, topicIcon: topicIcon };
})();

// 画面全体で持つデータ。GAS の init の結果をここに入れて、各タブはここから描く
var Store = (function () {
  var s = { topics: [], byId: {}, groups: [], home: [], review: null, settings: { honsu: 3, honsen: [], off: [] }, notes: {}, today: '' };

  // GASからは [id, まとまり, 分野, お題, 形, 印, ノートあり, 先に読みたい, ひとこと, 深掘りメモあり] の並びで届く
  function toTopic(a) {
    return { id: a[0], g: a[1], f: a[2], title: a[3], kata: a[4], mark: a[5] || '', has: !!a[6], saki: !!a[7], hito: a[8] || '', memo: !!a[9] };
  }

  function rebuild() {
    s.byId = {};
    s.groups = [];
    var gmap = {};
    s.topics.forEach(function (t) {
      s.byId[t.id] = t;
      var g = gmap[t.g];
      if (!g) { g = gmap[t.g] = { name: t.g, fields: [], fmap: {} }; s.groups.push(g); }
      var f = g.fmap[t.f];
      if (!f) { f = g.fmap[t.f] = { name: t.f, topics: [] }; g.fields.push(f); }
      f.topics.push(t);
    });
  }

  function set(res) {
    s.topics = res.topics.map(toTopic);
    s.home = res.home || [];
    s.review = res.review || null;
    s.settings = res.settings || s.settings;
    s.today = res.today || '';
    s.notes = {};
    s.home.forEach(function (n) { s.notes[n.id] = n; });
    if (s.review) s.notes[s.review.id] = s.review;
    rebuild();
  }

  function addTopic(a) {
    s.topics.push(toTopic(a));
    rebuild();
  }

  function count(list) {
    var c = { total: list.length, has: 0, read: 0 };
    list.forEach(function (t) { if (t.has) c.has++; if (t.mark) c.read++; });
    return c;
  }

  s.set = set;
  s.addTopic = addTopic;
  s.count = count;
  return s;
})();
