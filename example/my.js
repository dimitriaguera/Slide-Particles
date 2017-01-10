(function (window, document, undefined) {

"use strict";

  var gui, btnUpload, root, controller = {},
    dp = slideParticles.getInstance({
      stop: false,
      density: 5000,
      thumbWidth: 70,
      thumbHeight: 70
    });

    root = '../example/pictures/';

    dp.load([ 
      root + 'p1.jpg', 
      root + 'p2.jpg',
      root + 'p3.jpg',
      root + 'p4.jpg',
      root + 'p5.jpg',
      root + 'p6.jpg',
      root + 'p7.jpg',
      root + 'p8.jpg',
      ]);

    dp.canvas.onmousemove = function ( e ) {
      dp.liberation = true;
    };

    dp.canvas.onmouseout = function ( e ) {
      dp.liberation = false;
    };

  var JSON = {
    "preset": "",
    "closed": false,
    "remembered": {
      "Default": {
        "0": {
          "draw": false,
          "density": 5000,
          "particleSize": 1,
          "initialVelocity": 3,
          "mass": 100,
          "particleColor": "#000",
          "background": "#fff",
          "antiMass": -500,
          "delay": 700
        }
      },
      "Explode": {
        "0": {
          "draw": false,
          "density": 5000,
          "particleSize": 1,
          "initialVelocity": 3,
          "mass": 5000,
          "particleColor": "#000",
          "background": "#fff",
          "antiMass": -5000,
          "delay": 700
        }
      },
      "Implode": {
        "0": {
          "draw": false,
          "density": 5000,
          "particleSize": 1,
          "initialVelocity": 3,
          "mass": -5000,
          "particleColor": "#000",
          "background": "#fff",
          "antiMass": 5000,
          "delay": 700
        }
      }
    }
  }

  //// Upload Input.
  btnUpload = document.getElementById('fileupload');
  btnUpload.onchange = function( e ){
    dp.load( e );
  };

  /// Controllers.
  controller.modeColor = function () {
    dp.switchMode( 'modeColor' );
  };
  controller.modeShape = function () {
    dp.switchMode( 'modeForm' );
  };
  controller.uploadFiles = function () {
    btnUpload.click();
  };

  ///// GUI Form.

  gui = new dat.GUI({
    load: JSON,
    preset: 'Implode'
  });

  gui.remember(dp.settings);

  gui.add(controller, 'uploadFiles');
  gui.add(dp.settings, 'draw', false);

  var f0 = gui.addFolder('Animation');
  f0.add(dp, 'stop');
  f0.add(dp, 'start');

  var f1 = gui.addFolder('Modes');
  f1.add(controller, 'modeColor');
  f1.add(controller, 'modeShape');

  var f2 = gui.addFolder('Particles');
  f2.add(dp.settings, 'density', 0, 20000);
  f2.add(dp.settings, 'particleSize', 1, 30);
  f2.add(dp.settings, 'initialVelocity', 0, 10);

  var f3 = gui.addFolder('Mass');
  f3.add(dp.settings, 'mass', -5000, 5000);
  f3.add(dp.champs[0].position, 'x', 0, dp.settings.width);
  f3.add(dp.champs[0].position, 'y', 0, dp.settings.height);

  var f4 = gui.addFolder('Color');
  f4.addColor(dp.settings, 'particleColor');
  f4.addColor(dp.settings, 'background').onChange(function( value ){
    dp.canvas.style.backgroundColor = value;
    document.body.style.backgroundColor = value;
  });

  var f5 = gui.addFolder('Change picture modes');
  f5.add(dp.settings, 'mass', -5000, 5000);
  f5.add(dp.settings, 'antiMass', -5000, 5000);
  f5.add(dp.settings, 'delay');

/*  defaults = {
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
    switchModeCallback: null,
    modes: {
      modeForm: true,
    }
  };*/

  
   //btnStart.onclick = diaporama.start.bind(diaporama);
   //btnStop.onclick = diaporama.stop.bind(diaporama);
  
  

})(this, this.document);