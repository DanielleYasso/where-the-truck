// load the map
google.maps.event.addDomListener(window, "load", initialize);

$(document).ready(function() {
	// on click, get user's geolocation
	$("#checkinButton").click(
		function(evt) {
			var attraction_id = $("#attraction_id").val();
			getGeolocation(attraction_id);
		}
	);
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
		function(result) {
			initialize();
		}

	);
}


//////// MAP MANIPULATION ////////

function getMarkers(map) {
	$.get(
		"/get_markers",
		function(result) {
			console.log("getMarkers:" + result);

			if (result == "noMarkers") {
				alert("No checkins to show");
			}
			else {
				addMarkers(map, result);
			}
			
		});
}

// Gets all current checkin markers and puts them on the map
function addMarkers(map, markers) {
	
	// initialize dictionary of checked markers, key = id, value = true or false
	var checkedAttractions = {};
	for (var i = 0; i < markers.length; i++) {
		markerObject = markers[i];
		checkedAttractions[markerObject["id"]] = true;
	}
	// create array to hold all markers
	var markersArray = [];

	// set the markers on the map each time the map is loaded
	// loop to add each marker to the map
	for (var i = 0; i < markers.length; i++) {
		markerObject = markers[i];
		var myLatLng = new google.maps.LatLng(markerObject["lat"], markerObject["lng"]);
		console.log(myLatLng);

		var iconType = markerObject["type"];
		if (iconType == "food_truck") {
			icon = "static/truck.png";
		}

		var marker = new google.maps.Marker({
			position: myLatLng,
			map: map,
			title: markerObject["name"],
			draggable: true,
			icon: icon
			// animation: google.maps.Animation.DROP
		});

		marker.set("id", markerObject["id"]);
		marker.set("name", markerObject["name"]);
		marker.set("time", markerObject["timestamp"]);
		marker.set("checkin_id", markerObject["checkin_id"]);

		// add the marker to the markers array
		markersArray.push(marker);


		///////////////////
		// MARKER EVENTS //
		///////////////////

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
		var infoWindow;
		google.maps.event.addListener(
			marker,
			"click",
			function(evt) {
				
				// close other open windows
				if (infoWindow) {
					infoWindow.close();
				}

				// get timestamp
				var time_info = this.get("time");
				time = time_info[0] + " " + time_info[1];

				// get checkin_id
				var checkin_id = this.get("checkin_id");

				// get attraction name
				var attraction_name = this.get("name");

				marker = this;

				// get upvotes and downvotes
				$.get(
					"/get_votes/"+checkin_id,
					function(votes) {
						var content = getContent(attraction_name, votes);
						createInfoWindow(marker, content);
						
				}); // end of $.get function

				function getContent(attraction_name, votes) {
					var upvotes = votes[0];
					var downvotes = votes[1];
					var loggedIn = votes[2];
					var voteType = votes[3];
					// create content for info window

					var upButton;
					var downButton;

					if (loggedIn) {
						if (voteType == "up") {
							upButton = "<form action='/upvote/" + checkin_id + "' method='POST'>" 
										+ "<button type='submit'>\u2B06</button>"
										+ "</form>" 
										+ "</td>"

										+ "<td style='font-weight: bold'>"
										+ upvotes
										+ "</td></tr>";

							downButton = "<form action='/downvote/" + checkin_id + "' method='POST'>"
										+ "<button type='submit' disabled>\u2B07</button>"
										+ "</form>"
										+ "</td>"

										+ "<td style='vertical-align: top'>"
										+ downvotes
										+ "</td></tr></table>";
						}
						else if (voteType == "down") {						
							upButton = "<form action='/upvote/" + checkin_id + "' method='POST'>" 
										+ "<button type='submit' disabled>\u2B06</button>"
										+ "</form>" 
										+ "</td>"

										+ "<td>"
										+ upvotes
										+ "</td></tr>";

							downButton = "<form action='/downvote/" + checkin_id + "' method='POST'>"
										+ "<button type='submit'>\u2B07</button>"
										+ "</form>"
										+ "</td>"

										+ "<td style='vertical-align: top; font-weight: bold'>"
										+ downvotes
										+ "</td></tr></table>";
						}
						// no existing vote
						else {
							upButton = "<form action='/upvote/" + checkin_id + "' method='POST'>" 
										+ "<button type='submit'>\u2B06</button>"
										+ "</form>" 
										+ "</td>"

										+ "<td>"
										+ upvotes
										+ "</td></tr>";

							downButton = "<form action='/downvote/" + checkin_id + "' method='POST'>"
										+ "<button type='submit'>\u2B07</button>"
										+ "</form>"
										+ "</td>"

										+ "<td style='vertical-align: top'>"
										+ downvotes
										+ "</td></tr></table>";
						}
					}
					// not logged in
					else {
						upButton = "<button onclick='loginToRate()'>" 
									+ "\u2B06"
									+ "</button>"
									+ "</td>"

									+ "<td>"
									+ upvotes
									+ "</td></tr>";

						downButton = "<button onclick='loginToRate()'>" 
									+ "\u2B07</button>"
									+ "</td>"

									+ "<td style='vertical-align: top'>"
									+ downvotes
									+ "</td></tr></table>";
					}

					var content = "<table style='text-align: left;'><tr>"

									+ "<th>"
									+ attraction_name 
									+ "</th>"

									+ "<td id='upArrow' padding-right: 5px;'>"
									+ upButton

									+ "<tr><td style='padding-bottom: 5px'>"
									+ "<span style='margin-right: 5px; padding-right: 5px;'>" 
									+ jQuery.timeago(time) 
									+ "</span>"
									+ "</td>"

									+ "<td id='downArrow' style='vertical-align: top;'>"
									+ downButton;

					return content;
				}

				function createInfoWindow(marker, content) {
					// open info window with created content
					infoWindow = new google.maps.InfoWindow({
						content: content
					});

					infoWindow.open(map, marker);
				}
						
					
			}); // end of click event

	} // end of for loop for markers

	// get checkbox changes
	$("input:checkbox").change(
		function() {
			var attractionId = this.id;
			if ($(this).is(":checked")) {
				// checked: update status to true
				checkedAttractions[attractionId] = true;
			} else {
				// unchecked: update status to false
				checkedAttractions[attractionId] = false;
			}

			// only show on map if checkbox is selected
			for (i = 0; i < markersArray.length; i++) {
				marker = markersArray[i];
				if (checkedAttractions[marker.get("id")] == false) {
					marker.setMap(null);
				}
				else {
					marker.setMap(map);
				}
			}
			
	}	);
		
	

}

function loginToRate() {
	alert("Signup or login to rate checkins.");
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





