import unittest
import model
import routing

class UtilitiesTestCase(unittest.TestCase):
	# def setUp(self):
	# 	print "Setup"

	# def tearDown(self):
	# 	print "tearDown"

	# def testMath(self):
	# 	print "before my test"
	# 	self.assertEqual(2, 1+1)
	# 	print "after my test"

	# def testSubtraction(self):
	# 	self.assertIn(1, [3,1])

	def testDumpDateTime(self):
		import datetime

		xmas_1970 = datetime.datetime(1970, 12, 25, 15, 0, 0)
		self.assertEqual(routing.dump_datetime(xmas_1970), 
			             ["1970-12-25", "15:00:00"])


class DatabaseTestCase(unittest.TestCase):

	def testLoadUser(self):
		u = routing.load_user(1)
		self.assertEqual(u.username, "dbyasso")

	# def testAddTruck(self):
	# 	truck = Truck(...)
	# 	routing.db_session.add(truck)
	# 	self.assertIn(truck, routing.findAllTrucks())
	# 	routing.db_session.rollback()

class FlaskTestCase(unittest.TestCase):
	def setUp(self):
		# routing.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///checkins_test.db'
		self.app = routing.app.test_client()


	def testHomePage(self):
		response = self.app.get('/')
		self.assertIn("where", response.data)

	def testGetLastGoodFalse(self):
		pass

	def testGetAttractionTwo(self):
		checkin_id = 28
		self.assertEqual(routing.get_attraction_two(), checkin_id)

	# def testConvertToJson(self):
	# 	response = routing.convert_to_JSON({"msg": "Hi"})
	# 	self.assertEqual(response.data, '{"msg": "Hi"}')

	



if __name__ == "__main__":
	unittest.main()