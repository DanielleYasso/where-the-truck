import unittest
import model
import routing


#######################
# UTILITIES TEST CASE #
#######################

class UtilitiesTestCase(unittest.TestCase):

    def testDumpDateTime(self):
        """ Testing dump_datetime function """

        import datetime

        xmas_1970 = datetime.datetime(1970, 12, 25, 15, 0, 0)
        self.assertEqual(routing.dump_datetime(xmas_1970), 
                         ["1970-12-25", "15:00:00"])

######################
# DATABASE TEST CASE #
######################

class DatabaseTestCase(unittest.TestCase):

    def testLoadUser(self):
        """ Testing load_user function """

        u = routing.load_user(1)
        self.assertEqual(u.username, "dbyasso")


###################
# FLASK TEST CASE #
###################

class FlaskTestCase(unittest.TestCase):
    def setUp(self):
        """ Creating test app """

        self.app = routing.app.test_client()

    def testHomePage(self):
        """ Testing homepage route "/" """
        
        response = self.app.get('/')
        self.assertIn("where", response.data)


if __name__ == "__main__":
    unittest.main()