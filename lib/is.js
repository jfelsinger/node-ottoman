/**
 * Type checking
 */


/**
 * Determins if an obx object is a ottoman type.
 *
 * @param {Object} obx
 * @returns {boolean}
 */
function isOttoObx(obx) {
    if (obx instanceof Object && require('./obx').typeNameFromObx(obx)) {
        return true;
    }
    return false;
}


var ISO8601REGEX = /^(-?(?:[1-9][0-9]*)?[0-9]{4})-(1[0-2]|0[1-9])-(3[0-1]|0[1-9]|[1-2][0-9])T(2[0-3]|[0-1][0-9]):([0-5][0-9]):([0-5][0-9])(\.[0-9]+)?(Z|[+-](?:2[0-3]|[0-1][0-9]):[0-5][0-9])?$/;
/**
 * Determines if an obx object is a date.
 *
 * @param {Object} obx
 * @returns {boolean}
 */
function isDateObx(obx) {
    if (typeof(obx) === 'string' && obx.match(ISO8601REGEX)) {
        return true;
    }
    return false;
}


/**
 * Determines if an obx object is a reference to another document.
 *
 * @param {Object} obx
 * @returns {boolean}
 */
function isRefObx(obx) {
    if (obx instanceof Object && obx['$ref']) {
        return true;
    }
}


/**
 * Scans through the ottoman type list to identify if this object
 * is an instance of a ottoman type.
 *
 * @param {Object} obj
 * @returns {boolean}
 */
function isOttoObj(obj) {
    for (var i in typeList) {
        if (typeList.hasOwnProperty(i)) {
            if (obj instanceof typeList[i]) {
                return true;
            }
        }
    }
    return false;
}


/**
 * Exports
 */

module.exports = {
    ottoObx = isOttoObx,
    dateObx = isDateObx,
    refObx = isRefObx,

    ottoObj = isOttoObj
};
