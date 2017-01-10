

var slideParticles = function (window, document, undefined) {

  "use strict";

  var fn,
      filter,
      proceed,
      filters,
      nextMatrixMode,
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
    text: 'Hello World !',
    mass: 100,
    antiMass: -500,
    hoverMass: 5000,
    density: 1500,
    particleSize: 1,
    particleColor: '#000',
    textColor: '#fff',
    font: 'Arial',
    fontSize: 40,
    initialVelocity: 3,
    massX: 880,
    massY: 370,
    delay: 700,
    initialMode: 'modeForm',
    draw: false,
    stop: false,
    switchModeCallback: null,
    nextMatrixMode: 'liberationParts',
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

  nextMatrixMode = {
    // Make particles free for short delay.
    liberationParts: function (delay) {
      var self = this;
      var d = delay || this.settings.delay;

      // Make free parts from current form value.
      this.clearParts();

      // Particles are free from matrix of type 'value'.
      this.liberation = !this.liberation;

      // Mass strength is inverted.
      this.massActive = this.settings.antiMass;

      // When delay's over, whe return to normal mass strength and particles behavior.
      setTimeout(function () {
        self.massActive = self.settings.mass;
        self.liberation = !self.liberation;
      }, d);
    }
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
    },

    loadImage: function (src, self, thumb) {

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
      img.src = src;
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
    this.massActive = this.settings.mass;
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
          self = this;
      var files = e.target ? e.target.files : e;
      var th = thumb === 'false' ? false : true;

      // If no file selected, exit.
      if (!files || files.constructor !== Array && !files instanceof FileList) return console.log('No files matched');

      for (i = 0; i < files.length; i++) {

        var file = files[i];

        // If file comes from input files.
        if (file.type) {

          // If file is not an image, pass to next file.
          if (!file.type.match('image')) continue;

          var reader = new FileReader();

          // When file is loaded.
          reader.onload = function (event) {

            // Set image data.
            var src = event.target.result;

            // Load image.
            fn.loadImage.call(this, src, self, th);
          };
          // Load file.
          reader.readAsDataURL(file);
        } else {
          // If files is array of url.

          // Load image.
          fn.loadImage.call(this, file, self, th);
        }
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
      this.callNextMatrixMode();
      this.activeIndex = this.thumbOriginalTab.indexOf(matrix);
    },

    // Method to add new switch matrix function.
    registerNextMatrixMode: function (name, fn) {
      if (typeof fn !== 'function' || typeof name !== 'string') {
        return console.log('Error, name required and must be type string, fn required and must be type function');
      }
      nextMatrixMode[name] = fn;
    },

    // Function called between old and new matrix active.
    callNextMatrixMode: function () {
      try {
        nextMatrixMode[this.settings.nextMatrixMode].call(this);
      } catch (e) {
        console.log(e.name + ' - ' + e.message);
      }
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

    var mass = this.instance.massActive;

    // If no mass strength, return.
    if (!mass) return;

    // If particle has not flagged 'inForm'.
    if (this.inForm !== 1) {

      var totalAccelerationX = 0;
      var totalAccelerationY = 0;
      var l = this.instance.champs.length;

      // Proceed effect of all mass registered in champs array.
      for (var i = 0; i < l; i++) {
        var distX = this.instance.champs[i].position.x - this.position.x;
        var distY = this.instance.champs[i].position.y - this.position.y;
        var force = mass / Math.pow(distX * distX + distY * distY, 1.5);
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUuanMiLCJjb2xvci5qcyJdLCJuYW1lcyI6WyJzbGlkZVBhcnRpY2xlcyIsIndpbmRvdyIsImRvY3VtZW50IiwidW5kZWZpbmVkIiwiZm4iLCJmaWx0ZXIiLCJwcm9jZWVkIiwiZmlsdGVycyIsIm5leHRNYXRyaXhNb2RlIiwibWF0cml4TWV0aG9kIiwib28iLCJnZXRQcm90byIsIk9iamVjdCIsImdldFByb3RvdHlwZU9mIiwiZGVmYXVsdHMiLCJoZWlnaHQiLCJ3aWR0aCIsImJhY2tncm91bmQiLCJ0aHJlc2hvbGROQiIsInRhcmdldEVsZW1lbnQiLCJpbnB1dEZpbGVJRCIsInRodW1kbmFpbHNJRCIsInBhbmVsSUQiLCJ0aHVtYldpZHRoIiwidGh1bWJIZWlnaHQiLCJ0ZXh0IiwibWFzcyIsImFudGlNYXNzIiwiaG92ZXJNYXNzIiwiZGVuc2l0eSIsInBhcnRpY2xlU2l6ZSIsInBhcnRpY2xlQ29sb3IiLCJ0ZXh0Q29sb3IiLCJmb250IiwiZm9udFNpemUiLCJpbml0aWFsVmVsb2NpdHkiLCJtYXNzWCIsIm1hc3NZIiwiZGVsYXkiLCJpbml0aWFsTW9kZSIsImRyYXciLCJzdG9wIiwic3dpdGNoTW9kZUNhbGxiYWNrIiwibW9kZXMiLCJtb2RlRm9ybSIsImJsYWNrQW5kV2hpdGUiLCJwaXhlbHMiLCJ0aHJlc2hvbGQiLCJpIiwiciIsImciLCJiIiwidiIsImQiLCJkYXRhIiwibGVuZ3RoIiwibmFtZSIsInBhcmFtIiwibGliZXJhdGlvblBhcnRzIiwic2VsZiIsInNldHRpbmdzIiwiY2xlYXJQYXJ0cyIsImxpYmVyYXRpb24iLCJtYXNzQWN0aXZlIiwic2V0VGltZW91dCIsImdldFZpZXdwb3J0IiwidyIsIk1hdGgiLCJtYXgiLCJkb2N1bWVudEVsZW1lbnQiLCJjbGllbnRXaWR0aCIsImlubmVyV2lkdGgiLCJoIiwiY2xpZW50SGVpZ2h0IiwiaW5uZXJIZWlnaHQiLCJhcHBlbmQiLCJ0YXJnZXQiLCJlbGVtZW50IiwiZ2V0RWxlbWVudEJ5SWQiLCJhcHBlbmRDaGlsZCIsImlzUGxhaW5PYmplY3QiLCJwcm90byIsIkN0b3IiLCJ0b1N0cmluZyIsImNhbGwiLCJoYXNPd25Qcm9wZXJ0eSIsImNvbnN0cnVjdG9yIiwicHJvdG90eXBlIiwic2ltcGxlRXh0ZW5kIiwiYSIsImNsb25lIiwic3JjIiwiY29weSIsImlzQW5BcnJheSIsImtleSIsIkFycmF5IiwiaXNBcnJheSIsImxvYWRJbWFnZSIsInRodW1iIiwiaW1nIiwiSW1hZ2UiLCJvbmxvYWQiLCJtIiwiY3JlYXRlU2xpZGUiLCJyZW5kZXJUaHVtYm5haWxzIiwiTWF0cml4IiwiaW5zdGFuY2UiLCJpbnB1dCIsImN1c3RvbVNpemUiLCJ0eXBlIiwicGljdHVyZSIsImNhbnZhcyIsImdldENhbnZhcyIsImNvbnRleHQiLCJnZXRDb250ZXh0MkQiLCJzaXplIiwiZ2V0SW1hZ2VTaXplIiwieCIsInkiLCJtYXRyaXgiLCJidWlsZEFsbE1hdHJpeCIsImNsZWFyIiwiY2xlYXJSZWN0IiwiZ2V0UGl4ZWxzIiwiZHJhd0ltYWdlIiwic2V0VGV4dCIsImdldEltYWdlRGF0YSIsImNsZWFyZWQiLCJ0cmltIiwiY2xlYXJNYXRyaXgiLCJsaW5lcyIsInNwbGl0IiwiZmlsbFN0eWxlIiwidGV4dEFsaWduIiwiZmlsbFRleHQiLCJmbG9vciIsIm1lYXN1cmVUZXh0IiwiYXBwbHlGaWx0ZXIiLCJhcmdBcnJheSIsInAiLCJhcmdzIiwicHVzaCIsImFwcGx5IiwicHV0SW1hZ2VEYXRhIiwibUEiLCJtb2RlIiwiY3JlYU1hdHJpeCIsImdldE1hdHJpeCIsIm1hdCIsImoiLCJ2YWx1ZSIsImwiLCJ2YWx1ZU1hdHJpeCIsIm1pbiIsImMiLCJwaXgiLCJzdHlsZSIsImN1cnNvciIsIm9uY2xpY2siLCJlIiwiZ29UbyIsInRodW1iT3JpZ2luYWxUYWIiLCJEaWFwUGFydCIsIm1hdHJpeFRhYiIsInBhcnRpY2xlcyIsImNoYW1wcyIsImFjdGl2ZUluZGV4IiwiaW5pdCIsIm9wdGlvbnMiLCJiYWNrZ3JvdW5kQ29sb3IiLCJjZW50ZXJNYXNzIiwiTWFzcyIsIlZlY3RvciIsImxvb3AiLCJzZXQiLCJjcmVhdGVFbGVtZW50IiwicyIsImdldENvbnRleHQiLCJjdyIsImNoIiwicmF0aW8iLCJyb3VuZCIsImxvYWQiLCJmaWxlcyIsInRoIiwiRmlsZUxpc3QiLCJjb25zb2xlIiwibG9nIiwiZmlsZSIsIm1hdGNoIiwicmVhZGVyIiwiRmlsZVJlYWRlciIsImV2ZW50IiwicmVzdWx0IiwicmVhZEFzRGF0YVVSTCIsInN3aXRjaE1vZGUiLCJhZGRNYXNzIiwicGFydFByb2NlZWQiLCJwYXJ0aWNsZSIsImNhbGxOZXh0TWF0cml4TW9kZSIsImluZGV4T2YiLCJyZWdpc3Rlck5leHRNYXRyaXhNb2RlIiwibWVzc2FnZSIsImNyZWFQYXJ0cyIsIm5iIiwiUGFydGljbGUiLCJyYW5kb20iLCJyZWFsUmFuZG9tIiwidXBncmFkZVBhcnRzIiwiY3VycmVudFBhcnRzIiwicG9zIiwicG9zaXRpb24iLCJtb3ZlIiwiZHJhd1BhcnRzIiwibiIsImNvbG9yIiwiZmlsbFJlY3QiLCJpbkZvcm0iLCJxdWV1ZSIsInJlcXVlc3RJRCIsInJlcXVlc3RBbmltYXRpb25GcmFtZSIsImJpbmQiLCJjYW5jZWxBbmltYXRpb25GcmFtZSIsInVwZGF0ZSIsInN0YXJ0IiwiY29zIiwiUEkiLCJhZGQiLCJ2ZWN0b3IiLCJnZXRJbnZlcnQiLCJnZXRNYWduaXR1ZGUiLCJzcXJ0IiwiZ2V0QW5nbGUiLCJhdGFuMiIsImZyb21BbmdsZSIsImFuZ2xlIiwibWFnbml0dWRlIiwic2luIiwidml0ZXNzZSIsImFjY2VsZXJhdGlvbiIsInNvdW1pc0NoYW1wIiwidG90YWxBY2NlbGVyYXRpb25YIiwidG90YWxBY2NlbGVyYXRpb25ZIiwiZGlzdFgiLCJkaXN0WSIsImZvcmNlIiwicG93Iiwic291bWlzRm9ybSIsInRlc3RYIiwidGVzdFkiLCJwb2ludCIsInNldE1hc3MiLCJzZWFyY2hFbGVtZW50IiwiZnJvbUluZGV4IiwiayIsIlR5cGVFcnJvciIsIk8iLCJsZW4iLCJhYnMiLCJJbmZpbml0eSIsImxhc3RUaW1lIiwidmVuZG9ycyIsImNhbGxiYWNrIiwiY3VyclRpbWUiLCJEYXRlIiwiZ2V0VGltZSIsInRpbWVUb0NhbGwiLCJpZCIsImNsZWFyVGltZW91dCIsImdldEluc3RhbmNlIiwicmVnaXN0ZXJNb2RlIiwiRXJyb3IiLCJwcm90b19wYXJ0aWNsZXMiLCJwcm90b19tYXRyaXgiLCJzY2VuYXJpbyIsInNvdW1pc0NvbG9yIiwiY29sb3JNYXRyaXgiXSwibWFwcGluZ3MiOiI7O0FBRUEsSUFBSUEsaUJBQWtCLFVBQVVDLE1BQVYsRUFBa0JDLFFBQWxCLEVBQTRCQyxTQUE1QixFQUF1Qzs7QUFFekQ7O0FBRUEsTUFBSUMsRUFBSjtBQUFBLE1BQVFDLE1BQVI7QUFBQSxNQUFnQkMsT0FBaEI7QUFBQSxNQUF5QkMsT0FBekI7QUFBQSxNQUFrQ0MsY0FBbEM7QUFBQSxNQUFrREMsWUFBbEQ7QUFBQSxNQUFnRUMsS0FBSyxFQUFyRTtBQUFBLE1BQXlFQyxXQUFXQyxPQUFPQyxjQUEzRjs7O0FBRUE7QUFDQUMsYUFBVztBQUNUQyxZQUFRLEdBREM7QUFFVEMsV0FBTyxHQUZFO0FBR1RDLGdCQUFZLE1BSEg7QUFJVEMsaUJBQWEsQ0FBQyxHQUFELENBSko7QUFLVEMsbUJBQWUsV0FMTjtBQU1UQyxpQkFBYSxjQU5KO0FBT1RDLGtCQUFjLFVBUEw7QUFRVEMsYUFBUyxtQkFSQTtBQVNUQyxnQkFBWSxHQVRIO0FBVVRDLGlCQUFhLEdBVko7QUFXVEMsVUFBSyxlQVhJO0FBWVRDLFVBQU0sR0FaRztBQWFUQyxjQUFVLENBQUMsR0FiRjtBQWNUQyxlQUFXLElBZEY7QUFlVEMsYUFBUyxJQWZBO0FBZ0JUQyxrQkFBYyxDQWhCTDtBQWlCVEMsbUJBQWUsTUFqQk47QUFrQlRDLGVBQVcsTUFsQkY7QUFtQlRDLFVBQU0sT0FuQkc7QUFvQlRDLGNBQVUsRUFwQkQ7QUFxQlRDLHFCQUFpQixDQXJCUjtBQXNCVEMsV0FBTyxHQXRCRTtBQXVCVEMsV0FBTyxHQXZCRTtBQXdCVEMsV0FBTyxHQXhCRTtBQXlCVEMsaUJBQWEsVUF6Qko7QUEwQlRDLFVBQU0sS0ExQkc7QUEyQlRDLFVBQU0sS0EzQkc7QUE0QlRDLHdCQUFvQixJQTVCWDtBQTZCVGxDLG9CQUFnQixpQkE3QlA7QUE4QlRtQyxXQUFPO0FBQ0xDLGdCQUFVO0FBREw7QUE5QkUsR0FIWDs7QUF1Q0E7Ozs7QUFJQXZDLFdBQVM7QUFDUDtBQUNBd0MsbUJBQWUsVUFBV0MsTUFBWCxFQUFtQkMsU0FBbkIsRUFBK0I7QUFDNUMsVUFBSyxDQUFDRCxNQUFOLEVBQWUsT0FBT0EsTUFBUDtBQUNmLFVBQUlFLENBQUo7QUFBQSxVQUFPQyxDQUFQO0FBQUEsVUFBVUMsQ0FBVjtBQUFBLFVBQWFDLENBQWI7QUFBQSxVQUFnQkMsQ0FBaEI7QUFBQSxVQUFtQkMsSUFBSVAsT0FBT1EsSUFBOUI7QUFDQSxXQUFNTixJQUFJLENBQVYsRUFBYUEsSUFBSUssRUFBRUUsTUFBbkIsRUFBMkJQLEtBQUcsQ0FBOUIsRUFBa0M7QUFDaENDLFlBQUlJLEVBQUVMLENBQUYsQ0FBSjtBQUNBRSxZQUFJRyxFQUFFTCxJQUFFLENBQUosQ0FBSjtBQUNBRyxZQUFJRSxFQUFFTCxJQUFFLENBQUosQ0FBSjtBQUNBSSxZQUFLLFNBQU9ILENBQVAsR0FBVyxTQUFPQyxDQUFsQixHQUFzQixTQUFPQyxDQUE3QixJQUFrQ0osU0FBbkMsR0FBZ0QsR0FBaEQsR0FBc0QsQ0FBMUQ7QUFDQU0sVUFBRUwsQ0FBRixJQUFPSyxFQUFFTCxJQUFFLENBQUosSUFBU0ssRUFBRUwsSUFBRSxDQUFKLElBQVNJLENBQXpCO0FBQ0Q7QUFDRCxhQUFPTixNQUFQO0FBQ0Q7QUFiTSxHQUFUOztBQWdCQTs7Ozs7Ozs7Ozs7O0FBWUF2QyxZQUFVO0FBQ1JxQyxjQUFVO0FBQ1JZLFlBQU0sZUFERTtBQUVSQyxhQUFPO0FBRkM7QUFERixHQUFWOztBQU9GOzs7Ozs7QUFNRW5ELFlBQVU7QUFDUnNDLGNBQVUsQ0FBQyxhQUFELEVBQWdCLFlBQWhCO0FBREYsR0FBVjs7QUFJQTtBQUNBbkMsaUJBQWU7QUFDYm1DLGNBQVU7QUFERyxHQUFmOztBQUtBcEMsbUJBQWlCO0FBQ2Y7QUFDQWtELHFCQUFpQixVQUFXcEIsS0FBWCxFQUFtQjtBQUNsQyxVQUFJcUIsT0FBTyxJQUFYO0FBQ0EsVUFBSU4sSUFBSWYsU0FBUyxLQUFLc0IsUUFBTCxDQUFjdEIsS0FBL0I7O0FBRUE7QUFDQSxXQUFLdUIsVUFBTDs7QUFFQTtBQUNBLFdBQUtDLFVBQUwsR0FBa0IsQ0FBQyxLQUFLQSxVQUF4Qjs7QUFFRTtBQUNBLFdBQUtDLFVBQUwsR0FBa0IsS0FBS0gsUUFBTCxDQUFjakMsUUFBaEM7O0FBRUE7QUFDQXFDLGlCQUFXLFlBQVU7QUFDbkJMLGFBQUtJLFVBQUwsR0FBa0JKLEtBQUtDLFFBQUwsQ0FBY2xDLElBQWhDO0FBQ0FpQyxhQUFLRyxVQUFMLEdBQWtCLENBQUNILEtBQUtHLFVBQXhCO0FBQ0QsT0FIRCxFQUdHVCxDQUhIO0FBSUg7QUFwQmMsR0FBakI7O0FBdUJBO0FBQ0FqRCxPQUFLO0FBQ0g7QUFDQTZELGlCQUFhLFlBQVc7QUFDdEIsYUFBTztBQUNMQyxXQUFHQyxLQUFLQyxHQUFMLENBQVNsRSxTQUFTbUUsZUFBVCxDQUF5QkMsV0FBbEMsRUFBK0NyRSxPQUFPc0UsVUFBUCxJQUFxQixDQUFwRSxDQURFO0FBRUxDLFdBQUdMLEtBQUtDLEdBQUwsQ0FBU2xFLFNBQVNtRSxlQUFULENBQXlCSSxZQUFsQyxFQUFnRHhFLE9BQU95RSxXQUFQLElBQXNCLENBQXRFO0FBRkUsT0FBUDtBQUlELEtBUEU7O0FBU0g7QUFDQUMsWUFBUSxVQUFXQyxNQUFYLEVBQW1CQyxPQUFuQixFQUE2QjtBQUNuQyxVQUFLLE9BQU9ELE1BQVAsS0FBa0IsUUFBdkIsRUFBa0M7QUFDaEMxRSxpQkFBUzRFLGNBQVQsQ0FBeUJGLE1BQXpCLEVBQWtDRyxXQUFsQyxDQUErQ0YsT0FBL0M7QUFDRCxPQUZELE1BR0s7QUFDSEQsZUFBT0csV0FBUCxDQUFvQkYsT0FBcEI7QUFDRDtBQUNGLEtBakJFOztBQW1CSDtBQUNBRyxtQkFBZSxVQUFXSixNQUFYLEVBQW9CO0FBQ2pDLFVBQUlLLEtBQUosRUFBV0MsSUFBWDtBQUNBO0FBQ0E7QUFDQSxVQUFLLENBQUNOLE1BQUQsSUFBV2xFLEdBQUd5RSxRQUFILENBQVlDLElBQVosQ0FBa0JSLE1BQWxCLE1BQStCLGlCQUEvQyxFQUFtRTtBQUNqRSxlQUFPLEtBQVA7QUFDRDtBQUNESyxjQUFRdEUsU0FBVWlFLE1BQVYsQ0FBUjtBQUNBO0FBQ0EsVUFBSyxDQUFDSyxLQUFOLEVBQWM7QUFDWixlQUFPLElBQVA7QUFDRDtBQUNEO0FBQ0FDLGFBQU94RSxHQUFHMkUsY0FBSCxDQUFrQkQsSUFBbEIsQ0FBd0JILEtBQXhCLEVBQStCLGFBQS9CLEtBQWtEQSxNQUFNSyxXQUEvRDtBQUNBLGFBQU8sT0FBT0osSUFBUCxLQUFnQixVQUFoQixJQUE4QnhFLEdBQUcyRSxjQUFILENBQWtCRCxJQUFsQixDQUF3QkYsS0FBS0ssU0FBN0IsRUFBd0MsZUFBeEMsQ0FBckM7QUFDRCxLQW5DRTs7QUFxQ0g7QUFDQUMsa0JBQWMsVUFBV0MsQ0FBWCxFQUFjdEMsQ0FBZCxFQUFrQjtBQUM5QixVQUFJdUMsS0FBSjtBQUFBLFVBQVdDLEdBQVg7QUFBQSxVQUFnQkMsSUFBaEI7QUFBQSxVQUFzQkMsWUFBWSxLQUFsQztBQUNBLFdBQUssSUFBSUMsR0FBVCxJQUFnQjNDLENBQWhCLEVBQW9COztBQUVsQndDLGNBQU1GLEVBQUdLLEdBQUgsQ0FBTjtBQUNKRixlQUFPekMsRUFBRzJDLEdBQUgsQ0FBUDs7QUFFSTtBQUNBLFlBQUtMLE1BQU1HLElBQVgsRUFBa0I7QUFDckI7QUFDQTs7QUFFRyxZQUFJekMsRUFBRWtDLGNBQUYsQ0FBa0JTLEdBQWxCLENBQUosRUFBOEI7QUFDNUI7QUFDQSxjQUFJRixTQUFVeEYsR0FBRzRFLGFBQUgsQ0FBa0JZLElBQWxCLE1BQTZCQyxZQUFZRSxNQUFNQyxPQUFOLENBQWNaLElBQWQsQ0FBb0JRLElBQXBCLENBQXpDLENBQVYsQ0FBSixFQUFxRjtBQUNuRixnQkFBS0MsU0FBTCxFQUFpQjtBQUNmQSwwQkFBWSxLQUFaO0FBQ0FILHNCQUFVQyxPQUFPQSxJQUFJSyxPQUFiLEdBQXlCTCxHQUF6QixHQUErQixFQUF2QztBQUNELGFBSEQsTUFHTztBQUNMRCxzQkFBVUMsT0FBT3ZGLEdBQUc0RSxhQUFILENBQWtCVyxHQUFsQixDQUFULEdBQXFDQSxHQUFyQyxHQUEyQyxFQUFuRDtBQUNEO0FBQ0Q7QUFDQUYsY0FBR0ssR0FBSCxJQUFXMUYsR0FBR29GLFlBQUgsQ0FBaUJFLEtBQWpCLEVBQXdCRSxJQUF4QixDQUFYO0FBRUQsV0FWRCxNQVVPO0FBQ0hILGNBQUdLLEdBQUgsSUFBV0YsSUFBWDtBQUNIO0FBQ0Y7QUFDRjtBQUNELGFBQU9ILENBQVA7QUFDRCxLQXBFRTs7QUFzRUhRLGVBQVcsVUFBV04sR0FBWCxFQUFnQmhDLElBQWhCLEVBQXNCdUMsS0FBdEIsRUFBOEI7O0FBRW5DLFVBQUlDLE1BQU0sSUFBSUMsS0FBSixFQUFWO0FBQ0E7QUFDQUQsVUFBSUUsTUFBSixHQUFhLFlBQVU7O0FBRXJCO0FBQ0EsWUFBSUMsSUFBSTNDLEtBQUs0QyxXQUFMLENBQWtCLElBQWxCLENBQVI7O0FBRUEsWUFBSyxDQUFDTCxLQUFOLEVBQWM7O0FBRWQ7QUFDQUksVUFBRUUsZ0JBQUYsQ0FBb0I3QyxLQUFLQyxRQUFMLENBQWN2QyxZQUFsQyxFQUFnRCxLQUFoRDtBQUVELE9BVkQ7QUFXQTtBQUNBOEUsVUFBSVIsR0FBSixHQUFVQSxHQUFWO0FBQ0w7QUF2RkUsR0FBTDs7QUEwRkY7QUFDQSxXQUFTYyxNQUFULENBQWtCQyxRQUFsQixFQUE0QkMsS0FBNUIsRUFBbUNDLFVBQW5DLEVBQWdEO0FBQzlDLFNBQUtGLFFBQUwsR0FBZ0JBLFFBQWhCO0FBQ0EsU0FBS0csSUFBTCxHQUFjLE9BQU9GLEtBQVAsS0FBaUIsUUFBbkIsR0FBZ0MsU0FBaEMsR0FBNEMsTUFBeEQ7QUFDQSxTQUFLRyxPQUFMLEdBQWVILEtBQWY7QUFDQSxTQUFLSSxNQUFMLEdBQWMsS0FBS0wsUUFBTCxDQUFjTSxTQUFkLENBQXlCSixVQUF6QixDQUFkO0FBQ0EsU0FBS0ssT0FBTCxHQUFlLEtBQUtQLFFBQUwsQ0FBY1EsWUFBZCxDQUE0QixLQUFLSCxNQUFqQyxDQUFmO0FBQ0EsU0FBS0ksSUFBTCxHQUFjLE9BQU9SLEtBQVAsS0FBaUIsUUFBbkIsR0FBZ0MsS0FBS0QsUUFBTCxDQUFjVSxZQUFkLENBQTRCVCxLQUE1QixFQUFtQ0MsVUFBbkMsQ0FBaEMsR0FBa0YsRUFBQ1MsR0FBRSxDQUFILEVBQU1DLEdBQUUsQ0FBUixFQUFXcEQsR0FBRSxDQUFiLEVBQWdCTSxHQUFFLENBQWxCLEVBQTlGO0FBQ0EsU0FBSytDLE1BQUwsR0FBYyxLQUFLQyxjQUFMLEVBQWQ7QUFDRDs7QUFFRGYsU0FBT2xCLFNBQVAsR0FBbUI7O0FBRWpCO0FBQ0FrQyxXQUFPLFlBQVk7QUFDakIsV0FBS1IsT0FBTCxDQUFhUyxTQUFiLENBQXVCLENBQXZCLEVBQTBCLENBQTFCLEVBQTZCLEtBQUtYLE1BQUwsQ0FBWS9GLEtBQXpDLEVBQWdELEtBQUsrRixNQUFMLENBQVloRyxNQUE1RDtBQUNELEtBTGdCOztBQU9qQjtBQUNBNEcsZUFBVyxZQUFZOztBQUVyQixXQUFLRixLQUFMOztBQUVBLGNBQVMsS0FBS1osSUFBZDs7QUFFRSxhQUFLLFNBQUw7QUFDRSxlQUFLSSxPQUFMLENBQWFXLFNBQWIsQ0FBd0IsS0FBS2QsT0FBN0IsRUFBc0MsS0FBS0ssSUFBTCxDQUFVRSxDQUFoRCxFQUFtRCxLQUFLRixJQUFMLENBQVVHLENBQTdELEVBQWdFLEtBQUtILElBQUwsQ0FBVWpELENBQTFFLEVBQTZFLEtBQUtpRCxJQUFMLENBQVUzQyxDQUF2RjtBQUNBOztBQUVGLGFBQUssTUFBTDtBQUNFLGVBQUtxRCxPQUFMO0FBQ0E7O0FBRUY7QUFDRSxpQkFBTyxLQUFQO0FBWEo7O0FBY0EsVUFBSSxDQUFDLEtBQUtWLElBQUwsQ0FBVWpELENBQVgsSUFBZ0IsQ0FBQyxLQUFLaUQsSUFBTCxDQUFVM0MsQ0FBL0IsRUFBbUMsT0FBTyxLQUFQOztBQUVuQyxhQUFPLEtBQUt5QyxPQUFMLENBQWFhLFlBQWIsQ0FBMkIsS0FBS1gsSUFBTCxDQUFVRSxDQUFyQyxFQUF3QyxLQUFLRixJQUFMLENBQVVHLENBQWxELEVBQXFELEtBQUtILElBQUwsQ0FBVWpELENBQS9ELEVBQWtFLEtBQUtpRCxJQUFMLENBQVUzQyxDQUE1RSxDQUFQO0FBQ0QsS0E3QmdCOztBQStCakI7QUFDQXFELGFBQVMsWUFBWTs7QUFFbkI7QUFDQSxVQUFJRSxVQUFVLEtBQUtqQixPQUFMLENBQWFrQixJQUFiLEVBQWQ7O0FBRUE7QUFDQSxVQUFJRCxZQUFZLEVBQWhCLEVBQW9CO0FBQ2xCLGFBQUtaLElBQUwsQ0FBVUUsQ0FBVixHQUFjLENBQWQ7QUFDQSxhQUFLRixJQUFMLENBQVVHLENBQVYsR0FBYyxDQUFkO0FBQ0EsYUFBS0gsSUFBTCxDQUFVakQsQ0FBVixHQUFjLENBQWQ7QUFDQSxhQUFLaUQsSUFBTCxDQUFVM0MsQ0FBVixHQUFjLENBQWQ7QUFDQSxhQUFLeUQsV0FBTDtBQUNBLGVBQU8sS0FBUDtBQUNEOztBQUVELFVBQUlqRixDQUFKO0FBQUEsVUFBT2tCLElBQUksQ0FBWDtBQUFBLFVBQWNtRCxJQUFJLEVBQWxCO0FBQUEsVUFBc0JDLElBQUksRUFBMUI7QUFBQSxVQUNFWSxRQUFRLEtBQUtwQixPQUFMLENBQWFxQixLQUFiLENBQW1CLElBQW5CLENBRFY7QUFBQSxVQUNvQztBQUNsQ2pHLGlCQUFXLEtBQUt3RSxRQUFMLENBQWM5QyxRQUFkLENBQXVCMUIsUUFGcEM7O0FBSUEsV0FBSytFLE9BQUwsQ0FBYWhGLElBQWIsR0FBb0JDLFdBQVcsS0FBWCxHQUFtQixLQUFLd0UsUUFBTCxDQUFjOUMsUUFBZCxDQUF1QjNCLElBQTlEO0FBQ0EsV0FBS2dGLE9BQUwsQ0FBYW1CLFNBQWIsR0FBeUIsS0FBSzFCLFFBQUwsQ0FBYzlDLFFBQWQsQ0FBdUI1QixTQUFoRDtBQUNBLFdBQUtpRixPQUFMLENBQWFvQixTQUFiLEdBQXlCLE1BQXpCOztBQUVBO0FBQ0EsV0FBS3JGLElBQUksQ0FBVCxFQUFZQSxJQUFJa0YsTUFBTTNFLE1BQXRCLEVBQThCUCxHQUE5QixFQUFtQztBQUNqQyxhQUFLaUUsT0FBTCxDQUFhcUIsUUFBYixDQUF1QkosTUFBTWxGLENBQU4sQ0FBdkIsRUFBaUNxRSxDQUFqQyxFQUFvQ0MsSUFBSXRFLElBQUVkLFFBQTFDO0FBQ0FnQyxZQUFJQyxLQUFLQyxHQUFMLENBQVVGLENBQVYsRUFBYUMsS0FBS29FLEtBQUwsQ0FBVyxLQUFLdEIsT0FBTCxDQUFhdUIsV0FBYixDQUEwQk4sTUFBTWxGLENBQU4sQ0FBMUIsRUFBcUNoQyxLQUFoRCxDQUFiLENBQUo7QUFDRDs7QUFFRDtBQUNBLFdBQUttRyxJQUFMLENBQVVFLENBQVYsR0FBY2xELEtBQUtDLEdBQUwsQ0FBVWlELENBQVYsRUFBYyxLQUFLRixJQUFMLENBQVVFLENBQXhCLENBQWQ7QUFDQSxXQUFLRixJQUFMLENBQVVHLENBQVYsR0FBY25ELEtBQUtDLEdBQUwsQ0FBV2tELElBQUlwRixRQUFmLEVBQTBCLEtBQUtpRixJQUFMLENBQVVHLENBQXBDLENBQWQ7QUFDQSxXQUFLSCxJQUFMLENBQVVqRCxDQUFWLEdBQWNDLEtBQUtDLEdBQUwsQ0FBV0YsSUFBSWhDLFFBQWYsRUFBMEIsS0FBS2lGLElBQUwsQ0FBVWpELENBQXBDLENBQWQ7QUFDQSxXQUFLaUQsSUFBTCxDQUFVM0MsQ0FBVixHQUFjTCxLQUFLQyxHQUFMLENBQVdsQyxXQUFXYyxDQUFYLEdBQWVkLFFBQTFCLEVBQXFDLEtBQUtpRixJQUFMLENBQVUzQyxDQUEvQyxDQUFkO0FBQ0QsS0FsRWdCOztBQW9FakI7QUFDQWlFLGlCQUFhLFVBQVdqRixJQUFYLEVBQWlCa0YsUUFBakIsRUFBNEI7O0FBRXZDLFVBQUlDLElBQUksS0FBS2hCLFNBQUwsRUFBUjs7QUFFQTtBQUNBO0FBQ0EsVUFBSyxDQUFDdEgsT0FBT21ELElBQVAsQ0FBTixFQUFxQjs7QUFFckI7QUFDQSxVQUFJUixDQUFKO0FBQUEsVUFBTzRGLE9BQU8sQ0FBRUQsQ0FBRixDQUFkO0FBQ0EsVUFBSTdGLE1BQUo7O0FBRUE7QUFDQSxXQUFNRSxJQUFJLENBQVYsRUFBYUEsSUFBSTBGLFNBQVNuRixNQUExQixFQUFrQ1AsR0FBbEMsRUFBd0M7QUFDdEM0RixhQUFLQyxJQUFMLENBQVdILFNBQVMxRixDQUFULENBQVg7QUFDRDs7QUFFRDtBQUNBMkYsVUFBSXRJLE9BQU9tRCxJQUFQLEVBQWFzRixLQUFiLENBQW9CLElBQXBCLEVBQTBCRixJQUExQixDQUFKOztBQUVBO0FBQ0EsV0FBSzNCLE9BQUwsQ0FBYThCLFlBQWIsQ0FBMkJKLENBQTNCLEVBQThCLEtBQUt4QixJQUFMLENBQVVFLENBQXhDLEVBQTJDLEtBQUtGLElBQUwsQ0FBVUcsQ0FBckQ7QUFDRCxLQTNGZ0I7O0FBNkZqQjtBQUNBRSxvQkFBZ0IsWUFBWTtBQUMxQixVQUFJbEIsQ0FBSjtBQUFBLFVBQU8wQyxLQUFLLEVBQVo7QUFDQSxXQUFNLElBQUlDLElBQVYsSUFBa0J4SSxZQUFsQixFQUFpQztBQUMvQixZQUFLLENBQUMsS0FBS2lHLFFBQUwsQ0FBYzlDLFFBQWQsQ0FBdUJqQixLQUF2QixDQUE2QnNHLElBQTdCLENBQU4sRUFBMkM7QUFDM0MzQyxZQUFJLEtBQUs0QyxVQUFMLEVBQUo7QUFDQSxhQUFLVCxXQUFMLENBQWtCbEksUUFBUTBJLElBQVIsRUFBY3pGLElBQWhDLEVBQXNDLEtBQUtrRCxRQUFMLENBQWM5QyxRQUFkLENBQXVCckQsUUFBUTBJLElBQVIsRUFBY3hGLEtBQXJDLENBQXRDO0FBQ0EsYUFBS2hELGFBQWF3SSxJQUFiLENBQUwsRUFBeUIzQyxDQUF6QixFQUE0QixDQUE1QjtBQUNBMEMsV0FBR0MsSUFBSCxJQUFXM0MsQ0FBWDtBQUNEO0FBQ0QsYUFBTzBDLEVBQVA7QUFDRCxLQXhHZ0I7O0FBMEdqQjtBQUNBRyxlQUFXLFlBQVU7QUFDbkIsYUFBTyxLQUFLNUIsTUFBTCxDQUFZLEtBQUtiLFFBQUwsQ0FBY3VDLElBQTFCLEtBQW1DLEtBQTFDO0FBQ0QsS0E3R2dCOztBQStHakI7QUFDQUMsZ0JBQVksWUFBWTtBQUN0QixVQUFJekQsSUFBSSxLQUFLaUIsUUFBTCxDQUFjOUMsUUFBZCxDQUF1QjVDLEtBQS9CO0FBQUEsVUFDRW1DLElBQUksS0FBS3VELFFBQUwsQ0FBYzlDLFFBQWQsQ0FBdUI3QyxNQUQ3QjtBQUFBLFVBRUVxSSxNQUFNLElBQUlyRCxLQUFKLENBQVdOLENBQVgsQ0FGUjtBQUFBLFVBRXdCekMsQ0FGeEI7QUFBQSxVQUUyQnFHLENBRjNCO0FBR0EsV0FBS3JHLElBQUksQ0FBVCxFQUFZQSxJQUFJeUMsQ0FBaEIsRUFBbUJ6QyxHQUFuQixFQUF5QjtBQUN2Qm9HLFlBQUlwRyxDQUFKLElBQVMsSUFBSStDLEtBQUosQ0FBVzVDLENBQVgsQ0FBVDtBQUNBLGFBQUtrRyxJQUFJLENBQVQsRUFBWUEsSUFBSWxHLENBQWhCLEVBQW1Ca0csR0FBbkIsRUFBd0I7QUFDdEJELGNBQUlwRyxDQUFKLEVBQU9xRyxDQUFQLElBQVksQ0FBWjtBQUNEO0FBQ0Y7QUFDRCxhQUFPRCxHQUFQO0FBQ0QsS0EzSGdCOztBQTZIakI7QUFDQW5CLGlCQUFhLFVBQVVxQixLQUFWLEVBQWlCO0FBQzVCLFVBQUl0RyxDQUFKO0FBQUEsVUFBT3FHLENBQVA7QUFBQSxVQUFVRSxDQUFWO0FBQUEsVUFBYWpELENBQWI7QUFBQSxVQUFnQmxELENBQWhCO0FBQUEsVUFDRW1FLFNBQVMsS0FBSzRCLFNBQUwsRUFEWDtBQUVBL0YsVUFBSWtHLFNBQVMsQ0FBYjtBQUNBQyxVQUFJaEMsT0FBT2hFLE1BQVg7QUFDQStDLFVBQUlpQixPQUFPLENBQVAsRUFBVWhFLE1BQWQ7QUFDQSxXQUFLUCxJQUFJLENBQVQsRUFBWUEsSUFBSXVHLENBQWhCLEVBQW1CdkcsR0FBbkIsRUFBd0I7QUFDdEIsYUFBS3FHLElBQUksQ0FBVCxFQUFZQSxJQUFJL0MsQ0FBaEIsRUFBbUIrQyxHQUFuQixFQUF3QjtBQUN0QjlCLGlCQUFPdkUsQ0FBUCxFQUFVcUcsQ0FBVixJQUFlakcsQ0FBZjtBQUNEO0FBQ0Y7QUFDRixLQXpJZ0I7O0FBMklqQjtBQUNBO0FBQ0E7QUFDQW9HLGlCQUFhLFVBQVdqQyxNQUFYLEVBQW1CK0IsS0FBbkIsRUFBMkI7QUFDdEMsVUFBSTdELElBQUksS0FBSzBCLElBQUwsQ0FBVUUsQ0FBbEI7QUFBQSxVQUNFbEUsSUFBSWdCLEtBQUtzRixHQUFMLENBQVV0RixLQUFLb0UsS0FBTCxDQUFXOUMsSUFBSSxLQUFLMEIsSUFBTCxDQUFVakQsQ0FBekIsQ0FBVixFQUF1Q3FELE9BQU9oRSxNQUE5QyxDQUROO0FBQUEsVUFFRW1HLElBQUksS0FBS3ZDLElBQUwsQ0FBVUcsQ0FGaEI7QUFBQSxVQUdFakUsSUFBSWMsS0FBS3NGLEdBQUwsQ0FBVXRGLEtBQUtvRSxLQUFMLENBQVdtQixJQUFJLEtBQUt2QyxJQUFMLENBQVUzQyxDQUF6QixDQUFWLEVBQXVDK0MsT0FBTyxDQUFQLEVBQVVoRSxNQUFqRCxDQUhOO0FBSUEsVUFBSWdFLE9BQU9oRSxNQUFQLEdBQWdCa0MsQ0FBaEIsSUFBcUI4QixPQUFPLENBQVAsRUFBVWhFLE1BQVYsR0FBbUJGLENBQTVDLEVBQWdEOztBQUVoRCxVQUFJTCxDQUFKO0FBQUEsVUFBT3FHLENBQVA7QUFBQSxVQUFVVixJQUFJLEtBQUsxQixPQUFMLENBQWFhLFlBQWIsQ0FBMEIsQ0FBMUIsRUFBNkIsQ0FBN0IsRUFBZ0MsS0FBS3BCLFFBQUwsQ0FBY0ssTUFBZCxDQUFxQi9GLEtBQXJELEVBQTRELEtBQUswRixRQUFMLENBQWNLLE1BQWQsQ0FBcUJoRyxNQUFqRixFQUF5RnVDLElBQXZHOztBQUVBLFdBQUtOLElBQUl5QyxDQUFULEVBQVl6QyxJQUFJRyxDQUFoQixFQUFtQkgsR0FBbkIsRUFBd0I7QUFDdEIsYUFBS3FHLElBQUlLLENBQVQsRUFBWUwsSUFBSWhHLENBQWhCLEVBQW1CZ0csR0FBbkIsRUFBd0I7QUFDdEIsY0FBSU0sTUFBTWhCLEVBQUUsQ0FBRSxLQUFLakMsUUFBTCxDQUFjSyxNQUFkLENBQXFCL0YsS0FBckIsR0FBNkJxSSxDQUE5QixHQUFtQ3JHLENBQXBDLElBQXlDLENBQTNDLENBQVY7QUFDQXVFLGlCQUFPdkUsQ0FBUCxFQUFVcUcsQ0FBVixJQUFpQk0sUUFBUSxHQUFWLEdBQWtCTCxLQUFsQixHQUEwQixDQUF6QztBQUNEO0FBQ0Y7QUFDRixLQTdKZ0I7O0FBK0pqQjtBQUNBOUMsc0JBQWtCLFVBQVc1QixNQUFYLEVBQW1CdkUsTUFBbkIsRUFBNEI7QUFDNUMsVUFBSXNELE9BQU8sSUFBWDs7QUFFQTtBQUNBLFVBQUkyQyxJQUFJLElBQUlHLE1BQUosQ0FBYSxLQUFLQyxRQUFsQixFQUE0QixLQUFLSSxPQUFqQyxFQUEwQyxFQUFFNUMsR0FBRSxLQUFLd0MsUUFBTCxDQUFjOUMsUUFBZCxDQUF1QnJDLFVBQTNCLEVBQXVDaUQsR0FBRSxLQUFLa0MsUUFBTCxDQUFjOUMsUUFBZCxDQUF1QnBDLFdBQWhFLEVBQTFDLENBQVI7O0FBRUE7QUFDQSxVQUFLbkIsTUFBTCxFQUFjO0FBQ1ppRyxVQUFFbUMsV0FBRixDQUFlbEksUUFBUSxLQUFLbUcsUUFBTCxDQUFjdUMsSUFBdEIsRUFBNEJ6RixJQUEzQyxFQUFpRCxLQUFLSSxRQUFMLENBQWNyRCxRQUFRLEtBQUttRyxRQUFMLENBQWN1QyxJQUF0QixFQUE0QnhGLEtBQTFDLENBQWpEO0FBQ0Q7QUFDRDtBQUNBNkMsUUFBRVMsTUFBRixDQUFTNkMsS0FBVCxDQUFlQyxNQUFmLEdBQXdCLFNBQXhCOztBQUVBO0FBQ0F2RCxRQUFFUyxNQUFGLENBQVMrQyxPQUFULEdBQW1CLFVBQVV2QyxNQUFWLEVBQWtCO0FBQ25DLGVBQU8sVUFBV3dDLENBQVgsRUFBZTtBQUNwQnBHLGVBQUsrQyxRQUFMLENBQWNzRCxJQUFkLENBQW9CekMsTUFBcEI7QUFDRCxTQUZEO0FBR0QsT0FKa0IsQ0FJaEJqQixDQUpnQixDQUFuQjs7QUFNQTtBQUNBLFdBQUtJLFFBQUwsQ0FBY3VELGdCQUFkLENBQStCcEIsSUFBL0IsQ0FBcUN2QyxDQUFyQzs7QUFFQTtBQUNBbEcsU0FBR3VFLE1BQUgsQ0FBV0MsTUFBWCxFQUFtQjBCLEVBQUVTLE1BQXJCOztBQUVBLGFBQU9ULENBQVA7QUFDRDtBQTNMZ0IsR0FBbkI7O0FBOExBOzs7Ozs7QUFNQSxXQUFTNEQsUUFBVCxHQUFxQjtBQUNuQixTQUFLdEcsUUFBTCxHQUFnQnhELEdBQUdvRixZQUFILENBQWlCLEVBQWpCLEVBQXFCMUUsUUFBckIsQ0FBaEI7QUFDQSxTQUFLcUosU0FBTCxHQUFpQixFQUFqQjtBQUNBLFNBQUtGLGdCQUFMLEdBQXdCLEVBQXhCO0FBQ0EsU0FBS0csU0FBTCxHQUFpQixFQUFqQjtBQUNBLFNBQUtDLE1BQUwsR0FBYyxFQUFkO0FBQ0EsU0FBS3RHLFVBQUwsR0FBa0IsS0FBS0gsUUFBTCxDQUFjbEMsSUFBaEM7QUFDQSxTQUFLdUgsSUFBTCxHQUFZLEtBQUtyRixRQUFMLENBQWNyQixXQUExQjtBQUNBLFNBQUt1QixVQUFMLEdBQWtCLEtBQWxCO0FBQ0EsU0FBS3dHLFdBQUwsR0FBbUIsSUFBbkI7QUFDQSxTQUFLdkQsTUFBTCxHQUFjLEtBQUtDLFNBQUwsRUFBZDtBQUNBLFNBQUtDLE9BQUwsR0FBZSxLQUFLQyxZQUFMLENBQW1CLEtBQUtILE1BQXhCLENBQWY7QUFDRDs7QUFFRG1ELFdBQVMzRSxTQUFULEdBQXFCOztBQUVqQjtBQUNBZ0YsVUFBTSxVQUFXQyxPQUFYLEVBQXFCOztBQUV6QjtBQUNBcEssU0FBR29GLFlBQUgsQ0FBaUIsS0FBSzVCLFFBQXRCLEVBQWdDNEcsT0FBaEM7O0FBRUE7QUFDQXBLLFNBQUd1RSxNQUFILENBQVcsS0FBS2YsUUFBTCxDQUFjekMsYUFBekIsRUFBd0MsS0FBSzRGLE1BQTdDOztBQUVBO0FBQ0EsV0FBS0EsTUFBTCxDQUFZNkMsS0FBWixDQUFrQmEsZUFBbEIsR0FBb0MsS0FBSzdHLFFBQUwsQ0FBYzNDLFVBQWxEOztBQUVBO0FBQ0EsV0FBS3lKLFVBQUw7O0FBRUE7QUFDQSxXQUFLTCxNQUFMLENBQVl4QixJQUFaLENBQWtCLElBQUk4QixJQUFKLENBQVUsSUFBSUMsTUFBSixDQUFXLEtBQUtoSCxRQUFMLENBQWN4QixLQUF6QixFQUFnQyxLQUFLd0IsUUFBTCxDQUFjdkIsS0FBOUMsQ0FBVixFQUFnRSxLQUFLdUIsUUFBTCxDQUFjbEMsSUFBOUUsQ0FBbEI7O0FBRUE7QUFDQSxXQUFLbUosSUFBTDtBQUVELEtBdkJnQjs7QUF5QmpCO0FBQ0FDLFNBQUssVUFBV04sT0FBWCxFQUFvQjtBQUN2QnBLLFNBQUdvRixZQUFILENBQWlCLEtBQUs1QixRQUF0QixFQUFnQzRHLE9BQWhDO0FBQ0QsS0E1QmdCOztBQThCakI7QUFDQWpFLGlCQUFhLFVBQVVJLEtBQVYsRUFBaUJDLFVBQWpCLEVBQTZCOztBQUV4QztBQUNBLFVBQUlOLElBQUksSUFBSUcsTUFBSixDQUFhLElBQWIsRUFBbUJFLEtBQW5CLEVBQTBCQyxVQUExQixDQUFSOztBQUVBO0FBQ0EsV0FBSzBELFdBQUwsR0FBcUIsS0FBS0EsV0FBTCxLQUFxQixJQUF2QixHQUFnQyxDQUFoQyxHQUFvQyxLQUFLQSxXQUE1RDtBQUNBLFdBQUtILFNBQUwsQ0FBZXRCLElBQWYsQ0FBcUJ2QyxDQUFyQjtBQUNBLGFBQU9BLENBQVA7QUFDRCxLQXhDZ0I7O0FBMENqQjtBQUNBVSxlQUFXLFVBQVdHLElBQVgsRUFBa0I7QUFDM0IsVUFBSUosU0FBUzdHLFNBQVM2SyxhQUFULENBQXdCLFFBQXhCLENBQWI7QUFBQSxVQUNJQyxJQUFJN0QsUUFBUSxFQURoQjs7QUFHQUosYUFBT2hHLE1BQVAsR0FBa0JpSyxFQUFFeEcsQ0FBSixHQUFVd0csRUFBRXhHLENBQVosR0FBZ0IsS0FBS1osUUFBTCxDQUFjN0MsTUFBOUM7QUFDQWdHLGFBQU8vRixLQUFQLEdBQWlCZ0ssRUFBRTlHLENBQUosR0FBVThHLEVBQUU5RyxDQUFaLEdBQWdCLEtBQUtOLFFBQUwsQ0FBYzVDLEtBQTdDOztBQUVBLGFBQU8rRixNQUFQO0FBQ0QsS0FuRGdCOztBQXFEakI7QUFDQUcsa0JBQWMsVUFBV0gsTUFBWCxFQUFvQjtBQUNoQyxhQUFPQSxPQUFPa0UsVUFBUCxDQUFtQixJQUFuQixDQUFQO0FBQ0QsS0F4RGdCOztBQTBEakI7QUFDQTdELGtCQUFjLFVBQVdqQixHQUFYLEVBQWdCZ0IsSUFBaEIsRUFBdUI7QUFDbkMsVUFBSWpELElBQUlpQyxJQUFJbkYsS0FBWjtBQUFBLFVBQ0l3RCxJQUFJMkIsSUFBSXBGLE1BRFo7QUFBQSxVQUVJbUssS0FBTy9ELElBQUYsR0FBV0EsS0FBS2pELENBQWhCLEdBQW9CLEtBQUs2QyxNQUFMLENBQVkvRixLQUZ6QztBQUFBLFVBR0ltSyxLQUFPaEUsSUFBRixHQUFXQSxLQUFLM0MsQ0FBaEIsR0FBb0IsS0FBS3VDLE1BQUwsQ0FBWWhHLE1BSHpDO0FBQUEsVUFJSXFLLFFBQVFsSCxJQUFJTSxDQUpoQjs7QUFNQSxVQUFLTixLQUFLTSxDQUFMLElBQVVOLElBQUlnSCxFQUFuQixFQUF3QjtBQUN0QmhILFlBQUlnSCxFQUFKO0FBQ0ExRyxZQUFJTCxLQUFLa0gsS0FBTCxDQUFZbkgsSUFBSWtILEtBQWhCLENBQUo7QUFDRCxPQUhELE1BS0s7QUFDSCxZQUFLNUcsSUFBSTJHLEVBQVQsRUFBYztBQUNaM0csY0FBSTJHLEVBQUo7QUFDQWpILGNBQUlDLEtBQUtrSCxLQUFMLENBQVk3RyxJQUFJNEcsS0FBaEIsQ0FBSjtBQUNEO0FBQ0Y7O0FBRUQsYUFBTztBQUNML0QsV0FBR2xELEtBQUtrSCxLQUFMLENBQVksQ0FBRUgsS0FBS2hILENBQVAsSUFBYSxDQUF6QixDQURFO0FBRUxvRCxXQUFHbkQsS0FBS2tILEtBQUwsQ0FBWSxDQUFFRixLQUFLM0csQ0FBUCxJQUFhLENBQXpCLENBRkU7QUFHTE4sV0FBR0EsQ0FIRTtBQUlMTSxXQUFHQTtBQUpFLE9BQVA7QUFNRCxLQXBGZ0I7O0FBc0ZqQjtBQUNBOEcsVUFBTSxVQUFXdkIsQ0FBWCxFQUFjN0QsS0FBZCxFQUFzQjs7QUFFMUIsVUFBSWxELENBQUo7QUFBQSxVQUFPVyxPQUFPLElBQWQ7QUFDQSxVQUFJNEgsUUFBVXhCLEVBQUVuRixNQUFKLEdBQWVtRixFQUFFbkYsTUFBRixDQUFTMkcsS0FBeEIsR0FBZ0N4QixDQUE1QztBQUNBLFVBQUl5QixLQUFPdEYsVUFBVSxPQUFaLEdBQXdCLEtBQXhCLEdBQWdDLElBQXpDOztBQUVBO0FBQ0EsVUFBSyxDQUFDcUYsS0FBRCxJQUFZQSxNQUFNakcsV0FBTixLQUFzQlMsS0FBdEIsSUFBK0IsQ0FBQ3dGLEtBQUQsWUFBa0JFLFFBQWxFLEVBQStFLE9BQU9DLFFBQVFDLEdBQVIsQ0FBYSxrQkFBYixDQUFQOztBQUUvRSxXQUFNM0ksSUFBSSxDQUFWLEVBQWFBLElBQUl1SSxNQUFNaEksTUFBdkIsRUFBK0JQLEdBQS9CLEVBQW9DOztBQUVsQyxZQUFJNEksT0FBT0wsTUFBTXZJLENBQU4sQ0FBWDs7QUFFQTtBQUNBLFlBQUs0SSxLQUFLL0UsSUFBVixFQUFnQjs7QUFFZDtBQUNBLGNBQUssQ0FBQytFLEtBQUsvRSxJQUFMLENBQVVnRixLQUFWLENBQWlCLE9BQWpCLENBQU4sRUFBbUM7O0FBRWpDLGNBQUlDLFNBQVMsSUFBSUMsVUFBSixFQUFiOztBQUVBO0FBQ0FELGlCQUFPekYsTUFBUCxHQUFnQixVQUFXMkYsS0FBWCxFQUFtQjs7QUFFakM7QUFDQSxnQkFBSXJHLE1BQU1xRyxNQUFNcEgsTUFBTixDQUFhcUgsTUFBdkI7O0FBRUE7QUFDQTdMLGVBQUc2RixTQUFILENBQWFiLElBQWIsQ0FBbUIsSUFBbkIsRUFBeUJPLEdBQXpCLEVBQThCaEMsSUFBOUIsRUFBb0M2SCxFQUFwQztBQUNELFdBUEQ7QUFRQTtBQUNBTSxpQkFBT0ksYUFBUCxDQUFzQk4sSUFBdEI7QUFFSCxTQW5CRCxNQW1CTztBQUFFOztBQUVQO0FBQ0F4TCxhQUFHNkYsU0FBSCxDQUFhYixJQUFiLENBQW1CLElBQW5CLEVBQXlCd0csSUFBekIsRUFBK0JqSSxJQUEvQixFQUFxQzZILEVBQXJDO0FBQ0Q7QUFDRjtBQUNGLEtBOUhnQjs7QUFnSWpCO0FBQ0FXLGdCQUFZLFVBQVdsRCxJQUFYLEVBQWtCOztBQUU1QjtBQUNBLFdBQUtBLElBQUwsR0FBWUEsSUFBWjs7QUFFQTtBQUNBLFVBQUksT0FBTyxLQUFLckYsUUFBTCxDQUFjbEIsa0JBQXJCLEtBQTRDLFVBQWhELEVBQTZEO0FBQzNELGFBQUtrQixRQUFMLENBQWNsQixrQkFBZCxDQUFpQzBDLElBQWpDLENBQXVDLElBQXZDO0FBQ0Q7QUFDRixLQTFJZ0I7O0FBNElqQjtBQUNBZ0gsYUFBUyxVQUFVL0UsQ0FBVixFQUFhQyxDQUFiLEVBQWdCNUYsSUFBaEIsRUFBc0I7QUFDN0IsVUFBSTRFLElBQUksSUFBSXFFLElBQUosQ0FBVSxJQUFJQyxNQUFKLENBQVd2RCxDQUFYLEVBQWNDLENBQWQsQ0FBVixFQUE0QjVGLElBQTVCLENBQVI7QUFDQSxXQUFLMkksTUFBTCxDQUFZeEIsSUFBWixDQUFrQnZDLENBQWxCO0FBQ0EsYUFBT0EsQ0FBUDtBQUNELEtBakpnQjs7QUFtSmpCO0FBQ0FvRSxnQkFBWSxZQUFZO0FBQ3RCLFdBQUs5RyxRQUFMLENBQWN4QixLQUFkLEdBQXNCLEtBQUsyRSxNQUFMLENBQVkvRixLQUFaLEdBQWtCLENBQXhDO0FBQ0EsV0FBSzRDLFFBQUwsQ0FBY3ZCLEtBQWQsR0FBc0IsS0FBSzBFLE1BQUwsQ0FBWWhHLE1BQVosR0FBbUIsQ0FBekM7QUFFRCxLQXhKZ0I7O0FBMEpqQjtBQUNBc0wsaUJBQWEsVUFBV0MsUUFBWCxFQUFzQjtBQUNqQyxVQUFJdEosQ0FBSjtBQUFBLFVBQU91RyxJQUFJakosUUFBUSxLQUFLMkksSUFBYixFQUFtQjFGLE1BQTlCO0FBQ0EsV0FBTVAsSUFBSSxDQUFWLEVBQWFBLElBQUl1RyxDQUFqQixFQUFvQnZHLEdBQXBCLEVBQTBCO0FBQ3hCc0osaUJBQVNoTSxRQUFRLEtBQUsySSxJQUFiLEVBQW1CakcsQ0FBbkIsQ0FBVDtBQUNEO0FBQ0YsS0FoS2dCOztBQWtLakI7QUFDQWdILFVBQU0sVUFBV3pDLE1BQVgsRUFBb0I7QUFDeEIsV0FBS2dGLGtCQUFMO0FBQ0EsV0FBS2pDLFdBQUwsR0FBbUIsS0FBS0wsZ0JBQUwsQ0FBc0J1QyxPQUF0QixDQUErQmpGLE1BQS9CLENBQW5CO0FBQ0QsS0F0S2dCOztBQXdLakI7QUFDQWtGLDRCQUF3QixVQUFXakosSUFBWCxFQUFpQnBELEVBQWpCLEVBQXNCO0FBQzVDLFVBQUssT0FBT0EsRUFBUCxLQUFjLFVBQWQsSUFBNEIsT0FBT29ELElBQVAsS0FBZ0IsUUFBakQsRUFBNEQ7QUFDMUQsZUFBT2tJLFFBQVFDLEdBQVIsQ0FBYSxxRkFBYixDQUFQO0FBQ0Q7QUFDRG5MLHFCQUFnQmdELElBQWhCLElBQXlCcEQsRUFBekI7QUFDRCxLQTlLZ0I7O0FBZ0xqQjtBQUNBbU0sd0JBQW9CLFlBQVc7QUFDN0IsVUFBSTtBQUNGL0wsdUJBQWdCLEtBQUtvRCxRQUFMLENBQWNwRCxjQUE5QixFQUErQzRFLElBQS9DLENBQXFELElBQXJEO0FBQ0QsT0FGRCxDQUVFLE9BQVEyRSxDQUFSLEVBQVk7QUFDWjJCLGdCQUFRQyxHQUFSLENBQWE1QixFQUFFdkcsSUFBRixHQUFTLEtBQVQsR0FBaUJ1RyxFQUFFMkMsT0FBaEM7QUFDRDtBQUNGLEtBdkxnQjs7QUF5TGpCO0FBQ0FDLGVBQVcsWUFBWTtBQUNyQixVQUFJLEtBQUt2QyxTQUFMLENBQWU3RyxNQUFmLEdBQXdCLEtBQUtLLFFBQUwsQ0FBYy9CLE9BQTFDLEVBQW1EO0FBQ2pELFlBQUltQixDQUFKO0FBQUEsWUFBTzRKLEtBQUssS0FBS2hKLFFBQUwsQ0FBYy9CLE9BQWQsR0FBd0IsS0FBS3VJLFNBQUwsQ0FBZTdHLE1BQW5EO0FBQ0EsYUFBTVAsSUFBSSxDQUFWLEVBQWFBLElBQUk0SixFQUFqQixFQUFxQjVKLEdBQXJCLEVBQTJCO0FBQ3pCLGVBQUtvSCxTQUFMLENBQWV2QixJQUFmLENBQW9CLElBQUlnRSxRQUFKLENBQWEsSUFBYixFQUFtQixJQUFJakMsTUFBSixDQUFXekcsS0FBSzJJLE1BQUwsS0FBZ0IsS0FBSy9GLE1BQUwsQ0FBWS9GLEtBQXZDLEVBQThDbUQsS0FBSzJJLE1BQUwsS0FBZ0IsS0FBSy9GLE1BQUwsQ0FBWWhHLE1BQTFFLENBQW5CLEVBQXNHLElBQUk2SixNQUFKLENBQVdtQyxXQUFXLEtBQUtuSixRQUFMLENBQWN6QixlQUF6QixDQUFYLEVBQXNENEssV0FBVyxLQUFLbkosUUFBTCxDQUFjekIsZUFBekIsQ0FBdEQsQ0FBdEcsRUFBd00sSUFBSXlJLE1BQUosQ0FBVyxDQUFYLEVBQWMsQ0FBZCxDQUF4TSxFQUEwTixDQUExTixFQUE2TixLQUE3TixDQUFwQjtBQUNEO0FBQ0Y7QUFDRixLQWpNZ0I7O0FBbU1qQjtBQUNBb0Msa0JBQWMsWUFBWTs7QUFFeEIsVUFBSUMsZUFBZSxFQUFuQjtBQUFBLFVBQ0lqSyxDQURKO0FBQUEsVUFDT3VHLElBQUksS0FBS2EsU0FBTCxDQUFlN0csTUFEMUI7O0FBR0EsV0FBS1AsSUFBSSxDQUFULEVBQVlBLElBQUl1RyxDQUFoQixFQUFtQnZHLEdBQW5CLEVBQXdCOztBQUV0QixZQUFJc0osV0FBVyxLQUFLbEMsU0FBTCxDQUFlcEgsQ0FBZixDQUFmO0FBQUEsWUFDSWtLLE1BQU1aLFNBQVNhLFFBRG5COztBQUdBO0FBQ0EsWUFBSUQsSUFBSTdGLENBQUosSUFBUyxLQUFLTixNQUFMLENBQVkvRixLQUFyQixJQUE4QmtNLElBQUk3RixDQUFKLElBQVMsQ0FBdkMsSUFBNEM2RixJQUFJNUYsQ0FBSixJQUFTLEtBQUtQLE1BQUwsQ0FBWWhHLE1BQWpFLElBQTJFbU0sSUFBSTVGLENBQUosSUFBUyxDQUF4RixFQUE0Rjs7QUFFNUY7QUFDQSxhQUFLK0UsV0FBTCxDQUFrQkMsUUFBbEI7O0FBRUE7QUFDQUEsaUJBQVNjLElBQVQ7O0FBRUE7QUFDQUgscUJBQWFwRSxJQUFiLENBQW1CeUQsUUFBbkI7QUFDRDtBQUNELFdBQUtsQyxTQUFMLEdBQWlCNkMsWUFBakI7QUFDRCxLQTNOZ0I7O0FBNk5qQjtBQUNBSSxlQUFXLFlBQVk7QUFDckIsVUFBSXJLLENBQUo7QUFBQSxVQUFPc0ssSUFBSSxLQUFLbEQsU0FBTCxDQUFlN0csTUFBMUI7QUFDQSxXQUFLUCxJQUFJLENBQVQsRUFBWUEsSUFBSXNLLENBQWhCLEVBQW1CdEssR0FBbkIsRUFBd0I7QUFDdEIsWUFBSWtLLE1BQU0sS0FBSzlDLFNBQUwsQ0FBZXBILENBQWYsRUFBa0JtSyxRQUE1QjtBQUNBLGFBQUtsRyxPQUFMLENBQWFtQixTQUFiLEdBQXlCLEtBQUtnQyxTQUFMLENBQWVwSCxDQUFmLEVBQWtCdUssS0FBM0M7QUFDQSxhQUFLdEcsT0FBTCxDQUFhdUcsUUFBYixDQUFzQk4sSUFBSTdGLENBQTFCLEVBQTZCNkYsSUFBSTVGLENBQWpDLEVBQW9DLEtBQUsxRCxRQUFMLENBQWM5QixZQUFsRCxFQUFnRSxLQUFLOEIsUUFBTCxDQUFjOUIsWUFBOUU7QUFDRDtBQUNGLEtBck9nQjs7QUF1T2pCO0FBQ0ErQixnQkFBWSxZQUFZO0FBQ3RCLFVBQUliLENBQUo7QUFBQSxVQUFPdUcsSUFBSSxLQUFLYSxTQUFMLENBQWU3RyxNQUExQjtBQUNBLFdBQUtQLElBQUksQ0FBVCxFQUFZQSxJQUFJdUcsQ0FBaEIsRUFBbUJ2RyxHQUFuQixFQUF3QjtBQUN0QixhQUFLb0gsU0FBTCxDQUFlcEgsQ0FBZixFQUFrQnlLLE1BQWxCLEdBQTJCLENBQTNCO0FBQ0Q7QUFDRixLQTdPZ0I7O0FBK09qQjtBQUNBaEcsV0FBTyxZQUFZO0FBQ2pCLFVBQUksQ0FBQyxLQUFLN0QsUUFBTCxDQUFjcEIsSUFBbkIsRUFBMEI7QUFDeEIsYUFBS3lFLE9BQUwsQ0FBYVMsU0FBYixDQUF3QixDQUF4QixFQUEyQixDQUEzQixFQUE4QixLQUFLWCxNQUFMLENBQVkvRixLQUExQyxFQUFpRCxLQUFLK0YsTUFBTCxDQUFZaEcsTUFBN0Q7QUFDRDtBQUNGLEtBcFBnQjs7QUFzUGpCO0FBQ0EyTSxXQUFPLFlBQVk7QUFDakIsVUFBSS9KLE9BQU8sSUFBWDtBQUNBLFVBQUksQ0FBQyxLQUFLQyxRQUFMLENBQWNuQixJQUFuQixFQUEwQjtBQUNsQixhQUFLa0wsU0FBTCxHQUFpQjFOLE9BQU8yTixxQkFBUCxDQUE4QmpLLEtBQUtrSCxJQUFMLENBQVVnRCxJQUFWLENBQWVsSyxJQUFmLENBQTlCLENBQWpCO0FBQ1AsT0FGRCxNQUVPO0FBQ0MxRCxlQUFPNk4sb0JBQVAsQ0FBNkJuSyxLQUFLZ0ssU0FBbEM7QUFDQSxhQUFLQSxTQUFMLEdBQWlCeE4sU0FBakI7QUFDUDtBQUNGLEtBL1BnQjs7QUFpUWpCO0FBQ0E0TixZQUFRLFlBQVk7QUFDbEIsV0FBS3BCLFNBQUw7QUFDQSxXQUFLSyxZQUFMO0FBQ0QsS0FyUWdCOztBQXVRakI7QUFDQXhLLFVBQU0sWUFBWTtBQUNoQixXQUFLNkssU0FBTDtBQUNELEtBMVFnQjs7QUE0UWpCO0FBQ0F4QyxVQUFNLFlBQVk7QUFDaEIsV0FBS3BELEtBQUw7QUFDQSxXQUFLc0csTUFBTDtBQUNBLFdBQUt2TCxJQUFMO0FBQ0EsV0FBS2tMLEtBQUw7QUFDRCxLQWxSZ0I7O0FBb1JqQjtBQUNBakwsVUFBTSxZQUFZO0FBQ2hCLFdBQUttQixRQUFMLENBQWNuQixJQUFkLEdBQXFCLElBQXJCO0FBQ0QsS0F2UmdCOztBQXlSakI7QUFDQXVMLFdBQU8sWUFBWTtBQUNqQixXQUFLcEssUUFBTCxDQUFjbkIsSUFBZCxHQUFxQixLQUFyQjtBQUNBLFdBQUtvSSxJQUFMO0FBQ0Q7O0FBN1JnQixHQUFyQjs7QUFrU0M7QUFDQSxXQUFTa0MsVUFBVCxDQUFxQjNJLEdBQXJCLEVBQTBCO0FBQ3ZCLFdBQU9ELEtBQUs4SixHQUFMLENBQVU5SixLQUFLMkksTUFBTCxLQUFnQjNJLEtBQUsrSixFQUEvQixJQUFzQzlKLEdBQTdDO0FBQ0Q7O0FBRUQ7QUFDQSxXQUFTd0csTUFBVCxDQUFpQnZELENBQWpCLEVBQW9CQyxDQUFwQixFQUF3QjtBQUN0QixTQUFLRCxDQUFMLEdBQVNBLEtBQUssQ0FBZDtBQUNBLFNBQUtDLENBQUwsR0FBU0EsS0FBSyxDQUFkO0FBQ0Q7O0FBRUQ7QUFDQXNELFNBQU9yRixTQUFQLENBQWlCNEksR0FBakIsR0FBdUIsVUFBU0MsTUFBVCxFQUFnQjtBQUNyQyxTQUFLL0csQ0FBTCxJQUFVK0csT0FBTy9HLENBQWpCO0FBQ0EsU0FBS0MsQ0FBTCxJQUFVOEcsT0FBTzlHLENBQWpCO0FBQ0QsR0FIRDs7QUFLQTtBQUNBc0QsU0FBT3JGLFNBQVAsQ0FBaUI4SSxTQUFqQixHQUE2QixZQUFVO0FBQ3JDLFNBQUtoSCxDQUFMLEdBQVMsQ0FBQyxDQUFELEdBQU0sS0FBS0EsQ0FBcEI7QUFDQSxTQUFLQyxDQUFMLEdBQVMsQ0FBQyxDQUFELEdBQU0sS0FBS0EsQ0FBcEI7QUFDRCxHQUhEOztBQUtBO0FBQ0FzRCxTQUFPckYsU0FBUCxDQUFpQitJLFlBQWpCLEdBQWdDLFlBQVU7QUFDeEMsV0FBT25LLEtBQUtvSyxJQUFMLENBQVUsS0FBS2xILENBQUwsR0FBUyxLQUFLQSxDQUFkLEdBQWtCLEtBQUtDLENBQUwsR0FBUyxLQUFLQSxDQUExQyxDQUFQO0FBQ0QsR0FGRDs7QUFJQTtBQUNBc0QsU0FBT3JGLFNBQVAsQ0FBaUJpSixRQUFqQixHQUE0QixZQUFVO0FBQ3BDLFdBQU9ySyxLQUFLc0ssS0FBTCxDQUFXLEtBQUtuSCxDQUFoQixFQUFtQixLQUFLRCxDQUF4QixDQUFQO0FBQ0QsR0FGRDs7QUFJQTtBQUNBdUQsU0FBT3JGLFNBQVAsQ0FBaUJtSixTQUFqQixHQUE2QixVQUFXQyxLQUFYLEVBQWtCQyxTQUFsQixFQUE4QjtBQUN6RCxXQUFPLElBQUloRSxNQUFKLENBQVdnRSxZQUFZekssS0FBSzhKLEdBQUwsQ0FBU1UsS0FBVCxDQUF2QixFQUF3Q0MsWUFBWXpLLEtBQUswSyxHQUFMLENBQVNGLEtBQVQsQ0FBcEQsQ0FBUDtBQUNELEdBRkQ7O0FBSUE7QUFDQSxXQUFTOUIsUUFBVCxDQUFtQm5HLFFBQW5CLEVBQTZCeUcsUUFBN0IsRUFBdUMyQixPQUF2QyxFQUFnREMsWUFBaEQsRUFBK0Q7QUFDN0QsU0FBS3JJLFFBQUwsR0FBZ0JBLFFBQWhCO0FBQ0EsU0FBS3lHLFFBQUwsR0FBZ0JBLFlBQVksSUFBSXZDLE1BQUosQ0FBVyxDQUFYLEVBQWMsQ0FBZCxDQUE1QjtBQUNBLFNBQUtrRSxPQUFMLEdBQWVBLFdBQVcsSUFBSWxFLE1BQUosQ0FBVyxDQUFYLEVBQWMsQ0FBZCxDQUExQjtBQUNBLFNBQUttRSxZQUFMLEdBQW9CQSxnQkFBZ0IsSUFBSW5FLE1BQUosQ0FBVyxDQUFYLEVBQWMsQ0FBZCxDQUFwQztBQUNBLFNBQUsyQyxLQUFMLEdBQWEsS0FBSzdHLFFBQUwsQ0FBYzlDLFFBQWQsQ0FBdUI3QixhQUFwQztBQUNBLFNBQUswTCxNQUFMLEdBQWMsQ0FBZDtBQUNEOztBQUVEO0FBQ0FaLFdBQVN0SCxTQUFULENBQW1CNkgsSUFBbkIsR0FBMEIsWUFBVTtBQUNsQyxTQUFLMEIsT0FBTCxDQUFhWCxHQUFiLENBQWtCLEtBQUtZLFlBQXZCO0FBQ0EsU0FBSzVCLFFBQUwsQ0FBY2dCLEdBQWQsQ0FBbUIsS0FBS1csT0FBeEI7QUFDRCxHQUhEOztBQUtBO0FBQ0FqQyxXQUFTdEgsU0FBVCxDQUFtQnlKLFdBQW5CLEdBQWlDLFlBQVc7O0FBRzFDLFFBQUl0TixPQUFPLEtBQUtnRixRQUFMLENBQWMzQyxVQUF6Qjs7QUFFQTtBQUNBLFFBQUssQ0FBQ3JDLElBQU4sRUFBYTs7QUFFYjtBQUNBLFFBQUssS0FBSytMLE1BQUwsS0FBZ0IsQ0FBckIsRUFBeUI7O0FBRXZCLFVBQUl3QixxQkFBcUIsQ0FBekI7QUFDQSxVQUFJQyxxQkFBcUIsQ0FBekI7QUFDQSxVQUFJM0YsSUFBSSxLQUFLN0MsUUFBTCxDQUFjMkQsTUFBZCxDQUFxQjlHLE1BQTdCOztBQUVBO0FBQ0EsV0FBSyxJQUFJUCxJQUFJLENBQWIsRUFBZ0JBLElBQUl1RyxDQUFwQixFQUF1QnZHLEdBQXZCLEVBQTRCO0FBQzFCLFlBQUltTSxRQUFRLEtBQUt6SSxRQUFMLENBQWMyRCxNQUFkLENBQXFCckgsQ0FBckIsRUFBd0JtSyxRQUF4QixDQUFpQzlGLENBQWpDLEdBQXFDLEtBQUs4RixRQUFMLENBQWM5RixDQUEvRDtBQUNBLFlBQUkrSCxRQUFRLEtBQUsxSSxRQUFMLENBQWMyRCxNQUFkLENBQXFCckgsQ0FBckIsRUFBd0JtSyxRQUF4QixDQUFpQzdGLENBQWpDLEdBQXFDLEtBQUs2RixRQUFMLENBQWM3RixDQUEvRDtBQUNBLFlBQUkrSCxRQUFRM04sT0FBT3lDLEtBQUttTCxHQUFMLENBQVNILFFBQVFBLEtBQVIsR0FBZ0JDLFFBQVFBLEtBQWpDLEVBQXdDLEdBQXhDLENBQW5CO0FBQ0FILDhCQUFzQkUsUUFBUUUsS0FBOUI7QUFDQUgsOEJBQXNCRSxRQUFRQyxLQUE5QjtBQUNEOztBQUVEO0FBQ0EsV0FBS04sWUFBTCxHQUFvQixJQUFJbkUsTUFBSixDQUFZcUUsa0JBQVosRUFBZ0NDLGtCQUFoQyxDQUFwQjtBQUNEO0FBQ0YsR0EzQkQ7O0FBNkJBO0FBQ0FyQyxXQUFTdEgsU0FBVCxDQUFtQmdLLFVBQW5CLEdBQWdDLFlBQVU7O0FBRXhDO0FBQ0EsUUFBSSxLQUFLN0ksUUFBTCxDQUFjNUMsVUFBbEIsRUFBOEI7QUFDNUIsV0FBSzJKLE1BQUwsR0FBYyxDQUFkO0FBQ0E7QUFDRDs7QUFFRDtBQUNBLFFBQUkrQixRQUFRckwsS0FBS29FLEtBQUwsQ0FBWSxLQUFLNEUsUUFBTCxDQUFjOUYsQ0FBMUIsQ0FBWjtBQUNBLFFBQUlvSSxRQUFRdEwsS0FBS29FLEtBQUwsQ0FBWSxLQUFLNEUsUUFBTCxDQUFjN0YsQ0FBMUIsQ0FBWjs7QUFFQTtBQUNBLFFBQUlnQyxRQUFVLEtBQUs1QyxRQUFMLENBQWM0RCxXQUFkLEtBQThCLElBQWhDLEdBQXlDLEtBQUs1RCxRQUFMLENBQWN5RCxTQUFkLENBQXdCLEtBQUt6RCxRQUFMLENBQWM0RCxXQUF0QyxFQUFtRG5CLFNBQW5ELEdBQStEcUcsS0FBL0QsRUFBc0VDLEtBQXRFLENBQXpDLEdBQXdILENBQXBJOztBQUVBO0FBQ0EsUUFBS25HLFVBQVUsQ0FBZixFQUFrQjs7QUFFaEI7QUFDQSxVQUFJLEtBQUttRSxNQUFMLEtBQWdCLENBQXBCLEVBQXVCOztBQUVyQjtBQUNBLGFBQUtBLE1BQUwsR0FBYyxDQUFkOztBQUVBO0FBQ0EsYUFBS3FCLE9BQUwsR0FBZSxJQUFJbEUsTUFBSixDQUFXLEtBQUtrRSxPQUFMLENBQWF6SCxDQUFiLEdBQWlCLEdBQTVCLEVBQWlDLEtBQUt5SCxPQUFMLENBQWF4SCxDQUFiLEdBQWlCLEdBQWxELENBQWY7O0FBRUE7QUFDQSxhQUFLeUgsWUFBTCxHQUFvQixJQUFJbkUsTUFBSixDQUFXLENBQVgsRUFBYyxDQUFkLENBQXBCO0FBQ0Q7QUFDRjs7QUFFRDtBQWhCQSxTQWlCSzs7QUFFSDtBQUNBLFlBQUksS0FBSzZDLE1BQUwsS0FBZ0IsQ0FBcEIsRUFBdUI7O0FBRXJCO0FBQ0EsZUFBS3FCLE9BQUwsQ0FBYVQsU0FBYjtBQUNEO0FBQ0Y7QUFDRixHQTFDRDs7QUE0Q0E7QUFDQSxXQUFTMUQsSUFBVCxDQUFlK0UsS0FBZixFQUFzQmhPLElBQXRCLEVBQTZCO0FBQzNCLFNBQUt5TCxRQUFMLEdBQWdCdUMsS0FBaEI7QUFDQSxTQUFLQyxPQUFMLENBQWNqTyxJQUFkO0FBQ0Q7O0FBRURpSixPQUFLcEYsU0FBTCxDQUFlb0ssT0FBZixHQUF5QixVQUFVak8sSUFBVixFQUFnQjtBQUN2QyxTQUFLQSxJQUFMLEdBQVlBLFFBQVEsQ0FBcEI7QUFDQSxTQUFLNkwsS0FBTCxHQUFhN0wsT0FBTyxDQUFQLEdBQVcsTUFBWCxHQUFvQixNQUFqQztBQUNELEdBSEQ7O0FBTUY7O0FBRUE7QUFDQTtBQUNBLE1BQUksQ0FBQ3FFLE1BQU1SLFNBQU4sQ0FBZ0JpSCxPQUFyQixFQUE4QjtBQUM1QnpHLFVBQU1SLFNBQU4sQ0FBZ0JpSCxPQUFoQixHQUEwQixVQUFTb0QsYUFBVCxFQUF3QkMsU0FBeEIsRUFBbUM7QUFDM0QsVUFBSUMsQ0FBSjtBQUNBLFVBQUksUUFBUSxJQUFaLEVBQWtCO0FBQ2hCLGNBQU0sSUFBSUMsU0FBSixDQUFjLHNDQUFkLENBQU47QUFDRDtBQUNELFVBQUlDLElBQUlwUCxPQUFPLElBQVAsQ0FBUjtBQUNBLFVBQUlxUCxNQUFNRCxFQUFFek0sTUFBRixLQUFhLENBQXZCO0FBQ0EsVUFBSTBNLFFBQVEsQ0FBWixFQUFlO0FBQ2IsZUFBTyxDQUFDLENBQVI7QUFDRDtBQUNELFVBQUkzQyxJQUFJLENBQUN1QyxTQUFELElBQWMsQ0FBdEI7QUFDQSxVQUFJMUwsS0FBSytMLEdBQUwsQ0FBUzVDLENBQVQsTUFBZ0I2QyxRQUFwQixFQUE4QjtBQUM1QjdDLFlBQUksQ0FBSjtBQUNEO0FBQ0QsVUFBSUEsS0FBSzJDLEdBQVQsRUFBYztBQUNaLGVBQU8sQ0FBQyxDQUFSO0FBQ0Q7QUFDREgsVUFBSTNMLEtBQUtDLEdBQUwsQ0FBU2tKLEtBQUssQ0FBTCxHQUFTQSxDQUFULEdBQWEyQyxNQUFNOUwsS0FBSytMLEdBQUwsQ0FBUzVDLENBQVQsQ0FBNUIsRUFBeUMsQ0FBekMsQ0FBSjtBQUNBLGFBQU93QyxJQUFJRyxHQUFYLEVBQWdCO0FBQ2QsWUFBSUgsS0FBS0UsQ0FBTCxJQUFVQSxFQUFFRixDQUFGLE1BQVNGLGFBQXZCLEVBQXNDO0FBQ3BDLGlCQUFPRSxDQUFQO0FBQ0Q7QUFDREE7QUFDRDtBQUNELGFBQU8sQ0FBQyxDQUFSO0FBQ0QsS0F6QkQ7QUEwQkQ7O0FBRUQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVDLGVBQVc7QUFDVixRQUFJTSxXQUFXLENBQWY7QUFDQSxRQUFJQyxVQUFVLENBQUMsSUFBRCxFQUFPLEtBQVAsRUFBYyxRQUFkLEVBQXdCLEdBQXhCLENBQWQ7QUFDQSxTQUFJLElBQUloSixJQUFJLENBQVosRUFBZUEsSUFBSWdKLFFBQVE5TSxNQUFaLElBQXNCLENBQUN0RCxPQUFPMk4scUJBQTdDLEVBQW9FLEVBQUV2RyxDQUF0RSxFQUF5RTtBQUN2RXBILGFBQU8yTixxQkFBUCxHQUErQjNOLE9BQU9vUSxRQUFRaEosQ0FBUixJQUFXLHVCQUFsQixDQUEvQjtBQUNBcEgsYUFBTzZOLG9CQUFQLEdBQThCN04sT0FBT29RLFFBQVFoSixDQUFSLElBQVcsc0JBQWxCLEtBQ3pCcEgsT0FBT29RLFFBQVFoSixDQUFSLElBQVcsNkJBQWxCLENBREw7QUFFRDs7QUFFRCxRQUFJLENBQUNwSCxPQUFPMk4scUJBQVosRUFDRTNOLE9BQU8yTixxQkFBUCxHQUErQixVQUFTMEMsUUFBVCxFQUFtQnpMLE9BQW5CLEVBQTRCO0FBQ3pELFVBQUkwTCxXQUFXLElBQUlDLElBQUosR0FBV0MsT0FBWCxFQUFmO0FBQ0EsVUFBSUMsYUFBYXZNLEtBQUtDLEdBQUwsQ0FBUyxDQUFULEVBQVksTUFBTW1NLFdBQVdILFFBQWpCLENBQVosQ0FBakI7QUFDQSxVQUFJTyxLQUFLMVEsT0FBTytELFVBQVAsQ0FBa0IsWUFBVztBQUFFc00saUJBQVNDLFdBQVdHLFVBQXBCO0FBQWtDLE9BQWpFLEVBQ1BBLFVBRE8sQ0FBVDtBQUVBTixpQkFBV0csV0FBV0csVUFBdEI7QUFDQSxhQUFPQyxFQUFQO0FBQ0QsS0FQRDs7QUFTRixRQUFJLENBQUMxUSxPQUFPNk4sb0JBQVosRUFDRTdOLE9BQU82TixvQkFBUCxHQUE4QixVQUFTNkMsRUFBVCxFQUFhO0FBQ3pDQyxtQkFBYUQsRUFBYjtBQUNELEtBRkQ7QUFHSCxHQXZCQSxHQUFEOztBQTBCQTs7Ozs7QUFLQSxTQUFPOztBQUVMO0FBQ0FFLGlCQUFhLFVBQVdyRyxPQUFYLEVBQXFCO0FBQ2hDLFVBQUl4SCxJQUFJLElBQUlrSCxRQUFKLEVBQVI7QUFDQWxILFFBQUV1SCxJQUFGLENBQVFDLE9BQVI7QUFDQSxhQUFPeEgsQ0FBUDtBQUNELEtBUEk7O0FBU0w7QUFDQThOLGtCQUFjLFVBQVd0TixJQUFYLEVBQWlCQyxLQUFqQixFQUF5Qjs7QUFFckM7QUFDQSxVQUFLM0MsU0FBUzZCLEtBQVQsQ0FBZWEsSUFBZixDQUFMLEVBQTRCLE1BQU0sSUFBSXVOLEtBQUosQ0FBVyxxQkFBcUJ2TixJQUFyQixHQUE0QiwrQ0FBdkMsQ0FBTjs7QUFFNUI7QUFDQTFDLGVBQVM2QixLQUFULENBQWVhLElBQWYsSUFBdUIsSUFBdkI7O0FBRUE7QUFDQXBELFNBQUdvRixZQUFILENBQWlCMUUsUUFBakIsRUFBMkIyQyxNQUFNK0csT0FBakM7QUFDQXBLLFNBQUdvRixZQUFILENBQWlCMEUsU0FBUzNFLFNBQTFCLEVBQXFDOUIsTUFBTXdCLEtBQTNDO0FBQ0E3RSxTQUFHb0YsWUFBSCxDQUFpQnFILFNBQVN0SCxTQUExQixFQUFxQzlCLE1BQU11TixlQUEzQztBQUNBNVEsU0FBR29GLFlBQUgsQ0FBaUJpQixPQUFPbEIsU0FBeEIsRUFBbUM5QixNQUFNd04sWUFBekM7O0FBRUE7QUFDQTFRLGNBQVFpRCxJQUFSLElBQWdCQyxNQUFNeU4sUUFBTixDQUFlM1EsT0FBL0I7QUFDQUQsY0FBUWtELElBQVIsSUFBZ0JDLE1BQU15TixRQUFOLENBQWU1USxPQUEvQjtBQUNBRyxtQkFBYStDLElBQWIsSUFBcUJDLE1BQU15TixRQUFOLENBQWV6USxZQUFwQztBQUNEO0FBNUJJLEdBQVA7QUErQkQsQ0E3OUJvQixDQTY5QmxCLElBNzlCa0IsRUE2OUJaLEtBQUtQLFFBNzlCTyxDQUFyQjtBQ0ZBRixlQUFlOFEsWUFBZixDQUE2QixXQUE3QixFQUEwQztBQUN4Q3RHLFdBQVMsRUFEK0I7QUFFeEN2RixTQUFPLEVBRmlDO0FBR3hDK0wsbUJBQWlCO0FBQ2ZHLGlCQUFhLFlBQVU7QUFDckIsV0FBSzFELE1BQUwsR0FBYyxDQUFkO0FBQ0EsVUFBSStCLFFBQVFyTCxLQUFLb0UsS0FBTCxDQUFZLEtBQUs0RSxRQUFMLENBQWM5RixDQUExQixDQUFaO0FBQ0EsVUFBSW9JLFFBQVF0TCxLQUFLb0UsS0FBTCxDQUFZLEtBQUs0RSxRQUFMLENBQWM3RixDQUExQixDQUFaO0FBQ0EsV0FBS2lHLEtBQUwsR0FBZSxLQUFLN0csUUFBTCxDQUFjNEQsV0FBZCxLQUE4QixJQUFoQyxHQUF5QyxLQUFLNUQsUUFBTCxDQUFjeUQsU0FBZCxDQUF3QixLQUFLekQsUUFBTCxDQUFjNEQsV0FBdEMsRUFBbURuQixTQUFuRCxHQUErRHFHLEtBQS9ELEVBQXNFQyxLQUF0RSxDQUF6QyxHQUF3SCxLQUFLL0ksUUFBTCxDQUFjOUMsUUFBZCxDQUF1QjdCLGFBQTVKO0FBQ0Q7QUFOYyxHQUh1QjtBQVd4Q2tQLGdCQUFjO0FBQ1pHLGlCQUFhLFVBQVc3SixNQUFYLEVBQW9COztBQUUvQixVQUFJdkUsQ0FBSjtBQUFBLFVBQU9xRyxDQUFQO0FBQUEsVUFBVXBHLENBQVY7QUFBQSxVQUFhQyxDQUFiO0FBQUEsVUFBZ0JDLENBQWhCO0FBQUEsVUFBbUJ3RixJQUFJLEtBQUsxQixPQUFMLENBQWFhLFlBQWIsQ0FBMkIsQ0FBM0IsRUFBOEIsQ0FBOUIsRUFBaUMsS0FBS3BCLFFBQUwsQ0FBY0ssTUFBZCxDQUFxQi9GLEtBQXRELEVBQTZELEtBQUswRixRQUFMLENBQWNLLE1BQWQsQ0FBcUJoRyxNQUFsRixFQUEyRnVDLElBQWxIOztBQUVBLFdBQUtOLElBQUksQ0FBVCxFQUFZQSxJQUFJLEtBQUsrRCxNQUFMLENBQVkvRixLQUE1QixFQUFtQ2dDLEdBQW5DLEVBQXdDO0FBQ3RDLGFBQUtxRyxJQUFJLENBQVQsRUFBWUEsSUFBSSxLQUFLdEMsTUFBTCxDQUFZaEcsTUFBNUIsRUFBb0NzSSxHQUFwQyxFQUF5QztBQUN2Q3BHLGNBQUkwRixFQUFFLENBQUUsS0FBS2pDLFFBQUwsQ0FBY0ssTUFBZCxDQUFxQi9GLEtBQXJCLEdBQTZCcUksQ0FBOUIsR0FBbUNyRyxDQUFwQyxJQUF5QyxDQUEzQyxDQUFKO0FBQ0FFLGNBQUl5RixFQUFFLENBQUUsS0FBS2pDLFFBQUwsQ0FBY0ssTUFBZCxDQUFxQi9GLEtBQXJCLEdBQTZCcUksQ0FBOUIsR0FBbUNyRyxDQUFwQyxJQUF5QyxDQUF6QyxHQUE2QyxDQUEvQyxDQUFKO0FBQ0FHLGNBQUl3RixFQUFFLENBQUUsS0FBS2pDLFFBQUwsQ0FBY0ssTUFBZCxDQUFxQi9GLEtBQXJCLEdBQTZCcUksQ0FBOUIsR0FBbUNyRyxDQUFwQyxJQUF5QyxDQUF6QyxHQUE2QyxDQUEvQyxDQUFKO0FBQ0F1RSxpQkFBT3ZFLENBQVAsRUFBVXFHLENBQVYsSUFBZSxVQUFVcEcsQ0FBVixHQUFjLElBQWQsR0FBcUJDLENBQXJCLEdBQXlCLElBQXpCLEdBQWdDQyxDQUFoQyxHQUFvQyxNQUFuRDtBQUNEO0FBQ0Y7QUFDRjtBQWJXLEdBWDBCO0FBMEJ4QzlDLFVBQVEsRUExQmdDO0FBMkJ4QzZRLFlBQVU7QUFDUjNRLGFBQVM7QUFDUGlELFlBQU0sSUFEQztBQUVQQyxhQUFPO0FBRkEsS0FERDtBQUtSbkQsYUFBUyxDQUFDLGFBQUQsRUFBZ0IsYUFBaEIsQ0FMRDtBQU1SRyxrQkFBYztBQU5OO0FBM0I4QixDQUExQyIsImZpbGUiOiJzbGlkZS1wYXJ0aWNsZXMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJcclxuXHJcbnZhciBzbGlkZVBhcnRpY2xlcyA9IChmdW5jdGlvbiAod2luZG93LCBkb2N1bWVudCwgdW5kZWZpbmVkKSB7XHJcblxyXG4gICAgXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG4gICAgdmFyIGZuLCBmaWx0ZXIsIHByb2NlZWQsIGZpbHRlcnMsIG5leHRNYXRyaXhNb2RlLCBtYXRyaXhNZXRob2QsIG9vID0ge30sIGdldFByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mLFxyXG4gICAgXHJcbiAgICAvLyBEZWZhdWx0cyBzZXR0aW5ncy5cclxuICAgIGRlZmF1bHRzID0ge1xyXG4gICAgICBoZWlnaHQ6IDUwMCxcclxuICAgICAgd2lkdGg6IDUwMCxcclxuICAgICAgYmFja2dyb3VuZDogJyNmZmYnLFxyXG4gICAgICB0aHJlc2hvbGROQjogWzEyOF0sXHJcbiAgICAgIHRhcmdldEVsZW1lbnQ6ICdkcC1jYW52YXMnLFxyXG4gICAgICBpbnB1dEZpbGVJRDogJ2RwLWZpbGVpbnB1dCcsXHJcbiAgICAgIHRodW1kbmFpbHNJRDogJ2RwLXRodW1iJyxcclxuICAgICAgcGFuZWxJRDogJ2RwLXBhbmVsLXNldHRpbmdzJyxcclxuICAgICAgdGh1bWJXaWR0aDogMTAwLFxyXG4gICAgICB0aHVtYkhlaWdodDogMTAwLFxyXG4gICAgICB0ZXh0OidIZWxsbyBXb3JsZCAhJyxcclxuICAgICAgbWFzczogMTAwLFxyXG4gICAgICBhbnRpTWFzczogLTUwMCxcclxuICAgICAgaG92ZXJNYXNzOiA1MDAwLFxyXG4gICAgICBkZW5zaXR5OiAxNTAwLFxyXG4gICAgICBwYXJ0aWNsZVNpemU6IDEsXHJcbiAgICAgIHBhcnRpY2xlQ29sb3I6ICcjMDAwJyxcclxuICAgICAgdGV4dENvbG9yOiAnI2ZmZicsXHJcbiAgICAgIGZvbnQ6ICdBcmlhbCcsXHJcbiAgICAgIGZvbnRTaXplOiA0MCxcclxuICAgICAgaW5pdGlhbFZlbG9jaXR5OiAzLFxyXG4gICAgICBtYXNzWDogODgwLFxyXG4gICAgICBtYXNzWTogMzcwLFxyXG4gICAgICBkZWxheTogNzAwLFxyXG4gICAgICBpbml0aWFsTW9kZTogJ21vZGVGb3JtJyxcclxuICAgICAgZHJhdzogZmFsc2UsXHJcbiAgICAgIHN0b3A6IGZhbHNlLFxyXG4gICAgICBzd2l0Y2hNb2RlQ2FsbGJhY2s6IG51bGwsXHJcbiAgICAgIG5leHRNYXRyaXhNb2RlOiAnbGliZXJhdGlvblBhcnRzJyxcclxuICAgICAgbW9kZXM6IHtcclxuICAgICAgICBtb2RlRm9ybTogdHJ1ZSxcclxuICAgICAgfSBcclxuICAgIH07XHJcblxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQWxsIGltYWdlIGZpbHRlcnMgZnVuY3Rpb24uXHJcbiAgICAgKiBcclxuICAgICAqL1xyXG4gICAgZmlsdGVyID0ge1xyXG4gICAgICAvLyBUdXJuIGNvbG9yZWQgcGljdHVyZSBvbiBibGFjayBhbmQgd2hpdGUuIFVzZWQgZm9yIG1vZGVGb3JtLlxyXG4gICAgICBibGFja0FuZFdoaXRlOiBmdW5jdGlvbiAoIHBpeGVscywgdGhyZXNob2xkICkge1xyXG4gICAgICAgIGlmICggIXBpeGVscyApIHJldHVybiBwaXhlbHM7XHJcbiAgICAgICAgdmFyIGksIHIsIGcsIGIsIHYsIGQgPSBwaXhlbHMuZGF0YTtcclxuICAgICAgICBmb3IgKCBpID0gMDsgaSA8IGQubGVuZ3RoOyBpKz00ICkge1xyXG4gICAgICAgICAgciA9IGRbaV07XHJcbiAgICAgICAgICBnID0gZFtpKzFdO1xyXG4gICAgICAgICAgYiA9IGRbaSsyXTtcclxuICAgICAgICAgIHYgPSAoMC4yMTI2KnIgKyAwLjcxNTIqZyArIDAuMDcyMipiID49IHRocmVzaG9sZCkgPyAyNTUgOiAwO1xyXG4gICAgICAgICAgZFtpXSA9IGRbaSsxXSA9IGRbaSsyXSA9IHZcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHBpeGVscztcclxuICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEVhY2ggbW9kZXMgcmVnaXN0ZXJlZCBuZWVkIGFuIGVudHJ5IG9uIGZpbHRlcnMgb2JqZWN0LlxyXG4gICAgICogSXQgcGVybWl0IHRvIGNhbGwgY29ycmVzcG9uZGluZyBmaWx0ZXIgZnVuY3Rpb24gZm9yIGVhY2ggbW9kZSByZWdpc3RlcmVkLlxyXG4gICAgICogVGhlIGNvcnJlc3BvbmRpbmcgZmlsdGVyIGZvbmN0aW9uIGlzIGNhbGxlZCB3aGVuIG1hdHJpeCBhcmUgYnVpbHQuXHJcbiAgICAgKiBcclxuICAgICAqIEJ5IGRlZmF1bHQsIHRoZXJlIGlzIG9ubHkgb25lIG1vZGUgOiBtb2RlRm9ybS5cclxuICAgICAqIElmIGEgbW9kZSBkb24ndCBuZWVkIGZpbHRlciwgc2V0IHt9IHRvIHRoZSBtb2RlIG5hbWUgZW50cnkuXHJcbiAgICAgKiBcclxuICAgICAqIG5hbWUgOiBuYW1lIG9mIHRoZSBmaWx0ZXIgZnVuY3Rpb24gYXR0YWNoIHRvIGZpbHRlciBvYmplY3QuXHJcbiAgICAgKiBwYXJhbSA6IGtleSB0YXJnZXR0aW5nIHRoZSBzZXR0aW5ncyBwYXJhbWV0ZXIsIHBhc3NpbmcgYXMgYXJndW1lbnQgd2hlbiBmaWx0ZXIgZnVuY3Rpb24gaXMgY2FsbGVkLiBNdXN0IGJlIGFuIEFycmF5IGluIHNldHRpbmdzLlxyXG4gICAgICogXHJcbiAgICAqLyBcclxuICAgIGZpbHRlcnMgPSB7XHJcbiAgICAgIG1vZGVGb3JtOiB7XHJcbiAgICAgICAgbmFtZTogJ2JsYWNrQW5kV2hpdGUnLFxyXG4gICAgICAgIHBhcmFtOiAndGhyZXNob2xkTkInXHJcbiAgICAgIH1cclxuICAgIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIEZvciBlYWNoIG1vZGUsIHJlZ2lzdGVyIGFsbCBtZXRob2RzIHRvIGFwcGx5IGZvciBlYWNoZSBQYXJ0aWNsZXMgaW5zdGFuY2UgaW4gdGhlIGxvb3AuXHJcbiAgICogTXVzdCBiZSBhIFBhcnRpY2xlcyBtZXRob2QuXHJcbiAgICogLS0tLS0+IHNlZSBEaWFwUGFydC5wcm90b3R5cGUucGFydFByb2NlZWRcclxuICAgKiBcclxuICAgKi9cclxuICAgIHByb2NlZWQgPSB7XHJcbiAgICAgIG1vZGVGb3JtOiBbJ3NvdW1pc0NoYW1wJywgJ3NvdW1pc0Zvcm0nXVxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBGb3IgZWFjaCBtb2RlLCByZWdpc3RlciB0aGUgTWF0cml4IG1ldGhvZCBjYWxsZWQgdG8gY3JlYXRlIHRoZSBtYXRyaXggKDIgZGltZW50aW9uYWwgYXJyYXkpLlxyXG4gICAgbWF0cml4TWV0aG9kID0ge1xyXG4gICAgICBtb2RlRm9ybTogJ3ZhbHVlTWF0cml4J1xyXG4gICAgfTtcclxuXHJcblxyXG4gICAgbmV4dE1hdHJpeE1vZGUgPSB7XHJcbiAgICAgIC8vIE1ha2UgcGFydGljbGVzIGZyZWUgZm9yIHNob3J0IGRlbGF5LlxyXG4gICAgICBsaWJlcmF0aW9uUGFydHM6IGZ1bmN0aW9uICggZGVsYXkgKSB7XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgIHZhciBkID0gZGVsYXkgfHwgdGhpcy5zZXR0aW5ncy5kZWxheTtcclxuXHJcbiAgICAgICAgLy8gTWFrZSBmcmVlIHBhcnRzIGZyb20gY3VycmVudCBmb3JtIHZhbHVlLlxyXG4gICAgICAgIHRoaXMuY2xlYXJQYXJ0cygpO1xyXG5cclxuICAgICAgICAvLyBQYXJ0aWNsZXMgYXJlIGZyZWUgZnJvbSBtYXRyaXggb2YgdHlwZSAndmFsdWUnLlxyXG4gICAgICAgIHRoaXMubGliZXJhdGlvbiA9ICF0aGlzLmxpYmVyYXRpb247XHJcblxyXG4gICAgICAgICAgLy8gTWFzcyBzdHJlbmd0aCBpcyBpbnZlcnRlZC5cclxuICAgICAgICAgIHRoaXMubWFzc0FjdGl2ZSA9IHRoaXMuc2V0dGluZ3MuYW50aU1hc3M7XHJcblxyXG4gICAgICAgICAgLy8gV2hlbiBkZWxheSdzIG92ZXIsIHdoZSByZXR1cm4gdG8gbm9ybWFsIG1hc3Mgc3RyZW5ndGggYW5kIHBhcnRpY2xlcyBiZWhhdmlvci5cclxuICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgc2VsZi5tYXNzQWN0aXZlID0gc2VsZi5zZXR0aW5ncy5tYXNzO1xyXG4gICAgICAgICAgICBzZWxmLmxpYmVyYXRpb24gPSAhc2VsZi5saWJlcmF0aW9uO1xyXG4gICAgICAgICAgfSwgZClcclxuICAgICAgfSxcclxuICAgIH07XHJcblxyXG4gICAgLy8gVXRpbGl0eSBmdW5jdGlvbnMuXHJcbiAgICBmbiA9IHtcclxuICAgICAgLy8gUmV0dXJuIHZpZXdwb3J0IHNpemUuXHJcbiAgICAgIGdldFZpZXdwb3J0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgdzogTWF0aC5tYXgoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoLCB3aW5kb3cuaW5uZXJXaWR0aCB8fCAwKSxcclxuICAgICAgICAgIGg6IE1hdGgubWF4KGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRIZWlnaHQsIHdpbmRvdy5pbm5lckhlaWdodCB8fCAwKVxyXG4gICAgICAgIH07XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBBcHBlbmQgZWxlbWVudCBpbiB0YXJnZXQuXHJcbiAgICAgIGFwcGVuZDogZnVuY3Rpb24gKCB0YXJnZXQsIGVsZW1lbnQgKSB7XHJcbiAgICAgICAgaWYgKCB0eXBlb2YgdGFyZ2V0ID09PSAnc3RyaW5nJyApIHtcclxuICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCB0YXJnZXQgKS5hcHBlbmRDaGlsZCggZWxlbWVudCApO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgIHRhcmdldC5hcHBlbmRDaGlsZCggZWxlbWVudCApO1xyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIFRlc3QgaWYgdGFyZ2V0IGlzIHBsYWluIG9iamVjdC4gVGhhbmsgeW91IGpRdWVyeSAzKyAhXHJcbiAgICAgIGlzUGxhaW5PYmplY3Q6IGZ1bmN0aW9uICggdGFyZ2V0ICkge1xyXG4gICAgICAgIHZhciBwcm90bywgQ3RvcjtcclxuICAgICAgICAvLyBEZXRlY3Qgb2J2aW91cyBuZWdhdGl2ZXNcclxuICAgICAgICAvLyBVc2UgdG9TdHJpbmcgaW5zdGVhZCBvZiBqUXVlcnkudHlwZSB0byBjYXRjaCBob3N0IG9iamVjdHNcclxuICAgICAgICBpZiAoICF0YXJnZXQgfHwgb28udG9TdHJpbmcuY2FsbCggdGFyZ2V0ICkgIT09IFwiW29iamVjdCBPYmplY3RdXCIgKSB7XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHByb3RvID0gZ2V0UHJvdG8oIHRhcmdldCApO1xyXG4gICAgICAgIC8vIE9iamVjdHMgd2l0aCBubyBwcm90b3R5cGUgKGUuZy4sIGBPYmplY3QuY3JlYXRlKCBudWxsIClgKSBhcmUgcGxhaW5cclxuICAgICAgICBpZiAoICFwcm90byApIHtcclxuICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBPYmplY3RzIHdpdGggcHJvdG90eXBlIGFyZSBwbGFpbiBpZmYgdGhleSB3ZXJlIGNvbnN0cnVjdGVkIGJ5IGEgZ2xvYmFsIE9iamVjdCBmdW5jdGlvblxyXG4gICAgICAgIEN0b3IgPSBvby5oYXNPd25Qcm9wZXJ0eS5jYWxsKCBwcm90bywgXCJjb25zdHJ1Y3RvclwiICkgJiYgcHJvdG8uY29uc3RydWN0b3I7XHJcbiAgICAgICAgcmV0dXJuIHR5cGVvZiBDdG9yID09PSBcImZ1bmN0aW9uXCIgJiYgb28uaGFzT3duUHJvcGVydHkuY2FsbCggQ3Rvci5wcm90b3R5cGUsIFwiaXNQcm90b3R5cGVPZlwiKTtcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIERlZXBseSBleHRlbmQgYSBvYmplY3Qgd2l0aCBiIG9iamVjdCBwcm9wZXJ0aWVzLlxyXG4gICAgICBzaW1wbGVFeHRlbmQ6IGZ1bmN0aW9uICggYSwgYiApIHtcclxuICAgICAgICB2YXIgY2xvbmUsIHNyYywgY29weSwgaXNBbkFycmF5ID0gZmFsc2U7IFxyXG4gICAgICAgIGZvciggdmFyIGtleSBpbiBiICkge1xyXG5cclxuICAgICAgICAgIHNyYyA9IGFbIGtleSBdO1xyXG5cdFx0XHRcdCAgY29weSA9IGJbIGtleSBdO1xyXG5cclxuICAgICAgICAgIC8vQXZvaWQgaW5maW5pdGUgbG9vcC5cclxuICAgICAgICAgIGlmICggYSA9PT0gY29weSApIHtcclxuXHRcdFx0XHRcdCAgY29udGludWU7XHJcblx0XHRcdFx0ICB9XHJcblxyXG4gICAgICAgICAgaWYoIGIuaGFzT3duUHJvcGVydHkoIGtleSApICkge1xyXG4gICAgICAgICAgICAvLyBJZiBwcm9wZXJ0aWUgaXMgQXJyYXkgb3IgT2JqZWN0LlxyXG4gICAgICAgICAgICBpZiggY29weSAmJiAoIGZuLmlzUGxhaW5PYmplY3QoIGNvcHkgKSB8fCAoaXNBbkFycmF5ID0gQXJyYXkuaXNBcnJheS5jYWxsKCBjb3B5ICkpKSkge1xyXG4gICAgICAgICAgICAgIGlmICggaXNBbkFycmF5ICkge1xyXG4gICAgICAgICAgICAgICAgaXNBbkFycmF5ID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBjbG9uZSA9ICggc3JjICYmIHNyYy5pc0FycmF5ICkgPyBzcmMgOiBbXTtcclxuICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY2xvbmUgPSAoIHNyYyAmJiBmbi5pc1BsYWluT2JqZWN0KCBzcmMgKSApID8gc3JjIDoge307XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIC8vIENyZWF0ZSBuZXcgQXJyYXkgb3IgT2JqZWN0LCBuZXZlciByZWZlcmVuY2UgaXQuXHJcbiAgICAgICAgICAgICAgYVsga2V5IF0gPSBmbi5zaW1wbGVFeHRlbmQoIGNsb25lLCBjb3B5ICk7XHJcblxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgYVsga2V5IF0gPSBjb3B5O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBhO1xyXG4gICAgICB9LFxyXG5cclxuICAgICAgbG9hZEltYWdlOiBmdW5jdGlvbiAoIHNyYywgc2VsZiwgdGh1bWIgKSB7XHJcblxyXG4gICAgICAgICAgICB2YXIgaW1nID0gbmV3IEltYWdlKCk7XHJcbiAgICAgICAgICAgIC8vIFdoZW4gaW1hZ2UgaXMgbG9hZGVkLlxyXG4gICAgICAgICAgICBpbWcub25sb2FkID0gZnVuY3Rpb24oKXtcclxuXHJcbiAgICAgICAgICAgICAgLy8gQ3JlYXRlIHNsaWRlLCB3aXRoIEltYWdlIGlucHV0LlxyXG4gICAgICAgICAgICAgIHZhciBtID0gc2VsZi5jcmVhdGVTbGlkZSggdGhpcyApO1xyXG5cclxuICAgICAgICAgICAgICBpZiAoICF0aHVtYiApIHJldHVybjtcclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAvLyBDcmVhdGUgYW5kIHN0b3JlIHRodW1iLlxyXG4gICAgICAgICAgICAgIG0ucmVuZGVyVGh1bWJuYWlscyggc2VsZi5zZXR0aW5ncy50aHVtZG5haWxzSUQsIGZhbHNlICk7XHJcblxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAvLyBMb2FkIGltZy5cclxuICAgICAgICAgICAgaW1nLnNyYyA9IHNyYztcclxuICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgLy8gTWF0cml4IGNsYXNzIG9iamVjdC5cclxuICBmdW5jdGlvbiBNYXRyaXggKCBpbnN0YW5jZSwgaW5wdXQsIGN1c3RvbVNpemUgKSB7XHJcbiAgICB0aGlzLmluc3RhbmNlID0gaW5zdGFuY2U7XHJcbiAgICB0aGlzLnR5cGUgPSAoIHR5cGVvZiBpbnB1dCAhPT0gJ3N0cmluZycgKSA/ICdwaWN0dXJlJyA6ICd0ZXh0JztcclxuICAgIHRoaXMucGljdHVyZSA9IGlucHV0O1xyXG4gICAgdGhpcy5jYW52YXMgPSB0aGlzLmluc3RhbmNlLmdldENhbnZhcyggY3VzdG9tU2l6ZSApO1xyXG4gICAgdGhpcy5jb250ZXh0ID0gdGhpcy5pbnN0YW5jZS5nZXRDb250ZXh0MkQoIHRoaXMuY2FudmFzICk7XHJcbiAgICB0aGlzLnNpemUgPSAoIHR5cGVvZiBpbnB1dCAhPT0gJ3N0cmluZycgKSA/IHRoaXMuaW5zdGFuY2UuZ2V0SW1hZ2VTaXplKCBpbnB1dCwgY3VzdG9tU2l6ZSApIDoge3g6MCwgeTowLCB3OjAsIGg6MH07XHJcbiAgICB0aGlzLm1hdHJpeCA9IHRoaXMuYnVpbGRBbGxNYXRyaXgoKTtcclxuICB9XHJcblxyXG4gIE1hdHJpeC5wcm90b3R5cGUgPSB7XHJcblxyXG4gICAgLy8gQ2xlYXIgbWF0cml4J3MgY2FudmFzLlxyXG4gICAgY2xlYXI6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgdGhpcy5jb250ZXh0LmNsZWFyUmVjdCgwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KTtcclxuICAgIH0sXHJcblxyXG4gICAgLy8gUmV0dXJuIG1hdHJpeCdzIGNhbnZhJ3MgaW1hZ2UgZGF0YS5cclxuICAgIGdldFBpeGVsczogZnVuY3Rpb24gKCkge1xyXG5cclxuICAgICAgdGhpcy5jbGVhcigpO1xyXG5cclxuICAgICAgc3dpdGNoICggdGhpcy50eXBlICkge1xyXG5cclxuICAgICAgICBjYXNlICdwaWN0dXJlJzpcclxuICAgICAgICAgIHRoaXMuY29udGV4dC5kcmF3SW1hZ2UoIHRoaXMucGljdHVyZSwgdGhpcy5zaXplLngsIHRoaXMuc2l6ZS55LCB0aGlzLnNpemUudywgdGhpcy5zaXplLmggKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICBjYXNlICd0ZXh0JzpcclxuICAgICAgICAgIHRoaXMuc2V0VGV4dCgpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmKCAhdGhpcy5zaXplLncgJiYgIXRoaXMuc2l6ZS5oICkgcmV0dXJuIGZhbHNlO1xyXG5cclxuICAgICAgcmV0dXJuIHRoaXMuY29udGV4dC5nZXRJbWFnZURhdGEoIHRoaXMuc2l6ZS54LCB0aGlzLnNpemUueSwgdGhpcy5zaXplLncsIHRoaXMuc2l6ZS5oICk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIERyYXcgdGV4dCBpbiBjYW52YXMuXHJcbiAgICBzZXRUZXh0OiBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgICAvLyBDbGVhciB1c2VsZXNzIHNwYWNlcyBpbiBzdHJpbmcgdG8gZHJhdy5cclxuICAgICAgdmFyIGNsZWFyZWQgPSB0aGlzLnBpY3R1cmUudHJpbSgpO1xyXG5cclxuICAgICAgLy8gSWYgc3RyaW5nIGVtcHR5LCBzZXQgc2l6ZSB0byAwIHRvIGF2b2lkIG1hdHJpeCBjYWxjdWxhdGlvbiwgYW5kIGNsZWFyIG1hdHJpeC5cclxuICAgICAgaWYgKGNsZWFyZWQgPT09IFwiXCIpIHtcclxuICAgICAgICB0aGlzLnNpemUueCA9IDA7XHJcbiAgICAgICAgdGhpcy5zaXplLnkgPSAwO1xyXG4gICAgICAgIHRoaXMuc2l6ZS53ID0gMDtcclxuICAgICAgICB0aGlzLnNpemUuaCA9IDA7XHJcbiAgICAgICAgdGhpcy5jbGVhck1hdHJpeCgpO1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdmFyIGksIHcgPSAwLCB4ID0gMjAsIHkgPSA4MCxcclxuICAgICAgICBsaW5lcyA9IHRoaXMucGljdHVyZS5zcGxpdChcIlxcblwiKSwgLy8gU3BsaXQgdGV4dCBpbiBhcnJheSBmb3IgZWFjaCBlbmQgb2YgbGluZS5cclxuICAgICAgICBmb250U2l6ZSA9IHRoaXMuaW5zdGFuY2Uuc2V0dGluZ3MuZm9udFNpemU7XHJcblxyXG4gICAgICB0aGlzLmNvbnRleHQuZm9udCA9IGZvbnRTaXplICsgXCJweCBcIiArIHRoaXMuaW5zdGFuY2Uuc2V0dGluZ3MuZm9udDtcclxuICAgICAgdGhpcy5jb250ZXh0LmZpbGxTdHlsZSA9IHRoaXMuaW5zdGFuY2Uuc2V0dGluZ3MudGV4dENvbG9yO1xyXG4gICAgICB0aGlzLmNvbnRleHQudGV4dEFsaWduID0gXCJsZWZ0XCI7XHJcblxyXG4gICAgICAvLyBEcmF3IGxpbmUgYnkgbGluZS5cclxuICAgICAgZm9yIChpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdGhpcy5jb250ZXh0LmZpbGxUZXh0KCBsaW5lc1tpXSwgeCwgeSArIGkqZm9udFNpemUgKTtcclxuICAgICAgICB3ID0gTWF0aC5tYXgoIHcsIE1hdGguZmxvb3IodGhpcy5jb250ZXh0Lm1lYXN1cmVUZXh0KCBsaW5lc1tpXSApLndpZHRoKSApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBTZXQgc2l6ZSBvYmplY3QsIHRvIGNhbGN1bGF0ZSB0YXJnZXRlZCB6b25lIG9uIHRoZSBtYXRyaXguXHJcbiAgICAgIHRoaXMuc2l6ZS54ID0gTWF0aC5tYXgoIHgsICB0aGlzLnNpemUueCApO1xyXG4gICAgICB0aGlzLnNpemUueSA9IE1hdGgubWF4KCAoeSAtIGZvbnRTaXplKSwgdGhpcy5zaXplLnkgKTtcclxuICAgICAgdGhpcy5zaXplLncgPSBNYXRoLm1heCggKHcgKyBmb250U2l6ZSksIHRoaXMuc2l6ZS53ICk7XHJcbiAgICAgIHRoaXMuc2l6ZS5oID0gTWF0aC5tYXgoIChmb250U2l6ZSAqIGkgKyBmb250U2l6ZSksIHRoaXMuc2l6ZS5oICk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIEFwcGx5IGZpbHRlcidzIG5hbWUgd2l0aCBhcmdBcnJheS5cclxuICAgIGFwcGx5RmlsdGVyOiBmdW5jdGlvbiAoIG5hbWUsIGFyZ0FycmF5ICkge1xyXG5cclxuICAgICAgdmFyIHAgPSB0aGlzLmdldFBpeGVscygpO1xyXG5cclxuICAgICAgLy8gSWYgZmlsdGVyIGRvZXNuJ3QgZXhpc3QsIG9yIG5vIG5hbWUsIHN0b3AgcHJvY2Vzcy5cclxuICAgICAgLy9pZiAoIGZpbHRlcltuYW1lXSA9PT0gdW5kZWZpbmVkICkgdGhyb3cgbmV3IEVycm9yKFwiZmlsdGVyICdcIiArIG5hbWUgK1wiJyBkb2VzJ250IGV4aXN0IGFzIGZpbHRlcnMgbWV0aG9kLlwiKTtcclxuICAgICAgaWYgKCAhZmlsdGVyW25hbWVdICkgcmV0dXJuO1xyXG5cclxuICAgICAgLy8gR2V0IGltYWdlIGRhdGEgcGl4ZWxzLlxyXG4gICAgICB2YXIgaSwgYXJncyA9IFsgcCBdO1xyXG4gICAgICB2YXIgcGl4ZWxzO1xyXG5cclxuICAgICAgLy8gQ29uc3RydWN0IGFyZ3MgYXJyYXkuXHJcbiAgICAgIGZvciAoIGkgPSAwOyBpIDwgYXJnQXJyYXkubGVuZ3RoOyBpKysgKSB7XHJcbiAgICAgICAgYXJncy5wdXNoKCBhcmdBcnJheVtpXSApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBBcHBseSBmaWx0ZXIuXHJcbiAgICAgIHAgPSBmaWx0ZXJbbmFtZV0uYXBwbHkoIG51bGwsIGFyZ3MgKTtcclxuXHJcbiAgICAgIC8vIFNldCBuZXcgaW1hZ2UgZGF0YSBvbiBjYW52YXMuXHJcbiAgICAgIHRoaXMuY29udGV4dC5wdXRJbWFnZURhdGEoIHAsIHRoaXMuc2l6ZS54LCB0aGlzLnNpemUueSApO1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBDcmVhdGUgYW5kIHN0b3JlIG9uZSBtYXRyaXggcGVyIG1vZGUgcmVnaXN0ZXJlZCwgaWYgaW5zdGFuY2Uuc2V0dGluZ3MubW9kZXNbbW9kZV9uYW1lXSBpcyB0cnVlLlxyXG4gICAgYnVpbGRBbGxNYXRyaXg6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgdmFyIG0sIG1BID0ge307XHJcbiAgICAgIGZvciAoIHZhciBtb2RlIGluIG1hdHJpeE1ldGhvZCApIHtcclxuICAgICAgICBpZiAoICF0aGlzLmluc3RhbmNlLnNldHRpbmdzLm1vZGVzW21vZGVdICkgY29udGludWU7XHJcbiAgICAgICAgbSA9IHRoaXMuY3JlYU1hdHJpeCgpO1xyXG4gICAgICAgIHRoaXMuYXBwbHlGaWx0ZXIoIGZpbHRlcnNbbW9kZV0ubmFtZSwgdGhpcy5pbnN0YW5jZS5zZXR0aW5nc1tmaWx0ZXJzW21vZGVdLnBhcmFtXSApO1xyXG4gICAgICAgIHRoaXNbbWF0cml4TWV0aG9kW21vZGVdXShtLCAxKTtcclxuICAgICAgICBtQVttb2RlXSA9IG07XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIG1BO1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBSZXR1cm4gYWN0aXZlIG1hdHJpeC5cclxuICAgIGdldE1hdHJpeDogZnVuY3Rpb24oKXtcclxuICAgICAgcmV0dXJuIHRoaXMubWF0cml4W3RoaXMuaW5zdGFuY2UubW9kZV0gfHwgZmFsc2U7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIENyZWF0ZSBtYXRyaXguXHJcbiAgICBjcmVhTWF0cml4OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHZhciBhID0gdGhpcy5pbnN0YW5jZS5zZXR0aW5ncy53aWR0aCxcclxuICAgICAgICBiID0gdGhpcy5pbnN0YW5jZS5zZXR0aW5ncy5oZWlnaHQsXHJcbiAgICAgICAgbWF0ID0gbmV3IEFycmF5KCBhICksIGksIGo7XHJcbiAgICAgIGZvciggaSA9IDA7IGkgPCBhOyBpKysgKSB7XHJcbiAgICAgICAgbWF0W2ldID0gbmV3IEFycmF5KCBiICk7XHJcbiAgICAgICAgZm9yKCBqID0gMDsgaiA8IGI7IGorKyApe1xyXG4gICAgICAgICAgbWF0W2ldW2pdID0gMDtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIG1hdDtcclxuICAgIH0sXHJcblxyXG4gICAgLy8gU2V0IGFsbCBtYXRyaXggdmFsdWVzIHRvIHZhbHVlIG9yIDA7XHJcbiAgICBjbGVhck1hdHJpeDogZnVuY3Rpb24oIHZhbHVlICl7XHJcbiAgICAgIHZhciBpLCBqLCBsLCBtLCB2LFxyXG4gICAgICAgIG1hdHJpeCA9IHRoaXMuZ2V0TWF0cml4KCk7XHJcbiAgICAgIHYgPSB2YWx1ZSB8fCAwO1xyXG4gICAgICBsID0gbWF0cml4Lmxlbmd0aDtcclxuICAgICAgbSA9IG1hdHJpeFswXS5sZW5ndGg7XHJcbiAgICAgIGZvciggaSA9IDA7IGkgPCBsOyBpKysgKXtcclxuICAgICAgICBmb3IoIGogPSAwOyBqIDwgbTsgaisrICl7XHJcbiAgICAgICAgICBtYXRyaXhbaV1bal0gPSB2O1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICAvLyBDb25zdHJ1Y3QgbWF0cml4LCBhY2NvcmRpbmcgdG8gY2FudmFzJ3MgaW1hZ2UgZGF0YSB2YWx1ZXMuXHJcbiAgICAvLyBJZiBpbWFnZSBkYXRhIHBpeGVsIGlzIHdoaXRlLCBjb3JyZXNwb25kaW5nIG1hdHJpeCBjYXNlIGlzIHNldCB0b28gdmFsdWUuXHJcbiAgICAvLyBJZiBpbWFnZSBkYXRhIHBpeGVsIGlzIGJsYWNrLCBjb3JyZXNwb25kaW5nIG1hdHJpeCBjYXNlIGlzIHNldCB0byAwLlxyXG4gICAgdmFsdWVNYXRyaXg6IGZ1bmN0aW9uICggbWF0cml4LCB2YWx1ZSApIHtcclxuICAgICAgdmFyIGEgPSB0aGlzLnNpemUueCxcclxuICAgICAgICBiID0gTWF0aC5taW4oIE1hdGguZmxvb3IoYSArIHRoaXMuc2l6ZS53KSwgbWF0cml4Lmxlbmd0aCApLFxyXG4gICAgICAgIGMgPSB0aGlzLnNpemUueSxcclxuICAgICAgICBkID0gTWF0aC5taW4oIE1hdGguZmxvb3IoYyArIHRoaXMuc2l6ZS5oKSwgbWF0cml4WzBdLmxlbmd0aCApO1xyXG4gICAgICBpZiggbWF0cml4Lmxlbmd0aCA8IGEgfHwgbWF0cml4WzBdLmxlbmd0aCA8IGQgKSByZXR1cm47XHJcblxyXG4gICAgICB2YXIgaSwgaiwgcCA9IHRoaXMuY29udGV4dC5nZXRJbWFnZURhdGEoMCwgMCwgdGhpcy5pbnN0YW5jZS5jYW52YXMud2lkdGgsIHRoaXMuaW5zdGFuY2UuY2FudmFzLmhlaWdodCkuZGF0YTtcclxuXHJcbiAgICAgIGZvciggaSA9IGE7IGkgPCBiOyBpKysgKXtcclxuICAgICAgICBmb3IoIGogPSBjOyBqIDwgZDsgaisrICl7XHJcbiAgICAgICAgICB2YXIgcGl4ID0gcFsoKHRoaXMuaW5zdGFuY2UuY2FudmFzLndpZHRoICogaikgKyBpKSAqIDRdO1xyXG4gICAgICAgICAgbWF0cml4W2ldW2pdID0gKCBwaXggPT09IDI1NSApID8gdmFsdWUgOiAwO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICAvLyBDcmVhdGUgY2FudmFzIHRodW1ibmFpbHMgb2YgdGhlIHBpY3R1cmUgc3RvcmUgb24gdGhpcyBNYXRyaXguXHJcbiAgICByZW5kZXJUaHVtYm5haWxzOiBmdW5jdGlvbiAoIHRhcmdldCwgZmlsdGVyICkge1xyXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG4gICAgICAvLyBDcmVhdGUgbmV3IE1hdHJpeCBmb3IgdGhpcyB0aHVtYi5cclxuICAgICAgdmFyIG0gPSBuZXcgTWF0cml4ICggdGhpcy5pbnN0YW5jZSwgdGhpcy5waWN0dXJlLCB7IHc6dGhpcy5pbnN0YW5jZS5zZXR0aW5ncy50aHVtYldpZHRoLCBoOnRoaXMuaW5zdGFuY2Uuc2V0dGluZ3MudGh1bWJIZWlnaHQgfSApO1xyXG5cclxuICAgICAgLy8gQXBwbHkgZmlsdGVyLlxyXG4gICAgICBpZiAoIGZpbHRlciApIHtcclxuICAgICAgICBtLmFwcGx5RmlsdGVyKCBmaWx0ZXJzW3RoaXMuaW5zdGFuY2UubW9kZV0ubmFtZSwgdGhpcy5zZXR0aW5nc1tmaWx0ZXJzW3RoaXMuaW5zdGFuY2UubW9kZV0ucGFyYW1dICk7XHJcbiAgICAgIH1cclxuICAgICAgLy8gQXBwbHkgc3R5bGUuXHJcbiAgICAgIG0uY2FudmFzLnN0eWxlLmN1cnNvciA9ICdwb2ludGVyJztcclxuXHJcbiAgICAgIC8vIEFwcGx5IGNsaWNrIGV2ZW50IG9uIHRoZSB0aHVtYidzIGNhbnZhcyB0aGF0IGZpcmUgdGhlIERpYXBQYXJ0J3MgaW5zdGFuY2UgYWN0aXZlIGluZGV4IHRvIGNvcmVzcG9uZGluZyBNYXRyaXguXHJcbiAgICAgIG0uY2FudmFzLm9uY2xpY2sgPSBmdW5jdGlvbiggbWF0cml4ICl7XHJcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICggZSApIHtcclxuICAgICAgICAgIHNlbGYuaW5zdGFuY2UuZ29UbyggbWF0cml4ICk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KCBtICk7XHJcblxyXG4gICAgICAvLyBTdG9yZSBNYXRyaXgncyBpbnN0YW5jZSBvZiB0aGUgdGh1bWIgaW4gYW4gYXJyYXkuXHJcbiAgICAgIHRoaXMuaW5zdGFuY2UudGh1bWJPcmlnaW5hbFRhYi5wdXNoKCBtICk7XHJcblxyXG4gICAgICAvLyBJbmplY3QgdGh1bWIncyBjYW52YXMgaW4gdGhlIERPTS5cclxuICAgICAgZm4uYXBwZW5kKCB0YXJnZXQsIG0uY2FudmFzICk7XHJcblxyXG4gICAgICByZXR1cm4gbTtcclxuICAgIH1cclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBEaWFwUGFydCBjb25zdHJ1Y3Rvci5cclxuICAgKiBBIERpYXBQYXJldCBpbnN0YW5jZSBtdXN0IGJlIGNyZWF0ZWQgYW5kIGluaXRpYWxpemVkIHRvIGNyZWF0ZSBzbGlkZXNob3cuXHJcbiAgICpcclxuICAgKi9cclxuXHJcbiAgZnVuY3Rpb24gRGlhcFBhcnQgKCkge1xyXG4gICAgdGhpcy5zZXR0aW5ncyA9IGZuLnNpbXBsZUV4dGVuZCgge30sIGRlZmF1bHRzICk7XHJcbiAgICB0aGlzLm1hdHJpeFRhYiA9IFtdO1xyXG4gICAgdGhpcy50aHVtYk9yaWdpbmFsVGFiID0gW107XHJcbiAgICB0aGlzLnBhcnRpY2xlcyA9IFtdO1xyXG4gICAgdGhpcy5jaGFtcHMgPSBbXTtcclxuICAgIHRoaXMubWFzc0FjdGl2ZSA9IHRoaXMuc2V0dGluZ3MubWFzcztcclxuICAgIHRoaXMubW9kZSA9IHRoaXMuc2V0dGluZ3MuaW5pdGlhbE1vZGU7XHJcbiAgICB0aGlzLmxpYmVyYXRpb24gPSBmYWxzZTtcclxuICAgIHRoaXMuYWN0aXZlSW5kZXggPSBudWxsO1xyXG4gICAgdGhpcy5jYW52YXMgPSB0aGlzLmdldENhbnZhcygpO1xyXG4gICAgdGhpcy5jb250ZXh0ID0gdGhpcy5nZXRDb250ZXh0MkQoIHRoaXMuY2FudmFzICk7XHJcbiAgfVxyXG5cclxuICBEaWFwUGFydC5wcm90b3R5cGUgPSB7XHJcblxyXG4gICAgICAvLyBJbml0aWFsaXplIERpYXBQYXJ0IGluc3RhbmNlLlxyXG4gICAgICBpbml0OiBmdW5jdGlvbiAoIG9wdGlvbnMgKSB7XHJcblxyXG4gICAgICAgIC8vIFN0b3JlIHNldHRpbmdzLlxyXG4gICAgICAgIGZuLnNpbXBsZUV4dGVuZCggdGhpcy5zZXR0aW5ncywgb3B0aW9ucyApO1xyXG5cclxuICAgICAgICAvLyBJbmplY3QgY2FudmFzIG9uIERPTS5cclxuICAgICAgICBmbi5hcHBlbmQoIHRoaXMuc2V0dGluZ3MudGFyZ2V0RWxlbWVudCwgdGhpcy5jYW52YXMgKTtcclxuXHJcbiAgICAgICAgLy8gQXBwbHkgc3R5bGUgdG8gY2FudmFzIGVsZW1lbnQuXHJcbiAgICAgICAgdGhpcy5jYW52YXMuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gdGhpcy5zZXR0aW5ncy5iYWNrZ3JvdW5kO1xyXG5cclxuICAgICAgICAvLyBTZXQgbWFzcyBpbml0aWFsIGNvb3JkcyB0byBjYW52YSdzIGNlbnRlci5cclxuICAgICAgICB0aGlzLmNlbnRlck1hc3MoKTtcclxuXHJcbiAgICAgICAgLy8gQ3JlYXRlIHRoZSBtYXNzLlxyXG4gICAgICAgIHRoaXMuY2hhbXBzLnB1c2goIG5ldyBNYXNzKCBuZXcgVmVjdG9yKHRoaXMuc2V0dGluZ3MubWFzc1gsIHRoaXMuc2V0dGluZ3MubWFzc1kpLCB0aGlzLnNldHRpbmdzLm1hc3MgKSApO1xyXG5cclxuICAgICAgICAvLyBTdGFydCB0aGUgbG9vcC5cclxuICAgICAgICB0aGlzLmxvb3AoKTtcclxuXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBTZXQgb3B0aW9ucyB0byBzZXR0aW5ncy5cclxuICAgICAgc2V0OiBmdW5jdGlvbiAoIG9wdGlvbnMgKXtcclxuICAgICAgICBmbi5zaW1wbGVFeHRlbmQoIHRoaXMuc2V0dGluZ3MsIG9wdGlvbnMgKTtcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIENyZWF0ZSBuZXcgc2xpZGUsIGFjY29yZGluZyB0byBpbnB1dCB2YWx1ZSA6IEltYWdlIG9yIFN0cmluZy5cclxuICAgICAgY3JlYXRlU2xpZGU6IGZ1bmN0aW9uKCBpbnB1dCwgY3VzdG9tU2l6ZSApe1xyXG5cclxuICAgICAgICAvLyBDcmVhdGUgdGhlIE1hdHJpeCBpbnN0YW5jZSBhY2NvcmRpbmcgdG8gaW5wdXQuXHJcbiAgICAgICAgdmFyIG0gPSBuZXcgTWF0cml4ICggdGhpcywgaW5wdXQsIGN1c3RvbVNpemUgKTtcclxuXHJcbiAgICAgICAgLy8gU2V0IGFjdGl2ZSBpbmRleCB0byAwIGlmIGl0J3MgbnVsbC5cclxuICAgICAgICB0aGlzLmFjdGl2ZUluZGV4ID0gKCB0aGlzLmFjdGl2ZUluZGV4ID09PSBudWxsICkgPyAwIDogdGhpcy5hY3RpdmVJbmRleDtcclxuICAgICAgICB0aGlzLm1hdHJpeFRhYi5wdXNoKCBtICk7XHJcbiAgICAgICAgcmV0dXJuIG07XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBDcmVhdGUgYW5kIHJldHVybiBjYW52YXMgZWxlbWVudC4gSWYgbm8gc2l6ZSBzcGVjaWZpZWQsIHRha2UgaW5zdGFuY2UncyBzZXR0aW5ncyBzaXplLlxyXG4gICAgICBnZXRDYW52YXM6IGZ1bmN0aW9uICggc2l6ZSApIHtcclxuICAgICAgICB2YXIgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggJ2NhbnZhcycgKSxcclxuICAgICAgICAgICAgcyA9IHNpemUgfHwge307XHJcblxyXG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSAoIHMuaCApID8gcy5oIDogdGhpcy5zZXR0aW5ncy5oZWlnaHQ7XHJcbiAgICAgICAgY2FudmFzLndpZHRoID0gKCBzLncgKSA/IHMudyA6IHRoaXMuc2V0dGluZ3Mud2lkdGg7XHJcblxyXG4gICAgICAgIHJldHVybiBjYW52YXM7XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBDcmVhdGUgYW5kIHJldHVybiBjb250ZXh0IGZvciBjYW52YXMuXHJcbiAgICAgIGdldENvbnRleHQyRDogZnVuY3Rpb24gKCBjYW52YXMgKSB7XHJcbiAgICAgICAgcmV0dXJuIGNhbnZhcy5nZXRDb250ZXh0KCAnMmQnICk7XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBSZXR1cm4gY29vcmRzLCBoZWlnaHQgYW5kIHdpZHRoIG9mIHRoZSBpbWcgcmVzaXplZCBhY2NvcmRpbmcgdG8gc2l6ZSBhcmcsIG9yIGluc3RhbmNlJ3MgY2FudmFzIHNpemUuIFxyXG4gICAgICBnZXRJbWFnZVNpemU6IGZ1bmN0aW9uICggaW1nLCBzaXplICkge1xyXG4gICAgICAgIHZhciB3ID0gaW1nLndpZHRoLCBcclxuICAgICAgICAgICAgaCA9IGltZy5oZWlnaHQsXHJcbiAgICAgICAgICAgIGN3ID0gKCBzaXplICkgPyBzaXplLncgOiB0aGlzLmNhbnZhcy53aWR0aCxcclxuICAgICAgICAgICAgY2ggPSAoIHNpemUgKSA/IHNpemUuaCA6IHRoaXMuY2FudmFzLmhlaWdodCxcclxuICAgICAgICAgICAgcmF0aW8gPSB3IC8gaDtcclxuXHJcbiAgICAgICAgaWYgKCB3ID49IGggJiYgdyA+IGN3ICkge1xyXG4gICAgICAgICAgdyA9IGN3O1xyXG4gICAgICAgICAgaCA9IE1hdGgucm91bmQoIHcgLyByYXRpbyApO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgIGlmICggaCA+IGNoICkge1xyXG4gICAgICAgICAgICBoID0gY2g7XHJcbiAgICAgICAgICAgIHcgPSBNYXRoLnJvdW5kKCBoICogcmF0aW8gKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICB4OiBNYXRoLnJvdW5kKCAoIGN3IC0gdyApIC8gMiApLFxyXG4gICAgICAgICAgeTogTWF0aC5yb3VuZCggKCBjaCAtIGggKSAvIDIgKSwgXHJcbiAgICAgICAgICB3OiB3LFxyXG4gICAgICAgICAgaDogaFxyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIE1ldGhvZCB0byBwYXNzIGFzIG9uY2hhbmdlIGV2ZW50IGZ1bmN0aW9uIGluIGZpbGVzIGlucHV0LlxyXG4gICAgICBsb2FkOiBmdW5jdGlvbiAoIGUsIHRodW1iICkge1xyXG5cclxuICAgICAgICB2YXIgaSwgc2VsZiA9IHRoaXM7IFxyXG4gICAgICAgIHZhciBmaWxlcyA9ICggZS50YXJnZXQgKSA/IGUudGFyZ2V0LmZpbGVzIDogZTsgXHJcbiAgICAgICAgdmFyIHRoID0gKCB0aHVtYiA9PT0gJ2ZhbHNlJyApID8gZmFsc2UgOiB0cnVlO1xyXG5cclxuICAgICAgICAvLyBJZiBubyBmaWxlIHNlbGVjdGVkLCBleGl0LlxyXG4gICAgICAgIGlmICggIWZpbGVzIHx8ICggZmlsZXMuY29uc3RydWN0b3IgIT09IEFycmF5ICYmICFmaWxlcyBpbnN0YW5jZW9mIEZpbGVMaXN0ICkgKSByZXR1cm4gY29uc29sZS5sb2coICdObyBmaWxlcyBtYXRjaGVkJyApO1xyXG5cclxuICAgICAgICBmb3IgKCBpID0gMDsgaSA8IGZpbGVzLmxlbmd0aDsgaSsrICl7XHJcblxyXG4gICAgICAgICAgdmFyIGZpbGUgPSBmaWxlc1tpXTtcclxuXHJcbiAgICAgICAgICAvLyBJZiBmaWxlIGNvbWVzIGZyb20gaW5wdXQgZmlsZXMuXHJcbiAgICAgICAgICBpZiAoIGZpbGUudHlwZSApe1xyXG5cclxuICAgICAgICAgICAgLy8gSWYgZmlsZSBpcyBub3QgYW4gaW1hZ2UsIHBhc3MgdG8gbmV4dCBmaWxlLlxyXG4gICAgICAgICAgICBpZiAoICFmaWxlLnR5cGUubWF0Y2goICdpbWFnZScgKSApIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAgICAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcclxuXHJcbiAgICAgICAgICAgICAgLy8gV2hlbiBmaWxlIGlzIGxvYWRlZC5cclxuICAgICAgICAgICAgICByZWFkZXIub25sb2FkID0gZnVuY3Rpb24gKCBldmVudCApIHtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBTZXQgaW1hZ2UgZGF0YS5cclxuICAgICAgICAgICAgICAgIHZhciBzcmMgPSBldmVudC50YXJnZXQucmVzdWx0O1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIExvYWQgaW1hZ2UuXHJcbiAgICAgICAgICAgICAgICBmbi5sb2FkSW1hZ2UuY2FsbCggdGhpcywgc3JjLCBzZWxmLCB0aCApO1xyXG4gICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgLy8gTG9hZCBmaWxlLlxyXG4gICAgICAgICAgICAgIHJlYWRlci5yZWFkQXNEYXRhVVJMKCBmaWxlICk7XHJcblxyXG4gICAgICAgICAgfSBlbHNlIHsgLy8gSWYgZmlsZXMgaXMgYXJyYXkgb2YgdXJsLlxyXG5cclxuICAgICAgICAgICAgLy8gTG9hZCBpbWFnZS5cclxuICAgICAgICAgICAgZm4ubG9hZEltYWdlLmNhbGwoIHRoaXMsIGZpbGUsIHNlbGYsIHRoICk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gQ2hhbmdlIGluc3RhbmNlJ3MgbW9kZS4gQmFzaWNhbGx5LCBpdCBjaGFuZ2UgbWV0aG9kcyB0byB0ZXN0IGVhY2ggUGFydGljbGVzLCBhbmQgbWF0cml4IHRoYXQncyB0ZXN0ZWQuXHJcbiAgICAgIHN3aXRjaE1vZGU6IGZ1bmN0aW9uICggbW9kZSApIHtcclxuXHJcbiAgICAgICAgLy8gU2V0IG1vZGUuXHJcbiAgICAgICAgdGhpcy5tb2RlID0gbW9kZTtcclxuXHJcbiAgICAgICAgLy8gQ2FsbCBjYWxsYmFjayBpZiBleGlzdC5cclxuICAgICAgICBpZiggdHlwZW9mIHRoaXMuc2V0dGluZ3Muc3dpdGNoTW9kZUNhbGxiYWNrID09PSAnZnVuY3Rpb24nICkge1xyXG4gICAgICAgICAgdGhpcy5zZXR0aW5ncy5zd2l0Y2hNb2RlQ2FsbGJhY2suY2FsbCggdGhpcyApO1xyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIENyZWF0ZSBuZXcgbWFzcyBhbmQgc3RvcmUgb24gY2hhbXAgYXJyYXkuXHJcbiAgICAgIGFkZE1hc3M6IGZ1bmN0aW9uKCB4LCB5LCBtYXNzICl7XHJcbiAgICAgICAgdmFyIG0gPSBuZXcgTWFzcyggbmV3IFZlY3Rvcih4LCB5KSwgbWFzcyApO1xyXG4gICAgICAgIHRoaXMuY2hhbXBzLnB1c2goIG0gKTtcclxuICAgICAgICByZXR1cm4gbTtcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIFNldCBtYXNzIGNvb3JkcyB0byBjYW52YSdzIGNlbnRnZXIgb24gaW5zdGFuY2UncyBzZXR0aW5ncy5cclxuICAgICAgY2VudGVyTWFzczogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuc2V0dGluZ3MubWFzc1ggPSB0aGlzLmNhbnZhcy53aWR0aC8yO1xyXG4gICAgICAgIHRoaXMuc2V0dGluZ3MubWFzc1kgPSB0aGlzLmNhbnZhcy5oZWlnaHQvMjtcclxuXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBDYWxsIHBhcnRpY2xlIG1ldGhvZHMgaW4gZWFjaCBsb29wLCBhY2NvcmRpbmcgdG8gYWN0aXZlIG1vZGUgYW5kIGNvcnJlc3BvbmRpbmcgcHJvY2VlZCBzZXR0aW5ncy5cclxuICAgICAgcGFydFByb2NlZWQ6IGZ1bmN0aW9uICggcGFydGljbGUgKSB7XHJcbiAgICAgICAgdmFyIGksIGwgPSBwcm9jZWVkW3RoaXMubW9kZV0ubGVuZ3RoO1xyXG4gICAgICAgIGZvciAoIGkgPSAwOyBpIDwgbDsgaSsrICkge1xyXG4gICAgICAgICAgcGFydGljbGVbcHJvY2VlZFt0aGlzLm1vZGVdW2ldXSgpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIFNldCBhY3RpdmVJbmRleCB0byBtYXRyaXgncyB0aHVtYiBpbmRleC5cclxuICAgICAgZ29UbzogZnVuY3Rpb24gKCBtYXRyaXggKSB7XHJcbiAgICAgICAgdGhpcy5jYWxsTmV4dE1hdHJpeE1vZGUoKTtcclxuICAgICAgICB0aGlzLmFjdGl2ZUluZGV4ID0gdGhpcy50aHVtYk9yaWdpbmFsVGFiLmluZGV4T2YoIG1hdHJpeCApO1xyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gTWV0aG9kIHRvIGFkZCBuZXcgc3dpdGNoIG1hdHJpeCBmdW5jdGlvbi5cclxuICAgICAgcmVnaXN0ZXJOZXh0TWF0cml4TW9kZTogZnVuY3Rpb24gKCBuYW1lLCBmbiApIHtcclxuICAgICAgICBpZiAoIHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJyB8fCB0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycgKSB7XHJcbiAgICAgICAgICByZXR1cm4gY29uc29sZS5sb2coICdFcnJvciwgbmFtZSByZXF1aXJlZCBhbmQgbXVzdCBiZSB0eXBlIHN0cmluZywgZm4gcmVxdWlyZWQgYW5kIG11c3QgYmUgdHlwZSBmdW5jdGlvbicgKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgbmV4dE1hdHJpeE1vZGVbIG5hbWUgXSA9IGZuO1xyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gRnVuY3Rpb24gY2FsbGVkIGJldHdlZW4gb2xkIGFuZCBuZXcgbWF0cml4IGFjdGl2ZS5cclxuICAgICAgY2FsbE5leHRNYXRyaXhNb2RlOiBmdW5jdGlvbiAoKXtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgbmV4dE1hdHJpeE1vZGVbIHRoaXMuc2V0dGluZ3MubmV4dE1hdHJpeE1vZGUgXS5jYWxsKCB0aGlzICk7XHJcbiAgICAgICAgfSBjYXRjaCAoIGUgKSB7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZyggZS5uYW1lICsgJyAtICcgKyBlLm1lc3NhZ2UpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIENyZWF0ZSBuZXcgUGFydGljbGUsIHdpdGggcmFuZG9tIHBvc2l0aW9uIGFuZCBzcGVlZC5cclxuICAgICAgY3JlYVBhcnRzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMucGFydGljbGVzLmxlbmd0aCA8IHRoaXMuc2V0dGluZ3MuZGVuc2l0eSkge1xyXG4gICAgICAgICAgdmFyIGksIG5iID0gdGhpcy5zZXR0aW5ncy5kZW5zaXR5IC0gdGhpcy5wYXJ0aWNsZXMubGVuZ3RoO1xyXG4gICAgICAgICAgZm9yICggaSA9IDA7IGkgPCBuYjsgaSsrICkge1xyXG4gICAgICAgICAgICB0aGlzLnBhcnRpY2xlcy5wdXNoKG5ldyBQYXJ0aWNsZSh0aGlzLCBuZXcgVmVjdG9yKE1hdGgucmFuZG9tKCkgKiB0aGlzLmNhbnZhcy53aWR0aCwgTWF0aC5yYW5kb20oKSAqIHRoaXMuY2FudmFzLmhlaWdodCksIG5ldyBWZWN0b3IocmVhbFJhbmRvbSh0aGlzLnNldHRpbmdzLmluaXRpYWxWZWxvY2l0eSksIHJlYWxSYW5kb20odGhpcy5zZXR0aW5ncy5pbml0aWFsVmVsb2NpdHkpKSwgbmV3IFZlY3RvcigwLCAwKSwgMCwgZmFsc2UpKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBQcm9jZWVkIGFsbCBwYXJ0aWN1bGVzLlxyXG4gICAgICB1cGdyYWRlUGFydHM6IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICAgICAgdmFyIGN1cnJlbnRQYXJ0cyA9IFtdLFxyXG4gICAgICAgICAgICBpLCBsID0gdGhpcy5wYXJ0aWNsZXMubGVuZ3RoO1xyXG5cclxuICAgICAgICBmb3IoIGkgPSAwOyBpIDwgbDsgaSsrICl7XHJcblxyXG4gICAgICAgICAgdmFyIHBhcnRpY2xlID0gdGhpcy5wYXJ0aWNsZXNbaV0sXHJcbiAgICAgICAgICAgICAgcG9zID0gcGFydGljbGUucG9zaXRpb247XHJcblxyXG4gICAgICAgICAgLy8gSWYgcGFydGljbGUgb3V0IG9mIGNhbnZhcywgZm9yZ2V0IGl0LlxyXG4gICAgICAgICAgaWYoIHBvcy54ID49IHRoaXMuY2FudmFzLndpZHRoIHx8IHBvcy54IDw9IDAgfHwgcG9zLnkgPj0gdGhpcy5jYW52YXMuaGVpZ2h0IHx8IHBvcy55IDw9IDAgKSBjb250aW51ZTtcclxuXHJcbiAgICAgICAgICAvLyBQcm9jZWVkIHRoZSBwYXJ0aWNsZS5cclxuICAgICAgICAgIHRoaXMucGFydFByb2NlZWQoIHBhcnRpY2xlICk7XHJcblxyXG4gICAgICAgICAgLy8gTW92ZSB0aGUgcGFydGljbGUuXHJcbiAgICAgICAgICBwYXJ0aWNsZS5tb3ZlKCk7XHJcblxyXG4gICAgICAgICAgLy8gU3RvcmUgdGhlIHBhcnRpY2xlLlxyXG4gICAgICAgICAgY3VycmVudFBhcnRzLnB1c2goIHBhcnRpY2xlICk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMucGFydGljbGVzID0gY3VycmVudFBhcnRzO1xyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gRHJhdyBwYXJ0aWNsZXMgaW4gY2FudmFzLlxyXG4gICAgICBkcmF3UGFydHM6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgaSwgbiA9IHRoaXMucGFydGljbGVzLmxlbmd0aDtcclxuICAgICAgICBmb3IoIGkgPSAwOyBpIDwgbjsgaSsrICl7XHJcbiAgICAgICAgICB2YXIgcG9zID0gdGhpcy5wYXJ0aWNsZXNbaV0ucG9zaXRpb247XHJcbiAgICAgICAgICB0aGlzLmNvbnRleHQuZmlsbFN0eWxlID0gdGhpcy5wYXJ0aWNsZXNbaV0uY29sb3I7XHJcbiAgICAgICAgICB0aGlzLmNvbnRleHQuZmlsbFJlY3QocG9zLngsIHBvcy55LCB0aGlzLnNldHRpbmdzLnBhcnRpY2xlU2l6ZSwgdGhpcy5zZXR0aW5ncy5wYXJ0aWNsZVNpemUpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIE1ha2UgZnJlZSBhbGwgcGFydGljbGVzLlxyXG4gICAgICBjbGVhclBhcnRzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIGksIGwgPSB0aGlzLnBhcnRpY2xlcy5sZW5ndGg7XHJcbiAgICAgICAgZm9yKCBpID0gMDsgaSA8IGw7IGkrKyApe1xyXG4gICAgICAgICAgdGhpcy5wYXJ0aWNsZXNbaV0uaW5Gb3JtID0gMDtcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBDbGVhbiBjYW52YXMuXHJcbiAgICAgIGNsZWFyOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgaWYoICF0aGlzLnNldHRpbmdzLmRyYXcgKSB7XHJcbiAgICAgICAgICB0aGlzLmNvbnRleHQuY2xlYXJSZWN0KCAwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0ICk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gTG9vcCdzIGNhbGxiYWNrLlxyXG4gICAgICBxdWV1ZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICBpZiggIXRoaXMuc2V0dGluZ3Muc3RvcCApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucmVxdWVzdElEID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSggc2VsZi5sb29wLmJpbmQoc2VsZikgKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKCBzZWxmLnJlcXVlc3RJRCApO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZXF1ZXN0SUQgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gQ3JlYXRlIGFuZCBwcm9jZWVkIG5ldyBwYXJ0aWNsZXMgaWYgbWlzc2luZy5cclxuICAgICAgdXBkYXRlOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5jcmVhUGFydHMoKTtcclxuICAgICAgICB0aGlzLnVwZ3JhZGVQYXJ0cygpO1xyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gRHJhdy5cclxuICAgICAgZHJhdzogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuZHJhd1BhcnRzKCk7XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBMb29wLlxyXG4gICAgICBsb29wOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5jbGVhcigpO1xyXG4gICAgICAgIHRoaXMudXBkYXRlKCk7XHJcbiAgICAgICAgdGhpcy5kcmF3KCk7XHJcbiAgICAgICAgdGhpcy5xdWV1ZSgpO1xyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gU3RvcCBsb29wLlxyXG4gICAgICBzdG9wOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5zdG9wID0gdHJ1ZTtcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIFN0YXJ0IGxvb3AuXHJcbiAgICAgIHN0YXJ0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5zdG9wID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5sb29wKCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICB9O1xyXG4gICAgXHJcblxyXG4gICAvLyBSZXR1cm4gcmFuZG9tIG51bWJlci4gXHJcbiAgIGZ1bmN0aW9uIHJlYWxSYW5kb20oIG1heCApe1xyXG4gICAgICByZXR1cm4gTWF0aC5jb3MoKE1hdGgucmFuZG9tKCkgKiBNYXRoLlBJKSkgKiBtYXg7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gVmVjdG9yIGVsZW1lbnRhcnkgY2xhc3Mgb2JqZWN0LlxyXG4gICAgZnVuY3Rpb24gVmVjdG9yKCB4LCB5ICkge1xyXG4gICAgICB0aGlzLnggPSB4IHx8IDA7XHJcbiAgICAgIHRoaXMueSA9IHkgfHwgMDtcclxuICAgIH1cclxuXHJcbiAgICAvLyBBZGQgdmVjdG9yIHRvIGFuIG90aGVyLlxyXG4gICAgVmVjdG9yLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbih2ZWN0b3Ipe1xyXG4gICAgICB0aGlzLnggKz0gdmVjdG9yLng7XHJcbiAgICAgIHRoaXMueSArPSB2ZWN0b3IueTtcclxuICAgIH07XHJcblxyXG4gICAgLy8gSW52ZXJ0IHZlY3RvcidzIGRpcmVjdGlvbi5cclxuICAgIFZlY3Rvci5wcm90b3R5cGUuZ2V0SW52ZXJ0ID0gZnVuY3Rpb24oKXtcclxuICAgICAgdGhpcy54ID0gLTEgKiAodGhpcy54KTtcclxuICAgICAgdGhpcy55ID0gLTEgKiAodGhpcy55KTtcclxuICAgIH07XHJcblxyXG4gICAgLy8gR2V0IHZlY3RvcidzIGxlbmd0aC5cclxuICAgIFZlY3Rvci5wcm90b3R5cGUuZ2V0TWFnbml0dWRlID0gZnVuY3Rpb24oKXtcclxuICAgICAgcmV0dXJuIE1hdGguc3FydCh0aGlzLnggKiB0aGlzLnggKyB0aGlzLnkgKiB0aGlzLnkpXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIEdldCB2ZWN0b3IncyByYWRpdXMuXHJcbiAgICBWZWN0b3IucHJvdG90eXBlLmdldEFuZ2xlID0gZnVuY3Rpb24oKXtcclxuICAgICAgcmV0dXJuIE1hdGguYXRhbjIodGhpcy55LCB0aGlzLngpO1xyXG4gICAgfTtcclxuXHJcbiAgICAvLyBHZXQgbmV3IHZlY3RvciBhY2NvcmRpbmcgdG8gbGVuZ3RoIGFuZCByYWRpdXMuXHJcbiAgICBWZWN0b3IucHJvdG90eXBlLmZyb21BbmdsZSA9IGZ1bmN0aW9uICggYW5nbGUsIG1hZ25pdHVkZSApIHtcclxuICAgICAgcmV0dXJuIG5ldyBWZWN0b3IobWFnbml0dWRlICogTWF0aC5jb3MoYW5nbGUpLCBtYWduaXR1ZGUgKiBNYXRoLnNpbihhbmdsZSkpO1xyXG4gICAgfTtcclxuXHJcbiAgICAvLyBQYXJ0aWNsZSBjb25zdHJ1Y3Rvci5cclxuICAgIGZ1bmN0aW9uIFBhcnRpY2xlKCBpbnN0YW5jZSwgcG9zaXRpb24sIHZpdGVzc2UsIGFjY2VsZXJhdGlvbiApIHtcclxuICAgICAgdGhpcy5pbnN0YW5jZSA9IGluc3RhbmNlO1xyXG4gICAgICB0aGlzLnBvc2l0aW9uID0gcG9zaXRpb24gfHwgbmV3IFZlY3RvcigwLCAwKTtcclxuICAgICAgdGhpcy52aXRlc3NlID0gdml0ZXNzZSB8fCBuZXcgVmVjdG9yKDAsIDApO1xyXG4gICAgICB0aGlzLmFjY2VsZXJhdGlvbiA9IGFjY2VsZXJhdGlvbiB8fCBuZXcgVmVjdG9yKDAsIDApO1xyXG4gICAgICB0aGlzLmNvbG9yID0gdGhpcy5pbnN0YW5jZS5zZXR0aW5ncy5wYXJ0aWNsZUNvbG9yO1xyXG4gICAgICB0aGlzLmluRm9ybSA9IDA7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gU2V0IG5ldyBwYXJ0aWNsZSdzIHBvc2l0aW9uIGFjY29yZGluZyB0byBpdHMgYWNjZWxlcmF0aW9uIGFuZCBzcGVlZC5cclxuICAgIFBhcnRpY2xlLnByb3RvdHlwZS5tb3ZlID0gZnVuY3Rpb24oKXtcclxuICAgICAgdGhpcy52aXRlc3NlLmFkZCggdGhpcy5hY2NlbGVyYXRpb24gKTtcclxuICAgICAgdGhpcy5wb3NpdGlvbi5hZGQoIHRoaXMudml0ZXNzZSApO1xyXG4gICAgfTtcclxuXHJcbiAgICAvLyBQcm9jZWVkIHBhcnRpY2xlIGFjY29yZGluZyB0byBleGlzdGluZyBtYXNzLlxyXG4gICAgUGFydGljbGUucHJvdG90eXBlLnNvdW1pc0NoYW1wID0gZnVuY3Rpb24oKSB7XHJcblxyXG5cclxuICAgICAgdmFyIG1hc3MgPSB0aGlzLmluc3RhbmNlLm1hc3NBY3RpdmU7XHJcblxyXG4gICAgICAvLyBJZiBubyBtYXNzIHN0cmVuZ3RoLCByZXR1cm4uXHJcbiAgICAgIGlmICggIW1hc3MgKSByZXR1cm47XHJcblxyXG4gICAgICAvLyBJZiBwYXJ0aWNsZSBoYXMgbm90IGZsYWdnZWQgJ2luRm9ybScuXHJcbiAgICAgIGlmICggdGhpcy5pbkZvcm0gIT09IDEgKSB7XHJcblxyXG4gICAgICAgIHZhciB0b3RhbEFjY2VsZXJhdGlvblggPSAwO1xyXG4gICAgICAgIHZhciB0b3RhbEFjY2VsZXJhdGlvblkgPSAwO1xyXG4gICAgICAgIHZhciBsID0gdGhpcy5pbnN0YW5jZS5jaGFtcHMubGVuZ3RoO1xyXG5cclxuICAgICAgICAvLyBQcm9jZWVkIGVmZmVjdCBvZiBhbGwgbWFzcyByZWdpc3RlcmVkIGluIGNoYW1wcyBhcnJheS5cclxuICAgICAgICBmb3IoIHZhciBpID0gMDsgaSA8IGw7IGkrKyApe1xyXG4gICAgICAgICAgdmFyIGRpc3RYID0gdGhpcy5pbnN0YW5jZS5jaGFtcHNbaV0ucG9zaXRpb24ueCAtIHRoaXMucG9zaXRpb24ueDtcclxuICAgICAgICAgIHZhciBkaXN0WSA9IHRoaXMuaW5zdGFuY2UuY2hhbXBzW2ldLnBvc2l0aW9uLnkgLSB0aGlzLnBvc2l0aW9uLnk7XHJcbiAgICAgICAgICB2YXIgZm9yY2UgPSBtYXNzIC8gTWF0aC5wb3coZGlzdFggKiBkaXN0WCArIGRpc3RZICogZGlzdFksIDEuNSk7XHJcbiAgICAgICAgICB0b3RhbEFjY2VsZXJhdGlvblggKz0gZGlzdFggKiBmb3JjZTtcclxuICAgICAgICAgIHRvdGFsQWNjZWxlcmF0aW9uWSArPSBkaXN0WSAqIGZvcmNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gU2V0IG5ldyBhY2NlbGVyYXRpb24gdmVjdG9yLlxyXG4gICAgICAgIHRoaXMuYWNjZWxlcmF0aW9uID0gbmV3IFZlY3RvciggdG90YWxBY2NlbGVyYXRpb25YLCB0b3RhbEFjY2VsZXJhdGlvblkgKTtcclxuICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBQcm9jZWVkIHBhcnRpY2xlIGFjY29yZGluZyB0byBtYXRyaXggb2YgdHlwZSAndmFsdWUnLiBDYWxsZWQgaW4gbW9kZUZvcm0uXHJcbiAgICBQYXJ0aWNsZS5wcm90b3R5cGUuc291bWlzRm9ybSA9IGZ1bmN0aW9uKCl7XHJcblxyXG4gICAgICAvLyBJZiBsaWJlcmF0aW9uIGZsYWcsIG1ha2UgdGhlIHBhcnRpY2xlIGZyZWUuXHJcbiAgICAgIGlmKCB0aGlzLmluc3RhbmNlLmxpYmVyYXRpb24gKXtcclxuICAgICAgICB0aGlzLmluRm9ybSA9IDA7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBHZXQgcGFydGljbGUgcG9zaXRpb24uXHJcbiAgICAgIHZhciB0ZXN0WCA9IE1hdGguZmxvb3IoIHRoaXMucG9zaXRpb24ueCApO1xyXG4gICAgICB2YXIgdGVzdFkgPSBNYXRoLmZsb29yKCB0aGlzLnBvc2l0aW9uLnkgKTtcclxuXHJcbiAgICAgIC8vIENoZWNrIG1hdHJpeCB2YWx1ZSBhY2NvcmRpbmcgdG8gcGFydGljbGUncyBwb3NpdGlvbi5cclxuICAgICAgdmFyIHZhbHVlID0gKCB0aGlzLmluc3RhbmNlLmFjdGl2ZUluZGV4ICE9PSBudWxsICkgPyB0aGlzLmluc3RhbmNlLm1hdHJpeFRhYlt0aGlzLmluc3RhbmNlLmFjdGl2ZUluZGV4XS5nZXRNYXRyaXgoKVt0ZXN0WF1bdGVzdFldIDogMDtcclxuXHJcbiAgICAgIC8vIElmIHBhcnRpY2xlIGlzIGluc2lkZSBhICd3aGl0ZSB6b25lJy5cclxuICAgICAgaWYgKCB2YWx1ZSAhPT0gMCApe1xyXG5cclxuICAgICAgICAvLyBJZiBwYXJ0aWNsZXMganVzdCBjb21lIGludG8gdGhlICd3aGl0ZSB6b25lJy5cclxuICAgICAgICBpZiggdGhpcy5pbkZvcm0gIT09IDEgKXtcclxuXHJcbiAgICAgICAgICAvLyBVcCB0aGUgZm9ybSBmbGFnLlxyXG4gICAgICAgICAgdGhpcy5pbkZvcm0gPSAxO1xyXG5cclxuICAgICAgICAgIC8vIFNsb3cgdGhlIHBhcnRpY2xlLlxyXG4gICAgICAgICAgdGhpcy52aXRlc3NlID0gbmV3IFZlY3Rvcih0aGlzLnZpdGVzc2UueCAqIDAuMiwgdGhpcy52aXRlc3NlLnkgKiAwLjIpO1xyXG5cclxuICAgICAgICAgIC8vIEN1dCB0aGUgYWNjZWxlcmF0aW9uLlxyXG4gICAgICAgICAgdGhpcy5hY2NlbGVyYXRpb24gPSBuZXcgVmVjdG9yKDAsIDApO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gSWYgcGFydGljbGUgaXMgbm90IGluc2lkZSAnd2hpdGUgem9uZScuXHJcbiAgICAgIGVsc2Uge1xyXG5cclxuICAgICAgICAvLyBJZiB0aGUgcGFydGljbGUganVzdCBnZXQgb3V0IHRoZSB6b25lLlxyXG4gICAgICAgIGlmKCB0aGlzLmluRm9ybSA9PT0gMSApe1xyXG5cclxuICAgICAgICAgIC8vIEl0J3Mgbm90IGZyZWUgOiBpbnZlcnQgc3BlZWQuXHJcbiAgICAgICAgICB0aGlzLnZpdGVzc2UuZ2V0SW52ZXJ0KCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIC8vIE1hc3MgY29uc3RydWN0b3IuXHJcbiAgICBmdW5jdGlvbiBNYXNzKCBwb2ludCwgbWFzcyApIHtcclxuICAgICAgdGhpcy5wb3NpdGlvbiA9IHBvaW50O1xyXG4gICAgICB0aGlzLnNldE1hc3MoIG1hc3MgKTtcclxuICAgIH1cclxuXHJcbiAgICBNYXNzLnByb3RvdHlwZS5zZXRNYXNzID0gZnVuY3Rpb24oIG1hc3MgKXtcclxuICAgICAgdGhpcy5tYXNzID0gbWFzcyB8fCAwO1xyXG4gICAgICB0aGlzLmNvbG9yID0gbWFzcyA8IDAgPyBcIiNmMDBcIiA6IFwiIzBmMFwiO1xyXG4gICAgfTtcclxuXHJcblxyXG4gIC8vIFBPTFlGSUxMXHJcblxyXG4gIC8vIFByb2R1Y3Rpb24gc3RlcHMgb2YgRUNNQS0yNjIsIEVkaXRpb24gNSwgMTUuNC40LjE0XHJcbiAgLy8gUsOpZsOpcmVuY2UgOiBodHRwOi8vZXM1LmdpdGh1Yi5pby8jeDE1LjQuNC4xNFxyXG4gIGlmICghQXJyYXkucHJvdG90eXBlLmluZGV4T2YpIHtcclxuICAgIEFycmF5LnByb3RvdHlwZS5pbmRleE9mID0gZnVuY3Rpb24oc2VhcmNoRWxlbWVudCwgZnJvbUluZGV4KSB7XHJcbiAgICAgIHZhciBrO1xyXG4gICAgICBpZiAodGhpcyA9PSBudWxsKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJ0aGlzXCIgdmF1dCBudWxsIG91IG4gZXN0IHBhcyBkw6lmaW5pJyk7XHJcbiAgICAgIH1cclxuICAgICAgdmFyIE8gPSBPYmplY3QodGhpcyk7XHJcbiAgICAgIHZhciBsZW4gPSBPLmxlbmd0aCA+Pj4gMDtcclxuICAgICAgaWYgKGxlbiA9PT0gMCkge1xyXG4gICAgICAgIHJldHVybiAtMTtcclxuICAgICAgfVxyXG4gICAgICB2YXIgbiA9ICtmcm9tSW5kZXggfHwgMDtcclxuICAgICAgaWYgKE1hdGguYWJzKG4pID09PSBJbmZpbml0eSkge1xyXG4gICAgICAgIG4gPSAwO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChuID49IGxlbikge1xyXG4gICAgICAgIHJldHVybiAtMTtcclxuICAgICAgfVxyXG4gICAgICBrID0gTWF0aC5tYXgobiA+PSAwID8gbiA6IGxlbiAtIE1hdGguYWJzKG4pLCAwKTtcclxuICAgICAgd2hpbGUgKGsgPCBsZW4pIHtcclxuICAgICAgICBpZiAoayBpbiBPICYmIE9ba10gPT09IHNlYXJjaEVsZW1lbnQpIHtcclxuICAgICAgICAgIHJldHVybiBrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBrKys7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIC0xO1xyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8vIGlmICh0eXBlb2YgT2JqZWN0LmFzc2lnbiAhPSAnZnVuY3Rpb24nKSB7XHJcbiAgLy8gICBPYmplY3QuYXNzaWduID0gZnVuY3Rpb24gKHRhcmdldCwgdmFyQXJncykgeyAvLyAubGVuZ3RoIG9mIGZ1bmN0aW9uIGlzIDJcclxuICAvLyAgICAgJ3VzZSBzdHJpY3QnO1xyXG4gIC8vICAgICBpZiAodGFyZ2V0ID09IG51bGwpIHsgLy8gVHlwZUVycm9yIGlmIHVuZGVmaW5lZCBvciBudWxsXHJcbiAgLy8gICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQ2Fubm90IGNvbnZlcnQgdW5kZWZpbmVkIG9yIG51bGwgdG8gb2JqZWN0Jyk7XHJcbiAgLy8gICAgIH1cclxuXHJcbiAgLy8gICAgIHZhciB0byA9IE9iamVjdCh0YXJnZXQpO1xyXG5cclxuICAvLyAgICAgZm9yICh2YXIgaW5kZXggPSAxOyBpbmRleCA8IGFyZ3VtZW50cy5sZW5ndGg7IGluZGV4KyspIHtcclxuICAvLyAgICAgICB2YXIgbmV4dFNvdXJjZSA9IGFyZ3VtZW50c1tpbmRleF07XHJcblxyXG4gIC8vICAgICAgIGlmIChuZXh0U291cmNlICE9IG51bGwpIHsgLy8gU2tpcCBvdmVyIGlmIHVuZGVmaW5lZCBvciBudWxsXHJcbiAgLy8gICAgICAgICBmb3IgKHZhciBuZXh0S2V5IGluIG5leHRTb3VyY2UpIHtcclxuICAvLyAgICAgICAgICAgLy8gQXZvaWQgYnVncyB3aGVuIGhhc093blByb3BlcnR5IGlzIHNoYWRvd2VkXHJcbiAgLy8gICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobmV4dFNvdXJjZSwgbmV4dEtleSkpIHtcclxuICAvLyAgICAgICAgICAgICB0b1tuZXh0S2V5XSA9IG5leHRTb3VyY2VbbmV4dEtleV07XHJcbiAgLy8gICAgICAgICAgIH1cclxuICAvLyAgICAgICAgIH1cclxuICAvLyAgICAgICB9XHJcbiAgLy8gICAgIH1cclxuICAvLyAgICAgcmV0dXJuIHRvO1xyXG4gIC8vICAgfTtcclxuICAvLyB9XHJcblxyXG4gIC8vIGh0dHA6Ly9wYXVsaXJpc2guY29tLzIwMTEvcmVxdWVzdGFuaW1hdGlvbmZyYW1lLWZvci1zbWFydC1hbmltYXRpbmcvXHJcbiAgLy8gaHR0cDovL215Lm9wZXJhLmNvbS9lbW9sbGVyL2Jsb2cvMjAxMS8xMi8yMC9yZXF1ZXN0YW5pbWF0aW9uZnJhbWUtZm9yLXNtYXJ0LWVyLWFuaW1hdGluZ1xyXG4gIC8vIHJlcXVlc3RBbmltYXRpb25GcmFtZSBwb2x5ZmlsbCBieSBFcmlrIE3DtmxsZXIuIGZpeGVzIGZyb20gUGF1bCBJcmlzaCBhbmQgVGlubyBaaWpkZWxcclxuICAvLyBNSVQgbGljZW5zZVxyXG5cclxuICAoZnVuY3Rpb24oKSB7XHJcbiAgICB2YXIgbGFzdFRpbWUgPSAwO1xyXG4gICAgdmFyIHZlbmRvcnMgPSBbJ21zJywgJ21veicsICd3ZWJraXQnLCAnbyddO1xyXG4gICAgZm9yKHZhciB4ID0gMDsgeCA8IHZlbmRvcnMubGVuZ3RoICYmICF3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lOyArK3gpIHtcclxuICAgICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSA9IHdpbmRvd1t2ZW5kb3JzW3hdKydSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXTtcclxuICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gd2luZG93W3ZlbmRvcnNbeF0rJ0NhbmNlbEFuaW1hdGlvbkZyYW1lJ11cclxuICAgICAgICB8fCB3aW5kb3dbdmVuZG9yc1t4XSsnQ2FuY2VsUmVxdWVzdEFuaW1hdGlvbkZyYW1lJ107XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCF3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKVxyXG4gICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gZnVuY3Rpb24oY2FsbGJhY2ssIGVsZW1lbnQpIHtcclxuICAgICAgICB2YXIgY3VyclRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxuICAgICAgICB2YXIgdGltZVRvQ2FsbCA9IE1hdGgubWF4KDAsIDE2IC0gKGN1cnJUaW1lIC0gbGFzdFRpbWUpKTtcclxuICAgICAgICB2YXIgaWQgPSB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHsgY2FsbGJhY2soY3VyclRpbWUgKyB0aW1lVG9DYWxsKTsgfSxcclxuICAgICAgICAgIHRpbWVUb0NhbGwpO1xyXG4gICAgICAgIGxhc3RUaW1lID0gY3VyclRpbWUgKyB0aW1lVG9DYWxsO1xyXG4gICAgICAgIHJldHVybiBpZDtcclxuICAgICAgfTtcclxuXHJcbiAgICBpZiAoIXdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSlcclxuICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gZnVuY3Rpb24oaWQpIHtcclxuICAgICAgICBjbGVhclRpbWVvdXQoaWQpO1xyXG4gICAgICB9O1xyXG4gIH0oKSk7XHJcblxyXG5cclxuICAvKipcclxuICAgKiBQVUJMSUMgTUVUSE9EUy5cclxuICAgKiBcclxuICAgKi9cclxuXHJcbiAgcmV0dXJuIHtcclxuXHJcbiAgICAvLyBFbnRyeSBwb2ludCB0byBjcmVhdGUgbmV3IHNsaWRlIGluc3RhbmNlLlxyXG4gICAgZ2V0SW5zdGFuY2U6IGZ1bmN0aW9uKCAgb3B0aW9ucyApIHtcclxuICAgICAgdmFyIGkgPSBuZXcgRGlhcFBhcnQoKTtcclxuICAgICAgaS5pbml0KCBvcHRpb25zICk7XHJcbiAgICAgIHJldHVybiBpO1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBDYWxsIGl0IHRvIGV4dGVuZCBjb3JlLlxyXG4gICAgcmVnaXN0ZXJNb2RlOiBmdW5jdGlvbiAoIG5hbWUsIHBhcmFtICkge1xyXG5cclxuICAgICAgLy8gQ2hlY2sgaWYgbW9kZSdzIG5hbWUgaXMgZnJlZS5cclxuICAgICAgaWYgKCBkZWZhdWx0cy5tb2Rlc1tuYW1lXSApIHRocm93IG5ldyBFcnJvciggXCJOYW1lIHNwYWNlIGZvciAnXCIgKyBuYW1lICsgXCInIGFscmVhZHkgZXhpc3QuIENob29zZSBhbiBvdGhlciBtb2R1bGUgbmFtZS5cIiApO1xyXG5cclxuICAgICAgLy8gUmVnaXN0ZXIgbmV3IG1vZGUuXHJcbiAgICAgIGRlZmF1bHRzLm1vZGVzW25hbWVdID0gdHJ1ZTtcclxuXHJcbiAgICAgIC8vIEV4dGVuZCBkZWZhdWx0cywgUGFydGljbGVzIGFuZCBNYXRyaXggY2xhc3MuXHJcbiAgICAgIGZuLnNpbXBsZUV4dGVuZCggZGVmYXVsdHMsIHBhcmFtLm9wdGlvbnMgKTtcclxuICAgICAgZm4uc2ltcGxlRXh0ZW5kKCBEaWFwUGFydC5wcm90b3R5cGUsIHBhcmFtLnByb3RvICk7XHJcbiAgICAgIGZuLnNpbXBsZUV4dGVuZCggUGFydGljbGUucHJvdG90eXBlLCBwYXJhbS5wcm90b19wYXJ0aWNsZXMgKTtcclxuICAgICAgZm4uc2ltcGxlRXh0ZW5kKCBNYXRyaXgucHJvdG90eXBlLCBwYXJhbS5wcm90b19tYXRyaXggKTtcclxuICAgICAgXHJcbiAgICAgIC8vIFJlZ2lzdGVyIG5ldyBtb2RlIGZpbHRlcnMsIHByb2NlZWQgYW5kIG1hdHJpeE1ldGhvZC5cclxuICAgICAgZmlsdGVyc1tuYW1lXSA9IHBhcmFtLnNjZW5hcmlvLmZpbHRlcnM7XHJcbiAgICAgIHByb2NlZWRbbmFtZV0gPSBwYXJhbS5zY2VuYXJpby5wcm9jZWVkO1xyXG4gICAgICBtYXRyaXhNZXRob2RbbmFtZV0gPSBwYXJhbS5zY2VuYXJpby5tYXRyaXhNZXRob2Q7XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbn0pKHRoaXMsIHRoaXMuZG9jdW1lbnQpOyIsInNsaWRlUGFydGljbGVzLnJlZ2lzdGVyTW9kZSggJ21vZGVDb2xvcicsIHtcclxuICBvcHRpb25zOiB7fSxcclxuICBwcm90bzoge30sXHJcbiAgcHJvdG9fcGFydGljbGVzOiB7XHJcbiAgICBzb3VtaXNDb2xvcjogZnVuY3Rpb24oKXtcclxuICAgICAgdGhpcy5pbkZvcm0gPSAwO1xyXG4gICAgICB2YXIgdGVzdFggPSBNYXRoLmZsb29yKCB0aGlzLnBvc2l0aW9uLnggKTtcclxuICAgICAgdmFyIHRlc3RZID0gTWF0aC5mbG9vciggdGhpcy5wb3NpdGlvbi55ICk7XHJcbiAgICAgIHRoaXMuY29sb3IgPSAoIHRoaXMuaW5zdGFuY2UuYWN0aXZlSW5kZXggIT09IG51bGwgKSA/IHRoaXMuaW5zdGFuY2UubWF0cml4VGFiW3RoaXMuaW5zdGFuY2UuYWN0aXZlSW5kZXhdLmdldE1hdHJpeCgpW3Rlc3RYXVt0ZXN0WV0gOiB0aGlzLmluc3RhbmNlLnNldHRpbmdzLnBhcnRpY2xlQ29sb3I7XHJcbiAgICB9XHJcbiAgfSxcclxuICBwcm90b19tYXRyaXg6IHtcclxuICAgIGNvbG9yTWF0cml4OiBmdW5jdGlvbiAoIG1hdHJpeCApIHtcclxuXHJcbiAgICAgIHZhciBpLCBqLCByLCBnLCBiLCBwID0gdGhpcy5jb250ZXh0LmdldEltYWdlRGF0YSggMCwgMCwgdGhpcy5pbnN0YW5jZS5jYW52YXMud2lkdGgsIHRoaXMuaW5zdGFuY2UuY2FudmFzLmhlaWdodCApLmRhdGE7XHJcblxyXG4gICAgICBmb3IoIGkgPSAwOyBpIDwgdGhpcy5jYW52YXMud2lkdGg7IGkrKyApe1xyXG4gICAgICAgIGZvciggaiA9IDA7IGogPCB0aGlzLmNhbnZhcy5oZWlnaHQ7IGorKyApe1xyXG4gICAgICAgICAgciA9IHBbKCh0aGlzLmluc3RhbmNlLmNhbnZhcy53aWR0aCAqIGopICsgaSkgKiA0XTtcclxuICAgICAgICAgIGcgPSBwWygodGhpcy5pbnN0YW5jZS5jYW52YXMud2lkdGggKiBqKSArIGkpICogNCArIDFdO1xyXG4gICAgICAgICAgYiA9IHBbKCh0aGlzLmluc3RhbmNlLmNhbnZhcy53aWR0aCAqIGopICsgaSkgKiA0ICsgMl07XHJcbiAgICAgICAgICBtYXRyaXhbaV1bal0gPSAncmdiYSgnICsgciArICcsICcgKyBnICsgJywgJyArIGIgKyAnLCAxKSc7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxuICBmaWx0ZXI6IHt9LFxyXG4gIHNjZW5hcmlvOiB7XHJcbiAgICBmaWx0ZXJzOiB7XHJcbiAgICAgIG5hbWU6IG51bGwsXHJcbiAgICAgIHBhcmFtOiBudWxsXHJcbiAgICB9LFxyXG4gICAgcHJvY2VlZDogWydzb3VtaXNDaGFtcCcsICdzb3VtaXNDb2xvciddLFxyXG4gICAgbWF0cml4TWV0aG9kOiAnY29sb3JNYXRyaXgnXHJcbiAgfVxyXG59KTsiXX0=
