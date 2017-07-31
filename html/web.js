var c = document.getElementById("myCanvas");
var ctx = c.getContext("2d");


/** Charts are done using ChartJS*/
var sd = document.getElementById("maxpos").getContext('2d');
var temp = document.getElementById("temp").getContext('2d');
var colour = document.getElementById("colour").getContext('2d');
var population = document.getElementById("population").getContext('2d');

var distribution = new Chart(sd, {
	type: 'line',

	data: {
		datasets: [{
			label: 'Min',
			data: [],
			borderColor: "#3e95cd",
			fill: false

		},
		{
			label: 'Max',
			data: [],
			borderColor: "#393ecd",
			fill: false

		}]
	},
	options: {
		responsive:false,
		title: {
			display: true,
			text: 'Distribution'
		}

	}
});
var temperature = new Chart(temp, {
	type: 'line',
	data: {
		datasets: [
		{
			label: 'Global',
			data: [],
			borderColor: "#00ff00",
			fill: false

		}]
	},
	options: {
		responsive:false,
		title: {
			display: true,
			text: 'Temperature'
		},
		scales: {
			yAxes: [{
				display:true,
				ticks: {
					min: 0,
					max: 50
					}
				}
			]
		}
		 
	}
});




var colours = new Chart(colour, {
	type: 'line',
	data: {
		datasets: [{
			label: 'Black',
			data: [],
			borderColor: "#ff0000",
			fill: false

		},
		{
			label: 'White',
			data: [],
			borderColor: "#0000ff",
			fill: false

		}]
	},
	options: {
		responsive:false,
		title: {
			display: true,
			text: 'Colours'
		}

	}
});
var pop = new Chart(population, {
	type: 'line',
	data: {
		datasets: [{
			label: 'Black',
			data: [],
			borderColor: "#ff0000",
			fill: false

		},
		{
			label: 'White',
			data: [],
			borderColor: "#0000ff",
			fill: false

		},
		{
			label: 'Total',
			data: [],
			borderColor: "#00ff00",
			fill: false

		}]
	},
	options: {
		responsive:false,
		title: {
			display: true,
			text: 'Population'
		}

	}
});


var check_arr = [];


function reset_arr() {
	for (var x = 0; x < landscape_x; x++) {
		var l = [];
		for (var y = 0; y < landscape_y; y++) {
			l.push(0);
		}
		check_arr.push(l);
	}
}

function start() {
	ctx.fillStyle = "rgb(0, "+Math.floor(255*0.5)+", "+Math.floor(255*0.5)+")";
	ctx.fillRect(0,0,300,300);
	var z = run(1);
	/* Push data to the charts. */
	distribution.data.datasets[0].data.push(z.min_y);
	distribution.data.datasets[1].data.push(z.max_y);
	distribution.data.labels.push(1);
	temperature.data.datasets[0].data.push(z.global_temp);
	temperature.data.labels.push(1);
	colours.data.datasets[0].data.push(z.average_c_low);
	colours.data.datasets[1].data.push(z.average_c_high);
	colours.data.labels.push(1);
	pop.data.datasets[0].data.push(z.num_low);
	pop.data.datasets[1].data.push(z.num_high);
	pop.data.datasets[2].data.push(z.num_daisies);
	pop.data.labels.push(1);	

	if (distribution.data.labels.length > 50) {
		distribution.data.datasets[0].data.shift();
		distribution.data.datasets[1].data.shift();
		distribution.data.labels.shift();
		temperature.data.datasets[0].data.shift();
		
		temperature.data.labels.shift();
		colours.data.datasets[0].data.shift();
		colours.data.datasets[1].data.shift();
		colours.data.labels.shift();
		pop.data.datasets[0].data.shift();
		pop.data.datasets[1].data.shift();
		pop.data.datasets[2].data.shift();
		pop.data.labels.shift();
		/* Shift removes the first element in an array.*/
	}
	distribution.update();
	temperature.update();
	colours.update();
	pop.update();

	reset_arr();
	for (l = 0; l < daisies.length; l++) {
		check_arr[daisies[l].pos[0]][daisies[l].pos[1]]++;
		ctx.fillStyle = "rgb("+Math.floor(daisies[l].colour * 255)+","+Math.floor(daisies[l].colour * 255)+","+Math.floor(daisies[l].colour * 255)+")";
		ctx.fillRect(daisies[l].pos[0]*10, daisies[l].pos[1]*10, 10, 10 ); /* 10px by 10px squares on grid.
		
	}

	document.getElementById("insolation").value = radiation_intensity;
}

/* Display temperature on hsl gradient - rainbow scale, with the orangey red being cold and the purply red being hot. */
function display_temperature() {
	ctx.fillStyle = "rgb(0, "+Math.floor(255*0.5)+", "+Math.floor(255*0.5)+")";
	ctx.fillRect(0,0,300,300);
	var x,y;
	for (x = 0; x < landscape_x; x++) {
		for (y = 0; y < landscape_y; y++) {
			v = (temperature_map[x][y] - 15)/35;
			var h = (1.0 - v)*250;
			ctx.fillStyle = "hsl("+h+", 100%, 50%)";
			ctx.fillRect(x*10, y*10,	10, 10 );
		}
	}
}


var backup = [];
var mutating = 1; 
for (var p = 0; p < mutation_deviation.length; p++) {
	backup.push(0); // Allows you to turn mutation on and off.
}

/* Allows the insolation to be changed using the form and allows mutations to be turned on and off */
function update_insolation() {
	var i;
	radiation_intensity = document.getElementById("insolation").value;
	if (document.getElementById("evolve").checked == false) {
		if (mutating == 1) {	
			for (i = 0; i < mutation_deviation.length; i++) {
				backup[i] = mutation_deviation[i];
				mutation_deviation[i] = 0;
			}
			mutating = 0;
		}

	} else {
		if (mutating == 0) {
			mutating = 1;
			for (i = 0; i < backup.length; i++) {
				mutation_deviation[i] = backup[i];
			}
		}

	}
}

function extinction(x) {
	// x is the % of organisms which die. ie 0.95 for 95%
	num_to_kill = daisies.length * x;
	for (var i = 0; i < num_to_kill; i++) {
		var q = rng(0, daisies.length-1);
		filled_positions.splice(filled_positions.indexOf(daisies[q].pos), 1);
		daisies.splice(q, 1);
	}
	return;
}


