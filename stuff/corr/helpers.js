function dist(x1, x2, y1, y2){
	return Math.sqrt(Math.pow(x1-x2,2)+Math.pow(y1-y2,2))
}

function linetween(d) {
	var l = Math.sqrt(Math.pow(d.source.x-d.target.x,2)+Math.pow(d.source.y-d.target.y,2)),
		i = d3.interpolateString("0," + l, l+",0");
	return function(t) {return i(t);};
}

function linetweenreverse(d) {
	var l = Math.sqrt(Math.pow(d.source.x-d.target.x,2)+Math.pow(d.source.y-d.target.y,2)),
		i = d3.interpolateString(l+",0", "0," + l);
	return function(t) {return i(t);};
}