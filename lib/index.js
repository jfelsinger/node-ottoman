'use strict';

var util = require('util'),
    uuid = require('node-uuid'),
    _ = require('underscore');

var Obj = require('./obj'),
    Obx = require('./obx'),
    is = require('./is'),
    modelKey = require('./modelkey'),
    Model = require('./model'),
    CORETYPES = require('./coretypes'),
    Types = require('./types'),
    Validator = require('./validator');


var INTERNALGIZMO = new Object();

function Ottoman() {
    this.typeList = {};
    this.queries = [];

}



/**
 * Public Methods
 */

Ottoman.prototype.serialize = function serialize(obj) {
    return Obj.toObx.call(this, obj, obj.$.name, null, 0, []);
}


Ottoman.prototype.save = function save(objs, callback) {
    if (!Array.isArray(objs)) {
        objs = [objs];
    }

    var saved = 0;
    var errors = [];
    var toSave = [];

    for (var i = 0; i < objs.length; ++i) {
        if (!objs[i].$loaded) {
            continue;
        }

        // Do validations
        try {
            modelDoValidation.call(objs[i]);
        } catch(e) {
            return callback(e);
        }

        var key = modelKey.call(objs[i]);
        var doc = Obj.toObx.call(this, objs[i], objs[i].$.name, null, 0, objs);

        if (!_.isEqual(objs[i].$initial, doc)) {
            toSave.push([objs[i], key, doc]);
        }
    }

    if (toSave.length > 0) {
        for (var i = 0; i < toSave.length; ++i) {
            var obj = toSave[i][0];
            var key = toSave[i][1];
            var doc = toSave[i][2];

            _saveObj(obj, key, doc, function(e) {
                if (e) {
                    errors.push(e);
                }
                saved++;
                if (saved === toSave.length) {
                    if (callback) {
                        if (errors.length === 0) {
                            callback(null);
                        } else {
                            // TODO: Properly handle errors here
                            callback('ERRORS');
                        }

                    }
                }
            });
        }
    } else {
        // Nothing to save
        callback(null);
    }

}


Ottoman.prototype.load = function(obj, options, callback) {
    if (arguments.length === 2) {
        callback = options;
        options = {};
    }
    if (!options.depth || options.depth < 1) {
        options.depth = 1;
    }

    _load.call(this, obj, options.depth, callback);
}


Ottoman.prototype.key = function(obj) {
  return modelKey.call(obj);
};


Ottoman.prototype.buildDesignDocs = function() {
    // Register all indexes
    for (var i = 0; i < this.queries.length; ++i) {
        var query = this.queries[i];
        registerIndex(query.bucket, query.target, [query.mappedBy], {});
    }

    // Assign generated views
    for (var i = 0; i < this.queries.length; ++i) {
        var query = this.queries[i];
        var idxIfo = getIndexView(query.bucket, query.target, [query.mappedBy], {});
        query.ddoc = idxIfo[0];
        query.view = idxIfo[1];
    }
};


Ottoman.prototype.registerDesignDocs = function(callback) {
    // Force an immediate build
    buildDesignDocs();

    var buckets = [];
    var views = [];

    for (var i = 0; i < indexes.length; ++i) {
        var index = indexes[i];
        var idxIfo = getIndexInfo(index);
        var typeInfo = this.typeList[index.type].prototype.$;

        var viewStrUp = [];
        var viewStrDn = [];

        viewStrUp.push('function(doc,meta) {');
        viewStrDn.push('}');

        for (var j in typeInfo.descrims) {
            if (typeInfo.descrims.hasOwnProperty(j)) {
                viewStrUp.push('if (doc.' + j + ' == \'' + typeInfo.descrims[j] + '\') {');
                viewStrDn.push('}');
            }
        }

        var emitList = [];
        for (var j = 0; j < index.fields.length; ++j) {
            var field = index.fields[j];
            viewStrUp.push('if (doc.'+field+' && doc.'+field+'.$ref) {');
            viewStrDn.push('}');
            emitList.push('doc.' + field + '.$ref[1]');
        }
        if (emitList.length > 1) {
            viewStrUp.push('emit([' + emitList.join(',') + '],null);')
        } else {
            viewStrUp.push('emit(' + emitList[0] + ',null);');
        }

        var viewStr = viewStrUp.join('\n') + '\n';
        viewStr += viewStrDn.reverse().join('\n') + '\n';

        buckets.push(index.bucket);
        views.push({
            bucket: index.bucket,
            ddoc: idxIfo[0],
            name: idxIfo[1],
            data: {map: viewStr}
        });
    }

    var remaining = 0;
    for (var i = 0; i < buckets.length; ++i) {
        var ddocs = {};

        for (var j = 0; j < views.length; ++j) {
            var view = views[j];
            if (view.bucket !== buckets[i]) {
                continue;
            }

            if (!ddocs[view.ddoc]) {
                ddocs[view.ddoc] = {};
            }

            ddocs[view.ddoc][view.name] = view.data;
        }

        for (var j in ddocs) {
            if (ddocs.hasOwnProperty(j)) {
                remaining++;
                buckets[i].setDesignDoc(j, ddocs[j], function(err) {
                    remaining--;
                    if (remaining === 0) {
                        if (err) {
                            return callback(err);
                        }

                        // TODO: only returns the last error
                        callback(null);
                    }
                });
            }
        }
    }
};


