

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUuanMiLCJjb2xvci5qcyJdLCJuYW1lcyI6WyJzbGlkZVBhcnRpY2xlcyIsIndpbmRvdyIsImRvY3VtZW50IiwidW5kZWZpbmVkIiwiZm4iLCJmaWx0ZXIiLCJwcm9jZWVkIiwiZmlsdGVycyIsIm1hdHJpeE1ldGhvZCIsIm9vIiwiZ2V0UHJvdG8iLCJPYmplY3QiLCJnZXRQcm90b3R5cGVPZiIsImRlZmF1bHRzIiwiaGVpZ2h0Iiwid2lkdGgiLCJiYWNrZ3JvdW5kIiwidGhyZXNob2xkTkIiLCJ0YXJnZXRFbGVtZW50IiwiaW5wdXRGaWxlSUQiLCJ0aHVtZG5haWxzSUQiLCJwYW5lbElEIiwidGh1bWJXaWR0aCIsInRodW1iSGVpZ2h0IiwidGV4dCIsIm1hc3MiLCJhbnRpTWFzcyIsImRlbnNpdHkiLCJwYXJ0aWNsZVNpemUiLCJwYXJ0aWNsZUNvbG9yIiwidGV4dENvbG9yIiwiZm9udCIsImZvbnRTaXplIiwiaW5pdGlhbFZlbG9jaXR5IiwibWFzc1giLCJtYXNzWSIsImluaXRpYWxNb2RlIiwiZHJhdyIsInN0b3AiLCJzd2l0Y2hNb2RlQ2FsbGJhY2siLCJtb2RlcyIsIm1vZGVGb3JtIiwiYmxhY2tBbmRXaGl0ZSIsInBpeGVscyIsInRocmVzaG9sZCIsImkiLCJyIiwiZyIsImIiLCJ2IiwiZCIsImRhdGEiLCJsZW5ndGgiLCJuYW1lIiwicGFyYW0iLCJnZXRWaWV3cG9ydCIsInciLCJNYXRoIiwibWF4IiwiZG9jdW1lbnRFbGVtZW50IiwiY2xpZW50V2lkdGgiLCJpbm5lcldpZHRoIiwiaCIsImNsaWVudEhlaWdodCIsImlubmVySGVpZ2h0IiwiYXBwZW5kIiwidGFyZ2V0IiwiZWxlbWVudCIsImdldEVsZW1lbnRCeUlkIiwiYXBwZW5kQ2hpbGQiLCJpc1BsYWluT2JqZWN0IiwicHJvdG8iLCJDdG9yIiwidG9TdHJpbmciLCJjYWxsIiwiaGFzT3duUHJvcGVydHkiLCJjb25zdHJ1Y3RvciIsInByb3RvdHlwZSIsInNpbXBsZUV4dGVuZCIsImEiLCJjbG9uZSIsInNyYyIsImNvcHkiLCJpc0FuQXJyYXkiLCJrZXkiLCJBcnJheSIsImlzQXJyYXkiLCJNYXRyaXgiLCJpbnN0YW5jZSIsImlucHV0IiwiY3VzdG9tU2l6ZSIsInR5cGUiLCJwaWN0dXJlIiwiY2FudmFzIiwiZ2V0Q2FudmFzIiwiY29udGV4dCIsImdldENvbnRleHQyRCIsInNpemUiLCJnZXRJbWFnZVNpemUiLCJ4IiwieSIsIm1hdHJpeCIsImJ1aWxkQWxsTWF0cml4IiwiY2xlYXIiLCJjbGVhclJlY3QiLCJnZXRQaXhlbHMiLCJkcmF3SW1hZ2UiLCJzZXRUZXh0IiwiZ2V0SW1hZ2VEYXRhIiwiY2xlYXJlZCIsInRyaW0iLCJjbGVhck1hdHJpeCIsImxpbmVzIiwic3BsaXQiLCJzZXR0aW5ncyIsImZpbGxTdHlsZSIsInRleHRBbGlnbiIsImZpbGxUZXh0IiwiZmxvb3IiLCJtZWFzdXJlVGV4dCIsImFwcGx5RmlsdGVyIiwiYXJnQXJyYXkiLCJwIiwiYXJncyIsInB1c2giLCJhcHBseSIsInB1dEltYWdlRGF0YSIsIm0iLCJtQSIsIm1vZGUiLCJjcmVhTWF0cml4IiwiZ2V0TWF0cml4IiwibWF0IiwiaiIsInZhbHVlIiwibCIsInZhbHVlTWF0cml4IiwibWluIiwiYyIsInBpeCIsInJlbmRlclRodW1ibmFpbHMiLCJzZWxmIiwib25jbGljayIsImUiLCJnb1RvIiwiY2xlYXJQYXJ0cyIsImxpYmVyYXRpb25QYXJ0czEiLCJ0aHVtYk9yaWdpbmFsVGFiIiwiRGlhcFBhcnQiLCJtYXRyaXhUYWIiLCJwYXJ0aWNsZXMiLCJjaGFtcHMiLCJsaWJlcmF0aW9uIiwiYWN0aXZlSW5kZXgiLCJpbml0Iiwib3B0aW9ucyIsInN0eWxlIiwiYmFja2dyb3VuZENvbG9yIiwiY2VudGVyTWFzcyIsIkNoYW1wIiwiVmVjdG9yIiwibG9vcCIsInNldCIsImNyZWF0ZVNsaWRlIiwiY3JlYXRlRWxlbWVudCIsInMiLCJnZXRDb250ZXh0IiwiaW1nIiwiY3ciLCJjaCIsInJhdGlvIiwicm91bmQiLCJsb2FkIiwidGh1bWIiLCJmaWxlcyIsImZpbGUiLCJtYXRjaCIsInJlYWRlciIsIkZpbGVSZWFkZXIiLCJvbmxvYWQiLCJldmVudCIsIkltYWdlIiwicmVzdWx0IiwicmVhZEFzRGF0YVVSTCIsInN3aXRjaE1vZGUiLCJhZGRNYXNzIiwicGFydFByb2NlZWQiLCJwYXJ0aWNsZSIsImluZGV4T2YiLCJkZWxheSIsInNldFRpbWVvdXQiLCJjcmVhUGFydHMiLCJuYiIsIlBhcnRpY2xlIiwicmFuZG9tIiwicmVhbFJhbmRvbSIsInVwZ3JhZGVQYXJ0cyIsImN1cnJlbnRQYXJ0cyIsInBvcyIsInBvc2l0aW9uIiwibW92ZSIsImRyYXdQYXJ0cyIsIm4iLCJjb2xvciIsImZpbGxSZWN0IiwiaW5Gb3JtIiwicXVldWUiLCJyZXF1ZXN0SUQiLCJyZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJiaW5kIiwiY2FuY2VsQW5pbWF0aW9uRnJhbWUiLCJ1cGRhdGUiLCJzdGFydCIsImNvcyIsIlBJIiwiYWRkIiwidmVjdG9yIiwiZ2V0SW52ZXJ0IiwiZ2V0TWFnbml0dWRlIiwic3FydCIsImdldEFuZ2xlIiwiYXRhbjIiLCJmcm9tQW5nbGUiLCJhbmdsZSIsIm1hZ25pdHVkZSIsInNpbiIsInZpdGVzc2UiLCJhY2NlbGVyYXRpb24iLCJzb3VtaXNDaGFtcCIsInRvdGFsQWNjZWxlcmF0aW9uWCIsInRvdGFsQWNjZWxlcmF0aW9uWSIsImRpc3RYIiwiZGlzdFkiLCJmb3JjZSIsInBvdyIsInNvdW1pc0Zvcm0iLCJ0ZXN0WCIsInRlc3RZIiwicG9pbnQiLCJzZXRNYXNzIiwic2VhcmNoRWxlbWVudCIsImZyb21JbmRleCIsImsiLCJUeXBlRXJyb3IiLCJPIiwibGVuIiwiYWJzIiwiSW5maW5pdHkiLCJsYXN0VGltZSIsInZlbmRvcnMiLCJjYWxsYmFjayIsImN1cnJUaW1lIiwiRGF0ZSIsImdldFRpbWUiLCJ0aW1lVG9DYWxsIiwiaWQiLCJjbGVhclRpbWVvdXQiLCJnZXRJbnN0YW5jZSIsInJlZ2lzdGVyTW9kZSIsIkVycm9yIiwicHJvdG9fcGFydGljbGVzIiwicHJvdG9fbWF0cml4Iiwic2NlbmFyaW8iLCJzb3VtaXNDb2xvciIsImNvbG9yTWF0cml4Il0sIm1hcHBpbmdzIjoiOztBQUVBLElBQUlBLGlCQUFrQixVQUFVQyxNQUFWLEVBQWtCQyxRQUFsQixFQUE0QkMsU0FBNUIsRUFBdUM7O0FBRXpEOztBQUVBLE1BQUlDLEVBQUo7QUFBQSxNQUFRQyxNQUFSO0FBQUEsTUFBZ0JDLE9BQWhCO0FBQUEsTUFBeUJDLE9BQXpCO0FBQUEsTUFBa0NDLFlBQWxDO0FBQUEsTUFBZ0RDLEtBQUssRUFBckQ7QUFBQSxNQUF5REMsV0FBV0MsT0FBT0MsY0FBM0U7OztBQUVBO0FBQ0FDLGFBQVc7QUFDVEMsWUFBUSxHQURDO0FBRVRDLFdBQU8sR0FGRTtBQUdUQyxnQkFBWSxNQUhIO0FBSVRDLGlCQUFhLENBQUMsR0FBRCxDQUpKO0FBS1RDLG1CQUFlLFdBTE47QUFNVEMsaUJBQWEsY0FOSjtBQU9UQyxrQkFBYyxVQVBMO0FBUVRDLGFBQVMsbUJBUkE7QUFTVEMsZ0JBQVksR0FUSDtBQVVUQyxpQkFBYSxHQVZKO0FBV1RDLFVBQUssU0FYSTtBQVlUQyxVQUFNLEdBWkc7QUFhVEMsY0FBVSxDQUFDLEdBYkY7QUFjVEMsYUFBUyxJQWRBO0FBZVRDLGtCQUFjLENBZkw7QUFnQlRDLG1CQUFlLE1BaEJOO0FBaUJUQyxlQUFXLE1BakJGO0FBa0JUQyxVQUFNLE9BbEJHO0FBbUJUQyxjQUFVLEVBbkJEO0FBb0JUQyxxQkFBaUIsQ0FwQlI7QUFxQlRDLFdBQU8sR0FyQkU7QUFzQlRDLFdBQU8sR0F0QkU7QUF1QlRDLGlCQUFhLFVBdkJKO0FBd0JUQyxVQUFNLEtBeEJHO0FBeUJUQyxVQUFNLEtBekJHO0FBMEJUQyx3QkFBb0IsSUExQlg7QUEyQlRDLFdBQU87QUFDTEMsZ0JBQVU7QUFETDtBQTNCRSxHQUhYOztBQW9DQTs7OztBQUlBcEMsV0FBUztBQUNQO0FBQ0FxQyxtQkFBZSxVQUFXQyxNQUFYLEVBQW1CQyxTQUFuQixFQUErQjtBQUM1QyxVQUFL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QUFULEVBQVlBLElBQUksS0FBS3hDLE1BQUwsQ0FBWS9FLE1BQTVCLEVBQW9DdUgsR0FBcEMsRUFBeUM7QUFDdkN2RixjQUFJNEUsRUFBRSxDQUFFLEtBQUtsQyxRQUFMLENBQWNLLE1BQWQsQ0FBcUI5RSxLQUFyQixHQUE2QnNILENBQTlCLEdBQW1DeEYsQ0FBcEMsSUFBeUMsQ0FBM0MsQ0FBSjtBQUNBRSxjQUFJMkUsRUFBRSxDQUFFLEtBQUtsQyxRQUFMLENBQWNLLE1BQWQsQ0FBcUI5RSxLQUFyQixHQUE2QnNILENBQTlCLEdBQW1DeEYsQ0FBcEMsSUFBeUMsQ0FBekMsR0FBNkMsQ0FBL0MsQ0FBSjtBQUNBRyxjQUFJMEUsRUFBRSxDQUFFLEtBQUtsQyxRQUFMLENBQWNLLE1BQWQsQ0FBcUI5RSxLQUFyQixHQUE2QnNILENBQTlCLEdBQW1DeEYsQ0FBcEMsSUFBeUMsQ0FBekMsR0FBNkMsQ0FBL0MsQ0FBSjtBQUNBd0QsaUJBQU94RCxDQUFQLEVBQVV3RixDQUFWLElBQWUsVUFBVXZGLENBQVYsR0FBYyxJQUFkLEdBQXFCQyxDQUFyQixHQUF5QixJQUF6QixHQUFnQ0MsQ0FBaEMsR0FBb0MsTUFBbkQ7QUFDRDtBQUNGO0FBQ0Y7QUFiVyxHQVgwQjtBQTBCeEMzQyxVQUFRLEVBMUJnQztBQTJCeENpUSxZQUFVO0FBQ1IvUCxhQUFTO0FBQ1A4QyxZQUFNLElBREM7QUFFUEMsYUFBTztBQUZBLEtBREQ7QUFLUmhELGFBQVMsQ0FBQyxhQUFELEVBQWdCLGFBQWhCLENBTEQ7QUFNUkUsa0JBQWM7QUFOTjtBQTNCOEIsQ0FBMUMiLCJmaWxlIjoic2xpZGUtcGFydGljbGVzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXHJcblxyXG52YXIgc2xpZGVQYXJ0aWNsZXMgPSAoZnVuY3Rpb24gKHdpbmRvdywgZG9jdW1lbnQsIHVuZGVmaW5lZCkge1xyXG5cclxuICAgIFwidXNlIHN0cmljdFwiO1xyXG5cclxuICAgIHZhciBmbiwgZmlsdGVyLCBwcm9jZWVkLCBmaWx0ZXJzLCBtYXRyaXhNZXRob2QsIG9vID0ge30sIGdldFByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mLFxyXG4gICAgXHJcbiAgICAvLyBEZWZhdWx0cyBzZXR0aW5ncy5cclxuICAgIGRlZmF1bHRzID0ge1xyXG4gICAgICBoZWlnaHQ6IDUwMCxcclxuICAgICAgd2lkdGg6IDUwMCxcclxuICAgICAgYmFja2dyb3VuZDogJyNmZmYnLFxyXG4gICAgICB0aHJlc2hvbGROQjogWzEyOF0sXHJcbiAgICAgIHRhcmdldEVsZW1lbnQ6ICdkcC1jYW52YXMnLFxyXG4gICAgICBpbnB1dEZpbGVJRDogJ2RwLWZpbGVpbnB1dCcsXHJcbiAgICAgIHRodW1kbmFpbHNJRDogJ2RwLXRodW1iJyxcclxuICAgICAgcGFuZWxJRDogJ2RwLXBhbmVsLXNldHRpbmdzJyxcclxuICAgICAgdGh1bWJXaWR0aDogMTAwLFxyXG4gICAgICB0aHVtYkhlaWdodDogMTAwLFxyXG4gICAgICB0ZXh0OidTYWx1dCAhJyxcclxuICAgICAgbWFzczogMTAwLFxyXG4gICAgICBhbnRpTWFzczogLTUwMCxcclxuICAgICAgZGVuc2l0eTogMTUwMCxcclxuICAgICAgcGFydGljbGVTaXplOiAxLFxyXG4gICAgICBwYXJ0aWNsZUNvbG9yOiAnIzAwMCcsXHJcbiAgICAgIHRleHRDb2xvcjogJyNmZmYnLFxyXG4gICAgICBmb250OiAnQXJpYWwnLFxyXG4gICAgICBmb250U2l6ZTogNDAsXHJcbiAgICAgIGluaXRpYWxWZWxvY2l0eTogMyxcclxuICAgICAgbWFzc1g6IDg4MCxcclxuICAgICAgbWFzc1k6IDM3MCxcclxuICAgICAgaW5pdGlhbE1vZGU6ICdtb2RlRm9ybScsXHJcbiAgICAgIGRyYXc6IGZhbHNlLFxyXG4gICAgICBzdG9wOiBmYWxzZSxcclxuICAgICAgc3dpdGNoTW9kZUNhbGxiYWNrOiBudWxsLFxyXG4gICAgICBtb2Rlczoge1xyXG4gICAgICAgIG1vZGVGb3JtOiB0cnVlLFxyXG4gICAgICB9IFxyXG4gICAgfTtcclxuXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBbGwgaW1hZ2UgZmlsdGVycyBmdW5jdGlvbi5cclxuICAgICAqIFxyXG4gICAgICovXHJcbiAgICBmaWx0ZXIgPSB7XHJcbiAgICAgIC8vIFR1cm4gY29sb3JlZCBwaWN0dXJlIG9uIGJsYWNrIGFuZCB3aGl0ZS4gVXNlZCBmb3IgbW9kZUZvcm0uXHJcbiAgICAgIGJsYWNrQW5kV2hpdGU6IGZ1bmN0aW9uICggcGl4ZWxzLCB0aHJlc2hvbGQgKSB7XHJcbiAgICAgICAgaWYgKCAhcGl4ZWxzICkgcmV0dXJuIHBpeGVscztcclxuICAgICAgICB2YXIgaSwgciwgZywgYiwgdiwgZCA9IHBpeGVscy5kYXRhO1xyXG4gICAgICAgIGZvciAoIGkgPSAwOyBpIDwgZC5sZW5ndGg7IGkrPTQgKSB7XHJcbiAgICAgICAgICByID0gZFtpXTtcclxuICAgICAgICAgIGcgPSBkW2krMV07XHJcbiAgICAgICAgICBiID0gZFtpKzJdO1xyXG4gICAgICAgICAgdiA9ICgwLjIxMjYqciArIDAuNzE1MipnICsgMC4wNzIyKmIgPj0gdGhyZXNob2xkKSA/IDI1NSA6IDA7XHJcbiAgICAgICAgICBkW2ldID0gZFtpKzFdID0gZFtpKzJdID0gdlxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcGl4ZWxzO1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogRWFjaCBtb2RlcyByZWdpc3RlcmVkIG5lZWQgYW4gZW50cnkgb24gZmlsdGVycyBvYmplY3QuXHJcbiAgICAgKiBJdCBwZXJtaXQgdG8gY2FsbCBjb3JyZXNwb25kaW5nIGZpbHRlciBmdW5jdGlvbiBmb3IgZWFjaCBtb2RlIHJlZ2lzdGVyZWQuXHJcbiAgICAgKiBUaGUgY29ycmVzcG9uZGluZyBmaWx0ZXIgZm9uY3Rpb24gaXMgY2FsbGVkIHdoZW4gbWF0cml4IGFyZSBidWlsdC5cclxuICAgICAqIFxyXG4gICAgICogQnkgZGVmYXVsdCwgdGhlcmUgaXMgb25seSBvbmUgbW9kZSA6IG1vZGVGb3JtLlxyXG4gICAgICogSWYgYSBtb2RlIGRvbid0IG5lZWQgZmlsdGVyLCBzZXQge30gdG8gdGhlIG1vZGUgbmFtZSBlbnRyeS5cclxuICAgICAqIFxyXG4gICAgICogbmFtZSA6IG5hbWUgb2YgdGhlIGZpbHRlciBmdW5jdGlvbiBhdHRhY2ggdG8gZmlsdGVyIG9iamVjdC5cclxuICAgICAqIHBhcmFtIDoga2V5IHRhcmdldHRpbmcgdGhlIHNldHRpbmdzIHBhcmFtZXRlciwgcGFzc2luZyBhcyBhcmd1bWVudCB3aGVuIGZpbHRlciBmdW5jdGlvbiBpcyBjYWxsZWQuIE11c3QgYmUgYW4gQXJyYXkgaW4gc2V0dGluZ3MuXHJcbiAgICAgKiBcclxuICAgICovIFxyXG4gICAgZmlsdGVycyA9IHtcclxuICAgICAgbW9kZUZvcm06IHtcclxuICAgICAgICBuYW1lOiAnYmxhY2tBbmRXaGl0ZScsXHJcbiAgICAgICAgcGFyYW06ICd0aHJlc2hvbGROQidcclxuICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogRm9yIGVhY2ggbW9kZSwgcmVnaXN0ZXIgYWxsIG1ldGhvZHMgdG8gYXBwbHkgZm9yIGVhY2hlIFBhcnRpY2xlcyBpbnN0YW5jZSBpbiB0aGUgbG9vcC5cclxuICAgKiBNdXN0IGJlIGEgUGFydGljbGVzIG1ldGhvZC5cclxuICAgKiAtLS0tLT4gc2VlIERpYXBQYXJ0LnByb3RvdHlwZS5wYXJ0UHJvY2VlZFxyXG4gICAqIFxyXG4gICAqL1xyXG4gICAgcHJvY2VlZCA9IHtcclxuICAgICAgbW9kZUZvcm06IFsnc291bWlzQ2hhbXAnLCAnc291bWlzRm9ybSddXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIEZvciBlYWNoIG1vZGUsIHJlZ2lzdGVyIHRoZSBNYXRyaXggbWV0aG9kIGNhbGxlZCB0byBjcmVhdGUgdGhlIG1hdHJpeCAoMiBkaW1lbnRpb25hbCBhcnJheSkuXHJcbiAgICBtYXRyaXhNZXRob2QgPSB7XHJcbiAgICAgIG1vZGVGb3JtOiAndmFsdWVNYXRyaXgnXHJcbiAgICB9O1xyXG5cclxuXHJcbiAgICAvLyBVdGlsaXR5IGZ1bmN0aW9ucy5cclxuICAgIGZuID0ge1xyXG4gICAgICAvLyBSZXR1cm4gdmlld3BvcnQgc2l6ZS5cclxuICAgICAgZ2V0Vmlld3BvcnQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICB3OiBNYXRoLm1heChkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50V2lkdGgsIHdpbmRvdy5pbm5lcldpZHRoIHx8IDApLFxyXG4gICAgICAgICAgaDogTWF0aC5tYXgoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodCwgd2luZG93LmlubmVySGVpZ2h0IHx8IDApXHJcbiAgICAgICAgfTtcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIEFwcGVuZCBlbGVtZW50IGluIHRhcmdldC5cclxuICAgICAgYXBwZW5kOiBmdW5jdGlvbiAoIHRhcmdldCwgZWxlbWVudCApIHtcclxuICAgICAgICBpZiAoIHR5cGVvZiB0YXJnZXQgPT09ICdzdHJpbmcnICkge1xyXG4gICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIHRhcmdldCApLmFwcGVuZENoaWxkKCBlbGVtZW50ICk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgdGFyZ2V0LmFwcGVuZENoaWxkKCBlbGVtZW50ICk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gVGVzdCBpZiB0YXJnZXQgaXMgcGxhaW4gb2JqZWN0LiBUaGFuayB5b3UgalF1ZXJ5IDMrICFcclxuICAgICAgaXNQbGFpbk9iamVjdDogZnVuY3Rpb24gKCB0YXJnZXQgKSB7XHJcbiAgICAgICAgdmFyIHByb3RvLCBDdG9yO1xyXG4gICAgICAgIC8vIERldGVjdCBvYnZpb3VzIG5lZ2F0aXZlc1xyXG4gICAgICAgIC8vIFVzZSB0b1N0cmluZyBpbnN0ZWFkIG9mIGpRdWVyeS50eXBlIHRvIGNhdGNoIGhvc3Qgb2JqZWN0c1xyXG4gICAgICAgIGlmICggIXRhcmdldCB8fCBvby50b1N0cmluZy5jYWxsKCB0YXJnZXQgKSAhPT0gXCJbb2JqZWN0IE9iamVjdF1cIiApIHtcclxuICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcHJvdG8gPSBnZXRQcm90byggdGFyZ2V0ICk7XHJcbiAgICAgICAgLy8gT2JqZWN0cyB3aXRoIG5vIHByb3RvdHlwZSAoZS5nLiwgYE9iamVjdC5jcmVhdGUoIG51bGwgKWApIGFyZSBwbGFpblxyXG4gICAgICAgIGlmICggIXByb3RvICkge1xyXG4gICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIE9iamVjdHMgd2l0aCBwcm90b3R5cGUgYXJlIHBsYWluIGlmZiB0aGV5IHdlcmUgY29uc3RydWN0ZWQgYnkgYSBnbG9iYWwgT2JqZWN0IGZ1bmN0aW9uXHJcbiAgICAgICAgQ3RvciA9IG9vLmhhc093blByb3BlcnR5LmNhbGwoIHByb3RvLCBcImNvbnN0cnVjdG9yXCIgKSAmJiBwcm90by5jb25zdHJ1Y3RvcjtcclxuICAgICAgICByZXR1cm4gdHlwZW9mIEN0b3IgPT09IFwiZnVuY3Rpb25cIiAmJiBvby5oYXNPd25Qcm9wZXJ0eS5jYWxsKCBDdG9yLnByb3RvdHlwZSwgXCJpc1Byb3RvdHlwZU9mXCIpO1xyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gRGVlcGx5IGV4dGVuZCBhIG9iamVjdCB3aXRoIGIgb2JqZWN0IHByb3BlcnRpZXMuXHJcbiAgICAgIHNpbXBsZUV4dGVuZDogZnVuY3Rpb24gKCBhLCBiICkge1xyXG4gICAgICAgIHZhciBjbG9uZSwgc3JjLCBjb3B5LCBpc0FuQXJyYXkgPSBmYWxzZTsgXHJcbiAgICAgICAgZm9yKCB2YXIga2V5IGluIGIgKSB7XHJcblxyXG4gICAgICAgICAgc3JjID0gYVsga2V5IF07XHJcblx0XHRcdFx0ICBjb3B5ID0gYlsga2V5IF07XHJcblxyXG4gICAgICAgICAgLy9Bdm9pZCBpbmZpbml0ZSBsb29wLlxyXG4gICAgICAgICAgaWYgKCBhID09PSBjb3B5ICkge1xyXG5cdFx0XHRcdFx0ICBjb250aW51ZTtcclxuXHRcdFx0XHQgIH1cclxuXHJcbiAgICAgICAgICBpZiggYi5oYXNPd25Qcm9wZXJ0eSgga2V5ICkgKSB7XHJcbiAgICAgICAgICAgIC8vIElmIHByb3BlcnRpZSBpcyBBcnJheSBvciBPYmplY3QuXHJcbiAgICAgICAgICAgIGlmKCBjb3B5ICYmICggZm4uaXNQbGFpbk9iamVjdCggY29weSApIHx8IChpc0FuQXJyYXkgPSBBcnJheS5pc0FycmF5LmNhbGwoIGNvcHkgKSkpKSB7XHJcbiAgICAgICAgICAgICAgaWYgKCBpc0FuQXJyYXkgKSB7XHJcbiAgICAgICAgICAgICAgICBpc0FuQXJyYXkgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIGNsb25lID0gKCBzcmMgJiYgc3JjLmlzQXJyYXkgKSA/IHNyYyA6IFtdO1xyXG4gICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjbG9uZSA9ICggc3JjICYmIGZuLmlzUGxhaW5PYmplY3QoIHNyYyApICkgPyBzcmMgOiB7fTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgLy8gQ3JlYXRlIG5ldyBBcnJheSBvciBPYmplY3QsIG5ldmVyIHJlZmVyZW5jZSBpdC5cclxuICAgICAgICAgICAgICBhWyBrZXkgXSA9IGZuLnNpbXBsZUV4dGVuZCggY2xvbmUsIGNvcHkgKTtcclxuXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBhWyBrZXkgXSA9IGNvcHk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGE7XHJcbiAgICAgIH1cclxuICAgIH07XHJcblxyXG4gIC8vIE1hdHJpeCBjbGFzcyBvYmplY3QuXHJcbiAgZnVuY3Rpb24gTWF0cml4ICggaW5zdGFuY2UsIGlucHV0LCBjdXN0b21TaXplICkge1xyXG4gICAgdGhpcy5pbnN0YW5jZSA9IGluc3RhbmNlO1xyXG4gICAgdGhpcy50eXBlID0gKCB0eXBlb2YgaW5wdXQgIT09ICdzdHJpbmcnICkgPyAncGljdHVyZScgOiAndGV4dCc7XHJcbiAgICB0aGlzLnBpY3R1cmUgPSBpbnB1dDtcclxuICAgIHRoaXMuY2FudmFzID0gdGhpcy5pbnN0YW5jZS5nZXRDYW52YXMoIGN1c3RvbVNpemUgKTtcclxuICAgIHRoaXMuY29udGV4dCA9IHRoaXMuaW5zdGFuY2UuZ2V0Q29udGV4dDJEKCB0aGlzLmNhbnZhcyApO1xyXG4gICAgdGhpcy5zaXplID0gKCB0eXBlb2YgaW5wdXQgIT09ICdzdHJpbmcnICkgPyB0aGlzLmluc3RhbmNlLmdldEltYWdlU2l6ZSggaW5wdXQsIGN1c3RvbVNpemUgKSA6IHt4OjAsIHk6MCwgdzowLCBoOjB9O1xyXG4gICAgdGhpcy5tYXRyaXggPSB0aGlzLmJ1aWxkQWxsTWF0cml4KCk7XHJcbiAgfVxyXG5cclxuICBNYXRyaXgucHJvdG90eXBlID0ge1xyXG5cclxuICAgIC8vIENsZWFyIG1hdHJpeCdzIGNhbnZhcy5cclxuICAgIGNsZWFyOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHRoaXMuY29udGV4dC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIFJldHVybiBtYXRyaXgncyBjYW52YSdzIGltYWdlIGRhdGEuXHJcbiAgICBnZXRQaXhlbHM6IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICAgIHRoaXMuY2xlYXIoKTtcclxuXHJcbiAgICAgIHN3aXRjaCAoIHRoaXMudHlwZSApIHtcclxuXHJcbiAgICAgICAgY2FzZSAncGljdHVyZSc6XHJcbiAgICAgICAgICB0aGlzLmNvbnRleHQuZHJhd0ltYWdlKCB0aGlzLnBpY3R1cmUsIHRoaXMuc2l6ZS54LCB0aGlzLnNpemUueSwgdGhpcy5zaXplLncsIHRoaXMuc2l6ZS5oICk7XHJcbiAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgY2FzZSAndGV4dCc6XHJcbiAgICAgICAgICB0aGlzLnNldFRleHQoKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiggIXRoaXMuc2l6ZS53ICYmICF0aGlzLnNpemUuaCApIHJldHVybiBmYWxzZTtcclxuXHJcbiAgICAgIHJldHVybiB0aGlzLmNvbnRleHQuZ2V0SW1hZ2VEYXRhKCB0aGlzLnNpemUueCwgdGhpcy5zaXplLnksIHRoaXMuc2l6ZS53LCB0aGlzLnNpemUuaCApO1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBEcmF3IHRleHQgaW4gY2FudmFzLlxyXG4gICAgc2V0VGV4dDogZnVuY3Rpb24gKCkge1xyXG5cclxuICAgICAgLy8gQ2xlYXIgdXNlbGVzcyBzcGFjZXMgaW4gc3RyaW5nIHRvIGRyYXcuXHJcbiAgICAgIHZhciBjbGVhcmVkID0gdGhpcy5waWN0dXJlLnRyaW0oKTtcclxuXHJcbiAgICAgIC8vIElmIHN0cmluZyBlbXB0eSwgc2V0IHNpemUgdG8gMCB0byBhdm9pZCBtYXRyaXggY2FsY3VsYXRpb24sIGFuZCBjbGVhciBtYXRyaXguXHJcbiAgICAgIGlmIChjbGVhcmVkID09PSBcIlwiKSB7XHJcbiAgICAgICAgdGhpcy5zaXplLnggPSAwO1xyXG4gICAgICAgIHRoaXMuc2l6ZS55ID0gMDtcclxuICAgICAgICB0aGlzLnNpemUudyA9IDA7XHJcbiAgICAgICAgdGhpcy5zaXplLmggPSAwO1xyXG4gICAgICAgIHRoaXMuY2xlYXJNYXRyaXgoKTtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHZhciBpLCB3ID0gMCwgeCA9IDIwLCB5ID0gODAsXHJcbiAgICAgICAgbGluZXMgPSB0aGlzLnBpY3R1cmUuc3BsaXQoXCJcXG5cIiksIC8vIFNwbGl0IHRleHQgaW4gYXJyYXkgZm9yIGVhY2ggZW5kIG9mIGxpbmUuXHJcbiAgICAgICAgZm9udFNpemUgPSB0aGlzLmluc3RhbmNlLnNldHRpbmdzLmZvbnRTaXplO1xyXG5cclxuICAgICAgdGhpcy5jb250ZXh0LmZvbnQgPSBmb250U2l6ZSArIFwicHggXCIgKyB0aGlzLmluc3RhbmNlLnNldHRpbmdzLmZvbnQ7XHJcbiAgICAgIHRoaXMuY29udGV4dC5maWxsU3R5bGUgPSB0aGlzLmluc3RhbmNlLnNldHRpbmdzLnRleHRDb2xvcjtcclxuICAgICAgdGhpcy5jb250ZXh0LnRleHRBbGlnbiA9IFwibGVmdFwiO1xyXG5cclxuICAgICAgLy8gRHJhdyBsaW5lIGJ5IGxpbmUuXHJcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHRoaXMuY29udGV4dC5maWxsVGV4dCggbGluZXNbaV0sIHgsIHkgKyBpKmZvbnRTaXplICk7XHJcbiAgICAgICAgdyA9IE1hdGgubWF4KCB3LCBNYXRoLmZsb29yKHRoaXMuY29udGV4dC5tZWFzdXJlVGV4dCggbGluZXNbaV0gKS53aWR0aCkgKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gU2V0IHNpemUgb2JqZWN0LCB0byBjYWxjdWxhdGUgdGFyZ2V0ZWQgem9uZSBvbiB0aGUgbWF0cml4LlxyXG4gICAgICB0aGlzLnNpemUueCA9IE1hdGgubWF4KCB4LCAgdGhpcy5zaXplLnggKTtcclxuICAgICAgdGhpcy5zaXplLnkgPSBNYXRoLm1heCggKHkgLSBmb250U2l6ZSksIHRoaXMuc2l6ZS55ICk7XHJcbiAgICAgIHRoaXMuc2l6ZS53ID0gTWF0aC5tYXgoICh3ICsgZm9udFNpemUpLCB0aGlzLnNpemUudyApO1xyXG4gICAgICB0aGlzLnNpemUuaCA9IE1hdGgubWF4KCAoZm9udFNpemUgKiBpICsgZm9udFNpemUpLCB0aGlzLnNpemUuaCApO1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBBcHBseSBmaWx0ZXIncyBuYW1lIHdpdGggYXJnQXJyYXkuXHJcbiAgICBhcHBseUZpbHRlcjogZnVuY3Rpb24gKCBuYW1lLCBhcmdBcnJheSApIHtcclxuXHJcbiAgICAgIHZhciBwID0gdGhpcy5nZXRQaXhlbHMoKTtcclxuXHJcbiAgICAgIC8vIElmIGZpbHRlciBkb2Vzbid0IGV4aXN0LCBvciBubyBuYW1lLCBzdG9wIHByb2Nlc3MuXHJcbiAgICAgIC8vaWYgKCBmaWx0ZXJbbmFtZV0gPT09IHVuZGVmaW5lZCApIHRocm93IG5ldyBFcnJvcihcImZpbHRlciAnXCIgKyBuYW1lICtcIicgZG9lcydudCBleGlzdCBhcyBmaWx0ZXJzIG1ldGhvZC5cIik7XHJcbiAgICAgIGlmICggIWZpbHRlcltuYW1lXSApIHJldHVybjtcclxuXHJcbiAgICAgIC8vIEdldCBpbWFnZSBkYXRhIHBpeGVscy5cclxuICAgICAgdmFyIGksIGFyZ3MgPSBbIHAgXTtcclxuICAgICAgdmFyIHBpeGVscztcclxuXHJcbiAgICAgIC8vIENvbnN0cnVjdCBhcmdzIGFycmF5LlxyXG4gICAgICBmb3IgKCBpID0gMDsgaSA8IGFyZ0FycmF5Lmxlbmd0aDsgaSsrICkge1xyXG4gICAgICAgIGFyZ3MucHVzaCggYXJnQXJyYXlbaV0gKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gQXBwbHkgZmlsdGVyLlxyXG4gICAgICBwID0gZmlsdGVyW25hbWVdLmFwcGx5KCBudWxsLCBhcmdzICk7XHJcblxyXG4gICAgICAvLyBTZXQgbmV3IGltYWdlIGRhdGEgb24gY2FudmFzLlxyXG4gICAgICB0aGlzLmNvbnRleHQucHV0SW1hZ2VEYXRhKCBwLCB0aGlzLnNpemUueCwgdGhpcy5zaXplLnkgKTtcclxuICAgIH0sXHJcblxyXG4gICAgLy8gQ3JlYXRlIGFuZCBzdG9yZSBvbmUgbWF0cml4IHBlciBtb2RlIHJlZ2lzdGVyZWQsIGlmIGluc3RhbmNlLnNldHRpbmdzLm1vZGVzW21vZGVfbmFtZV0gaXMgdHJ1ZS5cclxuICAgIGJ1aWxkQWxsTWF0cml4OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHZhciBtLCBtQSA9IHt9O1xyXG4gICAgICBmb3IgKCB2YXIgbW9kZSBpbiBtYXRyaXhNZXRob2QgKSB7XHJcbiAgICAgICAgaWYgKCAhdGhpcy5pbnN0YW5jZS5zZXR0aW5ncy5tb2Rlc1ttb2RlXSApIGNvbnRpbnVlO1xyXG4gICAgICAgIG0gPSB0aGlzLmNyZWFNYXRyaXgoKTtcclxuICAgICAgICB0aGlzLmFwcGx5RmlsdGVyKCBmaWx0ZXJzW21vZGVdLm5hbWUsIHRoaXMuaW5zdGFuY2Uuc2V0dGluZ3NbZmlsdGVyc1ttb2RlXS5wYXJhbV0gKTtcclxuICAgICAgICB0aGlzW21hdHJpeE1ldGhvZFttb2RlXV0obSwgMSk7XHJcbiAgICAgICAgbUFbbW9kZV0gPSBtO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBtQTtcclxuICAgIH0sXHJcblxyXG4gICAgLy8gUmV0dXJuIGFjdGl2ZSBtYXRyaXguXHJcbiAgICBnZXRNYXRyaXg6IGZ1bmN0aW9uKCl7XHJcbiAgICAgIHJldHVybiB0aGlzLm1hdHJpeFt0aGlzLmluc3RhbmNlLm1vZGVdIHx8IGZhbHNlO1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBDcmVhdGUgbWF0cml4LlxyXG4gICAgY3JlYU1hdHJpeDogZnVuY3Rpb24gKCkge1xyXG4gICAgICB2YXIgYSA9IHRoaXMuaW5zdGFuY2Uuc2V0dGluZ3Mud2lkdGgsXHJcbiAgICAgICAgYiA9IHRoaXMuaW5zdGFuY2Uuc2V0dGluZ3MuaGVpZ2h0LFxyXG4gICAgICAgIG1hdCA9IG5ldyBBcnJheSggYSApLCBpLCBqO1xyXG4gICAgICBmb3IoIGkgPSAwOyBpIDwgYTsgaSsrICkge1xyXG4gICAgICAgIG1hdFtpXSA9IG5ldyBBcnJheSggYiApO1xyXG4gICAgICAgIGZvciggaiA9IDA7IGogPCBiOyBqKysgKXtcclxuICAgICAgICAgIG1hdFtpXVtqXSA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBtYXQ7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIFNldCBhbGwgbWF0cml4IHZhbHVlcyB0byB2YWx1ZSBvciAwO1xyXG4gICAgY2xlYXJNYXRyaXg6IGZ1bmN0aW9uKCB2YWx1ZSApe1xyXG4gICAgICB2YXIgaSwgaiwgbCwgbSwgdixcclxuICAgICAgICBtYXRyaXggPSB0aGlzLmdldE1hdHJpeCgpO1xyXG4gICAgICB2ID0gdmFsdWUgfHwgMDtcclxuICAgICAgbCA9IG1hdHJpeC5sZW5ndGg7XHJcbiAgICAgIG0gPSBtYXRyaXhbMF0ubGVuZ3RoO1xyXG4gICAgICBmb3IoIGkgPSAwOyBpIDwgbDsgaSsrICl7XHJcbiAgICAgICAgZm9yKCBqID0gMDsgaiA8IG07IGorKyApe1xyXG4gICAgICAgICAgbWF0cml4W2ldW2pdID0gdjtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgLy8gQ29uc3RydWN0IG1hdHJpeCwgYWNjb3JkaW5nIHRvIGNhbnZhcydzIGltYWdlIGRhdGEgdmFsdWVzLlxyXG4gICAgLy8gSWYgaW1hZ2UgZGF0YSBwaXhlbCBpcyB3aGl0ZSwgY29ycmVzcG9uZGluZyBtYXRyaXggY2FzZSBpcyBzZXQgdG9vIHZhbHVlLlxyXG4gICAgLy8gSWYgaW1hZ2UgZGF0YSBwaXhlbCBpcyBibGFjaywgY29ycmVzcG9uZGluZyBtYXRyaXggY2FzZSBpcyBzZXQgdG8gMC5cclxuICAgIHZhbHVlTWF0cml4OiBmdW5jdGlvbiAoIG1hdHJpeCwgdmFsdWUgKSB7XHJcbiAgICAgIHZhciBhID0gdGhpcy5zaXplLngsXHJcbiAgICAgICAgYiA9IE1hdGgubWluKCBNYXRoLmZsb29yKGEgKyB0aGlzLnNpemUudyksIG1hdHJpeC5sZW5ndGggKSxcclxuICAgICAgICBjID0gdGhpcy5zaXplLnksXHJcbiAgICAgICAgZCA9IE1hdGgubWluKCBNYXRoLmZsb29yKGMgKyB0aGlzLnNpemUuaCksIG1hdHJpeFswXS5sZW5ndGggKTtcclxuICAgICAgaWYoIG1hdHJpeC5sZW5ndGggPCBhIHx8IG1hdHJpeFswXS5sZW5ndGggPCBkICkgcmV0dXJuO1xyXG5cclxuICAgICAgdmFyIGksIGosIHAgPSB0aGlzLmNvbnRleHQuZ2V0SW1hZ2VEYXRhKDAsIDAsIHRoaXMuaW5zdGFuY2UuY2FudmFzLndpZHRoLCB0aGlzLmluc3RhbmNlLmNhbnZhcy5oZWlnaHQpLmRhdGE7XHJcblxyXG4gICAgICBmb3IoIGkgPSBhOyBpIDwgYjsgaSsrICl7XHJcbiAgICAgICAgZm9yKCBqID0gYzsgaiA8IGQ7IGorKyApe1xyXG4gICAgICAgICAgdmFyIHBpeCA9IHBbKCh0aGlzLmluc3RhbmNlLmNhbnZhcy53aWR0aCAqIGopICsgaSkgKiA0XTtcclxuICAgICAgICAgIG1hdHJpeFtpXVtqXSA9ICggcGl4ID09PSAyNTUgKSA/IHZhbHVlIDogMDtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgLy8gQ3JlYXRlIGNhbnZhcyB0aHVtYm5haWxzIG9mIHRoZSBwaWN0dXJlIHN0b3JlIG9uIHRoaXMgTWF0cml4LlxyXG4gICAgcmVuZGVyVGh1bWJuYWlsczogZnVuY3Rpb24gKCB0YXJnZXQsIGZpbHRlciApIHtcclxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICAgICAgLy8gQ3JlYXRlIG5ldyBNYXRyaXggZm9yIHRoaXMgdGh1bWIuXHJcbiAgICAgIHZhciBtID0gbmV3IE1hdHJpeCAoIHRoaXMuaW5zdGFuY2UsIHRoaXMucGljdHVyZSwgeyB3OnRoaXMuaW5zdGFuY2Uuc2V0dGluZ3MudGh1bWJXaWR0aCwgaDp0aGlzLmluc3RhbmNlLnNldHRpbmdzLnRodW1iSGVpZ2h0IH0gKTtcclxuXHJcbiAgICAgIC8vIEFwcGx5IGZpbHRlci5cclxuICAgICAgaWYgKCBmaWx0ZXIgKSB7XHJcbiAgICAgICAgbS5hcHBseUZpbHRlciggZmlsdGVyc1t0aGlzLmluc3RhbmNlLm1vZGVdLm5hbWUsIHRoaXMuc2V0dGluZ3NbZmlsdGVyc1t0aGlzLmluc3RhbmNlLm1vZGVdLnBhcmFtXSApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBBcHBseSBjbGljayBldmVudCBvbiB0aGUgdGh1bWIncyBjYW52YXMgdGhhdCBmaXJlIHRoZSBEaWFwUGFydCdzIGluc3RhbmNlIGFjdGl2ZSBpbmRleCB0byBjb3Jlc3BvbmRpbmcgTWF0cml4LlxyXG4gICAgICBtLmNhbnZhcy5vbmNsaWNrID0gZnVuY3Rpb24oIG1hdHJpeCApe1xyXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoIGUgKSB7XHJcbiAgICAgICAgICBzZWxmLmluc3RhbmNlLmdvVG8oIG1hdHJpeCApO1xyXG4gICAgICAgICAgc2VsZi5pbnN0YW5jZS5jbGVhclBhcnRzKCk7XHJcbiAgICAgICAgICBzZWxmLmluc3RhbmNlLmxpYmVyYXRpb25QYXJ0czEoKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0oIG0gKTtcclxuXHJcbiAgICAgIC8vIFN0b3JlIE1hdHJpeCdzIGluc3RhbmNlIG9mIHRoZSB0aHVtYiBpbiBhbiBhcnJheS5cclxuICAgICAgdGhpcy5pbnN0YW5jZS50aHVtYk9yaWdpbmFsVGFiLnB1c2goIG0gKTtcclxuXHJcbiAgICAgIC8vIEluamVjdCB0aHVtYidzIGNhbnZhcyBpbiB0aGUgRE9NLlxyXG4gICAgICBmbi5hcHBlbmQoIHRhcmdldCwgbS5jYW52YXMgKTtcclxuXHJcbiAgICAgIHJldHVybiBtO1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIC8qKioqXHJcbiAgICogRGlhcFBhcnQgY29uc3RydWN0b3IuXHJcbiAgICogQSBEaWFwUGFyZXQgaW5zdGFuY2UgbXVzdCBiZSBjcmVhdGVkIGFuZCBpbml0aWFsaXplZCB0byBjcmVhdGUgc2xpZGVzaG93LlxyXG4gICAqXHJcbiAgICovXHJcblxyXG4gIGZ1bmN0aW9uIERpYXBQYXJ0ICgpIHtcclxuICAgIHRoaXMuc2V0dGluZ3MgPSBmbi5zaW1wbGVFeHRlbmQoIHt9LCBkZWZhdWx0cyApO1xyXG4gICAgdGhpcy5tYXRyaXhUYWIgPSBbXTtcclxuICAgIHRoaXMudGh1bWJPcmlnaW5hbFRhYiA9IFtdO1xyXG4gICAgdGhpcy5wYXJ0aWNsZXMgPSBbXTtcclxuICAgIHRoaXMuY2hhbXBzID0gW107XHJcbiAgICB0aGlzLm1vZGUgPSB0aGlzLnNldHRpbmdzLmluaXRpYWxNb2RlO1xyXG4gICAgdGhpcy5saWJlcmF0aW9uID0gZmFsc2U7XHJcbiAgICB0aGlzLmFjdGl2ZUluZGV4ID0gbnVsbDtcclxuICAgIHRoaXMuY2FudmFzID0gdGhpcy5nZXRDYW52YXMoKTtcclxuICAgIHRoaXMuY29udGV4dCA9IHRoaXMuZ2V0Q29udGV4dDJEKCB0aGlzLmNhbnZhcyApO1xyXG4gIH1cclxuXHJcbiAgRGlhcFBhcnQucHJvdG90eXBlID0ge1xyXG5cclxuICAgICAgLy8gSW5pdGlhbGl6ZSBEaWFwUGFydCBpbnN0YW5jZS5cclxuICAgICAgaW5pdDogZnVuY3Rpb24gKCBvcHRpb25zICkge1xyXG5cclxuICAgICAgICAvLyBTdG9yZSBzZXR0aW5ncy5cclxuICAgICAgICBmbi5zaW1wbGVFeHRlbmQoIHRoaXMuc2V0dGluZ3MsIG9wdGlvbnMgKTtcclxuXHJcbiAgICAgICAgLy8gSW5qZWN0IGNhbnZhcyBvbiBET00uXHJcbiAgICAgICAgZm4uYXBwZW5kKCB0aGlzLnNldHRpbmdzLnRhcmdldEVsZW1lbnQsIHRoaXMuY2FudmFzICk7XHJcblxyXG4gICAgICAgIC8vIEFwcGx5IHN0eWxlIHRvIGNhbnZhcyBlbGVtZW50LlxyXG4gICAgICAgIHRoaXMuY2FudmFzLnN0eWxlLmJhY2tncm91bmRDb2xvciA9IHRoaXMuc2V0dGluZ3MuYmFja2dyb3VuZDtcclxuXHJcbiAgICAgICAgLy8gU2V0IG1hc3MgaW5pdGlhbCBjb29yZHMgdG8gY2FudmEncyBjZW50ZXIuXHJcbiAgICAgICAgdGhpcy5jZW50ZXJNYXNzKCk7XHJcblxyXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgbWFzcy5cclxuICAgICAgICB0aGlzLmNoYW1wcy5wdXNoKCBuZXcgQ2hhbXAoIG5ldyBWZWN0b3IodGhpcy5zZXR0aW5ncy5tYXNzWCwgdGhpcy5zZXR0aW5ncy5tYXNzWSksIHRoaXMuc2V0dGluZ3MubWFzcyApICk7XHJcblxyXG4gICAgICAgIC8vIFN0YXJ0IHRoZSBsb29wLlxyXG4gICAgICAgIHRoaXMubG9vcCgpO1xyXG5cclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIFNldCBvcHRpb25zIHRvIHNldHRpbmdzLlxyXG4gICAgICBzZXQ6IGZ1bmN0aW9uICggb3B0aW9ucyApe1xyXG4gICAgICAgIGZuLnNpbXBsZUV4dGVuZCggdGhpcy5zZXR0aW5ncywgb3B0aW9ucyApO1xyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gQ3JlYXRlIG5ldyBzbGlkZSwgYWNjb3JkaW5nIHRvIGlucHV0IHZhbHVlIDogSW1hZ2Ugb3IgU3RyaW5nLlxyXG4gICAgICBjcmVhdGVTbGlkZTogZnVuY3Rpb24oIGlucHV0LCBjdXN0b21TaXplICl7XHJcblxyXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgTWF0cml4IGluc3RhbmNlIGFjY29yZGluZyB0byBpbnB1dC5cclxuICAgICAgICB2YXIgbSA9IG5ldyBNYXRyaXggKCB0aGlzLCBpbnB1dCwgY3VzdG9tU2l6ZSApO1xyXG5cclxuICAgICAgICAvLyBTZXQgYWN0aXZlIGluZGV4IHRvIDAgaWYgaXQncyBudWxsLlxyXG4gICAgICAgIHRoaXMuYWN0aXZlSW5kZXggPSAoIHRoaXMuYWN0aXZlSW5kZXggPT09IG51bGwgKSA/IDAgOiB0aGlzLmFjdGl2ZUluZGV4O1xyXG4gICAgICAgIHRoaXMubWF0cml4VGFiLnB1c2goIG0gKTtcclxuICAgICAgICByZXR1cm4gbTtcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIENyZWF0ZSBhbmQgcmV0dXJuIGNhbnZhcyBlbGVtZW50LiBJZiBubyBzaXplIHNwZWNpZmllZCwgdGFrZSBpbnN0YW5jZSdzIHNldHRpbmdzIHNpemUuXHJcbiAgICAgIGdldENhbnZhczogZnVuY3Rpb24gKCBzaXplICkge1xyXG4gICAgICAgIHZhciBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCAnY2FudmFzJyApLFxyXG4gICAgICAgICAgICBzID0gc2l6ZSB8fCB7fTtcclxuXHJcbiAgICAgICAgY2FudmFzLmhlaWdodCA9ICggcy5oICkgPyBzLmggOiB0aGlzLnNldHRpbmdzLmhlaWdodDtcclxuICAgICAgICBjYW52YXMud2lkdGggPSAoIHMudyApID8gcy53IDogdGhpcy5zZXR0aW5ncy53aWR0aDtcclxuXHJcbiAgICAgICAgcmV0dXJuIGNhbnZhcztcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIENyZWF0ZSBhbmQgcmV0dXJuIGNvbnRleHQgZm9yIGNhbnZhcy5cclxuICAgICAgZ2V0Q29udGV4dDJEOiBmdW5jdGlvbiAoIGNhbnZhcyApIHtcclxuICAgICAgICByZXR1cm4gY2FudmFzLmdldENvbnRleHQoICcyZCcgKTtcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIFJldHVybiBjb29yZHMsIGhlaWdodCBhbmQgd2lkdGggb2YgdGhlIGltZyByZXNpemVkIGFjY29yZGluZyB0byBzaXplIGFyZywgb3IgaW5zdGFuY2UncyBjYW52YXMgc2l6ZS4gXHJcbiAgICAgIGdldEltYWdlU2l6ZTogZnVuY3Rpb24gKCBpbWcsIHNpemUgKSB7XHJcbiAgICAgICAgdmFyIHcgPSBpbWcud2lkdGgsIFxyXG4gICAgICAgICAgICBoID0gaW1nLmhlaWdodCxcclxuICAgICAgICAgICAgY3cgPSAoIHNpemUgKSA/IHNpemUudyA6IHRoaXMuY2FudmFzLndpZHRoLFxyXG4gICAgICAgICAgICBjaCA9ICggc2l6ZSApID8gc2l6ZS5oIDogdGhpcy5jYW52YXMuaGVpZ2h0LFxyXG4gICAgICAgICAgICByYXRpbyA9IHcgLyBoO1xyXG5cclxuICAgICAgICBpZiAoIHcgPj0gaCAmJiB3ID4gY3cgKSB7XHJcbiAgICAgICAgICB3ID0gY3c7XHJcbiAgICAgICAgICBoID0gTWF0aC5yb3VuZCggdyAvIHJhdGlvICk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgaWYgKCBoID4gY2ggKSB7XHJcbiAgICAgICAgICAgIGggPSBjaDtcclxuICAgICAgICAgICAgdyA9IE1hdGgucm91bmQoIGggKiByYXRpbyApO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHg6IE1hdGgucm91bmQoICggY3cgLSB3ICkgLyAyICksXHJcbiAgICAgICAgICB5OiBNYXRoLnJvdW5kKCAoIGNoIC0gaCApIC8gMiApLCBcclxuICAgICAgICAgIHc6IHcsXHJcbiAgICAgICAgICBoOiBoXHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gTWV0aG9kIHRvIHBhc3MgYXMgb25jaGFuZ2UgZXZlbnQgZnVuY3Rpb24gaW4gZmlsZXMgaW5wdXQuXHJcbiAgICAgIGxvYWQ6IGZ1bmN0aW9uICggZSwgdGh1bWIgKSB7XHJcblxyXG4gICAgICAgIHZhciBpLCBmaWxlcyA9IGUudGFyZ2V0LmZpbGVzLCBzZWxmID0gdGhpcztcclxuXHJcbiAgICAgICAgLy8gSWYgbm8gZmlsZSBzZWxlY3RlZCwgZXhpdC5cclxuICAgICAgICBpZiAoICFmaWxlcyApIHJldHVybjtcclxuXHJcbiAgICAgICAgZm9yICggaSA9IDA7IGkgPCBmaWxlcy5sZW5ndGg7IGkrKyApe1xyXG5cclxuICAgICAgICAgIHZhciBmaWxlID0gZmlsZXNbaV07XHJcblxyXG4gICAgICAgICAgLy8gSWYgZmlsZSBpcyBub3QgYW4gaW1hZ2UsIHBhc3MgdG8gbmV4dCBmaWxlLlxyXG4gICAgICAgICAgaWYgKCAhZmlsZS50eXBlLm1hdGNoKCAnaW1hZ2UnICkgKSBjb250aW51ZTtcclxuXHJcbiAgICAgICAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcclxuXHJcbiAgICAgICAgICAvLyBXaGVuIGZpbGUgaXMgbG9hZGVkLlxyXG4gICAgICAgICAgcmVhZGVyLm9ubG9hZCA9IGZ1bmN0aW9uICggZXZlbnQgKSB7XHJcblxyXG4gICAgICAgICAgICB2YXIgaW1nID0gbmV3IEltYWdlKCk7XHJcblxyXG4gICAgICAgICAgICAvLyBXaGVuIGltYWdlIGlzIGxvYWRlZC5cclxuICAgICAgICAgICAgaW1nLm9ubG9hZCA9IGZ1bmN0aW9uKCl7XHJcblxyXG4gICAgICAgICAgICAgIC8vIENyZWF0ZSBzbGlkZSwgd2l0aCBJbWFnZSBpbnB1dC5cclxuICAgICAgICAgICAgICB2YXIgbSA9IHNlbGYuY3JlYXRlU2xpZGUoIHRoaXMgKTtcclxuXHJcbiAgICAgICAgICAgICAgaWYgKCAhdGh1bWIgKSByZXR1cm47XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgLy8gQ3JlYXRlIGFuZCBzdG9yZSB0aHVtYi5cclxuICAgICAgICAgICAgICBtLnJlbmRlclRodW1ibmFpbHMoIHNlbGYuc2V0dGluZ3MudGh1bWRuYWlsc0lELCBmYWxzZSApO1xyXG5cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgLy8gTG9hZCBpbWcuXHJcbiAgICAgICAgICAgIGltZy5zcmMgPSBldmVudC50YXJnZXQucmVzdWx0O1xyXG4gICAgICAgICAgfTtcclxuICAgICAgICAgIC8vIExvYWQgZmlsZS5cclxuICAgICAgICAgIHJlYWRlci5yZWFkQXNEYXRhVVJMKCBmaWxlICk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gQ2hhbmdlIGluc3RhbmNlJ3MgbW9kZS4gQmFzaWNhbGx5LCBpdCBjaGFuZ2UgbWV0aG9kcyB0byB0ZXN0IGVhY2ggUGFydGljbGVzLCBhbmQgbWF0cml4IHRoYXQncyB0ZXN0ZWQuXHJcbiAgICAgIHN3aXRjaE1vZGU6IGZ1bmN0aW9uICggbW9kZSApIHtcclxuXHJcbiAgICAgICAgLy8gU2V0IG1vZGUuXHJcbiAgICAgICAgdGhpcy5tb2RlID0gbW9kZTtcclxuXHJcbiAgICAgICAgLy8gQ2FsbCBjYWxsYmFjayBpZiBleGlzdC5cclxuICAgICAgICBpZiggdHlwZW9mIHRoaXMuc2V0dGluZ3Muc3dpdGNoTW9kZUNhbGxiYWNrID09PSAnZnVuY3Rpb24nICkge1xyXG4gICAgICAgICAgdGhpcy5zZXR0aW5ncy5zd2l0Y2hNb2RlQ2FsbGJhY2suY2FsbCggdGhpcyApO1xyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIENyZWF0ZSBuZXcgbWFzcyBhbmQgc3RvcmUgb24gY2hhbXAgYXJyYXkuXHJcbiAgICAgIGFkZE1hc3M6IGZ1bmN0aW9uKCB4LCB5LCBtYXNzICl7XHJcbiAgICAgICAgdmFyIG0gPSBuZXcgQ2hhbXAoIG5ldyBWZWN0b3IoeCwgeSksIG1hc3MgKTtcclxuICAgICAgICB0aGlzLmNoYW1wcy5wdXNoKCBtICk7XHJcbiAgICAgICAgcmV0dXJuIG07XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBTZXQgbWFzcyBjb29yZHMgdG8gY2FudmEncyBjZW50Z2VyIG9uIGluc3RhbmNlJ3Mgc2V0dGluZ3MuXHJcbiAgICAgIGNlbnRlck1hc3M6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLnNldHRpbmdzLm1hc3NYID0gdGhpcy5jYW52YXMud2lkdGgvMjtcclxuICAgICAgICB0aGlzLnNldHRpbmdzLm1hc3NZID0gdGhpcy5jYW52YXMuaGVpZ2h0LzI7XHJcblxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gQ2FsbCBwYXJ0aWNsZSBtZXRob2RzIGluIGVhY2ggbG9vcCwgYWNjb3JkaW5nIHRvIGFjdGl2ZSBtb2RlIGFuZCBjb3JyZXNwb25kaW5nIHByb2NlZWQgc2V0dGluZ3MuXHJcbiAgICAgIHBhcnRQcm9jZWVkOiBmdW5jdGlvbiAoIHBhcnRpY2xlICkge1xyXG4gICAgICAgIHZhciBpLCBsID0gcHJvY2VlZFt0aGlzLm1vZGVdLmxlbmd0aDtcclxuICAgICAgICBmb3IgKCBpID0gMDsgaSA8IGw7IGkrKyApIHtcclxuICAgICAgICAgIHBhcnRpY2xlW3Byb2NlZWRbdGhpcy5tb2RlXVtpXV0oKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBTZXQgYWN0aXZlSW5kZXggdG8gbWF0cml4J3MgdGh1bWIgaW5kZXguXHJcbiAgICAgIGdvVG86IGZ1bmN0aW9uICggbWF0cml4ICkge1xyXG4gICAgICAgIHRoaXMuYWN0aXZlSW5kZXggPSB0aGlzLnRodW1iT3JpZ2luYWxUYWIuaW5kZXhPZiggbWF0cml4ICk7XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBNYWtlIHBhcnRpY2xlcyBmcmVlIGZvciBzaG9ydCBkZWxheS5cclxuICAgICAgbGliZXJhdGlvblBhcnRzMTogZnVuY3Rpb24gKCBkZWxheSApIHtcclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgdmFyIGQgPSBkZWxheSB8fCA1MDA7XHJcblxyXG4gICAgICAgIC8vIFBhcnRpY2xlcyBhcmUgZnJlZSBmcm9tIG1hdHJpeCBvZiB0eXBlICd2YWx1ZScuXHJcbiAgICAgICAgdGhpcy5saWJlcmF0aW9uID0gIXRoaXMubGliZXJhdGlvbjtcclxuXHJcbiAgICAgICAgICAvLyBNYXNzIHN0cmVuZ3RoIGlzIGludmVydGVkLlxyXG4gICAgICAgICAgdGhpcy5jaGFtcHNbMF0ubWFzcyA9IHRoaXMuc2V0dGluZ3MuYW50aU1hc3M7XHJcblxyXG4gICAgICAgICAgLy8gV2hlbiBkZWxheSdzIG92ZXIsIHdoZSByZXR1cm4gdG8gbm9ybWFsIG1hc3Mgc3RyZW5ndGggYW5kIHBhcnRpY2xlcyBiZWhhdmlvci5cclxuICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgc2VsZi5jaGFtcHNbMF0ubWFzcyA9IHNlbGYuc2V0dGluZ3MubWFzcztcclxuICAgICAgICAgICAgc2VsZi5saWJlcmF0aW9uID0gIXNlbGYubGliZXJhdGlvbjtcclxuICAgICAgICAgIH0sIGQpXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBDcmVhdGUgbmV3IFBhcnRpY2xlLCB3aXRoIHJhbmRvbSBwb3NpdGlvbiBhbmQgc3BlZWQuXHJcbiAgICAgIGNyZWFQYXJ0czogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGlmICh0aGlzLnBhcnRpY2xlcy5sZW5ndGggPCB0aGlzLnNldHRpbmdzLmRlbnNpdHkpIHtcclxuICAgICAgICAgIHZhciBpLCBuYiA9IHRoaXMuc2V0dGluZ3MuZGVuc2l0eSAtIHRoaXMucGFydGljbGVzLmxlbmd0aDtcclxuICAgICAgICAgIGZvciAoIGkgPSAwOyBpIDwgbmI7IGkrKyApIHtcclxuICAgICAgICAgICAgdGhpcy5wYXJ0aWNsZXMucHVzaChuZXcgUGFydGljbGUodGhpcywgbmV3IFZlY3RvcihNYXRoLnJhbmRvbSgpICogdGhpcy5jYW52YXMud2lkdGgsIE1hdGgucmFuZG9tKCkgKiB0aGlzLmNhbnZhcy5oZWlnaHQpLCBuZXcgVmVjdG9yKHJlYWxSYW5kb20odGhpcy5zZXR0aW5ncy5pbml0aWFsVmVsb2NpdHkpLCByZWFsUmFuZG9tKHRoaXMuc2V0dGluZ3MuaW5pdGlhbFZlbG9jaXR5KSksIG5ldyBWZWN0b3IoMCwgMCksIDAsIGZhbHNlKSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gUHJvY2VlZCBhbGwgcGFydGljdWxlcy5cclxuICAgICAgdXBncmFkZVBhcnRzOiBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgICAgIHZhciBjdXJyZW50UGFydHMgPSBbXSxcclxuICAgICAgICAgICAgaSwgbCA9IHRoaXMucGFydGljbGVzLmxlbmd0aDtcclxuXHJcbiAgICAgICAgZm9yKCBpID0gMDsgaSA8IGw7IGkrKyApe1xyXG5cclxuICAgICAgICAgIHZhciBwYXJ0aWNsZSA9IHRoaXMucGFydGljbGVzW2ldLFxyXG4gICAgICAgICAgICAgIHBvcyA9IHBhcnRpY2xlLnBvc2l0aW9uO1xyXG5cclxuICAgICAgICAgIC8vIElmIHBhcnRpY2xlIG91dCBvZiBjYW52YXMsIGZvcmdldCBpdC5cclxuICAgICAgICAgIGlmKCBwb3MueCA+PSB0aGlzLmNhbnZhcy53aWR0aCB8fCBwb3MueCA8PSAwIHx8IHBvcy55ID49IHRoaXMuY2FudmFzLmhlaWdodCB8fCBwb3MueSA8PSAwICkgY29udGludWU7XHJcblxyXG4gICAgICAgICAgLy8gUHJvY2VlZCB0aGUgcGFydGljbGUuXHJcbiAgICAgICAgICB0aGlzLnBhcnRQcm9jZWVkKCBwYXJ0aWNsZSApO1xyXG5cclxuICAgICAgICAgIC8vIE1vdmUgdGhlIHBhcnRpY2xlLlxyXG4gICAgICAgICAgcGFydGljbGUubW92ZSgpO1xyXG5cclxuICAgICAgICAgIC8vIFN0b3JlIHRoZSBwYXJ0aWNsZS5cclxuICAgICAgICAgIGN1cnJlbnRQYXJ0cy5wdXNoKCBwYXJ0aWNsZSApO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLnBhcnRpY2xlcyA9IGN1cnJlbnRQYXJ0cztcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIERyYXcgcGFydGljbGVzIGluIGNhbnZhcy5cclxuICAgICAgZHJhd1BhcnRzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIGksIG4gPSB0aGlzLnBhcnRpY2xlcy5sZW5ndGg7XHJcbiAgICAgICAgZm9yKCBpID0gMDsgaSA8IG47IGkrKyApe1xyXG4gICAgICAgICAgdmFyIHBvcyA9IHRoaXMucGFydGljbGVzW2ldLnBvc2l0aW9uO1xyXG4gICAgICAgICAgdGhpcy5jb250ZXh0LmZpbGxTdHlsZSA9IHRoaXMucGFydGljbGVzW2ldLmNvbG9yO1xyXG4gICAgICAgICAgdGhpcy5jb250ZXh0LmZpbGxSZWN0KHBvcy54LCBwb3MueSwgdGhpcy5zZXR0aW5ncy5wYXJ0aWNsZVNpemUsIHRoaXMuc2V0dGluZ3MucGFydGljbGVTaXplKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBNYWtlIGZyZWUgYWxsIHBhcnRpY2xlcy5cclxuICAgICAgY2xlYXJQYXJ0czogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBpLCBsID0gdGhpcy5wYXJ0aWNsZXMubGVuZ3RoO1xyXG4gICAgICAgIGZvciggaSA9IDA7IGkgPCBsOyBpKysgKXtcclxuICAgICAgICAgIHRoaXMucGFydGljbGVzW2ldLmluRm9ybSA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gQ2xlYW4gY2FudmFzLlxyXG4gICAgICBjbGVhcjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGlmKCAhdGhpcy5zZXR0aW5ncy5kcmF3ICkge1xyXG4gICAgICAgICAgdGhpcy5jb250ZXh0LmNsZWFyUmVjdCggMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCApO1xyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIExvb3AncyBjYWxsYmFjay5cclxuICAgICAgcXVldWU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgaWYoICF0aGlzLnNldHRpbmdzLnN0b3AgKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlcXVlc3RJRCA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoIHNlbGYubG9vcC5iaW5kKHNlbGYpICk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSggc2VsZi5yZXF1ZXN0SUQgKTtcclxuICAgICAgICAgICAgICAgIHRoaXMucmVxdWVzdElEID0gdW5kZWZpbmVkO1xyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIENyZWF0ZSBhbmQgcHJvY2VlZCBuZXcgcGFydGljbGVzIGlmIG1pc3NpbmcuXHJcbiAgICAgIHVwZGF0ZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuY3JlYVBhcnRzKCk7XHJcbiAgICAgICAgdGhpcy51cGdyYWRlUGFydHMoKTtcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIERyYXcuXHJcbiAgICAgIGRyYXc6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLmRyYXdQYXJ0cygpO1xyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gTG9vcC5cclxuICAgICAgbG9vcDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuY2xlYXIoKTtcclxuICAgICAgICB0aGlzLnVwZGF0ZSgpO1xyXG4gICAgICAgIHRoaXMuZHJhdygpO1xyXG4gICAgICAgIHRoaXMucXVldWUoKTtcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIFN0b3AgbG9vcC5cclxuICAgICAgc3RvcDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuc2V0dGluZ3Muc3RvcCA9IHRydWU7XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBTdGFydCBsb29wLlxyXG4gICAgICBzdGFydDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuc2V0dGluZ3Muc3RvcCA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMubG9vcCgpO1xyXG4gICAgICB9XHJcblxyXG4gICAgfTtcclxuICAgIFxyXG5cclxuICAgLy8gUmV0dXJuIHJhbmRvbSBudW1iZXIuIFxyXG4gICBmdW5jdGlvbiByZWFsUmFuZG9tKCBtYXggKXtcclxuICAgICAgcmV0dXJuIE1hdGguY29zKChNYXRoLnJhbmRvbSgpICogTWF0aC5QSSkpICogbWF4O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFZlY3RvciBlbGVtZW50YXJ5IGNsYXNzIG9iamVjdC5cclxuICAgIGZ1bmN0aW9uIFZlY3RvciggeCwgeSApIHtcclxuICAgICAgdGhpcy54ID0geCB8fCAwO1xyXG4gICAgICB0aGlzLnkgPSB5IHx8IDA7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQWRkIHZlY3RvciB0byBhbiBvdGhlci5cclxuICAgIFZlY3Rvci5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24odmVjdG9yKXtcclxuICAgICAgdGhpcy54ICs9IHZlY3Rvci54O1xyXG4gICAgICB0aGlzLnkgKz0gdmVjdG9yLnk7XHJcbiAgICB9O1xyXG5cclxuICAgIC8vIEludmVydCB2ZWN0b3IncyBkaXJlY3Rpb24uXHJcbiAgICBWZWN0b3IucHJvdG90eXBlLmdldEludmVydCA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgIHRoaXMueCA9IC0xICogKHRoaXMueCk7XHJcbiAgICAgIHRoaXMueSA9IC0xICogKHRoaXMueSk7XHJcbiAgICB9O1xyXG5cclxuICAgIC8vIEdldCB2ZWN0b3IncyBsZW5ndGguXHJcbiAgICBWZWN0b3IucHJvdG90eXBlLmdldE1hZ25pdHVkZSA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgIHJldHVybiBNYXRoLnNxcnQodGhpcy54ICogdGhpcy54ICsgdGhpcy55ICogdGhpcy55KVxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBHZXQgdmVjdG9yJ3MgcmFkaXVzLlxyXG4gICAgVmVjdG9yLnByb3RvdHlwZS5nZXRBbmdsZSA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgIHJldHVybiBNYXRoLmF0YW4yKHRoaXMueSwgdGhpcy54KTtcclxuICAgIH07XHJcblxyXG4gICAgLy8gR2V0IG5ldyB2ZWN0b3IgYWNjb3JkaW5nIHRvIGxlbmd0aCBhbmQgcmFkaXVzLlxyXG4gICAgVmVjdG9yLnByb3RvdHlwZS5mcm9tQW5nbGUgPSBmdW5jdGlvbiAoIGFuZ2xlLCBtYWduaXR1ZGUgKSB7XHJcbiAgICAgIHJldHVybiBuZXcgVmVjdG9yKG1hZ25pdHVkZSAqIE1hdGguY29zKGFuZ2xlKSwgbWFnbml0dWRlICogTWF0aC5zaW4oYW5nbGUpKTtcclxuICAgIH07XHJcblxyXG4gICAgLy8gUGFydGljbGUgY29uc3RydWN0b3IuXHJcbiAgICBmdW5jdGlvbiBQYXJ0aWNsZSggaW5zdGFuY2UsIHBvc2l0aW9uLCB2aXRlc3NlLCBhY2NlbGVyYXRpb24gKSB7XHJcbiAgICAgIHRoaXMuaW5zdGFuY2UgPSBpbnN0YW5jZTtcclxuICAgICAgdGhpcy5wb3NpdGlvbiA9IHBvc2l0aW9uIHx8IG5ldyBWZWN0b3IoMCwgMCk7XHJcbiAgICAgIHRoaXMudml0ZXNzZSA9IHZpdGVzc2UgfHwgbmV3IFZlY3RvcigwLCAwKTtcclxuICAgICAgdGhpcy5hY2NlbGVyYXRpb24gPSBhY2NlbGVyYXRpb24gfHwgbmV3IFZlY3RvcigwLCAwKTtcclxuICAgICAgdGhpcy5jb2xvciA9IHRoaXMuaW5zdGFuY2Uuc2V0dGluZ3MucGFydGljbGVDb2xvcjtcclxuICAgICAgdGhpcy5pbkZvcm0gPSAwO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFNldCBuZXcgcGFydGljbGUncyBwb3NpdGlvbiBhY2NvcmRpbmcgdG8gaXRzIGFjY2VsZXJhdGlvbiBhbmQgc3BlZWQuXHJcbiAgICBQYXJ0aWNsZS5wcm90b3R5cGUubW92ZSA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgIHRoaXMudml0ZXNzZS5hZGQoIHRoaXMuYWNjZWxlcmF0aW9uICk7XHJcbiAgICAgIHRoaXMucG9zaXRpb24uYWRkKCB0aGlzLnZpdGVzc2UgKTtcclxuICAgIH07XHJcblxyXG4gICAgLy8gUHJvY2VlZCBwYXJ0aWNsZSBhY2NvcmRpbmcgdG8gZXhpc3RpbmcgbWFzcy5cclxuICAgIFBhcnRpY2xlLnByb3RvdHlwZS5zb3VtaXNDaGFtcCA9IGZ1bmN0aW9uKCkge1xyXG5cclxuICAgICAgLy8gSWYgbm8gbWFzcyBzdHJlbmd0aCwgcmV0dXJuLlxyXG4gICAgICBpZiAoICF0aGlzLmluc3RhbmNlLmNoYW1wc1swXS5tYXNzICkgcmV0dXJuO1xyXG5cclxuICAgICAgLy8gSWYgcGFydGljbGUgaGFzIG5vdCBmbGFnZ2VkICdpbkZvcm0nLlxyXG4gICAgICBpZiAoIHRoaXMuaW5Gb3JtICE9PSAxICkge1xyXG5cclxuICAgICAgICB2YXIgdG90YWxBY2NlbGVyYXRpb25YID0gMDtcclxuICAgICAgICB2YXIgdG90YWxBY2NlbGVyYXRpb25ZID0gMDtcclxuICAgICAgICB2YXIgbCA9IHRoaXMuaW5zdGFuY2UuY2hhbXBzLmxlbmd0aDtcclxuXHJcbiAgICAgICAgLy8gUHJvY2VlZCBlZmZlY3Qgb2YgYWxsIG1hc3MgcmVnaXN0ZXJlZCBpbiBjaGFtcHMgYXJyYXkuXHJcbiAgICAgICAgZm9yKCB2YXIgaSA9IDA7IGkgPCBsOyBpKysgKXtcclxuICAgICAgICAgIHZhciBkaXN0WCA9IHRoaXMuaW5zdGFuY2UuY2hhbXBzW2ldLnBvc2l0aW9uLnggLSB0aGlzLnBvc2l0aW9uLng7XHJcbiAgICAgICAgICB2YXIgZGlzdFkgPSB0aGlzLmluc3RhbmNlLmNoYW1wc1tpXS5wb3NpdGlvbi55IC0gdGhpcy5wb3NpdGlvbi55O1xyXG4gICAgICAgICAgdmFyIGZvcmNlID0gdGhpcy5pbnN0YW5jZS5jaGFtcHNbaV0ubWFzcyAvIE1hdGgucG93KGRpc3RYICogZGlzdFggKyBkaXN0WSAqIGRpc3RZLCAxLjUpO1xyXG4gICAgICAgICAgdG90YWxBY2NlbGVyYXRpb25YICs9IGRpc3RYICogZm9yY2U7XHJcbiAgICAgICAgICB0b3RhbEFjY2VsZXJhdGlvblkgKz0gZGlzdFkgKiBmb3JjZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFNldCBuZXcgYWNjZWxlcmF0aW9uIHZlY3Rvci5cclxuICAgICAgICB0aGlzLmFjY2VsZXJhdGlvbiA9IG5ldyBWZWN0b3IoIHRvdGFsQWNjZWxlcmF0aW9uWCwgdG90YWxBY2NlbGVyYXRpb25ZICk7XHJcbiAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgLy8gUHJvY2VlZCBwYXJ0aWNsZSBhY2NvcmRpbmcgdG8gbWF0cml4IG9mIHR5cGUgJ3ZhbHVlJy4gQ2FsbGVkIGluIG1vZGVGb3JtLlxyXG4gICAgUGFydGljbGUucHJvdG90eXBlLnNvdW1pc0Zvcm0gPSBmdW5jdGlvbigpe1xyXG5cclxuICAgICAgLy8gSWYgbGliZXJhdGlvbiBmbGFnLCBtYWtlIHRoZSBwYXJ0aWNsZSBmcmVlLlxyXG4gICAgICBpZiggdGhpcy5pbnN0YW5jZS5saWJlcmF0aW9uICl7XHJcbiAgICAgICAgdGhpcy5pbkZvcm0gPSAwO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gR2V0IHBhcnRpY2xlIHBvc2l0aW9uLlxyXG4gICAgICB2YXIgdGVzdFggPSBNYXRoLmZsb29yKCB0aGlzLnBvc2l0aW9uLnggKTtcclxuICAgICAgdmFyIHRlc3RZID0gTWF0aC5mbG9vciggdGhpcy5wb3NpdGlvbi55ICk7XHJcblxyXG4gICAgICAvLyBDaGVjayBtYXRyaXggdmFsdWUgYWNjb3JkaW5nIHRvIHBhcnRpY2xlJ3MgcG9zaXRpb24uXHJcbiAgICAgIHZhciB2YWx1ZSA9ICggdGhpcy5pbnN0YW5jZS5hY3RpdmVJbmRleCAhPT0gbnVsbCApID8gdGhpcy5pbnN0YW5jZS5tYXRyaXhUYWJbdGhpcy5pbnN0YW5jZS5hY3RpdmVJbmRleF0uZ2V0TWF0cml4KClbdGVzdFhdW3Rlc3RZXSA6IDA7XHJcblxyXG4gICAgICAvLyBJZiBwYXJ0aWNsZSBpcyBpbnNpZGUgYSAnd2hpdGUgem9uZScuXHJcbiAgICAgIGlmICggdmFsdWUgIT09IDAgKXtcclxuXHJcbiAgICAgICAgLy8gSWYgcGFydGljbGVzIGp1c3QgY29tZSBpbnRvIHRoZSAnd2hpdGUgem9uZScuXHJcbiAgICAgICAgaWYoIHRoaXMuaW5Gb3JtICE9PSAxICl7XHJcblxyXG4gICAgICAgICAgLy8gVXAgdGhlIGZvcm0gZmxhZy5cclxuICAgICAgICAgIHRoaXMuaW5Gb3JtID0gMTtcclxuXHJcbiAgICAgICAgICAvLyBTbG93IHRoZSBwYXJ0aWNsZS5cclxuICAgICAgICAgIHRoaXMudml0ZXNzZSA9IG5ldyBWZWN0b3IodGhpcy52aXRlc3NlLnggKiAwLjIsIHRoaXMudml0ZXNzZS55ICogMC4yKTtcclxuXHJcbiAgICAgICAgICAvLyBDdXQgdGhlIGFjY2VsZXJhdGlvbi5cclxuICAgICAgICAgIHRoaXMuYWNjZWxlcmF0aW9uID0gbmV3IFZlY3RvcigwLCAwKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIElmIHBhcnRpY2xlIGlzIG5vdCBpbnNpZGUgJ3doaXRlIHpvbmUnLlxyXG4gICAgICBlbHNlIHtcclxuXHJcbiAgICAgICAgLy8gSWYgdGhlIHBhcnRpY2xlIGp1c3QgZ2V0IG91dCB0aGUgem9uZS5cclxuICAgICAgICBpZiggdGhpcy5pbkZvcm0gPT09IDEgKXtcclxuXHJcbiAgICAgICAgICAvLyBJdCdzIG5vdCBmcmVlIDogaW52ZXJ0IHNwZWVkLlxyXG4gICAgICAgICAgdGhpcy52aXRlc3NlLmdldEludmVydCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBNYXNzIGNvbnN0cnVjdG9yLlxyXG4gICAgZnVuY3Rpb24gQ2hhbXAoIHBvaW50LCBtYXNzICkge1xyXG4gICAgICB0aGlzLnBvc2l0aW9uID0gcG9pbnQ7XHJcbiAgICAgIHRoaXMuc2V0TWFzcyggbWFzcyApO1xyXG4gICAgfVxyXG5cclxuICAgIENoYW1wLnByb3RvdHlwZS5zZXRNYXNzID0gZnVuY3Rpb24oIG1hc3MgKXtcclxuICAgICAgdGhpcy5tYXNzID0gbWFzcyB8fCAwO1xyXG4gICAgICB0aGlzLmNvbG9yID0gbWFzcyA8IDAgPyBcIiNmMDBcIiA6IFwiIzBmMFwiO1xyXG4gICAgfTtcclxuXHJcblxyXG4gIC8vIFBPTFlGSUxMXHJcblxyXG4gIC8vIFByb2R1Y3Rpb24gc3RlcHMgb2YgRUNNQS0yNjIsIEVkaXRpb24gNSwgMTUuNC40LjE0XHJcbiAgLy8gUsOpZsOpcmVuY2UgOiBodHRwOi8vZXM1LmdpdGh1Yi5pby8jeDE1LjQuNC4xNFxyXG4gIGlmICghQXJyYXkucHJvdG90eXBlLmluZGV4T2YpIHtcclxuICAgIEFycmF5LnByb3RvdHlwZS5pbmRleE9mID0gZnVuY3Rpb24oc2VhcmNoRWxlbWVudCwgZnJvbUluZGV4KSB7XHJcbiAgICAgIHZhciBrO1xyXG4gICAgICBpZiAodGhpcyA9PSBudWxsKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJ0aGlzXCIgdmF1dCBudWxsIG91IG4gZXN0IHBhcyBkw6lmaW5pJyk7XHJcbiAgICAgIH1cclxuICAgICAgdmFyIE8gPSBPYmplY3QodGhpcyk7XHJcbiAgICAgIHZhciBsZW4gPSBPLmxlbmd0aCA+Pj4gMDtcclxuICAgICAgaWYgKGxlbiA9PT0gMCkge1xyXG4gICAgICAgIHJldHVybiAtMTtcclxuICAgICAgfVxyXG4gICAgICB2YXIgbiA9ICtmcm9tSW5kZXggfHwgMDtcclxuICAgICAgaWYgKE1hdGguYWJzKG4pID09PSBJbmZpbml0eSkge1xyXG4gICAgICAgIG4gPSAwO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChuID49IGxlbikge1xyXG4gICAgICAgIHJldHVybiAtMTtcclxuICAgICAgfVxyXG4gICAgICBrID0gTWF0aC5tYXgobiA+PSAwID8gbiA6IGxlbiAtIE1hdGguYWJzKG4pLCAwKTtcclxuICAgICAgd2hpbGUgKGsgPCBsZW4pIHtcclxuICAgICAgICBpZiAoayBpbiBPICYmIE9ba10gPT09IHNlYXJjaEVsZW1lbnQpIHtcclxuICAgICAgICAgIHJldHVybiBrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBrKys7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIC0xO1xyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8vIGlmICh0eXBlb2YgT2JqZWN0LmFzc2lnbiAhPSAnZnVuY3Rpb24nKSB7XHJcbiAgLy8gICBPYmplY3QuYXNzaWduID0gZnVuY3Rpb24gKHRhcmdldCwgdmFyQXJncykgeyAvLyAubGVuZ3RoIG9mIGZ1bmN0aW9uIGlzIDJcclxuICAvLyAgICAgJ3VzZSBzdHJpY3QnO1xyXG4gIC8vICAgICBpZiAodGFyZ2V0ID09IG51bGwpIHsgLy8gVHlwZUVycm9yIGlmIHVuZGVmaW5lZCBvciBudWxsXHJcbiAgLy8gICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQ2Fubm90IGNvbnZlcnQgdW5kZWZpbmVkIG9yIG51bGwgdG8gb2JqZWN0Jyk7XHJcbiAgLy8gICAgIH1cclxuXHJcbiAgLy8gICAgIHZhciB0byA9IE9iamVjdCh0YXJnZXQpO1xyXG5cclxuICAvLyAgICAgZm9yICh2YXIgaW5kZXggPSAxOyBpbmRleCA8IGFyZ3VtZW50cy5sZW5ndGg7IGluZGV4KyspIHtcclxuICAvLyAgICAgICB2YXIgbmV4dFNvdXJjZSA9IGFyZ3VtZW50c1tpbmRleF07XHJcblxyXG4gIC8vICAgICAgIGlmIChuZXh0U291cmNlICE9IG51bGwpIHsgLy8gU2tpcCBvdmVyIGlmIHVuZGVmaW5lZCBvciBudWxsXHJcbiAgLy8gICAgICAgICBmb3IgKHZhciBuZXh0S2V5IGluIG5leHRTb3VyY2UpIHtcclxuICAvLyAgICAgICAgICAgLy8gQXZvaWQgYnVncyB3aGVuIGhhc093blByb3BlcnR5IGlzIHNoYWRvd2VkXHJcbiAgLy8gICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobmV4dFNvdXJjZSwgbmV4dEtleSkpIHtcclxuICAvLyAgICAgICAgICAgICB0b1tuZXh0S2V5XSA9IG5leHRTb3VyY2VbbmV4dEtleV07XHJcbiAgLy8gICAgICAgICAgIH1cclxuICAvLyAgICAgICAgIH1cclxuICAvLyAgICAgICB9XHJcbiAgLy8gICAgIH1cclxuICAvLyAgICAgcmV0dXJuIHRvO1xyXG4gIC8vICAgfTtcclxuICAvLyB9XHJcblxyXG4gIC8vIGh0dHA6Ly9wYXVsaXJpc2guY29tLzIwMTEvcmVxdWVzdGFuaW1hdGlvbmZyYW1lLWZvci1zbWFydC1hbmltYXRpbmcvXHJcbiAgLy8gaHR0cDovL215Lm9wZXJhLmNvbS9lbW9sbGVyL2Jsb2cvMjAxMS8xMi8yMC9yZXF1ZXN0YW5pbWF0aW9uZnJhbWUtZm9yLXNtYXJ0LWVyLWFuaW1hdGluZ1xyXG4gIC8vIHJlcXVlc3RBbmltYXRpb25GcmFtZSBwb2x5ZmlsbCBieSBFcmlrIE3DtmxsZXIuIGZpeGVzIGZyb20gUGF1bCBJcmlzaCBhbmQgVGlubyBaaWpkZWxcclxuICAvLyBNSVQgbGljZW5zZVxyXG5cclxuICAoZnVuY3Rpb24oKSB7XHJcbiAgICB2YXIgbGFzdFRpbWUgPSAwO1xyXG4gICAgdmFyIHZlbmRvcnMgPSBbJ21zJywgJ21veicsICd3ZWJraXQnLCAnbyddO1xyXG4gICAgZm9yKHZhciB4ID0gMDsgeCA8IHZlbmRvcnMubGVuZ3RoICYmICF3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lOyArK3gpIHtcclxuICAgICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSA9IHdpbmRvd1t2ZW5kb3JzW3hdKydSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXTtcclxuICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gd2luZG93W3ZlbmRvcnNbeF0rJ0NhbmNlbEFuaW1hdGlvbkZyYW1lJ11cclxuICAgICAgICB8fCB3aW5kb3dbdmVuZG9yc1t4XSsnQ2FuY2VsUmVxdWVzdEFuaW1hdGlvbkZyYW1lJ107XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCF3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKVxyXG4gICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gZnVuY3Rpb24oY2FsbGJhY2ssIGVsZW1lbnQpIHtcclxuICAgICAgICB2YXIgY3VyclRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxuICAgICAgICB2YXIgdGltZVRvQ2FsbCA9IE1hdGgubWF4KDAsIDE2IC0gKGN1cnJUaW1lIC0gbGFzdFRpbWUpKTtcclxuICAgICAgICB2YXIgaWQgPSB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHsgY2FsbGJhY2soY3VyclRpbWUgKyB0aW1lVG9DYWxsKTsgfSxcclxuICAgICAgICAgIHRpbWVUb0NhbGwpO1xyXG4gICAgICAgIGxhc3RUaW1lID0gY3VyclRpbWUgKyB0aW1lVG9DYWxsO1xyXG4gICAgICAgIHJldHVybiBpZDtcclxuICAgICAgfTtcclxuXHJcbiAgICBpZiAoIXdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSlcclxuICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gZnVuY3Rpb24oaWQpIHtcclxuICAgICAgICBjbGVhclRpbWVvdXQoaWQpO1xyXG4gICAgICB9O1xyXG4gIH0oKSk7XHJcblxyXG5cclxuICAvKipcclxuICAgKiBQVUJMSUMgTUVUSE9EUy5cclxuICAgKiBcclxuICAgKi9cclxuXHJcbiAgcmV0dXJuIHtcclxuXHJcbiAgICAvLyBFbnRyeSBwb2ludCB0byBjcmVhdGUgbmV3IHNsaWRlIGluc3RhbmNlLlxyXG4gICAgZ2V0SW5zdGFuY2U6IGZ1bmN0aW9uKCAgb3B0aW9ucyApIHtcclxuICAgICAgdmFyIGkgPSBuZXcgRGlhcFBhcnQoKTtcclxuICAgICAgaS5pbml0KCBvcHRpb25zICk7XHJcbiAgICAgIHJldHVybiBpO1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBDYWxsIGl0IHRvIGV4dGVuZCBjb3JlLlxyXG4gICAgcmVnaXN0ZXJNb2RlOiBmdW5jdGlvbiAoIG5hbWUsIHBhcmFtICkge1xyXG5cclxuICAgICAgLy8gQ2hlY2sgaWYgbW9kZSdzIG5hbWUgaXMgZnJlZS5cclxuICAgICAgaWYgKCBkZWZhdWx0cy5tb2Rlc1tuYW1lXSApIHRocm93IG5ldyBFcnJvciggXCJOYW1lIHNwYWNlIGZvciAnXCIgKyBuYW1lICsgXCInIGFscmVhZHkgZXhpc3QuIENob29zZSBhbiBvdGhlciBtb2R1bGUgbmFtZS5cIiApO1xyXG5cclxuICAgICAgLy8gUmVnaXN0ZXIgbmV3IG1vZGUuXHJcbiAgICAgIGRlZmF1bHRzLm1vZGVzW25hbWVdID0gdHJ1ZTtcclxuXHJcbiAgICAgIC8vIEV4dGVuZCBkZWZhdWx0cywgUGFydGljbGVzIGFuZCBNYXRyaXggY2xhc3MuXHJcbiAgICAgIGZuLnNpbXBsZUV4dGVuZCggZGVmYXVsdHMsIHBhcmFtLm9wdGlvbnMgKTtcclxuICAgICAgZm4uc2ltcGxlRXh0ZW5kKCBEaWFwUGFydC5wcm90b3R5cGUsIHBhcmFtLnByb3RvICk7XHJcbiAgICAgIGZuLnNpbXBsZUV4dGVuZCggUGFydGljbGUucHJvdG90eXBlLCBwYXJhbS5wcm90b19wYXJ0aWNsZXMgKTtcclxuICAgICAgZm4uc2ltcGxlRXh0ZW5kKCBNYXRyaXgucHJvdG90eXBlLCBwYXJhbS5wcm90b19tYXRyaXggKTtcclxuICAgICAgXHJcbiAgICAgIC8vIFJlZ2lzdGVyIG5ldyBtb2RlIGZpbHRlcnMsIHByb2NlZWQgYW5kIG1hdHJpeE1ldGhvZC5cclxuICAgICAgZmlsdGVyc1tuYW1lXSA9IHBhcmFtLnNjZW5hcmlvLmZpbHRlcnM7XHJcbiAgICAgIHByb2NlZWRbbmFtZV0gPSBwYXJhbS5zY2VuYXJpby5wcm9jZWVkO1xyXG4gICAgICBtYXRyaXhNZXRob2RbbmFtZV0gPSBwYXJhbS5zY2VuYXJpby5tYXRyaXhNZXRob2Q7XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbn0pKHRoaXMsIHRoaXMuZG9jdW1lbnQpOyIsInNsaWRlUGFydGljbGVzLnJlZ2lzdGVyTW9kZSggJ21vZGVDb2xvcicsIHtcclxuICBvcHRpb25zOiB7fSxcclxuICBwcm90bzoge30sXHJcbiAgcHJvdG9fcGFydGljbGVzOiB7XHJcbiAgICBzb3VtaXNDb2xvcjogZnVuY3Rpb24oKXtcclxuICAgICAgdGhpcy5pbkZvcm0gPSAwO1xyXG4gICAgICB2YXIgdGVzdFggPSBNYXRoLmZsb29yKCB0aGlzLnBvc2l0aW9uLnggKTtcclxuICAgICAgdmFyIHRlc3RZID0gTWF0aC5mbG9vciggdGhpcy5wb3NpdGlvbi55ICk7XHJcbiAgICAgIHRoaXMuY29sb3IgPSAoIHRoaXMuaW5zdGFuY2UuYWN0aXZlSW5kZXggIT09IG51bGwgKSA/IHRoaXMuaW5zdGFuY2UubWF0cml4VGFiW3RoaXMuaW5zdGFuY2UuYWN0aXZlSW5kZXhdLmdldE1hdHJpeCgpW3Rlc3RYXVt0ZXN0WV0gOiB0aGlzLmluc3RhbmNlLnNldHRpbmdzLnBhcnRpY2xlQ29sb3I7XHJcbiAgICB9XHJcbiAgfSxcclxuICBwcm90b19tYXRyaXg6IHtcclxuICAgIGNvbG9yTWF0cml4OiBmdW5jdGlvbiAoIG1hdHJpeCApIHtcclxuXHJcbiAgICAgIHZhciBpLCBqLCByLCBnLCBiLCBwID0gdGhpcy5jb250ZXh0LmdldEltYWdlRGF0YSggMCwgMCwgdGhpcy5pbnN0YW5jZS5jYW52YXMud2lkdGgsIHRoaXMuaW5zdGFuY2UuY2FudmFzLmhlaWdodCApLmRhdGE7XHJcblxyXG4gICAgICBmb3IoIGkgPSAwOyBpIDwgdGhpcy5jYW52YXMud2lkdGg7IGkrKyApe1xyXG4gICAgICAgIGZvciggaiA9IDA7IGogPCB0aGlzLmNhbnZhcy5oZWlnaHQ7IGorKyApe1xyXG4gICAgICAgICAgciA9IHBbKCh0aGlzLmluc3RhbmNlLmNhbnZhcy53aWR0aCAqIGopICsgaSkgKiA0XTtcclxuICAgICAgICAgIGcgPSBwWygodGhpcy5pbnN0YW5jZS5jYW52YXMud2lkdGggKiBqKSArIGkpICogNCArIDFdO1xyXG4gICAgICAgICAgYiA9IHBbKCh0aGlzLmluc3RhbmNlLmNhbnZhcy53aWR0aCAqIGopICsgaSkgKiA0ICsgMl07XHJcbiAgICAgICAgICBtYXRyaXhbaV1bal0gPSAncmdiYSgnICsgciArICcsICcgKyBnICsgJywgJyArIGIgKyAnLCAxKSc7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxuICBmaWx0ZXI6IHt9LFxyXG4gIHNjZW5hcmlvOiB7XHJcbiAgICBmaWx0ZXJzOiB7XHJcbiAgICAgIG5hbWU6IG51bGwsXHJcbiAgICAgIHBhcmFtOiBudWxsXHJcbiAgICB9LFxyXG4gICAgcHJvY2VlZDogWydzb3VtaXNDaGFtcCcsICdzb3VtaXNDb2xvciddLFxyXG4gICAgbWF0cml4TWV0aG9kOiAnY29sb3JNYXRyaXgnXHJcbiAgfVxyXG59KTsiXX0=
