//////////////////////////////////

//////// GLOBAL VARIABLES ////////

//////////////////////////////////

// for accessing markers and marker settings
var markersArray = [];
var checkedAttractions;
var showOld;

// Info Window
var infoWindow;

// for google map
var map;

// for directions
var directionsDisplay;
var directionsService;
var startMarkerArray = [];


/////////////////////////////////////////

//////// DOCUMENT READY FUNCITON ////////

/////////////////////////////////////////

$(document).ready(function() {

	// load the map
	google.maps.event.addDomListener(window, "load", initialize());

	// create directions service
	directionsService = new google.maps.DirectionsService();

	//////////////////////////////////
	//////// DROPDOWN CHECKIN ////////
	//////////////////////////////////

	// on click, get user's geolocation
	$("#checkinButton").click(
		function(evt) {
			var attraction_id = $("#attraction_id").val();
			if (attraction_id != "") {
				getGeolocation(attraction_id);
			}
		}
	);

	//////////////////////////////////////
	//////// GET CHECKBOX CHANGES ////////
	//////////////////////////////////////
	
	// get checkbox changes
	$("input:checkbox").change(
		function() {
			if (this.id == "showOldCheckins" 
				|| this.id == "showBadRatings"
				|| this.id == "showNonUserCheckins" 
				|| this.id == "showUntrusted") {
				
				setOptionChecks();
				setOrDeleteMarkers();
			}
			else if (this.id == "rememberMeLogin" || this.id == "rememberMeSignup") {
				// do nothing
			}
			else {
				var attractionId = this.id;
				for (i = 0; i < markersArray.length; i++) {
					marker = markersArray[i];
					if (marker.get("id") == attractionId) {

						var aLink = "#span_" + attractionId + " a";

						checkedAttractions[attractionId] = $(this).is(":checked");
						if (checkedAttractions[attractionId]) {
							if ((marker["timeout"] == "old" && !showOld)
								|| (marker["non_user_checkin"] && !showNonUserCheckins)
								|| (marker["bad_rating"] && !showBad)
								|| (!marker["trusted_user"] && !showUntrusted)) {

								// don't set it
							}
							else {
								marker.setMap(map);

								// enable link to focus on marker
								$(aLink).removeClass("disabled");
							}
						} 
						else {
							marker.setMap(null);
							
							// disable link to focus on marker
							$(aLink).addClass("disabled");
						}
					}
				}
			}
	});

	////////////////////////////////////////
	//////// CLOSE DIRECTIONS EVENT ////////
	////////////////////////////////////////

	$("#closeDirections").click( function(evt) {
		directionsDisplay.setMap(null);

		// hide directions div on close
		if (!$("#directionsWrapper").hasClass("hidden")) {
			$("#directionsWrapper").addClass("hidden");
		}

		// reset startMarkerArray (should hold no markers when no directions present)
		if (startMarkerArray.length >= 1) {
			startMarkerArray[0].setMap(null);
			startMarkerArray = [];
		}
	});

}); // end document load



/////////////////////////////////

//////// HANDLE CHECKINS ////////

/////////////////////////////////


/////////////////////////////////
//////// GET GEOLOCATION ////////
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

	//////////////////////////////////////
	//////// HANDLE NO GELOCATION ////////
	//////////////////////////////////////

	function handleNoGeolocation(errorFlag) {
		if (errorFlag) {
			alert("Error: Geolocation service failed.");
		} else {
			alert("Error: Your browser doesn't support geolocation.");
		}
	}
}

///////////////////////////////////////////
//////// VALIDATE CHECKIN LOCATION ////////
///////////////////////////////////////////

