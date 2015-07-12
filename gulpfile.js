var gulp = require('gulp'),
    rename = require('gulp-rename'),
    uglify = require('gulp-uglify'),
    sourcemaps = require('gulp-sourcemaps'),
    concat = require('gulp-concat'),
    clean = require('gulp-clean'),
    order = require('gulp-order'),
    less = require('gulp-less'),
    minifyCSS = require('gulp-minify-css'),
    minifyhtml = require('gulp-minify-html'),
    ngHtml2Js = require("gulp-ng-html2js"),
    zip = require('gulp-zip')
    serve = require('gulp-serve');

gulp.task('clean', function() {
  return gulp.src("build/*", {read: false})
    .pipe(clean());
});

gulp.task('buildAppJS', [/*"clean"*/], function() {
  return gulp.src("src/js/*.js")
    .pipe(order([
      "thoughtworks.js",
      "*.js"
    ]))
    .pipe(sourcemaps.init())
      .pipe(concat("app.min.js"))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest("build/js"));
});

gulp.task('buildAppPartials', [/*"clean"*/], function() {
  return gulp.src("src/partials/**/*.html")
    .pipe(minifyhtml({
            empty: true,
            cdata: true,
            spare: true,
    }))
    .pipe(ngHtml2Js({
        moduleName: "twp",
        prefix: "/partials/"
    }))
    .pipe(sourcemaps.init())
      .pipe(concat("partials.min.js"))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest("build/js"));
});

gulp.task('buildVendorJS', [/*"clean"*/], function() {
  return gulp.src([
      "node_modules/angular/angular.js",
      "node_modules/angular-sanitize/angular-sanitize.min.js",
      //"node_modules/angular-indexed-db/angular-indexed-db.min.js",
      "node_modules/angularjs-scroll-glue/src/scrollglue.js",
      "node_modules/angular-ui-router/release/angular-ui-router.min.js",
      // "node_modules/node-uuid/uuid.js",
    ])
    .pipe(concat("vendor.min.js"))
    .pipe(gulp.dest("build/js"));
});

gulp.task('buildAppCSS', [/*"clean"*/], function() {
  return gulp.src("src/less/*.less")
    .pipe(less())
    .pipe(minifyCSS())
    .pipe(rename("app.min.css"))
    .pipe(gulp.dest("build/css"));
});

gulp.task('buildVendorCSS', [/*"clean"*/], function() {
  return gulp.src([
      "node_modules/purecss/build/pure-min.css",
      "node_modules/purecss/build/grids-responsive-min.css"
    ])
    .pipe(concat("vendor.min.css"))
    .pipe(gulp.dest("build/css"));
});

gulp.task('copyIndex', [/*"clean"*/], function() {
  return gulp.src("src/index.html")
    // .pipe(minifyhtml({
    //         empty: true,
    //         cdata: true,
    //         spare: true,
    // }))
    .pipe(gulp.dest("build"));
});

gulp.task('copyFonts', [/*"clean"*/], function() {
  return gulp.src("src/fonts/*")
    .pipe(gulp.dest("build/fonts"));
});

gulp.task('zip', function() {
  return gulp.src('build/**/*', {base: "."})
    .pipe(zip('public.zip'))
    .pipe(gulp.dest('zip'));
});

gulp.task('serve', serve('build'));

gulp.task('watch', function() {
    gulp.watch("src/less/*.less", ['buildAppCSS']);
    gulp.watch("src/js/**/*.js", ['buildAppJS']);
    gulp.watch("src/partials/**/*.html", ['buildAppPartials']);
    gulp.watch("bower_components/**/*.js", ['buildVendorJS']);
    gulp.watch("src/index.html", ['copyIndex']);
});

gulp.task("buildJS", ["buildAppJS", "buildVendorJS"]);
gulp.task("buildCSS", ["buildAppCSS", "buildVendorCSS"]);
gulp.task("build", ["buildJS", "buildCSS", "copyIndex", "copyFonts", "buildAppPartials"]);
