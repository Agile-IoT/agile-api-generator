var _ = require("lodash");
var d = require("debug")("agile:gen:render:dbux-xml");
var fs = require('fs');
var util = require('../util');

var dbusTypes = {
  "INT16":	"n",
  "UINT16":	"q",
  "UINT32":	"u",
  "INT64":	"x",
  "UINT64":	"t",
  "SIGNATURE":	"g",

  "UNIX_FD":	"h",
  "BYTE":	"y",
  "BOOLEAN":	"b",
  "OBJECT_PATH": "o",
  "STRING": "s",
  "INT32":	"i",
  "DOUBLE":	"d",
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

DbusXmlRenderer.prototype.getReference = function (typeName) {

  if(!typeName) return null;

  if(this.definition.classes[typeName]) {
    return this.definition.classes[typeName];
  }
  if(this.definition.types[typeName]) {
    return this.definition.types[typeName];
  }
  return null;
};

DbusXmlRenderer.prototype.getDBusType = function (type, tname) {


  var typeName = type.type ? type.type.toLowerCase() : null;

  // type is an obj definition
  var typeRef = this.getReference(type.type);
  if(typeRef) {
    return this.getDBusType(typeRef);
  }

  // type has a reference field
  typeRef = this.getReference(type.reference);
  if(typeRef) {
    return this.getDBusType(typeRef);
  }

  if(typeName === 'string') {
    return dbusTypes.STRING;
  }

  if(typeName === 'boolean') {
    return dbusTypes.BOOLEAN;
  }

  // todo: fix number in spec
  if(typeName === 'number') {
    return dbusTypes.DOUBLE;
  }
  if(typeName === 'int' || typeName === 'int32') {
    return dbusTypes.INT32;
  }
  if(typeName === 'double') {
    return dbusTypes.DOUBLE;
  }

  if(typeName === 'byte') {
    return dbusTypes.BYTE;
  }

  if(typeName === 'object*') {
    return dbusTypes.VARIANT;
  }

  if(type.isArray()) {
    return "("+ this.getDBusType(type.fields.__arrayType) +")";
  }

  // default enum to int
  if(type.isEnum()) {
    var values = type.getEnumValues();
    return "(i)";
  }

  if(typeName === 'object') {
    // console.warn(type.data);
    return "{"+
      _.values(_.map(type.fields, this.getDBusType.bind(this))).join("")  +
    "}";
  }

  return typeName;
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
