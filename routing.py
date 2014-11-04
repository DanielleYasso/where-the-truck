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
	attraction = request.form.get("attraction_name")

	# get geolocation data from user
	


if __name__=="__main__":
	app.run(debug=True)