/*******************************************************************************
 *Copyright (C) 2017 Create-Net / FBK.
 *All rights reserved. This program and the accompanying materials
 *are made available under the terms of the Eclipse Public License 2.0
 *which accompanies this distribution, and is available at
 *https://www.eclipse.org/legal/epl-2.0/
 *
 *Contributors:
 *    Create-Net / FBK - initial API and implementation
 ******************************************************************************/
var parser = require("./lib/parser");

var config = require('./config.json');

var _ = require("lodash");
var d = require("debug")("agile:gen");



module.exports.loadApi = function () {
  return parser.run();
};

module.exports.export = function (format) {

  module.exports.loadApi()
    .then(function (definition) {
      d("Loaded %s classes", _.size(definition.classes));
      return definition.render(format);
    })
    .then(function (outputs) {

      if(typeof outputs === 'string') {
        outputs = [
          {
            filename: "/api." + format,
            content: outputs
          }
        ];
      }

      if(!outputs) {
        throw new Error("No output available for " + format);
      }

      return Promise.all(outputs.map(function(file) {
        try {

          var fs = require('fs');
          var path = require('path');

          var filepath = config.outputDir +
            path.sep + format +
            path.sep + file.filename;

          var dirname = path.dirname(filepath);

          if(!fs.existsSync(dirname)) {
            d("Create directory %s", dirname);
            require('mkdirp').sync(dirname);
          }

          d("Writing %s", filepath);
          require('fs').writeFileSync(
            filepath,
            file.content
          );
          return Promise.resolve();
        }
        catch(e) {
          return Promise.reject(e);
        }
      }));
    })
    .catch(function (e) {
      throw e;
    });

};

module.exports.exportAll = function () {
  var glob = require("glob");
  var path = require("path");
  glob("./lib/renderer/*.js", function (err, files) {
    if(err) throw err;
    files.forEach(function (file) {
      var format = path.basename(file, '.js');
      d("Render format %s", format);
      module.exports.export(format);
    });
  });
};
