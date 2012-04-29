$(function() {
    new Game();
});

var Game = Class.extend({
    type: "game",

    init: function(self) {
        self.drawers = [];
        self.last_tick = +new Date();

        self.canvas = document.getElementById('canvas');
        self.ctx = self.canvas.getContext('2d');

        $(window).on('resize', $.proxy(self.resizeCanvas, self));
        self.resizeCanvas();

        self.timer = setInterval($.proxy(self.tick, self), 16);

        $(self.canvas).on('click', $.proxy(self.click, self));
        $(self.canvas).on('touchstart', $.proxy(self.touchstart, self));
        $(self.canvas).on('touchmove', $.proxy(self.touchmove, self));
        $(self.canvas).on('touchend', $.proxy(self.touchend, self));

        self.world = {
            'grav': 0.8,
            'drag': 0.003,
        }

        self.launchers = [];
        self.cur_launcher = 0;
        var skew = (self.canvas.width - 50) / 2;
        for (var i=0; i < 3; i++) {
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
    },

    do_touch: function(self, x, y) {
        self.launchers[self.cur_launcher].queue_add(x, y);
        self.cur_launcher++;
        self.cur_launcher %= 3;
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

    touchmove: function(self, e) {
        var event = e.originalEvent;

        if (event.changedTouches === undefined) {
            return;
        }

        event.preventDefault();
    },

    touchend: function(self, e) {
        var event = e.originalEvent;

        if (event.changedTouches === undefined) {
            return;
        }

        event.preventDefault();
    },

    resizeCanvas: function(self) {
        self.canvas.width = window.innerWidth;
        self.canvas.height = window.innerHeight;
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
            new Firework(self.game, self.x, self.y, vel, fuse);
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
    init: function(self, game, x, y, vel, fuse) {
        self._super(game, x, y);

        self.drag = 0;
        self.fuse = fuse;
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

        self.fuse -= t;
        if (self.fuse <= 0) {
            self.explode();
        }
    },

    draw: function(self, ctx) {
        self._super(ctx);
        ctx.save();

        ctx.fillStyle = 'rgb(255, 200, 200)';
        ctx.beginPath();
        ctx.arc(self.x, self.y, 2, 0, Math.PI*2, true);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    },

    explode: function(self) {
        var particles_per_explosion = 60;
        var color = new Color({
            'hue': Math.random()*360,
            'saturation': 100,
            'lightness': 50,
        });
        for (var j=0; j < particles_per_explosion; j++) {
            new Particle(self.game, self.x, self.y, color);
        }
        self.remove();
    },
});

var Particle = PhysicsObject.extend({
    type: 'particle',

    init: function(self, game, x, y, base_color) {
        self._super(game, x, y);

        self.color = new Color(base_color);

        var h = self.color.hue();
        var s = self.color.saturation();
        var l = self.color.lightness();
        self.color.set({
            hue: h + Math.random() * 30 - 15,
            saturation: s - Math.random() * 10,
            lightness: l + Math.random() * 20 - 10
        });

        self.lifetime = Math.random() * 20 + 10;
        self.size = Math.random() + 1;

        var angle = Math.random() * Math.PI * 2;
        var vel = Math.random() * 20 + 5;
        self.vel = new Vector().polar(angle, vel);
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
        ctx.save();

        ctx.strokeStyle = self.color.hex();
        ctx.lineWidth = self.size;

        ctx.beginPath();
        ctx.moveTo(self.x, self.y);
        ctx.lineTo(self.x - self.vel.x, self.y - self.vel.y);
        ctx.stroke();

        ctx.restore();
    },

    remove: function(self) {
        var index = self.game.drawers.indexOf(self);
        if (index != -1) {
            self.game.drawers.splice(index, 1); // remove if found
        }
    },
});
