/*******************************************************************************
 *Copyright (C) 2017 Create-Net / FBK.
 *All rights reserved. This program and the accompanying materials
 *are made available under the terms of the Eclipse Public License 2.0
 *which accompanies this distribution, and is available at
 *https://www.eclipse.org/legal/epl-2.0/
 *
 *SPDX-License-Identifier: EPL-2.0
 *
 *Contributors:
 *    Create-Net / FBK - initial API and implementation
 ******************************************************************************/

var parser = module.exports;

var config = require("../config.json");

var Promise = require('bluebird');
var _ = require("lodash");
var fs = require('fs');

var d = require("debug")("agile:gen:parser");

var Clazz = require("./model/Class");
var Definition = require('./model/Definition');

var loadYaml = function () {
  var YAML = require('yamljs');
  return findFiles().then(function (files) {
    return Promise
      .all(files)
      .map(function (file) {
        return new Promise(function (resolve, reject) {
          try {
            d("Loading %s", file);
            var doc = YAML.load(file);
            resolve(doc);
          } catch(e) {
            d("Cannot load %s: ", file, e.message);
            resolve();
          }
        });
      });
  });
};

var findFiles = function () {
  var glob = require("glob");
  return new Promise(function (resolve, reject) {
    glob(config.baseDir + "/**/*.yml", function (err, files) {
      if(err) return reject(err);
      resolve(files);
    });
  });
};

var parse = function (doc) {

};

module.exports.run = function () {
  return loadYaml().then(function (docs) {

    var definition = new Definition();

    _.each(docs, function(doc) {
      _.each(Object.keys(doc), function(key) {
        definition.add(key, doc[key]);
      });
    });
    return Promise.resolve(definition);
  });
};
