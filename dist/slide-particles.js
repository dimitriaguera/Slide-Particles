

var slideParticles = function (window, document, undefined) {

  "use strict";

  var fn,
      filter,
      proceed,
      filters,
      matrixMethod,
      objFuncString = Object.hasOwnProperty.toString.call(Object);

  defaults = {
    height: 150,
    width: 300,
    background: '#fff',
    thresholdNB: [128],
    targetElement: 'dp-canvas',
    inputFileID: 'dp-fileinput',
    thumdnailsID: 'dp-thumb',
    panelID: 'dp-panel-settings',
    thumbWidth: 100,
    thumbHeight: 100,
    text: 'Salut !',
    mass: 100,
    antiMass: -500,
    density: 1500,
    particleSize: 1,
    particleColor: '#000',
    textColor: '#fff',
    font: 'Arial',
    fontSize: 40,
    initialVelocity: 3,
    massX: 880,
    massY: 370,
    initialMode: 'modeForm',
    draw: false,
    stop: false,
    switchModeCallback: null,
    modeForm: true
  };

  filters = {
    modeForm: {
      name: 'blackAndWhite',
      param: 'thresholdNB'
    }
  };

  proceed = {
    modeForm: ['soumisChamp', 'soumisForm']
  };

  matrixMethod = {
    modeForm: 'valueMatrix'
  };

  fn = {
    getViewport: function () {
      return {
        w: Math.max(document.documentElement.clientWidth, window.innerWidth || 0),
        h: Math.max(document.documentElement.clientHeight, window.innerHeight || 0)
      };
    },

    append: function (target, element) {
      if (typeof target === 'string') {
        document.getElementById(target).appendChild(element);
      } else {
        target.appendChild(element);
      }
    },

    // Thank you jQuery 3+ !
    isPlainObject: function (target) {
      var proto, Ctor;
      // Detect obvious negatives
      // Use toString instead of jQuery.type to catch host objects
      if (!target || Object.toString.call(target) !== "[object Object]") {
        return false;
      }
      proto = Object.getPrototypeOf(target);
      // Objects with no prototype (e.g., `Object.create( null )`) are plain
      if (!proto) {
        return true;
      }
      // Objects with prototype are plain iff they were constructed by a global Object function
      Ctor = Object.hasOwnProperty.call(proto, "constructor") && proto.constructor;
      return typeof Ctor === "function" && Object.hasOwnProperty.toString.call(Ctor) === ObjFuncString;
    },

    simpleExtend: function (a, b) {
      var clone,
          src,
          copy,
          isAnArray = false;
      for (var key in b) {

        src = a[key];
        copy = b[key];

        //Avoid infinite loop.
        if (a === copy) {
          continue;
        }

        if (b.hasOwnProperty(key)) {

          if (copy && (fn.isPlainObject(copy) || (isAnArray = copy.isArray()))) {
            if (isAnArray) {
              isAnArray = false;
              clone = src && src.isArray ? src : [];
            } else {
              clone = src && fn.isPlainObject(src) ? src : {};
            }
            a[key] = fn.simpleExtend(clone, copy);
          } else {
            a[key] = copy;
          }
        }
      }
      return a;
    }
  };

  function Matrix(instance, input, customSize) {
    this.instance = instance;
    this.type = typeof input !== 'string' ? 'picture' : 'text';
    this.picture = input;
    this.canvas = this.instance.getCanvas(customSize);
    this.context = this.instance.getContext2D(this.canvas);
    this.size = typeof input !== 'string' ? this.instance.getImageSize(input, customSize) : { x: 0, y: 0, w: 0, h: 0 };
    this.pixels = this.getPixels();
    this.matrix = this.buildAllMatrix();
  }

  Matrix.prototype = {
    //constructor: Matrix,
    clear: function () {
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    },

    getPixels: function () {

      this.clear();

      switch (this.type) {

        case 'picture':
          this.context.drawImage(this.picture, this.size.x, this.size.y, this.size.w, this.size.h);
          break;

        case 'text':
          this.setText();
          break;

        default:
          return false;
      }

      if (!this.size.w && !this.size.h) return false;

      return this.context.getImageData(this.size.x, this.size.y, this.size.w, this.size.h);
    },

    setText: function () {

      var cleared = this.picture.trim();

      if (cleared === "") {
        this.size.x = 0;
        this.size.y = 0;
        this.size.w = 0;
        this.size.h = 0;
        this.clearMatrix();
        return false;
      }

      var i,
          w = 0,
          x = 20,
          y = 80,
          lines = this.picture.split("\n"),
          fontSize = this.instance.settings.fontSize;

      this.context.font = fontSize + "px " + this.instance.settings.font;
      this.context.fillStyle = this.instance.settings.textColor;
      this.context.textAlign = "left";

      for (i = 0; i < lines.length; i++) {
        this.context.fillText(lines[i], x, y + i * fontSize);
        w = Math.max(w, Math.floor(this.context.measureText(lines[i]).width));
      }

      this.size.x = Math.max(x, this.size.x);
      this.size.y = Math.max(y - fontSize, this.size.y);
      this.size.w = Math.max(w + fontSize, this.size.w);
      this.size.h = Math.max(fontSize * i + fontSize, this.size.h);
    },

    applyFilter: function (name, argArray) {
      var i,
          p = this.getPixels();
      if (name) {
        var args = [p];
        for (i = 0; i < argArray.length; i++) {
          args.push(argArray[i]);
        }
        this.pixels = filter[name].apply(null, args);
        this.context.putImageData(this.pixels, this.size.x, this.size.y);
      } else {
        this.pixels = p;
      }
    },

    buildAllMatrix: function () {
      var m,
          mA = {};
      for (var mode in matrixMethod) {
        m = this.creaMatrix();
        this.applyFilter(filters[mode].name, this.instance.settings[filters[mode].param]);
        this[matrixMethod[mode]](m, 1);
        mA[mode] = m;
      }
      return mA;
    },

    getMatrix: function () {
      return this.matrix[this.instance.mode];
    },

    creaMatrix: function () {
      var a = this.instance.settings.width,
          b = this.instance.settings.height,
          mat = new Array(a),
          i,
          j;
      for (i = 0; i < a; i++) {
        mat[i] = new Array(b);
        for (j = 0; j < b; j++) {
          mat[i][j] = 0;
        }
      }
      return mat;
    },

    clearMatrix: function (value) {
      var i,
          j,
          l,
          m,
          v,
          matrix = this.getMatrix();
      v = value || 0;
      l = matrix.length;
      m = matrix[0].length;
      for (i = 0; i < l; i++) {
        for (j = 0; j < m; j++) {
          matrix[i][j] = v;
        }
      }
    },

    valueMatrix: function (matrix, value) {
      var a = this.size.x,
          b = Math.min(Math.floor(a + this.size.w), matrix.length),
          c = this.size.y,
          d = Math.min(Math.floor(c + this.size.h), matrix[0].length);
      if (matrix.length < a || matrix[0].length < d) return;

      var i,
          j,
          p = this.context.getImageData(0, 0, this.instance.canvas.width, this.instance.canvas.height).data;

      for (i = a; i < b; i++) {
        for (j = c; j < d; j++) {
          var pix = p[(this.instance.canvas.width * j + i) * 4];
          matrix[i][j] = pix === 255 ? value : 0;
        }
      }
    },

    renderThumbnails: function (target, filter) {
      var self = this;
      var m = new Matrix(this.instance, this.picture, { w: this.instance.settings.thumbWidth, h: this.instance.settings.thumbHeight });

      if (filter) {
        m.applyFilter(filters[this.instance.mode].name, this.settings[filters[this.instance.mode].param]);
      }

      m.canvas.onclick = function (matrix) {
        return function (e) {
          self.instance.goTo(matrix);
          self.instance.clearParts();
          self.instance.liberationParts1();
        };
      }(m);

      this.instance.thumbOriginalTab.push(m);
      fn.append(target, m.canvas);

      return m;
    }
  };

  /****
   * PUBLIC METHODS
   *
   *
   */

  function DiapPart(options) {
    this.settings = Object.assign({}, defaults, options);
    this.matrixTab = [];
    this.thumbOriginalTab = [];
    this.particles = [];
    this.champs = [];
    this.mode = this.settings.initialMode;
    this.liberation = false;
    this.activeIndex = null;
    this.canvas = this.getCanvas();
    this.context = this.getContext2D(this.canvas);
  }

  DiapPart.prototype = {

    // constructor: DiapPart,

    init: function () {

      fn.append(this.settings.targetElement, this.canvas);
      this.canvas.style.backgroundColor = this.settings.background;
      this.centerMass();
      this.champs.push(new Champ(new Vector(this.settings.massX, this.settings.massY), this.settings.mass));
      this.loop();
    },

    set: function (options) {
      Object.assign(this.settings, options);
    },

    createSlide: function (input, customSize) {
      var m = new Matrix(this, input, customSize);
      this.activeIndex = this.activeIndex === null ? 0 : this.activeIndex;
      this.matrixTab.push(m);
      return m;
    },

    getCanvas: function (size) {
      var canvas = document.createElement('canvas'),
          s = size || {};

      canvas.height = s.h ? s.h : this.settings.height;
      canvas.width = s.w ? s.w : this.settings.width;

      return canvas;
    },

    getContext2D: function (canvas) {
      return canvas.getContext('2d');
    },

    getImageSize: function (img, size) {
      var w = img.width,
          h = img.height,
          cw = size ? size.w : this.canvas.width,
          ch = size ? size.h : this.canvas.height,
          ratio = w / h;

      if (w >= h && w > cw) {
        w = cw;
        h = Math.round(w / ratio);
      } else {
        if (h > ch) {
          h = ch;
          w = Math.round(h * ratio);
        }
      }

      return {
        x: Math.round((cw - w) / 2),
        y: Math.round((ch - h) / 2),
        w: w,
        h: h
      };
    },

    load: function (e) {
      var i,
          files = e.target.files,
          self = this;
      if (!files) return;

      for (i = 0; i < files.length; i++) {
        var file = files[i];
        if (!file.type.match('image')) continue;

        var reader = new FileReader();
        reader.onload = function (event) {
          var img = new Image();
          img.onload = function () {
            var m;
            m = self.createSlide(this);
            m.renderThumbnails(self.settings.thumdnailsID, false);
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      }
    },

    switchMode: function (mode) {

      this.mode = mode;

      if (typeof this.settings.switchModeCallback === 'function') {
        this.settings.switchModeCallback.call(this);
      }
    },

    addMass: function (x, y, mass) {
      var m = new Champ(new Vector(x, y), mass);
      this.champs.push(m);
      return m;
    },

    centerMass: function () {
      //var ws = fn.getViewport();
      //canvas.width = ( dp.settings.width < ws.w ) ? dp.settings.width : ws.w;
      //canvas.height = ( dp.settings.height < ws.h - 10 ) ? dp.settings.height : ws.h - 10;

      this.settings.massX = this.canvas.width / 2;
      this.settings.massY = this.canvas.height / 2;
    },

    partProceed: function (particle) {
      var i,
          l = proceed[this.mode].length;
      for (i = 0; i < l; i++) {
        particle[proceed[this.mode][i]]();
      }
    },

    goTo: function (matrix) {
      this.activeIndex = this.thumbOriginalTab.indexOf(matrix);
    },

    liberationParts1: function () {
      var self = this;
      this.liberation = !this.liberation;
      this.champs[0].mass = this.settings.antiMass;
      setTimeout(function () {
        self.champs[0].mass = self.settings.mass;
        self.liberation = !self.liberation;
      }, 500);
    },

    creaParts: function () {
      if (this.particles.length < this.settings.density) {
        var i,
            nb = this.settings.density - this.particles.length;
        for (i = 0; i < nb; i++) {
          this.particles.push(new Particle(this, new Vector(Math.random() * this.canvas.width, Math.random() * this.canvas.height), new Vector(realRandom(this.settings.initialVelocity), realRandom(this.settings.initialVelocity)), new Vector(0, 0), 0, false));
        }
      }
    },

    upgradeParts: function () {
      var currentParts = [],
          i,
          l = this.particles.length;
      for (i = 0; i < l; i++) {
        var particle = this.particles[i],
            pos = particle.position;
        if (pos.x >= this.canvas.width || pos.x <= 0 || pos.y >= this.canvas.height || pos.y <= 0) continue;
        this.partProceed(particle);
        particle.move();
        currentParts.push(particle);
      }
      this.particles = currentParts;
      this.settings.bigbang = false;
    },

    drawParts: function () {
      var i,
          n = this.particles.length;
      for (i = 0; i < n; i++) {
        var pos = this.particles[i].position;
        this.context.fillStyle = this.particles[i].color;
        this.context.fillRect(pos.x, pos.y, this.settings.particleSize, this.settings.particleSize);
      }
    },

    clearParts: function () {
      var i,
          l = this.particles.length;
      for (i = 0; i < l; i++) {
        this.particles[i].inForm = 0;
      }
    },

    // On nettoie le canvas.
    clear: function () {
      if (!this.settings.draw) {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    },

    // Rappel de boucle.
    queue: function () {
      var self = this;
      if (!this.settings.stop) {
        this.requestID = window.requestAnimationFrame(self.loop.bind(self));
      } else {
        window.cancelAnimationFrame(self.requestID);
        this.requestID = undefined;
      }
    },

    // Upgrade particules a creer.
    update: function () {
      this.creaParts();
      this.upgradeParts();
    },

    // Upgrade position et dessin particules.
    draw: function () {
      this.drawParts();
    },

    // Contenu de la boucle.
    loop: function () {
      this.clear();
      this.update();
      this.draw();
      this.queue();
    },

    stop: function () {
      this.settings.stop = true;
    },

    start: function () {
      this.settings.stop = false;
      this.loop();
    }

  };

  filter = {

    blackAndWhite: function (pixels, threshold) {
      if (!pixels) return pixels;
      var i,
          r,
          g,
          b,
          v,
          d = pixels.data;
      for (i = 0; i < d.length; i += 4) {
        r = d[i];
        g = d[i + 1];
        b = d[i + 2];
        v = 0.2126 * r + 0.7152 * g + 0.0722 * b >= threshold ? 255 : 0;
        d[i] = d[i + 1] = d[i + 2] = v;
      }
      return pixels;
    }

  };

  function realRandom(max) {
    return Math.cos(Math.random() * Math.PI) * max;
  }

  function Vector(x, y) {
    this.x = x || 0;
    this.y = y || 0;
  }

  // Methodes sur les vecteurs.
  // Ajouter un vecteur a un autre.
  Vector.prototype.add = function (vector) {
    this.x += vector.x;
    this.y += vector.y;
  };

  // Inverser la direction du vecteur.
  Vector.prototype.getInvert = function () {
    this.x = -1 * this.x;
    this.y = -1 * this.y;
  };

  //Obtenir la magnitude (longueur) d'un vecteur.
  Vector.prototype.getMagnitude = function () {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  };

  // Obtenir l'angle d'un vecteur par rapport à l'absisse.
  Vector.prototype.getAngle = function () {
    return Math.atan2(this.y, this.x);
  };

  // Permet d'obtenir un nouveau vecteur à partir d'un angle et d'une longueur.
  Vector.prototype.fromAngle = function (angle, magnitude) {
    return new Vector(magnitude * Math.cos(angle), magnitude * Math.sin(angle));
  };

  // Constructeur particule.
  function Particle(instance, position, vitesse, acceleration) {
    this.instance = instance;
    this.position = position || new Vector(0, 0);
    this.vitesse = vitesse || new Vector(0, 0);
    this.acceleration = acceleration || new Vector(0, 0);
    this.color = this.instance.settings.particleColor;
    this.inForm = 0;
  }

  // Mouvement particule.
  Particle.prototype.move = function () {
    this.vitesse.add(this.acceleration);
    this.position.add(this.vitesse);
  };

  // Force du champ appliqué à la particule.
  Particle.prototype.soumisChamp = function () {

    if (!this.instance.champs[0].mass) return;
    if (this.inForm !== 1) {

      var totalAccelerationX = 0;
      var totalAccelerationY = 0;
      var l = this.instance.champs.length;

      for (var i = 0; i < l; i++) {
        // Distance particule/champ.
        var distX = this.instance.champs[i].position.x - this.position.x;
        var distY = this.instance.champs[i].position.y - this.position.y;
        var force = this.instance.champs[i].mass / Math.pow(distX * distX + distY * distY, 1.5);
        totalAccelerationX += distX * force;
        totalAccelerationY += distY * force;
      }
      this.acceleration = new Vector(totalAccelerationX, totalAccelerationY);
    }
  };

  // Passage dans la forme appliqué à la Particle.
  Particle.prototype.soumisForm = function () {

    if (this.instance.liberation) {
      this.inForm = 0;
      return;
    }

    var testX = Math.floor(this.position.x);
    var testY = Math.floor(this.position.y);
    var value = this.instance.activeIndex !== null ? this.instance.matrixTab[this.instance.activeIndex].getMatrix()[testX][testY] : 0;

    if (value !== 0) {
      if (this.inForm !== 1) {
        this.inForm = 1;
        this.vitesse = new Vector(this.vitesse.x * 0.2, this.vitesse.y * 0.2);
        this.acceleration = new Vector(0, 0);
      }
    } else {
      if (this.inForm === 1) {
        this.vitesse.getInvert();
      }
    }
  };

  // Construction du champ.
  function Champ(point, mass) {
    this.position = point;
    this.setMass(mass);
  }

  Champ.prototype.setMass = function (mass) {
    this.mass = mass || 0;
    this.color = mass < 0 ? "#f00" : "#0f0";
  };

  // POLYFILL

  // Production steps of ECMA-262, Edition 5, 15.4.4.14
  // Référence : http://es5.github.io/#x15.4.4.14
  if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (searchElement, fromIndex) {
      var k;
      if (this == null) {
        throw new TypeError('"this" vaut null ou n est pas défini');
      }
      var O = Object(this);
      var len = O.length >>> 0;
      if (len === 0) {
        return -1;
      }
      var n = +fromIndex || 0;
      if (Math.abs(n) === Infinity) {
        n = 0;
      }
      if (n >= len) {
        return -1;
      }
      k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);
      while (k < len) {
        if (k in O && O[k] === searchElement) {
          return k;
        }
        k++;
      }
      return -1;
    };
  }

  if (typeof Object.assign != 'function') {
    Object.assign = function (target, varArgs) {
      // .length of function is 2
      'use strict';

      if (target == null) {
        // TypeError if undefined or null
        throw new TypeError('Cannot convert undefined or null to object');
      }

      var to = Object(target);

      for (var index = 1; index < arguments.length; index++) {
        var nextSource = arguments[index];

        if (nextSource != null) {
          // Skip over if undefined or null
          for (var nextKey in nextSource) {
            // Avoid bugs when hasOwnProperty is shadowed
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
              to[nextKey] = nextSource[nextKey];
            }
          }
        }
      }
      return to;
    };
  }

  // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
  // http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
  // requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
  // MIT license

  (function () {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
      window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
      window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame) window.requestAnimationFrame = function (callback, element) {
      var currTime = new Date().getTime();
      var timeToCall = Math.max(0, 16 - (currTime - lastTime));
      var id = window.setTimeout(function () {
        callback(currTime + timeToCall);
      }, timeToCall);
      lastTime = currTime + timeToCall;
      return id;
    };

    if (!window.cancelAnimationFrame) window.cancelAnimationFrame = function (id) {
      clearTimeout(id);
    };
  })();

  return {

    getInstance: function (options) {
      var i = new DiapPart(options);
      i.init();
      return i;
    },

    registerModule: function (name, param) {
      fn.simpleExtend(DiapPart.prototype, param.proto);
      defaults[name] = param.options;
    },

    registerMode: function (name, param) {

      if (defaults[name]) throw new Error("Name space for '" + name + "' already exist. Choose an other module name.");

      defaults[name] = true;

      fn.simpleExtend(defaults, param.options);
      fn.simpleExtend(Particle.prototype, param.proto_particles);
      fn.simpleExtend(Matrix.prototype, param.proto_matrix);

      filters[name] = param.scenario.filters;
      proceed[name] = param.scenario.proceed;
      matrixMethod[name] = param.scenario.matrixMethod;
    }
  };
}(this, this.document);
slideParticles.registerMode('modeColor', {
  options: {},
  proto_particles: {
    soumisColor: function () {
      this.inForm = 0;
      var testX = Math.floor(this.position.x);
      var testY = Math.floor(this.position.y);
      this.color = this.instance.activeIndex !== null ? this.instance.matrixTab[this.instance.activeIndex].getMatrix()[testX][testY] : this.instance.settings.particleColor;
    }
  },
  proto_matrix: {
    colorMatrix: function (matrix) {
      var a = this.size.x,
          c = this.size.y,
          d = Math.floor(c + this.size.h);
      if (matrix.length < a || matrix[0].length < d) return;

      var i,
          j,
          r,
          g,
          b,
          p = this.context.getImageData(0, 0, this.instance.canvas.width, this.instance.canvas.height).data;

      for (i = 0; i < this.canvas.height; i++) {
        for (j = 0; j < this.canvas.width; j++) {
          r = p[(this.instance.canvas.width * j + i) * 4];
          g = p[(this.instance.canvas.width * j + i) * 4 + 1];
          b = p[(this.instance.canvas.width * j + i) * 4 + 2];
          matrix[i][j] = 'rgba(' + r + ', ' + g + ', ' + b + ', 1)';
        }
      }
    }
  },
  filter: {},
  scenario: {
    filters: {
      name: null,
      param: null
    },
    proceed: ['soumisChamp', 'soumisColor'],
    matrixMethod: 'colorMatrix'
  }
});
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUuanMiLCJjb2xvci5qcyJdLCJuYW1lcyI6WyJzbGlkZVBhcnRpY2xlcyIsIndpbmRvdyIsImRvY3VtZW50IiwidW5kZWZpbmVkIiwiZm4iLCJmaWx0ZXIiLCJwcm9jZWVkIiwiZmlsdGVycyIsIm1hdHJpeE1ldGhvZCIsIm9iakZ1bmNTdHJpbmciLCJPYmplY3QiLCJoYXNPd25Qcm9wZXJ0eSIsInRvU3RyaW5nIiwiY2FsbCIsImRlZmF1bHRzIiwiaGVpZ2h0Iiwid2lkdGgiLCJiYWNrZ3JvdW5kIiwidGhyZXNob2xkTkIiLCJ0YXJnZXRFbGVtZW50IiwiaW5wdXRGaWxlSUQiLCJ0aHVtZG5haWxzSUQiLCJwYW5lbElEIiwidGh1bWJXaWR0aCIsInRodW1iSGVpZ2h0IiwidGV4dCIsIm1hc3MiLCJhbnRpTWFzcyIsImRlbnNpdHkiLCJwYXJ0aWNsZVNpemUiLCJwYXJ0aWNsZUNvbG9yIiwidGV4dENvbG9yIiwiZm9udCIsImZvbnRTaXplIiwiaW5pdGlhbFZlbG9jaXR5IiwibWFzc1giLCJtYXNzWSIsImluaXRpYWxNb2RlIiwiZHJhdyIsInN0b3AiLCJzd2l0Y2hNb2RlQ2FsbGJhY2siLCJtb2RlRm9ybSIsIm5hbWUiLCJwYXJhbSIsImdldFZpZXdwb3J0IiwidyIsIk1hdGgiLCJtYXgiLCJkb2N1bWVudEVsZW1lbnQiLCJjbGllbnRXaWR0aCIsImlubmVyV2lkdGgiLCJoIiwiY2xpZW50SGVpZ2h0IiwiaW5uZXJIZWlnaHQiLCJhcHBlbmQiLCJ0YXJnZXQiLCJlbGVtZW50IiwiZ2V0RWxlbWVudEJ5SWQiLCJhcHBlbmRDaGlsZCIsImlzUGxhaW5PYmplY3QiLCJwcm90byIsIkN0b3IiLCJnZXRQcm90b3R5cGVPZiIsImNvbnN0cnVjdG9yIiwiT2JqRnVuY1N0cmluZyIsInNpbXBsZUV4dGVuZCIsImEiLCJiIiwiY2xvbmUiLCJzcmMiLCJjb3B5IiwiaXNBbkFycmF5Iiwia2V5IiwiaXNBcnJheSIsIk1hdHJpeCIsImluc3RhbmNlIiwiaW5wdXQiLCJjdXN0b21TaXplIiwidHlwZSIsInBpY3R1cmUiLCJjYW52YXMiLCJnZXRDYW52YXMiLCJjb250ZXh0IiwiZ2V0Q29udGV4dDJEIiwic2l6ZSIsImdldEltYWdlU2l6ZSIsIngiLCJ5IiwicGl4ZWxzIiwiZ2V0UGl4ZWxzIiwibWF0cml4IiwiYnVpbGRBbGxNYXRyaXgiLCJwcm90b3R5cGUiLCJjbGVhciIsImNsZWFyUmVjdCIsImRyYXdJbWFnZSIsInNldFRleHQiLCJnZXRJbWFnZURhdGEiLCJjbGVhcmVkIiwidHJpbSIsImNsZWFyTWF0cml4IiwiaSIsImxpbmVzIiwic3BsaXQiLCJzZXR0aW5ncyIsImZpbGxTdHlsZSIsInRleHRBbGlnbiIsImxlbmd0aCIsImZpbGxUZXh0IiwiZmxvb3IiLCJtZWFzdXJlVGV4dCIsImFwcGx5RmlsdGVyIiwiYXJnQXJyYXkiLCJwIiwiYXJncyIsInB1c2giLCJhcHBseSIsInB1dEltYWdlRGF0YSIsIm0iLCJtQSIsIm1vZGUiLCJjcmVhTWF0cml4IiwiZ2V0TWF0cml4IiwibWF0IiwiQXJyYXkiLCJqIiwidmFsdWUiLCJsIiwidiIsInZhbHVlTWF0cml4IiwibWluIiwiYyIsImQiLCJkYXRhIiwicGl4IiwicmVuZGVyVGh1bWJuYWlscyIsInNlbGYiLCJvbmNsaWNrIiwiZSIsImdvVG8iLCJjbGVhclBhcnRzIiwibGliZXJhdGlvblBhcnRzMSIsInRodW1iT3JpZ2luYWxUYWIiLCJEaWFwUGFydCIsIm9wdGlvbnMiLCJhc3NpZ24iLCJtYXRyaXhUYWIiLCJwYXJ0aWNsZXMiLCJjaGFtcHMiLCJsaWJlcmF0aW9uIiwiYWN0aXZlSW5kZXgiLCJpbml0Iiwic3R5bGUiLCJiYWNrZ3JvdW5kQ29sb3IiLCJjZW50ZXJNYXNzIiwiQ2hhbXAiLCJWZWN0b3IiLCJsb29wIiwic2V0IiwiY3JlYXRlU2xpZGUiLCJjcmVhdGVFbGVtZW50IiwicyIsImdldENvbnRleHQiLCJpbWciLCJjdyIsImNoIiwicmF0aW8iLCJyb3VuZCIsImxvYWQiLCJmaWxlcyIsImZpbGUiLCJtYXRjaCIsInJlYWRlciIsIkZpbGVSZWFkZXIiLCJvbmxvYWQiLCJldmVudCIsIkltYWdlIiwicmVzdWx0IiwicmVhZEFzRGF0YVVSTCIsInN3aXRjaE1vZGUiLCJhZGRNYXNzIiwicGFydFByb2NlZWQiLCJwYXJ0aWNsZSIsImluZGV4T2YiLCJzZXRUaW1lb3V0IiwiY3JlYVBhcnRzIiwibmIiLCJQYXJ0aWNsZSIsInJhbmRvbSIsInJlYWxSYW5kb20iLCJ1cGdyYWRlUGFydHMiLCJjdXJyZW50UGFydHMiLCJwb3MiLCJwb3NpdGlvbiIsIm1vdmUiLCJiaWdiYW5nIiwiZHJhd1BhcnRzIiwibiIsImNvbG9yIiwiZmlsbFJlY3QiLCJpbkZvcm0iLCJxdWV1ZSIsInJlcXVlc3RJRCIsInJlcXVlc3RBbmltYXRpb25GcmFtZSIsImJpbmQiLCJjYW5jZWxBbmltYXRpb25GcmFtZSIsInVwZGF0ZSIsInN0YXJ0IiwiYmxhY2tBbmRXaGl0ZSIsInRocmVzaG9sZCIsInIiLCJnIiwiY29zIiwiUEkiLCJhZGQiLCJ2ZWN0b3IiLCJnZXRJbnZlcnQiLCJnZXRNYWduaXR1ZGUiLCJzcXJ0IiwiZ2V0QW5nbGUiLCJhdGFuMiIsImZyb21BbmdsZSIsImFuZ2xlIiwibWFnbml0dWRlIiwic2luIiwidml0ZXNzZSIsImFjY2VsZXJhdGlvbiIsInNvdW1pc0NoYW1wIiwidG90YWxBY2NlbGVyYXRpb25YIiwidG90YWxBY2NlbGVyYXRpb25ZIiwiZGlzdFgiLCJkaXN0WSIsImZvcmNlIiwicG93Iiwic291bWlzRm9ybSIsInRlc3RYIiwidGVzdFkiLCJwb2ludCIsInNldE1hc3MiLCJzZWFyY2hFbGVtZW50IiwiZnJvbUluZGV4IiwiayIsIlR5cGVFcnJvciIsIk8iLCJsZW4iLCJhYnMiLCJJbmZpbml0eSIsInZhckFyZ3MiLCJ0byIsImluZGV4IiwiYXJndW1lbnRzIiwibmV4dFNvdXJjZSIsIm5leHRLZXkiLCJsYXN0VGltZSIsInZlbmRvcnMiLCJjYWxsYmFjayIsImN1cnJUaW1lIiwiRGF0ZSIsImdldFRpbWUiLCJ0aW1lVG9DYWxsIiwiaWQiLCJjbGVhclRpbWVvdXQiLCJnZXRJbnN0YW5jZSIsInJlZ2lzdGVyTW9kdWxlIiwicmVnaXN0ZXJNb2RlIiwiRXJyb3IiLCJwcm90b19wYXJ0aWNsZXMiLCJwcm90b19tYXRyaXgiLCJzY2VuYXJpbyIsInNvdW1pc0NvbG9yIiwiY29sb3JNYXRyaXgiXSwibWFwcGluZ3MiOiI7O0FBRUEsSUFBSUEsaUJBQWtCLFVBQVVDLE1BQVYsRUFBa0JDLFFBQWxCLEVBQTRCQyxTQUE1QixFQUF1Qzs7QUFFekQ7O0FBR0EsTUFBSUMsRUFBSjtBQUFBLE1BQVFDLE1BQVI7QUFBQSxNQUFnQkMsT0FBaEI7QUFBQSxNQUF5QkMsT0FBekI7QUFBQSxNQUFrQ0MsWUFBbEM7QUFBQSxNQUNBQyxnQkFBZ0JDLE9BQU9DLGNBQVAsQ0FBc0JDLFFBQXRCLENBQStCQyxJQUEvQixDQUFxQ0gsTUFBckMsQ0FEaEI7O0FBR0FJLGFBQVc7QUFDVEMsWUFBUSxHQURDO0FBRVRDLFdBQU8sR0FGRTtBQUdUQyxnQkFBWSxNQUhIO0FBSVRDLGlCQUFhLENBQUMsR0FBRCxDQUpKO0FBS1RDLG1CQUFlLFdBTE47QUFNVEMsaUJBQWEsY0FOSjtBQU9UQyxrQkFBYyxVQVBMO0FBUVRDLGFBQVMsbUJBUkE7QUFTVEMsZ0JBQVksR0FUSDtBQVVUQyxpQkFBYSxHQVZKO0FBV1RDLFVBQUssU0FYSTtBQVlUQyxVQUFNLEdBWkc7QUFhVEMsY0FBVSxDQUFDLEdBYkY7QUFjVEMsYUFBUyxJQWRBO0FBZVRDLGtCQUFjLENBZkw7QUFnQlRDLG1CQUFlLE1BaEJOO0FBaUJUQyxlQUFXLE1BakJGO0FBa0JUQyxVQUFNLE9BbEJHO0FBbUJUQyxjQUFVLEVBbkJEO0FBb0JUQyxxQkFBaUIsQ0FwQlI7QUFxQlRDLFdBQU8sR0FyQkU7QUFzQlRDLFdBQU8sR0F0QkU7QUF1QlRDLGlCQUFhLFVBdkJKO0FBd0JUQyxVQUFNLEtBeEJHO0FBeUJUQyxVQUFNLEtBekJHO0FBMEJUQyx3QkFBb0IsSUExQlg7QUEyQlRDLGNBQVU7QUEzQkQsR0FBWDs7QUE4QkFsQyxZQUFVO0FBQ1JrQyxjQUFVO0FBQ1JDLFlBQU0sZUFERTtBQUVSQyxhQUFPO0FBRkM7QUFERixHQUFWOztBQU9BckMsWUFBVTtBQUNSbUMsY0FBVSxDQUFDLGFBQUQsRUFBZ0IsWUFBaEI7QUFERixHQUFWOztBQUlBakMsaUJBQWU7QUFDYmlDLGNBQVU7QUFERyxHQUFmOztBQUlBckMsT0FBSztBQUNId0MsaUJBQWEsWUFBVztBQUN0QixhQUFPO0FBQ0xDLFdBQUdDLEtBQUtDLEdBQUwsQ0FBUzdDLFNBQVM4QyxlQUFULENBQXlCQyxXQUFsQyxFQUErQ2hELE9BQU9pRCxVQUFQLElBQXFCLENBQXBFLENBREU7QUFFTEMsV0FBR0wsS0FBS0MsR0FBTCxDQUFTN0MsU0FBUzhDLGVBQVQsQ0FBeUJJLFlBQWxDLEVBQWdEbkQsT0FBT29ELFdBQVAsSUFBc0IsQ0FBdEU7QUFGRSxPQUFQO0FBSUQsS0FORTs7QUFRSEMsWUFBUSxVQUFXQyxNQUFYLEVBQW1CQyxPQUFuQixFQUE2QjtBQUNuQyxVQUFLLE9BQU9ELE1BQVAsS0FBa0IsUUFBdkIsRUFBa0M7QUFDaENyRCxpQkFBU3VELGNBQVQsQ0FBeUJGLE1BQXpCLEVBQWtDRyxXQUFsQyxDQUErQ0YsT0FBL0M7QUFDRCxPQUZELE1BR0s7QUFDSEQsZUFBT0csV0FBUCxDQUFvQkYsT0FBcEI7QUFDRDtBQUNGLEtBZkU7O0FBaUJIO0FBQ0FHLG1CQUFlLFVBQVdKLE1BQVgsRUFBb0I7QUFDakMsVUFBSUssS0FBSixFQUFXQyxJQUFYO0FBQ0E7QUFDQTtBQUNBLFVBQUssQ0FBQ04sTUFBRCxJQUFXN0MsT0FBT0UsUUFBUCxDQUFnQkMsSUFBaEIsQ0FBc0IwQyxNQUF0QixNQUFtQyxpQkFBbkQsRUFBdUU7QUFDckUsZUFBTyxLQUFQO0FBQ0Q7QUFDREssY0FBUWxELE9BQU9vRCxjQUFQLENBQXVCUCxNQUF2QixDQUFSO0FBQ0E7QUFDQSxVQUFLLENBQUNLLEtBQU4sRUFBYztBQUNaLGVBQU8sSUFBUDtBQUNEO0FBQ0Q7QUFDQUMsYUFBT25ELE9BQU9DLGNBQVAsQ0FBc0JFLElBQXRCLENBQTRCK0MsS0FBNUIsRUFBbUMsYUFBbkMsS0FBc0RBLE1BQU1HLFdBQW5FO0FBQ0EsYUFBTyxPQUFPRixJQUFQLEtBQWdCLFVBQWhCLElBQThCbkQsT0FBT0MsY0FBUCxDQUFzQkMsUUFBdEIsQ0FBK0JDLElBQS9CLENBQXFDZ0QsSUFBckMsTUFBZ0RHLGFBQXJGO0FBQ0QsS0FqQ0U7O0FBbUNIQyxrQkFBYyxVQUFXQyxDQUFYLEVBQWNDLENBQWQsRUFBaUI7QUFDN0IsVUFBSUMsS0FBSjtBQUFBLFVBQVdDLEdBQVg7QUFBQSxVQUFnQkMsSUFBaEI7QUFBQSxVQUFzQkMsWUFBWSxLQUFsQztBQUNBLFdBQUssSUFBSUMsR0FBVCxJQUFnQkwsQ0FBaEIsRUFBb0I7O0FBRWxCRSxjQUFNSCxFQUFHTSxHQUFILENBQU47QUFDSkYsZUFBT0gsRUFBR0ssR0FBSCxDQUFQOztBQUVJO0FBQ0EsWUFBS04sTUFBTUksSUFBWCxFQUFrQjtBQUNyQjtBQUNBOztBQUVHLFlBQUlILEVBQUV4RCxjQUFGLENBQWtCNkQsR0FBbEIsQ0FBSixFQUE4Qjs7QUFFNUIsY0FBSUYsU0FBVWxFLEdBQUd1RCxhQUFILENBQWtCVyxJQUFsQixNQUE2QkMsWUFBWUQsS0FBS0csT0FBTCxFQUF6QyxDQUFWLENBQUosRUFBeUU7QUFDdkUsZ0JBQUtGLFNBQUwsRUFBaUI7QUFDZkEsMEJBQVksS0FBWjtBQUNBSCxzQkFBVUMsT0FBT0EsSUFBSUksT0FBYixHQUF5QkosR0FBekIsR0FBK0IsRUFBdkM7QUFDRCxhQUhELE1BR087QUFDTEQsc0JBQVVDLE9BQU9qRSxHQUFHdUQsYUFBSCxDQUFrQlUsR0FBbEIsQ0FBVCxHQUFxQ0EsR0FBckMsR0FBMkMsRUFBbkQ7QUFDRDtBQUNESCxjQUFHTSxHQUFILElBQVdwRSxHQUFHNkQsWUFBSCxDQUFpQkcsS0FBakIsRUFBd0JFLElBQXhCLENBQVg7QUFDRCxXQVJELE1BUU87QUFDSEosY0FBR00sR0FBSCxJQUFXRixJQUFYO0FBQ0g7QUFDRjtBQUNGO0FBQ0QsYUFBT0osQ0FBUDtBQUNEO0FBL0RFLEdBQUw7O0FBa0VGLFdBQVNRLE1BQVQsQ0FBa0JDLFFBQWxCLEVBQTRCQyxLQUE1QixFQUFtQ0MsVUFBbkMsRUFBZ0Q7QUFDOUMsU0FBS0YsUUFBTCxHQUFnQkEsUUFBaEI7QUFDQSxTQUFLRyxJQUFMLEdBQWMsT0FBT0YsS0FBUCxLQUFpQixRQUFuQixHQUFnQyxTQUFoQyxHQUE0QyxNQUF4RDtBQUNBLFNBQUtHLE9BQUwsR0FBZUgsS0FBZjtBQUNBLFNBQUtJLE1BQUwsR0FBYyxLQUFLTCxRQUFMLENBQWNNLFNBQWQsQ0FBeUJKLFVBQXpCLENBQWQ7QUFDQSxTQUFLSyxPQUFMLEdBQWUsS0FBS1AsUUFBTCxDQUFjUSxZQUFkLENBQTRCLEtBQUtILE1BQWpDLENBQWY7QUFDQSxTQUFLSSxJQUFMLEdBQWMsT0FBT1IsS0FBUCxLQUFpQixRQUFuQixHQUFnQyxLQUFLRCxRQUFMLENBQWNVLFlBQWQsQ0FBNEJULEtBQTVCLEVBQW1DQyxVQUFuQyxDQUFoQyxHQUFrRixFQUFDUyxHQUFFLENBQUgsRUFBTUMsR0FBRSxDQUFSLEVBQVcxQyxHQUFFLENBQWIsRUFBZ0JNLEdBQUUsQ0FBbEIsRUFBOUY7QUFDQSxTQUFLcUMsTUFBTCxHQUFjLEtBQUtDLFNBQUwsRUFBZDtBQUNBLFNBQUtDLE1BQUwsR0FBYyxLQUFLQyxjQUFMLEVBQWQ7QUFDRDs7QUFFRGpCLFNBQU9rQixTQUFQLEdBQW1CO0FBQ2pCO0FBQ0FDLFdBQU8sWUFBWTtBQUNqQixXQUFLWCxPQUFMLENBQWFZLFNBQWIsQ0FBdUIsQ0FBdkIsRUFBMEIsQ0FBMUIsRUFBNkIsS0FBS2QsTUFBTCxDQUFZaEUsS0FBekMsRUFBZ0QsS0FBS2dFLE1BQUwsQ0FBWWpFLE1BQTVEO0FBQ0QsS0FKZ0I7O0FBTWpCMEUsZUFBVyxZQUFZOztBQUVyQixXQUFLSSxLQUFMOztBQUVBLGNBQVMsS0FBS2YsSUFBZDs7QUFFRSxhQUFLLFNBQUw7QUFDRSxlQUFLSSxPQUFMLENBQWFhLFNBQWIsQ0FBd0IsS0FBS2hCLE9BQTdCLEVBQXNDLEtBQUtLLElBQUwsQ0FBVUUsQ0FBaEQsRUFBbUQsS0FBS0YsSUFBTCxDQUFVRyxDQUE3RCxFQUFnRSxLQUFLSCxJQUFMLENBQVV2QyxDQUExRSxFQUE2RSxLQUFLdUMsSUFBTCxDQUFVakMsQ0FBdkY7QUFDQTs7QUFFRixhQUFLLE1BQUw7QUFDRSxlQUFLNkMsT0FBTDtBQUNBOztBQUVGO0FBQ0UsaUJBQU8sS0FBUDtBQVhKOztBQWNBLFVBQUksQ0FBQyxLQUFLWixJQUFMLENBQVV2QyxDQUFYLElBQWdCLENBQUMsS0FBS3VDLElBQUwsQ0FBVWpDLENBQS9CLEVBQW1DLE9BQU8sS0FBUDs7QUFFbkMsYUFBTyxLQUFLK0IsT0FBTCxDQUFhZSxZQUFiLENBQTJCLEtBQUtiLElBQUwsQ0FBVUUsQ0FBckMsRUFBd0MsS0FBS0YsSUFBTCxDQUFVRyxDQUFsRCxFQUFxRCxLQUFLSCxJQUFMLENBQVV2QyxDQUEvRCxFQUFrRSxLQUFLdUMsSUFBTCxDQUFVakMsQ0FBNUUsQ0FBUDtBQUNELEtBM0JnQjs7QUE2QmpCNkMsYUFBUyxZQUFZOztBQUVuQixVQUFJRSxVQUFVLEtBQUtuQixPQUFMLENBQWFvQixJQUFiLEVBQWQ7O0FBRUEsVUFBSUQsWUFBWSxFQUFoQixFQUFvQjtBQUNsQixhQUFLZCxJQUFMLENBQVVFLENBQVYsR0FBYyxDQUFkO0FBQ0EsYUFBS0YsSUFBTCxDQUFVRyxDQUFWLEdBQWMsQ0FBZDtBQUNBLGFBQUtILElBQUwsQ0FBVXZDLENBQVYsR0FBYyxDQUFkO0FBQ0EsYUFBS3VDLElBQUwsQ0FBVWpDLENBQVYsR0FBYyxDQUFkO0FBQ0EsYUFBS2lELFdBQUw7QUFDQSxlQUFPLEtBQVA7QUFDRDs7QUFFRCxVQUFJQyxDQUFKO0FBQUEsVUFBT3hELElBQUksQ0FBWDtBQUFBLFVBQWN5QyxJQUFJLEVBQWxCO0FBQUEsVUFBc0JDLElBQUksRUFBMUI7QUFBQSxVQUNFZSxRQUFRLEtBQUt2QixPQUFMLENBQWF3QixLQUFiLENBQW1CLElBQW5CLENBRFY7QUFBQSxVQUVFdEUsV0FBVyxLQUFLMEMsUUFBTCxDQUFjNkIsUUFBZCxDQUF1QnZFLFFBRnBDOztBQUlBLFdBQUtpRCxPQUFMLENBQWFsRCxJQUFiLEdBQW9CQyxXQUFXLEtBQVgsR0FBbUIsS0FBSzBDLFFBQUwsQ0FBYzZCLFFBQWQsQ0FBdUJ4RSxJQUE5RDtBQUNBLFdBQUtrRCxPQUFMLENBQWF1QixTQUFiLEdBQXlCLEtBQUs5QixRQUFMLENBQWM2QixRQUFkLENBQXVCekUsU0FBaEQ7QUFDQSxXQUFLbUQsT0FBTCxDQUFhd0IsU0FBYixHQUF5QixNQUF6Qjs7QUFFQSxXQUFLTCxJQUFJLENBQVQsRUFBWUEsSUFBSUMsTUFBTUssTUFBdEIsRUFBOEJOLEdBQTlCLEVBQW1DO0FBQ2pDLGFBQUtuQixPQUFMLENBQWEwQixRQUFiLENBQXVCTixNQUFNRCxDQUFOLENBQXZCLEVBQWlDZixDQUFqQyxFQUFvQ0MsSUFBSWMsSUFBRXBFLFFBQTFDO0FBQ0FZLFlBQUlDLEtBQUtDLEdBQUwsQ0FBVUYsQ0FBVixFQUFhQyxLQUFLK0QsS0FBTCxDQUFXLEtBQUszQixPQUFMLENBQWE0QixXQUFiLENBQTBCUixNQUFNRCxDQUFOLENBQTFCLEVBQXFDckYsS0FBaEQsQ0FBYixDQUFKO0FBQ0Q7O0FBRUQsV0FBS29FLElBQUwsQ0FBVUUsQ0FBVixHQUFjeEMsS0FBS0MsR0FBTCxDQUFVdUMsQ0FBVixFQUFjLEtBQUtGLElBQUwsQ0FBVUUsQ0FBeEIsQ0FBZDtBQUNBLFdBQUtGLElBQUwsQ0FBVUcsQ0FBVixHQUFjekMsS0FBS0MsR0FBTCxDQUFXd0MsSUFBSXRELFFBQWYsRUFBMEIsS0FBS21ELElBQUwsQ0FBVUcsQ0FBcEMsQ0FBZDtBQUNBLFdBQUtILElBQUwsQ0FBVXZDLENBQVYsR0FBY0MsS0FBS0MsR0FBTCxDQUFXRixJQUFJWixRQUFmLEVBQTBCLEtBQUttRCxJQUFMLENBQVV2QyxDQUFwQyxDQUFkO0FBQ0EsV0FBS3VDLElBQUwsQ0FBVWpDLENBQVYsR0FBY0wsS0FBS0MsR0FBTCxDQUFXZCxXQUFXb0UsQ0FBWCxHQUFlcEUsUUFBMUIsRUFBcUMsS0FBS21ELElBQUwsQ0FBVWpDLENBQS9DLENBQWQ7QUFDRCxLQTNEZ0I7O0FBNkRqQjRELGlCQUFhLFVBQVdyRSxJQUFYLEVBQWlCc0UsUUFBakIsRUFBNEI7QUFDdkMsVUFBSVgsQ0FBSjtBQUFBLFVBQU9ZLElBQUksS0FBS3hCLFNBQUwsRUFBWDtBQUNBLFVBQUsvQyxJQUFMLEVBQVk7QUFDVixZQUFJd0UsT0FBTyxDQUFFRCxDQUFGLENBQVg7QUFDQSxhQUFNWixJQUFJLENBQVYsRUFBYUEsSUFBSVcsU0FBU0wsTUFBMUIsRUFBa0NOLEdBQWxDLEVBQXdDO0FBQ3RDYSxlQUFLQyxJQUFMLENBQVdILFNBQVNYLENBQVQsQ0FBWDtBQUNEO0FBQ0QsYUFBS2IsTUFBTCxHQUFjbkYsT0FBT3FDLElBQVAsRUFBYTBFLEtBQWIsQ0FBb0IsSUFBcEIsRUFBMEJGLElBQTFCLENBQWQ7QUFDQSxhQUFLaEMsT0FBTCxDQUFhbUMsWUFBYixDQUEyQixLQUFLN0IsTUFBaEMsRUFBd0MsS0FBS0osSUFBTCxDQUFVRSxDQUFsRCxFQUFxRCxLQUFLRixJQUFMLENBQVVHLENBQS9EO0FBQ0QsT0FQRCxNQVFLO0FBQ0gsYUFBS0MsTUFBTCxHQUFjeUIsQ0FBZDtBQUNEO0FBQ0YsS0ExRWdCOztBQTRFakJ0QixvQkFBZ0IsWUFBWTtBQUMxQixVQUFJMkIsQ0FBSjtBQUFBLFVBQU9DLEtBQUssRUFBWjtBQUNBLFdBQU0sSUFBSUMsSUFBVixJQUFrQmhILFlBQWxCLEVBQWlDO0FBQy9COEcsWUFBSSxLQUFLRyxVQUFMLEVBQUo7QUFDQSxhQUFLVixXQUFMLENBQWtCeEcsUUFBUWlILElBQVIsRUFBYzlFLElBQWhDLEVBQXNDLEtBQUtpQyxRQUFMLENBQWM2QixRQUFkLENBQXVCakcsUUFBUWlILElBQVIsRUFBYzdFLEtBQXJDLENBQXRDO0FBQ0EsYUFBS25DLGFBQWFnSCxJQUFiLENBQUwsRUFBeUJGLENBQXpCLEVBQTRCLENBQTVCO0FBQ0FDLFdBQUdDLElBQUgsSUFBV0YsQ0FBWDtBQUNEO0FBQ0QsYUFBT0MsRUFBUDtBQUNELEtBckZnQjs7QUF1RmpCRyxlQUFXLFlBQVU7QUFDbkIsYUFBTyxLQUFLaEMsTUFBTCxDQUFZLEtBQUtmLFFBQUwsQ0FBYzZDLElBQTFCLENBQVA7QUFDRCxLQXpGZ0I7O0FBMkZqQkMsZ0JBQVksWUFBWTtBQUN0QixVQUFJdkQsSUFBSSxLQUFLUyxRQUFMLENBQWM2QixRQUFkLENBQXVCeEYsS0FBL0I7QUFBQSxVQUNFbUQsSUFBSSxLQUFLUSxRQUFMLENBQWM2QixRQUFkLENBQXVCekYsTUFEN0I7QUFBQSxVQUVFNEcsTUFBTSxJQUFJQyxLQUFKLENBQVcxRCxDQUFYLENBRlI7QUFBQSxVQUV3Qm1DLENBRnhCO0FBQUEsVUFFMkJ3QixDQUYzQjtBQUdBLFdBQUt4QixJQUFJLENBQVQsRUFBWUEsSUFBSW5DLENBQWhCLEVBQW1CbUMsR0FBbkIsRUFBeUI7QUFDdkJzQixZQUFJdEIsQ0FBSixJQUFTLElBQUl1QixLQUFKLENBQVd6RCxDQUFYLENBQVQ7QUFDQSxhQUFLMEQsSUFBSSxDQUFULEVBQVlBLElBQUkxRCxDQUFoQixFQUFtQjBELEdBQW5CLEVBQXdCO0FBQ3RCRixjQUFJdEIsQ0FBSixFQUFPd0IsQ0FBUCxJQUFZLENBQVo7QUFDRDtBQUNGO0FBQ0QsYUFBT0YsR0FBUDtBQUNELEtBdEdnQjs7QUF3R2pCdkIsaUJBQWEsVUFBVTBCLEtBQVYsRUFBaUI7QUFDNUIsVUFBSXpCLENBQUo7QUFBQSxVQUFPd0IsQ0FBUDtBQUFBLFVBQVVFLENBQVY7QUFBQSxVQUFhVCxDQUFiO0FBQUEsVUFBZ0JVLENBQWhCO0FBQUEsVUFDRXRDLFNBQVMsS0FBS2dDLFNBQUwsRUFEWDtBQUVBTSxVQUFJRixTQUFTLENBQWI7QUFDQUMsVUFBSXJDLE9BQU9pQixNQUFYO0FBQ0FXLFVBQUk1QixPQUFPLENBQVAsRUFBVWlCLE1BQWQ7QUFDQSxXQUFLTixJQUFJLENBQVQsRUFBWUEsSUFBSTBCLENBQWhCLEVBQW1CMUIsR0FBbkIsRUFBd0I7QUFDdEIsYUFBS3dCLElBQUksQ0FBVCxFQUFZQSxJQUFJUCxDQUFoQixFQUFtQk8sR0FBbkIsRUFBd0I7QUFDdEJuQyxpQkFBT1csQ0FBUCxFQUFVd0IsQ0FBVixJQUFlRyxDQUFmO0FBQ0Q7QUFDRjtBQUNGLEtBbkhnQjs7QUFxSGpCQyxpQkFBYSxVQUFXdkMsTUFBWCxFQUFtQm9DLEtBQW5CLEVBQTJCO0FBQ3RDLFVBQUk1RCxJQUFJLEtBQUtrQixJQUFMLENBQVVFLENBQWxCO0FBQUEsVUFDRW5CLElBQUlyQixLQUFLb0YsR0FBTCxDQUFVcEYsS0FBSytELEtBQUwsQ0FBVzNDLElBQUksS0FBS2tCLElBQUwsQ0FBVXZDLENBQXpCLENBQVYsRUFBdUM2QyxPQUFPaUIsTUFBOUMsQ0FETjtBQUFBLFVBRUV3QixJQUFJLEtBQUsvQyxJQUFMLENBQVVHLENBRmhCO0FBQUEsVUFHRTZDLElBQUl0RixLQUFLb0YsR0FBTCxDQUFVcEYsS0FBSytELEtBQUwsQ0FBV3NCLElBQUksS0FBSy9DLElBQUwsQ0FBVWpDLENBQXpCLENBQVYsRUFBdUN1QyxPQUFPLENBQVAsRUFBVWlCLE1BQWpELENBSE47QUFJQSxVQUFJakIsT0FBT2lCLE1BQVAsR0FBZ0J6QyxDQUFoQixJQUFxQndCLE9BQU8sQ0FBUCxFQUFVaUIsTUFBVixHQUFtQnlCLENBQTVDLEVBQWdEOztBQUVoRCxVQUFJL0IsQ0FBSjtBQUFBLFVBQU93QixDQUFQO0FBQUEsVUFBVVosSUFBSSxLQUFLL0IsT0FBTCxDQUFhZSxZQUFiLENBQTBCLENBQTFCLEVBQTZCLENBQTdCLEVBQWdDLEtBQUt0QixRQUFMLENBQWNLLE1BQWQsQ0FBcUJoRSxLQUFyRCxFQUE0RCxLQUFLMkQsUUFBTCxDQUFjSyxNQUFkLENBQXFCakUsTUFBakYsRUFBeUZzSCxJQUF2Rzs7QUFFQSxXQUFLaEMsSUFBSW5DLENBQVQsRUFBWW1DLElBQUlsQyxDQUFoQixFQUFtQmtDLEdBQW5CLEVBQXdCO0FBQ3RCLGFBQUt3QixJQUFJTSxDQUFULEVBQVlOLElBQUlPLENBQWhCLEVBQW1CUCxHQUFuQixFQUF3QjtBQUN0QixjQUFJUyxNQUFNckIsRUFBRSxDQUFFLEtBQUt0QyxRQUFMLENBQWNLLE1BQWQsQ0FBcUJoRSxLQUFyQixHQUE2QjZHLENBQTlCLEdBQW1DeEIsQ0FBcEMsSUFBeUMsQ0FBM0MsQ0FBVjtBQUNBWCxpQkFBT1csQ0FBUCxFQUFVd0IsQ0FBVixJQUFpQlMsUUFBUSxHQUFWLEdBQWtCUixLQUFsQixHQUEwQixDQUF6QztBQUNEO0FBQ0Y7QUFDRixLQXBJZ0I7O0FBc0lqQlMsc0JBQWtCLFVBQVdoRixNQUFYLEVBQW1CbEQsTUFBbkIsRUFBNEI7QUFDNUMsVUFBSW1JLE9BQU8sSUFBWDtBQUNBLFVBQUlsQixJQUFJLElBQUk1QyxNQUFKLENBQWEsS0FBS0MsUUFBbEIsRUFBNEIsS0FBS0ksT0FBakMsRUFBMEMsRUFBRWxDLEdBQUUsS0FBSzhCLFFBQUwsQ0FBYzZCLFFBQWQsQ0FBdUJqRixVQUEzQixFQUF1QzRCLEdBQUUsS0FBS3dCLFFBQUwsQ0FBYzZCLFFBQWQsQ0FBdUJoRixXQUFoRSxFQUExQyxDQUFSOztBQUVBLFVBQUtuQixNQUFMLEVBQWM7QUFDWmlILFVBQUVQLFdBQUYsQ0FBZXhHLFFBQVEsS0FBS29FLFFBQUwsQ0FBYzZDLElBQXRCLEVBQTRCOUUsSUFBM0MsRUFBaUQsS0FBSzhELFFBQUwsQ0FBY2pHLFFBQVEsS0FBS29FLFFBQUwsQ0FBYzZDLElBQXRCLEVBQTRCN0UsS0FBMUMsQ0FBakQ7QUFDRDs7QUFFRDJFLFFBQUV0QyxNQUFGLENBQVN5RCxPQUFULEdBQW1CLFVBQVUvQyxNQUFWLEVBQWtCO0FBQ25DLGVBQU8sVUFBV2dELENBQVgsRUFBZTtBQUNwQkYsZUFBSzdELFFBQUwsQ0FBY2dFLElBQWQsQ0FBb0JqRCxNQUFwQjtBQUNBOEMsZUFBSzdELFFBQUwsQ0FBY2lFLFVBQWQ7QUFDQUosZUFBSzdELFFBQUwsQ0FBY2tFLGdCQUFkO0FBQ0QsU0FKRDtBQUtELE9BTmtCLENBTWhCdkIsQ0FOZ0IsQ0FBbkI7O0FBUUEsV0FBSzNDLFFBQUwsQ0FBY21FLGdCQUFkLENBQStCM0IsSUFBL0IsQ0FBcUNHLENBQXJDO0FBQ0FsSCxTQUFHa0QsTUFBSCxDQUFXQyxNQUFYLEVBQW1CK0QsRUFBRXRDLE1BQXJCOztBQUVBLGFBQU9zQyxDQUFQO0FBQ0Q7QUExSmdCLEdBQW5COztBQTZKQTs7Ozs7O0FBTUEsV0FBU3lCLFFBQVQsQ0FBcUJDLE9BQXJCLEVBQStCO0FBQzdCLFNBQUt4QyxRQUFMLEdBQWdCOUYsT0FBT3VJLE1BQVAsQ0FBZSxFQUFmLEVBQW1CbkksUUFBbkIsRUFBNkJrSSxPQUE3QixDQUFoQjtBQUNBLFNBQUtFLFNBQUwsR0FBaUIsRUFBakI7QUFDQSxTQUFLSixnQkFBTCxHQUF3QixFQUF4QjtBQUNBLFNBQUtLLFNBQUwsR0FBaUIsRUFBakI7QUFDQSxTQUFLQyxNQUFMLEdBQWMsRUFBZDtBQUNBLFNBQUs1QixJQUFMLEdBQVksS0FBS2hCLFFBQUwsQ0FBY25FLFdBQTFCO0FBQ0EsU0FBS2dILFVBQUwsR0FBa0IsS0FBbEI7QUFDQSxTQUFLQyxXQUFMLEdBQW1CLElBQW5CO0FBQ0EsU0FBS3RFLE1BQUwsR0FBYyxLQUFLQyxTQUFMLEVBQWQ7QUFDQSxTQUFLQyxPQUFMLEdBQWUsS0FBS0MsWUFBTCxDQUFtQixLQUFLSCxNQUF4QixDQUFmO0FBQ0Q7O0FBRUQrRCxXQUFTbkQsU0FBVCxHQUFxQjs7QUFFakI7O0FBRUEyRCxVQUFNLFlBQVk7O0FBRWhCbkosU0FBR2tELE1BQUgsQ0FBVyxLQUFLa0QsUUFBTCxDQUFjckYsYUFBekIsRUFBd0MsS0FBSzZELE1BQTdDO0FBQ0EsV0FBS0EsTUFBTCxDQUFZd0UsS0FBWixDQUFrQkMsZUFBbEIsR0FBb0MsS0FBS2pELFFBQUwsQ0FBY3ZGLFVBQWxEO0FBQ0EsV0FBS3lJLFVBQUw7QUFDQSxXQUFLTixNQUFMLENBQVlqQyxJQUFaLENBQWtCLElBQUl3QyxLQUFKLENBQVcsSUFBSUMsTUFBSixDQUFXLEtBQUtwRCxRQUFMLENBQWNyRSxLQUF6QixFQUFnQyxLQUFLcUUsUUFBTCxDQUFjcEUsS0FBOUMsQ0FBWCxFQUFpRSxLQUFLb0UsUUFBTCxDQUFjOUUsSUFBL0UsQ0FBbEI7QUFDQSxXQUFLbUksSUFBTDtBQUVELEtBWmdCOztBQWNqQkMsU0FBSyxVQUFXZCxPQUFYLEVBQW9CO0FBQ3ZCdEksYUFBT3VJLE1BQVAsQ0FBZSxLQUFLekMsUUFBcEIsRUFBOEJ3QyxPQUE5QjtBQUNELEtBaEJnQjs7QUFrQmpCZSxpQkFBYSxVQUFVbkYsS0FBVixFQUFpQkMsVUFBakIsRUFBNkI7QUFDeEMsVUFBSXlDLElBQUksSUFBSTVDLE1BQUosQ0FBYSxJQUFiLEVBQW1CRSxLQUFuQixFQUEwQkMsVUFBMUIsQ0FBUjtBQUNBLFdBQUt5RSxXQUFMLEdBQXFCLEtBQUtBLFdBQUwsS0FBcUIsSUFBdkIsR0FBZ0MsQ0FBaEMsR0FBb0MsS0FBS0EsV0FBNUQ7QUFDQSxXQUFLSixTQUFMLENBQWUvQixJQUFmLENBQXFCRyxDQUFyQjtBQUNBLGFBQU9BLENBQVA7QUFDRCxLQXZCZ0I7O0FBeUJqQnJDLGVBQVcsVUFBV0csSUFBWCxFQUFrQjtBQUMzQixVQUFJSixTQUFTOUUsU0FBUzhKLGFBQVQsQ0FBd0IsUUFBeEIsQ0FBYjtBQUFBLFVBQ0lDLElBQUk3RSxRQUFRLEVBRGhCOztBQUdBSixhQUFPakUsTUFBUCxHQUFrQmtKLEVBQUU5RyxDQUFKLEdBQVU4RyxFQUFFOUcsQ0FBWixHQUFnQixLQUFLcUQsUUFBTCxDQUFjekYsTUFBOUM7QUFDQWlFLGFBQU9oRSxLQUFQLEdBQWlCaUosRUFBRXBILENBQUosR0FBVW9ILEVBQUVwSCxDQUFaLEdBQWdCLEtBQUsyRCxRQUFMLENBQWN4RixLQUE3Qzs7QUFFQSxhQUFPZ0UsTUFBUDtBQUNELEtBakNnQjs7QUFtQ2pCRyxrQkFBYyxVQUFXSCxNQUFYLEVBQW9CO0FBQ2hDLGFBQU9BLE9BQU9rRixVQUFQLENBQW1CLElBQW5CLENBQVA7QUFDRCxLQXJDZ0I7O0FBdUNqQjdFLGtCQUFjLFVBQVc4RSxHQUFYLEVBQWdCL0UsSUFBaEIsRUFBdUI7QUFDbkMsVUFBSXZDLElBQUlzSCxJQUFJbkosS0FBWjtBQUFBLFVBQ0ltQyxJQUFJZ0gsSUFBSXBKLE1BRFo7QUFBQSxVQUVJcUosS0FBT2hGLElBQUYsR0FBV0EsS0FBS3ZDLENBQWhCLEdBQW9CLEtBQUttQyxNQUFMLENBQVloRSxLQUZ6QztBQUFBLFVBR0lxSixLQUFPakYsSUFBRixHQUFXQSxLQUFLakMsQ0FBaEIsR0FBb0IsS0FBSzZCLE1BQUwsQ0FBWWpFLE1BSHpDO0FBQUEsVUFJSXVKLFFBQVF6SCxJQUFJTSxDQUpoQjs7QUFNQSxVQUFLTixLQUFLTSxDQUFMLElBQVVOLElBQUl1SCxFQUFuQixFQUF3QjtBQUN0QnZILFlBQUl1SCxFQUFKO0FBQ0FqSCxZQUFJTCxLQUFLeUgsS0FBTCxDQUFZMUgsSUFBSXlILEtBQWhCLENBQUo7QUFDRCxPQUhELE1BS0s7QUFDSCxZQUFLbkgsSUFBSWtILEVBQVQsRUFBYztBQUNabEgsY0FBSWtILEVBQUo7QUFDQXhILGNBQUlDLEtBQUt5SCxLQUFMLENBQVlwSCxJQUFJbUgsS0FBaEIsQ0FBSjtBQUNEO0FBQ0Y7O0FBRUQsYUFBTztBQUNMaEYsV0FBR3hDLEtBQUt5SCxLQUFMLENBQVksQ0FBRUgsS0FBS3ZILENBQVAsSUFBYSxDQUF6QixDQURFO0FBRUwwQyxXQUFHekMsS0FBS3lILEtBQUwsQ0FBWSxDQUFFRixLQUFLbEgsQ0FBUCxJQUFhLENBQXpCLENBRkU7QUFHTE4sV0FBR0EsQ0FIRTtBQUlMTSxXQUFHQTtBQUpFLE9BQVA7QUFNRCxLQWhFZ0I7O0FBa0VqQnFILFVBQU0sVUFBVzlCLENBQVgsRUFBZTtBQUNuQixVQUFJckMsQ0FBSjtBQUFBLFVBQU9vRSxRQUFRL0IsRUFBRW5GLE1BQUYsQ0FBU2tILEtBQXhCO0FBQUEsVUFBK0JqQyxPQUFPLElBQXRDO0FBQ0EsVUFBSyxDQUFDaUMsS0FBTixFQUFjOztBQUVkLFdBQU1wRSxJQUFJLENBQVYsRUFBYUEsSUFBSW9FLE1BQU05RCxNQUF2QixFQUErQk4sR0FBL0IsRUFBb0M7QUFDbEMsWUFBSXFFLE9BQU9ELE1BQU1wRSxDQUFOLENBQVg7QUFDQSxZQUFLLENBQUNxRSxLQUFLNUYsSUFBTCxDQUFVNkYsS0FBVixDQUFpQixPQUFqQixDQUFOLEVBQW1DOztBQUVuQyxZQUFJQyxTQUFTLElBQUlDLFVBQUosRUFBYjtBQUNBRCxlQUFPRSxNQUFQLEdBQWdCLFVBQVdDLEtBQVgsRUFBbUI7QUFDakMsY0FBSVosTUFBTSxJQUFJYSxLQUFKLEVBQVY7QUFDQWIsY0FBSVcsTUFBSixHQUFhLFlBQVU7QUFDckIsZ0JBQUl4RCxDQUFKO0FBQ0FBLGdCQUFJa0IsS0FBS3VCLFdBQUwsQ0FBa0IsSUFBbEIsQ0FBSjtBQUNBekMsY0FBRWlCLGdCQUFGLENBQW9CQyxLQUFLaEMsUUFBTCxDQUFjbkYsWUFBbEMsRUFBZ0QsS0FBaEQ7QUFDRCxXQUpEO0FBS0E4SSxjQUFJOUYsR0FBSixHQUFVMEcsTUFBTXhILE1BQU4sQ0FBYTBILE1BQXZCO0FBQ0QsU0FSRDtBQVNBTCxlQUFPTSxhQUFQLENBQXNCUixJQUF0QjtBQUNEO0FBQ0YsS0F0RmdCOztBQXdGakJTLGdCQUFZLFVBQVczRCxJQUFYLEVBQWtCOztBQUU1QixXQUFLQSxJQUFMLEdBQVlBLElBQVo7O0FBRUEsVUFBSSxPQUFPLEtBQUtoQixRQUFMLENBQWNoRSxrQkFBckIsS0FBNEMsVUFBaEQsRUFBNkQ7QUFDM0QsYUFBS2dFLFFBQUwsQ0FBY2hFLGtCQUFkLENBQWlDM0IsSUFBakMsQ0FBdUMsSUFBdkM7QUFDRDtBQUNGLEtBL0ZnQjs7QUFpR2pCdUssYUFBUyxVQUFVOUYsQ0FBVixFQUFhQyxDQUFiLEVBQWdCN0QsSUFBaEIsRUFBc0I7QUFDN0IsVUFBSTRGLElBQUksSUFBSXFDLEtBQUosQ0FBVyxJQUFJQyxNQUFKLENBQVd0RSxDQUFYLEVBQWNDLENBQWQsQ0FBWCxFQUE2QjdELElBQTdCLENBQVI7QUFDQSxXQUFLMEgsTUFBTCxDQUFZakMsSUFBWixDQUFrQkcsQ0FBbEI7QUFDQSxhQUFPQSxDQUFQO0FBQ0QsS0FyR2dCOztBQXVHakJvQyxnQkFBWSxZQUFZO0FBQ3RCO0FBQ0E7QUFDQTs7QUFFQSxXQUFLbEQsUUFBTCxDQUFjckUsS0FBZCxHQUFzQixLQUFLNkMsTUFBTCxDQUFZaEUsS0FBWixHQUFrQixDQUF4QztBQUNBLFdBQUt3RixRQUFMLENBQWNwRSxLQUFkLEdBQXNCLEtBQUs0QyxNQUFMLENBQVlqRSxNQUFaLEdBQW1CLENBQXpDO0FBRUQsS0EvR2dCOztBQWlIakJzSyxpQkFBYSxVQUFXQyxRQUFYLEVBQXNCO0FBQ2pDLFVBQUlqRixDQUFKO0FBQUEsVUFBTzBCLElBQUl6SCxRQUFRLEtBQUtrSCxJQUFiLEVBQW1CYixNQUE5QjtBQUNBLFdBQU1OLElBQUksQ0FBVixFQUFhQSxJQUFJMEIsQ0FBakIsRUFBb0IxQixHQUFwQixFQUEwQjtBQUN4QmlGLGlCQUFTaEwsUUFBUSxLQUFLa0gsSUFBYixFQUFtQm5CLENBQW5CLENBQVQ7QUFDRDtBQUNGLEtBdEhnQjs7QUF3SGpCc0MsVUFBTSxVQUFXakQsTUFBWCxFQUFvQjtBQUN4QixXQUFLNEQsV0FBTCxHQUFtQixLQUFLUixnQkFBTCxDQUFzQnlDLE9BQXRCLENBQStCN0YsTUFBL0IsQ0FBbkI7QUFDRCxLQTFIZ0I7O0FBNEhqQm1ELHNCQUFrQixZQUFZO0FBQzVCLFVBQUlMLE9BQU8sSUFBWDtBQUNBLFdBQUthLFVBQUwsR0FBa0IsQ0FBQyxLQUFLQSxVQUF4QjtBQUNFLFdBQUtELE1BQUwsQ0FBWSxDQUFaLEVBQWUxSCxJQUFmLEdBQXNCLEtBQUs4RSxRQUFMLENBQWM3RSxRQUFwQztBQUNBNkosaUJBQVcsWUFBVTtBQUNuQmhELGFBQUtZLE1BQUwsQ0FBWSxDQUFaLEVBQWUxSCxJQUFmLEdBQXNCOEcsS0FBS2hDLFFBQUwsQ0FBYzlFLElBQXBDO0FBQ0E4RyxhQUFLYSxVQUFMLEdBQWtCLENBQUNiLEtBQUthLFVBQXhCO0FBQ0QsT0FIRCxFQUdHLEdBSEg7QUFJSCxLQXBJZ0I7O0FBc0lqQm9DLGVBQVcsWUFBWTtBQUNyQixVQUFJLEtBQUt0QyxTQUFMLENBQWV4QyxNQUFmLEdBQXdCLEtBQUtILFFBQUwsQ0FBYzVFLE9BQTFDLEVBQW1EO0FBQ2pELFlBQUl5RSxDQUFKO0FBQUEsWUFBT3FGLEtBQUssS0FBS2xGLFFBQUwsQ0FBYzVFLE9BQWQsR0FBd0IsS0FBS3VILFNBQUwsQ0FBZXhDLE1BQW5EO0FBQ0EsYUFBTU4sSUFBSSxDQUFWLEVBQWFBLElBQUlxRixFQUFqQixFQUFxQnJGLEdBQXJCLEVBQTJCO0FBQ3pCLGVBQUs4QyxTQUFMLENBQWVoQyxJQUFmLENBQW9CLElBQUl3RSxRQUFKLENBQWEsSUFBYixFQUFtQixJQUFJL0IsTUFBSixDQUFXOUcsS0FBSzhJLE1BQUwsS0FBZ0IsS0FBSzVHLE1BQUwsQ0FBWWhFLEtBQXZDLEVBQThDOEIsS0FBSzhJLE1BQUwsS0FBZ0IsS0FBSzVHLE1BQUwsQ0FBWWpFLE1BQTFFLENBQW5CLEVBQXNHLElBQUk2SSxNQUFKLENBQVdpQyxXQUFXLEtBQUtyRixRQUFMLENBQWN0RSxlQUF6QixDQUFYLEVBQXNEMkosV0FBVyxLQUFLckYsUUFBTCxDQUFjdEUsZUFBekIsQ0FBdEQsQ0FBdEcsRUFBd00sSUFBSTBILE1BQUosQ0FBVyxDQUFYLEVBQWMsQ0FBZCxDQUF4TSxFQUEwTixDQUExTixFQUE2TixLQUE3TixDQUFwQjtBQUNEO0FBQ0Y7QUFDRixLQTdJZ0I7O0FBK0lqQmtDLGtCQUFjLFlBQVk7QUFDeEIsVUFBSUMsZUFBZSxFQUFuQjtBQUFBLFVBQ0kxRixDQURKO0FBQUEsVUFDTzBCLElBQUksS0FBS29CLFNBQUwsQ0FBZXhDLE1BRDFCO0FBRUEsV0FBS04sSUFBSSxDQUFULEVBQVlBLElBQUkwQixDQUFoQixFQUFtQjFCLEdBQW5CLEVBQXdCO0FBQ3RCLFlBQUlpRixXQUFXLEtBQUtuQyxTQUFMLENBQWU5QyxDQUFmLENBQWY7QUFBQSxZQUNJMkYsTUFBTVYsU0FBU1csUUFEbkI7QUFFQSxZQUFJRCxJQUFJMUcsQ0FBSixJQUFTLEtBQUtOLE1BQUwsQ0FBWWhFLEtBQXJCLElBQThCZ0wsSUFBSTFHLENBQUosSUFBUyxDQUF2QyxJQUE0QzBHLElBQUl6RyxDQUFKLElBQVMsS0FBS1AsTUFBTCxDQUFZakUsTUFBakUsSUFBMkVpTCxJQUFJekcsQ0FBSixJQUFTLENBQXhGLEVBQTRGO0FBQzVGLGFBQUs4RixXQUFMLENBQWtCQyxRQUFsQjtBQUNBQSxpQkFBU1ksSUFBVDtBQUNBSCxxQkFBYTVFLElBQWIsQ0FBbUJtRSxRQUFuQjtBQUNEO0FBQ0QsV0FBS25DLFNBQUwsR0FBaUI0QyxZQUFqQjtBQUNBLFdBQUt2RixRQUFMLENBQWMyRixPQUFkLEdBQXdCLEtBQXhCO0FBQ0QsS0E1SmdCOztBQThKakJDLGVBQVcsWUFBWTtBQUNyQixVQUFJL0YsQ0FBSjtBQUFBLFVBQU9nRyxJQUFJLEtBQUtsRCxTQUFMLENBQWV4QyxNQUExQjtBQUNBLFdBQUtOLElBQUksQ0FBVCxFQUFZQSxJQUFJZ0csQ0FBaEIsRUFBbUJoRyxHQUFuQixFQUF3QjtBQUN0QixZQUFJMkYsTUFBTSxLQUFLN0MsU0FBTCxDQUFlOUMsQ0FBZixFQUFrQjRGLFFBQTVCO0FBQ0EsYUFBSy9HLE9BQUwsQ0FBYXVCLFNBQWIsR0FBeUIsS0FBSzBDLFNBQUwsQ0FBZTlDLENBQWYsRUFBa0JpRyxLQUEzQztBQUNBLGFBQUtwSCxPQUFMLENBQWFxSCxRQUFiLENBQXNCUCxJQUFJMUcsQ0FBMUIsRUFBNkIwRyxJQUFJekcsQ0FBakMsRUFBb0MsS0FBS2lCLFFBQUwsQ0FBYzNFLFlBQWxELEVBQWdFLEtBQUsyRSxRQUFMLENBQWMzRSxZQUE5RTtBQUNEO0FBQ0YsS0FyS2dCOztBQXVLakIrRyxnQkFBWSxZQUFZO0FBQ3RCLFVBQUl2QyxDQUFKO0FBQUEsVUFBTzBCLElBQUksS0FBS29CLFNBQUwsQ0FBZXhDLE1BQTFCO0FBQ0EsV0FBS04sSUFBSSxDQUFULEVBQVlBLElBQUkwQixDQUFoQixFQUFtQjFCLEdBQW5CLEVBQXdCO0FBQ3RCLGFBQUs4QyxTQUFMLENBQWU5QyxDQUFmLEVBQWtCbUcsTUFBbEIsR0FBMkIsQ0FBM0I7QUFDRDtBQUNGLEtBNUtnQjs7QUE4S2pCO0FBQ0EzRyxXQUFPLFlBQVk7QUFDakIsVUFBSSxDQUFDLEtBQUtXLFFBQUwsQ0FBY2xFLElBQW5CLEVBQTBCO0FBQ3hCLGFBQUs0QyxPQUFMLENBQWFZLFNBQWIsQ0FBd0IsQ0FBeEIsRUFBMkIsQ0FBM0IsRUFBOEIsS0FBS2QsTUFBTCxDQUFZaEUsS0FBMUMsRUFBaUQsS0FBS2dFLE1BQUwsQ0FBWWpFLE1BQTdEO0FBQ0Q7QUFDRixLQW5MZ0I7O0FBcUxqQjtBQUNBMEwsV0FBTyxZQUFZO0FBQ2pCLFVBQUlqRSxPQUFPLElBQVg7QUFDQSxVQUFJLENBQUMsS0FBS2hDLFFBQUwsQ0FBY2pFLElBQW5CLEVBQTBCO0FBQ2xCLGFBQUttSyxTQUFMLEdBQWlCek0sT0FBTzBNLHFCQUFQLENBQThCbkUsS0FBS3FCLElBQUwsQ0FBVStDLElBQVYsQ0FBZXBFLElBQWYsQ0FBOUIsQ0FBakI7QUFDUCxPQUZELE1BRU87QUFDQ3ZJLGVBQU80TSxvQkFBUCxDQUE2QnJFLEtBQUtrRSxTQUFsQztBQUNBLGFBQUtBLFNBQUwsR0FBaUJ2TSxTQUFqQjtBQUNQO0FBQ0YsS0E5TGdCOztBQWdNakI7QUFDQTJNLFlBQVEsWUFBWTtBQUNsQixXQUFLckIsU0FBTDtBQUNBLFdBQUtLLFlBQUw7QUFDRCxLQXBNZ0I7O0FBc01qQjtBQUNBeEosVUFBTSxZQUFZO0FBQ2hCLFdBQUs4SixTQUFMO0FBQ0QsS0F6TWdCOztBQTJNakI7QUFDQXZDLFVBQU0sWUFBWTtBQUNoQixXQUFLaEUsS0FBTDtBQUNBLFdBQUtpSCxNQUFMO0FBQ0EsV0FBS3hLLElBQUw7QUFDQSxXQUFLbUssS0FBTDtBQUNELEtBak5nQjs7QUFtTmpCbEssVUFBTSxZQUFZO0FBQ2hCLFdBQUtpRSxRQUFMLENBQWNqRSxJQUFkLEdBQXFCLElBQXJCO0FBQ0QsS0FyTmdCOztBQXVOakJ3SyxXQUFPLFlBQVk7QUFDakIsV0FBS3ZHLFFBQUwsQ0FBY2pFLElBQWQsR0FBcUIsS0FBckI7QUFDQSxXQUFLc0gsSUFBTDtBQUNEOztBQTFOZ0IsR0FBckI7O0FBOE5FeEosV0FBUzs7QUFFUDJNLG1CQUFlLFVBQVd4SCxNQUFYLEVBQW1CeUgsU0FBbkIsRUFBK0I7QUFDNUMsVUFBSyxDQUFDekgsTUFBTixFQUFlLE9BQU9BLE1BQVA7QUFDZixVQUFJYSxDQUFKO0FBQUEsVUFBTzZHLENBQVA7QUFBQSxVQUFVQyxDQUFWO0FBQUEsVUFBYWhKLENBQWI7QUFBQSxVQUFnQjZELENBQWhCO0FBQUEsVUFBbUJJLElBQUk1QyxPQUFPNkMsSUFBOUI7QUFDQSxXQUFNaEMsSUFBSSxDQUFWLEVBQWFBLElBQUkrQixFQUFFekIsTUFBbkIsRUFBMkJOLEtBQUcsQ0FBOUIsRUFBa0M7QUFDaEM2RyxZQUFJOUUsRUFBRS9CLENBQUYsQ0FBSjtBQUNBOEcsWUFBSS9FLEVBQUUvQixJQUFFLENBQUosQ0FBSjtBQUNBbEMsWUFBSWlFLEVBQUUvQixJQUFFLENBQUosQ0FBSjtBQUNBMkIsWUFBSyxTQUFPa0YsQ0FBUCxHQUFXLFNBQU9DLENBQWxCLEdBQXNCLFNBQU9oSixDQUE3QixJQUFrQzhJLFNBQW5DLEdBQWdELEdBQWhELEdBQXNELENBQTFEO0FBQ0E3RSxVQUFFL0IsQ0FBRixJQUFPK0IsRUFBRS9CLElBQUUsQ0FBSixJQUFTK0IsRUFBRS9CLElBQUUsQ0FBSixJQUFTMkIsQ0FBekI7QUFDRDtBQUNELGFBQU94QyxNQUFQO0FBQ0Q7O0FBYk0sR0FBVDs7QUFpQkQsV0FBU3FHLFVBQVQsQ0FBcUI5SSxHQUFyQixFQUEwQjtBQUN2QixXQUFPRCxLQUFLc0ssR0FBTCxDQUFVdEssS0FBSzhJLE1BQUwsS0FBZ0I5SSxLQUFLdUssRUFBL0IsSUFBc0N0SyxHQUE3QztBQUNEOztBQUVELFdBQVM2RyxNQUFULENBQWlCdEUsQ0FBakIsRUFBb0JDLENBQXBCLEVBQXdCO0FBQ3RCLFNBQUtELENBQUwsR0FBU0EsS0FBSyxDQUFkO0FBQ0EsU0FBS0MsQ0FBTCxHQUFTQSxLQUFLLENBQWQ7QUFDRDs7QUFFRDtBQUNBO0FBQ0FxRSxTQUFPaEUsU0FBUCxDQUFpQjBILEdBQWpCLEdBQXVCLFVBQVNDLE1BQVQsRUFBZ0I7QUFDckMsU0FBS2pJLENBQUwsSUFBVWlJLE9BQU9qSSxDQUFqQjtBQUNBLFNBQUtDLENBQUwsSUFBVWdJLE9BQU9oSSxDQUFqQjtBQUNELEdBSEQ7O0FBS0E7QUFDQXFFLFNBQU9oRSxTQUFQLENBQWlCNEgsU0FBakIsR0FBNkIsWUFBVTtBQUNyQyxTQUFLbEksQ0FBTCxHQUFTLENBQUMsQ0FBRCxHQUFNLEtBQUtBLENBQXBCO0FBQ0EsU0FBS0MsQ0FBTCxHQUFTLENBQUMsQ0FBRCxHQUFNLEtBQUtBLENBQXBCO0FBQ0QsR0FIRDs7QUFLQTtBQUNBcUUsU0FBT2hFLFNBQVAsQ0FBaUI2SCxZQUFqQixHQUFnQyxZQUFVO0FBQ3hDLFdBQU8zSyxLQUFLNEssSUFBTCxDQUFVLEtBQUtwSSxDQUFMLEdBQVMsS0FBS0EsQ0FBZCxHQUFrQixLQUFLQyxDQUFMLEdBQVMsS0FBS0EsQ0FBMUMsQ0FBUDtBQUNELEdBRkQ7O0FBSUE7QUFDQXFFLFNBQU9oRSxTQUFQLENBQWlCK0gsUUFBakIsR0FBNEIsWUFBVTtBQUNwQyxXQUFPN0ssS0FBSzhLLEtBQUwsQ0FBVyxLQUFLckksQ0FBaEIsRUFBbUIsS0FBS0QsQ0FBeEIsQ0FBUDtBQUNELEdBRkQ7O0FBSUE7QUFDQXNFLFNBQU9oRSxTQUFQLENBQWlCaUksU0FBakIsR0FBNkIsVUFBV0MsS0FBWCxFQUFrQkMsU0FBbEIsRUFBOEI7QUFDekQsV0FBTyxJQUFJbkUsTUFBSixDQUFXbUUsWUFBWWpMLEtBQUtzSyxHQUFMLENBQVNVLEtBQVQsQ0FBdkIsRUFBd0NDLFlBQVlqTCxLQUFLa0wsR0FBTCxDQUFTRixLQUFULENBQXBELENBQVA7QUFDRCxHQUZEOztBQUlBO0FBQ0EsV0FBU25DLFFBQVQsQ0FBbUJoSCxRQUFuQixFQUE2QnNILFFBQTdCLEVBQXVDZ0MsT0FBdkMsRUFBZ0RDLFlBQWhELEVBQStEO0FBQzdELFNBQUt2SixRQUFMLEdBQWdCQSxRQUFoQjtBQUNBLFNBQUtzSCxRQUFMLEdBQWdCQSxZQUFZLElBQUlyQyxNQUFKLENBQVcsQ0FBWCxFQUFjLENBQWQsQ0FBNUI7QUFDQSxTQUFLcUUsT0FBTCxHQUFlQSxXQUFXLElBQUlyRSxNQUFKLENBQVcsQ0FBWCxFQUFjLENBQWQsQ0FBMUI7QUFDQSxTQUFLc0UsWUFBTCxHQUFvQkEsZ0JBQWdCLElBQUl0RSxNQUFKLENBQVcsQ0FBWCxFQUFjLENBQWQsQ0FBcEM7QUFDQSxTQUFLMEMsS0FBTCxHQUFhLEtBQUszSCxRQUFMLENBQWM2QixRQUFkLENBQXVCMUUsYUFBcEM7QUFDQSxTQUFLMEssTUFBTCxHQUFjLENBQWQ7QUFDRDs7QUFFRDtBQUNBYixXQUFTL0YsU0FBVCxDQUFtQnNHLElBQW5CLEdBQTBCLFlBQVU7QUFDbEMsU0FBSytCLE9BQUwsQ0FBYVgsR0FBYixDQUFrQixLQUFLWSxZQUF2QjtBQUNBLFNBQUtqQyxRQUFMLENBQWNxQixHQUFkLENBQW1CLEtBQUtXLE9BQXhCO0FBQ0QsR0FIRDs7QUFLQTtBQUNBdEMsV0FBUy9GLFNBQVQsQ0FBbUJ1SSxXQUFuQixHQUFpQyxZQUFXOztBQUUxQyxRQUFLLENBQUMsS0FBS3hKLFFBQUwsQ0FBY3lFLE1BQWQsQ0FBcUIsQ0FBckIsRUFBd0IxSCxJQUE5QixFQUFxQztBQUNyQyxRQUFLLEtBQUs4SyxNQUFMLEtBQWdCLENBQXJCLEVBQXlCOztBQUV2QixVQUFJNEIscUJBQXFCLENBQXpCO0FBQ0EsVUFBSUMscUJBQXFCLENBQXpCO0FBQ0EsVUFBSXRHLElBQUksS0FBS3BELFFBQUwsQ0FBY3lFLE1BQWQsQ0FBcUJ6QyxNQUE3Qjs7QUFFQSxXQUFLLElBQUlOLElBQUksQ0FBYixFQUFnQkEsSUFBSTBCLENBQXBCLEVBQXVCMUIsR0FBdkIsRUFBNEI7QUFDMUI7QUFDQSxZQUFJaUksUUFBUSxLQUFLM0osUUFBTCxDQUFjeUUsTUFBZCxDQUFxQi9DLENBQXJCLEVBQXdCNEYsUUFBeEIsQ0FBaUMzRyxDQUFqQyxHQUFxQyxLQUFLMkcsUUFBTCxDQUFjM0csQ0FBL0Q7QUFDQSxZQUFJaUosUUFBUSxLQUFLNUosUUFBTCxDQUFjeUUsTUFBZCxDQUFxQi9DLENBQXJCLEVBQXdCNEYsUUFBeEIsQ0FBaUMxRyxDQUFqQyxHQUFxQyxLQUFLMEcsUUFBTCxDQUFjMUcsQ0FBL0Q7QUFDQSxZQUFJaUosUUFBUSxLQUFLN0osUUFBTCxDQUFjeUUsTUFBZCxDQUFxQi9DLENBQXJCLEVBQXdCM0UsSUFBeEIsR0FBK0JvQixLQUFLMkwsR0FBTCxDQUFTSCxRQUFRQSxLQUFSLEdBQWdCQyxRQUFRQSxLQUFqQyxFQUF3QyxHQUF4QyxDQUEzQztBQUNBSCw4QkFBc0JFLFFBQVFFLEtBQTlCO0FBQ0FILDhCQUFzQkUsUUFBUUMsS0FBOUI7QUFDRDtBQUNELFdBQUtOLFlBQUwsR0FBb0IsSUFBSXRFLE1BQUosQ0FBWXdFLGtCQUFaLEVBQWdDQyxrQkFBaEMsQ0FBcEI7QUFDRDtBQUNGLEdBbkJEOztBQXFCQTtBQUNBMUMsV0FBUy9GLFNBQVQsQ0FBbUI4SSxVQUFuQixHQUFnQyxZQUFVOztBQUV4QyxRQUFJLEtBQUsvSixRQUFMLENBQWMwRSxVQUFsQixFQUE4QjtBQUM1QixXQUFLbUQsTUFBTCxHQUFjLENBQWQ7QUFDQTtBQUNEOztBQUVELFFBQUltQyxRQUFRN0wsS0FBSytELEtBQUwsQ0FBWSxLQUFLb0YsUUFBTCxDQUFjM0csQ0FBMUIsQ0FBWjtBQUNBLFFBQUlzSixRQUFROUwsS0FBSytELEtBQUwsQ0FBWSxLQUFLb0YsUUFBTCxDQUFjMUcsQ0FBMUIsQ0FBWjtBQUNBLFFBQUl1QyxRQUFVLEtBQUtuRCxRQUFMLENBQWMyRSxXQUFkLEtBQThCLElBQWhDLEdBQXlDLEtBQUszRSxRQUFMLENBQWN1RSxTQUFkLENBQXdCLEtBQUt2RSxRQUFMLENBQWMyRSxXQUF0QyxFQUFtRDVCLFNBQW5ELEdBQStEaUgsS0FBL0QsRUFBc0VDLEtBQXRFLENBQXpDLEdBQXdILENBQXBJOztBQUVBLFFBQUs5RyxVQUFVLENBQWYsRUFBa0I7QUFDaEIsVUFBSSxLQUFLMEUsTUFBTCxLQUFnQixDQUFwQixFQUF1QjtBQUNyQixhQUFLQSxNQUFMLEdBQWMsQ0FBZDtBQUNBLGFBQUt5QixPQUFMLEdBQWUsSUFBSXJFLE1BQUosQ0FBVyxLQUFLcUUsT0FBTCxDQUFhM0ksQ0FBYixHQUFpQixHQUE1QixFQUFpQyxLQUFLMkksT0FBTCxDQUFhMUksQ0FBYixHQUFpQixHQUFsRCxDQUFmO0FBQ0EsYUFBSzJJLFlBQUwsR0FBb0IsSUFBSXRFLE1BQUosQ0FBVyxDQUFYLEVBQWMsQ0FBZCxDQUFwQjtBQUNEO0FBQ0YsS0FORCxNQU9LO0FBQ0gsVUFBSSxLQUFLNEMsTUFBTCxLQUFnQixDQUFwQixFQUF1QjtBQUNyQixhQUFLeUIsT0FBTCxDQUFhVCxTQUFiO0FBQ0Q7QUFDRjtBQUNGLEdBdkJEOztBQXlCQTtBQUNBLFdBQVM3RCxLQUFULENBQWdCa0YsS0FBaEIsRUFBdUJuTixJQUF2QixFQUE4QjtBQUM1QixTQUFLdUssUUFBTCxHQUFnQjRDLEtBQWhCO0FBQ0EsU0FBS0MsT0FBTCxDQUFjcE4sSUFBZDtBQUNEOztBQUVEaUksUUFBTS9ELFNBQU4sQ0FBZ0JrSixPQUFoQixHQUEwQixVQUFVcE4sSUFBVixFQUFnQjtBQUN4QyxTQUFLQSxJQUFMLEdBQVlBLFFBQVEsQ0FBcEI7QUFDQSxTQUFLNEssS0FBTCxHQUFhNUssT0FBTyxDQUFQLEdBQVcsTUFBWCxHQUFvQixNQUFqQztBQUNELEdBSEQ7O0FBTUY7O0FBRUE7QUFDQTtBQUNBLE1BQUksQ0FBQ2tHLE1BQU1oQyxTQUFOLENBQWdCMkYsT0FBckIsRUFBOEI7QUFDNUIzRCxVQUFNaEMsU0FBTixDQUFnQjJGLE9BQWhCLEdBQTBCLFVBQVN3RCxhQUFULEVBQXdCQyxTQUF4QixFQUFtQztBQUMzRCxVQUFJQyxDQUFKO0FBQ0EsVUFBSSxRQUFRLElBQVosRUFBa0I7QUFDaEIsY0FBTSxJQUFJQyxTQUFKLENBQWMsc0NBQWQsQ0FBTjtBQUNEO0FBQ0QsVUFBSUMsSUFBSXpPLE9BQU8sSUFBUCxDQUFSO0FBQ0EsVUFBSTBPLE1BQU1ELEVBQUV4SSxNQUFGLEtBQWEsQ0FBdkI7QUFDQSxVQUFJeUksUUFBUSxDQUFaLEVBQWU7QUFDYixlQUFPLENBQUMsQ0FBUjtBQUNEO0FBQ0QsVUFBSS9DLElBQUksQ0FBQzJDLFNBQUQsSUFBYyxDQUF0QjtBQUNBLFVBQUlsTSxLQUFLdU0sR0FBTCxDQUFTaEQsQ0FBVCxNQUFnQmlELFFBQXBCLEVBQThCO0FBQzVCakQsWUFBSSxDQUFKO0FBQ0Q7QUFDRCxVQUFJQSxLQUFLK0MsR0FBVCxFQUFjO0FBQ1osZUFBTyxDQUFDLENBQVI7QUFDRDtBQUNESCxVQUFJbk0sS0FBS0MsR0FBTCxDQUFTc0osS0FBSyxDQUFMLEdBQVNBLENBQVQsR0FBYStDLE1BQU10TSxLQUFLdU0sR0FBTCxDQUFTaEQsQ0FBVCxDQUE1QixFQUF5QyxDQUF6QyxDQUFKO0FBQ0EsYUFBTzRDLElBQUlHLEdBQVgsRUFBZ0I7QUFDZCxZQUFJSCxLQUFLRSxDQUFMLElBQVVBLEVBQUVGLENBQUYsTUFBU0YsYUFBdkIsRUFBc0M7QUFDcEMsaUJBQU9FLENBQVA7QUFDRDtBQUNEQTtBQUNEO0FBQ0QsYUFBTyxDQUFDLENBQVI7QUFDRCxLQXpCRDtBQTBCRDs7QUFFRCxNQUFJLE9BQU92TyxPQUFPdUksTUFBZCxJQUF3QixVQUE1QixFQUF3QztBQUN0Q3ZJLFdBQU91SSxNQUFQLEdBQWdCLFVBQVUxRixNQUFWLEVBQWtCZ00sT0FBbEIsRUFBMkI7QUFBRTtBQUMzQzs7QUFDQSxVQUFJaE0sVUFBVSxJQUFkLEVBQW9CO0FBQUU7QUFDcEIsY0FBTSxJQUFJMkwsU0FBSixDQUFjLDRDQUFkLENBQU47QUFDRDs7QUFFRCxVQUFJTSxLQUFLOU8sT0FBTzZDLE1BQVAsQ0FBVDs7QUFFQSxXQUFLLElBQUlrTSxRQUFRLENBQWpCLEVBQW9CQSxRQUFRQyxVQUFVL0ksTUFBdEMsRUFBOEM4SSxPQUE5QyxFQUF1RDtBQUNyRCxZQUFJRSxhQUFhRCxVQUFVRCxLQUFWLENBQWpCOztBQUVBLFlBQUlFLGNBQWMsSUFBbEIsRUFBd0I7QUFBRTtBQUN4QixlQUFLLElBQUlDLE9BQVQsSUFBb0JELFVBQXBCLEVBQWdDO0FBQzlCO0FBQ0EsZ0JBQUlqUCxPQUFPa0YsU0FBUCxDQUFpQmpGLGNBQWpCLENBQWdDRSxJQUFoQyxDQUFxQzhPLFVBQXJDLEVBQWlEQyxPQUFqRCxDQUFKLEVBQStEO0FBQzdESixpQkFBR0ksT0FBSCxJQUFjRCxXQUFXQyxPQUFYLENBQWQ7QUFDRDtBQUNGO0FBQ0Y7QUFDRjtBQUNELGFBQU9KLEVBQVA7QUFDRCxLQXJCRDtBQXNCRDs7QUFFRDtBQUNBO0FBQ0E7QUFDQTs7QUFFQyxlQUFXO0FBQ1YsUUFBSUssV0FBVyxDQUFmO0FBQ0EsUUFBSUMsVUFBVSxDQUFDLElBQUQsRUFBTyxLQUFQLEVBQWMsUUFBZCxFQUF3QixHQUF4QixDQUFkO0FBQ0EsU0FBSSxJQUFJeEssSUFBSSxDQUFaLEVBQWVBLElBQUl3SyxRQUFRbkosTUFBWixJQUFzQixDQUFDMUcsT0FBTzBNLHFCQUE3QyxFQUFvRSxFQUFFckgsQ0FBdEUsRUFBeUU7QUFDdkVyRixhQUFPME0scUJBQVAsR0FBK0IxTSxPQUFPNlAsUUFBUXhLLENBQVIsSUFBVyx1QkFBbEIsQ0FBL0I7QUFDQXJGLGFBQU80TSxvQkFBUCxHQUE4QjVNLE9BQU82UCxRQUFReEssQ0FBUixJQUFXLHNCQUFsQixLQUN6QnJGLE9BQU82UCxRQUFReEssQ0FBUixJQUFXLDZCQUFsQixDQURMO0FBRUQ7O0FBRUQsUUFBSSxDQUFDckYsT0FBTzBNLHFCQUFaLEVBQ0UxTSxPQUFPME0scUJBQVAsR0FBK0IsVUFBU29ELFFBQVQsRUFBbUJ2TSxPQUFuQixFQUE0QjtBQUN6RCxVQUFJd00sV0FBVyxJQUFJQyxJQUFKLEdBQVdDLE9BQVgsRUFBZjtBQUNBLFVBQUlDLGFBQWFyTixLQUFLQyxHQUFMLENBQVMsQ0FBVCxFQUFZLE1BQU1pTixXQUFXSCxRQUFqQixDQUFaLENBQWpCO0FBQ0EsVUFBSU8sS0FBS25RLE9BQU91TCxVQUFQLENBQWtCLFlBQVc7QUFBRXVFLGlCQUFTQyxXQUFXRyxVQUFwQjtBQUFrQyxPQUFqRSxFQUNQQSxVQURPLENBQVQ7QUFFQU4saUJBQVdHLFdBQVdHLFVBQXRCO0FBQ0EsYUFBT0MsRUFBUDtBQUNELEtBUEQ7O0FBU0YsUUFBSSxDQUFDblEsT0FBTzRNLG9CQUFaLEVBQ0U1TSxPQUFPNE0sb0JBQVAsR0FBOEIsVUFBU3VELEVBQVQsRUFBYTtBQUN6Q0MsbUJBQWFELEVBQWI7QUFDRCxLQUZEO0FBR0gsR0F2QkEsR0FBRDs7QUF5QkEsU0FBTzs7QUFFTEUsaUJBQWEsVUFBV3RILE9BQVgsRUFBcUI7QUFDaEMsVUFBSTNDLElBQUksSUFBSTBDLFFBQUosQ0FBY0MsT0FBZCxDQUFSO0FBQ0EzQyxRQUFFa0QsSUFBRjtBQUNBLGFBQU9sRCxDQUFQO0FBQ0QsS0FOSTs7QUFRTGtLLG9CQUFnQixVQUFVN04sSUFBVixFQUFnQkMsS0FBaEIsRUFBdUI7QUFDckN2QyxTQUFHNkQsWUFBSCxDQUFpQjhFLFNBQVNuRCxTQUExQixFQUFxQ2pELE1BQU1pQixLQUEzQztBQUNBOUMsZUFBUzRCLElBQVQsSUFBaUJDLE1BQU1xRyxPQUF2QjtBQUNELEtBWEk7O0FBYUx3SCxrQkFBYyxVQUFXOU4sSUFBWCxFQUFpQkMsS0FBakIsRUFBeUI7O0FBRXJDLFVBQUs3QixTQUFTNEIsSUFBVCxDQUFMLEVBQXNCLE1BQU0sSUFBSStOLEtBQUosQ0FBVyxxQkFBcUIvTixJQUFyQixHQUE0QiwrQ0FBdkMsQ0FBTjs7QUFFdEI1QixlQUFTNEIsSUFBVCxJQUFpQixJQUFqQjs7QUFFQXRDLFNBQUc2RCxZQUFILENBQWlCbkQsUUFBakIsRUFBMkI2QixNQUFNcUcsT0FBakM7QUFDQTVJLFNBQUc2RCxZQUFILENBQWlCMEgsU0FBUy9GLFNBQTFCLEVBQXFDakQsTUFBTStOLGVBQTNDO0FBQ0F0USxTQUFHNkQsWUFBSCxDQUFpQlMsT0FBT2tCLFNBQXhCLEVBQW1DakQsTUFBTWdPLFlBQXpDOztBQUVBcFEsY0FBUW1DLElBQVIsSUFBZ0JDLE1BQU1pTyxRQUFOLENBQWVyUSxPQUEvQjtBQUNBRCxjQUFRb0MsSUFBUixJQUFnQkMsTUFBTWlPLFFBQU4sQ0FBZXRRLE9BQS9CO0FBQ0FFLG1CQUFha0MsSUFBYixJQUFxQkMsTUFBTWlPLFFBQU4sQ0FBZXBRLFlBQXBDO0FBQ0Q7QUExQkksR0FBUDtBQTZCRCxDQXZ3Qm9CLENBdXdCbEIsSUF2d0JrQixFQXV3QlosS0FBS04sUUF2d0JPLENBQXJCO0FDRkFGLGVBQWV3USxZQUFmLENBQTZCLFdBQTdCLEVBQTBDO0FBQ3hDeEgsV0FBUyxFQUQrQjtBQUV4QzBILG1CQUFpQjtBQUNmRyxpQkFBYSxZQUFVO0FBQ3JCLFdBQUtyRSxNQUFMLEdBQWMsQ0FBZDtBQUNBLFVBQUltQyxRQUFRN0wsS0FBSytELEtBQUwsQ0FBWSxLQUFLb0YsUUFBTCxDQUFjM0csQ0FBMUIsQ0FBWjtBQUNBLFVBQUlzSixRQUFROUwsS0FBSytELEtBQUwsQ0FBWSxLQUFLb0YsUUFBTCxDQUFjMUcsQ0FBMUIsQ0FBWjtBQUNBLFdBQUsrRyxLQUFMLEdBQWUsS0FBSzNILFFBQUwsQ0FBYzJFLFdBQWQsS0FBOEIsSUFBaEMsR0FBeUMsS0FBSzNFLFFBQUwsQ0FBY3VFLFNBQWQsQ0FBd0IsS0FBS3ZFLFFBQUwsQ0FBYzJFLFdBQXRDLEVBQW1ENUIsU0FBbkQsR0FBK0RpSCxLQUEvRCxFQUFzRUMsS0FBdEUsQ0FBekMsR0FBd0gsS0FBS2pLLFFBQUwsQ0FBYzZCLFFBQWQsQ0FBdUIxRSxhQUE1SjtBQUNEO0FBTmMsR0FGdUI7QUFVeEM2TyxnQkFBYztBQUNaRyxpQkFBYSxVQUFXcEwsTUFBWCxFQUFvQjtBQUMvQixVQUFJeEIsSUFBSSxLQUFLa0IsSUFBTCxDQUFVRSxDQUFsQjtBQUFBLFVBQ0U2QyxJQUFJLEtBQUsvQyxJQUFMLENBQVVHLENBRGhCO0FBQUEsVUFFRTZDLElBQUl0RixLQUFLK0QsS0FBTCxDQUFXc0IsSUFBSSxLQUFLL0MsSUFBTCxDQUFVakMsQ0FBekIsQ0FGTjtBQUdBLFVBQUl1QyxPQUFPaUIsTUFBUCxHQUFnQnpDLENBQWhCLElBQXFCd0IsT0FBTyxDQUFQLEVBQVVpQixNQUFWLEdBQW1CeUIsQ0FBNUMsRUFBZ0Q7O0FBRWhELFVBQUkvQixDQUFKO0FBQUEsVUFBT3dCLENBQVA7QUFBQSxVQUFVcUYsQ0FBVjtBQUFBLFVBQWFDLENBQWI7QUFBQSxVQUFnQmhKLENBQWhCO0FBQUEsVUFBbUI4QyxJQUFJLEtBQUsvQixPQUFMLENBQWFlLFlBQWIsQ0FBMEIsQ0FBMUIsRUFBNkIsQ0FBN0IsRUFBZ0MsS0FBS3RCLFFBQUwsQ0FBY0ssTUFBZCxDQUFxQmhFLEtBQXJELEVBQTRELEtBQUsyRCxRQUFMLENBQWNLLE1BQWQsQ0FBcUJqRSxNQUFqRixFQUF5RnNILElBQWhIOztBQUVBLFdBQUtoQyxJQUFJLENBQVQsRUFBWUEsSUFBSSxLQUFLckIsTUFBTCxDQUFZakUsTUFBNUIsRUFBb0NzRixHQUFwQyxFQUF5QztBQUN2QyxhQUFLd0IsSUFBSSxDQUFULEVBQVlBLElBQUksS0FBSzdDLE1BQUwsQ0FBWWhFLEtBQTVCLEVBQW1DNkcsR0FBbkMsRUFBd0M7QUFDdENxRixjQUFJakcsRUFBRSxDQUFFLEtBQUt0QyxRQUFMLENBQWNLLE1BQWQsQ0FBcUJoRSxLQUFyQixHQUE2QjZHLENBQTlCLEdBQW1DeEIsQ0FBcEMsSUFBeUMsQ0FBM0MsQ0FBSjtBQUNBOEcsY0FBSWxHLEVBQUUsQ0FBRSxLQUFLdEMsUUFBTCxDQUFjSyxNQUFkLENBQXFCaEUsS0FBckIsR0FBNkI2RyxDQUE5QixHQUFtQ3hCLENBQXBDLElBQXlDLENBQXpDLEdBQTZDLENBQS9DLENBQUo7QUFDQWxDLGNBQUk4QyxFQUFFLENBQUUsS0FBS3RDLFFBQUwsQ0FBY0ssTUFBZCxDQUFxQmhFLEtBQXJCLEdBQTZCNkcsQ0FBOUIsR0FBbUN4QixDQUFwQyxJQUF5QyxDQUF6QyxHQUE2QyxDQUEvQyxDQUFKO0FBQ0FYLGlCQUFPVyxDQUFQLEVBQVV3QixDQUFWLElBQWUsVUFBVXFGLENBQVYsR0FBYyxJQUFkLEdBQXFCQyxDQUFyQixHQUF5QixJQUF6QixHQUFnQ2hKLENBQWhDLEdBQW9DLE1BQW5EO0FBQ0Q7QUFDRjtBQUNGO0FBakJXLEdBVjBCO0FBNkJ4QzlELFVBQVEsRUE3QmdDO0FBOEJ4Q3VRLFlBQVU7QUFDUnJRLGFBQVM7QUFDUG1DLFlBQU0sSUFEQztBQUVQQyxhQUFPO0FBRkEsS0FERDtBQUtSckMsYUFBUyxDQUFDLGFBQUQsRUFBZ0IsYUFBaEIsQ0FMRDtBQU1SRSxrQkFBYztBQU5OO0FBOUI4QixDQUExQyIsImZpbGUiOiJzbGlkZS1wYXJ0aWNsZXMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJcclxuXHJcbnZhciBzbGlkZVBhcnRpY2xlcyA9IChmdW5jdGlvbiAod2luZG93LCBkb2N1bWVudCwgdW5kZWZpbmVkKSB7XHJcblxyXG4gICAgXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG5cclxuICAgIHZhciBmbiwgZmlsdGVyLCBwcm9jZWVkLCBmaWx0ZXJzLCBtYXRyaXhNZXRob2QsXHJcbiAgICBvYmpGdW5jU3RyaW5nID0gT2JqZWN0Lmhhc093blByb3BlcnR5LnRvU3RyaW5nLmNhbGwoIE9iamVjdCApO1xyXG4gICAgXHJcbiAgICBkZWZhdWx0cyA9IHtcclxuICAgICAgaGVpZ2h0OiAxNTAsXHJcbiAgICAgIHdpZHRoOiAzMDAsXHJcbiAgICAgIGJhY2tncm91bmQ6ICcjZmZmJyxcclxuICAgICAgdGhyZXNob2xkTkI6IFsxMjhdLFxyXG4gICAgICB0YXJnZXRFbGVtZW50OiAnZHAtY2FudmFzJyxcclxuICAgICAgaW5wdXRGaWxlSUQ6ICdkcC1maWxlaW5wdXQnLFxyXG4gICAgICB0aHVtZG5haWxzSUQ6ICdkcC10aHVtYicsXHJcbiAgICAgIHBhbmVsSUQ6ICdkcC1wYW5lbC1zZXR0aW5ncycsXHJcbiAgICAgIHRodW1iV2lkdGg6IDEwMCxcclxuICAgICAgdGh1bWJIZWlnaHQ6IDEwMCxcclxuICAgICAgdGV4dDonU2FsdXQgIScsXHJcbiAgICAgIG1hc3M6IDEwMCxcclxuICAgICAgYW50aU1hc3M6IC01MDAsXHJcbiAgICAgIGRlbnNpdHk6IDE1MDAsXHJcbiAgICAgIHBhcnRpY2xlU2l6ZTogMSxcclxuICAgICAgcGFydGljbGVDb2xvcjogJyMwMDAnLFxyXG4gICAgICB0ZXh0Q29sb3I6ICcjZmZmJyxcclxuICAgICAgZm9udDogJ0FyaWFsJyxcclxuICAgICAgZm9udFNpemU6IDQwLFxyXG4gICAgICBpbml0aWFsVmVsb2NpdHk6IDMsXHJcbiAgICAgIG1hc3NYOiA4ODAsXHJcbiAgICAgIG1hc3NZOiAzNzAsXHJcbiAgICAgIGluaXRpYWxNb2RlOiAnbW9kZUZvcm0nLFxyXG4gICAgICBkcmF3OiBmYWxzZSxcclxuICAgICAgc3RvcDogZmFsc2UsXHJcbiAgICAgIHN3aXRjaE1vZGVDYWxsYmFjazogbnVsbCxcclxuICAgICAgbW9kZUZvcm06IHRydWVcclxuICAgIH07XHJcblxyXG4gICAgZmlsdGVycyA9IHtcclxuICAgICAgbW9kZUZvcm06IHtcclxuICAgICAgICBuYW1lOiAnYmxhY2tBbmRXaGl0ZScsXHJcbiAgICAgICAgcGFyYW06ICd0aHJlc2hvbGROQidcclxuICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBwcm9jZWVkID0ge1xyXG4gICAgICBtb2RlRm9ybTogWydzb3VtaXNDaGFtcCcsICdzb3VtaXNGb3JtJ11cclxuICAgIH07XHJcblxyXG4gICAgbWF0cml4TWV0aG9kID0ge1xyXG4gICAgICBtb2RlRm9ybTogJ3ZhbHVlTWF0cml4J1xyXG4gICAgfTtcclxuXHJcbiAgICBmbiA9IHtcclxuICAgICAgZ2V0Vmlld3BvcnQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICB3OiBNYXRoLm1heChkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50V2lkdGgsIHdpbmRvdy5pbm5lcldpZHRoIHx8IDApLFxyXG4gICAgICAgICAgaDogTWF0aC5tYXgoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodCwgd2luZG93LmlubmVySGVpZ2h0IHx8IDApXHJcbiAgICAgICAgfTtcclxuICAgICAgfSxcclxuXHJcbiAgICAgIGFwcGVuZDogZnVuY3Rpb24gKCB0YXJnZXQsIGVsZW1lbnQgKSB7XHJcbiAgICAgICAgaWYgKCB0eXBlb2YgdGFyZ2V0ID09PSAnc3RyaW5nJyApIHtcclxuICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCB0YXJnZXQgKS5hcHBlbmRDaGlsZCggZWxlbWVudCApO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgIHRhcmdldC5hcHBlbmRDaGlsZCggZWxlbWVudCApO1xyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIFRoYW5rIHlvdSBqUXVlcnkgMysgIVxyXG4gICAgICBpc1BsYWluT2JqZWN0OiBmdW5jdGlvbiAoIHRhcmdldCApIHtcclxuICAgICAgICB2YXIgcHJvdG8sIEN0b3I7XHJcbiAgICAgICAgLy8gRGV0ZWN0IG9idmlvdXMgbmVnYXRpdmVzXHJcbiAgICAgICAgLy8gVXNlIHRvU3RyaW5nIGluc3RlYWQgb2YgalF1ZXJ5LnR5cGUgdG8gY2F0Y2ggaG9zdCBvYmplY3RzXHJcbiAgICAgICAgaWYgKCAhdGFyZ2V0IHx8IE9iamVjdC50b1N0cmluZy5jYWxsKCB0YXJnZXQgKSAhPT0gXCJbb2JqZWN0IE9iamVjdF1cIiApIHtcclxuICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YoIHRhcmdldCApO1xyXG4gICAgICAgIC8vIE9iamVjdHMgd2l0aCBubyBwcm90b3R5cGUgKGUuZy4sIGBPYmplY3QuY3JlYXRlKCBudWxsIClgKSBhcmUgcGxhaW5cclxuICAgICAgICBpZiAoICFwcm90byApIHtcclxuICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBPYmplY3RzIHdpdGggcHJvdG90eXBlIGFyZSBwbGFpbiBpZmYgdGhleSB3ZXJlIGNvbnN0cnVjdGVkIGJ5IGEgZ2xvYmFsIE9iamVjdCBmdW5jdGlvblxyXG4gICAgICAgIEN0b3IgPSBPYmplY3QuaGFzT3duUHJvcGVydHkuY2FsbCggcHJvdG8sIFwiY29uc3RydWN0b3JcIiApICYmIHByb3RvLmNvbnN0cnVjdG9yO1xyXG4gICAgICAgIHJldHVybiB0eXBlb2YgQ3RvciA9PT0gXCJmdW5jdGlvblwiICYmIE9iamVjdC5oYXNPd25Qcm9wZXJ0eS50b1N0cmluZy5jYWxsKCBDdG9yICkgPT09IE9iakZ1bmNTdHJpbmc7XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICBzaW1wbGVFeHRlbmQ6IGZ1bmN0aW9uICggYSwgYiApe1xyXG4gICAgICAgIHZhciBjbG9uZSwgc3JjLCBjb3B5LCBpc0FuQXJyYXkgPSBmYWxzZTsgXHJcbiAgICAgICAgZm9yKCB2YXIga2V5IGluIGIgKSB7XHJcblxyXG4gICAgICAgICAgc3JjID0gYVsga2V5IF07XHJcblx0XHRcdFx0ICBjb3B5ID0gYlsga2V5IF07XHJcblxyXG4gICAgICAgICAgLy9Bdm9pZCBpbmZpbml0ZSBsb29wLlxyXG4gICAgICAgICAgaWYgKCBhID09PSBjb3B5ICkge1xyXG5cdFx0XHRcdFx0ICBjb250aW51ZTtcclxuXHRcdFx0XHQgIH1cclxuXHJcbiAgICAgICAgICBpZiggYi5oYXNPd25Qcm9wZXJ0eSgga2V5ICkgKSB7XHJcblxyXG4gICAgICAgICAgICBpZiggY29weSAmJiAoIGZuLmlzUGxhaW5PYmplY3QoIGNvcHkgKSB8fCAoaXNBbkFycmF5ID0gY29weS5pc0FycmF5KCkpKSkge1xyXG4gICAgICAgICAgICAgIGlmICggaXNBbkFycmF5ICkge1xyXG4gICAgICAgICAgICAgICAgaXNBbkFycmF5ID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBjbG9uZSA9ICggc3JjICYmIHNyYy5pc0FycmF5ICkgPyBzcmMgOiBbXTtcclxuICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY2xvbmUgPSAoIHNyYyAmJiBmbi5pc1BsYWluT2JqZWN0KCBzcmMgKSApID8gc3JjIDoge307XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGFbIGtleSBdID0gZm4uc2ltcGxlRXh0ZW5kKCBjbG9uZSwgY29weSApO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgYVsga2V5IF0gPSBjb3B5O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBhO1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG5cclxuICBmdW5jdGlvbiBNYXRyaXggKCBpbnN0YW5jZSwgaW5wdXQsIGN1c3RvbVNpemUgKSB7XHJcbiAgICB0aGlzLmluc3RhbmNlID0gaW5zdGFuY2U7XHJcbiAgICB0aGlzLnR5cGUgPSAoIHR5cGVvZiBpbnB1dCAhPT0gJ3N0cmluZycgKSA/ICdwaWN0dXJlJyA6ICd0ZXh0JztcclxuICAgIHRoaXMucGljdHVyZSA9IGlucHV0O1xyXG4gICAgdGhpcy5jYW52YXMgPSB0aGlzLmluc3RhbmNlLmdldENhbnZhcyggY3VzdG9tU2l6ZSApO1xyXG4gICAgdGhpcy5jb250ZXh0ID0gdGhpcy5pbnN0YW5jZS5nZXRDb250ZXh0MkQoIHRoaXMuY2FudmFzICk7XHJcbiAgICB0aGlzLnNpemUgPSAoIHR5cGVvZiBpbnB1dCAhPT0gJ3N0cmluZycgKSA/IHRoaXMuaW5zdGFuY2UuZ2V0SW1hZ2VTaXplKCBpbnB1dCwgY3VzdG9tU2l6ZSApIDoge3g6MCwgeTowLCB3OjAsIGg6MH07XHJcbiAgICB0aGlzLnBpeGVscyA9IHRoaXMuZ2V0UGl4ZWxzKCk7XHJcbiAgICB0aGlzLm1hdHJpeCA9IHRoaXMuYnVpbGRBbGxNYXRyaXgoKTtcclxuICB9XHJcblxyXG4gIE1hdHJpeC5wcm90b3R5cGUgPSB7XHJcbiAgICAvL2NvbnN0cnVjdG9yOiBNYXRyaXgsXHJcbiAgICBjbGVhcjogZnVuY3Rpb24gKCkge1xyXG4gICAgICB0aGlzLmNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpO1xyXG4gICAgfSxcclxuXHJcbiAgICBnZXRQaXhlbHM6IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICAgIHRoaXMuY2xlYXIoKTtcclxuXHJcbiAgICAgIHN3aXRjaCAoIHRoaXMudHlwZSApIHtcclxuXHJcbiAgICAgICAgY2FzZSAncGljdHVyZSc6XHJcbiAgICAgICAgICB0aGlzLmNvbnRleHQuZHJhd0ltYWdlKCB0aGlzLnBpY3R1cmUsIHRoaXMuc2l6ZS54LCB0aGlzLnNpemUueSwgdGhpcy5zaXplLncsIHRoaXMuc2l6ZS5oICk7XHJcbiAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgY2FzZSAndGV4dCc6XHJcbiAgICAgICAgICB0aGlzLnNldFRleHQoKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiggIXRoaXMuc2l6ZS53ICYmICF0aGlzLnNpemUuaCApIHJldHVybiBmYWxzZTtcclxuXHJcbiAgICAgIHJldHVybiB0aGlzLmNvbnRleHQuZ2V0SW1hZ2VEYXRhKCB0aGlzLnNpemUueCwgdGhpcy5zaXplLnksIHRoaXMuc2l6ZS53LCB0aGlzLnNpemUuaCApO1xyXG4gICAgfSxcclxuXHJcbiAgICBzZXRUZXh0OiBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgICB2YXIgY2xlYXJlZCA9IHRoaXMucGljdHVyZS50cmltKCk7XHJcblxyXG4gICAgICBpZiAoY2xlYXJlZCA9PT0gXCJcIikge1xyXG4gICAgICAgIHRoaXMuc2l6ZS54ID0gMDtcclxuICAgICAgICB0aGlzLnNpemUueSA9IDA7XHJcbiAgICAgICAgdGhpcy5zaXplLncgPSAwO1xyXG4gICAgICAgIHRoaXMuc2l6ZS5oID0gMDtcclxuICAgICAgICB0aGlzLmNsZWFyTWF0cml4KCk7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB2YXIgaSwgdyA9IDAsIHggPSAyMCwgeSA9IDgwLFxyXG4gICAgICAgIGxpbmVzID0gdGhpcy5waWN0dXJlLnNwbGl0KFwiXFxuXCIpLFxyXG4gICAgICAgIGZvbnRTaXplID0gdGhpcy5pbnN0YW5jZS5zZXR0aW5ncy5mb250U2l6ZTtcclxuXHJcbiAgICAgIHRoaXMuY29udGV4dC5mb250ID0gZm9udFNpemUgKyBcInB4IFwiICsgdGhpcy5pbnN0YW5jZS5zZXR0aW5ncy5mb250O1xyXG4gICAgICB0aGlzLmNvbnRleHQuZmlsbFN0eWxlID0gdGhpcy5pbnN0YW5jZS5zZXR0aW5ncy50ZXh0Q29sb3I7XHJcbiAgICAgIHRoaXMuY29udGV4dC50ZXh0QWxpZ24gPSBcImxlZnRcIjtcclxuXHJcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHRoaXMuY29udGV4dC5maWxsVGV4dCggbGluZXNbaV0sIHgsIHkgKyBpKmZvbnRTaXplICk7XHJcbiAgICAgICAgdyA9IE1hdGgubWF4KCB3LCBNYXRoLmZsb29yKHRoaXMuY29udGV4dC5tZWFzdXJlVGV4dCggbGluZXNbaV0gKS53aWR0aCkgKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdGhpcy5zaXplLnggPSBNYXRoLm1heCggeCwgIHRoaXMuc2l6ZS54ICk7XHJcbiAgICAgIHRoaXMuc2l6ZS55ID0gTWF0aC5tYXgoICh5IC0gZm9udFNpemUpLCB0aGlzLnNpemUueSApO1xyXG4gICAgICB0aGlzLnNpemUudyA9IE1hdGgubWF4KCAodyArIGZvbnRTaXplKSwgdGhpcy5zaXplLncgKTtcclxuICAgICAgdGhpcy5zaXplLmggPSBNYXRoLm1heCggKGZvbnRTaXplICogaSArIGZvbnRTaXplKSwgdGhpcy5zaXplLmggKTtcclxuICAgIH0sXHJcblxyXG4gICAgYXBwbHlGaWx0ZXI6IGZ1bmN0aW9uICggbmFtZSwgYXJnQXJyYXkgKSB7XHJcbiAgICAgIHZhciBpLCBwID0gdGhpcy5nZXRQaXhlbHMoKTtcclxuICAgICAgaWYgKCBuYW1lICkge1xyXG4gICAgICAgIHZhciBhcmdzID0gWyBwIF07XHJcbiAgICAgICAgZm9yICggaSA9IDA7IGkgPCBhcmdBcnJheS5sZW5ndGg7IGkrKyApIHtcclxuICAgICAgICAgIGFyZ3MucHVzaCggYXJnQXJyYXlbaV0gKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5waXhlbHMgPSBmaWx0ZXJbbmFtZV0uYXBwbHkoIG51bGwsIGFyZ3MgKTtcclxuICAgICAgICB0aGlzLmNvbnRleHQucHV0SW1hZ2VEYXRhKCB0aGlzLnBpeGVscywgdGhpcy5zaXplLngsIHRoaXMuc2l6ZS55ICk7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZSB7XHJcbiAgICAgICAgdGhpcy5waXhlbHMgPSBwO1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIGJ1aWxkQWxsTWF0cml4OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHZhciBtLCBtQSA9IHt9O1xyXG4gICAgICBmb3IgKCB2YXIgbW9kZSBpbiBtYXRyaXhNZXRob2QgKSB7XHJcbiAgICAgICAgbSA9IHRoaXMuY3JlYU1hdHJpeCgpO1xyXG4gICAgICAgIHRoaXMuYXBwbHlGaWx0ZXIoIGZpbHRlcnNbbW9kZV0ubmFtZSwgdGhpcy5pbnN0YW5jZS5zZXR0aW5nc1tmaWx0ZXJzW21vZGVdLnBhcmFtXSApO1xyXG4gICAgICAgIHRoaXNbbWF0cml4TWV0aG9kW21vZGVdXShtLCAxKTtcclxuICAgICAgICBtQVttb2RlXSA9IG07XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIG1BO1xyXG4gICAgfSxcclxuXHJcbiAgICBnZXRNYXRyaXg6IGZ1bmN0aW9uKCl7XHJcbiAgICAgIHJldHVybiB0aGlzLm1hdHJpeFt0aGlzLmluc3RhbmNlLm1vZGVdO1xyXG4gICAgfSxcclxuXHJcbiAgICBjcmVhTWF0cml4OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHZhciBhID0gdGhpcy5pbnN0YW5jZS5zZXR0aW5ncy53aWR0aCxcclxuICAgICAgICBiID0gdGhpcy5pbnN0YW5jZS5zZXR0aW5ncy5oZWlnaHQsXHJcbiAgICAgICAgbWF0ID0gbmV3IEFycmF5KCBhICksIGksIGo7XHJcbiAgICAgIGZvciggaSA9IDA7IGkgPCBhOyBpKysgKSB7XHJcbiAgICAgICAgbWF0W2ldID0gbmV3IEFycmF5KCBiICk7XHJcbiAgICAgICAgZm9yKCBqID0gMDsgaiA8IGI7IGorKyApe1xyXG4gICAgICAgICAgbWF0W2ldW2pdID0gMDtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIG1hdDtcclxuICAgIH0sXHJcblxyXG4gICAgY2xlYXJNYXRyaXg6IGZ1bmN0aW9uKCB2YWx1ZSApe1xyXG4gICAgICB2YXIgaSwgaiwgbCwgbSwgdixcclxuICAgICAgICBtYXRyaXggPSB0aGlzLmdldE1hdHJpeCgpO1xyXG4gICAgICB2ID0gdmFsdWUgfHwgMDtcclxuICAgICAgbCA9IG1hdHJpeC5sZW5ndGg7XHJcbiAgICAgIG0gPSBtYXRyaXhbMF0ubGVuZ3RoO1xyXG4gICAgICBmb3IoIGkgPSAwOyBpIDwgbDsgaSsrICl7XHJcbiAgICAgICAgZm9yKCBqID0gMDsgaiA8IG07IGorKyApe1xyXG4gICAgICAgICAgbWF0cml4W2ldW2pdID0gdjtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgdmFsdWVNYXRyaXg6IGZ1bmN0aW9uICggbWF0cml4LCB2YWx1ZSApIHtcclxuICAgICAgdmFyIGEgPSB0aGlzLnNpemUueCxcclxuICAgICAgICBiID0gTWF0aC5taW4oIE1hdGguZmxvb3IoYSArIHRoaXMuc2l6ZS53KSwgbWF0cml4Lmxlbmd0aCApLFxyXG4gICAgICAgIGMgPSB0aGlzLnNpemUueSxcclxuICAgICAgICBkID0gTWF0aC5taW4oIE1hdGguZmxvb3IoYyArIHRoaXMuc2l6ZS5oKSwgbWF0cml4WzBdLmxlbmd0aCApO1xyXG4gICAgICBpZiggbWF0cml4Lmxlbmd0aCA8IGEgfHwgbWF0cml4WzBdLmxlbmd0aCA8IGQgKSByZXR1cm47XHJcblxyXG4gICAgICB2YXIgaSwgaiwgcCA9IHRoaXMuY29udGV4dC5nZXRJbWFnZURhdGEoMCwgMCwgdGhpcy5pbnN0YW5jZS5jYW52YXMud2lkdGgsIHRoaXMuaW5zdGFuY2UuY2FudmFzLmhlaWdodCkuZGF0YTtcclxuXHJcbiAgICAgIGZvciggaSA9IGE7IGkgPCBiOyBpKysgKXtcclxuICAgICAgICBmb3IoIGogPSBjOyBqIDwgZDsgaisrICl7XHJcbiAgICAgICAgICB2YXIgcGl4ID0gcFsoKHRoaXMuaW5zdGFuY2UuY2FudmFzLndpZHRoICogaikgKyBpKSAqIDRdO1xyXG4gICAgICAgICAgbWF0cml4W2ldW2pdID0gKCBwaXggPT09IDI1NSApID8gdmFsdWUgOiAwO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICByZW5kZXJUaHVtYm5haWxzOiBmdW5jdGlvbiAoIHRhcmdldCwgZmlsdGVyICkge1xyXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgIHZhciBtID0gbmV3IE1hdHJpeCAoIHRoaXMuaW5zdGFuY2UsIHRoaXMucGljdHVyZSwgeyB3OnRoaXMuaW5zdGFuY2Uuc2V0dGluZ3MudGh1bWJXaWR0aCwgaDp0aGlzLmluc3RhbmNlLnNldHRpbmdzLnRodW1iSGVpZ2h0IH0gKTtcclxuXHJcbiAgICAgIGlmICggZmlsdGVyICkge1xyXG4gICAgICAgIG0uYXBwbHlGaWx0ZXIoIGZpbHRlcnNbdGhpcy5pbnN0YW5jZS5tb2RlXS5uYW1lLCB0aGlzLnNldHRpbmdzW2ZpbHRlcnNbdGhpcy5pbnN0YW5jZS5tb2RlXS5wYXJhbV0gKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgbS5jYW52YXMub25jbGljayA9IGZ1bmN0aW9uKCBtYXRyaXggKXtcclxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCBlICkge1xyXG4gICAgICAgICAgc2VsZi5pbnN0YW5jZS5nb1RvKCBtYXRyaXggKTtcclxuICAgICAgICAgIHNlbGYuaW5zdGFuY2UuY2xlYXJQYXJ0cygpO1xyXG4gICAgICAgICAgc2VsZi5pbnN0YW5jZS5saWJlcmF0aW9uUGFydHMxKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KCBtICk7XHJcblxyXG4gICAgICB0aGlzLmluc3RhbmNlLnRodW1iT3JpZ2luYWxUYWIucHVzaCggbSApO1xyXG4gICAgICBmbi5hcHBlbmQoIHRhcmdldCwgbS5jYW52YXMgKTtcclxuXHJcbiAgICAgIHJldHVybiBtO1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIC8qKioqXHJcbiAgICogUFVCTElDIE1FVEhPRFNcclxuICAgKlxyXG4gICAqXHJcbiAgICovXHJcblxyXG4gIGZ1bmN0aW9uIERpYXBQYXJ0ICggIG9wdGlvbnMgKSB7XHJcbiAgICB0aGlzLnNldHRpbmdzID0gT2JqZWN0LmFzc2lnbigge30sIGRlZmF1bHRzLCBvcHRpb25zICk7XHJcbiAgICB0aGlzLm1hdHJpeFRhYiA9IFtdO1xyXG4gICAgdGhpcy50aHVtYk9yaWdpbmFsVGFiID0gW107XHJcbiAgICB0aGlzLnBhcnRpY2xlcyA9IFtdO1xyXG4gICAgdGhpcy5jaGFtcHMgPSBbXTtcclxuICAgIHRoaXMubW9kZSA9IHRoaXMuc2V0dGluZ3MuaW5pdGlhbE1vZGU7XHJcbiAgICB0aGlzLmxpYmVyYXRpb24gPSBmYWxzZTtcclxuICAgIHRoaXMuYWN0aXZlSW5kZXggPSBudWxsO1xyXG4gICAgdGhpcy5jYW52YXMgPSB0aGlzLmdldENhbnZhcygpO1xyXG4gICAgdGhpcy5jb250ZXh0ID0gdGhpcy5nZXRDb250ZXh0MkQoIHRoaXMuY2FudmFzICk7XHJcbiAgfVxyXG5cclxuICBEaWFwUGFydC5wcm90b3R5cGUgPSB7XHJcblxyXG4gICAgICAvLyBjb25zdHJ1Y3RvcjogRGlhcFBhcnQsXHJcblxyXG4gICAgICBpbml0OiBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgICAgIGZuLmFwcGVuZCggdGhpcy5zZXR0aW5ncy50YXJnZXRFbGVtZW50LCB0aGlzLmNhbnZhcyApO1xyXG4gICAgICAgIHRoaXMuY2FudmFzLnN0eWxlLmJhY2tncm91bmRDb2xvciA9IHRoaXMuc2V0dGluZ3MuYmFja2dyb3VuZDtcclxuICAgICAgICB0aGlzLmNlbnRlck1hc3MoKTtcclxuICAgICAgICB0aGlzLmNoYW1wcy5wdXNoKCBuZXcgQ2hhbXAoIG5ldyBWZWN0b3IodGhpcy5zZXR0aW5ncy5tYXNzWCwgdGhpcy5zZXR0aW5ncy5tYXNzWSksIHRoaXMuc2V0dGluZ3MubWFzcyApICk7XHJcbiAgICAgICAgdGhpcy5sb29wKCk7XHJcblxyXG4gICAgICB9LFxyXG5cclxuICAgICAgc2V0OiBmdW5jdGlvbiAoIG9wdGlvbnMgKXtcclxuICAgICAgICBPYmplY3QuYXNzaWduKCB0aGlzLnNldHRpbmdzLCBvcHRpb25zICk7XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICBjcmVhdGVTbGlkZTogZnVuY3Rpb24oIGlucHV0LCBjdXN0b21TaXplICl7XHJcbiAgICAgICAgdmFyIG0gPSBuZXcgTWF0cml4ICggdGhpcywgaW5wdXQsIGN1c3RvbVNpemUgKTtcclxuICAgICAgICB0aGlzLmFjdGl2ZUluZGV4ID0gKCB0aGlzLmFjdGl2ZUluZGV4ID09PSBudWxsICkgPyAwIDogdGhpcy5hY3RpdmVJbmRleDtcclxuICAgICAgICB0aGlzLm1hdHJpeFRhYi5wdXNoKCBtICk7XHJcbiAgICAgICAgcmV0dXJuIG07XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICBnZXRDYW52YXM6IGZ1bmN0aW9uICggc2l6ZSApIHtcclxuICAgICAgICB2YXIgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggJ2NhbnZhcycgKSxcclxuICAgICAgICAgICAgcyA9IHNpemUgfHwge307XHJcblxyXG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSAoIHMuaCApID8gcy5oIDogdGhpcy5zZXR0aW5ncy5oZWlnaHQ7XHJcbiAgICAgICAgY2FudmFzLndpZHRoID0gKCBzLncgKSA/IHMudyA6IHRoaXMuc2V0dGluZ3Mud2lkdGg7XHJcblxyXG4gICAgICAgIHJldHVybiBjYW52YXM7XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICBnZXRDb250ZXh0MkQ6IGZ1bmN0aW9uICggY2FudmFzICkge1xyXG4gICAgICAgIHJldHVybiBjYW52YXMuZ2V0Q29udGV4dCggJzJkJyApO1xyXG4gICAgICB9LFxyXG5cclxuICAgICAgZ2V0SW1hZ2VTaXplOiBmdW5jdGlvbiAoIGltZywgc2l6ZSApIHtcclxuICAgICAgICB2YXIgdyA9IGltZy53aWR0aCwgXHJcbiAgICAgICAgICAgIGggPSBpbWcuaGVpZ2h0LFxyXG4gICAgICAgICAgICBjdyA9ICggc2l6ZSApID8gc2l6ZS53IDogdGhpcy5jYW52YXMud2lkdGgsXHJcbiAgICAgICAgICAgIGNoID0gKCBzaXplICkgPyBzaXplLmggOiB0aGlzLmNhbnZhcy5oZWlnaHQsXHJcbiAgICAgICAgICAgIHJhdGlvID0gdyAvIGg7XHJcblxyXG4gICAgICAgIGlmICggdyA+PSBoICYmIHcgPiBjdyApIHtcclxuICAgICAgICAgIHcgPSBjdztcclxuICAgICAgICAgIGggPSBNYXRoLnJvdW5kKCB3IC8gcmF0aW8gKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICBpZiAoIGggPiBjaCApIHtcclxuICAgICAgICAgICAgaCA9IGNoO1xyXG4gICAgICAgICAgICB3ID0gTWF0aC5yb3VuZCggaCAqIHJhdGlvICk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgeDogTWF0aC5yb3VuZCggKCBjdyAtIHcgKSAvIDIgKSxcclxuICAgICAgICAgIHk6IE1hdGgucm91bmQoICggY2ggLSBoICkgLyAyICksIFxyXG4gICAgICAgICAgdzogdyxcclxuICAgICAgICAgIGg6IGhcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICBsb2FkOiBmdW5jdGlvbiAoIGUgKSB7XHJcbiAgICAgICAgdmFyIGksIGZpbGVzID0gZS50YXJnZXQuZmlsZXMsIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgIGlmICggIWZpbGVzICkgcmV0dXJuO1xyXG5cclxuICAgICAgICBmb3IgKCBpID0gMDsgaSA8IGZpbGVzLmxlbmd0aDsgaSsrICl7XHJcbiAgICAgICAgICB2YXIgZmlsZSA9IGZpbGVzW2ldO1xyXG4gICAgICAgICAgaWYgKCAhZmlsZS50eXBlLm1hdGNoKCAnaW1hZ2UnICkgKSBjb250aW51ZTtcclxuXHJcbiAgICAgICAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcclxuICAgICAgICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbiAoIGV2ZW50ICkge1xyXG4gICAgICAgICAgICB2YXIgaW1nID0gbmV3IEltYWdlKCk7XHJcbiAgICAgICAgICAgIGltZy5vbmxvYWQgPSBmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICAgIHZhciBtO1xyXG4gICAgICAgICAgICAgIG0gPSBzZWxmLmNyZWF0ZVNsaWRlKCB0aGlzICk7XHJcbiAgICAgICAgICAgICAgbS5yZW5kZXJUaHVtYm5haWxzKCBzZWxmLnNldHRpbmdzLnRodW1kbmFpbHNJRCwgZmFsc2UgKTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgaW1nLnNyYyA9IGV2ZW50LnRhcmdldC5yZXN1bHQ7XHJcbiAgICAgICAgICB9O1xyXG4gICAgICAgICAgcmVhZGVyLnJlYWRBc0RhdGFVUkwoIGZpbGUgKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICBzd2l0Y2hNb2RlOiBmdW5jdGlvbiAoIG1vZGUgKSB7XHJcblxyXG4gICAgICAgIHRoaXMubW9kZSA9IG1vZGU7XHJcblxyXG4gICAgICAgIGlmKCB0eXBlb2YgdGhpcy5zZXR0aW5ncy5zd2l0Y2hNb2RlQ2FsbGJhY2sgPT09ICdmdW5jdGlvbicgKSB7XHJcbiAgICAgICAgICB0aGlzLnNldHRpbmdzLnN3aXRjaE1vZGVDYWxsYmFjay5jYWxsKCB0aGlzICk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG5cclxuICAgICAgYWRkTWFzczogZnVuY3Rpb24oIHgsIHksIG1hc3MgKXtcclxuICAgICAgICB2YXIgbSA9IG5ldyBDaGFtcCggbmV3IFZlY3Rvcih4LCB5KSwgbWFzcyApO1xyXG4gICAgICAgIHRoaXMuY2hhbXBzLnB1c2goIG0gKTtcclxuICAgICAgICByZXR1cm4gbTtcclxuICAgICAgfSxcclxuXHJcbiAgICAgIGNlbnRlck1hc3M6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAvL3ZhciB3cyA9IGZuLmdldFZpZXdwb3J0KCk7XHJcbiAgICAgICAgLy9jYW52YXMud2lkdGggPSAoIGRwLnNldHRpbmdzLndpZHRoIDwgd3MudyApID8gZHAuc2V0dGluZ3Mud2lkdGggOiB3cy53O1xyXG4gICAgICAgIC8vY2FudmFzLmhlaWdodCA9ICggZHAuc2V0dGluZ3MuaGVpZ2h0IDwgd3MuaCAtIDEwICkgPyBkcC5zZXR0aW5ncy5oZWlnaHQgOiB3cy5oIC0gMTA7XHJcblxyXG4gICAgICAgIHRoaXMuc2V0dGluZ3MubWFzc1ggPSB0aGlzLmNhbnZhcy53aWR0aC8yO1xyXG4gICAgICAgIHRoaXMuc2V0dGluZ3MubWFzc1kgPSB0aGlzLmNhbnZhcy5oZWlnaHQvMjtcclxuXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICBwYXJ0UHJvY2VlZDogZnVuY3Rpb24gKCBwYXJ0aWNsZSApIHtcclxuICAgICAgICB2YXIgaSwgbCA9IHByb2NlZWRbdGhpcy5tb2RlXS5sZW5ndGg7XHJcbiAgICAgICAgZm9yICggaSA9IDA7IGkgPCBsOyBpKysgKSB7XHJcbiAgICAgICAgICBwYXJ0aWNsZVtwcm9jZWVkW3RoaXMubW9kZV1baV1dKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG5cclxuICAgICAgZ29UbzogZnVuY3Rpb24gKCBtYXRyaXggKSB7XHJcbiAgICAgICAgdGhpcy5hY3RpdmVJbmRleCA9IHRoaXMudGh1bWJPcmlnaW5hbFRhYi5pbmRleE9mKCBtYXRyaXggKTtcclxuICAgICAgfSxcclxuXHJcbiAgICAgIGxpYmVyYXRpb25QYXJ0czE6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgdGhpcy5saWJlcmF0aW9uID0gIXRoaXMubGliZXJhdGlvbjtcclxuICAgICAgICAgIHRoaXMuY2hhbXBzWzBdLm1hc3MgPSB0aGlzLnNldHRpbmdzLmFudGlNYXNzO1xyXG4gICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICBzZWxmLmNoYW1wc1swXS5tYXNzID0gc2VsZi5zZXR0aW5ncy5tYXNzO1xyXG4gICAgICAgICAgICBzZWxmLmxpYmVyYXRpb24gPSAhc2VsZi5saWJlcmF0aW9uO1xyXG4gICAgICAgICAgfSwgNTAwKVxyXG4gICAgICB9LFxyXG5cclxuICAgICAgY3JlYVBhcnRzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMucGFydGljbGVzLmxlbmd0aCA8IHRoaXMuc2V0dGluZ3MuZGVuc2l0eSkge1xyXG4gICAgICAgICAgdmFyIGksIG5iID0gdGhpcy5zZXR0aW5ncy5kZW5zaXR5IC0gdGhpcy5wYXJ0aWNsZXMubGVuZ3RoO1xyXG4gICAgICAgICAgZm9yICggaSA9IDA7IGkgPCBuYjsgaSsrICkge1xyXG4gICAgICAgICAgICB0aGlzLnBhcnRpY2xlcy5wdXNoKG5ldyBQYXJ0aWNsZSh0aGlzLCBuZXcgVmVjdG9yKE1hdGgucmFuZG9tKCkgKiB0aGlzLmNhbnZhcy53aWR0aCwgTWF0aC5yYW5kb20oKSAqIHRoaXMuY2FudmFzLmhlaWdodCksIG5ldyBWZWN0b3IocmVhbFJhbmRvbSh0aGlzLnNldHRpbmdzLmluaXRpYWxWZWxvY2l0eSksIHJlYWxSYW5kb20odGhpcy5zZXR0aW5ncy5pbml0aWFsVmVsb2NpdHkpKSwgbmV3IFZlY3RvcigwLCAwKSwgMCwgZmFsc2UpKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICB1cGdyYWRlUGFydHM6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgY3VycmVudFBhcnRzID0gW10sXHJcbiAgICAgICAgICAgIGksIGwgPSB0aGlzLnBhcnRpY2xlcy5sZW5ndGg7XHJcbiAgICAgICAgZm9yKCBpID0gMDsgaSA8IGw7IGkrKyApe1xyXG4gICAgICAgICAgdmFyIHBhcnRpY2xlID0gdGhpcy5wYXJ0aWNsZXNbaV0sXHJcbiAgICAgICAgICAgICAgcG9zID0gcGFydGljbGUucG9zaXRpb247XHJcbiAgICAgICAgICBpZiggcG9zLnggPj0gdGhpcy5jYW52YXMud2lkdGggfHwgcG9zLnggPD0gMCB8fCBwb3MueSA+PSB0aGlzLmNhbnZhcy5oZWlnaHQgfHwgcG9zLnkgPD0gMCApIGNvbnRpbnVlO1xyXG4gICAgICAgICAgdGhpcy5wYXJ0UHJvY2VlZCggcGFydGljbGUgKTtcclxuICAgICAgICAgIHBhcnRpY2xlLm1vdmUoKTtcclxuICAgICAgICAgIGN1cnJlbnRQYXJ0cy5wdXNoKCBwYXJ0aWNsZSApO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLnBhcnRpY2xlcyA9IGN1cnJlbnRQYXJ0cztcclxuICAgICAgICB0aGlzLnNldHRpbmdzLmJpZ2JhbmcgPSBmYWxzZTtcclxuICAgICAgfSxcclxuXHJcbiAgICAgIGRyYXdQYXJ0czogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBpLCBuID0gdGhpcy5wYXJ0aWNsZXMubGVuZ3RoO1xyXG4gICAgICAgIGZvciggaSA9IDA7IGkgPCBuOyBpKysgKXtcclxuICAgICAgICAgIHZhciBwb3MgPSB0aGlzLnBhcnRpY2xlc1tpXS5wb3NpdGlvbjtcclxuICAgICAgICAgIHRoaXMuY29udGV4dC5maWxsU3R5bGUgPSB0aGlzLnBhcnRpY2xlc1tpXS5jb2xvcjtcclxuICAgICAgICAgIHRoaXMuY29udGV4dC5maWxsUmVjdChwb3MueCwgcG9zLnksIHRoaXMuc2V0dGluZ3MucGFydGljbGVTaXplLCB0aGlzLnNldHRpbmdzLnBhcnRpY2xlU2l6ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG5cclxuICAgICAgY2xlYXJQYXJ0czogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBpLCBsID0gdGhpcy5wYXJ0aWNsZXMubGVuZ3RoO1xyXG4gICAgICAgIGZvciggaSA9IDA7IGkgPCBsOyBpKysgKXtcclxuICAgICAgICAgIHRoaXMucGFydGljbGVzW2ldLmluRm9ybSA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gT24gbmV0dG9pZSBsZSBjYW52YXMuXHJcbiAgICAgIGNsZWFyOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgaWYoICF0aGlzLnNldHRpbmdzLmRyYXcgKSB7XHJcbiAgICAgICAgICB0aGlzLmNvbnRleHQuY2xlYXJSZWN0KCAwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0ICk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gUmFwcGVsIGRlIGJvdWNsZS5cclxuICAgICAgcXVldWU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgaWYoICF0aGlzLnNldHRpbmdzLnN0b3AgKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlcXVlc3RJRCA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoIHNlbGYubG9vcC5iaW5kKHNlbGYpICk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSggc2VsZi5yZXF1ZXN0SUQgKTtcclxuICAgICAgICAgICAgICAgIHRoaXMucmVxdWVzdElEID0gdW5kZWZpbmVkO1xyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIFVwZ3JhZGUgcGFydGljdWxlcyBhIGNyZWVyLlxyXG4gICAgICB1cGRhdGU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLmNyZWFQYXJ0cygpO1xyXG4gICAgICAgIHRoaXMudXBncmFkZVBhcnRzKCk7XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBVcGdyYWRlIHBvc2l0aW9uIGV0IGRlc3NpbiBwYXJ0aWN1bGVzLlxyXG4gICAgICBkcmF3OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5kcmF3UGFydHMoKTtcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIENvbnRlbnUgZGUgbGEgYm91Y2xlLlxyXG4gICAgICBsb29wOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5jbGVhcigpO1xyXG4gICAgICAgIHRoaXMudXBkYXRlKCk7XHJcbiAgICAgICAgdGhpcy5kcmF3KCk7XHJcbiAgICAgICAgdGhpcy5xdWV1ZSgpO1xyXG4gICAgICB9LFxyXG5cclxuICAgICAgc3RvcDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuc2V0dGluZ3Muc3RvcCA9IHRydWU7XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICBzdGFydDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuc2V0dGluZ3Muc3RvcCA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMubG9vcCgpO1xyXG4gICAgICB9XHJcblxyXG4gICAgfTtcclxuXHJcbiAgICBmaWx0ZXIgPSB7XHJcblxyXG4gICAgICBibGFja0FuZFdoaXRlOiBmdW5jdGlvbiAoIHBpeGVscywgdGhyZXNob2xkICkge1xyXG4gICAgICAgIGlmICggIXBpeGVscyApIHJldHVybiBwaXhlbHM7XHJcbiAgICAgICAgdmFyIGksIHIsIGcsIGIsIHYsIGQgPSBwaXhlbHMuZGF0YTtcclxuICAgICAgICBmb3IgKCBpID0gMDsgaSA8IGQubGVuZ3RoOyBpKz00ICkge1xyXG4gICAgICAgICAgciA9IGRbaV07XHJcbiAgICAgICAgICBnID0gZFtpKzFdO1xyXG4gICAgICAgICAgYiA9IGRbaSsyXTtcclxuICAgICAgICAgIHYgPSAoMC4yMTI2KnIgKyAwLjcxNTIqZyArIDAuMDcyMipiID49IHRocmVzaG9sZCkgPyAyNTUgOiAwO1xyXG4gICAgICAgICAgZFtpXSA9IGRbaSsxXSA9IGRbaSsyXSA9IHZcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHBpeGVscztcclxuICAgICAgfVxyXG5cclxuICAgIH07XHJcbiAgICBcclxuICAgZnVuY3Rpb24gcmVhbFJhbmRvbSggbWF4ICl7XHJcbiAgICAgIHJldHVybiBNYXRoLmNvcygoTWF0aC5yYW5kb20oKSAqIE1hdGguUEkpKSAqIG1heDtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBWZWN0b3IoIHgsIHkgKSB7XHJcbiAgICAgIHRoaXMueCA9IHggfHwgMDtcclxuICAgICAgdGhpcy55ID0geSB8fCAwO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIE1ldGhvZGVzIHN1ciBsZXMgdmVjdGV1cnMuXHJcbiAgICAvLyBBam91dGVyIHVuIHZlY3RldXIgYSB1biBhdXRyZS5cclxuICAgIFZlY3Rvci5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24odmVjdG9yKXtcclxuICAgICAgdGhpcy54ICs9IHZlY3Rvci54O1xyXG4gICAgICB0aGlzLnkgKz0gdmVjdG9yLnk7XHJcbiAgICB9O1xyXG5cclxuICAgIC8vIEludmVyc2VyIGxhIGRpcmVjdGlvbiBkdSB2ZWN0ZXVyLlxyXG4gICAgVmVjdG9yLnByb3RvdHlwZS5nZXRJbnZlcnQgPSBmdW5jdGlvbigpe1xyXG4gICAgICB0aGlzLnggPSAtMSAqICh0aGlzLngpO1xyXG4gICAgICB0aGlzLnkgPSAtMSAqICh0aGlzLnkpO1xyXG4gICAgfTtcclxuXHJcbiAgICAvL09idGVuaXIgbGEgbWFnbml0dWRlIChsb25ndWV1cikgZCd1biB2ZWN0ZXVyLlxyXG4gICAgVmVjdG9yLnByb3RvdHlwZS5nZXRNYWduaXR1ZGUgPSBmdW5jdGlvbigpe1xyXG4gICAgICByZXR1cm4gTWF0aC5zcXJ0KHRoaXMueCAqIHRoaXMueCArIHRoaXMueSAqIHRoaXMueSlcclxuICAgIH07XHJcblxyXG4gICAgLy8gT2J0ZW5pciBsJ2FuZ2xlIGQndW4gdmVjdGV1ciBwYXIgcmFwcG9ydCDDoCBsJ2Fic2lzc2UuXHJcbiAgICBWZWN0b3IucHJvdG90eXBlLmdldEFuZ2xlID0gZnVuY3Rpb24oKXtcclxuICAgICAgcmV0dXJuIE1hdGguYXRhbjIodGhpcy55LCB0aGlzLngpO1xyXG4gICAgfTtcclxuXHJcbiAgICAvLyBQZXJtZXQgZCdvYnRlbmlyIHVuIG5vdXZlYXUgdmVjdGV1ciDDoCBwYXJ0aXIgZCd1biBhbmdsZSBldCBkJ3VuZSBsb25ndWV1ci5cclxuICAgIFZlY3Rvci5wcm90b3R5cGUuZnJvbUFuZ2xlID0gZnVuY3Rpb24gKCBhbmdsZSwgbWFnbml0dWRlICkge1xyXG4gICAgICByZXR1cm4gbmV3IFZlY3RvcihtYWduaXR1ZGUgKiBNYXRoLmNvcyhhbmdsZSksIG1hZ25pdHVkZSAqIE1hdGguc2luKGFuZ2xlKSk7XHJcbiAgICB9O1xyXG5cclxuICAgIC8vIENvbnN0cnVjdGV1ciBwYXJ0aWN1bGUuXHJcbiAgICBmdW5jdGlvbiBQYXJ0aWNsZSggaW5zdGFuY2UsIHBvc2l0aW9uLCB2aXRlc3NlLCBhY2NlbGVyYXRpb24gKSB7XHJcbiAgICAgIHRoaXMuaW5zdGFuY2UgPSBpbnN0YW5jZTtcclxuICAgICAgdGhpcy5wb3NpdGlvbiA9IHBvc2l0aW9uIHx8IG5ldyBWZWN0b3IoMCwgMCk7XHJcbiAgICAgIHRoaXMudml0ZXNzZSA9IHZpdGVzc2UgfHwgbmV3IFZlY3RvcigwLCAwKTtcclxuICAgICAgdGhpcy5hY2NlbGVyYXRpb24gPSBhY2NlbGVyYXRpb24gfHwgbmV3IFZlY3RvcigwLCAwKTtcclxuICAgICAgdGhpcy5jb2xvciA9IHRoaXMuaW5zdGFuY2Uuc2V0dGluZ3MucGFydGljbGVDb2xvcjtcclxuICAgICAgdGhpcy5pbkZvcm0gPSAwO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIE1vdXZlbWVudCBwYXJ0aWN1bGUuXHJcbiAgICBQYXJ0aWNsZS5wcm90b3R5cGUubW92ZSA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgIHRoaXMudml0ZXNzZS5hZGQoIHRoaXMuYWNjZWxlcmF0aW9uICk7XHJcbiAgICAgIHRoaXMucG9zaXRpb24uYWRkKCB0aGlzLnZpdGVzc2UgKTtcclxuICAgIH07XHJcblxyXG4gICAgLy8gRm9yY2UgZHUgY2hhbXAgYXBwbGlxdcOpIMOgIGxhIHBhcnRpY3VsZS5cclxuICAgIFBhcnRpY2xlLnByb3RvdHlwZS5zb3VtaXNDaGFtcCA9IGZ1bmN0aW9uKCkge1xyXG5cclxuICAgICAgaWYgKCAhdGhpcy5pbnN0YW5jZS5jaGFtcHNbMF0ubWFzcyApIHJldHVybjtcclxuICAgICAgaWYgKCB0aGlzLmluRm9ybSAhPT0gMSApIHtcclxuXHJcbiAgICAgICAgdmFyIHRvdGFsQWNjZWxlcmF0aW9uWCA9IDA7XHJcbiAgICAgICAgdmFyIHRvdGFsQWNjZWxlcmF0aW9uWSA9IDA7XHJcbiAgICAgICAgdmFyIGwgPSB0aGlzLmluc3RhbmNlLmNoYW1wcy5sZW5ndGg7XHJcblxyXG4gICAgICAgIGZvciggdmFyIGkgPSAwOyBpIDwgbDsgaSsrICl7XHJcbiAgICAgICAgICAvLyBEaXN0YW5jZSBwYXJ0aWN1bGUvY2hhbXAuXHJcbiAgICAgICAgICB2YXIgZGlzdFggPSB0aGlzLmluc3RhbmNlLmNoYW1wc1tpXS5wb3NpdGlvbi54IC0gdGhpcy5wb3NpdGlvbi54O1xyXG4gICAgICAgICAgdmFyIGRpc3RZID0gdGhpcy5pbnN0YW5jZS5jaGFtcHNbaV0ucG9zaXRpb24ueSAtIHRoaXMucG9zaXRpb24ueTtcclxuICAgICAgICAgIHZhciBmb3JjZSA9IHRoaXMuaW5zdGFuY2UuY2hhbXBzW2ldLm1hc3MgLyBNYXRoLnBvdyhkaXN0WCAqIGRpc3RYICsgZGlzdFkgKiBkaXN0WSwgMS41KTtcclxuICAgICAgICAgIHRvdGFsQWNjZWxlcmF0aW9uWCArPSBkaXN0WCAqIGZvcmNlO1xyXG4gICAgICAgICAgdG90YWxBY2NlbGVyYXRpb25ZICs9IGRpc3RZICogZm9yY2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuYWNjZWxlcmF0aW9uID0gbmV3IFZlY3RvciggdG90YWxBY2NlbGVyYXRpb25YLCB0b3RhbEFjY2VsZXJhdGlvblkgKTtcclxuICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBQYXNzYWdlIGRhbnMgbGEgZm9ybWUgYXBwbGlxdcOpIMOgIGxhIFBhcnRpY2xlLlxyXG4gICAgUGFydGljbGUucHJvdG90eXBlLnNvdW1pc0Zvcm0gPSBmdW5jdGlvbigpe1xyXG5cclxuICAgICAgaWYoIHRoaXMuaW5zdGFuY2UubGliZXJhdGlvbiApe1xyXG4gICAgICAgIHRoaXMuaW5Gb3JtID0gMDtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHZhciB0ZXN0WCA9IE1hdGguZmxvb3IoIHRoaXMucG9zaXRpb24ueCApO1xyXG4gICAgICB2YXIgdGVzdFkgPSBNYXRoLmZsb29yKCB0aGlzLnBvc2l0aW9uLnkgKTtcclxuICAgICAgdmFyIHZhbHVlID0gKCB0aGlzLmluc3RhbmNlLmFjdGl2ZUluZGV4ICE9PSBudWxsICkgPyB0aGlzLmluc3RhbmNlLm1hdHJpeFRhYlt0aGlzLmluc3RhbmNlLmFjdGl2ZUluZGV4XS5nZXRNYXRyaXgoKVt0ZXN0WF1bdGVzdFldIDogMDtcclxuXHJcbiAgICAgIGlmICggdmFsdWUgIT09IDAgKXtcclxuICAgICAgICBpZiggdGhpcy5pbkZvcm0gIT09IDEgKXtcclxuICAgICAgICAgIHRoaXMuaW5Gb3JtID0gMTtcclxuICAgICAgICAgIHRoaXMudml0ZXNzZSA9IG5ldyBWZWN0b3IodGhpcy52aXRlc3NlLnggKiAwLjIsIHRoaXMudml0ZXNzZS55ICogMC4yKTtcclxuICAgICAgICAgIHRoaXMuYWNjZWxlcmF0aW9uID0gbmV3IFZlY3RvcigwLCAwKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgZWxzZSB7XHJcbiAgICAgICAgaWYoIHRoaXMuaW5Gb3JtID09PSAxICl7XHJcbiAgICAgICAgICB0aGlzLnZpdGVzc2UuZ2V0SW52ZXJ0KCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIC8vIENvbnN0cnVjdGlvbiBkdSBjaGFtcC5cclxuICAgIGZ1bmN0aW9uIENoYW1wKCBwb2ludCwgbWFzcyApIHtcclxuICAgICAgdGhpcy5wb3NpdGlvbiA9IHBvaW50O1xyXG4gICAgICB0aGlzLnNldE1hc3MoIG1hc3MgKTtcclxuICAgIH1cclxuXHJcbiAgICBDaGFtcC5wcm90b3R5cGUuc2V0TWFzcyA9IGZ1bmN0aW9uKCBtYXNzICl7XHJcbiAgICAgIHRoaXMubWFzcyA9IG1hc3MgfHwgMDtcclxuICAgICAgdGhpcy5jb2xvciA9IG1hc3MgPCAwID8gXCIjZjAwXCIgOiBcIiMwZjBcIjtcclxuICAgIH07XHJcblxyXG5cclxuICAvLyBQT0xZRklMTFxyXG5cclxuICAvLyBQcm9kdWN0aW9uIHN0ZXBzIG9mIEVDTUEtMjYyLCBFZGl0aW9uIDUsIDE1LjQuNC4xNFxyXG4gIC8vIFLDqWbDqXJlbmNlIDogaHR0cDovL2VzNS5naXRodWIuaW8vI3gxNS40LjQuMTRcclxuICBpZiAoIUFycmF5LnByb3RvdHlwZS5pbmRleE9mKSB7XHJcbiAgICBBcnJheS5wcm90b3R5cGUuaW5kZXhPZiA9IGZ1bmN0aW9uKHNlYXJjaEVsZW1lbnQsIGZyb21JbmRleCkge1xyXG4gICAgICB2YXIgaztcclxuICAgICAgaWYgKHRoaXMgPT0gbnVsbCkge1xyXG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1widGhpc1wiIHZhdXQgbnVsbCBvdSBuIGVzdCBwYXMgZMOpZmluaScpO1xyXG4gICAgICB9XHJcbiAgICAgIHZhciBPID0gT2JqZWN0KHRoaXMpO1xyXG4gICAgICB2YXIgbGVuID0gTy5sZW5ndGggPj4+IDA7XHJcbiAgICAgIGlmIChsZW4gPT09IDApIHtcclxuICAgICAgICByZXR1cm4gLTE7XHJcbiAgICAgIH1cclxuICAgICAgdmFyIG4gPSArZnJvbUluZGV4IHx8IDA7XHJcbiAgICAgIGlmIChNYXRoLmFicyhuKSA9PT0gSW5maW5pdHkpIHtcclxuICAgICAgICBuID0gMDtcclxuICAgICAgfVxyXG4gICAgICBpZiAobiA+PSBsZW4pIHtcclxuICAgICAgICByZXR1cm4gLTE7XHJcbiAgICAgIH1cclxuICAgICAgayA9IE1hdGgubWF4KG4gPj0gMCA/IG4gOiBsZW4gLSBNYXRoLmFicyhuKSwgMCk7XHJcbiAgICAgIHdoaWxlIChrIDwgbGVuKSB7XHJcbiAgICAgICAgaWYgKGsgaW4gTyAmJiBPW2tdID09PSBzZWFyY2hFbGVtZW50KSB7XHJcbiAgICAgICAgICByZXR1cm4gaztcclxuICAgICAgICB9XHJcbiAgICAgICAgaysrO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiAtMTtcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBpZiAodHlwZW9mIE9iamVjdC5hc3NpZ24gIT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgT2JqZWN0LmFzc2lnbiA9IGZ1bmN0aW9uICh0YXJnZXQsIHZhckFyZ3MpIHsgLy8gLmxlbmd0aCBvZiBmdW5jdGlvbiBpcyAyXHJcbiAgICAgICd1c2Ugc3RyaWN0JztcclxuICAgICAgaWYgKHRhcmdldCA9PSBudWxsKSB7IC8vIFR5cGVFcnJvciBpZiB1bmRlZmluZWQgb3IgbnVsbFxyXG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0Nhbm5vdCBjb252ZXJ0IHVuZGVmaW5lZCBvciBudWxsIHRvIG9iamVjdCcpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB2YXIgdG8gPSBPYmplY3QodGFyZ2V0KTtcclxuXHJcbiAgICAgIGZvciAodmFyIGluZGV4ID0gMTsgaW5kZXggPCBhcmd1bWVudHMubGVuZ3RoOyBpbmRleCsrKSB7XHJcbiAgICAgICAgdmFyIG5leHRTb3VyY2UgPSBhcmd1bWVudHNbaW5kZXhdO1xyXG5cclxuICAgICAgICBpZiAobmV4dFNvdXJjZSAhPSBudWxsKSB7IC8vIFNraXAgb3ZlciBpZiB1bmRlZmluZWQgb3IgbnVsbFxyXG4gICAgICAgICAgZm9yICh2YXIgbmV4dEtleSBpbiBuZXh0U291cmNlKSB7XHJcbiAgICAgICAgICAgIC8vIEF2b2lkIGJ1Z3Mgd2hlbiBoYXNPd25Qcm9wZXJ0eSBpcyBzaGFkb3dlZFxyXG4gICAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG5leHRTb3VyY2UsIG5leHRLZXkpKSB7XHJcbiAgICAgICAgICAgICAgdG9bbmV4dEtleV0gPSBuZXh0U291cmNlW25leHRLZXldO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiB0bztcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICAvLyBodHRwOi8vcGF1bGlyaXNoLmNvbS8yMDExL3JlcXVlc3RhbmltYXRpb25mcmFtZS1mb3Itc21hcnQtYW5pbWF0aW5nL1xyXG4gIC8vIGh0dHA6Ly9teS5vcGVyYS5jb20vZW1vbGxlci9ibG9nLzIwMTEvMTIvMjAvcmVxdWVzdGFuaW1hdGlvbmZyYW1lLWZvci1zbWFydC1lci1hbmltYXRpbmdcclxuICAvLyByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgcG9seWZpbGwgYnkgRXJpayBNw7ZsbGVyLiBmaXhlcyBmcm9tIFBhdWwgSXJpc2ggYW5kIFRpbm8gWmlqZGVsXHJcbiAgLy8gTUlUIGxpY2Vuc2VcclxuXHJcbiAgKGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIGxhc3RUaW1lID0gMDtcclxuICAgIHZhciB2ZW5kb3JzID0gWydtcycsICdtb3onLCAnd2Via2l0JywgJ28nXTtcclxuICAgIGZvcih2YXIgeCA9IDA7IHggPCB2ZW5kb3JzLmxlbmd0aCAmJiAhd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZTsgKyt4KSB7XHJcbiAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSB3aW5kb3dbdmVuZG9yc1t4XSsnUmVxdWVzdEFuaW1hdGlvbkZyYW1lJ107XHJcbiAgICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSA9IHdpbmRvd1t2ZW5kb3JzW3hdKydDYW5jZWxBbmltYXRpb25GcmFtZSddXHJcbiAgICAgICAgfHwgd2luZG93W3ZlbmRvcnNbeF0rJ0NhbmNlbFJlcXVlc3RBbmltYXRpb25GcmFtZSddO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICghd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSlcclxuICAgICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSA9IGZ1bmN0aW9uKGNhbGxiYWNrLCBlbGVtZW50KSB7XHJcbiAgICAgICAgdmFyIGN1cnJUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcbiAgICAgICAgdmFyIHRpbWVUb0NhbGwgPSBNYXRoLm1heCgwLCAxNiAtIChjdXJyVGltZSAtIGxhc3RUaW1lKSk7XHJcbiAgICAgICAgdmFyIGlkID0gd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IGNhbGxiYWNrKGN1cnJUaW1lICsgdGltZVRvQ2FsbCk7IH0sXHJcbiAgICAgICAgICB0aW1lVG9DYWxsKTtcclxuICAgICAgICBsYXN0VGltZSA9IGN1cnJUaW1lICsgdGltZVRvQ2FsbDtcclxuICAgICAgICByZXR1cm4gaWQ7XHJcbiAgICAgIH07XHJcblxyXG4gICAgaWYgKCF3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUpXHJcbiAgICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSA9IGZ1bmN0aW9uKGlkKSB7XHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KGlkKTtcclxuICAgICAgfTtcclxuICB9KCkpO1xyXG5cclxuICByZXR1cm4ge1xyXG5cclxuICAgIGdldEluc3RhbmNlOiBmdW5jdGlvbiggIG9wdGlvbnMgKSB7XHJcbiAgICAgIHZhciBpID0gbmV3IERpYXBQYXJ0KCBvcHRpb25zICk7XHJcbiAgICAgIGkuaW5pdCgpO1xyXG4gICAgICByZXR1cm4gaTtcclxuICAgIH0sXHJcblxyXG4gICAgcmVnaXN0ZXJNb2R1bGU6IGZ1bmN0aW9uIChuYW1lLCBwYXJhbSkge1xyXG4gICAgICBmbi5zaW1wbGVFeHRlbmQoIERpYXBQYXJ0LnByb3RvdHlwZSwgcGFyYW0ucHJvdG8gKTtcclxuICAgICAgZGVmYXVsdHNbbmFtZV0gPSBwYXJhbS5vcHRpb25zO1xyXG4gICAgfSxcclxuXHJcbiAgICByZWdpc3Rlck1vZGU6IGZ1bmN0aW9uICggbmFtZSwgcGFyYW0gKSB7XHJcblxyXG4gICAgICBpZiAoIGRlZmF1bHRzW25hbWVdICkgdGhyb3cgbmV3IEVycm9yKCBcIk5hbWUgc3BhY2UgZm9yICdcIiArIG5hbWUgKyBcIicgYWxyZWFkeSBleGlzdC4gQ2hvb3NlIGFuIG90aGVyIG1vZHVsZSBuYW1lLlwiICk7XHJcblxyXG4gICAgICBkZWZhdWx0c1tuYW1lXSA9IHRydWU7XHJcblxyXG4gICAgICBmbi5zaW1wbGVFeHRlbmQoIGRlZmF1bHRzLCBwYXJhbS5vcHRpb25zICk7XHJcbiAgICAgIGZuLnNpbXBsZUV4dGVuZCggUGFydGljbGUucHJvdG90eXBlLCBwYXJhbS5wcm90b19wYXJ0aWNsZXMgKTtcclxuICAgICAgZm4uc2ltcGxlRXh0ZW5kKCBNYXRyaXgucHJvdG90eXBlLCBwYXJhbS5wcm90b19tYXRyaXggKTtcclxuXHJcbiAgICAgIGZpbHRlcnNbbmFtZV0gPSBwYXJhbS5zY2VuYXJpby5maWx0ZXJzO1xyXG4gICAgICBwcm9jZWVkW25hbWVdID0gcGFyYW0uc2NlbmFyaW8ucHJvY2VlZDtcclxuICAgICAgbWF0cml4TWV0aG9kW25hbWVdID0gcGFyYW0uc2NlbmFyaW8ubWF0cml4TWV0aG9kO1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG59KSh0aGlzLCB0aGlzLmRvY3VtZW50KTsiLCJzbGlkZVBhcnRpY2xlcy5yZWdpc3Rlck1vZGUoICdtb2RlQ29sb3InLCB7XHJcbiAgb3B0aW9uczoge30sXHJcbiAgcHJvdG9fcGFydGljbGVzOiB7XHJcbiAgICBzb3VtaXNDb2xvcjogZnVuY3Rpb24oKXtcclxuICAgICAgdGhpcy5pbkZvcm0gPSAwO1xyXG4gICAgICB2YXIgdGVzdFggPSBNYXRoLmZsb29yKCB0aGlzLnBvc2l0aW9uLnggKTtcclxuICAgICAgdmFyIHRlc3RZID0gTWF0aC5mbG9vciggdGhpcy5wb3NpdGlvbi55ICk7XHJcbiAgICAgIHRoaXMuY29sb3IgPSAoIHRoaXMuaW5zdGFuY2UuYWN0aXZlSW5kZXggIT09IG51bGwgKSA/IHRoaXMuaW5zdGFuY2UubWF0cml4VGFiW3RoaXMuaW5zdGFuY2UuYWN0aXZlSW5kZXhdLmdldE1hdHJpeCgpW3Rlc3RYXVt0ZXN0WV0gOiB0aGlzLmluc3RhbmNlLnNldHRpbmdzLnBhcnRpY2xlQ29sb3I7XHJcbiAgICB9XHJcbiAgfSxcclxuICBwcm90b19tYXRyaXg6IHtcclxuICAgIGNvbG9yTWF0cml4OiBmdW5jdGlvbiAoIG1hdHJpeCApIHtcclxuICAgICAgdmFyIGEgPSB0aGlzLnNpemUueCxcclxuICAgICAgICBjID0gdGhpcy5zaXplLnksXHJcbiAgICAgICAgZCA9IE1hdGguZmxvb3IoYyArIHRoaXMuc2l6ZS5oKTtcclxuICAgICAgaWYoIG1hdHJpeC5sZW5ndGggPCBhIHx8IG1hdHJpeFswXS5sZW5ndGggPCBkICkgcmV0dXJuO1xyXG5cclxuICAgICAgdmFyIGksIGosIHIsIGcsIGIsIHAgPSB0aGlzLmNvbnRleHQuZ2V0SW1hZ2VEYXRhKDAsIDAsIHRoaXMuaW5zdGFuY2UuY2FudmFzLndpZHRoLCB0aGlzLmluc3RhbmNlLmNhbnZhcy5oZWlnaHQpLmRhdGE7XHJcblxyXG4gICAgICBmb3IoIGkgPSAwOyBpIDwgdGhpcy5jYW52YXMuaGVpZ2h0OyBpKysgKXtcclxuICAgICAgICBmb3IoIGogPSAwOyBqIDwgdGhpcy5jYW52YXMud2lkdGg7IGorKyApe1xyXG4gICAgICAgICAgciA9IHBbKCh0aGlzLmluc3RhbmNlLmNhbnZhcy53aWR0aCAqIGopICsgaSkgKiA0XTtcclxuICAgICAgICAgIGcgPSBwWygodGhpcy5pbnN0YW5jZS5jYW52YXMud2lkdGggKiBqKSArIGkpICogNCArIDFdO1xyXG4gICAgICAgICAgYiA9IHBbKCh0aGlzLmluc3RhbmNlLmNhbnZhcy53aWR0aCAqIGopICsgaSkgKiA0ICsgMl07XHJcbiAgICAgICAgICBtYXRyaXhbaV1bal0gPSAncmdiYSgnICsgciArICcsICcgKyBnICsgJywgJyArIGIgKyAnLCAxKSc7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxuICBmaWx0ZXI6IHt9LFxyXG4gIHNjZW5hcmlvOiB7XHJcbiAgICBmaWx0ZXJzOiB7XHJcbiAgICAgIG5hbWU6IG51bGwsXHJcbiAgICAgIHBhcmFtOiBudWxsXHJcbiAgICB9LFxyXG4gICAgcHJvY2VlZDogWydzb3VtaXNDaGFtcCcsICdzb3VtaXNDb2xvciddLFxyXG4gICAgbWF0cml4TWV0aG9kOiAnY29sb3JNYXRyaXgnXHJcbiAgfVxyXG59KTsiXX0=
