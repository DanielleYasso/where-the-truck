from flask import Flask, render_template, redirect, request
from flask import session, g, make_response, flash, url_for
from flask_mail import Mail, Message
from flask.ext.cors import CORS, cross_origin
import requests
import os
import json
from passlib.hash import pbkdf2_sha256
from datetime import datetime
import rauth
import twilio.twiml

import model
from forms import PasswordForm, PasswordFormSettings

from flask.ext.login import LoginManager, login_required
from flask.ext.login import login_user, logout_user, current_user
from itsdangerous import URLSafeTimedSerializer




# Create Flask app
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///checkins.db'

# Cross-origin resource sharing
cors = CORS(app, resources={r"/api/*": {"origins": "*"}})

mail = Mail(app)

# update app config with mail data for Flask-Mail
app.config.update(dict(
	DEBUG=True,
	# Email settings
	MAIL_SERVER = 'smtp.gmail.com',
	MAIL_PORT = 465,
	MAIL_USE_SSL = True,
	MAIL_USERNAME= 'dbyasso@gmail.com',
	MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
	))

# secret key for session
SECRET_KEY = os.environ.get('SECRET_KEY')
app.secret_key = SECRET_KEY

# update Flask-Mail instance with new app config settings
mail = Mail(app)

# Create serializer for generating tokens for user email confirmation
ts = URLSafeTimedSerializer(app.config['SECRET_KEY'])

# google maps api key
API_KEY = os.environ.get('API_KEY')

# Set up Flask-Login LoginManager
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.session_protection = "strong"



@login_manager.user_loader
def load_user(user_id):
	""" For a given logged in user id, returns the user object """

	return model.User.query.get(user_id)

@app.before_request
def check_login():
	""" Assigns g.user the current user object """

	g.user = current_user


@app.route("/")
def home():
	""" Loads the homepage, sending it all the food trucks in the attractions
	table """

	attractions = model.db.session.query(model.Attraction).all()

	return render_template("index.html", API_KEY=API_KEY, attractions=attractions)


###### JSON ######
def convert_to_JSON(result):
	"""Convert result object to a JSON web request."""
	response = make_response(json.dumps(result))
	response.mimetype = "application/json"
	return response

def dump_datetime(value):
    """Deserialize datetime object into string form for JSON processing.

    For example, converting a date and a time:

        >>> import datetime
        >>> dump_datetime(datetime.datetime(1970, 12, 25, 15, 0, 0))
        ['1970-12-25', '15:00:00']

    But also should work if given just a date:

        >>> import datetime
        >>> dump_datetime(datetime.datetime(1970, 12, 25))
        ['1970-12-25', '00:00:00']

    """
    if value is None:
        return None
    return [value.strftime("%Y-%m-%d"), value.strftime("%H:%M:%S")]

###### END JSON ######

###### YELP API FUNCTION CALL ######
def get_yelp_ratings(business_id):
	""" Returns yelp ratings and related yelp information for a food truck 
	with a given business id """

	# OAuth credentials
	CONSUMER_KEY = os.environ.get('YELP_CONSUMER_KEY')
	CONSUMER_SECRET = os.environ.get('YELP_CONSUMER_SECRET')
	TOKEN = os.environ.get('YELP_TOKEN')
	TOKEN_SECRET = os.environ.get('YELP_TOKEN_SECRET')

	session = rauth.OAuth1Session(
		consumer_key = CONSUMER_KEY,
		consumer_secret = CONSUMER_SECRET,
		access_token = TOKEN,
		access_token_secret = TOKEN_SECRET)

	url = "http://api.yelp.com/v2/business/{0}".format(business_id)
	print "**** url", url

	try:
		request = session.get(url)
		# transform json api response into dictionary
		data = request.json()
	except ValueError:
		return False
		
	session.close()

	return data
###### END YELP API FUNCTION CALL ######



