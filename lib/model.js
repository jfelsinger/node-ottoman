var util = require('util');

var modelKey = require('./modelKey');

function Model(maybeInternal) {
    hideInternals(this);

    this.$key = null;
    this.$values = {};
    this.$cas = null;
    this.$loaded = true;
    this.$initial = undefined;
    this.$cache = undefined;

    if (maybeInternal !== INTERNALGIZMO) {
        // For user-constructed objects, local cache!
        this.$cache = {};

        if (this.$.constructor) {
            this.$constructing = true;
            this.$.constructor.apply(this, arguments);
            delete this.$constructing;
        }

        // Put myself in my own cache.
        var key = modelKey.call(this);
        this.$cache[key] = this;
    }
}

Model.prototype.$ = {};
Object.defineProperty(Model.prototype, '$', {
    enumerable: false,
    writeable: true
});


Model.prototype.inspect = function() {
    var outobj = {};
    if (this.$loaded) {
        for (var i in this.$.schema) {
            if (this.$.schema.hasOwnProperty(i)) {
                outobj[i] = this[i];
            }
        }
    } else {
        outobj.$key = this.$key;
        outobj.$loaded = this.$loaded;
    }

    return util.inspect(outobj);
};


Model.prototype.toJSON = function(include_private) {
    var outobj = {};
    if (this.$loaded) {
        for (var i in this.$.schema) {
            if (this.$.schema.hasOwnProperty(i)) {
                if (include_private || !this.$.schema[i].private) {
                    outobj[i] = this[i];
                }
            }
        }
    }

    return outobj;
};


Model.prototype.findById = function findModelById() {
    var callback = arguments[arguments.length-1];

    var info = this.prototype.$;

    var key = this.info.name;
    for (var i = 0; i < info.id.length; ++i) {
        key += '_' + arguments[i];
    }
    key = key.toLowerCase();

    info.bucket.get(key, {}, function(err, result) {
        if (err) {
            return callback(err);
        }

        var obj = require('./obx').toObj(result.value, info.name, null, 0, {}, key);
        if (obj.$.name != info.name) {
            throw new Error(obj.$.name + ' is not a ' +  info.name);
        }

        callback(null, obj);
    });
}



/**
 * Private functions
 */

function hideInternals(con) {
    var internalFields = [
        '$key', 
        '$values', 
        '$cas', 
        '$loaded', 
        '$initial', 
        '$cache'
    ];

    for (var i = 0; i < internalFields.length; ++i) {
        Object.defineProperty(con, internalFields[i], {
            enumerable: false,
            writable: true
        });
    }
}

