Where The Truck?
================

Where The Truck? helps San Franciscans find the food trucks they love.  

A community powered application, Where The Truck? allows users to update the current location of food trucks in the city using geolocation data taken from their browsers or smartphones.  Users can securely login, vote on whether food trucks are where other users say they are, update a truck’s location, see its Yelp reviews, and get directions to it.  Machine learning algorithms filter out updates by users who gain a reputation for inaccuracy based on community votes—an option users can toggle off in their preferences.  Where The Truck? also emphasizes secure authentication, using password encryption and resetting.

###Contents
- [Overview](#overview)
- [Technologies & Stack](#technologies-and-stack)
- [Features](#features)


Overview
----------------

Where The Truck? features an interactive map showing the most recently updated location for each food truck in the database.

<h4>The map:</h4>
<ul>
	<li>Shows the most recent location of each food truck</li>
	<li>Provides routing and times/distances to food trucks</li>
	<li>Displays Yelp ratings and links to Yelp pages for each truck</li>
	<li>Displays timestamp data for when a truck's location was updated</li>
	<li>Shows upvotes and downvotes on the accuracy of each truck's current location</li>
</ul>

<h4>Users can:</h4>
<ul>
	<li>Sign in/sign out/sign up (create an account)</li>
	<li>Reset their password</li>
	<li>Update the location of a food truck by dragging its icon on the map or by clicking Truck Sighted! to update its location to their current geolocation</li>
	<li>See recent location updates made by other users</li>
	<li>Get directions to food trucks from their current location</li>
	<li>Select which trucks they want to see on the map </li>
	<li>Choose to see location updates even if they have bad ratings (or predicted bad ratings)</li>
	<li>Save their preferences</li>
	<li>Vote on the accuracy of location updates made by other users</li>
	<li>Change their existing vote on another user's update</li>
	<li>Read the help section ("?") modal to get answers to common questions.</li>
</ul>

Technologies and stack 
------------------------

<h4>Backend:</h4>
Python, Flask, Jinja, SQLAlchemy, sqlite, passlib (encryption & verification).<br>
Flask extensions: Flask-Mail, Flask-Login, Flask-WTForms, Flask-CORS, 
Flask-SQLAlchemy.<br>
Machine learning: rating location checkins and using those ratings to rate 
users and predict the accuracy of their future checkins.<br>
Testing: doc string and unit tests.

<h4>Frontend:</h4>
JavaScript, jQuery, AJAX, jQuery plugins (lightbox_me, timeago).<br>
HTML5, CSS3, Twitter Bootstrap (html/css/js framework), RWD (responsive web design).

<h4>APIs:</h4>
Google Maps Javascript V3, Yelp, Geonames, Twilio.

Features
-------------------


- [X] Get latitude and longitude from user's browser using HTML5 geolocation.
- [X] Store updated location data in a database with associated tables for users, location updates, and food trucks.
- [X] Flask app routes AJAX requests to the database and manages password reset form validation via Flask-WTForms.

###Voting and user ratings
- [X] Calculate an overall rating for each location update using its upvotes and downvotes in a modified Wilson score interval algorithm.
- [X] Machine learning algorithm predicts if a given user's update will be accurate, based on their averaged update ratings, and hides the update if the user's average rating falls below a certain threshold.


###Security with passlib encryption and Flask-Login
- [X] Encrypt and verify user passwords using hashes and salts.
- [X] Secure user sessions let users stay logged in.
- [X] Confirm user accounts via email and allow users to reset passwords using secure email links with unique tokens that timeout.

###APIs and Cross Origin Resource Sharing
- [X] Enable cross origin resource sharing (CORS) by routing insecure API's through the python server.
- [X] Twilio API integration allows users to text the name of a food truck and receive a google maps link to its most recent location.
- [X] Prevent trolling by limiting location updates to within San Francisco, and preventing location updates in the bay using the Geonames Ocean API.


###Data visualization and interaction
- [X] Dynamically display aging location updates using timeago.js and different icon images.
- [X] Show the last good* location update when a specific option is toggled on/off, causing the current update to be hidden. (*made by a logged in user, who has a user rating above a certain threshold)
- [X] Increase rendering speed when truck icons are updated via dragging, or display options are toggled, by using Javascript to manipulate cached data rather than re-requesting data from the server.
- [X] Customize checkbox appearances and interactivity, and site features based on logged in user's data and previous map interactions.
- [X] Foster learned user behavior using Bootstrap's Javascript popovers on voting options for non-users and users who haven't voted yet.
- [X] Create custom responsive web design (RWD) using CSS3.



Forking?
-----------------------
You'll need your own API keys for Google Maps, Yelp, and Twilio, and your own username for Geonames.

	pip install -r requirements.txt

	python routing.py