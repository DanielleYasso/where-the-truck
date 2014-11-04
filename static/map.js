// load the map
google.maps.event.addDomListener(window, "load", initialize);

$(document).ready(function() {

	// on click, get user's geolocation
	$("#checkinButton").click(
		function(evt) {
			getGeolocation();
		});

});

//////// HANDLE CHECKINS ////////

function getGeolocation() {
	var browserSupportFlag = new Boolean();

	// Try W3C Geolocation (Preferred)
	if(navigator.geolocation) {
		browserSupportFlag = true;
		navigator.geolocation.getCurrentPosition(function(position) {
	  		var lat = position.coords.latitude;
	  		var lng = position.coords.longitude;

	  		// set the checkin location for the selected attraction
	  		setCheckin(lat, lng);

		}, function() {
	  		// error: no position returned
	  		handleNoGeolocation(browserSupportFlag);
		});
	}
	// Browser doesn't support Geolocation
	else {
		browserSupportFlag = false;
		handleNoGeolocation(browserSupportFlag);
	}

	function handleNoGeolocation(errorFlag) {
		if (errorFlag) {
			alert("Error: Geolocation service failed.");
		} else {
			alert("Error: Your browser doesn't support geolocation.");
		}
	}
}

function setCheckin(lat, lng) {

	var attraction_id = $("#attraction_id").val();

	$.post(
		"/checkin",
		{
			"attraction_id": attraction_id,
			"latitude": lat,
			"longitude": lng
		}, 
		// reload the map
		initialize()

	);
}



//////// MAP MANIPULATION ////////

function getMarkers(map) {
	$.get(
		"/get_markers",
		function(result) {
			console.log("getMarkers:" + result);
			
			addMarkers(map, result)
		});
}

// Gets all current checkin markers and puts them on the map
function addMarkers(map, markers) {
	// loop to add each marker to the map
	for (var i = 0; i < markers.length; i++) {
		markerObject = markers[i];
		var myLatLng = new google.maps.LatLng(markerObject["lat"], markerObject["lng"]);
		console.log(myLatLng);

		var marker = new google.maps.Marker({
			position: myLatLng,
			map: map,
			title: markerObject["name"]
		});
		marker.setMap(map);
	}

	// // add a marker to the map
	// var myLatLng = new google.maps.LatLng(37.7833, -122.4167);
	// var marker = new google.maps.Marker({
	// 	position: myLatLng,
	// 	map: map,
	// 	title:"Hello world!"
	// });

	// marker.setMap(map);

	// // add another marker to the map
	// myLatLng = new google.maps.LatLng(37.7777, -122.4167);
	// marker = new google.maps.Marker({
	// 	position: myLatLng,
	// 	map: map,
	// 	title:"Second marker!"
	// });

	// marker.setMap(map);
}

// Creates the map to show on the page
function initialize() {
	var mapOptions = {
		// start on San Francisco
		center: { lat: 37.7833, lng: -122.4167 },
		zoom: 14
	};

	// detect browser type
 	var useragent = navigator.userAgent;
	var mapdiv = document.getElementById("map-canvas");

	// set map size for mobile vs desktop
	if (useragent.indexOf('iPhone') != -1 || useragent.indexOf('Android') != -1 ) {
		mapdiv.style.width = '100%';
		mapdiv.style.height = '100%';
	} else {
		mapdiv.style.width = '600px';
		mapdiv.style.height = '800px';
	}

	// create the map object
	var map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);

	getMarkers(map);
}





