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
from forms import PasswordForm

from flask.ext.login import LoginManager, login_user, logout_user, current_user
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
	# # Flask-Security
	# SECURITY_PASSWORD_HASH = 'pbkdf2_sha256',
	# SECURITY_CONFIRMABLE = True,
	# SECURITY_RECOVERABLE = True

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
	return model.User.query.get(user_id)

@app.before_request
def check_login():
	g.user = current_user


@app.route("/")
def home():

	attractions = model.db.session.query(model.Attraction).all()

	return render_template("base.html", API_KEY=API_KEY, attractions=attractions)


###### JSON ######
def convert_to_JSON(result):
	"""Convert result object to a JSON web request."""
	response = make_response(json.dumps(result))
	response.mimetype = "application/json"
	return response

def dump_datetime(value):
    """Deserialize datetime object into string form for JSON processing."""
    if value is None:
        return None
    return [value.strftime("%Y-%m-%d"), value.strftime("%H:%M:%S")]

###### END JSON ######

###### YELP API FUNCTION CALL ######
def get_yelp_ratings(business_id):
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

	request = session.get(url)

	# transform json api response into dictionary
	data = request.json()
	session.close()

	return data
###### END YELP API FUNCTION CALL ######



######## CORS (CROSS-ORIGIN RESOURCE SHARING) API CALLS ########
@app.route("/api/geonames")
def api_geonames():

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

	logout_user()

	return redirect("/")


##############
# USER LOGIN #
##############

@app.route("/login", methods=["POST"])
def login():

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
	
	return render_template("forgot_password.html")

@app.route("/recover_password", methods=["POST"])
def recover_password():

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


@app.route("/reset/<token>", methods=["GET", "POST"])
def reset_with_token(token):
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




###############
# USER SIGNUP #
###############

@app.route("/signup", methods=["POST"])
def signup():
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

	checked_attractions = request.form.getlist("attractionsDisplayed")
	print "***** checked attractions ", checked_attractions

	show_old = request.form.get("showOldCheckins", False)
	show_bad = request.form.get("showBadRatings", False)
	show_bad_users = request.form.get("showBadUsers", False)
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
	p["show_bad_users"] = show_bad_users
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

		# get yelp ratings if they exist
		if attraction.biz_id:
			ratings_data = get_yelp_ratings(attraction.biz_id)

			ratings_img = str(ratings_data["rating_img_url_small"])
			ratings_count = str(ratings_data["review_count"])
			url = "http://www.yelp.com/biz/{0}".format(attraction.biz_id)
		else:
			ratings_img = None
			ratings_count = None
			url = None

		if attraction.checkin_id:
			checkin = model.db.session.query(model.Checkin).get(attraction.checkin_id)
			
			# check how old timestamp is
			time_diff = datetime.now() - checkin.timestamp
			# older than a day?
			if time_diff.days >= 1:
				timeout = "old"
			# older than 6 hours?
			elif time_diff.seconds >= 21600:
				timeout = "six_hours"
			# older than 3 hours?
			elif time_diff.seconds >= 10800:
				timeout = "three_hours"
			# older than 1 hour?
			elif time_diff.seconds >= 3600:
				timeout = "one_hour"
			else:
				timeout = False

			# Check if attraction checkin has a really bad rating
			bad_rating = False;
			# if there are X total votes and/or X downvotes:
			if checkin.downvotes > checkin.upvotes: # COMPARISON VALUES TO CHANGE
				bad_rating = True
				# if calculated_rating is below a certain number:
					# bad_rating = True;

				# if it has a bad rating: store its last good user checkin_id in new column

			# made by logged in user?
			if checkin.user_id != None:
				non_user_checkin = False
			else:
				non_user_checkin = True

				# if made by non-user, store last good user checkin in new column
					#last_user_checkin
					# or just send info for the last good user checkin (will require another db query though)

			attraction_list.append({"id": attraction.id, 
									"name": attraction.name,
									"lat": checkin.lat,
									"lng": checkin.lng,
									"timestamp": dump_datetime(checkin.timestamp),
									"timeout": timeout,
									"checkin_id": checkin.id,
									"type": attraction.att_type,
									"bad_rating": bad_rating,
									"non_user_checkin": non_user_checkin,
									"ratings_img": ratings_img,
									"ratings_count": ratings_count,
									"url": url
									})
	if attraction_list == []:
		return convert_to_JSON("noMarkers")

	return convert_to_JSON(attraction_list)


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
	attraction_rec = new_checkin.attraction
	attraction_rec.checkin_id = new_checkin.id
	model.db.session.commit()

 	return ""


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
	print g.user

	# ONLY LOGGED IN USERS CAN VOTE --> taken care of in map.js
	
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

	# update calculated rating
	checkin.calculate_rating()
	model.db.session.commit()

	# update checkin user's rating based on new calculated rating
	if checkin.user:
		checkin.user.set_average_rating()
		model.db.session.commit()

	return redirect("/")

def remove_votes(checkin, vote):
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
	# checkin_id = request.form.get("checkin_id")

	# get checkin from db
	checkin = model.db.session.query(model.Checkin).get(checkin_id)

	votes = [checkin.upvotes, checkin.downvotes] # [0, 1]

	# is a user signed in?
	if g.user.is_authenticated():
		votes.append(True) # [2]

		if checkin.user_id == g.user.id:
			votes.append(True) # [3]
		else:
			votes.append(False) # [3]

			# get user vote (if it exists)
			if checkin.users_who_rated != None:
				if g.user.id in checkin.users_who_rated:

					# vote_type is "up" or "down" or 0
					vote_type = checkin.users_who_rated[g.user.id]

					votes.append(vote_type) # [4]

	return convert_to_JSON(votes)


###################
# TWILIO RESPONSE #
###################

@app.route("/twilio", methods=["GET", "POST"])
def twilio_response():
	# # Respond to an incoming text message with a static response
	resp = twilio.twiml.Response()

	message = "Find it in San Francisco at http://18617ef1.ngrok.com/"
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



if __name__=="__main__":
	app.run(debug=True)