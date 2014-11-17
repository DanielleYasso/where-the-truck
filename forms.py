from flask_wtf import Form

from wtforms import TextField, PasswordField
from wtforms.validators import Required

class PasswordForm(Form):
    password = PasswordField('Email', validators=[Required()])