function isValidCheckin(attraction_id, lat,lng) {

	// check if they are putting it outside of the Bay Area
	console.log("lat + lng " + lat + " " + lng);
	// top limit = 37.831996427393186
	// right limit = -122.36208379274905
	// bottom limit = 37.6870546150663 (Daly City on map)
	// left limit = -122.52653539187014
	if (lat > 37.831996427393186 || lat < 37.6870546150663) {
		// out of lat range
		alert("Hey - that's not in SF!");
		putMarkerBack();
		// don't check geonames for ocean
		return;
	}
	if (lng > -122.36208379274905 || lng < -122.52653539187014) {
		// out of lng range
		alert("Hey - that's not in SF!");
		putMarkerBack();
		// don't check geonames for ocean
		return;
	}

	// check if they are putting it in the water around SF
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
				alert("Is this truck a boat?\nBecause you're putting it in the " + result.ocean.name);
				putMarkerBack();
			}
		}
	);

	//////////////////////////////////////////////
	//////// PUT MARKER BACK WHERE IT WAS ////////
	//////////////////////////////////////////////

	function putMarkerBack() {
		// put the attraction back where it was
		for (i = 0; i < markersArray.length; i++) {
			marker = markersArray[i];
			if (marker.get("id") == attraction_id) {
				latLng = new google.maps.LatLng(marker.get("lat"), marker.get("lng"));
				console.log(latLng);
				marker.setPosition(latLng);
			}
		}
	}
}

/////////////////////////////////////////
//////// SET CHECKIN IN DATABASE ////////
/////////////////////////////////////////

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
			// initialize();
			// marker already in markersArray?
			for (i = 0; i < markersArray.length; i++) {
				marker = markersArray[i];
				if (marker.get("id") == attraction_id) {
					// marker exists in array, just update position on map
					latLng = new google.maps.LatLng(lat, lng);
					console.log(latLng);
					var icon = getIconTypeForTimeout("new", marker.get("type"));

					marker.setPosition(latLng);
					marker.setIcon(icon);

					setMarkerData(marker, result);

					return;

				}
			}
			initialize();
		}

	);
}

//////////////////////////////////////////////////

//////// GET MARKERS AND SET RELATED DATA ////////

//////////////////////////////////////////////////


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


/////////////////////////////////
//////// SET MARKER DATA ////////
/////////////////////////////////

function setMarkerData(marker, markerObject) {
	marker.set("id", markerObject["id"]);
	marker.set("name", markerObject["name"]);
	marker.set("type", markerObject["type"]);

	marker.set("checkin_id", markerObject["current"]["checkin_id"]);
	marker.set("lat", markerObject["current"]["lat"]);
	marker.set("lng", markerObject["current"]["lng"]);
	marker.set("timeout", markerObject["current"]["timeout"]);
	marker.set("time", markerObject["current"]["timestamp"]);

	marker.set("non_user_checkin", markerObject["current"]["non_user_checkin"]);
	marker.set("bad_rating", markerObject["current"]["bad_rating"]);
	marker.set("trusted_user", markerObject["current"]["trusted_user"]);

	marker.set("using_update", "current");
	marker.set("current", markerObject["current"]);
	marker.set("previous", markerObject["previous"]);

	// set Yelp data, if available
	if (markerObject["ratings_img"]) {
		marker.set("ratings_img", markerObject["ratings_img"]);
		marker.set("ratings_count", markerObject["ratings_count"]);
		marker.set("url", markerObject["url"]);
	}

}

///////////////////////////////////////////
//////// GET ICON TYPE FOR TIMEOUT ////////
///////////////////////////////////////////

