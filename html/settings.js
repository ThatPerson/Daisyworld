/* Map dimensions */
var landscape_x = 30;
var landscape_y = 30;

/* Initial settings */
var initial_pop = 10;
var initial_mutation_rate = 0.5;
var initial_colour = 0.5;
var initial_t_opt = 25;
var initial_dispersal = 3;
var initial_progeny = 2;
var diploid = 1;

var mutation_deviation = [0.05, 0.25, 0, 0, 0, 0.25]; // colour, optimum temperature A, dispersal, progeny, mutation rate, optimum temperature B
var age_of_death = 20; // How long daisies live for.
var radiation_intensity = 1; // The amount of solar insolation. Generally daisies can survive in a range 0.7-1.8 according to literature (but to go ie to 1.8 you need to start off either with daisies adapted for that environment, or give them time to mutate. 
var filled_positions = []; // Array containing all of the filled positions. Would probably be better done with a 2D array (would also simplify check_pos).
var global_temperature = 25; // Initial temperature
var resources_for_reproducing = 30; // How many resources need to be accumulated for a daisy to reproduce. In the case of multiple progeny, this is split between them (ie if the daisy has two offspring then each ends up with 10 resources. This means there is a trade off to mutating more progeny - more progeny means more chance for them to survive, but each will take longer to reproduce.
var daisies = []; // Array containing all daisies.
var carrying_capacity = 3000; // Maximum number of daisies which can survive. At the moment carrying_capacity >> landscape_x*landscape_y so it's irrelevant. Reducing carrying capacity will probably lead to more extreme progeny forming.

var s; // General variable used for counting.
var time_q = 0; // Global time - iterates every step.

var solar_intensity = 1366; // Current value for earth.
var sigmaconstant = 5.67*Math.pow(10, -8); // Stefan–Boltzmann constant. Used in equation S(1-a) = sig*e*T^4 in energy balance.


/* This isn't used any more but is left over from when I was playing around with the model */
var initial_nutrients = 1000;
var nutrients = [];

var temperature_map = []; // This is what is displayed when you press show temperature.

/* radiation_factor changes the intensity from the polar region to the equatorial region. Value of 0 is polar, value of 1 is equatorial. */
function radiation_factor(n) {
	// n is the the position's y pos/landscape_y - so from 0 to 1
	return 0.8 + 0.4*n;
}

/* vary_ri() is run every time step and allows you to vary the radiation intensity. Generally small values are needed, if not the daisies can't mutate to keep up. */
function vary_ri() {
	radiation_intensity += 0.0001;
		//radiation_intensity -= 0.00005 * Math.sin(time_q * 3.14/1000); // Periodic oscillations.
}

/* rng generates a random number between n and m */
function rng(n, m) {
	return n + Math.floor(Math.random() * (m-n+1));
}

/* check_pos checks a position [x, y] to see if it exists. Returns -1 if position is vacant, else returns the daisy in that position. */
/* Unfortunately you can't simply use indexOf to do this because for some reason javascript treats its arrays of arrays as pointers. */
function check_pos(p) {
	for (var i = 0; i < filled_positions.length; i++) {
		if (filled_positions[i][0] == p[0] && filled_positions[i][1] == p[1]) {
			return i;
		}
	}
	return -1;
}

/* Sums a property of all classes inside an array - so daisies.sum('colour') returns the sum of all daisy colours. */
Array.prototype.sum = function (prop) {
	var total = 0;
	var dlen = this.length;
	var i;
	for (i = 0; i < dlen; i++ ) {
		total += this[i][prop];
	}
	return total
}

/* Daisy class definition. */
function Daisy (x, y, colour, t_opt, dispersal, progeny, resources, gen, mutation_rate) {
	this.pos = [x, y];
	this.colour = colour;
	this.current = 0; // Current optimum temperatuer in use.
	this.switchs = 0; // =1 if the daisy is switching this turn, 0 if not.
	this.t_opta = t_opt; // This is an array containing two optimum temperatures, A and B.
	this.diploid = 1; // Switch between haploid (0) and diploid (1)
	this.dispersal = dispersal; // New progeny are placed in a circle radius dispersal around the daisy.
	this.progeny = progeny;
	this.age = 0;
	this.local_t = 0;
	this.generation = gen;
	this.mutation_rate = mutation_rate;
	this.living = 1;
	this.cumulated_resources = resources;
}

