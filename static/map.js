// load the map
google.maps.event.addDomListener(window, "load", initialize());

$(document).ready(function() {
	// on click, get user's geolocation
	$("#checkinButton").click(
		function(evt) {
			var attraction_id = $("#attraction_id").val();
			if (attraction_id != "") {
				getGeolocation(attraction_id);
			}
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

	  		// check if lat lng is in the water, and set it if it is
	  		isValidCheckin(attraction_id, lat, lng);

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

function isValidCheckin(attraction_id, lat,lng) {

	$.get(
		"/api/geonames",
		{
			"lat": lat,
			"lng": lng
		},
		function(result) {
			console.log(result);
			if (!result["ocean"]) {
				setCheckin(attraction_id, lat, lng);
			}
			else {
				alert("Is this truck a boat? Because you're putting it in the " + result.ocean.name);
				initialize();
			}
		}
		);


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


/////////////////////////////

//////// GET MARKERS ////////

/////////////////////////////


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


//////////////////////////////

//////// ADD MARKERS ////////

//////////////////////////////


// Gets all current checkin markers and puts them on the map
function addMarkers(map, markers) {
	
	// create array to hold all markers
	var markersArray = [];

	///////////////////////////////////////////////////////////
	//////// INITIALIZE CHECKED ATTRACTIONS DICTIONARY ////////

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

	///////////////////////////////////////
	//////// SET OR DELETE MARKERS ////////
	///////////////////////////////////////

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

	/////////////////////////////////////
	//////// SET DISPLAY OPTIONS ////////
	/////////////////////////////////////

	var showNonUserCheckins;
	var showBad;
	var showOld;

	function setOptionChecks() {
		for (i = 0; i < markersArray.length; i++) {
			marker = markersArray[i];
			var removeMarker = false;
			// Show checkins made by non-users?
			if ($("#showNonUserCheckins").is(":checked")) {
				showNonUserCheckins = true;
			}
			else {
				showNonUserCheckins = false;
			}
			// Don't show a maker if it doesn't have a user associated with it
			if (marker.get("non_user_checkin") && !showNonUserCheckins) {
				removeMarker = true; // don't add the non-user checkin to the markersArray
			}

			// Show checkins with established bad ratings on the map?
			if ($("#showBadRatings").is(":checked")) {
				showBad = true;
			}
			else {
				showBad = false;
			}
			// Don't show a marker with bad ratings if user doesn't want to see them
			if (marker.get("bad_rating") && !showBad) {
				removeMarker = true; // don't add the poorly rated checkin to the markersArray
			}

			// Show old checkins on the map?
			if ($("#showOldCheckins").is(":checked")) {
				showOld = true;
			}
			else {
				showOld = false;
			} 
			if (marker.get("timeout") == "old") {
				if (iconType == "food_truck") {
					icon = "static/truck6.png";
					if (!showOld) {
						removeMarker = true; // don't add the poorly rated checkin to the markersArray
					}
				}
			}

			// attraction is checked for display
			var showAttraction = false;
			attractionId = "#" + marker.get("id");
			if ($(attractionId).is(":checked")) {
				showAttraction = true;
			}	

			// remove markers
			if (removeMarker || !showAttraction) {
				checkedAttractions[marker.get("id")] = false;
			}
			else {
				checkedAttractions[marker.get("id")] = true;
			}
		}
	} // end of setOptionChecks function
	
	
	/////////////////////////////////////
	//////// CREATE MARKERS LOOP ////////

	// set the markers on the map each time the map is loaded
	// loop to add each marker to the map
	console.log("in create markers");
	for (var i = 0; i < markers.length; i++) {
		markerObject = markers[i];
		var myLatLng = new google.maps.LatLng(markerObject["lat"], markerObject["lng"]);
		console.log(myLatLng);

		var iconType = markerObject["type"];

		// Set marker icons based on how old they are
		var timeout = markerObject["timeout"];
		if (timeout == "old") {
			if (iconType == "food_truck") {
				icon = "static/truck6.png";
				if (!showOld) {
					removeMarker = true; // don't add the poorly rated checkin to the markersArray
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
		marker.set("timeout", markerObject["timeout"]);
		marker.set("non_user_checkin", markerObject["non_user_checkin"]);
		marker.set("bad_rating", markerObject["bad_rating"]);

		// set Yelp data, if available
		if (markerObject["ratings_img"]) {
			marker.set("ratings_img", markerObject["ratings_img"]);
			marker.set("ratings_count", markerObject["ratings_count"]);
			marker.set("url", markerObject["url"]);
		}

		
		// add the marker to the markers array 
		markersArray.push(marker);
		

		///////////////////////////////

		//////// MARKER EVENTS ////////

		///////////////////////////////

		////////////////////////////
		//////// NAME CLICK ////////
		////////////////////////////

		// Focus on an attraction when it's name is clicked in the checkbox area
		$(".attractionFocus").click( function(evt) {
			var name = $(this).attr("id");
			var matchFound = false;
			for (var i = 0; i < markersArray.length; i++) {
				marker = markersArray[i];
				if (marker.get("name") == name && checkedAttractions[marker.get("id")]) {
					marker.setAnimation(google.maps.Animation.BOUNCE);
					matchFound = true;	
					break;
				}
			}
			if (matchFound) {
				marker.setAnimation(null);
				map.setCenter(marker.getPosition());
			}	
		});

		////////////////////////////
		//////// DRAG EVENT ////////
		////////////////////////////

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

				// check if it's in water, and set it if it is
				isValidCheckin(attraction_id, lat, lng);
				
		});

		/////////////////////////////////
		//////// INFOWINDOW EVENT ///////
		/////////////////////////////////

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


				///////////////////////////////////////////
				//////// CREATE INFOWINDOW CONTENT ////////
				///////////////////////////////////////////

				function getContent(attraction_name, votes) {
					var upvotes = votes[0];
					var downvotes = votes[1];
					var loggedIn = votes[2];
					var yourCheckin = votes[3];
					var voteType = votes[4];
					
					// create content and set defaults for info window
					var upButton = "<button type='submit' class='btn btn-link btn-arrow'>";
					var downButton = "<button type='submit' class='btn btn-link btn-arrow'>";
					var upButtonDisabled = "<button class='btn btn-link btn-arrow' disabled>";
					var downButtonDisabled = "<button class='btn btn-link btn-arrow' disabled>";
					var upVoteNum = upvotes;
					var downVoteNum = downvotes;

					// set yelp api data defaults
					var attraction_name_url = attraction_name;
					var yelp_ratings = "";
					var powered_by_yelp = "";

					if (loggedIn && !yourCheckin) {
						// upvote --> down button disabled
						if (voteType == "up") {
							upVoteNum =	"<strong>" + upvotes + "</strong";
							downButton = downButtonDisabled;
						}
						// downvote --> up button disabled
						else if (voteType == "down") {						
							upButton = upButtonDisabled;
							downVoteNum = "<strong>" + downvotes + "</strong>";
						}
					}
					// your checkin --> buttons disabled
					else if (yourCheckin) {
						upButton = upButtonDisabled;
						downButton = downButtonDisabled;
					}
					// not logged in --> buttons show login to rate alert
					else {
						upButton = "<button type='button' onclick='loginToRate()' class='btn btn-link btn-arrow'>";
						downButton = "<button type='button' onclick='loginToRate()' class='btn btn-link btn-arrow'>";
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
										+ "<img style='vertical-align: bottom;' src='https://s3-media1.fl.yelpcdn.com/assets/2/www/img/14f29ad24935/map/miniMapLogo.png'>"
										+ "</a>";
					}

						var content = "<table style='text-align: left; width: 100%'><tr>"

									+ "<th>" + attraction_name_url + "</th>"

									+ "<td id='upArrow' padding-right: 5px;'>"
									+ "<form action='/upvote/" + checkin_id + "' method='POST' class='form-arrow'>"
									+ upButton
									+ "<span class='glyphicon glyphicon-arrow-up' aria-hidden='true'></span>"
									+ "</button></form>" 
									+ "</td>"

									+ "<td>" + upVoteNum + "</td></tr>"

									+ "<tr><td style='padding-bottom: 5px'>"
									+ "<span style='margin-right: 5px; padding-right: 5px;'>" 
									+ jQuery.timeago(time) 
									+ "</span>"
									+ "</td>"

									+ "<td id='downArrow' style='vertical-align: top;'>"
									+ "<form action='/downvote/" + checkin_id + "' method='POST' class='form-arrow'>"
									+ downButton
									+ "<span class='glyphicon glyphicon-arrow-down' aria-hidden='true'></span>"
									+ "</button></form>"
									+ "</td>"

									+ "<td style='vertical-align: top'>" + downVoteNum + "</td></tr>"

									+ "<tr><td colspan='3'><span style='margin-right: 1px'>"
									+ yelp_ratings_img
									+ yelp_ratings_count
									+ powered_by_yelp 
									+ "</span>"
									+ "</td></tr>"

									+ "<tr><td colspan='3'>"
									+ "<span style='margin-right: 1px'>"
									+ "Get directions: <select id='transportMode' onchange='getDirections(" + latLngList + ")'>"
									+ "<option value=''>--</option>"
									+ "<option value='DRIVING'>Drive</option>"
									+ "<option value='WALKING'>Walk</option>"
									+ "<option value='BICYCLING'>Bicycle</option>"
									+ "<option value='TRANSIT'>Transit</option>"
									+ "</select>"
									+ "</span></td></tr>"

									+ "</table>";

					return content;
				}

				///////////////////////////////////
				//////// CREATE INFOWINDOW ////////
				///////////////////////////////////

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
	setOptionChecks();
	setOrDeleteMarkers();


	//////////////////////////////////////
	//////// GET CHECKBOX CHANGES ////////
	//////////////////////////////////////
	
	// get checkbox changes
	$("input:checkbox").change(
		function() {
			if (this.id == "showOldCheckins") {
				if ($(this).is(":checked")) {
					showOld = true;
				}
				else {
					showOld = false;
				}
			}
			else if (this.id == "showBadRatings") {
				if ($(this).is(":checked")) {
					showBad = true;
				}
				else {
					showBad = false;
				}
			}
			else if (this.id == "showNonUserCheckins") {
				if ($(this).is(":checked")) {
					showNonUserCheckins = true;
				}
				else {
					showNonUserCheckins = false;
				}
			}
			else if (this.id == "rememberMeLogin") {
				// do nothing
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
				setOrDeleteMarkers();
				return;
				
			}
			setOptionChecks();
			setOrDeleteMarkers();

	});
}


function loginToRate() {
	alert("Signup or login to rate this checkin.");
}


////////////////////////////////

//////// GET DIRECTIONS ////////

////////////////////////////////

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

			// var pinImage = new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_map_pin_letter_withshadow&chld=A|00FF00");

			startMarker = new google.maps.Marker({
				position: fromLatLng,
				map: map,
				title: "You are here",
				animation: google.maps.Animation.DROP
				// icon: pinImage
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


////////////////////////////

//////// INITIALIZE ////////

////////////////////////////

// Creates the map to show on the page
function initialize() {

	directionsDisplay = new google.maps.DirectionsRenderer();

	// detect browser type
 	var useragent = navigator.userAgent;
	var mapdiv = document.getElementById("map-canvas");

	// set map size for mobile vs desktop
	if (useragent.indexOf('iPhone') != -1 || useragent.indexOf('Android') != -1 ) {
		mapdiv.style.width = '100%';
		mapdiv.style.height = '85%';
	} else {
		mapdiv.style.width = '100%';
		mapdiv.style.height = '400px';
	}

	// create the map object
	var startLatLng = new google.maps.LatLng(37.7796292,-122.4324726);
	var mapOptions = {
		// start on San Francisco
		center: startLatLng,
		zoom: 13
	};
	// create the map object
	map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);

	directionsDisplay.setOptions({suppressMarkers: true});
	directionsDisplay.setMap(map);
	directionsDisplay.setPanel(document.getElementById("directionsDiv"));

	getMarkers(map);


	//////////////////////////////////
	//////// CLOSE DIRECTIONS ////////
	//////////////////////////////////

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

}