Ottoman.prototype.model = function createModel(name, schema, options) {

    // Create a base function for the model.  This is done so that the
    //   stack traces will have a nice name for developers to identify.

    var con = null;
    eval('con = function ' + name + '() { Model.apply(this, arguments); }');

    // Extend the model object
    con.prototype = Object.create(Model.prototype);
    con.prototype.constructor = con;

    // info object holds all the model-specific data.
    var info = {};
    con.$ = info;

    // Store some stuff for later!
    info.model = con;
    info.name = name;
    info.schema = schema;
    info.constructor = options.constructor;
    info.bucket = options.bucket;
    info.embed = options.embed;
    info.required = [];
    info.queries = {};
    info.refdocs = [];

    // Build the id list
    // This must happen before schema normalization
    if (options.id) {
        if (!Array.isArray(options.id)) {
            info.id = [options.id];
        } else {
            info.id = options.id;
        }
    } else {
        if (!schema['id']) {
            schema['id'] = {auto: 'uuid'};
        }
        info.id = ['id'];
    }

    if (options.descriminators) {
        if (!(options.descriminators instanceof Object)) {
            throw new Error('descriminators must be an object');
        }
        info.descrims = options.descriminators;
    } else {
        info.descrims = {_type: name};
    }

    // Normalize Schema
    normalizeSchema(schema);
    // validateSchemaIds(info.id, schema);

    for (var i in schema) {
        if (schema.hasOwnProperty(i)) {
            registerField(con, i, schema[i]);
        }
    }

    var queries = options.queries;
    if (queries) {
        for (var i in queries) {
            if (queries.hasOwnProperty(i)) {
                registerQuery.call(this,con, i, queries[i]);
            }
        }
    }

    var indexes = options.indexes;
    if (indexes) {
        for (var i in indexes) {
            if (indexes.hasOwnProperty(i)) {
                registerIndexX.call(this, con, i, indexes[i]);
            }
        }
    }

    registerType.call(this, name, con);
    return con;
};


Ottoman.prototype.type = function createType(name, schema, options) {
  if (!options) {
    options = {};
  }
  options.embed = true;

  return createModel(name, schema, options);
};



/**
 * Private Functions
 */


function createRefObj(key, typeName, objCache) {
    var type = this.typeList[typeName];
    if (!type) {
        throw new Error('unknown type ' + typeName);
    }

    var obj = new type(INTERNALGIZMO);
    obj.$key = key;
    obj.$cas = null;
    obj.$cache = objCache;

    // Default as unloaded and blank, this is overwritten immediately
    //   by obx.toObj_Otto_Load a lot of the times.
    obj.$values = null;
    obj.$loaded = false;
    obj.$initial = null;

    objCache[key] = obj;
    return obj;
}



/**
 *
 */

function _buildRefDocName(modelName, obj, options) {
    if (!obj) {
        return null;
    }

    var name = '';

    if (options.keyPrefix) {
        name = options.keyPrefix;
    } else {
        name = modelName;
        for (var i = 0; i < options.key.length; ++i) {
            name += '_' + options.key[i];
        }
    }

    for (var i = 0; i < options.key.length; ++i) {
        if (Array.isArray(obj)) {
            name += '-' + obj[i];
        } else {
            name += '-' + obj[options.key[i]];
        }
    }

    return name;
}