/* At the moment temperature change is just done by smoothing the map by splotting it up into 3x3 blocks and taking the average */
function update_t_map() {
	var x, y, xi, yi, min_x, max_x, min_y, max_y;
	var b_temperature_map = [];
	var albedo_temp;
	for (x = 0; x < landscape_x; x++) {
		b_temperature_map.push([]);
		for (y = 0; y < landscape_y; y++) {
			var p = [x, y];
			if (check_pos(p) == -1) { // ie space is empty.
				albedo_temp = Math.pow((solar_intensity * radiation_factor(y/landscape_y) * radiation_intensity * (1-0.5))/(4*sigmaconstant), 1/4); /* Stefano-Boltzmann law */
				albedo_temp = albedo_temp + 25 - 234; // Normalise the values - This allows the temperature variation to be physical but we don't need to take into account the atmosphere.
				temperature_map[x][y] = 0.4*albedo_temp + 0.6*temperature_map[x][y]; // 40% of the temperature is albedo, 60% is from before ie insulation.
			}
			b_temperature_map[x][y] = temperature_map[x][y]; /* Javascript arrays are weird pointer things so you have to equate each position individually */
		}
	}
	
	/* the averaging process */
	for (x = 0; x < landscape_x; x++) {
		for (y = 0; y < landscape_y; y++) {
			min_x = x - 1;
			max_x = x + 2;
			min_y = y - 1;
			max_y = y + 2;
			if (min_x < 0)
				min_x = 0;
			if (max_x > landscape_x - 1)
				max_x = landscape_x - 1;
			if (min_y < 0)
				min_y = 0;
			if (max_y > landscape_y - 1)
				max_y = landscape_y - 1;
			var total = 0;
			for (xi = min_x; xi < max_x; xi++) {
				for (yi = min_y; yi < max_y; yi++) {
					total += b_temperature_map[xi][yi];
				}
			}
			temperature_map[x][y] = total/((max_y - min_y) * (max_x - min_x));
		}
	}
	return;
}
			
/* Get daisy optimum temperature. Currently this is just the closest one to the local temperature, however this would need to be adjusted for EDEA. */
Daisy.prototype.t_opt = function () {
	var local_te = temperature_map[this.pos[0]][this.pos[1]];
	delta_a = Math.abs(this.t_opta[0] - local_te);
	delta_b = Math.abs(this.t_opta[1] - local_te);
	if (delta_a < delta_b) {
		if (this.current == 1) {
			this.switchs = 1; // Have we changed allele? If so, set switched.
		}
		this.current = 0;
		return this.t_opta[0];
	}
	if (this.current == 0) {
		this.switchs = 1;
	}
	this.current = 1;
	return this.t_opta[1];
};

/* Asexual diploid reproduction - progeny produced with mutations in all genes according to the mutation array above. */
Daisy.prototype.reproduce = function() {
	var progenitors = []
	for (i = 0; i < this.progeny; i++) {
		/* x and y delta form a cicle */
		var y_delta = rng(0, 2*this.dispersal) - this.dispersal;
		var x_delta = Math.pow(-1, rng(0, 1)) * rng(0, Math.sqrt(Math.pow(this.dispersal, 2) - Math.pow(y_delta, 2)));
		
		var deltas = [0, 0, 0, 0, 0, 0]; // This is an array of the amount by which each property actually changes each time.
		for (isd = 0; isd < deltas.length; isd++) {
			if (Math.random() < this.mutation_rate) {	
				deltas[isd] = Math.pow(-1, rng(0, 1)) * mutation_deviation[isd];
			}
		}
		/* the new_ variables are the new properties, which are just the old ones + the deltas */
		var new_c = this.colour+deltas[0];
		var new_ta = this.t_opta[0]+deltas[1];
		var new_tb = this.t_opta[1]+deltas[5];	
		var new_d = (this.dispersal + deltas[2]);
		var new_p = this.progeny + deltas[3];
		var new_m = this.mutation_rate + deltas[4]
		var new_x = this.pos[0] + x_delta;
		var new_y = this.pos[1] + y_delta;
		
		if (diploid == 0)
			new_tb = new_ta; // Haploids are treated as diploids with the alleles forced to be identical.
		
		/* ensure all properties are within the ranges allowed - can't have a colour of -1 or be off the map */
		if (new_ta < 0)
			new_ta = 0;
		if (new_tb < 0)
			new_tb = 0;
		if (new_c < 0)
			new_c = 0;
		if (new_c > 1)
			new_c = 1;
		if (new_x > landscape_x - 1)
			new_x = landscape_x - 1;
		if (new_x < 0)
			new_x = 0;
		if (new_y > landscape_y - 1)
			new_y = landscape_y -1;
		if (new_y < 0)
			new_y = 0;
			
		/* createe new daisy with new properties. 
		 * the syntax used in some is as follows;
		   (if statement) ? if true : if false.
		   For example
		   	a = (3 > 4)?1:2 -> 2
		   	a = (7 > 2)?9:1 -> 9
		   This helps to shrink the code */
		var new_daisy = new Daisy(new_x, new_y, ((new_c > 0) ? new_c : 0), [((new_ta > 0) ? new_ta : 0), ((new_tb > 0) ? new_tb : 0)], new_d, ((new_p > 0) ? new_p : 1), this.cumulated_resources/(this.progeny+1), this.generation+1, new_m);

		if (check_pos(new_daisy.pos) == -1) { // If there is always a daisy we can't put a new one there. Early on Cock and I were discussing how if you made it if the progeny had more resources it would win, which if progeny was mutatable might lead to the evolution of a K strategy over r - this might be interesting to look into as a case study?
			if (new_daisy.pos[0] < landscape_x && new_daisy.pos[0] >= 0 && new_daisy.pos[1] >= 0 && new_daisy.pos[1] < landscape_y) { // ie if it falls off the map.
				progenitors.push(new_daisy);
			}
		}
	}
	this.cumulated_resources = this.cumulated_resources/(this.progeny + 1); // As mentioned before, resources are split between progeny and parent.
	return progenitors;
};

