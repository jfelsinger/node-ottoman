var Archetype = require('./arche');

function TypeString() {
    Archetype.apply(this, arguments);
};

TypeString.prototype = Object.create(Archetype.prototype);
TypeString.prototype.constructor = TypeString;

TypeString.prototype.setter = function(value) {
    this._value = value + '';
};
