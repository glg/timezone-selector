// gulp
var gulp = require('gulp');

// plugins
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');
var clean = require('gulp-clean');
var nodemon = require('gulp-nodemon');
var runSequence = require('run-sequence');
var source = require('vinyl-source-stream');
var browserify = require('browserify');
var genTimezones = require('./generate-timezone');

var paths = {
  public:   ['app/public/'],
  scripts:  ['app/js/**/*.js', 'app/js/*.js']
};

// tasks
gulp.task('browserify', function() {
    // Grabs the app.js file
    return browserify('./app/js/main.js')
        // bundles it and creates a file called main.js
        .bundle()
        .pipe(source('bundle.js'))
        // saves it the public/js/ directory
        .pipe(gulp.dest('./app/public/js/'));
});
gulp.task('clean', function() {
    return gulp.src('./dist/*', {read: false})
      .pipe(clean());
});

gulp.task('watch', function() {
  // Watch less files
  gulp.watch(paths.scripts, ['build']);
});

gulp.task('start', function () {
  nodemon({
    script: 'server.js',
    ext: 'js html'
  });
});

gulp.task('generate-timezones', function() {
  gulp.src('./data/*')
    .pipe(genTimezones())
    .pipe(gulp.dest('./public/'));
});

// default task
gulp.task('default', function(){
    runSequence(
        ['build', 'start', 'watch']
    );
});
gulp.task('build', function() {
  runSequence(
    'clean',
    ['browserify', 'generate-timezones']
  );
});