/* Daisy growth function */
Daisy.prototype.grow = function() {
	if (this.living != 1) {
		return -1;
	}
	this.age++;
	if (this.age > age_of_death || this.cumulated_resources < 0 || check_pos(this.pos) == -1) {
		// The daisy dies if it's too old, if it's run out of resources (which leads to heat death), or if the position is vacant (position being vacant indicates the program has an issue somewhere, here we just ignore it as it allows people to splice half the filled_positions array and the code will keep up. 
		this.living = 0;
		return -1;
	}
	
	var albedo_temp = Math.pow((solar_intensity * radiation_factor(this.pos[1]/landscape_y) * radiation_intensity * (1-this.colour))/(4*sigmaconstant), 1/4); // Same Stefan-Boltzmann law as above.
	albedo_temp = albedo_temp + 25 - 234;
	
	/* this bit is a bit sticky - you may notice that occasionally no daisies will form on the map. I'm not entirely sure why this is but I believe it has to do with the temperature_map properties not being present. Sticking a try catch statement fixed part of it. */
	try {
		this.local_t = 0.4 * albedo_temp + 0.6 * temperature_map[this.pos[0]][this.pos[1]];
		console.log(this.local_t + " + " + this.cumulated_resources);
	} catch (err){
		console.log(this.pos[0]);
		return;
	}

	temperature_map[this.pos[0]][this.pos[1]] = this.local_t;
	var delta_resources = 5 - Math.pow((this.local_t - this.t_opt()), 2); // Can change how the difference in temperature affects resources accumulated. If you want to change this to an odd power put Math.abs() around it, otherwise if t_opt > local_t it will add more resources.
	this.cumulated_resources += delta_resources;

	var x = []; // Array of new progeny
	if (this.cumulated_resources > resources_for_reproducing) {
		x = this.reproduce(); // If you want to introduce sexual reproduction it might be an idea to put the reproduce function outside growth so all daisies grow before you reproduce them.
	}
	return x;
}

/* Round s to n decimal places */
function roundp(s, n) {
	return Math.round(s*Math.pow(10, n))/Math.pow(10, n);
}

