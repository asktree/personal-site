/** requires d3 v4 */

var color = d3.scaleOrdinal(d3.schemeCategory20);

var svg = d3.select("#graph").append("svg")
	.attr("width", "100%")
	.attr("height", "100%")
	.style("background-color", "#fff")
	;

function width() {
	return +(svg.style("width").slice(0,-2))
}
function height() {
	return +(svg.style("height").slice(0,-2))
}
	
var sim = d3.forceSimulation()
	.force("center", d3.forceCenter(width()/2, height()/2))
	.force("x", d3.forceX(function(d) { return width()/2; }).strength(.2))
	.force("y", d3.forceY(function(d) { return height()/2; }).strength(.2))
	.force("charge", d3.forceManyBody().strength(-100))
	.force("link", d3.forceLink().distance(10))
	.alphaTarget(0.89999)
	.alphaMin(0.9)
	.velocityDecay(0.3)
	//.alphaDecay(0)
	;
	
d3.select("#toolwrap")
	.on("mouseover", tipover)
	.on("mouseleave", tipout)
	;
	
/** svg layers, from bottom to top */
var selectlayer = svg.append('g'), 
	linelayer = svg.append('g'),
	pointlayer = svg.append('g'),
	labellayer = svg.append('g');

/** globals for graph objects */
var points = d3.selectAll(),
	lines = d3.selectAll(),
	selects = [];

/** globals for misc. purposes */
var lastclick = "none",
    highlighted = [],
	fixed = [],
    searchlighted = [],
    sublighted = [];
	
function load_graph(graph){
/**
  * This takes a graph object and draws a bunch of lines and circles for it
	and then plugs those into a physics sim.
	It also is responsible for cleaning away any highlights, searches, etc.
  * @param {object} graph - a list of node objects with the following attributes:
		c - a list of connections, by index to other nodes in graph
		r - a matching list of correlation coefficients
		n - name
		n2 - document name
*/
	sim.nodes(graph);
	
	var connections = [];
	graph.forEach(function(point) {
		// we'll use this further down
		point.cl = [];
		
		var i = 0;
		point.c.forEach(function(connection) {
			point.c[i] = sim.nodes()[connection]
			connections.push({source: point, target: sim.nodes()[connection], r: point.r[i]});
			i++;
		});
		
	});
	
	
	// put references to each link on its end nodes. is this smarter than just using filters? not sure.
	connections.forEach(function(connection) {
		connection.target.c.push(connection.source);
		connection.target.r.push(connection.r);
		connection.target.cl.push(connection);
		connection.source.cl.push(connection);
	});
	
	sim.force("link").links(connections);
	
	lines  = linelayer.selectAll("line")
		.data(connections)
		;
	lines.exit().remove();
	lines = lines.enter().append("line")
		.merge(lines)
		.attr("display", "none")
		.attr("stroke", "#000")
		.attr("stroke-width", 1)
		.attr("stroke-opacity", function(d) {return (d.r)*.4;})
		.on("mouseover", lineover)
		.on("mouseout", lineout)
		;
		
	points = pointlayer.selectAll("circle")
		.data(graph)
		;
	points.exit().remove();
	points = points.enter().append("circle")
		.merge(points)
		
		.attr("display", "none")
		.attr("r", function(d) {return Math.sqrt(d3.sum(d.r))*1.5;})
		.attr("fill", function(d) { return color(d.n2); })
		.attr("stroke", "#000")
		//.attr("stroke-width", 1.5)
		
		.classed("node",true)
		.attr("stroke-opacity", function (d) { return Math.max.apply(null, d.r);})
		// would be average but i dont feel like wrangling the JS for such a minor effect
		.on("dblclick", nodedblclick)
		.on("mouseover", nodeover)
		.on("mouseout", nodeout)
		.on("click", nodeclick)
		.call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended))
		;
	
	//cleanup 
	searchlighted = [];
	searchlight();
	highlight();
	sim.restart();
	presettle();
	load_legend();
}

function presettle(){
	var old = sim.force("link").iterations();
	sim.force("link").iterations(10);
	for (var i = 0; i < 30; ++i) sim.tick();
	sim.force("link").iterations(old);
	sim.alpha(1);
	sim.restart();
	sim.on("tick", preupdate);
}

function preupdate(){
	if (sim.alpha() <= 0.91){
		show_lines_pretty();
		show_nodes_pretty();
		sim.on("tick", update);
		sim.restart();
	}
}

