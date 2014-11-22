from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import create_engine
from sqlalchemy import Column, Integer, Float, String, DateTime, PickleType, Boolean
from sqlalchemy import ForeignKey
from sqlalchemy.ext.mutable import Mutable
from sqlalchemy.orm import sessionmaker, relationship, backref, scoped_session
from datetime import datetime

from math import sqrt # for calculated_rating

from flask.ext.sqlalchemy import SQLAlchemy


## Create database connection object
from routing import app
db = SQLAlchemy(app)



######################
# CLASS DECLARATIONS #
######################

class MutableDict(Mutable, dict):

    @classmethod
    def coerce(cls, key, value):
        if not isinstance(value, MutableDict):
            if isinstance(value, dict):
                return MutableDict(value)
            return Mutable.coerce(key, value)
        else:
            return value

    def __delitem(self, key):
        dict.__delitem__(self, key)
        self.changed()

    def __setitem__(self, key, value):
        dict.__setitem__(self, key, value)
        self.changed()

    def __getstate__(self):
        return dict(self)

    def __setstate__(self, state):
        self.update(self)

####################
# ATTRACTION CLASS #

class Attraction(db.Model):
	__tablename__ = "attractions"

	id = Column(Integer, primary_key = True)
	name = Column(String(50), nullable = False)
	checkin_id = Column(Integer, nullable = True)
	att_type = Column(String(50), nullable = True)
	biz_id = Column(String, nullable = True) # for use with yelp api
	last_good_checkin_id = Column(Integer, nullable = True)


#################
# CHECKIN CLASS #

class Checkin(db.Model):
	__tablename__ = "checkins"

	id = Column(Integer, primary_key = True)
	attraction_id = Column(Integer, ForeignKey("attractions.id"), nullable = False)

	# user_id will change to nullable = False when user data is created (not MVP)
	user_id = Column(Integer, ForeignKey("users.id"), nullable = True)

	# geolocation data with timestamp
	lat = Column(Float, nullable = False)
	lng = Column(Float, nullable = False)
	timestamp = Column(DateTime, default=datetime.now, nullable = False)

	# ratings data
	defaultVote = 0
	upvotes = Column(Integer, default=0, nullable = False)
	downvotes = Column(Integer, default=0, nullable = False)
	calculated_rating = Column(Integer, nullable = True)
	users_who_rated = Column(MutableDict.as_mutable(PickleType), nullable = True)

	# define relationships
	attraction = relationship("Attraction", backref=backref("checkins", order_by=id))
	user = relationship("User", backref=backref("checkins", order_by=id))

	# Find the calculated_rating
	def calculate_rating(self):
		"""Calculates the rating based on an algorithm using votes"""
		
		# adapted from possiblywrong.wordpress.com

		z = 1.64485 #1.0 = 85%, 1.6 = 95%

		if self.upvotes == 0 and self.downvotes == 0:
			self.calculated_rating = 0
		elif self.upvotes == 0:
			n = self.downvotes
			phat = float(self.downvotes) / n

			self.calculated_rating = -((phat+z*z/(2*n)-z*sqrt((phat*(1-phat)+z*z/(4*n))/n))/(1+z*z/n))
		else:
			n = self.upvotes + self.downvotes
			phat = float(self.upvotes) / n

			self.calculated_rating = (phat+z*z/(2*n)-z*sqrt((phat*(1-phat)+z*z/(4*n))/n))/(1+z*z/n)


##############
# USER CLASS #

class User(db.Model):
	__tablename__ = "users"

	id = Column(Integer, primary_key = True)
	username = Column(String(50), nullable = True)
	email = Column(String(75), nullable = False)
	password = Column(String, nullable = False)
	average_rating = Column(Float, nullable = True)
	preferences = Column(MutableDict.as_mutable(PickleType), nullable = True)
	active = Column(Boolean())
	confirmed_at = Column(DateTime())
	role_id = Column(Integer(), ForeignKey("roles.id"))

	# define relationship with Role table
	role = relationship("Role", backref=backref("users", order_by=id))

	# functions for Flask-Login
	def is_active(self):
		"""True, as all users are active"""
		return True

	def get_id(self):
		"""Return the email address to satisfy Flask-Login's requirements"""
		return self.id 

	def is_authenticated(self):
		"""Return true"""
		return True 

	def is_anonymous(self):
		"""False, as anonymous users aren't supported"""
		return False

	def is_trusted(self):
		"""Return whether user is 'trusted' based on average_rating and # of checkins"""
		# count all existing and non-zero rated checkins
		count = 0
		for checkin in self.checkins:
			if checkin.calculated_rating:
				count += 1

		# if no checkins or ratings, return True
		if count == 0:
			return True

		# does user have an average rating?
		if -1 < self.average_rating < 1:
			if count >= 10 and self.average_rating < 0.05:
				print "**** untrusted user"
				return False
			
		return True


	def get_token(self, expiration=1800):
		s = Serializer(current_app.config['SECRET_KEY'], expiration)
		return s.dumps({'user': self.id}.decode('utf-8'))


	# Get average rating
	def set_average_rating(self):
		"""Calculates a user's average_rating"""

		total = 0
		count = 0
		# loop through user's check-ins for calculated_ratings
		for checkin in self.checkins:
			# is there a calculated_rating?  ** calculated_ratings of 0 are false
			if checkin.calculated_rating:
				total += checkin.calculated_rating
				count += 1
				
		# in case of deleted rating leading to 0 count		
		if count != 0:
			self.average_rating = total/count


##############
# ROLE CLASS #

class Role(db.Model):
	__tablename__ = "roles"

	id = Column(Integer, primary_key = True)
	name = Column(String(80), unique = True)
	description = Column(String(255))

# END CLASS DECLARATIONS #
##########################


def main():
	pass

if __name__ == "__main__":
	main()