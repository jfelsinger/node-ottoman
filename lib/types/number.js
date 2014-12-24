var Archetype = require('./arche');

function TypeNumber() {
    Archetype.apply(this, arguments);
};

TypeNumber.prototype = Object.create(Archetype.prototype);
TypeNumber.prototype.constructor = TypeNumber;

TypeNumber.prototype.setter = function set(value) {
    if (isNaN(value))
        throw new Error('attempted to set non-numeric value on property ' + this.options.name);

    this._value = value * 1;
};
