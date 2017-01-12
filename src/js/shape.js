slideParticles.registerMode( 'modeShape', {
  options: {
    thresholdNB: [128],
  },
  proto: {},
  proto_particles: {
    // Proceed particle according to matrix of type 'value'. Called in modeForm.
    soumisForm: function(){

      // If liberation flag, make the particle free.
      if( this.instance.liberation ){
        this.inForm = 0;
        return;
      }

      // Get particle position.
      var testX = Math.floor( this.position.x );
      var testY = Math.floor( this.position.y );

      // Check matrix value according to particle's position.
      var value = ( this.instance.activeIndex !== null ) ? this.instance.matrixTab[this.instance.activeIndex].getMatrix()[testX][testY] : 0;

      // If particle is inside a 'white zone'.
      if ( value !== 0 ){

        // If particles just come into the 'white zone'.
        if( this.inForm !== 1 ){

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
        if( this.inForm === 1 ){

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
    valueMatrix: function ( matrix, value ) {
      var a = this.size.x,
        b = Math.min( Math.floor(a + this.size.w), matrix.length ),
        c = this.size.y,
        d = Math.min( Math.floor(c + this.size.h), matrix[0].length );
      if( matrix.length < a || matrix[0].length < d ) return;

      var i, j, p = this.context.getImageData(0, 0, this.instance.canvas.width, this.instance.canvas.height).data;

      for( i = a; i < b; i++ ){
        for( j = c; j < d; j++ ){
          var pix = p[((this.instance.canvas.width * j) + i) * 4];
          matrix[i][j] = ( pix === 255 ) ? value : 0;
        }
      }
    }
  },
  filter: {
    // Turn colored picture on black and white. Used for modeForm.
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