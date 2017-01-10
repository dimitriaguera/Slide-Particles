

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
    height: 300,
    width: 150,
    background: '#fff',
    thresholdNB: [128],
    targetElement: 'dp-canvas',
    inputFileID: 'dp-fileinput',
    thumdnailsID: 'dp-thumb',
    panelID: 'dp-panel-settings',
    thumbWidth: 100,
    thumbHeight: 100,
    text: 'Hello World !',
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

    // Construct matrix, according to vanvas's image data values.
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

  /**
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
      this.champs.push(new Mass(new Vector(this.settings.massX, this.settings.massY), this.settings.mass));

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
      var m = new Mass(new Vector(x, y), mass);
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
  function Mass(point, mass) {
    this.position = point;
    this.setMass(mass);
  }

  Mass.prototype.setMass = function (mass) {
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

      var a = this.size.x,
          b = Math.floor(a + this.size.w),
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUuanMiLCJjb2xvci5qcyJdLCJuYW1lcyI6WyJzbGlkZVBhcnRpY2xlcyIsIndpbmRvdyIsImRvY3VtZW50IiwidW5kZWZpbmVkIiwiZm4iLCJmaWx0ZXIiLCJwcm9jZWVkIiwiZmlsdGVycyIsIm1hdHJpeE1ldGhvZCIsIm9vIiwiZ2V0UHJvdG8iLCJPYmplY3QiLCJnZXRQcm90b3R5cGVPZiIsImRlZmF1bHRzIiwiaGVpZ2h0Iiwid2lkdGgiLCJiYWNrZ3JvdW5kIiwidGhyZXNob2xkTkIiLCJ0YXJnZXRFbGVtZW50IiwiaW5wdXRGaWxlSUQiLCJ0aHVtZG5haWxzSUQiLCJwYW5lbElEIiwidGh1bWJXaWR0aCIsInRodW1iSGVpZ2h0IiwidGV4dCIsIm1hc3MiLCJhbnRpTWFzcyIsImRlbnNpdHkiLCJwYXJ0aWNsZVNpemUiLCJwYXJ0aWNsZUNvbG9yIiwidGV4dENvbG9yIiwiZm9udCIsImZvbnRTaXplIiwiaW5pdGlhbFZlbG9jaXR5IiwibWFzc1giLCJtYXNzWSIsImluaXRpYWxNb2RlIiwiZHJhdyIsInN0b3AiLCJzd2l0Y2hNb2RlQ2FsbGJhY2siLCJtb2RlcyIsIm1vZGVGb3JtIiwiYmxhY2tBbmRXaGl0ZSIsInBpeGVscyIsInRocmVzaG9sZCIsImkiLCJyIiwiZyIsImIiLCJ2IiwiZCIsImRhdGEiLCJsZW5ndGgiLCJuYW1lIiwicGFyYW0iLCJnZXRWaWV3cG9ydCIsInciLCJNYXRoIiwibWF4IiwiZG9jdW1lbnRFbGVtZW50IiwiY2xpZW50V2lkdGgiLCJpbm5lcldpZHRoIiwiaCIsImNsaWVudEhlaWdodCIsImlubmVySGVpZ2h0IiwiYXBwZW5kIiwidGFyZ2V0IiwiZWxlbWVudCIsImdldEVsZW1lbnRCeUlkIiwiYXBwZW5kQ2hpbGQiLCJpc1BsYWluT2JqZWN0IiwicHJvdG8iLCJDdG9yIiwidG9TdHJpbmciLCJjYWxsIiwiaGFzT3duUHJvcGVydHkiLCJjb25zdHJ1Y3RvciIsInByb3RvdHlwZSIsInNpbXBsZUV4dGVuZCIsImEiLCJjbG9uZSIsInNyYyIsImNvcHkiLCJpc0FuQXJyYXkiLCJrZXkiLCJBcnJheSIsImlzQXJyYXkiLCJNYXRyaXgiLCJpbnN0YW5jZSIsImlucHV0IiwiY3VzdG9tU2l6ZSIsInR5cGUiLCJwaWN0dXJlIiwiY2FudmFzIiwiZ2V0Q2FudmFzIiwiY29udGV4dCIsImdldENvbnRleHQyRCIsInNpemUiLCJnZXRJbWFnZVNpemUiLCJ4IiwieSIsIm1hdHJpeCIsImJ1aWxkQWxsTWF0cml4IiwiY2xlYXIiLCJjbGVhclJlY3QiLCJnZXRQaXhlbHMiLCJkcmF3SW1hZ2UiLCJzZXRUZXh0IiwiZ2V0SW1hZ2VEYXRhIiwiY2xlYXJlZCIsInRyaW0iLCJjbGVhck1hdHJpeCIsImxpbmVzIiwic3BsaXQiLCJzZXR0aW5ncyIsImZpbGxTdHlsZSIsInRleHRBbGlnbiIsImZpbGxUZXh0IiwiZmxvb3IiLCJtZWFzdXJlVGV4dCIsImFwcGx5RmlsdGVyIiwiYXJnQXJyYXkiLCJwIiwiYXJncyIsInB1c2giLCJhcHBseSIsInB1dEltYWdlRGF0YSIsIm0iLCJtQSIsIm1vZGUiLCJjcmVhTWF0cml4IiwiZ2V0TWF0cml4IiwibWF0IiwiaiIsInZhbHVlIiwibCIsInZhbHVlTWF0cml4IiwibWluIiwiYyIsInBpeCIsInJlbmRlclRodW1ibmFpbHMiLCJzZWxmIiwib25jbGljayIsImUiLCJnb1RvIiwiY2xlYXJQYXJ0cyIsImxpYmVyYXRpb25QYXJ0czEiLCJ0aHVtYk9yaWdpbmFsVGFiIiwiRGlhcFBhcnQiLCJtYXRyaXhUYWIiLCJwYXJ0aWNsZXMiLCJjaGFtcHMiLCJsaWJlcmF0aW9uIiwiYWN0aXZlSW5kZXgiLCJpbml0Iiwib3B0aW9ucyIsInN0eWxlIiwiYmFja2dyb3VuZENvbG9yIiwiY2VudGVyTWFzcyIsIk1hc3MiLCJWZWN0b3IiLCJsb29wIiwic2V0IiwiY3JlYXRlU2xpZGUiLCJjcmVhdGVFbGVtZW50IiwicyIsImdldENvbnRleHQiLCJpbWciLCJjdyIsImNoIiwicmF0aW8iLCJyb3VuZCIsImxvYWQiLCJ0aHVtYiIsImZpbGVzIiwiZmlsZSIsIm1hdGNoIiwicmVhZGVyIiwiRmlsZVJlYWRlciIsIm9ubG9hZCIsImV2ZW50IiwiSW1hZ2UiLCJyZXN1bHQiLCJyZWFkQXNEYXRhVVJMIiwic3dpdGNoTW9kZSIsImFkZE1hc3MiLCJwYXJ0UHJvY2VlZCIsInBhcnRpY2xlIiwiaW5kZXhPZiIsImRlbGF5Iiwic2V0VGltZW91dCIsImNyZWFQYXJ0cyIsIm5iIiwiUGFydGljbGUiLCJyYW5kb20iLCJyZWFsUmFuZG9tIiwidXBncmFkZVBhcnRzIiwiY3VycmVudFBhcnRzIiwicG9zIiwicG9zaXRpb24iLCJtb3ZlIiwiZHJhd1BhcnRzIiwibiIsImNvbG9yIiwiZmlsbFJlY3QiLCJpbkZvcm0iLCJxdWV1ZSIsInJlcXVlc3RJRCIsInJlcXVlc3RBbmltYXRpb25GcmFtZSIsImJpbmQiLCJjYW5jZWxBbmltYXRpb25GcmFtZSIsInVwZGF0ZSIsInN0YXJ0IiwiY29zIiwiUEkiLCJhZGQiLCJ2ZWN0b3IiLCJnZXRJbnZlcnQiLCJnZXRNYWduaXR1ZGUiLCJzcXJ0IiwiZ2V0QW5nbGUiLCJhdGFuMiIsImZyb21BbmdsZSIsImFuZ2xlIiwibWFnbml0dWRlIiwic2luIiwidml0ZXNzZSIsImFjY2VsZXJhdGlvbiIsInNvdW1pc0NoYW1wIiwidG90YWxBY2NlbGVyYXRpb25YIiwidG90YWxBY2NlbGVyYXRpb25ZIiwiZGlzdFgiLCJkaXN0WSIsImZvcmNlIiwicG93Iiwic291bWlzRm9ybSIsInRlc3RYIiwidGVzdFkiLCJwb2ludCIsInNldE1hc3MiLCJzZWFyY2hFbGVtZW50IiwiZnJvbUluZGV4IiwiayIsIlR5cGVFcnJvciIsIk8iLCJsZW4iLCJhYnMiLCJJbmZpbml0eSIsImxhc3RUaW1lIiwidmVuZG9ycyIsImNhbGxiYWNrIiwiY3VyclRpbWUiLCJEYXRlIiwiZ2V0VGltZSIsInRpbWVUb0NhbGwiLCJpZCIsImNsZWFyVGltZW91dCIsImdldEluc3RhbmNlIiwicmVnaXN0ZXJNb2RlIiwiRXJyb3IiLCJwcm90b19wYXJ0aWNsZXMiLCJwcm90b19tYXRyaXgiLCJzY2VuYXJpbyIsInNvdW1pc0NvbG9yIiwiY29sb3JNYXRyaXgiXSwibWFwcGluZ3MiOiI7O0FBRUEsSUFBSUEsaUJBQWtCLFVBQVVDLE1BQVYsRUFBa0JDLFFBQWxCLEVBQTRCQyxTQUE1QixFQUF1Qzs7QUFFekQ7O0FBRUEsTUFBSUMsRUFBSjtBQUFBLE1BQVFDLE1BQVI7QUFBQSxNQUFnQkMsT0FBaEI7QUFBQSxNQUF5QkMsT0FBekI7QUFBQSxNQUFrQ0MsWUFBbEM7QUFBQSxNQUFnREMsS0FBSyxFQUFyRDtBQUFBLE1BQXlEQyxXQUFXQyxPQUFPQyxjQUEzRTs7O0FBRUE7QUFDQUMsYUFBVztBQUNUQyxZQUFRLEdBREM7QUFFVEMsV0FBTyxHQUZFO0FBR1RDLGdCQUFZLE1BSEg7QUFJVEMsaUJBQWEsQ0FBQyxHQUFELENBSko7QUFLVEMsbUJBQWUsV0FMTjtBQU1UQyxpQkFBYSxjQU5KO0FBT1RDLGtCQUFjLFVBUEw7QUFRVEMsYUFBUyxtQkFSQTtBQVNUQyxnQkFBWSxHQVRIO0FBVVRDLGlCQUFhLEdBVko7QUFXVEMsVUFBSyxlQVhJO0FBWVRDLFVBQU0sR0FaRztBQWFUQyxjQUFVLENBQUMsR0FiRjtBQWNUQyxhQUFTLElBZEE7QUFlVEMsa0JBQWMsQ0FmTDtBQWdCVEMsbUJBQWUsTUFoQk47QUFpQlRDLGVBQVcsTUFqQkY7QUFrQlRDLFVBQU0sT0FsQkc7QUFtQlRDLGNBQVUsRUFuQkQ7QUFvQlRDLHFCQUFpQixDQXBCUjtBQXFCVEMsV0FBTyxHQXJCRTtBQXNCVEMsV0FBTyxHQXRCRTtBQXVCVEMsaUJBQWEsVUF2Qko7QUF3QlRDLFVBQU0sS0F4Qkc7QUF5QlRDLFVBQU0sS0F6Qkc7QUEwQlRDLHdCQUFvQixJQTFCWDtBQTJCVEMsV0FBTztBQUNMQyxnQkFBVTtBQURMO0FBM0JFLEdBSFg7O0FBb0NBOzs7O0FBSUFwQyxXQUFTO0FBQ1A7QUFDQXFDLG1CQUFlLFVBQVdDLE1BQVgsRUFBbUJDLFNBQW5CLEVBQStCO0FBQzVDLFVBQUss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LFlBQU0sSUFEQztBQUVQQyxhQUFPO0FBRkEsS0FERDtBQUtSaEQsYUFBUyxDQUFDLGFBQUQsRUFBZ0IsYUFBaEIsQ0FMRDtBQU1SRSxrQkFBYztBQU5OO0FBbEM4QixDQUExQyIsImZpbGUiOiJzbGlkZS1wYXJ0aWNsZXMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJcclxuXHJcbnZhciBzbGlkZVBhcnRpY2xlcyA9IChmdW5jdGlvbiAod2luZG93LCBkb2N1bWVudCwgdW5kZWZpbmVkKSB7XHJcblxyXG4gICAgXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG4gICAgdmFyIGZuLCBmaWx0ZXIsIHByb2NlZWQsIGZpbHRlcnMsIG1hdHJpeE1ldGhvZCwgb28gPSB7fSwgZ2V0UHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YsXHJcbiAgICBcclxuICAgIC8vIERlZmF1bHRzIHNldHRpbmdzLlxyXG4gICAgZGVmYXVsdHMgPSB7XHJcbiAgICAgIGhlaWdodDogMzAwLFxyXG4gICAgICB3aWR0aDogMTUwLFxyXG4gICAgICBiYWNrZ3JvdW5kOiAnI2ZmZicsXHJcbiAgICAgIHRocmVzaG9sZE5COiBbMTI4XSxcclxuICAgICAgdGFyZ2V0RWxlbWVudDogJ2RwLWNhbnZhcycsXHJcbiAgICAgIGlucHV0RmlsZUlEOiAnZHAtZmlsZWlucHV0JyxcclxuICAgICAgdGh1bWRuYWlsc0lEOiAnZHAtdGh1bWInLFxyXG4gICAgICBwYW5lbElEOiAnZHAtcGFuZWwtc2V0dGluZ3MnLFxyXG4gICAgICB0aHVtYldpZHRoOiAxMDAsXHJcbiAgICAgIHRodW1iSGVpZ2h0OiAxMDAsXHJcbiAgICAgIHRleHQ6J0hlbGxvIFdvcmxkICEnLFxyXG4gICAgICBtYXNzOiAxMDAsXHJcbiAgICAgIGFudGlNYXNzOiAtNTAwLFxyXG4gICAgICBkZW5zaXR5OiAxNTAwLFxyXG4gICAgICBwYXJ0aWNsZVNpemU6IDEsXHJcbiAgICAgIHBhcnRpY2xlQ29sb3I6ICcjMDAwJyxcclxuICAgICAgdGV4dENvbG9yOiAnI2ZmZicsXHJcbiAgICAgIGZvbnQ6ICdBcmlhbCcsXHJcbiAgICAgIGZvbnRTaXplOiA0MCxcclxuICAgICAgaW5pdGlhbFZlbG9jaXR5OiAzLFxyXG4gICAgICBtYXNzWDogODgwLFxyXG4gICAgICBtYXNzWTogMzcwLFxyXG4gICAgICBpbml0aWFsTW9kZTogJ21vZGVGb3JtJyxcclxuICAgICAgZHJhdzogZmFsc2UsXHJcbiAgICAgIHN0b3A6IGZhbHNlLFxyXG4gICAgICBzd2l0Y2hNb2RlQ2FsbGJhY2s6IG51bGwsXHJcbiAgICAgIG1vZGVzOiB7XHJcbiAgICAgICAgbW9kZUZvcm06IHRydWUsXHJcbiAgICAgIH0gXHJcbiAgICB9O1xyXG5cclxuXHJcbiAgICAvKipcclxuICAgICAqIEFsbCBpbWFnZSBmaWx0ZXJzIGZ1bmN0aW9uLlxyXG4gICAgICogXHJcbiAgICAgKi9cclxuICAgIGZpbHRlciA9IHtcclxuICAgICAgLy8gVHVybiBjb2xvcmVkIHBpY3R1cmUgb24gYmxhY2sgYW5kIHdoaXRlLiBVc2VkIGZvciBtb2RlRm9ybS5cclxuICAgICAgYmxhY2tBbmRXaGl0ZTogZnVuY3Rpb24gKCBwaXhlbHMsIHRocmVzaG9sZCApIHtcclxuICAgICAgICBpZiAoICFwaXhlbHMgKSByZXR1cm4gcGl4ZWxzO1xyXG4gICAgICAgIHZhciBpLCByLCBnLCBiLCB2LCBkID0gcGl4ZWxzLmRhdGE7XHJcbiAgICAgICAgZm9yICggaSA9IDA7IGkgPCBkLmxlbmd0aDsgaSs9NCApIHtcclxuICAgICAgICAgIHIgPSBkW2ldO1xyXG4gICAgICAgICAgZyA9IGRbaSsxXTtcclxuICAgICAgICAgIGIgPSBkW2krMl07XHJcbiAgICAgICAgICB2ID0gKDAuMjEyNipyICsgMC43MTUyKmcgKyAwLjA3MjIqYiA+PSB0aHJlc2hvbGQpID8gMjU1IDogMDtcclxuICAgICAgICAgIGRbaV0gPSBkW2krMV0gPSBkW2krMl0gPSB2XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBwaXhlbHM7XHJcbiAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBFYWNoIG1vZGVzIHJlZ2lzdGVyZWQgbmVlZCBhbiBlbnRyeSBvbiBmaWx0ZXJzIG9iamVjdC5cclxuICAgICAqIEl0IHBlcm1pdCB0byBjYWxsIGNvcnJlc3BvbmRpbmcgZmlsdGVyIGZ1bmN0aW9uIGZvciBlYWNoIG1vZGUgcmVnaXN0ZXJlZC5cclxuICAgICAqIFRoZSBjb3JyZXNwb25kaW5nIGZpbHRlciBmb25jdGlvbiBpcyBjYWxsZWQgd2hlbiBtYXRyaXggYXJlIGJ1aWx0LlxyXG4gICAgICogXHJcbiAgICAgKiBCeSBkZWZhdWx0LCB0aGVyZSBpcyBvbmx5IG9uZSBtb2RlIDogbW9kZUZvcm0uXHJcbiAgICAgKiBJZiBhIG1vZGUgZG9uJ3QgbmVlZCBmaWx0ZXIsIHNldCB7fSB0byB0aGUgbW9kZSBuYW1lIGVudHJ5LlxyXG4gICAgICogXHJcbiAgICAgKiBuYW1lIDogbmFtZSBvZiB0aGUgZmlsdGVyIGZ1bmN0aW9uIGF0dGFjaCB0byBmaWx0ZXIgb2JqZWN0LlxyXG4gICAgICogcGFyYW0gOiBrZXkgdGFyZ2V0dGluZyB0aGUgc2V0dGluZ3MgcGFyYW1ldGVyLCBwYXNzaW5nIGFzIGFyZ3VtZW50IHdoZW4gZmlsdGVyIGZ1bmN0aW9uIGlzIGNhbGxlZC4gTXVzdCBiZSBhbiBBcnJheSBpbiBzZXR0aW5ncy5cclxuICAgICAqIFxyXG4gICAgKi8gXHJcbiAgICBmaWx0ZXJzID0ge1xyXG4gICAgICBtb2RlRm9ybToge1xyXG4gICAgICAgIG5hbWU6ICdibGFja0FuZFdoaXRlJyxcclxuICAgICAgICBwYXJhbTogJ3RocmVzaG9sZE5CJ1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAvKipcclxuICAgKiBGb3IgZWFjaCBtb2RlLCByZWdpc3RlciBhbGwgbWV0aG9kcyB0byBhcHBseSBmb3IgZWFjaGUgUGFydGljbGVzIGluc3RhbmNlIGluIHRoZSBsb29wLlxyXG4gICAqIE11c3QgYmUgYSBQYXJ0aWNsZXMgbWV0aG9kLlxyXG4gICAqIC0tLS0tPiBzZWUgRGlhcFBhcnQucHJvdG90eXBlLnBhcnRQcm9jZWVkXHJcbiAgICogXHJcbiAgICovXHJcbiAgICBwcm9jZWVkID0ge1xyXG4gICAgICBtb2RlRm9ybTogWydzb3VtaXNDaGFtcCcsICdzb3VtaXNGb3JtJ11cclxuICAgIH07XHJcblxyXG4gICAgLy8gRm9yIGVhY2ggbW9kZSwgcmVnaXN0ZXIgdGhlIE1hdHJpeCBtZXRob2QgY2FsbGVkIHRvIGNyZWF0ZSB0aGUgbWF0cml4ICgyIGRpbWVudGlvbmFsIGFycmF5KS5cclxuICAgIG1hdHJpeE1ldGhvZCA9IHtcclxuICAgICAgbW9kZUZvcm06ICd2YWx1ZU1hdHJpeCdcclxuICAgIH07XHJcblxyXG5cclxuICAgIC8vIFV0aWxpdHkgZnVuY3Rpb25zLlxyXG4gICAgZm4gPSB7XHJcbiAgICAgIC8vIFJldHVybiB2aWV3cG9ydCBzaXplLlxyXG4gICAgICBnZXRWaWV3cG9ydDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHc6IE1hdGgubWF4KGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRXaWR0aCwgd2luZG93LmlubmVyV2lkdGggfHwgMCksXHJcbiAgICAgICAgICBoOiBNYXRoLm1heChkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0LCB3aW5kb3cuaW5uZXJIZWlnaHQgfHwgMClcclxuICAgICAgICB9O1xyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gQXBwZW5kIGVsZW1lbnQgaW4gdGFyZ2V0LlxyXG4gICAgICBhcHBlbmQ6IGZ1bmN0aW9uICggdGFyZ2V0LCBlbGVtZW50ICkge1xyXG4gICAgICAgIGlmICggdHlwZW9mIHRhcmdldCA9PT0gJ3N0cmluZycgKSB7XHJcbiAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCggdGFyZ2V0ICkuYXBwZW5kQ2hpbGQoIGVsZW1lbnQgKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICB0YXJnZXQuYXBwZW5kQ2hpbGQoIGVsZW1lbnQgKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBUZXN0IGlmIHRhcmdldCBpcyBwbGFpbiBvYmplY3QuIFRoYW5rIHlvdSBqUXVlcnkgMysgIVxyXG4gICAgICBpc1BsYWluT2JqZWN0OiBmdW5jdGlvbiAoIHRhcmdldCApIHtcclxuICAgICAgICB2YXIgcHJvdG8sIEN0b3I7XHJcbiAgICAgICAgLy8gRGV0ZWN0IG9idmlvdXMgbmVnYXRpdmVzXHJcbiAgICAgICAgLy8gVXNlIHRvU3RyaW5nIGluc3RlYWQgb2YgalF1ZXJ5LnR5cGUgdG8gY2F0Y2ggaG9zdCBvYmplY3RzXHJcbiAgICAgICAgaWYgKCAhdGFyZ2V0IHx8IG9vLnRvU3RyaW5nLmNhbGwoIHRhcmdldCApICE9PSBcIltvYmplY3QgT2JqZWN0XVwiICkge1xyXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwcm90byA9IGdldFByb3RvKCB0YXJnZXQgKTtcclxuICAgICAgICAvLyBPYmplY3RzIHdpdGggbm8gcHJvdG90eXBlIChlLmcuLCBgT2JqZWN0LmNyZWF0ZSggbnVsbCApYCkgYXJlIHBsYWluXHJcbiAgICAgICAgaWYgKCAhcHJvdG8gKSB7XHJcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gT2JqZWN0cyB3aXRoIHByb3RvdHlwZSBhcmUgcGxhaW4gaWZmIHRoZXkgd2VyZSBjb25zdHJ1Y3RlZCBieSBhIGdsb2JhbCBPYmplY3QgZnVuY3Rpb25cclxuICAgICAgICBDdG9yID0gb28uaGFzT3duUHJvcGVydHkuY2FsbCggcHJvdG8sIFwiY29uc3RydWN0b3JcIiApICYmIHByb3RvLmNvbnN0cnVjdG9yO1xyXG4gICAgICAgIHJldHVybiB0eXBlb2YgQ3RvciA9PT0gXCJmdW5jdGlvblwiICYmIG9vLmhhc093blByb3BlcnR5LmNhbGwoIEN0b3IucHJvdG90eXBlLCBcImlzUHJvdG90eXBlT2ZcIik7XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBEZWVwbHkgZXh0ZW5kIGEgb2JqZWN0IHdpdGggYiBvYmplY3QgcHJvcGVydGllcy5cclxuICAgICAgc2ltcGxlRXh0ZW5kOiBmdW5jdGlvbiAoIGEsIGIgKSB7XHJcbiAgICAgICAgdmFyIGNsb25lLCBzcmMsIGNvcHksIGlzQW5BcnJheSA9IGZhbHNlOyBcclxuICAgICAgICBmb3IoIHZhciBrZXkgaW4gYiApIHtcclxuXHJcbiAgICAgICAgICBzcmMgPSBhWyBrZXkgXTtcclxuXHRcdFx0XHQgIGNvcHkgPSBiWyBrZXkgXTtcclxuXHJcbiAgICAgICAgICAvL0F2b2lkIGluZmluaXRlIGxvb3AuXHJcbiAgICAgICAgICBpZiAoIGEgPT09IGNvcHkgKSB7XHJcblx0XHRcdFx0XHQgIGNvbnRpbnVlO1xyXG5cdFx0XHRcdCAgfVxyXG5cclxuICAgICAgICAgIGlmKCBiLmhhc093blByb3BlcnR5KCBrZXkgKSApIHtcclxuICAgICAgICAgICAgLy8gSWYgcHJvcGVydGllIGlzIEFycmF5IG9yIE9iamVjdC5cclxuICAgICAgICAgICAgaWYoIGNvcHkgJiYgKCBmbi5pc1BsYWluT2JqZWN0KCBjb3B5ICkgfHwgKGlzQW5BcnJheSA9IEFycmF5LmlzQXJyYXkuY2FsbCggY29weSApKSkpIHtcclxuICAgICAgICAgICAgICBpZiAoIGlzQW5BcnJheSApIHtcclxuICAgICAgICAgICAgICAgIGlzQW5BcnJheSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgY2xvbmUgPSAoIHNyYyAmJiBzcmMuaXNBcnJheSApID8gc3JjIDogW107XHJcbiAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNsb25lID0gKCBzcmMgJiYgZm4uaXNQbGFpbk9iamVjdCggc3JjICkgKSA/IHNyYyA6IHt9O1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAvLyBDcmVhdGUgbmV3IEFycmF5IG9yIE9iamVjdCwgbmV2ZXIgcmVmZXJlbmNlIGl0LlxyXG4gICAgICAgICAgICAgIGFbIGtleSBdID0gZm4uc2ltcGxlRXh0ZW5kKCBjbG9uZSwgY29weSApO1xyXG5cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGFbIGtleSBdID0gY29weTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gYTtcclxuICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgLy8gTWF0cml4IGNsYXNzIG9iamVjdC5cclxuICBmdW5jdGlvbiBNYXRyaXggKCBpbnN0YW5jZSwgaW5wdXQsIGN1c3RvbVNpemUgKSB7XHJcbiAgICB0aGlzLmluc3RhbmNlID0gaW5zdGFuY2U7XHJcbiAgICB0aGlzLnR5cGUgPSAoIHR5cGVvZiBpbnB1dCAhPT0gJ3N0cmluZycgKSA/ICdwaWN0dXJlJyA6ICd0ZXh0JztcclxuICAgIHRoaXMucGljdHVyZSA9IGlucHV0O1xyXG4gICAgdGhpcy5jYW52YXMgPSB0aGlzLmluc3RhbmNlLmdldENhbnZhcyggY3VzdG9tU2l6ZSApO1xyXG4gICAgdGhpcy5jb250ZXh0ID0gdGhpcy5pbnN0YW5jZS5nZXRDb250ZXh0MkQoIHRoaXMuY2FudmFzICk7XHJcbiAgICB0aGlzLnNpemUgPSAoIHR5cGVvZiBpbnB1dCAhPT0gJ3N0cmluZycgKSA/IHRoaXMuaW5zdGFuY2UuZ2V0SW1hZ2VTaXplKCBpbnB1dCwgY3VzdG9tU2l6ZSApIDoge3g6MCwgeTowLCB3OjAsIGg6MH07XHJcbiAgICB0aGlzLm1hdHJpeCA9IHRoaXMuYnVpbGRBbGxNYXRyaXgoKTtcclxuICB9XHJcblxyXG4gIE1hdHJpeC5wcm90b3R5cGUgPSB7XHJcblxyXG4gICAgLy8gQ2xlYXIgbWF0cml4J3MgY2FudmFzLlxyXG4gICAgY2xlYXI6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgdGhpcy5jb250ZXh0LmNsZWFyUmVjdCgwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KTtcclxuICAgIH0sXHJcblxyXG4gICAgLy8gUmV0dXJuIG1hdHJpeCdzIGNhbnZhJ3MgaW1hZ2UgZGF0YS5cclxuICAgIGdldFBpeGVsczogZnVuY3Rpb24gKCkge1xyXG5cclxuICAgICAgdGhpcy5jbGVhcigpO1xyXG5cclxuICAgICAgc3dpdGNoICggdGhpcy50eXBlICkge1xyXG5cclxuICAgICAgICBjYXNlICdwaWN0dXJlJzpcclxuICAgICAgICAgIHRoaXMuY29udGV4dC5kcmF3SW1hZ2UoIHRoaXMucGljdHVyZSwgdGhpcy5zaXplLngsIHRoaXMuc2l6ZS55LCB0aGlzLnNpemUudywgdGhpcy5zaXplLmggKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICBjYXNlICd0ZXh0JzpcclxuICAgICAgICAgIHRoaXMuc2V0VGV4dCgpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmKCAhdGhpcy5zaXplLncgJiYgIXRoaXMuc2l6ZS5oICkgcmV0dXJuIGZhbHNlO1xyXG5cclxuICAgICAgcmV0dXJuIHRoaXMuY29udGV4dC5nZXRJbWFnZURhdGEoIHRoaXMuc2l6ZS54LCB0aGlzLnNpemUueSwgdGhpcy5zaXplLncsIHRoaXMuc2l6ZS5oICk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIERyYXcgdGV4dCBpbiBjYW52YXMuXHJcbiAgICBzZXRUZXh0OiBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgICAvLyBDbGVhciB1c2VsZXNzIHNwYWNlcyBpbiBzdHJpbmcgdG8gZHJhdy5cclxuICAgICAgdmFyIGNsZWFyZWQgPSB0aGlzLnBpY3R1cmUudHJpbSgpO1xyXG5cclxuICAgICAgLy8gSWYgc3RyaW5nIGVtcHR5LCBzZXQgc2l6ZSB0byAwIHRvIGF2b2lkIG1hdHJpeCBjYWxjdWxhdGlvbiwgYW5kIGNsZWFyIG1hdHJpeC5cclxuICAgICAgaWYgKGNsZWFyZWQgPT09IFwiXCIpIHtcclxuICAgICAgICB0aGlzLnNpemUueCA9IDA7XHJcbiAgICAgICAgdGhpcy5zaXplLnkgPSAwO1xyXG4gICAgICAgIHRoaXMuc2l6ZS53ID0gMDtcclxuICAgICAgICB0aGlzLnNpemUuaCA9IDA7XHJcbiAgICAgICAgdGhpcy5jbGVhck1hdHJpeCgpO1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdmFyIGksIHcgPSAwLCB4ID0gMjAsIHkgPSA4MCxcclxuICAgICAgICBsaW5lcyA9IHRoaXMucGljdHVyZS5zcGxpdChcIlxcblwiKSwgLy8gU3BsaXQgdGV4dCBpbiBhcnJheSBmb3IgZWFjaCBlbmQgb2YgbGluZS5cclxuICAgICAgICBmb250U2l6ZSA9IHRoaXMuaW5zdGFuY2Uuc2V0dGluZ3MuZm9udFNpemU7XHJcblxyXG4gICAgICB0aGlzLmNvbnRleHQuZm9udCA9IGZvbnRTaXplICsgXCJweCBcIiArIHRoaXMuaW5zdGFuY2Uuc2V0dGluZ3MuZm9udDtcclxuICAgICAgdGhpcy5jb250ZXh0LmZpbGxTdHlsZSA9IHRoaXMuaW5zdGFuY2Uuc2V0dGluZ3MudGV4dENvbG9yO1xyXG4gICAgICB0aGlzLmNvbnRleHQudGV4dEFsaWduID0gXCJsZWZ0XCI7XHJcblxyXG4gICAgICAvLyBEcmF3IGxpbmUgYnkgbGluZS5cclxuICAgICAgZm9yIChpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdGhpcy5jb250ZXh0LmZpbGxUZXh0KCBsaW5lc1tpXSwgeCwgeSArIGkqZm9udFNpemUgKTtcclxuICAgICAgICB3ID0gTWF0aC5tYXgoIHcsIE1hdGguZmxvb3IodGhpcy5jb250ZXh0Lm1lYXN1cmVUZXh0KCBsaW5lc1tpXSApLndpZHRoKSApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBTZXQgc2l6ZSBvYmplY3QsIHRvIGNhbGN1bGF0ZSB0YXJnZXRlZCB6b25lIG9uIHRoZSBtYXRyaXguXHJcbiAgICAgIHRoaXMuc2l6ZS54ID0gTWF0aC5tYXgoIHgsICB0aGlzLnNpemUueCApO1xyXG4gICAgICB0aGlzLnNpemUueSA9IE1hdGgubWF4KCAoeSAtIGZvbnRTaXplKSwgdGhpcy5zaXplLnkgKTtcclxuICAgICAgdGhpcy5zaXplLncgPSBNYXRoLm1heCggKHcgKyBmb250U2l6ZSksIHRoaXMuc2l6ZS53ICk7XHJcbiAgICAgIHRoaXMuc2l6ZS5oID0gTWF0aC5tYXgoIChmb250U2l6ZSAqIGkgKyBmb250U2l6ZSksIHRoaXMuc2l6ZS5oICk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIEFwcGx5IGZpbHRlcidzIG5hbWUgd2l0aCBhcmdBcnJheS5cclxuICAgIGFwcGx5RmlsdGVyOiBmdW5jdGlvbiAoIG5hbWUsIGFyZ0FycmF5ICkge1xyXG5cclxuICAgICAgdmFyIHAgPSB0aGlzLmdldFBpeGVscygpO1xyXG5cclxuICAgICAgLy8gSWYgZmlsdGVyIGRvZXNuJ3QgZXhpc3QsIG9yIG5vIG5hbWUsIHN0b3AgcHJvY2Vzcy5cclxuICAgICAgLy9pZiAoIGZpbHRlcltuYW1lXSA9PT0gdW5kZWZpbmVkICkgdGhyb3cgbmV3IEVycm9yKFwiZmlsdGVyICdcIiArIG5hbWUgK1wiJyBkb2VzJ250IGV4aXN0IGFzIGZpbHRlcnMgbWV0aG9kLlwiKTtcclxuICAgICAgaWYgKCAhZmlsdGVyW25hbWVdICkgcmV0dXJuO1xyXG5cclxuICAgICAgLy8gR2V0IGltYWdlIGRhdGEgcGl4ZWxzLlxyXG4gICAgICB2YXIgaSwgYXJncyA9IFsgcCBdO1xyXG4gICAgICB2YXIgcGl4ZWxzO1xyXG5cclxuICAgICAgLy8gQ29uc3RydWN0IGFyZ3MgYXJyYXkuXHJcbiAgICAgIGZvciAoIGkgPSAwOyBpIDwgYXJnQXJyYXkubGVuZ3RoOyBpKysgKSB7XHJcbiAgICAgICAgYXJncy5wdXNoKCBhcmdBcnJheVtpXSApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBBcHBseSBmaWx0ZXIuXHJcbiAgICAgIHAgPSBmaWx0ZXJbbmFtZV0uYXBwbHkoIG51bGwsIGFyZ3MgKTtcclxuXHJcbiAgICAgIC8vIFNldCBuZXcgaW1hZ2UgZGF0YSBvbiBjYW52YXMuXHJcbiAgICAgIHRoaXMuY29udGV4dC5wdXRJbWFnZURhdGEoIHAsIHRoaXMuc2l6ZS54LCB0aGlzLnNpemUueSApO1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBDcmVhdGUgYW5kIHN0b3JlIG9uZSBtYXRyaXggcGVyIG1vZGUgcmVnaXN0ZXJlZCwgaWYgaW5zdGFuY2Uuc2V0dGluZ3MubW9kZXNbbW9kZV9uYW1lXSBpcyB0cnVlLlxyXG4gICAgYnVpbGRBbGxNYXRyaXg6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgdmFyIG0sIG1BID0ge307XHJcbiAgICAgIGZvciAoIHZhciBtb2RlIGluIG1hdHJpeE1ldGhvZCApIHtcclxuICAgICAgICBpZiAoICF0aGlzLmluc3RhbmNlLnNldHRpbmdzLm1vZGVzW21vZGVdICkgY29udGludWU7XHJcbiAgICAgICAgbSA9IHRoaXMuY3JlYU1hdHJpeCgpO1xyXG4gICAgICAgIHRoaXMuYXBwbHlGaWx0ZXIoIGZpbHRlcnNbbW9kZV0ubmFtZSwgdGhpcy5pbnN0YW5jZS5zZXR0aW5nc1tmaWx0ZXJzW21vZGVdLnBhcmFtXSApO1xyXG4gICAgICAgIHRoaXNbbWF0cml4TWV0aG9kW21vZGVdXShtLCAxKTtcclxuICAgICAgICBtQVttb2RlXSA9IG07XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIG1BO1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBSZXR1cm4gYWN0aXZlIG1hdHJpeC5cclxuICAgIGdldE1hdHJpeDogZnVuY3Rpb24oKXtcclxuICAgICAgcmV0dXJuIHRoaXMubWF0cml4W3RoaXMuaW5zdGFuY2UubW9kZV0gfHwgZmFsc2U7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIENyZWF0ZSBtYXRyaXguXHJcbiAgICBjcmVhTWF0cml4OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHZhciBhID0gdGhpcy5pbnN0YW5jZS5zZXR0aW5ncy53aWR0aCxcclxuICAgICAgICBiID0gdGhpcy5pbnN0YW5jZS5zZXR0aW5ncy5oZWlnaHQsXHJcbiAgICAgICAgbWF0ID0gbmV3IEFycmF5KCBhICksIGksIGo7XHJcbiAgICAgIGZvciggaSA9IDA7IGkgPCBhOyBpKysgKSB7XHJcbiAgICAgICAgbWF0W2ldID0gbmV3IEFycmF5KCBiICk7XHJcbiAgICAgICAgZm9yKCBqID0gMDsgaiA8IGI7IGorKyApe1xyXG4gICAgICAgICAgbWF0W2ldW2pdID0gMDtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIG1hdDtcclxuICAgIH0sXHJcblxyXG4gICAgLy8gU2V0IGFsbCBtYXRyaXggdmFsdWVzIHRvIHZhbHVlIG9yIDA7XHJcbiAgICBjbGVhck1hdHJpeDogZnVuY3Rpb24oIHZhbHVlICl7XHJcbiAgICAgIHZhciBpLCBqLCBsLCBtLCB2LFxyXG4gICAgICAgIG1hdHJpeCA9IHRoaXMuZ2V0TWF0cml4KCk7XHJcbiAgICAgIHYgPSB2YWx1ZSB8fCAwO1xyXG4gICAgICBsID0gbWF0cml4Lmxlbmd0aDtcclxuICAgICAgbSA9IG1hdHJpeFswXS5sZW5ndGg7XHJcbiAgICAgIGZvciggaSA9IDA7IGkgPCBsOyBpKysgKXtcclxuICAgICAgICBmb3IoIGogPSAwOyBqIDwgbTsgaisrICl7XHJcbiAgICAgICAgICBtYXRyaXhbaV1bal0gPSB2O1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICAvLyBDb25zdHJ1Y3QgbWF0cml4LCBhY2NvcmRpbmcgdG8gdmFudmFzJ3MgaW1hZ2UgZGF0YSB2YWx1ZXMuXHJcbiAgICAvLyBJZiBpbWFnZSBkYXRhIHBpeGVsIGlzIHdoaXRlLCBjb3JyZXNwb25kaW5nIG1hdHJpeCBjYXNlIGlzIHNldCB0b28gdmFsdWUuXHJcbiAgICAvLyBJZiBpbWFnZSBkYXRhIHBpeGVsIGlzIGJsYWNrLCBjb3JyZXNwb25kaW5nIG1hdHJpeCBjYXNlIGlzIHNldCB0byAwLlxyXG4gICAgdmFsdWVNYXRyaXg6IGZ1bmN0aW9uICggbWF0cml4LCB2YWx1ZSApIHtcclxuICAgICAgdmFyIGEgPSB0aGlzLnNpemUueCxcclxuICAgICAgICBiID0gTWF0aC5taW4oIE1hdGguZmxvb3IoYSArIHRoaXMuc2l6ZS53KSwgbWF0cml4Lmxlbmd0aCApLFxyXG4gICAgICAgIGMgPSB0aGlzLnNpemUueSxcclxuICAgICAgICBkID0gTWF0aC5taW4oIE1hdGguZmxvb3IoYyArIHRoaXMuc2l6ZS5oKSwgbWF0cml4WzBdLmxlbmd0aCApO1xyXG4gICAgICBpZiggbWF0cml4Lmxlbmd0aCA8IGEgfHwgbWF0cml4WzBdLmxlbmd0aCA8IGQgKSByZXR1cm47XHJcblxyXG4gICAgICB2YXIgaSwgaiwgcCA9IHRoaXMuY29udGV4dC5nZXRJbWFnZURhdGEoMCwgMCwgdGhpcy5pbnN0YW5jZS5jYW52YXMud2lkdGgsIHRoaXMuaW5zdGFuY2UuY2FudmFzLmhlaWdodCkuZGF0YTtcclxuXHJcbiAgICAgIGZvciggaSA9IGE7IGkgPCBiOyBpKysgKXtcclxuICAgICAgICBmb3IoIGogPSBjOyBqIDwgZDsgaisrICl7XHJcbiAgICAgICAgICB2YXIgcGl4ID0gcFsoKHRoaXMuaW5zdGFuY2UuY2FudmFzLndpZHRoICogaikgKyBpKSAqIDRdO1xyXG4gICAgICAgICAgbWF0cml4W2ldW2pdID0gKCBwaXggPT09IDI1NSApID8gdmFsdWUgOiAwO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICAvLyBDcmVhdGUgY2FudmFzIHRodW1ibmFpbHMgb2YgdGhlIHBpY3R1cmUgc3RvcmUgb24gdGhpcyBNYXRyaXguXHJcbiAgICByZW5kZXJUaHVtYm5haWxzOiBmdW5jdGlvbiAoIHRhcmdldCwgZmlsdGVyICkge1xyXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG4gICAgICAvLyBDcmVhdGUgbmV3IE1hdHJpeCBmb3IgdGhpcyB0aHVtYi5cclxuICAgICAgdmFyIG0gPSBuZXcgTWF0cml4ICggdGhpcy5pbnN0YW5jZSwgdGhpcy5waWN0dXJlLCB7IHc6dGhpcy5pbnN0YW5jZS5zZXR0aW5ncy50aHVtYldpZHRoLCBoOnRoaXMuaW5zdGFuY2Uuc2V0dGluZ3MudGh1bWJIZWlnaHQgfSApO1xyXG5cclxuICAgICAgLy8gQXBwbHkgZmlsdGVyLlxyXG4gICAgICBpZiAoIGZpbHRlciApIHtcclxuICAgICAgICBtLmFwcGx5RmlsdGVyKCBmaWx0ZXJzW3RoaXMuaW5zdGFuY2UubW9kZV0ubmFtZSwgdGhpcy5zZXR0aW5nc1tmaWx0ZXJzW3RoaXMuaW5zdGFuY2UubW9kZV0ucGFyYW1dICk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIEFwcGx5IGNsaWNrIGV2ZW50IG9uIHRoZSB0aHVtYidzIGNhbnZhcyB0aGF0IGZpcmUgdGhlIERpYXBQYXJ0J3MgaW5zdGFuY2UgYWN0aXZlIGluZGV4IHRvIGNvcmVzcG9uZGluZyBNYXRyaXguXHJcbiAgICAgIG0uY2FudmFzLm9uY2xpY2sgPSBmdW5jdGlvbiggbWF0cml4ICl7XHJcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICggZSApIHtcclxuICAgICAgICAgIHNlbGYuaW5zdGFuY2UuZ29UbyggbWF0cml4ICk7XHJcbiAgICAgICAgICBzZWxmLmluc3RhbmNlLmNsZWFyUGFydHMoKTtcclxuICAgICAgICAgIHNlbGYuaW5zdGFuY2UubGliZXJhdGlvblBhcnRzMSgpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSggbSApO1xyXG5cclxuICAgICAgLy8gU3RvcmUgTWF0cml4J3MgaW5zdGFuY2Ugb2YgdGhlIHRodW1iIGluIGFuIGFycmF5LlxyXG4gICAgICB0aGlzLmluc3RhbmNlLnRodW1iT3JpZ2luYWxUYWIucHVzaCggbSApO1xyXG5cclxuICAgICAgLy8gSW5qZWN0IHRodW1iJ3MgY2FudmFzIGluIHRoZSBET00uXHJcbiAgICAgIGZuLmFwcGVuZCggdGFyZ2V0LCBtLmNhbnZhcyApO1xyXG5cclxuICAgICAgcmV0dXJuIG07XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogRGlhcFBhcnQgY29uc3RydWN0b3IuXHJcbiAgICogQSBEaWFwUGFyZXQgaW5zdGFuY2UgbXVzdCBiZSBjcmVhdGVkIGFuZCBpbml0aWFsaXplZCB0byBjcmVhdGUgc2xpZGVzaG93LlxyXG4gICAqXHJcbiAgICovXHJcblxyXG4gIGZ1bmN0aW9uIERpYXBQYXJ0ICgpIHtcclxuICAgIHRoaXMuc2V0dGluZ3MgPSBmbi5zaW1wbGVFeHRlbmQoIHt9LCBkZWZhdWx0cyApO1xyXG4gICAgdGhpcy5tYXRyaXhUYWIgPSBbXTtcclxuICAgIHRoaXMudGh1bWJPcmlnaW5hbFRhYiA9IFtdO1xyXG4gICAgdGhpcy5wYXJ0aWNsZXMgPSBbXTtcclxuICAgIHRoaXMuY2hhbXBzID0gW107XHJcbiAgICB0aGlzLm1vZGUgPSB0aGlzLnNldHRpbmdzLmluaXRpYWxNb2RlO1xyXG4gICAgdGhpcy5saWJlcmF0aW9uID0gZmFsc2U7XHJcbiAgICB0aGlzLmFjdGl2ZUluZGV4ID0gbnVsbDtcclxuICAgIHRoaXMuY2FudmFzID0gdGhpcy5nZXRDYW52YXMoKTtcclxuICAgIHRoaXMuY29udGV4dCA9IHRoaXMuZ2V0Q29udGV4dDJEKCB0aGlzLmNhbnZhcyApO1xyXG4gIH1cclxuXHJcbiAgRGlhcFBhcnQucHJvdG90eXBlID0ge1xyXG5cclxuICAgICAgLy8gSW5pdGlhbGl6ZSBEaWFwUGFydCBpbnN0YW5jZS5cclxuICAgICAgaW5pdDogZnVuY3Rpb24gKCBvcHRpb25zICkge1xyXG5cclxuICAgICAgICAvLyBTdG9yZSBzZXR0aW5ncy5cclxuICAgICAgICBmbi5zaW1wbGVFeHRlbmQoIHRoaXMuc2V0dGluZ3MsIG9wdGlvbnMgKTtcclxuXHJcbiAgICAgICAgLy8gSW5qZWN0IGNhbnZhcyBvbiBET00uXHJcbiAgICAgICAgZm4uYXBwZW5kKCB0aGlzLnNldHRpbmdzLnRhcmdldEVsZW1lbnQsIHRoaXMuY2FudmFzICk7XHJcblxyXG4gICAgICAgIC8vIEFwcGx5IHN0eWxlIHRvIGNhbnZhcyBlbGVtZW50LlxyXG4gICAgICAgIHRoaXMuY2FudmFzLnN0eWxlLmJhY2tncm91bmRDb2xvciA9IHRoaXMuc2V0dGluZ3MuYmFja2dyb3VuZDtcclxuXHJcbiAgICAgICAgLy8gU2V0IG1hc3MgaW5pdGlhbCBjb29yZHMgdG8gY2FudmEncyBjZW50ZXIuXHJcbiAgICAgICAgdGhpcy5jZW50ZXJNYXNzKCk7XHJcblxyXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgbWFzcy5cclxuICAgICAgICB0aGlzLmNoYW1wcy5wdXNoKCBuZXcgTWFzcyggbmV3IFZlY3Rvcih0aGlzLnNldHRpbmdzLm1hc3NYLCB0aGlzLnNldHRpbmdzLm1hc3NZKSwgdGhpcy5zZXR0aW5ncy5tYXNzICkgKTtcclxuXHJcbiAgICAgICAgLy8gU3RhcnQgdGhlIGxvb3AuXHJcbiAgICAgICAgdGhpcy5sb29wKCk7XHJcblxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gU2V0IG9wdGlvbnMgdG8gc2V0dGluZ3MuXHJcbiAgICAgIHNldDogZnVuY3Rpb24gKCBvcHRpb25zICl7XHJcbiAgICAgICAgZm4uc2ltcGxlRXh0ZW5kKCB0aGlzLnNldHRpbmdzLCBvcHRpb25zICk7XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBDcmVhdGUgbmV3IHNsaWRlLCBhY2NvcmRpbmcgdG8gaW5wdXQgdmFsdWUgOiBJbWFnZSBvciBTdHJpbmcuXHJcbiAgICAgIGNyZWF0ZVNsaWRlOiBmdW5jdGlvbiggaW5wdXQsIGN1c3RvbVNpemUgKXtcclxuXHJcbiAgICAgICAgLy8gQ3JlYXRlIHRoZSBNYXRyaXggaW5zdGFuY2UgYWNjb3JkaW5nIHRvIGlucHV0LlxyXG4gICAgICAgIHZhciBtID0gbmV3IE1hdHJpeCAoIHRoaXMsIGlucHV0LCBjdXN0b21TaXplICk7XHJcblxyXG4gICAgICAgIC8vIFNldCBhY3RpdmUgaW5kZXggdG8gMCBpZiBpdCdzIG51bGwuXHJcbiAgICAgICAgdGhpcy5hY3RpdmVJbmRleCA9ICggdGhpcy5hY3RpdmVJbmRleCA9PT0gbnVsbCApID8gMCA6IHRoaXMuYWN0aXZlSW5kZXg7XHJcbiAgICAgICAgdGhpcy5tYXRyaXhUYWIucHVzaCggbSApO1xyXG4gICAgICAgIHJldHVybiBtO1xyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gQ3JlYXRlIGFuZCByZXR1cm4gY2FudmFzIGVsZW1lbnQuIElmIG5vIHNpemUgc3BlY2lmaWVkLCB0YWtlIGluc3RhbmNlJ3Mgc2V0dGluZ3Mgc2l6ZS5cclxuICAgICAgZ2V0Q2FudmFzOiBmdW5jdGlvbiAoIHNpemUgKSB7XHJcbiAgICAgICAgdmFyIGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoICdjYW52YXMnICksXHJcbiAgICAgICAgICAgIHMgPSBzaXplIHx8IHt9O1xyXG5cclxuICAgICAgICBjYW52YXMuaGVpZ2h0ID0gKCBzLmggKSA/IHMuaCA6IHRoaXMuc2V0dGluZ3MuaGVpZ2h0O1xyXG4gICAgICAgIGNhbnZhcy53aWR0aCA9ICggcy53ICkgPyBzLncgOiB0aGlzLnNldHRpbmdzLndpZHRoO1xyXG5cclxuICAgICAgICByZXR1cm4gY2FudmFzO1xyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gQ3JlYXRlIGFuZCByZXR1cm4gY29udGV4dCBmb3IgY2FudmFzLlxyXG4gICAgICBnZXRDb250ZXh0MkQ6IGZ1bmN0aW9uICggY2FudmFzICkge1xyXG4gICAgICAgIHJldHVybiBjYW52YXMuZ2V0Q29udGV4dCggJzJkJyApO1xyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gUmV0dXJuIGNvb3JkcywgaGVpZ2h0IGFuZCB3aWR0aCBvZiB0aGUgaW1nIHJlc2l6ZWQgYWNjb3JkaW5nIHRvIHNpemUgYXJnLCBvciBpbnN0YW5jZSdzIGNhbnZhcyBzaXplLiBcclxuICAgICAgZ2V0SW1hZ2VTaXplOiBmdW5jdGlvbiAoIGltZywgc2l6ZSApIHtcclxuICAgICAgICB2YXIgdyA9IGltZy53aWR0aCwgXHJcbiAgICAgICAgICAgIGggPSBpbWcuaGVpZ2h0LFxyXG4gICAgICAgICAgICBjdyA9ICggc2l6ZSApID8gc2l6ZS53IDogdGhpcy5jYW52YXMud2lkdGgsXHJcbiAgICAgICAgICAgIGNoID0gKCBzaXplICkgPyBzaXplLmggOiB0aGlzLmNhbnZhcy5oZWlnaHQsXHJcbiAgICAgICAgICAgIHJhdGlvID0gdyAvIGg7XHJcblxyXG4gICAgICAgIGlmICggdyA+PSBoICYmIHcgPiBjdyApIHtcclxuICAgICAgICAgIHcgPSBjdztcclxuICAgICAgICAgIGggPSBNYXRoLnJvdW5kKCB3IC8gcmF0aW8gKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICBpZiAoIGggPiBjaCApIHtcclxuICAgICAgICAgICAgaCA9IGNoO1xyXG4gICAgICAgICAgICB3ID0gTWF0aC5yb3VuZCggaCAqIHJhdGlvICk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgeDogTWF0aC5yb3VuZCggKCBjdyAtIHcgKSAvIDIgKSxcclxuICAgICAgICAgIHk6IE1hdGgucm91bmQoICggY2ggLSBoICkgLyAyICksIFxyXG4gICAgICAgICAgdzogdyxcclxuICAgICAgICAgIGg6IGhcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBNZXRob2QgdG8gcGFzcyBhcyBvbmNoYW5nZSBldmVudCBmdW5jdGlvbiBpbiBmaWxlcyBpbnB1dC5cclxuICAgICAgbG9hZDogZnVuY3Rpb24gKCBlLCB0aHVtYiApIHtcclxuXHJcbiAgICAgICAgdmFyIGksIGZpbGVzID0gZS50YXJnZXQuZmlsZXMsIHNlbGYgPSB0aGlzO1xyXG5cclxuICAgICAgICAvLyBJZiBubyBmaWxlIHNlbGVjdGVkLCBleGl0LlxyXG4gICAgICAgIGlmICggIWZpbGVzICkgcmV0dXJuO1xyXG5cclxuICAgICAgICBmb3IgKCBpID0gMDsgaSA8IGZpbGVzLmxlbmd0aDsgaSsrICl7XHJcblxyXG4gICAgICAgICAgdmFyIGZpbGUgPSBmaWxlc1tpXTtcclxuXHJcbiAgICAgICAgICAvLyBJZiBmaWxlIGlzIG5vdCBhbiBpbWFnZSwgcGFzcyB0byBuZXh0IGZpbGUuXHJcbiAgICAgICAgICBpZiAoICFmaWxlLnR5cGUubWF0Y2goICdpbWFnZScgKSApIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xyXG5cclxuICAgICAgICAgIC8vIFdoZW4gZmlsZSBpcyBsb2FkZWQuXHJcbiAgICAgICAgICByZWFkZXIub25sb2FkID0gZnVuY3Rpb24gKCBldmVudCApIHtcclxuXHJcbiAgICAgICAgICAgIHZhciBpbWcgPSBuZXcgSW1hZ2UoKTtcclxuXHJcbiAgICAgICAgICAgIC8vIFdoZW4gaW1hZ2UgaXMgbG9hZGVkLlxyXG4gICAgICAgICAgICBpbWcub25sb2FkID0gZnVuY3Rpb24oKXtcclxuXHJcbiAgICAgICAgICAgICAgLy8gQ3JlYXRlIHNsaWRlLCB3aXRoIEltYWdlIGlucHV0LlxyXG4gICAgICAgICAgICAgIHZhciBtID0gc2VsZi5jcmVhdGVTbGlkZSggdGhpcyApO1xyXG5cclxuICAgICAgICAgICAgICBpZiAoICF0aHVtYiApIHJldHVybjtcclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAvLyBDcmVhdGUgYW5kIHN0b3JlIHRodW1iLlxyXG4gICAgICAgICAgICAgIG0ucmVuZGVyVGh1bWJuYWlscyggc2VsZi5zZXR0aW5ncy50aHVtZG5haWxzSUQsIGZhbHNlICk7XHJcblxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAvLyBMb2FkIGltZy5cclxuICAgICAgICAgICAgaW1nLnNyYyA9IGV2ZW50LnRhcmdldC5yZXN1bHQ7XHJcbiAgICAgICAgICB9O1xyXG4gICAgICAgICAgLy8gTG9hZCBmaWxlLlxyXG4gICAgICAgICAgcmVhZGVyLnJlYWRBc0RhdGFVUkwoIGZpbGUgKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBDaGFuZ2UgaW5zdGFuY2UncyBtb2RlLiBCYXNpY2FsbHksIGl0IGNoYW5nZSBtZXRob2RzIHRvIHRlc3QgZWFjaCBQYXJ0aWNsZXMsIGFuZCBtYXRyaXggdGhhdCdzIHRlc3RlZC5cclxuICAgICAgc3dpdGNoTW9kZTogZnVuY3Rpb24gKCBtb2RlICkge1xyXG5cclxuICAgICAgICAvLyBTZXQgbW9kZS5cclxuICAgICAgICB0aGlzLm1vZGUgPSBtb2RlO1xyXG5cclxuICAgICAgICAvLyBDYWxsIGNhbGxiYWNrIGlmIGV4aXN0LlxyXG4gICAgICAgIGlmKCB0eXBlb2YgdGhpcy5zZXR0aW5ncy5zd2l0Y2hNb2RlQ2FsbGJhY2sgPT09ICdmdW5jdGlvbicgKSB7XHJcbiAgICAgICAgICB0aGlzLnNldHRpbmdzLnN3aXRjaE1vZGVDYWxsYmFjay5jYWxsKCB0aGlzICk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gQ3JlYXRlIG5ldyBtYXNzIGFuZCBzdG9yZSBvbiBjaGFtcCBhcnJheS5cclxuICAgICAgYWRkTWFzczogZnVuY3Rpb24oIHgsIHksIG1hc3MgKXtcclxuICAgICAgICB2YXIgbSA9IG5ldyBNYXNzKCBuZXcgVmVjdG9yKHgsIHkpLCBtYXNzICk7XHJcbiAgICAgICAgdGhpcy5jaGFtcHMucHVzaCggbSApO1xyXG4gICAgICAgIHJldHVybiBtO1xyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gU2V0IG1hc3MgY29vcmRzIHRvIGNhbnZhJ3MgY2VudGdlciBvbiBpbnN0YW5jZSdzIHNldHRpbmdzLlxyXG4gICAgICBjZW50ZXJNYXNzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5tYXNzWCA9IHRoaXMuY2FudmFzLndpZHRoLzI7XHJcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5tYXNzWSA9IHRoaXMuY2FudmFzLmhlaWdodC8yO1xyXG5cclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIENhbGwgcGFydGljbGUgbWV0aG9kcyBpbiBlYWNoIGxvb3AsIGFjY29yZGluZyB0byBhY3RpdmUgbW9kZSBhbmQgY29ycmVzcG9uZGluZyBwcm9jZWVkIHNldHRpbmdzLlxyXG4gICAgICBwYXJ0UHJvY2VlZDogZnVuY3Rpb24gKCBwYXJ0aWNsZSApIHtcclxuICAgICAgICB2YXIgaSwgbCA9IHByb2NlZWRbdGhpcy5tb2RlXS5sZW5ndGg7XHJcbiAgICAgICAgZm9yICggaSA9IDA7IGkgPCBsOyBpKysgKSB7XHJcbiAgICAgICAgICBwYXJ0aWNsZVtwcm9jZWVkW3RoaXMubW9kZV1baV1dKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gU2V0IGFjdGl2ZUluZGV4IHRvIG1hdHJpeCdzIHRodW1iIGluZGV4LlxyXG4gICAgICBnb1RvOiBmdW5jdGlvbiAoIG1hdHJpeCApIHtcclxuICAgICAgICB0aGlzLmFjdGl2ZUluZGV4ID0gdGhpcy50aHVtYk9yaWdpbmFsVGFiLmluZGV4T2YoIG1hdHJpeCApO1xyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gTWFrZSBwYXJ0aWNsZXMgZnJlZSBmb3Igc2hvcnQgZGVsYXkuXHJcbiAgICAgIGxpYmVyYXRpb25QYXJ0czE6IGZ1bmN0aW9uICggZGVsYXkgKSB7XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgIHZhciBkID0gZGVsYXkgfHwgNTAwO1xyXG5cclxuICAgICAgICAvLyBQYXJ0aWNsZXMgYXJlIGZyZWUgZnJvbSBtYXRyaXggb2YgdHlwZSAndmFsdWUnLlxyXG4gICAgICAgIHRoaXMubGliZXJhdGlvbiA9ICF0aGlzLmxpYmVyYXRpb247XHJcblxyXG4gICAgICAgICAgLy8gTWFzcyBzdHJlbmd0aCBpcyBpbnZlcnRlZC5cclxuICAgICAgICAgIHRoaXMuY2hhbXBzWzBdLm1hc3MgPSB0aGlzLnNldHRpbmdzLmFudGlNYXNzO1xyXG5cclxuICAgICAgICAgIC8vIFdoZW4gZGVsYXkncyBvdmVyLCB3aGUgcmV0dXJuIHRvIG5vcm1hbCBtYXNzIHN0cmVuZ3RoIGFuZCBwYXJ0aWNsZXMgYmVoYXZpb3IuXHJcbiAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgIHNlbGYuY2hhbXBzWzBdLm1hc3MgPSBzZWxmLnNldHRpbmdzLm1hc3M7XHJcbiAgICAgICAgICAgIHNlbGYubGliZXJhdGlvbiA9ICFzZWxmLmxpYmVyYXRpb247XHJcbiAgICAgICAgICB9LCBkKVxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gQ3JlYXRlIG5ldyBQYXJ0aWNsZSwgd2l0aCByYW5kb20gcG9zaXRpb24gYW5kIHNwZWVkLlxyXG4gICAgICBjcmVhUGFydHM6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBpZiAodGhpcy5wYXJ0aWNsZXMubGVuZ3RoIDwgdGhpcy5zZXR0aW5ncy5kZW5zaXR5KSB7XHJcbiAgICAgICAgICB2YXIgaSwgbmIgPSB0aGlzLnNldHRpbmdzLmRlbnNpdHkgLSB0aGlzLnBhcnRpY2xlcy5sZW5ndGg7XHJcbiAgICAgICAgICBmb3IgKCBpID0gMDsgaSA8IG5iOyBpKysgKSB7XHJcbiAgICAgICAgICAgIHRoaXMucGFydGljbGVzLnB1c2gobmV3IFBhcnRpY2xlKHRoaXMsIG5ldyBWZWN0b3IoTWF0aC5yYW5kb20oKSAqIHRoaXMuY2FudmFzLndpZHRoLCBNYXRoLnJhbmRvbSgpICogdGhpcy5jYW52YXMuaGVpZ2h0KSwgbmV3IFZlY3RvcihyZWFsUmFuZG9tKHRoaXMuc2V0dGluZ3MuaW5pdGlhbFZlbG9jaXR5KSwgcmVhbFJhbmRvbSh0aGlzLnNldHRpbmdzLmluaXRpYWxWZWxvY2l0eSkpLCBuZXcgVmVjdG9yKDAsIDApLCAwLCBmYWxzZSkpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIFByb2NlZWQgYWxsIHBhcnRpY3VsZXMuXHJcbiAgICAgIHVwZ3JhZGVQYXJ0czogZnVuY3Rpb24gKCkge1xyXG5cclxuICAgICAgICB2YXIgY3VycmVudFBhcnRzID0gW10sXHJcbiAgICAgICAgICAgIGksIGwgPSB0aGlzLnBhcnRpY2xlcy5sZW5ndGg7XHJcblxyXG4gICAgICAgIGZvciggaSA9IDA7IGkgPCBsOyBpKysgKXtcclxuXHJcbiAgICAgICAgICB2YXIgcGFydGljbGUgPSB0aGlzLnBhcnRpY2xlc1tpXSxcclxuICAgICAgICAgICAgICBwb3MgPSBwYXJ0aWNsZS5wb3NpdGlvbjtcclxuXHJcbiAgICAgICAgICAvLyBJZiBwYXJ0aWNsZSBvdXQgb2YgY2FudmFzLCBmb3JnZXQgaXQuXHJcbiAgICAgICAgICBpZiggcG9zLnggPj0gdGhpcy5jYW52YXMud2lkdGggfHwgcG9zLnggPD0gMCB8fCBwb3MueSA+PSB0aGlzLmNhbnZhcy5oZWlnaHQgfHwgcG9zLnkgPD0gMCApIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAgIC8vIFByb2NlZWQgdGhlIHBhcnRpY2xlLlxyXG4gICAgICAgICAgdGhpcy5wYXJ0UHJvY2VlZCggcGFydGljbGUgKTtcclxuXHJcbiAgICAgICAgICAvLyBNb3ZlIHRoZSBwYXJ0aWNsZS5cclxuICAgICAgICAgIHBhcnRpY2xlLm1vdmUoKTtcclxuXHJcbiAgICAgICAgICAvLyBTdG9yZSB0aGUgcGFydGljbGUuXHJcbiAgICAgICAgICBjdXJyZW50UGFydHMucHVzaCggcGFydGljbGUgKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5wYXJ0aWNsZXMgPSBjdXJyZW50UGFydHM7XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBEcmF3IHBhcnRpY2xlcyBpbiBjYW52YXMuXHJcbiAgICAgIGRyYXdQYXJ0czogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBpLCBuID0gdGhpcy5wYXJ0aWNsZXMubGVuZ3RoO1xyXG4gICAgICAgIGZvciggaSA9IDA7IGkgPCBuOyBpKysgKXtcclxuICAgICAgICAgIHZhciBwb3MgPSB0aGlzLnBhcnRpY2xlc1tpXS5wb3NpdGlvbjtcclxuICAgICAgICAgIHRoaXMuY29udGV4dC5maWxsU3R5bGUgPSB0aGlzLnBhcnRpY2xlc1tpXS5jb2xvcjtcclxuICAgICAgICAgIHRoaXMuY29udGV4dC5maWxsUmVjdChwb3MueCwgcG9zLnksIHRoaXMuc2V0dGluZ3MucGFydGljbGVTaXplLCB0aGlzLnNldHRpbmdzLnBhcnRpY2xlU2l6ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gTWFrZSBmcmVlIGFsbCBwYXJ0aWNsZXMuXHJcbiAgICAgIGNsZWFyUGFydHM6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgaSwgbCA9IHRoaXMucGFydGljbGVzLmxlbmd0aDtcclxuICAgICAgICBmb3IoIGkgPSAwOyBpIDwgbDsgaSsrICl7XHJcbiAgICAgICAgICB0aGlzLnBhcnRpY2xlc1tpXS5pbkZvcm0gPSAwO1xyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIENsZWFuIGNhbnZhcy5cclxuICAgICAgY2xlYXI6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBpZiggIXRoaXMuc2V0dGluZ3MuZHJhdyApIHtcclxuICAgICAgICAgIHRoaXMuY29udGV4dC5jbGVhclJlY3QoIDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQgKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBMb29wJ3MgY2FsbGJhY2suXHJcbiAgICAgIHF1ZXVlOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgIGlmKCAhdGhpcy5zZXR0aW5ncy5zdG9wICkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZXF1ZXN0SUQgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKCBzZWxmLmxvb3AuYmluZChzZWxmKSApO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUoIHNlbGYucmVxdWVzdElEICk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlcXVlc3RJRCA9IHVuZGVmaW5lZDtcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBDcmVhdGUgYW5kIHByb2NlZWQgbmV3IHBhcnRpY2xlcyBpZiBtaXNzaW5nLlxyXG4gICAgICB1cGRhdGU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLmNyZWFQYXJ0cygpO1xyXG4gICAgICAgIHRoaXMudXBncmFkZVBhcnRzKCk7XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBEcmF3LlxyXG4gICAgICBkcmF3OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5kcmF3UGFydHMoKTtcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIExvb3AuXHJcbiAgICAgIGxvb3A6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLmNsZWFyKCk7XHJcbiAgICAgICAgdGhpcy51cGRhdGUoKTtcclxuICAgICAgICB0aGlzLmRyYXcoKTtcclxuICAgICAgICB0aGlzLnF1ZXVlKCk7XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBTdG9wIGxvb3AuXHJcbiAgICAgIHN0b3A6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLnNldHRpbmdzLnN0b3AgPSB0cnVlO1xyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gU3RhcnQgbG9vcC5cclxuICAgICAgc3RhcnQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLnNldHRpbmdzLnN0b3AgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLmxvb3AoKTtcclxuICAgICAgfVxyXG5cclxuICAgIH07XHJcbiAgICBcclxuXHJcbiAgIC8vIFJldHVybiByYW5kb20gbnVtYmVyLiBcclxuICAgZnVuY3Rpb24gcmVhbFJhbmRvbSggbWF4ICl7XHJcbiAgICAgIHJldHVybiBNYXRoLmNvcygoTWF0aC5yYW5kb20oKSAqIE1hdGguUEkpKSAqIG1heDtcclxuICAgIH1cclxuXHJcbiAgICAvLyBWZWN0b3IgZWxlbWVudGFyeSBjbGFzcyBvYmplY3QuXHJcbiAgICBmdW5jdGlvbiBWZWN0b3IoIHgsIHkgKSB7XHJcbiAgICAgIHRoaXMueCA9IHggfHwgMDtcclxuICAgICAgdGhpcy55ID0geSB8fCAwO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEFkZCB2ZWN0b3IgdG8gYW4gb3RoZXIuXHJcbiAgICBWZWN0b3IucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKHZlY3Rvcil7XHJcbiAgICAgIHRoaXMueCArPSB2ZWN0b3IueDtcclxuICAgICAgdGhpcy55ICs9IHZlY3Rvci55O1xyXG4gICAgfTtcclxuXHJcbiAgICAvLyBJbnZlcnQgdmVjdG9yJ3MgZGlyZWN0aW9uLlxyXG4gICAgVmVjdG9yLnByb3RvdHlwZS5nZXRJbnZlcnQgPSBmdW5jdGlvbigpe1xyXG4gICAgICB0aGlzLnggPSAtMSAqICh0aGlzLngpO1xyXG4gICAgICB0aGlzLnkgPSAtMSAqICh0aGlzLnkpO1xyXG4gICAgfTtcclxuXHJcbiAgICAvLyBHZXQgdmVjdG9yJ3MgbGVuZ3RoLlxyXG4gICAgVmVjdG9yLnByb3RvdHlwZS5nZXRNYWduaXR1ZGUgPSBmdW5jdGlvbigpe1xyXG4gICAgICByZXR1cm4gTWF0aC5zcXJ0KHRoaXMueCAqIHRoaXMueCArIHRoaXMueSAqIHRoaXMueSlcclxuICAgIH07XHJcblxyXG4gICAgLy8gR2V0IHZlY3RvcidzIHJhZGl1cy5cclxuICAgIFZlY3Rvci5wcm90b3R5cGUuZ2V0QW5nbGUgPSBmdW5jdGlvbigpe1xyXG4gICAgICByZXR1cm4gTWF0aC5hdGFuMih0aGlzLnksIHRoaXMueCk7XHJcbiAgICB9O1xyXG5cclxuICAgIC8vIEdldCBuZXcgdmVjdG9yIGFjY29yZGluZyB0byBsZW5ndGggYW5kIHJhZGl1cy5cclxuICAgIFZlY3Rvci5wcm90b3R5cGUuZnJvbUFuZ2xlID0gZnVuY3Rpb24gKCBhbmdsZSwgbWFnbml0dWRlICkge1xyXG4gICAgICByZXR1cm4gbmV3IFZlY3RvcihtYWduaXR1ZGUgKiBNYXRoLmNvcyhhbmdsZSksIG1hZ25pdHVkZSAqIE1hdGguc2luKGFuZ2xlKSk7XHJcbiAgICB9O1xyXG5cclxuICAgIC8vIFBhcnRpY2xlIGNvbnN0cnVjdG9yLlxyXG4gICAgZnVuY3Rpb24gUGFydGljbGUoIGluc3RhbmNlLCBwb3NpdGlvbiwgdml0ZXNzZSwgYWNjZWxlcmF0aW9uICkge1xyXG4gICAgICB0aGlzLmluc3RhbmNlID0gaW5zdGFuY2U7XHJcbiAgICAgIHRoaXMucG9zaXRpb24gPSBwb3NpdGlvbiB8fCBuZXcgVmVjdG9yKDAsIDApO1xyXG4gICAgICB0aGlzLnZpdGVzc2UgPSB2aXRlc3NlIHx8IG5ldyBWZWN0b3IoMCwgMCk7XHJcbiAgICAgIHRoaXMuYWNjZWxlcmF0aW9uID0gYWNjZWxlcmF0aW9uIHx8IG5ldyBWZWN0b3IoMCwgMCk7XHJcbiAgICAgIHRoaXMuY29sb3IgPSB0aGlzLmluc3RhbmNlLnNldHRpbmdzLnBhcnRpY2xlQ29sb3I7XHJcbiAgICAgIHRoaXMuaW5Gb3JtID0gMDtcclxuICAgIH1cclxuXHJcbiAgICAvLyBTZXQgbmV3IHBhcnRpY2xlJ3MgcG9zaXRpb24gYWNjb3JkaW5nIHRvIGl0cyBhY2NlbGVyYXRpb24gYW5kIHNwZWVkLlxyXG4gICAgUGFydGljbGUucHJvdG90eXBlLm1vdmUgPSBmdW5jdGlvbigpe1xyXG4gICAgICB0aGlzLnZpdGVzc2UuYWRkKCB0aGlzLmFjY2VsZXJhdGlvbiApO1xyXG4gICAgICB0aGlzLnBvc2l0aW9uLmFkZCggdGhpcy52aXRlc3NlICk7XHJcbiAgICB9O1xyXG5cclxuICAgIC8vIFByb2NlZWQgcGFydGljbGUgYWNjb3JkaW5nIHRvIGV4aXN0aW5nIG1hc3MuXHJcbiAgICBQYXJ0aWNsZS5wcm90b3R5cGUuc291bWlzQ2hhbXAgPSBmdW5jdGlvbigpIHtcclxuXHJcbiAgICAgIC8vIElmIG5vIG1hc3Mgc3RyZW5ndGgsIHJldHVybi5cclxuICAgICAgaWYgKCAhdGhpcy5pbnN0YW5jZS5jaGFtcHNbMF0ubWFzcyApIHJldHVybjtcclxuXHJcbiAgICAgIC8vIElmIHBhcnRpY2xlIGhhcyBub3QgZmxhZ2dlZCAnaW5Gb3JtJy5cclxuICAgICAgaWYgKCB0aGlzLmluRm9ybSAhPT0gMSApIHtcclxuXHJcbiAgICAgICAgdmFyIHRvdGFsQWNjZWxlcmF0aW9uWCA9IDA7XHJcbiAgICAgICAgdmFyIHRvdGFsQWNjZWxlcmF0aW9uWSA9IDA7XHJcbiAgICAgICAgdmFyIGwgPSB0aGlzLmluc3RhbmNlLmNoYW1wcy5sZW5ndGg7XHJcblxyXG4gICAgICAgIC8vIFByb2NlZWQgZWZmZWN0IG9mIGFsbCBtYXNzIHJlZ2lzdGVyZWQgaW4gY2hhbXBzIGFycmF5LlxyXG4gICAgICAgIGZvciggdmFyIGkgPSAwOyBpIDwgbDsgaSsrICl7XHJcbiAgICAgICAgICB2YXIgZGlzdFggPSB0aGlzLmluc3RhbmNlLmNoYW1wc1tpXS5wb3NpdGlvbi54IC0gdGhpcy5wb3NpdGlvbi54O1xyXG4gICAgICAgICAgdmFyIGRpc3RZID0gdGhpcy5pbnN0YW5jZS5jaGFtcHNbaV0ucG9zaXRpb24ueSAtIHRoaXMucG9zaXRpb24ueTtcclxuICAgICAgICAgIHZhciBmb3JjZSA9IHRoaXMuaW5zdGFuY2UuY2hhbXBzW2ldLm1hc3MgLyBNYXRoLnBvdyhkaXN0WCAqIGRpc3RYICsgZGlzdFkgKiBkaXN0WSwgMS41KTtcclxuICAgICAgICAgIHRvdGFsQWNjZWxlcmF0aW9uWCArPSBkaXN0WCAqIGZvcmNlO1xyXG4gICAgICAgICAgdG90YWxBY2NlbGVyYXRpb25ZICs9IGRpc3RZICogZm9yY2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBTZXQgbmV3IGFjY2VsZXJhdGlvbiB2ZWN0b3IuXHJcbiAgICAgICAgdGhpcy5hY2NlbGVyYXRpb24gPSBuZXcgVmVjdG9yKCB0b3RhbEFjY2VsZXJhdGlvblgsIHRvdGFsQWNjZWxlcmF0aW9uWSApO1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIC8vIFByb2NlZWQgcGFydGljbGUgYWNjb3JkaW5nIHRvIG1hdHJpeCBvZiB0eXBlICd2YWx1ZScuIENhbGxlZCBpbiBtb2RlRm9ybS5cclxuICAgIFBhcnRpY2xlLnByb3RvdHlwZS5zb3VtaXNGb3JtID0gZnVuY3Rpb24oKXtcclxuXHJcbiAgICAgIC8vIElmIGxpYmVyYXRpb24gZmxhZywgbWFrZSB0aGUgcGFydGljbGUgZnJlZS5cclxuICAgICAgaWYoIHRoaXMuaW5zdGFuY2UubGliZXJhdGlvbiApe1xyXG4gICAgICAgIHRoaXMuaW5Gb3JtID0gMDtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIEdldCBwYXJ0aWNsZSBwb3NpdGlvbi5cclxuICAgICAgdmFyIHRlc3RYID0gTWF0aC5mbG9vciggdGhpcy5wb3NpdGlvbi54ICk7XHJcbiAgICAgIHZhciB0ZXN0WSA9IE1hdGguZmxvb3IoIHRoaXMucG9zaXRpb24ueSApO1xyXG5cclxuICAgICAgLy8gQ2hlY2sgbWF0cml4IHZhbHVlIGFjY29yZGluZyB0byBwYXJ0aWNsZSdzIHBvc2l0aW9uLlxyXG4gICAgICB2YXIgdmFsdWUgPSAoIHRoaXMuaW5zdGFuY2UuYWN0aXZlSW5kZXggIT09IG51bGwgKSA/IHRoaXMuaW5zdGFuY2UubWF0cml4VGFiW3RoaXMuaW5zdGFuY2UuYWN0aXZlSW5kZXhdLmdldE1hdHJpeCgpW3Rlc3RYXVt0ZXN0WV0gOiAwO1xyXG5cclxuICAgICAgLy8gSWYgcGFydGljbGUgaXMgaW5zaWRlIGEgJ3doaXRlIHpvbmUnLlxyXG4gICAgICBpZiAoIHZhbHVlICE9PSAwICl7XHJcblxyXG4gICAgICAgIC8vIElmIHBhcnRpY2xlcyBqdXN0IGNvbWUgaW50byB0aGUgJ3doaXRlIHpvbmUnLlxyXG4gICAgICAgIGlmKCB0aGlzLmluRm9ybSAhPT0gMSApe1xyXG5cclxuICAgICAgICAgIC8vIFVwIHRoZSBmb3JtIGZsYWcuXHJcbiAgICAgICAgICB0aGlzLmluRm9ybSA9IDE7XHJcblxyXG4gICAgICAgICAgLy8gU2xvdyB0aGUgcGFydGljbGUuXHJcbiAgICAgICAgICB0aGlzLnZpdGVzc2UgPSBuZXcgVmVjdG9yKHRoaXMudml0ZXNzZS54ICogMC4yLCB0aGlzLnZpdGVzc2UueSAqIDAuMik7XHJcblxyXG4gICAgICAgICAgLy8gQ3V0IHRoZSBhY2NlbGVyYXRpb24uXHJcbiAgICAgICAgICB0aGlzLmFjY2VsZXJhdGlvbiA9IG5ldyBWZWN0b3IoMCwgMCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBJZiBwYXJ0aWNsZSBpcyBub3QgaW5zaWRlICd3aGl0ZSB6b25lJy5cclxuICAgICAgZWxzZSB7XHJcblxyXG4gICAgICAgIC8vIElmIHRoZSBwYXJ0aWNsZSBqdXN0IGdldCBvdXQgdGhlIHpvbmUuXHJcbiAgICAgICAgaWYoIHRoaXMuaW5Gb3JtID09PSAxICl7XHJcblxyXG4gICAgICAgICAgLy8gSXQncyBub3QgZnJlZSA6IGludmVydCBzcGVlZC5cclxuICAgICAgICAgIHRoaXMudml0ZXNzZS5nZXRJbnZlcnQoKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgLy8gTWFzcyBjb25zdHJ1Y3Rvci5cclxuICAgIGZ1bmN0aW9uIE1hc3MoIHBvaW50LCBtYXNzICkge1xyXG4gICAgICB0aGlzLnBvc2l0aW9uID0gcG9pbnQ7XHJcbiAgICAgIHRoaXMuc2V0TWFzcyggbWFzcyApO1xyXG4gICAgfVxyXG5cclxuICAgIE1hc3MucHJvdG90eXBlLnNldE1hc3MgPSBmdW5jdGlvbiggbWFzcyApe1xyXG4gICAgICB0aGlzLm1hc3MgPSBtYXNzIHx8IDA7XHJcbiAgICAgIHRoaXMuY29sb3IgPSBtYXNzIDwgMCA/IFwiI2YwMFwiIDogXCIjMGYwXCI7XHJcbiAgICB9O1xyXG5cclxuXHJcbiAgLy8gUE9MWUZJTExcclxuXHJcbiAgLy8gUHJvZHVjdGlvbiBzdGVwcyBvZiBFQ01BLTI2MiwgRWRpdGlvbiA1LCAxNS40LjQuMTRcclxuICAvLyBSw6lmw6lyZW5jZSA6IGh0dHA6Ly9lczUuZ2l0aHViLmlvLyN4MTUuNC40LjE0XHJcbiAgaWYgKCFBcnJheS5wcm90b3R5cGUuaW5kZXhPZikge1xyXG4gICAgQXJyYXkucHJvdG90eXBlLmluZGV4T2YgPSBmdW5jdGlvbihzZWFyY2hFbGVtZW50LCBmcm9tSW5kZXgpIHtcclxuICAgICAgdmFyIGs7XHJcbiAgICAgIGlmICh0aGlzID09IG51bGwpIHtcclxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcInRoaXNcIiB2YXV0IG51bGwgb3UgbiBlc3QgcGFzIGTDqWZpbmknKTtcclxuICAgICAgfVxyXG4gICAgICB2YXIgTyA9IE9iamVjdCh0aGlzKTtcclxuICAgICAgdmFyIGxlbiA9IE8ubGVuZ3RoID4+PiAwO1xyXG4gICAgICBpZiAobGVuID09PSAwKSB7XHJcbiAgICAgICAgcmV0dXJuIC0xO1xyXG4gICAgICB9XHJcbiAgICAgIHZhciBuID0gK2Zyb21JbmRleCB8fCAwO1xyXG4gICAgICBpZiAoTWF0aC5hYnMobikgPT09IEluZmluaXR5KSB7XHJcbiAgICAgICAgbiA9IDA7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKG4gPj0gbGVuKSB7XHJcbiAgICAgICAgcmV0dXJuIC0xO1xyXG4gICAgICB9XHJcbiAgICAgIGsgPSBNYXRoLm1heChuID49IDAgPyBuIDogbGVuIC0gTWF0aC5hYnMobiksIDApO1xyXG4gICAgICB3aGlsZSAoayA8IGxlbikge1xyXG4gICAgICAgIGlmIChrIGluIE8gJiYgT1trXSA9PT0gc2VhcmNoRWxlbWVudCkge1xyXG4gICAgICAgICAgcmV0dXJuIGs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGsrKztcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gLTE7XHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLy8gaWYgKHR5cGVvZiBPYmplY3QuYXNzaWduICE9ICdmdW5jdGlvbicpIHtcclxuICAvLyAgIE9iamVjdC5hc3NpZ24gPSBmdW5jdGlvbiAodGFyZ2V0LCB2YXJBcmdzKSB7IC8vIC5sZW5ndGggb2YgZnVuY3Rpb24gaXMgMlxyXG4gIC8vICAgICAndXNlIHN0cmljdCc7XHJcbiAgLy8gICAgIGlmICh0YXJnZXQgPT0gbnVsbCkgeyAvLyBUeXBlRXJyb3IgaWYgdW5kZWZpbmVkIG9yIG51bGxcclxuICAvLyAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdDYW5ub3QgY29udmVydCB1bmRlZmluZWQgb3IgbnVsbCB0byBvYmplY3QnKTtcclxuICAvLyAgICAgfVxyXG5cclxuICAvLyAgICAgdmFyIHRvID0gT2JqZWN0KHRhcmdldCk7XHJcblxyXG4gIC8vICAgICBmb3IgKHZhciBpbmRleCA9IDE7IGluZGV4IDwgYXJndW1lbnRzLmxlbmd0aDsgaW5kZXgrKykge1xyXG4gIC8vICAgICAgIHZhciBuZXh0U291cmNlID0gYXJndW1lbnRzW2luZGV4XTtcclxuXHJcbiAgLy8gICAgICAgaWYgKG5leHRTb3VyY2UgIT0gbnVsbCkgeyAvLyBTa2lwIG92ZXIgaWYgdW5kZWZpbmVkIG9yIG51bGxcclxuICAvLyAgICAgICAgIGZvciAodmFyIG5leHRLZXkgaW4gbmV4dFNvdXJjZSkge1xyXG4gIC8vICAgICAgICAgICAvLyBBdm9pZCBidWdzIHdoZW4gaGFzT3duUHJvcGVydHkgaXMgc2hhZG93ZWRcclxuICAvLyAgICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChuZXh0U291cmNlLCBuZXh0S2V5KSkge1xyXG4gIC8vICAgICAgICAgICAgIHRvW25leHRLZXldID0gbmV4dFNvdXJjZVtuZXh0S2V5XTtcclxuICAvLyAgICAgICAgICAgfVxyXG4gIC8vICAgICAgICAgfVxyXG4gIC8vICAgICAgIH1cclxuICAvLyAgICAgfVxyXG4gIC8vICAgICByZXR1cm4gdG87XHJcbiAgLy8gICB9O1xyXG4gIC8vIH1cclxuXHJcbiAgLy8gaHR0cDovL3BhdWxpcmlzaC5jb20vMjAxMS9yZXF1ZXN0YW5pbWF0aW9uZnJhbWUtZm9yLXNtYXJ0LWFuaW1hdGluZy9cclxuICAvLyBodHRwOi8vbXkub3BlcmEuY29tL2Vtb2xsZXIvYmxvZy8yMDExLzEyLzIwL3JlcXVlc3RhbmltYXRpb25mcmFtZS1mb3Itc21hcnQtZXItYW5pbWF0aW5nXHJcbiAgLy8gcmVxdWVzdEFuaW1hdGlvbkZyYW1lIHBvbHlmaWxsIGJ5IEVyaWsgTcO2bGxlci4gZml4ZXMgZnJvbSBQYXVsIElyaXNoIGFuZCBUaW5vIFppamRlbFxyXG4gIC8vIE1JVCBsaWNlbnNlXHJcblxyXG4gIChmdW5jdGlvbigpIHtcclxuICAgIHZhciBsYXN0VGltZSA9IDA7XHJcbiAgICB2YXIgdmVuZG9ycyA9IFsnbXMnLCAnbW96JywgJ3dlYmtpdCcsICdvJ107XHJcbiAgICBmb3IodmFyIHggPSAwOyB4IDwgdmVuZG9ycy5sZW5ndGggJiYgIXdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWU7ICsreCkge1xyXG4gICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gd2luZG93W3ZlbmRvcnNbeF0rJ1JlcXVlc3RBbmltYXRpb25GcmFtZSddO1xyXG4gICAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSB3aW5kb3dbdmVuZG9yc1t4XSsnQ2FuY2VsQW5pbWF0aW9uRnJhbWUnXVxyXG4gICAgICAgIHx8IHdpbmRvd1t2ZW5kb3JzW3hdKydDYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoIXdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUpXHJcbiAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSBmdW5jdGlvbihjYWxsYmFjaywgZWxlbWVudCkge1xyXG4gICAgICAgIHZhciBjdXJyVGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xyXG4gICAgICAgIHZhciB0aW1lVG9DYWxsID0gTWF0aC5tYXgoMCwgMTYgLSAoY3VyclRpbWUgLSBsYXN0VGltZSkpO1xyXG4gICAgICAgIHZhciBpZCA9IHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBjYWxsYmFjayhjdXJyVGltZSArIHRpbWVUb0NhbGwpOyB9LFxyXG4gICAgICAgICAgdGltZVRvQ2FsbCk7XHJcbiAgICAgICAgbGFzdFRpbWUgPSBjdXJyVGltZSArIHRpbWVUb0NhbGw7XHJcbiAgICAgICAgcmV0dXJuIGlkO1xyXG4gICAgICB9O1xyXG5cclxuICAgIGlmICghd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKVxyXG4gICAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSBmdW5jdGlvbihpZCkge1xyXG4gICAgICAgIGNsZWFyVGltZW91dChpZCk7XHJcbiAgICAgIH07XHJcbiAgfSgpKTtcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIFBVQkxJQyBNRVRIT0RTLlxyXG4gICAqIFxyXG4gICAqL1xyXG5cclxuICByZXR1cm4ge1xyXG5cclxuICAgIC8vIEVudHJ5IHBvaW50IHRvIGNyZWF0ZSBuZXcgc2xpZGUgaW5zdGFuY2UuXHJcbiAgICBnZXRJbnN0YW5jZTogZnVuY3Rpb24oICBvcHRpb25zICkge1xyXG4gICAgICB2YXIgaSA9IG5ldyBEaWFwUGFydCgpO1xyXG4gICAgICBpLmluaXQoIG9wdGlvbnMgKTtcclxuICAgICAgcmV0dXJuIGk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIENhbGwgaXQgdG8gZXh0ZW5kIGNvcmUuXHJcbiAgICByZWdpc3Rlck1vZGU6IGZ1bmN0aW9uICggbmFtZSwgcGFyYW0gKSB7XHJcblxyXG4gICAgICAvLyBDaGVjayBpZiBtb2RlJ3MgbmFtZSBpcyBmcmVlLlxyXG4gICAgICBpZiAoIGRlZmF1bHRzLm1vZGVzW25hbWVdICkgdGhyb3cgbmV3IEVycm9yKCBcIk5hbWUgc3BhY2UgZm9yICdcIiArIG5hbWUgKyBcIicgYWxyZWFkeSBleGlzdC4gQ2hvb3NlIGFuIG90aGVyIG1vZHVsZSBuYW1lLlwiICk7XHJcblxyXG4gICAgICAvLyBSZWdpc3RlciBuZXcgbW9kZS5cclxuICAgICAgZGVmYXVsdHMubW9kZXNbbmFtZV0gPSB0cnVlO1xyXG5cclxuICAgICAgLy8gRXh0ZW5kIGRlZmF1bHRzLCBQYXJ0aWNsZXMgYW5kIE1hdHJpeCBjbGFzcy5cclxuICAgICAgZm4uc2ltcGxlRXh0ZW5kKCBkZWZhdWx0cywgcGFyYW0ub3B0aW9ucyApO1xyXG4gICAgICBmbi5zaW1wbGVFeHRlbmQoIERpYXBQYXJ0LnByb3RvdHlwZSwgcGFyYW0ucHJvdG8gKTtcclxuICAgICAgZm4uc2ltcGxlRXh0ZW5kKCBQYXJ0aWNsZS5wcm90b3R5cGUsIHBhcmFtLnByb3RvX3BhcnRpY2xlcyApO1xyXG4gICAgICBmbi5zaW1wbGVFeHRlbmQoIE1hdHJpeC5wcm90b3R5cGUsIHBhcmFtLnByb3RvX21hdHJpeCApO1xyXG4gICAgICBcclxuICAgICAgLy8gUmVnaXN0ZXIgbmV3IG1vZGUgZmlsdGVycywgcHJvY2VlZCBhbmQgbWF0cml4TWV0aG9kLlxyXG4gICAgICBmaWx0ZXJzW25hbWVdID0gcGFyYW0uc2NlbmFyaW8uZmlsdGVycztcclxuICAgICAgcHJvY2VlZFtuYW1lXSA9IHBhcmFtLnNjZW5hcmlvLnByb2NlZWQ7XHJcbiAgICAgIG1hdHJpeE1ldGhvZFtuYW1lXSA9IHBhcmFtLnNjZW5hcmlvLm1hdHJpeE1ldGhvZDtcclxuICAgIH1cclxuICB9O1xyXG5cclxufSkodGhpcywgdGhpcy5kb2N1bWVudCk7Iiwic2xpZGVQYXJ0aWNsZXMucmVnaXN0ZXJNb2RlKCAnbW9kZUNvbG9yJywge1xyXG4gIG9wdGlvbnM6IHt9LFxyXG4gIHByb3RvOiB7fSxcclxuICBwcm90b19wYXJ0aWNsZXM6IHtcclxuICAgIHNvdW1pc0NvbG9yOiBmdW5jdGlvbigpe1xyXG4gICAgICB0aGlzLmluRm9ybSA9IDA7XHJcbiAgICAgIHZhciB0ZXN0WCA9IE1hdGguZmxvb3IoIHRoaXMucG9zaXRpb24ueCApO1xyXG4gICAgICB2YXIgdGVzdFkgPSBNYXRoLmZsb29yKCB0aGlzLnBvc2l0aW9uLnkgKTtcclxuICAgICAgdGhpcy5jb2xvciA9ICggdGhpcy5pbnN0YW5jZS5hY3RpdmVJbmRleCAhPT0gbnVsbCApID8gdGhpcy5pbnN0YW5jZS5tYXRyaXhUYWJbdGhpcy5pbnN0YW5jZS5hY3RpdmVJbmRleF0uZ2V0TWF0cml4KClbdGVzdFhdW3Rlc3RZXSA6IHRoaXMuaW5zdGFuY2Uuc2V0dGluZ3MucGFydGljbGVDb2xvcjtcclxuICAgIH1cclxuICB9LFxyXG4gIHByb3RvX21hdHJpeDoge1xyXG4gICAgY29sb3JNYXRyaXg6IGZ1bmN0aW9uICggbWF0cml4ICkge1xyXG4gICAgICBcclxuICAgICAgdmFyIGEgPSB0aGlzLnNpemUueCxcclxuICAgICAgICAgIGIgPSBNYXRoLmZsb29yKGEgKyB0aGlzLnNpemUudyksXHJcbiAgICAgICAgICBjID0gdGhpcy5zaXplLnksXHJcbiAgICAgICAgICBkID0gTWF0aC5mbG9vcihjICsgdGhpcy5zaXplLmgpO1xyXG5cclxuICAgICAgaWYoIG1hdHJpeC5sZW5ndGggPCBhIHx8IG1hdHJpeFswXS5sZW5ndGggPCBkICkgcmV0dXJuO1xyXG5cclxuICAgICAgdmFyIGksIGosIHIsIGcsIGIsIHAgPSB0aGlzLmNvbnRleHQuZ2V0SW1hZ2VEYXRhKCAwLCAwLCB0aGlzLmluc3RhbmNlLmNhbnZhcy53aWR0aCwgdGhpcy5pbnN0YW5jZS5jYW52YXMuaGVpZ2h0ICkuZGF0YTtcclxuXHJcbiAgICAgIGZvciggaSA9IDA7IGkgPCB0aGlzLmNhbnZhcy5oZWlnaHQ7IGkrKyApe1xyXG4gICAgICAgIGZvciggaiA9IDA7IGogPCB0aGlzLmNhbnZhcy53aWR0aDsgaisrICl7XHJcbiAgICAgICAgICByID0gcFsoKHRoaXMuaW5zdGFuY2UuY2FudmFzLndpZHRoICogaikgKyBpKSAqIDRdO1xyXG4gICAgICAgICAgZyA9IHBbKCh0aGlzLmluc3RhbmNlLmNhbnZhcy53aWR0aCAqIGopICsgaSkgKiA0ICsgMV07XHJcbiAgICAgICAgICBiID0gcFsoKHRoaXMuaW5zdGFuY2UuY2FudmFzLndpZHRoICogaikgKyBpKSAqIDQgKyAyXTtcclxuICAgICAgICAgIG1hdHJpeFtpXVtqXSA9ICdyZ2JhKCcgKyByICsgJywgJyArIGcgKyAnLCAnICsgYiArICcsIDEpJztcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9LFxyXG4gIGZpbHRlcjoge30sXHJcbiAgc2NlbmFyaW86IHtcclxuICAgIGZpbHRlcnM6IHtcclxuICAgICAgbmFtZTogbnVsbCxcclxuICAgICAgcGFyYW06IG51bGxcclxuICAgIH0sXHJcbiAgICBwcm9jZWVkOiBbJ3NvdW1pc0NoYW1wJywgJ3NvdW1pc0NvbG9yJ10sXHJcbiAgICBtYXRyaXhNZXRob2Q6ICdjb2xvck1hdHJpeCdcclxuICB9XHJcbn0pOyJdfQ==
