var util = require ('util');

// Safe and universal type check
Object.typeOf = function (obj) {
	// [object Boolean] -> Boolean
	return Object.prototype.toString.call(obj).slice(8, -1);
};

Object.is = function (type, obj) { // lemme unseen this
	return Object.typeOf(obj).toLowerCase() == type.toLowerCase();
};

console.print = function () {
	var BLUE = '';
	var RESET = '';
	var line = '============================================================';

	if ($isServerSide) {
		BLUE = '\033[34m';
		RESET = '\033[0m';
	}

	var err = new Error();
	var stack = err.stack.split('\n');
	var lastFunc = stack[2];
	var msg = [];
	msg.push.apply(msg, arguments);
	msg[0] = BLUE + line + '\n' + lastFunc + RESET + '\n' + msg[0];
	msg.push('\n' + BLUE + line + RESET);
	return console.log.apply(console, msg);
};

var Project;
var projectRoot;
var projectInstance;

if (!util.inherits) {
	util.inherits = function (ctor, superCtor) {
		ctor.super_ = superCtor;
		ctor.prototype = Object.create (superCtor.prototype, {
			constructor: {
			value: ctor,
			enumerable: false,
			writable: true,
			configurable: true
		}});
	};
}

if (!util.extend) {
util.extend = function extend () {
	var hasOwnProperty = Object.prototype.hasOwnProperty;

	// copy reference to target object
	var target = arguments[0] || {}, i = 1, length = arguments.length, deep = false, options, name, src, copy;
	// Handle a deep copy situation
	if (typeof target === "boolean") {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	}
	// Handle case when target is a string or something (possible in deep copy)
	if (typeof target !== "object" && !typeof target === 'function')
		target = {};
	var isPlainObject = function(obj) {
		// Must be an Object.
		// Because of IE, we also have to check the presence of the constructor property.
		// Make sure that DOM nodes and window objects don't pass through, as well
		if (!obj || !Object.is('Object', obj) || obj.nodeType || obj.setInterval)
			return false;
		var has_own_constructor = hasOwnProperty.call(obj, "constructor");
		var has_is_property_of_method = hasOwnProperty.call(obj.constructor.prototype, "isPrototypeOf");
		// Not own constructor property must be Object
		if (obj.constructor && !has_own_constructor && !has_is_property_of_method)
			return false;
		// Own properties are enumerated firstly, so to speed up,
		// if last one is own, then all properties are own.
		var last_key;
		for (var key in obj)
			last_key = key;
		return typeof last_key === "undefined" || hasOwnProperty.call(obj, last_key);
	};
	for (; i < length; i++) {
		// Only deal with non-null/undefined values
		if ((options = arguments[i]) !== null) {
			// Extend the base object
			for (name in options) {
				src = target[name];
				copy = options[name];
				// Prevent never-ending loop
				if (target === copy)
					continue;
				// Recurse if we're merging object literal values or arrays
				if (deep && copy && (isPlainObject(copy) || Array.isArray(copy))) {
					var clone = src && (isPlainObject(src) || Array.isArray(src)) ? src : Array.isArray(copy) ? [] : {};
					// Never move original objects, clone them
					target[name] = extend(deep, clone, copy);
					// Don't bring in undefined values
				} else if (typeof copy !== "undefined")
					target[name] = copy;
			}
		}
	}
	// Return the modified object
	return target;
}
}

if (!util.clone) {
	util.clone = function(object) {

		var result;

		if (object.constructor === Array) {
			result = object.map(function(item) {
				return util.clone(item);
			});
		} else if (object.constructor === Object) {
			result = {};
			util.extend(result, object);
		} else {
			result = object;
		}

		return result;

	}
}

try {
	if (process.pid) {
		global.$isClientSide = false;
		global.$isServerSide = true;
		global.$mainModule   = process.mainModule;
		global.$scope        = 'process.mainModule';
		global.$stash        = {};
		global.$isPhoneGap   = false;
		global.$global       = global;
	} else {
		throw 'WTF?';
	}
} catch (e) {
	window.$isClientSide = true;
	window.$isServerSide = false;
	window.$mainModule   = window;
	window.$scope        = 'window';
	window.$stash        = {};
	window.$global       = window;
	try {
		if (PhoneGap || Cordova || cordova) window.$isPhoneGap = true;
	} catch (e) {
		window.$isPhoneGap = false;
	}
}

Number.prototype.hours = Number.prototype.hour
	= function () {return this * 60 * 60 * 1e3}
Number.prototype.minutes = Number.prototype.minute
	= function () {return this * 60 * 1e3}
Number.prototype.seconds = Number.prototype.second
	= function () {return this * 1e3}

Number.prototype.times = function (cb) {
	var a = [];
	for (var i = 0; i < this; i++)
		a[i] = cb (i);
	return a;
}

module.exports.$global = $global;

// overwrite subject with values from object (merge object with subject)
var mergeObjects = module.exports.mergeObjects = function (object, subjectParent, subjectKey) {
	// subject parent here for js's lack of pass by reference

	if (subjectParent[subjectKey] === void 0)
		subjectParent[subjectKey] = {};
	var subject = subjectParent[subjectKey];
	for (var objectField in object) {
		subject[objectField] = object[objectField];
	}
};

