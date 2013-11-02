var db;

function deleteDatabase() {
    var request = indexedDB.deleteDatabase("dict");
    console.log('deleteDatabase', request);

    request.onsuccess = function(e) {
      console.log('delete success');
    };

    request.onerror = function(e) {
      console.log('delete error', e);
    };
}

function openDatabase() {
  var request = indexedDB.open("dict", 1);
  console.log('openDatabase', request);

  request.onupgradeneeded = function(e) {
    console.log('open upgradeneeded');

    db = e.target.result;

    e.target.transaction.onerror = function(e) {
      console.log('transaction error', e);
    };

    if(db.objectStoreNames.contains("word")) {
      db.deleteObjectStore("word");
    }

    db.createObjectStore("word", {keyPath: "key"});
  };

  request.onsuccess = function(e) {
    console.log('open success');

    db = e.target.result;
  };

  request.onerror = function(e) {
    console.log('open error', e);
  };
};

var words = [];

function addWord(key, value) {
  words.push({
    "key": key,
    "value": value,
  });

  if (words.length < 10000) {
    return;
  }

  console.log(words[0]);

  var trans = db.transaction(["word"], "readwrite");
  var store = trans.objectStore("word");

  for (var i = 0; i < words.length; ++i) {
    store.put(words[i]);
  }

  trans.oncomplete = function(e) {
    console.log("transaction complete");
  }

  words = [];
};

var key = '';
var value = '';
var inserted = 0;

function processKeyValue(kv) {
  if (key != kv.key) {
    if (key != '') {
      addWord(key, value);
      if (++inserted % 10000 == 0) {
        console.log("Inserted", inserted, "words.");
      }
    }
    key = kv.key;
    value = (kv.kind ? kv.kind + kv.value : kv.value);
  } else {
    value += "\n" + (kv.kind ? kv.kind + kv.value : kv.value);
  }
}

function loadFile(file) {

  function getKeyValue(buf) {
    var m = buf.match(/■([^{]+)(?:  {(.+)})? : (.+)/);
    return { key: m[1], kind: m[2], value: m[3] }
  }

  function parseLine(e) {
    var lines = e.target.result.split('\n');
    for (var i = 0; i < lines.length; ++i) {
      processKeyValue(getKeyValue(lines[i]));
    }
  }

  var buffers = [];
  function read() {
    var view = new Uint8Array(this.result);
    var end = -1;
    for (var i = view.length - 1; i >= 0; --i) {
      if (view[i] == '\n'.charCodeAt(0)) {
        end = i;
        break;
      }
    }
    buffers.push(view.subarray(0, end));
    var f = new FileReader();
    f.onload = parseLine
    f.readAsText(new Blob(buffers));
    buffers = [];
    if (end + 1 <= view.length - 1) {
      buffers.push(view.subarray(end + 1, view.length));
    }
    readLoop();
  }

  var chunk = 1024 * 512;
  var current = 0;
  function readLoop() {
    if (current >= file.size) {
      addWord(key, value);
      return;
    }

    var percentage = Math.round(current / file.size * 100) + "%"
    console.log(current + " / " + file.size + " (" + percentage + ")");

    var reader = new FileReader();
    reader.onload = read;
    reader.readAsArrayBuffer(file.slice(current,
                      Math.min(file.size, current + chunk)));
    current += chunk;
  }
  readLoop();
};

document.querySelector('#myfile').onchange = function(e) {
  if (this.files.length != 1) return;
  var file = this.files[0];

  deleteDatabase();
  openDatabase();

  var st = setInterval(function() {
    if (db == null) {
      console.log('DB not initialized.');
      return;
    }
    console.log('DB initialized.');
    clearInterval(st);
    loadFile(file);
   }, 1000);
};