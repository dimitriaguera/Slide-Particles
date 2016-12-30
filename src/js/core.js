

var slideParticles = (function (window, document, undefined) {

    "use strict";


    var fn, filter, proceed, filters, matrixMethod,
    
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
      text:'Salut !',
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
      switchModeCallback: null
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
      getViewport: function() {
        return {
          w: Math.max(document.documentElement.clientWidth, window.innerWidth || 0),
          h: Math.max(document.documentElement.clientHeight, window.innerHeight || 0)
        };
      },

      append: function ( target, element ) {
        if ( typeof target === 'string' ) {
          document.getElementById( target ).appendChild( element );
        }
        else {
          target.appendChild( element );
        }
      },
      //setCanvasSize: function ( canvas ) {
      //  //var ws = fn.getViewport();
      //  //canvas.width = ( dp.settings.width < ws.w ) ? dp.settings.width : ws.w;
      //  //canvas.height = ( dp.settings.height < ws.h - 10 ) ? dp.settings.height : ws.h - 10;
      //
      //  dp.settings.massX = dp.canvas.width/2;
      //  dp.settings.massY = dp.canvas.height/2;
      //
      //},
      simpleExtend: function ( a, b ){
        for( var key in b )
          if( b.hasOwnProperty( key ) )
            a[key] = b[key];
        return a;
      }
    };

  function Matrix ( instance, input, customSize ) {
    this.instance = instance;
    this.type = ( typeof input !== 'string' ) ? 'picture' : 'text';
    this.picture = input;
    this.canvas = this.instance.getCanvas( customSize );
    this.context = this.instance.getContext2D( this.canvas );
    this.size = ( typeof input !== 'string' ) ? this.instance.getImageSize( input, customSize ) : {x:0, y:0, w:0, h:0};
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

      switch ( this.type ) {

        case 'picture':
          this.context.drawImage( this.picture, this.size.x, this.size.y, this.size.w, this.size.h );
          break;

        case 'text':
          this.setText();
          break;

        default:
          return false;
      }

      if( !this.size.w && !this.size.h ) return false;

      return this.context.getImageData( this.size.x, this.size.y, this.size.w, this.size.h );
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

      var i, w = 0, x = 20, y = 80,
        lines = this.picture.split("\n"),
        fontSize = this.instance.settings.fontSize;

      this.context.font = fontSize + "px " + this.instance.settings.font;
      this.context.fillStyle = this.instance.settings.textColor;
      this.context.textAlign = "left";

      for (i = 0; i < lines.length; i++) {
        this.context.fillText( lines[i], x, y + i*fontSize );
        w = Math.max( w, Math.floor(this.context.measureText( lines[i] ).width) );
      }

      this.size.x = Math.max( x,  this.size.x );
      this.size.y = Math.max( (y - fontSize), this.size.y );
      this.size.w = Math.max( (w + fontSize), this.size.w );
      this.size.h = Math.max( (fontSize * i + fontSize), this.size.h );
    },

    applyFilter: function ( name, argArray ) {
      var i, p = this.getPixels();
      if ( name ) {
        var args = [ p ];
        for ( i = 0; i < argArray.length; i++ ) {
          args.push( argArray[i] );
        }
        this.pixels = filter[name].apply( null, args );
        this.context.putImageData( this.pixels, this.size.x, this.size.y );
      }
      else {
        this.pixels = p;
      }
    },

    buildAllMatrix: function () {
      var m, mA = {};
      for ( var mode in matrixMethod ) {
        m = this.creaMatrix();
        this.applyFilter( filters[mode].name, this.instance.settings[filters[mode].param] );
        this[matrixMethod[mode]](m, 1);
        mA[mode] = m;
      }
      return mA;
    },

    getMatrix: function(){
      return this.matrix[this.instance.mode];
    },

    creaMatrix: function () {
      var a = this.instance.settings.width,
        b = this.instance.settings.height,
        mat = new Array( a ), i, j;
      for( i = 0; i < a; i++ ) {
        mat[i] = new Array( b );
        for( j = 0; j < b; j++ ){
          mat[i][j] = 0;
        }
      }
      return mat;
    },

    clearMatrix: function( value ){
      var i, j, l, m, v,
        matrix = this.getMatrix();
      v = value || 0;
      l = matrix.length;
      m = matrix[0].length;
      for( i = 0; i < l; i++ ){
        for( j = 0; j < m; j++ ){
          matrix[i][j] = v;
        }
      }
    },

    valueMatrix: function ( matrix, value ) {
      var a = this.size.x,
        b = Math.floor(a + this.size.w),
        c = this.size.y,
        d = Math.floor(c + this.size.h);
      if( matrix.length < a || matrix[0].length < d ) return;

      var i, j, p = this.context.getImageData(0, 0, this.instance.canvas.width, this.instance.canvas.height).data;

      for( i = a; i < b; i++ ){
        for( j = c; j < d; j++ ){
          var pix = p[((this.instance.canvas.width * j) + i) * 4];
          matrix[i][j] = ( pix === 255 ) ? value : 0;
        }
      }
    },

    renderThumbnails: function ( target, filter ) {
      var self = this;
      var m = new Matrix ( this.instance, this.picture, { w:this.instance.settings.thumbWidth, h:this.instance.settings.thumbHeight } );

      if ( filter ) {
        m.applyFilter( filters[this.instance.mode].name, this.settings[filters[this.instance.mode].param] );
      }

      m.canvas.onclick = function( matrix ){
        return function ( e ) {
          self.instance.goTo( matrix );
          self.instance.clearParts();
          self.instance.liberationParts1();
        }
      }( m );

      this.instance.thumbOriginalTab.push( m );
      fn.append( target, m.canvas );

      return m;
    }
  };

  /****
   * PUBLIC METHODS
   *
   *
   */

  function DiapPart (  options ) {
    this.settings = Object.assign( {}, defaults, options );
    this.matrixTab = [];
    this.thumbOriginalTab = [];
    this.particles = [];
    this.champs = [];
    this.mode = this.settings.initialMode;
    this.liberation = false;
    this.activeIndex = null;
    this.canvas = this.getCanvas();
    this.context = this.getContext2D( this.canvas );
  }

  DiapPart.prototype = {

      // constructor: DiapPart,

      init: function () {

        fn.append( this.settings.targetElement, this.canvas );
        this.canvas.style.backgroundColor = this.settings.background;
        this.centerMass();
        this.champs.push( new Champ( new Vector(this.settings.massX, this.settings.massY), this.settings.mass ) );
        this.loop();

      },

      set: function ( options ){
        Object.assign( this.settings, options );
      },

      createSlide: function( input, customSize ){
        var m = new Matrix ( this, input, customSize );
        this.activeIndex = ( this.activeIndex === null ) ? 0 : this.activeIndex;
        this.matrixTab.push( m );
        return m;
      },

      getCanvas: function ( size ) {
        var canvas = document.createElement( 'canvas' ),
            s = size || {};

        canvas.height = ( s.h ) ? s.h : this.settings.height;
        canvas.width = ( s.w ) ? s.w : this.settings.width;

        return canvas;
      },

      getContext2D: function ( canvas ) {
        return canvas.getContext( '2d' );
      },

      getImageSize: function ( img, size ) {
        var w = img.width, 
            h = img.height,
            cw = ( size ) ? size.w : this.canvas.width,
            ch = ( size ) ? size.h : this.canvas.height,
            ratio = w / h;

        if ( w >= h && w > cw ) {
          w = cw;
          h = Math.round( w / ratio );
        }
        
        else {
          if ( h > ch ) {
            h = ch;
            w = Math.round( h * ratio );
          }
        }

        return {
          x: Math.round( ( cw - w ) / 2 ),
          y: Math.round( ( ch - h ) / 2 ), 
          w: w,
          h: h
        }
      },

      load: function ( e ) {
        var i, files = e.target.files, self = this;
        if ( !files ) return;

        for ( i = 0; i < files.length; i++ ){
          var file = files[i];
          if ( !file.type.match( 'image' ) ) continue;

          var reader = new FileReader();
          reader.onload = function ( event ) {
            var img = new Image();
            img.onload = function(){
              var m;
              m = self.createSlide( this );
              m.renderThumbnails( self.settings.thumdnailsID, false );
            };
            img.src = event.target.result;
          };
          reader.readAsDataURL( file );
        }
      },

      switchMode: function ( mode ) {

        this.mode = mode;

        if( typeof this.settings.switchModeCallback === 'function' ) {
          this.settings.switchModeCallback.call( this );
        }
      },

      addMass: function( x, y, mass ){
        var m = new Champ( new Vector(x, y), mass );
        this.champs.push( m );
        return m;
      },

      centerMass: function () {
        //var ws = fn.getViewport();
        //canvas.width = ( dp.settings.width < ws.w ) ? dp.settings.width : ws.w;
        //canvas.height = ( dp.settings.height < ws.h - 10 ) ? dp.settings.height : ws.h - 10;

        this.settings.massX = this.canvas.width/2;
        this.settings.massY = this.canvas.height/2;

      },

      partProceed: function ( particle ) {
        var i, l = proceed[this.mode].length;
        for ( i = 0; i < l; i++ ) {
          particle[proceed[this.mode][i]]();
        }
      },

      goTo: function ( matrix ) {
        this.activeIndex = this.thumbOriginalTab.indexOf( matrix );
      },

      liberationParts1: function () {
        var self = this;
        this.liberation = !this.liberation;
          this.champs[0].mass = this.settings.antiMass;
          setTimeout(function(){
            self.champs[0].mass = self.settings.mass;
            self.liberation = !self.liberation;
          }, 500)
      },

      creaParts: function () {
        if (this.particles.length < this.settings.density) {
          var i, nb = this.settings.density - this.particles.length;
          for ( i = 0; i < nb; i++ ) {
            this.particles.push(new Particle(this, new Vector(Math.random() * this.canvas.width, Math.random() * this.canvas.height), new Vector(realRandom(this.settings.initialVelocity), realRandom(this.settings.initialVelocity)), new Vector(0, 0), 0, false));
          }
        }
      },

      upgradeParts: function () {
        var currentParts = [],
            i, l = this.particles.length;
        for( i = 0; i < l; i++ ){
          var particle = this.particles[i],
              pos = particle.position;
          if( pos.x >= this.canvas.width || pos.x <= 0 || pos.y >= this.canvas.height || pos.y <= 0 ) continue;
          this.partProceed( particle );
          particle.move();
          currentParts.push( particle );
        }
        this.particles = currentParts;
        this.settings.bigbang = false;
      },

      drawParts: function () {
        var i, n = this.particles.length;
        for( i = 0; i < n; i++ ){
          var pos = this.particles[i].position;
          this.context.fillStyle = this.particles[i].color;
          this.context.fillRect(pos.x, pos.y, this.settings.particleSize, this.settings.particleSize);
        }
      },

      clearParts: function () {
        var i, l = this.particles.length;
        for( i = 0; i < l; i++ ){
          this.particles[i].inForm = 0;
        }
      },

      // On nettoie le canvas.
      clear: function () {
        if( !this.settings.draw ) {
          this.context.clearRect( 0, 0, this.canvas.width, this.canvas.height );
        }
      },

      // Rappel de boucle.
      queue: function () {
        var self = this;
        if( !this.settings.stop ) {
                this.requestID = window.requestAnimationFrame( self.loop.bind(self) );
        } else {
                window.cancelAnimationFrame( self.requestID );
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

      blackAndWhite: function ( pixels, threshold ) {
        if ( !pixels ) return pixels;
        var i, r, g, b, v, d = pixels.data;
        for ( i = 0; i < d.length; i+=4 ) {
          r = d[i];
          g = d[i+1];
          b = d[i+2];
          v = (0.2126*r + 0.7152*g + 0.0722*b >= threshold) ? 255 : 0;
          d[i] = d[i+1] = d[i+2] = v
        }
        return pixels;
      }

    };
    
   function realRandom( max ){
      return Math.cos((Math.random() * Math.PI)) * max;
    }

    function Vector( x, y ) {
      this.x = x || 0;
      this.y = y || 0;
    }

    // Methodes sur les vecteurs.
    // Ajouter un vecteur a un autre.
    Vector.prototype.add = function(vector){
      this.x += vector.x;
      this.y += vector.y;
    };

    // Inverser la direction du vecteur.
    Vector.prototype.getInvert = function(){
      this.x = -1 * (this.x);
      this.y = -1 * (this.y);
    };

    //Obtenir la magnitude (longueur) d'un vecteur.
    Vector.prototype.getMagnitude = function(){
      return Math.sqrt(this.x * this.x + this.y * this.y)
    };

    // Obtenir l'angle d'un vecteur par rapport à l'absisse.
    Vector.prototype.getAngle = function(){
      return Math.atan2(this.y, this.x);
    };

    // Permet d'obtenir un nouveau vecteur à partir d'un angle et d'une longueur.
    Vector.prototype.fromAngle = function ( angle, magnitude ) {
      return new Vector(magnitude * Math.cos(angle), magnitude * Math.sin(angle));
    };

    // Constructeur particule.
    function Particle( instance, position, vitesse, acceleration ) {
      this.instance = instance;
      this.position = position || new Vector(0, 0);
      this.vitesse = vitesse || new Vector(0, 0);
      this.acceleration = acceleration || new Vector(0, 0);
      this.color = this.instance.settings.particleColor;
      this.inForm = 0;
    }

    // Mouvement particule.
    Particle.prototype.move = function(){
      this.vitesse.add( this.acceleration );
      this.position.add( this.vitesse );
    };

    // Force du champ appliqué à la particule.
    Particle.prototype.soumisChamp = function() {

      if ( !this.instance.champs[0].mass ) return;
      if ( this.inForm !== 1 ) {

        var totalAccelerationX = 0;
        var totalAccelerationY = 0;
        var l = this.instance.champs.length;

        for( var i = 0; i < l; i++ ){
          // Distance particule/champ.
          var distX = this.instance.champs[i].position.x - this.position.x;
          var distY = this.instance.champs[i].position.y - this.position.y;
          var force = this.instance.champs[i].mass / Math.pow(distX * distX + distY * distY, 1.5);
          totalAccelerationX += distX * force;
          totalAccelerationY += distY * force;
        }
        this.acceleration = new Vector( totalAccelerationX, totalAccelerationY );
      }
    };

    // Passage dans la forme appliqué à la Particle.
    Particle.prototype.soumisForm = function(){

      if( this.instance.liberation ){
        this.inForm = 0;
        return;
      }

      var testX = Math.floor( this.position.x );
      var testY = Math.floor( this.position.y );
      var value = ( this.instance.activeIndex !== null ) ? this.instance.matrixTab[this.instance.activeIndex].getMatrix()[testX][testY] : 0;

      if ( value !== 0 ){
        if( this.inForm !== 1 ){
          this.inForm = 1;
          this.vitesse = new Vector(this.vitesse.x * 0.2, this.vitesse.y * 0.2);
          this.acceleration = new Vector(0, 0);
        }
      }
      else {
        if( this.inForm === 1 ){
          this.vitesse.getInvert();
        }
      }
    };

    // Construction du champ.
    function Champ( point, mass ) {
      this.position = point;
      this.setMass( mass );
    }

    Champ.prototype.setMass = function( mass ){
      this.mass = mass || 0;
      this.color = mass < 0 ? "#f00" : "#0f0";
    };


  // POLYFILL

  // Production steps of ECMA-262, Edition 5, 15.4.4.14
  // Référence : http://es5.github.io/#x15.4.4.14
  if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function(searchElement, fromIndex) {
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
    Object.assign = function (target, varArgs) { // .length of function is 2
      'use strict';
      if (target == null) { // TypeError if undefined or null
        throw new TypeError('Cannot convert undefined or null to object');
      }

      var to = Object(target);

      for (var index = 1; index < arguments.length; index++) {
        var nextSource = arguments[index];

        if (nextSource != null) { // Skip over if undefined or null
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

  (function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
      window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
      window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame']
        || window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
      window.requestAnimationFrame = function(callback, element) {
        var currTime = new Date().getTime();
        var timeToCall = Math.max(0, 16 - (currTime - lastTime));
        var id = window.setTimeout(function() { callback(currTime + timeToCall); },
          timeToCall);
        lastTime = currTime + timeToCall;
        return id;
      };

    if (!window.cancelAnimationFrame)
      window.cancelAnimationFrame = function(id) {
        clearTimeout(id);
      };
  }());

  return {

    getInstance: function(  options ) {
      var i = new DiapPart( options );
      i.init();
      return i;
    },

    registerModule: function (name, param) {
      fn.simpleExtend( DiapPart.prototype, param.proto );
      defaults[name] = param.options;
    },

    registerMode: function ( name, param ) {

      fn.simpleExtend( defaults, param.options );
      fn.simpleExtend( Particle.prototype, param.proto_particles );
      fn.simpleExtend( Matrix.prototype, param.proto_matrix );

      filters[name] = param.scenario.filters;
      proceed[name] = param.scenario.proceed;
      matrixMethod[name] = param.scenario.matrixMethod;
    }
  };

})(this, this.document);