var getByPath = module.exports.getByPath = function (path, origin) {
	var value = origin || $global;
	var scope, key;
	var validPath = path.split('.').every(function (prop) {
		scope = value;
		key = prop;
		if (null == scope) {
			// break
			return false;
		} else {
			value = scope[key];
			return true;
		}
	});
	return validPath && { value: value, scope: scope, key: key };
};

var pathToVal = module.exports.pathToVal = function (dict, path, value, method) {
	var chunks = 'string' == typeof path ? path.split('.') : path;
	var chunk = chunks[0];
	var rest = chunks.slice(1);
	if (chunks.length == 1) {
		var oldValue = dict[chunk];
		if (value !== undefined) {
			if (method !== undefined) {
				method(value, dict, chunk);
			} else {
				dict[chunk] = value;
			}
		}
		return oldValue;
	}
	return pathToVal(dict[chunk], rest, value, method);
};

// - - -

var configCache = {};

function loadIncludes(config, cb, level) {

	var DEFAULT_ROOT = 'etc/',
		DELIMITER = ' > ',
		tagRe = /<([^>]+)>/,
		cnt = 0,
		len = 0;

	var levelHash = {};

	level.split(DELIMITER).forEach(function(key) {
		levelHash[key] = true;
	});

	function onLoad() {
		cnt += 1;
		if (cnt >= len) {
			cb(null, config);
		}
	}

	function onError(err) {
		cb(err, config);
	}

	function iterateTree(tree, cb) {
		if (null == tree) { return; }

		var step = function (node, key, tree) {
			cb(tree, key);
			iterateTree(node, cb);
		};

		if (Array === tree.constructor) {
			tree.forEach(step);
		} else if (Object === tree.constructor) {
			Object.keys(tree).forEach(function (key) {
				step(tree[key], key, tree)
			});
		}
	}

	function iterateNode(node, key) {
		var value = node[key];

		if ('string' === typeof value) {
			var match = value.match(tagRe);
			if (match) {
				len += 1;

				var path = match[1];

				if (0 !== path.indexOf('/')) {
					path = DEFAULT_ROOT + path;
				}

				if (path in levelHash) {
					//console.error('\n\n\nError: on level "' + level + '" key "' + key + '" linked to "' + value + '" in node:\n', node);
					throw new Error('circular linking');
				}

				delete node[key];

				if (configCache[path]) {

					node[key] = util.clone(configCache[path]);
					onLoad();

				} else {

					projectRoot.fileIO(path).readFile(function (err, data) {
						if (err) {

							onError(err);

						} else {

							loadIncludes(JSON.parse(data), function(tree, includeConfig) {

								configCache[path] = includeConfig;

								node[key] = util.clone(configCache[path]);
								onLoad();
							}, level + DELIMITER + path);

						}
					});
				}
			}
		}
	}

	iterateTree(config, iterateNode);

//	console.log('including:', level, config);

	!len && cb(null, config);
}

var findInterpolation = module.exports.findInterpolation = function (params, prefix) {

	// parse task params
	// TODO: modify this function because recursive changes of parameters works dirty (indexOf for value)

	if (prefix == void 0) prefix = '';
	if (prefix) prefix += '.';

	var found = {};

	if (params.constructor == Array) { // params is array

		params.forEach(function (val, index, arr) {

			if (val.indexOf && val.interpolate) { // string

				var tmp = val.interpolate ({}, false, true);

				if (tmp !== void 0) {
					found[prefix + index] = tmp;
				}

			} else if (!val.toFixed) { // array and object (check for function and boolean)
				var result = findInterpolation (val, prefix+index);
				for (var attrname in result) {
					found[attrname] = result[attrname];
				}
			}
		});

	} else { // params is hash

		for (var key in params) {
			var val = params[key];

			if (val.indexOf && val.interpolate) { // string

				var tmp = val.interpolate ({}, false, true);

				if (tmp !== void 0) {
					found[prefix + key] = tmp;
				}

			} else if (!val.toFixed) { // array and object (check for function and boolean)
				var result = findInterpolation (val, prefix+key);

				for (var attrname in result) {
					found[attrname] = result[attrname];
				}
			}
		}
	}

	return found;
}

var define;
if (typeof define === "undefined")
	define = function () {}
var _exports = module.exports;
define (function (require, exports, module) {
	return _exports;
});


