from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import create_engine
from sqlalchemy import Column, Integer, Float, String, DateTime, PickleType
from sqlalchemy import ForeignKey
from sqlalchemy.ext.mutable import Mutable
from sqlalchemy.orm import sessionmaker, relationship, backref, scoped_session
from datetime import datetime

from math import sqrt # for calculated_rating

ENGINE = create_engine("sqlite:///checkins.db", echo=False)
session = scoped_session(sessionmaker(bind=ENGINE, autocommit = False, autoflush = False))

Base = declarative_base()
Base.query = session.query_property()


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

class Attraction(Base):
	__tablename__ = "attractions"

	id = Column(Integer, primary_key = True)
	name = Column(String(50), nullable = False)
	checkin_id = Column(Integer, nullable = True)
	att_type = Column(String(50), nullable = True)


#################
# CHECKIN CLASS #

class Checkin(Base):
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

class User(Base):
	__tablename__ = "users"

	id = Column(Integer, primary_key = True)
	username = Column(String(50), nullable = True)
	email = Column(String(75), nullable = False)
	password = Column(String, nullable = False)
	average_rating = Column(Float, nullable = True)
	preferences = Column(MutableDict.as_mutable(PickleType), nullable = True)

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

		self.average_rating = total/count

# END CLASS DECLARATIONS #
##########################



def main():
	pass

if __name__ == "__main__":
	main()