function getIconTypeForTimeout(timeout, iconType) {
	if (timeout == "old") {
		if (iconType == "food_truck") {
			icon = "static/truck6.png";
		}
	}
	// else if (timeout == "six_hours") {
	// 	if (iconType == "food_truck") {
	// 		icon = "static/truck6.png";
	// 	}
	// }
	else if (timeout == "three_hours") {
		if (iconType == "food_truck") {
			icon = "static/truck6.png";
		}
	}
	else if (timeout == "two_hours") {
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
	return icon;
}


/////////////////////////////////

//////// (RE)SET MARKERS ////////

/////////////////////////////////

/////////////////////////////////////
//////// SET DISPLAY OPTIONS ////////
/////////////////////////////////////
var showNonUserCheckins;
var showBad;
var showAttraction;

function setOptionChecks() {

	for (i = 0; i < markersArray.length; i++) {
		marker = markersArray[i];

		var removeMarker = false;
		// var hideOld = false;
		var using_update = marker.get("using_update");

		// Show checkins made by non-users?
		showNonUserCheckins = $("#showNonUserCheckins").is(":checked");
		if (marker[using_update]["non_user_checkin"] && !showNonUserCheckins) {
			removeMarker = true; 
		}

		// Show checkins with established bad ratings on the map?
		showBad = $("#showBadRatings").is(":checked");
		if (marker[using_update]["bad_rating"] && !showBad) {
			removeMarker = true; 
		}

		// Show checkins made by un-trusted users?
		showUntrusted = $("#showUntrusted").is(":checked");
		if (!marker[using_update]["trusted_user"] && !showUntrusted) {
			removeMarker = true;
		}

		// Show old checkins on the map?
		showOld = $("#showOldCheckins").is(":checked");
		if (marker[using_update]["timeout"] == "old" && !showOld) {
			removeMarker = true; 
			// hideOld = true;
		}

		// attraction is checked for display
		attractionId = "#" + marker.get("id");
		var showAttraction = $(attractionId).is(":checked");

		// update marker status for display
		checkedAttractions[marker.get("id")] = !removeMarker
		if (!showAttraction) {
			checkedAttractions[marker.get("id")] = "hide";
		}

	}
} // end of setOptionChecks function


///////////////////////////////////////
//////// SET OR DELETE MARKERS ////////
///////////////////////////////////////

// only show on map if checkbox is selected
function setOrDeleteMarkers() {
	console.log(checkedAttractions);
	// close any open windows
	if (infoWindow) {
		infoWindow.close();
	}
	for (i = 0; i < markersArray.length; i++) {
		marker = markersArray[i];

		var otherUpdate;
		var useOther;
		var aLink = "#span_" + marker.get("id") + " a";

		///////////////////////////////////////////////////
		//////// DETERMINE IF CAN USE OTHER UDPATE ////////
		///////////////////////////////////////////////////
		
		function useOtherUpdate() {
				// check other update against display options
				if ((marker[otherUpdate]["timeout"] == "old" && !showOld)
					|| (marker[otherUpdate]["non_user_checkin"] && !showNonUserCheckins)
					|| (marker[otherUpdate]["bad_rating"] && !showBad)
					|| (!marker[otherUpdate]["trusted_user"] && !showUntrusted)) {
					// don't use the other update option marker
					return false;
				}
				else {
					// update marker settings
					return true;
				}
		}

		// is food truck de-selected?
		if (checkedAttractions[marker.get("id")] == "hide") {
			marker.setMap(null);
			continue;
		}
		// if set to false (=> remove truck from display)
		else if (checkedAttractions[marker.get("id")] == false) {
			marker.setMap(null);

			// get the last_good_checkin if there is one
			if (marker.get("using_update") == "current" && marker.get("previous")) {
				// use the previous checkin, unless it violates user settings
				otherUpdate = "previous";
				useOther = useOtherUpdate();
			}
			else if (marker.get("using_update") == "previous") {
				// show the current checkin (preferred) instead of that will work
				otherUpdate = "current";
				useOther = useOtherUpdate();
			}

			// Update the marker to use the other one, if possible
			if (useOther) {
				updateMarkerSettingsPosition(marker, otherUpdate);
				marker.setMap(map);
				checkedAttractions[marker.get("id")] = true;
			}
			else {
				// disable attractionFocus link
				if (!$(aLink).hasClass("disabled")) {
					$(aLink).addClass("disabled");
				}
			}

		}
		// if set to true => do not remove marker --> set it
		else {
			// check if we can use current update (preferred) if using previous
			if (marker.get("using_update") == "previous") {
				otherUpdate = "current";
				useOther = useOtherUpdate();
				if (useOther) {
					// remove "previous" marker, and update marker to "current"
					marker.setMap(null);
					updateMarkerSettingsPosition(marker, "current");
					checkedAttractions[marker.get("id")] = true;
				}
			}
			// set the marker on the map
			marker.setMap(map);

			// make sure its attractionFocus link isn't disabled
			
			$(aLink).removeClass("disabled");
		}

		
	}
}

////////////////////////////////////////
//////// UPDATE MARKER SETTINGS ////////
////////////////////////////////////////

function updateMarkerSettingsPosition(marker, using_update) {
	latLng = new google.maps.LatLng(marker[using_update]["lat"], marker[using_update]["lng"]);
	var icon = getIconTypeForTimeout(marker[using_update]["timeout"], marker.get("type"));

	marker.setPosition(latLng);
	marker.setIcon(icon);
	marker.setMap(map);

	marker.set("checkin_id", marker[using_update]["checkin_id"]);
	marker.set("lat", marker[using_update]["lat"]);
	marker.set("lng", marker[using_update]["lng"]);
	marker.set("timeout", marker[using_update]["timeout"]);
	marker.set("time", marker[using_update]["timestamp"]);

	marker.set("non_user_checkin", marker[using_update]["non_user_checkin"]);
	marker.set("bad_rating", marker[using_update]["bad_rating"]);
	marker.set("trusted_user", marker[using_update]["trusted_user"]);

	marker.set("using_update", using_update);
}


////////////////////////////////////////////////////////

//////// ADD MARKERS --> INCLUDES MARKER EVENTS ////////

////////////////////////////////////////////////////////


/////////////////////////////
//////// ADD MARKERS ////////
/////////////////////////////

// Gets all current checkin markers and puts them on the map
function addMarkers(map, markers) {
	
	// initialize array to hold all markers
	markersArray = [];
	
	///////////////////////////////////////////////////////////
	//////// INITIALIZE CHECKED ATTRACTIONS DICTIONARY ////////

	// initialize dictionary of checked markers, key = id, value = true or false
	checkedAttractions = {};
	for (var i = 0; i < markers.length; i++) {
		markerObject = markers[i];
		attractionId = "#" + markerObject["id"];
		checkedAttractions[markerObject["id"]] = $(attractionId).is(":checked");
	}

	/////////////////////////////////////
	//////// CREATE MARKERS LOOP ////////

	// set the markers on the map each time the map is loaded
	// loop to add each marker to the map
	console.log("in create markers");
	for (var i = 0; i < markers.length; i++) {
		markerObject = markers[i];
		var myLatLng = new google.maps.LatLng(markerObject["current"]["lat"], markerObject["current"]["lng"]);
		console.log(myLatLng);

		var iconType = markerObject["type"];

		// Set marker icons based on how old they are
		var timeout = markerObject["current"]["timeout"];
		icon = getIconTypeForTimeout(timeout, iconType);

		var marker = new google.maps.Marker({
			position: myLatLng,
			map: map,
			title: markerObject["name"],
			draggable: true,
			icon: icon
			// animation: google.maps.Animation.DROP
		});

		// set data for markers
		setMarkerData(marker, markerObject);

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
					var hasVoted = votes[5];
					
					// create content and set defaults for info window
					var upButton = "<button type='submit' class='btn btn-link btn-arrow upvote'>";
					var downButton = "<button type='submit' class='btn btn-link btn-arrow downvote'>";
					var upButtonDisabled = "<button class='btn btn-link btn-arrow upvote disabled'>";
					var downButtonDisabled = "<button class='btn btn-link btn-arrow downvote disabled'>";
					var upVoteNum = upvotes;
					var downVoteNum = downvotes;

					// set yelp api data defaults
					var attraction_name_url = attraction_name;
					var yelp_ratings = "";
					var powered_by_yelp = "";


					if (loggedIn && !yourCheckin) {
						// user has never voted --> show popover instructions
						if (!hasVoted) {
							upButton = "<button type='submit' class='btn btn-link btn-arrow upvote' "
										+ "data-container='body' data-toggle='popover' "
										+ "data-placement='right' "
										+ "data-trigger='hover' "
										+ "data-title='Is this truck here? '"
										+ "data-content='&#x2713; for yes, &#x2717; for no.'>";
							downButton = "<button type='submit' class='btn btn-link btn-arrow downvote' "
										+ "data-container='body' data-toggle='popover' "
										+ "data-placement='right' "
										+ "data-trigger='hover' "
										+ "data-title='Is this truck here? '"
										+ "data-content='&#x2713; for yes, &#x2717; for no.'>";
						}

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
						upButton = "<button type='button' class='btn btn-link btn-arrow upvote' "
									+ "data-container='body' data-toggle='popover' "
									+ "data-placement='right' "
									+ "data-trigger='hover' "
									+ "data-title='Is this truck here?'"
									+ "data-content='Login or Signup to vote!'>";

						downButton = "<button type='button' class='btn btn-link btn-arrow downvote' "
									+ "data-container='body' data-toggle='popover' "
									+ "data-placement='right' "
									+ "data-trigger='hover' "
									+ "data-title='Is this truck here?'"
									+ "data-content='Login or Signup to vote!'>";
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
								+ "<span class='glyphicon glyphicon-ok-sign' aria-hidden='true'></span>"
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
								+ "<span class='glyphicon glyphicon-remove-sign' aria-hidden='true'></span>"
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
					
					// turn popover windows on
					$('[data-toggle="popover"]').popover();

					// to close mobile popovers
					$('[data-toggle="popover"]').click(function(evt) {
						$(this).popover("hide");
					});


				}
						
					
			}); // end of info window click event


	} // end of for loop for markers

	// put all user-desired markers on the map
	setOptionChecks();
	setOrDeleteMarkers();

}


