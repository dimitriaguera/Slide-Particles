slideParticles.registerMode( 'modeColor', {
  options: {},
  proto_particles: {
    soumisColor: function(){
      this.inForm = 0;
      var testX = Math.floor( this.position.x );
      var testY = Math.floor( this.position.y );
      this.color = ( this.instance.activeIndex !== null ) ? this.instance.matrixTab[this.instance.activeIndex].getMatrix()[testX][testY] : this.instance.settings.particleColor;
    }
  },
  proto_matrix: {
    colorMatrix: function ( matrix ) {
      var a = this.size.x,
        c = this.size.y,
        d = Math.floor(c + this.size.h);
      if( matrix.length < a || matrix[0].length < d ) return;

      var i, j, r, g, b, p = this.context.getImageData(0, 0, this.instance.canvas.width, this.instance.canvas.height).data;

      for( i = 0; i < this.canvas.height; i++ ){
        for( j = 0; j < this.canvas.width; j++ ){
          r = p[((this.instance.canvas.width * j) + i) * 4];
          g = p[((this.instance.canvas.width * j) + i) * 4 + 1];
          b = p[((this.instance.canvas.width * j) + i) * 4 + 2];
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