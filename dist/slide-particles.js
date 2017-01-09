

var slideParticles = function (window, document, undefined) {

  "use strict";

  var fn,
      filter,
      proceed,
      filters,
      matrixMethod,
      oo = {},
      getProto = Object.getPrototypeOf,


  // Defaults settings.
  defaults = {
    height: 500,
    width: 500,
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
    modes: {
      modeForm: true
    }
  };

  /**
   * All image filters function.
   * 
   */
  filter = {
    // Turn colored picture on black and white. Used for modeForm.
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

  /**
   * Each modes registered need an entry on filters object.
   * It permit to call corresponding filter function for each mode registered.
   * The corresponding filter fonction is called when matrix are built.
   * 
   * By default, there is only one mode : modeForm.
   * If a mode don't need filter, set {} to the mode name entry.
   * 
   * name : name of the filter function attach to filter object.
   * param : key targetting the settings parameter, passing as argument when filter function is called. Must be an Array in settings.
   * 
  */
  filters = {
    modeForm: {
      name: 'blackAndWhite',
      param: 'thresholdNB'
    }
  };

  /**
   * For each mode, register all methods to apply for eache Particles instance in the loop.
   * Must be a Particles method.
   * -----> see DiapPart.prototype.partProceed
   * 
   */
  proceed = {
    modeForm: ['soumisChamp', 'soumisForm']
  };

  // For each mode, register the Matrix method called to create the matrix (2 dimentional array).
  matrixMethod = {
    modeForm: 'valueMatrix'
  };

  // Utility functions.
  fn = {
    // Return viewport size.
    getViewport: function () {
      return {
        w: Math.max(document.documentElement.clientWidth, window.innerWidth || 0),
        h: Math.max(document.documentElement.clientHeight, window.innerHeight || 0)
      };
    },

    // Append element in target.
    append: function (target, element) {
      if (typeof target === 'string') {
        document.getElementById(target).appendChild(element);
      } else {
        target.appendChild(element);
      }
    },

    // Test if target is plain object. Thank you jQuery 3+ !
    isPlainObject: function (target) {
      var proto, Ctor;
      // Detect obvious negatives
      // Use toString instead of jQuery.type to catch host objects
      if (!target || oo.toString.call(target) !== "[object Object]") {
        return false;
      }
      proto = getProto(target);
      // Objects with no prototype (e.g., `Object.create( null )`) are plain
      if (!proto) {
        return true;
      }
      // Objects with prototype are plain iff they were constructed by a global Object function
      Ctor = oo.hasOwnProperty.call(proto, "constructor") && proto.constructor;
      return typeof Ctor === "function" && oo.hasOwnProperty.call(Ctor.prototype, "isPrototypeOf");
    },

    // Deeply extend a object with b object properties.
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
          // If propertie is Array or Object.
          if (copy && (fn.isPlainObject(copy) || (isAnArray = Array.isArray.call(copy)))) {
            if (isAnArray) {
              isAnArray = false;
              clone = src && src.isArray ? src : [];
            } else {
              clone = src && fn.isPlainObject(src) ? src : {};
            }
            // Create new Array or Object, never reference it.
            a[key] = fn.simpleExtend(clone, copy);
          } else {
            a[key] = copy;
          }
        }
      }
      return a;
    }
  };

  // Matrix class object.
  function Matrix(instance, input, customSize) {
    this.instance = instance;
    this.type = typeof input !== 'string' ? 'picture' : 'text';
    this.picture = input;
    this.canvas = this.instance.getCanvas(customSize);
    this.context = this.instance.getContext2D(this.canvas);
    this.size = typeof input !== 'string' ? this.instance.getImageSize(input, customSize) : { x: 0, y: 0, w: 0, h: 0 };
    this.matrix = this.buildAllMatrix();
  }

  Matrix.prototype = {

    // Clear matrix's canvas.
    clear: function () {
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    },

    // Return matrix's canva's image data.
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

    // Draw text in canvas.
    setText: function () {

      // Clear useless spaces in string to draw.
      var cleared = this.picture.trim();

      // If string empty, set size to 0 to avoid matrix calculation, and clear matrix.
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
          // Split text in array for each end of line.
      fontSize = this.instance.settings.fontSize;

      this.context.font = fontSize + "px " + this.instance.settings.font;
      this.context.fillStyle = this.instance.settings.textColor;
      this.context.textAlign = "left";

      // Draw line by line.
      for (i = 0; i < lines.length; i++) {
        this.context.fillText(lines[i], x, y + i * fontSize);
        w = Math.max(w, Math.floor(this.context.measureText(lines[i]).width));
      }

      // Set size object, to calculate targeted zone on the matrix.
      this.size.x = Math.max(x, this.size.x);
      this.size.y = Math.max(y - fontSize, this.size.y);
      this.size.w = Math.max(w + fontSize, this.size.w);
      this.size.h = Math.max(fontSize * i + fontSize, this.size.h);
    },

    // Apply filter's name with argArray.
    applyFilter: function (name, argArray) {

      var p = this.getPixels();

      // If filter doesn't exist, or no name, stop process.
      //if ( filter[name] === undefined ) throw new Error("filter '" + name +"' does'nt exist as filters method.");
      if (!filter[name]) return;

      // Get image data pixels.
      var i,
          args = [p];
      var pixels;

      // Construct args array.
      for (i = 0; i < argArray.length; i++) {
        args.push(argArray[i]);
      }

      // Apply filter.
      p = filter[name].apply(null, args);

      // Set new image data on canvas.
      this.context.putImageData(p, this.size.x, this.size.y);
    },

    // Create and store one matrix per mode registered, if instance.settings.modes[mode_name] is true.
    buildAllMatrix: function () {
      var m,
          mA = {};
      for (var mode in matrixMethod) {
        if (!this.instance.settings.modes[mode]) continue;
        m = this.creaMatrix();
        this.applyFilter(filters[mode].name, this.instance.settings[filters[mode].param]);
        this[matrixMethod[mode]](m, 1);
        mA[mode] = m;
      }
      return mA;
    },

    // Return active matrix.
    getMatrix: function () {
      return this.matrix[this.instance.mode] || false;
    },

    // Create matrix.
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

    // Set all matrix values to value or 0;
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

    // Construct matrix, according to canvas's image data values.
    // If image data pixel is white, corresponding matrix case is set too value.
    // If image data pixel is black, corresponding matrix case is set to 0.
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

    // Create canvas thumbnails of the picture store on this Matrix.
    renderThumbnails: function (target, filter) {
      var self = this;

      // Create new Matrix for this thumb.
      var m = new Matrix(this.instance, this.picture, { w: this.instance.settings.thumbWidth, h: this.instance.settings.thumbHeight });

      // Apply filter.
      if (filter) {
        m.applyFilter(filters[this.instance.mode].name, this.settings[filters[this.instance.mode].param]);
      }
      // Apply style.
      m.canvas.style.cursor = 'pointer';

      // Apply click event on the thumb's canvas that fire the DiapPart's instance active index to coresponding Matrix.
      m.canvas.onclick = function (matrix) {
        return function (e) {
          self.instance.goTo(matrix);
          self.instance.clearParts();
          self.instance.liberationParts1();
        };
      }(m);

      // Store Matrix's instance of the thumb in an array.
      this.instance.thumbOriginalTab.push(m);

      // Inject thumb's canvas in the DOM.
      fn.append(target, m.canvas);

      return m;
    }
  };

  /****
   * DiapPart constructor.
   * A DiapParet instance must be created and initialized to create slideshow.
   *
   */

  function DiapPart() {
    this.settings = fn.simpleExtend({}, defaults);
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

    // Initialize DiapPart instance.
    init: function (options) {

      // Store settings.
      fn.simpleExtend(this.settings, options);

      // Inject canvas on DOM.
      fn.append(this.settings.targetElement, this.canvas);

      // Apply style to canvas element.
      this.canvas.style.backgroundColor = this.settings.background;

      // Set mass initial coords to canva's center.
      this.centerMass();

      // Create the mass.
      this.champs.push(new Champ(new Vector(this.settings.massX, this.settings.massY), this.settings.mass));

      // Start the loop.
      this.loop();
    },

    // Set options to settings.
    set: function (options) {
      fn.simpleExtend(this.settings, options);
    },

    // Create new slide, according to input value : Image or String.
    createSlide: function (input, customSize) {

      // Create the Matrix instance according to input.
      var m = new Matrix(this, input, customSize);

      // Set active index to 0 if it's null.
      this.activeIndex = this.activeIndex === null ? 0 : this.activeIndex;
      this.matrixTab.push(m);
      return m;
    },

    // Create and return canvas element. If no size specified, take instance's settings size.
    getCanvas: function (size) {
      var canvas = document.createElement('canvas'),
          s = size || {};

      canvas.height = s.h ? s.h : this.settings.height;
      canvas.width = s.w ? s.w : this.settings.width;

      return canvas;
    },

    // Create and return context for canvas.
    getContext2D: function (canvas) {
      return canvas.getContext('2d');
    },

    // Return coords, height and width of the img resized according to size arg, or instance's canvas size. 
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

    // Method to pass as onchange event function in files input.
    load: function (e, thumb) {

      var i,
          files = e.target.files,
          self = this;

      // If no file selected, exit.
      if (!files) return;

      for (i = 0; i < files.length; i++) {

        var file = files[i];

        // If file is not an image, pass to next file.
        if (!file.type.match('image')) continue;

        var reader = new FileReader();

        // When file is loaded.
        reader.onload = function (event) {

          var img = new Image();

          // When image is loaded.
          img.onload = function () {

            // Create slide, with Image input.
            var m = self.createSlide(this);

            if (!thumb) return;

            // Create and store thumb.
            m.renderThumbnails(self.settings.thumdnailsID, false);
          };
          // Load img.
          img.src = event.target.result;
        };
        // Load file.
        reader.readAsDataURL(file);
      }
    },

    // Change instance's mode. Basically, it change methods to test each Particles, and matrix that's tested.
    switchMode: function (mode) {

      // Set mode.
      this.mode = mode;

      // Call callback if exist.
      if (typeof this.settings.switchModeCallback === 'function') {
        this.settings.switchModeCallback.call(this);
      }
    },

    // Create new mass and store on champ array.
    addMass: function (x, y, mass) {
      var m = new Champ(new Vector(x, y), mass);
      this.champs.push(m);
      return m;
    },

    // Set mass coords to canva's centger on instance's settings.
    centerMass: function () {
      this.settings.massX = this.canvas.width / 2;
      this.settings.massY = this.canvas.height / 2;
    },

    // Call particle methods in each loop, according to active mode and corresponding proceed settings.
    partProceed: function (particle) {
      var i,
          l = proceed[this.mode].length;
      for (i = 0; i < l; i++) {
        particle[proceed[this.mode][i]]();
      }
    },

    // Set activeIndex to matrix's thumb index.
    goTo: function (matrix) {
      this.activeIndex = this.thumbOriginalTab.indexOf(matrix);
    },

    // Make particles free for short delay.
    liberationParts1: function (delay) {
      var self = this;
      var d = delay || 500;

      // Particles are free from matrix of type 'value'.
      this.liberation = !this.liberation;

      // Mass strength is inverted.
      this.champs[0].mass = this.settings.antiMass;

      // When delay's over, whe return to normal mass strength and particles behavior.
      setTimeout(function () {
        self.champs[0].mass = self.settings.mass;
        self.liberation = !self.liberation;
      }, d);
    },

    // Create new Particle, with random position and speed.
    creaParts: function () {
      if (this.particles.length < this.settings.density) {
        var i,
            nb = this.settings.density - this.particles.length;
        for (i = 0; i < nb; i++) {
          this.particles.push(new Particle(this, new Vector(Math.random() * this.canvas.width, Math.random() * this.canvas.height), new Vector(realRandom(this.settings.initialVelocity), realRandom(this.settings.initialVelocity)), new Vector(0, 0), 0, false));
        }
      }
    },

    // Proceed all particules.
    upgradeParts: function () {

      var currentParts = [],
          i,
          l = this.particles.length;

      for (i = 0; i < l; i++) {

        var particle = this.particles[i],
            pos = particle.position;

        // If particle out of canvas, forget it.
        if (pos.x >= this.canvas.width || pos.x <= 0 || pos.y >= this.canvas.height || pos.y <= 0) continue;

        // Proceed the particle.
        this.partProceed(particle);

        // Move the particle.
        particle.move();

        // Store the particle.
        currentParts.push(particle);
      }
      this.particles = currentParts;
    },

    // Draw particles in canvas.
    drawParts: function () {
      var i,
          n = this.particles.length;
      for (i = 0; i < n; i++) {
        var pos = this.particles[i].position;
        this.context.fillStyle = this.particles[i].color;
        this.context.fillRect(pos.x, pos.y, this.settings.particleSize, this.settings.particleSize);
      }
    },

    // Make free all particles.
    clearParts: function () {
      var i,
          l = this.particles.length;
      for (i = 0; i < l; i++) {
        this.particles[i].inForm = 0;
      }
    },

    // Clean canvas.
    clear: function () {
      if (!this.settings.draw) {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    },

    // Loop's callback.
    queue: function () {
      var self = this;
      if (!this.settings.stop) {
        this.requestID = window.requestAnimationFrame(self.loop.bind(self));
      } else {
        window.cancelAnimationFrame(self.requestID);
        this.requestID = undefined;
      }
    },

    // Create and proceed new particles if missing.
    update: function () {
      this.creaParts();
      this.upgradeParts();
    },

    // Draw.
    draw: function () {
      this.drawParts();
    },

    // Loop.
    loop: function () {
      this.clear();
      this.update();
      this.draw();
      this.queue();
    },

    // Stop loop.
    stop: function () {
      this.settings.stop = true;
    },

    // Start loop.
    start: function () {
      this.settings.stop = false;
      this.loop();
    }

  };

  // Return random number. 
  function realRandom(max) {
    return Math.cos(Math.random() * Math.PI) * max;
  }

  // Vector elementary class object.
  function Vector(x, y) {
    this.x = x || 0;
    this.y = y || 0;
  }

  // Add vector to an other.
  Vector.prototype.add = function (vector) {
    this.x += vector.x;
    this.y += vector.y;
  };

  // Invert vector's direction.
  Vector.prototype.getInvert = function () {
    this.x = -1 * this.x;
    this.y = -1 * this.y;
  };

  // Get vector's length.
  Vector.prototype.getMagnitude = function () {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  };

  // Get vector's radius.
  Vector.prototype.getAngle = function () {
    return Math.atan2(this.y, this.x);
  };

  // Get new vector according to length and radius.
  Vector.prototype.fromAngle = function (angle, magnitude) {
    return new Vector(magnitude * Math.cos(angle), magnitude * Math.sin(angle));
  };

  // Particle constructor.
  function Particle(instance, position, vitesse, acceleration) {
    this.instance = instance;
    this.position = position || new Vector(0, 0);
    this.vitesse = vitesse || new Vector(0, 0);
    this.acceleration = acceleration || new Vector(0, 0);
    this.color = this.instance.settings.particleColor;
    this.inForm = 0;
  }

  // Set new particle's position according to its acceleration and speed.
  Particle.prototype.move = function () {
    this.vitesse.add(this.acceleration);
    this.position.add(this.vitesse);
  };

  // Proceed particle according to existing mass.
  Particle.prototype.soumisChamp = function () {

    // If no mass strength, return.
    if (!this.instance.champs[0].mass) return;

    // If particle has not flagged 'inForm'.
    if (this.inForm !== 1) {

      var totalAccelerationX = 0;
      var totalAccelerationY = 0;
      var l = this.instance.champs.length;

      // Proceed effect of all mass registered in champs array.
      for (var i = 0; i < l; i++) {
        var distX = this.instance.champs[i].position.x - this.position.x;
        var distY = this.instance.champs[i].position.y - this.position.y;
        var force = this.instance.champs[i].mass / Math.pow(distX * distX + distY * distY, 1.5);
        totalAccelerationX += distX * force;
        totalAccelerationY += distY * force;
      }

      // Set new acceleration vector.
      this.acceleration = new Vector(totalAccelerationX, totalAccelerationY);
    }
  };

  // Proceed particle according to matrix of type 'value'. Called in modeForm.
  Particle.prototype.soumisForm = function () {

    // If liberation flag, make the particle free.
    if (this.instance.liberation) {
      this.inForm = 0;
      return;
    }

    // Get particle position.
    var testX = Math.floor(this.position.x);
    var testY = Math.floor(this.position.y);

    // Check matrix value according to particle's position.
    var value = this.instance.activeIndex !== null ? this.instance.matrixTab[this.instance.activeIndex].getMatrix()[testX][testY] : 0;

    // If particle is inside a 'white zone'.
    if (value !== 0) {

      // If particles just come into the 'white zone'.
      if (this.inForm !== 1) {

        // Up the form flag.
        this.inForm = 1;

        // Slow the particle.
        this.vitesse = new Vector(this.vitesse.x * 0.2, this.vitesse.y * 0.2);

        // Cut the acceleration.
        this.acceleration = new Vector(0, 0);
      }
    }

    // If particle is not inside 'white zone'.
    else {

        // If the particle just get out the zone.
        if (this.inForm === 1) {

          // It's not free : invert speed.
          this.vitesse.getInvert();
        }
      }
  };

  // Mass constructor.
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

  // if (typeof Object.assign != 'function') {
  //   Object.assign = function (target, varArgs) { // .length of function is 2
  //     'use strict';
  //     if (target == null) { // TypeError if undefined or null
  //       throw new TypeError('Cannot convert undefined or null to object');
  //     }

  //     var to = Object(target);

  //     for (var index = 1; index < arguments.length; index++) {
  //       var nextSource = arguments[index];

  //       if (nextSource != null) { // Skip over if undefined or null
  //         for (var nextKey in nextSource) {
  //           // Avoid bugs when hasOwnProperty is shadowed
  //           if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
  //             to[nextKey] = nextSource[nextKey];
  //           }
  //         }
  //       }
  //     }
  //     return to;
  //   };
  // }

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

  /**
   * PUBLIC METHODS.
   * 
   */

  return {

    // Entry point to create new slide instance.
    getInstance: function (options) {
      var i = new DiapPart();
      i.init(options);
      return i;
    },

    // Call it to extend core.
    registerMode: function (name, param) {

      // Check if mode's name is free.
      if (defaults.modes[name]) throw new Error("Name space for '" + name + "' already exist. Choose an other module name.");

      // Register new mode.
      defaults.modes[name] = true;

      // Extend defaults, Particles and Matrix class.
      fn.simpleExtend(defaults, param.options);
      fn.simpleExtend(DiapPart.prototype, param.proto);
      fn.simpleExtend(Particle.prototype, param.proto_particles);
      fn.simpleExtend(Matrix.prototype, param.proto_matrix);

      // Register new mode filters, proceed and matrixMethod.
      filters[name] = param.scenario.filters;
      proceed[name] = param.scenario.proceed;
      matrixMethod[name] = param.scenario.matrixMethod;
    }
  };
}(this, this.document);
slideParticles.registerMode('modeColor', {
  options: {},
  proto: {},
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

      var i,
          j,
          r,
          g,
          b,
          p = this.context.getImageData(0, 0, this.instance.canvas.width, this.instance.canvas.height).data;

      for (i = 0; i < this.canvas.width; i++) {
        for (j = 0; j < this.canvas.height; j++) {
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUuanMiLCJjb2xvci5qcyJdLCJuYW1lcyI6WyJzbGlkZVBhcnRpY2xlcyIsIndpbmRvdyIsImRvY3VtZW50IiwidW5kZWZpbmVkIiwiZm4iLCJmaWx0ZXIiLCJwcm9jZWVkIiwiZmlsdGVycyIsIm1hdHJpeE1ldGhvZCIsIm9vIiwiZ2V0UHJvdG8iLCJPYmplY3QiLCJnZXRQcm90b3R5cGVPZiIsImRlZmF1bHRzIiwiaGVpZ2h0Iiwid2lkdGgiLCJiYWNrZ3JvdW5kIiwidGhyZXNob2xkTkIiLCJ0YXJnZXRFbGVtZW50IiwiaW5wdXRGaWxlSUQiLCJ0aHVtZG5haWxzSUQiLCJwYW5lbElEIiwidGh1bWJXaWR0aCIsInRodW1iSGVpZ2h0IiwidGV4dCIsIm1hc3MiLCJhbnRpTWFzcyIsImRlbnNpdHkiLCJwYXJ0aWNsZVNpemUiLCJwYXJ0aWNsZUNvbG9yIiwidGV4dENvbG9yIiwiZm9udCIsImZvbnRTaXplIiwiaW5pdGlhbFZlbG9jaXR5IiwibWFzc1giLCJtYXNzWSIsImluaXRpYWxNb2RlIiwiZHJhdyIsInN0b3AiLCJzd2l0Y2hNb2RlQ2FsbGJhY2siLCJtb2RlcyIsIm1vZGVGb3JtIiwiYmxhY2tBbmRXaGl0ZSIsInBpeGVscyIsInRocmVzaG9sZCIsImkiLCJyIiwiZyIsImIiLCJ2IiwiZCIsImRhdGEiLCJsZW5ndGgiLCJuYW1lIiwicGFyYW0iLCJnZXRWaWV3cG9ydCIsInciLCJNYXRoIiwibWF4IiwiZG9jdW1lbnRFbGVtZW50IiwiY2xpZW50V2lkdGgiLCJpbm5lcldpZHRoIiwiaCIsImNsaWVudEhlaWdodCIsImlubmVySGVpZ2h0IiwiYXBwZW5kIiwidGFyZ2V0IiwiZWxlbWVudCIsImdldEVsZW1lbnRCeUlkIiwiYXBwZW5kQ2hpbGQiLCJpc1BsYWluT2JqZWN0IiwicHJvdG8iLCJDdG9yIiwidG9TdHJpbmciLCJjYWxsIiwiaGFzT3duUHJvcGVydHkiLCJjb25zdHJ1Y3RvciIsInByb3RvdHlwZSIsInNpbXBsZUV4dGVuZCIsImEiLCJjbG9uZSIsInNyYyIsImNvcHkiLCJpc0FuQXJyYXkiLCJrZXkiLCJBcnJheSIsImlzQXJyYXkiLCJNYXRyaXgiLCJpbnN0YW5jZSIsImlucHV0IiwiY3VzdG9tU2l6ZSIsInR5cGUiLCJwaWN0dXJlIiwiY2FudmFzIiwiZ2V0Q2FudmFzIiwiY29udGV4dCIsImdldENvbnRleHQyRCIsInNpemUiLCJnZXRJbWFnZVNpemUiLCJ4IiwieSIsIm1hdHJpeCIsImJ1aWxkQWxsTWF0cml4IiwiY2xlYXIiLCJjbGVhclJlY3QiLCJnZXRQaXhlbHMiLCJkcmF3SW1hZ2UiLCJzZXRUZXh0IiwiZ2V0SW1hZ2VEYXRhIiwiY2xlYXJlZCIsInRyaW0iLCJjbGVhck1hdHJpeCIsImxpbmVzIiwic3BsaXQiLCJzZXR0aW5ncyIsImZpbGxTdHlsZSIsInRleHRBbGlnbiIsImZpbGxUZXh0IiwiZmxvb3IiLCJtZWFzdXJlVGV4dCIsImFwcGx5RmlsdGVyIiwiYXJnQXJyYXkiLCJwIiwiYXJncyIsInB1c2giLCJhcHBseSIsInB1dEltYWdlRGF0YSIsIm0iLCJtQSIsIm1vZGUiLCJjcmVhTWF0cml4IiwiZ2V0TWF0cml4IiwibWF0IiwiaiIsInZhbHVlIiwibCIsInZhbHVlTWF0cml4IiwibWluIiwiYyIsInBpeCIsInJlbmRlclRodW1ibmFpbHMiLCJzZWxmIiwic3R5bGUiLCJjdXJzb3IiLCJvbmNsaWNrIiwiZSIsImdvVG8iLCJjbGVhclBhcnRzIiwibGliZXJhdGlvblBhcnRzMSIsInRodW1iT3JpZ2luYWxUYWIiLCJEaWFwUGFydCIsIm1hdHJpeFRhYiIsInBhcnRpY2xlcyIsImNoYW1wcyIsImxpYmVyYXRpb24iLCJhY3RpdmVJbmRleCIsImluaXQiLCJvcHRpb25zIiwiYmFja2dyb3VuZENvbG9yIiwiY2VudGVyTWFzcyIsIkNoYW1wIiwiVmVjdG9yIiwibG9vcCIsInNldCIsImNyZWF0ZVNsaWRlIiwiY3JlYXRlRWxlbWVudCIsInMiLCJnZXRDb250ZXh0IiwiaW1nIiwiY3ciLCJjaCIsInJhdGlvIiwicm91bmQiLCJsb2FkIiwidGh1bWIiLCJmaWxlcyIsImZpbGUiLCJtYXRjaCIsInJlYWRlciIsIkZpbGVSZWFkZXIiLCJvbmxvYWQiLCJldmVudCIsIkltYWdlIiwicmVzdWx0IiwicmVhZEFzRGF0YVVSTCIsInN3aXRjaE1vZGUiLCJhZGRNYXNzIiwicGFydFByb2NlZWQiLCJwYXJ0aWNsZSIsImluZGV4T2YiLCJkZWxheSIsInNldFRpbWVvdXQiLCJjcmVhUGFydHMiLCJuYiIsIlBhcnRpY2xlIiwicmFuZG9tIiwicmVhbFJhbmRvbSIsInVwZ3JhZGVQYXJ0cyIsImN1cnJlbnRQYXJ0cyIsInBvcyIsInBvc2l0aW9uIiwibW92ZSIsImRyYXdQYXJ0cyIsIm4iLCJjb2xvciIsImZpbGxSZWN0IiwiaW5Gb3JtIiwicXVldWUiLCJyZXF1ZXN0SUQiLCJyZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJiaW5kIiwiY2FuY2VsQW5pbWF0aW9uRnJhbWUiLCJ1cGRhdGUiLCJzdGFydCIsImNvcyIsIlBJIiwiYWRkIiwidmVjdG9yIiwiZ2V0SW52ZXJ0IiwiZ2V0TWFnbml0dWRlIiwic3FydCIsImdldEFuZ2xlIiwiYXRhbjIiLCJmcm9tQW5nbGUiLCJhbmdsZSIsIm1hZ25pdHVkZSIsInNpbiIsInZpdGVzc2UiLCJhY2NlbGVyYXRpb24iLCJzb3VtaXNDaGFtcCIsInRvdGFsQWNjZWxlcmF0aW9uWCIsInRvdGFsQWNjZWxlcmF0aW9uWSIsImRpc3RYIiwiZGlzdFkiLCJmb3JjZSIsInBvdyIsInNvdW1pc0Zvcm0iLCJ0ZXN0WCIsInRlc3RZIiwicG9pbnQiLCJzZXRNYXNzIiwic2VhcmNoRWxlbWVudCIsImZyb21JbmRleCIsImsiLCJUeXBlRXJyb3IiLCJPIiwibGVuIiwiYWJzIiwiSW5maW5pdHkiLCJsYXN0VGltZSIsInZlbmRvcnMiLCJjYWxsYmFjayIsImN1cnJUaW1lIiwiRGF0ZSIsImdldFRpbWUiLCJ0aW1lVG9DYWxsIiwiaWQiLCJjbGVhclRpbWVvdXQiLCJnZXRJbnN0YW5jZSIsInJlZ2lzdGVyTW9kZSIsIkVycm9yIiwicHJvdG9fcGFydGljbGVzIiwicHJvdG9fbWF0cml4Iiwic2NlbmFyaW8iLCJzb3VtaXNDb2xvciIsImNvbG9yTWF0cml4Il0sIm1hcHBpbmdzIjoiOztBQUVBLElBQUlBLGlCQUFrQixVQUFVQyxNQUFWLEVBQWtCQyxRQUFsQixFQUE0QkMsU0FBNUIsRUFBdUM7O0FBRXpEOztBQUVBLE1BQUlDLEVBQUo7QUFBQSxNQUFRQyxNQUFSO0FBQUEsTUFBZ0JDLE9BQWhCO0FBQUEsTUFBeUJDLE9BQXpCO0FBQUEsTUFBa0NDLFlBQWxDO0FBQUEsTUFBZ0RDLEtBQUssRUFBckQ7QUFBQSxNQUF5REMsV0FBV0MsT0FBT0MsY0FBM0U7OztBQUVBO0FBQ0FDLGFBQVc7QUFDVEMsWUFBUSxHQURDO0FBRVRDLFdBQU8sR0FGRTtBQUdUQyxnQkFBWSxNQUhIO0FBSVRDLGlCQUFhLENBQUMsR0FBRCxDQUpKO0FBS1RDLG1CQUFlLFdBTE47QUFNVEMsaUJBQWEsY0FOSjtBQU9UQyxrQkFBYyxVQVBMO0FBUVRDLGFBQVMsbUJBUkE7QUFTVEMsZ0JBQVksR0FUSDtBQVVUQyxpQkFBYSxHQVZKO0FBV1RDLFVBQUssU0FYSTtBQVlUQyxVQUFNLEdBWkc7QUFhVEMsY0FBVSxDQUFDLEdBYkY7QUFjVEMsYUFBUyxJQWRBO0FBZVRDLGtCQUFjLENBZkw7QUFnQlRDLG1CQUFlLE1BaEJOO0FBaUJUQyxlQUFXLE1BakJGO0FBa0JUQyxVQUFNLE9BbEJHO0FBbUJUQyxjQUFVLEVBbkJEO0FBb0JUQyxxQkFBaUIsQ0FwQlI7QUFxQlRDLFdBQU8sR0FyQkU7QUFzQlRDLFdBQU8sR0F0QkU7QUF1QlRDLGlCQUFhLFVBdkJKO0FBd0JUQyxVQUFNLEtBeEJHO0FBeUJUQyxVQUFNLEtBekJHO0FBMEJUQyx3QkFBb0IsSUExQlg7QUEyQlRDLFdBQU87QUFDTEMsZ0JBQVU7QUFETDtBQTNCRSxHQUhYOztBQW9DQTs7OztBQUlBcEMsV0FBUztBQUNQO0FBQ0FxQyxtQkFBZSxVQUFXQyxNQUFYLEVBQW1CQyxTQUFuQixFQUErQjtB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QSxJQUFJLEtBQUtnRCxNQUFMLENBQVk5RSxLQUE1QixFQUFtQzhCLEdBQW5DLEVBQXdDO0FBQ3RDLGFBQUt3RixJQUFJLENBQVQsRUFBWUEsSUFBSSxLQUFLeEMsTUFBTCxDQUFZL0UsTUFBNUIsRUFBb0N1SCxHQUFwQyxFQUF5QztBQUN2Q3ZGLGNBQUk0RSxFQUFFLENBQUUsS0FBS2xDLFFBQUwsQ0FBY0ssTUFBZCxDQUFxQjlFLEtBQXJCLEdBQTZCc0gsQ0FBOUIsR0FBbUN4RixDQUFwQyxJQUF5QyxDQUEzQyxDQUFKO0FBQ0FFLGNBQUkyRSxFQUFFLENBQUUsS0FBS2xDLFFBQUwsQ0FBY0ssTUFBZCxDQUFxQjlFLEtBQXJCLEdBQTZCc0gsQ0FBOUIsR0FBbUN4RixDQUFwQyxJQUF5QyxDQUF6QyxHQUE2QyxDQUEvQyxDQUFKO0FBQ0FHLGNBQUkwRSxFQUFFLENBQUUsS0FBS2xDLFFBQUwsQ0FBY0ssTUFBZCxDQUFxQjlFLEtBQXJCLEdBQTZCc0gsQ0FBOUIsR0FBbUN4RixDQUFwQyxJQUF5QyxDQUF6QyxHQUE2QyxDQUEvQyxDQUFKO0FBQ0F3RCxpQkFBT3hELENBQVAsRUFBVXdGLENBQVYsSUFBZSxVQUFVdkYsQ0FBVixHQUFjLElBQWQsR0FBcUJDLENBQXJCLEdBQXlCLElBQXpCLEdBQWdDQyxDQUFoQyxHQUFvQyxNQUFuRDtBQUNEO0FBQ0Y7QUFDRjtBQWJXLEdBWDBCO0FBMEJ4QzNDLFVBQVEsRUExQmdDO0FBMkJ4Q2tRLFlBQVU7QUFDUmhRLGFBQVM7QUFDUDhDLFlBQU0sSUFEQztBQUVQQyxhQUFPO0FBRkEsS0FERDtBQUtSaEQsYUFBUyxDQUFDLGFBQUQsRUFBZ0IsYUFBaEIsQ0FMRDtBQU1SRSxrQkFBYztBQU5OO0FBM0I4QixDQUExQyIsImZpbGUiOiJzbGlkZS1wYXJ0aWNsZXMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJcclxuXHJcbnZhciBzbGlkZVBhcnRpY2xlcyA9IChmdW5jdGlvbiAod2luZG93LCBkb2N1bWVudCwgdW5kZWZpbmVkKSB7XHJcblxyXG4gICAgXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG4gICAgdmFyIGZuLCBmaWx0ZXIsIHByb2NlZWQsIGZpbHRlcnMsIG1hdHJpeE1ldGhvZCwgb28gPSB7fSwgZ2V0UHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YsXHJcbiAgICBcclxuICAgIC8vIERlZmF1bHRzIHNldHRpbmdzLlxyXG4gICAgZGVmYXVsdHMgPSB7XHJcbiAgICAgIGhlaWdodDogNTAwLFxyXG4gICAgICB3aWR0aDogNTAwLFxyXG4gICAgICBiYWNrZ3JvdW5kOiAnI2ZmZicsXHJcbiAgICAgIHRocmVzaG9sZE5COiBbMTI4XSxcclxuICAgICAgdGFyZ2V0RWxlbWVudDogJ2RwLWNhbnZhcycsXHJcbiAgICAgIGlucHV0RmlsZUlEOiAnZHAtZmlsZWlucHV0JyxcclxuICAgICAgdGh1bWRuYWlsc0lEOiAnZHAtdGh1bWInLFxyXG4gICAgICBwYW5lbElEOiAnZHAtcGFuZWwtc2V0dGluZ3MnLFxyXG4gICAgICB0aHVtYldpZHRoOiAxMDAsXHJcbiAgICAgIHRodW1iSGVpZ2h0OiAxMDAsXHJcbiAgICAgIHRleHQ6J1NhbHV0ICEnLFxyXG4gICAgICBtYXNzOiAxMDAsXHJcbiAgICAgIGFudGlNYXNzOiAtNTAwLFxyXG4gICAgICBkZW5zaXR5OiAxNTAwLFxyXG4gICAgICBwYXJ0aWNsZVNpemU6IDEsXHJcbiAgICAgIHBhcnRpY2xlQ29sb3I6ICcjMDAwJyxcclxuICAgICAgdGV4dENvbG9yOiAnI2ZmZicsXHJcbiAgICAgIGZvbnQ6ICdBcmlhbCcsXHJcbiAgICAgIGZvbnRTaXplOiA0MCxcclxuICAgICAgaW5pdGlhbFZlbG9jaXR5OiAzLFxyXG4gICAgICBtYXNzWDogODgwLFxyXG4gICAgICBtYXNzWTogMzcwLFxyXG4gICAgICBpbml0aWFsTW9kZTogJ21vZGVGb3JtJyxcclxuICAgICAgZHJhdzogZmFsc2UsXHJcbiAgICAgIHN0b3A6IGZhbHNlLFxyXG4gICAgICBzd2l0Y2hNb2RlQ2FsbGJhY2s6IG51bGwsXHJcbiAgICAgIG1vZGVzOiB7XHJcbiAgICAgICAgbW9kZUZvcm06IHRydWUsXHJcbiAgICAgIH0gXHJcbiAgICB9O1xyXG5cclxuXHJcbiAgICAvKipcclxuICAgICAqIEFsbCBpbWFnZSBmaWx0ZXJzIGZ1bmN0aW9uLlxyXG4gICAgICogXHJcbiAgICAgKi9cclxuICAgIGZpbHRlciA9IHtcclxuICAgICAgLy8gVHVybiBjb2xvcmVkIHBpY3R1cmUgb24gYmxhY2sgYW5kIHdoaXRlLiBVc2VkIGZvciBtb2RlRm9ybS5cclxuICAgICAgYmxhY2tBbmRXaGl0ZTogZnVuY3Rpb24gKCBwaXhlbHMsIHRocmVzaG9sZCApIHtcclxuICAgICAgICBpZiAoICFwaXhlbHMgKSByZXR1cm4gcGl4ZWxzO1xyXG4gICAgICAgIHZhciBpLCByLCBnLCBiLCB2LCBkID0gcGl4ZWxzLmRhdGE7XHJcbiAgICAgICAgZm9yICggaSA9IDA7IGkgPCBkLmxlbmd0aDsgaSs9NCApIHtcclxuICAgICAgICAgIHIgPSBkW2ldO1xyXG4gICAgICAgICAgZyA9IGRbaSsxXTtcclxuICAgICAgICAgIGIgPSBkW2krMl07XHJcbiAgICAgICAgICB2ID0gKDAuMjEyNipyICsgMC43MTUyKmcgKyAwLjA3MjIqYiA+PSB0aHJlc2hvbGQpID8gMjU1IDogMDtcclxuICAgICAgICAgIGRbaV0gPSBkW2krMV0gPSBkW2krMl0gPSB2XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBwaXhlbHM7XHJcbiAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBFYWNoIG1vZGVzIHJlZ2lzdGVyZWQgbmVlZCBhbiBlbnRyeSBvbiBmaWx0ZXJzIG9iamVjdC5cclxuICAgICAqIEl0IHBlcm1pdCB0byBjYWxsIGNvcnJlc3BvbmRpbmcgZmlsdGVyIGZ1bmN0aW9uIGZvciBlYWNoIG1vZGUgcmVnaXN0ZXJlZC5cclxuICAgICAqIFRoZSBjb3JyZXNwb25kaW5nIGZpbHRlciBmb25jdGlvbiBpcyBjYWxsZWQgd2hlbiBtYXRyaXggYXJlIGJ1aWx0LlxyXG4gICAgICogXHJcbiAgICAgKiBCeSBkZWZhdWx0LCB0aGVyZSBpcyBvbmx5IG9uZSBtb2RlIDogbW9kZUZvcm0uXHJcbiAgICAgKiBJZiBhIG1vZGUgZG9uJ3QgbmVlZCBmaWx0ZXIsIHNldCB7fSB0byB0aGUgbW9kZSBuYW1lIGVudHJ5LlxyXG4gICAgICogXHJcbiAgICAgKiBuYW1lIDogbmFtZSBvZiB0aGUgZmlsdGVyIGZ1bmN0aW9uIGF0dGFjaCB0byBmaWx0ZXIgb2JqZWN0LlxyXG4gICAgICogcGFyYW0gOiBrZXkgdGFyZ2V0dGluZyB0aGUgc2V0dGluZ3MgcGFyYW1ldGVyLCBwYXNzaW5nIGFzIGFyZ3VtZW50IHdoZW4gZmlsdGVyIGZ1bmN0aW9uIGlzIGNhbGxlZC4gTXVzdCBiZSBhbiBBcnJheSBpbiBzZXR0aW5ncy5cclxuICAgICAqIFxyXG4gICAgKi8gXHJcbiAgICBmaWx0ZXJzID0ge1xyXG4gICAgICBtb2RlRm9ybToge1xyXG4gICAgICAgIG5hbWU6ICdibGFja0FuZFdoaXRlJyxcclxuICAgICAgICBwYXJhbTogJ3RocmVzaG9sZE5CJ1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAvKipcclxuICAgKiBGb3IgZWFjaCBtb2RlLCByZWdpc3RlciBhbGwgbWV0aG9kcyB0byBhcHBseSBmb3IgZWFjaGUgUGFydGljbGVzIGluc3RhbmNlIGluIHRoZSBsb29wLlxyXG4gICAqIE11c3QgYmUgYSBQYXJ0aWNsZXMgbWV0aG9kLlxyXG4gICAqIC0tLS0tPiBzZWUgRGlhcFBhcnQucHJvdG90eXBlLnBhcnRQcm9jZWVkXHJcbiAgICogXHJcbiAgICovXHJcbiAgICBwcm9jZWVkID0ge1xyXG4gICAgICBtb2RlRm9ybTogWydzb3VtaXNDaGFtcCcsICdzb3VtaXNGb3JtJ11cclxuICAgIH07XHJcblxyXG4gICAgLy8gRm9yIGVhY2ggbW9kZSwgcmVnaXN0ZXIgdGhlIE1hdHJpeCBtZXRob2QgY2FsbGVkIHRvIGNyZWF0ZSB0aGUgbWF0cml4ICgyIGRpbWVudGlvbmFsIGFycmF5KS5cclxuICAgIG1hdHJpeE1ldGhvZCA9IHtcclxuICAgICAgbW9kZUZvcm06ICd2YWx1ZU1hdHJpeCdcclxuICAgIH07XHJcblxyXG5cclxuICAgIC8vIFV0aWxpdHkgZnVuY3Rpb25zLlxyXG4gICAgZm4gPSB7XHJcbiAgICAgIC8vIFJldHVybiB2aWV3cG9ydCBzaXplLlxyXG4gICAgICBnZXRWaWV3cG9ydDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHc6IE1hdGgubWF4KGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRXaWR0aCwgd2luZG93LmlubmVyV2lkdGggfHwgMCksXHJcbiAgICAgICAgICBoOiBNYXRoLm1heChkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0LCB3aW5kb3cuaW5uZXJIZWlnaHQgfHwgMClcclxuICAgICAgICB9O1xyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gQXBwZW5kIGVsZW1lbnQgaW4gdGFyZ2V0LlxyXG4gICAgICBhcHBlbmQ6IGZ1bmN0aW9uICggdGFyZ2V0LCBlbGVtZW50ICkge1xyXG4gICAgICAgIGlmICggdHlwZW9mIHRhcmdldCA9PT0gJ3N0cmluZycgKSB7XHJcbiAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCggdGFyZ2V0ICkuYXBwZW5kQ2hpbGQoIGVsZW1lbnQgKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICB0YXJnZXQuYXBwZW5kQ2hpbGQoIGVsZW1lbnQgKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBUZXN0IGlmIHRhcmdldCBpcyBwbGFpbiBvYmplY3QuIFRoYW5rIHlvdSBqUXVlcnkgMysgIVxyXG4gICAgICBpc1BsYWluT2JqZWN0OiBmdW5jdGlvbiAoIHRhcmdldCApIHtcclxuICAgICAgICB2YXIgcHJvdG8sIEN0b3I7XHJcbiAgICAgICAgLy8gRGV0ZWN0IG9idmlvdXMgbmVnYXRpdmVzXHJcbiAgICAgICAgLy8gVXNlIHRvU3RyaW5nIGluc3RlYWQgb2YgalF1ZXJ5LnR5cGUgdG8gY2F0Y2ggaG9zdCBvYmplY3RzXHJcbiAgICAgICAgaWYgKCAhdGFyZ2V0IHx8IG9vLnRvU3RyaW5nLmNhbGwoIHRhcmdldCApICE9PSBcIltvYmplY3QgT2JqZWN0XVwiICkge1xyXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwcm90byA9IGdldFByb3RvKCB0YXJnZXQgKTtcclxuICAgICAgICAvLyBPYmplY3RzIHdpdGggbm8gcHJvdG90eXBlIChlLmcuLCBgT2JqZWN0LmNyZWF0ZSggbnVsbCApYCkgYXJlIHBsYWluXHJcbiAgICAgICAgaWYgKCAhcHJvdG8gKSB7XHJcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gT2JqZWN0cyB3aXRoIHByb3RvdHlwZSBhcmUgcGxhaW4gaWZmIHRoZXkgd2VyZSBjb25zdHJ1Y3RlZCBieSBhIGdsb2JhbCBPYmplY3QgZnVuY3Rpb25cclxuICAgICAgICBDdG9yID0gb28uaGFzT3duUHJvcGVydHkuY2FsbCggcHJvdG8sIFwiY29uc3RydWN0b3JcIiApICYmIHByb3RvLmNvbnN0cnVjdG9yO1xyXG4gICAgICAgIHJldHVybiB0eXBlb2YgQ3RvciA9PT0gXCJmdW5jdGlvblwiICYmIG9vLmhhc093blByb3BlcnR5LmNhbGwoIEN0b3IucHJvdG90eXBlLCBcImlzUHJvdG90eXBlT2ZcIik7XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBEZWVwbHkgZXh0ZW5kIGEgb2JqZWN0IHdpdGggYiBvYmplY3QgcHJvcGVydGllcy5cclxuICAgICAgc2ltcGxlRXh0ZW5kOiBmdW5jdGlvbiAoIGEsIGIgKSB7XHJcbiAgICAgICAgdmFyIGNsb25lLCBzcmMsIGNvcHksIGlzQW5BcnJheSA9IGZhbHNlOyBcclxuICAgICAgICBmb3IoIHZhciBrZXkgaW4gYiApIHtcclxuXHJcbiAgICAgICAgICBzcmMgPSBhWyBrZXkgXTtcclxuXHRcdFx0XHQgIGNvcHkgPSBiWyBrZXkgXTtcclxuXHJcbiAgICAgICAgICAvL0F2b2lkIGluZmluaXRlIGxvb3AuXHJcbiAgICAgICAgICBpZiAoIGEgPT09IGNvcHkgKSB7XHJcblx0XHRcdFx0XHQgIGNvbnRpbnVlO1xyXG5cdFx0XHRcdCAgfVxyXG5cclxuICAgICAgICAgIGlmKCBiLmhhc093blByb3BlcnR5KCBrZXkgKSApIHtcclxuICAgICAgICAgICAgLy8gSWYgcHJvcGVydGllIGlzIEFycmF5IG9yIE9iamVjdC5cclxuICAgICAgICAgICAgaWYoIGNvcHkgJiYgKCBmbi5pc1BsYWluT2JqZWN0KCBjb3B5ICkgfHwgKGlzQW5BcnJheSA9IEFycmF5LmlzQXJyYXkuY2FsbCggY29weSApKSkpIHtcclxuICAgICAgICAgICAgICBpZiAoIGlzQW5BcnJheSApIHtcclxuICAgICAgICAgICAgICAgIGlzQW5BcnJheSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgY2xvbmUgPSAoIHNyYyAmJiBzcmMuaXNBcnJheSApID8gc3JjIDogW107XHJcbiAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNsb25lID0gKCBzcmMgJiYgZm4uaXNQbGFpbk9iamVjdCggc3JjICkgKSA/IHNyYyA6IHt9O1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAvLyBDcmVhdGUgbmV3IEFycmF5IG9yIE9iamVjdCwgbmV2ZXIgcmVmZXJlbmNlIGl0LlxyXG4gICAgICAgICAgICAgIGFbIGtleSBdID0gZm4uc2ltcGxlRXh0ZW5kKCBjbG9uZSwgY29weSApO1xyXG5cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGFbIGtleSBdID0gY29weTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gYTtcclxuICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgLy8gTWF0cml4IGNsYXNzIG9iamVjdC5cclxuICBmdW5jdGlvbiBNYXRyaXggKCBpbnN0YW5jZSwgaW5wdXQsIGN1c3RvbVNpemUgKSB7XHJcbiAgICB0aGlzLmluc3RhbmNlID0gaW5zdGFuY2U7XHJcbiAgICB0aGlzLnR5cGUgPSAoIHR5cGVvZiBpbnB1dCAhPT0gJ3N0cmluZycgKSA/ICdwaWN0dXJlJyA6ICd0ZXh0JztcclxuICAgIHRoaXMucGljdHVyZSA9IGlucHV0O1xyXG4gICAgdGhpcy5jYW52YXMgPSB0aGlzLmluc3RhbmNlLmdldENhbnZhcyggY3VzdG9tU2l6ZSApO1xyXG4gICAgdGhpcy5jb250ZXh0ID0gdGhpcy5pbnN0YW5jZS5nZXRDb250ZXh0MkQoIHRoaXMuY2FudmFzICk7XHJcbiAgICB0aGlzLnNpemUgPSAoIHR5cGVvZiBpbnB1dCAhPT0gJ3N0cmluZycgKSA/IHRoaXMuaW5zdGFuY2UuZ2V0SW1hZ2VTaXplKCBpbnB1dCwgY3VzdG9tU2l6ZSApIDoge3g6MCwgeTowLCB3OjAsIGg6MH07XHJcbiAgICB0aGlzLm1hdHJpeCA9IHRoaXMuYnVpbGRBbGxNYXRyaXgoKTtcclxuICB9XHJcblxyXG4gIE1hdHJpeC5wcm90b3R5cGUgPSB7XHJcblxyXG4gICAgLy8gQ2xlYXIgbWF0cml4J3MgY2FudmFzLlxyXG4gICAgY2xlYXI6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgdGhpcy5jb250ZXh0LmNsZWFyUmVjdCgwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KTtcclxuICAgIH0sXHJcblxyXG4gICAgLy8gUmV0dXJuIG1hdHJpeCdzIGNhbnZhJ3MgaW1hZ2UgZGF0YS5cclxuICAgIGdldFBpeGVsczogZnVuY3Rpb24gKCkge1xyXG5cclxuICAgICAgdGhpcy5jbGVhcigpO1xyXG5cclxuICAgICAgc3dpdGNoICggdGhpcy50eXBlICkge1xyXG5cclxuICAgICAgICBjYXNlICdwaWN0dXJlJzpcclxuICAgICAgICAgIHRoaXMuY29udGV4dC5kcmF3SW1hZ2UoIHRoaXMucGljdHVyZSwgdGhpcy5zaXplLngsIHRoaXMuc2l6ZS55LCB0aGlzLnNpemUudywgdGhpcy5zaXplLmggKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICBjYXNlICd0ZXh0JzpcclxuICAgICAgICAgIHRoaXMuc2V0VGV4dCgpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmKCAhdGhpcy5zaXplLncgJiYgIXRoaXMuc2l6ZS5oICkgcmV0dXJuIGZhbHNlO1xyXG5cclxuICAgICAgcmV0dXJuIHRoaXMuY29udGV4dC5nZXRJbWFnZURhdGEoIHRoaXMuc2l6ZS54LCB0aGlzLnNpemUueSwgdGhpcy5zaXplLncsIHRoaXMuc2l6ZS5oICk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIERyYXcgdGV4dCBpbiBjYW52YXMuXHJcbiAgICBzZXRUZXh0OiBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgICAvLyBDbGVhciB1c2VsZXNzIHNwYWNlcyBpbiBzdHJpbmcgdG8gZHJhdy5cclxuICAgICAgdmFyIGNsZWFyZWQgPSB0aGlzLnBpY3R1cmUudHJpbSgpO1xyXG5cclxuICAgICAgLy8gSWYgc3RyaW5nIGVtcHR5LCBzZXQgc2l6ZSB0byAwIHRvIGF2b2lkIG1hdHJpeCBjYWxjdWxhdGlvbiwgYW5kIGNsZWFyIG1hdHJpeC5cclxuICAgICAgaWYgKGNsZWFyZWQgPT09IFwiXCIpIHtcclxuICAgICAgICB0aGlzLnNpemUueCA9IDA7XHJcbiAgICAgICAgdGhpcy5zaXplLnkgPSAwO1xyXG4gICAgICAgIHRoaXMuc2l6ZS53ID0gMDtcclxuICAgICAgICB0aGlzLnNpemUuaCA9IDA7XHJcbiAgICAgICAgdGhpcy5jbGVhck1hdHJpeCgpO1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdmFyIGksIHcgPSAwLCB4ID0gMjAsIHkgPSA4MCxcclxuICAgICAgICBsaW5lcyA9IHRoaXMucGljdHVyZS5zcGxpdChcIlxcblwiKSwgLy8gU3BsaXQgdGV4dCBpbiBhcnJheSBmb3IgZWFjaCBlbmQgb2YgbGluZS5cclxuICAgICAgICBmb250U2l6ZSA9IHRoaXMuaW5zdGFuY2Uuc2V0dGluZ3MuZm9udFNpemU7XHJcblxyXG4gICAgICB0aGlzLmNvbnRleHQuZm9udCA9IGZvbnRTaXplICsgXCJweCBcIiArIHRoaXMuaW5zdGFuY2Uuc2V0dGluZ3MuZm9udDtcclxuICAgICAgdGhpcy5jb250ZXh0LmZpbGxTdHlsZSA9IHRoaXMuaW5zdGFuY2Uuc2V0dGluZ3MudGV4dENvbG9yO1xyXG4gICAgICB0aGlzLmNvbnRleHQudGV4dEFsaWduID0gXCJsZWZ0XCI7XHJcblxyXG4gICAgICAvLyBEcmF3IGxpbmUgYnkgbGluZS5cclxuICAgICAgZm9yIChpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdGhpcy5jb250ZXh0LmZpbGxUZXh0KCBsaW5lc1tpXSwgeCwgeSArIGkqZm9udFNpemUgKTtcclxuICAgICAgICB3ID0gTWF0aC5tYXgoIHcsIE1hdGguZmxvb3IodGhpcy5jb250ZXh0Lm1lYXN1cmVUZXh0KCBsaW5lc1tpXSApLndpZHRoKSApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBTZXQgc2l6ZSBvYmplY3QsIHRvIGNhbGN1bGF0ZSB0YXJnZXRlZCB6b25lIG9uIHRoZSBtYXRyaXguXHJcbiAgICAgIHRoaXMuc2l6ZS54ID0gTWF0aC5tYXgoIHgsICB0aGlzLnNpemUueCApO1xyXG4gICAgICB0aGlzLnNpemUueSA9IE1hdGgubWF4KCAoeSAtIGZvbnRTaXplKSwgdGhpcy5zaXplLnkgKTtcclxuICAgICAgdGhpcy5zaXplLncgPSBNYXRoLm1heCggKHcgKyBmb250U2l6ZSksIHRoaXMuc2l6ZS53ICk7XHJcbiAgICAgIHRoaXMuc2l6ZS5oID0gTWF0aC5tYXgoIChmb250U2l6ZSAqIGkgKyBmb250U2l6ZSksIHRoaXMuc2l6ZS5oICk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIEFwcGx5IGZpbHRlcidzIG5hbWUgd2l0aCBhcmdBcnJheS5cclxuICAgIGFwcGx5RmlsdGVyOiBmdW5jdGlvbiAoIG5hbWUsIGFyZ0FycmF5ICkge1xyXG5cclxuICAgICAgdmFyIHAgPSB0aGlzLmdldFBpeGVscygpO1xyXG5cclxuICAgICAgLy8gSWYgZmlsdGVyIGRvZXNuJ3QgZXhpc3QsIG9yIG5vIG5hbWUsIHN0b3AgcHJvY2Vzcy5cclxuICAgICAgLy9pZiAoIGZpbHRlcltuYW1lXSA9PT0gdW5kZWZpbmVkICkgdGhyb3cgbmV3IEVycm9yKFwiZmlsdGVyICdcIiArIG5hbWUgK1wiJyBkb2VzJ250IGV4aXN0IGFzIGZpbHRlcnMgbWV0aG9kLlwiKTtcclxuICAgICAgaWYgKCAhZmlsdGVyW25hbWVdICkgcmV0dXJuO1xyXG5cclxuICAgICAgLy8gR2V0IGltYWdlIGRhdGEgcGl4ZWxzLlxyXG4gICAgICB2YXIgaSwgYXJncyA9IFsgcCBdO1xyXG4gICAgICB2YXIgcGl4ZWxzO1xyXG5cclxuICAgICAgLy8gQ29uc3RydWN0IGFyZ3MgYXJyYXkuXHJcbiAgICAgIGZvciAoIGkgPSAwOyBpIDwgYXJnQXJyYXkubGVuZ3RoOyBpKysgKSB7XHJcbiAgICAgICAgYXJncy5wdXNoKCBhcmdBcnJheVtpXSApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBBcHBseSBmaWx0ZXIuXHJcbiAgICAgIHAgPSBmaWx0ZXJbbmFtZV0uYXBwbHkoIG51bGwsIGFyZ3MgKTtcclxuXHJcbiAgICAgIC8vIFNldCBuZXcgaW1hZ2UgZGF0YSBvbiBjYW52YXMuXHJcbiAgICAgIHRoaXMuY29udGV4dC5wdXRJbWFnZURhdGEoIHAsIHRoaXMuc2l6ZS54LCB0aGlzLnNpemUueSApO1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBDcmVhdGUgYW5kIHN0b3JlIG9uZSBtYXRyaXggcGVyIG1vZGUgcmVnaXN0ZXJlZCwgaWYgaW5zdGFuY2Uuc2V0dGluZ3MubW9kZXNbbW9kZV9uYW1lXSBpcyB0cnVlLlxyXG4gICAgYnVpbGRBbGxNYXRyaXg6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgdmFyIG0sIG1BID0ge307XHJcbiAgICAgIGZvciAoIHZhciBtb2RlIGluIG1hdHJpeE1ldGhvZCApIHtcclxuICAgICAgICBpZiAoICF0aGlzLmluc3RhbmNlLnNldHRpbmdzLm1vZGVzW21vZGVdICkgY29udGludWU7XHJcbiAgICAgICAgbSA9IHRoaXMuY3JlYU1hdHJpeCgpO1xyXG4gICAgICAgIHRoaXMuYXBwbHlGaWx0ZXIoIGZpbHRlcnNbbW9kZV0ubmFtZSwgdGhpcy5pbnN0YW5jZS5zZXR0aW5nc1tmaWx0ZXJzW21vZGVdLnBhcmFtXSApO1xyXG4gICAgICAgIHRoaXNbbWF0cml4TWV0aG9kW21vZGVdXShtLCAxKTtcclxuICAgICAgICBtQVttb2RlXSA9IG07XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIG1BO1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBSZXR1cm4gYWN0aXZlIG1hdHJpeC5cclxuICAgIGdldE1hdHJpeDogZnVuY3Rpb24oKXtcclxuICAgICAgcmV0dXJuIHRoaXMubWF0cml4W3RoaXMuaW5zdGFuY2UubW9kZV0gfHwgZmFsc2U7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIENyZWF0ZSBtYXRyaXguXHJcbiAgICBjcmVhTWF0cml4OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHZhciBhID0gdGhpcy5pbnN0YW5jZS5zZXR0aW5ncy53aWR0aCxcclxuICAgICAgICBiID0gdGhpcy5pbnN0YW5jZS5zZXR0aW5ncy5oZWlnaHQsXHJcbiAgICAgICAgbWF0ID0gbmV3IEFycmF5KCBhICksIGksIGo7XHJcbiAgICAgIGZvciggaSA9IDA7IGkgPCBhOyBpKysgKSB7XHJcbiAgICAgICAgbWF0W2ldID0gbmV3IEFycmF5KCBiICk7XHJcbiAgICAgICAgZm9yKCBqID0gMDsgaiA8IGI7IGorKyApe1xyXG4gICAgICAgICAgbWF0W2ldW2pdID0gMDtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIG1hdDtcclxuICAgIH0sXHJcblxyXG4gICAgLy8gU2V0IGFsbCBtYXRyaXggdmFsdWVzIHRvIHZhbHVlIG9yIDA7XHJcbiAgICBjbGVhck1hdHJpeDogZnVuY3Rpb24oIHZhbHVlICl7XHJcbiAgICAgIHZhciBpLCBqLCBsLCBtLCB2LFxyXG4gICAgICAgIG1hdHJpeCA9IHRoaXMuZ2V0TWF0cml4KCk7XHJcbiAgICAgIHYgPSB2YWx1ZSB8fCAwO1xyXG4gICAgICBsID0gbWF0cml4Lmxlbmd0aDtcclxuICAgICAgbSA9IG1hdHJpeFswXS5sZW5ndGg7XHJcbiAgICAgIGZvciggaSA9IDA7IGkgPCBsOyBpKysgKXtcclxuICAgICAgICBmb3IoIGogPSAwOyBqIDwgbTsgaisrICl7XHJcbiAgICAgICAgICBtYXRyaXhbaV1bal0gPSB2O1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICAvLyBDb25zdHJ1Y3QgbWF0cml4LCBhY2NvcmRpbmcgdG8gY2FudmFzJ3MgaW1hZ2UgZGF0YSB2YWx1ZXMuXHJcbiAgICAvLyBJZiBpbWFnZSBkYXRhIHBpeGVsIGlzIHdoaXRlLCBjb3JyZXNwb25kaW5nIG1hdHJpeCBjYXNlIGlzIHNldCB0b28gdmFsdWUuXHJcbiAgICAvLyBJZiBpbWFnZSBkYXRhIHBpeGVsIGlzIGJsYWNrLCBjb3JyZXNwb25kaW5nIG1hdHJpeCBjYXNlIGlzIHNldCB0byAwLlxyXG4gICAgdmFsdWVNYXRyaXg6IGZ1bmN0aW9uICggbWF0cml4LCB2YWx1ZSApIHtcclxuICAgICAgdmFyIGEgPSB0aGlzLnNpemUueCxcclxuICAgICAgICBiID0gTWF0aC5taW4oIE1hdGguZmxvb3IoYSArIHRoaXMuc2l6ZS53KSwgbWF0cml4Lmxlbmd0aCApLFxyXG4gICAgICAgIGMgPSB0aGlzLnNpemUueSxcclxuICAgICAgICBkID0gTWF0aC5taW4oIE1hdGguZmxvb3IoYyArIHRoaXMuc2l6ZS5oKSwgbWF0cml4WzBdLmxlbmd0aCApO1xyXG4gICAgICBpZiggbWF0cml4Lmxlbmd0aCA8IGEgfHwgbWF0cml4WzBdLmxlbmd0aCA8IGQgKSByZXR1cm47XHJcblxyXG4gICAgICB2YXIgaSwgaiwgcCA9IHRoaXMuY29udGV4dC5nZXRJbWFnZURhdGEoMCwgMCwgdGhpcy5pbnN0YW5jZS5jYW52YXMud2lkdGgsIHRoaXMuaW5zdGFuY2UuY2FudmFzLmhlaWdodCkuZGF0YTtcclxuXHJcbiAgICAgIGZvciggaSA9IGE7IGkgPCBiOyBpKysgKXtcclxuICAgICAgICBmb3IoIGogPSBjOyBqIDwgZDsgaisrICl7XHJcbiAgICAgICAgICB2YXIgcGl4ID0gcFsoKHRoaXMuaW5zdGFuY2UuY2FudmFzLndpZHRoICogaikgKyBpKSAqIDRdO1xyXG4gICAgICAgICAgbWF0cml4W2ldW2pdID0gKCBwaXggPT09IDI1NSApID8gdmFsdWUgOiAwO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICAvLyBDcmVhdGUgY2FudmFzIHRodW1ibmFpbHMgb2YgdGhlIHBpY3R1cmUgc3RvcmUgb24gdGhpcyBNYXRyaXguXHJcbiAgICByZW5kZXJUaHVtYm5haWxzOiBmdW5jdGlvbiAoIHRhcmdldCwgZmlsdGVyICkge1xyXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG4gICAgICAvLyBDcmVhdGUgbmV3IE1hdHJpeCBmb3IgdGhpcyB0aHVtYi5cclxuICAgICAgdmFyIG0gPSBuZXcgTWF0cml4ICggdGhpcy5pbnN0YW5jZSwgdGhpcy5waWN0dXJlLCB7IHc6dGhpcy5pbnN0YW5jZS5zZXR0aW5ncy50aHVtYldpZHRoLCBoOnRoaXMuaW5zdGFuY2Uuc2V0dGluZ3MudGh1bWJIZWlnaHQgfSApO1xyXG5cclxuICAgICAgLy8gQXBwbHkgZmlsdGVyLlxyXG4gICAgICBpZiAoIGZpbHRlciApIHtcclxuICAgICAgICBtLmFwcGx5RmlsdGVyKCBmaWx0ZXJzW3RoaXMuaW5zdGFuY2UubW9kZV0ubmFtZSwgdGhpcy5zZXR0aW5nc1tmaWx0ZXJzW3RoaXMuaW5zdGFuY2UubW9kZV0ucGFyYW1dICk7XHJcbiAgICAgIH1cclxuICAgICAgLy8gQXBwbHkgc3R5bGUuXHJcbiAgICAgIG0uY2FudmFzLnN0eWxlLmN1cnNvciA9ICdwb2ludGVyJztcclxuXHJcbiAgICAgIC8vIEFwcGx5IGNsaWNrIGV2ZW50IG9uIHRoZSB0aHVtYidzIGNhbnZhcyB0aGF0IGZpcmUgdGhlIERpYXBQYXJ0J3MgaW5zdGFuY2UgYWN0aXZlIGluZGV4IHRvIGNvcmVzcG9uZGluZyBNYXRyaXguXHJcbiAgICAgIG0uY2FudmFzLm9uY2xpY2sgPSBmdW5jdGlvbiggbWF0cml4ICl7XHJcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICggZSApIHtcclxuICAgICAgICAgIHNlbGYuaW5zdGFuY2UuZ29UbyggbWF0cml4ICk7XHJcbiAgICAgICAgICBzZWxmLmluc3RhbmNlLmNsZWFyUGFydHMoKTtcclxuICAgICAgICAgIHNlbGYuaW5zdGFuY2UubGliZXJhdGlvblBhcnRzMSgpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSggbSApO1xyXG5cclxuICAgICAgLy8gU3RvcmUgTWF0cml4J3MgaW5zdGFuY2Ugb2YgdGhlIHRodW1iIGluIGFuIGFycmF5LlxyXG4gICAgICB0aGlzLmluc3RhbmNlLnRodW1iT3JpZ2luYWxUYWIucHVzaCggbSApO1xyXG5cclxuICAgICAgLy8gSW5qZWN0IHRodW1iJ3MgY2FudmFzIGluIHRoZSBET00uXHJcbiAgICAgIGZuLmFwcGVuZCggdGFyZ2V0LCBtLmNhbnZhcyApO1xyXG5cclxuICAgICAgcmV0dXJuIG07XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgLyoqKipcclxuICAgKiBEaWFwUGFydCBjb25zdHJ1Y3Rvci5cclxuICAgKiBBIERpYXBQYXJldCBpbnN0YW5jZSBtdXN0IGJlIGNyZWF0ZWQgYW5kIGluaXRpYWxpemVkIHRvIGNyZWF0ZSBzbGlkZXNob3cuXHJcbiAgICpcclxuICAgKi9cclxuXHJcbiAgZnVuY3Rpb24gRGlhcFBhcnQgKCkge1xyXG4gICAgdGhpcy5zZXR0aW5ncyA9IGZuLnNpbXBsZUV4dGVuZCgge30sIGRlZmF1bHRzICk7XHJcbiAgICB0aGlzLm1hdHJpeFRhYiA9IFtdO1xyXG4gICAgdGhpcy50aHVtYk9yaWdpbmFsVGFiID0gW107XHJcbiAgICB0aGlzLnBhcnRpY2xlcyA9IFtdO1xyXG4gICAgdGhpcy5jaGFtcHMgPSBbXTtcclxuICAgIHRoaXMubW9kZSA9IHRoaXMuc2V0dGluZ3MuaW5pdGlhbE1vZGU7XHJcbiAgICB0aGlzLmxpYmVyYXRpb24gPSBmYWxzZTtcclxuICAgIHRoaXMuYWN0aXZlSW5kZXggPSBudWxsO1xyXG4gICAgdGhpcy5jYW52YXMgPSB0aGlzLmdldENhbnZhcygpO1xyXG4gICAgdGhpcy5jb250ZXh0ID0gdGhpcy5nZXRDb250ZXh0MkQoIHRoaXMuY2FudmFzICk7XHJcbiAgfVxyXG5cclxuICBEaWFwUGFydC5wcm90b3R5cGUgPSB7XHJcblxyXG4gICAgICAvLyBJbml0aWFsaXplIERpYXBQYXJ0IGluc3RhbmNlLlxyXG4gICAgICBpbml0OiBmdW5jdGlvbiAoIG9wdGlvbnMgKSB7XHJcblxyXG4gICAgICAgIC8vIFN0b3JlIHNldHRpbmdzLlxyXG4gICAgICAgIGZuLnNpbXBsZUV4dGVuZCggdGhpcy5zZXR0aW5ncywgb3B0aW9ucyApO1xyXG5cclxuICAgICAgICAvLyBJbmplY3QgY2FudmFzIG9uIERPTS5cclxuICAgICAgICBmbi5hcHBlbmQoIHRoaXMuc2V0dGluZ3MudGFyZ2V0RWxlbWVudCwgdGhpcy5jYW52YXMgKTtcclxuXHJcbiAgICAgICAgLy8gQXBwbHkgc3R5bGUgdG8gY2FudmFzIGVsZW1lbnQuXHJcbiAgICAgICAgdGhpcy5jYW52YXMuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gdGhpcy5zZXR0aW5ncy5iYWNrZ3JvdW5kO1xyXG5cclxuICAgICAgICAvLyBTZXQgbWFzcyBpbml0aWFsIGNvb3JkcyB0byBjYW52YSdzIGNlbnRlci5cclxuICAgICAgICB0aGlzLmNlbnRlck1hc3MoKTtcclxuXHJcbiAgICAgICAgLy8gQ3JlYXRlIHRoZSBtYXNzLlxyXG4gICAgICAgIHRoaXMuY2hhbXBzLnB1c2goIG5ldyBDaGFtcCggbmV3IFZlY3Rvcih0aGlzLnNldHRpbmdzLm1hc3NYLCB0aGlzLnNldHRpbmdzLm1hc3NZKSwgdGhpcy5zZXR0aW5ncy5tYXNzICkgKTtcclxuXHJcbiAgICAgICAgLy8gU3RhcnQgdGhlIGxvb3AuXHJcbiAgICAgICAgdGhpcy5sb29wKCk7XHJcblxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gU2V0IG9wdGlvbnMgdG8gc2V0dGluZ3MuXHJcbiAgICAgIHNldDogZnVuY3Rpb24gKCBvcHRpb25zICl7XHJcbiAgICAgICAgZm4uc2ltcGxlRXh0ZW5kKCB0aGlzLnNldHRpbmdzLCBvcHRpb25zICk7XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBDcmVhdGUgbmV3IHNsaWRlLCBhY2NvcmRpbmcgdG8gaW5wdXQgdmFsdWUgOiBJbWFnZSBvciBTdHJpbmcuXHJcbiAgICAgIGNyZWF0ZVNsaWRlOiBmdW5jdGlvbiggaW5wdXQsIGN1c3RvbVNpemUgKXtcclxuXHJcbiAgICAgICAgLy8gQ3JlYXRlIHRoZSBNYXRyaXggaW5zdGFuY2UgYWNjb3JkaW5nIHRvIGlucHV0LlxyXG4gICAgICAgIHZhciBtID0gbmV3IE1hdHJpeCAoIHRoaXMsIGlucHV0LCBjdXN0b21TaXplICk7XHJcblxyXG4gICAgICAgIC8vIFNldCBhY3RpdmUgaW5kZXggdG8gMCBpZiBpdCdzIG51bGwuXHJcbiAgICAgICAgdGhpcy5hY3RpdmVJbmRleCA9ICggdGhpcy5hY3RpdmVJbmRleCA9PT0gbnVsbCApID8gMCA6IHRoaXMuYWN0aXZlSW5kZXg7XHJcbiAgICAgICAgdGhpcy5tYXRyaXhUYWIucHVzaCggbSApO1xyXG4gICAgICAgIHJldHVybiBtO1xyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gQ3JlYXRlIGFuZCByZXR1cm4gY2FudmFzIGVsZW1lbnQuIElmIG5vIHNpemUgc3BlY2lmaWVkLCB0YWtlIGluc3RhbmNlJ3Mgc2V0dGluZ3Mgc2l6ZS5cclxuICAgICAgZ2V0Q2FudmFzOiBmdW5jdGlvbiAoIHNpemUgKSB7XHJcbiAgICAgICAgdmFyIGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoICdjYW52YXMnICksXHJcbiAgICAgICAgICAgIHMgPSBzaXplIHx8IHt9O1xyXG5cclxuICAgICAgICBjYW52YXMuaGVpZ2h0ID0gKCBzLmggKSA/IHMuaCA6IHRoaXMuc2V0dGluZ3MuaGVpZ2h0O1xyXG4gICAgICAgIGNhbnZhcy53aWR0aCA9ICggcy53ICkgPyBzLncgOiB0aGlzLnNldHRpbmdzLndpZHRoO1xyXG5cclxuICAgICAgICByZXR1cm4gY2FudmFzO1xyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gQ3JlYXRlIGFuZCByZXR1cm4gY29udGV4dCBmb3IgY2FudmFzLlxyXG4gICAgICBnZXRDb250ZXh0MkQ6IGZ1bmN0aW9uICggY2FudmFzICkge1xyXG4gICAgICAgIHJldHVybiBjYW52YXMuZ2V0Q29udGV4dCggJzJkJyApO1xyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gUmV0dXJuIGNvb3JkcywgaGVpZ2h0IGFuZCB3aWR0aCBvZiB0aGUgaW1nIHJlc2l6ZWQgYWNjb3JkaW5nIHRvIHNpemUgYXJnLCBvciBpbnN0YW5jZSdzIGNhbnZhcyBzaXplLiBcclxuICAgICAgZ2V0SW1hZ2VTaXplOiBmdW5jdGlvbiAoIGltZywgc2l6ZSApIHtcclxuICAgICAgICB2YXIgdyA9IGltZy53aWR0aCwgXHJcbiAgICAgICAgICAgIGggPSBpbWcuaGVpZ2h0LFxyXG4gICAgICAgICAgICBjdyA9ICggc2l6ZSApID8gc2l6ZS53IDogdGhpcy5jYW52YXMud2lkdGgsXHJcbiAgICAgICAgICAgIGNoID0gKCBzaXplICkgPyBzaXplLmggOiB0aGlzLmNhbnZhcy5oZWlnaHQsXHJcbiAgICAgICAgICAgIHJhdGlvID0gdyAvIGg7XHJcblxyXG4gICAgICAgIGlmICggdyA+PSBoICYmIHcgPiBjdyApIHtcclxuICAgICAgICAgIHcgPSBjdztcclxuICAgICAgICAgIGggPSBNYXRoLnJvdW5kKCB3IC8gcmF0aW8gKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICBpZiAoIGggPiBjaCApIHtcclxuICAgICAgICAgICAgaCA9IGNoO1xyXG4gICAgICAgICAgICB3ID0gTWF0aC5yb3VuZCggaCAqIHJhdGlvICk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgeDogTWF0aC5yb3VuZCggKCBjdyAtIHcgKSAvIDIgKSxcclxuICAgICAgICAgIHk6IE1hdGgucm91bmQoICggY2ggLSBoICkgLyAyICksIFxyXG4gICAgICAgICAgdzogdyxcclxuICAgICAgICAgIGg6IGhcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBNZXRob2QgdG8gcGFzcyBhcyBvbmNoYW5nZSBldmVudCBmdW5jdGlvbiBpbiBmaWxlcyBpbnB1dC5cclxuICAgICAgbG9hZDogZnVuY3Rpb24gKCBlLCB0aHVtYiApIHtcclxuXHJcbiAgICAgICAgdmFyIGksIGZpbGVzID0gZS50YXJnZXQuZmlsZXMsIHNlbGYgPSB0aGlzO1xyXG5cclxuICAgICAgICAvLyBJZiBubyBmaWxlIHNlbGVjdGVkLCBleGl0LlxyXG4gICAgICAgIGlmICggIWZpbGVzICkgcmV0dXJuO1xyXG5cclxuICAgICAgICBmb3IgKCBpID0gMDsgaSA8IGZpbGVzLmxlbmd0aDsgaSsrICl7XHJcblxyXG4gICAgICAgICAgdmFyIGZpbGUgPSBmaWxlc1tpXTtcclxuXHJcbiAgICAgICAgICAvLyBJZiBmaWxlIGlzIG5vdCBhbiBpbWFnZSwgcGFzcyB0byBuZXh0IGZpbGUuXHJcbiAgICAgICAgICBpZiAoICFmaWxlLnR5cGUubWF0Y2goICdpbWFnZScgKSApIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xyXG5cclxuICAgICAgICAgIC8vIFdoZW4gZmlsZSBpcyBsb2FkZWQuXHJcbiAgICAgICAgICByZWFkZXIub25sb2FkID0gZnVuY3Rpb24gKCBldmVudCApIHtcclxuXHJcbiAgICAgICAgICAgIHZhciBpbWcgPSBuZXcgSW1hZ2UoKTtcclxuXHJcbiAgICAgICAgICAgIC8vIFdoZW4gaW1hZ2UgaXMgbG9hZGVkLlxyXG4gICAgICAgICAgICBpbWcub25sb2FkID0gZnVuY3Rpb24oKXtcclxuXHJcbiAgICAgICAgICAgICAgLy8gQ3JlYXRlIHNsaWRlLCB3aXRoIEltYWdlIGlucHV0LlxyXG4gICAgICAgICAgICAgIHZhciBtID0gc2VsZi5jcmVhdGVTbGlkZSggdGhpcyApO1xyXG5cclxuICAgICAgICAgICAgICBpZiAoICF0aHVtYiApIHJldHVybjtcclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAvLyBDcmVhdGUgYW5kIHN0b3JlIHRodW1iLlxyXG4gICAgICAgICAgICAgIG0ucmVuZGVyVGh1bWJuYWlscyggc2VsZi5zZXR0aW5ncy50aHVtZG5haWxzSUQsIGZhbHNlICk7XHJcblxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAvLyBMb2FkIGltZy5cclxuICAgICAgICAgICAgaW1nLnNyYyA9IGV2ZW50LnRhcmdldC5yZXN1bHQ7XHJcbiAgICAgICAgICB9O1xyXG4gICAgICAgICAgLy8gTG9hZCBmaWxlLlxyXG4gICAgICAgICAgcmVhZGVyLnJlYWRBc0RhdGFVUkwoIGZpbGUgKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBDaGFuZ2UgaW5zdGFuY2UncyBtb2RlLiBCYXNpY2FsbHksIGl0IGNoYW5nZSBtZXRob2RzIHRvIHRlc3QgZWFjaCBQYXJ0aWNsZXMsIGFuZCBtYXRyaXggdGhhdCdzIHRlc3RlZC5cclxuICAgICAgc3dpdGNoTW9kZTogZnVuY3Rpb24gKCBtb2RlICkge1xyXG5cclxuICAgICAgICAvLyBTZXQgbW9kZS5cclxuICAgICAgICB0aGlzLm1vZGUgPSBtb2RlO1xyXG5cclxuICAgICAgICAvLyBDYWxsIGNhbGxiYWNrIGlmIGV4aXN0LlxyXG4gICAgICAgIGlmKCB0eXBlb2YgdGhpcy5zZXR0aW5ncy5zd2l0Y2hNb2RlQ2FsbGJhY2sgPT09ICdmdW5jdGlvbicgKSB7XHJcbiAgICAgICAgICB0aGlzLnNldHRpbmdzLnN3aXRjaE1vZGVDYWxsYmFjay5jYWxsKCB0aGlzICk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gQ3JlYXRlIG5ldyBtYXNzIGFuZCBzdG9yZSBvbiBjaGFtcCBhcnJheS5cclxuICAgICAgYWRkTWFzczogZnVuY3Rpb24oIHgsIHksIG1hc3MgKXtcclxuICAgICAgICB2YXIgbSA9IG5ldyBDaGFtcCggbmV3IFZlY3Rvcih4LCB5KSwgbWFzcyApO1xyXG4gICAgICAgIHRoaXMuY2hhbXBzLnB1c2goIG0gKTtcclxuICAgICAgICByZXR1cm4gbTtcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIFNldCBtYXNzIGNvb3JkcyB0byBjYW52YSdzIGNlbnRnZXIgb24gaW5zdGFuY2UncyBzZXR0aW5ncy5cclxuICAgICAgY2VudGVyTWFzczogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuc2V0dGluZ3MubWFzc1ggPSB0aGlzLmNhbnZhcy53aWR0aC8yO1xyXG4gICAgICAgIHRoaXMuc2V0dGluZ3MubWFzc1kgPSB0aGlzLmNhbnZhcy5oZWlnaHQvMjtcclxuXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBDYWxsIHBhcnRpY2xlIG1ldGhvZHMgaW4gZWFjaCBsb29wLCBhY2NvcmRpbmcgdG8gYWN0aXZlIG1vZGUgYW5kIGNvcnJlc3BvbmRpbmcgcHJvY2VlZCBzZXR0aW5ncy5cclxuICAgICAgcGFydFByb2NlZWQ6IGZ1bmN0aW9uICggcGFydGljbGUgKSB7XHJcbiAgICAgICAgdmFyIGksIGwgPSBwcm9jZWVkW3RoaXMubW9kZV0ubGVuZ3RoO1xyXG4gICAgICAgIGZvciAoIGkgPSAwOyBpIDwgbDsgaSsrICkge1xyXG4gICAgICAgICAgcGFydGljbGVbcHJvY2VlZFt0aGlzLm1vZGVdW2ldXSgpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIFNldCBhY3RpdmVJbmRleCB0byBtYXRyaXgncyB0aHVtYiBpbmRleC5cclxuICAgICAgZ29UbzogZnVuY3Rpb24gKCBtYXRyaXggKSB7XHJcbiAgICAgICAgdGhpcy5hY3RpdmVJbmRleCA9IHRoaXMudGh1bWJPcmlnaW5hbFRhYi5pbmRleE9mKCBtYXRyaXggKTtcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIE1ha2UgcGFydGljbGVzIGZyZWUgZm9yIHNob3J0IGRlbGF5LlxyXG4gICAgICBsaWJlcmF0aW9uUGFydHMxOiBmdW5jdGlvbiAoIGRlbGF5ICkge1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICB2YXIgZCA9IGRlbGF5IHx8IDUwMDtcclxuXHJcbiAgICAgICAgLy8gUGFydGljbGVzIGFyZSBmcmVlIGZyb20gbWF0cml4IG9mIHR5cGUgJ3ZhbHVlJy5cclxuICAgICAgICB0aGlzLmxpYmVyYXRpb24gPSAhdGhpcy5saWJlcmF0aW9uO1xyXG5cclxuICAgICAgICAgIC8vIE1hc3Mgc3RyZW5ndGggaXMgaW52ZXJ0ZWQuXHJcbiAgICAgICAgICB0aGlzLmNoYW1wc1swXS5tYXNzID0gdGhpcy5zZXR0aW5ncy5hbnRpTWFzcztcclxuXHJcbiAgICAgICAgICAvLyBXaGVuIGRlbGF5J3Mgb3Zlciwgd2hlIHJldHVybiB0byBub3JtYWwgbWFzcyBzdHJlbmd0aCBhbmQgcGFydGljbGVzIGJlaGF2aW9yLlxyXG4gICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICBzZWxmLmNoYW1wc1swXS5tYXNzID0gc2VsZi5zZXR0aW5ncy5tYXNzO1xyXG4gICAgICAgICAgICBzZWxmLmxpYmVyYXRpb24gPSAhc2VsZi5saWJlcmF0aW9uO1xyXG4gICAgICAgICAgfSwgZClcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIENyZWF0ZSBuZXcgUGFydGljbGUsIHdpdGggcmFuZG9tIHBvc2l0aW9uIGFuZCBzcGVlZC5cclxuICAgICAgY3JlYVBhcnRzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMucGFydGljbGVzLmxlbmd0aCA8IHRoaXMuc2V0dGluZ3MuZGVuc2l0eSkge1xyXG4gICAgICAgICAgdmFyIGksIG5iID0gdGhpcy5zZXR0aW5ncy5kZW5zaXR5IC0gdGhpcy5wYXJ0aWNsZXMubGVuZ3RoO1xyXG4gICAgICAgICAgZm9yICggaSA9IDA7IGkgPCBuYjsgaSsrICkge1xyXG4gICAgICAgICAgICB0aGlzLnBhcnRpY2xlcy5wdXNoKG5ldyBQYXJ0aWNsZSh0aGlzLCBuZXcgVmVjdG9yKE1hdGgucmFuZG9tKCkgKiB0aGlzLmNhbnZhcy53aWR0aCwgTWF0aC5yYW5kb20oKSAqIHRoaXMuY2FudmFzLmhlaWdodCksIG5ldyBWZWN0b3IocmVhbFJhbmRvbSh0aGlzLnNldHRpbmdzLmluaXRpYWxWZWxvY2l0eSksIHJlYWxSYW5kb20odGhpcy5zZXR0aW5ncy5pbml0aWFsVmVsb2NpdHkpKSwgbmV3IFZlY3RvcigwLCAwKSwgMCwgZmFsc2UpKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBQcm9jZWVkIGFsbCBwYXJ0aWN1bGVzLlxyXG4gICAgICB1cGdyYWRlUGFydHM6IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICAgICAgdmFyIGN1cnJlbnRQYXJ0cyA9IFtdLFxyXG4gICAgICAgICAgICBpLCBsID0gdGhpcy5wYXJ0aWNsZXMubGVuZ3RoO1xyXG5cclxuICAgICAgICBmb3IoIGkgPSAwOyBpIDwgbDsgaSsrICl7XHJcblxyXG4gICAgICAgICAgdmFyIHBhcnRpY2xlID0gdGhpcy5wYXJ0aWNsZXNbaV0sXHJcbiAgICAgICAgICAgICAgcG9zID0gcGFydGljbGUucG9zaXRpb247XHJcblxyXG4gICAgICAgICAgLy8gSWYgcGFydGljbGUgb3V0IG9mIGNhbnZhcywgZm9yZ2V0IGl0LlxyXG4gICAgICAgICAgaWYoIHBvcy54ID49IHRoaXMuY2FudmFzLndpZHRoIHx8IHBvcy54IDw9IDAgfHwgcG9zLnkgPj0gdGhpcy5jYW52YXMuaGVpZ2h0IHx8IHBvcy55IDw9IDAgKSBjb250aW51ZTtcclxuXHJcbiAgICAgICAgICAvLyBQcm9jZWVkIHRoZSBwYXJ0aWNsZS5cclxuICAgICAgICAgIHRoaXMucGFydFByb2NlZWQoIHBhcnRpY2xlICk7XHJcblxyXG4gICAgICAgICAgLy8gTW92ZSB0aGUgcGFydGljbGUuXHJcbiAgICAgICAgICBwYXJ0aWNsZS5tb3ZlKCk7XHJcblxyXG4gICAgICAgICAgLy8gU3RvcmUgdGhlIHBhcnRpY2xlLlxyXG4gICAgICAgICAgY3VycmVudFBhcnRzLnB1c2goIHBhcnRpY2xlICk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMucGFydGljbGVzID0gY3VycmVudFBhcnRzO1xyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gRHJhdyBwYXJ0aWNsZXMgaW4gY2FudmFzLlxyXG4gICAgICBkcmF3UGFydHM6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgaSwgbiA9IHRoaXMucGFydGljbGVzLmxlbmd0aDtcclxuICAgICAgICBmb3IoIGkgPSAwOyBpIDwgbjsgaSsrICl7XHJcbiAgICAgICAgICB2YXIgcG9zID0gdGhpcy5wYXJ0aWNsZXNbaV0ucG9zaXRpb247XHJcbiAgICAgICAgICB0aGlzLmNvbnRleHQuZmlsbFN0eWxlID0gdGhpcy5wYXJ0aWNsZXNbaV0uY29sb3I7XHJcbiAgICAgICAgICB0aGlzLmNvbnRleHQuZmlsbFJlY3QocG9zLngsIHBvcy55LCB0aGlzLnNldHRpbmdzLnBhcnRpY2xlU2l6ZSwgdGhpcy5zZXR0aW5ncy5wYXJ0aWNsZVNpemUpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIE1ha2UgZnJlZSBhbGwgcGFydGljbGVzLlxyXG4gICAgICBjbGVhclBhcnRzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIGksIGwgPSB0aGlzLnBhcnRpY2xlcy5sZW5ndGg7XHJcbiAgICAgICAgZm9yKCBpID0gMDsgaSA8IGw7IGkrKyApe1xyXG4gICAgICAgICAgdGhpcy5wYXJ0aWNsZXNbaV0uaW5Gb3JtID0gMDtcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBDbGVhbiBjYW52YXMuXHJcbiAgICAgIGNsZWFyOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgaWYoICF0aGlzLnNldHRpbmdzLmRyYXcgKSB7XHJcbiAgICAgICAgICB0aGlzLmNvbnRleHQuY2xlYXJSZWN0KCAwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0ICk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gTG9vcCdzIGNhbGxiYWNrLlxyXG4gICAgICBxdWV1ZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICBpZiggIXRoaXMuc2V0dGluZ3Muc3RvcCApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucmVxdWVzdElEID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSggc2VsZi5sb29wLmJpbmQoc2VsZikgKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKCBzZWxmLnJlcXVlc3RJRCApO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZXF1ZXN0SUQgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gQ3JlYXRlIGFuZCBwcm9jZWVkIG5ldyBwYXJ0aWNsZXMgaWYgbWlzc2luZy5cclxuICAgICAgdXBkYXRlOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5jcmVhUGFydHMoKTtcclxuICAgICAgICB0aGlzLnVwZ3JhZGVQYXJ0cygpO1xyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gRHJhdy5cclxuICAgICAgZHJhdzogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuZHJhd1BhcnRzKCk7XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBMb29wLlxyXG4gICAgICBsb29wOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5jbGVhcigpO1xyXG4gICAgICAgIHRoaXMudXBkYXRlKCk7XHJcbiAgICAgICAgdGhpcy5kcmF3KCk7XHJcbiAgICAgICAgdGhpcy5xdWV1ZSgpO1xyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gU3RvcCBsb29wLlxyXG4gICAgICBzdG9wOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5zdG9wID0gdHJ1ZTtcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIFN0YXJ0IGxvb3AuXHJcbiAgICAgIHN0YXJ0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5zdG9wID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5sb29wKCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICB9O1xyXG4gICAgXHJcblxyXG4gICAvLyBSZXR1cm4gcmFuZG9tIG51bWJlci4gXHJcbiAgIGZ1bmN0aW9uIHJlYWxSYW5kb20oIG1heCApe1xyXG4gICAgICByZXR1cm4gTWF0aC5jb3MoKE1hdGgucmFuZG9tKCkgKiBNYXRoLlBJKSkgKiBtYXg7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gVmVjdG9yIGVsZW1lbnRhcnkgY2xhc3Mgb2JqZWN0LlxyXG4gICAgZnVuY3Rpb24gVmVjdG9yKCB4LCB5ICkge1xyXG4gICAgICB0aGlzLnggPSB4IHx8IDA7XHJcbiAgICAgIHRoaXMueSA9IHkgfHwgMDtcclxuICAgIH1cclxuXHJcbiAgICAvLyBBZGQgdmVjdG9yIHRvIGFuIG90aGVyLlxyXG4gICAgVmVjdG9yLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbih2ZWN0b3Ipe1xyXG4gICAgICB0aGlzLnggKz0gdmVjdG9yLng7XHJcbiAgICAgIHRoaXMueSArPSB2ZWN0b3IueTtcclxuICAgIH07XHJcblxyXG4gICAgLy8gSW52ZXJ0IHZlY3RvcidzIGRpcmVjdGlvbi5cclxuICAgIFZlY3Rvci5wcm90b3R5cGUuZ2V0SW52ZXJ0ID0gZnVuY3Rpb24oKXtcclxuICAgICAgdGhpcy54ID0gLTEgKiAodGhpcy54KTtcclxuICAgICAgdGhpcy55ID0gLTEgKiAodGhpcy55KTtcclxuICAgIH07XHJcblxyXG4gICAgLy8gR2V0IHZlY3RvcidzIGxlbmd0aC5cclxuICAgIFZlY3Rvci5wcm90b3R5cGUuZ2V0TWFnbml0dWRlID0gZnVuY3Rpb24oKXtcclxuICAgICAgcmV0dXJuIE1hdGguc3FydCh0aGlzLnggKiB0aGlzLnggKyB0aGlzLnkgKiB0aGlzLnkpXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIEdldCB2ZWN0b3IncyByYWRpdXMuXHJcbiAgICBWZWN0b3IucHJvdG90eXBlLmdldEFuZ2xlID0gZnVuY3Rpb24oKXtcclxuICAgICAgcmV0dXJuIE1hdGguYXRhbjIodGhpcy55LCB0aGlzLngpO1xyXG4gICAgfTtcclxuXHJcbiAgICAvLyBHZXQgbmV3IHZlY3RvciBhY2NvcmRpbmcgdG8gbGVuZ3RoIGFuZCByYWRpdXMuXHJcbiAgICBWZWN0b3IucHJvdG90eXBlLmZyb21BbmdsZSA9IGZ1bmN0aW9uICggYW5nbGUsIG1hZ25pdHVkZSApIHtcclxuICAgICAgcmV0dXJuIG5ldyBWZWN0b3IobWFnbml0dWRlICogTWF0aC5jb3MoYW5nbGUpLCBtYWduaXR1ZGUgKiBNYXRoLnNpbihhbmdsZSkpO1xyXG4gICAgfTtcclxuXHJcbiAgICAvLyBQYXJ0aWNsZSBjb25zdHJ1Y3Rvci5cclxuICAgIGZ1bmN0aW9uIFBhcnRpY2xlKCBpbnN0YW5jZSwgcG9zaXRpb24sIHZpdGVzc2UsIGFjY2VsZXJhdGlvbiApIHtcclxuICAgICAgdGhpcy5pbnN0YW5jZSA9IGluc3RhbmNlO1xyXG4gICAgICB0aGlzLnBvc2l0aW9uID0gcG9zaXRpb24gfHwgbmV3IFZlY3RvcigwLCAwKTtcclxuICAgICAgdGhpcy52aXRlc3NlID0gdml0ZXNzZSB8fCBuZXcgVmVjdG9yKDAsIDApO1xyXG4gICAgICB0aGlzLmFjY2VsZXJhdGlvbiA9IGFjY2VsZXJhdGlvbiB8fCBuZXcgVmVjdG9yKDAsIDApO1xyXG4gICAgICB0aGlzLmNvbG9yID0gdGhpcy5pbnN0YW5jZS5zZXR0aW5ncy5wYXJ0aWNsZUNvbG9yO1xyXG4gICAgICB0aGlzLmluRm9ybSA9IDA7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gU2V0IG5ldyBwYXJ0aWNsZSdzIHBvc2l0aW9uIGFjY29yZGluZyB0byBpdHMgYWNjZWxlcmF0aW9uIGFuZCBzcGVlZC5cclxuICAgIFBhcnRpY2xlLnByb3RvdHlwZS5tb3ZlID0gZnVuY3Rpb24oKXtcclxuICAgICAgdGhpcy52aXRlc3NlLmFkZCggdGhpcy5hY2NlbGVyYXRpb24gKTtcclxuICAgICAgdGhpcy5wb3NpdGlvbi5hZGQoIHRoaXMudml0ZXNzZSApO1xyXG4gICAgfTtcclxuXHJcbiAgICAvLyBQcm9jZWVkIHBhcnRpY2xlIGFjY29yZGluZyB0byBleGlzdGluZyBtYXNzLlxyXG4gICAgUGFydGljbGUucHJvdG90eXBlLnNvdW1pc0NoYW1wID0gZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgICAvLyBJZiBubyBtYXNzIHN0cmVuZ3RoLCByZXR1cm4uXHJcbiAgICAgIGlmICggIXRoaXMuaW5zdGFuY2UuY2hhbXBzWzBdLm1hc3MgKSByZXR1cm47XHJcblxyXG4gICAgICAvLyBJZiBwYXJ0aWNsZSBoYXMgbm90IGZsYWdnZWQgJ2luRm9ybScuXHJcbiAgICAgIGlmICggdGhpcy5pbkZvcm0gIT09IDEgKSB7XHJcblxyXG4gICAgICAgIHZhciB0b3RhbEFjY2VsZXJhdGlvblggPSAwO1xyXG4gICAgICAgIHZhciB0b3RhbEFjY2VsZXJhdGlvblkgPSAwO1xyXG4gICAgICAgIHZhciBsID0gdGhpcy5pbnN0YW5jZS5jaGFtcHMubGVuZ3RoO1xyXG5cclxuICAgICAgICAvLyBQcm9jZWVkIGVmZmVjdCBvZiBhbGwgbWFzcyByZWdpc3RlcmVkIGluIGNoYW1wcyBhcnJheS5cclxuICAgICAgICBmb3IoIHZhciBpID0gMDsgaSA8IGw7IGkrKyApe1xyXG4gICAgICAgICAgdmFyIGRpc3RYID0gdGhpcy5pbnN0YW5jZS5jaGFtcHNbaV0ucG9zaXRpb24ueCAtIHRoaXMucG9zaXRpb24ueDtcclxuICAgICAgICAgIHZhciBkaXN0WSA9IHRoaXMuaW5zdGFuY2UuY2hhbXBzW2ldLnBvc2l0aW9uLnkgLSB0aGlzLnBvc2l0aW9uLnk7XHJcbiAgICAgICAgICB2YXIgZm9yY2UgPSB0aGlzLmluc3RhbmNlLmNoYW1wc1tpXS5tYXNzIC8gTWF0aC5wb3coZGlzdFggKiBkaXN0WCArIGRpc3RZICogZGlzdFksIDEuNSk7XHJcbiAgICAgICAgICB0b3RhbEFjY2VsZXJhdGlvblggKz0gZGlzdFggKiBmb3JjZTtcclxuICAgICAgICAgIHRvdGFsQWNjZWxlcmF0aW9uWSArPSBkaXN0WSAqIGZvcmNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gU2V0IG5ldyBhY2NlbGVyYXRpb24gdmVjdG9yLlxyXG4gICAgICAgIHRoaXMuYWNjZWxlcmF0aW9uID0gbmV3IFZlY3RvciggdG90YWxBY2NlbGVyYXRpb25YLCB0b3RhbEFjY2VsZXJhdGlvblkgKTtcclxuICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBQcm9jZWVkIHBhcnRpY2xlIGFjY29yZGluZyB0byBtYXRyaXggb2YgdHlwZSAndmFsdWUnLiBDYWxsZWQgaW4gbW9kZUZvcm0uXHJcbiAgICBQYXJ0aWNsZS5wcm90b3R5cGUuc291bWlzRm9ybSA9IGZ1bmN0aW9uKCl7XHJcblxyXG4gICAgICAvLyBJZiBsaWJlcmF0aW9uIGZsYWcsIG1ha2UgdGhlIHBhcnRpY2xlIGZyZWUuXHJcbiAgICAgIGlmKCB0aGlzLmluc3RhbmNlLmxpYmVyYXRpb24gKXtcclxuICAgICAgICB0aGlzLmluRm9ybSA9IDA7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBHZXQgcGFydGljbGUgcG9zaXRpb24uXHJcbiAgICAgIHZhciB0ZXN0WCA9IE1hdGguZmxvb3IoIHRoaXMucG9zaXRpb24ueCApO1xyXG4gICAgICB2YXIgdGVzdFkgPSBNYXRoLmZsb29yKCB0aGlzLnBvc2l0aW9uLnkgKTtcclxuXHJcbiAgICAgIC8vIENoZWNrIG1hdHJpeCB2YWx1ZSBhY2NvcmRpbmcgdG8gcGFydGljbGUncyBwb3NpdGlvbi5cclxuICAgICAgdmFyIHZhbHVlID0gKCB0aGlzLmluc3RhbmNlLmFjdGl2ZUluZGV4ICE9PSBudWxsICkgPyB0aGlzLmluc3RhbmNlLm1hdHJpeFRhYlt0aGlzLmluc3RhbmNlLmFjdGl2ZUluZGV4XS5nZXRNYXRyaXgoKVt0ZXN0WF1bdGVzdFldIDogMDtcclxuXHJcbiAgICAgIC8vIElmIHBhcnRpY2xlIGlzIGluc2lkZSBhICd3aGl0ZSB6b25lJy5cclxuICAgICAgaWYgKCB2YWx1ZSAhPT0gMCApe1xyXG5cclxuICAgICAgICAvLyBJZiBwYXJ0aWNsZXMganVzdCBjb21lIGludG8gdGhlICd3aGl0ZSB6b25lJy5cclxuICAgICAgICBpZiggdGhpcy5pbkZvcm0gIT09IDEgKXtcclxuXHJcbiAgICAgICAgICAvLyBVcCB0aGUgZm9ybSBmbGFnLlxyXG4gICAgICAgICAgdGhpcy5pbkZvcm0gPSAxO1xyXG5cclxuICAgICAgICAgIC8vIFNsb3cgdGhlIHBhcnRpY2xlLlxyXG4gICAgICAgICAgdGhpcy52aXRlc3NlID0gbmV3IFZlY3Rvcih0aGlzLnZpdGVzc2UueCAqIDAuMiwgdGhpcy52aXRlc3NlLnkgKiAwLjIpO1xyXG5cclxuICAgICAgICAgIC8vIEN1dCB0aGUgYWNjZWxlcmF0aW9uLlxyXG4gICAgICAgICAgdGhpcy5hY2NlbGVyYXRpb24gPSBuZXcgVmVjdG9yKDAsIDApO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gSWYgcGFydGljbGUgaXMgbm90IGluc2lkZSAnd2hpdGUgem9uZScuXHJcbiAgICAgIGVsc2Uge1xyXG5cclxuICAgICAgICAvLyBJZiB0aGUgcGFydGljbGUganVzdCBnZXQgb3V0IHRoZSB6b25lLlxyXG4gICAgICAgIGlmKCB0aGlzLmluRm9ybSA9PT0gMSApe1xyXG5cclxuICAgICAgICAgIC8vIEl0J3Mgbm90IGZyZWUgOiBpbnZlcnQgc3BlZWQuXHJcbiAgICAgICAgICB0aGlzLnZpdGVzc2UuZ2V0SW52ZXJ0KCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIC8vIE1hc3MgY29uc3RydWN0b3IuXHJcbiAgICBmdW5jdGlvbiBDaGFtcCggcG9pbnQsIG1hc3MgKSB7XHJcbiAgICAgIHRoaXMucG9zaXRpb24gPSBwb2ludDtcclxuICAgICAgdGhpcy5zZXRNYXNzKCBtYXNzICk7XHJcbiAgICB9XHJcblxyXG4gICAgQ2hhbXAucHJvdG90eXBlLnNldE1hc3MgPSBmdW5jdGlvbiggbWFzcyApe1xyXG4gICAgICB0aGlzLm1hc3MgPSBtYXNzIHx8IDA7XHJcbiAgICAgIHRoaXMuY29sb3IgPSBtYXNzIDwgMCA/IFwiI2YwMFwiIDogXCIjMGYwXCI7XHJcbiAgICB9O1xyXG5cclxuXHJcbiAgLy8gUE9MWUZJTExcclxuXHJcbiAgLy8gUHJvZHVjdGlvbiBzdGVwcyBvZiBFQ01BLTI2MiwgRWRpdGlvbiA1LCAxNS40LjQuMTRcclxuICAvLyBSw6lmw6lyZW5jZSA6IGh0dHA6Ly9lczUuZ2l0aHViLmlvLyN4MTUuNC40LjE0XHJcbiAgaWYgKCFBcnJheS5wcm90b3R5cGUuaW5kZXhPZikge1xyXG4gICAgQXJyYXkucHJvdG90eXBlLmluZGV4T2YgPSBmdW5jdGlvbihzZWFyY2hFbGVtZW50LCBmcm9tSW5kZXgpIHtcclxuICAgICAgdmFyIGs7XHJcbiAgICAgIGlmICh0aGlzID09IG51bGwpIHtcclxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcInRoaXNcIiB2YXV0IG51bGwgb3UgbiBlc3QgcGFzIGTDqWZpbmknKTtcclxuICAgICAgfVxyXG4gICAgICB2YXIgTyA9IE9iamVjdCh0aGlzKTtcclxuICAgICAgdmFyIGxlbiA9IE8ubGVuZ3RoID4+PiAwO1xyXG4gICAgICBpZiAobGVuID09PSAwKSB7XHJcbiAgICAgICAgcmV0dXJuIC0xO1xyXG4gICAgICB9XHJcbiAgICAgIHZhciBuID0gK2Zyb21JbmRleCB8fCAwO1xyXG4gICAgICBpZiAoTWF0aC5hYnMobikgPT09IEluZmluaXR5KSB7XHJcbiAgICAgICAgbiA9IDA7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKG4gPj0gbGVuKSB7XHJcbiAgICAgICAgcmV0dXJuIC0xO1xyXG4gICAgICB9XHJcbiAgICAgIGsgPSBNYXRoLm1heChuID49IDAgPyBuIDogbGVuIC0gTWF0aC5hYnMobiksIDApO1xyXG4gICAgICB3aGlsZSAoayA8IGxlbikge1xyXG4gICAgICAgIGlmIChrIGluIE8gJiYgT1trXSA9PT0gc2VhcmNoRWxlbWVudCkge1xyXG4gICAgICAgICAgcmV0dXJuIGs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGsrKztcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gLTE7XHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLy8gaWYgKHR5cGVvZiBPYmplY3QuYXNzaWduICE9ICdmdW5jdGlvbicpIHtcclxuICAvLyAgIE9iamVjdC5hc3NpZ24gPSBmdW5jdGlvbiAodGFyZ2V0LCB2YXJBcmdzKSB7IC8vIC5sZW5ndGggb2YgZnVuY3Rpb24gaXMgMlxyXG4gIC8vICAgICAndXNlIHN0cmljdCc7XHJcbiAgLy8gICAgIGlmICh0YXJnZXQgPT0gbnVsbCkgeyAvLyBUeXBlRXJyb3IgaWYgdW5kZWZpbmVkIG9yIG51bGxcclxuICAvLyAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdDYW5ub3QgY29udmVydCB1bmRlZmluZWQgb3IgbnVsbCB0byBvYmplY3QnKTtcclxuICAvLyAgICAgfVxyXG5cclxuICAvLyAgICAgdmFyIHRvID0gT2JqZWN0KHRhcmdldCk7XHJcblxyXG4gIC8vICAgICBmb3IgKHZhciBpbmRleCA9IDE7IGluZGV4IDwgYXJndW1lbnRzLmxlbmd0aDsgaW5kZXgrKykge1xyXG4gIC8vICAgICAgIHZhciBuZXh0U291cmNlID0gYXJndW1lbnRzW2luZGV4XTtcclxuXHJcbiAgLy8gICAgICAgaWYgKG5leHRTb3VyY2UgIT0gbnVsbCkgeyAvLyBTa2lwIG92ZXIgaWYgdW5kZWZpbmVkIG9yIG51bGxcclxuICAvLyAgICAgICAgIGZvciAodmFyIG5leHRLZXkgaW4gbmV4dFNvdXJjZSkge1xyXG4gIC8vICAgICAgICAgICAvLyBBdm9pZCBidWdzIHdoZW4gaGFzT3duUHJvcGVydHkgaXMgc2hhZG93ZWRcclxuICAvLyAgICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChuZXh0U291cmNlLCBuZXh0S2V5KSkge1xyXG4gIC8vICAgICAgICAgICAgIHRvW25leHRLZXldID0gbmV4dFNvdXJjZVtuZXh0S2V5XTtcclxuICAvLyAgICAgICAgICAgfVxyXG4gIC8vICAgICAgICAgfVxyXG4gIC8vICAgICAgIH1cclxuICAvLyAgICAgfVxyXG4gIC8vICAgICByZXR1cm4gdG87XHJcbiAgLy8gICB9O1xyXG4gIC8vIH1cclxuXHJcbiAgLy8gaHR0cDovL3BhdWxpcmlzaC5jb20vMjAxMS9yZXF1ZXN0YW5pbWF0aW9uZnJhbWUtZm9yLXNtYXJ0LWFuaW1hdGluZy9cclxuICAvLyBodHRwOi8vbXkub3BlcmEuY29tL2Vtb2xsZXIvYmxvZy8yMDExLzEyLzIwL3JlcXVlc3RhbmltYXRpb25mcmFtZS1mb3Itc21hcnQtZXItYW5pbWF0aW5nXHJcbiAgLy8gcmVxdWVzdEFuaW1hdGlvbkZyYW1lIHBvbHlmaWxsIGJ5IEVyaWsgTcO2bGxlci4gZml4ZXMgZnJvbSBQYXVsIElyaXNoIGFuZCBUaW5vIFppamRlbFxyXG4gIC8vIE1JVCBsaWNlbnNlXHJcblxyXG4gIChmdW5jdGlvbigpIHtcclxuICAgIHZhciBsYXN0VGltZSA9IDA7XHJcbiAgICB2YXIgdmVuZG9ycyA9IFsnbXMnLCAnbW96JywgJ3dlYmtpdCcsICdvJ107XHJcbiAgICBmb3IodmFyIHggPSAwOyB4IDwgdmVuZG9ycy5sZW5ndGggJiYgIXdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWU7ICsreCkge1xyXG4gICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gd2luZG93W3ZlbmRvcnNbeF0rJ1JlcXVlc3RBbmltYXRpb25GcmFtZSddO1xyXG4gICAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSB3aW5kb3dbdmVuZG9yc1t4XSsnQ2FuY2VsQW5pbWF0aW9uRnJhbWUnXVxyXG4gICAgICAgIHx8IHdpbmRvd1t2ZW5kb3JzW3hdKydDYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoIXdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUpXHJcbiAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSBmdW5jdGlvbihjYWxsYmFjaywgZWxlbWVudCkge1xyXG4gICAgICAgIHZhciBjdXJyVGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xyXG4gICAgICAgIHZhciB0aW1lVG9DYWxsID0gTWF0aC5tYXgoMCwgMTYgLSAoY3VyclRpbWUgLSBsYXN0VGltZSkpO1xyXG4gICAgICAgIHZhciBpZCA9IHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBjYWxsYmFjayhjdXJyVGltZSArIHRpbWVUb0NhbGwpOyB9LFxyXG4gICAgICAgICAgdGltZVRvQ2FsbCk7XHJcbiAgICAgICAgbGFzdFRpbWUgPSBjdXJyVGltZSArIHRpbWVUb0NhbGw7XHJcbiAgICAgICAgcmV0dXJuIGlkO1xyXG4gICAgICB9O1xyXG5cclxuICAgIGlmICghd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKVxyXG4gICAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSBmdW5jdGlvbihpZCkge1xyXG4gICAgICAgIGNsZWFyVGltZW91dChpZCk7XHJcbiAgICAgIH07XHJcbiAgfSgpKTtcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIFBVQkxJQyBNRVRIT0RTLlxyXG4gICAqIFxyXG4gICAqL1xyXG5cclxuICByZXR1cm4ge1xyXG5cclxuICAgIC8vIEVudHJ5IHBvaW50IHRvIGNyZWF0ZSBuZXcgc2xpZGUgaW5zdGFuY2UuXHJcbiAgICBnZXRJbnN0YW5jZTogZnVuY3Rpb24oICBvcHRpb25zICkge1xyXG4gICAgICB2YXIgaSA9IG5ldyBEaWFwUGFydCgpO1xyXG4gICAgICBpLmluaXQoIG9wdGlvbnMgKTtcclxuICAgICAgcmV0dXJuIGk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIENhbGwgaXQgdG8gZXh0ZW5kIGNvcmUuXHJcbiAgICByZWdpc3Rlck1vZGU6IGZ1bmN0aW9uICggbmFtZSwgcGFyYW0gKSB7XHJcblxyXG4gICAgICAvLyBDaGVjayBpZiBtb2RlJ3MgbmFtZSBpcyBmcmVlLlxyXG4gICAgICBpZiAoIGRlZmF1bHRzLm1vZGVzW25hbWVdICkgdGhyb3cgbmV3IEVycm9yKCBcIk5hbWUgc3BhY2UgZm9yICdcIiArIG5hbWUgKyBcIicgYWxyZWFkeSBleGlzdC4gQ2hvb3NlIGFuIG90aGVyIG1vZHVsZSBuYW1lLlwiICk7XHJcblxyXG4gICAgICAvLyBSZWdpc3RlciBuZXcgbW9kZS5cclxuICAgICAgZGVmYXVsdHMubW9kZXNbbmFtZV0gPSB0cnVlO1xyXG5cclxuICAgICAgLy8gRXh0ZW5kIGRlZmF1bHRzLCBQYXJ0aWNsZXMgYW5kIE1hdHJpeCBjbGFzcy5cclxuICAgICAgZm4uc2ltcGxlRXh0ZW5kKCBkZWZhdWx0cywgcGFyYW0ub3B0aW9ucyApO1xyXG4gICAgICBmbi5zaW1wbGVFeHRlbmQoIERpYXBQYXJ0LnByb3RvdHlwZSwgcGFyYW0ucHJvdG8gKTtcclxuICAgICAgZm4uc2ltcGxlRXh0ZW5kKCBQYXJ0aWNsZS5wcm90b3R5cGUsIHBhcmFtLnByb3RvX3BhcnRpY2xlcyApO1xyXG4gICAgICBmbi5zaW1wbGVFeHRlbmQoIE1hdHJpeC5wcm90b3R5cGUsIHBhcmFtLnByb3RvX21hdHJpeCApO1xyXG4gICAgICBcclxuICAgICAgLy8gUmVnaXN0ZXIgbmV3IG1vZGUgZmlsdGVycywgcHJvY2VlZCBhbmQgbWF0cml4TWV0aG9kLlxyXG4gICAgICBmaWx0ZXJzW25hbWVdID0gcGFyYW0uc2NlbmFyaW8uZmlsdGVycztcclxuICAgICAgcHJvY2VlZFtuYW1lXSA9IHBhcmFtLnNjZW5hcmlvLnByb2NlZWQ7XHJcbiAgICAgIG1hdHJpeE1ldGhvZFtuYW1lXSA9IHBhcmFtLnNjZW5hcmlvLm1hdHJpeE1ldGhvZDtcclxuICAgIH1cclxuICB9O1xyXG5cclxufSkodGhpcywgdGhpcy5kb2N1bWVudCk7Iiwic2xpZGVQYXJ0aWNsZXMucmVnaXN0ZXJNb2RlKCAnbW9kZUNvbG9yJywge1xyXG4gIG9wdGlvbnM6IHt9LFxyXG4gIHByb3RvOiB7fSxcclxuICBwcm90b19wYXJ0aWNsZXM6IHtcclxuICAgIHNvdW1pc0NvbG9yOiBmdW5jdGlvbigpe1xyXG4gICAgICB0aGlzLmluRm9ybSA9IDA7XHJcbiAgICAgIHZhciB0ZXN0WCA9IE1hdGguZmxvb3IoIHRoaXMucG9zaXRpb24ueCApO1xyXG4gICAgICB2YXIgdGVzdFkgPSBNYXRoLmZsb29yKCB0aGlzLnBvc2l0aW9uLnkgKTtcclxuICAgICAgdGhpcy5jb2xvciA9ICggdGhpcy5pbnN0YW5jZS5hY3RpdmVJbmRleCAhPT0gbnVsbCApID8gdGhpcy5pbnN0YW5jZS5tYXRyaXhUYWJbdGhpcy5pbnN0YW5jZS5hY3RpdmVJbmRleF0uZ2V0TWF0cml4KClbdGVzdFhdW3Rlc3RZXSA6IHRoaXMuaW5zdGFuY2Uuc2V0dGluZ3MucGFydGljbGVDb2xvcjtcclxuICAgIH1cclxuICB9LFxyXG4gIHByb3RvX21hdHJpeDoge1xyXG4gICAgY29sb3JNYXRyaXg6IGZ1bmN0aW9uICggbWF0cml4ICkge1xyXG5cclxuICAgICAgdmFyIGksIGosIHIsIGcsIGIsIHAgPSB0aGlzLmNvbnRleHQuZ2V0SW1hZ2VEYXRhKCAwLCAwLCB0aGlzLmluc3RhbmNlLmNhbnZhcy53aWR0aCwgdGhpcy5pbnN0YW5jZS5jYW52YXMuaGVpZ2h0ICkuZGF0YTtcclxuXHJcbiAgICAgIGZvciggaSA9IDA7IGkgPCB0aGlzLmNhbnZhcy53aWR0aDsgaSsrICl7XHJcbiAgICAgICAgZm9yKCBqID0gMDsgaiA8IHRoaXMuY2FudmFzLmhlaWdodDsgaisrICl7XHJcbiAgICAgICAgICByID0gcFsoKHRoaXMuaW5zdGFuY2UuY2FudmFzLndpZHRoICogaikgKyBpKSAqIDRdO1xyXG4gICAgICAgICAgZyA9IHBbKCh0aGlzLmluc3RhbmNlLmNhbnZhcy53aWR0aCAqIGopICsgaSkgKiA0ICsgMV07XHJcbiAgICAgICAgICBiID0gcFsoKHRoaXMuaW5zdGFuY2UuY2FudmFzLndpZHRoICogaikgKyBpKSAqIDQgKyAyXTtcclxuICAgICAgICAgIG1hdHJpeFtpXVtqXSA9ICdyZ2JhKCcgKyByICsgJywgJyArIGcgKyAnLCAnICsgYiArICcsIDEpJztcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9LFxyXG4gIGZpbHRlcjoge30sXHJcbiAgc2NlbmFyaW86IHtcclxuICAgIGZpbHRlcnM6IHtcclxuICAgICAgbmFtZTogbnVsbCxcclxuICAgICAgcGFyYW06IG51bGxcclxuICAgIH0sXHJcbiAgICBwcm9jZWVkOiBbJ3NvdW1pc0NoYW1wJywgJ3NvdW1pc0NvbG9yJ10sXHJcbiAgICBtYXRyaXhNZXRob2Q6ICdjb2xvck1hdHJpeCdcclxuICB9XHJcbn0pOyJdfQ==