/////////////////////////////////////

//////// GENERATE DIRECTIONS ////////

/////////////////////////////////////

////////////////////////////////
//////// GET DIRECTIONS ////////
////////////////////////////////

function getDirections(toLat,toLng) {

	// reset startMarkerArray (should hold no markers when no directions present)
	if (startMarkerArray.length >= 1) {
		startMarkerArray[0].setMap(null);
		startMarkerArray = [];
	}

	// get mode of travel
	var selectedMode = document.getElementById("transportMode").value; 
	if (!selectedMode) {
		return;
	}

	// set destination
	var toLatLng = new google.maps.LatLng(toLat, toLng);

	var browserSupportFlag = new Boolean();

	// Get geolocation with W3C Geolocation
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

			// put the directions on the map
			directionsService.route(request, function(response, status) {
				if (status == google.maps.DirectionsStatus.OK) {
					directionsDisplay.setDirections(response);
					
				}
			});

			// create start marker for whereever user is currently
			startMarker = new google.maps.Marker({
				position: fromLatLng,
				map: map,
				title: "You are here",
				animation: google.maps.Animation.DROP
				// icon: pinImage
			});

			// set start location marker
			startMarkerArray.push(startMarker);
			startMarker.setMap(map);

			// display written directions
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

	///////////////////////////////////////
	//////// HANDLE NO GEOLOCATION ////////
	///////////////////////////////////////

	function handleNoGeolocation(errorFlag) {
		if (errorFlag) {
			alert("Error: Geolocation service failed.");
		} else {
			alert("Error: Your browser doesn't support geolocation.");
		}
	}
}


///////////////////////////////////////////////////////

//////// INITIALIZE MAP AND DIRECTIONS DISPLAY ////////

///////////////////////////////////////////////////////

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
		// mapdiv.style.width = '100%';
		// mapdiv.style.height = '400px';
	}

	// create the map object
	var startLatLng = new google.maps.LatLng(37.7829292,-122.4324726);
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
}







