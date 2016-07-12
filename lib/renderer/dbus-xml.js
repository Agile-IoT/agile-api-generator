var _ = require("lodash");
var d = require("debug")("agile:gen:render:dbux-xml");
var fs = require('fs');
var util = require('../util');

var dbusTypes = {
  "BYTE":	"y",
  "BOOLEAN":	"b",
  "INT16":	"n",
  "UINT16":	"q",
  "INT32":	"i",
  "UINT32":	"u",
  "INT64":	"x",
  "UINT64":	"t",
  "DOUBLE":	"d",
  "UNIX_FD":	"h",
  "STRING": "o",
  "SIGNATURE":	"g",

  "STRUCT":	"r",
  "ARRAY":	"a",
  "VARIANT":	"v",

};

var DbusXmlRenderer = function (definition) {

  this.definition = definition;

  var tpl = util.tpl("dbus-xml", "xml");

  this.templates = {
    root: tpl("root"),
    method: tpl("method"),
    property: tpl("property"),
    signal: tpl("signal"),
  };

};

DbusXmlRenderer.prototype.getDBusType = function (type) {
  return type.type;
};

DbusXmlRenderer.prototype.renderMethod = function (method, methodName) {

  var me = this;

  var args = [];
  if(method.args)
     _.forEach(method.args, function(arg, argName) {
      args.push({
        name: argName,
        type: me.getDBusType(arg),
        direction: "in"
      });
    });

  if(method.return && method.return.type !== 'void') {
    args.push({
      name: "return",
      type: me.getDBusType(method.return),
      direction: "out"
    });
  }

  var annotations = [];
  return this.templates.method({
    method: {
      name: methodName,
      args: args,
      annotations: annotations
    }
  });
};

DbusXmlRenderer.prototype.renderSignal = function (property, propertyName) {

};

DbusXmlRenderer.prototype.renderProperty = function (property, propertyName) {

  if(property.access.indexOf('s')) {
    return this.renderSignal(property, propertyName);
  }


  var accessRead = property.access.indexOf("r");
  var accessWrite = property.access.indexOf("w");

  var access = (accessRead && accessWrite) ? "readwrite" :
    (accessWrite) ? "write" :
      read;

  return this.templates.property({
    property: {
      name: propertyName,
      type: property.type,
      access: access
    }
  });
};

DbusXmlRenderer.prototype.renderInterface = function (clazz) {

  var content = "";

  if(_.size(clazz.methods))
    content +=
      _.values(
        _.map(clazz.methods, this.renderMethod.bind(this))
      ).join("\n");

  // add property
  if(_.size(clazz.properties))
    content +=
      _.values(
        _.map(clazz.properties, this.renderProperty.bind(this))
      ).join("\n");

  // add signal

  return {
    name: clazz.name,
    content: content
  };
};

DbusXmlRenderer.prototype.renderClass = function (clazz) {
  return {
    filename: clazz.name + ".xml",
    content: this.templates.root({
      node: {
        name: "/" + clazz.name.replace(".", "/"),
        interfaces: [
          this.renderInterface(clazz)
        ]
      }
    })
  };

};

DbusXmlRenderer.prototype.render = function () {
  return _.values(
    _.map(
      this.definition.classes, this.renderClass.bind(this)
    )
  );
};

module.exports = function (definition) {
  return Promise.resolve((new DbusXmlRenderer(definition)).render());
};
