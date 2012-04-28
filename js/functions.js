/* OOP helper. Prototype-Class
 * Simple JavaScript Inheritance
 * By John Resig http://ejohn.org/
 * MIT Licensed.
 * Inspired by base2 and Prototype
 */
(function(){
    var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;

    // The base Class implementation (does nothing)
    this.Class = function(){};

    // Create a new Class that inherits from this class
    Class.extend = function(prop) {
        var _super = this.prototype;

        // Instantiate a base class (but only create the instance,
        // don't run the init constructor)
        initializing = true;
        var prototype = new this();
        initializing = false;

        // Copy the properties over onto the new prototype
        for (var name in prop) {
            // Check if we're overwriting an existing function
            if (typeof prop[name] == 'function' && typeof _super[name] == "function" && fnTest.test(prop[name])) {
                var closure = function(name, fn) {
                    return function() {
                        var tmp = this._super;

                        // Add a new ._super() method that is the same method
                        // but on the super-class
                        this._super = _super[name];

                        // The method only need to be bound temporarily, so we
                        // remove it when we're done executing.
                        var ret = fn.apply(this, make_self(this, arguments));
                        this._super = tmp;

                        return ret;
                    };
                };
                prototype[name] = closure(name, prop[name])
            } else if (typeof prop[name] == 'function') {
                var closure = function(name, fn) {
                    return function() {
                        return fn.apply(this, make_self(this, arguments));
                    }
                }
                prototype[name] = closure(name, prop[name])
            } else {
                prototype[name] = prop[name];
            }
        }

        // The dummy class constructor
        function Class() {
            // All construction is actually done in the init method
            if ( !initializing && this.init ) {
                // We don't need make_self here, since it is calling the one we made above.
                this.init.apply(this, arguments);
            }
        }

        // Populate our constructed prototype object
        Class.prototype = prototype;

        // Enforce the constructor to be what we expect
        Class.prototype.constructor = Class;

        // And make this class extendable
        Class.extend = arguments.callee;

        return Class;
    };
})();

/* Take an arguments object, which looks and acts a lot like an array, but
 * isn't quite, and put something at it's front.
 */
var make_self = function(first, args) {
    var new_args = [first];
    var i;
    for (i=0; i < args.length; i++) {
        new_args[i+1] = args[i];
    }
    return new_args;
};

// Shim layer with setTimeout fallback for requestAnimFrame
window.requestAnimFrame = (function(){
    return window.requestAnimationFrame       ||
           window.webkitRequestAnimationFrame ||
           window.mozRequestAnimationFrame    ||
           window.oRequestAnimationFrame      ||
           window.msRequestAnimationFrame     ||
           function( callback ){
             window.setTimeout(callback, 1000 / 60);
           };
})();

/* Simple vector class. */
var Vector = Class.extend({
    type: "vector",

    init: function(self) {
        self.xy_dirty = false;
        self.polar_dirty = false;

        Object.defineProperty(self, 'x', {
            'get': self._get_x,
            'set': self._set_x,
            'enumerable': true,
        });
        Object.defineProperty(self, 'y', {
            'get': self._get_y,
            'set': self._set_y,
            'enumerable': true,
        });
        Object.defineProperty(self, 'a', {
            'get': self._get_a,
            'set': self._set_a,
            'enumerable': true,
        });
        Object.defineProperty(self, 'm', {
            'get': self._get_m,
            'set': self._set_m,
            'enumerable': true,
        });
    },

    xy: function(self, x, y) {
        self._x = x;
        self._y = y;
        self.polar_dirty = true;
        return self;
    },

    polar: function(self, ang, mag) {
        self._a = ang;
        self._m = mag;
        self.xy_dirty = true;
        return self;
    },

    _get_x: function(self) {
        if (self.xy_dirty) {
            self.from_polar();
        }
        return self._x;
    },

    _set_x: function(self, x) {
        self._x = x;
        self.polar_dirty = true;
    },

    _get_y: function(self) {
        if (self.xy_dirty) {
            self.from_polar();
        }
        return self._y;
    },

    _set_y: function(self, y) {
        self._y = y;
        self.polar_dirty = true;
    },

    _get_a: function(self) {
        if (self.polar_dirty) {
            self.from_xy();
        }
        return self._a;
    },

    _set_a: function(self, a) {
        self._a = a;
        self.xy_dirty = true;
    },

    _get_m: function(self) {
        if (self.polar_dirty) {
            self.from_xy();
        }
        return self._m;
    },

    _set_m: function(self, m) {
        self._m = m;
        self.xy_dirty = true;
    },

    from_xy: function(self) {
        self._m = Math.sqrt(self._x * self._x + self._y * self._y);
        self._a = Math.atan2(self._y, self._x);
        self.polar_dirty = false;
    },

    from_polar: function(self) {
        self._x = self._m * Math.cos(self._a);
        self._y = self._m * Math.sin(self._a);
        self.xy_dirty = false;
    }
});
