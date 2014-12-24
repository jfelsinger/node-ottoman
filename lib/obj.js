/**
 * obj functions,
 *
 * conversions: obj => obx
 */

var is = require('./is'),
    CORETYPES = require('./coretypes');


function objToObx_Otto(obj, typeName, subtypeNames, depth, objRefs, typeList) {
    typeList = typeList || this.typeList;
    if (!(obj instanceof typeList[typeName])) {
        throw new Error('expected object of type ' + typeName);
    }

    if (depth > 0 && !obj.$.embed) {
        // Add to refs array, but only if its not already there.
        if (objRefs.indexOf(obj) < 0) {
            objRefs.push(obj);
        }

        return {'$ref': [obj.$.name, modelKey.call(obj)]};
    } else {
        // Some shortcuts
        var info = obj.$;
        var schema = info.schema;
        var values = obj.$values;

        var out = {};

        // Add schema fields
        for (var i in schema) {
            if (schema.hasOwnProperty(i)) {
                var field = schema[i];
                var subtypes = [];
                if (field.subtype) {
                    subtypes.push(field.subtype);
                }

                var outObj = objToObx(values[field.name], field.type, subtypes, depth+1, objRefs, typeList);
                if (outObj !== undefined) {
                    out[field.name] = outObj;
                }
            }
        }

        // Add descriminators
        for (var i in info.descrims) {
            if (info.descrims.hasOwnProperty(i)) {
                out[i] = info.descrims[i];
            }
        }

        return out;
    }
};


function objToObx_List(obj, typeName, subtypeNames, depth, objRefs, typeList) {
    typeList = typeList || this.typeList;
    if (!subtypeNames || subtypeNames.length == 0) {
        subtypeNames = ['Mixed'];
    }

    var out = [];
    for (var i = 0; i < obj.length; ++i) {
        var outObj = objToObx(obj[i], subtypeNames[0], subtypeNames.slice(1), depth+1, objRefs, typeList);
        if (outObj !== undefined) {
            out[i] = outObj;
        }
    }
    return out;
};


function objToObx_Map(obj, typeName, subtypeNames, depth, objRefs, typeList) {
    typeList = typeList || this.typeList;
    if (!subtypeNames || subtypeNames.length == 0) {
        subtypeNames = ['Mixed'];
    }

    var out = {};
    for (var i in obj) {
        if (obj.hasOwnProperty(i)) {
            var outObj = objToObx(obj[i], subtypeNames[0], subtypeNames.slice(1), depth+1, objRefs, typeList);
            if (outObj !== undefined) {
                out[i] = outObj;
            }
        }
    }
    return out;
};


function objToObx_Date(obj, typeName, subtypeNames, depth, objRefs) {
    if (!(obj instanceof Date)) {
        throw new Error('expected Date object');
    }
    return obj.toJSON();
};



function objToObx_Mixed(obj, typeName, subtypeNames, depth, objRefs, typeList) {
    typeList = typeList || this.typeList;
    if (is.ottoObj(obj)) {
        return objToObx_Otto(obj, obj.$.name, null, depth, objRefs, typeList);
    } else if (obj instanceof Date) {
        return objToObx_Date(obj, 'Date', null, depth, objRefs);
    } else if (Array.isArray(obj)) {
        return objToObx_List(obj, 'List', null, depth, objRefs, typeList);
    } else if (obj instanceof Object) {
        return objToObx_Map(obj, 'Map', null, depth, objRefs, typeList);
    } else {
        return obj;
    }
};


function objToObx(obj, typeName, subtypeNames, depth, objRefs, typeList) {
    typeList = typeList || this.typeList;
    if (!typeName) {
        typeName = 'Mixed';
    }

    if (obj === undefined) {
        return undefined;
    } else if (obj === null) {
        return null;
    }

    if (typeList[typeName]) {
        return objToObx_Otto(obj, typeName, subtypeNames, depth, objRefs, typeList);
    } else if (typeName === 'Date') {
        return objToObx_Date(obj, typeName, subtypeNames, depth, objRefs);
    } else if (typeName === 'List') {
        return objToObx_List(obj, typeName, subtypeNames, depth, objRefs, typeList);
    } else if (typeName === 'Map') {
        return objToObx_Map(obj, typeName, subtypeNames, depth, objRefs, typeList);
    } else if (typeName === 'Mixed') {
        return objToObx_Mixed(obj, typeName, subtypeNames, depth, objRefs, typeList);
    } else if (CORETYPES.indexOf(typeName) >= 0) {
        if (obj instanceof Object) {
            throw new Error('core type is an object');
        }
        return obj;
    } else {
        throw new Error('encountered unknown type ' + typeName);
    }
};



/**
 * Exports
 */

module.exports = {
    toObx_Otto: objToObx_Otto,
    toObx_List: objToObx_List,
    toObx_Map: objToObx_Map,
    toObx_Date: objToObx_Date,
    toObx_Mixed: objToObx_Mixed,

    toObx: objToObx,
};
