from flask_wtf import Form

from wtforms import TextField, PasswordField, validators
from wtforms.validators import Required, EqualTo

class ForgotPassword(Form):
	email = TextField('Your email', validators=[Required()])


class PasswordForm(Form):
    password = PasswordField('New password', [
    			validators.Required(),
    			validators.EqualTo('confirm', message="Passwords must match")
    			])
    confirm = PasswordField('Confirm new password', validators=[Required()])


class PasswordFormSettings(Form):
	current_password = PasswordField('Current password', 
										validators=[Required()])

	new_password = PasswordField('New password', [
    			validators.Required(),
    			validators.EqualTo('confirm', message="Passwords must match")
    			])
	confirm = PasswordField('Confirm new password', validators=[Required()])