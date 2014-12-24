var Archetype = require('./arche');

function TypeBool() {
    Archetype.apply(this, arguments);
};

TypeBool.prototype = Object.create(Archetype.prototype);
TypeBool.prototype.constructor = TypeBool;

TypeBool.prototype.setter = function set(value) {
    this._value = !!value;
};
