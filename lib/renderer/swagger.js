
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
  this.usedDefinitions = [];
};

// track used definitions to avoid validation warning
SwaggerRenderer.prototype.addDef = function (def) {
  this.usedDefinitions.push(def);
};

SwaggerRenderer.prototype.hasDef = function (def) {
  return this.usedDefinitions.indexOf(def) > -1;
};

SwaggerRenderer.prototype.renderTypes = function (defTypes) {
  var me = this;
  var types = this.processTypes();
  var usedTypes = {};
  _.each(types, function(v, k) {
    if(me.hasDef(k)) {
      usedTypes[k] = v;
    }
  });
  return usedTypes;
};

SwaggerRenderer.prototype.processTypes = function (defTypes, depth) {

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

    if(type.tags)
      swaggerType.tags = type.tags;

    if(type.isArray()) {
      swaggerType.type = "array";
      swaggerType.items = {};
      swaggerType.items.$ref = '#/definitions/' + type.getArrayType();
      me.addDef(type.getArrayType());
    } else if(type.isEnum()) {
      swaggerType.enum = type.getEnumValues();
    } else {
      swaggerType.type = "object";
      var objprops = me.processTypes(type.fields, depth+1);
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

  var globalProps = {};
  _.each(endpoint, function(def, method) {

    var isMethod = httpVerbs.indexOf(method) > -1;
    var isSubEndpoint = !isMethod && method.substr(0, 1) === '/';

    // its a global property
    if(!isMethod && !isSubEndpoint) {
      d("Global property %s", method);
      globalProps[method] = def;
      return;
    }

    // it's a subendpoint
    if(isSubEndpoint) {
      //  d("Found sub-path %s", method);
       me.processEndpoint(path + method, def, api);
       delete endpoint[method];
       return;
    }

    // d("Method %s", method);

    var parameters = def.parameters || [];

    var checkSchema = function(p) {
      var $ref = p.schema && p.schema.$ref;
      if($ref) {
        if($ref.substr(0, 1) === '#') {
          var parts = $ref.split('/');
          var rType = parts[parts.length-1];
          if(rType) {
            me.addDef(rType);
          }
        }
      }
    };

    if(def.responses)
      _.each(def.responses, function(response, code) {
        if(response.schema) {
          checkSchema(response);
        }
      });

    var hasBody = parameters.filter(function(p) {
      checkSchema(p);
      return p.in === 'body';
    }).length === 0;

    if(def.body && !hasBody) {

      // d("Body %j", def.body);

      var bodyParam = {
        in: 'body',
        name: 'body',
        required: def.body.required === undefined ? true : def.body.required,
        schema: {
          type: 'object'
        }
      };

      if(def.body.description) {
        bodyParam.description = def.body.description;
      }

      var type = def.body.type;
      if(type.substr(type.length-2)=== '[]') {
        var rtype = type.substr(0, type.length-2);

        bodyParam.schema.type = "array";
        if(me.definition.getType(rtype)) {
          bodyParam.schema.items = {
            $ref: '#/definitions/' + rtype
          };
          me.addDef(rtype);
        }
        else {
          bodyParam.schema.type = rtype;
        }
      }
      else {
        var ref = def.body['(reference)'];
        var refType = me.definition.getType(def.body.type);
        if(refType) {
          ref = refType.name;
        }
        if(ref) {
          // d("Add $ref = %s", ref);
          bodyParam.schema.$ref = '#/definitions/' + ref;
          me.addDef(refType);
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

  _.each(globalProps, function(v, k) {
    endpoint[k] = v;
  });

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
      title: "Agile HTTP API",
      description: "The Agile HTTP API to interact with local DBus objects",
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
