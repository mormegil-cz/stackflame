const gulp = require('gulp');
const browserify = require('browserify');
const source = require('vinyl-source-stream');
const watchify = require('watchify');
const tsify = require('tsify');
const terser = require('gulp-terser');
const sourcemaps = require('gulp-sourcemaps');
const buffer = require('vinyl-buffer');
const fancy_log = require('fancy-log');
const paths = {
    pages: ['src/*.htm'],
    css: ['src/css/*.css', 'node_modules/d3-flame-graph/dist/d3-flamegraph.css'],
    js: ['node_modules/d3/dist/d3.min.js', 'node_modules/d3-tip/dist/index.js', 'node_modules/d3-flame-graph/dist/d3-flamegraph.min.js']
};

gulp.task('copy-html', function () {
    return gulp.src(paths.pages)
        .pipe(gulp.dest('dist'));
});

gulp.task('copy-css', function () {
    return gulp.src(paths.css)
        .pipe(gulp.dest('dist/css'));
});

gulp.task('copy-js', function () {
    return gulp.src(paths.js)
        .pipe(gulp.dest('dist/js'));
});

const watchedBrowserify = watchify(browserify({
    basedir: '.',
    debug: true,
    entries: ['src/main.ts'],
    cache: {},
    packageCache: {}
}).plugin(tsify));

function bundle() {
    return watchedBrowserify
        .bundle()
        .on('error', fancy_log)
        .pipe(source('bundle.js'))
        .pipe(buffer())
        .pipe(sourcemaps.init({ loadMaps: true }))
        //.pipe(terser())
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('dist'));
}

gulp.task('default', gulp.series(gulp.parallel('copy-html', 'copy-css', 'copy-js'), bundle));
watchedBrowserify.on('update', bundle);
watchedBrowserify.on('log', fancy_log);
