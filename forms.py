from flask_wtf import Form

from wtforms import TextField, PasswordField, validators
from wtforms.validators import Required, EqualTo

###################
# FORGOT PASSWORD #
###################

class ForgotPassword(Form):

    email = TextField('Your email', validators=[Required()])


#################################
# PASSWORD FORM  FOR RESET PAGE #
#################################

class PasswordForm(Form):

    password = PasswordField('New password', [
                            validators.Required(),
                            validators.EqualTo(
                                'confirm', 
                                message="Passwords must match")
                            ])
    confirm = PasswordField('Confirm new password', validators=[Required()])


###################################
# PASSWORD FORM FOR USER SETTINGS #
###################################

class PasswordFormSettings(Form):

	current_password = PasswordField('Current password', validators=[Required()])

	new_password = PasswordField('New password', 
                                [validators.Required(),
                                validators.EqualTo(
                                    'confirm', 
                                    message="Passwords must match")
		                        ])
    confirm = PasswordField('Confirm new password', validators=[Required()])