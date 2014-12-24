var Archetype = require('./arche');


function TypeArray(options) {
    Archetype.apply(this, arguments);
};

TypeArray.prototype = Object.create(Archetype.prototype);
TypeArray.prototype.constructor = TypeArray;