######## CORS (CROSS-ORIGIN RESOURCE SHARING) API CALLS ########
@app.route("/api/geonames")
def api_geonames():
	""" For a specific latitude and longitude, calls the geonames ocean api
	and returns the name of the ocean that coordinate is in, if applicable. """

	lat = request.args.get("lat")
	lng = request.args.get("lng")

	url = "http://api.geonames.org/oceanJSON?lat={0}&lng={1}&username=dbyasso".format(lat,lng)

	r = requests.get(url)

	response = json.loads(r.text)

	return convert_to_JSON(response)
######## END CORS API CALLS ########



###############
# USER LOGOUT #
###############

@app.route("/logout")
def logout():
	""" Logs out the currently logged in user """

	logout_user()

	return redirect("/")


##############
# USER LOGIN #
##############

@app.route("/login", methods=["POST"])
def login():
	""" Gets user login data from the login form, and logs the user in """

	# get email and password from form inputs
	email = request.form.get("email")
	password = request.form.get("password")
	remember_me = request.form.get("rememberMe")

	print "****remember?", remember_me

	# get user with that email address
	user = model.db.session.query(model.User).filter_by(email=email).first()

	# check if user exists in database
	if not user:
		return convert_to_JSON("incorrect")

	# check if password is right
	if not pbkdf2_sha256.verify(password, user.password):
		return convert_to_JSON("incorrect")

	model.db.session.add(user)
	model.db.session.commit()
	login_user(user,remember=remember_me)

	return ""


####################
# RECOVER PASSWORD #
####################

@app.route("/forgot_password")
def forgot_password():
	""" Renders the forgot_password.html webpage """
	
	return render_template("forgot_password.html")

@app.route("/recover_password", methods=["POST"])
def recover_password():
	""" Gets user email from forgot password page, and creates a unique token 
	for that user, sending it to them via email as part of a unique link """

	# get user email from form
	user_email = request.form.get("recoveryEmail")
	print "***** user input", user_email

	# check if user email exists
	user = model.db.session.query(model.User).filter_by(email=user_email).first()

	if not user:
		flash("No user found with that email address.")
		return redirect("/forgot_password")

	# Create reset password email
	subject = "Password reset requested"
	token = ts.dumps(user.email, salt="recover-key")

	recover_url = url_for(
		"reset_with_token",
		token=token,
		_external=True)

	html = render_template(
		"emails/recover_password.html",
		recover_url=recover_url)

	# Create email message to send
	msg = Message(subject,
				sender="dbyasso@gmail.com",
				recipients=[user.email])
	msg.html = html

	mail.send(msg)
	flash("Password reset instructions sent to your email address.")

	return redirect("/forgot_password")

##################
# RESET PASSWORD #
##################

@app.route("/reset/<token>", methods=["GET", "POST"])
def reset_with_token(token):
	""" Resets a user's password, verifying that their token is correct, and 
	then encrypting their new password and logging them in. """
	try:
		email = ts.loads(token, salt="recover-key", max_age=86400)
	except:
		abort(404)

	#get form data
	form = PasswordForm()
	if form.validate_on_submit():
		user = model.User.query.filter_by(email=email).first_or_404()

		password = form.password.data
		# securely store password
		password_hash = pbkdf2_sha256.encrypt(password, rounds=200000, salt_size=16)
		user.password = password_hash


		model.db.session.add(user)
		model.db.session.commit()

		# login user
		login_user(user)

		return redirect("/")
	else:
		return render_template("/reset_with_token.html", form=form, token=token)



#################
# USER SETTINGS #
#################

@app.route("/user_settings", methods=["GET", "POST"])
@login_required
def user_settings():
	""" Renders user settings page, and allows user to reset their password, and 
	 encrypts their new password. """

	#get form data
	form = PasswordFormSettings()
	if form.validate_on_submit():
		# user = model.User.query.filter_by(email=email).first_or_404()

		current_password = form.current_password.data

		if not pbkdf2_sha256.verify(current_password, g.user.password):
			flash("Incorrect current password.")
			return render_template("/user_settings.html", form=form)

		new_password = form.new_password.data

		# securely store new password
		password_hash = pbkdf2_sha256.encrypt(new_password, rounds=200000, salt_size=16)
		g.user.password = password_hash

		model.db.session.commit()

		return redirect("/")
	else:
		return render_template("/user_settings.html", form=form)


