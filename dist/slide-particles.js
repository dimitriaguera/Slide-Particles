

var slideParticles = function (window, document, undefined) {

  "use strict";

  var fn,
      filter,
      proceed,
      modes,
      filters,
      nextSlideAnim,
      matrixMethod,
      oo = {},
      getProto = Object.getPrototypeOf,


  // Defaults settings.
  defaults = {
    height: 500,
    width: 500,
    background: '#fff',
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
    initialMode: 'modeShape',
    draw: false,
    stop: false,
    switchModeCallback: null,
    nextSlideAnim: 'drawMeAndExplode',
    modes: {
      modeForm: true
    }
  };

  /**
   * All registered modes.
   * 
   * Structure must be respected :
   * {
   *    modeName: {
   *        filters: {
   *            name: filterName - type string,
   *            param: [param1, param2...] - type array
   *        }
   *        proceed: [particleMethod1, particleMethod2...] - type array,
   *        matrixMethod: matrixMethodName - type string
   *    }  
   * }
   * 
   **** FILTERS
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
   * 
   **** PROCEED
   * For each mode, register all methods to apply for eache Particles instance in the loop.
   * Must be a Particles method.
   * -----> see DiapPart.prototype.partProceed
   * 
   * 
   **** MATRIXMETHOD
   * For each mode, register the Matrix method called to create the matrix (2 dimentional array).
   * 
   */
  modes = {};

  /**
   * All image filters functions.
   * 
   */
  filter = {};

  /**
   * All slide transition functions.
   * 
   */
  nextSlideAnim = {};

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
      for (var mode in modes) {
        if (!this.instance.settings.modes[mode]) continue;
        m = this.creaMatrix();
        this.applyFilter(modes[mode].filters.name, this.instance.settings[modes[mode].filters.param]);
        this[modes[mode].matrixMethod](m, 1);
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

    // Create canvas thumbnails of the picture store on this Matrix.
    renderThumbnails: function (target, filter) {
      var self = this;

      // Create new Matrix for this thumb.
      var m = new Matrix(this.instance, this.picture, { w: this.instance.settings.thumbWidth, h: this.instance.settings.thumbHeight });

      // Apply filter.
      if (filter) {
        m.applyFilter(modes[this.instance.mode].filters.name, this.settings[modes[this.instance.mode].filters.param]);
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

    // Create and return new Vector instance. Usefull for Particles methods extends via registerMode.
    getNewVector: function (x, y) {
      return new Vector(x, y);
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
          proceed = modes[this.mode].proceed,
          l = proceed.length;
      for (i = 0; i < l; i++) {
        particle[proceed[i]]();
      }
    },

    // Set activeIndex to matrix's thumb index.
    goTo: function (matrix) {
      this.callNextSlideAnim();
      this.activeIndex = this.thumbOriginalTab.indexOf(matrix);
    },

    // Method to add new switch matrix function.
    registerNextSlideAnim: function (name, fn) {
      if (typeof fn !== 'function' || typeof name !== 'string') {
        return console.log('Error, name required and must be type string, fn required and must be type function');
      }
      nextSlideAnim[name] = fn;
    },

    // Function called between old and new matrix active.
    callNextSlideAnim: function () {
      try {
        nextSlideAnim[this.settings.nextSlideAnim].call(this);
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

  // Mass constructor.
  function Mass(point, mass) {
    this.position = point;
    this.setMass(mass);
  }

  Mass.prototype.setMass = function (mass) {
    this.mass = mass || 0;
    this.color = mass < 0 ? "#f00" : "#0f0";
  };

  /**
   * Utility functions.
   * 
   */
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

      // Extend defaults, filter, Particles and Matrix class.
      fn.simpleExtend(defaults, param.options);
      fn.simpleExtend(filter, param.filter);
      fn.simpleExtend(DiapPart.prototype, param.proto);
      fn.simpleExtend(Particle.prototype, param.proto_particles);
      fn.simpleExtend(Matrix.prototype, param.proto_matrix);

      // Register new mode filters, proceed and matrixMethod.
      modes[name] = param.modeData;
    },

    // Call it to extend nextSlideAnim.
    registerTransition: function (obj) {
      fn.simpleExtend(nextSlideAnim, obj);
    }
  };
}(this, this.document);
slideParticles.registerMode('modeShape', {
  options: {
    thresholdNB: [128]
  },
  proto: {},
  proto_particles: {
    // Proceed particle according to matrix of type 'value'. Called in modeForm.
    soumisForm: function () {

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
          this.vitesse = this.instance.getNewVector(this.vitesse.x * 0.2, this.vitesse.y * 0.2);

          // Cut the acceleration.
          this.acceleration = this.instance.getNewVector(0, 0);
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
    }
  },
  proto_matrix: {
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
    }
  },
  filter: {
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
  },
  modeData: {
    filters: {
      name: 'blackAndWhite',
      param: 'thresholdNB'
    },
    proceed: ['soumisChamp', 'soumisForm'],
    matrixMethod: 'valueMatrix'
  }
});
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
  modeData: {
    filters: {
      name: null,
      param: null
    },
    proceed: ['soumisChamp', 'soumisColor'],
    matrixMethod: 'colorMatrix'
  }
});
slideParticles.registerTransition({

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
      },
      // Other custom anim.
      drawMeAndExplode: function (delay) {
            var self = this;
            var d = delay || this.settings.delay;

            // Make free parts from their inShape value.
            this.clearParts();
            this.switchMode('modeShape');
            // Particles are free from matrix of type 'value'.
            this.liberation = !this.liberation;

            //this.settings.draw = false;
            self.settings.draw = true;

            setTimeout(function () {
                  self.switchMode('modeColor');
            }, d);
      }
});
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUuanMiLCJzaGFwZS5qcyIsImNvbG9yLmpzIiwidHJhbnNpdGlvbnMuanMiXSwibmFtZXMiOlsic2xpZGVQYXJ0aWNsZXMiLCJ3aW5kb3ciLCJkb2N1bWVudCIsInVuZGVmaW5lZCIsImZuIiwiZmlsdGVyIiwicHJvY2VlZCIsIm1vZGVzIiwiZmlsdGVycyIsIm5leHRTbGlkZUFuaW0iLCJtYXRyaXhNZXRob2QiLCJvbyIsImdldFByb3RvIiwiT2JqZWN0IiwiZ2V0UHJvdG90eXBlT2YiLCJkZWZhdWx0cyIsImhlaWdodCIsIndpZHRoIiwiYmFja2dyb3VuZCIsInRhcmdldEVsZW1lbnQiLCJpbnB1dEZpbGVJRCIsInRodW1kbmFpbHNJRCIsInBhbmVsSUQiLCJ0aHVtYldpZHRoIiwidGh1bWJIZWlnaHQiLCJ0ZXh0IiwibWFzcyIsImFudGlNYXNzIiwiaG92ZXJNYXNzIiwiZGVuc2l0eSIsInBhcnRpY2xlU2l6ZSIsInBhcnRpY2xlQ29sb3IiLCJ0ZXh0Q29sb3IiLCJmb250IiwiZm9udFNpemUiLCJpbml0aWFsVmVsb2NpdHkiLCJtYXNzWCIsIm1hc3NZIiwiZGVsYXkiLCJpbml0aWFsTW9kZSIsImRyYXciLCJzdG9wIiwic3dpdGNoTW9kZUNhbGxiYWNrIiwibW9kZUZvcm0iLCJNYXRyaXgiLCJpbnN0YW5jZSIsImlucHV0IiwiY3VzdG9tU2l6ZSIsInR5cGUiLCJwaWN0dXJlIiwiY2FudmFzIiwiZ2V0Q2FudmFzIiwiY29udGV4dCIsImdldENvbnRleHQyRCIsInNpemUiLCJnZXRJbWFnZVNpemUiLCJ4IiwieSIsInciLCJoIiwibWF0cml4IiwiYnVpbGRBbGxNYXRyaXgiLCJwcm90b3R5cGUiLCJjbGVhciIsImNsZWFyUmVjdCIsImdldFBpeGVscyIsImRyYXdJbWFnZSIsInNldFRleHQiLCJnZXRJbWFnZURhdGEiLCJjbGVhcmVkIiwidHJpbSIsImNsZWFyTWF0cml4IiwiaSIsImxpbmVzIiwic3BsaXQiLCJzZXR0aW5ncyIsImZpbGxTdHlsZSIsInRleHRBbGlnbiIsImxlbmd0aCIsImZpbGxUZXh0IiwiTWF0aCIsIm1heCIsImZsb29yIiwibWVhc3VyZVRleHQiLCJhcHBseUZpbHRlciIsIm5hbWUiLCJhcmdBcnJheSIsInAiLCJhcmdzIiwicGl4ZWxzIiwicHVzaCIsImFwcGx5IiwicHV0SW1hZ2VEYXRhIiwibSIsIm1BIiwibW9kZSIsImNyZWFNYXRyaXgiLCJwYXJhbSIsImdldE1hdHJpeCIsImEiLCJiIiwibWF0IiwiQXJyYXkiLCJqIiwidmFsdWUiLCJsIiwidiIsInJlbmRlclRodW1ibmFpbHMiLCJ0YXJnZXQiLCJzZWxmIiwic3R5bGUiLCJjdXJzb3IiLCJvbmNsaWNrIiwiZSIsImdvVG8iLCJ0aHVtYk9yaWdpbmFsVGFiIiwiYXBwZW5kIiwiRGlhcFBhcnQiLCJzaW1wbGVFeHRlbmQiLCJtYXRyaXhUYWIiLCJwYXJ0aWNsZXMiLCJjaGFtcHMiLCJtYXNzQWN0aXZlIiwibGliZXJhdGlvbiIsImFjdGl2ZUluZGV4IiwiaW5pdCIsIm9wdGlvbnMiLCJiYWNrZ3JvdW5kQ29sb3IiLCJjZW50ZXJNYXNzIiwiTWFzcyIsIlZlY3RvciIsImxvb3AiLCJzZXQiLCJjcmVhdGVTbGlkZSIsImdldE5ld1ZlY3RvciIsImNyZWF0ZUVsZW1lbnQiLCJzIiwiZ2V0Q29udGV4dCIsImltZyIsImN3IiwiY2giLCJyYXRpbyIsInJvdW5kIiwibG9hZCIsInRodW1iIiwiZmlsZXMiLCJ0aCIsImNvbnN0cnVjdG9yIiwiRmlsZUxpc3QiLCJjb25zb2xlIiwibG9nIiwiZmlsZSIsIm1hdGNoIiwicmVhZGVyIiwiRmlsZVJlYWRlciIsIm9ubG9hZCIsImV2ZW50Iiwic3JjIiwicmVzdWx0IiwibG9hZEltYWdlIiwiY2FsbCIsInJlYWRBc0RhdGFVUkwiLCJzd2l0Y2hNb2RlIiwiYWRkTWFzcyIsInBhcnRQcm9jZWVkIiwicGFydGljbGUiLCJjYWxsTmV4dFNsaWRlQW5pbSIsImluZGV4T2YiLCJyZWdpc3Rlck5leHRTbGlkZUFuaW0iLCJtZXNzYWdlIiwiY3JlYVBhcnRzIiwibmIiLCJQYXJ0aWNsZSIsInJhbmRvbSIsInJlYWxSYW5kb20iLCJ1cGdyYWRlUGFydHMiLCJjdXJyZW50UGFydHMiLCJwb3MiLCJwb3NpdGlvbiIsIm1vdmUiLCJkcmF3UGFydHMiLCJuIiwiY29sb3IiLCJmaWxsUmVjdCIsImNsZWFyUGFydHMiLCJpbkZvcm0iLCJxdWV1ZSIsInJlcXVlc3RJRCIsInJlcXVlc3RBbmltYXRpb25GcmFtZSIsImJpbmQiLCJjYW5jZWxBbmltYXRpb25GcmFtZSIsInVwZGF0ZSIsInN0YXJ0IiwiY29zIiwiUEkiLCJhZGQiLCJ2ZWN0b3IiLCJnZXRJbnZlcnQiLCJnZXRNYWduaXR1ZGUiLCJzcXJ0IiwiZ2V0QW5nbGUiLCJhdGFuMiIsImZyb21BbmdsZSIsImFuZ2xlIiwibWFnbml0dWRlIiwic2luIiwidml0ZXNzZSIsImFjY2VsZXJhdGlvbiIsInNvdW1pc0NoYW1wIiwidG90YWxBY2NlbGVyYXRpb25YIiwidG90YWxBY2NlbGVyYXRpb25ZIiwiZGlzdFgiLCJkaXN0WSIsImZvcmNlIiwicG93IiwicG9pbnQiLCJzZXRNYXNzIiwiZ2V0Vmlld3BvcnQiLCJkb2N1bWVudEVsZW1lbnQiLCJjbGllbnRXaWR0aCIsImlubmVyV2lkdGgiLCJjbGllbnRIZWlnaHQiLCJpbm5lckhlaWdodCIsImVsZW1lbnQiLCJnZXRFbGVtZW50QnlJZCIsImFwcGVuZENoaWxkIiwiaXNQbGFpbk9iamVjdCIsInByb3RvIiwiQ3RvciIsInRvU3RyaW5nIiwiaGFzT3duUHJvcGVydHkiLCJjbG9uZSIsImNvcHkiLCJpc0FuQXJyYXkiLCJrZXkiLCJpc0FycmF5IiwiSW1hZ2UiLCJnZXRJbnN0YW5jZSIsInJlZ2lzdGVyTW9kZSIsIkVycm9yIiwicHJvdG9fcGFydGljbGVzIiwicHJvdG9fbWF0cml4IiwibW9kZURhdGEiLCJyZWdpc3RlclRyYW5zaXRpb24iLCJvYmoiLCJ0aHJlc2hvbGROQiIsInNvdW1pc0Zvcm0iLCJ0ZXN0WCIsInRlc3RZIiwidmFsdWVNYXRyaXgiLCJtaW4iLCJjIiwiZCIsImRhdGEiLCJwaXgiLCJibGFja0FuZFdoaXRlIiwidGhyZXNob2xkIiwiciIsImciLCJzb3VtaXNDb2xvciIsImNvbG9yTWF0cml4IiwibGliZXJhdGlvblBhcnRzIiwic2V0VGltZW91dCIsImRyYXdNZUFuZEV4cGxvZGUiXSwibWFwcGluZ3MiOiI7O0FBRUEsSUFBSUEsaUJBQWtCLFVBQVVDLE1BQVYsRUFBa0JDLFFBQWxCLEVBQTRCQyxTQUE1QixFQUF1Qzs7QUFFekQ7O0FBRUEsTUFBSUMsRUFBSjtBQUFBLE1BQVFDLE1BQVI7QUFBQSxNQUFnQkMsT0FBaEI7QUFBQSxNQUF5QkMsS0FBekI7QUFBQSxNQUFnQ0MsT0FBaEM7QUFBQSxNQUF5Q0MsYUFBekM7QUFBQSxNQUF3REMsWUFBeEQ7QUFBQSxNQUFzRUMsS0FBSyxFQUEzRTtBQUFBLE1BQStFQyxXQUFXQyxPQUFPQyxjQUFqRzs7O0FBRUE7QUFDQUMsYUFBVztBQUNUQyxZQUFRLEdBREM7QUFFVEMsV0FBTyxHQUZFO0FBR1RDLGdCQUFZLE1BSEg7QUFJVEMsbUJBQWUsV0FKTjtBQUtUQyxpQkFBYSxjQUxKO0FBTVRDLGtCQUFjLFVBTkw7QUFPVEMsYUFBUyxtQkFQQTtBQVFUQyxnQkFBWSxHQVJIO0FBU1RDLGlCQUFhLEdBVEo7QUFVVEMsVUFBSyxlQVZJO0FBV1RDLFVBQU0sR0FYRztBQVlUQyxjQUFVLENBQUMsR0FaRjtBQWFUQyxlQUFXLElBYkY7QUFjVEMsYUFBUyxJQWRBO0FBZVRDLGtCQUFjLENBZkw7QUFnQlRDLG1CQUFlLE1BaEJOO0FBaUJUQyxlQUFXLE1BakJGO0FBa0JUQyxVQUFNLE9BbEJHO0FBbUJUQyxjQUFVLEVBbkJEO0FBb0JUQyxxQkFBaUIsQ0FwQlI7QUFxQlRDLFdBQU8sR0FyQkU7QUFzQlRDLFdBQU8sR0F0QkU7QUF1QlRDLFdBQU8sR0F2QkU7QUF3QlRDLGlCQUFhLFdBeEJKO0FBeUJUQyxVQUFNLEtBekJHO0FBMEJUQyxVQUFNLEtBMUJHO0FBMkJUQyx3QkFBb0IsSUEzQlg7QUE0QlRq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dmFyIHNsaWRlUGFydGljbGVzID0gKGZ1bmN0aW9uICh3aW5kb3csIGRvY3VtZW50LCB1bmRlZmluZWQpIHtcclxuXHJcbiAgICBcInVzZSBzdHJpY3RcIjtcclxuXHJcbiAgICB2YXIgZm4sIGZpbHRlciwgcHJvY2VlZCwgbW9kZXMsIGZpbHRlcnMsIG5leHRTbGlkZUFuaW0sIG1hdHJpeE1ldGhvZCwgb28gPSB7fSwgZ2V0UHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YsXHJcbiAgICBcclxuICAgIC8vIERlZmF1bHRzIHNldHRpbmdzLlxyXG4gICAgZGVmYXVsdHMgPSB7XHJcbiAgICAgIGhlaWdodDogNTAwLFxyXG4gICAgICB3aWR0aDogNTAwLFxyXG4gICAgICBiYWNrZ3JvdW5kOiAnI2ZmZicsXHJcbiAgICAgIHRhcmdldEVsZW1lbnQ6ICdkcC1jYW52YXMnLFxyXG4gICAgICBpbnB1dEZpbGVJRDogJ2RwLWZpbGVpbnB1dCcsXHJcbiAgICAgIHRodW1kbmFpbHNJRDogJ2RwLXRodW1iJyxcclxuICAgICAgcGFuZWxJRDogJ2RwLXBhbmVsLXNldHRpbmdzJyxcclxuICAgICAgdGh1bWJXaWR0aDogMTAwLFxyXG4gICAgICB0aHVtYkhlaWdodDogMTAwLFxyXG4gICAgICB0ZXh0OidIZWxsbyBXb3JsZCAhJyxcclxuICAgICAgbWFzczogMTAwLFxyXG4gICAgICBhbnRpTWFzczogLTUwMCxcclxuICAgICAgaG92ZXJNYXNzOiA1MDAwLFxyXG4gICAgICBkZW5zaXR5OiAxNTAwLFxyXG4gICAgICBwYXJ0aWNsZVNpemU6IDEsXHJcbiAgICAgIHBhcnRpY2xlQ29sb3I6ICcjMDAwJyxcclxuICAgICAgdGV4dENvbG9yOiAnI2ZmZicsXHJcbiAgICAgIGZvbnQ6ICdBcmlhbCcsXHJcbiAgICAgIGZvbnRTaXplOiA0MCxcclxuICAgICAgaW5pdGlhbFZlbG9jaXR5OiAzLFxyXG4gICAgICBtYXNzWDogODgwLFxyXG4gICAgICBtYXNzWTogMzcwLFxyXG4gICAgICBkZWxheTogNzAwLFxyXG4gICAgICBpbml0aWFsTW9kZTogJ21vZGVTaGFwZScsXHJcbiAgICAgIGRyYXc6IGZhbHNlLFxyXG4gICAgICBzdG9wOiBmYWxzZSxcclxuICAgICAgc3dpdGNoTW9kZUNhbGxiYWNrOiBudWxsLFxyXG4gICAgICBuZXh0U2xpZGVBbmltOiAnZHJhd01lQW5kRXhwbG9kZScsXHJcbiAgICAgIG1vZGVzOiB7XHJcbiAgICAgICAgbW9kZUZvcm06IHRydWUsXHJcbiAgICAgIH0gXHJcbiAgICB9O1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQWxsIHJlZ2lzdGVyZWQgbW9kZXMuXHJcbiAgICAgKiBcclxuICAgICAqIFN0cnVjdHVyZSBtdXN0IGJlIHJlc3BlY3RlZCA6XHJcbiAgICAgKiB7XHJcbiAgICAgKiAgICBtb2RlTmFtZToge1xyXG4gICAgICogICAgICAgIGZpbHRlcnM6IHtcclxuICAgICAqICAgICAgICAgICAgbmFtZTogZmlsdGVyTmFtZSAtIHR5cGUgc3RyaW5nLFxyXG4gICAgICogICAgICAgICAgICBwYXJhbTogW3BhcmFtMSwgcGFyYW0yLi4uXSAtIHR5cGUgYXJyYXlcclxuICAgICAqICAgICAgICB9XHJcbiAgICAgKiAgICAgICAgcHJvY2VlZDogW3BhcnRpY2xlTWV0aG9kMSwgcGFydGljbGVNZXRob2QyLi4uXSAtIHR5cGUgYXJyYXksXHJcbiAgICAgKiAgICAgICAgbWF0cml4TWV0aG9kOiBtYXRyaXhNZXRob2ROYW1lIC0gdHlwZSBzdHJpbmdcclxuICAgICAqICAgIH0gIFxyXG4gICAgICogfVxyXG4gICAgICogXHJcbiAgICAgKioqKiBGSUxURVJTXHJcbiAgICAgKiBFYWNoIG1vZGVzIHJlZ2lzdGVyZWQgbmVlZCBhbiBlbnRyeSBvbiBmaWx0ZXJzIG9iamVjdC5cclxuICAgICAqIEl0IHBlcm1pdCB0byBjYWxsIGNvcnJlc3BvbmRpbmcgZmlsdGVyIGZ1bmN0aW9uIGZvciBlYWNoIG1vZGUgcmVnaXN0ZXJlZC5cclxuICAgICAqIFRoZSBjb3JyZXNwb25kaW5nIGZpbHRlciBmb25jdGlvbiBpcyBjYWxsZWQgd2hlbiBtYXRyaXggYXJlIGJ1aWx0LlxyXG4gICAgICogXHJcbiAgICAgKiBCeSBkZWZhdWx0LCB0aGVyZSBpcyBvbmx5IG9uZSBtb2RlIDogbW9kZUZvcm0uXHJcbiAgICAgKiBJZiBhIG1vZGUgZG9uJ3QgbmVlZCBmaWx0ZXIsIHNldCB7fSB0byB0aGUgbW9kZSBuYW1lIGVudHJ5LlxyXG4gICAgICogXHJcbiAgICAgKiBuYW1lIDogbmFtZSBvZiB0aGUgZmlsdGVyIGZ1bmN0aW9uIGF0dGFjaCB0byBmaWx0ZXIgb2JqZWN0LlxyXG4gICAgICogcGFyYW0gOiBrZXkgdGFyZ2V0dGluZyB0aGUgc2V0dGluZ3MgcGFyYW1ldGVyLCBwYXNzaW5nIGFzIGFyZ3VtZW50IHdoZW4gZmlsdGVyIGZ1bmN0aW9uIGlzIGNhbGxlZC4gTXVzdCBiZSBhbiBBcnJheSBpbiBzZXR0aW5ncy5cclxuICAgICAqIFxyXG4gICAgICogXHJcbiAgICAgKioqKiBQUk9DRUVEXHJcbiAgICAgKiBGb3IgZWFjaCBtb2RlLCByZWdpc3RlciBhbGwgbWV0aG9kcyB0byBhcHBseSBmb3IgZWFjaGUgUGFydGljbGVzIGluc3RhbmNlIGluIHRoZSBsb29wLlxyXG4gICAgICogTXVzdCBiZSBhIFBhcnRpY2xlcyBtZXRob2QuXHJcbiAgICAgKiAtLS0tLT4gc2VlIERpYXBQYXJ0LnByb3RvdHlwZS5wYXJ0UHJvY2VlZFxyXG4gICAgICogXHJcbiAgICAgKiBcclxuICAgICAqKioqIE1BVFJJWE1FVEhPRFxyXG4gICAgICogRm9yIGVhY2ggbW9kZSwgcmVnaXN0ZXIgdGhlIE1hdHJpeCBtZXRob2QgY2FsbGVkIHRvIGNyZWF0ZSB0aGUgbWF0cml4ICgyIGRpbWVudGlvbmFsIGFycmF5KS5cclxuICAgICAqIFxyXG4gICAgICovXHJcbiAgICBtb2RlcyA9IHt9O1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQWxsIGltYWdlIGZpbHRlcnMgZnVuY3Rpb25zLlxyXG4gICAgICogXHJcbiAgICAgKi9cclxuICAgIGZpbHRlciA9IHt9O1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQWxsIHNsaWRlIHRyYW5zaXRpb24gZnVuY3Rpb25zLlxyXG4gICAgICogXHJcbiAgICAgKi9cclxuICAgIG5leHRTbGlkZUFuaW0gPSB7fTtcclxuXHJcblxyXG4gIC8vIE1hdHJpeCBjbGFzcyBvYmplY3QuXHJcbiAgZnVuY3Rpb24gTWF0cml4ICggaW5zdGFuY2UsIGlucHV0LCBjdXN0b21TaXplICkge1xyXG4gICAgdGhpcy5pbnN0YW5jZSA9IGluc3RhbmNlO1xyXG4gICAgdGhpcy50eXBlID0gKCB0eXBlb2YgaW5wdXQgIT09ICdzdHJpbmcnICkgPyAncGljdHVyZScgOiAndGV4dCc7XHJcbiAgICB0aGlzLnBpY3R1cmUgPSBpbnB1dDtcclxuICAgIHRoaXMuY2FudmFzID0gdGhpcy5pbnN0YW5jZS5nZXRDYW52YXMoIGN1c3RvbVNpemUgKTtcclxuICAgIHRoaXMuY29udGV4dCA9IHRoaXMuaW5zdGFuY2UuZ2V0Q29udGV4dDJEKCB0aGlzLmNhbnZhcyApO1xyXG4gICAgdGhpcy5zaXplID0gKCB0eXBlb2YgaW5wdXQgIT09ICdzdHJpbmcnICkgPyB0aGlzLmluc3RhbmNlLmdldEltYWdlU2l6ZSggaW5wdXQsIGN1c3RvbVNpemUgKSA6IHt4OjAsIHk6MCwgdzowLCBoOjB9O1xyXG4gICAgdGhpcy5tYXRyaXggPSB0aGlzLmJ1aWxkQWxsTWF0cml4KCk7XHJcbiAgfVxyXG5cclxuICBNYXRyaXgucHJvdG90eXBlID0ge1xyXG5cclxuICAgIC8vIENsZWFyIG1hdHJpeCdzIGNhbnZhcy5cclxuICAgIGNsZWFyOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHRoaXMuY29udGV4dC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIFJldHVybiBtYXRyaXgncyBjYW52YSdzIGltYWdlIGRhdGEuXHJcbiAgICBnZXRQaXhlbHM6IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICAgIHRoaXMuY2xlYXIoKTtcclxuXHJcbiAgICAgIHN3aXRjaCAoIHRoaXMudHlwZSApIHtcclxuXHJcbiAgICAgICAgY2FzZSAncGljdHVyZSc6XHJcbiAgICAgICAgICB0aGlzLmNvbnRleHQuZHJhd0ltYWdlKCB0aGlzLnBpY3R1cmUsIHRoaXMuc2l6ZS54LCB0aGlzLnNpemUueSwgdGhpcy5zaXplLncsIHRoaXMuc2l6ZS5oICk7XHJcbiAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgY2FzZSAndGV4dCc6XHJcbiAgICAgICAgICB0aGlzLnNldFRleHQoKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiggIXRoaXMuc2l6ZS53ICYmICF0aGlzLnNpemUuaCApIHJldHVybiBmYWxzZTtcclxuXHJcbiAgICAgIHJldHVybiB0aGlzLmNvbnRleHQuZ2V0SW1hZ2VEYXRhKCB0aGlzLnNpemUueCwgdGhpcy5zaXplLnksIHRoaXMuc2l6ZS53LCB0aGlzLnNpemUuaCApO1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBEcmF3IHRleHQgaW4gY2FudmFzLlxyXG4gICAgc2V0VGV4dDogZnVuY3Rpb24gKCkge1xyXG5cclxuICAgICAgLy8gQ2xlYXIgdXNlbGVzcyBzcGFjZXMgaW4gc3RyaW5nIHRvIGRyYXcuXHJcbiAgICAgIHZhciBjbGVhcmVkID0gdGhpcy5waWN0dXJlLnRyaW0oKTtcclxuXHJcbiAgICAgIC8vIElmIHN0cmluZyBlbXB0eSwgc2V0IHNpemUgdG8gMCB0byBhdm9pZCBtYXRyaXggY2FsY3VsYXRpb24sIGFuZCBjbGVhciBtYXRyaXguXHJcbiAgICAgIGlmIChjbGVhcmVkID09PSBcIlwiKSB7XHJcbiAgICAgICAgdGhpcy5zaXplLnggPSAwO1xyXG4gICAgICAgIHRoaXMuc2l6ZS55ID0gMDtcclxuICAgICAgICB0aGlzLnNpemUudyA9IDA7XHJcbiAgICAgICAgdGhpcy5zaXplLmggPSAwO1xyXG4gICAgICAgIHRoaXMuY2xlYXJNYXRyaXgoKTtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHZhciBpLCB3ID0gMCwgeCA9IDIwLCB5ID0gODAsXHJcbiAgICAgICAgbGluZXMgPSB0aGlzLnBpY3R1cmUuc3BsaXQoXCJcXG5cIiksIC8vIFNwbGl0IHRleHQgaW4gYXJyYXkgZm9yIGVhY2ggZW5kIG9mIGxpbmUuXHJcbiAgICAgICAgZm9udFNpemUgPSB0aGlzLmluc3RhbmNlLnNldHRpbmdzLmZvbnRTaXplO1xyXG5cclxuICAgICAgdGhpcy5jb250ZXh0LmZvbnQgPSBmb250U2l6ZSArIFwicHggXCIgKyB0aGlzLmluc3RhbmNlLnNldHRpbmdzLmZvbnQ7XHJcbiAgICAgIHRoaXMuY29udGV4dC5maWxsU3R5bGUgPSB0aGlzLmluc3RhbmNlLnNldHRpbmdzLnRleHRDb2xvcjtcclxuICAgICAgdGhpcy5jb250ZXh0LnRleHRBbGlnbiA9IFwibGVmdFwiO1xyXG5cclxuICAgICAgLy8gRHJhdyBsaW5lIGJ5IGxpbmUuXHJcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHRoaXMuY29udGV4dC5maWxsVGV4dCggbGluZXNbaV0sIHgsIHkgKyBpKmZvbnRTaXplICk7XHJcbiAgICAgICAgdyA9IE1hdGgubWF4KCB3LCBNYXRoLmZsb29yKHRoaXMuY29udGV4dC5tZWFzdXJlVGV4dCggbGluZXNbaV0gKS53aWR0aCkgKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gU2V0IHNpemUgb2JqZWN0LCB0byBjYWxjdWxhdGUgdGFyZ2V0ZWQgem9uZSBvbiB0aGUgbWF0cml4LlxyXG4gICAgICB0aGlzLnNpemUueCA9IE1hdGgubWF4KCB4LCAgdGhpcy5zaXplLnggKTtcclxuICAgICAgdGhpcy5zaXplLnkgPSBNYXRoLm1heCggKHkgLSBmb250U2l6ZSksIHRoaXMuc2l6ZS55ICk7XHJcbiAgICAgIHRoaXMuc2l6ZS53ID0gTWF0aC5tYXgoICh3ICsgZm9udFNpemUpLCB0aGlzLnNpemUudyApO1xyXG4gICAgICB0aGlzLnNpemUuaCA9IE1hdGgubWF4KCAoZm9udFNpemUgKiBpICsgZm9udFNpemUpLCB0aGlzLnNpemUuaCApO1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBBcHBseSBmaWx0ZXIncyBuYW1lIHdpdGggYXJnQXJyYXkuXHJcbiAgICBhcHBseUZpbHRlcjogZnVuY3Rpb24gKCBuYW1lLCBhcmdBcnJheSApIHtcclxuXHJcbiAgICAgIHZhciBwID0gdGhpcy5nZXRQaXhlbHMoKTtcclxuXHJcbiAgICAgIC8vIElmIGZpbHRlciBkb2Vzbid0IGV4aXN0LCBvciBubyBuYW1lLCBzdG9wIHByb2Nlc3MuXHJcbiAgICAgIC8vaWYgKCBmaWx0ZXJbbmFtZV0gPT09IHVuZGVmaW5lZCApIHRocm93IG5ldyBFcnJvcihcImZpbHRlciAnXCIgKyBuYW1lICtcIicgZG9lcydudCBleGlzdCBhcyBmaWx0ZXJzIG1ldGhvZC5cIik7XHJcbiAgICAgIGlmICggIWZpbHRlcltuYW1lXSApIHJldHVybjtcclxuXHJcbiAgICAgIC8vIEdldCBpbWFnZSBkYXRhIHBpeGVscy5cclxuICAgICAgdmFyIGksIGFyZ3MgPSBbIHAgXTtcclxuICAgICAgdmFyIHBpeGVscztcclxuXHJcbiAgICAgIC8vIENvbnN0cnVjdCBhcmdzIGFycmF5LlxyXG4gICAgICBmb3IgKCBpID0gMDsgaSA8IGFyZ0FycmF5Lmxlbmd0aDsgaSsrICkge1xyXG4gICAgICAgIGFyZ3MucHVzaCggYXJnQXJyYXlbaV0gKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gQXBwbHkgZmlsdGVyLlxyXG4gICAgICBwID0gZmlsdGVyW25hbWVdLmFwcGx5KCBudWxsLCBhcmdzICk7XHJcblxyXG4gICAgICAvLyBTZXQgbmV3IGltYWdlIGRhdGEgb24gY2FudmFzLlxyXG4gICAgICB0aGlzLmNvbnRleHQucHV0SW1hZ2VEYXRhKCBwLCB0aGlzLnNpemUueCwgdGhpcy5zaXplLnkgKTtcclxuICAgIH0sXHJcblxyXG4gICAgLy8gQ3JlYXRlIGFuZCBzdG9yZSBvbmUgbWF0cml4IHBlciBtb2RlIHJlZ2lzdGVyZWQsIGlmIGluc3RhbmNlLnNldHRpbmdzLm1vZGVzW21vZGVfbmFtZV0gaXMgdHJ1ZS5cclxuICAgIGJ1aWxkQWxsTWF0cml4OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHZhciBtLCBtQSA9IHt9O1xyXG4gICAgICBmb3IgKCB2YXIgbW9kZSBpbiBtb2RlcyApIHtcclxuICAgICAgICBpZiAoICF0aGlzLmluc3RhbmNlLnNldHRpbmdzLm1vZGVzW21vZGVdICkgY29udGludWU7XHJcbiAgICAgICAgbSA9IHRoaXMuY3JlYU1hdHJpeCgpO1xyXG4gICAgICAgIHRoaXMuYXBwbHlGaWx0ZXIoIG1vZGVzW21vZGVdLmZpbHRlcnMubmFtZSwgdGhpcy5pbnN0YW5jZS5zZXR0aW5nc1ttb2Rlc1ttb2RlXS5maWx0ZXJzLnBhcmFtXSApO1xyXG4gICAgICAgIHRoaXNbbW9kZXNbbW9kZV0ubWF0cml4TWV0aG9kXShtLCAxKTtcclxuICAgICAgICBtQVttb2RlXSA9IG07XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIG1BO1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBSZXR1cm4gYWN0aXZlIG1hdHJpeC5cclxuICAgIGdldE1hdHJpeDogZnVuY3Rpb24oKXtcclxuICAgICAgcmV0dXJuIHRoaXMubWF0cml4W3RoaXMuaW5zdGFuY2UubW9kZV0gfHwgZmFsc2U7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIENyZWF0ZSBtYXRyaXguXHJcbiAgICBjcmVhTWF0cml4OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHZhciBhID0gdGhpcy5pbnN0YW5jZS5zZXR0aW5ncy53aWR0aCxcclxuICAgICAgICBiID0gdGhpcy5pbnN0YW5jZS5zZXR0aW5ncy5oZWlnaHQsXHJcbiAgICAgICAgbWF0ID0gbmV3IEFycmF5KCBhICksIGksIGo7XHJcbiAgICAgIGZvciggaSA9IDA7IGkgPCBhOyBpKysgKSB7XHJcbiAgICAgICAgbWF0W2ldID0gbmV3IEFycmF5KCBiICk7XHJcbiAgICAgICAgZm9yKCBqID0gMDsgaiA8IGI7IGorKyApe1xyXG4gICAgICAgICAgbWF0W2ldW2pdID0gMDtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIG1hdDtcclxuICAgIH0sXHJcblxyXG4gICAgLy8gU2V0IGFsbCBtYXRyaXggdmFsdWVzIHRvIHZhbHVlIG9yIDA7XHJcbiAgICBjbGVhck1hdHJpeDogZnVuY3Rpb24oIHZhbHVlICl7XHJcbiAgICAgIHZhciBpLCBqLCBsLCBtLCB2LFxyXG4gICAgICAgIG1hdHJpeCA9IHRoaXMuZ2V0TWF0cml4KCk7XHJcbiAgICAgIHYgPSB2YWx1ZSB8fCAwO1xyXG4gICAgICBsID0gbWF0cml4Lmxlbmd0aDtcclxuICAgICAgbSA9IG1hdHJpeFswXS5sZW5ndGg7XHJcbiAgICAgIGZvciggaSA9IDA7IGkgPCBsOyBpKysgKXtcclxuICAgICAgICBmb3IoIGogPSAwOyBqIDwgbTsgaisrICl7XHJcbiAgICAgICAgICBtYXRyaXhbaV1bal0gPSB2O1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICAvLyBDcmVhdGUgY2FudmFzIHRodW1ibmFpbHMgb2YgdGhlIHBpY3R1cmUgc3RvcmUgb24gdGhpcyBNYXRyaXguXHJcbiAgICByZW5kZXJUaHVtYm5haWxzOiBmdW5jdGlvbiAoIHRhcmdldCwgZmlsdGVyICkge1xyXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG4gICAgICAvLyBDcmVhdGUgbmV3IE1hdHJpeCBmb3IgdGhpcyB0aHVtYi5cclxuICAgICAgdmFyIG0gPSBuZXcgTWF0cml4ICggdGhpcy5pbnN0YW5jZSwgdGhpcy5waWN0dXJlLCB7IHc6dGhpcy5pbnN0YW5jZS5zZXR0aW5ncy50aHVtYldpZHRoLCBoOnRoaXMuaW5zdGFuY2Uuc2V0dGluZ3MudGh1bWJIZWlnaHQgfSApO1xyXG5cclxuICAgICAgLy8gQXBwbHkgZmlsdGVyLlxyXG4gICAgICBpZiAoIGZpbHRlciApIHtcclxuICAgICAgICBtLmFwcGx5RmlsdGVyKCBtb2Rlc1t0aGlzLmluc3RhbmNlLm1vZGVdLmZpbHRlcnMubmFtZSwgdGhpcy5zZXR0aW5nc1ttb2Rlc1t0aGlzLmluc3RhbmNlLm1vZGVdLmZpbHRlcnMucGFyYW1dICk7XHJcbiAgICAgIH1cclxuICAgICAgLy8gQXBwbHkgc3R5bGUuXHJcbiAgICAgIG0uY2FudmFzLnN0eWxlLmN1cnNvciA9ICdwb2ludGVyJztcclxuXHJcbiAgICAgIC8vIEFwcGx5IGNsaWNrIGV2ZW50IG9uIHRoZSB0aHVtYidzIGNhbnZhcyB0aGF0IGZpcmUgdGhlIERpYXBQYXJ0J3MgaW5zdGFuY2UgYWN0aXZlIGluZGV4IHRvIGNvcmVzcG9uZGluZyBNYXRyaXguXHJcbiAgICAgIG0uY2FudmFzLm9uY2xpY2sgPSBmdW5jdGlvbiggbWF0cml4ICl7XHJcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICggZSApIHtcclxuICAgICAgICAgIHNlbGYuaW5zdGFuY2UuZ29UbyggbWF0cml4ICk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KCBtICk7XHJcblxyXG4gICAgICAvLyBTdG9yZSBNYXRyaXgncyBpbnN0YW5jZSBvZiB0aGUgdGh1bWIgaW4gYW4gYXJyYXkuXHJcbiAgICAgIHRoaXMuaW5zdGFuY2UudGh1bWJPcmlnaW5hbFRhYi5wdXNoKCBtICk7XHJcblxyXG4gICAgICAvLyBJbmplY3QgdGh1bWIncyBjYW52YXMgaW4gdGhlIERPTS5cclxuICAgICAgZm4uYXBwZW5kKCB0YXJnZXQsIG0uY2FudmFzICk7XHJcblxyXG4gICAgICByZXR1cm4gbTtcclxuICAgIH1cclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBEaWFwUGFydCBjb25zdHJ1Y3Rvci5cclxuICAgKiBBIERpYXBQYXJldCBpbnN0YW5jZSBtdXN0IGJlIGNyZWF0ZWQgYW5kIGluaXRpYWxpemVkIHRvIGNyZWF0ZSBzbGlkZXNob3cuXHJcbiAgICpcclxuICAgKi9cclxuXHJcbiAgZnVuY3Rpb24gRGlhcFBhcnQgKCkge1xyXG4gICAgdGhpcy5zZXR0aW5ncyA9IGZuLnNpbXBsZUV4dGVuZCgge30sIGRlZmF1bHRzICk7XHJcbiAgICB0aGlzLm1hdHJpeFRhYiA9IFtdO1xyXG4gICAgdGhpcy50aHVtYk9yaWdpbmFsVGFiID0gW107XHJcbiAgICB0aGlzLnBhcnRpY2xlcyA9IFtdO1xyXG4gICAgdGhpcy5jaGFtcHMgPSBbXTtcclxuICAgIHRoaXMubWFzc0FjdGl2ZSA9IHRoaXMuc2V0dGluZ3MubWFzcztcclxuICAgIHRoaXMubW9kZSA9IHRoaXMuc2V0dGluZ3MuaW5pdGlhbE1vZGU7XHJcbiAgICB0aGlzLmxpYmVyYXRpb24gPSBmYWxzZTtcclxuICAgIHRoaXMuYWN0aXZlSW5kZXggPSBudWxsO1xyXG4gICAgdGhpcy5jYW52YXMgPSB0aGlzLmdldENhbnZhcygpO1xyXG4gICAgdGhpcy5jb250ZXh0ID0gdGhpcy5nZXRDb250ZXh0MkQoIHRoaXMuY2FudmFzICk7XHJcbiAgfVxyXG5cclxuICBEaWFwUGFydC5wcm90b3R5cGUgPSB7XHJcblxyXG4gICAgICAvLyBJbml0aWFsaXplIERpYXBQYXJ0IGluc3RhbmNlLlxyXG4gICAgICBpbml0OiBmdW5jdGlvbiAoIG9wdGlvbnMgKSB7XHJcblxyXG4gICAgICAgIC8vIFN0b3JlIHNldHRpbmdzLlxyXG4gICAgICAgIGZuLnNpbXBsZUV4dGVuZCggdGhpcy5zZXR0aW5ncywgb3B0aW9ucyApO1xyXG5cclxuICAgICAgICAvLyBJbmplY3QgY2FudmFzIG9uIERPTS5cclxuICAgICAgICBmbi5hcHBlbmQoIHRoaXMuc2V0dGluZ3MudGFyZ2V0RWxlbWVudCwgdGhpcy5jYW52YXMgKTtcclxuXHJcbiAgICAgICAgLy8gQXBwbHkgc3R5bGUgdG8gY2FudmFzIGVsZW1lbnQuXHJcbiAgICAgICAgdGhpcy5jYW52YXMuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gdGhpcy5zZXR0aW5ncy5iYWNrZ3JvdW5kO1xyXG5cclxuICAgICAgICAvLyBTZXQgbWFzcyBpbml0aWFsIGNvb3JkcyB0byBjYW52YSdzIGNlbnRlci5cclxuICAgICAgICB0aGlzLmNlbnRlck1hc3MoKTtcclxuXHJcbiAgICAgICAgLy8gQ3JlYXRlIHRoZSBtYXNzLlxyXG4gICAgICAgIHRoaXMuY2hhbXBzLnB1c2goIG5ldyBNYXNzKCBuZXcgVmVjdG9yKHRoaXMuc2V0dGluZ3MubWFzc1gsIHRoaXMuc2V0dGluZ3MubWFzc1kpLCB0aGlzLnNldHRpbmdzLm1hc3MgKSApO1xyXG5cclxuICAgICAgICAvLyBTdGFydCB0aGUgbG9vcC5cclxuICAgICAgICB0aGlzLmxvb3AoKTtcclxuXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBTZXQgb3B0aW9ucyB0byBzZXR0aW5ncy5cclxuICAgICAgc2V0OiBmdW5jdGlvbiAoIG9wdGlvbnMgKXtcclxuICAgICAgICBmbi5zaW1wbGVFeHRlbmQoIHRoaXMuc2V0dGluZ3MsIG9wdGlvbnMgKTtcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIENyZWF0ZSBuZXcgc2xpZGUsIGFjY29yZGluZyB0byBpbnB1dCB2YWx1ZSA6IEltYWdlIG9yIFN0cmluZy5cclxuICAgICAgY3JlYXRlU2xpZGU6IGZ1bmN0aW9uKCBpbnB1dCwgY3VzdG9tU2l6ZSApe1xyXG5cclxuICAgICAgICAvLyBDcmVhdGUgdGhlIE1hdHJpeCBpbnN0YW5jZSBhY2NvcmRpbmcgdG8gaW5wdXQuXHJcbiAgICAgICAgdmFyIG0gPSBuZXcgTWF0cml4ICggdGhpcywgaW5wdXQsIGN1c3RvbVNpemUgKTtcclxuXHJcbiAgICAgICAgLy8gU2V0IGFjdGl2ZSBpbmRleCB0byAwIGlmIGl0J3MgbnVsbC5cclxuICAgICAgICB0aGlzLmFjdGl2ZUluZGV4ID0gKCB0aGlzLmFjdGl2ZUluZGV4ID09PSBudWxsICkgPyAwIDogdGhpcy5hY3RpdmVJbmRleDtcclxuICAgICAgICB0aGlzLm1hdHJpeFRhYi5wdXNoKCBtICk7XHJcbiAgICAgICAgcmV0dXJuIG07XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBDcmVhdGUgYW5kIHJldHVybiBuZXcgVmVjdG9yIGluc3RhbmNlLiBVc2VmdWxsIGZvciBQYXJ0aWNsZXMgbWV0aG9kcyBleHRlbmRzIHZpYSByZWdpc3Rlck1vZGUuXHJcbiAgICAgIGdldE5ld1ZlY3RvcjogZnVuY3Rpb24gKCB4LCB5ICkge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjdG9yKCB4LCB5ICk7XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBDcmVhdGUgYW5kIHJldHVybiBjYW52YXMgZWxlbWVudC4gSWYgbm8gc2l6ZSBzcGVjaWZpZWQsIHRha2UgaW5zdGFuY2UncyBzZXR0aW5ncyBzaXplLlxyXG4gICAgICBnZXRDYW52YXM6IGZ1bmN0aW9uICggc2l6ZSApIHtcclxuICAgICAgICB2YXIgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggJ2NhbnZhcycgKSxcclxuICAgICAgICAgICAgcyA9IHNpemUgfHwge307XHJcblxyXG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSAoIHMuaCApID8gcy5oIDogdGhpcy5zZXR0aW5ncy5oZWlnaHQ7XHJcbiAgICAgICAgY2FudmFzLndpZHRoID0gKCBzLncgKSA/IHMudyA6IHRoaXMuc2V0dGluZ3Mud2lkdGg7XHJcblxyXG4gICAgICAgIHJldHVybiBjYW52YXM7XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBDcmVhdGUgYW5kIHJldHVybiBjb250ZXh0IGZvciBjYW52YXMuXHJcbiAgICAgIGdldENvbnRleHQyRDogZnVuY3Rpb24gKCBjYW52YXMgKSB7XHJcbiAgICAgICAgcmV0dXJuIGNhbnZhcy5nZXRDb250ZXh0KCAnMmQnICk7XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBSZXR1cm4gY29vcmRzLCBoZWlnaHQgYW5kIHdpZHRoIG9mIHRoZSBpbWcgcmVzaXplZCBhY2NvcmRpbmcgdG8gc2l6ZSBhcmcsIG9yIGluc3RhbmNlJ3MgY2FudmFzIHNpemUuIFxyXG4gICAgICBnZXRJbWFnZVNpemU6IGZ1bmN0aW9uICggaW1nLCBzaXplICkge1xyXG4gICAgICAgIHZhciB3ID0gaW1nLndpZHRoLCBcclxuICAgICAgICAgICAgaCA9IGltZy5oZWlnaHQsXHJcbiAgICAgICAgICAgIGN3ID0gKCBzaXplICkgPyBzaXplLncgOiB0aGlzLmNhbnZhcy53aWR0aCxcclxuICAgICAgICAgICAgY2ggPSAoIHNpemUgKSA/IHNpemUuaCA6IHRoaXMuY2FudmFzLmhlaWdodCxcclxuICAgICAgICAgICAgcmF0aW8gPSB3IC8gaDtcclxuXHJcbiAgICAgICAgaWYgKCB3ID49IGggJiYgdyA+IGN3ICkge1xyXG4gICAgICAgICAgdyA9IGN3O1xyXG4gICAgICAgICAgaCA9IE1hdGgucm91bmQoIHcgLyByYXRpbyApO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgIGlmICggaCA+IGNoICkge1xyXG4gICAgICAgICAgICBoID0gY2g7XHJcbiAgICAgICAgICAgIHcgPSBNYXRoLnJvdW5kKCBoICogcmF0aW8gKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICB4OiBNYXRoLnJvdW5kKCAoIGN3IC0gdyApIC8gMiApLFxyXG4gICAgICAgICAgeTogTWF0aC5yb3VuZCggKCBjaCAtIGggKSAvIDIgKSwgXHJcbiAgICAgICAgICB3OiB3LFxyXG4gICAgICAgICAgaDogaFxyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIE1ldGhvZCB0byBwYXNzIGFzIG9uY2hhbmdlIGV2ZW50IGZ1bmN0aW9uIGluIGZpbGVzIGlucHV0LlxyXG4gICAgICBsb2FkOiBmdW5jdGlvbiAoIGUsIHRodW1iICkge1xyXG5cclxuICAgICAgICB2YXIgaSwgc2VsZiA9IHRoaXM7IFxyXG4gICAgICAgIHZhciBmaWxlcyA9ICggZS50YXJnZXQgKSA/IGUudGFyZ2V0LmZpbGVzIDogZTsgXHJcbiAgICAgICAgdmFyIHRoID0gKCB0aHVtYiA9PT0gJ2ZhbHNlJyApID8gZmFsc2UgOiB0cnVlO1xyXG5cclxuICAgICAgICAvLyBJZiBubyBmaWxlIHNlbGVjdGVkLCBleGl0LlxyXG4gICAgICAgIGlmICggIWZpbGVzIHx8ICggZmlsZXMuY29uc3RydWN0b3IgIT09IEFycmF5ICYmICFmaWxlcyBpbnN0YW5jZW9mIEZpbGVMaXN0ICkgKSByZXR1cm4gY29uc29sZS5sb2coICdObyBmaWxlcyBtYXRjaGVkJyApO1xyXG5cclxuICAgICAgICBmb3IgKCBpID0gMDsgaSA8IGZpbGVzLmxlbmd0aDsgaSsrICl7XHJcblxyXG4gICAgICAgICAgdmFyIGZpbGUgPSBmaWxlc1tpXTtcclxuXHJcbiAgICAgICAgICAvLyBJZiBmaWxlIGNvbWVzIGZyb20gaW5wdXQgZmlsZXMuXHJcbiAgICAgICAgICBpZiAoIGZpbGUudHlwZSApe1xyXG5cclxuICAgICAgICAgICAgLy8gSWYgZmlsZSBpcyBub3QgYW4gaW1hZ2UsIHBhc3MgdG8gbmV4dCBmaWxlLlxyXG4gICAgICAgICAgICBpZiAoICFmaWxlLnR5cGUubWF0Y2goICdpbWFnZScgKSApIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAgICAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcclxuXHJcbiAgICAgICAgICAgICAgLy8gV2hlbiBmaWxlIGlzIGxvYWRlZC5cclxuICAgICAgICAgICAgICByZWFkZXIub25sb2FkID0gZnVuY3Rpb24gKCBldmVudCApIHtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBTZXQgaW1hZ2UgZGF0YS5cclxuICAgICAgICAgICAgICAgIHZhciBzcmMgPSBldmVudC50YXJnZXQucmVzdWx0O1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIExvYWQgaW1hZ2UuXHJcbiAgICAgICAgICAgICAgICBmbi5sb2FkSW1hZ2UuY2FsbCggdGhpcywgc3JjLCBzZWxmLCB0aCApO1xyXG4gICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgLy8gTG9hZCBmaWxlLlxyXG4gICAgICAgICAgICAgIHJlYWRlci5yZWFkQXNEYXRhVVJMKCBmaWxlICk7XHJcblxyXG4gICAgICAgICAgfSBlbHNlIHsgLy8gSWYgZmlsZXMgaXMgYXJyYXkgb2YgdXJsLlxyXG5cclxuICAgICAgICAgICAgLy8gTG9hZCBpbWFnZS5cclxuICAgICAgICAgICAgZm4ubG9hZEltYWdlLmNhbGwoIHRoaXMsIGZpbGUsIHNlbGYsIHRoICk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gQ2hhbmdlIGluc3RhbmNlJ3MgbW9kZS4gQmFzaWNhbGx5LCBpdCBjaGFuZ2UgbWV0aG9kcyB0byB0ZXN0IGVhY2ggUGFydGljbGVzLCBhbmQgbWF0cml4IHRoYXQncyB0ZXN0ZWQuXHJcbiAgICAgIHN3aXRjaE1vZGU6IGZ1bmN0aW9uICggbW9kZSApIHtcclxuXHJcbiAgICAgICAgLy8gU2V0IG1vZGUuXHJcbiAgICAgICAgdGhpcy5tb2RlID0gbW9kZTtcclxuXHJcbiAgICAgICAgLy8gQ2FsbCBjYWxsYmFjayBpZiBleGlzdC5cclxuICAgICAgICBpZiggdHlwZW9mIHRoaXMuc2V0dGluZ3Muc3dpdGNoTW9kZUNhbGxiYWNrID09PSAnZnVuY3Rpb24nICkge1xyXG4gICAgICAgICAgdGhpcy5zZXR0aW5ncy5zd2l0Y2hNb2RlQ2FsbGJhY2suY2FsbCggdGhpcyApO1xyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIENyZWF0ZSBuZXcgbWFzcyBhbmQgc3RvcmUgb24gY2hhbXAgYXJyYXkuXHJcbiAgICAgIGFkZE1hc3M6IGZ1bmN0aW9uKCB4LCB5LCBtYXNzICl7XHJcbiAgICAgICAgdmFyIG0gPSBuZXcgTWFzcyggbmV3IFZlY3Rvcih4LCB5KSwgbWFzcyApO1xyXG4gICAgICAgIHRoaXMuY2hhbXBzLnB1c2goIG0gKTtcclxuICAgICAgICByZXR1cm4gbTtcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIFNldCBtYXNzIGNvb3JkcyB0byBjYW52YSdzIGNlbnRnZXIgb24gaW5zdGFuY2UncyBzZXR0aW5ncy5cclxuICAgICAgY2VudGVyTWFzczogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuc2V0dGluZ3MubWFzc1ggPSB0aGlzLmNhbnZhcy53aWR0aC8yO1xyXG4gICAgICAgIHRoaXMuc2V0dGluZ3MubWFzc1kgPSB0aGlzLmNhbnZhcy5oZWlnaHQvMjtcclxuXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBDYWxsIHBhcnRpY2xlIG1ldGhvZHMgaW4gZWFjaCBsb29wLCBhY2NvcmRpbmcgdG8gYWN0aXZlIG1vZGUgYW5kIGNvcnJlc3BvbmRpbmcgcHJvY2VlZCBzZXR0aW5ncy5cclxuICAgICAgcGFydFByb2NlZWQ6IGZ1bmN0aW9uICggcGFydGljbGUgKSB7XHJcbiAgICAgICAgdmFyIGksIHByb2NlZWQgPSBtb2Rlc1t0aGlzLm1vZGVdLnByb2NlZWQsXHJcbiAgICAgICAgbCA9IHByb2NlZWQubGVuZ3RoO1xyXG4gICAgICAgIGZvciAoIGkgPSAwOyBpIDwgbDsgaSsrICkge1xyXG4gICAgICAgICAgcGFydGljbGVbcHJvY2VlZFtpXV0oKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBTZXQgYWN0aXZlSW5kZXggdG8gbWF0cml4J3MgdGh1bWIgaW5kZXguXHJcbiAgICAgIGdvVG86IGZ1bmN0aW9uICggbWF0cml4ICkge1xyXG4gICAgICAgIHRoaXMuY2FsbE5leHRTbGlkZUFuaW0oKTtcclxuICAgICAgICB0aGlzLmFjdGl2ZUluZGV4ID0gdGhpcy50aHVtYk9yaWdpbmFsVGFiLmluZGV4T2YoIG1hdHJpeCApO1xyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gTWV0aG9kIHRvIGFkZCBuZXcgc3dpdGNoIG1hdHJpeCBmdW5jdGlvbi5cclxuICAgICAgcmVnaXN0ZXJOZXh0U2xpZGVBbmltOiBmdW5jdGlvbiAoIG5hbWUsIGZuICkge1xyXG4gICAgICAgIGlmICggdHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nIHx8IHR5cGVvZiBuYW1lICE9PSAnc3RyaW5nJyApIHtcclxuICAgICAgICAgIHJldHVybiBjb25zb2xlLmxvZyggJ0Vycm9yLCBuYW1lIHJlcXVpcmVkIGFuZCBtdXN0IGJlIHR5cGUgc3RyaW5nLCBmbiByZXF1aXJlZCBhbmQgbXVzdCBiZSB0eXBlIGZ1bmN0aW9uJyApO1xyXG4gICAgICAgIH1cclxuICAgICAgICBuZXh0U2xpZGVBbmltWyBuYW1lIF0gPSBmbjtcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIEZ1bmN0aW9uIGNhbGxlZCBiZXR3ZWVuIG9sZCBhbmQgbmV3IG1hdHJpeCBhY3RpdmUuXHJcbiAgICAgIGNhbGxOZXh0U2xpZGVBbmltOiBmdW5jdGlvbiAoKXtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgbmV4dFNsaWRlQW5pbVsgdGhpcy5zZXR0aW5ncy5uZXh0U2xpZGVBbmltIF0uY2FsbCggdGhpcyApO1xyXG4gICAgICAgIH0gY2F0Y2ggKCBlICkge1xyXG4gICAgICAgICAgY29uc29sZS5sb2coIGUubmFtZSArICcgLSAnICsgZS5tZXNzYWdlKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBDcmVhdGUgbmV3IFBhcnRpY2xlLCB3aXRoIHJhbmRvbSBwb3NpdGlvbiBhbmQgc3BlZWQuXHJcbiAgICAgIGNyZWFQYXJ0czogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGlmICh0aGlzLnBhcnRpY2xlcy5sZW5ndGggPCB0aGlzLnNldHRpbmdzLmRlbnNpdHkpIHtcclxuICAgICAgICAgIHZhciBpLCBuYiA9IHRoaXMuc2V0dGluZ3MuZGVuc2l0eSAtIHRoaXMucGFydGljbGVzLmxlbmd0aDtcclxuICAgICAgICAgIGZvciAoIGkgPSAwOyBpIDwgbmI7IGkrKyApIHtcclxuICAgICAgICAgICAgdGhpcy5wYXJ0aWNsZXMucHVzaChuZXcgUGFydGljbGUodGhpcywgbmV3IFZlY3RvcihNYXRoLnJhbmRvbSgpICogdGhpcy5jYW52YXMud2lkdGgsIE1hdGgucmFuZG9tKCkgKiB0aGlzLmNhbnZhcy5oZWlnaHQpLCBuZXcgVmVjdG9yKHJlYWxSYW5kb20odGhpcy5zZXR0aW5ncy5pbml0aWFsVmVsb2NpdHkpLCByZWFsUmFuZG9tKHRoaXMuc2V0dGluZ3MuaW5pdGlhbFZlbG9jaXR5KSksIG5ldyBWZWN0b3IoMCwgMCksIDAsIGZhbHNlKSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gUHJvY2VlZCBhbGwgcGFydGljdWxlcy5cclxuICAgICAgdXBncmFkZVBhcnRzOiBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgICAgIHZhciBjdXJyZW50UGFydHMgPSBbXSxcclxuICAgICAgICAgICAgaSwgbCA9IHRoaXMucGFydGljbGVzLmxlbmd0aDtcclxuXHJcbiAgICAgICAgZm9yKCBpID0gMDsgaSA8IGw7IGkrKyApe1xyXG5cclxuICAgICAgICAgIHZhciBwYXJ0aWNsZSA9IHRoaXMucGFydGljbGVzW2ldLFxyXG4gICAgICAgICAgICAgIHBvcyA9IHBhcnRpY2xlLnBvc2l0aW9uO1xyXG5cclxuICAgICAgICAgIC8vIElmIHBhcnRpY2xlIG91dCBvZiBjYW52YXMsIGZvcmdldCBpdC5cclxuICAgICAgICAgIGlmKCBwb3MueCA+PSB0aGlzLmNhbnZhcy53aWR0aCB8fCBwb3MueCA8PSAwIHx8IHBvcy55ID49IHRoaXMuY2FudmFzLmhlaWdodCB8fCBwb3MueSA8PSAwICkgY29udGludWU7XHJcblxyXG4gICAgICAgICAgLy8gUHJvY2VlZCB0aGUgcGFydGljbGUuXHJcbiAgICAgICAgICB0aGlzLnBhcnRQcm9jZWVkKCBwYXJ0aWNsZSApO1xyXG5cclxuICAgICAgICAgIC8vIE1vdmUgdGhlIHBhcnRpY2xlLlxyXG4gICAgICAgICAgcGFydGljbGUubW92ZSgpO1xyXG5cclxuICAgICAgICAgIC8vIFN0b3JlIHRoZSBwYXJ0aWNsZS5cclxuICAgICAgICAgIGN1cnJlbnRQYXJ0cy5wdXNoKCBwYXJ0aWNsZSApO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLnBhcnRpY2xlcyA9IGN1cnJlbnRQYXJ0cztcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIERyYXcgcGFydGljbGVzIGluIGNhbnZhcy5cclxuICAgICAgZHJhd1BhcnRzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIGksIG4gPSB0aGlzLnBhcnRpY2xlcy5sZW5ndGg7XHJcbiAgICAgICAgZm9yKCBpID0gMDsgaSA8IG47IGkrKyApe1xyXG4gICAgICAgICAgdmFyIHBvcyA9IHRoaXMucGFydGljbGVzW2ldLnBvc2l0aW9uO1xyXG4gICAgICAgICAgdGhpcy5jb250ZXh0LmZpbGxTdHlsZSA9IHRoaXMucGFydGljbGVzW2ldLmNvbG9yO1xyXG4gICAgICAgICAgdGhpcy5jb250ZXh0LmZpbGxSZWN0KHBvcy54LCBwb3MueSwgdGhpcy5zZXR0aW5ncy5wYXJ0aWNsZVNpemUsIHRoaXMuc2V0dGluZ3MucGFydGljbGVTaXplKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBNYWtlIGZyZWUgYWxsIHBhcnRpY2xlcy5cclxuICAgICAgY2xlYXJQYXJ0czogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBpLCBsID0gdGhpcy5wYXJ0aWNsZXMubGVuZ3RoO1xyXG4gICAgICAgIGZvciggaSA9IDA7IGkgPCBsOyBpKysgKXtcclxuICAgICAgICAgIHRoaXMucGFydGljbGVzW2ldLmluRm9ybSA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gQ2xlYW4gY2FudmFzLlxyXG4gICAgICBjbGVhcjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGlmKCAhdGhpcy5zZXR0aW5ncy5kcmF3ICkge1xyXG4gICAgICAgICAgdGhpcy5jb250ZXh0LmNsZWFyUmVjdCggMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCApO1xyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIExvb3AncyBjYWxsYmFjay5cclxuICAgICAgcXVldWU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgaWYoICF0aGlzLnNldHRpbmdzLnN0b3AgKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlcXVlc3RJRCA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoIHNlbGYubG9vcC5iaW5kKHNlbGYpICk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSggc2VsZi5yZXF1ZXN0SUQgKTtcclxuICAgICAgICAgICAgICAgIHRoaXMucmVxdWVzdElEID0gdW5kZWZpbmVkO1xyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIENyZWF0ZSBhbmQgcHJvY2VlZCBuZXcgcGFydGljbGVzIGlmIG1pc3NpbmcuXHJcbiAgICAgIHVwZGF0ZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuY3JlYVBhcnRzKCk7XHJcbiAgICAgICAgdGhpcy51cGdyYWRlUGFydHMoKTtcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIERyYXcuXHJcbiAgICAgIGRyYXc6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLmRyYXdQYXJ0cygpO1xyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gTG9vcC5cclxuICAgICAgbG9vcDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuY2xlYXIoKTtcclxuICAgICAgICB0aGlzLnVwZGF0ZSgpO1xyXG4gICAgICAgIHRoaXMuZHJhdygpO1xyXG4gICAgICAgIHRoaXMucXVldWUoKTtcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIFN0b3AgbG9vcC5cclxuICAgICAgc3RvcDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuc2V0dGluZ3Muc3RvcCA9IHRydWU7XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBTdGFydCBsb29wLlxyXG4gICAgICBzdGFydDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuc2V0dGluZ3Muc3RvcCA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMubG9vcCgpO1xyXG4gICAgICB9XHJcblxyXG4gICAgfTtcclxuICAgIFxyXG5cclxuICAgLy8gUmV0dXJuIHJhbmRvbSBudW1iZXIuIFxyXG4gICBmdW5jdGlvbiByZWFsUmFuZG9tKCBtYXggKXtcclxuICAgICAgcmV0dXJuIE1hdGguY29zKChNYXRoLnJhbmRvbSgpICogTWF0aC5QSSkpICogbWF4O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFZlY3RvciBlbGVtZW50YXJ5IGNsYXNzIG9iamVjdC5cclxuICAgIGZ1bmN0aW9uIFZlY3RvciggeCwgeSApIHtcclxuICAgICAgdGhpcy54ID0geCB8fCAwO1xyXG4gICAgICB0aGlzLnkgPSB5IHx8IDA7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQWRkIHZlY3RvciB0byBhbiBvdGhlci5cclxuICAgIFZlY3Rvci5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24odmVjdG9yKXtcclxuICAgICAgdGhpcy54ICs9IHZlY3Rvci54O1xyXG4gICAgICB0aGlzLnkgKz0gdmVjdG9yLnk7XHJcbiAgICB9O1xyXG5cclxuICAgIC8vIEludmVydCB2ZWN0b3IncyBkaXJlY3Rpb24uXHJcbiAgICBWZWN0b3IucHJvdG90eXBlLmdldEludmVydCA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgIHRoaXMueCA9IC0xICogKHRoaXMueCk7XHJcbiAgICAgIHRoaXMueSA9IC0xICogKHRoaXMueSk7XHJcbiAgICB9O1xyXG5cclxuICAgIC8vIEdldCB2ZWN0b3IncyBsZW5ndGguXHJcbiAgICBWZWN0b3IucHJvdG90eXBlLmdldE1hZ25pdHVkZSA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgIHJldHVybiBNYXRoLnNxcnQodGhpcy54ICogdGhpcy54ICsgdGhpcy55ICogdGhpcy55KVxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBHZXQgdmVjdG9yJ3MgcmFkaXVzLlxyXG4gICAgVmVjdG9yLnByb3RvdHlwZS5nZXRBbmdsZSA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgIHJldHVybiBNYXRoLmF0YW4yKHRoaXMueSwgdGhpcy54KTtcclxuICAgIH07XHJcblxyXG4gICAgLy8gR2V0IG5ldyB2ZWN0b3IgYWNjb3JkaW5nIHRvIGxlbmd0aCBhbmQgcmFkaXVzLlxyXG4gICAgVmVjdG9yLnByb3RvdHlwZS5mcm9tQW5nbGUgPSBmdW5jdGlvbiAoIGFuZ2xlLCBtYWduaXR1ZGUgKSB7XHJcbiAgICAgIHJldHVybiBuZXcgVmVjdG9yKG1hZ25pdHVkZSAqIE1hdGguY29zKGFuZ2xlKSwgbWFnbml0dWRlICogTWF0aC5zaW4oYW5nbGUpKTtcclxuICAgIH07XHJcblxyXG4gICAgLy8gUGFydGljbGUgY29uc3RydWN0b3IuXHJcbiAgICBmdW5jdGlvbiBQYXJ0aWNsZSggaW5zdGFuY2UsIHBvc2l0aW9uLCB2aXRlc3NlLCBhY2NlbGVyYXRpb24gKSB7XHJcbiAgICAgIHRoaXMuaW5zdGFuY2UgPSBpbnN0YW5jZTtcclxuICAgICAgdGhpcy5wb3NpdGlvbiA9IHBvc2l0aW9uIHx8IG5ldyBWZWN0b3IoMCwgMCk7XHJcbiAgICAgIHRoaXMudml0ZXNzZSA9IHZpdGVzc2UgfHwgbmV3IFZlY3RvcigwLCAwKTtcclxuICAgICAgdGhpcy5hY2NlbGVyYXRpb24gPSBhY2NlbGVyYXRpb24gfHwgbmV3IFZlY3RvcigwLCAwKTtcclxuICAgICAgdGhpcy5jb2xvciA9IHRoaXMuaW5zdGFuY2Uuc2V0dGluZ3MucGFydGljbGVDb2xvcjtcclxuICAgICAgdGhpcy5pbkZvcm0gPSAwO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFNldCBuZXcgcGFydGljbGUncyBwb3NpdGlvbiBhY2NvcmRpbmcgdG8gaXRzIGFjY2VsZXJhdGlvbiBhbmQgc3BlZWQuXHJcbiAgICBQYXJ0aWNsZS5wcm90b3R5cGUubW92ZSA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgIHRoaXMudml0ZXNzZS5hZGQoIHRoaXMuYWNjZWxlcmF0aW9uICk7XHJcbiAgICAgIHRoaXMucG9zaXRpb24uYWRkKCB0aGlzLnZpdGVzc2UgKTtcclxuICAgIH07XHJcblxyXG4gICAgLy8gUHJvY2VlZCBwYXJ0aWNsZSBhY2NvcmRpbmcgdG8gZXhpc3RpbmcgbWFzcy5cclxuICAgIFBhcnRpY2xlLnByb3RvdHlwZS5zb3VtaXNDaGFtcCA9IGZ1bmN0aW9uKCkge1xyXG5cclxuXHJcbiAgICAgIHZhciBtYXNzID0gdGhpcy5pbnN0YW5jZS5tYXNzQWN0aXZlO1xyXG5cclxuICAgICAgLy8gSWYgbm8gbWFzcyBzdHJlbmd0aCwgcmV0dXJuLlxyXG4gICAgICBpZiAoICFtYXNzICkgcmV0dXJuO1xyXG5cclxuICAgICAgLy8gSWYgcGFydGljbGUgaGFzIG5vdCBmbGFnZ2VkICdpbkZvcm0nLlxyXG4gICAgICBpZiAoIHRoaXMuaW5Gb3JtICE9PSAxICkge1xyXG5cclxuICAgICAgICB2YXIgdG90YWxBY2NlbGVyYXRpb25YID0gMDtcclxuICAgICAgICB2YXIgdG90YWxBY2NlbGVyYXRpb25ZID0gMDtcclxuICAgICAgICB2YXIgbCA9IHRoaXMuaW5zdGFuY2UuY2hhbXBzLmxlbmd0aDtcclxuXHJcbiAgICAgICAgLy8gUHJvY2VlZCBlZmZlY3Qgb2YgYWxsIG1hc3MgcmVnaXN0ZXJlZCBpbiBjaGFtcHMgYXJyYXkuXHJcbiAgICAgICAgZm9yKCB2YXIgaSA9IDA7IGkgPCBsOyBpKysgKXtcclxuICAgICAgICAgIHZhciBkaXN0WCA9IHRoaXMuaW5zdGFuY2UuY2hhbXBzW2ldLnBvc2l0aW9uLnggLSB0aGlzLnBvc2l0aW9uLng7XHJcbiAgICAgICAgICB2YXIgZGlzdFkgPSB0aGlzLmluc3RhbmNlLmNoYW1wc1tpXS5wb3NpdGlvbi55IC0gdGhpcy5wb3NpdGlvbi55O1xyXG4gICAgICAgICAgdmFyIGZvcmNlID0gbWFzcyAvIE1hdGgucG93KGRpc3RYICogZGlzdFggKyBkaXN0WSAqIGRpc3RZLCAxLjUpO1xyXG4gICAgICAgICAgdG90YWxBY2NlbGVyYXRpb25YICs9IGRpc3RYICogZm9yY2U7XHJcbiAgICAgICAgICB0b3RhbEFjY2VsZXJhdGlvblkgKz0gZGlzdFkgKiBmb3JjZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFNldCBuZXcgYWNjZWxlcmF0aW9uIHZlY3Rvci5cclxuICAgICAgICB0aGlzLmFjY2VsZXJhdGlvbiA9IG5ldyBWZWN0b3IoIHRvdGFsQWNjZWxlcmF0aW9uWCwgdG90YWxBY2NlbGVyYXRpb25ZICk7XHJcbiAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgLy8gTWFzcyBjb25zdHJ1Y3Rvci5cclxuICAgIGZ1bmN0aW9uIE1hc3MoIHBvaW50LCBtYXNzICkge1xyXG4gICAgICB0aGlzLnBvc2l0aW9uID0gcG9pbnQ7XHJcbiAgICAgIHRoaXMuc2V0TWFzcyggbWFzcyApO1xyXG4gICAgfVxyXG5cclxuICAgIE1hc3MucHJvdG90eXBlLnNldE1hc3MgPSBmdW5jdGlvbiggbWFzcyApe1xyXG4gICAgICB0aGlzLm1hc3MgPSBtYXNzIHx8IDA7XHJcbiAgICAgIHRoaXMuY29sb3IgPSBtYXNzIDwgMCA/IFwiI2YwMFwiIDogXCIjMGYwXCI7XHJcbiAgICB9O1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogVXRpbGl0eSBmdW5jdGlvbnMuXHJcbiAgICAgKiBcclxuICAgICAqL1xyXG4gICAgZm4gPSB7XHJcbiAgICAgIC8vIFJldHVybiB2aWV3cG9ydCBzaXplLlxyXG4gICAgICBnZXRWaWV3cG9ydDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHc6IE1hdGgubWF4KGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRXaWR0aCwgd2luZG93LmlubmVyV2lkdGggfHwgMCksXHJcbiAgICAgICAgICBoOiBNYXRoLm1heChkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0LCB3aW5kb3cuaW5uZXJIZWlnaHQgfHwgMClcclxuICAgICAgICB9O1xyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gQXBwZW5kIGVsZW1lbnQgaW4gdGFyZ2V0LlxyXG4gICAgICBhcHBlbmQ6IGZ1bmN0aW9uICggdGFyZ2V0LCBlbGVtZW50ICkge1xyXG4gICAgICAgIGlmICggdHlwZW9mIHRhcmdldCA9PT0gJ3N0cmluZycgKSB7XHJcbiAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCggdGFyZ2V0ICkuYXBwZW5kQ2hpbGQoIGVsZW1lbnQgKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICB0YXJnZXQuYXBwZW5kQ2hpbGQoIGVsZW1lbnQgKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBUZXN0IGlmIHRhcmdldCBpcyBwbGFpbiBvYmplY3QuIFRoYW5rIHlvdSBqUXVlcnkgMysgIVxyXG4gICAgICBpc1BsYWluT2JqZWN0OiBmdW5jdGlvbiAoIHRhcmdldCApIHtcclxuICAgICAgICB2YXIgcHJvdG8sIEN0b3I7XHJcbiAgICAgICAgLy8gRGV0ZWN0IG9idmlvdXMgbmVnYXRpdmVzXHJcbiAgICAgICAgLy8gVXNlIHRvU3RyaW5nIGluc3RlYWQgb2YgalF1ZXJ5LnR5cGUgdG8gY2F0Y2ggaG9zdCBvYmplY3RzXHJcbiAgICAgICAgaWYgKCAhdGFyZ2V0IHx8IG9vLnRvU3RyaW5nLmNhbGwoIHRhcmdldCApICE9PSBcIltvYmplY3QgT2JqZWN0XVwiICkge1xyXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwcm90byA9IGdldFByb3RvKCB0YXJnZXQgKTtcclxuICAgICAgICAvLyBPYmplY3RzIHdpdGggbm8gcHJvdG90eXBlIChlLmcuLCBgT2JqZWN0LmNyZWF0ZSggbnVsbCApYCkgYXJlIHBsYWluXHJcbiAgICAgICAgaWYgKCAhcHJvdG8gKSB7XHJcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gT2JqZWN0cyB3aXRoIHByb3RvdHlwZSBhcmUgcGxhaW4gaWZmIHRoZXkgd2VyZSBjb25zdHJ1Y3RlZCBieSBhIGdsb2JhbCBPYmplY3QgZnVuY3Rpb25cclxuICAgICAgICBDdG9yID0gb28uaGFzT3duUHJvcGVydHkuY2FsbCggcHJvdG8sIFwiY29uc3RydWN0b3JcIiApICYmIHByb3RvLmNvbnN0cnVjdG9yO1xyXG4gICAgICAgIHJldHVybiB0eXBlb2YgQ3RvciA9PT0gXCJmdW5jdGlvblwiICYmIG9vLmhhc093blByb3BlcnR5LmNhbGwoIEN0b3IucHJvdG90eXBlLCBcImlzUHJvdG90eXBlT2ZcIik7XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBEZWVwbHkgZXh0ZW5kIGEgb2JqZWN0IHdpdGggYiBvYmplY3QgcHJvcGVydGllcy5cclxuICAgICAgc2ltcGxlRXh0ZW5kOiBmdW5jdGlvbiAoIGEsIGIgKSB7XHJcbiAgICAgICAgdmFyIGNsb25lLCBzcmMsIGNvcHksIGlzQW5BcnJheSA9IGZhbHNlOyBcclxuICAgICAgICBmb3IoIHZhciBrZXkgaW4gYiApIHtcclxuXHJcbiAgICAgICAgICBzcmMgPSBhWyBrZXkgXTtcclxuXHRcdFx0XHQgIGNvcHkgPSBiWyBrZXkgXTtcclxuXHJcbiAgICAgICAgICAvL0F2b2lkIGluZmluaXRlIGxvb3AuXHJcbiAgICAgICAgICBpZiAoIGEgPT09IGNvcHkgKSB7XHJcblx0XHRcdFx0XHQgIGNvbnRpbnVlO1xyXG5cdFx0XHRcdCAgfVxyXG5cclxuICAgICAgICAgIGlmKCBiLmhhc093blByb3BlcnR5KCBrZXkgKSApIHtcclxuICAgICAgICAgICAgLy8gSWYgcHJvcGVydGllIGlzIEFycmF5IG9yIE9iamVjdC5cclxuICAgICAgICAgICAgaWYoIGNvcHkgJiYgKCBmbi5pc1BsYWluT2JqZWN0KCBjb3B5ICkgfHwgKGlzQW5BcnJheSA9IEFycmF5LmlzQXJyYXkuY2FsbCggY29weSApKSkpIHtcclxuICAgICAgICAgICAgICBpZiAoIGlzQW5BcnJheSApIHtcclxuICAgICAgICAgICAgICAgIGlzQW5BcnJheSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgY2xvbmUgPSAoIHNyYyAmJiBzcmMuaXNBcnJheSApID8gc3JjIDogW107XHJcbiAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNsb25lID0gKCBzcmMgJiYgZm4uaXNQbGFpbk9iamVjdCggc3JjICkgKSA/IHNyYyA6IHt9O1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAvLyBDcmVhdGUgbmV3IEFycmF5IG9yIE9iamVjdCwgbmV2ZXIgcmVmZXJlbmNlIGl0LlxyXG4gICAgICAgICAgICAgIGFbIGtleSBdID0gZm4uc2ltcGxlRXh0ZW5kKCBjbG9uZSwgY29weSApO1xyXG5cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGFbIGtleSBdID0gY29weTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gYTtcclxuICAgICAgfSxcclxuXHJcbiAgICAgIGxvYWRJbWFnZTogZnVuY3Rpb24gKCBzcmMsIHNlbGYsIHRodW1iICkge1xyXG5cclxuICAgICAgICAgICAgdmFyIGltZyA9IG5ldyBJbWFnZSgpO1xyXG4gICAgICAgICAgICAvLyBXaGVuIGltYWdlIGlzIGxvYWRlZC5cclxuICAgICAgICAgICAgaW1nLm9ubG9hZCA9IGZ1bmN0aW9uKCl7XHJcblxyXG4gICAgICAgICAgICAgIC8vIENyZWF0ZSBzbGlkZSwgd2l0aCBJbWFnZSBpbnB1dC5cclxuICAgICAgICAgICAgICB2YXIgbSA9IHNlbGYuY3JlYXRlU2xpZGUoIHRoaXMgKTtcclxuXHJcbiAgICAgICAgICAgICAgaWYgKCAhdGh1bWIgKSByZXR1cm47XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgLy8gQ3JlYXRlIGFuZCBzdG9yZSB0aHVtYi5cclxuICAgICAgICAgICAgICBtLnJlbmRlclRodW1ibmFpbHMoIHNlbGYuc2V0dGluZ3MudGh1bWRuYWlsc0lELCBmYWxzZSApO1xyXG5cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgLy8gTG9hZCBpbWcuXHJcbiAgICAgICAgICAgIGltZy5zcmMgPSBzcmM7XHJcbiAgICAgIH1cclxuICAgIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIFBVQkxJQyBNRVRIT0RTLlxyXG4gICAqIFxyXG4gICAqL1xyXG5cclxuICByZXR1cm4ge1xyXG5cclxuICAgIC8vIEVudHJ5IHBvaW50IHRvIGNyZWF0ZSBuZXcgc2xpZGUgaW5zdGFuY2UuXHJcbiAgICBnZXRJbnN0YW5jZTogZnVuY3Rpb24oICBvcHRpb25zICkge1xyXG4gICAgICB2YXIgaSA9IG5ldyBEaWFwUGFydCgpO1xyXG4gICAgICBpLmluaXQoIG9wdGlvbnMgKTtcclxuICAgICAgcmV0dXJuIGk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIENhbGwgaXQgdG8gZXh0ZW5kIGNvcmUuXHJcbiAgICByZWdpc3Rlck1vZGU6IGZ1bmN0aW9uICggbmFtZSwgcGFyYW0gKSB7XHJcblxyXG4gICAgICAvLyBDaGVjayBpZiBtb2RlJ3MgbmFtZSBpcyBmcmVlLlxyXG4gICAgICBpZiAoIGRlZmF1bHRzLm1vZGVzW25hbWVdICkgdGhyb3cgbmV3IEVycm9yKCBcIk5hbWUgc3BhY2UgZm9yICdcIiArIG5hbWUgKyBcIicgYWxyZWFkeSBleGlzdC4gQ2hvb3NlIGFuIG90aGVyIG1vZHVsZSBuYW1lLlwiICk7XHJcblxyXG4gICAgICAvLyBSZWdpc3RlciBuZXcgbW9kZS5cclxuICAgICAgZGVmYXVsdHMubW9kZXNbbmFtZV0gPSB0cnVlO1xyXG5cclxuICAgICAgLy8gRXh0ZW5kIGRlZmF1bHRzLCBmaWx0ZXIsIFBhcnRpY2xlcyBhbmQgTWF0cml4IGNsYXNzLlxyXG4gICAgICBmbi5zaW1wbGVFeHRlbmQoIGRlZmF1bHRzLCBwYXJhbS5vcHRpb25zICk7XHJcbiAgICAgIGZuLnNpbXBsZUV4dGVuZCggZmlsdGVyLCBwYXJhbS5maWx0ZXIgKTtcclxuICAgICAgZm4uc2ltcGxlRXh0ZW5kKCBEaWFwUGFydC5wcm90b3R5cGUsIHBhcmFtLnByb3RvICk7XHJcbiAgICAgIGZuLnNpbXBsZUV4dGVuZCggUGFydGljbGUucHJvdG90eXBlLCBwYXJhbS5wcm90b19wYXJ0aWNsZXMgKTtcclxuICAgICAgZm4uc2ltcGxlRXh0ZW5kKCBNYXRyaXgucHJvdG90eXBlLCBwYXJhbS5wcm90b19tYXRyaXggKTtcclxuICAgICAgXHJcbiAgICAgIC8vIFJlZ2lzdGVyIG5ldyBtb2RlIGZpbHRlcnMsIHByb2NlZWQgYW5kIG1hdHJpeE1ldGhvZC5cclxuICAgICAgbW9kZXNbbmFtZV0gPSBwYXJhbS5tb2RlRGF0YTtcclxuICAgIH0sXHJcblxyXG4gICAgLy8gQ2FsbCBpdCB0byBleHRlbmQgbmV4dFNsaWRlQW5pbS5cclxuICAgIHJlZ2lzdGVyVHJhbnNpdGlvbjogZnVuY3Rpb24gKCBvYmogKSB7XHJcbiAgICAgIGZuLnNpbXBsZUV4dGVuZCggbmV4dFNsaWRlQW5pbSwgb2JqICk7XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbn0pKHRoaXMsIHRoaXMuZG9jdW1lbnQpOyIsInNsaWRlUGFydGljbGVzLnJlZ2lzdGVyTW9kZSggJ21vZGVTaGFwZScsIHtcclxuICBvcHRpb25zOiB7XHJcbiAgICB0aHJlc2hvbGROQjogWzEyOF0sXHJcbiAgfSxcclxuICBwcm90bzoge30sXHJcbiAgcHJvdG9fcGFydGljbGVzOiB7XHJcbiAgICAvLyBQcm9jZWVkIHBhcnRpY2xlIGFjY29yZGluZyB0byBtYXRyaXggb2YgdHlwZSAndmFsdWUnLiBDYWxsZWQgaW4gbW9kZUZvcm0uXHJcbiAgICBzb3VtaXNGb3JtOiBmdW5jdGlvbigpe1xyXG5cclxuICAgICAgLy8gSWYgbGliZXJhdGlvbiBmbGFnLCBtYWtlIHRoZSBwYXJ0aWNsZSBmcmVlLlxyXG4gICAgICBpZiggdGhpcy5pbnN0YW5jZS5saWJlcmF0aW9uICl7XHJcbiAgICAgICAgdGhpcy5pbkZvcm0gPSAwO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gR2V0IHBhcnRpY2xlIHBvc2l0aW9uLlxyXG4gICAgICB2YXIgdGVzdFggPSBNYXRoLmZsb29yKCB0aGlzLnBvc2l0aW9uLnggKTtcclxuICAgICAgdmFyIHRlc3RZID0gTWF0aC5mbG9vciggdGhpcy5wb3NpdGlvbi55ICk7XHJcblxyXG4gICAgICAvLyBDaGVjayBtYXRyaXggdmFsdWUgYWNjb3JkaW5nIHRvIHBhcnRpY2xlJ3MgcG9zaXRpb24uXHJcbiAgICAgIHZhciB2YWx1ZSA9ICggdGhpcy5pbnN0YW5jZS5hY3RpdmVJbmRleCAhPT0gbnVsbCApID8gdGhpcy5pbnN0YW5jZS5tYXRyaXhUYWJbdGhpcy5pbnN0YW5jZS5hY3RpdmVJbmRleF0uZ2V0TWF0cml4KClbdGVzdFhdW3Rlc3RZXSA6IDA7XHJcblxyXG4gICAgICAvLyBJZiBwYXJ0aWNsZSBpcyBpbnNpZGUgYSAnd2hpdGUgem9uZScuXHJcbiAgICAgIGlmICggdmFsdWUgIT09IDAgKXtcclxuXHJcbiAgICAgICAgLy8gSWYgcGFydGljbGVzIGp1c3QgY29tZSBpbnRvIHRoZSAnd2hpdGUgem9uZScuXHJcbiAgICAgICAgaWYoIHRoaXMuaW5Gb3JtICE9PSAxICl7XHJcblxyXG4gICAgICAgICAgLy8gVXAgdGhlIGZvcm0gZmxhZy5cclxuICAgICAgICAgIHRoaXMuaW5Gb3JtID0gMTtcclxuXHJcbiAgICAgICAgICAvLyBTbG93IHRoZSBwYXJ0aWNsZS5cclxuICAgICAgICAgIHRoaXMudml0ZXNzZSA9IHRoaXMuaW5zdGFuY2UuZ2V0TmV3VmVjdG9yKHRoaXMudml0ZXNzZS54ICogMC4yLCB0aGlzLnZpdGVzc2UueSAqIDAuMik7XHJcblxyXG4gICAgICAgICAgLy8gQ3V0IHRoZSBhY2NlbGVyYXRpb24uXHJcbiAgICAgICAgICB0aGlzLmFjY2VsZXJhdGlvbiA9IHRoaXMuaW5zdGFuY2UuZ2V0TmV3VmVjdG9yKDAsIDApO1xyXG5cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIElmIHBhcnRpY2xlIGlzIG5vdCBpbnNpZGUgJ3doaXRlIHpvbmUnLlxyXG4gICAgICBlbHNlIHtcclxuXHJcbiAgICAgICAgLy8gSWYgdGhlIHBhcnRpY2xlIGp1c3QgZ2V0IG91dCB0aGUgem9uZS5cclxuICAgICAgICBpZiggdGhpcy5pbkZvcm0gPT09IDEgKXtcclxuXHJcbiAgICAgICAgICAvLyBJdCdzIG5vdCBmcmVlIDogaW52ZXJ0IHNwZWVkLlxyXG4gICAgICAgICAgdGhpcy52aXRlc3NlLmdldEludmVydCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0sXHJcbiAgcHJvdG9fbWF0cml4OiB7XHJcbiAgICAvLyBDb25zdHJ1Y3QgbWF0cml4LCBhY2NvcmRpbmcgdG8gY2FudmFzJ3MgaW1hZ2UgZGF0YSB2YWx1ZXMuXHJcbiAgICAvLyBJZiBpbWFnZSBkYXRhIHBpeGVsIGlzIHdoaXRlLCBjb3JyZXNwb25kaW5nIG1hdHJpeCBjYXNlIGlzIHNldCB0b28gdmFsdWUuXHJcbiAgICAvLyBJZiBpbWFnZSBkYXRhIHBpeGVsIGlzIGJsYWNrLCBjb3JyZXNwb25kaW5nIG1hdHJpeCBjYXNlIGlzIHNldCB0byAwLlxyXG4gICAgdmFsdWVNYXRyaXg6IGZ1bmN0aW9uICggbWF0cml4LCB2YWx1ZSApIHtcclxuICAgICAgdmFyIGEgPSB0aGlzLnNpemUueCxcclxuICAgICAgICBiID0gTWF0aC5taW4oIE1hdGguZmxvb3IoYSArIHRoaXMuc2l6ZS53KSwgbWF0cml4Lmxlbmd0aCApLFxyXG4gICAgICAgIGMgPSB0aGlzLnNpemUueSxcclxuICAgICAgICBkID0gTWF0aC5taW4oIE1hdGguZmxvb3IoYyArIHRoaXMuc2l6ZS5oKSwgbWF0cml4WzBdLmxlbmd0aCApO1xyXG4gICAgICBpZiggbWF0cml4Lmxlbmd0aCA8IGEgfHwgbWF0cml4WzBdLmxlbmd0aCA8IGQgKSByZXR1cm47XHJcblxyXG4gICAgICB2YXIgaSwgaiwgcCA9IHRoaXMuY29udGV4dC5nZXRJbWFnZURhdGEoMCwgMCwgdGhpcy5pbnN0YW5jZS5jYW52YXMud2lkdGgsIHRoaXMuaW5zdGFuY2UuY2FudmFzLmhlaWdodCkuZGF0YTtcclxuXHJcbiAgICAgIGZvciggaSA9IGE7IGkgPCBiOyBpKysgKXtcclxuICAgICAgICBmb3IoIGogPSBjOyBqIDwgZDsgaisrICl7XHJcbiAgICAgICAgICB2YXIgcGl4ID0gcFsoKHRoaXMuaW5zdGFuY2UuY2FudmFzLndpZHRoICogaikgKyBpKSAqIDRdO1xyXG4gICAgICAgICAgbWF0cml4W2ldW2pdID0gKCBwaXggPT09IDI1NSApID8gdmFsdWUgOiAwO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0sXHJcbiAgZmlsdGVyOiB7XHJcbiAgICAvLyBUdXJuIGNvbG9yZWQgcGljdHVyZSBvbiBibGFjayBhbmQgd2hpdGUuIFVzZWQgZm9yIG1vZGVGb3JtLlxyXG4gICAgYmxhY2tBbmRXaGl0ZTogZnVuY3Rpb24gKCBwaXhlbHMsIHRocmVzaG9sZCApIHtcclxuICAgICAgaWYgKCAhcGl4ZWxzICkgcmV0dXJuIHBpeGVscztcclxuICAgICAgdmFyIGksIHIsIGcsIGIsIHYsIGQgPSBwaXhlbHMuZGF0YTtcclxuICAgICAgZm9yICggaSA9IDA7IGkgPCBkLmxlbmd0aDsgaSs9NCApIHtcclxuICAgICAgICByID0gZFtpXTtcclxuICAgICAgICBnID0gZFtpKzFdO1xyXG4gICAgICAgIGIgPSBkW2krMl07XHJcbiAgICAgICAgdiA9ICgwLjIxMjYqciArIDAuNzE1MipnICsgMC4wNzIyKmIgPj0gdGhyZXNob2xkKSA/IDI1NSA6IDA7XHJcbiAgICAgICAgZFtpXSA9IGRbaSsxXSA9IGRbaSsyXSA9IHZcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcGl4ZWxzO1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgbW9kZURhdGE6IHtcclxuICAgIGZpbHRlcnM6IHtcclxuICAgICAgbmFtZTogJ2JsYWNrQW5kV2hpdGUnLFxyXG4gICAgICBwYXJhbTogJ3RocmVzaG9sZE5CJ1xyXG4gICAgfSxcclxuICAgIHByb2NlZWQ6IFsnc291bWlzQ2hhbXAnLCAnc291bWlzRm9ybSddLFxyXG4gICAgbWF0cml4TWV0aG9kOiAndmFsdWVNYXRyaXgnXHJcbiAgfVxyXG59KTsiLCJzbGlkZVBhcnRpY2xlcy5yZWdpc3Rlck1vZGUoICdtb2RlQ29sb3InLCB7XHJcbiAgb3B0aW9uczoge30sXHJcbiAgcHJvdG86IHt9LFxyXG4gIHByb3RvX3BhcnRpY2xlczoge1xyXG4gICAgc291bWlzQ29sb3I6IGZ1bmN0aW9uKCl7XHJcbiAgICAgIHRoaXMuaW5Gb3JtID0gMDtcclxuICAgICAgdmFyIHRlc3RYID0gTWF0aC5mbG9vciggdGhpcy5wb3NpdGlvbi54ICk7XHJcbiAgICAgIHZhciB0ZXN0WSA9IE1hdGguZmxvb3IoIHRoaXMucG9zaXRpb24ueSApO1xyXG4gICAgICB0aGlzLmNvbG9yID0gKCB0aGlzLmluc3RhbmNlLmFjdGl2ZUluZGV4ICE9PSBudWxsICkgPyB0aGlzLmluc3RhbmNlLm1hdHJpeFRhYlt0aGlzLmluc3RhbmNlLmFjdGl2ZUluZGV4XS5nZXRNYXRyaXgoKVt0ZXN0WF1bdGVzdFldIDogdGhpcy5pbnN0YW5jZS5zZXR0aW5ncy5wYXJ0aWNsZUNvbG9yO1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgcHJvdG9fbWF0cml4OiB7XHJcbiAgICBjb2xvck1hdHJpeDogZnVuY3Rpb24gKCBtYXRyaXggKSB7XHJcblxyXG4gICAgICB2YXIgaSwgaiwgciwgZywgYiwgcCA9IHRoaXMuY29udGV4dC5nZXRJbWFnZURhdGEoIDAsIDAsIHRoaXMuaW5zdGFuY2UuY2FudmFzLndpZHRoLCB0aGlzLmluc3RhbmNlLmNhbnZhcy5oZWlnaHQgKS5kYXRhO1xyXG5cclxuICAgICAgZm9yKCBpID0gMDsgaSA8IHRoaXMuY2FudmFzLndpZHRoOyBpKysgKXtcclxuICAgICAgICBmb3IoIGogPSAwOyBqIDwgdGhpcy5jYW52YXMuaGVpZ2h0OyBqKysgKXtcclxuICAgICAgICAgIHIgPSBwWygodGhpcy5pbnN0YW5jZS5jYW52YXMud2lkdGggKiBqKSArIGkpICogNF07XHJcbiAgICAgICAgICBnID0gcFsoKHRoaXMuaW5zdGFuY2UuY2FudmFzLndpZHRoICogaikgKyBpKSAqIDQgKyAxXTtcclxuICAgICAgICAgIGIgPSBwWygodGhpcy5pbnN0YW5jZS5jYW52YXMud2lkdGggKiBqKSArIGkpICogNCArIDJdO1xyXG4gICAgICAgICAgbWF0cml4W2ldW2pdID0gJ3JnYmEoJyArIHIgKyAnLCAnICsgZyArICcsICcgKyBiICsgJywgMSknO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0sXHJcbiAgZmlsdGVyOiB7fSxcclxuICBtb2RlRGF0YToge1xyXG4gICAgZmlsdGVyczoge1xyXG4gICAgICBuYW1lOiBudWxsLFxyXG4gICAgICBwYXJhbTogbnVsbFxyXG4gICAgfSxcclxuICAgIHByb2NlZWQ6IFsnc291bWlzQ2hhbXAnLCAnc291bWlzQ29sb3InXSxcclxuICAgIG1hdHJpeE1ldGhvZDogJ2NvbG9yTWF0cml4J1xyXG4gIH1cclxufSk7Iiwic2xpZGVQYXJ0aWNsZXMucmVnaXN0ZXJUcmFuc2l0aW9uKHtcclxuXHJcbiAgICAvLyBNYWtlIHBhcnRpY2xlcyBmcmVlIGZvciBzaG9ydCBkZWxheS5cclxuICAgIGxpYmVyYXRpb25QYXJ0czogZnVuY3Rpb24gKCBkZWxheSApIHtcclxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICB2YXIgZCA9IGRlbGF5IHx8IHRoaXMuc2V0dGluZ3MuZGVsYXk7XHJcblxyXG4gICAgICAvLyBNYWtlIGZyZWUgcGFydHMgZnJvbSBjdXJyZW50IGZvcm0gdmFsdWUuXHJcbiAgICAgIHRoaXMuY2xlYXJQYXJ0cygpO1xyXG5cclxuICAgICAgLy8gUGFydGljbGVzIGFyZSBmcmVlIGZyb20gbWF0cml4IG9mIHR5cGUgJ3ZhbHVlJy5cclxuICAgICAgdGhpcy5saWJlcmF0aW9uID0gIXRoaXMubGliZXJhdGlvbjtcclxuXHJcbiAgICAgIC8vIE1hc3Mgc3RyZW5ndGggaXMgaW52ZXJ0ZWQuXHJcbiAgICAgIHRoaXMubWFzc0FjdGl2ZSA9IHRoaXMuc2V0dGluZ3MuYW50aU1hc3M7XHJcblxyXG4gICAgICAvLyBXaGVuIGRlbGF5J3Mgb3Zlciwgd2hlIHJldHVybiB0byBub3JtYWwgbWFzcyBzdHJlbmd0aCBhbmQgcGFydGljbGVzIGJlaGF2aW9yLlxyXG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgc2VsZi5tYXNzQWN0aXZlID0gc2VsZi5zZXR0aW5ncy5tYXNzO1xyXG4gICAgICAgIHNlbGYubGliZXJhdGlvbiA9ICFzZWxmLmxpYmVyYXRpb247XHJcbiAgICAgIH0sIGQpXHJcbiAgICB9LFxyXG4gICAgLy8gT3RoZXIgY3VzdG9tIGFuaW0uXHJcbiAgICBkcmF3TWVBbmRFeHBsb2RlOiBmdW5jdGlvbiAoIGRlbGF5ICkge1xyXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgIHZhciBkID0gZGVsYXkgfHwgdGhpcy5zZXR0aW5ncy5kZWxheTtcclxuXHJcbiAgICAgIC8vIE1ha2UgZnJlZSBwYXJ0cyBmcm9tIHRoZWlyIGluU2hhcGUgdmFsdWUuXHJcbiAgICAgIHRoaXMuY2xlYXJQYXJ0cygpO1xyXG4gICAgICB0aGlzLnN3aXRjaE1vZGUoJ21vZGVTaGFwZScpO1xyXG4gICAgICAvLyBQYXJ0aWNsZXMgYXJlIGZyZWUgZnJvbSBtYXRyaXggb2YgdHlwZSAndmFsdWUnLlxyXG4gICAgICB0aGlzLmxpYmVyYXRpb24gPSAhdGhpcy5saWJlcmF0aW9uO1xyXG5cclxuICAgICAgLy90aGlzLnNldHRpbmdzLmRyYXcgPSBmYWxzZTtcclxuICAgICAgc2VsZi5zZXR0aW5ncy5kcmF3ID0gdHJ1ZTtcclxuXHJcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcclxuICAgICAgICBzZWxmLnN3aXRjaE1vZGUoJ21vZGVDb2xvcicpO1xyXG4gICAgICB9LCBkKVxyXG4gICAgfVxyXG59KTsiXX0=
