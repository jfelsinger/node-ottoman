var types = {
    id:         require('./id'),
    bool:       require('./bool'),
    string:     require('./string'),
    number:     require('./number'),
    constant:   require('./constant'),
    date:       require('./date'),
    enum:       require('./enum'),
    array:      require('./array'),
    object:     require('./object'),
};

var TYPEALIASES = {
  'Id':         'id',

  'Boolean':    'bool'
  'boolean':    'bool'

  'String':     'string',

  'Number':     'number',

  'Constant':   'constant',
  'Const':      'constant',
  'const':      'constant',

  'Date':       'date',
  'Time':       'date',
  'time':       'date',

  'Enum':       'enum',
  'Enumerable': 'enum',
  'enumerable': 'enum',

  'Array':      'array',

  'Object':     'object',
};

module.exports.types = types;

module.exports.getType = function getType(scheme) {

    if (typeof(scheme) === 'string' || typeof(scheme) === 'function') {
        scheme = {
            type: scheme
        };
    } else if (typeof(scheme !== 'object') {
        throw new Error('expected schema fields to be strings or objects');
    }

    if (typeof(scheme.type) === 'function') {
        scheme.type = scheme.type.name;
    }

    if (TYPEALIASES[scheme.type]) {
        scheme.type = TYPEALIASES[scheme.type];
    }

    if (types[scheme.type]) {
        scheme.type = new types[scheme.type](scheme);
    } else {
        throw new Error('Schema type not found');
    }

    return scheme;
};

