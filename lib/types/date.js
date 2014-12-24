var Archetype = require('./arche'),
    momment = require('moment');

function TypeDate() {
    Archetype.apply(this, arguments);
};

TypeDate.prototype = Object.create(Archetype.prototype);
TypeDate.prototype.constructor = TypeDate;

TypeDate.prototype.setter = function set(value) {
    this._value = new Date(value);
};

TypeDate.prototype.getValue = function getValue() {
    return this._value.toISOString();
};
