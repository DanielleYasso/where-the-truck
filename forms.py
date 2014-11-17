from flask_wtf import Form

from wtforms import TextField, PasswordField, validators
from wtforms.validators import Required, EqualTo

class PasswordForm(Form):
    password = PasswordField('New password', [
    			validators.Required(),
    			validators.EqualTo('confirm', message="Passwords must match")
    			])
    confirm = PasswordField('Confirm new password', validators=[Required()])