function _saveObj(obj, key, doc, callback) {
    var refDocAdds = [];
    var refDocRemoves = [];

    if (obj.$.refdocs) {
        var refdocs = obj.$.refdocs;
        for (var i = 0; i < refdocs.length; ++i) {
            var newRef = _buildRefDocName(obj.$.name, obj, refdocs[i]);
            var oldRef = _buildRefDocName(obj.$.name, obj.$initial, refdocs[i]);

            if (oldRef !== newRef) {
                refDocAdds.push(newRef);
                if (oldRef) {
                    refDocRemoves.push(oldRef);
                }
            }
        }
    }

    var curIdx = 0;
    var stage = 0;

    (function doNext() {
        if (stage === 0) {
            if (curIdx >= refDocAdds.length) {
                curIdx = 0;
                stage = 2;
                return doNext();
            }

            obj.$.bucket.add(refDocAdds[curIdx], key, function(e) {
                if (e) {
                    // Begin Rollback
                    curIdx--;
                    stage = 1;
                    return doNext();
                }

                curIdx++;
                return doNext();
            });
        } else if (stage === 1) {
            if (curIdx < 0) {
                curIdx = 0;
                return callback('refdoc conflict');
            }

            obj.$.bucket.remove(refDocAdds[curIdx], function() {
                curIdx--;
                return doNext();
            });
        } else if (stage === 2) {
            obj.$initial = doc;
            obj.$.bucket.set(key, doc, {cas: obj.$cas}, function(){
                stage = 3;
                return doNext();
            });
        } else if (stage === 3) {
            if (curIdx >= refDocRemoves.length) {
                curIdx = 0;
                stage = 4;
                return doNext();
            }

            obj.$.bucket.remove(refDocRemoves[curIdx], function() {
                curIdx++;
                return doNext();
            });
        } else if (stage === 4) {
            return callback();
        }
    })();
}


function _loadRefs(obj, depthLeft, callback) {
    var refs = [];
    Obj.toObx.call(this, obj, obj.$.name, null, 0, refs);

    if (refs.length === 0) {
        callback(null);
        return;
    }

    var loaded = 0;
    for (var i = 0; i < refs.length; ++i) {
        _load.call(this, refs[i], depthLeft-1, function(err) {
            loaded++;
            if (loaded >= refs.length) {
                callback(null);
            }
        })
    }
}


function _load(obj, depthLeft, callback) {
    if (depthLeft === 0) {
        callback(null);
        return;
    }

    if (is.ottoObj(obj)) {
        if (obj.$loaded) {
            _loadRefs.call(this, obj, depthLeft, callback);
        } else {
            var key = modelKey.call(obj);
            obj.$.bucket.get(key, {}, function(err, result) {
                if (err) {
                    return callback(err);
                }
                Obx.toObj_Otto_Load.call(this, obj, result.value, 0, obj.$cache, key);
                obj.$cas = result.cas;
                _loadRefs.call(this, obj, depthLeft, callback);
            });
        }
    } else if (Array.isArray(obj)) {
        var loaded = 0;
        for (var i = 0; i < obj.length; ++i) {
            _load.call(this, obj[i], depthLeft, function(err) {
                loaded++;
                if (loaded === obj.length) {
                    // TODO: Only returns last error
                    callback(err);
                }
            });
        }
    } else if (obj instanceof Object) {
        var needsLoad = 0;
        for (var i in obj) {
            if (obj.hasOwnProperty(i)) {
                needsLoad++;
                _load.call(this, obj[i], depthLeft, function(err) {
                    needsLoad--;
                    if (needsLoad === 0) {
                        // TODO: Only returns last error
                        callback(err);
                    }
                })
            }
        }
    } else {
        console.warn('attempted to call Load on a core type.');
    }
}


function modelDoValidation() {
    for (var i = 0; i < this.$.required.length; ++i) {
        if (!this[this.$.required[i]]) {
            throw new Error('required field missing: ' + this.$.required[i]);
        }
    }

    for (var i in this.$.schema) {
        if (this.$.schema.hasOwnProperty(i)) {
            var field = this.$.schema[i];
            if (field.validator) {
                field.validator.check(this[i]);
            }
        }
    }
}


function findModelByRefDoc(con, refdoc, keys, callback) {
    var info = con.prototype.$;

    var refDocKey = _buildRefDocName(info.name, keys, refdoc);
    info.bucket.get(refDocKey, {}, function(err, result) {
        if (err) {
            return callback(err);
        }

        var docKey = result.value;
        info.bucket.get(docKey, {}, function(err, result) {
            if (err) {
                return callback(err);
            }

            var obj = Obx.toObj.call(this, result.value, info.name, null, 0, {}, docKey);
            if (obj.$.name != info.name) {
                throw new Error(obj.$.name + ' is not a ' +  info.name);
            }

            for (var i = 0; i < refdoc.key.length; ++i) {
                var refField = refdoc.key[i];
                if (obj[refField] !== keys[i]) {
                    // This means that the refered document no longer matches up
                    //   with the reference that was used to find it...

                    // TODO: Proper error here
                    return callback('not_found', null);
                }
            }

            callback(null, obj);
        });
    });
}



/**
 *
 */

function registerField(con, field, scheme) {
    var info = con.prototype.$;

    if (scheme.required) {
        info.required.push(field);
    }

    var getter = function() {
        return scheme.getter();
    };

    var setter = function(val) {
        return scheme.setter(val);
    };

    Object.defineProperty(con.prototype, field, {
        get: getter,
        set: setter
    });
}


