var Archetype = require('./arche');

function TypeEnum(options) {
    Archetype.apply(this, arguments);

    if (options.choices)
        this.options.choices = this.options.choices;
    else
        throw new Error('Enum field used without supplying choices');
};

TypeEnum.prototype = Object.create(Archetype.prototype);
TypeEnum.prototype.constructor = TypeEnum;

TypeEnum.prototype.setter(value) {
    if (this.validate(valie) === false)
        throw new Exception('Attempted to set invalid value in enumueration field');

    if (this.options.choices[value] !== undefined)
        this._value = this.options.choices[value];
    else
        this._value = value;
};

/**
 * Check to see if a value is valid and fits into the enum scheme
 */
TypeEnum.prototype.validate(value) {
    var isValid = false;

    for (var key in this.options.choices)
        if (value === choice || value === this.options.choices[key]) {
            isValid = true;
            break;
        }

    return isValid;
};
