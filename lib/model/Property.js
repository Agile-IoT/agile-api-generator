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
var _ = require('lodash');
var util = require('../util');

var d = require('debug')("agile:gen:model:Property");

var Type = require("./Type");

var accessType = {
  r: "Read",
  w: "Write",
  s: "Subscribe"
};

var Property = function(name, obj, parent) {

  this.name = null;
  this.data = {
    description: null,
    access: [],
    example: null,
    type: null,
    fields: {},
    reference: null,
    events: []
  };

  Type.prototype.initialize.apply(this, arguments);
  // console.warn("Property.fields %s %j", this.name, this.data.fields);

  d("Created property [%s]", this.name);
};
require('util').inherits(Property, Type);

Property.prototype.hasEvents = function() {
  return this.data.events.length > 0;
};

Property.prototype.getEvents = function() {
  return this.data.events;
};

Property.prototype.canWrite = function() {
  return this.data.access.indexOf('w') > -1;
};

Property.prototype.canRead = function() {
  return this.data.access.indexOf('r') > -1;
};

Property.prototype.canSubscribe = function() {
  return this.data.access.indexOf('s') > -1;
};

module.exports = Property;
module.exports.accessType = accessType;