###############
# USER SIGNUP #
###############

@app.route("/signup", methods=["POST"])
def signup():
	""" Signs up a new user, making sure their email is unique. 
	Sends a confirmation email to the user with a unique token/url """

	# get user info
	username = request.form.get("username")
	email = request.form.get("email")
	password = request.form.get("password")
	remember_me = request.form.get("rememberMe")

	print "**** signup ", username

	# check that user email doesn't already exist in database
	user = model.db.session.query(model.User).filter_by(email=email).first()
	if user:
		return convert_to_JSON("userExists")

	# securely store password
	password_hash = pbkdf2_sha256.encrypt(password, rounds=200000, salt_size=16)

	# add new user to database
	new_user = model.User(username=username, email=email, password=password_hash)
	
	model.db.session.add(new_user)
	model.db.session.commit()
	
	# add default empty user preferences
	new_user.preferences = {}
	model.db.session.commit()

	# email confirmation
	if "@" in email:
		subject = "Confirm your email"
		token = ts.dumps(new_user.email, salt="email-confirm-key")

		confirm_url = url_for(
			"confirm_email",
			token=token,
			_external=True)

		html = render_template(
			"emails/activate.html",
			confirm_url=confirm_url)

		msg = Message(subject, 
					sender="dbyasso@gmail.com", 
					recipients=[new_user.email])

		msg.html = html

		mail.send(msg)

	# add user to session --> LOGIN USER
	# session["user_id"] = new_user.id
	login_user(new_user,remember=remember_me)

	return ""


########################
# SIGNUP CONFIRM EMAIL #
########################

@app.route("/confirm/<token>")
def confirm_email(token):
	""" Confirms a user's email based on their token, from their unique link """
	try:
		email = ts.loads(token, salt="email-confirm-key", max_age=86400)
	except:
		abort(404)

	user = model.User.query.filter_by(email=email).first_or_404()

	user.confirmed_at = datetime.now()

	model.db.session.add(user)
	model.db.session.commit()

	return redirect("/")



#################################
# SAVE USER DISPLAY PREFERENCES #
#################################

@app.route("/save_preferences", methods=["POST"])
def save_preferences():
	""" Saves a user's display preferences in a dictionary, based on form data,
	and stores it in the user.preferences Pickletype """

	checked_attractions = request.form.getlist("attractionsDisplayed")
	print "***** checked attractions ", checked_attractions

	show_old = request.form.get("showOldCheckins", False)
	show_bad = request.form.get("showBadRatings", False)
	show_untrusted = request.form.get("showUntrusted", False)
	show_non_users = request.form.get("showNonUserCheckins", False)

	# add checked attractions to user preferences
	p = {}
	for attraction in checked_attractions:
		p[int(attraction)] = True

	all_attractions = model.db.session.query(model.Attraction).all()
	for attraction in all_attractions:
		if not attraction.id in p:
			p[attraction.id] = False

	p["show_old"] = show_old
	p["show_bad"] = show_bad
	p["show_untrusted"] = show_untrusted
	p["show_non_users"] = show_non_users

	if g.user.is_authenticated():
		g.user.preferences = p

	model.db.session.commit()

	print "g.user.preferences = ", g.user.preferences

	return redirect("/")


#################################
# GET MARKERS TO DISPLAY ON MAP #
#################################

@app.route("/get_markers")
def get_markers():
	"""Get's all of the attractions with checkins to be displayed as markers"""
	# get all attractions that have checkins
	attractions = model.db.session.query(model.Attraction).all()

	if not attractions:
		return convert_to_JSON("noMarkers")

	attraction_list = []
	for attraction in attractions:

		if attraction.checkin_id:
			checkin = model.db.session.query(model.Checkin).get(attraction.checkin_id)
			
			checkin_data = getCheckinData(checkin)

			attraction_list.append(checkin_data)
			
									
	if attraction_list == []:
		return convert_to_JSON("noMarkers")

	return convert_to_JSON(attraction_list)


