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

var _ = require("lodash");
var d = require("debug")("agile:gen:render:html");
var fs = require('fs');

var Type = require("../model/Type");

var tpl = function (name) {
  return _.template(fs.readFileSync(__dirname + '/../../template/html/' + name + '.tpl.html', 'utf8'));
};

var contextTypes = {
  property: 'property',
  return: 'return',
  args: 'args',
  type: 'type',
  fields: 'fields',
};

var accessLabels = {
  r: 'Read',
  w: 'Write',
  s: 'Subscribe'
};

var getTemplates = function () {
  return {
    html: tpl('index'),
    menu: tpl('menu'),
    class: tpl('class'),
    method: tpl('method'),
    property: tpl('property'),
    types: tpl('types'),
    type: tpl('type'),
    arg: tpl('arg'),
    return: tpl('return'),
    wrapper: tpl('wrapper'),
    search: tpl('search'),
  };
};

var baseTypes = [
  'string', 'number', 'boolean'
];

var HtmlRenderer = function (definition) {

  this.definition = definition;

  this.templates = getTemplates();

  this.menu = [];
  this.html = [];

};

HtmlRenderer.prototype.isPrimitiveType = function (type) {
  return type && baseTypes.indexOf(type.toLowerCase()) > -1;
};

HtmlRenderer.prototype.isStructuredType = function (type) {
  return !this.isPrimitiveType(type) && type.indexOf('*') === -1;
};

HtmlRenderer.prototype.getTypeLabel = function (obj) {

  if(!obj) return null;

  var label = obj.type;

  if(obj.type && obj.type.toLowerCase() === "array") {

    if(obj.fields) {
      if(obj.fields.__arrayType) {
        label = obj.type + "[" + obj.fields.__arrayType.type + "]";
      }
      else if(obj.fields.__field) {
        label = obj.type + "[" + obj.fields.__field.type + "]";
      }
      else if(obj.reference) {
        label = obj.type + "[" + obj.reference + "]";
      }
    }

  }

  return label;
};

HtmlRenderer.prototype.getTypeLink = function (obj) {

  if(!obj) return null;

  var typeLink = this.definition.types[obj.type] ||
    this.definition.types[obj.reference] ||
    false;
  if(typeLink) {
    return typeLink.name;
  }

  var classLink = this.definition.classes[obj.type] ||
    this.definition.classes[obj.reference] ||
    false;
  if(classLink) {
    return classLink.name;
  }

  if(obj.type && obj.type.toLowerCase() === "array") {
    if(obj.reference) {
      typeLink = obj.reference;
    }
    else if(obj.fields.__field && obj.fields.__field.type) {
      typeLink = this.definition.types[obj.fields.__field.type];
    }
  }

  return typeLink;
};

HtmlRenderer.prototype.renderClass = function (clazz, className) {
  d("Render class %s", className);

  var methods = _.map(clazz.methods, this.renderMethod.bind(this)).join("");
  var properties = _.map(clazz.properties, this.renderProperty.bind(this)).join("");

  return this.templates.class({
    className: className,
      methods: methods,
      properties: properties,
      description: clazz.description,
      group: clazz.group,
  });
};

HtmlRenderer.prototype.renderArg = function (arg, argName) {
  var typeLink = this.getTypeLink(arg);
  return this.templates.arg({
    name: argName,
    type: arg.type,
    typeLink: typeLink,
  });
};


HtmlRenderer.prototype.renderReturnType = function (returnType) {
  return this.templates.return({
    type: returnType ? returnType.type : 'void',
    typeLink: returnType ? this.getTypeLink(returnType) : null
  });
};

HtmlRenderer.prototype.renderMethod = function (method, methodName) {

  var me = this;

  var type = method.type;
  var typeLabel = this.getTypeLabel(method);
  var typeLink = this.getTypeLink(method);

  var returnTypeLink = this.getTypeLink(method.return);
  var returnType = this.renderReturnType(method.return);

  var args = _.map(method.args, this.renderArg.bind(this)).join('<span class="args-glue">, </span>');

  var details = "";
  if(_.size(method.args)) {
    details += this.templates.wrapper({
      title: "Arguments",
      content: _.map(method.args, function(v, k) {
        return me.renderType(v, k, { type: contextTypes.args });
      }).join(''),
    });
  }

  if(method.return) {
    details += this.templates.wrapper({
      title: "Return type",
      content: this.renderType(method.return.data, null, { type: contextTypes.return }),
    });
  }

  return this.templates.method({

    className: method.getParent().name,

    description: method.description,

    type: type,
    typeLink: typeLink,

    access: method.access,
    example: method.example,
    name: methodName,

    returnType: returnType,
    returnTypeLink: returnTypeLink,

    args: args,
    details: details
  });

};

