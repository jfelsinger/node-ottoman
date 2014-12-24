/**
 * obx functions,
 *
 * conversions: obx => obj
 */

var is = require('./is'),
    CORETYPES = require('./coretypes');


/**
 * Returns a ottoman type name by matching the input
 * object against the type descriminators.
 *
 * @param {Object} obx
 * @returns {string}
 */
function typeNameFromObx(obx, typeList) {
    typeList = typeList || this.typeList;
    for (var i in typeList) {
        if (typeList.hasOwnProperty(i)) {
            var info = typeList[i].prototype.$;

            var matches = true;
            for (var j in info.descrims) {
                if (info.descrims.hasOwnProperty(j)) {
                    if (obx[j] != info.descrims[j]) {
                        matches = false;
                        break;
                    }
                }
            }
            if (matches) {
                return info.name;
            }
        }
    }

    return null;
}


function obxToObj_Otto_Load(obj, obx, depth, objCache, typeList) {
    typeList = typeList || this.typeList;
    var info = obj.$;

    if (!(obx instanceof Object)) {
        throw new Error('expected value of type Object');
    }

    // Lets check for sanity sake
    var obxTypeName = typeNameFromObx(obx, typeList);
    if (obxTypeName !== obj.$.name) {
        throw new Error('data is wrong type');
    }

    obj.$values = {};
    obj.$loaded = true;
    obj.$initial = obx;

    for (var i in info.schema) {
        if (info.schema.hasOwnProperty(i)) {
            var field = info.schema[i];

            var subtypes = [];
            if (field.subtype) {
                subtypes.push(field.subtype);
            }

            var newObj = obxToObj.call(this, obx[field.name], field.type, subtypes, depth+1, objCache, null);
            if (newObj !== undefined) {
                obj.$values[field.name] = newObj;
            }
        }
    }
};


function obxToObj_Otto(obx, typeName, subtypeNames, depth, objCache, thisKey, typeList) {
    typeList = typeList || this.typeList;
    var type = typeList[typeName];

    if (is.refObx(obx)) {
        var refkey = obx['$ref'][1];

        // Referenced
        if (!(obx instanceof Object)) {
            throw new Error('expected object to be an Object')
        }
        if (obx['$ref'].length !== 2) {
            throw new Error('expected reference object');
        }
        if (obx['$ref'][0] !== typeName) {
            throw new Error('data is wrong type');
        }

        // Check the cache
        var cachedObj = objCache[refkey];
        if (cachedObj) {
            if (cachedObj.$.name !== obx['$ref'][0]) {
                throw new Error('object cached but later found as different type');
            }
            return cachedObj;
        }

        // Create Object
        var obj = createRefObj(refkey, typeName, objCache);
        return obj;
    } else {
        // Embedded
        if (thisKey === undefined) {
            throw new Error('internal: thisKey should be null or a string');
        }

        // Create Object
        var obj = createRefObj(thisKey, typeName, objCache);

        // Populate data
        obxToObj_Otto_Load(obj, obx, depth+1, objCache, typelist);
        return obj;
    }
};


function obxToObj_List(obx, typeName, subtypeNames, depth, objCache, thisKey) {
    if (!Array.isArray(obx)) {
        throw new Error('expected array');
    }

    if (!subtypeNames || subtypeNames.length == 0) {
        subtypeNames = ['Mixed'];
    }

    var out = [];
    for (var i = 0; i < obx.length; ++i) {
        var newObj = obxToObj.call(this, obx[i], subtypeNames[0], subtypeNames.slice(1), depth+1, objCache, null);
        if (newObj !== undefined) {
            out[i] = newObj;
        }
    }
    return out;
};


function obxToObj_Map(obx, typeName, subtypeNames, depth, objCache, thisKey) {
    if (!(obx instanceof Object)) {
        throw new Error('expected object');
    }

    if (!subtypeNames || subtypeNames.length == 0) {
        subtypeNames = ['Mixed'];
    }

    var out = {};
    for (var i in obx) {
        if (obx.hasOwnProperty(i)) {
            var newObj = obxToObj.call(this, obx[i], subtypeNames[0], subtypeNames.slice(1), depth+1, objCache, null);
            if (newObj !== undefined) {
                out[i] = newObj;
            }
        }
    }
    return out;
};


function obxToObj_Date(obx, typeName, subtypeNames, depth, objCache, thisKey) {
    if (typeof(obx) !== 'string') {
        throw new Error('expected string');
    }

    return new Date(obx);
};


function obxToObj_Mixed(obx, typeName, subtypeNames, depth, objCache, thisKey, typeList) {
    typeList = typeList || this.typeList;
    if (is.refObx(obx)) {
        return obxToObj_Otto(obx, obx['$ref'][0], null, depth, objCache, thisKey, typeList);
    } else if (is.ottoObx(obx)) {
        var realTypeName = typeNameFromObx(obx, typeList);
        return obxToObj_Otto(obx, realTypeName, null, depth, objCache, thisKey, typeList);
    } else if (is.dateObx(obx)) {
        return obxToObj_Date(obx, 'Date', null, depth, objCache, thisKey);
    } else if (Array.isArray(obx)) {
        return obxToObj_List(obx, 'List', null, depth, objCache, thisKey, typeList);
    } else if (obx instanceof Object) {
        return obxToObj_Map(obx, 'Map', null, depth, objCache, thisKey, typeList);
    } else {
        return obx;
    }
};


function obxToObj(obx, typeName, subtypeNames, depth, objCache, thisKey, typeList) {
    typeList = typeList || this.typeList;
    if (!typeName) {
        typeName = 'Mixed';
    }

    if (obx === undefined) {
        return undefined;
    } else if (obx === null) {
        return null;
    }

    if (typeList[typeName]) {
        return obxToObj_Otto(obx, typeName, subtypeNames, depth, objCache, thisKey, typeList);
    } else if (typeName === 'Date') {
        return obxToObj_Date(obx, typeName, subtypeNames, depth, objCache, thisKey);
    } else if (typeName === 'List') {
        return obxToObj_List(obx, typeName, subtypeNames, depth, objCache, thisKey, typeList);
    } else if (typeName === 'Map') {
        return obxToObj_Map(obx, typeName, subtypeNames, depth, objCache, thisKey, typeList);
    } else if (typeName === 'Mixed') {
        return obxToObj_Mixed(obx, typeName, subtypeNames, depth, objCache, thisKey, typeList);
    } else if (CORETYPES.indexOf(typeName) >= 0) {
        if (obx instanceof Object) {
            throw new Error('core type is an object');
        }
        return obx;
    } else {
        throw new Error('encountered unknown type ' + typeName);
    }
};



/**
 * Exports
 */

module.exports = {
    toObj_Otto_Load: obxToObj_Otto_Load,
    toObj_Otto: obxToObj_Otto,
    toObj_List: obxToObj_List,
    toObj_Map: obxToObj_Map,
    toObj_Date: obxToObj_Date,
    toObj_Mixed: obxToObj_Mixed,

    toObj: obxToObj,
    typeNameFromObx: typeNameFromObx
};
