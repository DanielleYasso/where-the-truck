function getMarker() {
	var Lat, Lng, name, timestamp; // get from database
	details = [Lat, Lng, name];
	return details
}

// Creates markers and puts them on the map
function addMarkers(map) {
	// add a marker to the map
	var myLatLng = new google.maps.LatLng(37.7833, -122.4167);
	var marker = new google.maps.Marker({
		position: myLatLng,
		map: map,
		title:"Hello world!"
	});

	marker.setMap(map);

	// add another marker to the map
	myLatLng = new google.maps.LatLng(37.7777, -122.4167);
	marker = new google.maps.Marker({
		position: myLatLng,
		map: map,
		title:"Second marker!"
	});

	marker.setMap(map);

	// Loop to add each marker to the map
	// var markerDetails = getMarker();
	// var Lat = markerDetails[0];
	// var Lng = markerDetails[1];
	// var name = markerDetails[2]
	// 
	// var myLatLng = new google.maps.LatLng(Lat, Lng);
	// var marker = new google.maps.Marker({
	// 	position: myLatLng,
	// 	map: map,
	// 	title: name
	// });
	// 
	// marker.setMap(map);
}

// Creates the map to show on the page
function initialize() {
	var mapOptions = {
		// start on San Francisco
		center: { lat: 37.7833, lng: -122.4167 },
		zoom: 14
	};
	
	// create the map object
	var map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);

	addMarkers(map);	
}

// load the map
google.maps.event.addDomListener(window, "load", initialize);