function show_lines_pretty(){
	lines
		.attr("stroke-dasharray", "0,30")
		//.style("opacity",0)
		.attr("display", "true")
		.transition(d3.transition().duration(2000).on("end", function () {
			lines.attr("stroke-dasharray","none");}))
		//.attr("stroke-dasharray", "5,0")
		.attrTween("stroke-dasharray", linetween)
		;
		//.style("opacity",1)
}

function show_nodes_pretty(){
	points
		.attr("display", "true")
		.attr("r", 0)
		.transition(d3.transition().duration(2000))
		.attr("r", function(d) {return Math.sqrt(d3.sum(d.r))*1.5;})
		;
		
}

function update(){
/**
  * This is to be called after every tick of the physics sim. 
	There are other display updates and stuff that go on elsewhere,
	this just updates svg elements to follow their physics objects.
*/
	points
		.attr("cx", function (d) {return d.x; })
		.attr("cy", function (d) {return d.y; })
		;
		
	lines
		.attr("x1", function (d) {return d.source.x;})
		.attr("y1", function (d) {return d.source.y;})
		.attr("x2", function (d) {return d.target.x;})
		.attr("y2", function (d) {return d.target.y;})
		;
	
	// dont know about the speed implications of this
	selectlayer.selectAll("line")
			.attr("x1", function (d) {return d.source.x;})
			.attr("y1", function (d) {return d.source.y;})
			.attr("x2", function (d) {return d.target.x;})
			.attr("y2", function (d) {return d.target.y;})
			;
}

function recenter(){
	sim.force("x").initialize(sim.nodes());
	sim.force("y").initialize(sim.nodes());
	sim.force("center").x(width()/2); 
	sim.force("center").y(height()/2);
}

function tooltip(d, svgob) {
/**
  * Displays a box with the name of a node, to be called on mouseover
*/
	// reset map
	if(curr_key != '') {
		maps[curr_key].attr('display','none');
		d3.select("#maphelp").style("display", "none");
	}

	//show correlations of highlighted nodes
	var corr = "";
	if (highlighted.length > 0) {
		for (i = 0; i < d.c.length; ++i){
			if (highlighted.indexOf(d.c[i]) != -1) {
				corr += "<br><font color="+color(d.c[i].n2)+">r ="+d.r[i]+"</font>";
			}
		}
	}

	r = d3.select(svgob).attr("r");
	tip = d3.select("#toolwrap")
		.style("display", "block")
		.style("bottom", +(r)+height()-d.y+"px")
		;
		
	textTip = d3.select("#tooltext")
		.html(d.n+corr);

	if (highlighted.indexOf(d) != -1) {
		tip
			.style("left", d.x-165+"px")
			.attr("class", "highlighted")
			;
		insert_map(d.n, '#toolmap', d.n2)
		d3.select("#maphelp").style("display", "block");
	}
	else {
		tip
			.style("left", d.x-115+"px")
			.attr("class", "")
			;
	}

}

function tipenlarge(){
	if ($(this).text() == "Enlarge") {
		d3.select("#toolwrap").classed("embiggened", true);
		//$(this).text("Small");
	}
	/*
	else if ($(this).text() == "Small") {
		d3.select("#toolwrap").classed("embiggened", false);
		$(this).text("Enlarge");
	}*/
}

function search(query) {
/**
  * Finds nodes that meet the query and returns them.
  * Hits anything that contains each term. Kinda bad.
  * @param {string} query - a string of terms separated by space
*/
	terms = query.split(" ");
	var sl = [];
	
	for (n = 0; n < points.data().length; ++n) {
		// bool == false if one of the terms isnt found in node name
		bool = true;
		for (i = 0; i < terms.length; ++i){
			bool = bool && 
			points.data()[n].n.toLowerCase().includes(terms[i].toLowerCase());
		}
		if (bool) sl.push(points.data()[n]);
	}
	return (sl);
	// if nothing found, search serverside !TODO
}

function searchlight(sl) {
/**
  * Makes any node not in the given array radius 0.
  * Updates the global variable searchlighted with the query,
    but that does nothing.
  * @param {array} sl - array of node objects to leave on the screen.
					  - if undefined, runs cleanup routine instead.
*/
	// i generally use argument-less highlight functions to mean cleanup
	var filter;
	if (sl == undefined){
		filter = function(d) {return true;};
		searchlighted = [];
	}
	else {
		filter = function(d) {return searchlighted.indexOf(d) >= 0;};
		searchlighted = sl;
	}
	points
		.transition(d3.transition().duration(500))
		.attr("r", 1)
		//.style("fill", "#fff")
		.filter(filter)
		.attr("r", function(d) {return Math.sqrt(d3.sum(d.r))*1.5;})
		//.style("fill", function(d) { return color(d.n2); })
		;
}

