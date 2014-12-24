var Archetype = require('./arche');

function TypeConstant() {
    Archetype.apply(this, arguments);

    this.options.readonly = true;
};

TypeConstant.prototype = Object.create(Archetype.prototype);
TypeConstant.prototype.constructor = TypeConstant;

TypeConstant.prototype.setter = function set(value) {
    if (this._value !== undefined) {
        throw new Error('attempted to set read-only property ' + this.options.name);
    }

    this._value = value;
};
