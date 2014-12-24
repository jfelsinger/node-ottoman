var Archetype = require('./arche'),
    uuid = require('node-uuid');


function TypeId(options) {
    Archetype.apply(this, arguments);

    this._prefix;

    if (options.prefix) this._prefix = options.prefix;
};

TypeId.prototype = Object.create(Archetype.prototype);
TypeId.prototype.constructor = TypeId;


TypeId.prototype.generate(prefix) {
    prefix = prefix || this._prefix;
    if (prefix.length) prefix += '::';

    this._value = prefix + uuid.v4();
};


