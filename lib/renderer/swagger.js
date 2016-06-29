
var _ = require("lodash");
var d = require("debug")("agile:gen:render:swagger");
var fs = require('fs');

var Type = require("../model/Type");
var util = require("../util");
var yamljs = require("yamljs");

var tpl = util.tpl('swagger', 'yml');

var httpVerbs = ['post', 'put', 'delete', 'get', 'options', 'patch', 'head'];

var getTemplates = function () {
  return {
    root: tpl('root'),
  };
};

var SwaggerRenderer = function (definition) {

  this.definition = definition;
  this.templates = getTemplates();

};

SwaggerRenderer.prototype.renderTypes = function (defTypes, depth) {

  var me = this;

  depth = depth === undefined ? 0 : depth;
  defTypes = defTypes || this.definition.types;

  var types = {};
  var mapping = {};
  _.forEach(defTypes, function (type, typeName) {

    var swaggerType = {};

    var objtype = type.type.replace('*', '').toLowerCase();

    if(type.description)
      swaggerType.description = type.description;

    // if(depth > 0) {
    //   swaggerType.required = type.required;
    // }

    if(type.tags)
      swaggerType.tags = type.tags;

    if(type.isArray()) {
      swaggerType.type = "array";
      swaggerType.properties = {
        schema: {
          $ref: '#/definitions/' + type.getArrayType()
        }
      };
    } else if(type.isEnum()) {
      swaggerType.enum = type.getEnumValues();
    } else {
      swaggerType.type = "object";
      var objprops = me.renderTypes(type.fields, depth+1);
      if(_.size(objprops)) {
        swaggerType.properties = objprops;
      }
    }
    types[typeName] = swaggerType;
  });

  return types;
};

SwaggerRenderer.prototype.processEndpoint = function (path, endpoint, api) {
  var me = this;

  // d("Process path %s", path);

  _.each(endpoint, function(def, method) {

    // it's a subendpoint
    if(httpVerbs.indexOf(method) === -1) {
      //  d("Found sub-path %s", method);
       me.processEndpoint(path + method, def, api);
       delete endpoint[method];
       return;
    }

    // d("Method %s", method);

    var parameters = [];

    if(def.body) {

      // d("Body %j", def.body);

      var bodyParam = {
        in: 'body',
        name: 'body',
        required: def.body.required === undefined ? true : def.body.required,
        schema: {
          type: 'object'
        }
      };

      if(def.body.description)
        bodyParam.description = def.body.description;

      var type = def.body.type;

      if(type.substr(type.length-2)=== '[]') {
        var rtype = type.substr(0, type.length-2);

        bodyParam.schema.type = "array";
        bodyParam.schema.items = {};
        if(me.definition.getType(rtype)) {
          bodyParam.schema.items.$ref = '#/definitions/' + rtype;
        }
        else {
          bodyParam.schema.items.type = rtype;
        }
      }
      else {
        var ref = def.body['(reference)'];
        var refType = me.definition.getType(def.body.type);
        if(refType) {
          ref = refType.name;
        }
        if(ref) {
          d("Add $ref = %s", ref);
          bodyParam.schema.$ref = '#/definitions/' + ref;
        }
        else {
          bodyParam.schema.type = type;
        }
      }

      parameters.push(bodyParam);

      endpoint[method].parameters = parameters;
    }

    if(def.body !== undefined)
      delete endpoint[method].body;
    if(def['(reference)'] !== undefined)
      delete endpoint[method]['(reference)'];

  });

  // console.log(require('util').inspect(endpoint, { depth: null }));
  // process.exit();

  api[path] = endpoint;
};

SwaggerRenderer.prototype.renderApi = function () {
  var me = this;
  var classes = _.values(this.definition.classes);

  var api = {};
  var endpoints = classes.filter(function (clazz) {
      return clazz.http;
    })
    .forEach(function (clazz) {
      _.forEach(clazz.http, function (def, path) {
        me.processEndpoint(path, def, api);
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
      host: "gw.agile.local",
      basePath: "/api",
      version: require('../../package.json').version,
      paths: indent(yamljs.stringify(this.renderApi(), 999, 2)),
      types: indent(yamljs.stringify(this.renderTypes(), 999, 2))
    })
  };

  outputs.push(api);

  return Promise.resolve(outputs);
};

module.exports = function (definition) {
  return Promise.resolve((new SwaggerRenderer(definition)).render());
};
