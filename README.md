Where The Truck?
================

Description
-------------------
Where The Truck? helps San Franciscans find the food trucks they love.  A community powered application, Where The Truck? allows users to update the current location of food trucks in the city using geolocation data taken from their browsers or smartphones.  Users can securely login, vote on whether food trucks are where other users say they are, update a truck’s location, see its Yelp reviews, and get directions to it.  Machine learning algorithms filter out updates by users who gain a reputation for inaccuracy based on community votes—an option users can toggle off in their preferences.  Where The Truck? also emphasizes secure authentication, using password encryption and resetting.

The map:
-------------------
<ul>
	<li>Shows the most recent location of each food truck</li>
	<li>Provides routing and times/distances to food trucks</li>
</ul>

Users can:
-------------------
<ul>
	<li>Sign in/sign up (create an account)</li>
	<li>Reset their password</li>
	<li>Update the location of a food truck</li>
	<li>See recent location updates made by other users</li>
	<li>Select which things they want to see on the map </li>
	<li>Save their preferences</li>
	<li>Get distances/times/routes to food trucks</li>
	<li>Rate location updates made by other users</li>
	<li>See location updates even if they have bad ratings (or predicted bad ratings)</li>
	<li>Change their ratings for other user updates</li>
</ul>

Technologies & Stack: 
------------------------

<h4>Backend:</h4>
	Python, Flask, Jinja, SQLAlchemy, sqlite, passlib (encryption & verification).
	Flask extensions: Flask-Mail, Flask-Login, Flask-WTForms, Flask-CORS, 
	Flask-SQLAlchemy.
	Machine learning: rating location checkins and using those ratings to rate 
	users and predict the accuracy of their future checkins.

<h4>Frontend:</h4>
	JavaScript, jQuery, AJAX, jQuery plugins (lightbox_me, timeago).
	HTML5, CSS3, Twitter Bootstrap (html/css/js framework).

<h4>APIs:</h4>
	Google Maps Javascript V3, Yelp, Geonames, Twilio.