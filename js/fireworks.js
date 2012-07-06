$(function() {
    new Game();
});

var Game = Class.extend({
    type: "game",

    init: function(self) {
        self.drawers = [];
        self.last_tick = +new Date();
        self.launchers = [];
        self.launcher_count = 2;

        self.canvas = document.getElementById('canvas');
        self.ctx = self.canvas.getContext('2d');

        $(window).on('resize', $.proxy(self.resizeCanvas, self));
        self.resizeCanvas();

        self.timer = setInterval($.proxy(self.tick, self), 16);

        $(self.canvas).on('click', $.proxy(self.click, self));
        $(self.canvas).on('touchstart', $.proxy(self.touchstart, self));

        self.world = {
            'grav': 0.8,
            'drag': 0.003,
        }

        self.options = new Options();
    },

    make_launchers: function(self) {
        self.cur_launcher = 0;
        for (var i = self.launchers.length - 1; i > 0; i--) {
            self.launchers[i].remove();
        }
        var skew = (self.canvas.width - 50) / (self.launcher_count - 1);
        for (var i=0; i < self.launcher_count; i++) {
            self.launchers[i] = new Launcher(self, skew * i + 25, self.canvas.height - 25);
        }
    },

    tick: function(self) {
        var cur_tick = +new Date();
        var diff = (cur_tick - self.last_tick) / 50;
        for (var i = self.drawers.length - 1; i >= 0; i--) {
            self.drawers[i].tick(diff);
        }
        self.last_tick = cur_tick;

        requestAnimFrame($.proxy(self.redraw, self));
    },

    redraw: function(self) {
        self.ctx.fillStyle = "rgb(0,0,0)";
        self.ctx.fillRect(0, 0, self.canvas.width, self.canvas.height);

        for (var i = self.drawers.length - 1; i >= 0; i--) {
            self.drawers[i].draw(self.ctx);
        }

        self.ctx.fillStyle = "#0F0";
        self.ctx.fillText("Drawers: " + self.drawers.length, 0, self.canvas.height);
    },

    do_touch: function(self, x, y) {
        self.launchers[self.cur_launcher].queue_add(x, y);
        self.cur_launcher++;
        self.cur_launcher %= self.launcher_count;
    },

    click: function(self, e) {
        var event = e.originalEvent;
        self.do_touch(event.pageX, event.pageY);

        event.preventDefault();
    },

    touchstart: function(self, e) {
        var event = e.originalEvent;

        if (event.changedTouches === undefined) {
            return;
        }

        for (var i=0; i < event.changedTouches.length; i++) {
            var touch = event.changedTouches[i];
            self.do_touch(touch.pageX, touch.pageY);
        }

        event.preventDefault();
    },

    resizeCanvas: function(self) {
        self.canvas.width = window.innerWidth;
        self.canvas.height = window.innerHeight;
        self.make_launchers();
        self.redraw();
    },
});

var ScreenObject = Class.extend({
    type: 'screen object',
    init: function(self, game, x, y) {
        self.game = game;
        self.x = x;
        self.y = y;
        self.game.drawers.push(self);
    },

    tick: function(self, t) {
    },

    draw: function(self, ctx) {
    },

    remove: function(self) {
        var index = self.game.drawers.indexOf(self);
        if (index != -1) {
            self.game.drawers.splice(index, 1); // remove if found
        }
    },
});

var PhysicsObject = ScreenObject.extend({
    type: 'physics object',
    init: function(self, game, x, y) {
        self._super(game, x, y);
        self.drag = 1;
        self.vel = new Vector();
    },

    tick: function(self, t) {
        self._super();
        var drag = self.game.world.drag * Math.pow(self.vel.m, 2) * self.drag;

        if (drag > self.vel.m) {
            self.vel.m = 0;
        } else {
            self.vel.m -= drag;
        }

        self.vel.y += self.game.world.grav * t;

        self.x += self.vel.x * t;
        self.y += self.vel.y * t;
    },
});

var Launcher = ScreenObject.extend({
    type: "launcher",

    init: function(self, game, x, y) {
        self._super(game, x, y);
        self.queue = [];
        self.time = 0;
        self.angle = -Math.PI/4;
        self.turn_rate = 0.03;
    },

    tick: function(self, t) {
        self._super(t);
        self.time += t;

        if (!self.queue.length) {
            return;
        }
        var order = self.queue[0];
        var vel = order[0];
        var fuse = order[1];

        if (Math.abs(self.angle - order[0].a) <= self.turn_rate) {
            self.queue.splice(0, 1);
            if (Math.random() > 0.5) {
                new Firework(self.game, self.x, self.y, vel, fuse);
            } else {
                new Fizzler(self.game, self.x, self.y, vel, fuse);
            }
        } else {
            if (vel.a < self.angle) {
                self.angle -= self.turn_rate;
            } else {
                self.angle += self.turn_rate;
            }
        }
    },

    queue_add: function(self, tx, ty) {
        var dx = tx - self.x;
        var dy = ty - self.y;

        var fuse = 25;
        var vx = dx / fuse;
        // Over estimate gravity, becaues the simulation isn't perfect.
        var gtsq = self.game.world.grav * 1.01 * Math.pow(fuse, 2);
        var vy = (dy - gtsq / 2) / fuse;
        var vel = new Vector().xy(vx, vy);

        self.queue.push([vel, fuse]);
    },

    draw: function(self, ctx) {
        ctx.save();
        ctx.translate(self.x, self.y);
        ctx.rotate(self.angle);

        ctx.fillStyle = 'rgb(127,127,127)';
        ctx.fillRect(-10, -10, 40, 20);

        ctx.restore();
    }
});