###################
# GET MARKER DATA #
###################

def getLastGood(attraction):
	""" Gets the last good checkin (good = made by a user, not badly rated) and
	returns all associated data in a dictionary """

	if attraction.last_good_checkin_id:
		last_good = model.db.session.query(model.Checkin).get(attraction.last_good_checkin_id)
	else:
		return False

	if not last_good:
		return False	

	timeout = getTimeout(last_good)
	lgDict = {"lat": last_good.lat,
				"lng": last_good.lng,
				"timestamp": dump_datetime(last_good.timestamp),
				"timeout": timeout,
				"checkin_id": last_good.id,
				"bad_rating": False,
				"non_user_checkin": False,
				"trusted_user": True
				}
	return lgDict
	# return False

def getTimeout(this):
	""" Gets the timeout for a given checkin object, by comparing that checkin's
	timeestamp with datetime.now() """

	# check how old timestamp is
	time_diff = datetime.now() - this.timestamp
	# older than a day?
	if time_diff.days >= 1:
		timeout = "old"
	# older than 3 hours?
	elif time_diff.seconds >= 10800:
		timeout = "three_hours"
	# older than 2 hours?
	elif time_diff.seconds >= 7200:
		timeout = "two_hours"
	# older than 1 hour?
	elif time_diff.seconds >= 3600:
		timeout = "one_hour"
	# # temp for testing
	# elif time_diff.seconds >= 30:
	# 	timeout = "six_hours"
	else:
		timeout = False
	return timeout


def getCheckinData(checkin):
	""" Gets the data for a specific checkin and returns it as a dictionary """
	
	timeout = getTimeout(checkin)

	# get yelp ratings if they exist
	ratings_img = None
	ratings_count = None
	url = None

	if checkin.attraction.biz_id:
		ratings_data = get_yelp_ratings(checkin.attraction.biz_id)

		if ratings_data:
			ratings_img = str(ratings_data["rating_img_url_small"])
			ratings_count = str(ratings_data["review_count"])
			url = "http://www.yelp.com/biz/{0}".format(checkin.attraction.biz_id)


	last_good_checkin = False

	# Check if attraction checkin has a really bad rating
	bad_rating = False
	# COMPARISON VALUES TO CHANGE --> set low for demo purposes
	if checkin.downvotes > checkin.upvotes: 
		bad_rating = True

		# if it has a bad rating: get its last_good_checkin
	last_good_checkin = getLastGood(checkin.attraction)

	non_user_checkin = True
	trusted_user = True
	# made by logged in and trusted user?
	if checkin.user_id != None:
		non_user_checkin = False
		# trusted user?
		trusted_user = checkin.user.is_trusted()


	current_checkin = {"lat": checkin.lat,
						"lng": checkin.lng,
						"timestamp": dump_datetime(checkin.timestamp),
						"timeout": timeout,
						"checkin_id": checkin.id,
						"bad_rating": bad_rating,
						"non_user_checkin": non_user_checkin,
						"trusted_user": trusted_user
						}


	checkin_data = {"id": checkin.attraction.id, 
					"name": checkin.attraction.name,
					"type": checkin.attraction.att_type,
					"ratings_img": ratings_img,
					"ratings_count": ratings_count,
					"url": url,
					"current": current_checkin,
					"previous": last_good_checkin
					}

	return checkin_data

########################
# CREATE A NEW CHECKIN #
########################

