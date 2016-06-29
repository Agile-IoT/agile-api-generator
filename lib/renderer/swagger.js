
var _ = require("lodash");
var d = require("debug")("agile:gen:render:raml");
var fs = require('fs');

var Type = require("../model/Type");
var util = require("../util");
var yamljs = require("yamljs");

var tpl = util.tpl('swagger', 'yml');

var getTemplates = function () {
  return {
    root: tpl('root'),
  };
};

var SwaggerRenderer = function (definition) {

  this.definition = definition;
  this.templates = getTemplates();

};

SwaggerRenderer.prototype.renderTypes = function (defTypes) {

  var me = this;

  defTypes = defTypes || this.definition.types;

  var types = {};
  var mapping = {};
  _.forEach(defTypes, function (type, typeName) {

    var ramlType = {};

    var objtype = type.type.replace('*', '').toLowerCase();

    ramlType.displayName = typeName;
    ramlType.description = type.description;
    ramlType.required = type.required;

    if(type.isArray()) {
      ramlType.type = type.getArrayType() + "[]";
    } else if(type.isEnum()) {
      ramlType.enum = type.getEnumValues();
    } else {
      var objprops = me.renderTypes(type.fields);
      if(_.size(objprops)) {
        ramlType.properties = objprops;
      }
    }
    types[typeName] = ramlType;
  });

  return types;
};

SwaggerRenderer.prototype.renderApi = function () {

  var classes = _.values(this.definition.classes);

  var api = {};
  var endpoints = classes.filter(function (clazz) {
      return clazz.http;
    })
    .map(function (clazz) {
      return clazz.http;
    })
    .forEach(function (http) {
      _.forEach(http, function (v, k) {
        api[k] = v;
      });
    });

  return api;
};
SwaggerRenderer.prototype.render = function () {

  var outputs = [];

  var indent = function(s, p) {
    p = p || "  ";
    return s.split("\n").map(function (line) {
      return p + line;
    }).join("\n");
  };

  var api = {
    filename: "api.swagger.yml",
    content: this.templates.root({
      title: "AGILE HTTP API",
      description: "",
      host: "https://gw.agile.local",
      baseUri: "/api",
      version: require('../../package.json').version,
      paths: indent(yamljs.stringify(this.renderApi(), 999, 2)),
      types: indent(yamljs.stringify(this.renderTypes(), 999, 2))
    })
  };

  outputs.push(api);

  return Promise.resolve(outputs);
  // return new Promise(function (resolve, reject) {
  //   var raml2html = require('raml2html');
  //   var configWithDefaultTemplates = raml2html.getDefaultConfig();
  //   // var configWithCustomTemplates = raml2html.getDefaultConfig('my-custom-template.nunjucks', __dirname);
  //
  //   var f = '/tmp/api.raml';
  //   require('fs').writeFileSync(f, ramlApi.content);
  //
  //   // source can either be a filename, url, file contents (string) or parsed RAML object
  //   raml2html.render(f, configWithDefaultTemplates).then(function (result) {
  //
  //     var ramlHtml = {
  //       filename: "rest-api.html",
  //       content: result
  //     };
  //
  //     outputs.push(ramlHtml);
  //
  //     resolve(outputs);
  //   }, function (error) {
  //     reject(error);
  //   });
  //
  // });
};

module.exports = function (definition) {
  return Promise.resolve((new SwaggerRenderer(definition)).render());
};
