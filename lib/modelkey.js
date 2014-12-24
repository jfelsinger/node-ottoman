/**
 * modelKey
 *
 */
module.exports = function modelKey() {

    'use strict';

    if (!this.$key) {
        var key = this.$.name;
        for (var i = 0; i < this.$.id.length; ++i) {
            key += '_' + this[this.$.id[i]];
        }
        this.$key = key.toLowerCase();
    }

    return this.$key;
};
