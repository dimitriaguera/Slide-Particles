slideParticles.registerTransition({

    // Make particles free for short delay.
    liberationParts: function ( delay ) {
      var self = this;
      var d = delay || this.settings.delay;

      // Make free parts from current form value.
      this.clearParts();

      // Particles are free from matrix of type 'value'.
      this.liberation = !this.liberation;

      // Mass strength is inverted.
      this.massActive = this.settings.antiMass;

      // When delay's over, whe return to normal mass strength and particles behavior.
      setTimeout(function(){
        self.massActive = self.settings.mass;
        self.liberation = !self.liberation;
      }, d)
    },
    // Other custom anim.
    drawMeAndExplode: function ( delay ) {
      var self = this;
      var d = delay || this.settings.delay;

      // Make free parts from their inShape value.
      this.clearParts();
      this.switchMode('modeShape');
      // Particles are free from matrix of type 'value'.
      this.liberation = !this.liberation;

      //this.settings.draw = false;
      self.settings.draw = true;

      setTimeout(function(){
        self.switchMode('modeColor');
      }, d)
    }
});