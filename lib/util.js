/*******************************************************************************
 *Copyright (C) 2017 Create-Net / FBK.
 *All rights reserved. This program and the accompanying materials
 *are made available under the terms of the Eclipse Public License v1.0
 *which accompanies this distribution, and is available at
 *http://www.eclipse.org/legal/epl-v10.html
 *
 *Contributors:
 *    Create-Net / FBK - initial API and implementation
 ******************************************************************************/
var util = module.exports;

var _ = require('lodash');
var fs = require('fs');

util.tpl = function(renderer, defext) {
  defext = defext || "html";
  return function (name, ext) {
    ext = ext || defext;
    return _.template(fs.readFileSync(__dirname + '/../template/'+ renderer +'/' + name + '.tpl.' + ext, 'utf8'));
  };
};

util.exportProperties = function (me) {
  _.each(me.data, function (val, key) {
    Object.defineProperty(me, key, {
      enumerable: true,
      get: function () {
        return me.data[key];
      },
      set: function (v) {
        me.data[key] = v;
      }
    });
  });
};

var toJSON = function(obj) {
  var json = {};
  _.each(obj, function(val, key) {

    json[key] = val;

    if(val === null || val === undefined) {
      delete json[key];
      return;
    }

    if(val.toJSON) {
      json[key] = val.toJSON();
      return;
    }

    if(typeof val === 'object') {

      var size = _.size(val);
      if(size === 0) {
        delete json[key];
        return;
      }

      // handle case [type: Array, fields: String]
      if(
        obj.type && obj.type.toLowerCase() === 'array' &&
        key === 'fields' && val.__arrayType
      ) {
        json[key] = val.__arrayType.type;
        return;
      }

      // type shortcut [ running: Boolean ]
      if(size === 1 && val.type) {
        json[key] = val.type;
        return;
      }

      json[key] = toJSON(val);
      return;
    }

  });
  return json;
};

util.toJSON = toJSON;
