#-------------------------------------------------------------------------------
# Copyright (C) 2017 Create-Net / FBK.
# All rights reserved. This program and the accompanying materials
# are made available under the terms of the Eclipse Public License v1.0
# which accompanies this distribution, and is available at
# http://www.eclipse.org/legal/epl-v10.html
# 
# Contributors:
#     Create-Net / FBK - initial API and implementation
#-------------------------------------------------------------------------------
var gulp = require('gulp');
var webserver = require('gulp-webserver');

gulp.task('build', function() {
  // require("./index").exportAll();
  var child = require("child_process").spawn(__dirname + "/bin/api-export");
  child.stderr.pipe(process.stderr);
  child.stdout.pipe(process.stdout);
});

gulp.task('default', function() {

  gulp.start('webserver');

  gulp.watch([
    "./lib/**/*.js",
    "./lib/renderer/**/*.js",
    "./lib/model/**/*.js",
    "./template/**/*.*",
    require('./config.json').baseDir + "/**/*.yml",
  ], ['build'])
  ;
  
});

gulp.task('webserver', function() {

  var serverPath = require('path').resolve(require('./config.json').outputDir + "/html");
  gulp.src(serverPath)
      .pipe(webserver({
        livereload: true,
        fallback: 'api.html',
        directoryListing: {
          path: serverPath
        },
        open: false
      }));

});
