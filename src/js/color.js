slideParticles.registerMode( 'modeColor', {
  options: {},
  proto: {},
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

      var i, j, r, g, b, p = this.context.getImageData( 0, 0, this.instance.canvas.width, this.instance.canvas.height ).data;

      for( i = 0; i < this.canvas.width; i++ ){
        for( j = 0; j < this.canvas.height; j++ ){
          r = p[((this.instance.canvas.width * j) + i) * 4];
          g = p[((this.instance.canvas.width * j) + i) * 4 + 1];
          b = p[((this.instance.canvas.width * j) + i) * 4 + 2];
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