@app.route("/checkin", methods=["POST"])
def checkin():
	"""Checkin user's current location as location of selected item"""

	# get attraction id
	attraction_id = request.form.get("attraction_id")

	# get geolocation data from user
	lat = request.form.get("latitude")
	lng = request.form.get("longitude")

	print "Attraction %r, lat %r, lng %r" % (attraction_id, lat, lng)

	# Add checkin to database checkins table
	if g.user.is_authenticated():
		new_checkin = model.Checkin(attraction_id=attraction_id, 
								lat=lat, 
								lng=lng,
								user_id=g.user.id)
	else:
		new_checkin = model.Checkin(attraction_id=attraction_id, 
								lat=lat, 
								lng=lng)
	model.db.session.add(new_checkin)
	model.db.session.commit()


	# Use checkin record to update attraction's checkin_id
	attraction = new_checkin.attraction
	print attraction.id
	print attraction.name
	print attraction.checkin_id

	# UPDATE LAST_GOOD_CHECKIN_ID
	if attraction.checkin_id:
		previous_checkin = model.db.session.query(model.Checkin).get(attraction.checkin_id)
		# made by a user? a trusted user?
		if previous_checkin.user_id and previous_checkin.user.is_trusted():
			# did it have a rating? that wasn't bad?
			if previous_checkin.calculated_rating != None and previous_checkin.calculated_rating > 0:
				attraction.last_good_checkin_id = attraction.checkin_id
			# unrated, but made by a trusted user, so add it
			else:
				attraction.last_good_checkin_id = attraction.checkin_id

	# update attraction's checkin_id with the new_checkin
	attraction.checkin_id = new_checkin.id

	# Get marker details
	checkin_data = getCheckinData(new_checkin)
	
	model.db.session.commit()

 	return convert_to_JSON(checkin_data)


################
# UPDATE VOTES #
################

@app.route("/downvote/<int:checkin_id>", methods=["POST"])
def downvote(checkin_id):
	"""Gets a user's down vote and updates checkins table record"""

	vote = "down"

	return update_vote(checkin_id, vote)

@app.route("/upvote/<int:checkin_id>", methods=["POST"])
def upvote(checkin_id):
	"""Gets a user's up vote and updates checkins table record"""

	vote = "up"

	return update_vote(checkin_id, vote)

def update_vote(checkin_id, vote):
	"""Gets a user's up or down vote and updates checkins table record"""
	# get attraction's checkin
	checkin = model.db.session.query(model.Checkin).get(checkin_id)

	# ONLY LOGGED IN USERS CAN VOTE --> taken care of in map.js

	# update user vote status so popovers don't show anymore
	if not g.user.has_voted:
		g.user.has_voted = True
	
	# IF NO RATINGS YET
	if checkin.users_who_rated == None or checkin.users_who_rated == {}:
		checkin.users_who_rated = {}
		print "users who rated was None or {}"

		# add user to dictionary
		checkin.users_who_rated[g.user.id] = vote
		model.db.session.commit()

		# increment vote
		add_votes(checkin, vote)

	# IF USER IS ALREADY IN THE CHECKINS DATABASE
	elif g.user.id in checkin.users_who_rated:
		print "user is already in the database"

		# WITH NO RATING, aka 0 (due to deleted rating)
		if checkin.users_who_rated[g.user.id] == 0:
			
			# add user vote to dictionary
			checkin.users_who_rated[g.user.id] = vote
			model.db.session.commit()

			#increment vote
			add_votes(checkin, vote)


		# else user HAS rated this
		else:

			# get existing user vote
			existing_vote = checkin.users_who_rated[g.user.id]

			# USER IS UNDOING THEIR VOTE
			if existing_vote == vote:

				# delete rating
				checkin.users_who_rated[g.user.id] = 0
				model.db.session.commit()

				# decrement vote count
				remove_votes(checkin, vote)

	# RATINGS EXIST, BUT NOT BY THIS USER
	else:
		# add user to dictionary
		checkin.users_who_rated[g.user.id] = vote
		model.db.session.commit()

		# increment vote
		add_votes(checkin, vote)

	# update calculated rating if checkin isn't older than 1 hour, so that
	# checkin's user's average rating isn't hurt by downvotes long after checkin
	timeout = getTimeout(checkin)
	if not timeout:
		checkin.calculate_rating()
		model.db.session.commit()

		# update checkin user's rating based on new calculated rating
		if checkin.user:
			checkin.user.set_average_rating()
			model.db.session.commit()

	

	return redirect("/")

def remove_votes(checkin, vote):
	""" Decrements either the upvote count or the downvote count in the 
	checkins table for a given checkin object """

	print "in remove votes"

	# update database
	if vote == "up":
		# remove upvote
		checkin.upvotes -= 1
	elif vote == "down":
		# remove downvote
		checkin.downvotes -= 1

	# commit changes to database
	model.db.session.commit()