/* Run for n steps. I wouldn't recommend doing n > 1 on the web side, it's better to call the start() function - this updates the screen too. */
function run(n) {
	var i
	for (i = 0; i < n; i++) {
		if (filled_positions.length != daisies.length) {
			console.log("Something went wrong.");
		}

		vary_ri();
		time_q++;
		update_t_map();
		var planetary_albedo = (daisies.sum("colour") + (0.5 * ((landscape_x*landscape_y) - filled_positions.length)))/(landscape_x * landscape_y);
		var x, y, total = 0;
		for (x = 0; x < landscape_x; x++) {
			for (y = 0; y < landscape_y; y++) {
				total += temperature_map[x][y];	
			}
		}
		global_temperature = total/(landscape_x * landscape_y); // Average temperature of map.

		var progeny = []; // Array containing all new daisies. 
		for (l = 0; l < daisies.length; l++) {
			var p = daisies[l].grow();
			if (p != -1) {
				progeny = progeny.concat(p);
			} else { 
				filled_positions.splice(check_pos(daisies[l].pos), 1); // Daisy is dead.
				daisies.splice(l, 1);
				l--; // Remove dead daisies.
			}
		}
		var sds;	
		for (sds = 0; sds < progeny.length; sds++) {
			if (progeny[sds] != null) {
				if (check_pos(progeny[sds].pos) == -1) {
					filled_positions.push(progeny[sds].pos);
					daisies.push(progeny[sds]);
				}
			}
		}
		
		/* Cull. Ensure carrying capacity is maintained (a more biological way to do this would be for example introduce nutrients, then you could have a cycle of these too. For computational efficiency I've found it's simpler just to randomly kill a load). */
		var number_to_cull = filled_positions.length - carrying_capacity, pl;
		for (pl = 0; pl < number_to_cull; pl++) {	
			var q = rng(0, daisies.length-1);
			filled_positions.splice(check_pos(daisies[q].pos), 1);
			daisies.splice(q, 1); // Cull at random.
		}

		/* That's all the computation done - this is just summary data for output. */
		var t_opt = [0, 0, 0]; // [black, white, grey] (Grey is just a placeholder though).
		var colour = [0, 0, 0];
		var progeny = [0, 0, 0];
		var dispersal = [0, 0, 0];
		var mutation_rate = [0, 0, 0];
		var count = [0, 0, 0];
		var min_y = landscape_y;
		var max_y = 0;
		var switchs = 0, b;
		for (b = 0; b < daisies.length; b++) {
			var c;
			if (daisies[b].colour > 0.50) {
				c = 1;
			} else if (daisies[b].colour <= 0.5) {
				c = 0;
			} else {
				c = 2;
			}
			if (daisies[c].switchs == 1) // Count number of switching daisies.
				switchs++;
			count[c]++;
			t_opt[c]+=daisies[b].t_opt();
			colour[c]+=daisies[b].colour;
			progeny[c] += daisies[b].progeny;
			dispersal[c]+= Math.abs(daisies[b].dispersal);
	
			mutation_rate[c]+=daisies[b].mutation_rate;
			if (min_y > daisies[b].pos[1])
				min_y = daisies[b].pos[1];
			if (max_y < daisies[b].pos[1])
				max_y = daisies[b].pos[1];
		}
		if (count[0] == 0)
			count[0] = -1;
		if (count[1] == 0)
			count[0] = -1;

		console.log(i+", " + daisies.length + ", " + roundp(global_temperature, 2) + ", " + switchs + ", " + count[0] + ", " + count[1] + ", " + roundp(colour[0]/count[0], 2) + ", " + roundp(colour[1]/count[1], 2) + ", " + roundp(colour[2]/count[2], 2) + ", "  + radiation_intensity+ ", " + count[2]);
	
	}

	var xx = {
		global_temp: global_temperature,
		average_t_low: t_opt[0]/count[0],
		average_t_high: t_opt[1]/count[1],
		average_c_low: colour[0]/count[0],
		average_c_high: colour[1]/count[1],
		num_low: count[0],
		num_high: count[1],
		min_y: min_y,
		max_y: max_y,
		num_daisies: filled_positions.length
	};

	return xx;
}

/* Setup the map - temperature, initial daisies */
function setup() {
	var l, x;
	/* Create temperature map containing only the initial global_temperature */s
	for (x = 0; x < landscape_x; x++) {
		l = [];
		for (var y = 0; y < landscape_y; y++) {
			l.push(global_temperature);
		}
		temperature_map.push(l);
	}
	
	var i;
	for (var i = 0; i < initial_pop; i++) {
		var p = new Daisy(rng(0, landscape_x), rng((landscape_y / 2)-5, (landscape_y / 2) + 5), initial_colour, [initial_t_opt, initial_t_opt], initial_dispersal, initial_progeny, rng(0, 50), 1, initial_mutation_rate);
		if (check_pos(p.pos) != -1) {
			i--;
		} else {
			daisies.push(p);
			filled_positions.push(p.pos);
		}
	}
	return 1;
}
setup();