String.prototype.interpolate = function (dict, marks, checkOnly) {
	if (!marks)
		marks = {
			start: '{$', end: '}', path: '.'
		};

	var result;

	var interpolatePaths = [];

	var template = this;

	var pos = this.indexOf (marks.start);
	while (pos > -1) {
		var end = (result || this).indexOf (marks.end, pos);
		var str = (result || this).substr (pos + 2, end - pos - 2);

		if (checkOnly && str) {
			interpolatePaths.push (str);
			pos = this.indexOf (marks.start, end);
			continue;
		}

//		console.log ("found replacement: key => ???, requires => $"+this+"\n");

		var fix;
		if (str.indexOf (marks.path) > -1) { //  treat as path
			fix = pathToVal (dict, str);
		} else { // scalar
			//console.log('- Scalar');
			fix = dict[str];
		}

		if (fix === void(0)) {
			//console.error('ERR fix === void(0)');
			throw (result || this);
		}

		if (fix.indexOf && fix.indexOf (marks.start) > -1 && fix.length < 1000) {
			//console.log('interpolation mark "' + marks.start + '" within interpolation string (' + fix.length + ') is denied', str, dict);
			throw 'interpolation mark "' + marks.start + '" within interpolation string (' + fix + ') is denied';
		}

		if (pos == 0 && end == ((result || this).length - 1)) {
			result = fix;
		} else {
			result = (result || this).substr (0, pos) + fix + (result || this).substr (end + 1);
//			console.log ('!!!', (result || this).toString(), fix.toString(), pos, end, end - pos + 1);
		}

		//console.log('--', result.length);

		if (
				(
					(
						(result === false || result === 0 || result === "" || result.length > 1000) ? true : result
					) || this
				).indexOf
			) pos = (
				(
					(result === false || result === 0 || result === "") ? true : result
				) || this).indexOf (marks.start);
		else
			break;
	}

	if (checkOnly)
		return interpolatePaths;

	return result;

};

if ($isServerSide) {

	var path = require ('path');

	var io = require ('./io/easy');

	Project = function (rootPath) {
		rootPath = rootPath || './';
		projectRoot = new io(rootPath);

		this.root = projectRoot;
		var self = this;

		projectRoot.fileIO ('etc/project').readFile (function (err, data) {
			if (err) {
				console.error ("can't access etc/project file. create one and define project id");
				// process.kill ();
				return;
			}

			var configData = (""+data).match (/(\w+)(\W[^]*)/);
			configData.shift ();
			var parser = configData.shift ();

			// console.log ('parsing etc/project using "' + parser + '" parser');

			if (parser == 'json') {

				try {
					var config = JSON.parse (configData[0]);
				} catch (e) {
					console.log ('WARNING: project config cannot parsed');
					throw e;
				}

				// TODO: read config fixup
			} else {
				console.error (
					'parser ' + parser + ' unknown in etc/project; '
					+ 'we analyze parser using first string of file; '
					+ 'you must put in first string comment with file format, like "// json"');
				// process.kill ();
				return;
			}


			self.id     = config.id;

			loadIncludes(config, function (err, config) {
				if (err) {
					console.error(err);
					console.warn("Couldn't load inlcudes.");
					self.emit ('ready');
					return;
				}

				self.config = config;

				projectRoot.fileIO ('var/instance').readFile (function (err, data) {

					if (err) {
						console.error ("PROBABLY HARMFUL: can't access var/instance: "+err);
						self.emit ('ready');
						return;
					}

					var instance = (""+data).split (/\n/)[0];

					self.instance = instance;

					console.log ('instance is: ', instance);

					projectRoot.fileIO ('etc/' + instance + '/fixup').readFile (function (err, data) {
						if (err) {
							console.error ("PROBABLY HARMFUL: can't access "+'etc/' + instance + '/fixup'+" file. "
										   + "create one and define local configuration fixup. "
										  );
							self.emit ('ready');
							// process.kill ();
							return;

						}

						var fixupData = (""+data).match (/(\w+)(\W[^]*)/);
						fixupData.shift ();
						var fixupParser = fixupData.shift ();

						var fixupData = (""+data).match (/(\w+)(\W[^]*)/);
						fixupData.shift ();
						var fixupParser = fixupData.shift ();

						// console.log ('parsing etc/' + instance + '/fixup using "' + fixupParser + '" parser');
						// TODO: error handling

						if (fixupParser == 'json') {
							var config = JSON.parse (fixupData[0]);

							util.extend (true, self.config, config);
						} else {
							console.error (
								'parser ' + fixupParser + ' unknown in etc/' + instance + 'fixup; '
								+ 'we analyze parser using first string of file; '
								+ 'you must put in first string comment with file format, like "// json"');

							// process.kill ();
							return;
						}

						console.log ('project ready');

						self.emit ('ready');
					});
				});
			}, 'projectRoot');
		});
	};

	var EventEmitter = require ('events').EventEmitter;

	util.inherits (Project, EventEmitter);

	util.extend (Project.prototype, {
		connectors:  {},
		connections: {},

		getModule: function (type, name) {
			var inPackagePath = path.join('dataflo.ws', type, name);
			var inProjectPath = path.resolve(this.root.path, type, name);

			var mod;
			try {
				mod = require(inProjectPath);
			} catch (e) {
				try {
					mod = require(inPackagePath);
				} catch (e) {
					mod = null;
				}
			}
			return mod;
		},

		getInitiator: function (name) {
			return this.getModule('initiator', name);
		},

		getTask: function (name) {
			return this.getModule('task', name);
		},

		require: function (name) {
			return this.getModule('node_modules', name) ||
				this.getModule('', name);
		}
	});
}

module.exports.getProject = function (rootPath) {
	if (!projectInstance) {
		projectInstance = new Project(rootPath);
	}
	return projectInstance;
};
