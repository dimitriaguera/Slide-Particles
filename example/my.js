(function (window, document, undefined) {

"use strict";

  var gui, btnUpload, controller = {},
    dp = slideParticles.getInstance({stop: false, density: 5000});
    dp.canvas.onmousemove = function ( e ) {
      dp.liberation = true;
    };

    dp.canvas.onmouseout = function ( e ) {
      dp.liberation = false;
    };

  //// Upload Input.
  btnUpload = document.getElementById('fileupload');
  btnUpload.onchange = function(e){
    dp.load(e, true);
  };

  /// Controllers.
  controller.modeColor = function () {
    dp.switchMode( 'modeColor' );
  };
  controller.modeShape = function () {
    dp.switchMode( 'modeForm' );
  };

  ///// GUI Form.

  gui = new dat.GUI();
  gui.add(dp.settings, 'draw', false);
  gui.add(dp, 'stop');
  gui.add(dp, 'start');
  var f2 = gui.addFolder('Modes');
  f2.add(controller, 'modeColor');
  f2.add(controller, 'modeShape');
  var f1 = gui.addFolder('Particles');
  f1.add(dp.settings, 'density', 0, 20000);
  f1.add(dp.settings, 'particleSize', 1, 30);
  f1.add(dp.settings, 'particleColor');
  f1.add(dp.settings, 'initialVelocity', 0, 10);
  var f3 = gui.addFolder('Mass');
  f3.add(dp.champs[0], 'mass', -5000, 5000);
  f3.add(dp.champs[0].position, 'x', 0, dp.settings.width);
  f3.add(dp.champs[0].position, 'y', 0, dp.settings.height);

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