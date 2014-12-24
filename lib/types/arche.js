function TypeArche(options, value) {

    // Set default options
    this._value;
    this.options = {
        readonly: false,
    };

    if (value) this._value = value;

    if (options.readonly !== undefined)
        this.options.readonly = options.readonly;
    if (options.name !== undefined)
        this.options.name = options.name;
};

TypeArche.prototype.getter = function get() {
    return this._value;
};

TypeArche.prototype.setter = function set(value) {
    if (this.options.readonly) {
        throw new Error('attempted to set read-only property ' + this.options.name);
    }

    this._value = value;
};

TypeArche.prototype.getValue = function getValue() {
    return this._value;
};
