// load the map
google.maps.event.addDomListener(window, "load", initialize);

$(document).ready(function() {
	// on click, get user's geolocation
	$("#checkinButton").click(
		function(evt) {
			var attraction_id = $("#attraction_id").val();
			getGeolocation(attraction_id);
		});
});

//////// HANDLE CHECKINS ////////

function getGeolocation(attraction_id) {
	var browserSupportFlag = new Boolean();

	// Try W3C Geolocation (Preferred)
	if(navigator.geolocation) {
		browserSupportFlag = true;
		navigator.geolocation.getCurrentPosition(function(position) {
	  		var lat = position.coords.latitude;
	  		var lng = position.coords.longitude;

	  		// set the checkin location for the selected attraction
	  		setCheckin(attraction_id, lat, lng);

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

function setCheckin(attraction_id, lat, lng) {

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
			title: markerObject["name"],
			draggable: true,
			// animation: google.maps.Animation.DROP
		});

		marker.set("id", markerObject["id"]);
		marker.set("time", markerObject["timestamp"]);

		marker.setMap(map);

		// Drag event
		google.maps.event.addListener(
			marker,
			"dragend",
			function(evt) {
				console.log(this.title);

				// get new lat and lng
				var lat = evt.latLng.lat();
				var lng = evt.latLng.lng();

				var attraction_id = this.get("id");

				// update the database with a new checkin
				setCheckin(attraction_id, lat, lng);
		});

		// Info Window
		google.maps.event.addListener(
			marker,
			"click",
			function(evt) {
				var time_info = this.get("time");
				time = time_info[0] + " " + time_info[1];
				var content = "<div><p style='margin: 0 5px 5px 0'><strong>" + this.title + "</strong><br>" + jQuery.timeago(time) + "</p></div>";
				var infoWindow = new google.maps.InfoWindow({
					content: content
				});
				infoWindow.open(map, this);
			});
	}

}

// Creates the map to show on the page
function initialize() {
	var mapOptions = {
		// start on San Francisco
		center: { lat: 37.7833, lng: -122.4167 },
		zoom: 13
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