var Firework = PhysicsObject.extend({
    type: 'firework',

    default_opts: {
        'trail': true,
        'explosion_particles': 50,
        'explosion_velocity': 20,
    },

    init: function(self, game, x, y, vel, fuse, opts) {
        self._super(game, x, y);

        if (opts === undefined) {
            opts = {};
        }

        self.drag = 0;
        self.fuse = fuse;
        self.vel = vel;

        self.base_color = opts.color || new Color({
            'hue': Math.random()*360,
            'saturation': 100,
            'lightness': 50,
        });

        self.opts = $.extend({}, self.default_opts, opts);
    },

    tick: function(self, t) {
        self._super(t);

        if (self.x < 0 ||
            self.x > self.game.canvas.width ||
            self.y > self.game.canvas.height
        ) {
            self.remove();
        }

        self.fuse -= t;
        if (self.fuse <= 0) {
            self.explode();
        }

        self.make_trail();
    },

    explode: function(self) {
        for (var j=0; j < self.opts.explosion_particles; j++) {
            var color = new Color(self.base_color);

            var h = color.hue();
            var s = color.saturation();
            var l = color.lightness();
            color.set({
                hue: h + Math.random() * 30 - 15,
                saturation: s - Math.random() * 10,
                lightness: l + Math.random() * 20 - 10
            });

            var lifetime = Math.random() * 10 + 5;
            var size = Math.random() + 1;

            var angle = Math.random() * Math.PI * 2;
            var mag = Math.random() * self.opts.explosion_velocity + 5;
            var vel = new Vector().polar(angle, mag);

            new Particle(self.game, self.x, self.y, vel, color, lifetime, size);
        }
        self.remove();
    },

    make_trail: function(self) {
        var i, count, vel, color, lifetime, size;
        if (self.opts.trail === false) {
            return;
        }

        count = clamp(1, 3, self.fuse / 5);
        for (i = 0; i < count; i++) {
            vel = new Vector().xy(Math.random() * 2 - 1, Math.random() * 2 - 1);
            color = new Color({'red': 240 + Math.random() * 15, 'green': 170 + Math.random() * 10});
            lifetime = Math.random() * 2 + 1;
            size = Math.random() * 1;

            new Particle(self.game, self.x, self.y, vel, color, lifetime, size);
        }

    },
});

var Fizzler = Firework.extend({
    type: 'fizzler',

    default_opts: {
        'trail': true,
        'explosion_particles': 12,
    },

    explode: function(self) {
        var i;
        for (i = 0; i < self.opts.explosion_particles; i++) {
            var color = new Color(self.base_color);

            var h = color.hue();
            var s = color.saturation();
            var l = color.lightness();
            color.set({
                hue: h + Math.random() * 30 - 15,
                saturation: s - Math.random() * 10,
                lightness: l + Math.random() * 20 - 10
            });

            var lifetime = Math.random() * 5 + 5;

            var angle = Math.random() * Math.PI * 2;
            var mag = Math.random() * 5 + 10;
            var vel = new Vector().polar(angle, mag);
            vel.y -= self.game.world.grav * lifetime * 0.25;

            new Firework(self.game, self.x, self.y, vel, lifetime, {
                'color': color,
                'trail': false,
                'explosion_particles': 10,
                'explosion_velocity': 0.5,
            });
        }
        self.remove();
    },
});

var Particle = PhysicsObject.extend({
    type: 'particle',

    init: function(self, game, x, y, vel, color, lifetime, size) {
        self._super(game, x, y);

        self.color = color;
        self.lifetime = lifetime;
        self.size = size
        self.vel = vel;
    },

    tick: function(self, t) {
        self._super(t);

        if (self.x < 0 ||
            self.x > self.game.canvas.width ||
            self.y > self.game.canvas.height
        ) {
            self.remove();
        }

        self.lifetime -= t;
        if (self.lifetime < 0) {
            var fade_rate = 0.95;
            self.size *= fade_rate;

            if (self.lifetime < -30) {
                self.remove();
            }
        }
    },

    draw: function(self, ctx) {
        self._super(ctx);
        var style = self.game.options.particles.style;
        ctx.save();

        ctx.strokeStyle = self.color.hex();
        ctx.fillStyle = self.color.hex();
        ctx.beginPath();
        if (style == 'line') {
            ctx.lineWidth = self.size;
            ctx.moveTo(self.x, self.y);
            ctx.lineTo(self.x - self.vel.x, self.y - self.vel.y);
        } else if (style == 'dot') {
            ctx.arc(self.x, self.y, self.size, 0, Math.PI*2, true);
            ctx.closePath();
        } else if (style == 'bubble') {
            ctx.lineWidth = 1;
            ctx.arc(self.x, self.y, self.size * 1.25, 0, Math.PI*2, true);
            ctx.closePath();
        }

        if (style == 'line' || style == 'bubble') {
            ctx.stroke();
        } else {
            ctx.fill();
        }

        ctx.restore();
        return
    },

    remove: function(self) {
        var index = self.game.drawers.indexOf(self);
        if (index != -1) {
            self.game.drawers.splice(index, 1); // remove if found
        }
    },
});
