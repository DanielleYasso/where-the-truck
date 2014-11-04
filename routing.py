from flask import Flask, render_template, redirect, request, session, g
import os
import model

app = Flask(__name__)

API_KEY = os.environ.get('API_KEY')

@app.route("/")
def home():
	return render_template("base.html", API_KEY=API_KEY)

@app.route("/checkin", methods=["POST"])
def checkin():
	"""Checkin user's current location as location of selected item"""

	# get attraction id
	attraction_id = request.form.get("attraction_id")
	lat = request.form.get("latitude")
	lng = request.form.get("longitude")
	print "Attraction %r, lat %r, lng %r" % (attraction_id, lat, lng)

	# get geolocation data from user
 	
 	return redirect("/")


if __name__=="__main__":
	app.run(debug=True)