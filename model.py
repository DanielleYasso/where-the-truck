from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import create_engine
from sqlalchemy import Column, Integer, Float, String, DateTime, PickleType
from sqlalchemy import ForeignKey 
from sqlalchemy import sessionmaker, relationship, backref, scoped_session

ENGINE = create_engine("sqlite:///checkins.db", echo=False)
session = scoped_session(sessionmaker(bind=ENGINE, autocommit = False, autoflush = False))

Base = declarative_base()
Base.query = session.query_property()

######################
# CLASS DECLARATIONS #
######################

class Attraction(Base):
	__tablename__ = "attractions"

	id = Column(Integer, primary_key = True)
	name = Column(String(50), nullable = False)
	checkin_id = Column(Integer, nullable = True)

class Checkin(Base):
	__tablename__ = "checkins"

	id = Column(Integer, primary_key = True)
	attraction_id = Column(Integer, ForeignKey("attractions.id"), nullable = False)
	# user_id will change to nullable = False when user data is created (not MVP)
	user_id = Column(Integer, ForeignKey("users.id"), nullable = True)

	# geolocation
	lat = Column(Float, nullable = False)
	lng = Column(Float, nullable = False)
	timestamp = Column(DateTime, nullable = False)

	# ratings data
	upvotes = Column(Integer, nullable = True)
	downvotes = Column(Integer, nullable = True)
	calculated_rating = Column(Integer, nullable = True)
	users_who_rated = Column(PickleType, nullable = True)

	# define relationships
	attraction = relationship("Attraction", backref=backref("checkins", order_by=id))
	user = relationship("User", backref=backref("users", order_by=id))

class User(Base):
	__tablename__ = "users"

	id = Column(Integer, primary_key = True)
	username = Column(String(50), nullable = True)
	email = Column(String(75), nullable = False)
	password = Column(String(75), nullable = False)
	average_rating = Column(Float, nullable = True)

# END CLASS DECLARATIONS #
##########################



def main():
	pass

if __name__ == "__main__":
	main()