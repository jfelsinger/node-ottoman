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

module.exports.get = function getType(scheme, name) {

    if (typeof(scheme) === 'string' || typeof(scheme) === 'function') {
        scheme = {
            type: scheme
        };
    } else if (typeof(scheme !== 'object') {
        throw new Error('expected schema fields to be strings or objects');
    }

    if (name && !scheme.name)
        scheme.name = name;

    if (typeof(scheme.type) === 'function')
        scheme.type = scheme.type.name;

    // Check for an alias
    if (TYPEALIASES[scheme.type])
        scheme.type = TYPEALIASES[scheme.type];

    // Get the type from the list
    if (types[scheme.type])
        scheme.type = new types[scheme.type](scheme);
    else
        throw new Error('Schema type not found');

    return scheme;
};

