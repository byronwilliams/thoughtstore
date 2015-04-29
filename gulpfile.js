var gulp = require('gulp');
var rename = require('gulp-rename');
var uglify = require('gulp-uglifyjs');
var concat = require('gulp-concat');
var clean = require('gulp-clean');
var order = require('gulp-order');
var less = require('gulp-less');
var minifyCSS = require('gulp-minify-css');
var ngHtml2Js = require("gulp-ng-html2js");

gulp.task('clean', function() {
  return gulp.src("build/*", {read: false})
    .pipe(clean());
    //.pipe(gulp.dest("build"));
});

gulp.task('buildAppJS', function() {
  return gulp.src("src/js/*.js")
    .pipe(order([
      "thoughtworks.js",
      "*.js"
    ]))
    .pipe(uglify("app.min.js", {
      outSourceMap: true
    }))
    .pipe(gulp.dest("build/js"));
});

gulp.task('buildAppPartials', function() {
  return gulp.src("src/partials/**/*.html")
    .pipe(ngHtml2Js({
        moduleName: "twp",
        prefix: "/partials/"
    }))
    .pipe(concat("partials.min.js"))
    //.pipe(uglify())
    .pipe(gulp.dest("build/js"));
});

gulp.task('buildVendorJS', function() {
  return gulp.src([
      "bower_components/angularjs/angular.min.js",
      "bower_components/angular-sanitize/angular-sanitize.min.js",
      "bower_components/angular-indexed-db/angular-indexed-db.min.js",
      "bower_components/angular-scroll-glue/src/scrollglue.js",
      "bower_components/angular-ui-router/release/angular-ui-router.min.js",
      "bower_components/node-uuid/uuid.js",
    ])
    .pipe(concat("vendor.min.js"))
    .pipe(gulp.dest("build/js"));
});

gulp.task('buildAppCSS', function() {
  return gulp.src("src/less/*.less")
    .pipe(less())
    .pipe(minifyCSS())
    .pipe(rename("app.min.css"))
    .pipe(gulp.dest("build/css"));
});

gulp.task('buildVendorCSS', function() {
  return gulp.src([
      "bower_components/purecss/build/pure-min.css",
      "bower_components/purecss/build/grids-responsive-min.css"
    ])
    .pipe(concat("vendor.min.css"))
    .pipe(gulp.dest("build/css"));
});

gulp.task('copyIndex', function() {
  return gulp.src("src/index.html")
    .pipe(gulp.dest("build"));
});

gulp.task('copyFonts', function() {
  return gulp.src("src/fonts/*")
    .pipe(gulp.dest("build/fonts"));
});

gulp.task("buildJS", ["buildAppJS", "buildVendorJS"]);
gulp.task("buildCSS", ["buildAppCSS", "buildVendorCSS"]);
gulp.task("build", ["buildJS", "buildCSS", "copyIndex", "copyFonts", "buildAppPartials"]);
