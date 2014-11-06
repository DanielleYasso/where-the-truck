from flask import Flask, render_template, redirect, request, session, g, make_response
import os
import model
import json

app = Flask(__name__)

API_KEY = os.environ.get('API_KEY')

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

@app.route("/vote", methods=["POST"])
def vote():
	"""Gets a user's up or down vote and updates checkins table record"""

	vote = request.form.get("vote")
	checkin_id = request.form.get("checkin_id")

	print "********* Vote ********* ", vote

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

	return ""

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