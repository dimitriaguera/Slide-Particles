(function (window, document, undefined) {

"use strict";

  var diaporama = slideParticles.getInstance({stop: false});
  var d2 = slideParticles.getInstance({stop: false, text: 'OnCollab teste tres long'});
  var d3 = slideParticles.getInstance({stop: false, text: 'ChrisRod'});
  var d4 = slideParticles.getInstance({stop: false, text: 'Ratking'});
  var d5 = slideParticles.getInstance({stop: false, text: 'Pedales'});
  var d6 = slideParticles.getInstance({stop: false, text: 'La Muse'});

  diaporama.createSlide( diaporama.settings.text );
  d2.createSlide( d2.settings.text );
  d3.createSlide( d3.settings.text );
  d4.createSlide( d4.settings.text );
  d5.createSlide( d5.settings.text );
  d6.createSlide( d6.settings.text );

    diaporama.canvas.onmousemove = function ( e ) {
      diaporama.liberation = true;
    };

    diaporama.canvas.onmouseout = function ( e ) {
      diaporama.liberation = false;
    };

  //window.onload = function(){
  //
  //  //// MOUSEMOVE
  //
  //  diaporama.canvas.onmousemove = function ( e ) {
  //    diaporama.champs[0].mass = -500;
  //    diaporama.champs[0].position.x = e.clientX;
  //    diaporama.champs[0].position.y = e.clientY;
  //  };
  //
  //  diaporama.canvas.onmouseout = function ( e ) {
  //    diaporama.champs[0].mass = diaporama.settings.mass;
  //    diaporama.champs[0].position.x = diaporama.settings.massX;
  //    diaporama.champs[0].position.y = diaporama.settings.massY;
  //  };
  //
  //  //// FORMULAIRE
  //
  //  function applyInputEvent ( input ) {
  //
  //    if ( input[1].type === 'checkbox' ) {
  //      input[1].onchange = function( e ){
  //        diaporama.settings[input[0]] = this.checked;
  //      };
  //      return;
  //    }
  //
  //    if ( Array.isArray( diaporama.settings[input[0]] ) ){
  //      input[1].value = diaporama.settings[input[0]][0];
  //      input[1].onchange = function( e ){
  //        diaporama.settings[input[0]][0] = this.value;
  //      };
  //    }
  //    else {
  //      input[1].value = diaporama.settings[input[0]];
  //      input[1].onchange = function( e ){
  //        diaporama.settings[input[0]] = this.value;
  //      };
  //    }
  //  }
  //
  //  var inputs = [
  //    [ 'density', document.getElementById('density') ],
  //    [ 'particleSize', document.getElementById('particle-size') ],
  //    [ 'initialVelocity', document.getElementById('particle-velocity') ],
  //    [ 'draw', document.getElementById('particle-draw') ],
  //    [ 'particleColor', document.getElementById('particle-color') ],
  //    [ 'mass', document.getElementById('mass') ],
  //    [ 'antiMass', document.getElementById('anti-mass') ],
  //    [ 'thresholdNB', document.getElementById('nb-treshold') ]
  //  ];
  //
  //  for( var i = 0; i < inputs.length; i++ ) {
  //    applyInputEvent( inputs[i] );
  //  }
  //
  //  var btnModeForm = document.getElementById('nb-filter'),
  //    btnModeColor = document.getElementById('color-filter'),
  //    btnUpload = document.getElementById('fileupload'),
  //    btnStart = document.getElementById('start'),
  //    btnStop = document.getElementById('stop');
  //
  //  btnUpload.onchange = diaporama.load.bind(diaporama);;
  //  btnModeForm.onclick = function () {
  //    diaporama.switchMode( 'modeForm' );
  //  };
  //  btnModeColor.onclick = function () {
  //    diaporama.switchMode( 'modeColor' );
  //  };
  //
  //  btnStart.onclick = diaporama.start.bind(diaporama);
  //  btnStop.onclick = diaporama.stop.bind(diaporama);
  //
  //
  //  ////////////////////////////////// TEXT ////////////////////
  //  var textArea = document.getElementById('zone-texte');
  //  textArea.value = diaporama.settings.text;
  //
  //  function updateText () {
  //    diaporama.settings.text = this.value;
  //    diaporama.matrixTab[0].picture = this.value;
  //    diaporama.matrixTab[0].getPixels();
  //    diaporama.liberationParts1();
  //    diaporama.matrixTab[0].valueMatrix(diaporama.matrixTab[0].getMatrix(), 1);
  //  }
  //
  //  function addKeyEvent ( handler ) {
  //    this.addEventListener("keyup", handler);
  //  }
  //  function removeKeyEvent ( handler ) {
  //    this.removeEventListener("keyup", handler);
  //  }
  //
  //  (function () {
  //    if ( diaporama.activeIndex !== null ) return;
  //    var m = diaporama.createSlide( diaporama.settings.text );
  //    m.renderThumbnails( diaporama.settings.thumdnailsID, false );
  //  })();
  //
  //  textArea.onfocus = addKeyEvent.bind( textArea,  updateText );
  //  textArea.onblur = removeKeyEvent.bind( textArea,  updateText );

    //////////////////////////////////////////////////////////////////////
  //  //// MOUSEMOVE
  //
  //  diaporama2.canvas.onmousemove = function ( e ) {
  //    diaporama2.champs[0].mass = -500;
  //    diaporama2.champs[0].position.x = e.clientX;
  //    diaporama2.champs[0].position.y = e.clientY;
  //  };
  //
  //  diaporama2.canvas.onmouseout = function ( e ) {
  //    diaporama2.champs[0].mass = diaporama2.settings.mass;
  //    diaporama2.champs[0].position.x = diaporama2.settings.massX;
  //    diaporama2.champs[0].position.y = diaporama2.settings.massY;
  //  };
  //
  //  //// FORMULAIRE
  //
  //  function applyInputEvent2 ( input ) {
  //
  //    if ( input[1].type === 'checkbox' ) {
  //      input[1].onchange = function( e ){
  //        diaporama2.settings[input[0]] = this.checked;
  //      };
  //      return;
  //    }
  //
  //    if ( Array.isArray( diaporama2.settings[input[0]] ) ){
  //      input[1].value = diaporama2.settings[input[0]][0];
  //      input[1].onchange = function( e ){
  //        diaporama2.settings[input[0]][0] = this.value;
  //      };
  //    }
  //    else {
  //      input[1].value = diaporama2.settings[input[0]];
  //      input[1].onchange = function( e ){
  //        diaporama2.settings[input[0]] = this.value;
  //      };
  //    }
  //  }
  //
  //  var inputs2 = [
  //    [ 'density', document.getElementById('density2') ],
  //    [ 'particleSize', document.getElementById('particle-size2') ],
  //    [ 'initialVelocity', document.getElementById('particle-velocity2') ],
  //    [ 'draw', document.getElementById('particle-draw2') ],
  //    [ 'particleColor', document.getElementById('particle-color2') ],
  //    [ 'mass', document.getElementById('mass2') ],
  //    [ 'antiMass', document.getElementById('anti-mass2') ],
  //    [ 'thresholdNB', document.getElementById('nb-treshold2') ]
  //  ];
  //
  //  for( var i = 0; i < inputs2.length; i++ ) {
  //    applyInputEvent2( inputs2[i] );
  //  }
  //
  //  var btnModeForm2 = document.getElementById('nb-filter2'),
  //    btnModeColor2 = document.getElementById('color-filter2'),
  //    btnUpload2 = document.getElementById('fileupload2'),
  //    btnStart2 = document.getElementById('start2'),
  //    btnStop2 = document.getElementById('stop2');
  //
  //  btnUpload2.onchange = diaporama2.load.bind(diaporama2);;
  //  btnModeForm2.onclick = function () {
  //    diaporama2.switchMode( 'modeForm' );
  //  };
  //  btnModeColor2.onclick = function () {
  //    diaporama2.switchMode( 'modeColor' );
  //  };
  //
  //  btnStart2.onclick = diaporama2.start.bind(diaporama2);
  //  btnStop2.onclick = diaporama2.stop.bind(diaporama2);
  //
  //
  //  ////////////////////////////////// TEXT ////////////////////
  //  var textArea2 = document.getElementById('zone-texte2');
  //  textArea2.value = diaporama2.settings.text;
  //
  //  function updateText2 () {
  //    diaporama2.settings.text = this.value;
  //    diaporama2.matrixTab[0].picture = this.value;
  //    diaporama2.matrixTab[0].getPixels();
  //    diaporama2.liberationParts1();
  //    diaporama2.matrixTab[0].valueMatrix(diaporama2.matrixTab[0].getMatrix(), 1);
  //  }
  //
  //  (function () {
  //    if ( diaporama2.activeIndex !== null ) return;
  //    var m = diaporama2.createSlide( diaporama2.settings.text );
  //    m.renderThumbnails( diaporama2.settings.thumdnailsID, false );
  //  })();
  //
  //  textArea2.onfocus = addKeyEvent.bind( textArea2,  updateText2 );
  //  textArea2.onblur = removeKeyEvent.bind( textArea2,  updateText2 );
  //
  // };
  
  
//diaporama.loop();
  
  

})(this, this.document);