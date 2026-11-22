// settings.js — ⚙️設定＝1日の本数・先に書く分野の順番・分野のオン/オフ・お題を足す
var Settings = (function () {
  function allFields() {
    var out = [];
    Store.groups.forEach(function (g) { g.fields.forEach(function (f) { out.push(f.name); }); });
    return out;
  }

  function fieldOptions(skip) {
    return Store.groups.map(function (g) {
      return '<optgroup label="' + UI.esc(g.name) + '">' + g.fields.filter(function (f) { return !skip || skip.indexOf(f.name) < 0; })
        .map(function (f) { return '<option>' + UI.esc(f.name) + '</option>'; }).join('') + '</optgroup>';
    }).join('');
  }

  function render() {
    var st = Store.settings;
    var seg = [1, 2, 3, 4, 5].map(function (n) { return '<button data-honsu="' + n + '"' + (st.honsu === n ? ' class="on"' : '') + '>' + n + '</button>'; }).join('');
    var order = st.honsen.map(function (name, i) {
      return '<div class="order"><span class="name">' + (i + 1) + '. ' + UI.esc(name) + '</span>' +
        '<button data-up="' + i + '"' + (i === 0 ? ' disabled' : '') + '>↑</button><button data-down="' + i + '"' + (i === st.honsen.length - 1 ? ' disabled' : '') + '>↓</button><button data-del="' + i + '">×</button></div>';
    }).join('');
    var checks = Store.groups.map(function (g) {
      var offCount = g.fields.filter(function (f) { return st.off.indexOf(f.name) >= 0; }).length;
      return '<details><summary>' + UI.esc(g.name) + (offCount ? '（オフ ' + offCount + '）' : '') + '</summary>' + g.fields.map(function (f) {
        return '<label class="check"><input type="checkbox" data-bunya="' + UI.esc(f.name) + '"' + (st.off.indexOf(f.name) >= 0 ? '' : ' checked') + '>' + UI.esc(f.name) + '</label>';
      }).join('') + '</details>';
    }).join('');

    document.getElementById('settingsBody').innerHTML =
      '<div class="box"><h2>1日に届く本数</h2><p class="hint">毎朝5:30ごろに届きます。変えると次の朝から。</p><div class="seg">' + seg + '</div></div>' +
      '<div class="box"><h2>先に書く分野</h2><p class="hint">この順に、分野の上から書いていきます。全部書き終わると次の分野へ。ここに無い分野は一覧の順です。</p>' + order +
      '<div class="form-row"><select id="honsenAdd">' + fieldOptions(st.honsen) + '</select><button class="btn sub" id="honsenAddBtn">足す</button></div></div>' +
      '<div class="box"><h2>お題を足す</h2><p class="hint">気になったことを1行で。分野を選んで足します。</p>' +
      '<div class="form-row"><select id="addField">' + fieldOptions() + '</select><button class="btn sub" id="addOpen">書く</button></div></div>' +
      '<div class="box"><h2>分野のオン／オフ</h2><p class="hint">チェックを外した分野は書きません（「先に読みたい」を押したお題は届きます）。</p>' + checks + '</div>';
  }

  function saveHonsen(list) {
    Store.settings.honsen = list;
    render();
    API.call('setSetting', { item: 'honsen', value: list }).catch(function (err) { UI.toast('保存できませんでした：' + err.message); });
  }

  document.getElementById('settingsBody').addEventListener('click', function (e) {
    var el = e.target.closest('button');
    if (!el) return;
    var st = Store.settings;
    var list = st.honsen.slice();
    if (el.dataset.honsu) {
      st.honsu = Number(el.dataset.honsu);
      render();
      API.call('setSetting', { item: 'honsu', value: st.honsu }).then(function () { UI.toast('1日 ' + st.honsu + '本にしました'); })
        .catch(function (err) { UI.toast('保存できませんでした：' + err.message); });
    } else if (el.dataset.up !== undefined) {
      var i = Number(el.dataset.up);
      list.splice(i - 1, 0, list.splice(i, 1)[0]);
      saveHonsen(list);
    } else if (el.dataset.down !== undefined) {
      var j = Number(el.dataset.down);
      list.splice(j + 1, 0, list.splice(j, 1)[0]);
      saveHonsen(list);
    } else if (el.dataset.del !== undefined) {
      list.splice(Number(el.dataset.del), 1);
      saveHonsen(list);
    } else if (el.id === 'honsenAddBtn') {
      var v = document.getElementById('honsenAdd').value;
      if (v && allFields().indexOf(v) >= 0 && list.indexOf(v) < 0) { list.push(v); saveHonsen(list); }
    } else if (el.id === 'addOpen') {
      List.askAdd(document.getElementById('addField').value);
    }
  });

  document.getElementById('settingsBody').addEventListener('change', function (e) {
    var el = e.target;
    if (!el.dataset || !el.dataset.bunya) return;
    var name = el.dataset.bunya;
    var off = Store.settings.off.filter(function (b) { return b !== name; });
    if (!el.checked) off.push(name);
    Store.settings.off = off;
    API.call('setBunya', { bunya: name, on: el.checked }).catch(function (err) { UI.toast('保存できませんでした：' + err.message); });
  });

  return { render: render };
})();