function modelQuery(query, options, callback) {
    var self = this;

    query.bucket.view(query.ddoc, query.view).query({
        key: this.$key,
        limit: query.limit,
        sort: query.sort
    }, function(err, results) {
        if (err) {
            return callback(err);
        }

        var resultObjs = [];
        for (var i = 0; i < results.length; ++i) {
            var obj = createRefObj.call(this, results[i].id, query.target, self.$cache);
            resultObjs[i] = obj;
        }

        callback(null, resultObjs);
    });
}


function registerIndexX(con, name, options) {
    var info = con.prototype.$;

    if (options.type === 'refdoc') {
        info.refdocs.push(options);

        con[name] = function() {
            var callback = arguments[arguments.length-1];
            var keys = [];
            for (var i = 0; i < arguments.length - 1; ++i) {
                keys.push(arguments[i]);
            }

            findModelByRefDoc.call(this, con, options, keys, callback);
        }
    }
}



/*
 target: 'BlogPost',
 mappedBy: 'creator',
 sort: 'desc',
 limit: 5
 */
function registerQuery(con, name, options) {
    var info = con.prototype.$;

    var query = {};
    query.name = name;
    query.target = options.target;
    query.mappedBy = options.mappedBy;
    query.sort = options.sort ? options.sort : 'desc';
    query.limit = options.limit ? options.limit : 0;
    query.bucket = info.bucket;

    info.queries[name] = query;
    this.queries.push(query);

    con.prototype[name] = function(options, callback) {
        if (!callback) {
            callback = options;
            options = {};
        }

        modelQuery.call(this, query, options, callback);
    }
}

var indexes = [];

function matchIndex(l, r) {
    if(l.bucket === r.bucket && l.type === r.type) {
        for (var j = 0; j < l.fields.length; ++j) {
            // Stop searching at the end of either field list
            if (j >= r.fields.length) break;

            // No match if a field doesnt match
            if (l.fields[j] !== r.fields[j]) {
                return false;
            }
        }
        return true;
    }
    return false;
}

function registerIndex(bucket, type, fields, options) {
    var newIndex = {
        bucket: bucket,
        type: type,
        fields: fields
    };

    for (var i = 0; i < indexes.length; ++i) {
        var index = indexes[i];

        if (matchIndex(newIndex, index)) {
            if (index.fields.length > fields.length) {
                // If the index is longer, we already have everything we need.
            } else {
                // If the newIndex is longer, use it instead.
                index.fields = fields;
            }

            return;
        }
    }

    indexes.push(newIndex);
}

function getIndexInfo(index) {
    var ddocName = '__ottogen_' + index.type;
    var viewName = 'by';
    for (var i = 0; i < index.fields.length; ++i) {
        viewName += '_' + index.fields[i];
    }

    return [ddocName, viewName];
}

function getIndexView(bucket, type, fields, options) {
    var searchIndex = {
        bucket: bucket,
        type: type,
        fields: fields
    };

    for (var i = 0; i < indexes.length; ++i) {
        var index = indexes[i];

        if (matchIndex(searchIndex, index)) {
            return getIndexInfo(index);
        }
    }

    return false;
}

function normalizeSchema(schema) {
    var fieldAliases = {};

    for (var i in schema) {
        if (schema.hasOwnProperty(i)) {
            var scheme = Types.get(schema[i], i);

            // if (schema[i].validator) {
            //     if (schema[i].validator instanceof Function) {
            //         schema[i].validator = Validator.custom(schema[i].validator);
            //     }
            //     if (!(schema[i].validator instanceof Validator)) {
            //         throw new Error('validator property must be of type Validator');
            //     }
            // }

            if (fieldAliases[scheme.name]) {
                throw new Error('multiple fields are assigned the same alias');
            }
            fieldAliases[scheme.name] = true;

            // if (scheme.auto) {
            //     // force auto fields to readonly
            //     scheme.readonly = true;

            //     if (scheme.auto === 'uuid') {
            //         if (scheme.type && scheme.type !== 'string') {
            //             throw new Error('uuid fields must be string typed');
            //         }
            //         scheme.type = 'string';
            //     } else {
            //         throw new Error('unknown auto mode');
            //     }
            // }
            
            schema[i] = scheme;
        } // if
    } // for
}

function validateSchemaIds(ids, schema) {
    for (var i = 0; i < ids.length; ++i) {
        var field = schema[ids[i]];

        if (!field) {
            throw new Error('id specified that is not in the schema');
        }
        if (!field.readonly) {
            throw new Error('id fields must be readonly');
        }

        // Force required on for id fields
        schema[ids[i]].required = true;
    }
}

function registerType(name, type) {
    if (this.typeList[name]) {
        throw new Error('Type with the name ' + name + ' was already registered');
    }
    this.typeList[name] = type;
}


module.exports = Ottoman;
