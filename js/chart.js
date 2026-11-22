// chart.js — ノートの中の円グラフ（内訳を見せる用・11/22）
// 本文JSONの sections に { "h": "…", "chart": { "type": "pie", "unit": "兆円", "items": [{ "l": "社会保障", "v": 39.1 }] } } と書くと出る
// 色は決まった順に使う（検査済みの6色＋「その他」は灰色）。7つ目以降の項目は「その他」にまとめる
// 色だけに頼らない＝下に必ず「名前・値・割合」の一覧を出す。円か一覧の行を押すと、その項目だけ目立つ
var Chart = (function () {
  var COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'];
  var OTHER = '#9a9891';
  var seq = 0;

  // 小数1けたでそろえる（9 → 9.0）。全部が整数のときだけ小数なし
  var digits = 1;
  function fmt(v, d) {
    var k = d === undefined ? digits : d;
    return (Math.round(v * 10) / 10).toLocaleString('ja-JP', { minimumFractionDigits: k, maximumFractionDigits: 1 });
  }

  function prepare(items) {
    // p＝資料に載っている割合（あればそれを出す。無ければ値から計算する）
    var list = (items || []).filter(function (x) { return x && Number(x.v) > 0; }).map(function (x) { return { l: String(x.l), v: Number(x.v), p: (x.p === undefined || x.p === null) ? null : Number(x.p) }; });
    var other = null;
    var main = [];
    list.forEach(function (x) {
      if (/^その他|^そのほか/.test(x.l)) { other = other || { l: 'その他', v: 0 }; other.v += x.v; }
      else main.push(x);
    });
    if (main.length > COLORS.length) {
      main.slice(COLORS.length).forEach(function (x) { other = other || { l: 'その他', v: 0 }; other.v += x.v; });
      main = main.slice(0, COLORS.length);
    }
    main.forEach(function (x, i) { x.c = COLORS[i]; });
    if (other) { other.c = OTHER; main.push(other); }
    return main;
  }

  function point(cx, cy, r, a) {
    return (cx + r * Math.sin(a)).toFixed(2) + ' ' + (cy - r * Math.cos(a)).toFixed(2);
  }

  // 12時の位置から時計回り。真ん中をくり抜いて、合計を入れる
  function arc(cx, cy, r1, r0, a0, a1) {
    var big = (a1 - a0) > Math.PI ? 1 : 0;
    return 'M' + point(cx, cy, r1, a0) + ' A' + r1 + ' ' + r1 + ' 0 ' + big + ' 1 ' + point(cx, cy, r1, a1) +
      ' L' + point(cx, cy, r0, a1) + ' A' + r0 + ' ' + r0 + ' 0 ' + big + ' 0 ' + point(cx, cy, r0, a0) + ' Z';
  }

  function html(chart) {
    if (!chart || chart.type !== 'pie') return '';
    var list = prepare(chart.items);
    if (list.length < 2) return '';
    var total = list.reduce(function (s, x) { return s + x.v; }, 0);
    digits = list.every(function (x) { return x.v === Math.round(x.v); }) ? 0 : 1;
    function pct(x) { return fmt(x.p !== null ? x.p : x.v / total * 100, 1); }
    var unit = UI.esc(chart.unit || '');
    var id = 'ch' + (++seq);
    var a = 0;
    var paths = list.map(function (x, i) {
      var a1 = a + (x.v / total) * Math.PI * 2;
      // 1つで全部を占めるときは、弧がつぶれないように少しだけ手前で止める
      var d = arc(100, 100, 92, 52, a, Math.min(a1, a + Math.PI * 2 - 0.0001));
      a = a1;
      return '<path d="' + d + '" fill="' + x.c + '" stroke="#fff" stroke-width="2" stroke-linejoin="round" data-i="' + i + '"><title>' + UI.esc(x.l) + ' ' + fmt(x.v) + (chart.unit || '') + '（' + pct(x) + '％）</title></path>';
    }).join('');
    var rows = list.map(function (x, i) {
      return '<button class="lg" data-i="' + i + '"><i style="background:' + x.c + '"></i><span class="nm">' + UI.esc(x.l) + '</span><span class="vl">' + fmt(x.v) + unit + '</span><span class="pc">' + pct(x) + '％</span></button>';
    }).join('');
    return '<div class="pie" id="' + id + '" data-pie>' +
      '<svg viewBox="0 0 200 200" role="img" aria-label="' + UI.esc(chart.title || '内訳の円グラフ') + '">' + paths +
      '<text x="100" y="96" text-anchor="middle" class="pt">' + UI.esc(chart.center || '合計') + '</text>' +
      '<text x="100" y="118" text-anchor="middle" class="pv">' + fmt(chart.total || total) + unit + '</text></svg>' +
      '<div class="lgs">' + rows + '</div></div>';
  }

  // 円か一覧の行を押すと、その項目だけ目立たせる（もう一度押すと戻る）
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-pie] [data-i]');
    if (!el) return;
    var box = el.closest('[data-pie]');
    var i = el.getAttribute('data-i');
    var same = box.getAttribute('data-on') === i;
    box.setAttribute('data-on', same ? '' : i);
    box.querySelectorAll('[data-i]').forEach(function (x) {
      x.classList.toggle('dim', !same && x.getAttribute('data-i') !== i);
      x.classList.toggle('pick', !same && x.getAttribute('data-i') === i);
    });
  });

  return { html: html };
})();
