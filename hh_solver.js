var POTASSIUM_CONDUCTANCE = 36.0;  //mmohs/cm^2
var SODIUM_CONDUCTANCE    = 120.0; //mmohs/cm^2
var LEAK_CONDUCTANCE	  = 0.3;   //mmohs/cm^2
var POTASSIUM_VOLTAGE = 12.0;   //mV
var SODIUM_VOLTAGE    = -115.0; //mV
var LEAK_VOLTAGE      = -10.6;//mV
var MEMBRANE_CAPACITANCE = 1.0;

var alpha_map = {
	'n': function(v){return 0.01*(v+10.0)/(Math.exp((v+10.0)/10.0)-1.0)},
	'm': function(v){return 0.1*(v+25.0) /(Math.exp((v+25.0)/10.0)-1.0)},
	'h': function(v){return 0.07*Math.exp(v/20.0)},
};
var beta_map = {
	'n': function(v){return 0.125*Math.exp(v/80.0)},
	'm': function(v){return 4.0*Math.exp(v/18.0)},
	'h': function(v){return 1.0/(Math.exp((v+30.0)/10.0)+1.0)},
};

function get_alpha(ion, volts){
	return alpha_map[ion](volts);
}
function get_beta(ion, volts){
	return beta_map[ion](volts);
}

function get_d_prop(a,b,x,dt){
	return dt * (a * (1.0-x) - b * x);
}

function get_d_volts(v,xn,xm,xh,dt){
	var cm = MEMBRANE_CAPACITANCE;
	return (-dt/cm)*(
			get_i_k(v,xn) + 
			get_i_na(v,xm,xh) + 
			get_i_leak(v));
}

function get_i_total(dv,dt,v,xn,xm,xh) {
	var cm = MEMBRANE_CAPACITANCE;
	return  (cm*dv/dt+
			get_i_k(v,xn) + 
			get_i_na(v,xm,xh) + 
			get_i_leak(v));
}

function get_i_na(v,xm,xh) {
	var vn = SODIUM_VOLTAGE;
	return get_c_na(xm,xh)*(v-vn);  
}

function get_c_na(xm,xh) {
	var gn = SODIUM_CONDUCTANCE;
	return gn*Math.pow(xm,3.0)*xh;
}

function get_i_k(v,xn) {
	var vk = POTASSIUM_VOLTAGE;
	return get_c_k(xn)*(v-vk);
}

function get_c_k(xn) {
	var gk = POTASSIUM_CONDUCTANCE;
	return gk*Math.pow(xn,4.0);
}

function get_i_leak(v) {
	var gl = LEAK_CONDUCTANCE;
	var vl = LEAK_VOLTAGE;
	return gl * (v - vl);
}

function get_hh_solution(stimulus_volts,
			init_volts, num_steps,
			dt, print_every_n_lines,
			holdV){
	//default vals
	init_volts = init_volts || 0.0;
	num_steps  = num_steps  || 1000;
	dt         = dt         || 0.01;
	print_every_n_lines = print_every_n_lines || 1;

	console.log([stimulus_volts,init_volts,num_steps,dt,print_every_n_lines].join(','));
	
	var an = get_alpha('n',init_volts);
	var bn = get_beta ('n',init_volts);
	var am = get_alpha('m',init_volts);
	var bm = get_beta ('m',init_volts);
	var ah = get_alpha('h',init_volts);
	var bh = get_beta ('h',init_volts);

	var xn = an/(an+bn);
	var xm = am/(am+bm);
	var xh = ah/(ah+bh);
	console.log([xn,xm,xh].join(','));
	
	var v  = stimulus_volts;
	var k  = print_every_n_lines;
	var result = {};
	var keys = ['in','ik','n','m','h','v','t','isum','cn','ck',];
	for(var i = 0; i < keys.length; ++i) {
		result[keys[i]] = [];
	}
	for(var i = 0; i < num_steps; ++i) {
		var v0 = v;
		an = get_alpha('n',v0);
		bn = get_beta ('n',v0);
		am = get_alpha('m',v0);
		bm = get_beta ('m',v0);
		ah = get_alpha('h',v0);
		bh = get_beta ('h',v0);

		xn += get_d_prop(an,bn,xn,dt);
		xm += get_d_prop(am,bm,xm,dt);
		xh += get_d_prop(ah,bh,xh,dt);

		dv = 0;
		if(!holdV) {
			dv = get_d_volts(v,xn,xm,xh,dt);
		}
		v  += dv;
		if(k - print_every_n_lines == 0){
			result['t'].push(dt*i);
			result['v'].push(v);
			result['in'].push(get_i_na(v,xm,xh));
			result['ik'].push(get_i_k(v,xn));
			result['isum'].push(
					get_i_total(dv,dt,v,xn,xm,xh));
			result['n'].push(xn);
			result['m'].push(xm);
			result['h'].push(xh);
			result['cn'].push(get_c_na(xm,xh));
			result['ck'].push(get_c_k(xn));
		}
		k  -= 1;
		if(k == 0){
			k = print_every_n_lines;
		}
	}
	return result;
}
