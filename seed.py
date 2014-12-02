import model
import random
from datetime import datetime
from passlib.hash import pbkdf2_sha256


#############
# ADD USERS #
#############

def add_users():
	""" Seed the users table with fake users """
	
	# add 20 fake users to the database
	for i in range(7, 28):

		# securely store password
		password_hash = pbkdf2_sha256.encrypt(
			str(i), 
			rounds=200000, 
			salt_size=16)
		
		email = str(i) + "@danielleyasso.com"

		user = model.User(
			username=str(i), 
			email=email, 
			password=password_hash,
			preferences={})


		model.db.session.add(user)
		model.db.session.commit()

		# set average rating (requires user id, so user must be in DB)
		user.set_average_rating()

		model.db.session.commit()



################
# ADD CHECKINS #
################

def add_checkins():
	""" Seed the checkins table with checkins associated with seed users """

	# loop for each user to create checkins for them
	for i in range(7, 28):

		# loop n times to create n checkins for this user
		for num in range(50):

			# generate a random number of upvotes and downvotes
			# set certain values to produce a vote of zero, for testing purposes
			random_zero = [0, 10, 20, 30, 40, 50]

			# upvotes
			limit_up = random.randint(0, 51)
			if limit_up in random_zero:
				random_upvotes = 0
			else:
				random_upvotes = random.randint(0,limit_up)
			
			# downvotes
			limit_down = random.randint(0, 51)
			if limit_down in random_zero:
				random_downvotes = 0
			else:
				random_downvotes = random.randint(0,limit_down)

			checkin = model.Checkin(
				attraction_id=1,
				user_id=i,
				lat=37.8026431,
				lng=-122.4134016,
				timestamp=datetime.now(),
				upvotes=random_upvotes,
				downvotes=random_downvotes)
			# calculate this checkin's rating based on upvotes and downvotes
			checkin.calculate_rating()

			model.db.session.add(checkin)
			model.db.session.commit()

########
# MAIN #
########

def main():
	# add_checkins()
	# add_users()
	pass



if __name__ == "__main__":
	main()

