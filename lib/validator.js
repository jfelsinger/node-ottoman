function Validator() {
    this.funcs = [];
}

Validator.prototype.check = function(val) {
    for (var i = 0; i < this.funcs.length; ++i) {
        this.funcs[i](val);
    }
};

Validator.prototype.match = function(regexp) {
    return this.custom(function(val) {
        if (!regexp.match(val)) {
            throw new Error('expected value to match ' + regexp);
        }
    });
};

Validator.prototype.in = function(list) {
    return this.custom(function(val) {
        if (list.indexOf(val) < 0) {
            throw new Error('expected value to be in list: ' + list.join(','));
        }
    });
};

Validator.prototype.min = function(min) {
    return this.custom(function(val) {
        if (min !== null && val < min) {
            throw new Error('expected value to not be less than ' + min);
        }
    });
};

Validator.prototype.max = function(max) {
    return this.custom(function(val) {
        if (max !== null && val > max) {
            throw new Error('expected value to not be more than ' + max);
        }
    });
};

Validator.prototype.range = function(min, max) {
    return this.min(min).max(max);
};

Validator.prototype.custom = function(func) {
    this.funcs.push(func);
    return this;
};

Validator.match = function(regexp) {
    return (new Validator()).match(regexp); };

Validator.in = function(list) {
    return (new Validator()).in(list); };

Validator.min = function(min) {
    return (new Validator()).min(min); };

Validator.max = function(max) {
    return (new Validator()).max(max); };

Validator.range = function(min, max) {
    return (new Validator()).range(min, max); };

Validator.custom = function(func) {
    return (new Validator()).custom(func); };

module.exports = Validator;
