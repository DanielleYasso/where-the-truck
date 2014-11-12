// load the map
google.maps.event.addDomListener(window, "load", initialize());

$(document).ready(function() {
	// on click, get user's geolocation
	$("#checkinButton").click(
		function(evt) {
			var attraction_id = $("#attraction_id").val();
			getGeolocation(attraction_id);
		}
	);
});


/////////////////////////////////

//////// HANDLE CHECKINS ////////

/////////////////////////////////


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


//////////////////////////////////

//////// MAP MANIPULATION ////////

/////////////////////////////////


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
		attractionId = "#" + markerObject["id"];
		if ($(attractionId).is(":checked")) {
			checkedAttractions[markerObject["id"]] = true;
		}
		else {
			checkedAttractions[markerObject["id"]] = false;
		}	
	}

	// create array to hold all markers
	var markersArray = [];

	// only show on map if checkbox is selected
	function setOrDeleteMarkers() {
		console.log(checkedAttractions);
		for (i = 0; i < markersArray.length; i++) {
			marker = markersArray[i];
			
			if (checkedAttractions[marker.get("id")] == false) {
				marker.setMap(null);
			}
			else {
				marker.setMap(map);
			}
		}
	}

	// set the markers on the map each time the map is loaded
	// loop to add each marker to the map
	for (var i = 0; i < markers.length; i++) {
		markerObject = markers[i];
		var myLatLng = new google.maps.LatLng(markerObject["lat"], markerObject["lng"]);
		console.log(myLatLng);

		var iconType = markerObject["type"];

		// Show checkins made by non-users?
		var showNonUserCheckins;
		if ($("#showNonUserCheckins").is(":checked")) {
			showNonUserCheckins = true;
		}
		else {
			showNonUserCheckins = false;
		}
		// Don't show a maker if it doesn't have a user associated with it
		var nonUserCheckin = markerObject["non_user_checkin"];
		if (nonUserCheckin && !showNonUserCheckins) {
			continue; // don't add the non-user checkin to the markersArray
		}

		// Show checkins with established bad ratings on the map?
		var showBad;
		if ($("#showBadRatings").is(":checked")) {
			showBad = true;
		}
		else {
			showBad = false;
		}
		// Don't show a marker with bad ratings if user doesn't want to see them
		var badRating = markerObject["bad_rating"];
		if (badRating && !showBad) {
			continue; // don't add the poorly rated checkin to the markersArray
		}

		// Show old checkins on the map?
		var showOld;
		if ($("#showOldCheckins").is(":checked")) {
			showOld = true;
		}
		else {
			showOld = false;
		} 

		// Set marker icons based on how old they are
		var timeout = markerObject["timeout"];
		if (timeout == "old") {
			if (iconType == "food_truck") {
				icon = "static/truck6.png";
				if (!showOld) {
					continue; // don't add the old marker to the markersArray
				}
			}
		}
		else if (timeout == "six_hours") {
			if (iconType == "food_truck") {
				icon = "static/truck6.png";
			}
		}
		else if (timeout == "three_hours") {
			if (iconType == "food_truck") {
				icon = "static/truck3.png";
			}
		}
		else if (timeout == "one_hour") {
			if (iconType == "food_truck") {
				icon = "static/truck1.png";
				
				// below if statement here for testing purposes only
				if (!showOld) {
					continue; // don't add the old marker to the markersArray
				}
			}
		}
		else {
			if (iconType == "food_truck") {
				icon = "static/truck.png";
			}
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
		marker.set("lat", markerObject["lat"]);
		marker.set("lng", markerObject["lng"]);

		// set Yelp data, if available
		if (markerObject["ratings_img"]) {
			marker.set("ratings_img", markerObject["ratings_img"]);
			marker.set("ratings_count", markerObject["ratings_count"]);
			marker.set("url", markerObject["url"]);
		}

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

				// get yelp details
				var ratings_img = this.get("ratings_img");
				var ratings_count = this.get("ratings_count");
				var yelp_url = this.get("url");

				var latLngList = [this.get("lat"),this.get("lng")];

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
					var yourCheckin = votes[3];
					var voteType = votes[4];
					// create content for info window

					var upButton;
					var downButton;
					var attraction_name_url = attraction_name;
					var yelp_ratings = "";
					var powered_by_yelp = "";

					if (loggedIn && !yourCheckin) {
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
					// not your checkin
					else if (yourCheckin) {
						upButton = "<button disabled>" 
									+ "\u2B06"
									+ "</button>"
									+ "</td>"

									+ "<td>"
									+ upvotes
									+ "</td></tr>";

						downButton = "<button disabled>" 
									+ "\u2B07</button>"
									+ "</td>"

									+ "<td style='vertical-align: top'>"
									+ downvotes
									+ "</td></tr></table>";
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
									+ "</td></tr>";
					}

					if (yelp_url) {
						attraction_name_url = "<a href='" + yelp_url + "' target='_blank'>"
											+ attraction_name
											+ "</a>";

						yelp_ratings_img = "<a href='" + yelp_url + "' target='_blank'>"
										+ "<img src='" + ratings_img + "'>"
										+ "</a>";

						yelp_ratings_count = "<em style='font-size: 8pt;'>" + ratings_count + " reviews on </em>";

						powered_by_yelp = "<a href='" + yelp_url + "' target='_blank'>"
										+ "<img style='vertical-align: bottom;' src='http://s3-media1.fl.yelpcdn.com/assets/2/www/img/14f29ad24935/map/miniMapLogo.png'>"
										+ "</a>";
					}

						var content = "<table style='text-align: left;'><tr>"

									+ "<th>"
									+ attraction_name_url 
									+ "</th>"

									

									+ "<td id='upArrow' padding-right: 5px;'>"
									+ upButton

									+ "<tr><td style='padding-bottom: 5px'>"
									+ "<span style='margin-right: 5px; padding-right: 5px;'>" 
									+ jQuery.timeago(time) 
									+ "</span>"
									+ "</td>"

									+ "<td id='downArrow' style='vertical-align: top;'>"
									+ downButton

									+ "<tr><td colspan='3'><span style='margin-right: 1px'>"
									+ yelp_ratings_img
									
									+ yelp_ratings_count
									
									+ powered_by_yelp 
									+ "</span>"
									+ "</td></tr>"

									+ "<tr><td colspan='3'>"
									+ "Get directions:<select id='transportMode' onchange='getDirections(" + latLngList + ")'>"
									+ "<option value=''>--</option>"
									+ "<option value='DRIVING'>Drive</option>"
									+ "<option value='WALKING'>Walk</option>"
									+ "<option value='BICYCLING'>Bicycling</option>"
									+ "<option value='TRANSIT'>Transit</option>"
									+ "</select>"


									+ "</table>";

									
					

					return content;
				}

				function createInfoWindow(marker, content) {
					// open info window with created content
					infoWindow = new google.maps.InfoWindow({
						content: content
					});

					infoWindow.open(map, marker);
				}
						
					
			}); // end of info window click event


	} // end of for loop for markers

	// put all user-desired markers on the map
	setOrDeleteMarkers();
	

	// get checkbox changes
	$("input:checkbox").change(
		function() {
			if (this.id == "showOldCheckins") {
				if ($(this).is(":checked")) {
					showOld = true;
					initialize();
				}
				else {
					showOld = false;
					initialize();
				}
			}
			else if (this.id == "showBadRatings") {
				if ($(this).is(":checked")) {
					showBad = true;
					initialize();
				}
				else {
					showBad = false;
					initialize();
				}
			}
			else if (this.id == "showNonUserCheckins") {
				if ($(this).is(":checked")) {
					showNonUserCheckins = true;
					initialize();
				}
				else {
					showNonUserCheckins = false;
					initialize();
				}
			}
			else {
				var attractionId = this.id;
				if ($(this).is(":checked")) {
					// checked: update status to true
					checkedAttractions[attractionId] = true;
				} else {
					// unchecked: update status to false
					checkedAttractions[attractionId] = false;
				}
			}

			setOrDeleteMarkers();	
	});
}


