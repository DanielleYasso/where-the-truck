from flask_wtf import Form

from wtforms import TextField, PasswordField, validators
from wtforms.validators import Required, EqualTo

###################
# FORGOT PASSWORD #
###################

class ForgotPassword(Form):
    """ Create form class for f/orgot_password email reset request """

	email = TextField('Your email', validators=[Required()])


#################################
# PASSWORD FORM  FOR RESET PAGE #
#################################

class PasswordForm(Form):
    """ Create form class for /reset/<token> to reset password """

    password = PasswordField(
        'New password', [
		validators.Required(),
		validators.EqualTo('confirm', message="Passwords must match")
		])
    confirm = PasswordField('Confirm new password', validators=[Required()])


###################################
# PASSWORD FORM FOR USER SETTINGS #
###################################

class PasswordFormSettings(Form):
    """ Create form class for user settings page, allowing user to set a 
    new password """

	current_password = PasswordField('Current password', validators=[Required()])

	new_password = PasswordField(
        'New password', [
		validators.Required(),
		validators.EqualTo('confirm', message="Passwords must match")
		])
	confirm = PasswordField('Confirm new password', validators=[Required()])