def add_votes(checkin, vote):
	""" Increments either the upvote count or the downvote count in the 
	checkins table for a given checkin object """

	print "in add votes"

	# update checkin votes
	if vote == "up":
		checkin.upvotes += 1
		print "******* upvotes *******", checkin.upvotes
	elif vote == "down":
		checkin.downvotes += 1
		print "******* downvotes *******", checkin.downvotes

	model.db.session.commit()


############################
# GET VOTES FOR INFOWINDOW #
############################

@app.route("/get_votes/<int:checkin_id>")
def get_votes(checkin_id):
	"""Gets all of the votes for a given checkin"""

	# get checkin from db
	checkin = model.db.session.query(model.Checkin).get(checkin_id)

	votes_data = [checkin.upvotes, checkin.downvotes] # [0, 1]

	# is a user signed in?
	if g.user.is_authenticated():
		votes_data.append(True) # [2], user is signed in

		if checkin.user_id == g.user.id:
			votes_data.append(True) # [3], this is the user's own checkin
		else:
			votes_data.append(False) # [3], not this user's checkin


			# get user vote (if it exists)
			if checkin.users_who_rated != None:
				if g.user.id in checkin.users_who_rated:

					# vote_type is "up" or "down" or 0
					vote_type = checkin.users_who_rated[g.user.id]

					votes_data.append(vote_type) # [4]
				else:
					votes_data.append(False) # [4] placeholder vote_type
			else:
				votes_data.append(False) # [4], placeholder for vote_type

			# has user ever voted?
			votes_data.append(g.user.has_voted) # [5], has user ever voted?


	return convert_to_JSON(votes_data)


###################
# TWILIO RESPONSE #
###################

@app.route("/twilio", methods=["GET", "POST"])
def twilio_response():
	""" Twilio API call. Sends text message either the link to the application. 
	If the user texted the name of an attraction, also includes a google map 
	link with the lat and lng of that attraction's current checkin """

	# # Respond to an incoming text message with a static response
	resp = twilio.twiml.Response()

	message = "Find it in San Francisco at https://4d3d4b3a.ngrok.com/"
	new_message = ""

	# get user input
	user_input = request.values.get("Body")

	attractions = model.db.session.query(model.Attraction).all()
	for attraction in attractions:

		# did user request a known attraction?
		if str(user_input).lower() == str(attraction.name).lower():
			
			# check if that attraction has a checkin
			if attraction.checkin_id:

				# get the checkin
				checkin = model.db.session.query(model.Checkin).get(attraction.checkin_id)

				# check how old timestamp is
				time_diff = datetime.now() - checkin.timestamp
				# older than a day?
				if time_diff.days >= 1:
					time_ago = "more than 1 day ago"
				# older than 6 hours?
				elif time_diff.seconds >= 21600:
					time_ago = "more than 6 hours ago"
				# older than 3 hours?
				elif time_diff.seconds >= 10800:
					time_ago = "more than 3 hours ago"
				# older than 1 hour?
				elif time_diff.seconds >= 3600:
					time_ago = "more than 1 hour ago"
				elif time_diff.seconds >= 1800:
					time_ago = "more than 30 minutes ago"
				else:
					time_ago = "less than 30 minutes ago"

				new_message = "{0} was last checked in {1}".format(attraction.name,time_ago)
				new_message += " at http://maps.google.com/maps/place/{0},{1} \n\n".format(checkin.lat,checkin.lng)

				print new_message

	response_message = new_message + message

	resp.message(response_message)

	return str(resp)

# testing for checkins_test.db
@app.route("/test_for_db")
def get_attraction_two():
	""" Test route, to check which database is in use by tests.py """

	attractions = model.db.session.query(model.Attraction).all()

	for attraction in attractions:
		if attraction.id == 2:
			return attraction.checkin_id
	return None


if __name__=="__main__":
	import doctest
	if doctest.testmod().failed == 0:
		app.run(debug=True)