function highlight(d, fixMe=true) {
/**
  * Maintains highlights for easy viewing (stored globally). Highlights are
	drawn to selectlayer and linelayer is faded if any exist.
  * All connections to highlighted nodes are highlighted.
  * Highlighted nodes are fixed and boldened.
  * @param {Object} d - a graph node to be pushed to highlighted array.
					  - if already in highlighted, is removed instead.
					  - if undefined, highlighted is cleared and cleanup happens.
  * @param {bool} fixMe (default true) - set whether you want to fix the node.
*/
	// if you call highlight on something highlighted, it delights it
	var h = highlighted.indexOf(d);
	if (h >= 0) {
		highlighted.splice(h,1);
		s = selects[h]
			.transition(d3.transition().duration(2000))
			.attrTween("stroke-dasharray", linetweenreverse)
			.remove()
			;
		selects.splice(h,1);
		if (fixMe) unfix(d);
		
		//remove sublighted too
		for (i = 0; i < d.c.length; ++i) {
			// !TODO
		}
	}
	
	// highlight() resets the highlightage
	else if (d == undefined) {
		for (i = 0; i < highlighted.length; ++i) {
			highlighted[i].fx = null;
			highlighted[i].fy = null;
		}
		fixed = [];
		highlighted = [];
		sublighted = [];
	}

	// highlighting something new
	else {
		highlighted.push(d);
		if (fixMe) fix(d);
		
		// no need to do this if we've already entered highlightmode
		if (highlighted.length == 1) {
			linelayer
				.transition(d3.transition().duration(2000).ease(d3.easeQuadOut))
				.attr("opacity", 0.5)
				;
		}
		
		var network = d.cl.slice();
		d.c.forEach(function (n) {
			sublighted.push(n);
			n.cl.forEach(function (nl) {
				if (d.c.indexOf(nl.target) >= 0 && 
					d.c.indexOf(nl.source) >= 0) {
						network.push(nl);
						sublighted.push(n)
					}
			});
		});
		
		var selectlines = selectlayer.append('g').selectAll("line")
			.data(network);
		
		//selectlines.exit().remove();
		selectlines = selectlines.enter().append("line")
			.merge(selectlines)
			.attr("stroke", color(d.n2))
			.attr("stroke-opacity", function(d) {return (d.r)*.8;})
			.attr("stroke-width", 2)
			;
		selectlines.attr("stroke-dasharray", "0,1000")
			.transition(d3.transition().duration(2000))
			.attrTween("stroke-dasharray", linetween)
			;
		
		selects.push(selectlines)
	}

	// clean up highlight mode if nothing's highlighted
	if (highlighted.length == 0) {
		for (i = 0; i < selects.length; ++i) {
			selects[i].remove();
		}
		selects = [];
		linelayer
			.transition(d3.transition().duration(2000))
			.attr("opacity", 1)
			;
	}

	// this should be called in any of the 3 cases so it's here
	points
		.classed("highlighted", false)
		.filter(function(d) {return highlighted.indexOf(d) >= 0;})
		.classed("highlighted", true)
		;
}

function fix(d) {
	d.fx = d.x;
	d.fy = d.y;
	fixed.push(d);
}

function unfix(d) {
	h = fixed.indexOf(d);
	if (h >= 0) {
		fixed.splice(h,1);
	}
	if (fixed.indexOf(d) == -1) {
		d.fx = null;
		d.fy = null;
	}
}

function dragstarted(d, i) {
	if (!d3.event.active) sim.alphaTarget(1).restart();
	fix(d)
}
function dragged(d, i) {
	d.fx = d3.event.x;
	d.fy = d3.event.y;
}
function dragended(d, i) {
	if (!d3.event.active) sim.alphaTarget(0.8999);
	unfix(d);
}

function nodeover(d, i) {
	tooltip(d, this);
	fix(d)
}

function nodeout(d, i) {
	if ($('#toolwrap.highlighted:hover').length == 0) d3.select("#toolwrap").style("display", "none");
	unfix(d);
}

function nodedblclick(d, i){
	highlight(d);
	tooltip(d, this);
}