function loginToRate() {
	alert("Signup or login to rate this checkin.");
}

var directionsDisplay;
var directionsService = new google.maps.DirectionsService();
var map;
var startMarkerArray = [];

function getDirections(toLat,toLng) {

	if (startMarkerArray.length >= 1) {
		startMarkerArray[0].setMap(null);
		startMarkerArray = [];
	}

	var selectedMode = document.getElementById("transportMode").value; 
	if (!selectedMode) {
		return;
	}
	var toLatLng = new google.maps.LatLng(toLat, toLng);

	var browserSupportFlag = new Boolean();

	// Try W3C Geolocation (Preferred)
	if(navigator.geolocation) {
		browserSupportFlag = true;
		navigator.geolocation.getCurrentPosition(function(position) {
	  		var lat = position.coords.latitude;
	  		var lng = position.coords.longitude;

	  		var fromLatLng = new google.maps.LatLng(lat, lng);

			

			var request = {
				origin: fromLatLng,
				destination: toLatLng,
				travelMode: google.maps.TravelMode[selectedMode]
				
			};

			directionsService.route(request, function(response, status) {
				if (status == google.maps.DirectionsStatus.OK) {
					directionsDisplay.setDirections(response);
					
				}
			});

			startMarker = new google.maps.Marker({
				position: fromLatLng,
				map: map,
				title: "You are here",
				animation: google.maps.Animation.DROP
			});

			startMarkerArray.push(startMarker);
			startMarker.setMap(map);

			if ($("#directionsWrapper").hasClass("hidden")) {
				$("#directionsWrapper").removeClass("hidden");
			}
			
		}, function() {
	  		// error: no position returned
	  		handleNoGeolocation(browserSupportFlag);
		});
	}
	// Browser doesn't support Geolocation
	else {
		browserSupportFlag = false;
		handleNoGeolocation(browserSupportFlag);
		return null;
	}

	function handleNoGeolocation(errorFlag) {
		if (errorFlag) {
			alert("Error: Geolocation service failed.");
		} else {
			alert("Error: Your browser doesn't support geolocation.");
		}
	}
}





// Creates the map to show on the page
function initialize() {
	// latList = typeof latList !== 'undefined' ? latList : false;

	// if (!latList) {
		var fromLatLng = new google.maps.LatLng(37.7833,-122.4167);
	// }
	// else {
	// 	var fromLatLng = new google.maps.LatLng(latList[0], latList[1]);
	// }
	directionsDisplay = new google.maps.DirectionsRenderer();


	var mapOptions = {
		// start on San Francisco
		center: fromLatLng,
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
	map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);

	directionsDisplay.setOptions({suppressMarkers: true});
	directionsDisplay.setMap(map);
	directionsDisplay.setPanel(document.getElementById("directionsDiv"));

	$("#closeDirections").click( function(evt) {
		directionsDisplay.setMap(null);

		if (!$("#directionsWrapper").hasClass("hidden")) {
			$("#directionsWrapper").addClass("hidden");
		}

		if (startMarkerArray.length >= 1) {
			startMarkerArray[0].setMap(null);
			startMarkerArray = [];
		}
	});

	getMarkers(map);

}





