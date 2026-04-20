function initReactor() {
	var BAR = 100e3;
	var VAPOUR_ENERGY = 40e3 / 0.018;
	var HEAT_CAPACITY = 4180;
	var HEAT_CAPACITY_STEAM = 27 / 0.018;
	var ROD_INSERTION_TIME = 20;
	var NEUTRON_DELAY_TIME = 15;
	var IODINE_RELAX_TIME = 3600 * 6.57;
	var XENON_RELAX_TIME = 3600 * 9.2;
	var REACTOR_HEAT_CAPACITY = 10e6;
	var REACTOR_WATER_COUPLING = 1000;
	var PRESSURE_FLOW_RATIO = 2;

	var tile = 15;

	var newRegion = function() {
		return {
			T: Math.random() * 100 + 30,
			volume: 4,

			pressure: 1,
			water: 3700,

			energy: 4000 * HEAT_CAPACITY * 800,
			steamFraction: 0,
			flowCount: 0,
			flowSum: 0,
			flowPhase: 0
		};
	}

	var regions = {
		'reactor1': newRegion(),
		'reactor2': newRegion(),
		'reactor3': newRegion(),
		'reactor4': newRegion(),
		'reactor5': newRegion(),
		'reactor6': newRegion(),
		'reactor7': newRegion(),
		'poolInjector': newRegion(),
		'pool': newRegion(),
		'preGenA': newRegion(),
		'preGenB': newRegion(),
		'postGen': newRegion(),
		'postColdA': newRegion(),
		'postColdB': newRegion(),
		'coolant': newRegion(),
		'injector': newRegion(),
		'eccsA': newRegion(),
		'eccsB': newRegion(),
		'eccsPool': newRegion()
	};
	regions['eccsPool'].volume *= 5000;
	regions['eccsPool'].water *= 4000;
	regions['eccsPool'].energy = regions['eccsPool'].water * HEAT_CAPACITY * 350;
	regions['pool'].volume *= 10;
	regions['pool'].water *= 10;
	regions['pool'].energy *= 10;

	var scaler = function(name, scale) {
		regions[name].volume *= scale;
		regions[name].water *= scale;
		regions[name].energy *= scale;

	}

	scaler('preGenA', 3);
	scaler('preGenB', 3);
	scaler('postGen', 3);

	regions['pool'].volume *= 10;
	regions['pool'].water *= 10;
	regions['pool'].energy *= 10;

	var connections = [];
	var freeFlow = function(a, b, hg) {
		connections.push({
			a: a,
			b: b,
			free: true,
			hg: hg
		});
	}
	var generator = function(a, b) {
		connections.push({
			a: a,
			b: b,
			generator: true,
			forward: true
		});
	}
	var preferSteam = function(a, b) {
		connections.push({
			a: a,
			b: b,
			steam: true
		});
	}
	var valve = function(a, b, name) {
		connections.push({
			a: a,
			b: b,
			valve: true,
			name: name
		});
	}
	var pump = function(a, b, name, hg, strength) {
		if (!strength) strength = 10 * BAR;
		connections.push({
			a: a,
			b: b,
			pump: true,
			name: name,
			hg: hg,
			strength: strength
		});
	}
	var preferWater = function(a, b, hg) {
		connections.push({
			a: a,
			b: b,
			water: true,
			hg: hg
		});
	}

	freeFlow('reactor1', 'reactor2', -20);
	freeFlow('reactor2', 'reactor3', -20);
	freeFlow('reactor3', 'reactor4', -20);
	freeFlow('reactor4', 'reactor5', -20);
	freeFlow('reactor5', 'reactor6', -20);
	freeFlow('reactor6', 'reactor7', -20);
	freeFlow('reactor7', 'poolInjector', -20);
	freeFlow('poolInjector', 'pool');

	if (true) {
		preferSteam('pool', 'preGenA');
		valve('preGenA', 'preGenB', 'gen');
		generator('preGenB', 'postGen');
		freeFlow('postGen', 'postColdA');
		pump('postColdA', 'postColdB', 'cold', 0, 20 * BAR);
		freeFlow('postColdB', 'pool');
	} else {
		preferSteam('pool', 'preGenA');
		valve('preGenA', 'preGenB', 'gen');
		generator('preGenB', 'postGen');
		freeFlow('postGen', 'postColdA');
		pump('postColdA', 'postColdB', 'cold', 0, 20 * BAR);
		freeFlow('postColdB', 'pool');
	}
	preferWater('pool', 'coolant', 60);
	pump('coolant', 'injector', 'cool', 100, 30 * BAR);
	freeFlow('injector', 'reactor1', -20);
	valve('eccsB', 'injector', 'eccs');
	pump('eccsA', 'eccsB', 'extra', 0, 78 * BAR);
	freeFlow('eccsPool', 'eccsA', .1);

	var engine = {
		'target': {
			type: 'value',
			level: 1
		},
		'gen': {
			type: 'boolean',
			val: true
		},
		'eccs': {
			type: 'boolean',
			val: true
		},
		'cool': {
			type: 'value',
			angle: 1,
			level: 1
		},
		'cold': {
			type: 'value',
			angle: 1,
			level: 1
		},
		'extra': {
			type: 'value',
			angle: 1,
			level: 1
		},
		'rod': {
			type: 'value',
			levels: [0.95, 0.0, 0.95, 0.0, 0.95, 0.0, 0.95, 0.0]
		}
	};

	var newLevel = function() {
		return {
			'prompt': 0,
			'iodine': 300e6,

			'xenon': null,

			'energy': REACTOR_HEAT_CAPACITY * 400
		}
	}

	var reactor = [];
	for (var i = 0; i < 7; i++) {
		reactor.push(newLevel());
	}

	var arena = [];

	var move = function(x, y) {
		return {
			x: x * tile,
			y: y * tile,
			stroke: false
		};
	}
	var line = function(x, y) {
		return {
			x: x * tile,
			y: y * tile,
			stroke: true
		};
	}
	var flipH = function(lines) {
		var ret = [];
		for (var i = 0; i < lines.length; i++) {
			var l = lines[i];
			ret.push({
				stroke: l.stroke,
				x: tile - l.x,
				y: l.y
			});
		}
		return ret;
	}

	var flipV = function(lines) {
		var ret = [];
		for (var i = 0; i < lines.length; i++) {
			var l = lines[i];
			ret.push({
				stroke: l.stroke,
				x: l.x,
				y: tile - l.y
			});
		}
		return ret;
	}
	var flipXY = function(lines) {
		var ret = [];
		for (var i = 0; i < lines.length; i++) {
			var l = lines[i];
			ret.push({
				stroke: l.stroke,
				x: l.y,
				y: l.x
			});
		}
		return ret;
	}
	tiles = {}
	tiles.pipeH = [
		move(0, 0.3),
		line(1, 0.3),
		move(1, 0.7),
		line(0, 0.7)
	];

	tiles.pumpH = [
		move(0, 0.3),
		line(0.3, 0),
		line(0.7, 0),
		line(1, 0.3),
		move(1, 0.7),
		line(0.7, 1),
		line(0.3, 1),
		line(0, 0.7)
	];

	tiles.valveH = [
		move(0, 0.3),
		line(0.3, 0.4),
		line(0.7, 0.4),
		line(1, 0.3),
		move(1, 0.7),
		line(0.7, 0.6),
		line(0.3, 0.6),
		line(0, 0.7)
	];

	tiles.pumpV = flipXY(tiles.pumpH);
	tiles.valveV = flipXY(tiles.valveH);

	tiles.pipeV = [
		move(0.3, 0),
		line(0.3, 1),
		move(0.7, 1),
		line(0.7, 0)
	];

	tiles.pipeVR = [
		move(0.1, 0),
		line(0.1, 1),
		move(0.9, 1),
		line(0.9, 0),

	];

	tiles.pipeVREnd = [
		move(0.1, 0),
		line(0.3, 1),
		move(0.7, 1),
		line(0.9, 0),
		move(0.6, 0),
		line(0.6, 0.2),
		line(0.4, 0.2),
		line(0.4, 0)
	];

	tiles.pipeVREnd2 = flipV(tiles.pipeVREnd);

	tiles.pipe7 = [
		move(0.7, 0),
		line(0.7, 0.15),
		line(0.15, 0.7),
		line(0, 0.7),
		move(0, 0.3),
		line(0.3, 0)
	]
	tiles.pipe9 = flipH(tiles.pipe7);
	tiles.pipe3 = flipV(tiles.pipe9);
	tiles.pipe1 = flipH(tiles.pipe3);

	tiles.pipe2 = [
		move(0, 0.3),
		line(1, 0.3),
		move(1, 0.7),
		line(0.7, 1),
		move(0.3, 1),
		line(0, 0.7)
	]

	tiles.pipe8 = flipV(tiles.pipe2);
	tiles.pipe6 = flipXY(tiles.pipe2);
	tiles.pipe4 = flipH(tiles.pipe6);
	tiles.wall4 = [
		move(1, 0),
		move(1, 1),
		move(0.2, 1),
		line(0.2, 0.7),
		line(0, 0.7),
		move(0, 0.3),
		line(0.2, 0.3),
		line(0.2, 0)
	];

	tiles.wall8 = flipXY(tiles.wall4);
	tiles.wall6 = flipH(tiles.wall4);
	tiles.wall2 = flipV(tiles.wall8);
	tiles.wall7 = [
		move(0.2, 1),
		line(0.2, 0.7),
		line(0.7, 0.2),
		line(1, 0.2),
		move(1, 1)
	]
	tiles.wall9 = flipH(tiles.wall7);
	tiles.wall3 = flipV(tiles.wall9);
	tiles.wall1 = flipH(tiles.wall3);

	tiles.water = [
		move(0, 0), move(0, 1), move(1, 1), move(1, 0)
	];

	tiles.gen = [
		line(0, 0), line(0, 1), line(1, 1), line(1, 0)
	];

	tiles.cooler = [
		line(0, 0), line(0, 1), line(1, 1), line(1, 0)
	];

	arena = [];

	var px, py, pdir;

	var pleft = function(region) {
		var t = '';
		if (pdir == 0) t = 'pipe1';
		if (pdir == 1) t = '???';
		if (pdir == 2) t = 'pipe7';
		if (pdir == 3) t = 'pipeH';
		arena.push({
			tile: t,
			x: px,
			y: py,
			region: region,
			dir: [-1, 0]
		});
		px--;
		pdir = 3;
		return arena.length - 1;
	}

	var pup = function(region) {
		var t = '';
		if (pdir == 0) t = 'pipeV';
		if (pdir == 1) t = 'pipe7';
		if (pdir == 2) t = '???';
		if (pdir == 3) t = 'pipe9';
		arena.push({
			tile: t,
			x: px,
			y: py,
			region: region,
			dir: [0, -1]
		});
		py--;
		pdir = 0;
		return arena.length - 1;
	}

	var pright = function(region) {
		var t = '';
		if (pdir == 0) t = 'pipe3';
		if (pdir == 1) t = 'pipeH';
		if (pdir == 2) t = 'pipe9';
		if (pdir == 3) t = '???';
		arena.push({
			tile: t,
			x: px,
			y: py,
			region: region,
			dir: [1, 0]
		});
		px++;
		pdir = 1;
		return arena.length - 1;
	}

	var pdown = function(region) {
		var t = '';
		if (pdir == 0) t = '???';
		if (pdir == 1) t = 'pipe1';
		if (pdir == 2) t = 'pipeV';
		if (pdir == 3) t = 'pipe3';
		arena.push({
			tile: t,
			x: px,
			y: py,
			region: region,
			dir: [0, 1]
		});
		py++;
		pdir = 2;
		return arena.length - 1;
	}

	var line1 = function() {
		px = 10;
		py = 13;
		pdir = 3;
		pleft('injector');
		pleft('injector');

		var x0 = px;
		var y0 = py;

		arena.push({
			tile: 'pipe8',
			x: x0,
			y: y0,
			region: 'injector',
			dir: [-1, -0.3]
		});
		arena.push({
			tile: 'pipe8',
			x: x0 - 1,
			y: y0,
			region: 'injector',
			dir: [-1, -0.3]
		});
		arena.push({
			tile: 'pipe8',
			x: x0 - 2,
			y: y0,
			region: 'injector',
			dir: [-1, -0.3]
		});
		arena.push({
			tile: 'pipe8',
			x: x0 - 3,
			y: y0,
			region: 'injector',
			dir: [-1, -0.3]
		});
		arena.push({
			tile: 'pipe8',
			x: x0 - 4,
			y: y0,
			region: 'injector',
			dir: [-1, -0.3]
		});
		arena.push({
			tile: 'pipe8',
			x: x0 - 5,
			y: y0,
			region: 'injector',
			dir: [-0.7, -0.3]
		});
		arena.push({
			tile: 'pipe8',
			x: x0 - 6,
			y: y0,
			region: 'injector',
			dir: [-0.4, -0.3]
		});
		arena.push({
			tile: 'pipe9',
			x: x0 - 7,
			y: y0,
			region: 'injector',
			dir: [0, -0.3]
		});

		for (var i = 0; i < 8; i++) {
			px = x0 - 7 + i;
			py = y0 - 1;
			pdir = 0;
			arena.push({
				tile: 'pipeVREnd',
				x: px,
				y: py,
				region: 'injector',
				dir: [0, -0.3]
			});
			arena.push({
				tile: 'pipeVR',
				x: px,
				y: py - 1,
				region: 'reactor1',
				dir: [0, -0.3]
			});
			arena.push({
				tile: 'pipeVR',
				x: px,
				y: py - 2,
				region: 'reactor2',
				dir: [0, -0.3]
			});
			arena.push({
				tile: 'pipeVR',
				x: px,
				y: py - 3,
				region: 'reactor3',
				dir: [0, -0.3]
			});
			arena.push({
				tile: 'pipeVR',
				x: px,
				y: py - 4,
				region: 'reactor4',
				dir: [0, -0.3]
			});
			arena.push({
				tile: 'pipeVR',
				x: px,
				y: py - 5,
				region: 'reactor5',
				dir: [0, -0.3]
			});
			arena.push({
				tile: 'pipeVR',
				x: px,
				y: py - 6,
				region: 'reactor6',
				dir: [0, -0.3]
			});
			arena.push({
				tile: 'pipeVR',
				x: px,
				y: py - 7,
				region: 'reactor7',
				dir: [0, -0.3]
			});
			arena.push({
				tile: 'pipeVREnd2',
				x: px,
				y: py - 8,
				region: 'poolInjector',
				dir: [0, -0.3]
			});
		}

		px = x0 - 6;
		py -= 2;
		arena.push({
			tile: 'pipe3',
			x: px - 1,
			y: py - 7,
			region: 'poolInjector',
			dir: [.3, 0]
		});
		arena.push({
			tile: 'pipe2',
			x: px,
			y: py - 7,
			region: 'poolInjector',
			dir: [.5, 0]
		});
		arena.push({
			tile: 'pipe2',
			x: px + 1,
			y: py - 7,
			region: 'poolInjector',
			dir: [1, 0]
		});
		arena.push({
			tile: 'pipe2',
			x: px + 2,
			y: py - 7,
			region: 'poolInjector',
			dir: [1, 0]
		});
		arena.push({
			tile: 'pipe2',
			x: px + 3,
			y: py - 7,
			region: 'poolInjector',
			dir: [1, 0]
		});
		arena.push({
			tile: 'pipe2',
			x: px + 4,
			y: py - 7,
			region: 'poolInjector',
			dir: [1, 0]
		});
		arena.push({
			tile: 'pipe2',
			x: px + 5,
			y: py - 7,
			region: 'poolInjector',
			dir: [1, 0]
		});
		arena.push({
			tile: 'pipe2',
			x: px + 6,
			y: py - 7,
			region: 'poolInjector',
			dir: [1, 0]
		});
		px = px + 7;
		py = py - 7;
		pdir = 1;

		pright('poolInjector');
		pright('poolInjector');
		pright('poolInjector');

		x0 = px;
		y0 = py;

		arena.push({
			tile: 'wall4',
			x: px + 0,
			y: py + 0,
			region: 'pool',
			dir: [0, -1]
		});
		arena.push({
			tile: 'wall7',
			x: px + 0,
			y: py - 1,
			region: 'pool',
			dir: [0.7, -0.7]
		});
		arena.push({
			tile: 'wall8',
			x: px + 1,
			y: py - 1,
			region: 'pool',
			dir: [1, 0]
		});
		arena.push({
			tile: 'wall9',
			x: px + 2,
			y: py - 1,
			region: 'pool',
			dir: [0.7, 0.7]
		});
		arena.push({
			tile: 'wall6',
			x: px + 2,
			y: py,
			region: 'pool',
			dir: [0, 1]
		});
		arena.push({
			tile: 'wall3',
			x: px + 2,
			y: py + 1,
			region: 'pool',
			dir: [-0.7, 0.7]
		});
		arena.push({
			tile: 'wall2',
			x: px + 1,
			y: py + 1,
			region: 'pool',
			dir: [-1, 0]
		});
		arena.push({
			tile: 'wall1',
			x: px,
			y: py + 1,
			region: 'pool',
			dir: [-0.7, -0.7]
		});
		arena.push({
			tile: 'water',
			x: px + 1,
			y: py,
			region: 'pool',
			dir: [0, -1]
		});

		px++;
		py -= 2;
		pdir = 0;
		pright('preGenA');
		pright('preGenA');
		arena.push({
			tile: 'valveH',
			x: px,
			y: py,
			name: 'gen',
			region: 'preGenA',
			dir: [1, 0]
		});
		px++;
		pright('preGenB');
		arena.push({
			tile: 'gen',
			x: px,
			y: py,
			region: 'preGenB',
			dir: [1, 0]
		});
		px++;
		pright('postGen');
		pdown('postGen');
		pdown('postGen');
		arena.push({
			tile: 'cooler',
			x: px,
			y: py,
			region: 'postColdA',
			dir: [0, 1]
		});
		py++;
		pdown('postColdA');
		pleft('postColdA');
		pleft('postColdA');
		arena.push({
			tile: 'pumpH',
			x: px,
			y: py,
			name: 'cold',
			region: 'postColdA',
			dir: [-1, 0]
		});
		px--;
		pleft('postColdB');
		pup('postColdB');
		pup('postColdB');
		pleft('postColdB');

		px = x0 + 1;
		py = y0 + 2;
		pdir = 2;
		pdown('coolant');
		pdown('coolant');
		pdown('coolant');
		pdown('coolant');
		pleft('coolant');
		pleft('coolant');
		arena.push({
			tile: 'pumpH',
			x: px,
			y: py,
			name: 'cool',
			region: 'coolant',
			dir: [0, 1]
		});
		px--;
		pdown('injector');
		pdown('injector');
		pdown('injector');
		pdown('injector');
		x0 = px;
		y0 = py;
		arena.push({
			tile: 'pipe8',
			x: px,
			y: py,
			region: 'injector',
			dir: [-1, 0]
		});
		px--;
		pdir = 3;

		px = x0 + 1;
		py = y0;
		pdir = 1;
		var ind = pright('eccsB');
		arena[ind].dir = [-1, 0];
		arena.push({
			tile: 'valveH',
			x: px,
			y: py,
			name: 'eccs',
			region: 'eccsB',
			dir: [-1, 0]
		});
		px++;
		arena[pright('eccsB')].dir = [-1, 0];
		arena[pright('eccsB')].dir = [-1, 0];
		arena.push({
			tile: 'pumpH',
			x: px,
			y: py,
			name: 'extra',
			region: 'eccsA',
			dir: [-1, 0]
		});
		px++;
		arena[pright('eccsA')].dir = [-1, 0];
		arena[pright('eccsA')].dir = [-1, 0];
		arena[pup('eccsA')].dir = [0, 1];
		arena.push({
			tile: 'wall2',
			x: px,
			y: py,
			region: 'eccsPool',
			dir: [0, 1]
		});
		arena.push({
			tile: 'wall1',
			x: px - 1,
			y: py,
			region: 'eccsPool',
			dir: [0, 1]
		});
		arena.push({
			tile: 'wall3',
			x: px + 1,
			y: py,
			region: 'eccsPool',
			dir: [0, 1]
		});
		arena.push({
			tile: 'water',
			x: px - 1,
			y: py - 1,
			region: 'eccsPool',
			dir: [0, 1]
		});
		arena.push({
			tile: 'water',
			x: px,
			y: py - 1,
			region: 'eccsPool',
			dir: [0, 1]
		});
		arena.push({
			tile: 'water',
			x: px + 1,
			y: py - 1,
			region: 'eccsPool',
			dir: [0, 1]
		});
	}
	line1();

	var DrawAll = function() {
		var c = document.getElementById('chCanvas');
		var ctx = c.getContext('2d');
		ctx.clearRect(0, 0, c.width, c.height);
		for (var i = 0; i < arena.length; i++) {
			DrawTile(ctx, arena[i].x * tile, arena[i].y * tile, tiles[arena[i].tile], arena[i].name, regions[arena[i].region], arena[i].dir, arena[i].region);
		}
		for (var i = 0; i < arena.length; i++) {
			DrawTile2(ctx, arena[i].x * tile, arena[i].y * tile, arena[i].region);
		}
		for (var i = 0; i < 8; i++) {
			var x = (i + 1.5) * tile;
			var dist = 7.5 * tile;
			var y = 2.5 * tile - (1 - engine['rod'].levels[i]) * dist;
			ctx.strokeStyle = '#000';
			ctx.fillStyle = '#0F0';
			ctx.beginPath();
			ctx.moveTo(x - 1, y);
			ctx.lineTo(x - 1, y + 150);
			ctx.lineTo(x + 1, y + 150);
			ctx.lineTo(x + 1, y);
			ctx.stroke();
			ctx.fill();
		}
	}

	var DrawTile2 = function(ctx, x, y, regname) {
		if (regname && regname[0] == 'r' && regname[1] == 'e' && regname[2] == 'a') {

			var i = parseFloat(regname[7]);
			var r = reactor[i - 1];
			var a = r.prompt / 15e6;
			a = Math.sqrt(a);
			ctx.strokeStyle = '#0F0';
			ctx.beginPath();

			for (var j = 0; j < 30; j++) {
				a -= Math.random();
				if (a < 0) break;
				a -= 0.5;
				var x0 = x + tile * Math.random();
				var y0 = y + tile * Math.random();
				var x1 = x + tile * Math.random() + (tile * (Math.random() - 0.5)) * Math.random() * Math.random() * 8;
				var y1 = y + tile * Math.random() + (tile * (Math.random() - 0.5)) * Math.random() * Math.random() * 8;

				ctx.moveTo(x0, y0);
				ctx.lineTo(x1, y1);
			}
			ctx.stroke();
		}
	}
	var DrawTile = function(ctx, x, y, lines, name, region, dir, regname) {
		if (lines == null) return;
		ctx.beginPath();
		var T = region.pressure * 10 / BAR;
		var gr = Math.atan((region.steamFraction - 0.05) / 0.05) / Math.PI + 0.5;
		ctx.fillStyle = 'rgb(' + 0 + ',' + Math.round(gr * 255) + ',' + 0 + ')';
		ctx.strokeStyle = '#000';
		ctx.lineWidth = 1;
		ctx.moveTo(x + lines[0].x, y + lines[0].y);

		for (var i = 1; i < lines.length; i++) {
			ctx.lineTo(x + lines[i].x, y + lines[i].y);
		}
		ctx.moveTo(x + lines[0].x, y + lines[0].y);
		ctx.fill();

		ctx.beginPath();

		ctx.moveTo(x + lines[0].x, y + lines[0].y);

		for (var i = 1; i < lines.length; i++) {
			if (lines[i].stroke)
				ctx.lineTo(x + lines[i].x, y + lines[i].y);
			else {
				ctx.moveTo(x + lines[i].x, y + lines[i].y);
			}
		}
		if (lines[0].stroke) ctx.lineTo(x + lines[0].x, y + lines[0].y);
		else ctx.moveTo(x + lines[0].x, y + lines[0].y);
		ctx.stroke();
		if (name) {
			ctx.font = '12pt Courier New';
			ctx.fillStyle = '#0F0';
			ctx.strokeStyle = '#000';
			ctx.textAlign = 'center';
			ctx.fillText(name, x + tile / 2, y - tile / 4);

			if (engine[name]) {
				var status = engine[name].val;
				var type = engine[name].type;
				if (type == 'boolean' && status) {
					ctx.beginPath();
					ctx.strokeStyle = '#0F0';
					ctx.arc(x + tile / 2, y + tile / 2, tile / 2, 0, 2 * Math.PI, false);
					ctx.stroke();
				}

				if (type == 'boolean' && !status) {
					ctx.beginPath();
					ctx.strokeStyle = '#0F0';
					ctx.moveTo(x, y);
					ctx.lineTo(x + tile, y + tile);
					ctx.moveTo(x + tile, y);
					ctx.lineTo(x, y + tile);
					ctx.stroke();
				}
				if (engine[name].angle) {
					var x2 = x + tile / 2;
					var y2 = y + tile / 2;
					var s = Math.sin(engine[name].angle) * tile / 2;
					var c = Math.cos(engine[name].angle) * tile / 2;
					ctx.beginPath();
					ctx.strokeStyle = '#000';
					ctx.moveTo(x2 + s, y2 + c);
					ctx.lineTo(x2 - s, y2 - c);
					ctx.moveTo(x2 + c, y2 - s);
					ctx.lineTo(x2 - c, y2 + s);
					ctx.stroke();
				}
			}
		}
		if (dir) {
			var phase = region.flowPhase * 0.000005;
			var a = [0.5, 0.25, 0.6];
			var b = [0.5, 0.6, 0.25];
			phase = phase;
			for (var i = 0; i < 1; i++) {
				var px = phase * dir[0];
				var py = phase * dir[1];
				px = px - Math.floor(px);
				py = py - Math.floor(py);

				var dx = (((px + a[i] + 100) % 1) - 0.5) * tile;
				var dy = (((py + b[i] + 100) % 1) - 0.5) * tile;
				ctx.beginPath();

				ctx.arc(x + tile / 2 + dx, y + tile / 2 + dy, 1, 0, 2 * Math.PI, false);
				ctx.stroke();
			}
		}

	}

	var AddTable = function(name, displayName, i) {
		var ret = "<tr><td width='120px'>" + displayName + "</td>";
		var reg = regions[name];
		ret += "<td width='70px'>" + Math.round(reg.T - 273) + "</td>";
		ret += "<td width='70px'>" + Math.round(reg.pressure / BAR) + "</td>";

		ret += "<td width='70px'>" + Math.round(reg.steamFraction * 100) + "%</td>";

		if (i >= 0) {

			ret += "<td width='70px'>" + Math.round(reactor[i].xenon / 1e6) + "</td>";
		} else {
			ret += "<td></td>";
		}
		ret += "</tr>";

		return ret;
	}
	$(DrawAll);

	var updateFlows = function(dt) {
		var e = Math.exp(-dt / 5.0);
		for (var i = 0; i < connections.length; i++) {
			var c = connections[i];
			var a = regions[c.a];
			var b = regions[c.b];
			var dp = a.pressure - b.pressure;
			if (c.valve) {
				if (c.name && !engine[c.name].val) {
					c.flow = 0;
					c.eFlow = 0;
					continue;

				}
			}
			if (c.pump) {
				if (!c.name || engine[c.name].level) dp += c.strength * Math.min(1, engine[c.name].level);
			}
			if (c.hg) {
				dp += c.hg * regions[c.a].water / regions[c.a].volume;
			}
			c.flow = c.flow * e + (1 - e) * dp / PRESSURE_FLOW_RATIO;
			if (c.pump) c.flow *= 0.8;
			if (c.a == 'eccsA') c.flow *= 1;
			if (c.forward) c.flow = Math.max(0, c.flow);
			var from = null;
			var dest = null;
			var sign = 1;
			if (c.flow > 0) {
				from = a;
				dest = b;
			} else {
				from = b;
				dest = a;
				sign = -1;
			}

			if (c.flow * sign > from.water * 0.2 / dt) c.flow = from.water * sign * 0.2 / dt;
			c.eFlow = c.flow / (from.water + 1e-10) * from.energy;

			if (c.water && c.flow > 0) {
				var vlmWater = c.flow;
				vlmWater *= sign;

				var vlmSteam = 0;
				var maxWater = from.water * (1 - from.steamFraction) * 0.5 / dt;
				if (maxWater < vlmWater) {
					var dw = vlmWater - maxWater;
					vlmWater -= dw;

				}
				var e2 =
					from.T * HEAT_CAPACITY * vlmWater +
					from.T * HEAT_CAPACITY_STEAM * vlmSteam +
					vlmSteam * VAPOUR_ENERGY;
				c.eFlow = e2 * sign;
				c.flow = (vlmWater + vlmSteam) * sign;
			}

			if (c.steam && c.flow > 0) {
				var vlmWater = 0;
				var vlmSteam = c.flow;
				vlmSteam *= sign;

				var maxSteam = from.water * (from.steamFraction) * 0.2 / dt;
				if (maxSteam < vlmSteam) {
					var dw = vlmSteam - maxSteam;
					vlmSteam -= dw;

				}
				var e2 =
					from.T * HEAT_CAPACITY * vlmWater +
					from.T * HEAT_CAPACITY_STEAM * vlmSteam +
					vlmSteam * VAPOUR_ENERGY;
				c.flow = vlmSteam * sign;
				c.eFlow = e2 * sign;
			}

			if (!isFinite(c.flow + c.eFlow)) {
				c.flow = 0;
				c.eFlow = 0;
			}
			if (c.generator) {
				if (c.flow < 0) {
					c.flow = 0;
					c.eFlow = 0;
				}
			}
		}
	}

	var updateMasses = function(dt) {
		for (var i in regions) {
			regions[i].flowCount = 0;
			regions[i].flowSum = 0;
		}

		for (var i = 0; i < connections.length; i++) {
			var c = connections[i];
			var a = regions[c.a];
			var b = regions[c.b];
			var flow = c.flow * dt;
			if (flow > 0 && flow > a.water)
				flow = a.water;
			if (flow < 0 && flow < -b.water)
				flow = -b.water;

			var sfa = a.steamFraction;
			var sfb = b.steamFraction;
			if (c.flow > 0 && !c.steam && !c.water) {
				var wa = flow;
				var wb = b.water;
				b.steamFraction = (a.steamFraction * wa + b.steamFraction * wb) / (wa + wb + 1e-10);
			}
			if (c.flow < 0 && !c.steam && !c.water) {
				var wb = -flow;
				var wa = a.water;
				a.steamFraction = (a.steamFraction * wa + b.steamFraction * wb) / (wa + wb + 1e-10);
			}
			if (c.flow > 0 && c.water) {
				b.steamFraction = (a.steamFraction * wa * 0 + b.steamFraction * wb) / (wa + wb + 1e-10);
			}
			a.water -= flow;
			b.water += flow;
			if (a.water < 0)
				console.log("a.water<0");
			if (b.water < 0)
				console.log("a.water<0");
			a.energy -= c.eFlow * dt;
			b.energy += c.eFlow * dt;
			a.flowSum += c.flow;
			a.flowCount += 1;
			b.flowSum += c.flow;
			b.flowCount += 1;
		}

		for (var i in regions) {
			regions[i].flowPhase += regions[i].flowSum / (regions[i].flowCount + 0.01);
		}
	}

	var getVapP = function(T) {
		if (T < 270) T = 270;
		if (T < 333) {
			return Math.pow(10, 7.2326 - 1750.286 / (T - 38.1)) * 1000;
		} else {
			return Math.pow(10, 7.0917 - 1668.21 / (T - 45.1)) * 1000;
		}
	}

	var DP_DVOLUME = 300 * BAR;

	var getPressure2 = function(mass, energy, volume, steamFraction) {
		var e = energy - mass * steamFraction * VAPOUR_ENERGY;
		var heatCapacity = HEAT_CAPACITY * (1 - steamFraction) + steamFraction * HEAT_CAPACITY_STEAM;
		T = e / (heatCapacity * mass);

		vapP = getVapP(T);

		var vlmWater = 0.001 + mass * (1 - steamFraction) * 0.001;

		vlmWater = -Math.log(Math.exp(-vlmWater * 10) + Math.exp(-volume * 10)) * 0.1;
		var vlmRemaining = volume - vlmWater + 0.001;
		if (T < 100) T = 100;

		var extraP = ((mass * 0.001 / volume) - 1) * BAR * 50 + BAR;
		if (extraP < 0) extraP = 0;

		var w = mass * (1 - steamFraction);
		var s = mass * steamFraction;
		var a = volume / (DP_DVOLUME / BAR);

		var b = volume - w * 1e-3;
		var c = -s * T / 370;
		var P_volume = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);

		if (P_volume < 0) P_volume = 0;
		P_volume *= BAR;
		if (!isFinite(P_volume)) P_volume = 0;
		if (!isFinite(steamFraction)) steamFraction = 0;
		return {
			T: T,
			steamFraction: steamFraction,
			pVap: vapP,
			pVlm: P_volume,
			score: Math.abs(P_volume - vapP)
		};

	}
	var getPressure = function(mass, energy, volume, steamFraction, dt) {
		var epsilon = 0.00001;
		var previous = getPressure2(mass, energy, volume, steamFraction);

		for (var i = 0; i < 20; i++) {
			var dp = previous.pVap - previous.pVlm;
			var upper = getPressure2(mass, energy, volume, steamFraction + epsilon);
			var dpds = Math.abs((upper.pVap - upper.pVlm - dp) / epsilon);

			var ds1 = 0.2 / dpds;
			if (!isFinite(ds1)) ds1 = 1e-10;
			var ds2 = dt * 1 * .1 / BAR;
			var ds = dp * Math.min(ds1, ds2) * 0.05;

			if (ds > 0.02) ds = 0.02;
			if (ds < -0.02) ds = -0.02;
			steamFraction += ds;
			if (steamFraction > 1) steamFraction = 1;
			if (steamFraction < 0) steamFraction = 0;
			previous = getPressure2(mass, energy, volume, steamFraction)
		}

		return previous;
	}

	var updatePressures = function(dt) {
		for (var i in regions) {
			var r = regions[i];
			pressureFraction = getPressure(r.water, r.energy, r.volume, r.steamFraction, dt);
			r.pressure = pressureFraction.pVlm;
			r.steamFraction = pressureFraction.steamFraction;
			r.T = pressureFraction.T;
		}
	}

	var doFlows = function(dt) {
		updateFlows(dt);
		updateMasses(dt);
		updatePressures(dt);
	}

	var isOn = function(part) {
		if (part.val) return true;
		return false;
	}

	var doFirstTime = function() {
		for (var i = 0; i < connections.length; i++) {
			var c = connections[i];
			c.flow = 0;

		}
	}

	var lastCool = 0;

	var coolingTower = function(r, dt) {

		r.steamFraction = 0;

		pressureFraction = getPressure(r.water, r.energy, r.volume, r.steamFraction, dt);
		r.pressure = pressureFraction.pVlm;
		r.steamFraction = pressureFraction.steamFraction;
		r.T = pressureFraction.T;

		var TC = 370;
		if (r.T < TC) return;
		var minE = HEAT_CAPACITY * TC * r.water;
		var de = minE + (r.energy - minE) * Math.exp(-dt / 0.2);
		lastCool = (r.energy - de) / dt / 1e6;
		r.energy = de;
	}
	var reactorHeating = function(r, dt, layer) {
		var T = reactor[layer].energy / REACTOR_HEAT_CAPACITY;
		var flow = (T - r.T) * r.water * REACTOR_WATER_COUPLING;

		r.energy += flow * dt;

		reactor[layer].energy -= flow * dt;
	}

	var getEnergy = function() {
		var ret = 0;
		for (var i in regions) {
			ret += regions[i].energy;
		}
		return ret / 1e9;
	}

	var getWaterGain = function(i, rodFraction) {
		var reg = regions['reactor' + (i + 1)];
		var ret = -0.5 + (reg.steamFraction * 100 * (1.1 - rodFraction));
		return ret;
	}

	var GAIN_R = 3;
	var GAIN_W = .07;
	var GAIN_T = .5;
	var flowNeutron = function(dt) {
		var a = [];
		for (var i = 0; i < reactor.length - 1; i++) {
			a.push((reactor[i].prompt - reactor[i + 1].prompt) * dt * 0.3);
		}
		for (var i = 0; i < reactor.length - 1; i++) {
			reactor[i].prompt -= a[i];
			reactor[i + 1].prompt += a[i];
		}
	}

	var waitReactor = function(dt) {
		for (var i = 0; i < reactor.length; i++) {
			var a = Math.exp(-dt / IODINE_RELAX_TIME);
			reactor[i].iodine = reactor[i].prompt * (1 - a) + reactor[i].iodine * a;
			reactor[i].xenon = reactor[i].iodine * (1 - a) + reactor[i].xenon * a;
		}
	}

	var BACKGROUND_HEAT = 10e6;
	var reactorTimestep = function(dt) {
		for (var i = 0; i < reactor.length; i++) {
			reactor[i].prompt += dt * 16e4;

			var di = (reactor[i].prompt - reactor[i].iodine) * dt / IODINE_RELAX_TIME;
			reactor[i].iodine += di;

			var dx = (reactor[i].iodine - reactor[i].xenon) * dt / XENON_RELAX_TIME;
			reactor[i].xenon += dx;

			var poisoning = (reactor[i].prompt * reactor[i].xenon) * dt * 1e-10;
			if (poisoning > reactor[i].xenon) poisoning = reactor[i].xenon;
			var PL = 13000;
			if (poisoning > reactor[i].prompt / PL) poisoning = reactor[i].prompt / PL;
			reactor[i].xenon -= poisoning * 0.8;

			var gainSum = 0;
			var gainCount = 0;
			var insideSum = 0;
			for (var j = 0; j < engine['rod'].levels.length; j++) {
				var dl = ((1 - engine['rod'].levels[j]) - 0.15) - i / (reactor.length - 1);
				var dl2 = dl - 0.1;
				if (dl < 0) insideSum++;
				var gainR = 1.0 / (1.0 + Math.exp(-dl * 30)) + Math.exp(-dl2 * dl2 * 100) * 0.1 - 0.5;
				gainSum += gainR;
				gainCount++;
			}

			var gainR = gainSum / gainCount;

			var gainW = getWaterGain(i, insideSum / gainCount);

			var gainT = -(reactor[i].energy / REACTOR_HEAT_CAPACITY - 500) / 100.0;
			if (gainT < -3) gainT = -3 - Math.pow(-3 - gainT, 0.15);
			var gain = -1.20 + gainR * GAIN_R + gainW * GAIN_W + gainT * GAIN_T;
			gain -= reactor[i].xenon * 0.20e-7;

			gain += 0.15;

			gain *= 40;

			var b = -0.6;

			var coupling = 20;
			var ba = b + gain;
			var dg_dg = 0.5 * (1 + 1 / Math.sqrt((gain - b) * (gain - b) + 4 * coupling) * (gain - b));
			gain = (ba + Math.sqrt((gain - b) * (gain - b) + 4 * coupling)) * 0.5;

			reactor[i].dgain_dg = dg_dg;
			reactor[i].gain = gain;
			reactor[i].prompt *= Math.exp(dt * gain);

			reactor[i].energy += (reactor[i].prompt + BACKGROUND_HEAT) * dt;

		}
		flowNeutron(dt);

	}

	var timestep = function() {
		for (var i = 0; i < 3; i++) timestep2();
		var s = "<table border='1' style='cellpadding:10px;width:500px;'><tr><th>Region</th><th>Temperature (°C)</th><th>Pressure (Bar)</th><th>Steam Fraction</th><th>Xenon (U)</th>";
		s += AddTable('injector', 'Entering reactor', -1);
		s += AddTable('reactor1', 'Reactor bottom', 0);
		s += AddTable('reactor2', 'Reactor mid', 1);
		s += AddTable('reactor3', 'Reactor mid', 2);
		s += AddTable('reactor4', 'Reactor mid', 3);
		s += AddTable('reactor5', 'Reactor mid', 4);
		s += AddTable('reactor6', 'Reactor mid', 5);
		s += AddTable('reactor7', 'Reactor top', 6);
		s += AddTable('poolInjector', 'Leaving reactor', -1);
		s += AddTable('pool', 'Steam separator', -1);
		s += "</table>";
		$('#DEBUG').html(s);

	}
	var firstTime = true;
	var GLOBAL_DT = 0.01;
	var lastPower = 0;
	var lastFlowSum = 0;
	var lastFlowCount = 0;
	var aimProcessing = function(dt) {}
	var timestep2 = function(nodraw) {
		var dt = GLOBAL_DT;
		aimProcessing(dt);
		if (connections[0].flow) {
			var c = connections[0].flow;
			lastFlowCount++;
			lastFlowSum += c;
			lastFlowCount *= 0.95;
			lastFlowSum *= 0.95;
			$('#status2').html(
				'Flow: ' + Math.round(lastFlowSum / lastFlowCount) + ' l/s' +
				"<br>Total power: " + Math.round(GetPower() / 1e6)) + ' MW';
		}
		if (firstTime) {
			doFirstTime();
			firstTime = false;
		}
		var parts = Object.keys(engine);
		var messages = [];

		var p = GetPower();
		var dp = p - lastPower;
		lastPower = p;
		if (true) {
			var dir = 0;

			if (p > engine.target.target * 1e6 && dp / dt > -100e6) dir = 1;
			if (p < engine.target.target * 1e6 && dp / dt < 100e6) dir = -1;

			engine.rod.levels[1] += dir * dt / ROD_INSERTION_TIME;
			engine.rod.levels[1] = Math.max(0, Math.min(1, engine.rod.levels[1]));

			engine.rod.levels[4] += dir * dt / ROD_INSERTION_TIME;
			engine.rod.levels[4] = Math.max(0, Math.min(1, engine.rod.levels[4]));

			engine.rod.levels[7] += dir * dt / ROD_INSERTION_TIME;
			engine.rod.levels[7] = Math.max(0, Math.min(1, engine.rod.levels[7]));

		}
		for (var i = 0; i < parts.length; i++) {
			var part = engine[parts[i]];
			if (part.target !== undefined) {
				if (part.type == 'value') {
					if (part.levels) {
						for (var j = 0; j < part.levels.length; j++) {
							if (j == 1 || j == 4 || j == 7) {
								continue;
							}
							part.levels[j] += Math.sign(part.target - part.levels[j]) * dt / ROD_INSERTION_TIME;
							if (part.levels[j] > 1) part.levels[j] = 1;
							if (part.levels[j] < 0) part.levels[j] = 0;

						}
					} else {
						part.level += Math.sign(part.target - part.level) * dt / ROD_INSERTION_TIME;
					}
				} else {
					if (part.target > 0.5) {
						part.val = true;
						messages.push('switched on');
					}
					if (part.target < 0.5) {
						part.val = false;
						messages.push('switched off');
					}
				}
			}
		}
		for (var i = 0; i < parts.length; i++) {
			if (engine[parts[i]].angle) {
				engine[parts[i]].angle += 0.1 * Math.min(1, engine[parts[i]].level);
			}
		}
		doFlows(dt);
		coolingTower(regions['postColdA'], dt)
		reactorHeating(regions['reactor1'], dt, 0)
		reactorHeating(regions['reactor2'], dt, 1)
		reactorHeating(regions['reactor3'], dt, 2)
		reactorHeating(regions['reactor4'], dt, 3)
		reactorHeating(regions['reactor5'], dt, 4)
		reactorHeating(regions['reactor6'], dt, 5)
		reactorHeating(regions['reactor7'], dt, 6)

		reactorTimestep(dt);
		engine['gen'].val = (regions['pool'].steamFraction > 0.03);
		if (!nodraw) DrawAll();
	}

	$(function() {
		window.setInterval(timestep, 30);
	});

	var findNoun = function(a) {

		for (var i = 0; i < a.length; i++) {
			if (engine[a[i]]) {
				var ret = a[i];
				a[i] = null;
				return ret;
			}
		}
		return null;
	}
	var verbs = {
		'set': true,
		'x': true,
		'on': true,
		'off': true,
		'wait': true
	};
	var findVerb = function(a) {
		for (var i = 0; i < a.length; i++)
			if (verbs[a[i]]) {
				var ret = a[i];
				a[i] = null;

				return ret;
			}
		return null;
	}

	var findQty = function(a) {
		for (var i = 0; i < a.length; i++) {
			var d = parseFloat(a[i]);
			if (isFinite(d)) {
				a[i] = null;
				return d;
			}
		}
		return 0 / 0;
	}

	var setEngine = function(e, qty) {
		if (qty < 0) qty = 0;

		e.target = qty;
		return "done";
	}
	var sendCommand = function(text) {
		var a = text.split(' ');
		var noun = findNoun(a);
		var verb = findVerb(a);
		var qty = findQty(a);
		for (var i = 0; i < a.length; i++) {
			if (a[i]) return 'unknown word:' + a[i];
		}
		if (!noun) {
			return 'You need a named thing in each sentence. For instance "eccs on"';
		}
		if (!isFinite(qty) && !verb) {
			return "I'm not sure what to do with " + noun;
		}
		e = engine[noun];
		if (!e) return "internal error";
		if (isFinite(qty)) {
			var s = setEngine(e, qty);
			return "Set " + noun + " to " + qty + " : " + s;
		}
		if (verb == 'on') {
			var s = setEngine(e, 1);
			return "Set " + noun + " to " + 1 + " : " + s;
		}
		if (verb == 'off') {
			var s = setEngine(e, 0);
			return "Set " + noun + " to " + 0 + " : " + s;
		}
		if (verb == 'wait') {
			for (var i = 0; i < 20; i++) {
				waitReactor(3600 / 20.0);
				timestep();
			}
		}
	}

	var SetXenon = function(level) {
		for (var i = 0; i < reactor.length; i++) {
			reactor[i].xenon = level / reactor.length;

		}
	}

	var SetSteam = function(level) {
		for (var i in regions) {
			regions[i].steamFraction = level;
		}
	}

	var SetRods = function(level) {
		for (var i = 0; i < engine.rod.levels.length; i++) {
			engine.rod.levels[i] = level;
		}
	}
	var SetT = function(level) {
		for (var i = 0; i < reactor.length; i++) {
			reactor[i].energy = REACTOR_HEAT_CAPACITY * level;
		}
	}

	var CheckExplodes = function(name) {
		reactorTimestep(GLOBAL_DT);
		var gainSum = 0;
		var gainCount = 0;
		var success = true;
		for (var i = 0; i < reactor.length; i++) {

			gainSum += reactor[i].gain;
			gainCount++;
		}
		var gain = gainSum / gainCount;
		if (gain > 0.2) {
			console.log("pass: " + name + " gain=" + gainSum / gainCount);
		} else {
			console.log("FAIL: " + name + " gain=" + gainSum / gainCount + " should be > 0.2");
		}
	}

	var SetPrompt = function(l) {
		for (var i = 0; i < reactor.length; i++) {
			reactor[i].prompt = l;
		}
	}

	var GetPower = function() {
		var ret = 0;
		for (var i = 0; i < reactor.length; i++) {
			ret += reactor[i].prompt + BACKGROUND_HEAT;
		}
		return ret;
	}

	var CheckNoExplodes = function(name) {
		SetPrompt(0);
		var t = reactor[0].energy / REACTOR_HEAT_CAPACITY;
		for (var i = 0; i < 400; i++) {
			reactorTimestep(GLOBAL_DT);
			SetT(t);
		}
		var E = GetPower();
		var success = true;
		if (E > 3500e6) {
			console.log("TEST FAIL:" + name + " power after 8 seconds = " + E);
		}
		console.log("pass:" + name + " power after 8 seconds = " + E);
		var gainSum = 0;
		var gainCount = 0;

		for (var i = 0; i < reactor.length; i++) {
			if (reactor[i].gain > 0.7) {
				console.log("TEST FAIL:" + name + ", " + i + " : GAIN = " + reactor[i].gain);
				success = false;
			}
			gainSum += reactor[i].gain;
			gainCount++;
		}
		console.log("pass: " + name + " gain=" + gainSum / gainCount);
	}

	var INITIAL_XENON = 600e6;

	var Test = function() {

		SetXenon(0);
		SetSteam(0);
		SetRods(0.1);
		SetT(276 + 550);
		CheckExplodes("X0S0R0");

		SetSteam(0.99);
		SetRods(0.9);
		CheckNoExplodes("X0S0R.8");

		SetT(276 + 250);
		SetSteam(0);
		SetRods(0);
		SetXenon(INITIAL_XENON);

		CheckNoExplodes("X1S0R0 - N");

		SetT(276 + 250);
		SetSteam(0.2);
		SetRods(0);
		SetXenon(INITIAL_XENON);

		CheckExplodes("X1S.4R0 - E");

	}

	Test();

	SetSteam(0);
	SetRods(0.95);
	SetXenon(INITIAL_XENON);

	for (var i = 0; i < 3000; i++) {
		var T = 276 + 315
		SetT(T);
		for (var i in regions) {
			if (regions[i].steamFraction > 0.01) regions[i].energy *= 0.8;
			regions[i].energy = regions[i].water * HEAT_CAPACITY * (T);
		}
		regions.eccsPool.energy = regions.eccsPool.water * HEAT_CAPACITY * 300;

		for (var j = 0; j < 5; j++) timestep2(true);
	}

	$(function() {
		$("#chStdin").keypress(function(e) {
			if (e.which == 13) {
				e.preventDefault();
				consoleSubmit();
			}
		});
	});

	var consoleSubmit = function() {
		var k = $('#chStdin').val();
		var response = sendCommand(k);
		document.getElementById("chStdout").innerHTML += `<b><span class="user">guest</span>@terminal:~$</b> ${k}<br>${response}<br>`;
		$('#chStdin').val("");
	}

	var alerter = function(ev) {}
}
