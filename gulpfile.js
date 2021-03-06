var gulp = require('gulp');
var $    = require('gulp-load-plugins')();
var argv = require('yargs').argv;

var clean = require('gulp-clean');
var rename = require('gulp-rename');
var size = require('gulp-size');



// babel
// uglify
// concat

// Check for --production flag
var isProduction = !!(argv.production);

// Browsers to target when prefixing CSS.
var COMPATIBILITY = ['last 2 versions', 'ie >= 9'];

// File paths to various assets are defined here.
var PATHS = {
  myjs: [
    'src/js/polyfill.js',
    'src/js/core.js',
    'src/js/shape.js',
    'src/js/color.js',
    'src/js/transitions.js'
  ]
};

// Combine JavaScript into one file
// In production, the file is minified
gulp.task('myjs', function() {
  var uglify = $.if(isProduction, $.uglify()
    .on('error', function (e) {
      console.log(e);
    }));

  return gulp.src(PATHS.myjs)
    .pipe($.sourcemaps.init())
    .pipe($.babel())
    .pipe($.if(isProduction, $.concat('slide-particles.min.js')))
    .pipe($.if(isProduction, uglify))
    .pipe($.if(!isProduction, $.concat('slide-particles.js')))
    .pipe($.if(!isProduction, $.sourcemaps.write()))
    .pipe($.size())
    .pipe(gulp.dest('dist'));
});


// Remove js et css files
gulp.task('clean', function(){
  return gulp.src(['dist/*'], {read: false})
    .pipe($.if(isProduction, $.clean({force: true})));
});


// Build the "dist" folder by running all of the above tasks
gulp.task('build', ['clean', 'myjs']);


gulp.task('default', ['myjs'], function() {
  gulp.watch(PATHS.myjs, ['myjs']);
});


