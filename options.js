var db;

function Log() {
  console.log.apply(console, arguments);
  var textarea = document.getElementById('log');
  textarea.value += Array.prototype.join.call(arguments, ' ') + '\n';
  textarea.scrollTop = textarea.scrollHeight;
}

function deleteDatabase(callback) {
  var request = indexedDB.deleteDatabase("dict");
  Log('deleteDatabase', request);

  request.onupgradeneeded = function(e) {
    Log('delete upgradeneeded');
    callback();
  };

  request.onsuccess = function(e) {
    Log('delete success');
    callback();
  };

  request.onerror = function(e) {
    Log('delete error', e);
  };

  request.onblocked = function(e) {
    Log('delete blocked', e);
  };
}

function openDatabase(callback) {
  var request = indexedDB.open("dict", 1);
  Log('openDatabase', request);

  request.onupgradeneeded = function(e) {
    Log('open upgradeneeded');

    db = e.target.result;

    e.target.transaction.onerror = function(e) {
      Log('transaction error', e);
    };

    if(db.objectStoreNames.contains("word")) {
      db.deleteObjectStore("word");
    }

    var store = db.createObjectStore("word", {autoIncrement: true});
    store.createIndex('key', 'key', {unique: false});
  };

  request.onsuccess = function(e) {
    Log('open success');

    db = e.target.result;

    callback();
  };

  request.onerror = function(e) {
    Log('open error', e);
  };

  request.onblocked = function(e) {
    Log('open blocked', e);
  };
};

document.querySelector('#eijiro_file').onchange = function(e) {
  if (this.files.length != 1) return;
  var file = this.files[0];

  // First, notify background.js that we are going to manipulate db so it
  // should close currently opened db.
  Log('Notifying the background page about DB installation.');
  chrome.runtime.sendMessage(
    {'action' : 'beginDatabaseUpdate'},
    function () {
      // Now we can manipulate db. Recreate a new db.
      Log('Controll is back from background page.');
      deleteDatabase(function() {
        openDatabase(function() {
          Log('DB initialization successfully finished.');
          (new FileLoader(file, db)).Load();
        });
      });
    });
};

var Anki = (function createAnki() {
  var self = {
    fields: [{name: 'note_type', default: 'Basic'},
             {name: 'deck', default: 'Default'}],
    init: function() {
      window.addEventListener('load', self.onLoad);
      return self;
    },
    updateElements: function() {
      var useAnki = (localStorage['use_anki'] != undefined);
      document.getElementById('use_anki').checked = useAnki;

      self.fields.forEach(function(field) {
        var element = document.getElementById(field.name);
        element.value = localStorage[field.name];
        element.disabled = !useAnki;
      });
    },
    readValues: function() {
      var element = document.getElementById('use_anki');
      if (element.checked) {
        localStorage['use_anki'] = true;
      } else {
        delete localStorage['use_anki'];
      }
      self.fields.forEach(function(field) {
        localStorage[field.name] = document.getElementById(field.name).value;
      });
    },
    onLoad: function() {
      // Set default values.
      self.fields.forEach(function(field) {
        if (localStorage[field.name] == undefined) {
          localStorage[field.name] = field.default;
        }
      });
      // Initialize elements.
      self.updateElements();
      // Set event handlers.
      document.getElementById('use_anki').addEventListener('change', self.onChange);
      self.fields.forEach(function(field) {
        document.getElementById(field.name).addEventListener('change', self.onChange);
      });
    },
    onChange: function() {
      self.readValues();
      self.updateElements();
    }
  };
  return self;
})().init();

var _scopy = function(obj) {
  var r = {};
  for (var n in obj) r[n] = obj[n];
  return r;
};

var Styles = (function createStyles() {
  var self = {
    key: 'chrodic_style',
    fields: {
      background_color : '0,0,0,0.7',
      foreground_color : '255,255,255,1',
      enable_fade      : true,
      fade_timespan    : 50,
      font             : 'Hiragino Mincho Pro'
    },
    db: {},
    init: function() {
      window.addEventListener('load', self.onLoad);
      return self;
    },
    onLoad: function() {
      self.loadData();
      self.updateElements();
      for (var n in self.fields)
        document.getElementById(n).addEventListener('change', self.onChange);
      document.getElementById('style_set_default').addEventListener('click', self.setDefault);
    },
    loadData: function() {
      self.db = (localStorage[self.key] === void(0) ?
                 _scopy(self.fields) :
                 JSON.parse(localStorage[self.key]));
      self.saveData();
    },
    saveData: function() {
      localStorage[self.key] = JSON.stringify(self.db);
    },
    updateElements: function() {
      for (var n in self.db) {
        var v  = self.db[n];
        var el = document.getElementById(n);
        if (typeof v === 'boolean') el.checked = v;
        else                        el.value = v;
      }
    },
    readValues: function() {
      for (var n in self.db) {
        var el = document.getElementById(n);
        self.db[n] = (el.type === 'checkbox') ? el.checked : el.value;
      }
    },
    onChange: function() {
      self.readValues();
      self.saveData();
      self.updateElements();
    },
    setDefault: function() {
      self.db = _scopy(self.fields);
      self.saveData();
      self.updateElements();
    }
  };
  return self;
})().init();

function UpdateProgressBar(progress) {
  var str = Math.round(progress * 100) / 100 + '%';
  document.getElementById('bar').style.width = str;
}

function renderEntries() {
  var ul = document.getElementById('entries');
  while (ul.childNodes.length > 0) {
    ul.removeChild(ul.childNodes[0]);
  }
  var str = localStorage['numEntries'];
  var numEntries = (str == undefined) ? 0 : parseInt(str);
  for (var i = 0; i < numEntries; ++i) {
    var entryStr = localStorage['entry[' + i + ']'];
    var entry = JSON.parse(entryStr);
    var li = document.createElement('li');
    var translation = entry.translation;
    if (translation.length > 30) {
      translation = translation.substr(0, 50) + '...';
    }
    li.innerHTML = i + '. ' + entry.word + ': ' + translation;
    ul.appendChild(li);
  }
}

window.addEventListener('load', function() {
  UpdateProgressBar(0);
  renderEntries();

  document.getElementById('clear').addEventListener('click', function() {
    var str = localStorage['numEntries'];
    var numEntries = (str == undefined) ? 0 : parseInt(str);
    for (var i = 0; i < numEntries; ++i) {
      delete localStorage['entry[' + i + ']'];
    }
    delete localStorage['numEntries'];
    renderEntries();
  });

  var str = localStorage['numEntries'];
  var numEntries = (str == undefined) ? 0 : parseInt(str);
  var text = '';
  for (var i = 0; i < numEntries; ++i) {
    var entryStr = localStorage['entry[' + i + ']'];
    var entry = JSON.parse(entryStr);
    text += entry.word + '	' + entry.translation.replace(/\n/g, '<br />') +
      '\n';
  }
  var blob = new Blob([text]);
  var link = window.URL.createObjectURL(blob);
  document.getElementById('download').href = link;
});
