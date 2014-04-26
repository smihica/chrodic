function TranslationBox(style) {

  this.div = document.createElement('div');
  this.enabled = false;
  this.styles = style;

  if (this.styles.enable_fade) {
    this.opacity = 0;
    this.opacity_interval = 10; // ms
    this.opacity_max = 100;
    this.opacity_step = (this.opacity_max / (this.styles.fade_timespan / this.opacity_interval));
  }

  with (this.div.style) {
    zIndex              = 2147483647;
    position            = 'absolute';
    background          = 'rgba(' + this.styles.background_color + ')';
    color               = 'rgba(' + this.styles.foreground_color + ')';
    fontFamily          = this.styles.font;
    fontSize            = '100%';
    lineHeight          = 'normal';
    textAlign           = 'left';
    borderRadius        = '5px';
    padding             = '8px';
    webkitFontSmoothing = 'auto';
    if (this.styles.enable_fade) {
      opacity           = '0';
      display           = 'block';
    } else {
      display           = 'none';
    }
  }

  document.body.appendChild(this.div);
}

TranslationBox.prototype.Enabled = function() {
  return this.enabled;
};

TranslationBox.prototype.SetEnabled = function(enabled) {
  this.enabled = enabled;
};

TranslationBox.prototype.Fadein = function() {
  var self = this;
  if (self.styles.enable_fade) {
    clearInterval(self.fadeinSt);
    clearInterval(self.fadeoutSt);
    self.fadeinSt = setInterval(function() {
      self.div.style.opacity = self.opacity / 100;
      if (self.opacity == self.opacity_max) {
        clearInterval(self.fadeinSt);
      } else {
        self.opacity += self.opacity_step;
      }
    }, self.opacity_interval);
  } else {
    self.div.style.display = 'block';
  }
};

TranslationBox.prototype.Fadeout = function() {
  var self = this;
  if (self.styles.enable_fade) {
    clearInterval(self.fadeoutSt);
    clearInterval(self.fadeinSt);
    self.fadeoutSt = setInterval(function() {
      self.div.style.opacity = self.opacity / 100;
      if (self.opacity == 0) {
        self.div.innerHTML = '';
        clearInterval(self.fadeoutSt);
      } else {
        self.opacity -= self.opacity_step;
      }
    }, self.opacity_interval);
  } else {
    self.div.style.display = 'none';
  }
};

TranslationBox.prototype.SetContent = function(results) {
  this.content = [];
  for (var i = 0; i < results.length; ++i) {
    var key = results[i].originalKey || results[i].key;
    var value = results[i].value;
    this.content.push({word: key, translation: value});
  }

  this.div.innerHTML = "";
  for (var i = 0; i < this.content.length; ++i) {
    var c = this.content[i];
    this.div.innerHTML +=
    ('<span style="font-size:100%;">' + (i + 1) + '. ' + c.word +
     '</span>\n<div style="margin:5px;">' + c.translation + '</div>').
      replace(/\n/g, '<br />');
  }
};

TranslationBox.prototype.GetContent = function() {
  return this.content;
};

TranslationBox.prototype.SetLocation = function(mouse) {
  this.mouse = mouse;
  this.AdjustLocation();
};

TranslationBox.prototype.AdjustLocation = function() {
  // Redraw translation box.
  var box_width = Math.min(400, window.innerWidth);
  var box_left = Math.min(window.innerWidth - box_width, this.mouse.clientX) +
        this.mouse.pageX - this.mouse.clientX + 2;
  var box_top = this.mouse.pageY + 10;
  with (this.div.style) {
    width = box_width + 'px';
    left = box_left + 'px';
    top = box_top + 'px';
  }

  // Adjust when bottom of the translation box is out of the window.
  var bcr = this.div.getBoundingClientRect();
  with (this.div.style) {
    if (bcr.height >= window.innerHeight) {
      top = window.pageYOffset + 'px';
    } else if (bcr.bottom > window.innerHeight) {
      top = (window.pageYOffset + window.innerHeight - bcr.height) + 'px';
    }
  }
};