function nodeclick(d, i){
	
}

function tipover(d, i){

}

function tipout(d, i){
	if ($('.node:hover').length == 0) d3.select("#toolwrap").style("display", "none");
}

function lineover(d, i){
/* 	d3.select(this)
		// id prefer that this was sensitive to context but javascript pain
		.style("stroke-width", 2);
		;
	//should maybe follow
	svg.append("text")
		.attr("id", "t"+i)
		.attr("x", function() {return (d.target.x+d.source.x)/2;})
		.attr("y", function() {return (d.target.y+d.source.y)/2;})
		.text(function() {return d.r})
		; */
}

function lineout(d, i){
/* 	d3.select(this)
		.style("stroke-width", 1);
	d3.select("#t"+i).remove();*/
}

function countyover(d, i){
	d3.select("#countytip")
		.style("display", "block")
		.html(d.properties.name + "<br>" + "<b>" + d.val + "</b>")
		.style("top", d3.mouse(d3.select("#tooltip").node())[1]-$("#countytip").outerHeight()-5+"px")
		.style("left", d3.mouse(d3.select("#tooltip").node())[0]-$("#countytip").outerWidth()/2+"px")
		;
}

function countyleave(d, i){
	d3.select("#countytip")
		.style("display", "none")
		;
}

function load_legend(){
	lc = d3.select("#legendcolors");
	lsvg = lc.append("svg")
		.attr("width", 400)
		.attr("height", color.domain().length*25+5)
		;
	for (i=0;i<color.domain().length;++i){
		lsvg.append("circle")
			.attr("fill", color(color.domain()[i]))
			.attr("stroke-width", 1.5)
			.attr("stroke", "#000")
			.attr("r", 6)
			.attr("cx", 10)
			.attr("cy", 22+25*i)
			;
		lsvg.append("text")
			.text(color.domain()[i])
			.attr("x", 25)
			.attr("y", 26+25*i)
			;
			
	}
		
}

//probably needs to be refactored but I don't know how sock's code works
var maps = {};
var curr_key = '';
function insert_map(dataName, elementID, sourceName) {

	if(!((dataName + elementID) in maps)) {
		var width=330;
		var height=225;

		var path = d3.geoPath().projection(d3.geoAlbersUsa().scale(450).translate([width/2,height/2]));
		maps[dataName + elementID] = d3.select(elementID).append("svg")
			.attr("viewBox", "0 0 " + width + " " + height)


		curr_key = dataName + elementID;

		d3.json("us-counties.json", function(error, counties) {
			if(error) throw error;
			d3.json("us-states.json", function(errort, states){
				if(errort) throw errort;

				var stateIDs = {};
				states.features.forEach(function(d){
					stateIDs[d.id] = d.properties.name;
				});

				counties.features.forEach(function(d){
					d.properties.name += ", " + stateIDs[d.id.slice(0,2)];
				});

				$.ajax({
					type: "POST",
					url: 'http://52.42.29.32:8888/',
					data: {send_full: dataName},
					dataType: "json"
				}).done(function(data){
					console.log(data)
					var max = Number.MIN_VALUE;
					var min = Number.MAX_VALUE;

					//these next for statements are because the data is sent with weird meaningless keys
					var k;
					var indexer;
					for(i in data) {
						k = i;
						break;
					}
					for(j in data[k]) {
						indexer = j;
						break;
					}
					//ok done

					for(var key in data) {
						var value = data[key][indexer];
						if(value > max) {
							max = value;
						}
						if(value < min) {
							min = value;
						}
					}
					
					counties.features.forEach(function(d){
						if (d.id in data) {
							d.val = data[d.id][indexer];
						}
						else d.val = null;
					});

					maps[dataName + elementID].append('g')
					.selectAll('path')
					.data(counties.features)
					.enter().append('path')
					.attr('d', path)
					.attr('fill', function(d,i){
						if(d.id in data) {
							return "rgba(0,0,0,"+(d.val-min)/(max-min)+")";	
						}
					})
					//.attr('fill', color(sourceName));
					.on("mouseover", countyover)
					.on("mouseout", countyleave)
					.classed("county", true)
					;
				}).fail(function(jqXHR,textStatus,errorth){
					throw errorth;
				});
			});
		});
	} else {
		if(curr_key != '') {
			maps[curr_key].attr('display','none');
		}
		maps[dataName + elementID].attr('display','block');
		curr_key = dataName + elementID;
	}
}