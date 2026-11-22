// note.js — ノートの全文（下から出るシート）と、3つの印・先に読みたい・自分のメモ
var Note = (function () {
  var cur = null;
  // そのノートでもう押せるようにした用語（1本のノートで最初の1回だけ押せるようにする）。bodyHtml のたびに空にする
  var seen = {};

  function sectionHtml(sec) {
    var h = '<h3>' + UI.esc(sec.h || '') + '</h3>';
    if (sec.chart) h += Chart.html(sec.chart);
    if (sec.text) h += '<p>' + UI.rich(sec.text, seen) + '</p>';
    if (sec.items && sec.items.length) {
      var tag = sec.ol ? 'ol' : 'ul';
      h += '<' + tag + '>' + sec.items.map(function (x) { return '<li>' + UI.rich(x, seen) + '</li>'; }).join('') + '</' + tag + '>';
    }
    // 表（🗺業界マップの大手の一覧など）＝横にはみ出すときは表だけ横にスクロール
    if (sec.table && sec.table.rows && sec.table.rows.length) {
      h += '<div class="tbl-wrap"><table><thead><tr>' + (sec.table.head || []).map(function (x) { return '<th>' + UI.esc(x) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        sec.table.rows.map(function (r) { return '<tr>' + (r || []).map(function (x) { return '<td>' + UI.rich(x, seen) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
    }
    if (sec.note) h += '<p class="src">' + UI.esc(sec.note) + '</p>';
    return h;
  }

  function linksHtml(ids) {
    var list = (ids || []).map(function (id) { return Store.byId[id]; }).filter(Boolean);
    if (!list.length) return '';
    return '<h3>🔗 つながるお題</h3><div class="links">' + list.map(function (t) {
      return '<button data-link="' + UI.esc(t.id) + '">' + UI.topicIcon(t) + ' ' + UI.esc(t.title) + (t.has ? '' : '<small>まだ</small>') + '</button>';
    }).join('') + '</div>';
  }

  function sourcesHtml(b) {
    var src = (b.sources || []).map(function (x) {
      var safe = /^https?:\/\//.test(x.u || '');
      return '<li>' + (safe ? '<a href="' + UI.esc(x.u) + '" target="_blank" rel="noopener">' + UI.esc(x.t || x.u) + '</a>' : UI.esc(x.t || '')) + '</li>';
    }).join('');
    if (!src && !b.asof) return '';
    return '<h3>📚 出典</h3><div class="src">' + (b.asof ? '<p>' + UI.esc(b.asof) + '</p>' : '') + (src ? '<ul>' + src + '</ul>' : '') + '</div>';
  }

  // ノートの中身（見出しと印のボタンを除く）＝シートでも、分野のページ（章として読む）でも同じものを使う
  function bodyHtml(n) {
    var b = n.body || {};
    seen = {};
    return (b.lead ? '<div class="lead-box"><span class="lb">💡 一言でいうと</span>' + UI.rich(b.lead, seen) + '</div>' : '') +
      (b.sections || []).map(sectionHtml).join('') +
      (n.memo ? '<h3>📝 深掘りメモ</h3><div class="memo">' + UI.esc(n.memo) + '</div>' : '') +
      (n.mine ? '<h3>✍️ 自分のメモ<span class="mine-tag' + (n.mineDone ? ' done' : '') + '">' + (n.mineDone ? '✅ 本文に反映済み' : '次の朝、本文に組み込みます') + '</span></h3><div class="memo mine">' + UI.esc(n.mine) + '</div>' : '') +
      linksHtml(b.links) + sourcesHtml(b);
  }

  function marksHtml(n) {
    function b(mark, label) { return '<button data-mark="' + mark + '"' + (n.mark === mark ? ' class="on"' : '') + '>' + label + '</button>'; }
    return '<div class="marks">' + b('わかった', '✅ わかった') + b('もっと知りたい', '🔍 もっと知りたい') + b('興味なし', '🙅 興味なし') + '</div>' +
      (n.mark === 'もっと知りたい' && n.hito ? '<div class="hito-line">知りたいこと：' + UI.esc(n.hito) + '</div>' : '') +
      '<div class="hito-box" id="hitoBox" hidden><textarea id="hitoText" placeholder="どこが知りたい？（書かなくてもOK）"></textarea><button class="btn" data-hito-send>これで入れる</button></div>' +
      '<details class="mine-box"><summary>✍️ 自分のメモを書く</summary><textarea id="mineText" placeholder="ほかで知ったこと、自分の言葉でのまとめ、気づいたこと">' + UI.esc(n.mine || '') + '</textarea>' +
      '<button class="btn sub" data-mine-save>メモを保存</button><p class="info">書いたメモは、次の朝にクロコがノートの本文に組み込みます（疑問を書けば、調べて答えを足します）。書いたメモ自体も下に残ります。</p></details>';
  }

  function render(n) {
    cur = n;
    UI.openSheet(
      '<div class="kind-line">' + UI.esc(n.matomari) + ' › ' + UI.esc(n.bunya) + (n.review ? '　🔁 前に読んだ1本' : '') + '</div>' +
      '<h2>' + UI.esc(n.title) + '</h2>' + bodyHtml(n) + marksHtml(n)
    );
  }

  function open(id) {
    var t = Store.byId[id];
    if (!t) return;
    if (!t.has) { openEmpty(t); return; }
    if (Store.notes[id]) { render(Store.notes[id]); return; }
    UI.openSheet('<h2>' + UI.esc(t.title) + '</h2><p class="info">読み込んでいます…</p>');
    API.call('note', { id: id }).then(function (res) {
      Store.notes[id] = res.note;
      render(res.note);
    }).catch(function (err) { UI.toast('読めませんでした：' + err.message); UI.closeSheet(); });
  }

  // まだノートが無いお題＝先に読みたい を押せる
  function openEmpty(t) {
    cur = null;
    UI.openSheet(
      '<div class="kind-line">' + UI.esc(t.g) + ' › ' + UI.esc(t.f) + '</div>' +
      '<h2>' + UI.esc(t.title) + '</h2>' +
      '<p class="info">まだノートがありません。毎朝 ' + Store.settings.honsu + '本ずつ届きます。</p>' +
      '<button class="btn wide' + (t.saki ? ' on' : '') + '" data-saki="' + UI.esc(t.id) + '">' + (t.saki ? '⏫ 先に読みたい（入れてある・押すと外す）' : '⏫ 先に読みたい') + '</button>'
    );
  }

  function sendMark(mark, hito) {
    var n = cur;
    if (!n) return;
    var t = Store.byId[n.id];
    var before = { mark: n.mark, hito: n.hito };
    n.mark = mark; n.hito = hito || '';
    if (t) { t.mark = mark; t.hito = n.hito; }
    Store.home = Store.home.filter(function (x) { return x.id !== n.id; });
    if (!mark && !n.review) Store.home.unshift(n);
    UI.closeSheet();
    Main.render();
    UI.toast(mark ? '「' + mark + '」に入れました' : '印を外しました');
    API.call('mark', { id: n.id, mark: mark, hito: n.hito }).catch(function (err) {
      n.mark = before.mark; n.hito = before.hito;
      if (t) { t.mark = before.mark; t.hito = before.hito; }
      UI.toast('入れられませんでした：' + err.message);
      Main.reload();
    });
  }

  function saveMine() {
    var n = cur;
    if (!n) return;
    var text = document.getElementById('mineText').value.trim();
    var before = n.mine;
    n.mine = text;
    n.mineDone = false;
    render(n);
    Main.render();
    UI.toast('メモを保存しました');
    API.call('myMemo', { id: n.id, text: text }).catch(function (err) { n.mine = before; UI.toast('保存できませんでした：' + err.message); });
  }

  document.getElementById('sheet').addEventListener('click', function (e) {
    var el = e.target.closest('button');
    if (!el) return;
    if (el.dataset.mark !== undefined) {
      var mark = el.dataset.mark;
      if (cur && cur.mark === mark) { sendMark('', ''); return; }
      if (mark === 'もっと知りたい') {
        var box = document.getElementById('hitoBox');
        box.hidden = false;
        document.getElementById('hitoText').value = cur ? (cur.hito || '') : '';
        box.scrollIntoView({ block: 'nearest' });
        return;
      }
      sendMark(mark, '');
    } else if (el.hasAttribute('data-hito-send')) {
      sendMark('もっと知りたい', document.getElementById('hitoText').value.trim());
    } else if (el.hasAttribute('data-mine-save')) {
      saveMine();
    } else if (el.dataset.link) {
      open(el.dataset.link);
    } else if (el.dataset.saki) {
      var t = Store.byId[el.dataset.saki];
      if (!t) return;
      t.saki = !t.saki;
      openEmpty(t);
      Main.render();
      UI.toast(t.saki ? '次の回で先に届きます' : '外しました');
      API.call('saki', { id: t.id, on: t.saki }).catch(function (err) { t.saki = !t.saki; UI.toast('入れられませんでした：' + err.message); Main.render(); });
    }
  });

  return { open: open, bodyHtml: bodyHtml };
})();