HtmlRenderer.prototype.renderProperty = function (property, propertyName) {

  var type = property.type;
  var typeLabel = this.getTypeLabel(property);
  var typeLink = this.getTypeLink(property);
  var typeDetail = null;

  if(type === "Array") {
    if(property.reference) {
      if(this.definition.types[property.reference])
        typeDetail = this.definition.types[property.reference];
    }
  } else if(type && this.isStructuredType(type)) {
    typeDetail = this.renderType(new Type(property.fields, property.type), null, { type: contextTypes.type });
  }

  var accessObj = property.access.map(function(access) {
    return {
      code: access,
      label: accessLabels[access]
    };
  });

  return this.templates.property({

    className: property.getParent().name,

    description: property.description,

    type: typeLabel || typeLink,
    typeLink: typeLink,

    access: accessObj,
    example: property.example,
    name: propertyName,

    typeDef: typeDetail,
  });
};

HtmlRenderer.prototype.renderType = function (typeDef, typeDefName, context) {

  var me = this;

  if(!_.size(typeDef)) {
    d("Empty type %s skipped", typeDefName);
    return;
  }

  var type = typeDef.type;
  var typeLabel = this.getTypeLabel(typeDef);
  var typeLink = this.getTypeLink(typeDef);

  var fields = "";

  var _type = type ? type.toLowerCase() : null;
  if(_type === "array") {
    if(typeDef.fields && typeDef.fields.__field) {
      // console.log(typeDef.name, require('util').inspect(typeDef.fields.__field.data, { depth: 3 }));
      fields = this.renderType(typeDef.fields.__field, null, { type: contextTypes.fields });
    }
  }
  else if(_type === "enum") {
    fields = _.map(typeDef.fields, function (val, key) {
      return "<li>" + val.type + "</li>";
    });
    fields = fields.join('');
  }
  else if(typeDef.fields) {
    fields = _.map(typeDef.fields, function(v, k) {
      return me.renderType(v, k, { type: contextTypes.fields });
    }).join('');
  }

  var name = (typeDefName || typeDef.name || "").toString();
  if(name && name.substr(0,2) === '__') {
    name = '';
  }

  return this.templates.type({
    description: typeDef.description,
    type: typeLabel,
    typeLink: typeLink,
    access: typeDef.access,
    example: typeDef.example,
    name: name,
    fields: fields,
    context: context
  });

};

HtmlRenderer.prototype.renderMenu = function () {
  return this.templates.menu({
    menu: this.menu,
    search: this.templates.search({})
  });
};

HtmlRenderer.prototype.render = function () {

  var me = this;

  this.menu.push({
    type: "object",
    title: "Objects",
    list: Object.keys(this.definition.classes)
  });
  this.menu.push({
    type: "types",
    title: "Types",
    list: Object.keys(this.definition.types)
  });

  if(_.size(this.definition.groups)) {
    this.menu.push({
      type: "groups",
      title: "Groups",
      list: Object.keys(this.definition.groups)
    });
  }
  if(_.size(this.definition.tags)) {
    this.menu.push({
      type: "tags",
      title: "Tags",
      list: Object.keys(this.definition.tags)
    });
  }

  d("Render classes");
  var classes = _.map(this.definition.classes, this.renderClass.bind(this));
  this.html.push(classes.join(''));

  d("Render types");
  var types = _.map(this.definition.types, function(v,k) {
    return me.renderType(v, k, { type: contextTypes.type });
  });
  this.html.push(this.templates.types({
    types: types.join('')
  }));

  return this.templates.html({
    content: this.html.join(''),
    menu: this.renderMenu(),
  });

};

module.exports = function (definition) {
  return Promise.resolve((new HtmlRenderer(definition)).render());
};
