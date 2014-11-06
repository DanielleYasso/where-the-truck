from flask import Flask, render_template, redirect, request, session, g, make_response
import os
import model
import json

app = Flask(__name__)

SECRET_KEY = os.environ.get('SECRET_KEY')
app.secret_key = SECRET_KEY

API_KEY = os.environ.get('API_KEY')


@app.before_request
def check_login():
	user_id = session.get("user_id")
	if user_id:
		g.user = model.session.query(model.User).get(user_id)
	else:
		g.user = None


@app.route("/")
def home():

	attractions = model.session.query(model.Attraction).all()

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


###############
# USER LOGOUT #
###############

@app.route("/logout")
def logout():
	session["user_id"] = None
	return redirect("/")


##############
# USER LOGIN #
##############

@app.route("/login", methods=["POST"])
def login():

	# get email and password from form inputs
	email = request.form.get("email")
	password = request.form.get("password")

	# get user with that email address
	user = model.session.query(model.User).filter_by(email=email).first()

	# check if user exists in database
	if not user:
		return convert_to_JSON("noUser")

	# check if password is right
	if password != user.password:
		return convert_to_JSON("wrongPassword")

	session["user_id"] = user.id

	return ""


###############
# USER SIGNUP #
###############

@app.route("/signup", methods=["POST"])
def signup():
	# get user info
	username = request.form.get("username")
	email = request.form.get("email")
	password = request.form.get("password")

	print "**** signup ", username

	# check that user email doesn't already exist in database
	user = model.session.query(model.User).filter_by(email=email).first()
	if user:
		return convert_to_JSON("userExists")

	# add new user to database
	new_user = model.User(username=username, email=email, password=password)
	model.session.add(new_user)
	model.session.commit()

	# add user to session --> LOGIN USER
	session["user_id"] = new_user.id

	return ""

#################################
# GET MARKERS TO DISPLAY ON MAP #
#################################

@app.route("/get_markers")
def get_markers():
	"""Get's all of the attractions with checkins to be displayed as markers"""
	# get all attractions that have checkins
	checked_in_attractions = model.session.query(model.Attraction).filter(model.Attraction.checkin_id != None).all()
	
	if not checked_in_attractions:
		return None

	attraction_list = []
	for attraction in checked_in_attractions:
		checkin = model.session.query(model.Checkin).get(attraction.checkin_id)
		attraction_list.append({"id": attraction.id, 
								"name": attraction.name,
								"lat": checkin.lat,
								"lng": checkin.lng,
								"timestamp": dump_datetime(checkin.timestamp),
								"checkin_id": checkin.id
								})
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
	new_checkin = model.Checkin(attraction_id=attraction_id, 
								lat=lat, 
								lng=lng)
	model.session.add(new_checkin)
	model.session.commit()

	# Use checkin record to update attraction's checkin_id
	attraction_rec = new_checkin.attraction
	attraction_rec.checkin_id = new_checkin.id
	model.session.commit()

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
	checkin = model.session.query(model.Checkin).get(checkin_id)

	# update checkin votes
	if vote == "up":
		checkin.upvotes += 1
		print "******* upvotes *******", checkin.upvotes
	elif vote == "down":
		checkin.downvotes += 1
		print "******* downvotes *******", checkin.downvotes

	model.session.commit()

	# if user is logged in, add vote to users_who_rated
	if session.get("user_id", False):
		print "username", g.user.username
		# get dictionary of user votes
		d = checkin.users_who_rated
		print d

		if d == None:
			d = {}

		print d

	return redirect("/")

############################
# GET VOTES FOR INFOWINDOW #
############################

@app.route("/get_votes/<int:checkin_id>")
def get_votes(checkin_id):
	"""Gets all of the votes for a given checkin"""
	# checkin_id = request.form.get("checkin_id")

	# get checkin from db
	checkin = model.session.query(model.Checkin).get(checkin_id)

	votes = [checkin.upvotes, checkin.downvotes]

	return convert_to_JSON(votes)



if __name__=="__main__":
	app.run(debug=True)